"use client";

import { useState } from "react";

interface Item {
  label: string;
  desc?: string;
  price: string;
  unit?: string;
  popular?: boolean;
}
interface Pricing {
  membership: Record<string, Item[]>;
  other: { label: string; price: string; months?: number }[];
}

/** Interactive pricing: gender toggle + membership cards + a compact "Ostalo" row. */
export function PricingTable({ pricing, accentColor }: { pricing: Pricing; accentColor: string }) {
  const genders = Object.keys(pricing.membership);
  const [gender, setGender] = useState(genders[0]);
  const items = pricing.membership[gender] || [];
  const toNum = (s: string) => parseInt(s.replace(/\./g, ""), 10);
  const fmt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const monthly = toNum(items.find((i) => i.label === "Ceo mesec")?.price || "0");

  return (
    <div>
      {/* Gender toggle */}
      <div className="flex justify-center mb-10">
        <div className="inline-flex p-1 rounded-2xl bg-background-secondary border border-white/10">
          {genders.map((g) => {
            const active = g === gender;
            return (
              <button
                key={g}
                onClick={() => setGender(g)}
                className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${active ? "text-white" : "text-foreground-muted hover:text-foreground"}`}
                style={active ? { backgroundColor: accentColor, boxShadow: `0 10px 24px -10px ${accentColor}` } : undefined}
              >
                {g}
              </button>
            );
          })}
        </div>
      </div>

      {/* Membership cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {items.map((item) => (
          <div
            key={item.label}
            className={`relative rounded-3xl p-6 border transition-all duration-300 hover:-translate-y-1.5 ${item.popular ? "" : "bg-background-secondary/50 border-white/10 hover:border-white/25"}`}
            style={item.popular ? { background: `linear-gradient(160deg, ${accentColor}26, ${accentColor}0a)`, borderColor: `${accentColor}55`, boxShadow: `0 26px 60px -32px ${accentColor}` } : undefined}
          >
            {item.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white whitespace-nowrap shadow-lg" style={{ backgroundColor: accentColor }}>
                Najpopularnije
              </span>
            )}
            <div className="text-base font-bold text-foreground">{item.label}</div>
            {item.desc && <div className="text-xs text-foreground-muted mt-1">{item.desc}</div>}
            <div className="flex items-baseline gap-1 mt-5">
              <span className="text-4xl font-black tracking-tight" style={{ color: item.popular ? accentColor : undefined }}>{item.price}</span>
              <span className="text-sm text-foreground-muted font-medium">RSD{item.unit ? `/${item.unit}` : ""}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Ostalo */}
      <div className="mt-10">
        <div className="flex items-center gap-3 mb-5">
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-foreground-muted">Ostale opcije</span>
          <span className="flex-1 h-px bg-white/10" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {pricing.other.map((o) => {
            const price = toNum(o.price);
            const savePct = o.months && monthly > 0 ? Math.round((1 - price / (monthly * o.months)) * 100) : 0;
            const perMonth = o.months ? Math.round(price / o.months) : 0;
            return (
              <div key={o.label} className="relative rounded-2xl p-5 bg-background-secondary/50 border border-white/10 hover:border-white/25 transition-colors text-center">
                {savePct > 0 && (
                  <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: accentColor }}>
                    −{savePct}%
                  </span>
                )}
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-2xl font-black text-foreground">{o.price}</span>
                  <span className="text-xs text-foreground-muted">RSD</span>
                </div>
                <div className="text-sm text-foreground-muted mt-1">{o.label}</div>
                {perMonth > 0 && (
                  <div className="text-[11px] mt-1.5 font-semibold" style={{ color: accentColor }}>≈ {fmt(perMonth)} RSD/mes</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
