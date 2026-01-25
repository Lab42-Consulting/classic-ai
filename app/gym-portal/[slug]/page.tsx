import Link from "next/link";
import prisma from "@/lib/db";
import { notFound } from "next/navigation";
import { MobileMenu, BackToTop } from "../mobile-menu";
import { LocationSwitcher } from "./location-switcher";

// Force dynamic rendering
export const dynamic = "force-dynamic";

interface GalleryImage {
  id: string;
  imageUrl: string;
  caption: string;
}

interface Trainer {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  specialty: string | null;
}

interface SiblingLocation {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
}

async function getLocationData(slug: string) {
  // Get the gym by slug
  const gym = await prisma.gym.findFirst({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      about: true,
      address: true,
      phone: true,
      openingHours: true,
      primaryColor: true,
      galleryImages: true,
      ownerEmail: true,
      _count: {
        select: {
          members: true,
        },
      },
    },
  });

  if (!gym) return null;

  // Get trainers for this location
  const trainersRaw = await prisma.staff.findMany({
    where: {
      gymId: gym.id,
      role: { in: ["coach", "COACH"] },
      showOnWebsite: true,
    },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      bio: true,
      specialty: true,
      linkedMember: {
        select: {
          avatarUrl: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const trainers: Trainer[] = trainersRaw.map((t) => ({
    id: t.id,
    name: t.name,
    avatarUrl: t.avatarUrl || t.linkedMember?.avatarUrl || null,
    bio: t.bio,
    specialty: t.specialty,
  }));

  // Get sibling locations (same owner) for location switcher
  let siblingLocations: SiblingLocation[] = [];
  if (gym.ownerEmail) {
    const siblings = await prisma.gym.findMany({
      where: {
        ownerEmail: gym.ownerEmail,
        slug: { not: null },
        id: { not: gym.id },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
      },
      orderBy: { createdAt: "asc" },
    });
    siblingLocations = siblings.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug!,
      logo: s.logo,
    }));
  }

  // For shared content (about), get from primary gym if this gym doesn't have it
  let sharedAbout = gym.about;
  if (!sharedAbout && gym.ownerEmail) {
    const primaryGym = await prisma.gym.findFirst({
      where: {
        ownerEmail: gym.ownerEmail,
        about: { not: null },
      },
      select: { about: true },
      orderBy: { createdAt: "asc" },
    });
    sharedAbout = primaryGym?.about || null;
  }

  return {
    gym: {
      ...gym,
      about: sharedAbout,
    },
    trainers,
    siblingLocations,
  };
}

