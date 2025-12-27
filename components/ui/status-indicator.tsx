"use client";

import { HTMLAttributes } from "react";

type StatusType = "on_track" | "needs_attention" | "off_track";

interface StatusIndicatorProps extends HTMLAttributes<HTMLDivElement> {
  status: StatusType;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

const statusConfig: Record<
  StatusType,
  { color: string; bgColor: string; label: string }
> = {
  on_track: {
    color: "bg-success",
    bgColor: "bg-success-muted/30",
    label: "On track",
  },
  needs_attention: {
    color: "bg-warning",
    bgColor: "bg-warning-muted/30",
    label: "Needs attention",
  },
  off_track: {
    color: "bg-error",
    bgColor: "bg-error-muted/30",
    label: "Off track",
  },
};

const sizeStyles = {
  sm: {
    dot: "w-2 h-2",
    text: "text-sm",
    gap: "gap-1.5",
    padding: "px-2 py-1",
  },
  md: {
    dot: "w-3 h-3",
    text: "text-base",
    gap: "gap-2",
    padding: "px-3 py-1.5",
  },
  lg: {
    dot: "w-4 h-4",
    text: "text-lg",
    gap: "gap-2.5",
    padding: "px-4 py-2",
  },
};

export function StatusIndicator({
  status,
  showLabel = true,
  size = "md",
  className = "",
  ...props
}: StatusIndicatorProps) {
  const config = statusConfig[status];
  const sizes = sizeStyles[size];

  if (!showLabel) {
    return (
      <div
        className={`${sizes.dot} rounded-full ${config.color} ${className}`}
        aria-label={config.label}
        role="status"
        {...props}
      />
    );
  }

  return (
    <div
      className={`
        inline-flex items-center ${sizes.gap}
        rounded-full ${sizes.padding}
        ${config.bgColor}
        ${className}
      `}
      role="status"
      {...props}
    >
      <span className={`${sizes.dot} rounded-full ${config.color}`} />
      <span className={`${sizes.text} font-medium text-foreground`}>
        {config.label}
      </span>
    </div>
  );
}

export type { StatusIndicatorProps, StatusType };
