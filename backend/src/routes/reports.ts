import { Router, Response } from "express";
import { Ticket } from "../models/Ticket";
import { Feedback } from "../models/Feedback";
import { User } from "../models/User";
import { SlaConfig } from "../models/SlaConfig";
import { AuthRequest, authenticate, authorize } from "../middleware/auth";

const router = Router();

router.use(authenticate);
router.use(authorize("manager", "admin"));

router.get("/overview", async (_req: AuthRequest, res: Response) => {
  try {
    const [
      totalTickets,
      openTickets,
      inProgress,
      escalated,
      resolved,
      closed,
      byPriority,
      byCategory,
      technicians,
      avgRating,
      slaBreached,
      slaConfigs,
    ] = await Promise.all([
      Ticket.countDocuments(),
      Ticket.countDocuments({ status: "open" }),
      Ticket.countDocuments({ status: "in_progress" }),
      Ticket.countDocuments({ status: "escalated" }),
      Ticket.countDocuments({ status: "resolved" }),
      Ticket.countDocuments({ status: "closed" }),
      Ticket.aggregate([{ $group: { _id: "$priority", count: { $sum: 1 } } }]),
      Ticket.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]),
      User.find({ role: "technician", isActive: true }).select("name email"),
      Feedback.aggregate([
        { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
      ]),
      Ticket.countDocuments({
        status: { $nin: ["resolved", "closed"] },
        slaDueAt: { $lt: new Date() },
      }),
      SlaConfig.find().sort({ priority: 1 }),
    ]);

    const workload = await Ticket.aggregate([
      {
        $match: {
          assignedTo: { $ne: null },
          status: { $in: ["open", "in_progress", "awaiting_user", "escalated"] },
        },
      },
      { $group: { _id: "$assignedTo", active: { $sum: 1 } } },
    ]);

    const techWorkload = technicians.map((t) => {
      const row = workload.find((w) => String(w._id) === String(t._id));
      return {
        id: String(t._id),
        name: t.name,
        email: t.email,
        activeTickets: row?.active || 0,
      };
    });

    res.json({
      counts: {
        totalTickets,
        openTickets,
        inProgress,
        escalated,
        resolved,
        closed,
        slaBreached,
      },
      byPriority,
      byCategory,
      techWorkload,
      satisfaction: {
        average: avgRating[0]?.avg ? Number(avgRating[0].avg.toFixed(2)) : null,
        responses: avgRating[0]?.count || 0,
      },
      slaConfigs,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load reports" });
  }
});

router.get("/sla", async (_req: AuthRequest, res: Response) => {
  try {
    const configs = await SlaConfig.find().sort({ priority: 1 });
    res.json({ configs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load SLA configs" });
  }
});

router.put("/sla", async (req: AuthRequest, res: Response) => {
  try {
    const { configs } = req.body as {
      configs: {
        priority: string;
        responseHours: number;
        resolutionHours: number;
        isActive?: boolean;
      }[];
    };

    if (!Array.isArray(configs)) {
      res.status(400).json({ message: "configs array is required" });
      return;
    }

    for (const c of configs) {
      await SlaConfig.findOneAndUpdate(
        { priority: c.priority },
        {
          responseHours: c.responseHours,
          resolutionHours: c.resolutionHours,
          isActive: c.isActive ?? true,
        },
        { upsert: true, new: true }
      );
    }

    const updated = await SlaConfig.find().sort({ priority: 1 });
    res.json({ configs: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update SLA configs" });
  }
});

export default router;
