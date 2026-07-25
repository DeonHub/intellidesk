const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

export function isNvidiaAvailable(): boolean {
  return Boolean(process.env.NVIDIA_API_KEY?.trim());
}

const SYSTEM_PROMPT = `You are IntelliDesk Assistant, a helpful AI for an IT help desk.
Help users with common IT issues: password resets, Wi‑Fi, email, printers, VPN, software installs, and account access.
Give clear step-by-step guidance. Keep answers concise (under 200 words).
If the issue needs a human technician (hardware failure, security incident, access to sensitive systems), clearly say they should submit a support ticket on IntelliDesk.
Do not invent company-specific policies. Be professional and friendly.`;

type ChatTurn = { role: "user" | "assistant" | "system"; content: string };

async function callNvidia(
  messages: ChatTurn[]
): Promise<{ available: boolean; reply: string }> {
  if (!isNvidiaAvailable()) {
    return {
      available: false,
      reply:
        "AI chatbot is not available. Add NVIDIA_API_KEY to the backend environment to enable it. You can still submit a support ticket.",
    };
  }

  const model =
    process.env.NVIDIA_MODEL || "meta/llama-3.1-8b-instruct";
  const maxTokens = Number(process.env.NVIDIA_MAX_TOKENS || 512);

  try {
    const response = await fetch(NVIDIA_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature: 0.2,
        top_p: 0.7,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("NVIDIA API error:", response.status, errText);
      return {
        available: false,
        reply:
          "AI chatbot is not available right now (API error). Please submit a support ticket for human assistance.",
      };
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const reply = data.choices?.[0]?.message?.content?.trim();
    return {
      available: true,
      reply:
        reply ||
        "I could not generate a reply. Please try again or open a ticket.",
    };
  } catch (err) {
    console.error("NVIDIA error:", err);
    return {
      available: false,
      reply:
        "AI chatbot is not available right now (API error). Please submit a support ticket for human assistance.",
    };
  }
}

export async function chatWithNvidia(
  message: string,
  history: { role: "user" | "model"; text: string }[] = []
): Promise<{ available: boolean; reply: string }> {
  const messages: ChatTurn[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((h) => ({
      role: (h.role === "model" ? "assistant" : "user") as "user" | "assistant",
      content: h.text,
    })),
    { role: "user", content: message },
  ];

  return callNvidia(messages);
}

export async function suggestTicketResolution(
  title: string,
  description: string,
  category: string
): Promise<string | undefined> {
  if (!isNvidiaAvailable()) return undefined;

  const result = await callNvidia([
    {
      role: "system",
      content:
        "You are an IT help desk assistant. Reply with a brief troubleshooting plan only.",
    },
    {
      role: "user",
      content: `Suggest a brief troubleshooting plan for this ticket.
Category: ${category}
Title: ${title}
Description: ${description}

Return 3-5 short steps a technician can try. If escalation is likely, say so.`,
    },
  ]);

  return result.available ? result.reply : undefined;
}
