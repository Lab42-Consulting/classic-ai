"use client";

import { forwardRef, HTMLAttributes } from "react";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "subtle" | "prominent";
  glow?: boolean;
  hover?: boolean;
}

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className = "", variant = "default", glow = false, hover = false, children, ...props }, ref) => {
    const variants = {
      default: "bg-white/[0.03] backdrop-blur-xl border border-white/[0.05]",
      subtle: "bg-white/[0.02] backdrop-blur-lg border border-white/[0.03]",
      prominent: "bg-white/[0.05] backdrop-blur-2xl border border-white/[0.08]",
    };

    return (
      <div
        ref={ref}
        className={`
          rounded-3xl p-6
          ${variants[variant]}
          ${glow ? "shadow-lg shadow-accent/5" : ""}
          ${hover ? "transition-all duration-300 hover:bg-white/[0.05] hover:border-white/[0.1] hover:scale-[1.02]" : ""}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = "GlassCard";

export { GlassCard };
export type { GlassCardProps };
