"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GlassCard, FadeIn, SlideUp } from "@/components/ui";
import { getTranslations } from "@/lib/i18n";

const t = getTranslations("sr");

type Goal = "fat_loss" | "muscle_gain" | "recomposition";

interface Supplement {
  name: string;
  category: "essential" | "performance" | "recovery" | "health";
  recommended: boolean;
  timing: string;
  dosage: string;
  benefits: string;
  icon: string;
}

// Supplement recommendations by goal
const supplementsByGoal: Record<Goal, Supplement[]> = {
  fat_loss: [
    {
      name: "Protein (Whey/Casein)",
      category: "essential",
      recommended: true,
      timing: "Posle treninga ili između obroka",
      dosage: "25-30g po porciji",
      benefits: "Čuva mišićnu masu tokom deficita kalorija",
      icon: "🥛",
    },
    {
      name: "Kreatin monohidrat",
      category: "performance",
      recommended: true,
      timing: "Bilo kada tokom dana",
      dosage: "5g dnevno",
      benefits: "Održava snagu i mišićnu masu",
      icon: "💪",
    },
    {
      name: "Omega-3 (Riblje ulje)",
      category: "health",
      recommended: true,
      timing: "Uz obrok",
      dosage: "2-3g EPA/DHA dnevno",
      benefits: "Smanjuje upale, podržava metabolizam",
      icon: "🐟",
    },
    {
      name: "Vitamin D",
      category: "health",
      recommended: true,
      timing: "Ujutru uz obrok",
      dosage: "2000-5000 IU dnevno",
      benefits: "Energija, imunitet, metabolizam",
      icon: "☀️",
    },
    {
      name: "Kofein",
      category: "performance",
      recommended: false,
      timing: "30-60 min pre treninga",
      dosage: "100-200mg",
      benefits: "Povećava fokus i sagorevanje kalorija",
      icon: "☕",
    },
    {
      name: "L-Karnitin",
      category: "performance",
      recommended: false,
      timing: "Pre treninga",
      dosage: "2-3g dnevno",
      benefits: "Pomaže transport masti za energiju",
      icon: "🔥",
    },
  ],
  muscle_gain: [
    {
      name: "Protein (Whey)",
      category: "essential",
      recommended: true,
      timing: "Posle treninga, ujutru, između obroka",
      dosage: "30-40g po porciji, 1.6-2.2g/kg TT dnevno",
      benefits: "Osnova za rast mišića",
      icon: "🥛",
    },
    {
      name: "Kreatin monohidrat",
      category: "essential",
      recommended: true,
      timing: "Bilo kada (konzistentno)",
      dosage: "5g dnevno",
      benefits: "Povećava snagu, volumen mišića i oporavak",
      icon: "💪",
    },
    {
      name: "Ugljeni hidrati (Dekstroza/Maltodekstrin)",
      category: "performance",
      recommended: true,
      timing: "Posle treninga sa proteinom",
      dosage: "30-50g",
      benefits: "Brza regeneracija glikogena",
      icon: "⚡",
    },
    {
      name: "Omega-3",
      category: "health",
      recommended: true,
      timing: "Uz obrok",
      dosage: "2-3g EPA/DHA dnevno",
      benefits: "Smanjuje upale, ubrzava oporavak",
      icon: "🐟",
    },
    {
      name: "Cink + Magnezijum (ZMA)",
      category: "recovery",
      recommended: false,
      timing: "Pre spavanja",
      dosage: "30mg cinka, 450mg magnezijuma",
      benefits: "Bolji san i hormonalna podrška",
      icon: "🌙",
    },
    {
      name: "Pre-Workout",
      category: "performance",
      recommended: false,
      timing: "30 min pre treninga",
      dosage: "Po uputstvu proizvoda",
      benefits: "Energija i fokus za intenzivne treninge",
      icon: "🚀",
    },
  ],
  recomposition: [
    {
      name: "Protein (Whey/Casein)",
      category: "essential",
      recommended: true,
      timing: "Posle treninga, ujutru, uveče",
      dosage: "25-35g po porciji, 1.8-2.2g/kg TT dnevno",
      benefits: "Gradi mišiće dok gubiš masnoću",
      icon: "🥛",
    },
    {
      name: "Kreatin monohidrat",
      category: "essential",
      recommended: true,
      timing: "Svaki dan, konzistentno",
      dosage: "5g dnevno",
      benefits: "Održava snagu tokom rekompozicije",
      icon: "💪",
    },
    {
      name: "Omega-3",
      category: "health",
      recommended: true,
      timing: "Uz obrok",
      dosage: "2-3g EPA/DHA dnevno",
      benefits: "Optimizuje metabolizam masti",
      icon: "🐟",
    },
    {
      name: "Vitamin D",
      category: "health",
      recommended: true,
      timing: "Ujutru",
      dosage: "2000-4000 IU",
      benefits: "Energija i hormonalna ravnoteža",
      icon: "☀️",
    },
    {
      name: "BCAA/EAA",
      category: "recovery",
      recommended: false,
      timing: "Tokom treninga",
      dosage: "5-10g",
      benefits: "Smanjuje razgradnju mišića",
      icon: "💧",
    },
    {
      name: "Magnezijum",
      category: "recovery",
      recommended: false,
      timing: "Uveče",
      dosage: "300-400mg",
      benefits: "Oporavak mišića i kvalitet sna",
      icon: "🌙",
    },
  ],
};

