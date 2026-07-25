import { TicketPriority } from "../models/Ticket";
import { SlaConfig } from "../models/SlaConfig";

const DEFAULT_HOURS: Record<TicketPriority, number> = {
  critical: 4,
  high: 8,
  medium: 24,
  low: 72,
};

export async function computeSlaDueAt(priority: TicketPriority): Promise<Date> {
  const config = await SlaConfig.findOne({ priority, isActive: true });
  const hours = config?.resolutionHours ?? DEFAULT_HOURS[priority];
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}
