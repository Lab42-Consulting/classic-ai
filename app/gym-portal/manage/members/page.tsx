"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { SubscriptionExtendModal } from "@/components/staff/subscription-extend-modal";

interface Coach {
  id: string;
  name: string;
}

interface Member {
  id: string;
  memberId: string;
  name: string;
  avatarUrl: string | null;
  goal: string;
  status: string;
  subscriptionStatus: string;
  subscribedUntil: string | null;
  createdAt: string;
  activityStatus: "active" | "slipping" | "inactive";
  lastActivity: string | null;
  coach: Coach | null;
}

const goalLabels: Record<string, string> = {
  fat_loss: "Mršavljenje",
  muscle_gain: "Rast mišića",
  recomposition: "Rekompozicija",
};

const activityColors = {
  active: "bg-emerald-500/20 text-emerald-400",
  slipping: "bg-yellow-500/20 text-yellow-400",
  inactive: "bg-red-500/20 text-red-400",
};

const activityLabels = {
  active: "Aktivan",
  slipping: "Slabi",
  inactive: "Neaktivan",
};

const subscriptionColors = {
  active: "bg-emerald-500/20 text-emerald-400",
  expired: "bg-red-500/20 text-red-400",
  trial: "bg-blue-500/20 text-blue-400",
};

