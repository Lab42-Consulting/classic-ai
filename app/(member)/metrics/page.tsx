"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  GlassCard,
  SlideUp,
  FadeIn,
  AnimatedNumber,
} from "@/components/ui";
import { getTranslations } from "@/lib/i18n";
import { useMember } from "@/lib/member-context";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const t = getTranslations("sr");

// Types
interface MetricSummary {
  id: string;
  name: string;
  unit: string;
  targetValue: number | null;
  referenceValue: number | null;
  higherIsBetter: boolean;
  isCoachCreated: boolean;
  coachName: string | null;
  entryCount: number;
  latestEntry: { value: number; date: string } | null;
  createdAt: string;
}

interface MetricEntry {
  id: string;
  date: string;
  value: number;
  note: string | null;
  status: "on_track" | "needs_attention" | "off_track" | "neutral";
  changeFromReference: number | null;
  changeIsAbsolute: boolean;
}

interface MetricDetail {
  id: string;
  name: string;
  unit: string;
  targetValue: number | null;
  referenceValue: number | null;
  higherIsBetter: boolean;
  isCoachCreated: boolean;
  coachName: string | null;
}

interface MetricsData {
  own: MetricSummary[];
  coach: MetricSummary[];
}

interface ConsistencyData {
  score: number;
  level: "on_track" | "needs_attention" | "off_track";
}

type ViewMode = "table" | "graph";
type TimeRange = 7 | 30 | 90 | 365;

const statusColors: Record<string, string> = {
  on_track: "text-success",
  needs_attention: "text-warning",
  off_track: "text-error",
  neutral: "text-accent",
};

const statusBgColors: Record<string, string> = {
  on_track: "bg-success",
  needs_attention: "bg-warning",
  off_track: "bg-error",
  neutral: "bg-accent",
};

const statusLabels: Record<string, string> = {
  on_track: "Na cilju",
  needs_attention: "Blizu cilja",
  off_track: "Ispod cilja",
  neutral: "-",
};

