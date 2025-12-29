export interface GymSettings {
  accentColor?: string; // Primary brand color (default: #ef4444)
  accentHover?: string; // Hover state (auto-calculated if not set)
  accentMuted?: string; // Muted/darker variant (auto-calculated if not set)
}

export const DEFAULT_ACCENT_COLOR = "#ef4444";
export const DEFAULT_ACCENT_HOVER = "#f87171";
export const DEFAULT_ACCENT_MUTED = "#dc2626";

/**
 * Lightens a hex color by a percentage
 */
function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.floor((num >> 16) + (255 - (num >> 16)) * percent));
  const g = Math.min(255, Math.floor(((num >> 8) & 0x00ff) + (255 - ((num >> 8) & 0x00ff)) * percent));
  const b = Math.min(255, Math.floor((num & 0x0000ff) + (255 - (num & 0x0000ff)) * percent));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/**
 * Darkens a hex color by a percentage
 */
function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.floor((num >> 16) * (1 - percent)));
  const g = Math.max(0, Math.floor(((num >> 8) & 0x00ff) * (1 - percent)));
  const b = Math.max(0, Math.floor((num & 0x0000ff) * (1 - percent)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/**
 * Derives hover and muted variants from a base accent color
 */
export function deriveAccentColors(accentColor: string): {
  accent: string;
  accentHover: string;
  accentMuted: string;
  accentGlow: string;
} {
  return {
    accent: accentColor,
    accentHover: lightenColor(accentColor, 0.2),
    accentMuted: darkenColor(accentColor, 0.15),
    accentGlow: hexToRgba(accentColor, 0.3),
  };
}

/**
 * Convert hex color to rgba
 */
function hexToRgba(hex: string, alpha: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Resolves gym settings with defaults
 */
export function resolveGymColors(settings: GymSettings | null | undefined): {
  accent: string;
  accentHover: string;
  accentMuted: string;
  accentGlow: string;
} {
  const accentColor = settings?.accentColor || DEFAULT_ACCENT_COLOR;

  // If custom hover/muted provided, use them; otherwise derive from accent
  if (settings?.accentHover && settings?.accentMuted) {
    return {
      accent: accentColor,
      accentHover: settings.accentHover,
      accentMuted: settings.accentMuted,
      accentGlow: hexToRgba(accentColor, 0.3),
    };
  }

  return deriveAccentColors(accentColor);
}
