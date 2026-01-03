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

interface CoachData {
  name: string;
  memberCount: number;
}

interface MembersPerCoachChartProps {
  data: CoachData[];
}

export function MembersPerCoachChart({ data }: MembersPerCoachChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-foreground-muted text-sm">
        Nema podataka o trenerima
      </div>
    );
  }

  // Sort by member count descending
  const sortedData = [...data].sort((a, b) => b.memberCount - a.memberCount);

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sortedData}
          margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
        >
          <XAxis
            dataKey="name"
            tick={{ fill: "var(--foreground-muted)", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            interval={0}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tick={{ fill: "var(--foreground-muted)", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
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
            formatter={(value) => [`${value} članova`, "Broj članova"]}
          />
          <Bar dataKey="memberCount" radius={[4, 4, 0, 0]}>
            {sortedData.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={index === 0 ? "#ef4444" : "#ef444480"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
