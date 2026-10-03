import { adminClient } from "@/lib/server/notify"
import { verifyPaddleSignature } from "@/lib/server/paddle"
import { planForPrice } from "@/lib/billing"

/**
 * Paddle notifications (Paddle → Developer tools → Notifications, events subscription.*).
 * They decide the workshop's plan: an active subscription gives its plan, a cancelled or
 * paused one moves the workshop back to the free plan.
 */
type Subscription = {
  id: string
  status: "active" | "trialing" | "past_due" | "paused" | "canceled"
  customer_id: string
  items?: { price?: { id?: string } }[]
  current_billing_period?: { ends_at?: string } | null
  custom_data?: { shop_id?: string } | null
}

const PAYING = new Set(["active", "trialing", "past_due"])

export async function POST(request: Request) {
  const raw = await request.text()
  if (!verifyPaddleSignature(raw, request.headers.get("paddle-signature"))) {
    return Response.json({ error: "invalid signature" }, { status: 401 })
  }

  const event = JSON.parse(raw) as { event_type?: string; data?: Subscription }
  if (!event.event_type?.startsWith("subscription.") || !event.data) return Response.json({ skipped: true })
  const sub = event.data

  const db = adminClient()
  // The checkout carries the shop id; later events are matched by the subscription.
  let shopId = sub.custom_data?.shop_id ?? null
  if (!shopId) {
    const { data } = await db.from("shops").select("id").eq("paddle_subscription_id", sub.id).maybeSingle()
    shopId = data?.id ?? null
  }
  if (!shopId) {
    console.error("Paddle webhook: no shop for subscription", sub.id)
    return Response.json({ skipped: "no shop" })
  }

  // A late event about an old, ended subscription must not undo a newer one.
  const { data: current } = await db.from("shops").select("paddle_subscription_id").eq("id", shopId).maybeSingle()
  if (current?.paddle_subscription_id && current.paddle_subscription_id !== sub.id && !PAYING.has(sub.status)) {
    return Response.json({ skipped: "older subscription" })
  }

  const paidPlan = planForPrice(sub.items?.[0]?.price?.id)
  const plan = PAYING.has(sub.status) && paidPlan ? paidPlan : "free"
  const { error } = await db.from("shops").update({
    plan,
    paddle_customer_id: sub.customer_id,
    paddle_subscription_id: sub.id,
    subscription_status: sub.status,
    current_period_end: sub.current_billing_period?.ends_at ?? null,
  }).eq("id", shopId)

  if (error) {
    console.error("Paddle webhook update error:", error)
    return Response.json({ error: "failed" }, { status: 500 })
  }
  return Response.json({ ok: true, plan })
}
