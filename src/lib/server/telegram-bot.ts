import type { SupabaseClient } from "@supabase/supabase-js"
import { cleanBooking } from "@/lib/booking"
import { nicheConfig } from "@/lib/niches"

// The owner's Telegram bot: connecting with the code from Nodly, then a menu to look at
// today's and the coming bookings (or orders), the client base, a client's card, and to
// move a booking along. Every read and write is limited to the shop this chat is linked to.

type Lang = "uk" | "ru"
type Shop = { id: string; name: string; niche: string | null; booking: unknown }
type Button = { text: string; callback_data?: string; url?: string }

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || "https://nodly.app"

/** One call to the Bot API; failures are logged, not thrown. */
export async function tg(method: string, body: Record<string, unknown>) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return null
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    })
    if (!res.ok) console.error(`Telegram ${method} ${res.status}:`, await res.text())
    return res.ok ? res.json() : null
  } catch (e) {
    console.error(`Telegram ${method}:`, e)
    return null
  }
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

// ── words ──

const W = {
  uk: {
    today: "📅 Сьогодні", upcoming: "🗓 Найближчі", clients: "👥 Клієнти", crm: "🌐 Відкрити CRM",
    askCode: "👋 Це бот Nodly.\n\nЩоб підключити свій кабінет, відкрийте Nodly → <b>Налаштування → Сповіщення</b>, натисніть «Підключити Telegram» і надішліть сюди <b>6-значний код</b>.",
    wrongCode: "Код не підходить або вже використаний. Отримайте новий у Nodly → Налаштування → Сповіщення.",
    slow: "Забагато спроб. Спробуйте за кілька хвилин.",
    connected: (n: string) => `✅ Готово! Кабінет «${esc(n)}» підключено.\n\nСюди приходитимуть нові записи, а кнопки внизу покажуть записи й клієнтів.`,
    stopped: "Бота відключено. Щоб підключити знову — надішліть новий код з Nodly.",
    menu: "Оберіть, що показати 👇",
    noneToday: "Сьогодні записів немає.", noneOrdersToday: "На сьогодні замовлень немає.",
    noneUpcoming: "Найближчим тижнем нічого немає.",
    todayTitle: (d: string, n: number, o: boolean) => `<b>Сьогодні, ${d}</b> · ${n} ${o ? "зам." : "зап."}`,
    upcomingTitle: (n: number) => `<b>Найближчі 7 днів</b> · ${n}`,
    clientsTitle: (n: number) => `<b>Клієнти</b> · ${n}\nНатисніть на клієнта або напишіть ім'я чи телефон для пошуку.`,
    noClients: "Клієнтів поки немає.", found: (n: number) => `Знайдено: ${n}`, notFound: "Нікого не знайдено.",
    phone: "Телефон", visits: "Візитів", orders: "Замовлень", spent: "Сума", last: "Останній раз", next: "Наступний запис", notes: "Нотатки",
    client: "👤 Клієнт", history: "📋 Історія", openCrm: "🌐 Відкрити в CRM", write: "✉️ Написати в Telegram",
    came: "✅ Прийшов", noShow: "🚫 Не прийшов", cancel: "❌ Скасувати", back: "◀️", fwd: "▶️",
    prepaid: "передплата", reach: "Зв'язок", photos: "Фото", gone: "Цього вже немає.", saved: "Збережено",
    noName: "Без імені", noHistory: "Записів ще не було.",
  },
  ru: {
    today: "📅 Сегодня", upcoming: "🗓 Ближайшие", clients: "👥 Клиенты", crm: "🌐 Открыть CRM",
    askCode: "👋 Это бот Nodly.\n\nЧтобы подключить свой кабинет, откройте Nodly → <b>Настройки → Уведомления</b>, нажмите «Подключить Telegram» и отправьте сюда <b>6-значный код</b>.",
    wrongCode: "Код не подходит или уже использован. Получите новый в Nodly → Настройки → Уведомления.",
    slow: "Слишком много попыток. Попробуйте через несколько минут.",
    connected: (n: string) => `✅ Готово! Кабинет «${esc(n)}» подключён.\n\nСюда будут приходить новые записи, а кнопки внизу покажут записи и клиентов.`,
    stopped: "Бот отключён. Чтобы подключить снова — отправьте новый код из Nodly.",
    menu: "Выберите, что показать 👇",
    noneToday: "Сегодня записей нет.", noneOrdersToday: "На сегодня заказов нет.",
    noneUpcoming: "На ближайшей неделе ничего нет.",
    todayTitle: (d: string, n: number, o: boolean) => `<b>Сегодня, ${d}</b> · ${n} ${o ? "зак." : "зап."}`,
    upcomingTitle: (n: number) => `<b>Ближайшие 7 дней</b> · ${n}`,
    clientsTitle: (n: number) => `<b>Клиенты</b> · ${n}\nНажмите на клиента или напишите имя либо телефон для поиска.`,
    noClients: "Клиентов пока нет.", found: (n: number) => `Найдено: ${n}`, notFound: "Никого не найдено.",
    phone: "Телефон", visits: "Визитов", orders: "Заказов", spent: "Сумма", last: "Последний раз", next: "Следующая запись", notes: "Заметки",
    client: "👤 Клиент", history: "📋 История", openCrm: "🌐 Открыть в CRM", write: "✉️ Написать в Telegram",
    came: "✅ Пришёл", noShow: "🚫 Не пришёл", cancel: "❌ Отменить", back: "◀️", fwd: "▶️",
    prepaid: "предоплата", reach: "Связь", photos: "Фото", gone: "Этого уже нет.", saved: "Сохранено",
    noName: "Без имени", noHistory: "Записей ещё не было.",
  },
}

