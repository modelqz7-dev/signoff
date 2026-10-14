import type { Metadata } from "next"
import { CatalogView } from "@/components/catalog/CatalogView"
import { loadCatalog } from "@/lib/server/catalog"

export const metadata: Metadata = {
  title: "Nodly — майстри манікюру, барбери, тату й торти поруч",
  description: "Знайдіть майстра у своєму місті: роботи, ціни й відгуки. Онлайн-запис за хвилину, без реєстрації.",
}

// fresh on every visit: a business that turns the catalog on shows up at once
export const dynamic = "force-dynamic"

type Props = { searchParams: Promise<{ niche?: string; city?: string; region?: string }> }

/** The home page is the catalog: people come to find a master; masters go on to /business. */
export default async function Home({ searchParams }: Props) {
  const [entries, params] = await Promise.all([loadCatalog(), searchParams])
  return <CatalogView entries={entries} initialNiche={params.niche ?? ""} initialCity={params.city ?? ""} initialRegion={params.region ?? ""} />
}
