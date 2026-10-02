import { adminClient } from "@/lib/server/notify"
import { isUuid, portalContext } from "@/lib/server/portal"

type Params = { params: Promise<{ id: string; pinId: string }> }

async function loadPin(request: Request, id: string, pinId: string) {
  const ctx = await portalContext(request, id, adminClient())
  if (ctx instanceof Response) return ctx
  if (!isUuid(pinId)) return Response.json({ error: "not_found" }, { status: 404 })
  const { data: pin } = await ctx.db.from("order_pins").select("*").eq("id", pinId).eq("order_id", id).maybeSingle()
  if (!pin) return Response.json({ error: "not_found" }, { status: 404 })
  return { ...ctx, pin }
}

/** Resolve, reopen, move or re-check any comment on the order: the portal belongs to the client. */
export async function PATCH(request: Request, { params }: Params) {
  const { id, pinId } = await params
  const ctx = await loadPin(request, id, pinId)
  if (ctx instanceof Response) return ctx

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const patch: Record<string, unknown> = {}
  if (typeof body.resolved === "boolean") patch.resolved = body.resolved
  // The client checks the workshop's answer: "not done" reopens it, "it's fine" takes it back.
  if (body.fix_status === "reopened" || body.fix_status === "fixed") {
    const current = (ctx.pin as { fix_status?: string | null }).fix_status
    if (current !== "fixed" && current !== "reopened") return Response.json({ error: "invalid" }, { status: 400 })
    patch.fix_status = body.fix_status
    patch.resolved = body.fix_status === "fixed"
  }
  if (typeof body.x === "number" && typeof body.y === "number") {
    patch.x = Math.min(100, Math.max(0, body.x))
    patch.y = Math.min(100, Math.max(0, body.y))
  }
  if (!Object.keys(patch).length) return Response.json({ error: "invalid" }, { status: 400 })

  const { data, error } = await ctx.db.from("order_pins").update(patch).eq("id", pinId).select().single()
  if (error) return Response.json({ error: "failed" }, { status: 500 })
  return Response.json({ pin: data })
}

/** Delete a comment on the order. */
export async function DELETE(request: Request, { params }: Params) {
  const { id, pinId } = await params
  const ctx = await loadPin(request, id, pinId)
  if (ctx instanceof Response) return ctx

  const { error } = await ctx.db.from("order_pins").delete().eq("id", pinId)
  if (error) return Response.json({ error: "failed" }, { status: 500 })
  return new Response(null, { status: 204 })
}
