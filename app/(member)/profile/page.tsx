"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GlassCard, FadeIn, SlideUp, Button } from "@/components/ui";
import { useLocale } from "@/lib/locale-context";
import type { Locale } from "@/lib/i18n";

interface ProfileData {
  name: string;
  memberId: string;
  goal: string;
  weight: number | null;
  height: number | null;
  locale: string;
  loading: boolean;
}

const goalLabels: Record<string, Record<string, string>> = {
  sr: {
    fat_loss: "Gubitak masnoće",
    muscle_gain: "Rast mišića",
    recomposition: "Rekompozicija",
  },
  en: {
    fat_loss: "Fat Loss",
    muscle_gain: "Muscle Gain",
    recomposition: "Recomposition",
  },
};

export default function ProfilePage() {
  const router = useRouter();
  const { locale, setLocale, t } = useLocale();
  const [data, setData] = useState<ProfileData>({
    name: "",
    memberId: "",
    goal: "fat_loss",
    weight: null,
    height: null,
    locale: "sr",
    loading: true,
  });
  const [loggingOut, setLoggingOut] = useState(false);
  const [updatingLocale, setUpdatingLocale] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/member/profile");
      if (response.ok) {
        const result = await response.json();
        setData({ ...result, loading: false });
      } else {
        setData((prev) => ({ ...prev, loading: false }));
      }
    } catch {
      setData((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });
      if (response.ok) {
        router.push("/login");
        router.refresh();
      }
    } catch {
      setLoggingOut(false);
    }
  };

  const handleLocaleChange = async (newLocale: string) => {
    if (newLocale === locale || updatingLocale) return;
    if (newLocale !== "sr" && newLocale !== "en") return;

    setUpdatingLocale(true);
    try {
      const response = await fetch("/api/member/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: newLocale }),
      });
      if (response.ok) {
        setData((prev) => ({ ...prev, locale: newLocale }));
        // Update the context locale
        setLocale(newLocale as Locale);
      }
    } catch {
      // Handle silently
    } finally {
      setUpdatingLocale(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (data.loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-foreground-muted">{t.common.loading}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="px-6 pt-14 pb-4 flex items-center gap-4 border-b border-white/5">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full glass flex items-center justify-center btn-press"
          aria-label="Go back"
        >
          <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <FadeIn>
          <div>
            <h1 className="text-xl text-headline text-foreground">
              {locale === "en" ? "Profile" : "Profil"}
            </h1>
            <p className="text-sm text-foreground-muted">
              {locale === "en" ? "Your account" : "Tvoj nalog"}
            </p>
          </div>
        </FadeIn>
      </header>

      <main className="px-6 py-6 space-y-6">
        {/* Profile Card */}
        <SlideUp delay={100}>
          <GlassCard variant="prominent">
            <div className="flex flex-col items-center text-center">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-full bg-accent/20 flex items-center justify-center mb-4 glow-accent">
                <span className="text-3xl font-bold text-accent">
                  {getInitials(data.name)}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-foreground">{data.name}</h2>
              <p className="text-foreground-muted text-sm mt-1">ID: {data.memberId}</p>
            </div>
          </GlassCard>
        </SlideUp>

        {/* Info Cards */}
        <SlideUp delay={200}>
          <GlassCard>
            <h3 className="text-label mb-4">
              {locale === "en" ? "Information" : "Informacije"}
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-foreground-muted">
                  {locale === "en" ? "Goal" : "Cilj"}
                </span>
                <span className="text-foreground font-medium">
                  {goalLabels[locale]?.[data.goal] || data.goal}
                </span>
              </div>
              {data.weight && (
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-foreground-muted">
                    {locale === "en" ? "Weight" : "Težina"}
                  </span>
                  <span className="text-foreground font-medium">{data.weight} kg</span>
                </div>
              )}
              {data.height && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-foreground-muted">
                    {locale === "en" ? "Height" : "Visina"}
                  </span>
                  <span className="text-foreground font-medium">{data.height} cm</span>
                </div>
              )}
            </div>
          </GlassCard>
        </SlideUp>

        {/* Language Selector */}
        <SlideUp delay={300}>
          <GlassCard>
            <h3 className="text-label mb-4">Jezik / Language</h3>
            <div className="flex gap-3">
              <button
                onClick={() => handleLocaleChange("sr")}
                disabled={updatingLocale}
                className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all btn-press ${
                  locale === "sr"
                    ? "bg-accent text-white"
                    : "glass hover:bg-white/5"
                }`}
              >
                <span className="text-lg">🇷🇸</span>
                <span className="font-medium">Srpski</span>
              </button>
              <button
                onClick={() => handleLocaleChange("en")}
                disabled={updatingLocale}
                className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all btn-press ${
                  locale === "en"
                    ? "bg-accent text-white"
                    : "glass hover:bg-white/5"
                }`}
              >
                <span className="text-lg">🇬🇧</span>
                <span className="font-medium">English</span>
              </button>
            </div>
          </GlassCard>
        </SlideUp>

        {/* Quick Links */}
        <SlideUp delay={400}>
          <div className="space-y-3">
            <button
              onClick={() => router.push("/goal")}
              className="w-full glass rounded-2xl p-4 flex items-center gap-4 card-hover btn-press"
            >
              <span className="text-2xl">🎯</span>
              <span className="flex-1 text-left text-foreground">
                {locale === "en" ? "Change Goal" : "Promeni cilj"}
              </span>
              <svg className="w-5 h-5 text-foreground-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              onClick={() => router.push("/subscription")}
              className="w-full glass rounded-2xl p-4 flex items-center gap-4 card-hover btn-press"
            >
              <span className="text-2xl">💳</span>
              <span className="flex-1 text-left text-foreground">
                {locale === "en" ? "Membership" : "Članarina"}
              </span>
              <svg className="w-5 h-5 text-foreground-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </SlideUp>

        {/* Logout Button */}
        <SlideUp delay={500}>
          <Button
            variant="secondary"
            className="w-full border-error/30 text-error hover:bg-error/10"
            size="lg"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut
              ? (locale === "en" ? "Logging out..." : "Odjavljujem se...")
              : (locale === "en" ? "Log out" : "Odjavi se")}
          </Button>
        </SlideUp>

        {/* App Info */}
        <SlideUp delay={600}>
          <div className="text-center pt-4">
            <p className="text-xs text-foreground-muted">
              Classic Method v1.0
            </p>
          </div>
        </SlideUp>
      </main>
    </div>
  );
}
