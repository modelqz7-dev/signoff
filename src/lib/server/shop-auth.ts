import { adminClient } from "@/lib/server/notify"

/** The signed-in user's workshop, from the Supabase access token in the Authorization header. */
export async function shopFromRequest(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) return null
  const db = adminClient()
  const { data: auth } = await db.auth.getUser(token)
  if (!auth.user) return null
  const { data: shop } = await db
    .from("shops")
    .select("id, paddle_customer_id, paddle_subscription_id, subscription_status")
    .eq("user_id", auth.user.id)
    .maybeSingle()
  return shop ? { db, shop } : null
}
