"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, GlassCard, SlideUp, FadeIn } from "@/components/ui";

type OnboardingPath = "challenge" | "coach" | "explore" | null;
type OnboardingStep = "choose" | "challenge" | "coach" | "explore" | "tour" | "mode";
type DifficultyMode = "simple" | "standard" | "pro";

interface Challenge {
  id: string;
  name: string;
  rewardDescription: string;
  participantCount: number;
  daysUntilDeadline: number | null;
  pointsPerMeal: number;
  pointsPerTraining: number;
  pointsPerWater: number;
}

interface Coach {
  id: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>("choose");
  const [selectedPath, setSelectedPath] = useState<OnboardingPath>(null);
  const [loading, setLoading] = useState(false);
  const [tourSlide, setTourSlide] = useState(0);
  const [selectedMode, setSelectedMode] = useState<DifficultyMode>("standard");

  // Challenge data
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [joiningChallenge, setJoiningChallenge] = useState(false);

  // Coach data
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [loadingCoaches, setLoadingCoaches] = useState(false);

  // Fetch active challenge
  useEffect(() => {
    fetchChallenge();
  }, []);

  const fetchChallenge = async () => {
    try {
      const response = await fetch("/api/member/challenge");
      if (response.ok) {
        const data = await response.json();
        if (data.challenge && !data.challenge.isUpcoming) {
          setChallenge(data.challenge);
        }
      }
    } catch {
      // Silently fail
    }
  };

