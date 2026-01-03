"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface CoachConsistencyData {
  name: string;
  consistencyScore: number;
}

interface ConsistencyComparisonChartProps {
  data: CoachConsistencyData[];
}

// Get color based on consistency score
function getScoreColor(score: number): string {
  if (score >= 70) return "#22c55e"; // green
  if (score >= 40) return "#eab308"; // yellow
  return "#ef4444"; // red
}

export function ConsistencyComparisonChart({ data }: ConsistencyComparisonChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-foreground-muted text-sm">
        Nema podataka o doslednosti
      </div>
    );
  }

  // Sort by consistency score descending
  const sortedData = [...data].sort((a, b) => b.consistencyScore - a.consistencyScore);

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sortedData}
          layout="vertical"
          margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
        >
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fill: "var(--foreground-muted)", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            tickFormatter={(value) => `${value}%`}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: "var(--foreground-muted)", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={100}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--background-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            }}
            labelStyle={{ color: "var(--foreground)", fontWeight: 600 }}
            itemStyle={{ color: "var(--foreground-muted)" }}
            formatter={(value) => [`${value}%`, "Prosek doslednosti"]}
          />
          <Bar dataKey="consistencyScore" radius={[0, 4, 4, 0]} barSize={24}>
            {sortedData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getScoreColor(entry.consistencyScore)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