const subscriptionLabels = {
  active: "Aktivna",
  expired: "Istekla",
  trial: "Probni",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getDaysUntilExpiry(dateString: string | null): number | null {
  if (!dateString) return null;
  const diff = new Date(dateString).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function MembersListPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGoal, setFilterGoal] = useState<string>("all");
  const [filterActivity, setFilterActivity] = useState<string>("all");
  const [filterSubscription, setFilterSubscription] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Subscription modal state
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await fetch("/api/members");
        if (response.ok) {
          const data = await response.json();
          setMembers(data.members);
        }
      } catch (error) {
        console.error("Failed to fetch members:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembers();
  }, []);

  const refreshMembers = async () => {
    const response = await fetch("/api/members");
    if (response.ok) {
      const data = await response.json();
      setMembers(data.members);
    }
  };

  const filteredAndSortedMembers = useMemo(() => {
    let result = [...members];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          m.memberId.toLowerCase().includes(query)
      );
    }

    // Goal filter
    if (filterGoal !== "all") {
      result = result.filter((m) => m.goal === filterGoal);
    }

    // Activity filter
    if (filterActivity !== "all") {
      result = result.filter((m) => m.activityStatus === filterActivity);
    }

    // Subscription filter
    if (filterSubscription !== "all") {
      if (filterSubscription === "expiring") {
        result = result.filter((m) => {
          const days = getDaysUntilExpiry(m.subscribedUntil);
          return days !== null && days > 0 && days <= 7;
        });
      } else {
        result = result.filter((m) => m.subscriptionStatus === filterSubscription);
      }
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "memberId":
          comparison = a.memberId.localeCompare(b.memberId);
          break;
        case "createdAt":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "subscription":
          const daysA = getDaysUntilExpiry(a.subscribedUntil) ?? -999;
          const daysB = getDaysUntilExpiry(b.subscribedUntil) ?? -999;
          comparison = daysA - daysB;
          break;
        default:
          comparison = 0;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [members, searchQuery, filterGoal, filterActivity, filterSubscription, sortBy, sortOrder]);

  const stats = useMemo(() => {
    const total = members.length;
    const active = members.filter((m) => m.activityStatus === "active").length;
    const expiringSoon = members.filter((m) => {
      const days = getDaysUntilExpiry(m.subscribedUntil);
      return days !== null && days > 0 && days <= 7;
    }).length;
    const expired = members.filter((m) => m.subscriptionStatus === "expired").length;
    return { total, active, expiringSoon, expired };
  }, [members]);

  if (isLoading) {
    return (
      <div className="py-20 text-center">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Članovi
          </h1>
          <p className="text-foreground-muted mt-1">
            Upravljaj članovima teretane
          </p>
        </div>
        <Link
          href="/gym-portal/manage/members/new"
          className="inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white px-5 py-2.5 rounded-xl font-medium transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Novi član
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-background-secondary border border-border rounded-xl p-4">
          <p className="text-sm text-foreground-muted">Ukupno</p>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="bg-background-secondary border border-border rounded-xl p-4">
          <p className="text-sm text-foreground-muted">Aktivni</p>
          <p className="text-2xl font-bold text-emerald-400">{stats.active}</p>
        </div>
        <div className="bg-background-secondary border border-border rounded-xl p-4">
          <p className="text-sm text-foreground-muted">Ističe uskoro</p>
          <p className="text-2xl font-bold text-yellow-400">{stats.expiringSoon}</p>
        </div>
        <div className="bg-background-secondary border border-border rounded-xl p-4">
          <p className="text-sm text-foreground-muted">Istekla članarina</p>
          <p className="text-2xl font-bold text-red-400">{stats.expired}</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-background-secondary border border-border rounded-xl p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Pretraži po imenu ili ID-u..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <select
              value={filterGoal}
              onChange={(e) => setFilterGoal(e.target.value)}
              className="px-3 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
            >
              <option value="all">Svi ciljevi</option>
              <option value="fat_loss">Mršavljenje</option>
              <option value="muscle_gain">Rast mišića</option>
              <option value="recomposition">Rekompozicija</option>
            </select>

            <select
              value={filterActivity}
              onChange={(e) => setFilterActivity(e.target.value)}
              className="px-3 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
            >
              <option value="all">Sva aktivnost</option>
              <option value="active">Aktivni</option>
              <option value="slipping">Slabi</option>
              <option value="inactive">Neaktivni</option>
            </select>

            <select
              value={filterSubscription}
              onChange={(e) => setFilterSubscription(e.target.value)}
              className="px-3 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
            >
              <option value="all">Sve članarine</option>
              <option value="active">Aktivna</option>
              <option value="expiring">Ističe za 7 dana</option>
              <option value="expired">Istekla</option>
            </select>

            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [by, order] = e.target.value.split("-");
                setSortBy(by);
                setSortOrder(order as "asc" | "desc");
              }}
              className="px-3 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
            >
              <option value="name-asc">Ime A-Z</option>
              <option value="name-desc">Ime Z-A</option>
              <option value="createdAt-desc">Najnoviji</option>
              <option value="createdAt-asc">Najstariji</option>
              <option value="subscription-asc">Članarina (uskoro ističe)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-background-secondary border border-border rounded-xl overflow-hidden">
        {filteredAndSortedMembers.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-foreground-muted">
              {searchQuery || filterGoal !== "all" || filterActivity !== "all" || filterSubscription !== "all"
                ? "Nema članova koji odgovaraju filterima"
                : "Još nema registrovanih članova"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-background/50">
                  <th className="text-left px-4 py-3 text-sm font-medium text-foreground-muted">Član</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-foreground-muted hidden md:table-cell">Cilj</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-foreground-muted hidden lg:table-cell">Trener</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-foreground-muted">Aktivnost</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-foreground-muted">Članarina</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-foreground-muted">Akcije</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedMembers.map((member) => {
                  const daysUntilExpiry = getDaysUntilExpiry(member.subscribedUntil);
                  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 7;

                  return (
                    <tr key={member.id} className="border-b border-border/50 hover:bg-background/30 transition-colors">
                      {/* Member */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {member.avatarUrl ? (
                            <img
                              src={member.avatarUrl}
                              alt={member.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                              <span className="text-sm font-medium text-accent">
                                {getInitials(member.name)}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-foreground">{member.name}</p>
                            <p className="text-sm text-foreground-muted">{member.memberId}</p>
                          </div>
                        </div>
                      </td>

                      {/* Goal */}
                      <td className="px-4 py-4 hidden md:table-cell">
                        <span className="text-sm text-foreground">
                          {goalLabels[member.goal] || member.goal}
                        </span>
                      </td>

                      {/* Coach */}
                      <td className="px-4 py-4 hidden lg:table-cell">
                        {member.coach ? (
                          <span className="text-sm text-foreground">{member.coach.name}</span>
                        ) : (
                          <span className="text-sm text-foreground-muted">Nije dodeljen</span>
                        )}
                      </td>

                      {/* Activity */}
                      <td className="px-4 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${activityColors[member.activityStatus]}`}>
                          {activityLabels[member.activityStatus]}
                        </span>
                      </td>

                      {/* Subscription */}
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium w-fit ${
                            isExpiringSoon
                              ? "bg-yellow-500/20 text-yellow-400"
                              : subscriptionColors[member.subscriptionStatus as keyof typeof subscriptionColors] || "bg-gray-500/20 text-gray-400"
                          }`}>
                            {isExpiringSoon
                              ? `Ističe za ${daysUntilExpiry}d`
                              : subscriptionLabels[member.subscriptionStatus as keyof typeof subscriptionLabels] || member.subscriptionStatus}
                          </span>
                          {member.subscribedUntil && !isExpiringSoon && member.subscriptionStatus === "active" && (
                            <span className="text-xs text-foreground-muted">
                              do {new Date(member.subscribedUntil).toLocaleDateString("sr-RS")}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedMember(member);
                              setShowSubscriptionModal(true);
                            }}
                            className="px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/10 rounded-lg transition-colors"
                            title="Produži članarinu"
                          >
                            Produži
                          </button>
                          <Link
                            href={`/gym-portal/manage/members/${member.id}`}
                            className="p-2 text-foreground-muted hover:text-foreground hover:bg-background rounded-lg transition-colors"
                            title="Detalji"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Results count */}
      {filteredAndSortedMembers.length > 0 && (
        <p className="text-sm text-foreground-muted mt-4">
          Prikazano {filteredAndSortedMembers.length} od {members.length} članova
        </p>
      )}

      {/* Subscription Modal */}
      {showSubscriptionModal && selectedMember && (
        <SubscriptionExtendModal
          memberId={selectedMember.id}
          memberName={selectedMember.name}
          currentEndDate={selectedMember.subscribedUntil}
          isExpired={selectedMember.subscriptionStatus === "expired" || !selectedMember.subscribedUntil}
          onClose={() => {
            setShowSubscriptionModal(false);
            setSelectedMember(null);
          }}
          onSuccess={() => {
            setShowSubscriptionModal(false);
            setSelectedMember(null);
            refreshMembers();
          }}
        />
      )}
    </div>
  );
}
