import prisma from "@/lib/db";

/**
 * Shared server-side data layer for the public per-gym storefront.
 * Everything here is gym-scoped by slug and only exposes products that are
 * both active and published online (isVisibleOnline). The storefront is only
 * available when the gym has storeEnabled = true.
 */

export const STORE_GYM_SELECT = {
  id: true,
  name: true,
  logo: true,
  primaryColor: true,
  storeEnabled: true,
  storePickupAddress: true,
  storeDeliveryFeeRsd: true,
  storeFreeDeliveryThresholdRsd: true,
  storeContactPhone: true,
  storeNote: true,
} as const;

export const PUBLIC_PRODUCT_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  price: true,
  imageUrl: true,
  currentStock: true,
  isFeatured: true,
  categoryId: true,
  brandId: true,
  category: { select: { id: true, name: true } },
  brand: { select: { id: true, name: true } },
} as const;

export interface PublicProduct {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  priceRsd: number;
  imageUrl: string | null;
  available: boolean;
  isFeatured: boolean;
  categoryId: string | null;
  categoryName: string | null;
  brandId: string | null;
  brandName: string | null;
}

type RawProduct = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  price: number;
  imageUrl: string | null;
  currentStock: number;
  isFeatured: boolean;
  categoryId: string | null;
  brandId: string | null;
  category: { id: string; name: string } | null;
  brand: { id: string; name: string } | null;
};

/** Map a raw product row to the public shape (hides cost, exposes availability). */
export function toPublicProduct(p: RawProduct): PublicProduct {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    priceRsd: p.price,
    imageUrl: p.imageUrl,
    available: p.currentStock > 0,
    isFeatured: p.isFeatured,
    categoryId: p.categoryId,
    categoryName: p.category?.name ?? null,
    brandId: p.brandId,
    brandName: p.brand?.name ?? null,
  };
}

/** Resolve a gym by slug if its storefront is enabled; otherwise null. */
export async function getEnabledStoreGym(slug: string) {
  const gym = await prisma.gym.findFirst({
    where: { slug },
    select: STORE_GYM_SELECT,
  });
  if (!gym || !gym.storeEnabled) return null;
  return gym;
}

/** Landing-page data: store info, categories (with subcategories), brands, featured products. */
export async function loadStorefrontData(slug: string) {
  const gym = await getEnabledStoreGym(slug);
  if (!gym) return null;

  const [categories, brands, featured] = await Promise.all([
    prisma.productCategory.findMany({
      where: { gymId: gym.id },
      select: { id: true, name: true, color: true, icon: true, parentId: true, displayOrder: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    }),
    prisma.brand.findMany({
      where: { gymId: gym.id },
      select: { id: true, name: true, logoUrl: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { gymId: gym.id, isActive: true, isVisibleOnline: true, isFeatured: true },
      select: PUBLIC_PRODUCT_SELECT,
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      take: 8,
    }),
  ]);

  return {
    gym,
    categories,
    brands,
    featured: (featured as RawProduct[]).map(toPublicProduct),
  };
}