const STATUS: Record<string, [string, string]> = {
  booked: ["🕒 Записаний", "🕒 Записан"], done: ["✅ Прийшов", "✅ Пришёл"], no_show: ["🚫 Не прийшов", "🚫 Не пришёл"],
  new: ["🆕 Нове", "🆕 Новый"], confirmed: ["👍 Підтверджено", "👍 Подтверждён"], in_progress: ["👩‍🍳 Готується", "👩‍🍳 Готовится"],
  ready: ["📦 Готово", "📦 Готов"], delivered: ["✅ Видано", "✅ Выдан"], cancelled: ["❌ Скасовано", "❌ Отменён"],
}
const ORDER_FLOW = ["new", "confirmed", "in_progress", "ready", "delivered"]
const status = (s: string, l: Lang) => STATUS[s]?.[l === "ru" ? 1 : 0] ?? s

function keyboard(l: Lang) {
  const w = W[l]
  return { keyboard: [[{ text: w.today }, { text: w.upcoming }], [{ text: w.clients }, { text: w.crm }]], resize_keyboard: true, is_persistent: true }
}

const money = (v: number | null | undefined) => (v == null ? "" : `${new Intl.NumberFormat("uk-UA").format(v)} ₴`)

/** Date parts in the shop's time zone. */
function zoned(d: Date, tz: string, l: Lang) {
  const loc = l === "ru" ? "ru-RU" : "uk-UA"
  return {
    day: d.toLocaleDateString("en-CA", { timeZone: tz }),
    time: d.toLocaleTimeString("uk-UA", { timeZone: tz, hour: "2-digit", minute: "2-digit" }),
    label: d.toLocaleDateString(loc, { timeZone: tz, day: "numeric", month: "long" }),
    short: d.toLocaleDateString(loc, { timeZone: tz, weekday: "short", day: "numeric", month: "short" }),
  }
}

type Booking = {
  id: string; client_id: string | null; kind: string; title: string; starts_at: string | null; due_on: string | null; due_time: string
  status: string; price: number | null; prepaid: number | null; details: Record<string, string>; notes: string
}
const BOOKING_COLS = "id, client_id, kind, title, starts_at, due_on, due_time, status, price, prepaid, details, notes"

// ── the bot ──

export class OwnerBot {
  constructor(private db: SupabaseClient, private chatId: string, private l: Lang) {}
  private get w() { return W[this.l] }

  send(text: string, extra: Record<string, unknown> = {}) {
    return tg("sendMessage", { chat_id: this.chatId, text, parse_mode: "HTML", disable_web_page_preview: true, ...extra })
  }
  /** Replace the message a button was pressed on, so lists don't pile up. */
  edit(messageId: number, text: string, buttons: Button[][]) {
    return tg("editMessageText", { chat_id: this.chatId, message_id: messageId, text, parse_mode: "HTML", disable_web_page_preview: true, reply_markup: { inline_keyboard: buttons } })
  }

  async shop(): Promise<Shop | null> {
    const full = await this.db.from("shops").select("id, name, niche, booking").eq("telegram_chat_id", this.chatId).limit(1)
    if (!full.error) return (full.data?.[0] as Shop | undefined) ?? null
    // an older database without the booking settings column: default hours and time zone
    const { data } = await this.db.from("shops").select("id, name, niche").eq("telegram_chat_id", this.chatId).limit(1)
    return data?.[0] ? { ...(data[0] as Omit<Shop, "booking">), booking: {} } : null
  }

