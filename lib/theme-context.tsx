"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  GymSettings,
  resolveGymColors,
  DEFAULT_ACCENT_COLOR,
  DEFAULT_ACCENT_HOVER,
  DEFAULT_ACCENT_MUTED,
} from "@/lib/types/gym";

interface ThemeColors {
  accent: string;
  accentHover: string;
  accentMuted: string;
  accentGlow: string;
}

interface ThemeContextType {
  colors: ThemeColors;
  isLoading: boolean;
}

const defaultColors: ThemeColors = {
  accent: DEFAULT_ACCENT_COLOR,
  accentHover: DEFAULT_ACCENT_HOVER,
  accentMuted: DEFAULT_ACCENT_MUTED,
  accentGlow: "rgba(239, 68, 68, 0.3)",
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  initialSettings?: GymSettings;
}

/**
 * Applies theme colors to CSS custom properties on the document root
 */
function applyThemeColors(colors: ThemeColors) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.style.setProperty("--accent", colors.accent);
  root.style.setProperty("--accent-hover", colors.accentHover);
  root.style.setProperty("--accent-muted", colors.accentMuted);
  root.style.setProperty("--accent-glow", colors.accentGlow);

  // Also update the gradient that uses accent colors
  root.style.setProperty(
    "--gradient-accent",
    `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentMuted} 100%)`
  );
}

export function ThemeProvider({ children, initialSettings }: ThemeProviderProps) {
  const [colors, setColors] = useState<ThemeColors>(() =>
    initialSettings ? resolveGymColors(initialSettings) : defaultColors
  );
  const [isLoading, setIsLoading] = useState(!initialSettings);

  // Apply colors whenever they change
  useEffect(() => {
    applyThemeColors(colors);
  }, [colors]);

  // Fetch gym settings once on mount (if not provided)
  useEffect(() => {
    if (initialSettings) return;

    const fetchGymSettings = async () => {
      try {
        const response = await fetch("/api/gym/settings");
        if (response.ok) {
          const data = await response.json();
          const resolvedColors = resolveGymColors(data.settings);
          setColors(resolvedColors);
        }
      } catch {
        // Use default colors if fetch fails
      } finally {
        setIsLoading(false);
      }
    };

    fetchGymSettings();
  }, [initialSettings]);

  return (
    <ThemeContext.Provider value={{ colors, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // Return default values if used outside provider
    return {
      colors: defaultColors,
      isLoading: false,
    };
  }
  return context;
}
