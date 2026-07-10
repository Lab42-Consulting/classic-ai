"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/storefront/ProductCard";
import { StorefrontHeader } from "@/components/storefront/StorefrontHeader";

interface Category {
  id: string;
  name: string;
  parentId: string | null;
}
interface Brand {
  id: string;
  name: string;
}
interface Product {
  id: string;
  name: string;
  imageUrl: string | null;
  priceRsd: number;
  brandName: string | null;
  available: boolean;
}
interface Response {
  gym: { name: string; logo: string | null };
  products: Product[];
  total: number;
  page: number;
  totalPages: number;
  categories: Category[];
  brands: Brand[];
}

export default function BrowsePage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [searchInput, setSearchInput] = useState(searchParams.get("q") || "");

  const qs = searchParams.toString();

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/public/shop/${slug}/products?${qs}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [slug, qs]);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  function setParam(key: string, value: string) {
    const sp = new URLSearchParams(qs);
    if (value) sp.set(key, value);
    else sp.delete(key);
    if (key !== "page") sp.delete("page"); // reset paging when filters change
    router.push(`/gym-portal/${slug}/shop/browse?${sp.toString()}`);
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-foreground-muted">
        Prodavnica nije dostupna.
      </div>
    );
  }

  const topCategories = (data?.categories || []).filter((c) => !c.parentId);
  const subCategories = (data?.categories || []).filter((c) => c.parentId);
  const currentCategory = searchParams.get("category") || "";
  const currentBrand = searchParams.get("brand") || "";
  const currentSort = searchParams.get("sort") || "";
  const currentPage = data?.page || 1;

  return (
    <div className="min-h-screen bg-background">
      <StorefrontHeader slug={slug} gymName={data?.gym.name || "Prodavnica"} gymLogo={data?.gym.logo || null} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Filter bar */}
        <div className="flex flex-col lg:flex-row gap-3 mb-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setParam("q", searchInput.trim());
            }}
            className="flex-1"
          >
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Pretraži proizvode..."
              className="w-full px-4 py-2.5 bg-background-secondary border border-white/10 rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent"
            />
          </form>
          <div className="flex gap-2 flex-wrap">
            <select
              value={currentCategory}
              onChange={(e) => setParam("category", e.target.value)}
              className="px-3 py-2.5 bg-background-secondary border border-white/10 rounded-xl text-foreground focus:outline-none focus:border-accent"
            >
              <option value="">Sve kategorije</option>
              {topCategories.map((c) => (
                <optgroup key={c.id} label={c.name}>
                  <option value={c.id}>{c.name} (sve)</option>
                  {subCategories
                    .filter((s) => s.parentId === c.id)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {"— " + s.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
            <select
              value={currentBrand}
              onChange={(e) => setParam("brand", e.target.value)}
              className="px-3 py-2.5 bg-background-secondary border border-white/10 rounded-xl text-foreground focus:outline-none focus:border-accent"
            >
              <option value="">Svi brendovi</option>
              {(data?.brands || []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <select
              value={currentSort}
              onChange={(e) => setParam("sort", e.target.value)}
              className="px-3 py-2.5 bg-background-secondary border border-white/10 rounded-xl text-foreground focus:outline-none focus:border-accent"
            >
              <option value="">Preporučeno</option>
              <option value="price_asc">Cena: rastuće</option>
              <option value="price_desc">Cena: opadajuće</option>
              <option value="name">Naziv</option>
              <option value="newest">Najnovije</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : !data || data.products.length === 0 ? (
          <div className="py-20 text-center text-foreground-muted">Nema proizvoda za izabrane filtere.</div>
        ) : (
          <>
            <p className="text-sm text-foreground-muted mb-4">{data.total} proizvoda</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {data.products.map((p) => (
                <ProductCard key={p.id} slug={slug} product={p} />
              ))}
            </div>

            {data.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-8">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setParam("page", String(currentPage - 1))}
                  className="px-4 py-2 rounded-xl bg-background-secondary border border-white/10 text-foreground disabled:opacity-40"
                >
                  Prethodna
                </button>
                <span className="text-sm text-foreground-muted">
                  {currentPage} / {data.totalPages}
                </span>
                <button
                  disabled={currentPage >= data.totalPages}
                  onClick={() => setParam("page", String(currentPage + 1))}
                  className="px-4 py-2 rounded-xl bg-background-secondary border border-white/10 text-foreground disabled:opacity-40"
                >
                  Sledeća
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
