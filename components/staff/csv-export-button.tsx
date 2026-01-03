"use client";

interface CoachPerformance {
  id: string;
  staffId: string;
  name: string;
  assignedMemberCount: number;
  pendingRequestCount: number;
  assignedMembers: unknown[]; // Not used for CSV export
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

interface CSVExportButtonProps {
  coaches: CoachPerformance[];
  summary: PerformanceSummary;
}

export function CSVExportButton({ coaches, summary }: CSVExportButtonProps) {
  const handleExport = () => {
    // Headers
    const headers = [
      "Ime trenera",
      "Staff ID",
      "Broj članova",
      "Na čekanju",
      "Nudge poslati",
      "Nudge viđeni",
      "Nudge %",
      "Na putu",
      "Gube fokus",
      "Van putanje",
      "Prosečna doslednost %",
    ];

    // Data rows
    const rows = coaches.map((coach) => [
      coach.name,
      coach.staffId,
      coach.assignedMemberCount,
      coach.pendingRequestCount,
      coach.nudgeStats.totalSent,
      coach.nudgeStats.totalViewed,
      coach.nudgeStats.viewRate,
      coach.memberOutcomes.onTrack,
      coach.memberOutcomes.slipping,
      coach.memberOutcomes.offTrack,
      coach.memberOutcomes.avgConsistencyScore,
    ]);

    // Add summary section
    const summaryRows = [
      [],
      ["REZIME"],
      ["Ukupno trenera", summary.totalCoaches],
      ["Članovi sa trenerom", summary.totalCoachedMembers],
      ["Članovi bez trenera", summary.uncoachedMembers],
      ["Ukupno na putu", summary.overallMemberStatus.onTrack],
      ["Ukupno gube fokus", summary.overallMemberStatus.slipping],
      ["Ukupno van putanje", summary.overallMemberStatus.offTrack],
    ];

    // Combine all data
    const allRows = [headers, ...rows, ...summaryRows];

    // Convert to CSV string
    const csvContent = allRows
      .map((row) =>
        row
          .map((cell) => {
            // Handle cells that might contain commas or quotes
            const cellStr = String(cell ?? "");
            if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
              return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
          })
          .join(",")
      )
      .join("\n");

    // Add BOM for Excel UTF-8 compatibility
    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    // Generate filename with date
    const date = new Date().toISOString().split("T")[0];
    const filename = `performanse-trenera-${date}.csv`;

    // Create download link and trigger
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center gap-2 px-4 py-2 bg-background-secondary border border-border rounded-xl text-sm font-medium text-foreground hover:bg-background hover:border-foreground-muted transition-colors"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
      </svg>
      Preuzmi CSV
    </button>
  );
}
