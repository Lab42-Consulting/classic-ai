"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GlassCard, FadeIn, SlideUp } from "@/components/ui";
import { getTranslations } from "@/lib/i18n";

const t = getTranslations("sr");

type SubscriptionStatus = "active" | "expired";

interface SubscriptionData {
  status: SubscriptionStatus;
  subscribedUntil: string | null;
  loading: boolean;
}

export default function SubscriptionPage() {
  const router = useRouter();
  const [data, setData] = useState<SubscriptionData>({
    status: "active",
    subscribedUntil: null,
    loading: true,
  });

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      const response = await fetch("/api/member/subscription");
      if (response.ok) {
        const result = await response.json();
        const status = result.status === "active" ? "active" : "expired";
        setData({ status, subscribedUntil: result.subscribedUntil, loading: false });
      } else {
        setData({
          status: "active",
          subscribedUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          loading: false,
        });
      }
    } catch {
      setData({
        status: "active",
        subscribedUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        loading: false,
      });
    }
  };

  const getDaysRemaining = (endDate: string | null): number => {
    if (!endDate) return 0;
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("sr-RS", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const daysRemaining = getDaysRemaining(data.subscribedUntil);
  const isExpiringSoon = daysRemaining <= 7 && daysRemaining > 0;

  if (data.loading) {
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
            <h1 className="text-xl text-headline text-foreground">{t.subscription.title}</h1>
            <p className="text-sm text-foreground-muted">Classic AI pristup</p>
          </div>
        </FadeIn>
      </header>

      <main className="px-6 py-6 space-y-6">
        {/* Subscription Status Card */}
        <SlideUp delay={100}>
          <GlassCard variant="prominent">
            <div className="text-center">
              {data.status === "active" ? (
                <>
                  {/* Active Status */}
                  <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                    <span className="text-4xl">✅</span>
                  </div>
                  <h2 className="text-2xl font-bold text-success mb-2">
                    Pristup aktivan
                  </h2>

                  {/* Access End Date */}
                  <div className="bg-background-tertiary rounded-xl p-4 mt-4">
                    <p className="text-sm text-foreground-muted mb-1">Pristup ističe</p>
                    <p className="text-xl font-semibold text-foreground">
                      {formatDate(data.subscribedUntil)}
                    </p>
                    <p className={`text-sm mt-1 ${isExpiringSoon ? "text-warning" : "text-foreground-muted"}`}>
                      {daysRemaining > 0
                        ? `(još ${daysRemaining} ${daysRemaining === 1 ? "dan" : "dana"})`
                        : "Ističe danas"
                      }
                    </p>
                  </div>

                  {/* Expiring Soon Warning */}
                  {isExpiringSoon && (
                    <div className="mt-4 p-4 rounded-xl bg-warning/10 border border-warning/20">
                      <p className="text-sm text-warning mb-2">
                        Pristup ističe uskoro!
                      </p>
                      <p className="text-xs text-foreground-muted">
                        Obnovi na pultu teretane prilikom sledeće posete.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Expired Status */}
                  <div className="w-20 h-20 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
                    <span className="text-4xl">⏰</span>
                  </div>
                  <h2 className="text-2xl font-bold text-error mb-2">
                    Pristup istekao
                  </h2>
                  <p className="text-foreground-muted mb-4">
                    Obnovi pristup na pultu teretane.
                  </p>

                  <div className="p-4 rounded-xl bg-error/10 border border-error/20">
                    <p className="text-sm text-error">
                      Kontaktiraj osoblje teretane za obnovu pristupa.
                    </p>
                  </div>
                </>
              )}
            </div>
          </GlassCard>
        </SlideUp>

        {/* Price Info - styled like supplement discount card */}
        <SlideUp delay={150}>
          <GlassCard className="bg-gradient-to-r from-accent/10 to-accent/5 border-accent/20">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl leading-none">💳</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-accent mb-1">
                  Samo 5€ mesečno
                </h3>
                <p className="text-sm text-foreground-muted">
                  Kupovina i obnova na <span className="text-accent font-medium">pultu teretane</span> prilikom posete.
                </p>
              </div>
            </div>
          </GlassCard>
        </SlideUp>

        {/* 10% Discount Banner */}
        <SlideUp delay={200}>
          <GlassCard className="bg-gradient-to-r from-violet-500/10 to-violet-500/5 border-violet-500/20">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl leading-none">💊</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-violet-400 mb-1">
                  10% popusta na suplemente
                </h3>
                <p className="text-sm text-foreground-muted">
                  Dok koristiš aplikaciju, imaš <span className="text-violet-400 font-medium">10% popusta</span> na sve suplemente u teretani.
                </p>
              </div>
            </div>
          </GlassCard>
        </SlideUp>

        {/* Benefits */}
        <SlideUp delay={250}>
          <GlassCard>
            <h3 className="text-label mb-4">{t.subscription.benefits}</h3>
            <div className="space-y-3">
              {[
                "Praćenje ishrane i treninga",
                "AI asistenti za ishranu, trening i suplemente",
                "Kreiranje i deljenje obroka",
                "Nedeljni pregledi napretka",
                "Personalizovani saveti od trenera",
                "10% popusta na suplemente u teretani",
              ].map((benefit, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-foreground text-sm">{benefit}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </SlideUp>

        {/* Quick Links */}
        <SlideUp delay={300}>
          <div className="grid grid-cols-2 gap-3">
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
              <span className="text-sm text-foreground-muted">Obroci</span>
            </button>
          </div>
        </SlideUp>

        {/* Info Text */}
        <SlideUp delay={350}>
          <div className="text-center py-4">
            <p className="text-xs text-foreground-muted">
              Za pitanja o članarini, kontaktiraj osoblje na pultu teretane.
            </p>
          </div>
        </SlideUp>
      </main>
    </div>
  );
}
