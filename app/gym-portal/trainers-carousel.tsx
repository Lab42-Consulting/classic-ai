"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Trainer {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  specialty: string | null;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Modern scroll-snap carousel of equal-height coach cards (no dependencies). */
export function TrainersCarousel({ trainers, accentColor }: { trainers: Trainer[]; accentColor: string }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  useEffect(() => {
    update();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update, trainers.length]);

  const scrollByCards = (dir: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    const amount = card ? card.offsetWidth + 20 : el.clientWidth * 0.85;
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  return (
    <div className="relative">
      {/* Edge fades (desktop) */}
      <div className="pointer-events-none absolute inset-y-0 -left-1 w-16 z-10 hidden md:block bg-gradient-to-r from-background-secondary to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 -right-1 w-16 z-10 hidden md:block bg-gradient-to-l from-background-secondary to-transparent" />

      {/* Prev / Next arrows (desktop) */}
      <button
        aria-label="Prethodni"
        onClick={() => scrollByCards(-1)}
        disabled={!canPrev}
        className="hidden md:flex absolute left-2 top-[42%] -translate-y-1/2 z-20 w-11 h-11 items-center justify-center rounded-full bg-background/70 backdrop-blur-md border border-white/15 text-foreground shadow-lg transition-all hover:scale-110 disabled:opacity-0 disabled:pointer-events-none"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        aria-label="Sledeći"
        onClick={() => scrollByCards(1)}
        disabled={!canNext}
        className="hidden md:flex absolute right-2 top-[42%] -translate-y-1/2 z-20 w-11 h-11 items-center justify-center rounded-full bg-background/70 backdrop-blur-md border border-white/15 text-foreground shadow-lg transition-all hover:scale-110 disabled:opacity-0 disabled:pointer-events-none"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <div
        ref={scrollerRef}
        className="flex items-start gap-5 overflow-x-auto overscroll-x-contain snap-x snap-mandatory pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {trainers.map((t) => (
          <article
            key={t.id}
            data-card
            className="group relative snap-start shrink-0 w-[280px] sm:w-[300px] rounded-3xl overflow-hidden bg-background/40 border border-white/10 transition-transform duration-300 hover:-translate-y-1.5"
          >
            {/* Accent border + glow on hover */}
            <div
              className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
              style={{ boxShadow: `inset 0 0 0 1.5px ${accentColor}, 0 22px 50px -22px ${accentColor}66` }}
            />

            {/* Portrait */}
            <div className="relative h-[360px] overflow-hidden">
              {t.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={t.avatarUrl}
                  alt={t.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${accentColor}30 0%, ${accentColor}08 100%)` }}
                >
                  <span className="text-6xl font-bold" style={{ color: accentColor }}>
                    {initials(t.name)}
                  </span>
                </div>
              )}
              {/* Scrim */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
              {/* Name + specialty over photo */}
              <div className="absolute inset-x-0 bottom-0 p-5">
                <h3 className="text-xl font-bold text-white leading-tight drop-shadow-sm">{t.name}</h3>
                <span
                  className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg text-xs font-semibold text-white backdrop-blur-sm border border-white/10"
                  style={{ backgroundColor: `${accentColor}40` }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  {t.specialty || "Lični trener"}
                </span>
              </div>
            </div>

            {/* Bio — clamped + min-height so every card is identical height */}
            <div className="p-5">
              <p className="text-foreground-muted text-sm leading-relaxed line-clamp-3 min-h-[4.5rem]">
                {t.bio || "Posvećen pomoći članovima da ostvare svoje fitness ciljeve kroz personalizovane treninge."}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
