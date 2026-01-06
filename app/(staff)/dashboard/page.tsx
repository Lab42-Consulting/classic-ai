"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, GlassCard, FadeIn, SlideUp, Modal } from "@/components/ui";
import { Input } from "@/components/ui/input";

interface MemberStats {
  id: string;
  memberId: string;
  name: string;
  avatarUrl: string | null;
  goal: string;
  currentWeight: number | null;
  activityStatus: "on_track" | "slipping" | "off_track";
  consistencyScore: number;
  streak: number;
  lastActivityDate: string | null;
  daysSinceActivity: number;
  weeklyTrainingSessions: number;
  calorieAdherence: number;
  proteinAdherence: number;
  weightTrend: "up" | "down" | "stable";
  weightChange: number;
  missedCheckin: boolean;
  alerts: string[];
}

interface ExpiringSubscriptions {
  expiringIn7Days: number;
  expiringIn30Days: number;
  expiredCount: number;
}

interface LinkedMember {
  id: string;
  memberId: string;
  name: string;
}

interface DashboardData {
  coachName: string;
  isCoach: boolean;
  stats: {
    total: number;
    onTrack: number;
    slipping: number;
    offTrack: number;
    needsAttention: number;
  };
  members: MemberStats[];
  expiringSubscriptions?: ExpiringSubscriptions;
  linkedMember?: LinkedMember | null;
}

interface MemberRequest {
  id: string;
  member: {
    id: string;
    name: string;
    avatarUrl: string | null;
    goal: string;
    weight: number | null;
    height: number | null;
    gender: string | null;
  };
  firstName: string;
  lastName: string;
  phone: string;
  message: string | null;
  createdAt: string;
}

interface SessionRequestPreview {
  id: string;
  memberName: string;
  memberAvatarUrl: string | null;
  sessionType: string;
  proposedAt: string;
  duration: number;
  location: string;
  counterCount: number;
}


const activityColors = {
  on_track: "bg-success",
  slipping: "bg-warning",
  off_track: "bg-error",
};

const activityLabels = {
  on_track: "Na putu",
  slipping: "Klizi",
  off_track: "Ispao",
};

const activityEmojis = {
  on_track: "🟢",
  slipping: "🟡",
  off_track: "🔴",
};

const trendIcons = {
  up: "↗",
  down: "↘",
  stable: "→",
};

