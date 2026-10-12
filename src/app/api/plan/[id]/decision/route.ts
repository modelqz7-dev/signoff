import { adminClient } from "@/lib/server/notify"
import { isUuid, overLimit, planContext, publicOrder } from "@/lib/server/portal"

/**
 * The client's decision on posts of the plan: approve them (one, or every ready one at once) or ask
 * for changes on one. Only posts of this project with a file, and not yet in production, move.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await planContext(request, id, adminClient())
  if (ctx instanceof Response) return ctx
  const limited = await overLimit(ctx.db, `plan-decision:${id}`, 120, 60 * 60_000)
  if (limited) return limited

  const body = (await request.json().catch(() => ({}))) as { postIds?: unknown; status?: unknown }
  if (body.status !== "approved" && body.status !== "changes") return Response.json({ error: "invalid" }, { status: 400 })
  const postIds = Array.isArray(body.postIds) ? body.postIds.filter((x): x is string => typeof x === "string" && isUuid(x)).slice(0, 200) : []
  if (!postIds.length || (body.status === "changes" && postIds.length !== 1)) return Response.json({ error: "invalid" }, { status: 400 })

  const { data: rows } = await ctx.db.from("orders").select("*").eq("project_id", id).in("id", postIds)
  const movable = (rows ?? []).filter((r) => r.file_url && r.status !== "prod" && r.status !== body.status)
  const updated = []
  for (const row of movable) {
    const patch: Record<string, unknown> = { status: body.status }
    // approved_by exists once supabase/retention.sql has run
    if (body.status === "approved" && "approved_by" in row) patch.approved_by = ctx.name
    const { data, error } = await ctx.db.from("orders").update(patch).eq("id", row.id).select().single()
    if (error || !data) {
      console.error("Plan decision error:", error)
      return Response.json({ error: "failed" }, { status: 500 })
    }
    updated.push(await publicOrder(ctx.db, data))
  }
  return Response.json({ posts: updated })
}
