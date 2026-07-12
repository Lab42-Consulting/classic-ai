import Link from "next/link";
import { CartButton } from "./CartButton";

/** Shared storefront header (logo, nav, cart). Server component (renders the client CartButton). */
export function StorefrontHeader({
  slug,
  gymName,
  gymLogo,
}: {
  slug: string;
  gymName: string;
  gymLogo: string | null;
}) {
  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-6 h-16 flex items-center justify-between gap-4">
        <Link href={`/gym-portal/${slug}/shop`} className="flex items-center gap-2 min-w-0">
          {gymLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={gymLogo} alt={gymName} className="w-9 h-9 rounded-lg object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center text-white font-bold">
              {gymName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="font-semibold text-foreground truncate hidden sm:block">{gymName}</span>
          <span className="text-xs text-foreground-muted px-2 py-0.5 rounded-full bg-white/5">Prodavnica</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href={`/gym-portal/${slug}/shop`}
            className="px-3 py-2 text-sm text-foreground-muted hover:text-foreground rounded-lg hover:bg-white/5"
          >
            Svi proizvodi
          </Link>
          <Link
            href={`/gym-portal/${slug}`}
            className="px-3 py-2 text-sm text-foreground-muted hover:text-foreground rounded-lg hover:bg-white/5 hidden sm:block"
          >
            Teretana
          </Link>
          <CartButton slug={slug} />
        </nav>
      </div>
    </header>
  );
}
