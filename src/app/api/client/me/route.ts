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
  const account = { id: me.id, name: me.name, username: me.username, avatar_url: me.avatar_url ?? null, phone: me.phone ?? "", about: me.about ?? "" }
  return Response.json({ account, bookings }, { headers: { "cache-control": "no-store" } })
}

/** The client edits their profile: name, phone and a few words for the master. */
export async function PATCH(request: Request) {
  const me = await sessionAccount(request)
  if (!me) return Response.json({ error: "login" }, { status: 401 })
  const body = await request.json().catch(() => null) as { name?: unknown; phone?: unknown; about?: unknown } | null
  const patch: Record<string, string> = {}
  if (typeof body?.name === "string") patch.name = body.name.trim().slice(0, 120)
  if (typeof body?.phone === "string") patch.phone = body.phone.trim().slice(0, 40)
  if (typeof body?.about === "string") patch.about = body.about.trim().slice(0, 500)
  if (patch.name === "") return Response.json({ error: "invalid" }, { status: 400 })
  const { error } = await adminClient().from("client_accounts").update(patch).eq("id", me.id)
  if (error) { console.error("Client update error:", error); return Response.json({ error: "failed" }, { status: 500 }) }
  return Response.json({ ok: true })
}

/** Sign out. */
export async function DELETE() {
  return Response.json({ ok: true }, { headers: { "Set-Cookie": clearCookie() } })
}
