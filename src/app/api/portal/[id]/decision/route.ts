import { adminClient } from "@/lib/server/notify"
import { portalContext, publicOrder } from "@/lib/server/portal"

/** The client's decision: approve the design or ask for changes. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await portalContext(request, id, adminClient())
  if (ctx instanceof Response) return ctx

  const body = (await request.json().catch(() => ({}))) as { status?: unknown }
  if (body.status !== "approved" && body.status !== "changes") return Response.json({ error: "invalid" }, { status: 400 })
  // Once in production the decision is final.
  if (ctx.order.status === "prod") return Response.json({ error: "locked" }, { status: 409 })

  const patch: Record<string, unknown> = { status: body.status }
  // approved_by exists once supabase/retention.sql has run.
  if (body.status === "approved" && "approved_by" in ctx.order) patch.approved_by = ctx.name

  const { data, error } = await ctx.db.from("orders").update(patch).eq("id", id).select().single()
  if (error || !data) {
    console.error("Portal decision error:", error)
    return Response.json({ error: "failed" }, { status: 500 })
  }
  return Response.json({ order: await publicOrder(ctx.db, data) })
}
