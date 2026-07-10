import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

/** Guard tests for issue #19 — per-gym storefront config columns. */
const schema = readFileSync(join(__dirname, "../../prisma/schema.prisma"), "utf8");
const gym = schema.match(/model Gym \{[\s\S]*?\n\}/)?.[0] ?? "";

describe("store settings schema", () => {
  it("adds storefront config columns to Gym", () => {
    expect(gym).toMatch(/storeEnabled\s+Boolean\s+@default\(false\)/);
    expect(gym).toMatch(/storePickupAddress\s+String\?/);
    expect(gym).toMatch(/storeDeliveryFeeRsd\s+Int\?/);
    expect(gym).toMatch(/storeFreeDeliveryThresholdRsd\s+Int\?/);
    expect(gym).toMatch(/storeContactPhone\s+String\?/);
    expect(gym).toMatch(/storeNote\s+String\?/);
  });

  it("ships an add_store_settings migration", () => {
    const migRoot = join(__dirname, "../../prisma/migrations");
    const dir = readdirSync(migRoot).find((d) => d.endsWith("_add_store_settings"));
    expect(dir).toBeTruthy();
    const sql = readFileSync(join(migRoot, dir!, "migration.sql"), "utf8");
    expect(sql).toMatch(/"storeEnabled" BOOLEAN NOT NULL DEFAULT false/);
  });
});
