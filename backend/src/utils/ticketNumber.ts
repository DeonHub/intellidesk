import { Ticket } from "../models/Ticket";

export async function generateTicketNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await Ticket.countDocuments();
  const seq = String(count + 1).padStart(5, "0");
  return `ID-${year}-${seq}`;
}
