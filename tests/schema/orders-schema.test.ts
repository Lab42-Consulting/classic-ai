import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

/**
 * Guard tests for issue #14 — Order & OrderItem models (pay-in-person, no online card).
 */
const schema = readFileSync(join(__dirname, "../../prisma/schema.prisma"), "utf8");

function modelBlock(name: string): string {
  const re = new RegExp(`model ${name} \\{[\\s\\S]*?\\n\\}`, "m");
  const m = schema.match(re);
  if (!m) throw new Error(`model ${name} not found in schema.prisma`);
  return m[0];
}

describe("orders schema — Order model", () => {
  const o = modelBlock("Order");

  it("is gym-scoped with a per-gym unique order number", () => {
    expect(o).toContain('@@map("orders")');
    expect(o).toMatch(/gym\s+Gym\s+@relation\([^)]*onDelete:\s*Cascade/);
    expect(o).toMatch(/orderNumber\s+String/);
    expect(o).toContain("@@unique([gymId, orderNumber])");
    expect(o).toContain("@@index([gymId, status])");
    expect(o).toContain("@@index([gymId, createdAt])");
  });

  it("captures customer + fulfillment fields and defaults status to 'new'", () => {
    expect(o).toMatch(/status\s+String\s+@default\("new"\)/);
    expect(o).toMatch(/fulfillmentType\s+String/);
    expect(o).toMatch(/customerName\s+String/);
    expect(o).toMatch(/customerPhone\s+String/);
    expect(o).toMatch(/customerEmail\s+String\?/);
    expect(o).toMatch(/deliveryAddress\s+String\?/);
    expect(o).toMatch(/fulfilledAt\s+DateTime\?/);
    expect(o).toMatch(/cancelledReason\s+String\?/);
  });

  it("links optionally to a member (SetNull) and stores whole-RSD money, no card fields", () => {
    expect(o).toMatch(/member\s+Member\?[^\n]*onDelete:\s*SetNull/);
    expect(o).toMatch(/subtotalRsd\s+Int/);
    expect(o).toMatch(/totalRsd\s+Int/);
    expect(o).toMatch(/deliveryFeeRsd\s+Int\?/);
    // no online-payment fields on the order
    expect(o).not.toMatch(/stripe/i);
    expect(o).not.toMatch(/paymentMethod/);
  });
});

describe("orders schema — OrderItem model", () => {
  const it_ = modelBlock("OrderItem");

  it("cascades from Order, snapshots product, keeps product history on delete", () => {
    expect(it_).toContain('@@map("order_items")');
    expect(it_).toMatch(/order\s+Order\s+@relation\([^)]*onDelete:\s*Cascade/);
    expect(it_).toMatch(/product\s+Product\?[^\n]*onDelete:\s*SetNull/);
    expect(it_).toMatch(/productNameCached\s+String/);
    expect(it_).toMatch(/unitPriceRsd\s+Int/);
    expect(it_).toMatch(/quantity\s+Int/);
    expect(it_).toMatch(/lineTotalRsd\s+Int/);
  });
});

describe("orders schema — back-relations & migration", () => {
  it("Gym and Member back-relate orders[]", () => {
    expect(modelBlock("Gym")).toMatch(/orders\s+Order\[\]/);
    expect(modelBlock("Member")).toMatch(/orders\s+Order\[\]/);
    expect(modelBlock("Product")).toMatch(/orderItems\s+OrderItem\[\]/);
  });

  it("ships an add_orders migration creating both tables", () => {
    const migRoot = join(__dirname, "../../prisma/migrations");
    const dir = readdirSync(migRoot).find((d) => d.endsWith("_add_orders"));
    expect(dir, "add_orders migration folder").toBeTruthy();
    const sql = readFileSync(join(migRoot, dir!, "migration.sql"), "utf8");
    expect(sql).toMatch(/CREATE TABLE "orders"/);
    expect(sql).toMatch(/CREATE TABLE "order_items"/);
    expect(sql).toMatch(/orders_gymId_orderNumber_key/);
  });
});
