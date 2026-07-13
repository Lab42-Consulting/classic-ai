import Link from "next/link";
import prisma from "@/lib/db";
import { notFound } from "next/navigation";
import { MobileMenu, BackToTop } from "../mobile-menu";
import { LocationSwitcher } from "./location-switcher";
import { TrainersCarousel } from "../trainers-carousel";
import { HeroImage } from "../hero-image";
import { PricingTable } from "../pricing-table";

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
      storeEnabled: true,
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
  const hasStore = gym.storeEnabled;
  const shopHref = `/gym-portal/${gym.slug}/shop`;
  const galleryImages = (gym.galleryImages as unknown as GalleryImage[]) || [];
  // Hero photos — crossfade through these (add/remove Blob URLs to change the rotation).
  const heroImages = [
    "https://dslxyjsakbtn7vyc.public.blob.vercel-storage.com/hero/hero_v1.png",
    "https://dslxyjsakbtn7vyc.public.blob.vercel-storage.com/hero/hero_v2.png",
    "https://dslxyjsakbtn7vyc.public.blob.vercel-storage.com/hero/hero_v3.png",
  ];

  const pricing: {
    membership: Record<string, { label: string; desc: string; price: string; unit?: string; popular?: boolean }[]>;
    other: { label: string; price: string; months?: number }[];
  } = {
    membership: {
      "Žene": [
        { label: "Ceo mesec", desc: "Neograničen pristup", price: "3.200", unit: "mes", popular: true },
        { label: "Do 16h", desc: "Radnim danima do 16h", price: "2.800", unit: "mes" },
        { label: "12 treninga", desc: "12 dolazaka mesečno", price: "2.800" },
        { label: "12 treninga do 16h", desc: "12 dolazaka, do 16h", price: "2.400" },
      ],
      "Muškarci": [
        { label: "Ceo mesec", desc: "Neograničen pristup", price: "3.600", unit: "mes", popular: true },
        { label: "Do 16h", desc: "Radnim danima do 16h", price: "3.200", unit: "mes" },
        { label: "12 treninga", desc: "12 dolazaka mesečno", price: "3.200" },
        { label: "12 treninga do 16h", desc: "12 dolazaka, do 16h", price: "2.800" },
      ],
    },
    other: [
      { label: "Dnevni trening", price: "500" },
      { label: "3 meseca", price: "7.500", months: 3 },
      { label: "6 meseci", price: "13.500", months: 6 },
      { label: "Godišnja članarina", price: "24.000", months: 12 },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="mx-4 sm:mx-6 lg:mx-8 mt-4">
          <div className="max-w-7xl mx-auto bg-background-secondary/60 border border-white/10 rounded-2xl shadow-lg shadow-black/5">
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
                <a
                  href="#cenovnik"
                  className="text-sm font-medium text-foreground-muted hover:text-foreground px-4 py-2 rounded-xl hover:bg-white/5 transition-all"
                >
                  Cenovnik
                </a>
                {hasStore && (
                  <Link
                    href={shopHref}
                    className="text-sm font-semibold px-4 py-2 rounded-xl hover:bg-white/5 transition-all"
                    style={{ color: accentColor }}
                  >
                    Prodavnica
                  </Link>
                )}
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
                {hasStore && (
                  <Link
                    href={shopHref}
                    className="flex items-center gap-2 px-4 sm:px-5 py-2 rounded-xl text-white font-medium transition-all hover:opacity-90"
                    style={{ backgroundColor: accentColor }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="hidden sm:inline">Prodavnica</span>
                  </Link>
                )}
                <Link
                  href="/login"
                  className="hidden sm:flex items-center gap-2 px-5 py-2 rounded-xl font-medium transition-all border border-white/15 text-foreground hover:bg-white/5"
                >
                  Prijava
                </Link>
                <MobileMenu
                  accentColor={accentColor}
                  hasTrainers={hasTrainers}
                  hasContact={hasContact}
                  hasStore={hasStore}
                  shopHref={shopHref}
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
            className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full blur-[64px] opacity-20"
            style={{ backgroundColor: accentColor, animationDuration: '4s' }}
          />
          {/* Secondary glow - animated with delay */}
          <div
            className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full blur-[64px] opacity-10 bg-blue-500"
            style={{ animationDuration: '5s', animationDelay: '1s' }}
          />
          {/* Tertiary accent */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-[64px] opacity-10"
            style={{ backgroundColor: accentColor, animationDuration: '6s', animationDelay: '2s' }}
          />
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:72px_72px]" />
          {/* Floating particles */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-20 left-[20%] w-2 h-2 rounded-full bg-white/20" style={{ animationDelay: '0s' }} />
            <div className="absolute top-40 right-[30%] w-1.5 h-1.5 rounded-full bg-white/15" style={{ animationDelay: '1s' }} />
            <div className="absolute bottom-32 left-[40%] w-2.5 h-2.5 rounded-full bg-white/10" style={{ animationDelay: '2s' }} />
            <div className="absolute top-[60%] right-[15%] w-1 h-1 rounded-full bg-white/20" style={{ animationDelay: '0.5s' }} />
            <div className="absolute top-[30%] left-[10%] w-1.5 h-1.5 rounded-full bg-white/15" style={{ animationDelay: '1.5s' }} />
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid lg:grid-cols-[1fr_1.15fr] gap-12 lg:gap-16 items-center">
            {/* Left Column - motto, CTAs, stats */}
            <div className="text-center lg:text-left animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 border animate-fade-in-up" style={{ backgroundColor: `${accentColor}10`, borderColor: `${accentColor}30`, animationDelay: '0.1s' }}>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: accentColor }} />
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: accentColor }} />
                </span>
                <span className="text-sm font-medium" style={{ color: accentColor }}>Dobrodošli u {gym.name}</span>
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-6xl xl:text-7xl font-black text-foreground leading-[0.95] tracking-tight mb-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                Budi{' '}
                <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(135deg, ${accentColor}, ${accentColor}88)` }}>najbolja</span>
                <span className="block">verzija sebe</span>
              </h1>

              <p className="text-lg sm:text-xl text-foreground-muted max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                {gym.about || "Vrhunska oprema, stručni treneri i zajednica koja te gura napred. Počni svoju transformaciju već danas."}
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                <a href="#contact" className="w-full sm:w-auto px-8 py-4 rounded-xl text-white font-semibold text-lg transition-all hover:scale-105 hover:shadow-xl flex items-center justify-center gap-2 group" style={{ backgroundColor: accentColor, boxShadow: `0 4px 20px -4px ${accentColor}60` }}>
                  Postani član
                  <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </a>
                <Link href={shopHref} className="w-full sm:w-auto px-8 py-4 rounded-xl border border-white/10 text-foreground font-semibold text-lg transition-all hover:bg-white/5 hover:border-white/20 hover:scale-105 flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" /></svg>
                  Prodavnica
                </Link>
              </div>

              <div className="flex items-center gap-6 justify-center lg:justify-start mt-10 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
                <div>
                  <div className="text-3xl font-bold text-foreground">500+</div>
                  <div className="text-sm text-foreground-muted">Članova</div>
                </div>
                <div className="w-px h-10 bg-white/10" />
                <div>
                  <div className="text-3xl font-bold text-foreground">{trainers.length}</div>
                  <div className="text-sm text-foreground-muted">Trenera</div>
                </div>
                <div className="w-px h-10 bg-white/10" />
                <div>
                  <div className="text-3xl font-bold" style={{ color: accentColor }}>300+</div>
                  <div className="text-sm text-foreground-muted">Suplemenata</div>
                </div>
              </div>
            </div>

            {/* Right Column - Hero photo */}
            <div className="relative animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <div className="absolute -inset-4 rounded-[2.5rem] blur-3xl opacity-30 pointer-events-none" style={{ background: `radial-gradient(circle at 60% 40%, ${accentColor}, transparent 70%)` }} />
              <div className="absolute -top-6 -right-6 w-40 h-40 rounded-full border opacity-20 hidden sm:block pointer-events-none" style={{ borderColor: accentColor, animationDuration: '22s' }} />

              <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-black/60 aspect-[4/5] w-full mx-auto lg:mx-0">
                <HeroImage images={heroImages} alt={gym.name} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <div className="absolute inset-0 opacity-25" style={{ background: `linear-gradient(135deg, ${accentColor}, transparent 60%)` }} />

                <div className="absolute bottom-5 left-5 right-5 flex items-center gap-3 p-4 rounded-2xl bg-black/40 border border-white/10">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${accentColor}25` }}>
                    <svg className="w-6 h-6" style={{ color: accentColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-white leading-none">500+</div>
                    <div className="text-xs text-white/70 mt-1">zadovoljnih članova</div>
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
            className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[64px] opacity-15"
            style={{ backgroundColor: accentColor, animationDuration: '5s' }}
          />
          <div
            className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[64px] opacity-10"
            style={{ backgroundColor: accentColor, animationDuration: '6s', animationDelay: '2s' }}
          />
          {/* Floating particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[20%] left-[15%] w-1.5 h-1.5 rounded-full bg-white/15" style={{ animationDelay: '0s' }} />
            <div className="absolute top-[60%] right-[20%] w-2 h-2 rounded-full bg-white/10" style={{ animationDelay: '1.5s' }} />
            <div className="absolute bottom-[30%] left-[60%] w-1 h-1 rounded-full bg-white/20" style={{ animationDelay: '3s' }} />
          </div>
          {/* Decorative ring */}
          <div
            className="absolute top-20 right-20 w-48 h-48 rounded-full border opacity-10 hidden lg:block"
            style={{ borderColor: accentColor, animationDuration: '25s' }}
          />

          <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header with animations */}
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-16">
              <div className="max-w-2xl">
                <span
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6 border"
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

            <TrainersCarousel trainers={trainers} accentColor={accentColor} />
          </div>
        </section>
      )}

      {/* Features Section */}
      <section id="features" className="py-24 relative overflow-hidden">
        {/* Animated Background */}
        <div
          className="absolute top-1/2 left-0 w-[600px] h-[600px] rounded-full blur-[64px] opacity-15 -translate-y-1/2"
          style={{ backgroundColor: accentColor, animationDuration: '5s' }}
        />
        <div
          className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full blur-[64px] opacity-10"
          style={{ backgroundColor: accentColor, animationDuration: '6s', animationDelay: '2s' }}
        />
        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[15%] right-[25%] w-2 h-2 rounded-full bg-white/15" style={{ animationDelay: '0.5s' }} />
          <div className="absolute top-[70%] left-[20%] w-1.5 h-1.5 rounded-full bg-white/10" style={{ animationDelay: '2s' }} />
          <div className="absolute bottom-[20%] right-[10%] w-1 h-1 rounded-full bg-white/20" style={{ animationDelay: '3.5s' }} />
        </div>
        {/* Decorative ring */}
        <div
          className="absolute bottom-20 left-20 w-40 h-40 rounded-full border opacity-10 hidden lg:block"
          style={{ borderColor: accentColor, animationDuration: '30s', animationDirection: 'reverse' }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-16">
            <div className="max-w-2xl">
              <span
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6 border"
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
              Vrhunska oprema, stručni treneri i prodavnica suplemenata — sve za vaš napredak na jednom mestu.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Personal Training - Featured, spans 2 rows */}
            <div className="md:row-span-2 group relative">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl rounded-3xl bg-blue-500/20" />
              <div className="relative h-full bg-gradient-to-br from-background-secondary/90 to-background-secondary/50 border border-white/10 group-hover:border-blue-500/30 rounded-3xl p-8 transition-all duration-300 overflow-hidden group-hover:translate-y-[-4px]">
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-[80px] opacity-20 bg-blue-500 group-hover:opacity-40 transition-opacity duration-500" />
                <div className="relative flex flex-col h-full">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 w-16 h-16 rounded-2xl bg-blue-500 blur-xl opacity-30 group-hover:opacity-50 transition-opacity" />
                    <div className="relative w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                      <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 transition-colors duration-300 group-hover:text-white">Personalni trening</h3>
                  <p className="text-foreground-muted leading-relaxed mb-6">
                    Naši treneri vas vode kroz celokupnu transformaciju — od prvog treninga do vašeg cilja.
                  </p>
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-foreground">Personalizovani programi</span>
                        <p className="text-xs text-foreground-muted">Trening prilagođen vašim ciljevima</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-foreground">Individualni i grupni treninzi</span>
                        <p className="text-xs text-foreground-muted">Vežbajte sami ili u društvu</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-foreground">Stručno vođstvo</span>
                        <p className="text-xs text-foreground-muted">Iskusni treneri uz vas na svakom koraku</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Supplement Shop */}
            <Link href={shopHref} className="group relative block">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl rounded-3xl bg-violet-500/20" />
              <div className="relative h-full bg-gradient-to-br from-background-secondary/90 to-background-secondary/50 border border-white/10 group-hover:border-violet-500/30 rounded-3xl p-8 transition-all duration-300 overflow-hidden group-hover:translate-y-[-4px]">
                <div className="absolute top-0 right-0 w-24 h-24 opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-gradient-to-br from-violet-500 to-transparent rounded-bl-full" />
                <div className="relative">
                  <div className="absolute inset-0 w-14 h-14 rounded-2xl bg-violet-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
                  <div className="relative w-14 h-14 rounded-2xl bg-violet-500/20 flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                    <svg className="w-7 h-7 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" /></svg>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2 transition-colors duration-300 group-hover:text-white">Prodavnica suplemenata</h3>
                <p className="text-foreground-muted text-sm leading-relaxed">
                  Vrhunski suplementi vodećih brendova — proteini, kreatin, vitamini i još mnogo toga.
                </p>
                <span className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-violet-400">
                  Poseti prodavnicu
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </span>
              </div>
            </Link>

            {/* Premium Equipment */}
            <div className="group relative">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl rounded-3xl bg-emerald-500/20" />
              <div className="relative h-full bg-gradient-to-br from-background-secondary/90 to-background-secondary/50 border border-white/10 group-hover:border-emerald-500/30 rounded-3xl p-8 transition-all duration-300 overflow-hidden group-hover:translate-y-[-4px]">
                <div className="absolute top-0 right-0 w-24 h-24 opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-gradient-to-br from-emerald-500 to-transparent rounded-bl-full" />
                <div className="relative">
                  <div className="absolute inset-0 w-14 h-14 rounded-2xl bg-emerald-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
                  <div className="relative w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                    <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="1.75" y="8" width="4" height="8" rx="1.5" /><rect x="18.25" y="8" width="4" height="8" rx="1.5" /><path d="M5.75 12h12.5M9 9.5v5M15 9.5v5" /></svg>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2 transition-colors duration-300 group-hover:text-white">Vrhunska oprema</h3>
                <p className="text-foreground-muted text-sm leading-relaxed">
                  Najsavremenija oprema za snagu, kardio i funkcionalni trening.
                </p>
              </div>
            </div>

            {/* Mobile App - Coming soon */}
            <div className="md:col-span-2 group relative">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl rounded-3xl bg-orange-500/20" />
              <div className="relative h-full bg-gradient-to-br from-background-secondary/90 to-background-secondary/50 border border-white/10 group-hover:border-orange-500/30 rounded-3xl p-8 transition-all duration-300 overflow-hidden group-hover:translate-y-[-4px]">
                <div className="absolute top-0 right-0 w-24 h-24 opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-gradient-to-br from-orange-500 to-transparent rounded-bl-full" />
                <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                  <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 w-14 h-14 rounded-2xl bg-orange-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
                    <div className="relative w-14 h-14 rounded-2xl bg-orange-500/20 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                      <svg className="w-7 h-7 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-foreground transition-colors duration-300 group-hover:text-white">Mobilna aplikacija</h3>
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide text-white" style={{ backgroundColor: accentColor }}>Uskoro</span>
                    </div>
                    <p className="text-foreground-muted text-sm leading-relaxed">
                      Uskoro stiže naša aplikacija: AI asistenti za ishranu i trening, praćenje napretka i personalizovani planovi ishrane — sve na vašem telefonu.
                    </p>
                  </div>
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
            className="absolute top-1/2 right-0 w-[600px] h-[600px] rounded-full blur-[64px] opacity-15 -translate-y-1/2"
            style={{ backgroundColor: accentColor, animationDuration: '5s' }}
          />
          <div
            className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[64px] opacity-10"
            style={{ backgroundColor: accentColor, animationDuration: '6s', animationDelay: '2s' }}
          />
          {/* Floating particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[25%] left-[10%] w-1.5 h-1.5 rounded-full bg-white/15" style={{ animationDelay: '0s' }} />
            <div className="absolute top-[50%] right-[15%] w-2 h-2 rounded-full bg-white/10" style={{ animationDelay: '1.5s' }} />
            <div className="absolute bottom-[25%] left-[70%] w-1 h-1 rounded-full bg-white/20" style={{ animationDelay: '3s' }} />
          </div>
          {/* Decorative ring */}
          <div
            className="absolute top-20 left-20 w-40 h-40 rounded-full border opacity-10 hidden lg:block"
            style={{ borderColor: accentColor, animationDuration: '25s' }}
          />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-16">
              <div className="max-w-2xl">
                <span
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6 border"
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
                        className="relative px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-transform duration-300 group-hover:scale-110"
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
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:scale-100 scale-75">
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

      {/* Pricing Section */}
      <section id="cenovnik" className="py-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[64px] opacity-10" style={{ backgroundColor: accentColor, animationDuration: '6s' }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[64px] opacity-10" style={{ backgroundColor: accentColor, animationDuration: '7s', animationDelay: '2s' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6 border" style={{ backgroundColor: `${accentColor}10`, borderColor: `${accentColor}30`, color: accentColor }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>
              Cenovnik
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-4">
              Članarine i <span style={{ color: accentColor }}>treninzi</span>
            </h2>
            <p className="text-lg text-foreground-muted">Cene važe od 1. januara 2026. godine.</p>
          </div>

          <PricingTable pricing={pricing} accentColor={accentColor} />

          <div className="text-center mt-12">
            <a href="#contact" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-white font-semibold text-lg transition-all hover:scale-105 hover:shadow-xl group" style={{ backgroundColor: accentColor, boxShadow: `0 4px 20px -4px ${accentColor}60` }}>
              Postani član
              <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </a>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      {hasContact && (
        <section id="contact" className="py-24 bg-background-secondary relative overflow-hidden">
          {/* Animated Background */}
          <div
            className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full blur-[64px] opacity-15"
            style={{ backgroundColor: accentColor, animationDuration: '5s' }}
          />
          <div
            className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full blur-[64px] opacity-10 bg-blue-500"
            style={{ animationDuration: '6s', animationDelay: '2s' }}
          />
          <div
            className="absolute top-1/2 right-1/4 w-[300px] h-[300px] rounded-full blur-[64px] opacity-10"
            style={{ backgroundColor: accentColor, animationDuration: '7s', animationDelay: '3s' }}
          />
          {/* Floating particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[20%] right-[30%] w-2 h-2 rounded-full bg-white/15" style={{ animationDelay: '0s' }} />
            <div className="absolute top-[60%] left-[15%] w-1.5 h-1.5 rounded-full bg-white/10" style={{ animationDelay: '1.5s' }} />
            <div className="absolute bottom-[25%] right-[20%] w-1 h-1 rounded-full bg-white/20" style={{ animationDelay: '3s' }} />
            <div className="absolute top-[40%] left-[40%] w-2 h-2 rounded-full bg-white/10" style={{ animationDelay: '4s' }} />
          </div>
          {/* Decorative ring */}
          <div
            className="absolute bottom-20 right-20 w-48 h-48 rounded-full border opacity-10 hidden lg:block"
            style={{ borderColor: accentColor, animationDuration: '25s' }}
          />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left - Info */}
              <div className="animate-fade-in-up">
                <span
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6 border"
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
                    <div className="relative bg-gradient-to-br from-background/90 to-background/50 rounded-2xl border border-white/10 group-hover:border-white/20 p-6 transition-all duration-300 group-hover:translate-y-[-4px] overflow-hidden">
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
                    <div className="relative bg-gradient-to-br from-background/90 to-background/50 rounded-2xl border border-white/10 group-hover:border-emerald-500/30 p-6 transition-all duration-300 group-hover:translate-y-[-4px] overflow-hidden">
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
                    <div className="relative bg-gradient-to-br from-background/90 to-background/50 rounded-2xl border border-white/10 group-hover:border-violet-500/30 p-6 transition-all duration-300 group-hover:translate-y-[-4px] overflow-hidden">
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
          className="absolute top-0 left-1/4 w-[400px] h-[400px] rounded-full blur-[64px] opacity-10"
          style={{ backgroundColor: accentColor, animationDuration: '6s' }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-[300px] h-[300px] rounded-full blur-[64px] opacity-10"
          style={{ backgroundColor: accentColor, animationDuration: '7s', animationDelay: '3s' }}
        />
        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[30%] left-[10%] w-1.5 h-1.5 rounded-full bg-white/10" style={{ animationDelay: '0s' }} />
          <div className="absolute top-[50%] right-[20%] w-1 h-1 rounded-full bg-white/15" style={{ animationDelay: '2s' }} />
          <div className="absolute bottom-[40%] left-[60%] w-2 h-2 rounded-full bg-white/10" style={{ animationDelay: '4s' }} />
        </div>
        {/* Decorative ring */}
        <div
          className="absolute top-10 right-10 w-32 h-32 rounded-full border opacity-5 hidden lg:block"
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
                    <svg className="w-3.5 h-3.5 text-violet-400" style={{ animationDuration: '3s' }} fill="currentColor" viewBox="0 0 24 24">
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
