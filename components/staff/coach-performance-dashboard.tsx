"use client";

import { useState, useEffect } from "react";
import { MembersPerCoachChart } from "./charts/members-per-coach-chart";
import { ConsistencyComparisonChart } from "./charts/consistency-comparison-chart";
import { CoachPerformanceTable } from "./coach-performance-table";
import { CSVExportButton } from "./csv-export-button";

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

interface PerformanceSummary {
  totalCoaches: number;
  totalCoachedMembers: number;
  uncoachedMembers: number;
  overallMemberStatus: {
    onTrack: number;
    slipping: number;
    offTrack: number;
  };
}

interface PerformanceData {
  coaches: CoachPerformance[];
  summary: PerformanceSummary;
}

export function CoachPerformanceDashboard() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/admin/coach-performance");
        if (!response.ok) {
          throw new Error("Failed to fetch performance data");
        }
        const json = await response.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
        <p className="text-red-400">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
        >
          Pokušaj ponovo
        </button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { coaches, summary } = data;

  // Prepare chart data
  const membersPerCoachData = coaches.map((coach) => ({
    name: coach.name.split(" ")[0], // Use first name for chart
    memberCount: coach.assignedMemberCount,
  }));

  const consistencyData = coaches
    .filter((coach) => coach.assignedMemberCount > 0)
    .map((coach) => ({
      name: coach.name.split(" ")[0], // Use first name for chart
      consistencyScore: coach.memberOutcomes.avgConsistencyScore,
    }));

  // Calculate total members for status percentage
  const totalWithStatus = summary.overallMemberStatus.onTrack +
    summary.overallMemberStatus.slipping +
    summary.overallMemberStatus.offTrack;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-background-secondary border border-border rounded-xl p-4">
          <p className="text-sm text-foreground-muted mb-1">Ukupno trenera</p>
          <p className="text-3xl font-bold text-foreground">{summary.totalCoaches}</p>
        </div>
        <div className="bg-background-secondary border border-border rounded-xl p-4">
          <p className="text-sm text-foreground-muted mb-1">Članovi sa trenerom</p>
          <p className="text-3xl font-bold text-accent">{summary.totalCoachedMembers}</p>
        </div>
        <div className="bg-background-secondary border border-border rounded-xl p-4">
          <p className="text-sm text-foreground-muted mb-1">Bez trenera</p>
          <p className="text-3xl font-bold text-foreground-muted">{summary.uncoachedMembers}</p>
        </div>
        <div className="bg-background-secondary border border-border rounded-xl p-4">
          <p className="text-sm text-foreground-muted mb-2">Status članova</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span className="text-sm text-foreground">{summary.overallMemberStatus.onTrack}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
              <span className="text-sm text-foreground">{summary.overallMemberStatus.slipping}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span className="text-sm text-foreground">{summary.overallMemberStatus.offTrack}</span>
            </div>
          </div>
          {totalWithStatus > 0 && (
            <div className="mt-2 h-2 bg-background rounded-full overflow-hidden flex">
              <div
                className="bg-green-500 h-full"
                style={{ width: `${(summary.overallMemberStatus.onTrack / totalWithStatus) * 100}%` }}
              />
              <div
                className="bg-yellow-500 h-full"
                style={{ width: `${(summary.overallMemberStatus.slipping / totalWithStatus) * 100}%` }}
              />
              <div
                className="bg-red-500 h-full"
                style={{ width: `${(summary.overallMemberStatus.offTrack / totalWithStatus) * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Charts Section */}
      {coaches.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Members Per Coach Chart */}
          <div className="bg-background-secondary border border-border rounded-xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Članovi po treneru</h3>
            <MembersPerCoachChart data={membersPerCoachData} />
          </div>

          {/* Consistency Comparison Chart */}
          <div className="bg-background-secondary border border-border rounded-xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Prosečna doslednost članova</h3>
            {consistencyData.length > 0 ? (
              <ConsistencyComparisonChart data={consistencyData} />
            ) : (
              <div className="h-64 flex items-center justify-center text-foreground-muted text-sm">
                Nema podataka o doslednosti
              </div>
            )}
          </div>
        </div>
      )}

      {/* Export Button */}
      <div className="flex justify-end">
        <CSVExportButton coaches={coaches} summary={summary} />
      </div>

      {/* Coach Performance Table */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Detalji po treneru</h3>
        <CoachPerformanceTable coaches={coaches} />
      </div>
    </div>
  );
}
