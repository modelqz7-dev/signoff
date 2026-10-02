import { adminClient } from "@/lib/server/notify"
import { portalContext, publicOrder, signedFileUrl } from "@/lib/server/portal"

/** Everything the portal shows: the order (without private fields), its comments and who is viewing. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await portalContext(request, id, adminClient())
  if (ctx instanceof Response) return ctx

  const { data: pins, error } = await ctx.db
    .from("order_pins").select("*").eq("order_id", id).order("created_at", { ascending: true })
  if (error) console.error("Portal pins load error:", error)

  // The version before the current one, for the before / after view of the client's comments.
  let previous: { version: number; file_url: string | null } | null = null
  const version = Number(ctx.order.version ?? 1)
  if (version > 1) {
    const { data: prev, error: prevError } = await ctx.db
      .from("order_versions").select("version, file_url").eq("order_id", id).eq("version", version - 1).maybeSingle()
    if (prevError) console.error("Portal previous version load error:", prevError)
    if (prev) previous = { version: prev.version, file_url: await signedFileUrl(ctx.db, prev.file_url) }
  }

  return Response.json(
    { order: await publicOrder(ctx.db, ctx.order), pins: pins ?? [], viewer: ctx.name, previous },
    { headers: { "Cache-Control": "no-store" } }
  )
}
