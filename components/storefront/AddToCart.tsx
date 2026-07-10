"use client";

import { useState } from "react";
import { addToCart } from "@/lib/cart";

interface Props {
  slug: string;
  product: {
    id: string;
    name: string;
    priceRsd: number;
    imageUrl: string | null;
    available: boolean;
    maxStock?: number | null;
  };
}

export function AddToCart({ slug, product }: Props) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  if (!product.available) {
    return (
      <button
        disabled
        className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/5 text-foreground-muted font-medium cursor-not-allowed"
      >
        Nema na stanju
      </button>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      <div className="flex items-center rounded-xl border border-white/10 bg-background-secondary">
        <button
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          className="px-4 py-3 text-foreground-muted hover:text-foreground"
          aria-label="Smanji"
        >
          −
        </button>
        <span className="w-10 text-center text-foreground">{qty}</span>
        <button
          onClick={() => setQty((q) => q + 1)}
          className="px-4 py-3 text-foreground-muted hover:text-foreground"
          aria-label="Povećaj"
        >
          +
        </button>
      </div>
      <button
        onClick={() => {
          addToCart(
            slug,
            {
              productId: product.id,
              name: product.name,
              priceRsd: product.priceRsd,
              imageUrl: product.imageUrl,
              maxStock: product.maxStock ?? null,
            },
            qty
          );
          setAdded(true);
          setTimeout(() => setAdded(false), 1500);
        }}
        className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-accent hover:bg-accent/90 text-white font-semibold transition-colors"
      >
        {added ? "Dodato u korpu ✓" : "Dodaj u korpu"}
      </button>
    </div>
  );
}
