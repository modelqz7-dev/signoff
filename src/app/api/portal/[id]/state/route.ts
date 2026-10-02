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

  // Files the workshop attached to its answers live in the private bucket: sign them too.
  const signedPins = await Promise.all((pins ?? []).map(async (p) =>
    p.reply_file_url ? { ...p, reply_file_url: await signedFileUrl(ctx.db, p.reply_file_url) } : p
  ))

  return Response.json(
    { order: await publicOrder(ctx.db, ctx.order), pins: signedPins, viewer: ctx.name },
    { headers: { "Cache-Control": "no-store" } }
  )
}
