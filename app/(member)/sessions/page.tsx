"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GlassCard, FadeIn, SlideUp, Button } from "@/components/ui";
import {
  SessionRequestCard,
  SessionCard,
  CreateSessionModal,
  CancelSessionModal,
} from "@/components/sessions";
import type { SessionFormData } from "@/components/sessions";
import type {
  SessionRequestData,
  ScheduledSessionData,
  SessionType,
} from "@/lib/types/sessions";

interface CoachInfo {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface SessionsData {
  requests: SessionRequestData[];
  upcoming: ScheduledSessionData[];
  past: ScheduledSessionData[];
  coach: CoachInfo | null;
}

export default function SessionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SessionsData>({
    requests: [],
    upcoming: [],
    past: [],
    coach: null,
  });

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<SessionRequestData | null>(null);
  const [selectedSession, setSelectedSession] = useState<ScheduledSessionData | null>(null);
  const [showPastSessions, setShowPastSessions] = useState(false);

  // Action states
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch("/api/member/sessions");
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch {
      // Handle silently
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (formData: SessionFormData) => {
    if (!data.coach) return;

    setActionError(null);

    const response = await fetch("/api/member/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        staffId: data.coach.id,
        sessionType: formData.sessionType,
        proposedAt: formData.proposedAt,
        duration: formData.duration,
        location: formData.location,
        note: formData.note || undefined,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Greška pri kreiranju zahteva");
    }

    fetchSessions();
  };

  const handleAcceptRequest = async (request: SessionRequestData) => {
    setIsProcessing(true);
    setActionError(null);

    try {
      const response = await fetch(`/api/member/sessions/requests/${request.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });

      const result = await response.json();

      if (!response.ok) {
        setActionError(result.error || "Greška pri prihvatanju termina");
      } else {
        fetchSessions();
      }
    } catch {
      setActionError("Greška u konekciji");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeclineRequest = async (request: SessionRequestData) => {
    setIsProcessing(true);
    setActionError(null);

    try {
      const response = await fetch(`/api/member/sessions/requests/${request.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decline" }),
      });

      const result = await response.json();

      if (!response.ok) {
        setActionError(result.error || "Greška pri odbijanju termina");
      } else {
        fetchSessions();
      }
    } catch {
      setActionError("Greška u konekciji");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCounterRequest = (request: SessionRequestData) => {
    setSelectedRequest(request);
    setShowCounterModal(true);
  };

  const handleSubmitCounter = async (formData: SessionFormData) => {
    if (!selectedRequest) return;

    setActionError(null);

    const response = await fetch(`/api/member/sessions/requests/${selectedRequest.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "counter",
        proposedAt: formData.proposedAt,
        duration: formData.duration,
        location: formData.location,
        note: formData.note || undefined,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Greška pri slanju kontra-predloga");
    }

    setShowCounterModal(false);
    setSelectedRequest(null);
    fetchSessions();
  };

  const handleCancelSession = (session: ScheduledSessionData) => {
    setSelectedSession(session);
    setShowCancelModal(true);
  };

  const handleSubmitCancel = async (reason: string) => {
    if (!selectedSession) return;

    setActionError(null);

    const response = await fetch(`/api/member/sessions/${selectedSession.id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Greška pri otkazivanju termina");
    }

    setShowCancelModal(false);
    setSelectedSession(null);
    fetchSessions();
  };

  // Separate requests that need member action vs waiting for coach
  const requestsNeedingAction = data.requests.filter(
    (r) => r.lastActionBy === "coach" || (r.status === "pending" && r.initiatedBy === "coach")
  );
  const requestsWaitingOnCoach = data.requests.filter(
    (r) => r.lastActionBy === "member" || (r.status === "pending" && r.initiatedBy === "member")
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-foreground-muted">Učitava se...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="px-6 pt-14 pb-4 flex items-center gap-4 border-b border-white/5">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full glass flex items-center justify-center btn-press"
          aria-label="Nazad"
        >
          <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <FadeIn>
          <div>
            <h1 className="text-xl text-headline text-foreground">Termini</h1>
            <p className="text-sm text-foreground-muted">
              {data.coach ? `Sa trenerom ${data.coach.name}` : "Zakazivanje termina"}
            </p>
          </div>
        </FadeIn>
      </header>

      <main className="px-6 py-6 space-y-6">
        {/* Error Banner */}
        {actionError && (
          <SlideUp>
            <div className="p-4 bg-error/10 border border-error/20 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-xl">⚠️</span>
                <p className="text-sm text-error flex-1">{actionError}</p>
                <button
                  onClick={() => setActionError(null)}
                  className="text-error hover:text-error/80"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </SlideUp>
        )}

        {/* No Coach Warning - only show if no coach AND no existing requests/sessions */}
        {!data.coach && data.requests.length === 0 && data.upcoming.length === 0 && (
          <SlideUp delay={100}>
            <GlassCard className="border-warning/20">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">👨‍🏫</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-warning mb-1">
                    Nemaš trenera
                  </h3>
                  <p className="text-sm text-foreground-muted mb-3">
                    Da bi zakazivao termine, potrebno je da imaš dodeljenog trenera.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => router.push("/find-coach")}
                  >
                    Pronađi trenera
                  </Button>
                </div>
              </div>
            </GlassCard>
          </SlideUp>
        )}

        {/* Pending Requests Requiring Action */}
        {requestsNeedingAction.length > 0 && (
          <SlideUp delay={100}>
            <div className="space-y-3">
              <h2 className="text-label flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                </span>
                Zahtevi za odgovor
              </h2>
              {requestsNeedingAction.map((request) => (
                <SessionRequestCard
                  key={request.id}
                  request={request}
                  viewerRole="member"
                  onAccept={() => handleAcceptRequest(request)}
                  onDecline={() => handleDeclineRequest(request)}
                  onCounter={() => handleCounterRequest(request)}
                  isProcessing={isProcessing}
                />
              ))}
            </div>
          </SlideUp>
        )}

        {/* Requests Waiting on Coach */}
        {requestsWaitingOnCoach.length > 0 && (
          <SlideUp delay={150}>
            <div className="space-y-3">
              <h2 className="text-label text-foreground-muted">Čeka se odgovor trenera</h2>
              {requestsWaitingOnCoach.map((request) => (
                <SessionRequestCard
                  key={request.id}
                  request={request}
                  viewerRole="member"
                  onAccept={() => Promise.resolve()}
                  onDecline={() => Promise.resolve()}
                  onCounter={() => {}}
                  isProcessing={true}
                />
              ))}
            </div>
          </SlideUp>
        )}

        {/* Upcoming Sessions */}
        {data.upcoming.length > 0 && (
          <SlideUp delay={200}>
            <div className="space-y-3">
              <h2 className="text-label">Predstojeći termini</h2>
              {data.upcoming.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  viewerRole="member"
                  onCancel={() => handleCancelSession(session)}
                  isProcessing={isProcessing}
                />
              ))}
            </div>
          </SlideUp>
        )}

        {/* Empty State */}
        {data.coach &&
          requestsNeedingAction.length === 0 &&
          requestsWaitingOnCoach.length === 0 &&
          data.upcoming.length === 0 && (
            <SlideUp delay={100}>
              <GlassCard className="text-center py-8">
                <div className="text-5xl mb-4">📅</div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Nema zakazanih termina
                </h3>
                <p className="text-sm text-foreground-muted mb-4">
                  Zakaži termin sa svojim trenerom
                </p>
              </GlassCard>
            </SlideUp>
          )}

        {/* Past Sessions */}
        {data.past.length > 0 && (
          <SlideUp delay={250}>
            <div className="space-y-3">
              <button
                onClick={() => setShowPastSessions(!showPastSessions)}
                className="w-full flex items-center justify-between text-label py-2"
              >
                <span className="text-foreground-muted">
                  Prošli termini ({data.past.length})
                </span>
                <svg
                  className={`w-5 h-5 text-foreground-muted transition-transform ${
                    showPastSessions ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showPastSessions && (
                <div className="space-y-3">
                  {data.past.map((session) => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      viewerRole="member"
                      onCancel={() => {}}
                    />
                  ))}
                </div>
              )}
            </div>
          </SlideUp>
        )}
      </main>

      {/* Fixed Bottom Action Button */}
      {data.coach && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background/95 to-transparent">
          <FadeIn delay={300}>
            <Button
              className="w-full btn-press glow-accent"
              size="lg"
              onClick={() => setShowCreateModal(true)}
            >
              Zakaži termin
            </Button>
          </FadeIn>
        </div>
      )}

      {/* Create Session Modal */}
      {data.coach && (
        <CreateSessionModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateSession}
          mode="create"
          recipientName={data.coach.name}
        />
      )}

      {/* Counter Proposal Modal */}
      {selectedRequest && (
        <CreateSessionModal
          isOpen={showCounterModal}
          onClose={() => {
            setShowCounterModal(false);
            setSelectedRequest(null);
          }}
          onSubmit={handleSubmitCounter}
          mode="counter"
          recipientName={selectedRequest.staff.name}
          initialData={{
            sessionType: selectedRequest.sessionType,
            proposedAt: selectedRequest.proposedAt,
            duration: selectedRequest.duration,
            location: selectedRequest.location,
          }}
        />
      )}

      {/* Cancel Session Modal */}
      {selectedSession && (
        <CancelSessionModal
          isOpen={showCancelModal}
          onClose={() => {
            setShowCancelModal(false);
            setSelectedSession(null);
          }}
          onConfirm={handleSubmitCancel}
          sessionDetails={{
            type: selectedSession.sessionType,
            scheduledAt: selectedSession.scheduledAt,
            otherPartyName: selectedSession.staff.name,
          }}
        />
      )}
    </div>
  );
}
