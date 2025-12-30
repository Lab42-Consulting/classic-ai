"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { GlassCard, Button, SlideUp, FadeIn } from "@/components/ui";
import { AgentAvatar, agentMeta } from "@/components/ui/agent-avatar";

interface Section {
  icon: string;
  title: string;
  content: React.ReactNode;
}

const sections: Section[] = [
  {
    icon: "🧠",
    title: "Već znaš šta treba da radiš",
    content: (
      <>
        <p className="text-foreground-muted mb-3">Već znaš:</p>
        <ul className="space-y-1 text-foreground-muted mb-4">
          <li>• da treba da treniraš</li>
          <li>• da jedeš približno kako treba</li>
          <li>• da budeš dosledan</li>
        </ul>
        <p className="text-foreground font-medium mb-2">
          Problem nikada nije znanje.
        </p>
        <p className="text-foreground-muted">
          Problem je: preskakanje dana, &ldquo;počinjem opet u ponedeljak&rdquo;,
          niko ne vidi kad ispadneš iz ritma.
        </p>
      </>
    ),
  },
  {
    icon: "🔁",
    title: "Ovo menja pravila igre",
    content: (
      <>
        <p className="text-foreground-muted mb-3">
          Ovaj sistem ne traži savršenstvo.
          <br />
          Traži <span className="text-foreground font-medium">doslednost</span>.
        </p>
        <p className="text-foreground-muted mb-3">
          Ne broji svaki gram. Ne traži slike svakog obroka. Ne kažnjava greške.
        </p>
        <p className="text-foreground font-medium">On:</p>
        <ul className="space-y-1 text-foreground-muted mt-2">
          <li>• prati ritam</li>
          <li>• pokazuje kad si &ldquo;u zoni&rdquo;</li>
          <li>• reaguje pre nego što potpuno ispadneš</li>
        </ul>
      </>
    ),
  },
  {
    icon: "⚡",
    title: "Jednostavno = koristiš ga svaki dan",
    content: (
      <>
        <p className="text-foreground-muted mb-3">Zato ovde:</p>
        <ul className="space-y-2 text-foreground-muted mb-4">
          <li>• obrok biraš kao <span className="text-foreground">mali / srednji / veliki</span></li>
          <li>• trening loguješ <span className="text-foreground">jednim klikom</span></li>
          <li>• vodu dodaješ <span className="text-foreground">bez razmišljanja</span></li>
        </ul>
        <div className="p-3 rounded-xl bg-success/10 border border-success/20">
          <p className="text-success text-sm">
            Što je lakše → to je doslednije
            <br />
            Što je doslednije → to su rezultati bolji
          </p>
        </div>
      </>
    ),
  },
  {
    icon: "👀",
    title: "Nisi sam u ovome",
    content: (
      <>
        <p className="text-foreground-muted mb-3">
          Ovo nije privatni dnevnik koji niko ne vidi.
        </p>
        <p className="text-foreground font-medium mb-2">Tvoj napredak:</p>
        <ul className="space-y-1 text-foreground-muted mb-4">
          <li>• vidi sistem</li>
          <li>• vidi trener</li>
          <li>• vidiš i ti, jasno i iskreno</li>
        </ul>
        <p className="text-foreground-muted mb-2">
          Kad si u ritmu — super.
          <br />
          Kad počneš da kliziš — reagujemo na vreme.
        </p>
        <div className="mt-4 space-y-2 text-sm">
          <p className="text-error/80">❌ &ldquo;nestao je posle 3 nedelje&rdquo;</p>
          <p className="text-success">✅ &ldquo;ostao je 6 meseci i napravio promenu&rdquo;</p>
        </div>
      </>
    ),
  },
  {
    icon: "🤖",
    title: "AI asistenti su ti na raspolaganju",
    content: (
      <>
        <p className="text-foreground-muted mb-4">
          Imaš pitanje? Tri AI asistenta su tu da pomognu — svaki stručnjak u svom domenu.
        </p>

        {/* AI Agents Grid */}
        <div className="space-y-3 mb-4">
          {/* Nutrition Agent */}
          <div className={`flex items-center gap-3 p-3 rounded-xl ${agentMeta.nutrition.bgClass} ${agentMeta.nutrition.borderClass} border`}>
            <AgentAvatar agent="nutrition" size="sm" state="idle" />
            <div>
              <p className={`font-medium ${agentMeta.nutrition.textClass}`}>
                {agentMeta.nutrition.name}
              </p>
              <p className="text-xs text-foreground-muted">
                {agentMeta.nutrition.description}
              </p>
            </div>
          </div>

          {/* Supplements Agent */}
          <div className={`flex items-center gap-3 p-3 rounded-xl ${agentMeta.supplements.bgClass} ${agentMeta.supplements.borderClass} border`}>
            <AgentAvatar agent="supplements" size="sm" state="idle" />
            <div>
              <p className={`font-medium ${agentMeta.supplements.textClass}`}>
                {agentMeta.supplements.name}
              </p>
              <p className="text-xs text-foreground-muted">
                {agentMeta.supplements.description}
              </p>
            </div>
          </div>

          {/* Training Agent */}
          <div className={`flex items-center gap-3 p-3 rounded-xl ${agentMeta.training.bgClass} ${agentMeta.training.borderClass} border`}>
            <AgentAvatar agent="training" size="sm" state="idle" />
            <div>
              <p className={`font-medium ${agentMeta.training.textClass}`}>
                {agentMeta.training.name}
              </p>
              <p className="text-xs text-foreground-muted">
                {agentMeta.training.description}
              </p>
            </div>
          </div>
        </div>

        <p className="text-foreground-muted text-sm mb-3">
          AI objašnjava, motiviše i pomaže da razumeš šta se dešava.
          Ne pravi dijete. Ne zamenjuje trenera.
        </p>
        <p className="text-foreground text-sm">
          Za lične savete — tu je <span className="text-accent font-medium">tvoj trener</span>.
        </p>
      </>
    ),
  },
  {
    icon: "📈",
    title: "Rezultati dolaze iz niza dobrih dana",
    content: (
      <>
        <p className="text-foreground-muted mb-4">
          Jedan savršen dan ne menja ništa.
          <br />
          Ali <span className="text-foreground font-medium">50 &ldquo;dovoljno dobrih&rdquo; dana</span> — menja sve.
        </p>
        <p className="text-foreground font-medium mb-2">Ovaj sistem je napravljen da:</p>
        <ul className="space-y-1 text-foreground-muted">
          <li>• te zadrži u igri</li>
          <li>• smanji pauze</li>
          <li>• poveća kontinuitet</li>
        </ul>
      </>
    ),
  },
];

