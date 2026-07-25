import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import "./chatbot.css";

interface Msg {
  role: "user" | "model";
  text: string;
}

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "model",
      text: "Hi — I’m the IntelliDesk assistant. Ask about common IT issues, or I’ll guide you to open a ticket.",
    },
  ]);

  useEffect(() => {
    api<{ available: boolean }>("/api/chat/status")
      .then((d) => setAvailable(d.available))
      .catch(() => setAvailable(false));
  }, []);

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;

    const next = [...messages, { role: "user" as const, text }];
    setMessages(next);
    setInput("");
    setBusy(true);

    try {
      const history = next
        .slice(1)
        .slice(0, -1)
        .map((m) => ({ role: m.role, text: m.text }));
      const res = await api<{ available: boolean; reply: string }>("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message: text, history }),
      });
      setAvailable(res.available);
      setMessages((prev) => [...prev, { role: "model", text: res.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: "AI chatbot is not available. Please submit a support ticket.",
        },
      ]);
      setAvailable(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="chatbot">
      {open && (
        <div className="chat-panel panel">
          <header>
            <div>
              <strong>IntelliDesk Assistant</strong>
              <p className="muted">
                {available === false
                  ? "Not available — add GEMINI_API_KEY on the server"
                  : "AI help · human tickets when needed"}
              </p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
              Close
            </button>
          </header>
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`bubble ${m.role}`}>
                {m.text}
              </div>
            ))}
          </div>
          <form onSubmit={send}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                available === false
                  ? "Chat unavailable — try a ticket"
                  : "Describe your IT issue…"
              }
              disabled={busy}
            />
            <button className="btn btn-primary btn-sm" disabled={busy || !input.trim()}>
              Send
            </button>
          </form>
        </div>
      )}
      <button className="chat-fab btn btn-amber" onClick={() => setOpen((v) => !v)}>
        {open ? "Hide chat" : "Ask AI"}
      </button>
    </div>
  );
}
