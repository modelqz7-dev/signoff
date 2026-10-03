import { priceFor, type Cycle } from "@/lib/billing"
import { paddleApi } from "@/lib/server/paddle"
import { shopFromRequest } from "@/lib/server/shop-auth"
import type { PlanId } from "@/lib/plans"

/**
 * Moves an existing subscription to another paid plan or billing cycle. Paddle charges or
 * credits the difference right away; the webhook then updates the plan.
 */
export async function POST(request: Request) {
  const ctx = await shopFromRequest(request)
  if (!ctx) return Response.json({ error: "unauthorized" }, { status: 401 })
  const { shop } = ctx
  if (!shop.paddle_subscription_id || shop.subscription_status === "canceled") {
    return Response.json({ error: "no_subscription" }, { status: 404 })
  }

  const body = (await request.json().catch(() => ({}))) as { plan?: PlanId; cycle?: Cycle }
  const price = body.plan && body.plan !== "free" ? priceFor(body.plan, body.cycle === "yearly" ? "yearly" : "monthly") : null
  if (!price) return Response.json({ error: "invalid" }, { status: 400 })

  try {
    await paddleApi(`/subscriptions/${shop.paddle_subscription_id}`, {
      method: "PATCH",
      body: { items: [{ price_id: price, quantity: 1 }], proration_billing_mode: "prorated_immediately" },
    })
    return Response.json({ ok: true })
  } catch (e) {
    console.error("Paddle change error:", e)
    return Response.json({ error: "failed" }, { status: 502 })
  }
}