const goalLabels: Record<Goal, string> = {
  fat_loss: "Gubitak masnoće",
  muscle_gain: "Rast mišića",
  recomposition: "Rekompozicija",
};

const categoryColors: Record<string, string> = {
  essential: "bg-success/20 text-success",
  performance: "bg-accent/20 text-accent",
  recovery: "bg-purple-500/20 text-purple-400",
  health: "bg-blue-500/20 text-blue-400",
};

const categoryLabels: Record<string, string> = {
  essential: "Osnovno",
  performance: "Performanse",
  recovery: "Oporavak",
  health: "Zdravlje",
};

export default function SupplementsPage() {
  const router = useRouter();
  const [goal, setGoal] = useState<Goal>("fat_loss");
  const [loading, setLoading] = useState(true);
  const [expandedSupplement, setExpandedSupplement] = useState<string | null>(null);

  useEffect(() => {
    fetchGoal();
  }, []);

  const fetchGoal = async () => {
    try {
      const response = await fetch("/api/member/profile");
      if (response.ok) {
        const data = await response.json();
        setGoal(data.goal || "fat_loss");
      }
    } catch {
      // Use default
    } finally {
      setLoading(false);
    }
  };

  const supplements = supplementsByGoal[goal] || supplementsByGoal.fat_loss;
  const recommendedSupplements = supplements.filter(s => s.recommended);
  const optionalSupplements = supplements.filter(s => !s.recommended);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-foreground-muted">Učitava se...</div>
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
            <h1 className="text-xl text-headline text-foreground">{t.supplements.title}</h1>
            <p className="text-sm text-foreground-muted">{t.supplements.subtitle}</p>
          </div>
        </FadeIn>
      </header>

      <main className="px-6 py-6 space-y-4">
        {/* Goal Badge */}
        <SlideUp delay={100}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground-muted">Preporuke za cilj:</span>
            <button
              onClick={() => router.push("/goal")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 hover:bg-accent/20 transition-colors"
            >
              <span className="text-sm font-medium text-accent">{goalLabels[goal]}</span>
              <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </SlideUp>

        {/* Recommended Supplements */}
        <SlideUp delay={200}>
          <GlassCard>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">⭐</span>
              <h3 className="text-label">{t.supplements.recommended}</h3>
            </div>
            <div className="space-y-3">
              {recommendedSupplements.map((supplement) => (
                <div key={supplement.name}>
                  <button
                    onClick={() => setExpandedSupplement(
                      expandedSupplement === supplement.name ? null : supplement.name
                    )}
                    className="w-full glass rounded-xl p-4 text-left transition-all hover:bg-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{supplement.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground font-medium">{supplement.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColors[supplement.category]}`}>
                          {categoryLabels[supplement.category]}
                        </span>
                      </div>
                      <svg
                        className={`w-5 h-5 text-foreground-muted transition-transform ${
                          expandedSupplement === supplement.name ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {expandedSupplement === supplement.name && (
                    <div className="mt-2 p-4 rounded-xl bg-white/5 space-y-3">
                      <div>
                        <p className="text-xs text-foreground-muted">{t.supplements.timing}</p>
                        <p className="text-sm text-foreground">{supplement.timing}</p>
                      </div>
                      <div>
                        <p className="text-xs text-foreground-muted">{t.supplements.dosage}</p>
                        <p className="text-sm text-foreground">{supplement.dosage}</p>
                      </div>
                      <div>
                        <p className="text-xs text-foreground-muted">{t.supplements.benefits}</p>
                        <p className="text-sm text-foreground">{supplement.benefits}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </GlassCard>
        </SlideUp>

        {/* Optional Supplements */}
        <SlideUp delay={300}>
          <GlassCard>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">💡</span>
              <h3 className="text-label">{t.supplements.optional}</h3>
            </div>
            <div className="space-y-3">
              {optionalSupplements.map((supplement) => (
                <div key={supplement.name}>
                  <button
                    onClick={() => setExpandedSupplement(
                      expandedSupplement === supplement.name ? null : supplement.name
                    )}
                    className="w-full glass rounded-xl p-4 text-left transition-all hover:bg-white/5 opacity-80"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{supplement.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground font-medium">{supplement.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColors[supplement.category]}`}>
                          {categoryLabels[supplement.category]}
                        </span>
                      </div>
                      <svg
                        className={`w-5 h-5 text-foreground-muted transition-transform ${
                          expandedSupplement === supplement.name ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {expandedSupplement === supplement.name && (
                    <div className="mt-2 p-4 rounded-xl bg-white/5 space-y-3">
                      <div>
                        <p className="text-xs text-foreground-muted">{t.supplements.timing}</p>
                        <p className="text-sm text-foreground">{supplement.timing}</p>
                      </div>
                      <div>
                        <p className="text-xs text-foreground-muted">{t.supplements.dosage}</p>
                        <p className="text-sm text-foreground">{supplement.dosage}</p>
                      </div>
                      <div>
                        <p className="text-xs text-foreground-muted">{t.supplements.benefits}</p>
                        <p className="text-sm text-foreground">{supplement.benefits}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </GlassCard>
        </SlideUp>

        {/* Disclaimer */}
        <SlideUp delay={400}>
          <div className="text-center py-4">
            <p className="text-xs text-foreground-muted">
              {t.supplements.disclaimer}
            </p>
          </div>
        </SlideUp>
      </main>
    </div>
  );
}
