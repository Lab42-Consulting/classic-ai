"use client";

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
  { value: "∞", label: "Članova" },
  { value: "150€", label: "Mesečno" },
];

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
            {/* Left - Visual */}
            <div className="relative order-2 lg:order-1">
              <div className="bg-gradient-to-br from-accent/10 via-background-secondary to-emerald-500/10 rounded-3xl p-8 border border-white/5">
                {/* Connection visualization */}
                <div className="relative h-[400px]">
                  {/* Coach */}
                  <div className="absolute top-8 left-1/2 -translate-x-1/2 text-center">
                    <div className="w-20 h-20 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center mb-2">
                      <svg className="w-10 h-10 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-accent">Trener</span>
                  </div>

                  {/* Connection lines */}
                  <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
                    <defs>
                      <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgba(239,68,68,0.5)" />
                        <stop offset="100%" stopColor="rgba(239,68,68,0.1)" />
                      </linearGradient>
                    </defs>
                    <line x1="50%" y1="120" x2="25%" y2="280" stroke="url(#lineGradient)" strokeWidth="2" strokeDasharray="6 4" />
                    <line x1="50%" y1="120" x2="50%" y2="280" stroke="url(#lineGradient)" strokeWidth="2" strokeDasharray="6 4" />
                    <line x1="50%" y1="120" x2="75%" y2="280" stroke="url(#lineGradient)" strokeWidth="2" strokeDasharray="6 4" />
                  </svg>

                  {/* Members */}
                  <div className="absolute bottom-8 left-0 right-0 flex justify-around" style={{ zIndex: 1 }}>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="text-center">
                        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-2">
                          <svg className="w-8 h-8 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <span className="text-xs text-foreground-muted">Član {i}</span>
                      </div>
                    ))}
                  </div>

                  {/* Feature badges */}
                  <div className="absolute top-1/2 left-4 transform -translate-y-1/2">
                    <div className="bg-background/80 backdrop-blur border border-white/10 rounded-xl px-3 py-2">
                      <span className="text-xs text-emerald-400">Plan ishrane</span>
                    </div>
                  </div>
                  <div className="absolute top-1/2 right-4 transform -translate-y-1/2">
                    <div className="bg-background/80 backdrop-blur border border-white/10 rounded-xl px-3 py-2">
                      <span className="text-xs text-violet-400">Poruke</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

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
              Jednostavna cena
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
              Sve uključeno. Bez iznenađenja.
            </h2>
          </div>

          <div className="max-w-lg mx-auto">
            <div className="bg-background border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="bg-gradient-to-r from-accent to-orange-500 p-8 text-center">
                <p className="text-white/80 text-sm font-medium mb-2">Mesečna pretplata</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-6xl font-bold text-white">150</span>
                  <span className="text-2xl text-white/80">€</span>
                </div>
                <p className="text-white/60 text-sm mt-2">po teretani / mesečno</p>
              </div>

              {/* Features */}
              <div className="p-8">
                <ul className="space-y-4">
                  {[
                    "Neograničen broj članova",
                    "Neograničen broj trenera",
                    "3 AI asistenta (ishrana, suplementi, trening)",
                    "Programiranje ishrane za članove",
                    "Biblioteka recepata teretane",
                    "Brendiranje aplikacije (logo, boje)",
                    "Praćenje napretka članova",
                    "Analitika i statistika",
                    "Tehnička podrška",
                  ].map((feature, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/gym-portal/gym-signup"
                  className="mt-8 w-full inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold bg-accent hover:bg-accent/90 text-white rounded-xl transition-all hover:shadow-lg hover:shadow-accent/25"
                >
                  Registrujte teretanu
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>

                <p className="text-center text-foreground-muted text-sm mt-4">
                  Bez dugoročnih ugovora. Otkažite kad god želite.
                </p>
              </div>
            </div>
          </div>
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
