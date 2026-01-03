"use client";

import { useState, useMemo, Fragment } from "react";

type ActivityStatus = "on_track" | "slipping" | "off_track";

interface AssignedMember {
  id: string;
  memberId: string;
  name: string;
  status: ActivityStatus;
  consistencyScore: number;
}

interface CoachPerformance {
  id: string;
  staffId: string;
  name: string;
  assignedMemberCount: number;
  pendingRequestCount: number;
  assignedMembers: AssignedMember[];
  nudgeStats: {
    totalSent: number;
    totalViewed: number;
    viewRate: number;
  };
  memberOutcomes: {
    onTrack: number;
    slipping: number;
    offTrack: number;
    avgConsistencyScore: number;
  };
}

interface CoachPerformanceTableProps {
  coaches: CoachPerformance[];
  pageSize?: number;
}

type SortKey = "name" | "members" | "consistency" | "nudgeRate";
type SortDirection = "asc" | "desc";

const statusColors = {
  on_track: "bg-green-500/20 text-green-400",
  slipping: "bg-yellow-500/20 text-yellow-400",
  off_track: "bg-red-500/20 text-red-400",
};

const statusLabels = {
  on_track: "Na putu",
  slipping: "Gubi fokus",
  off_track: "Van putanje",
};

export function CoachPerformanceTable({ coaches, pageSize = 10 }: CoachPerformanceTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("members");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [expandedCoach, setExpandedCoach] = useState<string | null>(null);

  // Filter and sort coaches
  const filteredAndSortedCoaches = useMemo(() => {
    let result = [...coaches];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (coach) =>
          coach.name.toLowerCase().includes(query) ||
          coach.staffId.toLowerCase().includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "members":
          comparison = a.assignedMemberCount - b.assignedMemberCount;
          break;
        case "consistency":
          comparison = a.memberOutcomes.avgConsistencyScore - b.memberOutcomes.avgConsistencyScore;
          break;
        case "nudgeRate":
          comparison = a.nudgeStats.viewRate - b.nudgeStats.viewRate;
          break;
      }
      return sortDirection === "desc" ? -comparison : comparison;
    });

    return result;
  }, [coaches, searchQuery, sortKey, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedCoaches.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedCoaches = filteredAndSortedCoaches.slice(startIndex, startIndex + pageSize);

  // Handle sort click
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }
  };

  // Toggle row expansion
  const toggleExpand = (coachId: string) => {
    setExpandedCoach(expandedCoach === coachId ? null : coachId);
  };

  // Sort indicator
  const SortIndicator = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) return null;
    return (
      <span className="ml-1">
        {sortDirection === "desc" ? "↓" : "↑"}
      </span>
    );
  };

  if (coaches.length === 0) {
    return (
      <div className="bg-background-secondary border border-border rounded-xl p-8 text-center">
        <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <p className="text-foreground-muted">Nema trenera u teretani</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-xs">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Pretraži trenere..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-background-secondary border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-background/50">
                <th className="w-8 px-2"></th>
                <th
                  className="text-left px-4 py-3 text-sm font-medium text-foreground-muted cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("name")}
                >
                  Trener <SortIndicator columnKey="name" />
                </th>
                <th
                  className="text-center px-4 py-3 text-sm font-medium text-foreground-muted cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("members")}
                >
                  Članovi <SortIndicator columnKey="members" />
                </th>
                <th className="text-center px-4 py-3 text-sm font-medium text-foreground-muted hidden md:table-cell">
                  Na čekanju
                </th>
                <th
                  className="text-center px-4 py-3 text-sm font-medium text-foreground-muted cursor-pointer hover:text-foreground transition-colors hidden lg:table-cell"
                  onClick={() => handleSort("nudgeRate")}
                >
                  Nudge % <SortIndicator columnKey="nudgeRate" />
                </th>
                <th
                  className="text-center px-4 py-3 text-sm font-medium text-foreground-muted cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("consistency")}
                >
                  Doslednost <SortIndicator columnKey="consistency" />
                </th>
                <th className="text-center px-4 py-3 text-sm font-medium text-foreground-muted hidden xl:table-cell">
                  Status članova
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedCoaches.map((coach) => (
                <Fragment key={coach.id}>
                  <tr
                    onClick={() => coach.assignedMemberCount > 0 && toggleExpand(coach.id)}
                    className={`border-b border-border/50 transition-colors ${
                      coach.assignedMemberCount > 0 ? "cursor-pointer hover:bg-background/30" : ""
                    } ${expandedCoach === coach.id ? "bg-background/20" : ""}`}
                  >
                    {/* Expand indicator */}
                    <td className="px-2 py-4">
                      {coach.assignedMemberCount > 0 && (
                        <svg
                          className={`w-4 h-4 text-foreground-muted transition-transform ${
                            expandedCoach === coach.id ? "rotate-90" : ""
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </td>

                    {/* Coach Name */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-400">
                            {coach.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{coach.name}</p>
                          <p className="text-sm text-foreground-muted">{coach.staffId}</p>
                        </div>
                      </div>
                    </td>

                    {/* Assigned Members */}
                    <td className="px-4 py-4 text-center">
                      <span className="text-foreground font-medium">{coach.assignedMemberCount}</span>
                    </td>

                    {/* Pending Requests */}
                    <td className="px-4 py-4 text-center hidden md:table-cell">
                      {coach.pendingRequestCount > 0 ? (
                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
                          {coach.pendingRequestCount}
                        </span>
                      ) : (
                        <span className="text-foreground-muted">0</span>
                      )}
                    </td>

                    {/* Nudge View Rate */}
                    <td className="px-4 py-4 text-center hidden lg:table-cell">
                      {coach.nudgeStats.totalSent > 0 ? (
                        <div className="flex flex-col items-center">
                          <span className={`font-medium ${
                            coach.nudgeStats.viewRate >= 70 ? "text-green-400" :
                            coach.nudgeStats.viewRate >= 40 ? "text-yellow-400" : "text-red-400"
                          }`}>
                            {coach.nudgeStats.viewRate}%
                          </span>
                          <span className="text-xs text-foreground-muted">
                            {coach.nudgeStats.totalViewed}/{coach.nudgeStats.totalSent}
                          </span>
                        </div>
                      ) : (
                        <span className="text-foreground-muted">-</span>
                      )}
                    </td>

                    {/* Avg Consistency Score */}
                    <td className="px-4 py-4 text-center">
                      {coach.assignedMemberCount > 0 ? (
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                          coach.memberOutcomes.avgConsistencyScore >= 70
                            ? "bg-green-500/20 text-green-400"
                            : coach.memberOutcomes.avgConsistencyScore >= 40
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-red-500/20 text-red-400"
                        }`}>
                          {coach.memberOutcomes.avgConsistencyScore}%
                        </span>
                      ) : (
                        <span className="text-foreground-muted">-</span>
                      )}
                    </td>

                    {/* Member Status Breakdown */}
                    <td className="px-4 py-4 hidden xl:table-cell">
                      {coach.assignedMemberCount > 0 ? (
                        <div className="flex items-center justify-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                            {coach.memberOutcomes.onTrack}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
                            {coach.memberOutcomes.slipping}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                            {coach.memberOutcomes.offTrack}
                          </span>
                        </div>
                      ) : (
                        <span className="text-foreground-muted text-sm">Nema članova</span>
                      )}
                    </td>
                  </tr>

                  {/* Expanded member list */}
                  {expandedCoach === coach.id && coach.assignedMembers.length > 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-4 bg-background/40">
                        <div className="pl-8">
                          <p className="text-sm font-medium text-foreground-muted mb-3">
                            Dodeljeni članovi ({coach.assignedMembers.length})
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                            {coach.assignedMembers.map((member) => (
                              <div
                                key={member.id}
                                className="flex items-center justify-between gap-3 p-2 bg-background-secondary rounded-lg border border-border/50"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-medium text-accent">
                                      {member.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                                    </span>
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                                    <p className="text-xs text-foreground-muted">{member.memberId}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusColors[member.status]}`}>
                                    {statusLabels[member.status]}
                                  </span>
                                  <span className="text-xs text-foreground-muted">{member.consistencyScore}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-foreground-muted">
            Prikazano {startIndex + 1}-{Math.min(startIndex + pageSize, filteredAndSortedCoaches.length)} od {filteredAndSortedCoaches.length} trenera
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm font-medium text-foreground-muted hover:text-foreground hover:bg-background-secondary rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Prethodna
            </button>
            <span className="text-sm text-foreground-muted">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm font-medium text-foreground-muted hover:text-foreground hover:bg-background-secondary rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sledeća
            </button>
          </div>
        </div>
      )}

      {/* Results count when not paginating */}
      {totalPages <= 1 && filteredAndSortedCoaches.length > 0 && (
        <p className="text-sm text-foreground-muted">
          Prikazano {filteredAndSortedCoaches.length} od {coaches.length} trenera
        </p>
      )}
    </div>
  );
}
