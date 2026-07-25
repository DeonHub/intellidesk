import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Ticket } from "../api/client";
import { LegendList, SimpleBars, StatusDonut } from "../components/charts";
import { useAuth } from "../context/AuthContext";
import "../styles/dashboard.css";

export default function EndUserDashboard() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ tickets: Ticket[] }>("/api/tickets")
      .then((d) => setTickets(d.tickets))
      .catch((e) => setError(e.message));
  }, []);

  const stats = useMemo(() => {
    const active = tickets.filter((t) => !["resolved", "closed"].includes(t.status));
    const resolved = tickets.filter((t) => ["resolved", "closed"].includes(t.status));
    const awaiting = tickets.filter((t) => t.status === "awaiting_user");
    const byStatus = [
      { name: "Open", value: tickets.filter((t) => t.status === "open").length },
      { name: "In progress", value: tickets.filter((t) => t.status === "in_progress").length },
      { name: "Awaiting you", value: awaiting.length },
      { name: "Escalated", value: tickets.filter((t) => t.status === "escalated").length },
      { name: "Resolved", value: tickets.filter((t) => t.status === "resolved").length },
      { name: "Closed", value: tickets.filter((t) => t.status === "closed").length },
    ];
    const byCategoryMap = new Map<string, number>();
    tickets.forEach((t) => {
      byCategoryMap.set(t.category, (byCategoryMap.get(t.category) || 0) + 1);
    });
    const byCategory = Array.from(byCategoryMap.entries()).map(([name, value]) => ({
      name,
      value,
    }));
    return { active, resolved, awaiting, byStatus, byCategory };
  }, [tickets]);

  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Welcome back, {firstName}</h1>
          <p className="muted">
            Here’s a clear view of your support requests — what needs you, and what’s moving.
          </p>
        </div>
        <Link className="btn btn-primary" to="/app/tickets/new">
          New ticket
        </Link>
      </div>

      <div className="quick-actions">
        <Link className="btn btn-amber btn-sm" to="/app/tickets/new">
          Report an issue
        </Link>
        {stats.awaiting.length > 0 && (
          <span className="alert alert-info" style={{ margin: 0, padding: "0.45rem 0.85rem" }}>
            {stats.awaiting.length} ticket{stats.awaiting.length > 1 ? "s" : ""} waiting on your reply
          </span>
        )}
      </div>

      <div className="insight-row">
        <div className="panel stat">
          <div className="label">Active requests</div>
          <div className="value">{stats.active.length}</div>
          <div className="delta">Still being worked on</div>
        </div>
        <div className={`panel stat ${stats.awaiting.length ? "warn" : ""}`}>
          <div className="label">Needs your reply</div>
          <div className="value">{stats.awaiting.length}</div>
          <div className="delta">Awaiting your response</div>
        </div>
        <div className="panel stat ok">
          <div className="label">Resolved</div>
          <div className="value">{stats.resolved.length}</div>
          <div className="delta">Closed or completed</div>
        </div>
        <div className="panel stat">
          <div className="label">All tickets</div>
          <div className="value">{tickets.length}</div>
          <div className="delta">Your full history</div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="dash-insights">
        <div className="panel chart-panel">
          <h3>Request status</h3>
          <p className="hint">Where your tickets sit in the pipeline</p>
          <StatusDonut data={stats.byStatus} />
          <LegendList data={stats.byStatus.filter((d) => d.value > 0)} />
        </div>
        <div className="panel chart-panel">
          <h3>Issues by category</h3>
          <p className="hint">What kinds of problems you report most</p>
          <SimpleBars data={stats.byCategory.length ? stats.byCategory : [{ name: "None", value: 0 }]} />
        </div>
      </div>

      <div className="panel ticket-list-panel table-wrap">
        <h3 style={{ margin: "0.5rem 0 0.75rem", color: "var(--teal-900)" }}>Your tickets</h3>
        <table className="data">
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Title</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr
                key={t._id}
                className={t.status === "awaiting_user" ? "needs-attention" : undefined}
              >
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
                <td>{new Date(t.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
            {tickets.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  No tickets yet. Create one — or ask the AI assistant first for a quick fix.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
