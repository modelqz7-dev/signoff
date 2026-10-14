import { adminClient } from "@/lib/server/notify"
import { clearCookie, sessionAccount } from "@/lib/server/client-session"

/** The signed-in client and their bookings at every business (newest first). */
export async function GET(request: Request) {
  const me = await sessionAccount(request)
  if (!me) return Response.json({ account: null }, { headers: { "cache-control": "no-store" } })
  const db = adminClient()
  const { data: rows } = await db.from("crm_bookings").select("id, shop_id, kind, title, starts_at, due_on, due_time, status, price")
    .eq("details->>account", me.id).order("created_at", { ascending: false }).limit(50)
  const ids = [...new Set((rows ?? []).map((b) => b.shop_id as string))]
  const [{ data: pages }, { data: shops }, { data: reviews }] = ids.length ? await Promise.all([
    db.from("shop_pages").select("shop_id, slug, data").in("shop_id", ids),
    db.from("shops").select("id, name").in("id", ids),
    db.from("page_reviews").select("shop_id").eq("client_account_id", me.id),
  ]) : [{ data: [] }, { data: [] }, { data: [] }]
  const page = new Map((pages ?? []).map((p) => [p.shop_id as string, p as { slug: string; data: { title?: string; avatar_url?: string | null } }]))
  const name = new Map((shops ?? []).map((s) => [s.id as string, s.name as string]))
  const reviewed = new Set((reviews ?? []).map((r) => r.shop_id as string))
  const bookings = (rows ?? []).map((b) => ({
    ...b,
    business: page.get(b.shop_id)?.data?.title || name.get(b.shop_id) || "",
    slug: page.get(b.shop_id)?.slug ?? null,
    avatar: page.get(b.shop_id)?.data?.avatar_url ?? null,
    reviewed: reviewed.has(b.shop_id),
  }))
  return Response.json({ account: { id: me.id, name: me.name, username: me.username }, bookings }, { headers: { "cache-control": "no-store" } })
}

/** Sign out. */
export async function DELETE() {
  return Response.json({ ok: true }, { headers: { "Set-Cookie": clearCookie() } })
}
