import { Router, Response } from "express";
import { Feedback } from "../models/Feedback";
import { Ticket } from "../models/Ticket";
import { AuthRequest, authenticate, authorize } from "../middleware/auth";

const router = Router();

router.use(authenticate);

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { ticketId, rating, comment } = req.body;
    if (!ticketId || !rating) {
      res.status(400).json({ message: "Ticket ID and rating are required" });
      return;
    }

    const ratingNum = Number(rating);
    if (ratingNum < 1 || ratingNum > 5) {
      res.status(400).json({ message: "Rating must be between 1 and 5" });
      return;
    }

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      res.status(404).json({ message: "Ticket not found" });
      return;
    }

    if (String(ticket.createdBy) !== String(req.user!._id)) {
      res.status(403).json({ message: "Only the ticket owner can leave feedback" });
      return;
    }

    if (!["resolved", "closed"].includes(ticket.status)) {
      res
        .status(400)
        .json({ message: "Feedback is only allowed on resolved or closed tickets" });
      return;
    }

    const existing = await Feedback.findOne({ ticket: ticketId });
    if (existing) {
      res.status(409).json({ message: "Feedback already submitted for this ticket" });
      return;
    }

    const feedback = await Feedback.create({
      ticket: ticketId,
      user: req.user!._id,
      rating: ratingNum,
      comment,
    });

    res.status(201).json({ feedback });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to submit feedback" });
  }
});

router.get(
  "/",
  authorize("manager", "admin"),
  async (_req: AuthRequest, res: Response) => {
    try {
      const feedback = await Feedback.find()
        .populate("ticket", "ticketNumber title status")
        .populate("user", "name email")
        .sort({ createdAt: -1 });
      res.json({ feedback });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  }
);

export default router;
