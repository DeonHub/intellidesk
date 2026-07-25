import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./layout.css";

const roleLabel: Record<string, string> = {
  end_user: "End User",
  technician: "IT Technician",
  manager: "IT Manager",
  admin: "System Admin",
};

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand" onClick={() => navigate("/app")}>
          <img src="/logo.png" alt="IntelliDesk" />
          <div>
            <strong>IntelliDesk</strong>
            <span>{roleLabel[user?.role || "end_user"]}</span>
          </div>
        </div>

        <nav>
          <NavLink to="/app" end>
            Dashboard
          </NavLink>
          {(user?.role === "end_user" || user?.role === "admin") && (
            <NavLink to="/app/tickets/new">New ticket</NavLink>
          )}
        </nav>

        <div className="sidebar-user">
          <p>
            <strong>{user?.name}</strong>
            <br />
            <span className="muted">{user?.email}</span>
          </p>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
