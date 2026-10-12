import { adminClient } from "@/lib/server/notify"
import { planContext, publicOrder } from "@/lib/server/portal"

/** The whole content plan: the project's name and its posts in order, each with its open comments. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await planContext(request, id, adminClient())
  if (ctx instanceof Response) return ctx

  const { data: rows, error } = await ctx.db
    .from("orders").select("*").eq("project_id", id)
    .order("position", { ascending: true }).order("created_at", { ascending: true })
  if (error) {
    console.error("Plan posts load error:", error)
    return Response.json({ error: "unavailable" }, { status: 503 })
  }
  // A post with a password of its own stays closed here: only its name, day, format and status
  // show, and its picture and caption open in its portal, behind that password.
  const posts = await Promise.all((rows ?? []).map(async (row) => {
    if (row.password || row.password_hash) {
      return { id: row.id, title: row.title, status: row.status, publish_on: row.publish_on, format: row.format, file_url: null, caption: "", locked: true }
    }
    return publicOrder(ctx.db, row)
  }))

  const ids = (rows ?? []).map((r) => r.id as string)
  const open: Record<string, number> = {}
  if (ids.length) {
    const { data: pins } = await ctx.db.from("order_pins").select("order_id").in("order_id", ids).eq("resolved", false)
    for (const p of pins ?? []) open[p.order_id] = (open[p.order_id] ?? 0) + 1
  }

  return Response.json(
    { project: { id, title: ctx.project.title, client_name: ctx.project.client_name }, posts, open, viewer: ctx.name },
    { headers: { "Cache-Control": "no-store" } },
  )
}
