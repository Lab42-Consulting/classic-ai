"use client";

import { useState } from "react";
import Link from "next/link";
import { AgentAvatar, agentMeta, AgentType } from "@/components/ui/agent-avatar";

const aiAgents: { type: AgentType; features: string[] }[] = [
  {
    type: "nutrition",
    features: [
      "Personalizovani kalorijski ciljevi",
      "Analiza makronutrijenata",
      "Preporuke obroka",
      "Praćenje unosa hrane",
    ],
  },
  {
    type: "supplements",
    features: [
      "Preporuke suplementacije",
      "Optimalno doziranje",
      "Vreme uzimanja",
      "Interakcije i upozorenja",
    ],
  },
  {
    type: "training",
    features: [
      "Praćenje vežbi i setova",
      "Tehnika izvođenja",
      "Programiranje treninga",
      "Saveti za oporavak",
    ],
  },
];

const coachFeatures = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    title: "Direktna konekcija",
    description: "Članovi biraju trenere, treneri prihvataju članove. Personalizovana veza koja gradi poverenje.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    title: "Programiranje ishrane",
    description: "Treneri kreiraju personalizovane planove ishrane za svoje članove direktno iz aplikacije.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    title: "Praćenje napretka",
    description: "Treneri vide sve - obroke, treninge, unos vode. Kompletna slika napretka svakog člana.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    title: "Dnevni podsticaji",
    description: "Treneri šalju dnevne podsticaje - motivaciju, savete ili podsetnik za članove.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: "AI personalizacija",
    description: "Treneri programiraju AI za svakog člana - alergije, preferencije, ograničenja.",
  },
];

const recipeFeatures = [
  {
    title: "Članovi dele recepte",
    description: "Članovi mogu da podele svoje omiljene recepte sa celom teretanom - zajednica koja se hrani zajedno.",
    icon: "🤝",
  },
  {
    title: "Nutricionistički podaci",
    description: "Svaki recept ima detaljne makro i mikro nutrijente - članovi znaju tačno šta unose.",
    icon: "📊",
  },
  {
    title: "Jednostavno korišćenje",
    description: "Članovi dodaju recepte iz biblioteke direktno u svoj dnevni plan ishrane jednim klikom.",
    icon: "✨",
  },
];

const stats = [
  { value: "3", label: "AI Asistenta" },
  { value: "24/7", label: "Dostupnost" },
  { value: "3", label: "Paketa" },
  { value: "od 99€", label: "Mesečno" },
];

const pricingTiers = [
  {
    name: "Starter",
    price: 99,
    description: "Za manje teretane koje počinju sa digitalizacijom",
    features: [
      "Do 50 aktivnih članova",
      "3 AI asistenta",
      "10 AI poruka po članu dnevno",
      "Praćenje napretka članova",
      "QR prijava u teretanu",
      "Biblioteka recepata",
      "Tehnička podrška",
    ],
    notIncluded: ["Izazovi i takmičenja", "Zakazivanje termina", "Trenerske funkcije"],
    popular: false,
    color: "gray",
  },
  {
    name: "Pro",
    price: 199,
    description: "Najpopularnije rešenje za rastuce teretane",
    features: [
      "Do 150 aktivnih članova",
      "3 AI asistenta",
      "25 AI poruka po članu dnevno",
      "Izazovi i takmičenja",
      "Zakazivanje termina sa trenerima",
      "Trenerske funkcije",
      "Programiranje ishrane",
      "Analitika i statistika",
      "Prioritetna podrška",
    ],
    notIncluded: ["Prilagođeno brendiranje"],
    popular: true,
    color: "accent",
  },
  {
    name: "Elite",
    price: 299,
    description: "Za velike teretane sa naprednim potrebama",
    features: [
      "Neograničen broj članova",
      "3 AI asistenta",
      "50 AI poruka po članu dnevno",
      "Sve Pro funkcije",
      "Prilagođeno brendiranje",
      "Logo i boje aplikacije",
      "Dedicirani account manager",
      "Prioritetna tehnička podrška",
    ],
    notIncluded: [],
    popular: false,
    color: "amber",
  },
];

