import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, type User, type UserRole } from "../api/client";
import { LegendList, SimpleBars, StatusDonut } from "../components/charts";
import "../styles/dashboard.css";

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "qwertyuiop",
    role: "technician" as UserRole,
    department: "IT Support",
  });

  function load() {
    api<{ users: User[] }>("/api/users")
      .then((d) => setUsers(d.users))
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    load();
  }, []);

  const insights = useMemo(() => {
    const active = users.filter((u) => u.isActive).length;
    const disabled = users.length - active;
    const byRole = [
      { name: "End users", value: users.filter((u) => u.role === "end_user").length },
      { name: "Technicians", value: users.filter((u) => u.role === "technician").length },
      { name: "Managers", value: users.filter((u) => u.role === "manager").length },
      { name: "Admins", value: users.filter((u) => u.role === "admin").length },
    ];
    const deptMap = new Map<string, number>();
    users.forEach((u) => {
      const d = u.department || "General";
      deptMap.set(d, (deptMap.get(d) || 0) + 1);
    });
    const byDept = Array.from(deptMap.entries()).map(([name, value]) => ({ name, value }));
    return { active, disabled, byRole, byDept };
  }, [users]);

  async function createUser(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/users", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm({
        name: "",
        email: "",
        password: "qwertyuiop",
        role: "technician",
        department: "IT Support",
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    }
  }

  async function toggleActive(u: User) {
    try {
      await api(`/api/users/${u.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !u.isActive }),
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function changeRole(u: User, role: UserRole) {
    try {
      await api(`/api/users/${u.id}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>System administration</h1>
          <p className="muted">
            See who has access, balance roles, and keep accounts secure.
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="insight-row">
        <div className="panel stat">
          <div className="label">Total users</div>
          <div className="value">{users.length}</div>
          <div className="delta">Across all roles</div>
        </div>
        <div className="panel stat ok">
          <div className="label">Active</div>
          <div className="value">{insights.active}</div>
          <div className="delta">Can sign in</div>
        </div>
        <div className={`panel stat ${insights.disabled ? "warn" : ""}`}>
          <div className="label">Disabled</div>
          <div className="value">{insights.disabled}</div>
          <div className="delta">Access blocked</div>
        </div>
        <div className="panel stat">
          <div className="label">Support staff</div>
          <div className="value">
            {insights.byRole.find((r) => r.name === "Technicians")?.value || 0}
          </div>
          <div className="delta">Technicians on roster</div>
        </div>
      </div>

      <div className="dash-insights">
        <div className="panel chart-panel">
          <h3>Users by role</h3>
          <p className="hint">Permission distribution across the system</p>
          <StatusDonut data={insights.byRole} />
          <LegendList data={insights.byRole.filter((d) => d.value > 0)} />
        </div>
        <div className="panel chart-panel">
          <h3>Users by department</h3>
          <p className="hint">Where accounts are concentrated</p>
          <SimpleBars
            data={insights.byDept.length ? insights.byDept : [{ name: "None", value: 0 }]}
          />
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: "1.25rem" }}>
        <form className="panel" style={{ padding: "1rem" }} onSubmit={createUser}>
          <h3 style={{ marginTop: 0 }}>Create user</h3>
          <div className="field">
            <label>Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label>Role</label>
            <select
              value={form.role}
              onChange={(e) =>
                setForm({ ...form, role: e.target.value as UserRole })
              }
            >
              <option value="end_user">End user</option>
              <option value="technician">Technician</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="field">
            <label>Department</label>
            <input
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            />
          </div>
          <button className="btn btn-primary">Add user</button>
        </form>

        <div className="panel" style={{ padding: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>Security checklist</h3>
          <ul className="muted" style={{ lineHeight: 1.7 }}>
            <li>Rotate JWT_SECRET before production deploy.</li>
            <li>Restrict CORS_ORIGINS to your Netlify URL.</li>
            <li>Keep SEED_ON_START=false after first seed in production.</li>
            <li>Store MongoDB credentials only in environment variables.</li>
            <li>NVIDIA_API_KEY is optional; chat reports “not available” without it.</li>
          </ul>
        </div>
      </div>

      <div className="panel ticket-list-panel table-wrap">
        <h3 style={{ margin: "0.5rem 0 0.75rem", color: "var(--teal-900)" }}>All accounts</h3>
        <table className="data">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>
                  <select
                    value={u.role}
                    onChange={(e) => changeRole(u, e.target.value as UserRole)}
                  >
                    <option value="end_user">end_user</option>
                    <option value="technician">technician</option>
                    <option value="manager">manager</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td>{u.isActive ? "Active" : "Disabled"}</td>
                <td>
                  <button className="btn btn-secondary btn-sm" onClick={() => toggleActive(u)}>
                    {u.isActive ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