const goalLabels: Record<string, string> = {
  fat_loss: "Mršavljenje",
  muscle_gain: "Masa",
  recomposition: "Rekompozicija",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function CoachDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [memberRequests, setMemberRequests] = useState<MemberRequest[]>([]);
  const [sessionRequests, setSessionRequests] = useState<SessionRequestPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "on_track" | "slipping" | "off_track">("all");
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; phone?: string } | null>(null);
  const [linkedMember, setLinkedMember] = useState<LinkedMember | null>(null);
  const [showMemberSetup, setShowMemberSetup] = useState(false);
  const [memberSetupGoal, setMemberSetupGoal] = useState("fat_loss");
  const [memberSetupWeight, setMemberSetupWeight] = useState("");
  const [memberSetupHeight, setMemberSetupHeight] = useState("");
  const [memberSetupLoading, setMemberSetupLoading] = useState(false);
  const [memberSetupError, setMemberSetupError] = useState("");

  const fetchMemberRequests = async () => {
    try {
      const response = await fetch("/api/coach/member-requests");
      if (response.ok) {
        const result = await response.json();
        setMemberRequests(result.requests || []);
      }
    } catch {
      // Handle error silently
    }
  };

  const fetchLinkedMember = async () => {
    try {
      const response = await fetch("/api/staff/member-account");
      if (response.ok) {
        const result = await response.json();
        if (result.linkedMember) {
          setLinkedMember(result.linkedMember);
        }
      }
    } catch {
      // Handle error silently
    }
  };

  const fetchSessionRequests = async () => {
    try {
      const response = await fetch("/api/coach/sessions");
      if (response.ok) {
        const result = await response.json();
        // Get only requests where coach needs to respond (member made last action)
        const pendingRequests = (result.requests || [])
          .filter((r: { lastActionBy: string | null; status: string; initiatedBy: string }) =>
            r.lastActionBy === "member" || (r.status === "pending" && r.initiatedBy === "member")
          )
          .slice(0, 3) // Show max 3 on dashboard
          .map((r: { id: string; member: { name: string; avatarUrl: string | null }; sessionType: string; proposedAt: string; duration: number; location: string; counterCount: number }) => ({
            id: r.id,
            memberName: r.member.name,
            memberAvatarUrl: r.member.avatarUrl,
            sessionType: r.sessionType,
            proposedAt: r.proposedAt,
            duration: r.duration,
            location: r.location,
            counterCount: r.counterCount,
          }));
        setSessionRequests(pendingRequests);
      }
    } catch {
      // Handle error silently
    }
  };

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await fetch("/api/coach/dashboard");
        if (response.ok) {
          const result = await response.json();

          // Redirect admins to gym portal - dashboard is for coaches only
          if (!result.isCoach) {
            router.push("/gym-portal/manage");
            return;
          }

          setData(result);
          // Fetch member requests for coaches
          await fetchMemberRequests();
          // Fetch session requests
          await fetchSessionRequests();
          // Fetch linked member account
          await fetchLinkedMember();
        }
      } catch {
        // Handle error silently
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [router]);

  const handleRequestAction = async (requestId: string, action: "accept" | "decline") => {
    setProcessingRequest(requestId);
    try {
      const response = await fetch(`/api/coach/member-requests/${requestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        const result = await response.json();

        // Show toast with contact info for accepted requests
        if (action === "accept" && result.memberPhone) {
          setToast({
            message: `${result.memberName} - dogovorite sastanak`,
            phone: result.memberPhone,
          });
          // Auto-hide after 10 seconds
          setTimeout(() => setToast(null), 10000);
        }

        // Refresh member requests and dashboard
        await fetchMemberRequests();
        // Refetch dashboard to update member count
        const dashResponse = await fetch("/api/coach/dashboard");
        if (dashResponse.ok) {
          const dashResult = await dashResponse.json();
          setData(dashResult);
        }
      }
    } catch {
      // Handle error silently
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/staff-login");
  };

  const handleCreateMemberAccount = async () => {
    // Validate required fields
    if (!memberSetupWeight || !memberSetupHeight) {
      setMemberSetupError("Težina i visina su obavezni");
      return;
    }

    const weight = parseFloat(memberSetupWeight);
    const height = parseFloat(memberSetupHeight);

    if (isNaN(weight) || weight <= 0 || weight > 300) {
      setMemberSetupError("Unesi validnu težinu (1-300 kg)");
      return;
    }

    if (isNaN(height) || height <= 0 || height > 250) {
      setMemberSetupError("Unesi validnu visinu (1-250 cm)");
      return;
    }

    setMemberSetupLoading(true);
    setMemberSetupError("");

    try {
      const response = await fetch("/api/staff/member-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          goal: memberSetupGoal,
          weight: weight,
          height: height,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMemberSetupError(result.error || "Greška pri kreiranju naloga");
        return;
      }

      // Success - update linked member and redirect
      setLinkedMember(result.member);
      setShowMemberSetup(false);
      setToast({ message: "Nalog kreiran! Preusmerjavanje..." });
      setTimeout(() => {
        router.push("/home");
      }, 1500);
    } catch {
      setMemberSetupError("Greška u povezivanju. Pokušaj ponovo.");
    } finally {
      setMemberSetupLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <FadeIn>
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full glass flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-foreground-muted">Učitavanje...</p>
          </div>
        </FadeIn>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground-muted">Greška pri učitavanju</p>
      </div>
    );
  }

  const filteredMembers = data.members.filter((member) => {
    if (filter === "all") return true;
    return member.activityStatus === filter;
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="px-6 pt-12 pb-6 flex items-center justify-between">
        <div>
          <p className="text-foreground-muted text-sm">Tvoji klijenti</p>
          <h1 className="text-2xl font-bold text-foreground">
            {data.coachName}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Member mode toggle */}
          {linkedMember ? (
            <button
              onClick={() => router.push("/home")}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 transition-colors"
              title="Prebaci na lični nalog"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-sm font-medium hidden sm:inline">Moj nalog</span>
            </button>
          ) : (
            <button
              onClick={() => setShowMemberSetup(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background-secondary border border-border text-foreground-muted hover:text-foreground hover:border-accent/30 transition-colors"
              title="Prati svoj napredak"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-sm font-medium hidden sm:inline">Moj nalog</span>
            </button>
          )}
          <button
            onClick={handleLogout}
            className="p-2 text-foreground-muted hover:text-foreground"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      <main className="px-6 space-y-6">
        {/* Stats Cards */}
        <SlideUp delay={100}>
          <div className="grid grid-cols-4 gap-3">
            <Card className="text-center py-4">
              <p className="text-2xl font-bold text-foreground">{data.stats.total}</p>
              <p className="text-xs text-foreground-muted">Ukupno</p>
            </Card>
            <Card className="text-center py-4">
              <p className="text-2xl font-bold text-success">{data.stats.onTrack}</p>
              <p className="text-xs text-foreground-muted">Na putu</p>
            </Card>
            <Card className="text-center py-4">
              <p className="text-2xl font-bold text-warning">{data.stats.slipping}</p>
              <p className="text-xs text-foreground-muted">Klize</p>
            </Card>
            <Card className="text-center py-4">
              <p className="text-2xl font-bold text-error">{data.stats.offTrack}</p>
              <p className="text-xs text-foreground-muted">Ispali</p>
            </Card>
          </div>
        </SlideUp>


        {/* Action Required Section - Grouped alerts and pending items */}
        {(sessionRequests.length > 0 || memberRequests.length > 0 || data.stats.needsAttention > 0) && (
          <SlideUp delay={150}>
            <div className="space-y-3">
              <h2 className="text-label text-foreground-muted flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                </span>
                Potrebna akcija
              </h2>

              {/* Session Requests Card */}
              {sessionRequests.length > 0 && (
                <GlassCard
                  hover
                  className="cursor-pointer border-accent/20 bg-accent/5"
                  onClick={() => router.push("/coach-sessions")}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-accent">
                        {sessionRequests.length === 1
                          ? "1 zahtev za termin"
                          : `${sessionRequests.length} zahteva za termine`}
                      </p>
                      <p className="text-sm text-foreground-muted">
                        {sessionRequests.slice(0, 2).map(r => r.memberName).join(", ")}
                        {sessionRequests.length > 2 && ` +${sessionRequests.length - 2}`}
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </GlassCard>
              )}

              {/* Member Requests */}
              {memberRequests.map((request) => (
                <GlassCard key={request.id} className="border-accent/20 bg-accent/5">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      {request.member.avatarUrl ? (
                        <img
                          src={request.member.avatarUrl}
                          alt={request.member.name}
                          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-lg font-medium text-accent">
                            {getInitials(request.firstName + " " + request.lastName)}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">Novi klijent</span>
                        </div>
                        <h3 className="font-medium text-foreground mt-1">
                          {request.firstName} {request.lastName}
                        </h3>
                        <p className="text-sm text-foreground-muted">
                          {goalLabels[request.member.goal]} {request.member.weight && `• ${request.member.weight}kg`}
                        </p>
                        <p className="text-sm text-accent flex items-center gap-1 mt-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {request.phone}
                        </p>
                      </div>
                    </div>

                    {request.message && (
                      <div className="bg-background-tertiary rounded-xl p-3">
                        <p className="text-sm text-foreground-muted italic">
                          &ldquo;{request.message}&rdquo;
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRequestAction(request.id, "accept")}
                        disabled={processingRequest === request.id}
                        className="flex-1 py-2.5 rounded-xl bg-success text-white font-medium hover:bg-success/90 transition-colors disabled:opacity-50"
                      >
                        {processingRequest === request.id ? "..." : "Prihvati"}
                      </button>
                      <button
                        onClick={() => handleRequestAction(request.id, "decline")}
                        disabled={processingRequest === request.id}
                        className="flex-1 py-2.5 rounded-xl bg-background-tertiary text-foreground-muted font-medium hover:bg-background-secondary transition-colors disabled:opacity-50"
                      >
                        Odbij
                      </button>
                    </div>
                  </div>
                </GlassCard>
              ))}

              {/* Needs Attention Card */}
              {data.stats.needsAttention > 0 && (
                <GlassCard
                  hover
                  className="cursor-pointer border-warning/20 bg-warning/5"
                  onClick={() => setFilter("off_track")}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-warning">
                        {data.stats.needsAttention} {data.stats.needsAttention === 1 ? "klijent treba" : "klijenata treba"} pažnju
                      </p>
                      <p className="text-sm text-foreground-muted">Klikni da filtriraš listu</p>
                    </div>
                    <svg className="w-5 h-5 text-warning flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </GlassCard>
              )}
            </div>
          </SlideUp>
        )}

        {/* Filter Buttons */}
        <SlideUp delay={250}>
          <div className="grid grid-cols-4 gap-2">
            {(["all", "off_track", "slipping", "on_track"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`
                  py-2.5 rounded-xl text-sm font-medium text-center transition-all
                  ${filter === f
                    ? "bg-accent text-white shadow-lg shadow-accent/25"
                    : "bg-background-secondary text-foreground-muted hover:text-foreground hover:bg-background-tertiary"
                  }
                `}
              >
                {f === "all" ? "Svi" : activityEmojis[f]}
              </button>
            ))}
          </div>
        </SlideUp>

        {/* Members List */}
        <SlideUp delay={300}>
          {filteredMembers.length === 0 ? (
            <Card className="text-center py-12">
              <p className="text-foreground-muted">
                {filter === "all" ? "Nema klijenata" : `Nema klijenata u statusu "${activityLabels[filter]}"`}
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredMembers.map((member, index) => (
                <SlideUp key={member.id} delay={350 + index * 50}>
                  <GlassCard
                    hover
                    className={`cursor-pointer ${member.alerts.length > 0 ? "border-warning/30" : ""}`}
                    onClick={() => router.push(`/members/${member.id}`)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar with status indicator */}
                      <div className="relative flex-shrink-0">
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt={member.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                            <span className="text-sm font-medium text-accent">
                              {getInitials(member.name)}
                            </span>
                          </div>
                        )}
                        {/* Status indicator overlay */}
                        <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-background ${activityColors[member.activityStatus]}`} />
                      </div>

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-foreground truncate">
                            {member.name}
                          </h3>
                          {member.streak > 0 && (
                            <span className="text-xs bg-accent/20 text-accent px-1.5 py-0.5 rounded">
                              🔥 {member.streak}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-foreground-muted">
                          {member.memberId} • {goalLabels[member.goal]}
                        </p>

                        {/* Quick stats row */}
                        <div className="flex gap-4 mt-2 text-xs text-foreground-muted">
                          <span title="Konzistentnost">
                            📊 {member.consistencyScore}%
                          </span>
                          <span title="Treninzi ove nedelje">
                            🏋️ {member.weeklyTrainingSessions}x
                          </span>
                          {member.currentWeight && (
                            <span title="Težina">
                              ⚖️ {member.currentWeight}kg
                              <span className={
                                member.weightTrend === "down" && member.goal === "fat_loss" ? "text-success" :
                                member.weightTrend === "up" && member.goal === "muscle_gain" ? "text-success" :
                                member.weightTrend !== "stable" ? "text-warning" : ""
                              }>
                                {" "}{trendIcons[member.weightTrend]}
                              </span>
                            </span>
                          )}
                          {member.daysSinceActivity < 999 && (
                            <span title="Poslednja aktivnost">
                              📅 {member.daysSinceActivity === 0 ? "Danas" :
                                  member.daysSinceActivity === 1 ? "Juče" :
                                  `Pre ${member.daysSinceActivity}d`}
                            </span>
                          )}
                        </div>

                        {/* Alerts */}
                        {member.alerts.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {member.alerts.slice(0, 2).map((alert, i) => (
                              <span
                                key={i}
                                className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded"
                              >
                                {alert}
                              </span>
                            ))}
                            {member.alerts.length > 2 && (
                              <span className="text-xs text-foreground-muted">
                                +{member.alerts.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Arrow */}
                      <svg className="w-5 h-5 text-foreground-muted flex-shrink-0 mt-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </GlassCard>
                </SlideUp>
              ))}
            </div>
          )}
        </SlideUp>
      </main>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent">
        <FadeIn delay={500}>
          <div className="flex gap-3">
            <Button
              className="flex-1 btn-press glow-accent"
              size="lg"
              onClick={() => router.push("/coach-sessions")}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Termini
            </Button>
            <Button
              variant="secondary"
              className="flex-1 btn-press"
              size="lg"
              onClick={() => router.push("/register")}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Novi član
            </Button>
          </div>
        </FadeIn>
      </div>

      {/* Toast notification for accepted requests */}
      {toast && (
        <div className="fixed top-6 left-6 right-6 z-50">
          <div className="bg-success/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">✅</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white">{toast.message}</p>
                {toast.phone && (
                  <a
                    href={`tel:${toast.phone}`}
                    className="inline-flex items-center gap-1.5 mt-2 text-sm text-white/90 hover:text-white"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {toast.phone}
                  </a>
                )}
              </div>
              <button
                onClick={() => setToast(null)}
                className="p-1 rounded-full hover:bg-white/20 transition-colors"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member Account Setup Modal */}
      <Modal
        isOpen={showMemberSetup}
        onClose={() => setShowMemberSetup(false)}
        title="Kreiraj lični nalog"
      >
        <div className="space-y-6">
          <p className="text-foreground-muted text-sm">
            Prati svoj napredak kao i tvoji klijenti. Koristiš isti PIN kao tvoj trenerski nalog.
          </p>

          {/* Goal selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              Tvoj cilj
            </label>
            <div className="space-y-2">
              {[
                { value: "fat_loss", label: "Gubitak masnoće", icon: "🔥" },
                { value: "muscle_gain", label: "Rast mišića", icon: "💪" },
                { value: "recomposition", label: "Rekompozicija", icon: "⚖️" },
              ].map((goal) => (
                <button
                  key={goal.value}
                  type="button"
                  onClick={() => setMemberSetupGoal(goal.value)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                    memberSetupGoal === goal.value
                      ? "border-accent bg-accent/10"
                      : "border-border hover:border-accent/30"
                  }`}
                >
                  <span className="text-xl">{goal.icon}</span>
                  <span className="font-medium text-foreground">{goal.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Weight and Height inputs */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Težina (kg) *"
              type="number"
              placeholder="85"
              value={memberSetupWeight}
              onChange={(e) => setMemberSetupWeight(e.target.value)}
              required
            />
            <Input
              label="Visina (cm) *"
              type="number"
              placeholder="180"
              value={memberSetupHeight}
              onChange={(e) => setMemberSetupHeight(e.target.value)}
              required
            />
          </div>

          {memberSetupError && (
            <p className="text-sm text-error text-center">{memberSetupError}</p>
          )}

          <Button
            onClick={handleCreateMemberAccount}
            loading={memberSetupLoading}
            disabled={memberSetupLoading}
            className="w-full"
          >
            Kreiraj nalog
          </Button>
        </div>
      </Modal>
    </div>
  );
}
