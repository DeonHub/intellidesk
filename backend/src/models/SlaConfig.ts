import mongoose, { Document, Schema } from "mongoose";
import { TicketPriority } from "./Ticket";

export interface ISlaConfig extends Document {
  priority: TicketPriority;
  responseHours: number;
  resolutionHours: number;
  isActive: boolean;
}

const slaSchema = new Schema<ISlaConfig>(
  {
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      required: true,
      unique: true,
    },
    responseHours: { type: Number, required: true },
    resolutionHours: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const SlaConfig = mongoose.model<ISlaConfig>("SlaConfig", slaSchema);
