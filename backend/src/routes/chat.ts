import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { chatWithNvidia, isNvidiaAvailable } from "../services/nvidia";

const router = Router();

router.get("/status", (_req, res: Response) => {
  res.json({
    available: isNvidiaAvailable(),
    message: isNvidiaAvailable()
      ? "NVIDIA chatbot is available"
      : "AI chatbot is not available. Add NVIDIA_API_KEY to enable it.",
  });
});

router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== "string") {
      res.status(400).json({ message: "Message is required" });
      return;
    }

    const result = await chatWithNvidia(message, history || []);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      available: false,
      reply: "AI chatbot is not available. Please submit a support ticket.",
    });
  }
});

export default router;
