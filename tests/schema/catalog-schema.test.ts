import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

/**
 * Guard tests for issue #13 — brands, subcategories & storefront product fields.
 * These assert the Prisma schema and its migration keep the catalog additions
 * that the admin catalog and public storefront work depend on. Schema-only
 * change, so we validate the source of truth (schema.prisma + migration SQL).
 */
const schema = readFileSync(join(__dirname, "../../prisma/schema.prisma"), "utf8");

function modelBlock(name: string): string {
  const re = new RegExp(`model ${name} \\{[\\s\\S]*?\\n\\}`, "m");
  const m = schema.match(re);
  if (!m) throw new Error(`model ${name} not found in schema.prisma`);
  return m[0];
}

describe("catalog schema — Brand model", () => {
  it("defines a per-gym Brand model mapped to 'brands'", () => {
    const b = modelBlock("Brand");
    expect(b).toContain('@@map("brands")');
    expect(b).toMatch(/gymId\s+String/);
    expect(b).toMatch(/gym\s+Gym\s+@relation\([^)]*onDelete:\s*Cascade/);
    expect(b).toMatch(/name\s+String/);
    expect(b).toMatch(/logoUrl\s+String\?/);
    expect(b).toContain("@@unique([gymId, name])");
    expect(b).toContain("@@index([gymId])");
    expect(b).toMatch(/products\s+Product\[\]/);
  });

  it("is back-related from Gym", () => {
    expect(modelBlock("Gym")).toMatch(/brands\s+Brand\[\]/);
  });
});

describe("catalog schema — ProductCategory subcategories", () => {
  it("supports a single-level parent/child hierarchy", () => {
    const c = modelBlock("ProductCategory");
    expect(c).toMatch(/parentId\s+String\?/);
    expect(c).toContain('@relation("CategoryHierarchy"');
    expect(c).toMatch(/children\s+ProductCategory\[\]\s+@relation\("CategoryHierarchy"\)/);
    expect(c).toMatch(/displayOrder\s+Int\?/);
    expect(c).toContain("@@index([gymId, parentId])");
    // parent link must not cascade-delete children
    expect(c).toMatch(/parent\s+ProductCategory\?[^\n]*onDelete:\s*SetNull/);
  });
});

describe("catalog schema — Product storefront fields", () => {
  const p = modelBlock("Product");

  it("adds storefront visibility/featured flags defaulting OFF", () => {
    expect(p).toMatch(/isVisibleOnline\s+Boolean\s+@default\(false\)/);
    expect(p).toMatch(/isFeatured\s+Boolean\s+@default\(false\)/);
  });

  it("adds brand relation (SetNull), displayOrder and slug", () => {
    expect(p).toMatch(/brandId\s+String\?/);
    expect(p).toMatch(/brand\s+Brand\?[^\n]*onDelete:\s*SetNull/);
    expect(p).toMatch(/displayOrder\s+Int\?/);
    expect(p).toMatch(/slug\s+String\?/);
  });

  it("keeps price as a whole-RSD Int and adds storefront indexes", () => {
    expect(p).toMatch(/price\s+Int/);
    expect(p).toContain("@@index([gymId, isVisibleOnline])");
    expect(p).toContain("@@index([gymId, brandId])");
  });
});

describe("catalog schema — migration", () => {
  it("ships a migration that creates the brands table and product columns", () => {
    const migRoot = join(__dirname, "../../prisma/migrations");
    const dir = readdirSync(migRoot).find((d) => d.endsWith("_add_catalog_brands_subcategories"));
    expect(dir, "add_catalog_brands_subcategories migration folder").toBeTruthy();
    const sql = readFileSync(join(migRoot, dir!, "migration.sql"), "utf8");
    expect(sql).toMatch(/CREATE TABLE "brands"/);
    expect(sql).toMatch(/ALTER TABLE "products"/);
    expect(sql).toMatch(/ADD COLUMN\s+"isVisibleOnline" BOOLEAN NOT NULL DEFAULT false/);
    expect(sql).toMatch(/ALTER TABLE "product_categories"/);
    expect(sql).toMatch(/ADD COLUMN\s+"parentId" TEXT/);
    expect(sql).toMatch(/products_gymId_isVisibleOnline_idx/);
  });
});
