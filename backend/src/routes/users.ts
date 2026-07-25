import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import { User, UserRole } from "../models/User";
import { AuthRequest, authenticate, authorize } from "../middleware/auth";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  authorize("admin", "manager"),
  async (req: AuthRequest, res: Response) => {
    try {
      const filter: Record<string, unknown> = {};
      if (req.query.role) filter.role = req.query.role;
      const users = await User.find(filter)
        .select("-password")
        .sort({ createdAt: -1 });
      res.json({
        users: users.map((u) => ({
          id: u._id,
          name: u.name,
          email: u.email,
          role: u.role,
          department: u.department,
          isActive: u.isActive,
        })),
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  }
);

router.get(
  "/technicians",
  authorize("technician", "manager", "admin"),
  async (_req: AuthRequest, res: Response) => {
    try {
      const users = await User.find({
        role: { $in: ["technician", "manager"] },
        isActive: true,
      }).select("-password");
      res.json({
        users: users.map((u) => ({
          id: String(u._id),
          name: u.name,
          email: u.email,
          role: u.role,
          department: u.department,
          isActive: u.isActive,
        })),
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to fetch technicians" });
    }
  }
);

router.post(
  "/",
  authorize("admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { name, email, password, role, department } = req.body;
      if (!name || !email || !password || !role) {
        res
          .status(400)
          .json({ message: "Name, email, password, and role are required" });
        return;
      }

      const allowed: UserRole[] = [
        "end_user",
        "technician",
        "manager",
        "admin",
      ];
      if (!allowed.includes(role)) {
        res.status(400).json({ message: "Invalid role" });
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
        role,
        department: department || "IT",
      });

      res.status(201).json({
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          isActive: user.isActive,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to create user" });
    }
  }
);

router.patch(
  "/:id",
  authorize("admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      const { name, role, department, isActive, password } = req.body;
      if (name !== undefined) user.name = name;
      if (role !== undefined) user.role = role;
      if (department !== undefined) user.department = department;
      if (isActive !== undefined) user.isActive = isActive;
      if (password) user.password = await bcrypt.hash(password, 10);

      await user.save();
      res.json({
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          isActive: user.isActive,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to update user" });
    }
  }
);

export default router;
