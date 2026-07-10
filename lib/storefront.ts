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

export interface ProductQuery {
  categoryId?: string;
  brandId?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: string;
  page?: number;
  pageSize?: number;
}

/** Filtered/sorted/paginated product listing for the public storefront. */
export async function loadStorefrontProducts(slug: string, q: ProductQuery) {
  const gym = await getEnabledStoreGym(slug);
  if (!gym) return null;

  const pageSize = Math.min(Math.max(q.pageSize ?? 24, 1), 60);
  const page = Math.max(q.page ?? 1, 1);

  // Category filter: when a parent category is selected, include its subcategories too
  let categoryFilter: { in: string[] } | undefined;
  if (q.categoryId) {
    const children = await prisma.productCategory.findMany({
      where: { gymId: gym.id, parentId: q.categoryId },
      select: { id: true },
    });
    categoryFilter = { in: [q.categoryId, ...children.map((c) => c.id)] };
  }

  const where: Record<string, unknown> = {
    gymId: gym.id,
    isActive: true,
    isVisibleOnline: true,
    ...(categoryFilter && { categoryId: categoryFilter }),
    ...(q.brandId && { brandId: q.brandId }),
    ...(q.inStock && { currentStock: { gt: 0 } }),
  };
  if (q.search) {
    where.OR = [
      { name: { contains: q.search, mode: "insensitive" } },
      { description: { contains: q.search, mode: "insensitive" } },
    ];
  }
  if (q.minPrice !== undefined || q.maxPrice !== undefined) {
    where.price = {
      ...(q.minPrice !== undefined && { gte: q.minPrice }),
      ...(q.maxPrice !== undefined && { lte: q.maxPrice }),
    };
  }

  const orderBy =
    q.sort === "price_asc"
      ? [{ price: "asc" as const }]
      : q.sort === "price_desc"
      ? [{ price: "desc" as const }]
      : q.sort === "name"
      ? [{ name: "asc" as const }]
      : q.sort === "newest"
      ? [{ createdAt: "desc" as const }]
      : [{ displayOrder: "asc" as const }, { name: "asc" as const }];

  const [rows, total, categories, brands] = await Promise.all([
    prisma.product.findMany({
      where,
      select: PUBLIC_PRODUCT_SELECT,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
    prisma.productCategory.findMany({
      where: { gymId: gym.id },
      select: { id: true, name: true, parentId: true, displayOrder: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    }),
    prisma.brand.findMany({
      where: { gymId: gym.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    gym: { id: gym.id, name: gym.name, logo: gym.logo },
    products: (rows as RawProduct[]).map(toPublicProduct),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    categories,
    brands,
  };
}

/** Single product for the public detail page (must be active + online) + related products. */
export async function loadStorefrontProduct(slug: string, productId: string) {
  const gym = await getEnabledStoreGym(slug);
  if (!gym) return null;

  const raw = await prisma.product.findFirst({
    where: { id: productId, gymId: gym.id, isActive: true, isVisibleOnline: true },
    select: PUBLIC_PRODUCT_SELECT,
  });
  if (!raw) return null;

  const product = toPublicProduct(raw as RawProduct);

  const relatedRaw = await prisma.product.findMany({
    where: {
      gymId: gym.id,
      isActive: true,
      isVisibleOnline: true,
      id: { not: productId },
      ...(product.categoryId && { categoryId: product.categoryId }),
    },
    select: PUBLIC_PRODUCT_SELECT,
    take: 4,
  });

  return {
    gym: { id: gym.id, name: gym.name, logo: gym.logo },
    product,
    related: (relatedRaw as RawProduct[]).map(toPublicProduct),
  };
}

export interface CheckoutInput {
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  fulfillmentType: "pickup" | "delivery";
  deliveryAddress?: string | null;
  note?: string | null;
  items: { productId: string; quantity: number }[];
}

export type OrderResult =
  | { ok: true; order: { id: string; orderNumber: string; totalRsd: number; subtotalRsd: number; deliveryFeeRsd: number | null; fulfillmentType: string; status: string } }
  | { ok: false; status: number; error: string; details?: string[] };

/**
 * Create a storefront order (pay-in-person). Prices and availability are taken
 * SERVER-SIDE (never trusting the client). Does not decrement stock or take
 * payment — both happen at fulfillment (#25).
 */
export async function createStorefrontOrder(
  slug: string,
  input: CheckoutInput,
  memberId?: string | null
): Promise<OrderResult> {
  const gym = await getEnabledStoreGym(slug);
  if (!gym) return { ok: false, status: 404, error: "Prodavnica nije dostupna" };

  if (!input.customerName?.trim() || !input.customerPhone?.trim()) {
    return { ok: false, status: 400, error: "Ime i telefon su obavezni" };
  }
  if (input.fulfillmentType !== "pickup" && input.fulfillmentType !== "delivery") {
    return { ok: false, status: 400, error: "Neispravan način preuzimanja" };
  }
  if (input.fulfillmentType === "delivery" && !input.deliveryAddress?.trim()) {
    return { ok: false, status: 400, error: "Adresa za dostavu je obavezna" };
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    return { ok: false, status: 400, error: "Korpa je prazna" };
  }

  const ids = [...new Set(input.items.map((i) => i.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, gymId: gym.id, isActive: true, isVisibleOnline: true },
    select: { id: true, name: true, price: true, currentStock: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const unavailable: string[] = [];
  const lineItems: {
    productId: string;
    productNameCached: string;
    unitPriceRsd: number;
    quantity: number;
    lineTotalRsd: number;
  }[] = [];
  for (const i of input.items) {
    const p = byId.get(i.productId);
    const qty = Math.max(1, Math.floor(i.quantity));
    if (!p || p.currentStock < qty) {
      unavailable.push(p?.name ?? i.productId);
      continue;
    }
    lineItems.push({
      productId: p.id,
      productNameCached: p.name,
      unitPriceRsd: p.price,
      quantity: qty,
      lineTotalRsd: p.price * qty,
    });
  }
  if (unavailable.length > 0) {
    return { ok: false, status: 409, error: "Neki proizvodi nisu dostupni", details: unavailable };
  }

  // Only link a member who actually belongs to this gym
  let linkedMemberId: string | null = null;
  if (memberId) {
    const member = await prisma.member.findFirst({
      where: { id: memberId, gymId: gym.id },
      select: { id: true },
    });
    linkedMemberId = member?.id ?? null;
  }

  const subtotalRsd = lineItems.reduce((s, li) => s + li.lineTotalRsd, 0);

  let deliveryFeeRsd: number | null = null;
  if (input.fulfillmentType === "delivery") {
    const fee = gym.storeDeliveryFeeRsd ?? 0;
    const threshold = gym.storeFreeDeliveryThresholdRsd;
    deliveryFeeRsd = threshold != null && subtotalRsd >= threshold ? 0 : fee;
  }
  const totalRsd = subtotalRsd + (deliveryFeeRsd ?? 0);

  const order = await prisma.$transaction(async (tx) => {
    const existing = await tx.order.count({ where: { gymId: gym.id } });
    const orderNumber = String(existing + 1).padStart(4, "0");
    return tx.order.create({
      data: {
        gymId: gym.id,
        orderNumber,
        status: "new",
        fulfillmentType: input.fulfillmentType,
        customerName: input.customerName.trim(),
        customerPhone: input.customerPhone.trim(),
        customerEmail: input.customerEmail?.trim() || null,
        deliveryAddress: input.fulfillmentType === "delivery" ? input.deliveryAddress!.trim() : null,
        note: input.note?.trim() || null,
        memberId: linkedMemberId,
        subtotalRsd,
        deliveryFeeRsd,
        totalRsd,
        items: { create: lineItems },
      },
      select: {
        id: true,
        orderNumber: true,
        totalRsd: true,
        subtotalRsd: true,
        deliveryFeeRsd: true,
        fulfillmentType: true,
        status: true,
      },
    });
  });

  return { ok: true, order };
}
