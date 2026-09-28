import { adminClient } from "@/lib/server/notify"
import {
  checkPassword, clearSessionCookie, clientIp, createSessionCookie, hashPassword, isUuid,
  recordFailedAttempt, tooManyAttempts,
} from "@/lib/server/portal"

type Params = { params: Promise<{ id: string }> }

/** Enter the portal: checks the name and password, then sets a signed session cookie. */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params
  if (!isUuid(id)) return Response.json({ error: "not_found" }, { status: 404 })

  const body = (await request.json().catch(() => ({}))) as { name?: unknown; password?: unknown }
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : ""
  const password = typeof body.password === "string" ? body.password.slice(0, 200) : ""
  if (!name) return Response.json({ error: "name_required" }, { status: 400 })

  const key = `${clientIp(request)}:${id}`
  if (tooManyAttempts(key)) return Response.json({ error: "too_many_attempts" }, { status: 429 })

  const db = adminClient()
  const { data: order } = await db.from("orders").select("*").eq("id", id).maybeSingle()
  if (!order) return Response.json({ error: "not_found" }, { status: 404 })

  const check = checkPassword(order, password)
  if (!check.ok) {
    recordFailedAttempt(key)
    return Response.json({ error: "wrong_password" }, { status: 401 })
  }

  let current = order
  if (check.upgrade) {
    // Replace the plain-text password with its hash (needs supabase/security.sql).
    const password_hash = hashPassword(password)
    const { error } = await db.from("orders").update({ password_hash, password: "" }).eq("id", id)
    if (!error) current = { ...order, password_hash, password: "" }
  }

  return Response.json(
    { ok: true, name },
    { headers: { "Set-Cookie": createSessionCookie(id, name, current), "Cache-Control": "no-store" } }
  )
}

/** Leave the portal (e.g. to enter under another name). */
export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params
  return new Response(null, { status: 204, headers: { "Set-Cookie": clearSessionCookie(id) } })
}
