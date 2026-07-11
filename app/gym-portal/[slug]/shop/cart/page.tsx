"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { StorefrontHeader } from "@/components/storefront/StorefrontHeader";
import { getCart, updateQuantity, removeFromCart, type CartItem } from "@/lib/cart";
import { formatRsd } from "@/lib/storefront-format";

interface StoreInfo {
  name: string;
  logo: string | null;
  storeDeliveryFeeRsd: number | null;
  storeFreeDeliveryThresholdRsd: number | null;
}

export default function CartPage() {
  const { slug } = useParams<{ slug: string }>();
  const [items, setItems] = useState<CartItem[]>([]);
  const [store, setStore] = useState<StoreInfo | null>(null);

  useEffect(() => {
    const read = () => setItems(getCart(slug));
    read();
    window.addEventListener("cart:updated", read);
    return () => window.removeEventListener("cart:updated", read);
  }, [slug]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/public/shop/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setStore(data.gym);
        }
      } catch {
        /* ignore */
      }
    })();
  }, [slug]);

  const subtotal = items.reduce((sum, i) => sum + i.priceRsd * i.quantity, 0);
  const threshold = store?.storeFreeDeliveryThresholdRsd ?? null;
  const remainingForFree = threshold !== null ? Math.max(0, threshold - subtotal) : null;

  return (
    <div className="min-h-screen bg-background">
      <StorefrontHeader slug={slug} gymName={store?.name || "Prodavnica"} gymLogo={store?.logo || null} />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <h1 className="text-2xl font-bold text-foreground mb-6">Korpa</h1>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-foreground-muted mb-4">Vaša korpa je prazna.</p>
            <Link
              href={`/gym-portal/${slug}/shop/browse`}
              className="inline-block px-6 py-3 rounded-xl bg-accent hover:bg-accent/90 text-white font-medium"
            >
              Pogledaj proizvode
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center gap-3 p-3 rounded-2xl border border-white/10 bg-background-secondary"
                >
                  <div className="w-16 h-16 rounded-xl bg-white/5 overflow-hidden flex-shrink-0">
                    {item.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-sm text-foreground-muted">{formatRsd(item.priceRsd)}</p>
                  </div>
                  <div className="flex items-center rounded-lg border border-white/10">
                    <button
                      onClick={() => updateQuantity(slug, item.productId, item.quantity - 1)}
                      className="px-3 py-1.5 text-foreground-muted hover:text-foreground"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-foreground text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(slug, item.productId, item.quantity + 1)}
                      className="px-3 py-1.5 text-foreground-muted hover:text-foreground"
                    >
                      +
                    </button>
                  </div>
                  <div className="w-24 text-right font-semibold text-foreground hidden sm:block">
                    {formatRsd(item.priceRsd * item.quantity)}
                  </div>
                  <button
                    onClick={() => removeFromCart(slug, item.productId)}
                    className="p-2 text-foreground-muted hover:text-red-400"
                    aria-label="Ukloni"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {remainingForFree !== null && (
              <p className="mt-4 text-sm text-foreground-muted">
                {remainingForFree > 0
                  ? `Dodajte još ${formatRsd(remainingForFree)} za besplatnu dostavu.`
                  : "Ostvarili ste besplatnu dostavu! 🎉"}
              </p>
            )}

            <div className="mt-6 p-4 rounded-2xl border border-white/10 bg-background-secondary">
              <div className="flex items-center justify-between mb-4">
                <span className="text-foreground-muted">Međuzbir</span>
                <span className="text-xl font-bold text-foreground">{formatRsd(subtotal)}</span>
              </div>
              <Link
                href={`/gym-portal/${slug}/shop/checkout`}
                className="block w-full text-center px-6 py-3 rounded-xl bg-accent hover:bg-accent/90 text-white font-semibold"
              >
                Nastavi na plaćanje
              </Link>
              <p className="text-xs text-foreground-muted text-center mt-2">
                Plaćanje pouzećem ili lično — bez online kartice.
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
