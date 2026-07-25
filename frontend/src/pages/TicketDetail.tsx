import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api, type Ticket, type User } from "../api/client";
import { useAuth } from "../context/AuthContext";

interface Feedback {
  _id: string;
  rating: number;
  comment?: string;
}

function nameOf(p?: User | string | null) {
  if (!p) return "Unassigned";
  if (typeof p === "string") return p;
  return p.name;
}

function idOf(p?: User | string | null) {
  if (!p) return "";
  if (typeof p === "string") return p;
  return p.id || p._id || "";
}

export default function TicketDetail() {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const welcome = (location.state || {}) as {
    welcomePassword?: string;
    createdAccount?: boolean;
  };
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [rating, setRating] = useState(5);
  const [fbComment, setFbComment] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const staff = user && ["technician", "manager", "admin"].includes(user.role);

  function load() {
    if (!id) return;
    api<{ ticket: Ticket; feedback: Feedback | null }>(`/api/tickets/${id}`)
      .then((d) => {
        setTicket(d.ticket);
        setFeedback(d.feedback);
        setStatus(d.ticket.status);
        setPriority(d.ticket.priority);
        setAssignedTo(idOf(d.ticket.assignedTo));
      })
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    load();
    if (staff) {
      api<{ users: User[] }>("/api/users/technicians")
        .then((d) => setTechnicians(d.users))
        .catch(() => undefined);
    }
  }, [id]);

  async function addComment(e: FormEvent) {
    e.preventDefault();
    if (!id || !message.trim()) return;
    try {
      await api(`/api/tickets/${id}/comment`, {
        method: "POST",
        body: JSON.stringify({ message }),
      });
      setMessage("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to comment");
    }
  }

  async function updateTicket(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    try {
      await api(`/api/tickets/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          priority,
          assignedTo: assignedTo || null,
          message: message.trim() || undefined,
        }),
      });
      setMessage("");
      setInfo("Ticket updated.");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function escalate() {
    if (!id) return;
    try {
      await api(`/api/tickets/${id}/escalate`, {
        method: "POST",
        body: JSON.stringify({ reason: "Escalated from ticket detail view" }),
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Escalate failed");
    }
  }

  async function submitFeedback(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    try {
      await api("/api/feedback", {
        method: "POST",
        body: JSON.stringify({ ticketId: id, rating, comment: fbComment }),
      });
      setInfo("Thanks for your feedback.");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Feedback failed");
    }
  }

  if (!ticket) {
    return <div>{error || "Loading ticket…"}</div>;
  }

  const canFeedback =
    user?.role === "end_user" &&
    ["resolved", "closed"].includes(ticket.status) &&
    !feedback;

  return (
    <div>
      <div className="page-header">
        <div>
          <p className="muted" style={{ margin: 0 }}>
            <Link to="/app">← Back</Link>
          </p>
          <h1>
            {ticket.ticketNumber}: {ticket.title}
          </h1>
          <p className="muted">
            {ticket.category} · Created by {nameOf(ticket.createdBy as User)} · Assigned to{" "}
            {nameOf(ticket.assignedTo as User)}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <span className={`badge badge-${ticket.priority}`}>{ticket.priority}</span>
          <span className={`badge badge-${ticket.status}`}>
            {ticket.status.replace("_", " ")}
          </span>
        </div>
      </div>

      {welcome.createdAccount && welcome.welcomePassword && (
        <div className="alert alert-info">
          Account created so you can track this ticket. Save your sign-in password:{" "}
          <strong>{welcome.welcomePassword}</strong> (email: {user?.email})
        </div>
      )}
      {error && <div className="alert alert-error">{error}</div>}
      {info && <div className="alert alert-info">{info}</div>}

      <div className="grid-2">
        <div className="panel" style={{ padding: "1.1rem" }}>
          <h3 style={{ marginTop: 0 }}>Description</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{ticket.description}</p>
          {ticket.slaDueAt && (
            <p className="muted">SLA due: {new Date(ticket.slaDueAt).toLocaleString()}</p>
          )}
          {ticket.aiSuggestedResolution && staff && (
            <>
              <h3>AI suggested plan</h3>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  background: "var(--mist)",
                  padding: "0.85rem",
                  borderRadius: 12,
                  fontFamily: "inherit",
                }}
              >
                {ticket.aiSuggestedResolution}
              </pre>
            </>
          )}

          <h3>Activity</h3>
          <div style={{ display: "grid", gap: "0.65rem" }}>
            {ticket.updates
              .filter((u) => !(u.isInternal && user?.role === "end_user"))
              .map((u, i) => (
                <div
                  key={i}
                  style={{
                    padding: "0.75rem",
                    background: "rgba(255,255,255,0.65)",
                    borderRadius: 12,
                    border: "1px solid rgba(15,118,110,0.1)",
                  }}
                >
                  <strong>{nameOf(u.author as User)}</strong>
                  <span className="muted"> · {new Date(u.createdAt).toLocaleString()}</span>
                  <p style={{ margin: "0.35rem 0 0", whiteSpace: "pre-wrap" }}>{u.message}</p>
                </div>
              ))}
          </div>

          <form onSubmit={addComment} style={{ marginTop: "1rem" }}>
            <div className="field">
              <label>Add a comment</label>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Share an update…"
              />
            </div>
            <button className="btn btn-secondary btn-sm" disabled={!message.trim()}>
              Post comment
            </button>
          </form>
        </div>

        <div style={{ display: "grid", gap: "1rem", alignContent: "start" }}>
          {staff && (
            <form className="panel" style={{ padding: "1.1rem" }} onSubmit={updateTicket}>
              <h3 style={{ marginTop: 0 }}>Staff controls</h3>
              <div className="field">
                <label>Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="open">open</option>
                  <option value="in_progress">in_progress</option>
                  <option value="awaiting_user">awaiting_user</option>
                  <option value="escalated">escalated</option>
                  <option value="resolved">resolved</option>
                  <option value="closed">closed</option>
                </select>
              </div>
              <div className="field">
                <label>Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                  <option value="critical">critical</option>
                </select>
              </div>
              <div className="field">
                <label>Assign to</label>
                <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                  <option value="">Unassigned</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button className="btn btn-primary btn-sm">Save changes</button>
                <button type="button" className="btn btn-amber btn-sm" onClick={escalate}>
                  Escalate
                </button>
              </div>
            </form>
          )}

          {canFeedback && (
            <form className="panel" style={{ padding: "1.1rem" }} onSubmit={submitFeedback}>
              <h3 style={{ marginTop: 0 }}>Rate this resolution</h3>
              <div className="field">
                <label>Rating (1–5)</label>
                <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Comment (optional)</label>
                <textarea
                  rows={3}
                  value={fbComment}
                  onChange={(e) => setFbComment(e.target.value)}
                />
              </div>
              <button className="btn btn-primary btn-sm">Submit feedback</button>
            </form>
          )}

          {feedback && (
            <div className="panel" style={{ padding: "1.1rem" }}>
              <h3 style={{ marginTop: 0 }}>Feedback received</h3>
              <p>
                Rating: <strong>{feedback.rating}/5</strong>
              </p>
              {feedback.comment && <p>{feedback.comment}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
