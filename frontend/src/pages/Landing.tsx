import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, type Ticket, type User } from "../api/client";
import { useAuth } from "../context/AuthContext";
import "./landing.css";

export default function Landing() {
  const { user, acceptSession } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    title: "",
    description: "",
    category: "software",
    priority: "medium",
  });

  async function submitTicket(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      if (user) {
        const res = await api<{ ticket: Ticket }>("/api/tickets", {
          method: "POST",
          body: JSON.stringify({
            title: form.title,
            description: form.description,
            category: form.category,
            priority: form.priority,
          }),
        });
        navigate(`/app/tickets/${res.ticket._id}`);
        return;
      }

      const res = await api<{
        ticket: Ticket;
        token?: string;
        user?: User;
        createdAccount: boolean;
        requiresLogin?: boolean;
        temporaryPassword?: string;
        message?: string;
      }>("/api/tickets/quick", {
        method: "POST",
        body: JSON.stringify(form),
      });

      if (res.token && res.user) {
        acceptSession(res.token, res.user);
        navigate(`/app/tickets/${res.ticket._id}`, {
          state: {
            welcomePassword: res.temporaryPassword,
            createdAccount: res.createdAccount,
          },
        });
        return;
      }

      // Existing account — ticket created; ask them to sign in to track
      navigate("/login", {
        state: {
          email: form.email,
          notice: `${res.message || "Ticket submitted."} Ticket ${res.ticket.ticketNumber}.`,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit ticket");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="landing">
      <div className="landing-hero-bleed">
        <div className="hero-sheen" aria-hidden="true" />
        <header className="landing-nav container">
          <div className="brand">
            <img src="/logo.png" alt="" />
            <span>IntelliDesk</span>
          </div>
          <nav className="nav-links" aria-label="Primary">
            <a href="#report">Report issue</a>
            <a href="#how">How it works</a>
            <a href="#why">Why IntelliDesk</a>
          </nav>
          <div className="nav-actions">
            {user ? (
              <Link className="btn btn-primary" to="/app">
                Open dashboard
              </Link>
            ) : (
              <>
                <Link className="btn btn-secondary" to="/login">
                  Sign in
                </Link>
                <a className="btn btn-primary" href="#report">
                  Get help now
                </a>
              </>
            )}
          </div>
        </header>

        <section className="hero container" id="report">
          <div className="hero-copy">
            <p className="hero-kicker">AI-powered IT help desk</p>
            <h1 className="brand-hero">IntelliDesk</h1>
            <p className="lede">
              Stuck on an IT problem? Tell us once — get guided help, a tracked
              ticket, and a real technician when you need one. No signup maze.
            </p>
            <ul className="hero-points">
              <li>Submit in under a minute</li>
              <li>Track status live</li>
              <li>AI + human support</li>
            </ul>
          </div>

          <form className="report-panel" onSubmit={submitTicket}>
            <div className="report-panel-head">
              <h2>Report an issue</h2>
              <p>
                {user
                  ? `Signed in as ${user.name} — we’ll attach this to your account.`
                  : "No account needed. We’ll create one so you can track the ticket."}
              </p>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {!user && (
              <div className="report-grid">
                <div className="field">
                  <label htmlFor="r-name">Full name</label>
                  <input
                    id="r-name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    placeholder="Alex Morgan"
                  />
                </div>
                <div className="field">
                  <label htmlFor="r-email">Work email</label>
                  <input
                    id="r-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    placeholder="you@company.com"
                  />
                </div>
              </div>
            )}

            <div className="field">
              <label htmlFor="r-title">What’s wrong?</label>
              <input
                id="r-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                placeholder="e.g. Can’t connect to office Wi‑Fi"
              />
            </div>

            <div className="field">
              <label htmlFor="r-desc">A few details</label>
              <textarea
                id="r-desc"
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                required
                placeholder="What were you trying to do? Any error messages?"
              />
            </div>

            <div className="report-grid">
              <div className="field">
                <label htmlFor="r-cat">Category</label>
                <select
                  id="r-cat"
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                >
                  <option value="hardware">Hardware</option>
                  <option value="software">Software</option>
                  <option value="network">Network</option>
                  <option value="account">Account / Access</option>
                  <option value="email">Email</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="r-pri">Priority</label>
                <select
                  id="r-pri"
                  value={form.priority}
                  onChange={(e) =>
                    setForm({ ...form, priority: e.target.value })
                  }
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <button className="btn btn-amber report-submit" disabled={busy}>
              {busy ? "Submitting…" : "Submit ticket"}
            </button>
            {!user && (
              <p className="report-note">
                Already registered? <Link to="/login">Sign in</Link> instead.
              </p>
            )}
          </form>
        </section>
      </div>

      <section id="how" className="how container">
        <h2>From problem to resolution — without the chaos</h2>
        <p className="section-sub">
          Three calm steps. No email threads. No “who owns this?” moments.
        </p>
        <ol className="steps">
          <li>
            <span className="step-num">01</span>
            <h3>Describe the issue</h3>
            <p>Use the form above — or ask the AI assistant after you’re in.</p>
          </li>
          <li>
            <span className="step-num">02</span>
            <h3>Watch it move</h3>
            <p>Live status, comments, and SLA timers keep every request visible.</p>
          </li>
          <li>
            <span className="step-num">03</span>
            <h3>Close with confidence</h3>
            <p>Technicians finish the job — you rate the outcome when it’s done.</p>
          </li>
        </ol>
      </section>

      <section id="why" className="why">
        <div className="container why-inner">
          <h2>Why teams switch to IntelliDesk</h2>
          <p className="section-sub">
            Less waiting. Clearer ownership. Support that actually feels modern.
          </p>
          <div className="why-grid">
            <div>
              <h3>Faster first answers</h3>
              <p>
                Wi‑Fi, email, passwords, printers — guided fixes before a ticket
                even opens.
              </p>
            </div>
            <div>
              <h3>Humans when it matters</h3>
              <p>
                Tough or sensitive issues escalate with full context — no
                starting over.
              </p>
            </div>
            <div>
              <h3>Leaders stay ahead</h3>
              <p>
                SLAs, workload, and satisfaction live in one view — not a
                spreadsheet maze.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="preview" className="preview container">
        <div className="preview-head">
          <h2>A support request that never gets lost</h2>
          <p className="section-sub">
            Follow one ticket from “I’m stuck” to “all clear” — with AI help and
            human care in the same flow.
          </p>
        </div>

        <div className="preview-stage">
          <div className="preview-ticket">
            <div className="preview-ticket-top">
              <span className="preview-id">ID-2026-00042</span>
              <span className="preview-pill">In progress</span>
            </div>
            <h3>Can’t connect to office Wi‑Fi</h3>
            <p>
              Laptop sees the network, but authentication fails after the password
              prompt.
            </p>
            <div className="preview-meta">
              <span>Priority · High</span>
              <span>Category · Network</span>
              <span>Assignee · Alex Rivera</span>
            </div>
          </div>

          <ol className="journey">
            <li>
              <span className="journey-dot" />
              <div>
                <strong>You report it</strong>
                <p>Opened from the landing page in seconds — account created for you.</p>
              </div>
            </li>
            <li>
              <span className="journey-dot" />
              <div>
                <strong>AI drafts a plan</strong>
                <p>Technicians see suggested steps instantly, so diagnosis starts warmer.</p>
              </div>
            </li>
            <li>
              <span className="journey-dot" />
              <div>
                <strong>A human takes over</strong>
                <p>Claimed, updated, and tracked against SLA until the network works again.</p>
              </div>
            </li>
            <li>
              <span className="journey-dot" />
              <div>
                <strong>You confirm & rate</strong>
                <p>Close the loop with feedback so the next fix gets even smoother.</p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <section className="final-cta">
        <div className="container final-cta-inner">
          <h2>Have an IT issue right now?</h2>
          <p>Skip the signup wall. Report it above and track it immediately.</p>
          <div className="cta-row">
            <a className="btn btn-amber" href="#report">
              Report an issue
            </a>
            <Link className="btn btn-secondary" to="/login">
              Staff sign in
            </Link>
          </div>
        </div>
      </section>

      <footer className="landing-footer container">
        <div className="brand">
          <img src="/logo.png" alt="" />
          <span>IntelliDesk</span>
        </div>
        <span>Smart IT support · AI when helpful · Humans when necessary</span>
      </footer>
    </div>
  );
}
