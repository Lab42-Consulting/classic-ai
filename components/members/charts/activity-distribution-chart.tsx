"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

interface ActivityDistributionData {
  active: number;
  slipping: number;
  inactive: number;
}

interface ActivityDistributionChartProps {
  data: ActivityDistributionData;
}

const COLORS = {
  active: "#22c55e",
  slipping: "#eab308",
  inactive: "#ef4444",
};

const LABELS = {
  active: "Aktivni",
  slipping: "Slabe",
  inactive: "Neaktivni",
};

export function ActivityDistributionChart({ data }: ActivityDistributionChartProps) {
  const chartData = [
    { name: LABELS.active, value: data.active, color: COLORS.active },
    { name: LABELS.slipping, value: data.slipping, color: COLORS.slipping },
    { name: LABELS.inactive, value: data.inactive, color: COLORS.inactive },
  ].filter((item) => item.value > 0);

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-foreground-muted text-sm">
        Nema podataka o aktivnosti
      </div>
    );
  }

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--background-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            }}
            labelStyle={{ color: "var(--foreground)", fontWeight: 600 }}
            itemStyle={{ color: "var(--foreground-muted)" }}
            formatter={(value) => [
              `${value} (${Math.round((Number(value) / total) * 100)}%)`,
              "Članova",
            ]}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => (
              <span style={{ color: "var(--foreground-muted)", fontSize: "12px" }}>
                {value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
