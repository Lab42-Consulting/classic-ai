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

export function StorefrontShop({ slug }: { slug: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();

  const [data, setData] = useState<ShopResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [searchInput, setSearchInput] = useState(searchParams.get("q") || "");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") || "");
  const [filtersOpen, setFiltersOpen] = useState(false);

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
    setFiltersOpen(false);
  }
  const setParam = (key: string, value: string) =>
    navigate((sp) => (value ? sp.set(key, value) : sp.delete(key)));
  const goToPage = (n: number) => navigate((sp) => sp.set("page", String(n)), false);

  const activeCategory = searchParams.get("category") || "";
  const activeBrand = searchParams.get("brand") || "";
  const inStock = searchParams.get("inStock") === "1";
  const currentSort = searchParams.get("sort") || "";
  const currentPage = data?.page || 1;
  const hasFilters = !!(activeCategory || activeBrand || inStock || searchParams.get("q") || searchParams.get("minPrice") || searchParams.get("maxPrice"));

  const topCats = (data?.categories || []).filter((c) => !c.parentId);
  const subsOf = (id: string) => (data?.categories || []).filter((c) => c.parentId === id);

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-foreground-muted">
        Prodavnica nije dostupna.
      </div>
    );
  }

  const Sidebar = (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted mb-2">Kategorije</h3>
        <ul className="space-y-0.5">
          <li>
            <button
              onClick={() => setParam("category", "")}
              className={`w-full text-left px-2 py-1.5 rounded-lg text-sm ${!activeCategory ? "bg-accent/15 text-foreground font-medium" : "text-foreground-muted hover:bg-white/5 hover:text-foreground"}`}
            >
              Sve kategorije
            </button>
          </li>
          {topCats.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => setParam("category", c.id)}
                className={`w-full text-left px-2 py-1.5 rounded-lg text-sm ${activeCategory === c.id ? "bg-accent/15 text-foreground font-medium" : "text-foreground-muted hover:bg-white/5 hover:text-foreground"}`}
              >
                {c.name}
              </button>
              {subsOf(c.id).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setParam("category", s.id)}
                  className={`w-full text-left pl-5 pr-2 py-1.5 rounded-lg text-sm ${activeCategory === s.id ? "bg-accent/15 text-foreground font-medium" : "text-foreground-muted hover:bg-white/5 hover:text-foreground"}`}
                >
                  {s.name}
                </button>
              ))}
            </li>
          ))}
        </ul>
      </div>

      {/* Brands */}
      {(data?.brands || []).length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted mb-2">Brendovi</h3>
          <ul className="space-y-0.5 max-h-64 overflow-y-auto">
            <li>
              <button
                onClick={() => setParam("brand", "")}
                className={`w-full text-left px-2 py-1.5 rounded-lg text-sm ${!activeBrand ? "bg-accent/15 text-foreground font-medium" : "text-foreground-muted hover:bg-white/5 hover:text-foreground"}`}
              >
                Svi brendovi
              </button>
            </li>
            {(data?.brands || []).map((b) => (
              <li key={b.id}>
                <button
                  onClick={() => setParam("brand", b.id)}
                  className={`w-full text-left px-2 py-1.5 rounded-lg text-sm ${activeBrand === b.id ? "bg-accent/15 text-foreground font-medium" : "text-foreground-muted hover:bg-white/5 hover:text-foreground"}`}
                >
                  {b.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Price */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted mb-2">Cena (RSD)</h3>
        <div className="flex items-center gap-2">
          <input
            type="number" min="0" placeholder="Od" value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="w-full px-2 py-1.5 bg-background-secondary border border-white/10 rounded-lg text-sm text-foreground focus:outline-none focus:border-accent"
          />
          <span className="text-foreground-muted">–</span>
          <input
            type="number" min="0" placeholder="Do" value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="w-full px-2 py-1.5 bg-background-secondary border border-white/10 rounded-lg text-sm text-foreground focus:outline-none focus:border-accent"
          />
        </div>
        <button
          onClick={() => navigate((sp) => {
            if (minPrice) sp.set("minPrice", minPrice); else sp.delete("minPrice");
            if (maxPrice) sp.set("maxPrice", maxPrice); else sp.delete("maxPrice");
          })}
          className="mt-2 w-full px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-foreground"
        >
          Primeni cenu
        </button>
      </div>

      {/* In stock */}
      <label className="flex items-center gap-2 cursor-pointer text-sm text-foreground">
        <input
          type="checkbox" checked={inStock}
          onChange={(e) => setParam("inStock", e.target.checked ? "1" : "")}
          className="w-4 h-4 accent-accent"
        />
        Samo dostupno
      </label>

      {hasFilters && (
        <button
          onClick={() => { setSearchInput(""); setMinPrice(""); setMaxPrice(""); router.push(`/gym-portal/${slug}/shop`); setFiltersOpen(false); }}
          className="w-full px-3 py-2 rounded-lg border border-white/10 text-sm text-foreground-muted hover:text-foreground hover:bg-white/5"
        >
          Poništi filtere
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <StorefrontHeader slug={slug} gymName={data?.gym.name || "Prodavnica"} gymLogo={data?.gym.logo || null} />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        {/* Search + sort bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <form
            onSubmit={(e) => { e.preventDefault(); setParam("q", searchInput.trim()); }}
            className="flex-1"
          >
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Pretraži proizvode..."
              className="w-full px-4 py-2.5 bg-background-secondary border border-white/10 rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent"
            />
          </form>
          <div className="flex gap-2">
            <button
              onClick={() => setFiltersOpen((o) => !o)}
              className="lg:hidden px-4 py-2.5 rounded-xl bg-background-secondary border border-white/10 text-foreground text-sm"
            >
              Filteri
            </button>
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

        <div className="flex gap-6">
          {/* Sidebar (desktop) */}
          <aside className="w-60 shrink-0 hidden lg:block">
            <div className="sticky top-20">{Sidebar}</div>
          </aside>

          {/* Sidebar (mobile, toggled) */}
          {filtersOpen && (
            <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setFiltersOpen(false)}>
              <div className="absolute left-0 top-0 bottom-0 w-72 max-w-[85%] bg-background border-r border-white/10 p-5 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-semibold text-foreground">Filteri</span>
                  <button onClick={() => setFiltersOpen(false)} className="text-foreground-muted">✕</button>
                </div>
                {Sidebar}
              </div>
            </div>
          )}

          {/* Products */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="py-20 text-center">
                <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : !data || data.products.length === 0 ? (
              <div className="py-20 text-center text-foreground-muted">Nema proizvoda za izabrane filtere.</div>
            ) : (
              <>
                <p className="text-sm text-foreground-muted mb-4">{data.total} proizvoda</p>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {data.products.map((p) => (
                    <ProductCard key={p.id} slug={slug} product={p} />
                  ))}
                </div>

                {data.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-8">
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
          </div>
        </div>
      </main>
    </div>
  );
}
