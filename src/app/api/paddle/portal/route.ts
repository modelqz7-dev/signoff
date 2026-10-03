import { paddleApi } from "@/lib/server/paddle"
import { shopFromRequest } from "@/lib/server/shop-auth"

/** A one-time link to Paddle's customer portal: card, invoices, cancelling the subscription. */
export async function POST(request: Request) {
  const ctx = await shopFromRequest(request)
  if (!ctx) return Response.json({ error: "unauthorized" }, { status: 401 })
  const { shop } = ctx
  if (!shop.paddle_customer_id) return Response.json({ error: "no_subscription" }, { status: 404 })

  try {
    const res = await paddleApi<{ data: { urls: { general: { overview: string } } } }>(
      `/customers/${shop.paddle_customer_id}/portal-sessions`,
      { method: "POST", body: shop.paddle_subscription_id ? { subscription_ids: [shop.paddle_subscription_id] } : {} },
    )
    return Response.json({ url: res.data.urls.general.overview })
  } catch (e) {
    console.error("Paddle portal error:", e)
    return Response.json({ error: "failed" }, { status: 502 })
  }
}
