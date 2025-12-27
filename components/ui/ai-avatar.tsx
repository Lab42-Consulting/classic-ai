"use client";

export interface AIAvatarProps {
  size?: "sm" | "md" | "lg" | "xl";
  state?: "idle" | "active" | "thinking";
  className?: string;
}

const sizeConfig = {
  sm: {
    container: "w-10 h-10",
    icon: "w-4 h-4",
    ringSize: 44,
    glowSize: "w-12 h-12",
  },
  md: {
    container: "w-14 h-14",
    icon: "w-5 h-5",
    ringSize: 60,
    glowSize: "w-16 h-16",
  },
  lg: {
    container: "w-[72px] h-[72px]",
    icon: "w-7 h-7",
    ringSize: 80,
    glowSize: "w-20 h-20",
  },
  xl: {
    container: "w-24 h-24",
    icon: "w-10 h-10",
    ringSize: 104,
    glowSize: "w-28 h-28",
  },
};

// Animation durations based on state
const animationConfig = {
  idle: {
    ringDuration: "12s",
    glowDuration: "4s",
    iconScale: false,
  },
  active: {
    ringDuration: "2.5s",
    glowDuration: "2s",
    iconScale: true,
  },
  thinking: {
    ringDuration: "1s",
    glowDuration: "0.8s",
    iconScale: true,
  },
};

export function AIAvatar({
  size = "md",
  state = "idle",
  className = "",
}: AIAvatarProps) {
  const config = sizeConfig[size];
  const anim = animationConfig[state];
  const ringSize = config.ringSize;
  const center = ringSize / 2;
  const outerRadius = (ringSize - 8) / 2;
  const innerRadius = outerRadius - 6;

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Outer glow - soft colored blur */}
      <div
        className={`
          absolute ${config.glowSize}
          rounded-full
          bg-red-500/30
          blur-xl
          ${state !== "idle" ? "animate-pulse" : ""}
        `}
        style={{
          animationDuration: anim.glowDuration,
        }}
      />

      {/* Orbital rings container */}
      <div
        className="absolute"
        style={{ width: ringSize, height: ringSize }}
      >
        <svg
          width={ringSize}
          height={ringSize}
          className="absolute inset-0"
        >
          {/* Outer ring - dashed, rotates clockwise */}
          <circle
            cx={center}
            cy={center}
            r={outerRadius}
            fill="none"
            stroke="rgba(239, 68, 68, 0.3)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            style={{
              animation: `spin ${anim.ringDuration} linear infinite`,
            }}
          />
          {/* Inner ring - solid, rotates counter-clockwise */}
          <circle
            cx={center}
            cy={center}
            r={innerRadius}
            fill="none"
            stroke="rgba(239, 68, 68, 0.2)"
            strokeWidth="1"
            style={{
              animation: `spin ${anim.ringDuration} linear infinite reverse`,
            }}
          />
        </svg>

        {/* Orbiting dot for thinking state */}
        {state === "thinking" && (
          <div
            className="absolute w-2 h-2 bg-red-400 rounded-full"
            style={{
              top: "50%",
              left: "50%",
              marginTop: -outerRadius - 4,
              marginLeft: -4,
              transformOrigin: `4px ${outerRadius + 4}px`,
              animation: `spin 1.5s linear infinite`,
            }}
          />
        )}
      </div>

      {/* Main circle with gradient */}
      <div
        className={`
          ${config.container}
          rounded-full
          bg-gradient-to-br from-red-500 to-red-600
          flex items-center justify-center
          relative
          z-10
        `}
        style={{
          boxShadow: `
            0 0 0 1px rgba(255, 255, 255, 0.2),
            0 4px 16px rgba(239, 68, 68, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.2)
          `,
        }}
      >
        {/* Inner highlight ring */}
        <div
          className="absolute inset-[2px] rounded-full"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%)",
          }}
        />

        {/* Icon - Lightning Bolt (Energy/Power) */}
        <svg
          className={`
            ${config.icon} text-white relative z-10
            ${anim.iconScale ? "animate-pulse" : ""}
          `}
          viewBox="0 0 24 24"
          fill="currentColor"
          style={{
            animationDuration: state === "thinking" ? "0.8s" : "2s",
          }}
        >
          <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
        </svg>
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Lightning bolt variant
export function AIAvatarBolt({
  size = "md",
  state = "idle",
  className = "",
}: AIAvatarProps) {
  const config = sizeConfig[size];
  const anim = animationConfig[state];
  const ringSize = config.ringSize;
  const center = ringSize / 2;
  const outerRadius = (ringSize - 8) / 2;
  const innerRadius = outerRadius - 6;

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Outer glow */}
      <div
        className={`
          absolute ${config.glowSize}
          rounded-full
          bg-red-500/30
          blur-xl
          ${state !== "idle" ? "animate-pulse" : ""}
        `}
        style={{ animationDuration: anim.glowDuration }}
      />

      {/* Orbital rings */}
      <div className="absolute" style={{ width: ringSize, height: ringSize }}>
        <svg width={ringSize} height={ringSize} className="absolute inset-0">
          <circle
            cx={center}
            cy={center}
            r={outerRadius}
            fill="none"
            stroke="rgba(239, 68, 68, 0.3)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            style={{ animation: `spin ${anim.ringDuration} linear infinite` }}
          />
          <circle
            cx={center}
            cy={center}
            r={innerRadius}
            fill="none"
            stroke="rgba(239, 68, 68, 0.2)"
            strokeWidth="1"
            style={{ animation: `spin ${anim.ringDuration} linear infinite reverse` }}
          />
        </svg>
      </div>

      {/* Main circle */}
      <div
        className={`
          ${config.container}
          rounded-full
          bg-gradient-to-br from-red-500 to-red-600
          flex items-center justify-center
          relative
          z-10
        `}
        style={{
          boxShadow: `
            0 0 0 1px rgba(255, 255, 255, 0.2),
            0 4px 16px rgba(239, 68, 68, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.2)
          `,
        }}
      >
        <div
          className="absolute inset-[2px] rounded-full"
          style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%)" }}
        />
        {/* Lightning bolt icon */}
        <svg
          className={`${config.icon} text-white relative z-10 ${anim.iconScale ? "animate-pulse" : ""}`}
          viewBox="0 0 24 24"
          fill="currentColor"
          style={{ animationDuration: state === "thinking" ? "0.8s" : "2s" }}
        >
          <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
        </svg>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Coach figure variant
