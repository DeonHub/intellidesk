import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User, UserRole, IUser } from "../models/User";

export interface AuthRequest extends Request {
  user?: IUser;
}

interface JwtPayload {
  id: string;
}

export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  const token = header.slice(7);
  try {
    const secret = process.env.JWT_SECRET || "dev_secret";
    const decoded = jwt.verify(token, secret) as JwtPayload;
    User.findById(decoded.id)
      .then((user) => {
        if (!user || !user.isActive) {
          res.status(401).json({ message: "Invalid or inactive account" });
          return;
        }
        req.user = user;
        next();
      })
      .catch(() => {
        res.status(401).json({ message: "Invalid token" });
      });
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}

export function authorize(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: "Insufficient permissions" });
      return;
    }
    next();
  };
}
