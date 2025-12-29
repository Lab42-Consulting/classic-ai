"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, GlassCard, FadeIn, SlideUp } from "@/components/ui";

interface StaffMember {
  id: string;
  staffId: string;
  name: string;
  role: string;
  createdAt: string;
  assignedMembersCount: number;
  pendingRequestsCount: number;
  assignedMembers: { id: string; name: string }[];
  pendingRequests: { id: string; name: string }[];
}

interface NewStaffCredentials {
  staffId: string;
  pin: string;
  name: string;
}

export default function CoachesPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCoachName, setNewCoachName] = useState("");
  const [newCoachRole, setNewCoachRole] = useState<"coach" | "admin">("coach");
  const [submitting, setSubmitting] = useState(false);
  const [newCredentials, setNewCredentials] = useState<NewStaffCredentials | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const response = await fetch("/api/staff");
      if (response.ok) {
        const result = await response.json();
        setStaff(result.staff);
      } else if (response.status === 403) {
        // Not an admin, redirect to dashboard
        router.push("/dashboard");
      }
    } catch {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async () => {
    if (!newCoachName.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCoachName.trim(),
          role: newCoachRole,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setNewCredentials({
          staffId: data.credentials.staffId,
          pin: data.credentials.pin,
          name: data.staff.name,
        });
        setShowAddForm(false);
        setNewCoachName("");
        fetchStaff(); // Refresh list
      } else {
        setError(data.error || "Greška pri kreiranju");
      }
    } catch {
      setError("Greška pri kreiranju");
    } finally {
      setSubmitting(false);
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

  const coaches = staff.filter((s) => s.role.toLowerCase() === "coach");
  const admins = staff.filter((s) => s.role.toLowerCase() === "admin");

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="px-6 pt-12 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="p-2 -ml-2 text-foreground-muted hover:text-foreground"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <p className="text-foreground-muted text-sm">Upravljanje</p>
            <h1 className="text-2xl font-bold text-foreground">Osoblje</h1>
          </div>
        </div>
      </header>

      <main className="px-6 space-y-6">
        {/* Stats Cards */}
        <SlideUp delay={100}>
          <div className="grid grid-cols-2 gap-3">
            <Card className="text-center py-4">
              <p className="text-2xl font-bold text-foreground">{coaches.length}</p>
              <p className="text-xs text-foreground-muted">Trenera</p>
            </Card>
            <Card className="text-center py-4">
              <p className="text-2xl font-bold text-foreground">{admins.length}</p>
              <p className="text-xs text-foreground-muted">Admina</p>
            </Card>
          </div>
        </SlideUp>

        {/* New Credentials Modal */}
        {newCredentials && (
          <SlideUp delay={150}>
            <GlassCard className="border-success/30 bg-success/5">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {newCredentials.name} kreiran/a
                </h3>
                <p className="text-sm text-foreground-muted mb-4">
                  Sačuvaj ove podatke - PIN se ne može ponovo videti!
                </p>

                <div className="bg-background rounded-xl p-4 mb-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-foreground-muted">Staff ID:</span>
                      <span className="font-mono font-bold text-foreground text-lg">
                        {newCredentials.staffId}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-foreground-muted">PIN:</span>
                      <span className="font-mono font-bold text-accent text-lg">
                        {newCredentials.pin}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={() => setNewCredentials(null)}
                >
                  Razumem, sačuvao sam
                </Button>
              </div>
            </GlassCard>
          </SlideUp>
        )}

        {/* Add Staff Form */}
        {showAddForm && (
          <SlideUp delay={150}>
            <Card>
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Dodaj novog člana osoblja
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-foreground-muted mb-2">
                    Ime i prezime
                  </label>
                  <input
                    type="text"
                    value={newCoachName}
                    onChange={(e) => setNewCoachName(e.target.value)}
                    placeholder="npr. Marko Marković"
                    className="w-full px-4 py-3 rounded-xl bg-background-secondary border border-border text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-sm text-foreground-muted mb-2">
                    Uloga
                  </label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setNewCoachRole("coach")}
                      className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-colors ${
                        newCoachRole === "coach"
                          ? "bg-accent text-white"
                          : "bg-background-secondary text-foreground-muted hover:text-foreground"
                      }`}
                    >
                      Trener
                    </button>
                    <button
                      onClick={() => setNewCoachRole("admin")}
                      className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-colors ${
                        newCoachRole === "admin"
                          ? "bg-accent text-white"
                          : "bg-background-secondary text-foreground-muted hover:text-foreground"
                      }`}
                    >
                      Admin
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-error">{error}</p>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewCoachName("");
                      setError(null);
                    }}
                  >
                    Otkaži
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleAddStaff}
                    disabled={!newCoachName.trim() || submitting}
                    loading={submitting}
                  >
                    Kreiraj
                  </Button>
                </div>
              </div>
            </Card>
          </SlideUp>
        )}

        {/* Coaches List */}
        <SlideUp delay={200}>
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <span>🏋️</span> Treneri ({coaches.length})
            </h2>

            {coaches.length === 0 ? (
              <Card className="text-center py-8">
                <p className="text-foreground-muted">Nema trenera</p>
              </Card>
            ) : (
              coaches.map((coach, index) => (
                <SlideUp key={coach.id} delay={250 + index * 50}>
                  <GlassCard>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xl">👨‍🏫</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground truncate">
                          {coach.name}
                        </h3>
                        <p className="text-sm text-foreground-muted">
                          {coach.staffId}
                        </p>

                        <div className="flex gap-4 mt-2 text-xs text-foreground-muted">
                          <span title="Dodeljeni klijenti">
                            👥 {coach.assignedMembersCount} klijenata
                          </span>
                          {coach.pendingRequestsCount > 0 && (
                            <span className="text-warning" title="Čeka odobrenje">
                              ⏳ {coach.pendingRequestsCount} na čekanju
                            </span>
                          )}
                        </div>

                        {/* Assigned members preview */}
                        {coach.assignedMembers.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {coach.assignedMembers.slice(0, 3).map((m) => (
                              <span
                                key={m.id}
                                className="text-xs bg-background-secondary text-foreground-muted px-2 py-0.5 rounded"
                              >
                                {m.name}
                              </span>
                            ))}
                            {coach.assignedMembers.length > 3 && (
                              <span className="text-xs text-foreground-muted">
                                +{coach.assignedMembers.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                </SlideUp>
              ))
            )}
          </div>
        </SlideUp>

        {/* Admins List */}
        <SlideUp delay={300}>
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <span>🔐</span> Admini ({admins.length})
            </h2>

            {admins.map((admin, index) => (
              <SlideUp key={admin.id} delay={350 + index * 50}>
                <GlassCard>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-foreground/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xl">👤</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground truncate">
                        {admin.name}
                      </h3>
                      <p className="text-sm text-foreground-muted">
                        {admin.staffId}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </SlideUp>
            ))}
          </div>
        </SlideUp>
      </main>

      {/* Add Staff Button */}
      {!showAddForm && !newCredentials && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent">
          <FadeIn delay={500}>
            <Button
              className="w-full btn-press glow-accent"
              size="lg"
              onClick={() => setShowAddForm(true)}
            >
              Dodaj člana osoblja
            </Button>
          </FadeIn>
        </div>
      )}
    </div>
  );
}