  /** A code from Nodly links this chat to that shop. */
  async connect(code: string) {
    const { data: shop } = await this.db.from("shops")
      .update({ telegram_chat_id: this.chatId, telegram_link_code: null, notify_telegram: true })
      .eq("telegram_link_code", code).select("name").maybeSingle()
    if (!shop) return this.send(this.w.wrongCode)
    return this.send(this.w.connected(shop.name), { reply_markup: keyboard(this.l) })
  }

  async stop() {
    await this.db.from("shops").update({ telegram_chat_id: null }).eq("telegram_chat_id", this.chatId)
    return this.send(this.w.stopped, { reply_markup: { remove_keyboard: true } })
  }

  askCode() { return this.send(this.w.askCode, { reply_markup: { remove_keyboard: true } }) }
  menu() { return this.send(this.w.menu, { reply_markup: keyboard(this.l) }) }

  crmButton(path = "/dashboard"): Button { return { text: this.w.openCrm, url: `${siteUrl()}${path}` } }
  async openCrm() {
    return this.send("Nodly", { reply_markup: { inline_keyboard: [[this.crmButton()]] } })
  }

  private async names(shop: Shop, ids: (string | null)[]) {
    const list = [...new Set(ids.filter(Boolean))] as string[]
    if (!list.length) return new Map<string, string>()
    const { data } = await this.db.from("crm_clients").select("id, name").eq("shop_id", shop.id).in("id", list)
    return new Map((data ?? []).map((c) => [c.id as string, c.name as string]))
  }

  private when(b: Booking, tz: string) {
    if (b.starts_at) { const z = zoned(new Date(b.starts_at), tz, this.l); return { day: z.day, time: z.time, short: z.short } }
    const d = new Date(`${b.due_on}T12:00:00Z`)
    return { day: b.due_on!, time: b.due_time || "", short: zoned(d, "UTC", this.l).short }
  }

  /** Today's bookings (or orders), each a button to its card. */
  async today(shop: Shop) {
    const tz = cleanBooking(shop.booking).tz
    const isOrder = nicheConfig(shop.niche)?.kind === "order"
    const now = new Date()
    const today = zoned(now, tz, this.l)
    let q = this.db.from("crm_bookings").select(BOOKING_COLS).eq("shop_id", shop.id).neq("status", "cancelled")
    q = isOrder ? q.eq("kind", "order").eq("due_on", today.day)
      : q.eq("kind", "appointment").gte("starts_at", new Date(now.getTime() - 36e5 * 30).toISOString()).lte("starts_at", new Date(now.getTime() + 36e5 * 30).toISOString())
    const { data } = await q.order(isOrder ? "due_time" : "starts_at", { ascending: true }).limit(40)
    const list = ((data ?? []) as Booking[]).filter((b) => this.when(b, tz).day === today.day)
    if (!list.length) return this.send(isOrder ? this.w.noneOrdersToday : this.w.noneToday, { reply_markup: keyboard(this.l) })
    const names = await this.names(shop, list.map((b) => b.client_id))
    const lines = list.map((b) => `${this.when(b, tz).time || "—"} · ${esc((b.client_id && names.get(b.client_id)) || this.w.noName)} · ${esc(b.title)}`)
    return this.send(`${this.w.todayTitle(today.label, list.length, isOrder)}\n\n${lines.join("\n")}`, {
      reply_markup: { inline_keyboard: list.map((b) => [{ text: `${this.when(b, tz).time || "•"} ${(b.client_id && names.get(b.client_id)) || this.w.noName}`.slice(0, 60), callback_data: `b:${b.id}` }]) },
    })
  }

  /** The coming week. */
  async upcoming(shop: Shop) {
    const tz = cleanBooking(shop.booking).tz
    const isOrder = nicheConfig(shop.niche)?.kind === "order"
    const now = new Date()
    const week = new Date(now.getTime() + 7 * 864e5)
    let q = this.db.from("crm_bookings").select(BOOKING_COLS).eq("shop_id", shop.id).not("status", "in", "(cancelled,done,no_show,delivered)")
    q = isOrder ? q.eq("kind", "order").gte("due_on", zoned(now, tz, this.l).day).lte("due_on", zoned(week, tz, this.l).day).order("due_on")
      : q.eq("kind", "appointment").gte("starts_at", now.toISOString()).lte("starts_at", week.toISOString()).order("starts_at")
    const { data } = await q.limit(20)
    const list = (data ?? []) as Booking[]
    if (!list.length) return this.send(this.w.noneUpcoming, { reply_markup: keyboard(this.l) })
    const names = await this.names(shop, list.map((b) => b.client_id))
    return this.send(this.w.upcomingTitle(list.length), {
      reply_markup: { inline_keyboard: list.map((b) => { const w = this.when(b, tz); return [{ text: `${w.short}${w.time ? ` ${w.time}` : ""} · ${(b.client_id && names.get(b.client_id)) || this.w.noName}`.slice(0, 60), callback_data: `b:${b.id}` }] }) },
    })
  }

