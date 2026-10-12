import { adminClient, notifyShop, type NotifyShop } from "@/lib/server/notify"
import { clientIp, overLimit } from "@/lib/server/portal"
import { loadPublicPage } from "@/lib/server/page"
import { cleanBooking, freeSlots, orderDays, phoneKey, zonedTime, type Busy } from "@/lib/booking"
import { nicheConfig, type NicheConfig } from "@/lib/niches"

type Params = { params: Promise<{ slug: string }> }

const DAY = 86_400_000
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "")

/** The published page's business, if it takes bookings (a CRM niche). */
async function context(slug: string) {
  const page = await loadPublicPage(slug)
  if (!page) return null
  const db = adminClient()
  const { data: shop } = await db.from("shops")
    .select("id, user_id, name, niche, booking, notify_email, notify_telegram, telegram_chat_id, notify_lang")
    .eq("id", page.shopId).maybeSingle()
  const config = nicheConfig(shop?.niche)
  if (!shop || !config) return null
  return { db, shop, config, settings: cleanBooking(shop.booking) }
}

type Ctx = NonNullable<Awaited<ReturnType<typeof context>>>

async function service(ctx: Ctx, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const { data } = await ctx.db.from("crm_services").select("id, title, kind, duration_min, price, price_from")
    .eq("id", id).eq("shop_id", ctx.shop.id).eq("archived", false).eq("kind", ctx.config.kind).maybeSingle()
  return data
}

/** What's open: start times by day for an appointment, or the days an order can be made for. */
async function availability(ctx: Ctx, duration: number) {
  const now = new Date()
  if (ctx.config.kind === "appointment") {
    const { data } = await ctx.db.from("crm_bookings").select("starts_at, duration_min")
      .eq("shop_id", ctx.shop.id).eq("kind", "appointment").in("status", ["booked", "done"])
      .gte("starts_at", new Date(now.getTime() - DAY).toISOString())
      .lte("starts_at", new Date(now.getTime() + (ctx.settings.ahead + 2) * DAY).toISOString())
    const busy: Busy[] = (data ?? []).map((b) => {
      const start = Date.parse(b.starts_at)
      return { start, end: start + (b.duration_min ?? 60) * 60_000 }
    })
    return { kind: "appointment" as const, slots: freeSlots(ctx.settings, duration, busy, now) }
  }
  const { data } = await ctx.db.from("crm_bookings").select("due_on")
    .eq("shop_id", ctx.shop.id).eq("kind", "order").neq("status", "cancelled")
    .gte("due_on", new Date(now.getTime() - DAY).toISOString().slice(0, 10))
  const taken: Record<string, number> = {}
  for (const o of data ?? []) if (o.due_on) taken[o.due_on] = (taken[o.due_on] ?? 0) + 1
  return { kind: "order" as const, days: orderDays(ctx.settings, taken, now) }
}

/** Free times for one service (GET ?service=…). */
export async function GET(request: Request, { params }: Params) {
  const ctx = await context((await params).slug)
  if (!ctx) return Response.json({ error: "not_found" }, { status: 404 })
  const limited = await overLimit(ctx.db, `book-view:${clientIp(request)}`, 120, 60_000)
  if (limited) return limited
  const s = await service(ctx, new URL(request.url).searchParams.get("service") ?? "")
  if (!s) return Response.json({ error: "no_service" }, { status: 404 })
  return Response.json(await availability(ctx, s.duration_min ?? 60), { headers: { "cache-control": "no-store" } })
}

function orderDetails(config: NicheConfig, raw: unknown) {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>
  const out: Record<string, string> = {}
  for (const f of config.orderFields ?? []) {
    const v = text(src[f.key], 300)
    if (!v) continue
    if (f.type === "choice" && !f.options?.includes(v)) continue
    if (f.when && out[f.when.key] !== f.when.value) continue
    out[f.key] = v
  }
  return out
}

function whenText(lang: string, day: string, time: string) {
  const date = new Date(`${day}T12:00:00Z`).toLocaleDateString(lang === "ru" ? "ru-RU" : "en-GB", { weekday: "short", day: "numeric", month: "long", timeZone: "UTC" })
  return time ? `${date}, ${time}` : date
}

/** A client books: the time is checked again, the client is found by phone or added, the owner hears of it. */
export async function POST(request: Request, { params }: Params) {
  const ctx = await context((await params).slug)
  if (!ctx) return Response.json({ error: "not_found" }, { status: 404 })
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return Response.json({ error: "invalid" }, { status: 400 })
  // bots fill in every field; people never see this one
  if (text(body.company, 100)) return Response.json({ ok: true })

  const name = text(body.name, 80)
  const phone = text(body.phone, 40)
  const note = text(body.note, 500)
  const day = text(body.day, 10)
  const time = text(body.time, 5)
  if (!name || phoneKey(phone).length < 9 || !DAY_RE.test(day)) return Response.json({ error: "invalid" }, { status: 400 })
  const isOrder = ctx.config.kind === "order"
  if (!isOrder && !TIME_RE.test(time)) return Response.json({ error: "invalid" }, { status: 400 })

  const limited = await overLimit(ctx.db, `book:${clientIp(request)}:${ctx.shop.id}`, 5, 10 * 60_000)
  if (limited) return limited

  const s = await service(ctx, text(body.service, 36))
  if (!s) return Response.json({ error: "no_service" }, { status: 404 })
  const open = await availability(ctx, s.duration_min ?? 60)
  const stillFree = open.kind === "appointment" ? open.slots[day]?.includes(time) : open.days.includes(day)
  if (!stillFree) return Response.json({ error: "taken" }, { status: 409 })

  // the same person (by phone) keeps one card in the client base
  const { data: known } = await ctx.db.from("crm_clients").select("id, phone").eq("shop_id", ctx.shop.id)
  let clientId = (known ?? []).find((c) => c.phone && phoneKey(c.phone) === phoneKey(phone))?.id ?? null
  if (!clientId) {
    const { data: created, error } = await ctx.db.from("crm_clients").insert({ shop_id: ctx.shop.id, name, phone }).select("id").single()
    if (error) { console.error("Booking client error:", error); return Response.json({ error: "failed" }, { status: 500 }) }
    clientId = created.id
  }

  const details = isOrder ? orderDetails(ctx.config, body.details) : {}
  const { error } = await ctx.db.from("crm_bookings").insert({
    shop_id: ctx.shop.id,
    client_id: clientId,
    service_id: s.id,
    kind: ctx.config.kind,
    title: s.title,
    starts_at: isOrder ? null : zonedTime(day, time, ctx.settings.tz).toISOString(),
    duration_min: isOrder ? null : s.duration_min ?? 60,
    due_on: isOrder ? day : null,
    due_time: isOrder && TIME_RE.test(time) ? time : "",
    status: isOrder ? "new" : "booked",
    price: s.price_from ? null : s.price,
    details,
    notes: note,
  })
  if (error) {
    console.error("Booking save error:", error)
    return Response.json({ error: "failed" }, { status: 500 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
  const lang = ctx.shop.notify_lang === "ru" ? "ru" : "en"
  const extra = Object.values(details).join(" · ")
  await notifyShop(ctx.shop as NotifyShop, {
    kind: "booking", order: isOrder, name, phone, what: s.title,
    when: whenText(lang, day, isOrder ? (TIME_RE.test(time) ? time : "") : time),
    note: [extra, note].filter(Boolean).join("\n"),
  }, `${siteUrl}/dashboard`).catch((e) => console.error("Notify error:", e))

  return Response.json({ ok: true })
}
