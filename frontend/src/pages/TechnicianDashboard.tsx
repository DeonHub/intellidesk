import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Ticket, type User } from "../api/client";
import { LegendList, SimpleBars, StatusDonut } from "../components/charts";
import { useAuth } from "../context/AuthContext";
import "../styles/dashboard.css";

export default function TechnicianDashboard() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState("");

  function load() {
    api<{ tickets: Ticket[] }>("/api/tickets")
      .then((d) => setTickets(d.tickets))
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    load();
  }, []);

  async function claim(id: string) {
    try {
      const me = await api<{ user: User }>("/api/auth/me");
      await api(`/api/tickets/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          assignedTo: me.user.id,
          status: "in_progress",
          message: "Ticket claimed by technician",
        }),
      });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to claim");
    }
  }

  const insights = useMemo(() => {
    const now = Date.now();
    const queue = tickets.filter((t) => t.status === "open" || t.status === "escalated");
    const mine = tickets.filter((t) => {
      const assignee =
        typeof t.assignedTo === "object" && t.assignedTo
          ? t.assignedTo.id || t.assignedTo._id
          : t.assignedTo;
      return String(assignee || "") === String(user?.id || "") &&
        ["in_progress", "awaiting_user"].includes(t.status);
    });
    const breached = tickets.filter(
      (t) =>
        t.slaDueAt &&
        new Date(t.slaDueAt).getTime() < now &&
        !["resolved", "closed"].includes(t.status)
    );
    const byPriority = ["critical", "high", "medium", "low"].map((p) => ({
      name: p,
      value: tickets.filter((t) => t.priority === p && !["resolved", "closed"].includes(t.status))
        .length,
    }));
    const byStatus = [
      { name: "Open", value: tickets.filter((t) => t.status === "open").length },
      { name: "In progress", value: tickets.filter((t) => t.status === "in_progress").length },
      { name: "Awaiting user", value: tickets.filter((t) => t.status === "awaiting_user").length },
      { name: "Escalated", value: tickets.filter((t) => t.status === "escalated").length },
      { name: "Resolved", value: tickets.filter((t) => t.status === "resolved").length },
    ];
    return { queue, mine, breached, byPriority, byStatus };
  }, [tickets, user?.id]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Technician workspace</h1>
          <p className="muted">
            Focus on the queue, your active work, and anything risking an SLA breach.
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="insight-row">
        <div className="panel stat">
          <div className="label">Unclaimed / escalated</div>
          <div className="value">{insights.queue.length}</div>
          <div className="delta">Ready to pick up</div>
        </div>
        <div className="panel stat">
          <div className="label">On my plate</div>
          <div className="value">{insights.mine.length}</div>
          <div className="delta">Assigned to you</div>
        </div>
        <div className={`panel stat ${insights.breached.length ? "warn" : "ok"}`}>
          <div className="label">SLA at risk</div>
          <div className="value">{insights.breached.length}</div>
          <div className="delta">Past due & still open</div>
        </div>
        <div className="panel stat">
          <div className="label">Visible tickets</div>
          <div className="value">{tickets.length}</div>
          <div className="delta">In your queue view</div>
        </div>
      </div>

      <div className="dash-insights">
        <div className="panel chart-panel">
          <h3>Active priority mix</h3>
          <p className="hint">Open work by urgency — tackle critical first</p>
          <SimpleBars data={insights.byPriority} color="#e8a317" />
        </div>
        <div className="panel chart-panel">
          <h3>Pipeline snapshot</h3>
          <p className="hint">How tickets are distributed right now</p>
          <StatusDonut data={insights.byStatus} />
          <LegendList data={insights.byStatus.filter((d) => d.value > 0)} />
        </div>
      </div>

      <div className="panel ticket-list-panel table-wrap">
        <h3 style={{ margin: "0.5rem 0 0.75rem", color: "var(--teal-900)" }}>Work queue</h3>
        <table className="data">
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Title</th>
              <th>Priority</th>
              <th>Status</th>
              <th>SLA due</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => {
              const overdue =
                t.slaDueAt &&
                new Date(t.slaDueAt).getTime() < Date.now() &&
                !["resolved", "closed"].includes(t.status);
              return (
                <tr key={t._id} className={overdue ? "needs-attention" : undefined}>
                  <td>
                    <Link to={`/app/tickets/${t._id}`}>{t.ticketNumber}</Link>
                  </td>
                  <td>{t.title}</td>
                  <td>
                    <span className={`badge badge-${t.priority}`}>{t.priority}</span>
                  </td>
                  <td>
                    <span className={`badge badge-${t.status}`}>
                      {t.status.replace("_", " ")}
                    </span>
                  </td>
                  <td>{t.slaDueAt ? new Date(t.slaDueAt).toLocaleString() : "—"}</td>
                  <td>
                    {!t.assignedTo && t.status === "open" && (
                      <button className="btn btn-secondary btn-sm" onClick={() => claim(t._id)}>
                        Claim
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {tickets.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  Queue is clear. Nice work.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