  const fetchCoaches = async () => {
    setLoadingCoaches(true);
    try {
      const response = await fetch("/api/member/coaches");
      if (response.ok) {
        const data = await response.json();
        setCoaches(data.coaches || []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoadingCoaches(false);
    }
  };

  const handlePathSelect = (path: OnboardingPath) => {
    setSelectedPath(path);
    if (path === "challenge") {
      setStep("challenge");
    } else if (path === "coach") {
      setStep("coach");
      fetchCoaches();
    } else if (path === "explore") {
      setStep("tour");
    }
  };

  const handleJoinChallenge = async () => {
    setJoiningChallenge(true);
    try {
      await fetch("/api/member/challenge", {
        method: "POST",
      });
    } catch {
      // Continue anyway
    } finally {
      setJoiningChallenge(false);
      goToModeSelection();
    }
  };

  const handleSelectCoach = async () => {
    if (selectedCoach) {
      setLoading(true);
      try {
        await fetch("/api/member/coach-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ coachId: selectedCoach.id }),
        });
      } catch {
        // Continue anyway
      } finally {
        setLoading(false);
      }
    }
    goToModeSelection();
  };

  const goToModeSelection = () => {
    setStep("mode");
  };

  const completeOnboarding = async (path: string) => {
    setLoading(true);
    try {
      await fetch("/api/member/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hasSeenOnboarding: true,
          onboardingPath: path,
          difficultyMode: selectedMode,
        }),
      });
      router.push("/home");
      router.refresh();
    } catch {
      router.push("/home");
    }
  };

  // Tour slides for explorers
  const tourSlides = [
    {
      icon: "📸",
      title: "Upiši šta si jeo",
      description: "Slikaj obrok ili izaberi veličinu (malo/srednje/veliko). Bez brojanja kalorija - sistem procenjuje.",
    },
    {
      icon: "🏆",
      title: "Takmič se sa ostalima",
      description: "Pridruži se izazovu i sakupljaj poene za obroke, treninge i vode. Top 3 osvajaju nagrade!",
    },
    {
      icon: "🤖",
      title: "Pitaj AI agente",
      description: "Imaš pitanje o ishrani, suplementima ili treningu? AI asistenti su tu da pomognu.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Step 1: Choose path */}
      {step === "choose" && (
        <div className="min-h-screen flex flex-col justify-center p-6">
          <FadeIn>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Šta te dovodi ovde?
              </h1>
              <p className="text-foreground-muted">
                Izaberi kako želiš da počneš
              </p>
            </div>
          </FadeIn>

          <div className="space-y-4 max-w-md mx-auto w-full">
            {/* Challenge path */}
            <SlideUp delay={100}>
              <button
                onClick={() => handlePathSelect("challenge")}
                className="w-full p-5 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-emerald-500/5 border-2 border-emerald-500/30 text-left hover:bg-emerald-500/25 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-3xl">🏆</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      Želim da se takmičim
                    </h3>
                    <p className="text-sm text-foreground-muted">
                      Pridruži se izazovu i osvoji nagrade
                    </p>
                  </div>
                </div>
              </button>
            </SlideUp>

            {/* Coach path */}
            <SlideUp delay={200}>
              <button
                onClick={() => handlePathSelect("coach")}
                className="w-full p-5 rounded-2xl bg-gradient-to-r from-accent/20 to-accent/5 border-2 border-accent/30 text-left hover:bg-accent/25 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-3xl">👨‍🏫</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      Trener me poslao
                    </h3>
                    <p className="text-sm text-foreground-muted">
                      Poveži se sa trenerom za personalizovan pristup
                    </p>
                  </div>
                </div>
              </button>
            </SlideUp>

            {/* Explore path */}
            <SlideUp delay={300}>
              <button
                onClick={() => handlePathSelect("explore")}
                className="w-full p-5 rounded-2xl glass border-2 border-white/10 text-left hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-3xl">🔍</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      Samo istražujem
                    </h3>
                    <p className="text-sm text-foreground-muted">
                      Vidi kako aplikacija funkcioniše
                    </p>
                  </div>
                </div>
              </button>
            </SlideUp>
          </div>
        </div>
      )}

      {/* Step 2A: Challenge preview */}
      {step === "challenge" && (
        <div className="min-h-screen flex flex-col justify-center p-6">
          <FadeIn>
            <div className="max-w-md mx-auto w-full">
              {challenge ? (
                <div className="space-y-6">
                  {/* Challenge card */}
                  <div className="rounded-3xl bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-emerald-600/5 border-2 border-emerald-500/30 p-6 overflow-hidden">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <span className="text-3xl">🏆</span>
                      </div>
                      <div>
                        <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full font-medium">
                          Aktivan izazov
                        </span>
                      </div>
                    </div>

                    <h2 className="text-2xl font-bold text-foreground mb-2">
                      {challenge.name}
                    </h2>
                    <p className="text-sm text-foreground-muted mb-4">
                      {challenge.rewardDescription}
                    </p>

                    {/* Points breakdown */}
                    <div className="p-4 rounded-xl bg-black/20 mb-4">
                      <p className="text-xs text-foreground-muted mb-3">Kako se boduje:</p>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                          <p className="text-lg font-bold text-foreground">{challenge.pointsPerMeal}</p>
                          <p className="text-xs text-foreground-muted">poena/obrok</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-foreground">{challenge.pointsPerTraining}</p>
                          <p className="text-xs text-foreground-muted">poena/trening</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-foreground">{challenge.pointsPerWater}</p>
                          <p className="text-xs text-foreground-muted">poen/voda</p>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground-muted">
                        {challenge.participantCount} učesnika
                      </span>
                      {challenge.daysUntilDeadline !== null && (
                        <span className="text-emerald-400 font-medium">
                          Još {challenge.daysUntilDeadline} dana za prijavu
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-3">
                    <Button
                      className="w-full btn-press"
                      size="lg"
                      onClick={handleJoinChallenge}
                      loading={joiningChallenge}
                      style={{ backgroundColor: "rgb(16 185 129)" }}
                    >
                      Pridruži se izazovu
                    </Button>
                    <button
                      onClick={goToModeSelection}
                      className="w-full py-3 text-foreground-muted text-sm hover:text-foreground transition-colors"
                    >
                      Preskoči za sad
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 rounded-full bg-foreground-muted/10 flex items-center justify-center mx-auto">
                    <span className="text-4xl">🏆</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground mb-2">
                      Trenutno nema aktivnog izazova
                    </h2>
                    <p className="text-foreground-muted">
                      Kad počne sledeći izazov, dobićeš obaveštenje!
                    </p>
                  </div>
                  <Button
                    className="w-full btn-press glow-accent"
                    size="lg"
                    onClick={goToModeSelection}
                  >
                    Nastavi dalje
                  </Button>
                </div>
              )}

              {/* Back button */}
              <button
                onClick={() => setStep("choose")}
                className="mt-6 w-full py-3 text-foreground-muted text-sm hover:text-foreground transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Nazad
              </button>
            </div>
          </FadeIn>
        </div>
      )}

      {/* Step 2B: Coach selection */}
      {step === "coach" && (
        <div className="min-h-screen flex flex-col justify-center p-6">
          <FadeIn>
            <div className="max-w-md mx-auto w-full">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">👨‍🏫</span>
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">
                  Poveži se sa trenerom
                </h2>
                <p className="text-foreground-muted text-sm">
                  Izaberi trenera iz teretane ili nastavi bez
                </p>
              </div>

              {/* Coach list */}
              {loadingCoaches ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
              ) : coaches.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto mb-6">
                  {coaches.map((coach) => (
                    <button
                      key={coach.id}
                      onClick={() => setSelectedCoach(coach)}
                      className={`
                        w-full p-4 rounded-xl text-left transition-all
                        ${selectedCoach?.id === coach.id
                          ? "bg-accent/20 border-2 border-accent"
                          : "glass border-2 border-transparent hover:bg-white/10"
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                          {coach.avatarUrl ? (
                            <img src={coach.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <span className="text-xl">👤</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground">{coach.name}</p>
                          {coach.bio && (
                            <p className="text-sm text-foreground-muted truncate">{coach.bio}</p>
                          )}
                        </div>
                        {selectedCoach?.id === coach.id && (
                          <svg className="w-5 h-5 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 mb-6">
                  <p className="text-foreground-muted">
                    Treneri još nisu dodati u sistem.
                    <br />
                    Možeš ih pronaći kasnije.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3">
                <Button
                  className="w-full btn-press glow-accent"
                  size="lg"
                  onClick={handleSelectCoach}
                  loading={loading}
                >
                  {selectedCoach ? "Pošalji zahtev treneru" : "Nastavi bez trenera"}
                </Button>
              </div>

              {/* Back button */}
              <button
                onClick={() => {
                  setStep("choose");
                  setSelectedCoach(null);
                }}
                className="mt-6 w-full py-3 text-foreground-muted text-sm hover:text-foreground transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Nazad
              </button>
            </div>
          </FadeIn>
        </div>
      )}

      {/* Step 2C: Quick tour */}
      {step === "tour" && (
        <div className="min-h-screen flex flex-col justify-center p-6">
          <FadeIn>
            <div className="max-w-md mx-auto w-full">
              {/* Progress dots */}
              <div className="flex justify-center gap-2 mb-8">
                {tourSlides.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === tourSlide ? "bg-accent" : "bg-white/20"
                    }`}
                  />
                ))}
              </div>

              {/* Slide content */}
              <div className="text-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center mx-auto">
                  <span className="text-4xl">{tourSlides[tourSlide].icon}</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-3">
                    {tourSlides[tourSlide].title}
                  </h2>
                  <p className="text-foreground-muted">
                    {tourSlides[tourSlide].description}
                  </p>
                </div>
              </div>

              {/* Navigation */}
              <div className="mt-12 space-y-3">
                {tourSlide < tourSlides.length - 1 ? (
                  <Button
                    className="w-full btn-press glow-accent"
                    size="lg"
                    onClick={() => setTourSlide(tourSlide + 1)}
                  >
                    Dalje
                  </Button>
                ) : (
                  <Button
                    className="w-full btn-press glow-accent"
                    size="lg"
                    onClick={goToModeSelection}
                  >
                    Dalje
                  </Button>
                )}

                {tourSlide > 0 && (
                  <button
                    onClick={() => setTourSlide(tourSlide - 1)}
                    className="w-full py-3 text-foreground-muted text-sm hover:text-foreground transition-colors"
                  >
                    Nazad
                  </button>
                )}

                {tourSlide === 0 && (
                  <button
                    onClick={() => setStep("choose")}
                    className="w-full py-3 text-foreground-muted text-sm hover:text-foreground transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Nazad na izbor
                  </button>
                )}
              </div>
            </div>
          </FadeIn>
        </div>
      )}

      {/* Step 3: Difficulty mode selection */}
      {step === "mode" && (
        <div className="min-h-screen flex flex-col justify-center p-6">
          <FadeIn>
            <div className="max-w-md mx-auto w-full">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Kako želiš da koristiš aplikaciju?
                </h1>
                <p className="text-foreground-muted">
                  Možeš promeniti ovo kasnije u podešavanjima
                </p>
                <p className="text-xs text-foreground-muted mt-2 bg-white/5 rounded-lg px-3 py-2 inline-block">
                  💡 Svi režimi zarađuju iste poene u izazovima
                </p>
              </div>

              <div className="space-y-4">
                {/* Simple mode */}
                <SlideUp delay={100}>
                  <button
                    onClick={() => setSelectedMode("simple")}
                    className={`w-full p-5 rounded-2xl text-left transition-all ${
                      selectedMode === "simple"
                        ? "bg-emerald-500/20 border-2 border-emerald-500"
                        : "glass border-2 border-transparent hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 ${
                        selectedMode === "simple" ? "bg-emerald-500/30" : "bg-white/10"
                      }`}>
                        <span className="text-3xl">🎯</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-foreground">
                            Jednostavno
                          </h3>
                          <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                            Preporučeno
                          </span>
                        </div>
                        <p className="text-sm text-foreground-muted mt-1">
                          Samo izazovi i brzo upisivanje. Bez brojanja kalorija.
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="text-xs bg-white/10 px-2 py-1 rounded-full">✓ Izazovi</span>
                          <span className="text-xs bg-white/10 px-2 py-1 rounded-full">✓ Brzi unos</span>
                        </div>
                      </div>
                      {selectedMode === "simple" && (
                        <svg className="w-6 h-6 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                </SlideUp>

                {/* Standard mode */}
                <SlideUp delay={200}>
                  <button
                    onClick={() => setSelectedMode("standard")}
                    className={`w-full p-5 rounded-2xl text-left transition-all ${
                      selectedMode === "standard"
                        ? "bg-accent/20 border-2 border-accent"
                        : "glass border-2 border-transparent hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 ${
                        selectedMode === "standard" ? "bg-accent/30" : "bg-white/10"
                      }`}>
                        <span className="text-3xl">📊</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-foreground">
                          Standardno
                        </h3>
                        <p className="text-sm text-foreground-muted mt-1">
                          Praćenje obroka sa procenom kalorija. Sve funkcije.
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="text-xs bg-white/10 px-2 py-1 rounded-full">✓ Izazovi</span>
                          <span className="text-xs bg-white/10 px-2 py-1 rounded-full">✓ Foto unos</span>
                          <span className="text-xs bg-white/10 px-2 py-1 rounded-full">✓ AI chat</span>
                        </div>
                      </div>
                      {selectedMode === "standard" && (
                        <svg className="w-6 h-6 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                </SlideUp>

                {/* Pro mode */}
                <SlideUp delay={300}>
                  <button
                    onClick={() => setSelectedMode("pro")}
                    className={`w-full p-5 rounded-2xl text-left transition-all ${
                      selectedMode === "pro"
                        ? "bg-purple-500/20 border-2 border-purple-500"
                        : "glass border-2 border-transparent hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 ${
                        selectedMode === "pro" ? "bg-purple-500/30" : "bg-white/10"
                      }`}>
                        <span className="text-3xl">🔬</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-foreground">
                          Pro
                        </h3>
                        <p className="text-sm text-foreground-muted mt-1">
                          Detaljno praćenje makro nutrijenata. Za ozbiljne sportiste.
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="text-xs bg-white/10 px-2 py-1 rounded-full">✓ Sve funkcije</span>
                          <span className="text-xs bg-white/10 px-2 py-1 rounded-full">✓ Tačan unos makrosa</span>
                          <span className="text-xs bg-white/10 px-2 py-1 rounded-full">✓ Detaljna analitika</span>
                        </div>
                      </div>
                      {selectedMode === "pro" && (
                        <svg className="w-6 h-6 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                </SlideUp>
              </div>

              {/* Confirm button */}
              <div className="mt-8">
                <Button
                  className="w-full btn-press glow-accent"
                  size="lg"
                  onClick={() => completeOnboarding(selectedPath || "explore")}
                  loading={loading}
                >
                  Započni
                </Button>
              </div>
            </div>
          </FadeIn>
        </div>
      )}
    </div>
  );
}