  /** The client base, 8 at a time, newest first. */
  async clients(shop: Shop, offset = 0, messageId?: number) {
    const { data, count } = await this.db.from("crm_clients").select("id, name, phone", { count: "exact" })
      .eq("shop_id", shop.id).order("created_at", { ascending: false }).range(offset, offset + 7)
    if (!count) return this.send(this.w.noClients, { reply_markup: keyboard(this.l) })
    const rows: Button[][] = (data ?? []).map((c) => [{ text: `${c.name}${c.phone ? ` · ${c.phone}` : ""}`.slice(0, 60), callback_data: `c:${c.id}` }])
    const nav: Button[] = []
    if (offset > 0) nav.push({ text: this.w.back, callback_data: `cl:${Math.max(0, offset - 8)}` })
    if (offset + 8 < count) nav.push({ text: this.w.fwd, callback_data: `cl:${offset + 8}` })
    if (nav.length) rows.push(nav)
    const text = this.w.clientsTitle(count)
    return messageId ? this.edit(messageId, text, rows) : this.send(text, { reply_markup: { inline_keyboard: rows } })
  }

  /** A typed name or phone: the clients that match. */
  async search(shop: Shop, query: string) {
    const q = query.replace(/[%,()]/g, " ").trim().slice(0, 40)
    if (q.length < 2) return this.menu()
    const digits = q.replace(/\D/g, "")
    const filter = digits.length >= 3 ? `name.ilike.%${q}%,phone.ilike.%${digits}%` : `name.ilike.%${q}%`
    const { data } = await this.db.from("crm_clients").select("id, name, phone").eq("shop_id", shop.id).or(filter).limit(10)
    if (!data?.length) return this.send(this.w.notFound, { reply_markup: keyboard(this.l) })
    return this.send(this.w.found(data.length), {
      reply_markup: { inline_keyboard: data.map((c) => [{ text: `${c.name}${c.phone ? ` · ${c.phone}` : ""}`.slice(0, 60), callback_data: `c:${c.id}` }]) },
    })
  }

  /** A client's card: contacts, visits, money, the next booking. */
  async client(shop: Shop, id: string) {
    const { data: c } = await this.db.from("crm_clients").select("id, name, phone, telegram, instagram, notes").eq("shop_id", shop.id).eq("id", id).maybeSingle()
    if (!c) return this.send(this.w.gone)
    const tz = cleanBooking(shop.booking).tz
    const isOrder = nicheConfig(shop.niche)?.kind === "order"
    const { data } = await this.db.from("crm_bookings").select(BOOKING_COLS).eq("shop_id", shop.id).eq("client_id", id).limit(200)
    const all = (data ?? []) as Booking[]
    const at = (b: Booking) => (b.starts_at ? Date.parse(b.starts_at) : Date.parse(`${b.due_on}T12:00:00Z`))
    const done = all.filter((b) => b.status === "done" || b.status === "delivered").sort((a, b) => at(b) - at(a))
    const next = all.filter((b) => !["cancelled", "done", "no_show", "delivered"].includes(b.status) && at(b) >= Date.now() - 36e5).sort((a, b) => at(a) - at(b))[0]
    const spent = done.reduce((s, b) => s + (b.price ?? 0), 0)
    const lines = [
      `<b>${esc(c.name)}</b>`,
      c.phone && `${this.w.phone}: ${esc(c.phone)}`,
      c.telegram && `Telegram: ${esc(c.telegram)}`,
      c.instagram && `Instagram: ${esc(c.instagram)}`,
      "",
      `${isOrder ? this.w.orders : this.w.visits}: ${done.length}${spent ? ` · ${this.w.spent}: ${money(spent)}` : ""}`,
      done[0] && `${this.w.last}: ${this.when(done[0], tz).short}`,
      next && `${this.w.next}: ${this.when(next, tz).short}${this.when(next, tz).time ? `, ${this.when(next, tz).time}` : ""} · ${esc(next.title)}`,
      c.notes && `\n${this.w.notes}: ${esc(c.notes)}`,
    ].filter((x) => x !== false && x !== null && x !== undefined) as string[]
    const nick = (c.telegram || "").replace(/^@/, "")
    const buttons: Button[][] = [[{ text: this.w.history, callback_data: `h:${c.id}` }]]
    if (next) buttons[0].push({ text: "📌 " + this.when(next, tz).short, callback_data: `b:${next.id}` })
    if (/^\w{3,}$/.test(nick)) buttons.push([{ text: this.w.write, url: `https://t.me/${nick}` }])
    buttons.push([this.crmButton("/clients")])
    return this.send(lines.join("\n"), { reply_markup: { inline_keyboard: buttons } })
  }

