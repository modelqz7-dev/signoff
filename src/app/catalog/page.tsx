import type { Metadata } from "next"
import { CatalogView } from "@/components/catalog/CatalogView"
import { loadCatalog } from "@/lib/server/catalog"

export const metadata: Metadata = {
  title: "Каталог майстрів — Nodly",
  description: "Майстри манікюру, барбершопи й торти на замовлення у вашому місті. Онлайн-запис за хвилину.",
}

// fresh on every visit: a business that turns the catalog on shows up at once
export const dynamic = "force-dynamic"

type Props = { searchParams: Promise<{ niche?: string; city?: string; region?: string }> }

export default async function CatalogPage({ searchParams }: Props) {
  const [entries, params] = await Promise.all([loadCatalog(), searchParams])
  return <CatalogView entries={entries} initialNiche={params.niche ?? ""} initialCity={params.city ?? ""} initialRegion={params.region ?? ""} />
}
