import type { Metadata } from "next"
import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { PageView } from "@/components/page/PageView"
import { loadPageReviews, loadPublicPage } from "@/lib/server/page"
import { adminClient } from "@/lib/server/notify"
import { PublicBooking, type PublicService } from "@/components/booking/PublicBooking"
import { cleanBooking } from "@/lib/booking"
import { nicheConfig } from "@/lib/niches"

type Props = { params: Promise<{ slug: string }> }

// Always the latest version: the workshop edits it and expects to see changes at once.
export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await loadPublicPage((await params).slug)
  if (!page) return { title: "Nodly" }
  const { data } = page
  const description = data.tagline || data.bio.slice(0, 160) || undefined
  const image = data.banner_url || data.avatar_url
  return {
    title: data.title,
    description,
    openGraph: { title: data.title, description, images: image ? [image] : undefined },
  }
}

/** A workshop's public page, served at /@name. */
export default async function PublicPage({ params }: Props) {
  const page = await loadPublicPage((await params).slug)
  if (!page) notFound()
  // Count the visit for the workshop's weekly stats (link previews and crawlers aside).
  const agent = (await headers()).get("user-agent") ?? ""
  if (!/bot|crawl|spider|preview|facebookexternalhit|whatsapp|telegram|slack|discord/i.test(agent)) {
    await adminClient().rpc("page_view_hit", { p_shop: page.shopId }).then(() => {}, () => {})
  }
  // businesses with a CRM niche take bookings here instead of showing the portfolio page
  const db = adminClient()
  const { data: shop } = await db.from("shops").select("name, niche, booking").eq("id", page.shopId).maybeSingle()
  const config = nicheConfig(shop?.niche)
  if (shop && config) {
    const { data: services } = await db.from("crm_services").select("id, title, duration_min, price, price_from, unit")
      .eq("shop_id", page.shopId).eq("archived", false).eq("kind", config.kind).order("position", { ascending: true })
    return (
      <main className="min-h-dvh bg-background text-foreground">
        <PublicBooking slug={page.slug} title={page.data.title || shop.name} avatar={page.data.avatar_url}
          about={cleanBooking(shop.booking).about} niche={config.id} services={(services ?? []) as PublicService[]} page={page.data} />
      </main>
    )
  }
  const reviews = await loadPageReviews(page.shopId)
  return (
    <main className="min-h-dvh">
      <PageView data={page.data} slug={page.slug} reviews={reviews} />
    </main>
  )
}
