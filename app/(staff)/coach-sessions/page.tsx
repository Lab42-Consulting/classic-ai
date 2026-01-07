"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GlassCard, FadeIn, SlideUp, Button, Modal } from "@/components/ui";
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

interface MemberInfo {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface SessionsData {
  requests: SessionRequestData[];
  upcoming: ScheduledSessionData[];
  past: ScheduledSessionData[];
  members: MemberInfo[];
}

export default function CoachSessionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SessionsData>({
    requests: [],
    upcoming: [],
    past: [],
    members: [],
  });

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [showMemberSelect, setShowMemberSelect] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberInfo | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<SessionRequestData | null>(null);
  const [selectedSession, setSelectedSession] = useState<ScheduledSessionData | null>(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  // Action states
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch("/api/coach/sessions");
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

  const handleSelectMember = (member: MemberInfo) => {
    setSelectedMember(member);
    setShowMemberSelect(false);
    setShowCreateModal(true);
  };

  const handleCreateSession = async (formData: SessionFormData) => {
    if (!selectedMember) return;

    setActionError(null);

    const response = await fetch("/api/coach/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId: selectedMember.id,
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

    setSelectedMember(null);
    fetchSessions();
  };

  const handleAcceptRequest = async (request: SessionRequestData) => {
    setIsProcessing(true);
    setActionError(null);

    try {
      const response = await fetch(`/api/coach/sessions/requests/${request.id}`, {
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
      const response = await fetch(`/api/coach/sessions/requests/${request.id}`, {
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

    const response = await fetch(`/api/coach/sessions/requests/${selectedRequest.id}`, {
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

    const response = await fetch(`/api/coach/sessions/${selectedSession.id}/cancel`, {
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

  const handleCompleteSession = async (session: ScheduledSessionData) => {
    setIsProcessing(true);
    setActionError(null);

    try {
      const response = await fetch(`/api/coach/sessions/${session.id}/complete`, {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok) {
        setActionError(result.error || "Greška pri završavanju termina");
      } else {
        fetchSessions();
      }
    } catch {
      setActionError("Greška u konekciji");
    } finally {
      setIsProcessing(false);
    }
  };

  // Separate requests that need coach action vs waiting for member
  const requestsNeedingAction = data.requests.filter(
    (r) => r.lastActionBy === "member" || (r.status === "pending" && r.initiatedBy === "member")
  );
  const requestsWaitingOnMember = data.requests.filter(
    (r) => r.lastActionBy === "coach" || (r.status === "pending" && r.initiatedBy === "coach")
  );

  // Calendar helpers
  const dayNames = ["Pon", "Uto", "Sre", "Cet", "Pet", "Sub", "Ned"];
  const monthNames = [
    "Januar", "Februar", "Mart", "April", "Maj", "Jun",
    "Jul", "Avgust", "Septembar", "Oktobar", "Novembar", "Decembar"
  ];

  const getMonthDays = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Get day of week for first day (0 = Sunday, convert to Monday-based)
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek < 0) startDayOfWeek = 6; // Sunday becomes 6

    const days: (Date | null)[] = [];

    // Add empty slots for days before the 1st
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const calendarDays = getMonthDays(calendarMonth.year, calendarMonth.month);

  const navigateMonth = (direction: -1 | 1) => {
    setCalendarMonth((prev) => {
      let newMonth = prev.month + direction;
      let newYear = prev.year;

      if (newMonth < 0) {
        newMonth = 11;
        newYear--;
      } else if (newMonth > 11) {
        newMonth = 0;
        newYear++;
      }

      return { year: newYear, month: newMonth };
    });
  };

  // Combine past and upcoming sessions for calendar
  const allSessions = [...data.past, ...data.upcoming];

  // Helper to get local date string (YYYY-MM-DD) without timezone issues
  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getSessionsForDate = (date: Date) => {
    const dateStr = getLocalDateString(date);
    return allSessions.filter((session) => {
      const sessionDate = new Date(session.scheduledAt);
      return getLocalDateString(sessionDate) === dateStr;
    });
  };

  const getDayStatus = (date: Date) => {
    const sessions = getSessionsForDate(date);
    if (sessions.length === 0) return "empty";

    const hasCompleted = sessions.some((s) => s.status === "completed");
    const hasCancelled = sessions.some((s) => s.status === "cancelled");
    const hasConfirmed = sessions.some((s) => s.status === "confirmed");

    // Priority: mixed > cancelled > confirmed > completed
    if ((hasCompleted || hasConfirmed) && hasCancelled) return "mixed";
    if (hasCancelled && !hasCompleted && !hasConfirmed) return "cancelled";
    if (hasConfirmed) return "confirmed";
    return "completed";
  };

  const statusColors: Record<string, string> = {
    empty: "bg-white/5",
    completed: "bg-success/30",
    confirmed: "bg-accent/30",
    cancelled: "bg-error/30",
    mixed: "bg-warning/30",
  };

  const selectedDateSessions = selectedCalendarDate
    ? allSessions.filter((session) => {
        const sessionDate = new Date(session.scheduledAt);
        return getLocalDateString(sessionDate) === selectedCalendarDate;
      })
    : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-foreground-muted">Ucitava se...</div>
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
              Upravljaj terminima sa klijentima
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
                  viewerRole="coach"
                  onAccept={() => handleAcceptRequest(request)}
                  onDecline={() => handleDeclineRequest(request)}
                  onCounter={() => handleCounterRequest(request)}
                  isProcessing={isProcessing}
                />
              ))}
            </div>
          </SlideUp>
        )}

        {/* Requests Waiting on Member */}
        {requestsWaitingOnMember.length > 0 && (
          <SlideUp delay={150}>
            <div className="space-y-3">
              <h2 className="text-label text-foreground-muted">Ceka se odgovor klijenta</h2>
              {requestsWaitingOnMember.map((request) => (
                <SessionRequestCard
                  key={request.id}
                  request={request}
                  viewerRole="coach"
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
              <h2 className="text-label">Predstojeci termini</h2>
              {data.upcoming.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  viewerRole="coach"
                  onCancel={() => handleCancelSession(session)}
                  onComplete={() => handleCompleteSession(session)}
                  isProcessing={isProcessing}
                />
              ))}
            </div>
          </SlideUp>
        )}

        {/* Empty State */}
        {data.members.length > 0 &&
          requestsNeedingAction.length === 0 &&
          requestsWaitingOnMember.length === 0 &&
          data.upcoming.length === 0 && (
            <SlideUp delay={100}>
              <GlassCard className="text-center py-8">
                <div className="text-5xl mb-4">📅</div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Nema zakazanih termina
                </h3>
                <p className="text-sm text-foreground-muted mb-4">
                  Zakazi termin sa nekim od klijenata
                </p>
              </GlassCard>
            </SlideUp>
          )}

        {/* Session History Calendar */}
        <SlideUp delay={250}>
          <GlassCard>
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => navigateMonth(-1)}
                className="w-8 h-8 rounded-full bg-background/50 flex items-center justify-center hover:bg-background/80 transition-colors"
                aria-label="Prethodni mesec"
              >
                <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h3 className="text-label text-center">
                {monthNames[calendarMonth.month]} {calendarMonth.year}
              </h3>
              <button
                onClick={() => navigateMonth(1)}
                className="w-8 h-8 rounded-full bg-background/50 flex items-center justify-center hover:bg-background/80 transition-colors"
                aria-label="Sledeci mesec"
              >
                <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Day labels */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map((day) => (
                <div key={day} className="text-center text-xs text-foreground-muted py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="aspect-square" />;
                }

                const status = getDayStatus(date);
                const dateStr = getLocalDateString(date);
                const isToday = dateStr === getLocalDateString(new Date());
                const isSelected = selectedCalendarDate === dateStr;
                const sessionsCount = getSessionsForDate(date).length;

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedCalendarDate(dateStr)}
                    className={`
                      aspect-square rounded-lg flex flex-col items-center justify-center
                      text-sm font-medium transition-all relative
                      ${statusColors[status]}
                      ${isToday ? "ring-2 ring-accent" : ""}
                      ${isSelected ? "ring-2 ring-white" : ""}
                      hover:opacity-80
                    `}
                  >
                    {date.getDate()}
                    {sessionsCount > 0 && (
                      <span className="absolute bottom-0.5 text-[10px] text-foreground-muted">
                        {sessionsCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-accent/30" />
                <span className="text-xs text-foreground-muted">Zakazano</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-success/30" />
                <span className="text-xs text-foreground-muted">Zavrseno</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-error/30" />
                <span className="text-xs text-foreground-muted">Otkazano</span>
              </div>
            </div>
          </GlassCard>
        </SlideUp>

        {/* Selected Date Details */}
        {selectedCalendarDate && (
          <SlideUp delay={300}>
            <GlassCard>
              <h3 className="text-label mb-4">
                {(() => {
                  const [year, month, day] = selectedCalendarDate.split("-").map(Number);
                  return `${day}. ${monthNames[month - 1]}`;
                })()}
              </h3>

              {selectedDateSessions.length > 0 ? (
                <div className="space-y-2">
                  {selectedDateSessions.map((session) => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      viewerRole="coach"
                      onCancel={() => {}}
                      compact
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-foreground-muted">Nema termina za ovaj dan</p>
                </div>
              )}
            </GlassCard>
          </SlideUp>
        )}
      </main>

      {/* Fixed Bottom Action Button */}
      {data.members.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background/95 to-transparent">
          <FadeIn delay={300}>
            <Button
              className="w-full btn-press glow-accent"
              size="lg"
              onClick={() => setShowMemberSelect(true)}
            >
              Zakazi termin
            </Button>
          </FadeIn>
        </div>
      )}

      {/* Member Selection Modal */}
      <Modal
        isOpen={showMemberSelect}
        onClose={() => setShowMemberSelect(false)}
        title="Izaberi klijenta"
      >
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {data.members.map((member) => (
            <button
              key={member.id}
              onClick={() => handleSelectMember(member)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-accent/30 hover:bg-accent/5 transition-all"
            >
              {member.avatarUrl ? (
                <img
                  src={member.avatarUrl}
                  alt={member.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                  <span className="text-sm font-medium text-accent">
                    {member.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="font-medium text-foreground">{member.name}</span>
              <svg className="w-4 h-4 text-foreground-muted ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      </Modal>

      {/* Create Session Modal */}
      {selectedMember && (
        <CreateSessionModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedMember(null);
          }}
          onSubmit={handleCreateSession}
          mode="create"
          recipientName={selectedMember.name}
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
          recipientName={selectedRequest.member.name}
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
            otherPartyName: selectedSession.member.name,
          }}
        />
      )}
    </div>
  );
}
