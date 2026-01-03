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

interface GoalDistributionData {
  fat_loss: number;
  muscle_gain: number;
  recomposition: number;
}

interface GoalDistributionChartProps {
  data: GoalDistributionData;
}

const COLORS = {
  fat_loss: "#f97316",
  muscle_gain: "#3b82f6",
  recomposition: "#8b5cf6",
};

const LABELS = {
  fat_loss: "Mršavljenje",
  muscle_gain: "Rast mišića",
  recomposition: "Rekompozicija",
};

export function GoalDistributionChart({ data }: GoalDistributionChartProps) {
  const chartData = [
    { name: LABELS.fat_loss, value: data.fat_loss, color: COLORS.fat_loss },
    { name: LABELS.muscle_gain, value: data.muscle_gain, color: COLORS.muscle_gain },
    { name: LABELS.recomposition, value: data.recomposition, color: COLORS.recomposition },
  ];

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-foreground-muted text-sm">
        Nema podataka o ciljevima
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
        >
          <XAxis
            type="number"
            tick={{ fill: "var(--foreground-muted)", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
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
            formatter={(value) => [
              `${value} (${Math.round((Number(value) / total) * 100)}%)`,
              "Članova",
            ]}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
