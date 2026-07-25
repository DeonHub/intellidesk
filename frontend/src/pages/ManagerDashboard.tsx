import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Ticket } from "../api/client";
import { LegendList, SimpleBars, StatusDonut } from "../components/charts";
import "../styles/dashboard.css";

interface Overview {
  counts: {
    totalTickets: number;
    openTickets: number;
    inProgress: number;
    escalated: number;
    resolved: number;
    closed: number;
    slaBreached: number;
  };
  byPriority: { _id: string; count: number }[];
  byCategory: { _id: string; count: number }[];
  techWorkload: { id: string; name: string; email: string; activeTickets: number }[];
  satisfaction: { average: number | null; responses: number };
  slaConfigs: {
    _id: string;
    priority: string;
    responseHours: number;
    resolutionHours: number;
    isActive: boolean;
  }[];
}

export default function ManagerDashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [slaDraft, setSlaDraft] = useState<Overview["slaConfigs"]>([]);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  function load() {
    Promise.all([
      api<Overview>("/api/reports/overview"),
      api<{ tickets: Ticket[] }>("/api/tickets"),
    ])
      .then(([ov, tk]) => {
        setOverview(ov);
        setSlaDraft(ov.slaConfigs);
        setTickets(tk.tickets.slice(0, 10));
      })
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    load();
  }, []);

  async function saveSla(e: FormEvent) {
    e.preventDefault();
    setSaved("");
    try {
      const res = await api<{ configs: Overview["slaConfigs"] }>("/api/reports/sla", {
        method: "PUT",
        body: JSON.stringify({
          configs: slaDraft.map((c) => ({
            priority: c.priority,
            responseHours: Number(c.responseHours),
            resolutionHours: Number(c.resolutionHours),
            isActive: c.isActive,
          })),
        }),
      });
      setSlaDraft(res.configs);
      setSaved("SLA settings saved.");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save SLA");
    }
  }

  const charts = useMemo(() => {
    if (!overview) return null;
    const status = [
      { name: "Open", value: overview.counts.openTickets },
      { name: "In progress", value: overview.counts.inProgress },
      { name: "Escalated", value: overview.counts.escalated },
      { name: "Resolved", value: overview.counts.resolved },
      { name: "Closed", value: overview.counts.closed },
    ];
    const priority = (overview.byPriority || []).map((p) => ({
      name: p._id,
      value: p.count,
    }));
    const category = (overview.byCategory || []).map((c) => ({
      name: c._id,
      value: c.count,
    }));
    const workload = overview.techWorkload.map((t) => ({
      name: t.name.split(" ")[0],
      value: t.activeTickets,
    }));
    return { status, priority, category, workload };
  }, [overview]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Manager overview</h1>
          <p className="muted">
            Spot bottlenecks, balance the team, and keep SLAs healthy at a glance.
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {saved && <div className="alert alert-info">{saved}</div>}

      {overview && charts && (
        <>
          <div className="insight-row">
            <div className="panel stat">
              <div className="label">Open</div>
              <div className="value">{overview.counts.openTickets}</div>
              <div className="delta">Waiting to be claimed</div>
            </div>
            <div className="panel stat">
              <div className="label">In progress</div>
              <div className="value">{overview.counts.inProgress}</div>
              <div className="delta">Actively handled</div>
            </div>
            <div className={`panel stat ${overview.counts.slaBreached ? "warn" : "ok"}`}>
              <div className="label">SLA breached</div>
              <div className="value">{overview.counts.slaBreached}</div>
              <div className="delta">Needs attention now</div>
            </div>
            <div className="panel stat">
              <div className="label">Satisfaction</div>
              <div className="value">{overview.satisfaction.average ?? "—"}</div>
              <div className="delta">
                {overview.satisfaction.responses} feedback response
                {overview.satisfaction.responses === 1 ? "" : "s"}
              </div>
            </div>
          </div>

          <div className="dash-insights">
            <div className="panel chart-panel">
              <h3>Ticket pipeline</h3>
              <p className="hint">Volume across the support lifecycle</p>
              <StatusDonut data={charts.status} />
              <LegendList data={charts.status.filter((d) => d.value > 0)} />
            </div>
            <div className="panel chart-panel">
              <h3>Technician workload</h3>
              <p className="hint">Active tickets per team member</p>
              <SimpleBars
                data={
                  charts.workload.length
                    ? charts.workload
                    : [{ name: "None", value: 0 }]
                }
                color="#0f766e"
              />
            </div>
          </div>

          <div className="dash-insights">
            <div className="panel chart-panel">
              <h3>By priority</h3>
              <p className="hint">Where urgency is concentrating</p>
              <SimpleBars data={charts.priority} color="#e8a317" />
            </div>
            <div className="panel chart-panel">
              <h3>By category</h3>
              <p className="hint">Which IT areas generate the most tickets</p>
              <SimpleBars data={charts.category} color="#1f8a5b" />
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom: "1.25rem" }}>
            <div className="panel" style={{ padding: "1rem" }}>
              <h3 style={{ marginTop: 0 }}>Team allocation</h3>
              <table className="data">
                <thead>
                  <tr>
                    <th>Technician</th>
                    <th>Active</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.techWorkload.map((t) => (
                    <tr key={t.id}>
                      <td>
                        {t.name}
                        <br />
                        <span className="muted">{t.email}</span>
                      </td>
                      <td>{t.activeTickets}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <form className="panel" style={{ padding: "1rem" }} onSubmit={saveSla}>
              <h3 style={{ marginTop: 0 }}>Manage SLAs</h3>
              <p className="muted" style={{ marginTop: 0 }}>
                Response and resolution targets (hours) by priority.
              </p>
              {slaDraft.map((c, idx) => (
                <div key={c.priority} className="grid-2" style={{ marginBottom: "0.75rem" }}>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>{c.priority} response</label>
                    <input
                      type="number"
                      min={1}
                      value={c.responseHours}
                      onChange={(e) => {
                        const next = [...slaDraft];
                        next[idx] = { ...c, responseHours: Number(e.target.value) };
                        setSlaDraft(next);
                      }}
                    />
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>{c.priority} resolution</label>
                    <input
                      type="number"
                      min={1}
                      value={c.resolutionHours}
                      onChange={(e) => {
                        const next = [...slaDraft];
                        next[idx] = { ...c, resolutionHours: Number(e.target.value) };
                        setSlaDraft(next);
                      }}
                    />
                  </div>
                </div>
              ))}
              <button className="btn btn-primary btn-sm">Save SLA policy</button>
            </form>
          </div>
        </>
      )}

      <div className="panel ticket-list-panel table-wrap">
        <h3 style={{ margin: "0.5rem 0 0.75rem", color: "var(--teal-900)" }}>Recent tickets</h3>
        <table className="data">
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Title</th>
              <th>Status</th>
              <th>Priority</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t._id}>
                <td>
                  <Link to={`/app/tickets/${t._id}`}>{t.ticketNumber}</Link>
                </td>
                <td>{t.title}</td>
                <td>
                  <span className={`badge badge-${t.status}`}>
                    {t.status.replace("_", " ")}
                  </span>
                </td>
                <td>
                  <span className={`badge badge-${t.priority}`}>{t.priority}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
