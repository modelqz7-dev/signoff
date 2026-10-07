import { adminClient } from "@/lib/server/notify"
import { clientIp, overLimit } from "@/lib/server/portal"
import { loadPublicPage } from "@/lib/server/page"

type Params = { params: Promise<{ slug: string }> }

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "")

/** A visitor leaves a review on a workshop's page. It shows at once; the workshop can delete it. */
export async function POST(request: Request, { params }: Params) {
  const page = await loadPublicPage((await params).slug)
  if (!page) return Response.json({ error: "not_found" }, { status: 404 })

  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return Response.json({ error: "invalid" }, { status: 400 })
  // Bots fill in every field, people never see this one.
  if (text(body.company, 100)) return Response.json({ ok: true })

  const name = text(body.name, 60)
  const review = text(body.text, 1000)
  const rating = Math.round(Number(body.rating))
  if (!name || review.length < 3 || !(rating >= 1 && rating <= 5)) return Response.json({ error: "invalid" }, { status: 400 })

  const db = adminClient()
  const limited = await overLimit(db, `review:${clientIp(request)}:${page.shopId}`, 3, 60 * 60_000)
  if (limited) return limited

  const { data, error } = await db.from("page_reviews")
    .insert({ shop_id: page.shopId, name, rating, text: review })
    .select("id, name, rating, text, created_at").single()
  if (error) {
    console.error("Review save error:", error)
    return Response.json({ error: "failed" }, { status: 500 })
  }
  return Response.json({ ok: true, review: data })
}
