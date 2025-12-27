"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GlassCard, FadeIn, SlideUp, Button } from "@/components/ui";
import { getTranslations } from "@/lib/i18n";

const t = getTranslations("sr");

type SubscriptionStatus = "trial" | "active" | "expired" | "cancelled";

interface SubscriptionData {
  status: SubscriptionStatus;
  trialStartDate: string | null;
  trialEndDate: string | null;
  subscriptionEndDate: string | null;
  loading: boolean;
}

export default function SubscriptionPage() {
  const router = useRouter();
  const [data, setData] = useState<SubscriptionData>({
    status: "trial",
    trialStartDate: null,
    trialEndDate: null,
    subscriptionEndDate: null,
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
        setData({ ...result, loading: false });
      } else {
        // Use mock data for demo
        setData({
          status: "trial",
          trialStartDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          trialEndDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          subscriptionEndDate: null,
          loading: false,
        });
      }
    } catch {
      // Use mock data for demo
      setData({
        status: "trial",
        trialStartDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        trialEndDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        subscriptionEndDate: null,
        loading: false,
      });
    }
  };

  const getDaysRemaining = (endDate: string | null): number => {
    if (!endDate) return 0;
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    // Use floor and cap at 7 for trial period
    return Math.min(7, Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24))));
  };

  const getTrialDayNumber = (): number => {
    if (!data.trialStartDate) return 1;
    const start = new Date(data.trialStartDate);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    const dayNumber = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
    return Math.min(7, Math.max(1, dayNumber));
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

  const trialDaysLeft = getDaysRemaining(data.trialEndDate);
  const subscriptionDaysLeft = getDaysRemaining(data.subscriptionEndDate);

  const getStatusConfig = () => {
    switch (data.status) {
      case "trial":
        return {
          icon: "🎁",
          title: t.subscription.trialPeriod,
          subtitle: trialDaysLeft > 0
            ? `${trialDaysLeft} ${t.subscription.trialDaysLeft}`
            : t.subscription.trialExpired,
          color: trialDaysLeft > 3 ? "text-success" : trialDaysLeft > 0 ? "text-warning" : "text-error",
          bgColor: trialDaysLeft > 3 ? "bg-success/10" : trialDaysLeft > 0 ? "bg-warning/10" : "bg-error/10",
          showWarning: trialDaysLeft <= 3 && trialDaysLeft > 0,
        };
      case "active":
        return {
          icon: "✅",
          title: t.subscription.subscriptionActive,
          subtitle: `${t.subscription.validUntil}: ${formatDate(data.subscriptionEndDate)}`,
          color: subscriptionDaysLeft > 7 ? "text-success" : "text-warning",
          bgColor: subscriptionDaysLeft > 7 ? "bg-success/10" : "bg-warning/10",
          showWarning: subscriptionDaysLeft <= 7,
        };
      case "expired":
        return {
          icon: "⏰",
          title: t.subscription.subscriptionExpired,
          subtitle: t.subscription.renewAtGym,
          color: "text-error",
          bgColor: "bg-error/10",
          showWarning: true,
        };
      case "cancelled":
        return {
          icon: "❌",
          title: t.subscription.status.cancelled,
          subtitle: t.subscription.contactGym,
          color: "text-error",
          bgColor: "bg-error/10",
          showWarning: true,
        };
    }
  };

  const statusConfig = getStatusConfig();

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
            <p className="text-sm text-foreground-muted">Classic AI</p>
          </div>
        </FadeIn>
      </header>

      <main className="px-6 py-6 space-y-6">
        {/* Subscription Status Card */}
        <SlideUp delay={100}>
          <GlassCard variant="prominent">
            <div className="text-center">
              {/* Status Icon */}
              <div className={`w-20 h-20 rounded-full ${statusConfig.bgColor} flex items-center justify-center mx-auto mb-4`}>
                <span className="text-4xl">{statusConfig.icon}</span>
              </div>

              {/* Status Title */}
              <h2 className={`text-2xl font-bold ${statusConfig.color} mb-2`}>
                {statusConfig.title}
              </h2>
              <p className="text-foreground-muted">{statusConfig.subtitle}</p>

              {/* Trial Progress Bar */}
              {data.status === "trial" && trialDaysLeft > 0 && (
                <div className="mt-6">
                  <div className="flex justify-between text-xs text-foreground-muted mb-2">
                    <span>Dan {getTrialDayNumber()}</span>
                    <span>Dan 7</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        trialDaysLeft > 3 ? "bg-success" : trialDaysLeft > 1 ? "bg-warning" : "bg-error"
                      }`}
                      style={{ width: `${(getTrialDayNumber() / 7) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Warning/Action */}
              {statusConfig.showWarning && (
                <div className="mt-6 p-4 rounded-xl bg-warning/10 border border-warning/20">
                  <p className="text-sm text-warning mb-3">
                    {data.status === "trial"
                      ? `Probni period ističe za ${trialDaysLeft} ${trialDaysLeft === 1 ? "dan" : "dana"}!`
                      : data.status === "active"
                      ? `Članarina ističe za ${subscriptionDaysLeft} ${subscriptionDaysLeft === 1 ? "dan" : "dana"}`
                      : t.subscription.contactGym
                    }
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="border-warning text-warning hover:bg-warning/10"
                  >
                    {t.subscription.renewAtGym}
                  </Button>
                </div>
              )}
            </div>
          </GlassCard>
        </SlideUp>

        {/* Benefits */}
        <SlideUp delay={200}>
          <GlassCard>
            <h3 className="text-label mb-4">{t.subscription.benefits}</h3>
            <div className="space-y-3">
              {t.subscription.benefitsList.map((benefit, index) => (
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
              onClick={() => router.push("/goal")}
              className="glass rounded-2xl p-4 card-hover btn-press flex flex-col items-center"
            >
              <span className="text-2xl block mb-2">🎯</span>
              <span className="text-sm text-foreground-muted">{t.home.changeGoal}</span>
            </button>
          </div>
        </SlideUp>

        {/* Info Text */}
        <SlideUp delay={400}>
          <div className="text-center py-4">
            <p className="text-xs text-foreground-muted">
              Za obnovu članarine ili pitanja, kontaktiraj osoblje u teretani.
            </p>
          </div>
        </SlideUp>
      </main>
    </div>
  );
}
