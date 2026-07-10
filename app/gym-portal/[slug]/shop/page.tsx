import Link from "next/link";
import { notFound } from "next/navigation";
import { loadStorefrontData } from "@/lib/storefront";
import { StorefrontHeader } from "@/components/storefront/StorefrontHeader";
import { ProductCard } from "@/components/storefront/ProductCard";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const data = await loadStorefrontData(slug);
  return { title: data ? `Prodavnica — ${data.gym.name}` : "Prodavnica" };
}

export default async function StorefrontLandingPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await loadStorefrontData(slug);
  if (!data) notFound();

  const { gym, categories, brands, featured } = data;
  const topLevel = categories.filter((c) => !c.parentId);
  const accent = gym.primaryColor || "#ef4444";

  return (
    <div className="min-h-screen bg-background">
      <StorefrontHeader slug={slug} gymName={gym.name} gymLogo={gym.logo} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-12">
        {/* Hero */}
        <section className="rounded-3xl border border-white/10 bg-background-secondary p-8 sm:p-12 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">Prodavnica {gym.name}</h1>
          <p className="text-foreground-muted mt-3 max-w-xl mx-auto">
            Suplementi, oprema i zdrava ishrana. Poručite online, platite lično ili pouzećem.
          </p>
          <Link
            href={`/gym-portal/${slug}/shop/browse`}
            className="inline-block mt-6 px-6 py-3 rounded-xl text-white font-semibold"
            style={{ backgroundColor: accent }}
          >
            Pogledaj sve proizvode
          </Link>
        </section>

        {/* Categories */}
        {topLevel.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">Kategorije</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {topLevel.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/gym-portal/${slug}/shop/browse?category=${cat.id}`}
                  className="p-4 rounded-2xl border border-white/10 bg-background-secondary hover:border-white/20 transition-colors text-center"
                >
                  <span className="font-medium text-foreground">{cat.name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Featured */}
        {featured.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">Istaknuti proizvodi</h2>
              <Link href={`/gym-portal/${slug}/shop/browse`} className="text-sm text-foreground-muted hover:text-foreground">
                Vidi sve →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {featured.map((p) => (
                <ProductCard key={p.id} slug={slug} product={p} />
              ))}
            </div>
          </section>
        )}

        {/* Brands */}
        {brands.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">Brendovi</h2>
            <div className="flex flex-wrap gap-2">
              {brands.map((b) => (
                <Link
                  key={b.id}
                  href={`/gym-portal/${slug}/shop/browse?brand=${b.id}`}
                  className="px-4 py-2 rounded-xl border border-white/10 bg-background-secondary hover:border-white/20 text-sm text-foreground"
                >
                  {b.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {featured.length === 0 && topLevel.length === 0 && (
          <div className="text-center py-16 text-foreground-muted">
            Prodavnica je uskoro dostupna.
          </div>
        )}
      </main>

      <footer className="border-t border-white/10 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 text-sm text-foreground-muted flex flex-col sm:flex-row justify-between gap-2">
          <span>{gym.name} — Prodavnica</span>
          {gym.storeContactPhone && <span>Kontakt: {gym.storeContactPhone}</span>}
        </div>
      </footer>
    </div>
  );
}