export function AIAvatarCoach({
  size = "md",
  state = "idle",
  className = "",
}: AIAvatarProps) {
  const config = sizeConfig[size];
  const anim = animationConfig[state];
  const ringSize = config.ringSize;
  const center = ringSize / 2;
  const outerRadius = (ringSize - 8) / 2;
  const innerRadius = outerRadius - 6;

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Outer glow */}
      <div
        className={`
          absolute ${config.glowSize}
          rounded-full
          bg-red-500/30
          blur-xl
          ${state !== "idle" ? "animate-pulse" : ""}
        `}
        style={{ animationDuration: anim.glowDuration }}
      />

      {/* Orbital rings */}
      <div className="absolute" style={{ width: ringSize, height: ringSize }}>
        <svg width={ringSize} height={ringSize} className="absolute inset-0">
          <circle
            cx={center}
            cy={center}
            r={outerRadius}
            fill="none"
            stroke="rgba(239, 68, 68, 0.3)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            style={{ animation: `spin ${anim.ringDuration} linear infinite` }}
          />
          <circle
            cx={center}
            cy={center}
            r={innerRadius}
            fill="none"
            stroke="rgba(239, 68, 68, 0.2)"
            strokeWidth="1"
            style={{ animation: `spin ${anim.ringDuration} linear infinite reverse` }}
          />
        </svg>
      </div>

      {/* Main circle */}
      <div
        className={`
          ${config.container}
          rounded-full
          bg-gradient-to-br from-red-500 to-red-600
          flex items-center justify-center
          relative
          z-10
        `}
        style={{
          boxShadow: `
            0 0 0 1px rgba(255, 255, 255, 0.2),
            0 4px 16px rgba(239, 68, 68, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.2)
          `,
        }}
      >
        <div
          className="absolute inset-[2px] rounded-full"
          style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%)" }}
        />
        {/* Coach figure icon */}
        <svg
          className={`${config.icon} text-white relative z-10 ${anim.iconScale ? "animate-pulse" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ animationDuration: state === "thinking" ? "0.8s" : "2s" }}
        >
          <circle cx="12" cy="5" r="3" fill="currentColor" />
          <path d="M12 8v6" />
          <path d="M8 10L5 6" />
          <path d="M16 10L19 6" />
          <path d="M12 14l-3 6" />
          <path d="M12 14l3 6" />
        </svg>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Simple emoji fallback
export function AIAvatarEmoji({
  size = "md",
  state = "idle",
  className = "",
}: AIAvatarProps) {
  const config = sizeConfig[size];
  const anim = animationConfig[state];

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <div
        className={`
          absolute ${config.glowSize}
          rounded-full
          bg-red-500/30
          blur-xl
          ${state !== "idle" ? "animate-pulse" : ""}
        `}
        style={{ animationDuration: anim.glowDuration }}
      />
      <div
        className={`
          ${config.container}
          rounded-full
          bg-gradient-to-br from-red-500 to-red-600
          flex items-center justify-center
          relative
          z-10
        `}
        style={{
          boxShadow: `
            0 0 0 1px rgba(255, 255, 255, 0.2),
            0 4px 16px rgba(239, 68, 68, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.2)
          `,
        }}
      >
        <span className={`${size === "sm" ? "text-lg" : size === "md" ? "text-xl" : size === "lg" ? "text-2xl" : "text-3xl"}`}>
          💪
        </span>
      </div>
    </div>
  );
}
