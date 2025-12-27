"use client";

interface StreakProps {
  count: number;
  label?: string;
}

export function Streak({ count, label = "days consistent" }: StreakProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center justify-center w-12 h-12 bg-accent/10 rounded-xl">
        <svg
          className="w-6 h-6 text-accent"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
      </div>
      <div>
        <span className="text-2xl font-bold text-foreground">{count}</span>
        <span className="ml-2 text-foreground-muted">{label}</span>
      </div>
    </div>
  );
}

export type { StreakProps };
