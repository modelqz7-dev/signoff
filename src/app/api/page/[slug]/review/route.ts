import { adminClient } from "@/lib/server/notify"
import { clientIp, overLimit } from "@/lib/server/portal"
import { loadPublicPage } from "@/lib/server/page"
import { REVIEW_ASPECTS } from "@/lib/page"
import { sessionAccount } from "@/lib/server/client-session"

type Params = { params: Promise<{ slug: string }> }

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "")

/**
 * A client leaves a review: signed in with Telegram, after a visit the business marked as done
 * (or an order handed over), one per business. It shows at once, marked as a verified visit.
 */
export async function POST(request: Request, { params }: Params) {
  const page = await loadPublicPage((await params).slug)
  if (!page) return Response.json({ error: "not_found" }, { status: 404 })

  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return Response.json({ error: "invalid" }, { status: 400 })
  // Bots fill in every field, people never see this one.
  if (text(body.company, 100)) return Response.json({ ok: true })

  const me = await sessionAccount(request).catch(() => null)
  if (!me) return Response.json({ error: "login" }, { status: 401 })
  const name = (me.name || text(body.name, 60) || (me.username ? `@${me.username}` : "")).slice(0, 60)
  const review = text(body.text, 1000)
  const mark = (v: unknown) => {
    const n = Math.round(Number(v))
    return n >= 1 && n <= 5 ? n : null
  }
  const rating = mark(body.rating)
  if (!name || review.length < 3 || !rating) return Response.json({ error: "invalid" }, { status: 400 })
  // Optional marks per aspect; only sent when the client set them.
  const aspects = Object.fromEntries(REVIEW_ASPECTS.map((k) => [k, mark(body[k])]).filter(([, v]) => v))

  const db = adminClient()
  // only after a real visit to this business
  const { count: visits } = await db.from("crm_bookings").select("id", { count: "exact", head: true })
    .eq("shop_id", page.shopId).eq("details->>account", me.id).in("status", ["done", "delivered"])
  if (!visits) return Response.json({ error: "no_visit" }, { status: 403 })
  const limited = await overLimit(db, `review:${clientIp(request)}:${page.shopId}`, 3, 60 * 60_000)
  if (limited) return limited

  const { data, error } = await db.from("page_reviews")
    .insert({ shop_id: page.shopId, name, rating, text: review, ...aspects, client_account_id: me.id, verified: true })
    .select("*").single()
  if (error?.code === "23505") return Response.json({ error: "already" }, { status: 409 })
  if (error) {
    console.error("Review save error:", error)
    return Response.json({ error: "failed" }, { status: 500 })
  }
  return Response.json({ ok: true, review: data })
}