function PhoneCarousel() {
  const [activeSlide, setActiveSlide] = useState(0);

  return (
    <div className="relative order-2 lg:order-1 flex justify-center">
      <div className="relative">
        {/* Phone Frame */}
        <div className="relative w-[280px] sm:w-[320px]">
          <div className="bg-[#1a1a1a] rounded-[36px] sm:rounded-[48px] p-2.5 sm:p-3 shadow-2xl shadow-accent/20 border border-white/20">
            <div className="bg-background rounded-[30px] sm:rounded-[40px] overflow-hidden h-[480px] sm:h-[580px] border border-white/10 flex flex-col">
              {/* Status Bar */}
              <div className="h-7 sm:h-8 bg-background flex items-center justify-center flex-shrink-0">
                <div className="w-16 sm:w-20 h-1.5 bg-white/20 rounded-full" />
              </div>

              {/* Carousel Container */}
              <div className="relative flex-1 overflow-hidden">
                {/* Bottom fade overlay */}
                <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />
                {/* Slide 1 - Member Detail */}
                <div
                  className={`absolute inset-0 transition-all duration-500 ease-out ${
                    activeSlide === 0 ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0"
                  }`}
                >
                  <div className="h-full overflow-hidden">
                    <div className="animate-phone-scroll">
                      {/* App Content - Member Detail */}
                      <div className="px-4 sm:px-5 pb-24">
                        {/* Header */}
                        <div className="flex items-center justify-between py-3">
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 flex items-center justify-center">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </div>
                          <p className="text-sm sm:text-base font-semibold text-foreground">Profil klijenta</p>
                          <div className="w-8 sm:w-9" />
                        </div>

                        {/* Member Header Card */}
                        <div className="bg-white/5 rounded-2xl p-4 border border-accent/20 mb-4">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-accent font-bold text-base sm:text-lg">AN</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="text-base sm:text-lg font-bold text-foreground">Ana Nikolić</p>
                                  <p className="text-xs sm:text-sm text-foreground-muted">M-2847 · Mršavljenje</p>
                                </div>
                                <div className="px-2.5 py-1 rounded-full bg-success/10 flex items-center gap-1">
                                  <span className="text-xs">↘️</span>
                                  <span className="text-xs sm:text-sm text-success font-medium">-2.5kg</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          {/* Quick Stats */}
                          <div className="grid grid-cols-4 gap-3 text-center">
                            <div>
                              <p className="text-base sm:text-lg font-bold text-foreground">68</p>
                              <p className="text-[10px] sm:text-xs text-foreground-muted">kg</p>
                            </div>
                            <div>
                              <p className="text-base sm:text-lg font-bold text-foreground">4</p>
                              <p className="text-[10px] sm:text-xs text-foreground-muted">tren/ned</p>
                            </div>
                            <div>
                              <p className="text-base sm:text-lg font-bold text-foreground">6/7</p>
                              <p className="text-[10px] sm:text-xs text-foreground-muted">loguje</p>
                            </div>
                            <div>
                              <p className="text-base sm:text-lg font-bold text-foreground">12</p>
                              <p className="text-[10px] sm:text-xs text-foreground-muted">vode</p>
                            </div>
                          </div>
                        </div>

                        {/* AI Summary Card */}
                        <div className="bg-accent/10 rounded-2xl p-4 border border-accent/20 mb-4">
                          <div className="flex items-start gap-3">
                            <span className="text-xl">🤖</span>
                            <div>
                              <p className="text-xs sm:text-sm font-medium text-accent mb-1">Rezime ponašanja</p>
                              <p className="text-[11px] sm:text-xs text-foreground leading-relaxed">
                                Ana redovno beleži obroke i treninge. Ispunjava kalorijski cilj u 85% dana. Proteini su joj ispod cilja - preporučiti više izvora proteina.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Nutrition Stats */}
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5 mb-4">
                          <p className="text-xs sm:text-sm font-medium text-foreground-muted mb-3">Prosek ove nedelje</p>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs sm:text-sm text-foreground">Kalorije</span>
                              <div className="flex items-center gap-3">
                                <div className="w-20 sm:w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                                  <div className="h-full w-[82%] bg-accent rounded-full" />
                                </div>
                                <span className="text-[10px] sm:text-xs text-foreground-muted">1640/2000</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs sm:text-sm text-foreground">Proteini</span>
                              <div className="flex items-center gap-3">
                                <div className="w-20 sm:w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                                  <div className="h-full w-[65%] bg-warning rounded-full" />
                                </div>
                                <span className="text-[10px] sm:text-xs text-foreground-muted">85g/130g</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Weight Progress */}
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5 mb-4">
                          <p className="text-xs sm:text-sm font-medium text-foreground-muted mb-3">Napredak težine</p>
                          <div className="space-y-2">
                            {[
                              { week: 4, emoji: "😄", weight: "68.0" },
                              { week: 3, emoji: "🙂", weight: "68.8" },
                              { week: 2, emoji: "🙂", weight: "69.5" },
                              { week: 1, emoji: "😐", weight: "70.5" },
                            ].map((item) => (
                              <div key={item.week} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                                <span className="text-[10px] sm:text-xs text-foreground-muted">Ned {item.week}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">{item.emoji}</span>
                                  <span className="text-xs sm:text-sm font-medium text-foreground">{item.weight} kg</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* AI Settings */}
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5 mb-4">
                          <p className="text-xs sm:text-sm font-medium text-foreground-muted mb-1">AI Podešavanja</p>
                          <p className="text-[10px] sm:text-xs text-foreground-muted/70 mb-3">Tvoje smernice za AI agente</p>
                          <div className="space-y-2">
                            {[
                              { name: "Ishrana", emoji: "🥗", hasContent: true },
                              { name: "Suplementi", emoji: "💊", hasContent: true },
                              { name: "Trening", emoji: "💪", hasContent: false },
                            ].map((agent) => (
                              <div key={agent.name} className="flex items-center gap-3 p-2.5 bg-white/5 rounded-xl">
                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                                  <span className="text-sm">{agent.emoji}</span>
                                </div>
                                <div className="flex-1">
                                  <p className="text-xs sm:text-sm font-medium text-foreground">{agent.name}</p>
                                  <p className="text-[10px] sm:text-xs text-foreground-muted">
                                    {agent.hasContent ? "Smernice postavljene" : "Dodaj smernice"}
                                  </p>
                                </div>
                                <div className={`w-2 h-2 rounded-full ${agent.hasContent ? "bg-emerald-500" : "bg-foreground-muted/30"}`} />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Coach Meals */}
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5 mb-4">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-xs sm:text-sm font-medium text-foreground-muted">Obroci za člana</p>
                            <span className="px-3 py-1 bg-accent text-white text-[10px] sm:text-xs rounded-lg font-medium">
                              + Dodaj
                            </span>
                          </div>
                          <div className="space-y-2">
                            {[
                              { name: "Proteinski doručak", kcal: 420, protein: 35 },
                              { name: "Piletina sa povrćem", kcal: 380, protein: 42 },
                            ].map((meal, i) => (
                              <div key={i} className="flex items-center justify-between p-2.5 bg-background rounded-xl">
                                <div>
                                  <p className="text-xs sm:text-sm font-medium text-foreground">{meal.name}</p>
                                  <p className="text-[10px] sm:text-xs text-foreground-muted">{meal.kcal} kcal · P: {meal.protein}g</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 mt-4">
                          <div className="flex-1 py-2.5 bg-white/10 rounded-xl text-center">
                            <span className="text-[10px] sm:text-xs font-medium text-foreground">📝 Beleška</span>
                          </div>
                          <div className="flex-1 py-2.5 bg-accent rounded-xl text-center">
                            <span className="text-[10px] sm:text-xs font-medium text-white">💬 Poruka</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Slide 2 - Member Registration/Setup */}
                <div
                  className={`absolute inset-0 transition-all duration-500 ease-out ${
                    activeSlide === 1 ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
                  }`}
                >
                  <div className="h-full overflow-hidden">
                    <div className="animate-phone-scroll" style={{ animationDelay: "3s" }}>
                      {/* App Content - Registration Setup */}
                      <div className="px-4 sm:px-5 pb-24">
                        {/* Header */}
                        <div className="flex items-center justify-between py-3">
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 flex items-center justify-center">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </div>
                          <p className="text-sm sm:text-base font-semibold text-foreground">Postavi plan</p>
                          <div className="w-8 sm:w-9" />
                        </div>

                        {/* Selected Member Card */}
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-4">
                          <p className="text-[10px] sm:text-xs font-medium text-foreground-muted mb-2">Član</p>
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-accent/20 flex items-center justify-center">
                              <span className="text-accent font-bold text-sm sm:text-base">SP</span>
                            </div>
                            <div>
                              <p className="text-sm sm:text-base font-medium text-foreground">Stefan Petrović</p>
                              <p className="text-[10px] sm:text-xs text-foreground-muted">M-3102 · 82kg</p>
                            </div>
                          </div>
                        </div>

                        {/* Goal Selection */}
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-4">
                          <p className="text-[10px] sm:text-xs font-medium text-foreground-muted mb-3">Cilj *</p>
                          <div className="space-y-2">
                            {[
                              { label: "Gubitak masnoće", selected: false },
                              { label: "Rast mišića", selected: true },
                              { label: "Rekompozicija", selected: false },
                            ].map((goal, i) => (
                              <div
                                key={i}
                                className={`p-3 rounded-xl border-2 transition-all ${
                                  goal.selected
                                    ? "border-accent bg-accent/10"
                                    : "border-white/10 bg-white/5"
                                }`}
                              >
                                <span className={`text-xs sm:text-sm font-medium ${goal.selected ? "text-accent" : "text-foreground"}`}>
                                  {goal.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Custom Targets */}
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-4">
                          <p className="text-[10px] sm:text-xs font-medium text-foreground-muted mb-3">Prilagođeni ciljevi</p>
                          <div className="grid grid-cols-3 gap-2 mb-3">
                            <div>
                              <p className="text-[9px] sm:text-[10px] text-foreground-muted mb-1">Proteini</p>
                              <div className="bg-background rounded-xl px-3 py-2 text-center">
                                <span className="text-xs sm:text-sm font-medium text-foreground">180g</span>
                              </div>
                            </div>
                            <div>
                              <p className="text-[9px] sm:text-[10px] text-foreground-muted mb-1">UH</p>
                              <div className="bg-background rounded-xl px-3 py-2 text-center">
                                <span className="text-xs sm:text-sm font-medium text-foreground">250g</span>
                              </div>
                            </div>
                            <div>
                              <p className="text-[9px] sm:text-[10px] text-foreground-muted mb-1">Masti</p>
                              <div className="bg-background rounded-xl px-3 py-2 text-center">
                                <span className="text-xs sm:text-sm font-medium text-foreground">70g</span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-[9px] sm:text-[10px] text-foreground-muted">Kalorije</p>
                              <span className="text-[9px] sm:text-[10px] text-accent">auto</span>
                            </div>
                            <div className="bg-background rounded-xl px-3 py-2 text-center">
                              <span className="text-sm sm:text-base font-bold text-accent">2,350 kcal</span>
                            </div>
                          </div>
                        </div>

                        {/* Macro Tracking Toggle */}
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-4">
                          <div className="flex items-start gap-3">
                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded border-2 border-accent bg-accent flex items-center justify-center flex-shrink-0 mt-0.5">
                              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-xs sm:text-sm font-medium text-foreground">Zahtevaj makrose</p>
                              <p className="text-[10px] sm:text-xs text-foreground-muted">Član mora uneti P/UH/M</p>
                            </div>
                          </div>
                        </div>

                        {/* Notes */}
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-4">
                          <p className="text-[10px] sm:text-xs font-medium text-foreground-muted mb-2">Beleške</p>
                          <div className="bg-background rounded-xl p-3 min-h-[48px]">
                            <p className="text-[10px] sm:text-xs text-foreground-muted italic">Fokus na compound vežbe...</p>
                          </div>
                        </div>

                        {/* Submit Button */}
                        <div className="w-full py-3 bg-accent rounded-xl text-xs sm:text-sm font-semibold text-white text-center">
                          Dodeli člana
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Slide 3 - Session Scheduling */}
                <div
                  className={`absolute inset-0 transition-all duration-500 ease-out ${
                    activeSlide === 2 ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
                  }`}
                >
                  <div className="h-full overflow-hidden">
                    <div className="animate-phone-scroll" style={{ animationDelay: "6s" }}>
                      {/* App Content - Sessions */}
                      <div className="px-4 sm:px-5 pb-24">
                        {/* Header */}
                        <div className="flex items-center justify-between py-3">
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 flex items-center justify-center">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </div>
                          <p className="text-sm sm:text-base font-semibold text-foreground">Termini</p>
                          <div className="w-8 sm:w-9" />
                        </div>

                        {/* Session Request Card */}
                        <div className="bg-accent/10 rounded-2xl p-4 border border-accent/20 mb-4">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="flex h-2 w-2 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                            </span>
                            <p className="text-xs sm:text-sm font-medium text-accent">Novi zahtev</p>
                          </div>
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-violet-500/20 flex items-center justify-center">
                              <span className="text-violet-400 font-bold text-sm">MJ</span>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-foreground">Marko Jovanović</p>
                              <p className="text-[10px] sm:text-xs text-foreground-muted">Lični trening · 60 min</p>
                            </div>
                          </div>
                          <div className="bg-background/50 rounded-xl p-3 mb-3">
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-foreground">
                              <span>📅</span>
                              <span>Sreda, 15. jan · 18:00</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-foreground-muted mt-1">
                              <span>📍</span>
                              <span>U teretani</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1 py-2 bg-white/10 rounded-lg text-center">
                              <span className="text-[10px] sm:text-xs font-medium text-foreground">Predloži drugo</span>
                            </div>
                            <div className="flex-1 py-2 bg-accent rounded-lg text-center">
                              <span className="text-[10px] sm:text-xs font-medium text-white">Prihvati</span>
                            </div>
                          </div>
                        </div>

                        {/* Upcoming Session */}
                        <div className="bg-white/5 rounded-2xl p-4 border border-emerald-500/20 mb-4">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <p className="text-xs sm:text-sm font-medium text-emerald-400">Potvrđeno</p>
                          </div>
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-accent/20 flex items-center justify-center">
                              <span className="text-accent font-bold text-sm">AN</span>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-foreground">Ana Nikolić</p>
                              <p className="text-[10px] sm:text-xs text-foreground-muted">Konsultacije · 45 min</p>
                            </div>
                          </div>
                          <div className="bg-background/50 rounded-xl p-3">
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-foreground">
                              <span>📅</span>
                              <span>Danas · 16:30</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-foreground-muted mt-1">
                              <span>📍</span>
                              <span>Online</span>
                            </div>
                          </div>
                        </div>

                        {/* Calendar Preview - Full Month */}
                        <div className="bg-white/5 rounded-2xl p-3 sm:p-4 border border-white/5 mb-4">
                          <p className="text-xs sm:text-sm font-medium text-foreground-muted mb-2">Januar 2026</p>
                          <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
                            {["P", "U", "S", "Č", "P", "S", "N"].map((d, i) => (
                              <span key={i} className="text-[8px] sm:text-[9px] text-foreground-muted py-1">{d}</span>
                            ))}
                          </div>
                          {/* January 2026: starts Thursday, 31 days */}
                          <div className="grid grid-cols-7 gap-0.5">
                            {/* Week 1: empty Mon-Wed, then 1-4 */}
                            {[null, null, null, 1, 2, 3, 4].map((day, i) => (
                              <div
                                key={`w1-${i}`}
                                className={`aspect-square rounded flex items-center justify-center text-[10px] sm:text-xs ${
                                  day === 3 ? "bg-emerald-500/30 text-foreground" :
                                  day ? "bg-white/5 text-foreground-muted" : ""
                                }`}
                              >
                                {day}
                              </div>
                            ))}
                            {/* Week 2: 5-11 */}
                            {[5, 6, 7, 8, 9, 10, 11].map((day) => (
                              <div
                                key={day}
                                className={`aspect-square rounded flex items-center justify-center text-[10px] sm:text-xs ${
                                  day === 7 ? "ring-1 ring-accent bg-white/10 text-foreground font-medium" :
                                  day === 9 ? "bg-emerald-500/30 text-foreground" :
                                  "bg-white/5 text-foreground-muted"
                                }`}
                              >
                                {day}
                              </div>
                            ))}
                            {/* Week 3: 12-18 */}
                            {[12, 13, 14, 15, 16, 17, 18].map((day) => (
                              <div
                                key={day}
                                className={`aspect-square rounded flex items-center justify-center text-[10px] sm:text-xs ${
                                  day === 15 ? "bg-accent/30 text-accent font-medium" :
                                  day === 17 ? "bg-emerald-500/30 text-foreground" :
                                  "bg-white/5 text-foreground-muted"
                                }`}
                              >
                                {day}
                              </div>
                            ))}
                            {/* Week 4: 19-25 */}
                            {[19, 20, 21, 22, 23, 24, 25].map((day) => (
                              <div
                                key={day}
                                className={`aspect-square rounded flex items-center justify-center text-[10px] sm:text-xs ${
                                  day === 21 ? "bg-emerald-500/30 text-foreground" :
                                  "bg-white/5 text-foreground-muted"
                                }`}
                              >
                                {day}
                              </div>
                            ))}
                            {/* Week 5: 26-31 + empty */}
                            {[26, 27, 28, 29, 30, 31, null].map((day, i) => (
                              <div
                                key={`w5-${i}`}
                                className={`aspect-square rounded flex items-center justify-center text-[10px] sm:text-xs ${
                                  day ? "bg-white/5 text-foreground-muted" : ""
                                }`}
                              >
                                {day}
                              </div>
                            ))}
                          </div>
                          {/* Legend */}
                          <div className="flex items-center justify-center gap-3 mt-2 pt-2 border-t border-white/5">
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-sm bg-accent/30" />
                              <span className="text-[8px] text-foreground-muted">Zahtev</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-sm bg-emerald-500/30" />
                              <span className="text-[8px] text-foreground-muted">Završeno</span>
                            </div>
                          </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5 mb-4">
                          <p className="text-xs sm:text-sm font-medium text-foreground-muted mb-3">Ovaj mesec</p>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <p className="text-lg sm:text-xl font-bold text-foreground">12</p>
                              <p className="text-[9px] sm:text-[10px] text-foreground-muted">Završeno</p>
                            </div>
                            <div>
                              <p className="text-lg sm:text-xl font-bold text-accent">3</p>
                              <p className="text-[9px] sm:text-[10px] text-foreground-muted">Zakazano</p>
                            </div>
                            <div>
                              <p className="text-lg sm:text-xl font-bold text-warning">1</p>
                              <p className="text-[9px] sm:text-[10px] text-foreground-muted">Na čekanju</p>
                            </div>
                          </div>
                        </div>

                        {/* Schedule Button */}
                        <div className="w-full py-3 bg-accent rounded-xl text-xs sm:text-sm font-semibold text-white text-center">
                          Zakaži termin
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Carousel Navigation */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveSlide(0)}
                className={`w-3 h-3 rounded-full transition-all ${activeSlide === 0 ? "bg-accent w-8" : "bg-white/20 hover:bg-white/40"}`}
              />
              <button
                onClick={() => setActiveSlide(1)}
                className={`w-3 h-3 rounded-full transition-all ${activeSlide === 1 ? "bg-accent w-8" : "bg-white/20 hover:bg-white/40"}`}
              />
              <button
                onClick={() => setActiveSlide(2)}
                className={`w-3 h-3 rounded-full transition-all ${activeSlide === 2 ? "bg-accent w-8" : "bg-white/20 hover:bg-white/40"}`}
              />
            </div>
            <button
              onClick={() => setActiveSlide((activeSlide + 1) % 3)}
              className="flex items-center gap-1.5 text-xs sm:text-sm text-foreground-muted hover:text-accent transition-colors"
            >
              <span>Sledeći prikaz</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Floating notification */}
        <div className="absolute -top-2 -right-2 sm:top-4 sm:-right-8 z-10 bg-background border border-emerald-500/30 rounded-xl px-3 py-2 shadow-xl">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-[10px] sm:text-xs font-medium text-foreground">Član aktivan!</p>
          </div>
        </div>

        {/* Floating plan badge */}
        <div className="absolute bottom-20 -left-2 sm:bottom-24 sm:-left-8 z-10 bg-background border border-accent/30 rounded-xl px-3 py-2 shadow-xl">
          <div className="flex items-center gap-2">
            <span className="text-base">📋</span>
            <span className="text-[10px] sm:text-xs font-medium text-accent">Plan kreiran</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GymPortalPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/gym-portal" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                <span className="text-xl font-bold text-white">C</span>
              </div>
              <div className="hidden sm:block">
                <span className="text-lg font-semibold text-foreground">Classic Method</span>
                <span className="text-sm text-foreground-muted ml-2">Gym Portal</span>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-2 sm:gap-4">
              <a
                href="/gym-portal#ai-assistants"
                className="hidden sm:inline-flex text-sm text-foreground-muted hover:text-foreground transition-colors px-3 py-2"
              >
                Mogucnosti
              </a>
              <Link
                href="/staff-login?redirect=/gym-portal/manage"
                className="text-sm text-foreground-muted hover:text-foreground transition-colors px-3 py-2"
              >
                Prijava
              </Link>
              <Link
                href="/gym-portal/gym-signup"
                className="text-sm font-medium bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Registruj teretanu
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="relative overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center">
        {/* Animated background gradients */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-accent/20 rounded-full blur-[128px] animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px]" />
          <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-[80px]" />
        </div>

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left - Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/20 rounded-full mb-8">
                <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                <span className="text-sm font-medium text-accent">AI-Powered Gym Platform</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] tracking-tight">
                Unapredite iskustvo
                <br />
                <span className="bg-gradient-to-r from-accent via-orange-400 to-emerald-400 bg-clip-text text-transparent">
                  vaših članova
                </span>
              </h1>

              <p className="mt-6 text-lg sm:text-xl text-foreground-muted leading-relaxed max-w-xl">
                Classic Method kombinuje AI asistente, personalizovano praćenje i direktnu konekciju
                trener-član u jednu moćnu platformu za moderne teretane.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <Link
                  href="/gym-portal/gym-signup"
                  className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold bg-accent hover:bg-accent/90 text-white rounded-xl transition-all hover:shadow-lg hover:shadow-accent/25"
                >
                  Započnite danas
                  <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <a
                  href="#ai-assistants"
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium bg-white/5 hover:bg-white/10 text-foreground rounded-xl transition-colors border border-white/10"
                >
                  Pogledajte mogućnosti
                </a>
              </div>

              {/* Stats */}
              <div className="mt-16 grid grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-2xl sm:text-3xl font-bold text-foreground">{stat.value}</div>
                    <div className="text-xs sm:text-sm text-foreground-muted mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right - AI Agents Preview */}
            <div className="relative hidden lg:block">
              <div className="relative">
                {/* Main showcase card */}
                <div className="bg-background/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="ml-4 text-sm text-foreground-muted">Classic Method AI</span>
                  </div>

                  {/* Agent avatars in a row */}
                  <div className="flex justify-center gap-8 mb-8">
                    {aiAgents.map((agent) => (
                      <div key={agent.type} className="text-center">
                        <AgentAvatar agent={agent.type} size="lg" state="idle" />
                        <p className={`mt-3 text-sm font-medium ${agentMeta[agent.type].textClass}`}>
                          {agentMeta[agent.type].name}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Sample chat message */}
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <div className="flex items-start gap-3">
                      <AgentAvatar agent="nutrition" size="sm" state="active" />
                      <div className="flex-1">
                        <p className="text-sm text-foreground-muted mb-1">Nutricionista AI</p>
                        <p className="text-foreground">
                          Na osnovu tvog cilja od 2200 kcal, preporučujem da večera bude oko 550 kcal
                          sa fokusom na protein...
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating elements */}
                <div className="absolute -top-4 -right-4 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl px-4 py-2 backdrop-blur">
                  <span className="text-emerald-400 font-medium text-sm">+23% angažovanost</span>
                </div>
                <div className="absolute -bottom-4 -left-4 bg-violet-500/20 border border-violet-500/30 rounded-2xl px-4 py-2 backdrop-blur">
                  <span className="text-violet-400 font-medium text-sm">AI odgovara 24/7</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Assistants Section */}
      <section id="ai-assistants" className="py-24 bg-background-secondary relative">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px]" />
          <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-4 py-1.5 bg-accent/10 border border-accent/20 rounded-full text-sm font-medium text-accent mb-6">
              AI Asistenti
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
              Tri specijalizovana AI agenta
            </h2>
            <p className="mt-6 text-lg text-foreground-muted">
              Svaki član ima pristup ekspertima za ishranu, suplementaciju i trening - dostupnim 24 sata dnevno,
              7 dana u nedelji.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {aiAgents.map((agent) => {
              const meta = agentMeta[agent.type];
              return (
                <div
                  key={agent.type}
                  className={`group relative bg-background border ${meta.borderClass} rounded-3xl p-8 transition-all hover:border-opacity-50 hover:shadow-xl`}
                >
                  {/* Gradient glow on hover */}
                  <div className={`absolute inset-0 ${meta.bgClass} opacity-0 group-hover:opacity-100 rounded-3xl transition-opacity blur-xl -z-10`} />

                  <div className="flex flex-col items-center text-center">
                    <AgentAvatar agent={agent.type} size="xl" state="idle" className="mb-6" />

                    <h3 className={`text-2xl font-bold ${meta.textClass} mb-2`}>
                      {meta.name}
                    </h3>
                    <p className="text-foreground-muted text-sm mb-6">
                      {meta.subtitle}
                    </p>

                    <ul className="space-y-3 text-left w-full">
                      {agent.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-3">
                          <span className={`w-1.5 h-1.5 rounded-full ${meta.bgClass.replace('/10', '')}`} />
                          <span className="text-foreground-muted text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Coach-Member Connection Section */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left - Visual: Phone Mockup with Carousel */}
            <PhoneCarousel />

            {/* Right - Content */}
            <div className="order-1 lg:order-2">
              <span className="inline-block px-4 py-1.5 bg-accent/10 border border-accent/20 rounded-full text-sm font-medium text-accent mb-6">
                Trener-Član Konekcija
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
                Personalizovana podrška za svakog člana
              </h2>
              <p className="text-lg text-foreground-muted mb-10">
                Članovi biraju svog trenera, a treneri programiraju AI za svakog člana,
                prate napredak i šalju dnevne podsticaje.
              </p>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {coachFeatures.map((feature, index) => (
                  <div
                    key={index}
                    className="bg-background-secondary/50 border border-white/5 rounded-2xl p-4 hover:border-accent/20 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent mb-3">
                      {feature.icon}
                    </div>
                    <h4 className="font-semibold text-foreground text-sm mb-1">{feature.title}</h4>
                    <p className="text-xs text-foreground-muted">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recipes Section */}
      <section className="py-24 bg-background-secondary relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left - Content */}
            <div>
              <span className="inline-block px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-sm font-medium text-emerald-400 mb-6">
                Zajednički recepti
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
                Članovi dele, svi koriste
              </h2>
              <p className="text-lg text-foreground-muted mb-10">
                Članovi dele svoje omiljene recepte sa celom teretanom. Zdrava ishrana postaje
                zajednički poduhvat.
              </p>

              <div className="space-y-6">
                {recipeFeatures.map((feature, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-2xl flex-shrink-0">
                      {feature.icon}
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">{feature.title}</h4>
                      <p className="text-foreground-muted">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right - Visual */}
            <div className="relative">
              <div className="bg-background border border-white/5 rounded-3xl p-6 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-foreground">Recepti članova</h3>
                  <span className="text-xs text-foreground-muted bg-white/5 px-3 py-1 rounded-full">12 podeljenih</span>
                </div>

                {/* Recipe cards */}
                <div className="space-y-3">
                  {[
                    { name: "Proteinski smoothie", author: "Marko P.", kcal: 320, protein: 35 },
                    { name: "Piletina sa povrćem", author: "Ana M.", kcal: 450, protein: 42 },
                    { name: "Overnight oats", author: "Stefan K.", kcal: 380, protein: 18 },
                  ].map((recipe, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-white/5 rounded-xl p-4 border border-white/5 hover:border-emerald-500/20 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                          <span className="text-lg">🍽️</span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">{recipe.name}</p>
                          <p className="text-xs text-foreground-muted">od {recipe.author} · {recipe.kcal} kcal</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-emerald-400 font-medium text-sm">{recipe.protein}g</span>
                        <p className="text-xs text-foreground-muted">protein</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Share button */}
                <button className="w-full mt-4 py-3 border border-dashed border-white/20 rounded-xl text-foreground-muted text-sm hover:border-emerald-500/50 hover:text-emerald-400 transition-colors">
                  + Podeli svoj recept
                </button>
              </div>

              {/* Floating badge */}
              <div className="absolute -bottom-4 -right-4 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl px-4 py-2 backdrop-blur">
                <span className="text-emerald-400 font-medium text-sm">Zajednica koja deli</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 relative">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent/10 rounded-full blur-[128px]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-4 py-1.5 bg-accent/10 border border-accent/20 rounded-full text-sm font-medium text-accent mb-6">
              Paketi i cene
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
              Izaberite paket za vašu teretanu
            </h2>
            <p className="mt-6 text-lg text-foreground-muted">
              Tri paketa prilagođena različitim veličinama i potrebama teretana.
              Bez dugoročnih ugovora.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {pricingTiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative bg-background border rounded-3xl overflow-hidden transition-all ${
                  tier.popular
                    ? "border-accent shadow-xl shadow-accent/10 scale-105 z-10"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                {/* Popular badge */}
                {tier.popular && (
                  <div className="absolute top-0 left-0 right-0 bg-accent text-white text-center py-2 text-sm font-medium">
                    Najpopularnije
                  </div>
                )}

                {/* Header */}
                <div className={`p-8 text-center ${tier.popular ? "pt-14" : ""}`}>
                  <h3 className={`text-2xl font-bold mb-2 ${
                    tier.color === "accent" ? "text-accent" :
                    tier.color === "amber" ? "text-amber-400" : "text-foreground"
                  }`}>
                    {tier.name}
                  </h3>
                  <p className="text-sm text-foreground-muted mb-6">{tier.description}</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-bold text-foreground">{tier.price}</span>
                    <span className="text-xl text-foreground-muted">€</span>
                  </div>
                  <p className="text-foreground-muted text-sm mt-1">mesečno</p>
                </div>

                {/* Features */}
                <div className="p-8 pt-0">
                  <ul className="space-y-3">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-foreground text-sm">{feature}</span>
                      </li>
                    ))}
                    {tier.notIncluded.map((feature, index) => (
                      <li key={`not-${index}`} className="flex items-start gap-3 opacity-50">
                        <div className="w-5 h-5 rounded-full bg-foreground-muted/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-3 h-3 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                        <span className="text-foreground-muted text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/gym-portal/gym-signup"
                    className={`mt-8 w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold rounded-xl transition-all ${
                      tier.popular
                        ? "bg-accent hover:bg-accent/90 text-white hover:shadow-lg hover:shadow-accent/25"
                        : "bg-white/5 hover:bg-white/10 text-foreground border border-white/10"
                    }`}
                  >
                    Započni sa {tier.name}
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-foreground-muted text-sm mt-12">
            Svi paketi uključuju besplatnu tehničku podršku i mogućnost prelaska na viši paket u bilo kom trenutku.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-background-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative bg-gradient-to-br from-accent/20 via-background to-emerald-500/10 border border-white/10 rounded-3xl p-12 sm:p-16 overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/20 rounded-full blur-[80px]" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/20 rounded-full blur-[60px]" />

            <div className="relative text-center max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
                Spremni za digitalnu transformaciju?
              </h2>
              <p className="text-lg text-foreground-muted mb-10">
                Pridružite se teretanama koje već koriste Classic Method da pruže
                bolju uslugu svojim članovima.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/gym-portal/gym-signup"
                  className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold bg-accent hover:bg-accent/90 text-white rounded-xl transition-all hover:shadow-lg hover:shadow-accent/25"
                >
                  Započnite sada
                  <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <a
                  href="mailto:podrska@classicmethod.rs"
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-foreground hover:text-accent transition-colors"
                >
                  Imate pitanja? Kontaktirajte nas
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-auto py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                <span className="text-sm font-bold text-accent">C</span>
              </div>
              <span className="text-sm text-foreground-muted">
                Classic Method &copy; {new Date().getFullYear()}
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-foreground-muted">
              <Link href="/login" className="hover:text-foreground transition-colors">
                Clan? Uloguj se
              </Link>
              <Link href="/staff-login" className="hover:text-foreground transition-colors">
                Osoblje? Uloguj se
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
