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
