import { adminClient, notifyShop, secretMatches, webhookSecret, type NotifyShop } from "@/lib/server/notify"

/**
 * Called by Supabase Database Webhooks (see supabase/notifications.sql for setup):
 * - INSERT on order_pins  → "client left a comment" (bare pins are announced once described)
 * - UPDATE on orders      → "client approved" / "client requested changes"
 * Requests must carry the shared secret in the `x-webhook-secret` header.
 */
type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE"
  table: string
  record: Record<string, unknown> | null
  old_record: Record<string, unknown> | null
}

const SHOP_COLUMNS = "id, user_id, name, notify_email, notify_telegram, telegram_chat_id, notify_lang"

/** How long an approval waits for the others of an "Approve all" before it's announced. */
const BATCH_WAIT_MS = 4000
/** Posts of one project approved within this window count as one "Approve all". */
const BATCH_WINDOW_MS = 60_000

/**
 * A post approved with others of its project at once ("Approve all" in the content plan) is
 * announced once for all of them. Every one of the batch's webhooks waits a moment, looks at
 * what was approved together, and only the one with the lowest id speaks.
 * Returns null for a lone approval, "skip" for a batch member that stays quiet, or the batch.
 */
async function approvedBatch(db: ReturnType<typeof adminClient>, post: Record<string, unknown>) {
  if (!post.project_id || !("approved_at" in post)) return null
  await new Promise((r) => setTimeout(r, BATCH_WAIT_MS))
  const since = new Date(Date.now() - BATCH_WINDOW_MS - BATCH_WAIT_MS).toISOString()
  const { data } = await db.from("orders").select("id, approved_by")
    .eq("project_id", String(post.project_id)).eq("status", "approved").gte("approved_at", since)
  const batch = (data ?? []).filter((p) => (p.approved_by ?? "") === (post.approved_by ?? ""))
  if (batch.length < 2) return null
  const first = batch.map((p) => String(p.id)).sort()[0]
  return first === String(post.id) ? batch : "skip"
}

export async function POST(request: Request) {
  if (!secretMatches(request.headers.get("x-webhook-secret"), webhookSecret())) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }

  const payload = (await request.json()) as WebhookPayload
  const db = adminClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin

  // Work out which order the event is about and what happened.
  let orderId: string | null = null
  let buildEvent: ((orderTitle: string) => Parameters<typeof notifyShop>[1]) | null = null

  // A bare pin (put on the file, described later) is announced when it gets its words, from
  // the portal's describe route, not here.
  if (payload.table === "order_pins" && payload.type === "INSERT" && payload.record && String(payload.record.title ?? "").trim()) {
    const pin = payload.record
    orderId = String(pin.order_id)
    buildEvent = (orderTitle) => ({
      kind: "comment",
      orderTitle,
      author: String(pin.author_name ?? "Client"),
      title: String(pin.title ?? ""),
      description: (pin.description as string | null) ?? null,
      page: Number(pin.page ?? 1),
    })
  } else if (payload.table === "orders" && payload.type === "UPDATE" && payload.record) {
    const status = payload.record.status
    if (status !== payload.old_record?.status && (status === "approved" || status === "changes")) {
      orderId = String(payload.record.id)
      buildEvent = (orderTitle) => ({ kind: status, orderTitle })
      if (status === "approved") {
        const batch = await approvedBatch(db, payload.record)
        if (batch === "skip") return Response.json({ skipped: "announced with its batch" })
        if (batch) {
          // one note about the project, linking to it
          const by = String(payload.record.approved_by ?? "")
          orderId = String(payload.record.project_id)
          buildEvent = (projectTitle) => ({ kind: "approvedMany", orderTitle: projectTitle, count: batch.length, by })
        }
      }
    }
  }

  if (!orderId || !buildEvent) return Response.json({ skipped: true })

  const { data: order } = await db.from("orders").select("id, title, shop_id").eq("id", orderId).maybeSingle()
  if (!order) return Response.json({ skipped: "order not found" })
  const { data: shop } = await db.from("shops").select(SHOP_COLUMNS).eq("id", order.shop_id).maybeSingle()
  if (!shop) return Response.json({ skipped: "shop not found" })

  const results = await notifyShop(shop as NotifyShop, buildEvent(order.title), `${siteUrl}/orders/${order.id}`)
  return Response.json({ ok: true, results })
}
