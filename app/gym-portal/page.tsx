import Link from "next/link";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

// Force dynamic rendering
export const dynamic = "force-dynamic";

async function getLocationsData() {
  // Get the first gym that has a slug (default location)
  const defaultGym = await prisma.gym.findFirst({
    where: {
      slug: { not: null },
    },
    select: {
      slug: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // If a gym has a slug, redirect to it
  if (defaultGym?.slug) {
    return {
      mode: "redirect" as const,
      slug: defaultGym.slug,
    };
  }

  // No gyms with slugs - fall back to single-gym behavior
  const singleGym = await prisma.gym.findFirst({
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      primaryColor: true,
    },
  });

  return {
    mode: "single" as const,
    gym: singleGym,
  };
}

export default async function GymPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  const { preview } = await searchParams;

  // Check if user is logged in as staff
  const session = await getSession();

  // If logged in as staff and not in preview mode, redirect to manage dashboard
  if (session && session.userType === "staff" && preview !== "true") {
    redirect("/gym-portal/manage");
  }

  const data = await getLocationsData();

  // Handle redirect case (single location with slug)
  if (data.mode === "redirect" && data.slug) {
    redirect(`/gym-portal/${data.slug}`);
  }

  // Handle single gym mode (no slugs configured) - show the legacy marketing page inline
  if (data.mode === "single") {
    if (!data.gym) {
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

    // For single gym without slug, show message to configure slug
    const accentColor = data.gym.primaryColor || "#ef4444";
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: `${accentColor}15` }}>
            {data.gym.logo ? (
              <img src={data.gym.logo} alt={data.gym.name} className="w-full h-full rounded-2xl object-cover" />
            ) : (
              <span className="text-3xl font-bold" style={{ color: accentColor }}>
                {data.gym.name.charAt(0)}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{data.gym.name}</h1>
          <p className="text-foreground-muted mb-6">
            Da biste omogućili marketing stranicu, postavite URL slug u podešavanjima brendiranja.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/gym-portal/manage/branding"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent hover:bg-accent/90 text-white font-medium rounded-xl transition-colors"
              style={{ backgroundColor: accentColor }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Podešavanja
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-white/10 hover:bg-white/5 text-foreground font-medium rounded-xl transition-colors"
            >
              Prijava za članove
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // This should never be reached since we always redirect in "redirect" mode
  // But keep as fallback
  return null;
}
