import { adminClient } from "@/lib/server/notify"
import { can } from "@/lib/plans"

/**
 * Public branding of an order's portal: the workshop name, its logo on plans with branding,
 * and whether to show the "Made with Nodly" badge. Read with the service role because
 * clients in the portal are not signed in.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const fallback = { shopName: "", logoUrl: null, badge: true }
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json(fallback, { status: 404 })

  try {
    const db = adminClient()
    const { data: order } = await db.from("orders").select("shop_id").eq("id", id).maybeSingle()
    if (!order) return Response.json(fallback, { status: 404 })
    const { data: shop } = await db.from("shops").select("*").eq("id", order.shop_id).maybeSingle()
    if (!shop) return Response.json(fallback)

    const branded = can(shop, "branding")
    return Response.json({
      shopName: shop.name ?? "",
      logoUrl: branded ? shop.logo_url ?? null : null,
      badge: !branded,
    })
  } catch (e) {
    console.error("Portal branding error:", e)
    return Response.json(fallback)
  }
}
