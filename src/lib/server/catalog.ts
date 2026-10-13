import { adminClient } from "@/lib/server/notify"
import { cleanPage } from "@/lib/page"
import { nicheConfig, type CrmNiche } from "@/lib/niches"

/** One business in the catalog: what its card shows. */
export type CatalogEntry = {
  slug: string
  title: string
  category: string
  avatar: string | null
  cover: string | null
  niche: CrmNiche
  city: string
  rating: number | null
  reviews: number
  works: number
}

/**
 * The businesses that turned the catalog on: published pages of beauty and cake businesses.
 * Read with the service key on the server; only what their public page already shows goes out.
 */
export async function loadCatalog(): Promise<CatalogEntry[]> {
  const db = adminClient()
  const { data: pages, error } = await db.from("shop_pages").select("shop_id, slug, published, data").eq("published", true).limit(1000)
  if (error) { console.error("Catalog load error:", error); return [] }
  const listed = (pages ?? []).map((p) => ({ shopId: p.shop_id as string, slug: p.slug as string, data: cleanPage(p.data) })).filter((p) => p.data.listed)
  if (!listed.length) return []
  const ids = listed.map((p) => p.shopId)
  const [{ data: shops }, { data: reviews }] = await Promise.all([
    db.from("shops").select("id, name, niche").in("id", ids),
    db.from("page_reviews").select("shop_id, rating").in("shop_id", ids),
  ])
  const shopById = new Map((shops ?? []).map((s) => [s.id as string, s as { id: string; name: string; niche: string | null }]))
  const stars = new Map<string, number[]>()
  for (const r of (reviews ?? []) as { shop_id: string; rating: number }[]) stars.set(r.shop_id, [...(stars.get(r.shop_id) ?? []), r.rating])
  const out: CatalogEntry[] = []
  for (const p of listed) {
    const shop = shopById.get(p.shopId)
    const config = nicheConfig(shop?.niche)
    if (!shop || !config) continue
    const rs = stars.get(p.shopId) ?? []
    out.push({
      slug: p.slug,
      title: p.data.title || shop.name,
      category: p.data.category || p.data.tagline,
      avatar: p.data.avatar_url,
      cover: p.data.banner_url ?? p.data.projects.flatMap((x) => x.photos)[0] ?? null,
      niche: config.id,
      city: p.data.city,
      rating: rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : null,
      reviews: rs.length,
      works: p.data.projects.reduce((n, x) => n + x.photos.length, 0),
    })
  }
  // the best rated and the most reviewed first, then by name
  return out.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.reviews - a.reviews || a.title.localeCompare(b.title))
}
