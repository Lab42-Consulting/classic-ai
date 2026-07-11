import Link from "next/link";
import { formatRsd } from "@/lib/storefront-format";

export interface ProductCardData {
  id: string;
  name: string;
  imageUrl: string | null;
  priceRsd: number;
  brandName: string | null;
  available: boolean;
}

/** Presentational product card linking to the product detail page. */
export function ProductCard({ slug, product }: { slug: string; product: ProductCardData }) {
  return (
    <Link
      href={`/gym-portal/${slug}/shop/product/${product.id}`}
      className="group flex flex-col bg-background-secondary border border-white/10 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-[0_18px_44px_-16px_rgba(0,0,0,0.65)]"
    >
      <div className="aspect-square bg-white/5 flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <svg className="w-12 h-12 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4" />
          </svg>
        )}
      </div>
      <div className="p-3 flex flex-col gap-1 flex-1">
        {product.brandName && (
          <span className="text-[11px] uppercase tracking-wide text-foreground-muted">{product.brandName}</span>
        )}
        <span className="text-sm font-medium text-foreground line-clamp-2 flex-1">{product.name}</span>
        <div className="flex items-center justify-between mt-1">
          <span className="font-semibold text-foreground">{formatRsd(product.priceRsd)}</span>
          {product.available ? (
            <span className="text-[11px] text-emerald-400">Na stanju</span>
          ) : (
            <span className="text-[11px] text-red-400">Nema na stanju</span>
          )}
        </div>
      </div>
    </Link>
  );
}
