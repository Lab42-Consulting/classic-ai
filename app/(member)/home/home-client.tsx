"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  GlassCard,
  ProgressRing,
  AnimatedNumber,
  SlideUp,
  FadeIn,
  AgentAvatar,
  agentMeta,
} from "@/components/ui";
import { AgentType } from "@/components/ui/agent-avatar";
import { StatusType } from "@/components/ui/status-indicator";
import { getGreeting, getTranslations } from "@/lib/i18n";

interface NudgeData {
  id: string;
  message: string;
  coachName: string;
  createdAt: string;
}

interface CoachRequestData {
  id: string;
  coachName: string;
  customGoal: string | null;
  customCalories: number | null;
  customProtein: number | null;
  customCarbs: number | null;
  customFats: number | null;
  createdAt: string;
}

interface HomeData {
  memberName: string;
  memberAvatarUrl: string | null;
  hasCoach: boolean;
  status: StatusType;
  caloriesRemaining: number;
  targetCalories: number;
  consumedCalories: number;
  consumedProtein: number;
  targetProtein: number;
  macros: {
    protein: { percentage: number; status: StatusType };
    carbs: { percentage: number; status: StatusType };
    fats: { percentage: number; status: StatusType };
  };
  // Today's activity (all daily metrics)
  trainingCountToday: number;
  waterGlasses: number;
  mealsToday: number;
  // Weekly data (for contextual advice only)
  weeklyTrainingSessions: number;
  nudges: NudgeData[];
  pendingCoachRequest: CoachRequestData | null;
  // Staff viewing as member (dual-role)
  isStaffMember: boolean;
}

interface HomeClientProps {
  data: HomeData;
}

const t = getTranslations("sr");

const statusConfig = {
  on_track: { label: t.home.onTrack, color: "text-success", bg: "bg-success/10" },
  needs_attention: { label: t.home.needsAttention, color: "text-warning", bg: "bg-warning/10" },
  off_track: { label: t.home.offTrack, color: "text-error", bg: "bg-error/10" },
};

const macroColors: Record<StatusType, string> = {
  on_track: "bg-success",
  needs_attention: "bg-warning",
  off_track: "bg-error",
};


