import Link from "next/link";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

async function getGymData() {
  // Get the first gym (single-gym deployment)
  const gym = await prisma.gym.findFirst({
    select: {
      id: true,
      name: true,
      logo: true,
      about: true,
      address: true,
      phone: true,
      openingHours: true,
      primaryColor: true,
      _count: {
        select: {
          members: true,
        },
      },
    },
  });

  if (!gym) return null;

  // Get trainers who should appear on website (lowercase "coach")
  const trainers = await prisma.staff.findMany({
    where: {
      gymId: gym.id,
      role: { in: ["coach", "COACH"] }, // Support both cases
      showOnWebsite: true,
    },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      bio: true,
      specialty: true,
    },
    orderBy: { name: "asc" },
  });

  return { gym, trainers };
}

// Placeholder gallery images (gym can customize these later)
const galleryImages = [
  { id: 1, placeholder: "Trening zona", icon: "dumbbell" },
  { id: 2, placeholder: "Kardio oprema", icon: "heart" },
  { id: 3, placeholder: "Grupni treninzi", icon: "users" },
  { id: 4, placeholder: "Svlacionice", icon: "locker" },
];

export default async function GymPortalPage() {
  // Check if user is logged in as staff
  const session = await getSession();

  // If logged in as staff, redirect to manage dashboard
  if (session && session.userType === "staff") {
    redirect("/gym-portal/manage");
  }

  const data = await getGymData();

  // If no gym exists yet, show setup message
  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Teretana nije podesena</h1>
          <p className="text-foreground-muted mb-6">Kontaktirajte administratora da podesi teretanu.</p>
          <Link
            href="/gym-portal/gym-signup"
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent/90 text-white font-medium rounded-xl transition-colors"
          >
            Registruj teretanu
          </Link>
        </div>
      </div>
    );
  }

  const { gym, trainers } = data;
  const accentColor = gym.primaryColor || "#ef4444";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="mx-4 sm:mx-6 lg:mx-8 mt-4">
          <div className="max-w-7xl mx-auto bg-background-secondary/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-lg shadow-black/5">
            <div className="flex items-center justify-between h-16 px-4 sm:px-6">
              {/* Logo */}
              <a href="#" className="flex items-center gap-3 group">
                {gym.logo ? (
                  <img
                    src={gym.logo}
                    alt={gym.name}
                    className="w-10 h-10 rounded-xl object-cover ring-2 ring-white/10 group-hover:ring-white/20 transition-all"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center ring-2 ring-white/10 group-hover:ring-white/20 transition-all"
                    style={{ backgroundColor: accentColor }}
                  >
                    <span className="text-xl font-bold text-white">
                      {gym.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="text-lg font-semibold text-foreground hidden sm:block">{gym.name}</span>
              </a>

              {/* Center Nav */}
              <nav className="hidden lg:flex items-center">
                <div className="flex items-center bg-white/5 rounded-xl p-1">
                  {trainers.length > 0 && (
                    <a
                      href="#trainers"
                      className="text-sm text-foreground-muted hover:text-foreground hover:bg-white/10 px-4 py-2 rounded-lg transition-all"
                    >
                      Treneri
                    </a>
                  )}
                  <a
                    href="#features"
                    className="text-sm text-foreground-muted hover:text-foreground hover:bg-white/10 px-4 py-2 rounded-lg transition-all"
                  >
                    Sta nudimo
                  </a>
                  <a
                    href="#gallery"
                    className="text-sm text-foreground-muted hover:text-foreground hover:bg-white/10 px-4 py-2 rounded-lg transition-all"
                  >
                    Galerija
                  </a>
                  <a
                    href="#contact"
                    className="text-sm text-foreground-muted hover:text-foreground hover:bg-white/10 px-4 py-2 rounded-lg transition-all"
                  >
                    Kontakt
                  </a>
                </div>
              </nav>

              {/* Right Actions */}
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  href="/login"
                  className="text-sm font-medium text-foreground-muted hover:text-foreground px-4 py-2 rounded-xl hover:bg-white/5 transition-all hidden sm:inline-flex"
                >
                  Prijava
                </Link>
                <a
                  href="#contact"
                  className="group relative text-sm font-semibold text-white px-5 py-2.5 rounded-xl transition-all overflow-hidden"
                  style={{ backgroundColor: accentColor }}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Postani clan
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}dd 100%)` }}
                  />
                </a>

                {/* Mobile menu button */}
                <button
                  className="lg:hidden p-2 rounded-xl hover:bg-white/10 transition-colors text-foreground-muted hover:text-foreground"
                  aria-label="Meni"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-24" />

      {/* Hero Section - Full Width with Gradient */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div
            className="absolute top-0 left-1/4 w-[800px] h-[800px] rounded-full blur-[150px] opacity-20 animate-pulse"
            style={{ backgroundColor: accentColor }}
          />
          <div
            className="absolute bottom-0 right-1/4 w-[600px] h-[600px] rounded-full blur-[120px] opacity-10"
            style={{ backgroundColor: accentColor }}
          />
          <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[80px]" />
        </div>

        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left">
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 border"
                style={{ backgroundColor: `${accentColor}10`, borderColor: `${accentColor}30` }}
              >
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
                <span className="text-sm font-medium" style={{ color: accentColor }}>
                  {gym._count.members}+ aktivnih clanova
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground leading-[1.1] tracking-tight">
                Dobrodosli u
                <br />
                <span style={{ color: accentColor }}>{gym.name}</span>
              </h1>

              {gym.about ? (
                <p className="mt-6 text-lg sm:text-xl text-foreground-muted leading-relaxed max-w-xl mx-auto lg:mx-0">
                  {gym.about}
                </p>
              ) : (
                <p className="mt-6 text-lg sm:text-xl text-foreground-muted leading-relaxed max-w-xl mx-auto lg:mx-0">
                  Vasa destinacija za fitness i zdravlje. Pridruzi nam se i pocni svoje putovanje
                  ka boljem zdravlju danas.
                </p>
              )}

              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <a
                  href="#contact"
                  className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold text-white rounded-xl transition-all hover:shadow-xl"
                  style={{ backgroundColor: accentColor, boxShadow: `0 10px 40px -10px ${accentColor}80` }}
                >
                  Postani clan
                  <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </a>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-foreground rounded-xl transition-colors border border-white/10 hover:bg-white/5"
                >
                  Vec sam clan
                </Link>
              </div>
            </div>

            {/* Right - Bento Grid Feature Showcase */}
            <div className="hidden lg:block relative">
              {/* Decorative ring */}
              <div
                className="absolute -top-8 -right-8 w-64 h-64 rounded-full border opacity-20"
                style={{ borderColor: accentColor }}
              />
              <div
                className="absolute -top-4 -right-4 w-48 h-48 rounded-full border opacity-10"
                style={{ borderColor: accentColor }}
              />

              <div className="grid grid-cols-3 gap-3">
                {/* Large card - Members */}
                <div className="col-span-2 row-span-2 bg-gradient-to-br from-background-secondary/80 to-background-secondary/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-white/20 transition-all group relative overflow-hidden">
                  <div
                    className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] opacity-30 group-hover:opacity-50 transition-opacity"
                    style={{ backgroundColor: accentColor }}
                  />
                  <div className="relative">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                      style={{ backgroundColor: `${accentColor}20` }}
                    >
                      <svg className="w-7 h-7" style={{ color: accentColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                      </svg>
                    </div>
                    <div className="text-5xl font-bold text-foreground mb-2">{gym._count.members}+</div>
                    <div className="text-lg text-foreground-muted">Aktivnih clanova</div>
                    <p className="text-sm text-foreground-muted/60 mt-2">Zajednica koja raste svaki dan</p>
                  </div>
                </div>

                {/* Trainers card */}
                <div className="bg-gradient-to-br from-background-secondary/80 to-background-secondary/40 backdrop-blur-xl border border-white/10 rounded-3xl p-5 hover:border-white/20 transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 rounded-full blur-[30px] opacity-30 bg-blue-500 group-hover:opacity-50 transition-opacity" />
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center mb-3">
                      <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
                      </svg>
                    </div>
                    <div className="text-2xl font-bold text-foreground">{trainers.length}</div>
                    <div className="text-sm text-foreground-muted">Trenera</div>
                  </div>
                </div>

                {/* AI card */}
                <div className="bg-gradient-to-br from-background-secondary/80 to-background-secondary/40 backdrop-blur-xl border border-white/10 rounded-3xl p-5 hover:border-white/20 transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 rounded-full blur-[30px] opacity-30 bg-violet-500 group-hover:opacity-50 transition-opacity" />
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center mb-3">
                      <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                      </svg>
                    </div>
                    <div className="text-2xl font-bold text-foreground">AI</div>
                    <div className="text-sm text-foreground-muted">Asistenti</div>
                  </div>
                </div>

                {/* Wide card - Features */}
                <div className="col-span-3 bg-gradient-to-r from-background-secondary/80 via-background-secondary/60 to-background-secondary/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 hover:border-white/20 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center"
                        style={{ backgroundColor: `${accentColor}20` }}
                      >
                        <svg className="w-6 h-6" style={{ color: accentColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                        </svg>
                      </div>
                      <div className="text-lg font-semibold text-foreground">Sve na jednom mestu</div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        Ishrana
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        Treninzi
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        Napredak
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator - clickable */}
        <a
          href={trainers.length > 0 ? "#trainers" : "#features"}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce p-2 rounded-full hover:bg-white/5 transition-colors cursor-pointer"
          aria-label="Skroluj dole"
        >
          <svg className="w-6 h-6 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </a>
      </section>

      {/* Trainers Section */}
      {trainers.length > 0 && (
        <section id="trainers" className="py-24 bg-background-secondary relative overflow-hidden">
          {/* Background decorations */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[150px] opacity-10" style={{ backgroundColor: accentColor }} />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[120px] opacity-10 bg-blue-500" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Section Header */}
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-16">
              <div className="max-w-2xl">
                <span
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6 border backdrop-blur-sm"
                  style={{ backgroundColor: `${accentColor}10`, borderColor: `${accentColor}30`, color: accentColor }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                  Nas Tim
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
                  Upoznajte nase
                  <span className="block" style={{ color: accentColor }}>strucne trenere</span>
                </h2>
              </div>
              <p className="text-lg text-foreground-muted max-w-md lg:text-right">
                Posveceni profesionalci sa godinama iskustva spremni da vas vode ka uspehu
              </p>
            </div>

            {/* Trainers Grid - Show first 4, with "View all" if more */}
            <div className="grid md:grid-cols-2 gap-6">
              {trainers.slice(0, 4).map((trainer, index) => (
                <div
                  key={trainer.id}
                  className="group relative bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden hover:border-white/20 transition-all duration-500"
                >
                  <div className="flex flex-col sm:flex-row">
                    {/* Image Section */}
                    <div className="relative sm:w-48 lg:w-56 flex-shrink-0">
                      <div className="aspect-square sm:aspect-auto sm:h-full">
                        {trainer.avatarUrl ? (
                          <img
                            src={trainer.avatarUrl}
                            alt={trainer.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center min-h-[200px]"
                            style={{ background: `linear-gradient(135deg, ${accentColor}30 0%, ${accentColor}10 100%)` }}
                          >
                            <span className="text-6xl font-bold" style={{ color: accentColor }}>
                              {trainer.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Overlay gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-background/80 via-transparent to-transparent sm:from-transparent sm:via-transparent sm:to-background/80" />

                      {/* Index number */}
                      <div
                        className="absolute top-4 left-4 w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold text-white/90 backdrop-blur-sm"
                        style={{ backgroundColor: `${accentColor}80` }}
                      >
                        {String(index + 1).padStart(2, '0')}
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 p-6 lg:p-8 flex flex-col justify-center">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <h3 className="text-xl lg:text-2xl font-bold text-foreground group-hover:text-white transition-colors">
                          {trainer.name}
                        </h3>
                        <div
                          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0"
                          style={{ backgroundColor: accentColor }}
                        >
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </div>
                      </div>

                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium w-fit mb-4"
                        style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        </svg>
                        {trainer.specialty || "Licni trener"}
                      </span>

                      {trainer.bio ? (
                        <p className="text-foreground-muted text-sm leading-relaxed line-clamp-3">
                          {trainer.bio}
                        </p>
                      ) : (
                        <p className="text-foreground-muted text-sm leading-relaxed">
                          Posvecen pomoci clanovima da ostvare svoje fitness ciljeve kroz personalizovane treninge i strucno vodstvo.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Hover glow effect */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at 30% 50%, ${accentColor}10 0%, transparent 50%)`
                    }}
                  />
                </div>
              ))}

              {/* "View all" card if more than 4 trainers */}
              {trainers.length > 4 && (
                <div className="group relative bg-gradient-to-br from-background/60 to-background/30 backdrop-blur-xl border border-dashed border-white/20 rounded-3xl overflow-hidden hover:border-white/40 transition-all duration-500 flex items-center justify-center min-h-[200px] cursor-pointer">
                  <div className="text-center p-8">
                    {/* Stacked avatars preview */}
                    <div className="flex justify-center -space-x-3 mb-4">
                      {trainers.slice(4, 8).map((trainer, i) => (
                        <div
                          key={trainer.id}
                          className="w-12 h-12 rounded-full border-2 border-background overflow-hidden"
                          style={{ zIndex: 10 - i }}
                        >
                          {trainer.avatarUrl ? (
                            <img src={trainer.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center text-sm font-bold"
                              style={{ background: `linear-gradient(135deg, ${accentColor}40 0%, ${accentColor}20 100%)`, color: accentColor }}
                            >
                              {trainer.name.charAt(0)}
                            </div>
                          )}
                        </div>
                      ))}
                      {trainers.length > 8 && (
                        <div
                          className="w-12 h-12 rounded-full border-2 border-background flex items-center justify-center text-sm font-bold backdrop-blur-sm"
                          style={{ backgroundColor: `${accentColor}30`, color: accentColor }}
                        >
                          +{trainers.length - 8}
                        </div>
                      )}
                    </div>
                    <p className="text-foreground-muted text-sm mb-3">
                      Jos {trainers.length - 4} trenera
                    </p>
                    <span
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-medium text-sm transition-all group-hover:shadow-lg"
                      style={{ backgroundColor: accentColor }}
                    >
                      Pogledaj sve
                      <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  </div>

                  {/* Hover glow */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ background: `radial-gradient(circle at center, ${accentColor}10 0%, transparent 70%)` }}
                  />
                </div>
              )}
            </div>

            {/* Bottom CTA */}
            <div className="mt-12 text-center">
              <p className="text-foreground-muted mb-4">
                Zainteresovani za licni trening?
              </p>
              <a
                href="#contact"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-medium transition-all hover:shadow-lg"
                style={{ backgroundColor: accentColor, boxShadow: `0 4px 20px -4px ${accentColor}60` }}
              >
                Zakazi besplatne konsultacije
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section id="features" className="py-24 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-1/2 left-0 w-[600px] h-[600px] rounded-full blur-[150px] opacity-10 -translate-y-1/2" style={{ backgroundColor: accentColor }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header - Split layout */}
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-16">
            <div className="max-w-2xl">
              <span
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6 border backdrop-blur-sm"
                style={{ backgroundColor: `${accentColor}10`, borderColor: `${accentColor}30`, color: accentColor }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                Benefiti
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
                Sve sto vam treba
                <span className="block" style={{ color: accentColor }}>na jednom mestu</span>
              </h2>
            </div>
            <p className="text-lg text-foreground-muted max-w-md lg:text-right">
              Kompletna platforma za fitness sa AI podrskom, pracenjem napretka i strucnim vodjstvom
            </p>
          </div>

          {/* Bento Grid - 3 columns, properly filled */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Row 1: AI Assistants (2 cols) + Personal Trainer (1 col) */}
            {/* Feature 1 - AI Assistants (Large) */}
            <div className="md:col-span-2 group relative bg-gradient-to-br from-background-secondary/80 to-background-secondary/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 lg:p-10 hover:border-white/20 transition-all overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-[80px] opacity-20 bg-violet-500 group-hover:opacity-30 transition-opacity" />
              <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-violet-500/20 flex items-center justify-center">
                    <svg className="w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl lg:text-2xl font-bold text-foreground">AI Asistenti</h3>
                    <span className="text-xs font-medium text-violet-400 bg-violet-500/20 px-2 py-1 rounded-md">24/7</span>
                  </div>
                  <p className="text-foreground-muted leading-relaxed mb-4">
                    Tri specijalizovana AI asistenta za ishranu, suplemente i trening. Dobijte personalizovane savete bilo kada.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-foreground-muted bg-white/5 px-3 py-1.5 rounded-full">Nutricionista</span>
                    <span className="text-xs text-foreground-muted bg-white/5 px-3 py-1.5 rounded-full">Trener</span>
                    <span className="text-xs text-foreground-muted bg-white/5 px-3 py-1.5 rounded-full">Suplementi</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 2 - Personal Trainer */}
            <div className="group relative bg-gradient-to-br from-background-secondary/80 to-background-secondary/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-white/20 transition-all overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] opacity-20 bg-blue-500 group-hover:opacity-30 transition-opacity" />
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-5">
                  <svg className="w-7 h-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Licni Trener</h3>
                <p className="text-foreground-muted text-sm leading-relaxed">
                  Izaberite trenera koji ce pratiti vas napredak i kreirati personalizovane planove.
                </p>
              </div>
            </div>

            {/* Row 2: Progress + Nutrition + Challenges (3 x 1 col) */}
            {/* Feature 3 - Progress Tracking */}
            <div className="group relative bg-gradient-to-br from-background-secondary/80 to-background-secondary/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-white/20 transition-all overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] opacity-20 bg-emerald-500 group-hover:opacity-30 transition-opacity" />
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-5">
                  <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Pracenje Napretka</h3>
                <p className="text-foreground-muted text-sm leading-relaxed">
                  Belezite obroke, treninge i pratite transformaciju sa detaljnom statistikom.
                </p>
              </div>
            </div>

            {/* Feature 4 - Nutrition */}
            <div className="group relative bg-gradient-to-br from-background-secondary/80 to-background-secondary/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-white/20 transition-all overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] opacity-20 bg-orange-500 group-hover:opacity-30 transition-opacity" />
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-orange-500/20 flex items-center justify-center mb-5">
                  <svg className="w-7 h-7 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.125-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265zm-3 0a.375.375 0 11-.53 0L9 2.845l.265.265zm6 0a.375.375 0 11-.53 0L15 2.845l.265.265z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Planovi Ishrane</h3>
                <p className="text-foreground-muted text-sm leading-relaxed">
                  Personalizovani planovi prilagodeni vasim ciljevima i preferencijama.
                </p>
              </div>
            </div>

            {/* Feature 5 - Challenges */}
            <div className="group relative bg-gradient-to-br from-background-secondary/80 to-background-secondary/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-white/20 transition-all overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] opacity-20" style={{ backgroundColor: accentColor }} />
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ backgroundColor: `${accentColor}20` }}>
                  <svg className="w-7 h-7" style={{ color: accentColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Mesecni Izazovi</h3>
                <p className="text-foreground-muted text-sm leading-relaxed">
                  Ucestvujte u izazovima, osvojite nagrade i podignite motivaciju.
                </p>
              </div>
            </div>

            {/* Row 3: Community (full width - 3 cols) */}
            <div className="md:col-span-2 lg:col-span-3 group relative bg-gradient-to-r from-background-secondary/80 via-background-secondary/60 to-background-secondary/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-white/20 transition-all overflow-hidden">
              <div className="absolute bottom-0 left-1/4 w-64 h-64 rounded-full blur-[100px] opacity-10 bg-pink-500" />
              <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
                <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-pink-500/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-2">Aktivna Zajednica</h3>
                  <p className="text-foreground-muted leading-relaxed">
                    Delite recepte, motiviste se zajedno sa drugim clanovima i pratite njihov napredak. Zajednica koja vas podrzava na svakom koraku.
                  </p>
                </div>
                <div className="flex -space-x-2 flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 border-2 border-background flex items-center justify-center text-white text-xs font-bold">JM</div>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 border-2 border-background flex items-center justify-center text-white text-xs font-bold">AP</div>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-background flex items-center justify-center text-white text-xs font-bold">NK</div>
                  <div className="w-10 h-10 rounded-full bg-white/10 border-2 border-background flex items-center justify-center text-foreground-muted text-xs font-medium">+{gym._count.members > 99 ? "99" : gym._count.members}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section id="gallery" className="py-24 bg-background-secondary relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute top-0 left-0 w-[400px] h-[400px] rounded-full blur-[150px] opacity-10" style={{ backgroundColor: accentColor }} />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] rounded-full blur-[100px] opacity-10 bg-blue-500" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header - Split layout */}
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-16">
            <div className="max-w-2xl">
              <span
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6 border backdrop-blur-sm"
                style={{ backgroundColor: `${accentColor}10`, borderColor: `${accentColor}30`, color: accentColor }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                Galerija
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
                Pogledajte nas
                <span className="block" style={{ color: accentColor }}>moderni prostor</span>
              </h2>
            </div>
            <p className="text-lg text-foreground-muted max-w-md lg:text-right">
              Vrhunska oprema i ugodna atmosfera za vase najbolje treninge
            </p>
          </div>

          {/* Bento Gallery Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {/* Large featured tile */}
            <div className="col-span-2 row-span-2 aspect-square group relative overflow-hidden rounded-3xl bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all">
              <div
                className="absolute inset-0 opacity-20"
                style={{ background: `linear-gradient(135deg, ${accentColor}30 0%, transparent 50%, ${accentColor}10 100%)` }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-8">
                  <div
                    className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: `${accentColor}20` }}
                  >
                    <svg className="w-10 h-10" style={{ color: accentColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">Trening Zona</h3>
                  <p className="text-foreground-muted">Prostrana zona sa premium opremom</p>
                </div>
              </div>
              {/* Decorative elements */}
              <div className="absolute top-4 left-4 w-8 h-8 rounded-full border border-white/10" />
              <div className="absolute bottom-4 right-4 w-6 h-6 rounded-full border border-white/10" />
            </div>

            {/* Cardio tile */}
            <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all aspect-square">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-4">
                  <div className="w-14 h-14 rounded-2xl bg-rose-500/20 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <svg className="w-7 h-7 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-foreground text-sm">Kardio</h3>
                </div>
              </div>
            </div>

            {/* Free weights tile */}
            <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all aspect-square">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <svg className="w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-foreground text-sm">Slobodni Tegovi</h3>
                </div>
              </div>
            </div>

            {/* Group classes tile */}
            <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all aspect-square">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-4">
                  <div className="w-14 h-14 rounded-2xl bg-violet-500/20 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <svg className="w-7 h-7 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-foreground text-sm">Grupni Treninzi</h3>
                </div>
              </div>
            </div>

            {/* Locker rooms tile */}
            <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all aspect-square">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-4">
                  <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <svg className="w-7 h-7 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-foreground text-sm">Svlacionice</h3>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Contact/Info Section */}
      {(gym.address || gym.phone || gym.openingHours) && (
        <section id="contact" className="py-24 relative overflow-hidden">
          {/* Background decorations */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[150px] opacity-10" style={{ backgroundColor: accentColor }} />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[120px] opacity-10 bg-emerald-500" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Section Header - Split layout */}
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-16">
              <div className="max-w-2xl">
                <span
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6 border backdrop-blur-sm"
                  style={{ backgroundColor: `${accentColor}10`, borderColor: `${accentColor}30`, color: accentColor }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  Kontakt
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
                  Posetite nas
                  <span className="block" style={{ color: accentColor }}>uzivo</span>
                </h2>
              </div>
              <p className="text-lg text-foreground-muted max-w-md lg:text-right">
                Spremni smo da vas docekamo i pomognemo da zapocnete svoje fitness putovanje
              </p>
            </div>

            {/* Contact Cards */}
            <div className="grid md:grid-cols-3 gap-4">
              {gym.address && (
                <div className="group relative bg-gradient-to-br from-background-secondary/80 to-background-secondary/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-white/20 transition-all overflow-hidden text-center">
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] opacity-20 bg-emerald-500 group-hover:opacity-30 transition-opacity" />
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-5 mx-auto">
                      <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-3">Adresa</h3>
                    <p className="text-foreground-muted leading-relaxed">{gym.address}</p>
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(gym.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-emerald-400 mt-4 group-hover:gap-3 transition-all"
                    >
                      Pogledaj na mapi
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                    </a>
                  </div>
                </div>
              )}

              {gym.phone && (
                <div className="group relative bg-gradient-to-br from-background-secondary/80 to-background-secondary/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-white/20 transition-all overflow-hidden text-center">
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] opacity-20 bg-blue-500 group-hover:opacity-30 transition-opacity" />
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-5 mx-auto">
                      <svg className="w-7 h-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-3">Telefon</h3>
                    <p className="text-foreground-muted leading-relaxed">{gym.phone}</p>
                    <a
                      href={`tel:${gym.phone.replace(/\s/g, '')}`}
                      className="inline-flex items-center gap-2 text-sm font-medium text-blue-400 mt-4 group-hover:gap-3 transition-all"
                    >
                      Pozovi odmah
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </a>
                  </div>
                </div>
              )}

              {gym.openingHours && (
                <div className="group relative bg-gradient-to-br from-background-secondary/80 to-background-secondary/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-white/20 transition-all overflow-hidden text-center">
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] opacity-20" style={{ backgroundColor: accentColor }} />
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 mx-auto" style={{ backgroundColor: `${accentColor}20` }}>
                      <svg className="w-7 h-7" style={{ color: accentColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-3">Radno vreme</h3>
                    <p className="text-foreground-muted leading-relaxed whitespace-pre-line">{gym.openingHours}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-24 bg-background-secondary relative overflow-hidden">
        {/* Animated background elements */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[200px] opacity-20 animate-pulse"
          style={{ backgroundColor: accentColor }}
        />
        <div className="absolute top-0 left-0 w-[400px] h-[400px] rounded-full blur-[150px] opacity-10 bg-blue-500" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full blur-[150px] opacity-10 bg-violet-500" />

        {/* Decorative grid */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-background/60 to-background/30 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 md:p-12 lg:p-16 overflow-hidden relative">
            {/* Inner glow */}
            <div
              className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] opacity-20"
              style={{ backgroundColor: accentColor }}
            />

            <div className="relative text-center">
              {/* Badge */}
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-8 border"
                style={{ backgroundColor: `${accentColor}10`, borderColor: `${accentColor}30`, color: accentColor }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                </svg>
                Zapocni danas
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground mb-6 leading-tight">
                Spremni ste da<br />
                <span style={{ color: accentColor }}>transformisete sebe?</span>
              </h2>

              <p className="text-lg sm:text-xl text-foreground-muted mb-10 max-w-2xl mx-auto leading-relaxed">
                Pridruzi se zajednici od <span className="font-semibold text-foreground">{gym._count.members}+ aktivnih clanova</span> i zapocni svoje fitness putovanje danas.
              </p>

              {/* CTA Button */}
              <div className="flex justify-center">
                <a
                  href="#contact"
                  className="group inline-flex items-center justify-center gap-3 px-10 py-5 text-lg font-semibold text-white rounded-2xl transition-all hover:shadow-2xl hover:scale-[1.02]"
                  style={{ backgroundColor: accentColor, boxShadow: `0 20px 60px -15px ${accentColor}80` }}
                >
                  Postani clan danas
                  <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </a>
              </div>

              {/* Trust indicators */}
              <div className="mt-12 pt-8 border-t border-white/5">
                <div className="flex flex-wrap justify-center gap-6 sm:gap-10 text-sm text-foreground-muted">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    Bez ugovora
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    Pristup AI asistentima
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    Kompletna platforma
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative bg-background border-t border-white/5">
        {/* Top section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
            {/* Brand column */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                {gym.logo ? (
                  <img
                    src={gym.logo}
                    alt={gym.name}
                    className="w-12 h-12 rounded-xl object-cover"
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${accentColor}20` }}
                  >
                    <span className="text-xl font-bold" style={{ color: accentColor }}>
                      {gym.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="text-xl font-bold text-foreground">{gym.name}</span>
              </div>
              <p className="text-foreground-muted leading-relaxed max-w-md mb-6">
                {gym.about || "Vasa destinacija za fitness i zdravlje. Moderna oprema, strucni treneri i AI podrska za vase ciljeve."}
              </p>
              {/* Social links placeholder */}
              <div className="flex items-center gap-3">
                <a
                  href="#"
                  className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-foreground-muted hover:bg-white/10 hover:text-foreground transition-all"
                  aria-label="Instagram"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a
                  href="#"
                  className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-foreground-muted hover:bg-white/10 hover:text-foreground transition-all"
                  aria-label="Facebook"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a
                  href="#"
                  className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-foreground-muted hover:bg-white/10 hover:text-foreground transition-all"
                  aria-label="TikTok"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Quick links */}
            <div>
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-6">Brzi linkovi</h3>
              <ul className="space-y-4">
                {trainers.length > 0 && (
                  <li>
                    <a href="#trainers" className="text-foreground-muted hover:text-foreground transition-colors">
                      Nasi treneri
                    </a>
                  </li>
                )}
                <li>
                  <a href="#features" className="text-foreground-muted hover:text-foreground transition-colors">
                    Sta nudimo
                  </a>
                </li>
                <li>
                  <a href="#gallery" className="text-foreground-muted hover:text-foreground transition-colors">
                    Galerija
                  </a>
                </li>
                {(gym.address || gym.phone || gym.openingHours) && (
                  <li>
                    <a href="#contact" className="text-foreground-muted hover:text-foreground transition-colors">
                      Kontakt
                    </a>
                  </li>
                )}
              </ul>
            </div>

            {/* Account links */}
            <div>
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-6">Nalog</h3>
              <ul className="space-y-4">
                <li>
                  <Link href="/login" className="text-foreground-muted hover:text-foreground transition-colors">
                    Prijava za clanove
                  </Link>
                </li>
                <li>
                  <Link href="/staff-login" className="text-foreground-muted hover:text-foreground transition-colors">
                    Prijava za osoblje
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-foreground-muted">
                &copy; {new Date().getFullYear()} {gym.name}. Sva prava zadrzana.
              </p>
              <div className="flex items-center gap-2 text-sm text-foreground-muted">
                <span>Powered by</span>
                <span className="font-semibold text-foreground">Classic AI</span>
                <svg className="w-4 h-4" style={{ color: accentColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
