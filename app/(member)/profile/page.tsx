"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GlassCard, FadeIn, SlideUp, Button, Modal, Input, ImageCropper } from "@/components/ui";
import { useLocale } from "@/lib/locale-context";
import type { Locale } from "@/lib/i18n";

interface ProfileData {
  name: string;
  memberId: string;
  avatarUrl: string | null;
  goal: string;
  weight: number | null;
  height: number | null;
  locale: string;
  loading: boolean;
  // Custom targets
  customCalories: number | null;
  customProtein: number | null;
  customCarbs: number | null;
  customFats: number | null;
  // Coach info
  hasCoach: boolean;
  coachName: string | null;
  coachCalories: number | null;
  coachProtein: number | null;
  coachCarbs: number | null;
  coachFats: number | null;
}

type CredentialModalType = "id" | "pin" | null;

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
    avatarUrl: null,
    goal: "fat_loss",
    weight: null,
    height: null,
    locale: "sr",
    loading: true,
    customCalories: null,
    customProtein: null,
    customCarbs: null,
    customFats: null,
    hasCoach: false,
    coachName: null,
    coachCalories: null,
    coachProtein: null,
    coachCarbs: null,
    coachFats: null,
  });
  const [loggingOut, setLoggingOut] = useState(false);
  const [updatingLocale, setUpdatingLocale] = useState(false);

  // Avatar state
  const [showAvatarCropper, setShowAvatarCropper] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);

  // Credential change state
  const [credentialModal, setCredentialModal] = useState<CredentialModalType>(null);
  const [currentPin, setCurrentPin] = useState("");
  const [newValue, setNewValue] = useState("");
  const [credentialError, setCredentialError] = useState("");
  const [credentialSuccess, setCredentialSuccess] = useState("");
  const [savingCredential, setSavingCredential] = useState(false);

  // Target adjustment state
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [targetCalories, setTargetCalories] = useState("");
  const [targetProtein, setTargetProtein] = useState("");
  const [targetCarbs, setTargetCarbs] = useState("");
  const [targetFats, setTargetFats] = useState("");
  const [savingTargets, setSavingTargets] = useState(false);
  const [targetError, setTargetError] = useState("");

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

  const resetCredentialModal = () => {
    setCredentialModal(null);
    setCurrentPin("");
    setNewValue("");
    setCredentialError("");
    setCredentialSuccess("");
  };

  const handleCredentialChange = async () => {
    if (!currentPin || !newValue) {
      setCredentialError(locale === "en" ? "All fields are required" : "Sva polja su obavezna");
      return;
    }

    // Validate based on type
    if (credentialModal === "id") {
      if (!/^[a-zA-Z0-9]{1,10}$/.test(newValue)) {
        setCredentialError(locale === "en"
          ? "ID must be 1-10 alphanumeric characters"
          : "ID mora imati 1-10 slova/brojeva");
        return;
      }
    } else if (credentialModal === "pin") {
      if (!/^\d{4}$/.test(newValue)) {
        setCredentialError(locale === "en"
          ? "PIN must be exactly 4 digits"
          : "PIN mora imati tačno 4 cifre");
        return;
      }
    }

    setSavingCredential(true);
    setCredentialError("");

    try {
      const response = await fetch("/api/member/credentials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPin,
          ...(credentialModal === "id" ? { newMemberId: newValue } : { newPin: newValue }),
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setCredentialSuccess(locale === "en"
          ? "Successfully changed!"
          : "Uspešno promenjeno!");

        // Update local state if ID changed
        if (credentialModal === "id" && result.memberId) {
          setData(prev => ({ ...prev, memberId: result.memberId }));
        }

        // Close modal after short delay
        setTimeout(() => {
          resetCredentialModal();
        }, 1500);
      } else {
        setCredentialError(result.error || (locale === "en" ? "Failed to update" : "Greška pri promeni"));
      }
    } catch {
      setCredentialError(locale === "en" ? "Connection error" : "Greška u konekciji");
    } finally {
      setSavingCredential(false);
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

  const openTargetModal = () => {
    // Pre-fill with current values
    setTargetCalories(data.customCalories?.toString() || "");
    setTargetProtein(data.customProtein?.toString() || "");
    setTargetCarbs(data.customCarbs?.toString() || "");
    setTargetFats(data.customFats?.toString() || "");
    setTargetError("");
    setShowTargetModal(true);
  };

  const handleSaveTargets = async () => {
    setSavingTargets(true);
    setTargetError("");

    try {
      const response = await fetch("/api/member/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customCalories: targetCalories ? parseInt(targetCalories) : null,
          customProtein: targetProtein ? parseInt(targetProtein) : null,
          customCarbs: targetCarbs ? parseInt(targetCarbs) : null,
          customFats: targetFats ? parseInt(targetFats) : null,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setData((prev) => ({
          ...prev,
          customCalories: result.member.customCalories,
          customProtein: result.member.customProtein,
          customCarbs: result.member.customCarbs,
          customFats: result.member.customFats,
        }));
        setShowTargetModal(false);
      } else {
        setTargetError(result.error || (locale === "en" ? "Failed to save" : "Greška pri čuvanju"));
      }
    } catch {
      setTargetError(locale === "en" ? "Connection error" : "Greška u konekciji");
    } finally {
      setSavingTargets(false);
    }
  };

  const resetTargets = async () => {
    setSavingTargets(true);
    setTargetError("");

    try {
      const response = await fetch("/api/member/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customCalories: null,
          customProtein: null,
          customCarbs: null,
          customFats: null,
        }),
      });

      if (response.ok) {
        setData((prev) => ({
          ...prev,
          customCalories: null,
          customProtein: null,
          customCarbs: null,
          customFats: null,
        }));
        setShowTargetModal(false);
      }
    } catch {
      // Handle silently
    } finally {
      setSavingTargets(false);
    }
  };

  const handleAvatarSave = async (croppedImageUrl: string) => {
    setSavingAvatar(true);
    try {
      const response = await fetch("/api/member/avatar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: croppedImageUrl }),
      });

      if (response.ok) {
        const result = await response.json();
        setData(prev => ({ ...prev, avatarUrl: result.avatarUrl }));
      }
    } catch {
      // Handle silently
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleAvatarRemove = async () => {
    setSavingAvatar(true);
    try {
      const response = await fetch("/api/member/avatar", {
        method: "DELETE",
      });

      if (response.ok) {
        setData(prev => ({ ...prev, avatarUrl: null }));
      }
    } catch {
      // Handle silently
    } finally {
      setSavingAvatar(false);
    }
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
              <button
                onClick={() => setShowAvatarCropper(true)}
                disabled={savingAvatar}
                className="relative w-24 h-24 rounded-full mb-4 group focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
              >
                {data.avatarUrl ? (
                  <img
                    src={data.avatarUrl}
                    alt={data.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-accent/20 flex items-center justify-center glow-accent">
                    <span className="text-3xl font-bold text-accent">
                      {getInitials(data.name)}
                    </span>
                  </div>
                )}
                {/* Edit overlay */}
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                {savingAvatar && (
                  <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </button>
              <p className="text-xs text-foreground-muted mb-2">
                {locale === "en" ? "Tap to change photo" : "Dodirni za promenu slike"}
              </p>
              {data.avatarUrl && (
                <button
                  onClick={handleAvatarRemove}
                  disabled={savingAvatar}
                  className="text-xs text-error hover:underline mb-2"
                >
                  {locale === "en" ? "Remove photo" : "Ukloni sliku"}
                </button>
              )}
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

        {/* Nutrition Targets Section */}
        <SlideUp delay={225}>
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-label">
                {locale === "en" ? "Daily Targets" : "Dnevni ciljevi"}
              </h3>
              {!data.hasCoach && (
                <button
                  onClick={openTargetModal}
                  className="px-3 py-1.5 text-sm text-accent hover:bg-accent/10 rounded-lg transition-colors"
                >
                  {locale === "en" ? "Edit" : "Izmeni"}
                </button>
              )}
            </div>

            {/* Coach notice */}
            {data.hasCoach && (
              <div className="mb-4 p-3 bg-accent/10 border border-accent/20 rounded-xl">
                <div className="flex items-center gap-2 text-sm text-accent">
                  <span>👨‍🏫</span>
                  <span>
                    {locale === "en"
                      ? `Managed by ${data.coachName}`
                      : `Upravlja ${data.coachName}`}
                  </span>
                </div>
                <p className="text-xs text-foreground-muted mt-1">
                  {locale === "en"
                    ? "Contact your coach to adjust targets"
                    : "Kontaktiraj trenera za promenu ciljeva"}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-foreground-muted">
                  {locale === "en" ? "Calories" : "Kalorije"}
                </span>
                <span className="text-foreground font-medium">
                  {data.hasCoach && data.coachCalories
                    ? `${data.coachCalories} kcal`
                    : data.customCalories
                    ? `${data.customCalories} kcal`
                    : (locale === "en" ? "Auto" : "Automatski")}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-foreground-muted">
                  {locale === "en" ? "Protein" : "Proteini"}
                </span>
                <span className="text-foreground font-medium">
                  {data.hasCoach && data.coachProtein
                    ? `${data.coachProtein}g`
                    : data.customProtein
                    ? `${data.customProtein}g`
                    : (locale === "en" ? "Auto" : "Automatski")}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-foreground-muted">
                  {locale === "en" ? "Carbs" : "Ugljeni hidrati"}
                </span>
                <span className="text-foreground font-medium">
                  {data.hasCoach && data.coachCarbs
                    ? `${data.coachCarbs}g`
                    : data.customCarbs
                    ? `${data.customCarbs}g`
                    : (locale === "en" ? "Auto" : "Automatski")}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-foreground-muted">
                  {locale === "en" ? "Fats" : "Masti"}
                </span>
                <span className="text-foreground font-medium">
                  {data.hasCoach && data.coachFats
                    ? `${data.coachFats}g`
                    : data.customFats
                    ? `${data.customFats}g`
                    : (locale === "en" ? "Auto" : "Automatski")}
                </span>
              </div>
            </div>

            {!data.hasCoach && !data.customCalories && !data.customProtein && !data.customCarbs && !data.customFats && (
              <p className="text-xs text-foreground-muted mt-3 text-center">
                {locale === "en"
                  ? "Targets are calculated based on your weight and goal"
                  : "Ciljevi se računaju na osnovu težine i cilja"}
              </p>
            )}
          </GlassCard>
        </SlideUp>

        {/* Credentials Section */}
        <SlideUp delay={250}>
          <GlassCard>
            <h3 className="text-label mb-4">
              {locale === "en" ? "Login Credentials" : "Pristupni podaci"}
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <div>
                  <span className="text-foreground-muted text-sm">
                    {locale === "en" ? "Member ID" : "Članski ID"}
                  </span>
                  <p className="text-foreground font-mono font-medium">{data.memberId}</p>
                </div>
                <button
                  onClick={() => setCredentialModal("id")}
                  className="px-3 py-1.5 text-sm text-accent hover:bg-accent/10 rounded-lg transition-colors"
                >
                  {locale === "en" ? "Change" : "Promeni"}
                </button>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="text-foreground-muted text-sm">PIN</span>
                  <p className="text-foreground font-mono font-medium">••••</p>
                </div>
                <button
                  onClick={() => setCredentialModal("pin")}
                  className="px-3 py-1.5 text-sm text-accent hover:bg-accent/10 rounded-lg transition-colors"
                >
                  {locale === "en" ? "Change" : "Promeni"}
                </button>
              </div>
            </div>
          </GlassCard>
        </SlideUp>

        {/* Language Selector */}
        <SlideUp delay={350}>
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
            <button
              onClick={() => router.push("/why-this-works")}
              className="w-full glass rounded-2xl p-4 flex items-center gap-4 card-hover btn-press"
            >
              <span className="text-2xl">💡</span>
              <span className="flex-1 text-left text-foreground">
                {locale === "en" ? "Why this works" : "Zašto ovo funkcioniše"}
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

      {/* Credential Change Modal */}
      <Modal
        isOpen={!!credentialModal}
        onClose={resetCredentialModal}
        title={
          credentialModal === "id"
            ? (locale === "en" ? "Change Member ID" : "Promeni članski ID")
            : (locale === "en" ? "Change PIN" : "Promeni PIN")
        }
      >
        <div className="space-y-4">
          {credentialError && (
            <div className="p-3 bg-error/10 border border-error/20 rounded-xl">
              <p className="text-sm text-error">{credentialError}</p>
            </div>
          )}
          {credentialSuccess && (
            <div className="p-3 bg-success/10 border border-success/20 rounded-xl">
              <p className="text-sm text-success">{credentialSuccess}</p>
            </div>
          )}

          <Input
            label={locale === "en" ? "Current PIN" : "Trenutni PIN"}
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={currentPin}
            onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
            placeholder="••••"
            disabled={savingCredential || !!credentialSuccess}
          />

          <Input
            label={
              credentialModal === "id"
                ? (locale === "en" ? "New Member ID" : "Novi članski ID")
                : (locale === "en" ? "New PIN" : "Novi PIN")
            }
            type={credentialModal === "pin" ? "password" : "text"}
            inputMode={credentialModal === "pin" ? "numeric" : "text"}
            maxLength={credentialModal === "id" ? 10 : 4}
            value={newValue}
            onChange={(e) => {
              if (credentialModal === "id") {
                setNewValue(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase());
              } else {
                setNewValue(e.target.value.replace(/\D/g, ""));
              }
            }}
            placeholder={credentialModal === "id" ? "ABC123" : "••••"}
            disabled={savingCredential || !!credentialSuccess}
          />

          {credentialModal === "id" && (
            <p className="text-xs text-foreground-muted">
              {locale === "en"
                ? "Only letters and numbers, max 10 characters"
                : "Samo slova i brojevi, maksimalno 10 karaktera"}
            </p>
          )}
          {credentialModal === "pin" && (
            <p className="text-xs text-foreground-muted">
              {locale === "en"
                ? "Exactly 4 digits"
                : "Tačno 4 cifre"}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={resetCredentialModal}
              disabled={savingCredential}
            >
              {locale === "en" ? "Cancel" : "Otkaži"}
            </Button>
            <Button
              className="flex-1"
              onClick={handleCredentialChange}
              disabled={savingCredential || !!credentialSuccess || !currentPin || !newValue}
            >
              {savingCredential
                ? (locale === "en" ? "Saving..." : "Čuvam...")
                : (locale === "en" ? "Save" : "Sačuvaj")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Avatar Cropper Modal */}
      <ImageCropper
        isOpen={showAvatarCropper}
        onClose={() => setShowAvatarCropper(false)}
        onSave={handleAvatarSave}
        title={locale === "en" ? "Change Profile Photo" : "Promeni profilnu sliku"}
        aspectRatio={1}
        circularCrop={true}
        locale={locale as "sr" | "en"}
      />

      {/* Target Adjustment Modal */}
      <Modal
        isOpen={showTargetModal}
        onClose={() => setShowTargetModal(false)}
        title={locale === "en" ? "Adjust Daily Targets" : "Podesi dnevne ciljeve"}
      >
        <div className="space-y-4">
          {targetError && (
            <div className="p-3 bg-error/10 border border-error/20 rounded-xl">
              <p className="text-sm text-error">{targetError}</p>
            </div>
          )}

          <Input
            label={locale === "en" ? "Calories (kcal)" : "Kalorije (kcal)"}
            type="number"
            inputMode="numeric"
            value={targetCalories}
            onChange={(e) => setTargetCalories(e.target.value)}
            placeholder={locale === "en" ? "e.g. 2000" : "npr. 2000"}
            disabled={savingTargets}
          />

          <Input
            label={locale === "en" ? "Protein (g)" : "Proteini (g)"}
            type="number"
            inputMode="numeric"
            value={targetProtein}
            onChange={(e) => setTargetProtein(e.target.value)}
            placeholder={locale === "en" ? "e.g. 150" : "npr. 150"}
            disabled={savingTargets}
          />

          <Input
            label={locale === "en" ? "Carbs (g)" : "Ugljeni hidrati (g)"}
            type="number"
            inputMode="numeric"
            value={targetCarbs}
            onChange={(e) => setTargetCarbs(e.target.value)}
            placeholder={locale === "en" ? "e.g. 200" : "npr. 200"}
            disabled={savingTargets}
          />

          <Input
            label={locale === "en" ? "Fats (g)" : "Masti (g)"}
            type="number"
            inputMode="numeric"
            value={targetFats}
            onChange={(e) => setTargetFats(e.target.value)}
            placeholder={locale === "en" ? "e.g. 70" : "npr. 70"}
            disabled={savingTargets}
          />

          <p className="text-xs text-foreground-muted">
            {locale === "en"
              ? "Leave empty to use auto-calculated values based on your weight and goal."
              : "Ostavi prazno da koristiš automatski izračunate vrednosti na osnovu težine i cilja."}
          </p>

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setShowTargetModal(false)}
              disabled={savingTargets}
            >
              {locale === "en" ? "Cancel" : "Otkaži"}
            </Button>
            <Button
              className="flex-1"
              onClick={handleSaveTargets}
              disabled={savingTargets}
            >
              {savingTargets
                ? (locale === "en" ? "Saving..." : "Čuvam...")
                : (locale === "en" ? "Save" : "Sačuvaj")}
            </Button>
          </div>

          {(data.customCalories || data.customProtein || data.customCarbs || data.customFats) && (
            <button
              onClick={resetTargets}
              disabled={savingTargets}
              className="w-full text-sm text-foreground-muted hover:text-foreground transition-colors py-2"
            >
              {locale === "en" ? "Reset to auto-calculated" : "Vrati na automatski izračunato"}
            </button>
          )}
        </div>
      </Modal>
    </div>
  );
}
