import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const COLORS = ["#0f766e", "#e8a317", "#1f8a5b", "#c23b3b", "#4a6fa5", "#8a6d3b"];

export function StatusDonut({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const filtered = data.filter((d) => d.value > 0);
  if (filtered.length === 0) {
    return <p className="muted chart-empty">No data yet</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={filtered}
          dataKey="value"
          nameKey="name"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
        >
          {filtered.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function SimpleBars({
  data,
  color = "#0f766e",
}: {
  data: { name: string; value: number }[];
  color?: string;
}) {
  if (data.every((d) => d.value === 0)) {
    return <p className="muted chart-empty">No data yet</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(15,118,110,0.12)" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={28} />
        <Tooltip />
        <Bar dataKey="value" fill={color} radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LegendList({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <ul className="chart-legend">
      {data.map((d, i) => (
        <li key={d.name}>
          <span className="swatch" style={{ background: COLORS[i % COLORS.length] }} />
          <span>{d.name}</span>
          <strong>
            {d.value} ({Math.round((d.value / total) * 100)}%)
          </strong>
        </li>
      ))}
    </ul>
  );
}
