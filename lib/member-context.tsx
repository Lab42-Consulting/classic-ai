"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type DifficultyMode = "simple" | "standard" | "pro";

interface MemberContextType {
  difficultyMode: DifficultyMode;
  setDifficultyMode: (mode: DifficultyMode) => void;
  isLoading: boolean;
}

const MemberContext = createContext<MemberContextType | undefined>(undefined);

interface MemberProviderProps {
  children: ReactNode;
  initialMode?: DifficultyMode;
}

export function MemberProvider({ children, initialMode = "standard" }: MemberProviderProps) {
  const [difficultyMode, setDifficultyModeState] = useState<DifficultyMode>(initialMode);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch user difficulty mode from profile on mount
    const fetchUserMode = async () => {
      try {
        const response = await fetch("/api/member/profile");
        if (response.ok) {
          const data = await response.json();
          if (data.difficultyMode && ["simple", "standard", "pro"].includes(data.difficultyMode)) {
            setDifficultyModeState(data.difficultyMode as DifficultyMode);
          }
        }
      } catch {
        // Use default mode if fetch fails
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserMode();
  }, []);

  const setDifficultyMode = (newMode: DifficultyMode) => {
    setDifficultyModeState(newMode);
  };

  return (
    <MemberContext.Provider value={{ difficultyMode, setDifficultyMode, isLoading }}>
      {children}
    </MemberContext.Provider>
  );
}

export function useMember() {
  const context = useContext(MemberContext);
  if (context === undefined) {
    // Return default values if used outside provider
    return {
      difficultyMode: "standard" as DifficultyMode,
      setDifficultyMode: () => {},
      isLoading: false,
    };
  }
  return context;
}
