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

const PRICE_BUCKETS = [
  { key: "", label: "Sve cene", min: "", max: "" },
  { key: "lt3000", label: "do 3.000", min: "", max: "3000" },
  { key: "3000-6000", label: "3.000–6.000", min: "3000", max: "6000" },
  { key: "gt6000", label: "preko 6.000", min: "6000", max: "" },
];

// --- tiny inline icons ---
const IconSearch = (p: { className?: string }) => (
  <svg className={p.className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);
const IconChevron = (p: { className?: string }) => (
  <svg className={p.className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);
const IconClose = (p: { className?: string }) => (
  <svg className={p.className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const IconSliders = (p: { className?: string }) => (
  <svg className={p.className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M6.75 12h10.5m-7.5 5.25h4.5" />
  </svg>
);

export function StorefrontShop({ slug }: { slug: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();

  const [data, setData] = useState<ShopResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [searchInput, setSearchInput] = useState(searchParams.get("q") || "");
  const [brandQuery, setBrandQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  // Drawer: lock scroll + Escape to close
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  function navigate(mutate: (sp: URLSearchParams) => void, resetPage = true) {
    const sp = new URLSearchParams(qs);
    mutate(sp);
    if (resetPage) sp.delete("page");
    router.push(`/gym-portal/${slug}/shop?${sp.toString()}`);
  }
  const setParam = (key: string, value: string) =>
    navigate((sp) => (value ? sp.set(key, value) : sp.delete(key)));
  const goToPage = (n: number) => navigate((sp) => sp.set("page", String(n)), false);
  const setPrice = (b: (typeof PRICE_BUCKETS)[number]) =>
    navigate((sp) => {
      b.min ? sp.set("minPrice", b.min) : sp.delete("minPrice");
      b.max ? sp.set("maxPrice", b.max) : sp.delete("maxPrice");
    });

  const activeCategory = searchParams.get("category") || "";
  const activeBrand = searchParams.get("brand") || "";
  const inStock = searchParams.get("inStock") === "1";
  const currentSort = searchParams.get("sort") || "";
  const curMin = searchParams.get("minPrice") || "";
  const curMax = searchParams.get("maxPrice") || "";
  const activePriceKey = PRICE_BUCKETS.find((b) => b.min === curMin && b.max === curMax)?.key ?? "";
  const q = searchParams.get("q") || "";
  const currentPage = data?.page || 1;

  const cats = data?.categories || [];
  const topCats = cats.filter((c) => !c.parentId);
  const activeCat = cats.find((c) => c.id === activeCategory) || null;
  const activeParentId = activeCat ? activeCat.parentId || activeCat.id : null;

  const activeCount = [activeCategory, activeBrand, inStock, q, curMin || curMax].filter(Boolean).length;
  const hasFilters = activeCount > 0;
  const clearAll = () => {
    setSearchInput("");
    setBrandQuery("");
    router.push(`/gym-portal/${slug}/shop`);
  };

  // --- shared row styles ---
  const catRow = (selected: boolean, expanded: boolean) =>
    `group w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
      selected
        ? "bg-accent text-white shadow-[0_8px_22px_-8px_var(--accent-glow)]"
        : expanded
          ? "text-foreground bg-white/[0.06]"
          : "text-foreground-muted hover:text-foreground hover:bg-white/5"
    }`;
  const subRow = (sel: boolean) =>
    `w-full text-left px-3 py-1.5 rounded-lg text-[13px] transition-all ${
      sel ? "text-accent font-semibold bg-accent/10" : "text-foreground-muted hover:text-foreground hover:bg-white/[0.04]"
    }`;
  const brandRow = (sel: boolean) =>
    `group w-full flex items-center justify-between gap-2 px-3.5 py-2 rounded-lg text-sm transition-all ${
      sel ? "bg-accent/10 text-foreground font-semibold ring-1 ring-inset ring-accent/40" : "text-foreground-muted hover:text-foreground hover:bg-white/5"
    }`;
  const pricePill = (on: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
      on ? "bg-accent text-white" : "bg-background-tertiary/70 text-foreground-muted border border-white/10 hover:text-foreground hover:border-white/25"
    }`;

  const RadioDot = ({ on }: { on: boolean }) => (
    <span className={`w-4 h-4 rounded-full border shrink-0 grid place-items-center transition-colors ${on ? "border-accent" : "border-white/25"}`}>
      {on && <span className="w-2 h-2 rounded-full bg-accent shadow-[0_0_8px_var(--accent-glow)]" />}
    </span>
  );

  const filteredBrands = (data?.brands || []).filter((b) => b.name.toLowerCase().includes(brandQuery.toLowerCase()));

  // --- the filter rail (rendered in the desktop aside and the mobile drawer) ---
  const railContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between gap-3 px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black uppercase tracking-[0.16em] text-foreground">Filteri</span>
          {activeCount > 0 && (
            <span className="grid place-items-center min-w-6 h-6 px-1.5 rounded-full bg-accent text-white text-xs font-bold shadow-[0_0_16px_var(--accent-glow)]">
              {activeCount}
            </span>
          )}
        </div>
        {hasFilters && (
          <button onClick={clearAll} className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted hover:text-accent transition-colors">
            Poništi
          </button>
        )}
      </div>

      {/* Kategorije (elastic) */}
      <div className="flex flex-col min-h-0 basis-0 grow-[1.2] border-t border-white/[0.06]">
        <h4 className="shrink-0 px-4 pt-3 pb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-foreground-muted">Kategorije</h4>
        <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-2 space-y-1 [mask-image:linear-gradient(to_bottom,transparent,black_12px,black_calc(100%_-_12px),transparent)]">
          <button onClick={() => setParam("category", "")} className={catRow(!activeCategory, false)}>
            <span className="truncate">Sve kategorije</span>
          </button>
          {topCats.map((c) => {
            const subs = cats.filter((x) => x.parentId === c.id);
            const selected = activeCategory === c.id;
            const expanded = c.id === activeParentId;
            return (
              <div key={c.id}>
                <button onClick={() => setParam("category", c.id)} className={catRow(selected, expanded && !selected)}>
                  <span className="truncate">{c.name}</span>
                  {subs.length > 0 && (
                    <IconChevron
                      className={`w-3.5 h-3.5 shrink-0 transition-transform ${expanded ? `rotate-90 ${selected ? "text-white" : "text-accent"}` : "text-foreground-muted"}`}
                    />
                  )}
                </button>
                {expanded && subs.length > 0 && (
                  <div className="ml-4 mt-1 mb-1 pl-3 border-l border-white/[0.07] flex flex-col gap-0.5">
                    {subs.map((s) => (
                      <button key={s.id} onClick={() => setParam("category", s.id)} className={subRow(activeCategory === s.id)}>
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Brendovi (elastic) */}
      <div className="flex flex-col min-h-0 basis-0 grow border-t border-white/[0.06]">
        <h4 className="shrink-0 px-4 pt-3 pb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-foreground-muted">Brendovi</h4>
        <div className="shrink-0 px-3 pb-2">
          <input
            value={brandQuery}
            onChange={(e) => setBrandQuery(e.target.value)}
            placeholder="Traži brend…"
            className="w-full px-3 py-1.5 text-[13px] bg-background-tertiary/60 border border-white/10 rounded-lg text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent"
          />
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-2 space-y-0.5 [mask-image:linear-gradient(to_bottom,transparent,black_12px,black_calc(100%_-_12px),transparent)]">
          <button onClick={() => setParam("brand", "")} className={brandRow(!activeBrand)}>
            <span className="truncate">Svi brendovi</span>
            <RadioDot on={!activeBrand} />
          </button>
          {filteredBrands.map((b) => (
            <button key={b.id} onClick={() => setParam("brand", activeBrand === b.id ? "" : b.id)} className={brandRow(activeBrand === b.id)}>
              <span className="truncate">{b.name}</span>
              <RadioDot on={activeBrand === b.id} />
            </button>
          ))}
          {filteredBrands.length === 0 && <p className="px-3 py-2 text-xs text-foreground-muted">Nema rezultata.</p>}
        </div>
      </div>

      {/* Cena (fixed) */}
      <div className="shrink-0 px-4 pt-3 pb-3 border-t border-white/[0.06]">
        <h4 className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-foreground-muted">Cena</h4>
        <div className="flex flex-wrap gap-1.5">
          {PRICE_BUCKETS.map((b) => (
            <button key={b.key} onClick={() => setPrice(b)} className={pricePill(activePriceKey === b.key)}>
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Na stanju (fixed) */}
      <div className="shrink-0 px-4 pt-1 pb-4">
        <button
          onClick={() => setParam("inStock", inStock ? "" : "1")}
          className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border transition-all ${
            inStock ? "bg-accent/10 border-accent/40 text-foreground" : "bg-background-tertiary/60 border-white/10 text-foreground-muted hover:border-white/20"
          }`}
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <span className={`w-2 h-2 rounded-full ${inStock ? "bg-emerald-400 shadow-[0_0_8px] shadow-emerald-400/60" : "bg-white/30"}`} />
            Samo na stanju
          </span>
          <span className={`relative w-10 h-6 rounded-full transition-colors ${inStock ? "bg-accent" : "bg-white/15"}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${inStock ? "translate-x-4" : ""}`} />
          </span>
        </button>
      </div>
    </div>
  );

  // applied-filter chips (toolbar)
  const chips: { label: string; remove: () => void }[] = [];
  if (activeCat) chips.push({ label: activeCat.name, remove: () => setParam("category", "") });
  if (activeBrand) chips.push({ label: data?.brands.find((b) => b.id === activeBrand)?.name || "Brend", remove: () => setParam("brand", "") });
  if (inStock) chips.push({ label: "Na stanju", remove: () => setParam("inStock", "") });
  const activeBucket = PRICE_BUCKETS.find((b) => b.key && b.key === activePriceKey);
  if (activeBucket) chips.push({ label: activeBucket.label, remove: () => setPrice(PRICE_BUCKETS[0]) });
  if (q) chips.push({ label: `„${q}”`, remove: () => { setSearchInput(""); setParam("q", ""); } });

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-foreground-muted">Prodavnica nije dostupna.</div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <StorefrontHeader slug={slug} gymName={data?.gym.name || "Prodavnica"} gymLogo={data?.gym.logo || null} />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-start gap-6 lg:gap-8 pt-6">
          {/* Desktop rail */}
          <aside className="relative hidden lg:flex lg:flex-col shrink-0 w-72 xl:w-80 self-start sticky top-[5.5rem] h-[calc(100vh-7rem)] bg-background-secondary/70 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-[0_24px_60px_-24px_rgba(0,0,0,0.7)]">
            <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-40 w-40 rounded-full bg-accent/20 blur-3xl opacity-60" />
            <div className="pointer-events-none absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
            {railContent}
          </aside>

          {/* Grid column */}
          <div className="flex-1 min-w-0 pb-16">
            {/* Toolbar */}
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setDrawerOpen(true)}
                className="lg:hidden inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-accent text-white text-sm font-semibold shadow-[0_10px_28px_-10px_var(--accent-glow)]"
              >
                <IconSliders className="w-4 h-4" />
                Filteri
                {activeCount > 0 && <span className="grid place-items-center min-w-5 h-5 px-1 rounded-full bg-white/25 text-[11px] font-bold">{activeCount}</span>}
              </button>
              <form onSubmit={(e) => { e.preventDefault(); setParam("q", searchInput.trim()); }} className="relative flex-1 min-w-0">
                <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted pointer-events-none" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Pretraži proizvode…"
                  className="w-full h-11 pl-11 pr-4 rounded-xl bg-background-secondary border border-white/10 text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent"
                />
              </form>
              <div className="relative shrink-0">
                <select
                  aria-label="Sortiranje"
                  value={currentSort}
                  onChange={(e) => setParam("sort", e.target.value)}
                  className="appearance-none h-11 pl-4 pr-10 rounded-xl bg-background-secondary border border-white/10 text-sm font-medium text-foreground hover:border-white/25 focus:outline-none focus:border-accent cursor-pointer"
                >
                  <option value="">Preporučeno</option>
                  <option value="price_asc">Cena: rastuće</option>
                  <option value="price_desc">Cena: opadajuće</option>
                  <option value="name">Naziv A–Š</option>
                  <option value="newest">Najnovije</option>
                </select>
                <IconChevron className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rotate-90 text-foreground-muted pointer-events-none" />
              </div>
            </div>

            {/* Count + applied chips */}
            <div className="flex items-center gap-2 flex-wrap mb-5">
              <span className="text-sm text-foreground-muted mr-1">{loading ? "Učitavanje…" : `${data?.total ?? 0} proizvoda`}</span>
              {chips.map((c, i) => (
                <button
                  key={i}
                  onClick={c.remove}
                  className="group inline-flex items-center gap-1.5 h-8 pl-3 pr-2 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-semibold hover:bg-accent/15 transition-colors"
                >
                  <span className="truncate max-w-[160px]">{c.label}</span>
                  <span className="grid place-items-center w-4 h-4 rounded-full group-hover:bg-accent/25">
                    <IconClose className="w-3 h-3" />
                  </span>
                </button>
              ))}
            </div>

            {/* Results */}
            {loading ? (
              <div className="py-24 text-center">
                <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : !data || data.products.length === 0 ? (
              <div className="py-24 text-center">
                <p className="text-foreground-muted mb-4">Nema proizvoda za izabrane filtere.</p>
                {hasFilters && (
                  <button onClick={clearAll} className="text-sm font-semibold text-accent hover:text-accent-hover">Poništi filtere</button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-4 gap-4">
                  {data.products.map((p) => (
                    <ProductCard key={p.id} slug={slug} product={p} />
                  ))}
                </div>

                {data.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-10">
                    <button disabled={currentPage <= 1} onClick={() => goToPage(currentPage - 1)} className="px-4 py-2 rounded-xl bg-background-secondary border border-white/10 text-foreground disabled:opacity-40">
                      Prethodna
                    </button>
                    <span className="text-sm text-foreground-muted">{currentPage} / {data.totalPages}</span>
                    <button disabled={currentPage >= data.totalPages} onClick={() => goToPage(currentPage + 1)} className="px-4 py-2 rounded-xl bg-background-secondary border border-white/10 text-foreground disabled:opacity-40">
                      Sledeća
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div onClick={() => setDrawerOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="absolute inset-y-0 left-0 w-[86%] max-w-sm bg-background-secondary border-r border-white/10 flex flex-col">
            <div className="shrink-0 flex items-center justify-between px-4 h-14 border-b border-white/10">
              <span className="text-sm font-black uppercase tracking-[0.16em] text-foreground">Filteri</span>
              <button onClick={() => setDrawerOpen(false)} className="p-2 rounded-lg text-foreground-muted hover:text-foreground hover:bg-white/5">
                <IconClose className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 min-h-0">{railContent}</div>
            <div className="shrink-0 p-3 border-t border-white/10">
              <button onClick={() => setDrawerOpen(false)} className="w-full h-12 rounded-xl bg-accent text-white font-semibold shadow-[0_10px_28px_-10px_var(--accent-glow)]">
                Prikaži {data?.total ?? 0} proizvoda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
