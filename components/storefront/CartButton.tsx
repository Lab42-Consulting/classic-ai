"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Storefront header cart indicator. Reads the client-side cart (localStorage,
 * keyed per gym slug) and shows the item count. The cart module (#23) dispatches
 * a `cart:updated` event on changes; we also listen to cross-tab `storage` events.
 */
export function CartButton({ slug }: { slug: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem(`cart:${slug}`);
        const items = raw ? JSON.parse(raw) : [];
        setCount(
          Array.isArray(items)
            ? items.reduce((sum: number, i: { quantity?: number }) => sum + (i.quantity || 0), 0)
            : 0
        );
      } catch {
        setCount(0);
      }
    };
    read();
    window.addEventListener("storage", read);
    window.addEventListener("cart:updated", read);
    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener("cart:updated", read);
    };
  }, [slug]);

  return (
    <Link
      href={`/gym-portal/${slug}/shop/cart`}
      aria-label="Korpa"
      className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-background-secondary border border-white/10 hover:bg-white/10 transition-colors"
    >
      <svg className="w-5 h-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[11px] font-bold flex items-center justify-center">
          {count}
        </span>
      )}
    </Link>
  );
}
