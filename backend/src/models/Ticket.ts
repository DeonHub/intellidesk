import mongoose, { Document, Schema, Types } from "mongoose";

export type TicketStatus =
  | "open"
  | "in_progress"
  | "awaiting_user"
  | "escalated"
  | "resolved"
  | "closed";

export type TicketPriority = "low" | "medium" | "high" | "critical";
export type TicketCategory =
  | "hardware"
  | "software"
  | "network"
  | "account"
  | "email"
  | "other";

export interface ITicketUpdate {
  message: string;
  author: Types.ObjectId;
  createdAt: Date;
  isInternal?: boolean;
}

export interface ITicket extends Document {
  ticketNumber: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdBy: Types.ObjectId;
  assignedTo?: Types.ObjectId | null;
  escalatedTo?: Types.ObjectId | null;
  slaDueAt?: Date | null;
  resolvedAt?: Date | null;
  closedAt?: Date | null;
  aiSuggestedResolution?: string;
  updates: ITicketUpdate[];
  createdAt: Date;
  updatedAt: Date;
}

const updateSchema = new Schema<ITicketUpdate>(
  {
    message: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isInternal: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ticketSchema = new Schema<ITicket>(
  {
    ticketNumber: { type: String, unique: true, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ["hardware", "software", "network", "account", "email", "other"],
      default: "other",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    status: {
      type: String,
      enum: [
        "open",
        "in_progress",
        "awaiting_user",
        "escalated",
        "resolved",
        "closed",
      ],
      default: "open",
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },
    escalatedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },
    slaDueAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    aiSuggestedResolution: { type: String },
    updates: [updateSchema],
  },
  { timestamps: true }
);

ticketSchema.index({ status: 1, priority: 1 });
ticketSchema.index({ createdBy: 1 });
ticketSchema.index({ assignedTo: 1 });

export const Ticket = mongoose.model<ITicket>("Ticket", ticketSchema);
