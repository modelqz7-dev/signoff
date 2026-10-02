import { adminClient } from "@/lib/server/notify"
import { portalContext } from "@/lib/server/portal"

const clampPercent = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : null)
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "")

/** Leave a comment (or a bare pin, described later) on the current version of the design, under the portal visitor's name. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await portalContext(request, id, adminClient())
  if (ctx instanceof Response) return ctx

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const x = clampPercent(body.x)
  const y = clampPercent(body.y)
  const title = text(body.title, 200)
  const description = text(body.description, 2000) || null
  const page = typeof body.page === "number" && Number.isInteger(body.page) && body.page > 0 ? body.page : 1
  // The title may be empty: a pin is put on the file first and described in the list after.
  if (x === null || y === null) return Response.json({ error: "invalid" }, { status: 400 })

  const row: Record<string, unknown> = { order_id: id, x, y, page, title, description, author_name: ctx.name }
  if (typeof ctx.order.version === "number") row.version = ctx.order.version

  const { data, error } = await ctx.db.from("order_pins").insert(row).select().single()
  if (error) {
    console.error("Portal pin insert error:", error)
    return Response.json({ error: "failed" }, { status: 500 })
  }
  return Response.json({ pin: data })
}
