import { adminClient } from "@/lib/server/notify"
import { clientIp, isUuid, overLimit, portalContext } from "@/lib/server/portal"

/**
 * The client writes in a pin's conversation. A message on a pin the workshop marked fixed
 * opens it again: writing is how the client says it isn't done yet.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string; pinId: string }> }) {
  const { id, pinId } = await params
  const ctx = await portalContext(request, id, adminClient())
  if (ctx instanceof Response) return ctx
  if (!isUuid(pinId)) return Response.json({ error: "not_found" }, { status: 404 })

  const { data: pin } = await ctx.db.from("order_pins").select("id, fix_status").eq("id", pinId).eq("order_id", id).maybeSingle()
  if (!pin) return Response.json({ error: "not_found" }, { status: 404 })

  const body = (await request.json().catch(() => ({}))) as { body?: unknown }
  const text = typeof body.body === "string" ? body.body.trim().slice(0, 2000) : ""
  if (!text) return Response.json({ error: "invalid" }, { status: 400 })

  const fast = await overLimit(ctx.db, `messages:${clientIp(request)}:${id}`, 20, 60_000)
  if (fast) return fast

  const { data: message, error } = await ctx.db.from("pin_messages").insert({
    pin_id: pinId,
    order_id: id,
    author_role: "client",
    author_name: ctx.name,
    body: text,
  }).select().single()
  if (error) {
    console.error("Portal message error:", error)
    return Response.json({ error: "failed" }, { status: 500 })
  }

  if (pin.fix_status === "fixed") {
    await ctx.db.from("order_pins").update({ fix_status: "reopened", resolved: false }).eq("id", pinId)
  }
  return Response.json({ message })
}
