import { adminClient } from "@/lib/server/notify"
import { hashPassword, isUuid } from "@/lib/server/portal"

/**
 * Set or remove an order's portal password. Only the workshop owner may do it (checked with
 * their Supabase access token); the password is stored as a hash and never sent back.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isUuid(id)) return Response.json({ error: "not_found" }, { status: 404 })

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) return Response.json({ error: "unauthorized" }, { status: 401 })

  const db = adminClient()
  const { data: auth } = await db.auth.getUser(token)
  if (!auth.user) return Response.json({ error: "unauthorized" }, { status: 401 })

  const { data: order } = await db.from("orders").select("id, shop_id").eq("id", id).maybeSingle()
  const { data: shop } = order
    ? await db.from("shops").select("user_id").eq("id", order.shop_id).maybeSingle()
    : { data: null }
  if (!order || shop?.user_id !== auth.user.id) return Response.json({ error: "not_found" }, { status: 404 })

  const body = (await request.json().catch(() => ({}))) as { password?: unknown }
  const password = typeof body.password === "string" ? body.password.trim() : ""
  if (password.length > 200) return Response.json({ error: "too_long" }, { status: 400 })

  const hashed = password ? hashPassword(password) : null
  let { error } = await db.from("orders").update({ password_hash: hashed, password: "" }).eq("id", id)
  if (error?.message?.includes("password_hash")) {
    // supabase/security.sql hasn't run yet: keep the old plain-text column working.
    ;({ error } = await db.from("orders").update({ password }).eq("id", id))
  }
  if (error) {
    console.error("Order password error:", error)
    return Response.json({ error: "failed" }, { status: 500 })
  }
  return Response.json({ hasPassword: !!password })
}