export default function MetricsPage() {
  const router = useRouter();
  const { difficultyMode } = useMember();

  // State
  const [metrics, setMetrics] = useState<MetricsData>({ own: [], coach: [] });
  const [loading, setLoading] = useState(true);
  const [currentMetricIndex, setCurrentMetricIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [timeRange, setTimeRange] = useState<TimeRange>(30);
  const [entries, setEntries] = useState<MetricEntry[]>([]);
  const [metricDetail, setMetricDetail] = useState<MetricDetail | null>(null);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [consistency, setConsistency] = useState<ConsistencyData | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddEntryModal, setShowAddEntryModal] = useState(false);
  const [editingMetric, setEditingMetric] = useState<MetricSummary | null>(null);

  // Touch handling for swipe
  const [touchStart, setTouchStart] = useState<number | null>(null);

  // Redirect Simple mode users
  useEffect(() => {
    if (difficultyMode === "simple") {
      router.replace("/home");
    }
  }, [difficultyMode, router]);

  // Combine all metrics for carousel
  const allMetrics = [...metrics.own, ...metrics.coach];

  // Fetch metrics
  const fetchMetrics = useCallback(async () => {
    try {
      const [metricsResponse, progressResponse] = await Promise.all([
        fetch("/api/member/metrics"),
        fetch("/api/member/progress"),
      ]);

      if (metricsResponse.ok) {
        const result = await metricsResponse.json();
        setMetrics({ own: result.own || [], coach: result.coach || [] });
      }

      if (progressResponse.ok) {
        const progressData = await progressResponse.json();
        setConsistency(progressData.consistency);
      }
    } catch {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Fetch entries when metric or time range changes
  const fetchEntries = useCallback(async (metricId: string, range: TimeRange) => {
    setEntriesLoading(true);
    try {
      const response = await fetch(
        `/api/member/metrics/${metricId}/entries?range=${range}`
      );
      if (response.ok) {
        const result = await response.json();
        setEntries(result.entries || []);
        setMetricDetail(result.metric);
      }
    } catch {
      setEntries([]);
    } finally {
      setEntriesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (allMetrics.length > 0 && currentMetricIndex < allMetrics.length) {
      const currentMetric = allMetrics[currentMetricIndex];
      fetchEntries(currentMetric.id, timeRange);
    }
  }, [currentMetricIndex, timeRange, allMetrics.length, fetchEntries]);

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null || allMetrics.length <= 1) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    const minSwipeDistance = 50;

    if (Math.abs(diff) > minSwipeDistance) {
      if (diff > 0) {
        // Swipe left - next metric
        setCurrentMetricIndex((prev) =>
          prev < allMetrics.length - 1 ? prev + 1 : prev
        );
      } else {
        // Swipe right - previous metric
        setCurrentMetricIndex((prev) => (prev > 0 ? prev - 1 : prev));
      }
    }
    setTouchStart(null);
  };

  // Create metric handler
  const handleCreateMetric = async (data: {
    name: string;
    unit: string;
    targetValue: number | null;
    higherIsBetter: boolean;
  }) => {
    try {
      const response = await fetch("/api/member/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setShowCreateModal(false);
        fetchMetrics();
      }
    } catch {
      // Handle error
    }
  };

  // Add entry handler
  const handleAddEntry = async (data: {
    date: string;
    value: number;
    note?: string;
  }) => {
    if (!allMetrics[currentMetricIndex]) return;

    try {
      const response = await fetch(
        `/api/member/metrics/${allMetrics[currentMetricIndex].id}/entries`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );

      if (response.ok) {
        setShowAddEntryModal(false);
        fetchEntries(allMetrics[currentMetricIndex].id, timeRange);
        fetchMetrics(); // Refresh to update latest entry
      }
    } catch {
      // Handle error
    }
  };

  // Delete metric handler
  const handleDeleteMetric = async (metricId: string) => {
    if (!confirm("Da li ste sigurni da želite obrisati ovu metriku?")) return;

    try {
      const response = await fetch(`/api/member/metrics/${metricId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setCurrentMetricIndex(0);
        fetchMetrics();
      }
    } catch {
      // Handle error
    }
  };

  // Delete entry handler
  const handleDeleteEntry = async (entryId: string) => {
    if (!allMetrics[currentMetricIndex]) return;

    try {
      const response = await fetch(
        `/api/member/metrics/${allMetrics[currentMetricIndex].id}/entries/${entryId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        fetchEntries(allMetrics[currentMetricIndex].id, timeRange);
        fetchMetrics();
      }
    } catch {
      // Handle error
    }
  };

  // Loading state
  if (loading || difficultyMode === "simple") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <FadeIn>
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full glass flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-foreground-muted">{t.common.loading}</p>
          </div>
        </FadeIn>
      </div>
    );
  }

  const currentMetric = allMetrics[currentMetricIndex];

  // Prepare chart data (reverse for chronological order)
  const chartData = [...entries].reverse().map((entry) => ({
    date: new Date(entry.date).toLocaleDateString("sr-RS", {
      day: "numeric",
      month: "short",
    }),
    value: entry.value,
    status: entry.status,
  }));

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="px-6 pt-14 pb-6 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full glass flex items-center justify-center btn-press"
          aria-label="Go back"
        >
          <svg
            className="w-5 h-5 text-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <FadeIn>
          <h1 className="text-xl text-headline text-foreground">Metrike</h1>
        </FadeIn>
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-10 h-10 rounded-full glass flex items-center justify-center btn-press"
          aria-label="Add metric"
        >
          <svg
            className="w-5 h-5 text-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      </header>

      <main className="px-6 space-y-6">
        {/* Consistency Score Card (from Progress) */}
        {consistency && (
          <SlideUp delay={50}>
            <GlassCard className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground-muted">Konzistentnost</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span
                      className={`text-3xl text-display ${
                        consistency.level === "on_track"
                          ? "text-success"
                          : consistency.level === "needs_attention"
                          ? "text-warning"
                          : "text-error"
                      }`}
                    >
                      <AnimatedNumber value={consistency.score} />
                    </span>
                    <span className="text-foreground-muted text-sm">/ 100</span>
                  </div>
                </div>
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    consistency.level === "on_track"
                      ? "bg-success/20"
                      : consistency.level === "needs_attention"
                      ? "bg-warning/20"
                      : "bg-error/20"
                  }`}
                >
                  <span className="text-2xl">
                    {consistency.level === "on_track"
                      ? "🎯"
                      : consistency.level === "needs_attention"
                      ? "⚠️"
                      : "📉"}
                  </span>
                </div>
              </div>
            </GlassCard>
          </SlideUp>
        )}

        {/* Empty State */}
        {allMetrics.length === 0 ? (
          <SlideUp delay={100}>
            <GlassCard variant="prominent" className="text-center py-12">
              <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">📊</span>
              </div>
              <h2 className="text-xl text-display text-foreground mb-3">
                Nema metrika
              </h2>
              <p className="text-foreground-muted mb-6 max-w-xs mx-auto">
                Kreiraj svoju prvu metriku da pratiš napredak kroz vreme.
              </p>
              <Button className="btn-press" onClick={() => setShowCreateModal(true)}>
                + Dodaj metriku
              </Button>
            </GlassCard>
          </SlideUp>
        ) : (
          <>
            {/* Metric Carousel */}
            <SlideUp delay={100}>
              <div
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                className="relative"
              >
                <GlassCard variant="prominent" className="p-6">
                  {/* Coach Badge */}
                  {currentMetric?.isCoachCreated && (
                    <div className="absolute top-3 right-3">
                      <span className="px-2 py-1 text-xs bg-accent/20 text-accent rounded-full">
                        👨‍🏫 {currentMetric.coachName || "Trener"}
                      </span>
                    </div>
                  )}

                  {/* Metric Name & Unit */}
                  <div className="text-center mb-4">
                    <h2 className="text-2xl text-display text-foreground">
                      {currentMetric?.name}
                    </h2>
                    <p className="text-foreground-muted text-sm">
                      {currentMetric?.unit}
                    </p>
                  </div>

                  {/* Current Value */}
                  {currentMetric?.latestEntry ? (
                    <div className="text-center mb-4">
                      <div className="flex items-baseline justify-center gap-2">
                        <span className="text-5xl text-display text-foreground">
                          <AnimatedNumber
                            value={currentMetric.latestEntry.value}
                            decimals={1}
                          />
                        </span>
                        <span className="text-xl text-foreground-muted">
                          {currentMetric.unit}
                        </span>
                      </div>
                      <p className="text-sm text-foreground-muted mt-2">
                        {new Date(currentMetric.latestEntry.date).toLocaleDateString(
                          "sr-RS",
                          { day: "numeric", month: "long", year: "numeric" }
                        )}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center mb-4">
                      <p className="text-foreground-muted">Nema unosa</p>
                    </div>
                  )}

                  {/* Target Badge */}
                  {currentMetric?.targetValue !== null && (
                    <div className="flex justify-center mb-4">
                      <span className="px-3 py-1 text-sm bg-success/10 text-success rounded-full">
                        Cilj: {currentMetric.targetValue} {currentMetric.unit}
                      </span>
                    </div>
                  )}

                  {/* Dot Indicators */}
                  {allMetrics.length > 1 && (
                    <div className="flex justify-center gap-2 mt-4">
                      {allMetrics.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentMetricIndex(idx)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            idx === currentMetricIndex
                              ? "bg-accent w-6"
                              : "bg-foreground-muted/30"
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-center gap-3 mt-6">
                    <Button
                      size="sm"
                      className="btn-press"
                      onClick={() => setShowAddEntryModal(true)}
                    >
                      + Dodaj unos
                    </Button>
                    {!currentMetric?.isCoachCreated && (
                      <button
                        onClick={() => handleDeleteMetric(currentMetric?.id || "")}
                        className="p-2 rounded-lg glass text-error btn-press"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </GlassCard>
              </div>
            </SlideUp>

            {/* View Controls */}
            <SlideUp delay={150}>
              <div className="flex items-center justify-between">
                {/* Table/Graph Toggle */}
                <div className="flex p-1 bg-background-tertiary rounded-xl">
                  <button
                    onClick={() => setViewMode("table")}
                    className={`px-4 py-2 rounded-lg text-sm transition-all ${
                      viewMode === "table"
                        ? "bg-accent text-white shadow-sm"
                        : "text-foreground-muted hover:text-foreground"
                    }`}
                  >
                    📋 Tabela
                  </button>
                  <button
                    onClick={() => setViewMode("graph")}
                    className={`px-4 py-2 rounded-lg text-sm transition-all ${
                      viewMode === "graph"
                        ? "bg-accent text-white shadow-sm"
                        : "text-foreground-muted hover:text-foreground"
                    }`}
                  >
                    📈 Grafikon
                  </button>
                </div>

                {/* Time Range Selector */}
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(Number(e.target.value) as TimeRange)}
                  className="glass px-3 py-1.5 rounded-lg text-sm text-foreground bg-transparent border-none outline-none"
                >
                  <option value={7}>7 dana</option>
                  <option value={30}>30 dana</option>
                  <option value={90}>90 dana</option>
                  <option value={365}>1 godina</option>
                </select>
              </div>
            </SlideUp>

            {/* Table View */}
            {viewMode === "table" && (
              <SlideUp delay={200}>
                <GlassCard className="overflow-hidden">
                  {entriesLoading ? (
                    <div className="p-8 text-center text-foreground-muted">
                      Učitavanje...
                    </div>
                  ) : entries.length === 0 ? (
                    <div className="p-8 text-center text-foreground-muted">
                      Nema unosa za ovaj period
                    </div>
                  ) : (
                    <div className="max-h-[50vh] overflow-y-auto">
                      <table className="w-full">
                        <thead className="sticky top-0 bg-background-secondary z-10">
                          <tr className="border-b border-border">
                            <th className="px-4 py-3 text-left text-sm text-foreground-muted font-medium">
                              Datum
                            </th>
                            <th className="px-4 py-3 text-right text-sm text-foreground-muted font-medium">
                              Vrednost
                            </th>
                            <th className="px-4 py-3 text-right text-sm text-foreground-muted font-medium">
                              Od starta
                            </th>
                            <th className="px-4 py-3 text-center text-sm text-foreground-muted font-medium">
                              Status
                            </th>
                            <th className="px-4 py-3 text-center text-sm text-foreground-muted font-medium">

                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {entries.map((entry) => (
                            <tr
                              key={entry.id}
                              className="border-b border-border/50 last:border-0"
                            >
                              <td className="px-4 py-3 text-sm text-foreground">
                                {new Date(entry.date).toLocaleDateString("sr-RS", {
                                  day: "numeric",
                                  month: "short",
                                })}
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-foreground font-medium">
                                {entry.value} {currentMetric?.unit}
                              </td>
                              <td className="px-4 py-3 text-right text-sm">
                                {entry.changeFromReference !== null ? (
                                  <span
                                    className={
                                      entry.changeFromReference > 0
                                        ? metricDetail?.higherIsBetter
                                          ? "text-success"
                                          : "text-error"
                                        : entry.changeFromReference < 0
                                        ? metricDetail?.higherIsBetter
                                          ? "text-error"
                                          : "text-success"
                                        : "text-foreground-muted"
                                    }
                                  >
                                    {entry.changeFromReference > 0 ? "+" : ""}
                                    {entry.changeFromReference.toFixed(1)}
                                    {entry.changeIsAbsolute ? " p.p." : "%"}
                                  </span>
                                ) : (
                                  <span className="text-foreground-muted">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`inline-block w-3 h-3 rounded-full ${statusBgColors[entry.status]}`}
                                  title={statusLabels[entry.status]}
                                />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => handleDeleteEntry(entry.id)}
                                  className="text-foreground-muted hover:text-error transition-colors"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </GlassCard>
              </SlideUp>
            )}

            {/* Graph View */}
            {viewMode === "graph" && (
              <SlideUp delay={200}>
                <GlassCard className="p-4">
                  {entriesLoading ? (
                    <div className="h-64 flex items-center justify-center text-foreground-muted">
                      Učitavanje...
                    </div>
                  ) : chartData.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-foreground-muted">
                      Nema podataka za grafikon
                    </div>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <XAxis
                            dataKey="date"
                            tick={{ fill: "var(--foreground-muted)", fontSize: 12 }}
                            axisLine={{ stroke: "var(--border)" }}
                            tickLine={{ stroke: "var(--border)" }}
                          />
                          <YAxis
                            tick={{ fill: "var(--foreground-muted)", fontSize: 12 }}
                            axisLine={{ stroke: "var(--border)" }}
                            tickLine={{ stroke: "var(--border)" }}
                            domain={["auto", "auto"]}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "var(--background-secondary)",
                              border: "1px solid var(--border)",
                              borderRadius: "8px",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                            }}
                            labelStyle={{
                              color: "var(--foreground)",
                              fontWeight: 600,
                            }}
                            itemStyle={{ color: "var(--foreground-muted)" }}
                            formatter={(value) => [
                              `${value ?? 0} ${currentMetric?.unit}`,
                              "Vrednost",
                            ]}
                          />
                          {metricDetail?.targetValue && (
                            <ReferenceLine
                              y={metricDetail.targetValue}
                              stroke="#22c55e"
                              strokeDasharray="5 5"
                              label={{
                                value: "Cilj",
                                position: "right",
                                fill: "#22c55e",
                                fontSize: 12,
                              }}
                            />
                          )}
                          {metricDetail?.referenceValue && (
                            <ReferenceLine
                              y={metricDetail.referenceValue}
                              stroke="#8b5cf6"
                              strokeDasharray="3 3"
                              label={{
                                value: "Ref",
                                position: "right",
                                fill: "#8b5cf6",
                                fontSize: 12,
                              }}
                            />
                          )}
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="var(--accent)"
                            strokeWidth={2}
                            dot={{ fill: "var(--accent)", strokeWidth: 0, r: 4 }}
                            activeDot={{ r: 6, fill: "var(--accent)" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </GlassCard>
              </SlideUp>
            )}
          </>
        )}
      </main>

      {/* Create Metric Modal */}
      {showCreateModal && (
        <CreateMetricModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateMetric}
        />
      )}

      {/* Add Entry Modal */}
      {showAddEntryModal && currentMetric && (
        <AddEntryModal
          metricName={currentMetric.name}
          metricUnit={currentMetric.unit}
          onClose={() => setShowAddEntryModal(false)}
          onSubmit={handleAddEntry}
        />
      )}
    </div>
  );
}

// Create Metric Modal Component
function CreateMetricModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    unit: string;
    targetValue: number | null;
    higherIsBetter: boolean;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [higherIsBetter, setHigherIsBetter] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !unit.trim()) return;

    setSubmitting(true);
    await onSubmit({
      name: name.trim(),
      unit: unit.trim(),
      targetValue: targetValue ? parseFloat(targetValue) : null,
      higherIsBetter,
    });
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-background-secondary border-t border-x border-border rounded-t-3xl p-6 w-full max-w-md animate-slide-up">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl text-headline text-foreground">Nova metrika</h2>
          <button onClick={onClose} className="text-foreground-muted">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-foreground-muted mb-2">
              Naziv metrike *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="npr. Bench Press, Skok u vis"
              className="w-full px-4 py-3 glass rounded-xl text-foreground placeholder:text-foreground-muted/50 outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block text-sm text-foreground-muted mb-2">
              Jedinica mere *
            </label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="npr. kg, cm, sec, %"
              className="w-full px-4 py-3 glass rounded-xl text-foreground placeholder:text-foreground-muted/50 outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block text-sm text-foreground-muted mb-2">
              Ciljna vrednost (opciono)
            </label>
            <input
              type="number"
              step="any"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              placeholder="npr. 100"
              className="w-full px-4 py-3 glass rounded-xl text-foreground placeholder:text-foreground-muted/50 outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="py-2">
            <label className="block text-sm text-foreground-muted mb-2">
              Šta je bolje?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setHigherIsBetter(true)}
                className={`px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                  higherIsBetter
                    ? "bg-success text-white"
                    : "bg-background-tertiary text-foreground-muted hover:bg-background-tertiary/80"
                }`}
              >
                <span className="block text-base mb-0.5">↑ Veća</span>
                <span className="text-xs opacity-80">npr. snaga, skok</span>
              </button>
              <button
                type="button"
                onClick={() => setHigherIsBetter(false)}
                className={`px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                  !higherIsBetter
                    ? "bg-success text-white"
                    : "bg-background-tertiary text-foreground-muted hover:bg-background-tertiary/80"
                }`}
              >
                <span className="block text-base mb-0.5">↓ Manja</span>
                <span className="text-xs opacity-80">npr. % masti, vreme</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Otkaži
          </Button>
          <Button
            className="flex-1 btn-press"
            onClick={handleSubmit}
            disabled={!name.trim() || !unit.trim() || submitting}
          >
            {submitting ? "Čuvanje..." : "Sačuvaj"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Add Entry Modal Component
function AddEntryModal({
  metricName,
  metricUnit,
  onClose,
  onSubmit,
}: {
  metricName: string;
  metricUnit: string;
  onClose: () => void;
  onSubmit: (data: { date: string; value: number; note?: string }) => void;
}) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!value) return;

    setSubmitting(true);
    await onSubmit({
      date,
      value: parseFloat(value),
      note: note.trim() || undefined,
    });
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-background-secondary border-t border-x border-border rounded-t-3xl p-6 w-full max-w-md animate-slide-up">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl text-headline text-foreground">
            Novi unos: {metricName}
          </h2>
          <button onClick={onClose} className="text-foreground-muted">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-foreground-muted mb-2">Datum</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              className="w-full px-4 py-3 glass rounded-xl text-foreground outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block text-sm text-foreground-muted mb-2">
              Vrednost ({metricUnit}) *
            </label>
            <input
              type="number"
              step="any"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={`npr. 85.5`}
              className="w-full px-4 py-3 glass rounded-xl text-foreground placeholder:text-foreground-muted/50 outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block text-sm text-foreground-muted mb-2">
              Napomena (opciono)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Bilo kakva napomena o ovom unosu..."
              rows={2}
              className="w-full px-4 py-3 glass rounded-xl text-foreground placeholder:text-foreground-muted/50 outline-none focus:ring-2 focus:ring-accent resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Otkaži
          </Button>
          <Button
            className="flex-1 btn-press"
            onClick={handleSubmit}
            disabled={!value || submitting}
          >
            {submitting ? "Čuvanje..." : "Sačuvaj"}
          </Button>
        </div>
      </div>
    </div>
  );
}
