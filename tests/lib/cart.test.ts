import { describe, it, expect, beforeEach } from "vitest";
import {
  addToCart,
  getCart,
  updateQuantity,
  removeFromCart,
  clearCart,
  cartCount,
  cartSubtotalRsd,
} from "@/lib/cart";

const SLUG = "novi-sad";
const whey = { productId: "p1", name: "Whey", priceRsd: 3500, imageUrl: null, maxStock: 5 };
const bar = { productId: "p2", name: "Bar", priceRsd: 250, imageUrl: null, maxStock: null };

beforeEach(() => localStorage.clear());

describe("cart", () => {
  it("adds items and increments quantity for the same product", () => {
    addToCart(SLUG, whey, 1);
    addToCart(SLUG, whey, 2);
    const cart = getCart(SLUG);
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(3);
  });

  it("clamps quantity to available stock", () => {
    addToCart(SLUG, whey, 10); // maxStock 5
    expect(getCart(SLUG)[0].quantity).toBe(5);
  });

  it("computes count and subtotal", () => {
    addToCart(SLUG, whey, 2); // 2 * 3500
    addToCart(SLUG, bar, 3); // 3 * 250
    expect(cartCount(SLUG)).toBe(5);
    expect(cartSubtotalRsd(SLUG)).toBe(2 * 3500 + 3 * 250);
  });

  it("updates and removes items", () => {
    addToCart(SLUG, whey, 2);
    updateQuantity(SLUG, "p1", 4);
    expect(getCart(SLUG)[0].quantity).toBe(4);
    updateQuantity(SLUG, "p1", 0); // 0 removes
    expect(getCart(SLUG)).toHaveLength(0);
  });

  it("removeFromCart and clearCart work", () => {
    addToCart(SLUG, whey, 1);
    addToCart(SLUG, bar, 1);
    removeFromCart(SLUG, "p1");
    expect(getCart(SLUG).map((i) => i.productId)).toEqual(["p2"]);
    clearCart(SLUG);
    expect(getCart(SLUG)).toHaveLength(0);
  });

  it("keeps carts isolated per gym slug", () => {
    addToCart("gym-a", whey, 1);
    addToCart("gym-b", bar, 2);
    expect(cartCount("gym-a")).toBe(1);
    expect(cartCount("gym-b")).toBe(2);
  });
});
