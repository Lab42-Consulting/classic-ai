"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StorefrontHeader } from "./StorefrontHeader";
import { ProductCard } from "./ProductCard";

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
interface ShopResponse {
  gym: { name: string; logo: string | null };
  products: Product[];
  total: number;
  page: number;
  totalPages: number;
  categories: Category[];
  brands: Brand[];
}

function Chip({
  active,
  onClick,
  children,
  size = "md",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  size?: "md" | "sm";
}) {
  return (
    <button
      onClick={onClick}
      className={`${size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"} rounded-xl font-medium border transition-colors ${
        active
          ? "bg-accent text-white border-accent shadow-sm"
          : "bg-background-secondary text-foreground-muted border-white/10 hover:text-foreground hover:border-white/25"
      }`}
    >
      {children}
    </button>
  );
}

export function StorefrontShop({ slug }: { slug: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();

  const [data, setData] = useState<ShopResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [searchInput, setSearchInput] = useState(searchParams.get("q") || "");

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

  function navigate(mutate: (sp: URLSearchParams) => void, resetPage = true) {
    const sp = new URLSearchParams(qs);
    mutate(sp);
    if (resetPage) sp.delete("page");
    router.push(`/gym-portal/${slug}/shop?${sp.toString()}`);
  }
  const setParam = (key: string, value: string) =>
    navigate((sp) => (value ? sp.set(key, value) : sp.delete(key)));
  const goToPage = (n: number) => navigate((sp) => sp.set("page", String(n)), false);

  const activeCategory = searchParams.get("category") || "";
  const activeBrand = searchParams.get("brand") || "";
  const inStock = searchParams.get("inStock") === "1";
  const currentSort = searchParams.get("sort") || "";
  const currentPage = data?.page || 1;
  const hasFilters = !!(activeCategory || activeBrand || inStock || searchParams.get("q"));

  const cats = data?.categories || [];
  const topCats = cats.filter((c) => !c.parentId);
  const activeCat = cats.find((c) => c.id === activeCategory) || null;
  const activeParentId = activeCat ? activeCat.parentId || activeCat.id : null;
  const visibleSubs = activeParentId ? cats.filter((c) => c.parentId === activeParentId) : [];

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-foreground-muted">
        Prodavnica nije dostupna.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <StorefrontHeader slug={slug} gymName={data?.gym.name || "Prodavnica"} gymLogo={data?.gym.logo || null} />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        {/* Search + sort */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <form onSubmit={(e) => { e.preventDefault(); setParam("q", searchInput.trim()); }} className="relative flex-1">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Pretraži proizvode..."
              className="w-full pl-11 pr-4 py-3 bg-background-secondary border border-white/10 rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent"
            />
          </form>
          <select
            value={currentSort}
            onChange={(e) => setParam("sort", e.target.value)}
            className="px-4 py-3 bg-background-secondary border border-white/10 rounded-xl text-foreground focus:outline-none focus:border-accent"
          >
            <option value="">Sortiraj: preporučeno</option>
            <option value="price_asc">Cena: rastuće</option>
            <option value="price_desc">Cena: opadajuće</option>
            <option value="name">Naziv A–Š</option>
            <option value="newest">Najnovije</option>
          </select>
        </div>

        {/* Category tiles */}
        <div className="flex flex-wrap gap-2 mb-3">
          <Chip active={!activeCategory} onClick={() => setParam("category", "")}>Sve</Chip>
          {topCats.map((c) => (
            <Chip
              key={c.id}
              active={activeCategory === c.id || activeCat?.parentId === c.id}
              onClick={() => setParam("category", c.id)}
            >
              {c.name}
            </Chip>
          ))}
        </div>

        {/* Subcategory tiles (when a parent with subs is active) */}
        {visibleSubs.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3 pl-1">
            {visibleSubs.map((s) => (
              <Chip key={s.id} size="sm" active={activeCategory === s.id} onClick={() => setParam("category", s.id)}>
                {s.name}
              </Chip>
            ))}
          </div>
        )}

        {/* Brands + availability */}
        {data && data.brands.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-xs uppercase tracking-wide text-foreground-muted mr-1">Brend</span>
            <Chip size="sm" active={!activeBrand} onClick={() => setParam("brand", "")}>Svi</Chip>
            {data.brands.map((b) => (
              <Chip key={b.id} size="sm" active={activeBrand === b.id} onClick={() => setParam("brand", b.id)}>
                {b.name}
              </Chip>
            ))}
            <span className="w-px h-5 bg-white/10 mx-1" />
            <Chip size="sm" active={inStock} onClick={() => setParam("inStock", inStock ? "" : "1")}>
              Na stanju
            </Chip>
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="py-24 text-center">
            <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : !data || data.products.length === 0 ? (
          <div className="py-24 text-center text-foreground-muted">Nema proizvoda za izabrane filtere.</div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-foreground-muted">{data.total} proizvoda</p>
              {hasFilters && (
                <button
                  onClick={() => { setSearchInput(""); router.push(`/gym-portal/${slug}/shop`); }}
                  className="text-sm text-foreground-muted hover:text-foreground underline"
                >
                  Poništi filtere
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {data.products.map((p) => (
                <ProductCard key={p.id} slug={slug} product={p} />
              ))}
            </div>

            {data.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-10">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => goToPage(currentPage - 1)}
                  className="px-4 py-2 rounded-xl bg-background-secondary border border-white/10 text-foreground disabled:opacity-40"
                >
                  Prethodna
                </button>
                <span className="text-sm text-foreground-muted">{currentPage} / {data.totalPages}</span>
                <button
                  disabled={currentPage >= data.totalPages}
                  onClick={() => goToPage(currentPage + 1)}
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
