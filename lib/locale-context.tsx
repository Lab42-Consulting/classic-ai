"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Locale, DEFAULT_LOCALE, getTranslations, TranslationKeys } from "@/lib/i18n";

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslationKeys;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

interface LocaleProviderProps {
  children: ReactNode;
  initialLocale?: Locale;
}

export function LocaleProvider({ children, initialLocale = DEFAULT_LOCALE }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [t, setT] = useState<TranslationKeys>(getTranslations(initialLocale));

  useEffect(() => {
    // Fetch user locale from profile on mount
    const fetchUserLocale = async () => {
      try {
        const response = await fetch("/api/member/profile");
        if (response.ok) {
          const data = await response.json();
          if (data.locale && (data.locale === "sr" || data.locale === "en")) {
            setLocaleState(data.locale);
            setT(getTranslations(data.locale));
          }
        }
      } catch {
        // Use default locale if fetch fails
      }
    };

    fetchUserLocale();
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    setT(getTranslations(newLocale));
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    // Return default values if used outside provider
    return {
      locale: DEFAULT_LOCALE as Locale,
      setLocale: () => {},
      t: getTranslations(DEFAULT_LOCALE),
    };
  }
  return context;
}
