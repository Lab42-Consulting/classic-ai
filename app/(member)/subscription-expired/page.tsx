"use client";

import { useRouter } from "next/navigation";
import { GlassCard, Button, FadeIn, SlideUp } from "@/components/ui";

export default function SubscriptionExpiredPage() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch {
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-6 pt-14 pb-4 border-b border-white/5">
        <FadeIn>
          <div className="text-center">
            <h1 className="text-xl text-headline text-foreground">Classic AI</h1>
            <p className="text-sm text-foreground-muted">Pristup aplikaciji</p>
          </div>
        </FadeIn>
      </header>

      <main className="flex-1 px-6 py-8 flex flex-col justify-center">
        <SlideUp delay={100}>
          <GlassCard variant="prominent" className="text-center mb-6">
            {/* Expired Icon */}
            <div className="w-24 h-24 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-6">
              <span className="text-5xl">⏰</span>
            </div>

            <h2 className="text-2xl font-bold text-error mb-4">
              Pristup istekao
            </h2>

            <p className="text-foreground-muted mb-6">
              Tvoj pristup Classic AI aplikaciji je istekao.
              <br />
              Obnovi pretplatu na pultu teretane.
            </p>

            {/* Info Card */}
            <div className="p-4 rounded-xl bg-accent/10 border border-accent/20 text-left mb-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl leading-none">💳</span>
                </div>
                <div>
                  <p className="text-accent font-semibold mb-1">Samo 5€ mesečno</p>
                  <p className="text-sm text-foreground-muted">
                    Obnova na pultu teretane prilikom sledeće posete.
                  </p>
                </div>
              </div>
            </div>

            {/* Benefits Reminder */}
            <div className="text-left mb-6">
              <p className="text-sm text-foreground-muted mb-3">Obnovi i nastavi da koristiš:</p>
              <div className="space-y-2">
                {[
                  "Praćenje ishrane i treninga",
                  "AI asistente za ishranu i trening",
                  "Personalizovane savete od trenera",
                  "10% popusta na suplemente",
                ].map((benefit, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-foreground-muted/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-foreground-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm text-foreground-muted">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </SlideUp>

        <SlideUp delay={200}>
          <div className="space-y-3">
            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={handleLogout}
            >
              Odjavi se
            </Button>

            <p className="text-center text-xs text-foreground-muted">
              Pristup će biti obnovljen automatski nakon uplate.
            </p>
          </div>
        </SlideUp>
      </main>
    </div>
  );
}
