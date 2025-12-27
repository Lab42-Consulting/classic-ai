"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GlassCard, FadeIn, SlideUp } from "@/components/ui";
import { getTranslations } from "@/lib/i18n";

const t = getTranslations("sr");

interface DayLog {
  date: string;
  meals: number;
  training: boolean;
  water: number;
  calories: number;
  protein: number;
}

interface HistoryData {
  logs: DayLog[];
  loading: boolean;
}

const dayNames = ["Ned", "Pon", "Uto", "Sre", "Čet", "Pet", "Sub"];
const monthNames = [
  "Januar", "Februar", "Mart", "April", "Maj", "Jun",
  "Jul", "Avgust", "Septembar", "Oktobar", "Novembar", "Decembar"
];

export default function HistoryPage() {
  const router = useRouter();
  const [data, setData] = useState<HistoryData>({ logs: [], loading: true });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch("/api/logs?days=30");
      if (response.ok) {
        const result = await response.json();
        // API returns { logs: [...] }, extract the array
        const logs = Array.isArray(result) ? result : (result.logs || []);
        setData({ logs, loading: false });
      } else {
        setData({ logs: [], loading: false });
      }
    } catch {
      setData({ logs: [], loading: false });
    }
  };

  // Generate last 30 days
  const getLast30Days = () => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      days.push(date);
    }
    return days;
  };

  const days = getLast30Days();

  const getLogForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return data.logs.find((log) => log.date === dateStr);
  };

  const getDayStatus = (date: Date) => {
    const log = getLogForDate(date);
    if (!log) return "empty";
    if (log.training && log.meals >= 2 && log.water >= 4) return "excellent";
    if (log.meals >= 1 || log.training) return "good";
    return "partial";
  };

  const statusColors = {
    empty: "bg-white/5",
    partial: "bg-warning/30",
    good: "bg-success/30",
    excellent: "bg-success/50 ring-2 ring-success/30",
  };

  const selectedLog = selectedDate
    ? data.logs.find((log) => log.date === selectedDate)
    : null;

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="px-6 pt-14 pb-4 flex items-center gap-4 border-b border-white/5">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full glass flex items-center justify-center btn-press"
          aria-label="Go back"
        >
          <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <FadeIn>
          <div>
            <h1 className="text-xl text-headline text-foreground">Istorija</h1>
            <p className="text-sm text-foreground-muted">Poslednjih 30 dana</p>
          </div>
        </FadeIn>
      </header>

      <main className="px-6 py-6 space-y-6">
        {/* Calendar Grid */}
        <SlideUp delay={100}>
          <GlassCard>
            <h3 className="text-label mb-4">Aktivnost</h3>

            {/* Day labels */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map((day) => (
                <div key={day} className="text-center text-xs text-foreground-muted py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {days.reverse().map((date) => {
                const status = getDayStatus(date);
                const dateStr = date.toISOString().split("T")[0];
                const isToday = dateStr === new Date().toISOString().split("T")[0];
                const isSelected = selectedDate === dateStr;

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`
                      aspect-square rounded-lg flex items-center justify-center
                      text-sm font-medium transition-all
                      ${statusColors[status]}
                      ${isToday ? "ring-2 ring-accent" : ""}
                      ${isSelected ? "ring-2 ring-white" : ""}
                      hover:opacity-80
                    `}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-white/5" />
                <span className="text-xs text-foreground-muted">Nema unosa</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-success/30" />
                <span className="text-xs text-foreground-muted">Uneseno</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-success/50 ring-1 ring-success/30" />
                <span className="text-xs text-foreground-muted">Odlično</span>
              </div>
            </div>
          </GlassCard>
        </SlideUp>

        {/* Selected Day Details */}
        {selectedDate && (
          <SlideUp delay={200}>
            <GlassCard>
              <h3 className="text-label mb-4">
                {new Date(selectedDate).getDate()}. {monthNames[new Date(selectedDate).getMonth()]}
              </h3>

              {selectedLog ? (
                <div className="space-y-4">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="glass rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-number text-foreground">
                        {selectedLog.calories}
                      </p>
                      <p className="text-xs text-foreground-muted">Kalorije</p>
                    </div>
                    <div className="glass rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-number text-foreground">
                        {selectedLog.protein}g
                      </p>
                      <p className="text-xs text-foreground-muted">Proteini</p>
                    </div>
                  </div>

                  {/* Activity indicators */}
                  <div className="flex items-center justify-around py-2">
                    <div className="text-center">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-1 ${selectedLog.training ? "bg-success/20" : "bg-white/5"}`}>
                        <span className="text-xl">{selectedLog.training ? "✅" : "❌"}</span>
                      </div>
                      <p className="text-xs text-foreground-muted">Trening</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-1">
                        <span className="text-xl">🍽️</span>
                      </div>
                      <p className="text-xs text-foreground-muted">{selectedLog.meals} obroka</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-1">
                        <span className="text-xl">💧</span>
                      </div>
                      <p className="text-xs text-foreground-muted">{selectedLog.water} čaša</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-foreground-muted">Nema unosa za ovaj dan</p>
                </div>
              )}
            </GlassCard>
          </SlideUp>
        )}

        {/* Summary Stats */}
        <SlideUp delay={300}>
          <GlassCard>
            <h3 className="text-label mb-4">Statistika (30 dana)</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-number text-success">
                  {data.logs.filter((l) => l.training).length}
                </p>
                <p className="text-xs text-foreground-muted">Treninga</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-number text-foreground">
                  {data.logs.length}
                </p>
                <p className="text-xs text-foreground-muted">Dana uneseno</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-number text-foreground">
                  {Math.round(
                    data.logs.reduce((sum, l) => sum + l.calories, 0) /
                      (data.logs.length || 1)
                  )}
                </p>
                <p className="text-xs text-foreground-muted">Avg. kal</p>
              </div>
            </div>
          </GlassCard>
        </SlideUp>
      </main>
    </div>
  );
}
