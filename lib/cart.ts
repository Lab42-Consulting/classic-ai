/**
 * Client-side storefront cart (localStorage, keyed per gym slug so different
 * locations don't collide). No server-only imports — safe in client components.
 * Mutations dispatch a `cart:updated` window event so the header count and cart
 * views stay in sync.
 */

export interface CartItem {
  productId: string;
  name: string;
  priceRsd: number;
  imageUrl: string | null;
  quantity: number;
  maxStock?: number | null;
}

const CART_EVENT = "cart:updated";
const cartKey = (slug: string) => `cart:${slug}`;

export function getCart(slug: string): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(cartKey(slug));
    const items = raw ? JSON.parse(raw) : [];
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function saveCart(slug: string, items: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(cartKey(slug), JSON.stringify(items));
  window.dispatchEvent(new Event(CART_EVENT));
}

function clampToStock(quantity: number, maxStock?: number | null): number {
  const q = Math.max(1, Math.floor(quantity));
  if (maxStock === null || maxStock === undefined) return q;
  return Math.min(q, Math.max(1, maxStock));
}

export function addToCart(slug: string, item: Omit<CartItem, "quantity">, quantity = 1): void {
  const items = getCart(slug);
  const existing = items.find((i) => i.productId === item.productId);
  if (existing) {
    existing.quantity = clampToStock(existing.quantity + quantity, item.maxStock ?? existing.maxStock);
    existing.priceRsd = item.priceRsd;
    existing.maxStock = item.maxStock ?? existing.maxStock;
  } else {
    items.push({ ...item, quantity: clampToStock(quantity, item.maxStock) });
  }
  saveCart(slug, items);
}

export function updateQuantity(slug: string, productId: string, quantity: number): void {
  const items = getCart(slug);
  const item = items.find((i) => i.productId === productId);
  if (!item) return;
  if (quantity <= 0) {
    saveCart(slug, items.filter((i) => i.productId !== productId));
    return;
  }
  item.quantity = clampToStock(quantity, item.maxStock);
  saveCart(slug, items);
}

export function removeFromCart(slug: string, productId: string): void {
  saveCart(slug, getCart(slug).filter((i) => i.productId !== productId));
}

export function clearCart(slug: string): void {
  saveCart(slug, []);
}

export function cartCount(slug: string): number {
  return getCart(slug).reduce((sum, i) => sum + i.quantity, 0);
}

export function cartSubtotalRsd(slug: string): number {
  return getCart(slug).reduce((sum, i) => sum + i.priceRsd * i.quantity, 0);
}