export function HomeClient({ data }: HomeClientProps) {
  const router = useRouter();
  const [dismissedNudges, setDismissedNudges] = useState<Set<string>>(new Set());
  const [coachRequest, setCoachRequest] = useState<CoachRequestData | null>(data.pendingCoachRequest);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isProcessingRequest, setIsProcessingRequest] = useState(false);
  const statusInfo = statusConfig[data.status];
  const greeting = getGreeting("sr");

  // Filter out dismissed nudges
  const visibleNudges = data.nudges.filter((n) => !dismissedNudges.has(n.id));

  // Mark nudge as seen and dismiss it
  const handleDismissNudge = async (nudgeId: string) => {
    setDismissedNudges((prev) => new Set([...prev, nudgeId]));
    try {
      await fetch("/api/member/nudges", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nudgeIds: [nudgeId] }),
      });
    } catch {
      // Silently fail - nudge is already dismissed locally
    }
  };

  // Handle accepting coach request
  const handleAcceptRequest = async () => {
    setIsProcessingRequest(true);
    try {
      const response = await fetch("/api/member/coach-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });
      if (response.ok) {
        setCoachRequest(null);
        setShowConfirmModal(false);
        // Refresh the page to get updated data
        router.refresh();
      }
    } catch {
      // Handle error silently
    } finally {
      setIsProcessingRequest(false);
    }
  };

  // Handle declining coach request
  const handleDeclineRequest = async () => {
    setIsProcessingRequest(true);
    try {
      const response = await fetch("/api/member/coach-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decline" }),
      });
      if (response.ok) {
        setCoachRequest(null);
      }
    } catch {
      // Handle error silently
    } finally {
      setIsProcessingRequest(false);
    }
  };

  // Format relative time for nudges
  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `pre ${diffDays} ${diffDays === 1 ? "dan" : "dana"}`;
    if (diffHours > 0) return `pre ${diffHours}h`;
    return "upravo";
  };

  // Calculate calorie status
  const isOverCalories = data.consumedCalories > data.targetCalories;
  const caloriesOver = data.consumedCalories - data.targetCalories;
  const calorieProgress = (data.consumedCalories / data.targetCalories) * 100;

  // Calculate recovery advice
  const getRecoveryAdvice = () => {
    if (!isOverCalories) return null;

    const overPercent = (caloriesOver / data.targetCalories) * 100;

    if (overPercent <= 10) {
      // Small surplus (up to 10% over) - light adjustment
      return {
        icon: "🍃",
        text: t.home.lightDay,
        deficit: Math.round(caloriesOver * 0.5), // Spread over 2 days
      };
    } else if (overPercent <= 25) {
      // Medium surplus (10-25% over) - skip a meal
      return {
        icon: "⏸️",
        text: t.home.skipMeal,
        deficit: caloriesOver,
      };
    } else {
      // Large surplus (>25% over) - extra training
      return {
        icon: "🏃",
        text: t.home.extraTraining,
        deficit: caloriesOver,
      };
    }
  };

  const recoveryAdvice = getRecoveryAdvice();

  // Check for contextual advice conditions
  const currentHour = new Date().getHours();
  const isAfternoon = currentHour >= 14;
  const isEvening = currentHour >= 18;

  // Low water (show after 2pm if less than 4 glasses)
  const showLowWaterAdvice = isAfternoon && data.waterGlasses < 4;

  // Low protein (show after 6pm if protein is less than 50% of target)
  const proteinProgress = data.targetProtein > 0 ? (data.consumedProtein / data.targetProtein) * 100 : 0;
  const showLowProteinAdvice = isEvening && proteinProgress < 50 && !isOverCalories;

  // No training (show in afternoon if hasn't trained and has low training this week)
  const showNoTrainingAdvice = isAfternoon && !data.trainingCountToday && data.weeklyTrainingSessions < 2;

  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header - Centered with User Avatar */}
      <header className="px-6 pt-14 pb-6">
        <FadeIn>
          <div className="flex flex-col items-center text-center">
            {/* User Avatar - Tappable for Profile */}
            <button
              onClick={() => router.push("/profile")}
              className="w-16 h-16 rounded-full overflow-hidden mb-3 glow-accent btn-press hover:opacity-90 transition-opacity"
              aria-label="Open profile"
            >
              {data.memberAvatarUrl ? (
                <img
                  src={data.memberAvatarUrl}
                  alt={data.memberName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-accent/20 flex items-center justify-center">
                  <span className="text-xl font-bold text-accent">
                    {getInitials(data.memberName)}
                  </span>
                </div>
              )}
            </button>
            <p className="text-label">{greeting}</p>
            <h1 className="text-3xl text-display text-foreground mt-1">
              {data.memberName}
            </h1>

            {/* Coach Mode Toggle - Only for staff with linked member account */}
            {data.isStaffMember && (
              <button
                onClick={() => router.push("/dashboard")}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-accent/10 hover:bg-accent/20 border border-accent/30 rounded-full transition-colors"
              >
                <span className="text-sm">👨‍🏫</span>
                <span className="text-sm font-medium text-accent">Trenerski režim</span>
                <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </button>
            )}
          </div>
        </FadeIn>
      </header>

      {/* Coach Request Banner - Most prominent, above everything */}
      {coachRequest && (
        <div className="px-6 mb-4">
          <SlideUp delay={25}>
            <div className="relative bg-gradient-to-r from-warning/20 to-warning/5 border border-warning/30 rounded-2xl p-5">
              {/* Warning icon */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">👨‍🏫</span>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-warning mb-1">
                    Zahtev za trenera
                  </h3>
                  <p className="text-sm text-foreground mb-3">
                    <span className="font-medium text-warning">{coachRequest.coachName}</span> želi da postane tvoj trener.
                  </p>

                  {/* Warning about reset */}
                  <div className="bg-error/10 border border-error/20 rounded-xl p-3 mb-4">
                    <div className="flex items-start gap-2">
                      <span className="text-base">⚠️</span>
                      <p className="text-sm text-foreground-muted">
                        Ako prihvatiš, <span className="text-error font-medium">tvoj napredak će biti resetovan</span> i ciljevi će biti postavljeni prema planu trenera.
                      </p>
                    </div>
                  </div>

                  {/* Coach's proposed targets (if any) */}
                  {(coachRequest.customCalories || coachRequest.customGoal) && (
                    <div className="bg-white/5 rounded-xl p-3 mb-4">
                      <p className="text-xs text-foreground-muted mb-2">Trenerov plan:</p>
                      <div className="flex flex-wrap gap-2">
                        {coachRequest.customGoal && (
                          <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded-full">
                            {coachRequest.customGoal === "fat_loss" ? "Gubitak masti" :
                             coachRequest.customGoal === "muscle_gain" ? "Rast mišića" : "Rekompozicija"}
                          </span>
                        )}
                        {coachRequest.customCalories && (
                          <span className="text-xs bg-foreground/10 text-foreground px-2 py-1 rounded-full">
                            {coachRequest.customCalories} kcal
                          </span>
                        )}
                        {coachRequest.customProtein && (
                          <span className="text-xs bg-success/20 text-success px-2 py-1 rounded-full">
                            {coachRequest.customProtein}g proteina
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleDeclineRequest}
                      disabled={isProcessingRequest}
                      className="flex-1 py-2.5 px-4 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium text-foreground transition-colors disabled:opacity-50"
                    >
                      Odbij
                    </button>
                    <button
                      onClick={() => setShowConfirmModal(true)}
                      disabled={isProcessingRequest}
                      className="flex-1 py-2.5 px-4 bg-warning hover:bg-warning/90 rounded-xl text-sm font-medium text-black transition-colors disabled:opacity-50"
                    >
                      Prihvati
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </SlideUp>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && coachRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80">
          <div className="bg-background-secondary border border-border rounded-2xl p-6 max-w-sm w-full">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-error/20 flex items-center justify-center">
                <span className="text-3xl">⚠️</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Potvrdi prihvatanje
              </h3>
              <p className="text-sm text-foreground-muted">
                Prihvatanjem zahteva, <span className="text-error font-medium">svi tvoji dnevni logovi će biti obrisani</span> i počećeš ispočetka sa trenerovim planom.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleAcceptRequest}
                disabled={isProcessingRequest}
                className="w-full py-3 px-4 bg-warning hover:bg-warning/90 rounded-xl text-sm font-semibold text-black transition-colors disabled:opacity-50"
              >
                {isProcessingRequest ? "Obrađujem..." : "Da, prihvatam"}
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isProcessingRequest}
                className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium text-foreground transition-colors disabled:opacity-50"
              >
                Odustani
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Find Coach Card - Show when member has no coach, no pending request, and is not staff */}
      {!data.hasCoach && !coachRequest && !data.isStaffMember && (
        <div className="px-6 mb-4">
          <SlideUp delay={50}>
            <button
              onClick={() => router.push("/find-coach")}
              className="w-full relative bg-gradient-to-r from-accent/15 to-accent/5 border border-accent/20 rounded-2xl p-5 text-left hover:bg-accent/10 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">👨‍🏫</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-accent mb-1">
                    {t.coaches?.title || "Pronađi trenera"}
                  </h3>
                  <p className="text-sm text-foreground-muted">
                    {t.coaches?.subtitle || "Izaberi trenera koji će te voditi"}
                  </p>
                </div>
                <svg className="w-5 h-5 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </SlideUp>
        </div>
      )}

      {/* Coach Nudges - Prominent at top */}
      {visibleNudges.length > 0 && (
        <div className="px-6 mb-4">
          <SlideUp delay={50}>
            <div className="space-y-3">
              {visibleNudges.map((nudge) => (
                <div
                  key={nudge.id}
                  className="relative bg-gradient-to-r from-accent/15 to-accent/5 border border-accent/20 rounded-2xl p-4"
                >
                  {/* Dismiss button */}
                  <button
                    onClick={() => handleDismissNudge(nudge.id)}
                    className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                    aria-label="Odbaci poruku"
                  >
                    <svg className="w-3 h-3 text-foreground-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  <div className="flex items-start gap-3 pr-6">
                    {/* Coach avatar */}
                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg">👨‍🏫</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-accent">
                          {nudge.coachName}
                        </span>
                        <span className="text-xs text-foreground-muted">
                          {formatTimeAgo(nudge.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">
                        {nudge.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SlideUp>
        </div>
      )}

      {/* Main Content */}
      <main className="px-6 space-y-5">
        {/* Hero: Calorie Ring */}
        <SlideUp delay={100}>
          <GlassCard variant="prominent" className="relative">
            {/* Status Badge */}
            <div className="flex justify-center mb-2">
              <div className={`
                inline-flex items-center gap-2 px-4 py-1.5 rounded-full
                ${isOverCalories ? "bg-error/10" : statusInfo.bg}
              `}>
                <span className={`w-2 h-2 rounded-full ${isOverCalories ? 'bg-error animate-pulse' : data.status === 'on_track' ? 'bg-success' : data.status === 'needs_attention' ? 'bg-warning' : 'bg-error'}`} />
                <span className={`text-sm font-medium ${isOverCalories ? "text-error" : statusInfo.color}`}>
                  {isOverCalories ? t.home.surplus : statusInfo.label}
                </span>
              </div>
            </div>

            {/* Calorie Ring */}
            <div className="flex justify-center py-6">
              <ProgressRing
                progress={calorieProgress}
                size={220}
                strokeWidth={14}
                showOverflow={true}
              >
                <div className="text-center">
                  {isOverCalories ? (
                    <>
                      <div className="text-5xl text-display text-number text-error">
                        +<AnimatedNumber value={caloriesOver} />
                      </div>
                      <p className="text-error text-sm mt-1">
                        {t.home.caloriesOver}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="text-5xl text-display text-number text-foreground">
                        <AnimatedNumber value={data.caloriesRemaining} />
                      </div>
                      <p className="text-foreground-muted text-sm mt-1">
                        {t.home.caloriesLeft}
                      </p>
                    </>
                  )}
                </div>
              </ProgressRing>
            </div>

            {/* Consumed / Target */}
            <div className="flex justify-center gap-8 text-center">
              <div>
                <p className={`text-2xl font-semibold text-number ${isOverCalories ? "text-error" : "text-foreground"}`}>
                  <AnimatedNumber value={data.consumedCalories} />
                </p>
                <p className="text-xs text-foreground-muted">{t.home.consumed}</p>
              </div>
              <div className="w-px bg-border" />
              <div>
                <p className="text-2xl font-semibold text-number text-foreground">
                  {data.targetCalories.toLocaleString()}
                </p>
                <p className="text-xs text-foreground-muted">{t.home.target}</p>
              </div>
            </div>

            {/* Recovery Advice - shown when over calories */}
            {recoveryAdvice && (
              <div className="mt-4 pt-4 border-t border-error/20">
                <div className="bg-error/5 rounded-xl p-3">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{recoveryAdvice.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-error">
                        {t.home.surplusWarning}
                      </p>
                      <p className="text-sm text-foreground-muted mt-1">
                        {recoveryAdvice.text}
                      </p>
                      <p className="text-sm text-foreground-muted mt-2">
                        {t.home.recoveryOption1}{" "}
                        <span className="font-semibold text-foreground">{recoveryAdvice.deficit} {t.home.recoveryKcal}</span>{" "}
                        {t.home.recoveryOption2}
                      </p>
                    </div>
                  </div>
                  {/* Discuss with AI button */}
                  <button
                    onClick={() => {
                      const prompt = `Danas sam pojeo ${caloriesOver} kalorija više od cilja. Kako mogu da nadoknadim ovaj višak?`;
                      router.push(`/chat/nutrition?prompt=${encodeURIComponent(prompt)}`);
                    }}
                    className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors"
                  >
                    <AgentAvatar agent="nutrition" size="sm" state="idle" />
                    <span className="text-sm font-medium text-emerald-500">
                      Pitaj Agenta
                    </span>
                  </button>
                </div>
              </div>
            )}
          </GlassCard>
        </SlideUp>

        {/* Macro Distribution */}
        <SlideUp delay={200}>
          <GlassCard>
            <h3 className="text-label mb-4">{t.home.macroBalance}</h3>
            <div className="space-y-4">
              {[
                { label: t.home.protein, ...data.macros.protein },
                { label: t.home.carbs, ...data.macros.carbs },
                { label: t.home.fats, ...data.macros.fats },
              ].map((macro) => (
                <div key={macro.label} className="flex items-center gap-4">
                  <span className="w-20 text-sm text-foreground-muted">
                    {macro.label}
                  </span>
                  <div className="flex-1 h-2 bg-background-tertiary rounded-full overflow-hidden">
                    <div
                      className={`h-full ${macroColors[macro.status]} rounded-full transition-all duration-1000 ease-out`}
                      style={{ width: `${macro.percentage}%` }}
                    />
                  </div>
                  <span className="w-12 text-sm font-medium text-foreground text-right text-number">
                    {macro.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>
        </SlideUp>

        {/* Today's Stats Row */}
        <SlideUp delay={300}>
          <div className="grid grid-cols-3 gap-3">
            {/* Training Today */}
            <GlassCard className="text-center py-5">
              <div className="text-3xl mb-1">💪</div>
              <p className="text-2xl font-bold text-number text-foreground">
                {data.trainingCountToday > 0 ? "✓" : "—"}
              </p>
              <p className="text-xs text-foreground-muted">{t.home.training}</p>
            </GlassCard>

            {/* Water Today */}
            <GlassCard className="text-center py-5">
              <div className="text-3xl mb-1">💧</div>
              <p className="text-2xl font-bold text-number text-foreground">
                <AnimatedNumber value={data.waterGlasses} />
                <span className="text-base text-foreground-muted font-normal">/8</span>
              </p>
              <p className="text-xs text-foreground-muted">{t.home.glasses}</p>
            </GlassCard>

            {/* Meals Today */}
            <GlassCard className="text-center py-5">
              <div className="text-3xl mb-1">🍽️</div>
              <p className="text-2xl font-bold text-number text-foreground">
                <AnimatedNumber value={data.mealsToday} />
              </p>
              <p className="text-xs text-foreground-muted">{t.home.meals}</p>
            </GlassCard>
          </div>
        </SlideUp>

        {/* Contextual Advice Cards */}
        {(showLowWaterAdvice || showLowProteinAdvice || showNoTrainingAdvice) && (
          <SlideUp delay={350}>
            <div className="space-y-3">
              {/* Low Water Advice */}
              {showLowWaterAdvice && (
                <GlassCard className="border-warning/20">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">💧</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-warning">
                        {t.home.lowWater}
                      </p>
                      <p className="text-sm text-foreground-muted mt-1">
                        {t.home.lowWaterDesc}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const prompt = `Danas sam popio samo ${data.waterGlasses} čaše vode. Koliko vode treba da pijem dnevno?`;
                      router.push(`/chat/nutrition?prompt=${encodeURIComponent(prompt)}`);
                    }}
                    className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors"
                  >
                    <AgentAvatar agent="nutrition" size="sm" state="idle" />
                    <span className="text-sm font-medium text-emerald-500">
                      Pitaj Agenta
                    </span>
                  </button>
                </GlassCard>
              )}

              {/* Low Protein Advice */}
              {showLowProteinAdvice && (
                <GlassCard className="border-warning/20">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🥩</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-warning">
                        {t.home.lowProtein}
                      </p>
                      <p className="text-sm text-foreground-muted mt-1">
                        {t.home.lowProteinDesc}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const prompt = `Danas sam uneo samo ${data.consumedProtein}g proteina od cilja ${data.targetProtein}g. Koje namirnice predlažeš za večeru?`;
                      router.push(`/chat/nutrition?prompt=${encodeURIComponent(prompt)}`);
                    }}
                    className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors"
                  >
                    <AgentAvatar agent="nutrition" size="sm" state="idle" />
                    <span className="text-sm font-medium text-emerald-500">
                      Pitaj Agenta
                    </span>
                  </button>
                </GlassCard>
              )}

              {/* No Training Advice */}
              {showNoTrainingAdvice && (
                <GlassCard className="border-accent/20">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">💪</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-accent">
                        {t.home.noTrainingYet}
                      </p>
                      <p className="text-sm text-foreground-muted mt-1">
                        {t.home.noTrainingDesc}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const prompt = `Danas nisam trenirao, ove nedelje sam imao ${data.weeklyTrainingSessions} treninga. Da li treba da treniram danas?`;
                      router.push(`/chat/training?prompt=${encodeURIComponent(prompt)}`);
                    }}
                    className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 px-4 bg-orange-500/10 hover:bg-orange-500/20 rounded-lg transition-colors"
                  >
                    <AgentAvatar agent="training" size="sm" state="idle" />
                    <span className="text-sm font-medium text-orange-500">
                      Pitaj Agenta
                    </span>
                  </button>
                </GlassCard>
              )}
            </div>
          </SlideUp>
        )}

        {/* AI Agents Section */}
        <SlideUp delay={400}>
          <div className="space-y-3">
            <h3 className="text-label px-1">AI Asistenti</h3>

            {(["nutrition", "supplements", "training"] as AgentType[]).map((agent) => {
              const meta = agentMeta[agent];
              return (
                <GlassCard
                  key={agent}
                  hover
                  className={`cursor-pointer ${meta.borderClass} border`}
                  onClick={() => router.push(`/chat/${agent}`)}
                >
                  <div className="flex items-center gap-3">
                    <AgentAvatar agent={agent} size="md" state="idle" />
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground font-medium">{meta.name}</p>
                      <p className="text-foreground-muted text-xs mt-0.5">{meta.description}</p>
                    </div>
                    <svg className={`w-5 h-5 ${meta.textClass} flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </SlideUp>

        {/* Quick Actions - 2x3 Grid */}
        <SlideUp delay={500}>
          <div className="grid grid-cols-3 gap-3">
            {/* Row 1 */}
            <button
              onClick={() => router.push("/progress")}
              className="glass rounded-2xl p-4 card-hover btn-press flex flex-col items-center"
            >
              <span className="text-2xl block mb-2">📈</span>
              <span className="text-sm text-foreground-muted">{t.home.progress}</span>
            </button>
            <button
              onClick={() => router.push("/checkin")}
              className="glass rounded-2xl p-4 card-hover btn-press flex flex-col items-center"
            >
              <span className="text-2xl block mb-2">📊</span>
              <span className="text-sm text-foreground-muted">{t.home.checkIn}</span>
            </button>
            <button
              onClick={() => router.push("/history")}
              className="glass rounded-2xl p-4 card-hover btn-press flex flex-col items-center"
            >
              <span className="text-2xl block mb-2">📅</span>
              <span className="text-sm text-foreground-muted">{t.home.history}</span>
            </button>
            {/* Row 2 */}
            <button
              onClick={() => router.push("/subscription")}
              className="glass rounded-2xl p-4 card-hover btn-press flex flex-col items-center"
            >
              <span className="text-2xl block mb-2">💳</span>
              <span className="text-sm text-foreground-muted">{t.home.membership}</span>
            </button>
            <button
              onClick={() => router.push("/supplements")}
              className="glass rounded-2xl p-4 card-hover btn-press flex flex-col items-center"
            >
              <span className="text-2xl block mb-2">💊</span>
              <span className="text-sm text-foreground-muted">{t.home.supplements}</span>
            </button>
            <button
              onClick={() => router.push("/meals")}
              className="glass rounded-2xl p-4 card-hover btn-press flex flex-col items-center"
            >
              <span className="text-2xl block mb-2">🍽️</span>
              <span className="text-sm text-foreground-muted">{t.meals?.title || "Obroci"}</span>
            </button>
          </div>
        </SlideUp>
      </main>

      {/* Primary Action Button - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background/95 to-transparent">
        <FadeIn delay={600}>
          <Button
            className="w-full btn-press glow-accent"
            size="lg"
            onClick={() => router.push("/log")}
          >
            {t.home.logSomething}
          </Button>
        </FadeIn>
      </div>
    </div>
  );
}