export default async function LocationMarketingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getLocationData(slug);

  if (!data) {
    notFound();
  }

  const { gym, trainers, siblingLocations } = data;
  const accentColor = gym.primaryColor || "#ef4444";
  const hasTrainers = trainers.length > 0;
  const hasContact = !!(gym.address || gym.phone || gym.openingHours);
  const galleryImages = (gym.galleryImages as unknown as GalleryImage[]) || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="mx-4 sm:mx-6 lg:mx-8 mt-4">
          <div className="max-w-7xl mx-auto bg-background-secondary/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-lg shadow-black/5">
            <div className="flex items-center justify-between h-16 px-4 sm:px-6">
              {/* Logo + Location Switcher */}
              <div className="flex items-center gap-3">
                {gym.logo ? (
                  <img
                    src={gym.logo}
                    alt={gym.name}
                    className="w-10 h-10 rounded-xl object-cover ring-2 ring-white/10"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center ring-2 ring-white/10"
                    style={{ backgroundColor: accentColor }}
                  >
                    <span className="text-xl font-bold text-white">
                      {gym.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-foreground hidden sm:block">
                    {gym.name}
                  </span>
                  {siblingLocations.length > 0 && (
                    <LocationSwitcher
                      currentLocation={{ name: gym.name, slug: gym.slug!, logo: gym.logo }}
                      siblingLocations={siblingLocations}
                      accentColor={accentColor}
                    />
                  )}
                </div>
              </div>

              {/* Desktop Navigation */}
              <nav className="hidden lg:flex items-center gap-1">
                {hasTrainers && (
                  <a
                    href="#trainers"
                    className="text-sm font-medium text-foreground-muted hover:text-foreground px-4 py-2 rounded-xl hover:bg-white/5 transition-all"
                  >
                    Treneri
                  </a>
                )}
                <a
                  href="#features"
                  className="text-sm font-medium text-foreground-muted hover:text-foreground px-4 py-2 rounded-xl hover:bg-white/5 transition-all"
                >
                  Šta nudimo
                </a>
                {galleryImages.length > 0 && (
                  <a
                    href="#gallery"
                    className="text-sm font-medium text-foreground-muted hover:text-foreground px-4 py-2 rounded-xl hover:bg-white/5 transition-all"
                  >
                    Galerija
                  </a>
                )}
                {hasContact && (
                  <a
                    href="#contact"
                    className="text-sm font-medium text-foreground-muted hover:text-foreground px-4 py-2 rounded-xl hover:bg-white/5 transition-all"
                  >
                    Kontakt
                  </a>
                )}
              </nav>

              {/* Actions */}
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  href="/login"
                  className="hidden sm:flex items-center gap-2 px-5 py-2 rounded-xl text-white font-medium transition-all hover:opacity-90"
                  style={{ backgroundColor: accentColor }}
                >
                  Prijava
                </Link>
                <MobileMenu
                  accentColor={accentColor}
                  hasTrainers={hasTrainers}
                  hasContact={hasContact}
                  gymName={gym.name}
                  gymLogo={gym.logo}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-24 pb-16 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          {/* Primary glow - animated */}
          <div
            className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full blur-[150px] opacity-20 animate-pulse"
            style={{ backgroundColor: accentColor, animationDuration: '4s' }}
          />
          {/* Secondary glow - animated with delay */}
          <div
            className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full blur-[120px] opacity-10 bg-blue-500 animate-pulse"
            style={{ animationDuration: '5s', animationDelay: '1s' }}
          />
          {/* Tertiary accent */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-[100px] opacity-10 animate-pulse"
            style={{ backgroundColor: accentColor, animationDuration: '6s', animationDelay: '2s' }}
          />
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:72px_72px]" />
          {/* Floating particles */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-20 left-[20%] w-2 h-2 rounded-full bg-white/20 animate-float" style={{ animationDelay: '0s' }} />
            <div className="absolute top-40 right-[30%] w-1.5 h-1.5 rounded-full bg-white/15 animate-float" style={{ animationDelay: '1s' }} />
            <div className="absolute bottom-32 left-[40%] w-2.5 h-2.5 rounded-full bg-white/10 animate-float" style={{ animationDelay: '2s' }} />
            <div className="absolute top-[60%] right-[15%] w-1 h-1 rounded-full bg-white/20 animate-float" style={{ animationDelay: '0.5s' }} />
            <div className="absolute top-[30%] left-[10%] w-1.5 h-1.5 rounded-full bg-white/15 animate-float" style={{ animationDelay: '1.5s' }} />
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Column - Text with staggered animations */}
            <div className="text-center lg:text-left animate-fade-in-up">
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 border backdrop-blur-sm animate-fade-in-up"
                style={{ backgroundColor: `${accentColor}10`, borderColor: `${accentColor}30`, animationDelay: '0.1s' }}
              >
                <span className="relative flex h-2 w-2">
                  <span
                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                    style={{ backgroundColor: accentColor }}
                  />
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: accentColor }} />
                </span>
                <span className="text-sm font-medium" style={{ color: accentColor }}>Dobrodošli</span>
              </div>

              <h1
                className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground leading-tight mb-6 animate-fade-in-up"
                style={{ animationDelay: '0.2s' }}
              >
                {gym.name}
              </h1>

              <p
                className="text-lg sm:text-xl text-foreground-muted max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed animate-fade-in-up"
                style={{ animationDelay: '0.3s' }}
              >
                {gym.about || "Vaše mesto za trening, napredak i transformaciju. Pridružite se našoj zajednici i ostvarite svoje fitness ciljeve."}
              </p>

              <div
                className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start animate-fade-in-up"
                style={{ animationDelay: '0.4s' }}
              >
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-8 py-4 rounded-xl text-white font-semibold text-lg transition-all hover:scale-105 hover:shadow-xl flex items-center justify-center gap-2 group"
                  style={{ backgroundColor: accentColor, boxShadow: `0 4px 20px -4px ${accentColor}60` }}
                >
                  Postanite član
                  <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                {hasContact && (
                  <a
                    href="#contact"
                    className="w-full sm:w-auto px-8 py-4 rounded-xl border border-white/10 text-foreground font-semibold text-lg transition-all hover:bg-white/5 hover:border-white/20 hover:scale-105 flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Gde se nalazimo
                  </a>
                )}
              </div>
            </div>

            {/* Right Column - Enhanced Stats Cards */}
            <div className="relative animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              {/* Decorative rings */}
              <div
                className="absolute -top-8 -right-8 w-64 h-64 rounded-full border opacity-20 animate-spin-slow"
                style={{ borderColor: accentColor, animationDuration: '20s' }}
              />
              <div
                className="absolute -bottom-4 -left-4 w-32 h-32 rounded-full border opacity-10 animate-spin-slow"
                style={{ borderColor: accentColor, animationDuration: '15s', animationDirection: 'reverse' }}
              />

              <div className="grid grid-cols-2 gap-4">
                {/* Members Card - Featured */}
                <div className="col-span-2 group relative overflow-hidden">
                  {/* Card glow effect */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
                    style={{ background: `radial-gradient(circle at center, ${accentColor}30 0%, transparent 70%)` }}
                  />
                  <div className="relative bg-gradient-to-br from-background-secondary/90 to-background-secondary/50 backdrop-blur-xl border border-white/10 group-hover:border-white/20 rounded-3xl p-8 transition-all duration-300 group-hover:translate-y-[-2px]">
                    {/* Decorative corner accent */}
                    <div
                      className="absolute top-0 right-0 w-32 h-32 opacity-10"
                      style={{ background: `radial-gradient(circle at top right, ${accentColor} 0%, transparent 70%)` }}
                    />
                    {/* Animated icon background */}
                    <div className="relative">
                      <div
                        className="absolute inset-0 w-14 h-14 rounded-2xl animate-pulse opacity-50"
                        style={{ backgroundColor: accentColor, filter: 'blur(12px)', animationDuration: '3s' }}
                      />
                      <div
                        className="relative w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110"
                        style={{ backgroundColor: `${accentColor}20` }}
                      >
                        <svg className="w-7 h-7" style={{ color: accentColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex items-end gap-2 mb-2">
                      <span className="text-5xl font-bold text-foreground">500</span>
                      <span className="text-2xl font-bold mb-1" style={{ color: accentColor }}>+</span>
                    </div>
                    <div className="text-lg text-foreground-muted">Aktivnih članova</div>
                    {/* Progress bar decoration */}
                    <div className="mt-4 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full animate-pulse"
                        style={{ width: '75%', backgroundColor: accentColor, animationDuration: '2s' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Trainers Card */}
                <div className="group relative overflow-hidden">
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl bg-blue-500/20" />
                  <div className="relative bg-gradient-to-br from-background-secondary/90 to-background-secondary/50 backdrop-blur-xl border border-white/10 group-hover:border-blue-500/30 rounded-3xl p-5 transition-all duration-300 group-hover:translate-y-[-2px] h-full">
                    {/* Decorative gradient */}
                    <div className="absolute top-0 right-0 w-20 h-20 opacity-10 bg-gradient-to-br from-blue-500 to-transparent rounded-bl-full" />
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                        <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
                        </svg>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-foreground">{trainers.length}</div>
                    <div className="text-sm text-foreground-muted">Trenera</div>
                    {/* Mini dots decoration */}
                    <div className="absolute bottom-3 right-3 flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400/40" />
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400/30" />
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400/20" />
                    </div>
                  </div>
                </div>

                {/* AI Card */}
                <div className="group relative overflow-hidden">
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl bg-violet-500/20" />
                  <div className="relative bg-gradient-to-br from-background-secondary/90 to-background-secondary/50 backdrop-blur-xl border border-white/10 group-hover:border-violet-500/30 rounded-3xl p-5 transition-all duration-300 group-hover:translate-y-[-2px] h-full">
                    {/* Decorative gradient */}
                    <div className="absolute top-0 right-0 w-20 h-20 opacity-10 bg-gradient-to-br from-violet-500 to-transparent rounded-bl-full" />
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                        <svg className="w-5 h-5 text-violet-400 animate-pulse" style={{ animationDuration: '3s' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-foreground">AI</span>
                      <span className="text-[10px] font-medium text-violet-400 bg-violet-500/20 px-1.5 py-0.5 rounded">24/7</span>
                    </div>
                    <div className="text-sm text-foreground-muted">Asistenti</div>
                    {/* Sparkle decoration */}
                    <div className="absolute bottom-3 right-3">
                      <svg className="w-4 h-4 text-violet-400/40 animate-pulse" style={{ animationDuration: '2s' }} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <a
          href={hasTrainers ? "#trainers" : "#features"}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce p-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer group"
        >
          <svg className="w-5 h-5 text-foreground-muted group-hover:text-foreground transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </a>
      </section>

      {/* Trainers Section */}
      {hasTrainers && (
        <section id="trainers" className="py-24 bg-background-secondary relative overflow-hidden">
          {/* Animated Background */}
          <div
            className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[150px] opacity-15 animate-pulse"
            style={{ backgroundColor: accentColor, animationDuration: '5s' }}
          />
          <div
            className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[120px] opacity-10 animate-pulse"
            style={{ backgroundColor: accentColor, animationDuration: '6s', animationDelay: '2s' }}
          />
          {/* Floating particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[20%] left-[15%] w-1.5 h-1.5 rounded-full bg-white/15 animate-float" style={{ animationDelay: '0s' }} />
            <div className="absolute top-[60%] right-[20%] w-2 h-2 rounded-full bg-white/10 animate-float" style={{ animationDelay: '1.5s' }} />
            <div className="absolute bottom-[30%] left-[60%] w-1 h-1 rounded-full bg-white/20 animate-float" style={{ animationDelay: '3s' }} />
          </div>
          {/* Decorative ring */}
          <div
            className="absolute top-20 right-20 w-48 h-48 rounded-full border opacity-10 animate-spin-slow hidden lg:block"
            style={{ borderColor: accentColor, animationDuration: '25s' }}
          />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header with animations */}
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-16">
              <div className="max-w-2xl">
                <span
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6 border backdrop-blur-sm"
                  style={{ backgroundColor: `${accentColor}10`, borderColor: `${accentColor}30`, color: accentColor }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                  Naš Tim
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
                  Upoznajte naše
                  <span className="block" style={{ color: accentColor }}>stručne trenere</span>
                </h2>
              </div>
              <p className="text-lg text-foreground-muted max-w-md lg:text-right">
                Posvećeni profesionalci sa godinama iskustva spremni da vas vode ka uspehu
              </p>
            </div>

            {/* Trainer Cards Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {trainers.slice(0, 4).map((trainer, index) => (
                <div
                  key={trainer.id}
                  className="group relative"
                >
                  {/* Card glow effect on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl rounded-3xl"
                    style={{ background: `radial-gradient(circle at center, ${accentColor}25 0%, transparent 70%)` }}
                  />

                  <div className="relative bg-gradient-to-br from-background/90 to-background/50 backdrop-blur-xl border border-white/10 group-hover:border-white/20 rounded-3xl overflow-hidden transition-all duration-300 group-hover:translate-y-[-4px]">
                    {/* Decorative corner gradient */}
                    <div
                      className="absolute top-0 right-0 w-32 h-32 opacity-0 group-hover:opacity-10 transition-opacity duration-500"
                      style={{ background: `radial-gradient(circle at top right, ${accentColor} 0%, transparent 70%)` }}
                    />

                    <div className="flex flex-col sm:flex-row">
                      {/* Image container */}
                      <div className="relative sm:w-48 lg:w-56 flex-shrink-0 overflow-hidden">
                        <div className="aspect-square sm:aspect-auto sm:h-full">
                          {trainer.avatarUrl ? (
                            <img
                              src={trainer.avatarUrl}
                              alt={trainer.name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center min-h-[200px] transition-all duration-500 group-hover:scale-105"
                              style={{ background: `linear-gradient(135deg, ${accentColor}30 0%, ${accentColor}10 100%)` }}
                            >
                              <span className="text-6xl font-bold transition-transform duration-300 group-hover:scale-110" style={{ color: accentColor }}>
                                {trainer.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        {/* Number badge with glow */}
                        <div className="absolute top-4 left-4">
                          <div
                            className="absolute inset-0 rounded-xl blur-md opacity-50 group-hover:opacity-80 transition-opacity"
                            style={{ backgroundColor: accentColor }}
                          />
                          <div
                            className="relative w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold text-white backdrop-blur-sm transition-transform duration-300 group-hover:scale-110"
                            style={{ backgroundColor: `${accentColor}90` }}
                          >
                            {String(index + 1).padStart(2, '0')}
                          </div>
                        </div>
                        {/* Gradient overlay on image */}
                        <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 sm:bg-gradient-to-r" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-6 lg:p-8 flex flex-col justify-center relative">
                        <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 transition-colors duration-300 group-hover:text-white">
                          {trainer.name}
                        </h3>
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium w-fit mb-4 transition-all duration-300 group-hover:scale-105"
                          style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                          </svg>
                          {trainer.specialty || "Lični trener"}
                        </span>
                        <p className="text-foreground-muted text-sm leading-relaxed line-clamp-3">
                          {trainer.bio || "Posvećen pomoći članovima da ostvare svoje fitness ciljeve kroz personalizovane treninge."}
                        </p>

                        {/* Decorative dots */}
                        <div className="absolute bottom-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: `${accentColor}60` }} />
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: `${accentColor}40` }} />
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: `${accentColor}20` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section id="features" className="py-24 relative overflow-hidden">
        {/* Animated Background */}
        <div
          className="absolute top-1/2 left-0 w-[600px] h-[600px] rounded-full blur-[150px] opacity-15 -translate-y-1/2 animate-pulse"
          style={{ backgroundColor: accentColor, animationDuration: '5s' }}
        />
        <div
          className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full blur-[120px] opacity-10 animate-pulse"
          style={{ backgroundColor: accentColor, animationDuration: '6s', animationDelay: '2s' }}
        />
        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[15%] right-[25%] w-2 h-2 rounded-full bg-white/15 animate-float" style={{ animationDelay: '0.5s' }} />
          <div className="absolute top-[70%] left-[20%] w-1.5 h-1.5 rounded-full bg-white/10 animate-float" style={{ animationDelay: '2s' }} />
          <div className="absolute bottom-[20%] right-[10%] w-1 h-1 rounded-full bg-white/20 animate-float" style={{ animationDelay: '3.5s' }} />
        </div>
        {/* Decorative ring */}
        <div
          className="absolute bottom-20 left-20 w-40 h-40 rounded-full border opacity-10 animate-spin-slow hidden lg:block"
          style={{ borderColor: accentColor, animationDuration: '30s', animationDirection: 'reverse' }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                Sve što vam treba
                <span className="block" style={{ color: accentColor }}>na jednom mestu</span>
              </h2>
            </div>
            <p className="text-lg text-foreground-muted max-w-md lg:text-right">
              Kompletna platforma za fitness sa AI podrškom, praćenjem napretka i stručnim vođstvom
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Personal Trainer Card - Featured, spans 2 rows */}
            <div className="md:row-span-2 group relative">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl rounded-3xl bg-blue-500/20" />
              <div className="relative h-full bg-gradient-to-br from-background-secondary/90 to-background-secondary/50 backdrop-blur-xl border border-white/10 group-hover:border-blue-500/30 rounded-3xl p-8 transition-all duration-300 overflow-hidden group-hover:translate-y-[-4px]">
                {/* Corner gradient */}
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-[80px] opacity-20 bg-blue-500 group-hover:opacity-40 transition-opacity duration-500" />
                {/* Sparkle decoration */}
                <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <svg className="w-5 h-5 text-blue-400/60 animate-pulse" style={{ animationDuration: '2s' }} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
                  </svg>
                </div>

                <div className="relative flex flex-col h-full">
                  {/* Icon */}
                  <div className="relative mb-6">
                    <div className="absolute inset-0 w-16 h-16 rounded-2xl bg-blue-500 blur-xl opacity-30 group-hover:opacity-50 transition-opacity" />
                    <div className="relative w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                      <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                      </svg>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 transition-colors duration-300 group-hover:text-white">Lični Trener</h3>
                  <p className="text-foreground-muted leading-relaxed mb-6">
                    Izaberite trenera koji će vas voditi kroz celokupnu fitness transformaciju.
                  </p>

                  {/* Feature list */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-foreground">Praćenje klijenata</span>
                        <p className="text-xs text-foreground-muted">Uvid u napredak, treninge i ishranu</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-foreground">Zakazivanje termina</span>
                        <p className="text-xs text-foreground-muted">Jednostavno upravljanje rasporedima</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-foreground">Planovi ishrane</span>
                        <p className="text-xs text-foreground-muted">Kreiranje prilagođenih jelovnika</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Decorative dots */}
                <div className="absolute bottom-6 right-6 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400/40" />
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400/20" />
                </div>
              </div>
            </div>

            {/* AI Card */}
            <div className="group relative">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl rounded-3xl bg-violet-500/20" />
              <div className="relative h-full bg-gradient-to-br from-background-secondary/90 to-background-secondary/50 backdrop-blur-xl border border-white/10 group-hover:border-violet-500/30 rounded-3xl p-8 transition-all duration-300 overflow-hidden group-hover:translate-y-[-4px]">
                {/* Corner gradient */}
                <div className="absolute top-0 right-0 w-24 h-24 opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-gradient-to-br from-violet-500 to-transparent rounded-bl-full" />
                <div className="relative">
                  <div className="absolute inset-0 w-14 h-14 rounded-2xl bg-violet-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
                  <div className="relative w-14 h-14 rounded-2xl bg-violet-500/20 flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                    <svg className="w-7 h-7 text-violet-400 animate-pulse" style={{ animationDuration: '3s' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold text-foreground transition-colors duration-300 group-hover:text-white">AI Asistenti</h3>
                  <span className="text-xs font-medium text-violet-400 bg-violet-500/20 px-2 py-1 rounded-md">24/7</span>
                </div>
                <p className="text-foreground-muted text-sm leading-relaxed">
                  Tri specijalizovana AI asistenta za ishranu, suplemente i trening.
                </p>
                {/* Decorative dots */}
                <div className="absolute bottom-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400/60" />
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400/40" />
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400/20" />
                </div>
              </div>
            </div>

            {/* Progress Tracking Card */}
            <div className="group relative">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl rounded-3xl bg-emerald-500/20" />
              <div className="relative h-full bg-gradient-to-br from-background-secondary/90 to-background-secondary/50 backdrop-blur-xl border border-white/10 group-hover:border-emerald-500/30 rounded-3xl p-8 transition-all duration-300 overflow-hidden group-hover:translate-y-[-4px]">
                {/* Corner gradient */}
                <div className="absolute top-0 right-0 w-24 h-24 opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-gradient-to-br from-emerald-500 to-transparent rounded-bl-full" />
                <div className="relative">
                  <div className="absolute inset-0 w-14 h-14 rounded-2xl bg-emerald-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
                  <div className="relative w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                    <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2 transition-colors duration-300 group-hover:text-white">Praćenje Napretka</h3>
                <p className="text-foreground-muted text-sm leading-relaxed">
                  Beležite obroke, treninge i pratite transformaciju sa statistikom.
                </p>
                {/* Decorative dots */}
                <div className="absolute bottom-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/40" />
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/20" />
                </div>
              </div>
            </div>

            {/* Nutrition Plan Card */}
            <div className="md:col-span-2 group relative">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl rounded-3xl bg-orange-500/20" />
              <div className="relative h-full bg-gradient-to-br from-background-secondary/90 to-background-secondary/50 backdrop-blur-xl border border-white/10 group-hover:border-orange-500/30 rounded-3xl p-8 transition-all duration-300 overflow-hidden group-hover:translate-y-[-4px]">
                {/* Corner gradient */}
                <div className="absolute top-0 right-0 w-24 h-24 opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-gradient-to-br from-orange-500 to-transparent rounded-bl-full" />
                <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                  <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 w-14 h-14 rounded-2xl bg-orange-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
                    <div className="relative w-14 h-14 rounded-2xl bg-orange-500/20 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                      <svg className="w-7 h-7 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.125-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265zm-3 0a.375.375 0 11-.53 0L9 2.845l.265.265zm6 0a.375.375 0 11-.53 0L15 2.845l.265.265z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-foreground mb-2 transition-colors duration-300 group-hover:text-white">Plan Ishrane</h3>
                    <p className="text-foreground-muted text-sm leading-relaxed">
                      Kreirajte obroke, pratite kalorije, makronutrijente i hidrataciju na jednom mestu.
                    </p>
                  </div>
                </div>
                {/* Decorative dots */}
                <div className="absolute bottom-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400/60" />
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400/40" />
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400/20" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      {galleryImages.length > 0 && (
        <section id="gallery" className="py-24 relative overflow-hidden">
          {/* Animated Background */}
          <div
            className="absolute top-1/2 right-0 w-[600px] h-[600px] rounded-full blur-[150px] opacity-15 -translate-y-1/2 animate-pulse"
            style={{ backgroundColor: accentColor, animationDuration: '5s' }}
          />
          <div
            className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[120px] opacity-10 animate-pulse"
            style={{ backgroundColor: accentColor, animationDuration: '6s', animationDelay: '2s' }}
          />
          {/* Floating particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[25%] left-[10%] w-1.5 h-1.5 rounded-full bg-white/15 animate-float" style={{ animationDelay: '0s' }} />
            <div className="absolute top-[50%] right-[15%] w-2 h-2 rounded-full bg-white/10 animate-float" style={{ animationDelay: '1.5s' }} />
            <div className="absolute bottom-[25%] left-[70%] w-1 h-1 rounded-full bg-white/20 animate-float" style={{ animationDelay: '3s' }} />
          </div>
          {/* Decorative ring */}
          <div
            className="absolute top-20 left-20 w-40 h-40 rounded-full border opacity-10 animate-spin-slow hidden lg:block"
            style={{ borderColor: accentColor, animationDuration: '25s' }}
          />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                  Pogledajte naš
                  <span className="block" style={{ color: accentColor }}>prostor</span>
                </h2>
              </div>
              <p className="text-lg text-foreground-muted max-w-md lg:text-right">
                Moderna oprema i prijatna atmosfera za vaš trening
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {galleryImages.map((image, index) => (
                <div
                  key={image.id || index}
                  className={`group relative overflow-hidden rounded-2xl transition-all duration-300 ${
                    index === 0 ? "col-span-2 row-span-2" : ""
                  }`}
                >
                  {/* Glow effect on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl -z-10"
                    style={{ background: `radial-gradient(circle at center, ${accentColor}30 0%, transparent 70%)` }}
                  />
                  {/* Border with hover effect */}
                  <div className="absolute inset-0 rounded-2xl border border-white/10 group-hover:border-white/30 transition-colors duration-300 pointer-events-none z-10" />

                  <div className="aspect-square overflow-hidden rounded-2xl">
                    <img
                      src={image.imageUrl}
                      alt={image.caption || `Gallery image ${index + 1}`}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </div>

                  {/* Featured badge for first image */}
                  {index === 0 && (
                    <div className="absolute top-4 left-4 z-20">
                      <div
                        className="absolute inset-0 rounded-xl blur-md opacity-50 group-hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: accentColor }}
                      />
                      <div
                        className="relative px-3 py-1.5 rounded-xl text-xs font-semibold text-white backdrop-blur-sm transition-transform duration-300 group-hover:scale-110"
                        style={{ backgroundColor: `${accentColor}90` }}
                      >
                        Glavna
                      </div>
                    </div>
                  )}

                  {/* Hover overlay with gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 z-10">
                    {image.caption && (
                      <p className="text-white text-sm font-medium">{image.caption}</p>
                    )}
                    {/* View icon */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:scale-100 scale-75">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                      </svg>
                    </div>
                  </div>

                  {/* Decorative corner on hover */}
                  <div
                    className="absolute top-0 right-0 w-20 h-20 opacity-0 group-hover:opacity-30 transition-opacity duration-500 z-0"
                    style={{ background: `radial-gradient(circle at top right, ${accentColor} 0%, transparent 70%)` }}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact Section */}
      {hasContact && (
        <section id="contact" className="py-24 bg-background-secondary relative overflow-hidden">
          {/* Animated Background */}
          <div
            className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full blur-[150px] opacity-15 animate-pulse"
            style={{ backgroundColor: accentColor, animationDuration: '5s' }}
          />
          <div
            className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full blur-[120px] opacity-10 bg-blue-500 animate-pulse"
            style={{ animationDuration: '6s', animationDelay: '2s' }}
          />
          <div
            className="absolute top-1/2 right-1/4 w-[300px] h-[300px] rounded-full blur-[100px] opacity-10 animate-pulse"
            style={{ backgroundColor: accentColor, animationDuration: '7s', animationDelay: '3s' }}
          />
          {/* Floating particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[20%] right-[30%] w-2 h-2 rounded-full bg-white/15 animate-float" style={{ animationDelay: '0s' }} />
            <div className="absolute top-[60%] left-[15%] w-1.5 h-1.5 rounded-full bg-white/10 animate-float" style={{ animationDelay: '1.5s' }} />
            <div className="absolute bottom-[25%] right-[20%] w-1 h-1 rounded-full bg-white/20 animate-float" style={{ animationDelay: '3s' }} />
            <div className="absolute top-[40%] left-[40%] w-2 h-2 rounded-full bg-white/10 animate-float" style={{ animationDelay: '4s' }} />
          </div>
          {/* Decorative ring */}
          <div
            className="absolute bottom-20 right-20 w-48 h-48 rounded-full border opacity-10 animate-spin-slow hidden lg:block"
            style={{ borderColor: accentColor, animationDuration: '25s' }}
          />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left - Info */}
              <div className="animate-fade-in-up">
                <span
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6 border backdrop-blur-sm"
                  style={{ backgroundColor: `${accentColor}10`, borderColor: `${accentColor}30`, color: accentColor }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Kontakt
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-6">
                  Posetite nas i
                  <span className="block" style={{ color: accentColor }}>započnite transformaciju</span>
                </h2>
                <p className="text-lg text-foreground-muted mb-8">
                  Dođite da nas upoznate, obiđete prostor i saznate više o našim programima. Radujemo se vašoj poseti!
                </p>

                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all hover:shadow-lg hover:scale-105 group"
                  style={{ backgroundColor: accentColor, boxShadow: `0 4px 20px -4px ${accentColor}60` }}
                >
                  Započni danas
                  <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>

              {/* Right - Contact Cards */}
              <div className="space-y-4">
                {gym.address && (
                  <div className="group relative animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    {/* Card glow effect on hover */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl rounded-2xl"
                      style={{ background: `radial-gradient(circle at center, ${accentColor}20 0%, transparent 70%)` }}
                    />
                    <div className="relative bg-gradient-to-br from-background/90 to-background/50 backdrop-blur-xl rounded-2xl border border-white/10 group-hover:border-white/20 p-6 transition-all duration-300 group-hover:translate-y-[-4px] overflow-hidden">
                      {/* Decorative corner gradient */}
                      <div
                        className="absolute top-0 right-0 w-24 h-24 opacity-0 group-hover:opacity-20 transition-opacity duration-500"
                        style={{ background: `radial-gradient(circle at top right, ${accentColor} 0%, transparent 70%)` }}
                      />
                      <div className="flex items-start gap-5">
                        <div className="relative">
                          <div
                            className="absolute inset-0 w-14 h-14 rounded-2xl blur-lg opacity-0 group-hover:opacity-40 transition-opacity"
                            style={{ backgroundColor: accentColor }}
                          />
                          <div
                            className="relative w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3"
                            style={{ backgroundColor: `${accentColor}15` }}
                          >
                            <svg className="w-7 h-7" style={{ color: accentColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground text-lg mb-1 transition-colors duration-300 group-hover:text-white">Adresa</h3>
                          <p className="text-foreground-muted">{gym.address}</p>
                        </div>
                        <div className="hidden sm:block">
                          <svg className="w-5 h-5 text-foreground-muted/50 group-hover:text-foreground-muted transition-all duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                      {/* Decorative dots */}
                      <div className="absolute bottom-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: `${accentColor}60` }} />
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: `${accentColor}40` }} />
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: `${accentColor}20` }} />
                      </div>
                    </div>
                  </div>
                )}

                {gym.phone && (
                  <div className="group relative animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                    {/* Card glow effect on hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl rounded-2xl bg-emerald-500/20" />
                    <div className="relative bg-gradient-to-br from-background/90 to-background/50 backdrop-blur-xl rounded-2xl border border-white/10 group-hover:border-emerald-500/30 p-6 transition-all duration-300 group-hover:translate-y-[-4px] overflow-hidden">
                      {/* Decorative corner gradient */}
                      <div className="absolute top-0 right-0 w-24 h-24 opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-gradient-to-br from-emerald-500 to-transparent rounded-bl-full" />
                      <div className="flex items-start gap-5">
                        <div className="relative">
                          <div className="absolute inset-0 w-14 h-14 rounded-2xl bg-emerald-500 blur-lg opacity-0 group-hover:opacity-40 transition-opacity" />
                          <div className="relative w-14 h-14 rounded-2xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                            <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground text-lg mb-1 transition-colors duration-300 group-hover:text-white">Telefon</h3>
                          <a href={`tel:${gym.phone.replace(/\s/g, '')}`} className="text-foreground-muted hover:text-emerald-400 transition-colors">
                            {gym.phone}
                          </a>
                        </div>
                        <div className="hidden sm:block">
                          <svg className="w-5 h-5 text-foreground-muted/50 group-hover:text-emerald-400 transition-all duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                      {/* Decorative dots */}
                      <div className="absolute bottom-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/40" />
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/20" />
                      </div>
                    </div>
                  </div>
                )}

                {gym.openingHours && (
                  <div className="group relative animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                    {/* Card glow effect on hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl rounded-2xl bg-violet-500/20" />
                    <div className="relative bg-gradient-to-br from-background/90 to-background/50 backdrop-blur-xl rounded-2xl border border-white/10 group-hover:border-violet-500/30 p-6 transition-all duration-300 group-hover:translate-y-[-4px] overflow-hidden">
                      {/* Decorative corner gradient */}
                      <div className="absolute top-0 right-0 w-24 h-24 opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-gradient-to-br from-violet-500 to-transparent rounded-bl-full" />
                      <div className="flex items-start gap-5">
                        <div className="relative">
                          <div className="absolute inset-0 w-14 h-14 rounded-2xl bg-violet-500 blur-lg opacity-0 group-hover:opacity-40 transition-opacity" />
                          <div className="relative w-14 h-14 rounded-2xl bg-violet-500/15 flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                            <svg className="w-7 h-7 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground text-lg mb-1 transition-colors duration-300 group-hover:text-white">Radno vreme</h3>
                          <p className="text-foreground-muted whitespace-pre-line text-sm">{gym.openingHours}</p>
                        </div>
                      </div>
                      {/* Decorative dots */}
                      <div className="absolute bottom-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400/60" />
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400/40" />
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400/20" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="relative overflow-hidden">
        {/* Animated Background */}
        <div
          className="absolute top-0 left-1/4 w-[400px] h-[400px] rounded-full blur-[150px] opacity-10 animate-pulse"
          style={{ backgroundColor: accentColor, animationDuration: '6s' }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-[300px] h-[300px] rounded-full blur-[120px] opacity-10 animate-pulse"
          style={{ backgroundColor: accentColor, animationDuration: '7s', animationDelay: '3s' }}
        />
        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[30%] left-[10%] w-1.5 h-1.5 rounded-full bg-white/10 animate-float" style={{ animationDelay: '0s' }} />
          <div className="absolute top-[50%] right-[20%] w-1 h-1 rounded-full bg-white/15 animate-float" style={{ animationDelay: '2s' }} />
          <div className="absolute bottom-[40%] left-[60%] w-2 h-2 rounded-full bg-white/10 animate-float" style={{ animationDelay: '4s' }} />
        </div>
        {/* Decorative ring */}
        <div
          className="absolute top-10 right-10 w-32 h-32 rounded-full border opacity-5 animate-spin-slow hidden lg:block"
          style={{ borderColor: accentColor, animationDuration: '30s' }}
        />

        {/* Gradient top border - enhanced */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="relative py-10 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Mobile: Centered single column / Desktop: Grid layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
              {/* Brand */}
              <div className="sm:col-span-2 lg:col-span-1 group text-center sm:text-left">
                <div className="flex items-center gap-3 mb-4 justify-center sm:justify-start">
                  <div className="relative">
                    {/* Logo glow effect */}
                    <div
                      className="absolute inset-0 w-12 h-12 rounded-xl blur-lg opacity-0 group-hover:opacity-50 transition-opacity duration-500"
                      style={{ backgroundColor: accentColor }}
                    />
                    {gym.logo ? (
                      <img src={gym.logo} alt={gym.name} className="relative w-12 h-12 rounded-xl object-cover ring-2 ring-white/10 group-hover:ring-white/20 transition-all duration-300 group-hover:scale-105" />
                    ) : (
                      <div
                        className="relative w-12 h-12 rounded-xl flex items-center justify-center ring-2 ring-white/10 group-hover:ring-white/20 transition-all duration-300 group-hover:scale-105"
                        style={{ backgroundColor: accentColor }}
                      >
                        <span className="text-lg font-bold text-white">{gym.name.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-left">
                    <span className="font-semibold text-foreground block group-hover:text-white transition-colors duration-300">{gym.name}</span>
                    <span className="text-xs text-foreground-muted">Fitness centar</span>
                  </div>
                </div>
                <p className="text-sm text-foreground-muted leading-relaxed max-w-xs mx-auto sm:mx-0">
                  Vaš partner u fitness putovanju. Pridružite se našoj zajednici i transformišite se.
                </p>
              </div>

              {/* Quick Links */}
              <div className="text-center sm:text-left">
                <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2 justify-center sm:justify-start">
                  <div className="w-1 h-4 rounded-full" style={{ backgroundColor: accentColor }} />
                  Brzi linkovi
                </h4>
                <ul className="space-y-3">
                  {hasTrainers && (
                    <li>
                      <a href="#trainers" className="group/link text-sm text-foreground-muted hover:text-foreground transition-all duration-300 inline-flex items-center gap-2">
                        <span className="w-0 group-hover/link:w-2 h-px transition-all duration-300 hidden sm:block" style={{ backgroundColor: accentColor }} />
                        Naši treneri
                      </a>
                    </li>
                  )}
                  <li>
                    <a href="#features" className="group/link text-sm text-foreground-muted hover:text-foreground transition-all duration-300 inline-flex items-center gap-2">
                      <span className="w-0 group-hover/link:w-2 h-px transition-all duration-300 hidden sm:block" style={{ backgroundColor: accentColor }} />
                      Šta nudimo
                    </a>
                  </li>
                  {galleryImages.length > 0 && (
                    <li>
                      <a href="#gallery" className="group/link text-sm text-foreground-muted hover:text-foreground transition-all duration-300 inline-flex items-center gap-2">
                        <span className="w-0 group-hover/link:w-2 h-px transition-all duration-300 hidden sm:block" style={{ backgroundColor: accentColor }} />
                        Galerija
                      </a>
                    </li>
                  )}
                  {hasContact && (
                    <li>
                      <a href="#contact" className="group/link text-sm text-foreground-muted hover:text-foreground transition-all duration-300 inline-flex items-center gap-2">
                        <span className="w-0 group-hover/link:w-2 h-px transition-all duration-300 hidden sm:block" style={{ backgroundColor: accentColor }} />
                        Kontakt
                      </a>
                    </li>
                  )}
                </ul>
              </div>

              {/* Login */}
              <div className="text-center sm:text-left">
                <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2 justify-center sm:justify-start">
                  <div className="w-1 h-4 rounded-full bg-blue-500" />
                  Prijava
                </h4>
                <ul className="space-y-3">
                  <li className="flex justify-center sm:justify-start">
                    <Link href="/login" className="group/link text-sm text-foreground-muted hover:text-foreground transition-all duration-300 inline-flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover/link:bg-blue-500/20 group-hover/link:scale-110 transition-all duration-300">
                        <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      Prijava za članove
                    </Link>
                  </li>
                  <li className="flex justify-center sm:justify-start">
                    <Link href="/staff-login" className="group/link text-sm text-foreground-muted hover:text-foreground transition-all duration-300 inline-flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center group-hover/link:bg-violet-500/20 group-hover/link:scale-110 transition-all duration-300">
                        <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      Staff prijava
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Contact Summary */}
              {hasContact && (
                <div className="text-center sm:text-left">
                  <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2 justify-center sm:justify-start">
                    <div className="w-1 h-4 rounded-full bg-emerald-500" />
                    Kontakt
                  </h4>
                  <ul className="space-y-3">
                    {gym.address && (
                      <li className="group/item text-sm text-foreground-muted flex items-start gap-3 justify-center sm:justify-start">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover/item:scale-110" style={{ backgroundColor: `${accentColor}10` }}>
                          <svg className="w-4 h-4" style={{ color: accentColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                        </div>
                        <span className="line-clamp-2 pt-1.5 group-hover/item:text-foreground transition-colors duration-300 text-left">{gym.address}</span>
                      </li>
                    )}
                    {gym.phone && (
                      <li className="group/item text-sm text-foreground-muted flex items-center gap-3 justify-center sm:justify-start">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover/item:bg-emerald-500/20 group-hover/item:scale-110">
                          <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </div>
                        <a href={`tel:${gym.phone.replace(/\s/g, '')}`} className="group-hover/item:text-emerald-400 transition-colors duration-300">
                          {gym.phone}
                        </a>
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            {/* Bottom bar */}
            <div className="mt-10 sm:mt-12 pt-6 sm:pt-8 border-t border-white/5">
              <div className="flex flex-col items-center gap-3 sm:gap-4 sm:flex-row sm:justify-between">
                <p className="text-xs sm:text-sm text-foreground-muted text-center sm:text-left">
                  © {new Date().getFullYear()} {gym.name}. Sva prava zadržana.
                </p>
                <div className="group flex items-center gap-2 text-xs text-foreground-muted/60">
                  <span>Powered by</span>
                  <span className="font-medium text-foreground-muted group-hover:text-foreground transition-colors duration-300 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-violet-400 animate-pulse" style={{ animationDuration: '3s' }} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
                    </svg>
                    Classic AI
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <BackToTop accentColor={accentColor} />
    </div>
  );
}
