import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** The browse experience now lives on the main shop page. Redirect (preserving filters). */
export default async function BrowseRedirect({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const qs = new URLSearchParams(
    Object.entries(sp).flatMap(([k, v]) =>
      v === undefined ? [] : Array.isArray(v) ? v.map((x) => [k, x] as [string, string]) : [[k, v] as [string, string]]
    )
  ).toString();
  redirect(`/gym-portal/${slug}/shop${qs ? `?${qs}` : ""}`);
}
