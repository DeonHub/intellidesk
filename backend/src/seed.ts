import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { connectDB } from "./config/db";
import { User } from "./models/User";
import { SlaConfig } from "./models/SlaConfig";
import { Ticket } from "./models/Ticket";
import { computeSlaDueAt } from "./utils/sla";
import { generateTicketNumber } from "./utils/ticketNumber";

dotenv.config();

const DEMO_PASSWORD = "qwertyuiop";

const seedUsers = [
  {
    name: "System Administrator",
    email: "admin@intellidesk.app",
    role: "admin" as const,
    department: "IT Administration",
  },
  {
    name: "Morgan Blake",
    email: "manager@intellidesk.app",
    role: "manager" as const,
    department: "IT Support",
  },
  {
    name: "Alex Rivera",
    email: "tech1@intellidesk.app",
    role: "technician" as const,
    department: "IT Support",
  },
  {
    name: "Jordan Lee",
    email: "tech2@intellidesk.app",
    role: "technician" as const,
    department: "IT Support",
  },
  {
    name: "Sam Okonkwo",
    email: "user1@intellidesk.app",
    role: "end_user" as const,
    department: "Finance",
  },
  {
    name: "Priya Shah",
    email: "user2@intellidesk.app",
    role: "end_user" as const,
    department: "Human Resources",
  },
];

const defaultSla = [
  { priority: "critical", responseHours: 1, resolutionHours: 4 },
  { priority: "high", responseHours: 2, resolutionHours: 8 },
  { priority: "medium", responseHours: 8, resolutionHours: 24 },
  { priority: "low", responseHours: 24, resolutionHours: 72 },
];

export async function runSeed(): Promise<void> {
  const hashed = await bcrypt.hash(DEMO_PASSWORD, 10);

  for (const u of seedUsers) {
    await User.findOneAndUpdate(
      { email: u.email },
      { ...u, password: hashed, isActive: true },
      { upsert: true, new: true }
    );
  }

  for (const s of defaultSla) {
    await SlaConfig.findOneAndUpdate(
      { priority: s.priority },
      { ...s, isActive: true },
      { upsert: true, new: true }
    );
  }

  const ticketCount = await Ticket.countDocuments();
  if (ticketCount === 0) {
    const endUser = await User.findOne({ email: "user1@intellidesk.app" });
    const tech = await User.findOne({ email: "tech1@intellidesk.app" });
    if (endUser && tech) {
      const samples = [
        {
          title: "Cannot connect to office Wi‑Fi",
          description:
            "My laptop shows the network but fails authentication after the password prompt.",
          category: "network" as const,
          priority: "high" as const,
          status: "open" as const,
        },
        {
          title: "Outlook keeps asking for password",
          description:
            "Microsoft Outlook repeatedly prompts for credentials and will not sync mail.",
          category: "email" as const,
          priority: "medium" as const,
          status: "in_progress" as const,
          assignedTo: tech._id,
        },
        {
          title: "Need access to shared drive",
          description:
            "I need read access to the Finance shared folder for the quarterly report.",
          category: "account" as const,
          priority: "low" as const,
          status: "resolved" as const,
          assignedTo: tech._id,
          resolvedAt: new Date(),
        },
      ];

      for (const sample of samples) {
        const ticketNumber = await generateTicketNumber();
        const slaDueAt = await computeSlaDueAt(sample.priority);
        await Ticket.create({
          ...sample,
          ticketNumber,
          createdBy: endUser._id,
          slaDueAt,
          updates: [
            {
              message: "Ticket created (demo seed)",
              author: endUser._id,
              createdAt: new Date(),
            },
          ],
        });
      }
    }
  }

  console.log("Seed complete. Demo password for all users:", DEMO_PASSWORD);
  console.log(seedUsers.map((u) => `${u.role}: ${u.email}`).join("\n"));
}

async function main() {
  await connectDB(process.env.MONGODB_URI);
  await runSeed();
  process.exit(0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
