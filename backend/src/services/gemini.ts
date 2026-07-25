import { GoogleGenerativeAI } from "@google/generative-ai";

export function isGeminiAvailable(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

const SYSTEM_PROMPT = `You are IntelliDesk Assistant, a helpful AI for an IT help desk.
Help users with common IT issues: password resets, Wi‑Fi, email, printers, VPN, software installs, and account access.
Give clear step-by-step guidance. Keep answers concise (under 200 words).
If the issue needs a human technician (hardware failure, security incident, access to sensitive systems), clearly say they should submit a support ticket on IntelliDesk.
Do not invent company-specific policies. Be professional and friendly.`;

export async function chatWithGemini(
  message: string,
  history: { role: "user" | "model"; text: string }[] = []
): Promise<{ available: boolean; reply: string }> {
  if (!isGeminiAvailable()) {
    return {
      available: false,
      reply:
        "AI chatbot is not available. Add GEMINI_API_KEY to the backend environment to enable it. You can still submit a support ticket.",
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: SYSTEM_PROMPT,
    });

    const chat = model.startChat({
      history: history.map((h) => ({
        role: h.role,
        parts: [{ text: h.text }],
      })),
    });

    const result = await chat.sendMessage(message);
    const reply = result.response.text();
    return { available: true, reply: reply || "I could not generate a reply. Please try again or open a ticket." };
  } catch (err) {
    console.error("Gemini error:", err);
    return {
      available: false,
      reply:
        "AI chatbot is not available right now (API error). Please submit a support ticket for human assistance.",
    };
  }
}

export async function suggestTicketResolution(
  title: string,
  description: string,
  category: string
): Promise<string | undefined> {
  if (!isGeminiAvailable()) return undefined;

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const model = genAI.getGenerativeModel({ model: modelName });
    const prompt = `As an IT help desk AI, suggest a brief troubleshooting plan for this ticket.
Category: ${category}
Title: ${title}
Description: ${description}

Return 3-5 short steps a technician can try. If escalation is likely, say so.`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    console.error("Gemini suggestion error:", err);
    return undefined;
  }
}
