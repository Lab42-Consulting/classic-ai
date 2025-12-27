"use client";

import { StatusType } from "./status-indicator";

interface MacroBarProps {
  label: string;
  percentage: number;
  status?: StatusType;
}

const statusColors: Record<StatusType, string> = {
  on_track: "bg-success",
  needs_attention: "bg-warning",
  off_track: "bg-error",
};

export function MacroBar({
  label,
  percentage,
  status = "on_track",
}: MacroBarProps) {
  const clampedPercentage = Math.min(100, Math.max(0, percentage));

  return (
    <div className="flex items-center gap-4">
      <span className="w-16 text-sm font-medium text-foreground-muted">
        {label}
      </span>
      <div className="flex-1 h-2 bg-background-tertiary rounded-full overflow-hidden">
        <div
          className={`h-full ${statusColors[status]} rounded-full transition-all duration-300`}
          style={{ width: `${clampedPercentage}%` }}
        />
      </div>
      <span className="w-12 text-sm font-medium text-foreground text-right">
        {Math.round(percentage)}%
      </span>
    </div>
  );
}

interface MacroDistributionProps {
  protein: { percentage: number; status?: StatusType };
  carbs: { percentage: number; status?: StatusType };
  fats: { percentage: number; status?: StatusType };
}

export function MacroDistribution({
  protein,
  carbs,
  fats,
}: MacroDistributionProps) {
  return (
    <div className="space-y-3">
      <MacroBar
        label="Protein"
        percentage={protein.percentage}
        status={protein.status}
      />
      <MacroBar
        label="Carbs"
        percentage={carbs.percentage}
        status={carbs.status}
      />
      <MacroBar
        label="Fats"
        percentage={fats.percentage}
        status={fats.status}
      />
    </div>
  );
}

export type { MacroBarProps, MacroDistributionProps };
