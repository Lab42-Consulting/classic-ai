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

/** Compact select with a custom chevron, matching the toolbar styling. */
function Select({
  value,
  onChange,
  children,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  ariaLabel: string;
}) {
  return (
    <div className="relative">
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none pl-4 pr-9 py-2.5 bg-background-secondary border border-white/10 rounded-xl text-sm text-foreground focus:outline-none focus:border-accent cursor-pointer hover:border-white/25 transition-colors"
      >
        {children}
      </select>
      <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
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
        {/* Toolbar: search + brand + sort + availability */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-5">
          <form onSubmit={(e) => { e.preventDefault(); setParam("q", searchInput.trim()); }} className="relative flex-1">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Pretraži proizvode..."
              className="w-full pl-12 pr-4 py-2.5 bg-background-secondary border border-white/10 rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent"
            />
          </form>

          <div className="flex items-center gap-2 flex-wrap">
            {data && data.brands.length > 0 && (
              <Select ariaLabel="Brend" value={activeBrand} onChange={(v) => setParam("brand", v)}>
                <option value="">Svi brendovi</option>
                {data.brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </Select>
            )}
            <Select ariaLabel="Sortiranje" value={currentSort} onChange={(v) => setParam("sort", v)}>
              <option value="">Preporučeno</option>
              <option value="price_asc">Cena: rastuće</option>
              <option value="price_desc">Cena: opadajuće</option>
              <option value="name">Naziv A–Š</option>
              <option value="newest">Najnovije</option>
            </Select>
            <button
              onClick={() => setParam("inStock", inStock ? "" : "1")}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                inStock ? "bg-accent text-white border-accent" : "bg-background-secondary text-foreground-muted border-white/10 hover:text-foreground hover:border-white/25"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${inStock ? "bg-white" : "bg-emerald-400"}`} />
              Na stanju
            </button>
          </div>
        </div>

        {/* Category pills — the primary selector */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setParam("category", "")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              !activeCategory ? "bg-accent text-white shadow-sm shadow-accent/25" : "bg-white/[0.03] text-foreground-muted border border-white/10 hover:text-foreground hover:border-white/25"
            }`}
          >
            Sve
          </button>
          {topCats.map((c) => {
            const on = activeCategory === c.id || activeCat?.parentId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setParam("category", c.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  on ? "bg-accent text-white shadow-sm shadow-accent/25" : "bg-white/[0.03] text-foreground-muted border border-white/10 hover:text-foreground hover:border-white/25"
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </div>

        {/* Subcategory chips — quieter, only when a parent is active */}
        {visibleSubs.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {visibleSubs.map((s) => (
              <button
                key={s.id}
                onClick={() => setParam("category", s.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  activeCategory === s.id ? "bg-accent/20 text-foreground border border-accent/50" : "text-foreground-muted hover:text-foreground hover:bg-white/5 border border-transparent"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}

        {/* Result bar */}
        <div className="flex items-center justify-between mt-5 mb-5 pb-4 border-b border-white/[0.06]">
          <p className="text-sm text-foreground-muted">
            {loading ? "Učitavanje…" : `${data?.total ?? 0} proizvoda`}
          </p>
          {hasFilters && (
            <button
              onClick={() => { setSearchInput(""); router.push(`/gym-portal/${slug}/shop`); }}
              className="flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Poništi filtere
            </button>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div className="py-24 text-center">
            <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : !data || data.products.length === 0 ? (
          <div className="py-24 text-center text-foreground-muted">Nema proizvoda za izabrane filtere.</div>
        ) : (
          <>
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
