"use client";

import { useEffect, useState } from "react";

interface ProgressRingProps {
  progress: number; // 0-100+ (can exceed 100 for overflow)
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
  className?: string;
  animated?: boolean;
  showOverflow?: boolean; // Enable overflow visualization
}

export function ProgressRing({
  progress,
  size = 200,
  strokeWidth = 12,
  children,
  className = "",
  animated = true,
  showOverflow = false,
}: ProgressRingProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  // For display, cap at 100 for the ring but track actual value for color
  const displayProgress = Math.min(100, animatedProgress);
  const offset = circumference - (displayProgress / 100) * circumference;
  const isOverflow = showOverflow && progress > 100;

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        // Allow values over 100 for overflow detection
        setAnimatedProgress(Math.max(0, progress));
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setAnimatedProgress(progress);
    }
  }, [progress, animated]);

  // Determine color based on progress and overflow state
  const getColor = () => {
    if (isOverflow) return "var(--status-error)"; // Red for overflow
    if (animatedProgress >= 90) return "var(--status-success)";
    if (animatedProgress >= 50) return "var(--accent)";
    return "var(--accent)";
  };

  // Add padding for glow effect
  const glowPadding = isOverflow ? 20 : 12;
  const totalSize = size + glowPadding * 2;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={totalSize}
        height={totalSize}
        className={`transform -rotate-90 ${isOverflow ? "animate-pulse" : ""}`}
        style={{ overflow: "visible" }}
      >
        {/* Background circle */}
        <circle
          cx={totalSize / 2}
          cy={totalSize / 2}
          r={radius}
          fill="none"
          stroke={isOverflow ? "var(--status-error-muted, rgba(220, 38, 38, 0.2))" : "var(--background-tertiary)"}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={totalSize / 2}
          cy={totalSize / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
          style={{
            filter: isOverflow
              ? `drop-shadow(0 0 16px var(--status-error))`
              : `drop-shadow(0 0 10px ${getColor()}40)`,
          }}
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

export type { ProgressRingProps };
