"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { GlassCard, FadeIn, SlideUp, Button } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { getTranslations } from "@/lib/i18n";

const t = getTranslations("sr");

interface Coach {
  id: string;
  name: string;
  assignedMembersCount: number;
  hasPendingRequest: boolean;
}

interface CurrentCoach {
  id: string;
  name: string;
}

interface PendingRequest {
  id: string;
  coachId: string;
  coachName: string;
  initiatedBy: string;
  createdAt: string;
}

interface PageState {
  coaches: Coach[];
  currentCoach: CurrentCoach | null;
  pendingRequest: PendingRequest | null;
  loading: boolean;
}

export default function CoachesPage() {
  const router = useRouter();
  const [data, setData] = useState<PageState>({
    coaches: [],
    currentCoach: null,
    pendingRequest: null,
    loading: true,
  });
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchCoaches = useCallback(async () => {
    try {
      const response = await fetch("/api/member/coaches");
      if (response.ok) {
        const result = await response.json();
        setData({
          coaches: result.coaches || [],
          currentCoach: result.currentCoach,
          pendingRequest: result.pendingRequest,
          loading: false,
        });
      } else {
        setData({ coaches: [], currentCoach: null, pendingRequest: null, loading: false });
      }
    } catch {
      setData({ coaches: [], currentCoach: null, pendingRequest: null, loading: false });
    }
  }, []);

  useEffect(() => {
    fetchCoaches();
  }, [fetchCoaches]);

  const handleOpenRequest = (coach: Coach) => {
    setSelectedCoach(coach);
    setFormData({ firstName: "", lastName: "", phone: "", message: "" });
    setError(null);
    setShowRequestModal(true);
  };

  const handleSubmitRequest = async () => {
    if (!selectedCoach) return;

    // Validation
    if (!formData.firstName.trim()) {
      setError(t.coaches?.firstNameRequired || "Ime je obavezno");
      return;
    }
    if (!formData.lastName.trim()) {
      setError(t.coaches?.lastNameRequired || "Prezime je obavezno");
      return;
    }
    if (!formData.phone.trim()) {
      setError(t.coaches?.phoneRequired || "Broj telefona je obavezan");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/member/coaches/${selectedCoach.id}/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: formData.phone.trim(),
          message: formData.message.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send request");
      }

      setSuccess(true);
      setShowRequestModal(false);
      fetchCoaches();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška prilikom slanja zahteva");
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (data.loading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="animate-pulse text-foreground-muted">
          {t.common.loading}
        </div>
      </div>
    );
  }

  // Has current coach - show current coach info
  if (data.currentCoach) {
    return (
      <div className="min-h-screen bg-background p-4 pb-24">
        <FadeIn>
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl hover:bg-background-secondary transition-colors"
            >
              <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {t.coaches?.title || "Treneri"}
              </h1>
              <p className="text-sm text-foreground-muted">
                {t.coaches?.currentCoach || "Tvoj trener"}
              </p>
            </div>
          </div>

          {/* Current coach card */}
          <GlassCard className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {data.currentCoach.name}
            </h2>
            <p className="text-foreground-muted">
              {t.coaches?.yourCoachDescription || "Tvoj trener te vodi ka cilju"}
            </p>
          </GlassCard>
        </FadeIn>
      </div>
    );
  }

  // Has pending request - show waiting state
  if (data.pendingRequest) {
    return (
      <div className="min-h-screen bg-background p-4 pb-24">
        <FadeIn>
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl hover:bg-background-secondary transition-colors"
            >
              <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {t.coaches?.title || "Treneri"}
              </h1>
              <p className="text-sm text-foreground-muted">
                {t.coaches?.pendingRequest || "Čeka se odgovor trenera"}
              </p>
            </div>
          </div>

          {/* Pending request card */}
          <GlassCard className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-warning animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              {t.coaches?.requestSent || "Zahtev poslat"}
            </h2>
            <p className="text-foreground-muted mb-4">
              {t.coaches?.waitingForCoach || "Trener će pregledati tvoj zahtev"}
            </p>
            <div className="inline-flex items-center gap-2 bg-background-tertiary px-4 py-2 rounded-xl">
              <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="font-semibold text-foreground">
                {data.pendingRequest.coachName}
              </span>
            </div>
          </GlassCard>
        </FadeIn>
      </div>
    );
  }

  // Success state after sending request
  if (success) {
    return (
      <div className="min-h-screen bg-background p-4 pb-24">
        <FadeIn>
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl hover:bg-background-secondary transition-colors"
            >
              <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {t.coaches?.title || "Treneri"}
              </h1>
            </div>
          </div>

          {/* Success card */}
          <GlassCard className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              {t.coaches?.requestSuccess || "Zahtev uspešno poslat!"}
            </h2>
            <p className="text-foreground-muted">
              {t.coaches?.waitingForCoach || "Trener će pregledati tvoj zahtev"}
            </p>
          </GlassCard>
        </FadeIn>
      </div>
    );
  }

  // No coach - show coach list
  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <FadeIn>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl hover:bg-background-secondary transition-colors"
          >
            <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {t.coaches?.title || "Treneri"}
            </h1>
            <p className="text-sm text-foreground-muted">
              {t.coaches?.subtitle || "Izaberi svog ličnog trenera!"}
            </p>
          </div>
        </div>

        {/* Coach list */}
        {data.coaches.length === 0 ? (
          <GlassCard className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-background-tertiary flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-foreground-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-foreground-muted">
              {t.coaches?.noCoaches || "Nema dostupnih trenera"}
            </p>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {data.coaches.map((coach, index) => (
              <SlideUp key={coach.id} delay={index * 0.05}>
                <GlassCard className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Coach avatar */}
                    <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-7 h-7 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>

                    {/* Coach info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-foreground truncate">
                        {coach.name}
                      </h3>
                      <p className="text-sm text-foreground-muted">
                        {coach.assignedMembersCount} {t.coaches?.membersCount || "članova"}
                      </p>
                    </div>

                    {/* Request button */}
                    <Button
                      onClick={() => handleOpenRequest(coach)}
                      size="sm"
                      className="flex-shrink-0"
                    >
                      {t.coaches?.sendRequest || "Pošalji zahtev"}
                    </Button>
                  </div>
                </GlassCard>
              </SlideUp>
            ))}
          </div>
        )}
      </FadeIn>

      {/* Request Modal */}
      <Modal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        title={`${t.coaches?.sendRequest || "Pošalji zahtev"} - ${selectedCoach?.name || ""}`}
      >
        <div className="space-y-4">
          <Input
            label={t.coaches?.firstName || "Ime"}
            placeholder="Miloš"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            required
          />

          <Input
            label={t.coaches?.lastName || "Prezime"}
            placeholder="Mladenović"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            required
          />

          <Input
            label={t.coaches?.phone || "Broj telefona"}
            placeholder="+381 64 123 4567"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
          />

          <div>
            <label className="block text-sm font-medium text-foreground-muted mb-2">
              {t.coaches?.message || "Poruka (opciono)"}
            </label>
            <textarea
              className="w-full px-4 py-3 rounded-xl bg-background-secondary border border-border text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
              placeholder={t.coaches?.messagePlaceholder || "Napiši nešto o sebi i svojim ciljevima..."}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={3}
            />
          </div>

          {error && (
            <p className="text-sm text-error text-center">{error}</p>
          )}

          <Button
            onClick={handleSubmitRequest}
            loading={submitting}
            disabled={submitting}
            className="w-full"
          >
            {t.coaches?.sendRequest || "Pošalji zahtev"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
