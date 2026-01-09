"use client";

export type AgentType = "nutrition" | "supplements" | "training";

export interface AgentAvatarProps {
  agent: AgentType;
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

// Agent-specific color configurations
const agentColors = {
  nutrition: {
    gradient: "from-emerald-500 to-emerald-600",
    glow: "bg-emerald-500/30",
    ring: "rgba(16, 185, 129, 0.3)",
    ringInner: "rgba(16, 185, 129, 0.2)",
    shadow: "rgba(16, 185, 129, 0.4)",
    dot: "bg-emerald-400",
  },
  supplements: {
    gradient: "from-violet-500 to-violet-600",
    glow: "bg-violet-500/30",
    ring: "rgba(139, 92, 246, 0.3)",
    ringInner: "rgba(139, 92, 246, 0.2)",
    shadow: "rgba(139, 92, 246, 0.4)",
    dot: "bg-violet-400",
  },
  training: {
    gradient: "from-orange-500 to-orange-600",
    glow: "bg-orange-500/30",
    ring: "rgba(249, 115, 22, 0.3)",
    ringInner: "rgba(249, 115, 22, 0.2)",
    shadow: "rgba(249, 115, 22, 0.4)",
    dot: "bg-orange-400",
  },
};

// Agent-specific icons
function NutritionIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      {/* Cherries icon */}
      {/* Left cherry */}
      <circle cx="8" cy="16" r="5" />
      {/* Right cherry */}
      <circle cx="16" cy="18" r="4" />
      {/* Stems */}
      <path
        d="M8 11 C8 8, 10 5, 13 4 M16 14 C16 10, 14 6, 13 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Leaf */}
      <ellipse cx="14" cy="4" rx="3" ry="1.5" transform="rotate(-20 14 4)" />
    </svg>
  );
}

function SupplementsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      {/* Pill/Capsule icon */}
      <path d="M19.73 4.27a5.007 5.007 0 0 0-7.08 0L4.27 12.65a5.007 5.007 0 0 0 0 7.08c.98.98 2.26 1.47 3.54 1.47s2.56-.49 3.54-1.47l8.38-8.38a5.007 5.007 0 0 0 0-7.08zM7.81 18.32a2.5 2.5 0 0 1-3.54-3.54l4.19-4.19 3.54 3.54-4.19 4.19z" />
    </svg>
  );
}

function TrainingIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      {/* Dumbbell icon */}
      <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29l-1.43-1.43z" />
    </svg>
  );
}

// Get icon component for agent type
function getAgentIcon(agent: AgentType) {
  switch (agent) {
    case "nutrition":
      return NutritionIcon;
    case "supplements":
      return SupplementsIcon;
    case "training":
      return TrainingIcon;
  }
}

export function AgentAvatar({
  agent,
  size = "md",
  state = "idle",
  className = "",
}: AgentAvatarProps) {
  const config = sizeConfig[size];
  const anim = animationConfig[state];
  const colors = agentColors[agent];
  const IconComponent = getAgentIcon(agent);

  const ringSize = config.ringSize;
  const center = ringSize / 2;
  const outerRadius = (ringSize - 8) / 2;
  const innerRadius = outerRadius - 6;

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Outer glow - agent-specific color */}
      <div
        className={`
          absolute ${config.glowSize}
          rounded-full
          ${colors.glow}
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
            stroke={colors.ring}
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
            stroke={colors.ringInner}
            strokeWidth="1"
            style={{
              animation: `spin ${anim.ringDuration} linear infinite reverse`,
            }}
          />
        </svg>

        {/* Orbiting dot for thinking state */}
        {state === "thinking" && (
          <div
            className={`absolute w-2 h-2 ${colors.dot} rounded-full`}
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
          bg-gradient-to-br ${colors.gradient}
          flex items-center justify-center
          relative
          z-10
        `}
        style={{
          boxShadow: `
            0 0 0 1px rgba(255, 255, 255, 0.2),
            0 4px 16px ${colors.shadow},
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

        {/* Agent-specific icon */}
        <IconComponent
          className={`
            ${config.icon} text-white relative z-10
            ${anim.iconScale ? "animate-pulse" : ""}
          `}
        />
      </div>
    </div>
  );
}

// Agent metadata for UI
export const agentMeta = {
  nutrition: {
    name: "Ishrana",
    subtitle: "Nutricionista AI",
    description: "Kalorije, obroci, makronutrijenti, preporuke za hranu",
    color: "emerald",
    borderClass: "border-emerald-500/20",
    textClass: "text-emerald-500",
    bgClass: "bg-emerald-500/10",
    hoverBgClass: "hover:bg-emerald-500/20",
  },
  supplements: {
    name: "Suplementi",
    subtitle: "Stručnjak za suplemente",
    description: "Dodaci ishrani, doziranje, vreme uzimanja",
    color: "violet",
    borderClass: "border-violet-500/20",
    textClass: "text-violet-500",
    bgClass: "bg-violet-500/10",
    hoverBgClass: "hover:bg-violet-500/20",
  },
  training: {
    name: "Trening",
    subtitle: "Trener AI",
    description: "Vežbe, tehnika, program, oporavak",
    color: "orange",
    borderClass: "border-orange-500/20",
    textClass: "text-orange-500",
    bgClass: "bg-orange-500/10",
    hoverBgClass: "hover:bg-orange-500/20",
  },
} as const;
