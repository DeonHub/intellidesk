import { Router, Response } from "express";
import * as crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Ticket, TicketPriority, TicketStatus } from "../models/Ticket";
import { Feedback } from "../models/Feedback";
import { User } from "../models/User";
import { AuthRequest, authenticate, authorize } from "../middleware/auth";
import { generateTicketNumber } from "../utils/ticketNumber";
import { computeSlaDueAt } from "../utils/sla";
import { suggestTicketResolution } from "../services/gemini";

const router = Router();

function signToken(userId: string): string {
  const secret = process.env.JWT_SECRET || "dev_secret";
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  return jwt.sign({ id: userId }, secret, {
    expiresIn: expiresIn as jwt.SignOptions["expiresIn"],
  });
}

/** Public quick-submit from the landing page — no prior login required. */
router.post("/quick", async (req, res: Response) => {
  try {
    const { name, email, title, description, category, priority, department } =
      req.body;

    if (!name || !email || !title || !description) {
      res.status(400).json({
        message: "Name, email, title, and description are required",
      });
      return;
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmail });
    let temporaryPassword: string | undefined;
    let createdAccount = false;

    if (!user) {
      temporaryPassword = crypto.randomBytes(4).toString("hex");
      const hashed = await bcrypt.hash(temporaryPassword, 10);
      user = await User.create({
        name: String(name).trim(),
        email: normalizedEmail,
        password: hashed,
        role: "end_user",
        department: department || "General",
      });
      createdAccount = true;
    } else if (!user.isActive) {
      res.status(403).json({ message: "This account is disabled" });
      return;
    } else if (user.role !== "end_user") {
      res.status(400).json({
        message:
          "This email belongs to a staff account. Sign in to submit tickets from your dashboard.",
      });
      return;
    }

    const p = (priority || "medium") as TicketPriority;
    const ticketNumber = await generateTicketNumber();
    const slaDueAt = await computeSlaDueAt(p);

    let aiSuggestedResolution: string | undefined;
    try {
      aiSuggestedResolution = await suggestTicketResolution(
        title,
        description,
        category || "other"
      );
    } catch {
      /* optional */
    }

    const ticket = await Ticket.create({
      ticketNumber,
      title,
      description,
      category: category || "other",
      priority: p,
      status: "open",
      createdBy: user._id,
      slaDueAt,
      aiSuggestedResolution,
      updates: [
        {
          message: "Ticket created from landing page",
          author: user._id,
          createdAt: new Date(),
        },
      ],
    });

    const populated = await Ticket.findById(ticket._id)
      .populate("createdBy", "name email role")
      .populate("assignedTo", "name email role");

    // Only auto-sign-in brand-new accounts (never silently log into an existing one).
    if (createdAccount) {
      const token = signToken(String(user._id));
      res.status(201).json({
        ticket: populated,
        token,
        user: {
          id: String(user._id),
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          isActive: user.isActive,
        },
        createdAccount: true,
        temporaryPassword,
        message:
          "Ticket submitted. We created your account so you can track it — save your password.",
      });
      return;
    }

    res.status(201).json({
      ticket: populated,
      createdAccount: false,
      requiresLogin: true,
      message:
        "Ticket submitted. Sign in with your existing account to track it.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to submit ticket" });
  }
});

router.use(authenticate);

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const filter: Record<string, unknown> = {};

    if (user.role === "end_user") {
      filter.createdBy = user._id;
    } else if (user.role === "technician") {
      filter.$or = [
        { assignedTo: user._id },
        { assignedTo: null, status: { $in: ["open", "escalated"] } },
        { status: "escalated" },
      ];
    }
    // manager & admin see all

    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;

    const tickets = await Ticket.find(filter)
      .populate("createdBy", "name email role")
      .populate("assignedTo", "name email role")
      .populate("escalatedTo", "name email role")
      .populate("updates.author", "name email role")
      .sort({ updatedAt: -1 });

    res.json({ tickets });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch tickets" });
  }
});