export default function WhyThisWorksPage() {
  const router = useRouter();
  const [currentSection, setCurrentSection] = useState(0);
  const [completing, setCompleting] = useState(false);

  const markOnboardingComplete = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch("/api/member/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hasSeenOnboarding: true }),
      });

      if (!response.ok) {
        console.error("Failed to update onboarding status:", response.status, await response.text());
        return false;
      }

      const data = await response.json();
      console.log("Onboarding status updated:", data);
      return true;
    } catch (error) {
      console.error("Error updating onboarding status:", error);
      return false;
    }
  }, []);

  const handleContinue = async () => {
    if (currentSection < sections.length - 1) {
      setCurrentSection(currentSection + 1);
      // Scroll to top smoothly
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // Mark onboarding as complete before navigating
      setCompleting(true);
      const success = await markOnboardingComplete();

      if (success) {
        router.push("/home");
      } else {
        // If API failed, still try to navigate but warn user
        console.warn("Failed to save onboarding status, navigating anyway...");
        // Force a hard refresh to ensure we get fresh server state
        window.location.href = "/home";
      }
    }
  };

  const handleBack = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      router.back();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-6 pt-14 pb-4 flex items-center gap-4 border-b border-white/5">
        <button
          onClick={handleBack}
          className="w-10 h-10 rounded-full glass flex items-center justify-center btn-press"
          aria-label="Go back"
        >
          <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <FadeIn>
          <div className="flex-1">
            <h1 className="text-xl text-headline text-foreground">Zašto ovo funkcioniše</h1>
            <p className="text-sm text-foreground-muted">Ovo nije još jedna fitness aplikacija</p>
          </div>
        </FadeIn>
      </header>

      {/* Progress Dots */}
      <div className="px-6 py-4">
        <div className="flex justify-center gap-2">
          {sections.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentSection(index);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentSection
                  ? "bg-accent w-6"
                  : index < currentSection
                  ? "bg-success"
                  : "bg-white/20"
              }`}
              aria-label={`Go to section ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 px-6 pb-32">
        <SlideUp key={currentSection} delay={0}>
          <GlassCard variant="prominent" className="mb-6">
            {/* Section Icon & Title */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{sections[currentSection].icon}</span>
              <h2 className="text-xl font-bold text-foreground">
                {sections[currentSection].title}
              </h2>
            </div>

            {/* Section Content */}
            <div className="text-sm leading-relaxed">
              {sections[currentSection].content}
            </div>
          </GlassCard>
        </SlideUp>

        {/* Final Section Extra Content */}
        {currentSection === sections.length - 1 && (
          <SlideUp delay={200}>
            <GlassCard className="text-center">
              <h3 className="text-lg font-bold text-foreground mb-3">
                Tvoj jedini zadatak
              </h3>
              <p className="text-foreground-muted mb-4">
                Ne budi savršen. Budi <span className="text-foreground font-medium">prisutan</span>.
              </p>
              <div className="space-y-2 text-sm text-foreground-muted mb-4">
                <p>✓ loguj šta si uradio</p>
                <p>✓ pogledaj status</p>
                <p>✓ vrati se sutra</p>
              </div>
              <p className="text-accent text-sm font-medium">
                Mi ćemo se pobrinuti za ostalo.
              </p>
            </GlassCard>
          </SlideUp>
        )}
      </main>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent">
        <SlideUp delay={300}>
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleContinue}
            disabled={completing}
          >
            {completing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </span>
            ) : currentSection < sections.length - 1 ? (
              <span className="flex items-center justify-center gap-2">
                Nastavi
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Krenimo
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            )}
          </Button>

          {currentSection === sections.length - 1 && (
            <p className="text-center text-xs text-foreground-muted mt-3">
              Možeš se vratiti na ovo kasnije u profilu.
            </p>
          )}
        </SlideUp>
      </div>
    </div>
  );
}
