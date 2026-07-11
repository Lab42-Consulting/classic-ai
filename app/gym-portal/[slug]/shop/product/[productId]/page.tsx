import Link from "next/link";
import { notFound } from "next/navigation";
import { loadStorefrontProduct } from "@/lib/storefront";
import { StorefrontHeader } from "@/components/storefront/StorefrontHeader";
import { ProductCard } from "@/components/storefront/ProductCard";
import { AddToCart } from "@/components/storefront/AddToCart";
import { formatRsd } from "@/lib/storefront-format";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string; productId: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug, productId } = await params;
  const data = await loadStorefrontProduct(slug, productId);
  return { title: data ? `${data.product.name} — Prodavnica` : "Proizvod" };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug, productId } = await params;
  const data = await loadStorefrontProduct(slug, productId);
  if (!data) notFound();

  const { gym, product, related } = data;

  return (
    <div className="min-h-screen bg-background">
      <StorefrontHeader slug={slug} gymName={gym.name} gymLogo={gym.logo} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <nav className="text-sm text-foreground-muted mb-4 flex items-center gap-2">
          <Link href={`/gym-portal/${slug}/shop`} className="hover:text-foreground">Prodavnica</Link>
          <span>/</span>
          <Link href={`/gym-portal/${slug}/shop/browse`} className="hover:text-foreground">Svi proizvodi</Link>
          {product.categoryName && (
            <>
              <span>/</span>
              <Link
                href={`/gym-portal/${slug}/shop/browse?category=${product.categoryId}`}
                className="hover:text-foreground"
              >
                {product.categoryName}
              </Link>
            </>
          )}
        </nav>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Image */}
          <div className="aspect-square rounded-3xl bg-background-secondary border border-white/10 flex items-center justify-center overflow-hidden">
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <svg className="w-20 h-20 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4" />
              </svg>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col">
            {product.brandName && (
              <span className="text-sm uppercase tracking-wide text-foreground-muted">{product.brandName}</span>
            )}
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mt-1">{product.name}</h1>
            <div className="mt-3 flex items-center gap-3">
              <span className="text-2xl font-bold text-foreground">{formatRsd(product.priceRsd)}</span>
              {product.available ? (
                <span className="text-sm text-emerald-400">Na stanju</span>
              ) : (
                <span className="text-sm text-red-400">Nema na stanju</span>
              )}
            </div>

            {product.description && (
              <p className="text-foreground-muted mt-4 leading-relaxed whitespace-pre-line">{product.description}</p>
            )}

            <div className="mt-6">
              <AddToCart slug={slug} product={product} />
            </div>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-14">
            <h2 className="text-xl font-bold text-foreground mb-4">Slični proizvodi</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {related.map((p) => (
                <ProductCard key={p.id} slug={slug} product={p} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
