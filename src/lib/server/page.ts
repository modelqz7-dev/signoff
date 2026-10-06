// Server-only: loads published workshop pages for visitors (the tables are closed to them).
import { adminClient } from "@/lib/server/notify"
import { cleanPage, normalizeSlug, type PageData } from "@/lib/page"

export type PublicPage = { shopId: string; slug: string; data: PageData }

/** The published page at this address, or null. */
export async function loadPublicPage(rawSlug: string): Promise<PublicPage | null> {
  const slug = normalizeSlug(decodeURIComponent(rawSlug))
  if (!slug) return null
  const { data, error } = await adminClient()
    .from("shop_pages").select("shop_id, slug, published, data").eq("slug", slug).maybeSingle()
  if (error) console.error("Page load error:", error)
  if (!data || !data.published) return null
  return { shopId: data.shop_id, slug: data.slug, data: cleanPage(data.data) }
}
