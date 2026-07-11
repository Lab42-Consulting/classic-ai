import { notFound } from "next/navigation";
import { getEnabledStoreGym } from "@/lib/storefront";
import { StorefrontShop } from "@/components/storefront/StorefrontShop";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const gym = await getEnabledStoreGym(slug);
  return { title: gym ? `Prodavnica — ${gym.name}` : "Prodavnica" };
}

export default async function ShopPage({ params }: PageProps) {
  const { slug } = await params;
  const gym = await getEnabledStoreGym(slug);
  if (!gym) notFound();
  return <StorefrontShop slug={slug} />;
}
