"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";

interface Member {
  id: string;
  memberId: string;
  name: string;
  goal: string;
  status: string;
  activityStatus: "active" | "slipping" | "inactive";
  lastActivity: string | null;
  _count: {
    dailyLogs: number;
    weeklyCheckins: number;
  };
}

const activityColors = {
  active: "bg-success",
  slipping: "bg-warning",
  inactive: "bg-error",
};

const activityLabels = {
  active: "Aktivan",
  slipping: "Opada",
  inactive: "Neaktivan",
};

export default function StaffDashboard() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "slipping" | "inactive">("all");

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await fetch("/api/members");
        const data = await response.json();

        if (response.ok) {
          setMembers(data.members);
        }
      } catch {
        // Handle error silently
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, []);

  const filteredMembers = members.filter((member) => {
    if (filter === "all") return true;
    return member.activityStatus === filter;
  });

  const stats = {
    total: members.length,
    active: members.filter((m) => m.activityStatus === "active").length,
    slipping: members.filter((m) => m.activityStatus === "slipping").length,
    inactive: members.filter((m) => m.activityStatus === "inactive").length,
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/staff-login");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="px-6 pt-12 pb-6 flex items-center justify-between">
        <div>
          <p className="text-foreground-muted text-sm">Kontrolna tabla</p>
          <h1 className="text-2xl font-bold text-foreground">Classic Gym</h1>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 text-foreground-muted hover:text-foreground"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </header>

      <main className="px-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-3">
          <Card className="text-center py-4">
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-foreground-muted">Ukupno</p>
          </Card>
          <Card className="text-center py-4">
            <p className="text-2xl font-bold text-success">{stats.active}</p>
            <p className="text-xs text-foreground-muted">Aktivni</p>
          </Card>
          <Card className="text-center py-4">
            <p className="text-2xl font-bold text-warning">{stats.slipping}</p>
            <p className="text-xs text-foreground-muted">Opadaju</p>
          </Card>
          <Card className="text-center py-4">
            <p className="text-2xl font-bold text-error">{stats.inactive}</p>
            <p className="text-xs text-foreground-muted">Neaktivni</p>
          </Card>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {(["all", "active", "slipping", "inactive"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`
                px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap
                ${filter === f
                  ? "bg-accent text-white"
                  : "bg-background-secondary text-foreground-muted hover:text-foreground"
                }
              `}
            >
              {f === "all" ? "Svi članovi" : activityLabels[f]}
            </button>
          ))}
        </div>

        {/* Members List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-pulse text-foreground-muted">Učitavanje...</div>
          </div>
        ) : filteredMembers.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-foreground-muted">
              {filter === "all" ? "Nema članova" : `Nema ${activityLabels[filter].toLowerCase()} članova`}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredMembers.map((member) => (
              <Card
                key={member.id}
                className="cursor-pointer hover:bg-background-tertiary transition-colors"
                onClick={() => router.push(`/members/${member.id}`)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${activityColors[member.activityStatus]}`} />
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">{member.name}</h3>
                    <p className="text-sm text-foreground-muted">
                      {member.memberId} • {member.goal.replace("_", " ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-foreground-muted">
                      {member._count.dailyLogs} unosa
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-foreground-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Add Member Button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent">
        <Button
          className="w-full"
          size="lg"
          onClick={() => router.push("/register")}
        >
          Registruj novog člana
        </Button>
      </div>
    </div>
  );
}
