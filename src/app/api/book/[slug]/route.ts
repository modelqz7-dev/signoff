import { randomUUID } from "node:crypto"
import { adminClient, notifyShop, sendTelegram, shopLang, type NotifyShop } from "@/lib/server/notify"
import { FILES_BUCKET } from "@/lib/storage-path"
import { clientIp, overLimit } from "@/lib/server/portal"
import { loadPublicPage } from "@/lib/server/page"
import { cleanBooking, freeSlots, orderDays, phoneKey, zonedTime, type Busy } from "@/lib/booking"
import { nicheConfig, type NicheConfig } from "@/lib/niches"
import { can, FREE_BOOKINGS } from "@/lib/plans"
import { sessionAccount } from "@/lib/server/client-session"

type Params = { params: Promise<{ slug: string }> }

const DAY = 86_400_000
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/
const MAX_PHOTOS = 3
const MAX_PHOTO_BYTES = 4 * 1024 * 1024
/** Plain photos only (no SVG: it can carry scripts). */
const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"])
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "")

/** The published page's business, if it takes bookings (a CRM niche). */
async function context(slug: string) {
  const page = await loadPublicPage(slug)
  if (!page) return null
  const db = adminClient()
  const full = await db.from("shops")
    .select("id, user_id, name, niche, booking, notify_email, notify_telegram, telegram_chat_id, notify_lang, plan, trial_ends_at")
    .eq("id", page.shopId).maybeSingle()
  let shop = full.data
  // an older database may lack some of these columns: book anyway, with what's there
  if (full.error) {
    console.error("Booking shop load error:", full.error)
    const { data: basic } = await db.from("shops").select("id, user_id, name, niche").eq("id", page.shopId).maybeSingle()
    shop = basic ? { ...basic, booking: {}, notify_email: null, notify_telegram: null, telegram_chat_id: null, notify_lang: null, plan: "free", trial_ends_at: null } : null
  }
  const config = nicheConfig(shop?.niche)
  if (!shop || !config) return null
  // the page's opening hours, when filled in, are the hours clients can book in
  return { db, shop, config, settings: cleanBooking(shop.booking), hours: page.data.hours }
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
    return { kind: "appointment" as const, slots: freeSlots(ctx.settings, duration, busy, now, ctx.hours) }
  }
  const { data } = await ctx.db.from("crm_bookings").select("due_on")
    .eq("shop_id", ctx.shop.id).eq("kind", "order").neq("status", "cancelled")
    .gte("due_on", new Date(now.getTime() - DAY).toISOString().slice(0, 10))
  const taken: Record<string, number> = {}
  for (const o of data ?? []) if (o.due_on) taken[o.due_on] = (taken[o.due_on] ?? 0) + 1
  return { kind: "order" as const, days: orderDays(ctx.settings, taken, now, ctx.hours) }
}

/** Bookings made through the page since the 1st of this month (UTC). */
async function onlineThisMonth(ctx: Ctx) {
  const now = new Date()
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
  const { count } = await ctx.db.from("crm_bookings").select("id", { count: "exact", head: true })
    .eq("shop_id", ctx.shop.id).eq("details->>via", "online").gte("created_at", from)
  return count ?? 0
}

/** Free times for one service (GET ?service=…). */
export async function GET(request: Request, { params }: Params) {
  const ctx = await context((await params).slug)
  if (!ctx) return Response.json({ error: "not_found" }, { status: 404 })
  const limited = await overLimit(ctx.db, `book-view:${clientIp(request)}`, 120, 60_000)
  if (limited) return limited
  const s = await service(ctx, new URL(request.url).searchParams.get("service") ?? "")
  if (!s) return Response.json({ error: "no_service" }, { status: 404 })
  // the month's free online bookings are used up: say so before the client fills anything in
  if (!can(ctx.shop, "unlimitedBookings") && (await onlineThisMonth(ctx)) >= FREE_BOOKINGS) {
    return Response.json({ error: "limit" }, { status: 403 })
  }
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
  const date = new Date(`${day}T12:00:00Z`).toLocaleDateString(lang === "ru" ? "ru-RU" : "uk-UA", { weekday: "short", day: "numeric", month: "long", timeZone: "UTC" })
  return time ? `${date}, ${time}` : date
}