router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate("createdBy", "name email role")
      .populate("assignedTo", "name email role")
      .populate("escalatedTo", "name email role")
      .populate("updates.author", "name email role");

    if (!ticket) {
      res.status(404).json({ message: "Ticket not found" });
      return;
    }

    const user = req.user!;
    if (
      user.role === "end_user" &&
      String(ticket.createdBy._id || ticket.createdBy) !== String(user._id)
    ) {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    const feedback = await Feedback.findOne({ ticket: ticket._id });
    res.json({ ticket, feedback });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch ticket" });
  }
});

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, category, priority } = req.body;
    if (!title || !description) {
      res.status(400).json({ message: "Title and description are required" });
      return;
    }

    const p = (priority || "medium") as TicketPriority;
    const ticketNumber = await generateTicketNumber();
    const slaDueAt = await computeSlaDueAt(p);

    let aiSuggestedResolution: string | undefined;
    try {
      aiSuggestedResolution = await suggestTicketResolution(
        title,
        description,
        category || "other"
      );
    } catch {
      /* optional */
    }

    const ticket = await Ticket.create({
      ticketNumber,
      title,
      description,
      category: category || "other",
      priority: p,
      status: "open",
      createdBy: req.user!._id,
      slaDueAt,
      aiSuggestedResolution,
      updates: [
        {
          message: "Ticket created",
          author: req.user!._id,
          createdAt: new Date(),
        },
      ],
    });

    const populated = await Ticket.findById(ticket._id)
      .populate("createdBy", "name email role")
      .populate("assignedTo", "name email role");

    res.status(201).json({ ticket: populated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create ticket" });
  }
});

router.patch(
  "/:id",
  authorize("technician", "manager", "admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const ticket = await Ticket.findById(req.params.id);
      if (!ticket) {
        res.status(404).json({ message: "Ticket not found" });
        return;
      }

      const { status, priority, assignedTo, message, isInternal } = req.body;

      if (status) {
        ticket.status = status as TicketStatus;
        if (status === "resolved") ticket.resolvedAt = new Date();
        if (status === "closed") ticket.closedAt = new Date();
        if (status === "in_progress" && !ticket.assignedTo) {
          ticket.assignedTo = req.user!._id;
        }
      }

      if (priority) {
        ticket.priority = priority as TicketPriority;
        ticket.slaDueAt = await computeSlaDueAt(priority);
      }

      if (assignedTo !== undefined) {
        if (assignedTo) {
          const tech = await User.findById(assignedTo);
          if (!tech || !["technician", "manager", "admin"].includes(tech.role)) {
            res.status(400).json({ message: "Invalid assignee" });
            return;
          }
        }
        ticket.assignedTo = assignedTo || null;
      }

      if (message) {
        ticket.updates.push({
          message,
          author: req.user!._id as typeof ticket.updates[0]["author"],
          createdAt: new Date(),
          isInternal: Boolean(isInternal),
        });
      }

      await ticket.save();
      const populated = await Ticket.findById(ticket._id)
        .populate("createdBy", "name email role")
        .populate("assignedTo", "name email role")
        .populate("escalatedTo", "name email role")
        .populate("updates.author", "name email role");

      res.json({ ticket: populated });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to update ticket" });
    }
  }
);

router.post(
  "/:id/escalate",
  authorize("technician", "manager", "admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const ticket = await Ticket.findById(req.params.id);
      if (!ticket) {
        res.status(404).json({ message: "Ticket not found" });
        return;
      }

      const manager = await User.findOne({ role: "manager", isActive: true });
      ticket.status = "escalated";
      ticket.priority =
        ticket.priority === "critical" ? "critical" : "high";
      ticket.escalatedTo = manager?._id || null;
      ticket.updates.push({
        message:
          req.body.reason ||
          "Escalated to management for further assistance",
        author: req.user!._id as typeof ticket.updates[0]["author"],
        createdAt: new Date(),
      });

      await ticket.save();
      const populated = await Ticket.findById(ticket._id)
        .populate("createdBy", "name email role")
        .populate("assignedTo", "name email role")
        .populate("escalatedTo", "name email role")
        .populate("updates.author", "name email role");

      res.json({ ticket: populated });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to escalate ticket" });
    }
  }
);

router.post("/:id/comment", async (req: AuthRequest, res: Response) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      res.status(404).json({ message: "Ticket not found" });
      return;
    }

    const user = req.user!;
    if (
      user.role === "end_user" &&
      String(ticket.createdBy) !== String(user._id)
    ) {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    const { message } = req.body;
    if (!message) {
      res.status(400).json({ message: "Message is required" });
      return;
    }

    ticket.updates.push({
      message,
      author: user._id as typeof ticket.updates[0]["author"],
      createdAt: new Date(),
      isInternal: false,
    });

    if (user.role === "end_user" && ticket.status === "awaiting_user") {
      ticket.status = "in_progress";
    }

    await ticket.save();
    const populated = await Ticket.findById(ticket._id)
      .populate("createdBy", "name email role")
      .populate("assignedTo", "name email role")
      .populate("updates.author", "name email role");

    res.json({ ticket: populated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add comment" });
  }
});

export default router;
