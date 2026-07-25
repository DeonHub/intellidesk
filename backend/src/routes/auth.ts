import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { IUser, User } from "../models/User";
import { AuthRequest, authenticate } from "../middleware/auth";

const router = Router();

function signToken(userId: string): string {
  const secret = process.env.JWT_SECRET || "dev_secret";
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  return jwt.sign({ id: userId }, secret, {
    expiresIn: expiresIn as jwt.SignOptions["expiresIn"],
  });
}

function publicUser(user: IUser) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    isActive: user.isActive,
  };
}

router.post("/register", async (req, res: Response) => {
  try {
    const { name, email, password, department } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ message: "Name, email, and password are required" });
      return;
    }
    if (String(password).length < 6) {
      res.status(400).json({ message: "Password must be at least 6 characters" });
      return;
    }

    const exists = await User.findOne({ email: String(email).toLowerCase() });
    if (exists) {
      res.status(409).json({ message: "Email already registered" });
      return;
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashed,
      role: "end_user",
      department: department || "General",
    });

    const token = signToken(String(user._id));
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Registration failed" });
  }
});

router.post("/login", async (req, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required" });
      return;
    }

    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user || !user.isActive) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const token = signToken(String(user._id));
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed" });
  }
});

router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
  res.json({ user: publicUser(req.user!) });
});

export default router;