/** A client books: the time is checked again, the client is found by phone or added, the owner hears of it. */
export async function POST(request: Request, { params }: Params) {
  const ctx = await context((await params).slug)
  if (!ctx) return Response.json({ error: "not_found" }, { status: 404 })
  // a form with reference photos, or plain JSON
  const isForm = (request.headers.get("content-type") ?? "").includes("multipart/form-data")
  const form = isForm ? await request.formData().catch(() => null) : null
  const body = form
    ? { ...Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")), details: JSON.parse(String(form.get("details") || "{}")) } as Record<string, unknown>
    : await request.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return Response.json({ error: "invalid" }, { status: 400 })
  // bots fill in every field; people never see this one
  if (text(body.company, 100)) return Response.json({ ok: true })

  const name = text(body.name, 80)
  const phone = text(body.phone, 40)
  const note = text(body.note, 500)
  const day = text(body.day, 10)
  const time = text(body.time, 5)
  // a client signed in with Telegram: their profile goes with the booking
  const me = await sessionAccount(request).catch(() => null)
  const way = me?.username ? "telegram" : text(body.contact, 10)
  const nick = (me?.username || text(body.telegram, 40)).replace(/^@?/, "@")
  if (!name || phoneKey(phone).length < 9 || !DAY_RE.test(day)) return Response.json({ error: "invalid" }, { status: 400 })
  const isOrder = ctx.config.kind === "order"
  if (!isOrder && !TIME_RE.test(time)) return Response.json({ error: "invalid" }, { status: 400 })

  const limited = await overLimit(ctx.db, `book:${clientIp(request)}:${ctx.shop.id}`, 5, 10 * 60_000)
  if (limited) return limited

  // the free plan takes FREE_BOOKINGS online bookings a month; the owner's own entries don't count
  if (!can(ctx.shop, "unlimitedBookings") && (await onlineThisMonth(ctx)) >= FREE_BOOKINGS) {
    return Response.json({ error: "limit" }, { status: 403 })
  }

  const s = await service(ctx, text(body.service, 36))
  if (!s) return Response.json({ error: "no_service" }, { status: 404 })
  const open = await availability(ctx, s.duration_min ?? 60)
  const stillFree = open.kind === "appointment" ? open.slots[day]?.includes(time) : open.days.includes(day)
  if (!stillFree) return Response.json({ error: "taken" }, { status: 409 })

  // the same person (by phone) keeps one card in the client base
  const { data: known } = await ctx.db.from("crm_clients").select("id, phone").eq("shop_id", ctx.shop.id)
  let clientId = (known ?? []).find((c) => c.phone && phoneKey(c.phone) === phoneKey(phone))?.id ?? null
  if (!clientId) {
    const tg = way === "telegram" && nick.length > 1 ? nick : ""
    const { data: created, error } = await ctx.db.from("crm_clients").insert({ shop_id: ctx.shop.id, name, phone, telegram: tg }).select("id").single()
    if (error) { console.error("Booking client error:", error); return Response.json({ error: "failed" }, { status: 500 }) }
    clientId = created.id
  }

  const details: Record<string, string> = isOrder ? orderDetails(ctx.config, body.details) : {}
  // made through the page, not by the owner: counts toward the free plan's monthly bookings
  details.via = "online"
  if (me) details.account = me.id
  // how the client wants to be reached: Telegram, Viber or a call
  if (way === "telegram" || way === "viber" || way === "phone") details.contact = way
  if (way === "telegram" && nick.length > 1) details.telegram = nick
  // reference photos (a sketch, a cake they liked): the business's private folder, like requests
  const photos: string[] = []
  for (const entry of form ? form.getAll("files").slice(0, MAX_PHOTOS) : []) {
    if (!(entry instanceof File) || !PHOTO_TYPES.has(entry.type) || entry.size > MAX_PHOTO_BYTES) continue
    const ext = (entry.name.split(".").pop() || "jpg").replace(/[^a-z0-9]/gi, "").slice(0, 5) || "jpg"
    const path = `${ctx.shop.id}/bookings/${randomUUID()}.${ext}`
    const { error: upError } = await ctx.db.storage.from(FILES_BUCKET).upload(path, entry, { contentType: entry.type })
    if (upError) { console.error("Booking photo upload error:", upError); continue }
    photos.push(ctx.db.storage.from(FILES_BUCKET).getPublicUrl(path).data.publicUrl)
  }
  if (photos.length) details.photos = photos.join("\n")
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
    // the client's "about me" from their profile goes along, so the master sees it with the booking
    notes: [note, me?.about ? `👤 ${me.about}` : ""].filter(Boolean).join("\n").slice(0, 2000),
  })
  if (error) {
    console.error("Booking save error:", error)
    return Response.json({ error: "failed" }, { status: 500 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
  const lang = shopLang(ctx.shop.notify_lang)
  const WAY: Record<string, string> = { telegram: "Telegram", viber: "Viber", phone: lang === "ru" ? "звонок" : "дзвінок" }
  const reach = details.contact ? `${WAY[details.contact]}${details.telegram ? ` ${details.telegram}` : ""}` : ""
  const extra = Object.entries(details).filter(([k]) => !["contact", "telegram", "photos", "via"].includes(k)).map(([, v]) => v).join(" · ")
  const photoLine = photos.length ? (lang === "ru" ? `Фото: ${photos.length}` : `Фото: ${photos.length}`) : ""
  await notifyShop(ctx.shop as NotifyShop, {
    kind: "booking", order: isOrder, name, phone: reach ? `${phone} · ${reach}` : phone, what: s.title,
    when: whenText(lang, day, isOrder ? (TIME_RE.test(time) ? time : "") : time),
    note: [extra, note, photoLine].filter(Boolean).join("\n"),
  }, `${siteUrl}/dashboard`).catch((e) => console.error("Notify error:", e))

  // the client's own confirmation, in the bot they signed in with
  if (me?.chat_id) {
    const ru = lang === "ru"
    await sendTelegram(me.chat_id, `✅ ${ru ? "Вы записаны" : "Ви записані"}: <b>${s.title.replace(/</g, "&lt;")}</b>\n${whenText(lang, day, isOrder ? (TIME_RE.test(time) ? time : "") : time)}\n${ctx.shop.name.replace(/</g, "&lt;")}`).catch(() => {})
  }
  return Response.json({ ok: true })
}
