"use client";

interface Member {
  id: string;
  memberId: string;
  name: string;
  goal: string;
  subscriptionStatus: string;
  subscribedUntil: string | null;
  activityStatus: "active" | "slipping" | "inactive";
  lastActivity: string | null;
  coach: { id: string; name: string } | null;
}

interface MemberStats {
  total: number;
  active: number;
  expiringSoon: number;
  expired: number;
}

interface MemberCSVExportButtonProps {
  members: Member[];
  stats: MemberStats;
}

const goalLabels: Record<string, string> = {
  fat_loss: "Mršavljenje",
  muscle_gain: "Rast mišića",
  recomposition: "Rekompozicija",
};

const activityLabels: Record<string, string> = {
  active: "Aktivan",
  slipping: "Slabi",
  inactive: "Neaktivan",
};

const subscriptionLabels: Record<string, string> = {
  active: "Aktivna",
  expired: "Istekla",
  trial: "Probni",
};

export function MemberCSVExportButton({ members, stats }: MemberCSVExportButtonProps) {
  const handleExport = () => {
    // Headers
    const headers = [
      "Ime člana",
      "ID člana",
      "Cilj",
      "Status aktivnosti",
      "Status članarine",
      "Članarina do",
      "Trener",
    ];

    // Data rows
    const rows = members.map((member) => [
      member.name,
      member.memberId,
      goalLabels[member.goal] || member.goal,
      activityLabels[member.activityStatus] || member.activityStatus,
      subscriptionLabels[member.subscriptionStatus] || member.subscriptionStatus,
      member.subscribedUntil
        ? new Date(member.subscribedUntil).toLocaleDateString("sr-RS")
        : "N/A",
      member.coach?.name || "Nije dodeljen",
    ]);

    // Add summary section
    const summaryRows = [
      [],
      ["REZIME"],
      ["Ukupno članova", stats.total],
      ["Aktivni članovi", stats.active],
      ["Ističe uskoro", stats.expiringSoon],
      ["Istekla članarina", stats.expired],
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
    const filename = `clanovi-${date}.csv`;

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
