import { adminClient, notifyShop, type NotifyShop } from "@/lib/server/notify"
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

/** Describe, resolve, reopen or move any comment on the order: the portal belongs to the client. */
export async function PATCH(request: Request, { params }: Params) {
  const { id, pinId } = await params
  const ctx = await loadPin(request, id, pinId)
  if (ctx instanceof Response) return ctx

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const patch: Record<string, unknown> = {}
  if (typeof body.resolved === "boolean") patch.resolved = body.resolved
  if (typeof body.x === "number" && typeof body.y === "number") {
    patch.x = Math.min(100, Math.max(0, body.x))
    patch.y = Math.min(100, Math.max(0, body.y))
  }
  // What the comment says, written in the list after the pin was put on the file.
  if (typeof body.title === "string" && body.title.trim()) patch.title = body.title.trim().slice(0, 200)
  if (typeof body.description === "string" || body.description === null) {
    patch.description = typeof body.description === "string" ? body.description.trim().slice(0, 2000) || null : null
  }
  if (!Object.keys(patch).length) return Response.json({ error: "invalid" }, { status: 400 })

  const { data, error } = await ctx.db.from("order_pins").update(patch).eq("id", pinId).select().single()
  if (error) return Response.json({ error: "failed" }, { status: 500 })
  // A pin put on the file without words just got them: now it is a comment worth announcing.
  if (patch.title && !String(ctx.pin.title ?? "").trim()) {
    await announceComment(ctx.db, ctx.order, data, new URL(request.url).origin).catch((e) => console.error("Notify error:", e))
  }
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

const SHOP_COLUMNS = "id, user_id, name, notify_email, notify_telegram, telegram_chat_id, notify_lang"

async function announceComment(
  db: ReturnType<typeof adminClient>,
  order: Record<string, unknown>,
  pin: Record<string, unknown>,
  origin: string
) {
  const { data: shop } = await db.from("shops").select(SHOP_COLUMNS).eq("id", String(order.shop_id)).maybeSingle()
  if (!shop) return
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin
  await notifyShop(shop as NotifyShop, {
    kind: "comment",
    orderTitle: String(order.title ?? ""),
    author: String(pin.author_name ?? "Client"),
    title: String(pin.title ?? ""),
    description: (pin.description as string | null) ?? null,
    page: Number(pin.page ?? 1),
  }, `${siteUrl}/orders/${String(order.id)}`)
}