  /** A client's last bookings. */
  async history(shop: Shop, clientId: string) {
    const tz = cleanBooking(shop.booking).tz
    const { data } = await this.db.from("crm_bookings").select(BOOKING_COLS).eq("shop_id", shop.id).eq("client_id", clientId)
      .order("created_at", { ascending: false }).limit(8)
    const list = (data ?? []) as Booking[]
    if (!list.length) return this.send(this.w.noHistory)
    return this.send(this.w.history, {
      reply_markup: { inline_keyboard: list.map((b) => { const w = this.when(b, tz); return [{ text: `${w.short} · ${b.title} · ${status(b.status, this.l)}`.slice(0, 60), callback_data: `b:${b.id}` }] }) },
    })
  }

  /** A booking's card with its next steps. */
  async booking(shop: Shop, id: string, messageId?: number) {
    const { data: b } = await this.db.from("crm_bookings").select(BOOKING_COLS).eq("shop_id", shop.id).eq("id", id).maybeSingle() as { data: Booking | null }
    if (!b) return this.send(this.w.gone)
    const tz = cleanBooking(shop.booking).tz
    const w = this.when(b, tz)
    const names = await this.names(shop, [b.client_id])
    const { data: c } = b.client_id ? await this.db.from("crm_clients").select("phone").eq("shop_id", shop.id).eq("id", b.client_id).maybeSingle() : { data: null }
    const d = b.details ?? {}
    const extra = Object.entries(d).filter(([k]) => !["contact", "telegram", "photos", "via"].includes(k)).map(([, v]) => esc(String(v)))
    const lines = [
      `<b>${esc(b.title)}</b>`,
      `${w.short}${w.time ? `, ${w.time}` : ""} · ${status(b.status, this.l)}`,
      `👤 ${esc((b.client_id && names.get(b.client_id)) || this.w.noName)}${c?.phone ? ` · ${esc(c.phone)}` : ""}`,
      d.contact && `${this.w.reach}: ${d.contact === "telegram" ? "Telegram" : d.contact === "viber" ? "Viber" : this.w.phone}${d.telegram ? ` ${esc(d.telegram)}` : ""}`,
      b.price != null && `💰 ${money(b.price)}${b.prepaid ? ` · ${this.w.prepaid} ${money(b.prepaid)}` : ""}`,
      extra.length > 0 && extra.join(" · "),
      d.photos && `${this.w.photos}: ${d.photos.split("\n").filter(Boolean).length}`,
      b.notes && `💬 ${esc(b.notes)}`,
    ].filter((x) => x !== false && x !== null && x !== undefined && x !== "") as string[]
    const buttons: Button[][] = []
    if (b.kind === "appointment" && b.status === "booked") {
      buttons.push([{ text: this.w.came, callback_data: `s:${b.id}:done` }, { text: this.w.noShow, callback_data: `s:${b.id}:no_show` }])
      buttons.push([{ text: this.w.cancel, callback_data: `s:${b.id}:cancelled` }])
    } else if (b.kind === "order") {
      const i = ORDER_FLOW.indexOf(b.status)
      if (i >= 0 && i < ORDER_FLOW.length - 1) buttons.push([{ text: `→ ${status(ORDER_FLOW[i + 1], this.l)}`, callback_data: `s:${b.id}:${ORDER_FLOW[i + 1]}` }])
      if (b.status !== "cancelled" && b.status !== "delivered") buttons.push([{ text: this.w.cancel, callback_data: `s:${b.id}:cancelled` }])
    }
    if (b.client_id) buttons.push([{ text: this.w.client, callback_data: `c:${b.client_id}` }])
    buttons.push([this.crmButton(b.kind === "order" ? "/orders" : "/dashboard")])
    const text = lines.join("\n")
    return messageId ? this.edit(messageId, text, buttons) : this.send(text, { reply_markup: { inline_keyboard: buttons } })
  }

  /** A status button: only the steps the card offers. */
  async setStatus(shop: Shop, id: string, next: string, messageId: number) {
    if (!STATUS[next]) return
    await this.db.from("crm_bookings").update({ status: next }).eq("shop_id", shop.id).eq("id", id)
    return this.booking(shop, id, messageId)
  }
}
