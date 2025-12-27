"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Streak } from "@/components/ui";

interface MemberDetail {
  member: {
    id: string;
    memberId: string;
    name: string;
    goal: string;
    weight: number | null;
    height: number | null;
    status: string;
    createdAt: string;
  };
  targets: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  streak: number;
  activitySummary: {
    totalLogs: number;
    mealLogs: number;
    trainingLogs: number;
    waterLogs: number;
  };
  weeklyCheckins: Array<{
    weight: number;
    feeling: number;
    weekNumber: number;
    year: number;
  }>;
  aiSummaries: Array<{
    type: string;
    content: string;
    createdAt: string;
  }>;
  notes: Array<{
    content: string;
    createdAt: string;
    staff: { name: string };
  }>;
}

const feelingEmojis = ["", "😞", "😐", "🙂", "😄"];

const goalLabels: Record<string, string> = {
  fat_loss: "Gubitak masnoće",
  muscle_gain: "Rast mišića",
  recomposition: "Rekompozicija",
};

const statusLabels: Record<string, string> = {
  active: "Aktivan",
  inactive: "Neaktivan",
};

export default function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMember = async () => {
      try {
        const response = await fetch(`/api/members/${id}`);
        const result = await response.json();

        if (response.ok) {
          setData(result);
        }
      } catch {
        // Handle error silently
      } finally {
        setLoading(false);
      }
    };

    fetchMember();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-foreground-muted">Učitavanje...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background px-6 pt-12">
        <Card className="text-center py-8">
          <p className="text-foreground-muted">Član nije pronađen</p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => router.push("/dashboard")}
          >
            Nazad na kontrolnu tablu
          </Button>
        </Card>
      </div>
    );
  }

  const { member, targets, streak, activitySummary, weeklyCheckins, aiSummaries } = data;

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <header className="px-6 pt-12 pb-6 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2"
          aria-label="Go back"
        >
          <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-foreground">Detalji člana</h1>
        <div className="w-10" />
      </header>

      <main className="px-6 space-y-6">
        {/* Member Info */}
        <Card>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">{member.name}</h2>
              <p className="text-foreground-muted">ID: {member.memberId}</p>
            </div>
            <span className={`
              px-3 py-1 rounded-full text-sm font-medium
              ${member.status === "active" ? "bg-success/10 text-success" : "bg-error/10 text-error"}
            `}>
              {statusLabels[member.status] || member.status}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-foreground-muted">Cilj</span>
              <p className="text-foreground font-medium">
                {goalLabels[member.goal] || member.goal}
              </p>
            </div>
            <div>
              <span className="text-foreground-muted">Težina</span>
              <p className="text-foreground font-medium">
                {member.weight ? `${member.weight} kg` : "-"}
              </p>
            </div>
            <div>
              <span className="text-foreground-muted">Visina</span>
              <p className="text-foreground font-medium">
                {member.height ? `${member.height} cm` : "-"}
              </p>
            </div>
            <div>
              <span className="text-foreground-muted">Dnevni cilj</span>
              <p className="text-foreground font-medium">{targets.calories} kcal</p>
            </div>
          </div>
        </Card>

        {/* Activity Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <Streak count={streak} />
          </Card>
          <Card>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-foreground-muted">Obroci</span>
                <span className="text-sm font-medium text-foreground">{activitySummary.mealLogs}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-foreground-muted">Treninzi</span>
                <span className="text-sm font-medium text-foreground">{activitySummary.trainingLogs}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-foreground-muted">Voda</span>
                <span className="text-sm font-medium text-foreground">{activitySummary.waterLogs}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Weight Progress */}
        {weeklyCheckins.length > 0 && (
          <Card>
            <h3 className="text-lg font-semibold text-foreground mb-4">Napredak težine</h3>
            <div className="space-y-3">
              {weeklyCheckins.slice(0, 4).map((checkin, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-foreground-muted">
                    Nedelja {checkin.weekNumber}, {checkin.year}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{feelingEmojis[checkin.feeling]}</span>
                    <span className="font-medium text-foreground">{checkin.weight} kg</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* AI Summaries */}
        {aiSummaries.length > 0 && (
          <Card>
            <h3 className="text-lg font-semibold text-foreground mb-4">AI rezimei</h3>
            <div className="space-y-4">
              {aiSummaries.map((summary, index) => (
                <div key={index} className="pb-4 border-b border-border last:border-0 last:pb-0">
                  <p className="text-sm text-foreground-muted mb-1 capitalize">
                    {summary.type === "weekly" ? "Nedeljni" : summary.type === "daily" ? "Dnevni" : summary.type} rezime
                  </p>
                  <p className="text-foreground">{summary.content}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
