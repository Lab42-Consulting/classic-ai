/** Client-safe storefront helpers (no server-only imports). */

export function formatRsd(amount: number): string {
  return new Intl.NumberFormat("sr-RS").format(Math.round(amount)) + " RSD";
}
