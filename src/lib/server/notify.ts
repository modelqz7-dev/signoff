// Server-only helpers for Telegram and email notifications. Never import from client code:
// they use the Supabase service-role key and the bot / email API keys.
import { createClient } from "@supabase/supabase-js"
import { FEATURES } from "@/lib/features"

export type NotifyShop = {
  id: string
  user_id: string
  name: string
  notify_email: boolean | null
  notify_telegram: boolean | null
  telegram_chat_id: string | null
  notify_lang: string | null
}

export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured")
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

/** NOTIFY_WEBHOOK_SECRET without stray whitespace (a pasted value often ends with a newline). */
export function webhookSecret() {
  return process.env.NOTIFY_WEBHOOK_SECRET?.trim() || undefined
}

/** Constant-time-ish comparison for shared secrets. */
export function secretMatches(given: string | null, expected: string | undefined) {
  given = given?.trim() ?? null
  if (!given || !expected || given.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}

export async function sendTelegram(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return { ok: false, error: "TELEGRAM_BOT_TOKEN is not configured" }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
    })
    return res.ok ? { ok: true } : { ok: false, error: `Telegram ${res.status}: ${await res.text()}` }
  } catch (e) {
    return { ok: false, error: `Telegram: ${(e as Error).message}` }
  }
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  opts: { fromName?: string; replyTo?: string } = {},
) {
  const key = process.env.RESEND_API_KEY
  let from = process.env.NOTIFY_FROM_EMAIL || "Nodly <onboarding@resend.dev>"
  if (!key) return { ok: false, error: "RESEND_API_KEY is not configured" }
  if (opts.fromName) {
    const address = from.match(/<([^>]+)>/)?.[1] ?? from.trim()
    from = `${opts.fromName.replace(/[<>"\r\n]/g, "")} <${address}>`
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ from, to, subject, html, ...(opts.replyTo ? { reply_to: opts.replyTo } : {}) }),
    })
    return res.ok ? { ok: true } : { ok: false, error: `Resend ${res.status}: ${await res.text()}` }
  } catch (e) {
    return { ok: false, error: `Resend: ${(e as Error).message}` }
  }
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

type Lang = "en" | "ru"

const TEXT = {
  en: {
    comment: (who: string, order: string) => `💬 ${who} left a comment on “${order}”`,
    approved: (order: string) => `✅ The client approved “${order}”`,
    approvedMany: (who: string, n: number, project: string) => `✅ ${who || "The client"} approved ${n} posts in “${project}”`,
    changes: (order: string) => `✏️ The client requested changes on “${order}”`,
    request: (who: string) => `📩 New request from ${who}`,
    booking: (who: string, what: string, when: string) => `📅 ${who} booked “${what}” for ${when}`,
    order: (who: string, what: string, when: string) => `🎂 New order from ${who}: “${what}” for ${when}`,
    openRequests: "Open requests",
    openBookings: "Open the calendar",
    open: "Open",
    page: (n: number) => `page ${n}`,
    footer: "You get this because notifications are on in Nodly → Notifications.",
  },
  ru: {
    comment: (who: string, order: string) => `💬 ${who} оставил(а) комментарий к «${order}»`,
    approved: (order: string) => `✅ Клиент утвердил «${order}»`,
    approvedMany: (who: string, n: number, project: string) => `✅ ${who || "Клиент"} утвердил(а) ${n} ${ruPosts(n)} в «${project}»`,
    changes: (order: string) => `✏️ Клиент попросил правки по «${order}»`,
    request: (who: string) => `📩 Новая заявка от ${who}`,
    booking: (who: string, what: string, when: string) => `📅 ${who} записал(ась) на «${what}» — ${when}`,
    order: (who: string, what: string, when: string) => `🎂 Новый заказ от ${who}: «${what}» к ${when}`,
    openRequests: "Открыть заявки",
    openBookings: "Открыть календарь",
    open: "Открыть",
    page: (n: number) => `стр. ${n}`,
    footer: "Вы получили это письмо, потому что уведомления включены в Nodly → Уведомления.",
  },
}

/** "пост", "поста", "постов" for a count. */
function ruPosts(n: number) {
  const d = n % 10, h = n % 100
  if (d === 1 && h !== 11) return "пост"
  if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return "поста"
  return "постов"
}

export type NotifyEvent =
  | { kind: "comment"; orderTitle: string; author: string; title: string; description: string | null; page: number }
  | { kind: "approved" | "changes"; orderTitle: string }
  /** Several posts of one project approved together ("Approve all" in the content plan). */
  | { kind: "approvedMany"; orderTitle: string; count: number; by: string }
  | { kind: "request"; name: string; contact: string; message: string }
  /** A client booked on the public page: an appointment or an order. `when` is already written out. */
  | { kind: "booking"; order: boolean; name: string; phone: string; what: string; when: string; note: string }

/** Builds the Telegram text and the email subject/body for an event. */
function renderEvent(event: NotifyEvent, lang: Lang, orderUrl: string) {
  const L = TEXT[lang]
  const order = event.kind === "request" || event.kind === "booking" ? "" : escapeHtml(event.orderTitle)
  const headline =
    event.kind === "request" ? L.request(escapeHtml(event.name))
    : event.kind === "booking" ? (event.order ? L.order : L.booking)(escapeHtml(event.name), escapeHtml(event.what), escapeHtml(event.when))
    : event.kind === "comment" ? L.comment(escapeHtml(event.author), order)
    : event.kind === "approved" ? L.approved(order)
    : event.kind === "approvedMany" ? L.approvedMany(escapeHtml(event.by), event.count, order)
    : L.changes(order)
  const details = event.kind === "comment"
    ? `<b>${escapeHtml(event.title)}</b>${event.description ? `\n${escapeHtml(event.description)}` : ""}\n<i>${L.page(event.page)}</i>`
    : event.kind === "request"
      ? `<b>${escapeHtml(event.contact)}</b>${event.message ? `\n${escapeHtml(event.message.slice(0, 600))}` : ""}`
      : event.kind === "booking"
        ? `<b>${escapeHtml(event.phone)}</b>${event.note ? `\n${escapeHtml(event.note.slice(0, 600))}` : ""}`
        : ""
  const linkLabel = event.kind === "request" ? L.openRequests : event.kind === "booking" ? L.openBookings : L.open
  const telegram = [headline, details, `<a href="${orderUrl}">${linkLabel}</a>`].filter(Boolean).join("\n\n")
  const subject = headline.replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
  const html = `<div style="font-family:Inter,Arial,sans-serif;font-size:15px;line-height:1.5;color:#1f1e1d">
<p style="margin:0 0 12px">${headline}</p>
${details ? `<p style="margin:0 0 16px;padding:12px 14px;background:#f6f5f3;border-radius:10px">${details.replace(/\n/g, "<br>")}</p>` : ""}
<p style="margin:0 0 24px"><a href="${orderUrl}" style="display:inline-block;background:#1f1e1d;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px">${linkLabel}</a></p>
<p style="margin:0;font-size:12px;color:#8a8987">${L.footer}</p>
</div>`
  return { telegram, subject, html }
}

/** Sends an event to every channel the shop has enabled. Returns per-channel results. */
export async function notifyShop(shop: NotifyShop, event: NotifyEvent, orderUrl: string) {
  const lang: Lang = shop.notify_lang === "ru" ? "ru" : "en"
  const msg = renderEvent(event, lang, orderUrl)
  const results: Record<string, unknown> = {}

  if (shop.notify_telegram !== false && shop.telegram_chat_id) {
    results.telegram = await sendTelegram(shop.telegram_chat_id, msg.telegram)
  }
  if (FEATURES.email && shop.notify_email !== false) {
    try {
      const { data, error } = await adminClient().auth.admin.getUserById(shop.user_id)
      const email = data.user?.email
      results.email = email
        ? await sendEmail(email, msg.subject, msg.html)
        : { ok: false, error: error?.message || "owner has no email" }
    } catch (e) {
      results.email = { ok: false, error: (e as Error).message }
    }
  }
  return results
}

const REMINDER = {
  en: {
    subject: (order: string) => `Reminder: “${order}” is waiting for your review`,
    body: (shop: string, order: string, name: string) =>
      `${name ? `Hi ${name},` : "Hi,"}<br><br>${shop} is waiting for your feedback on “${order}”. Open it, leave comments right on the picture, or approve it in one click.`,
    open: "Review it",
    footer: (shop: string) => `Sent by Nodly on behalf of ${shop}. Reply to this email to reach them.`,
  },
  ru: {
    subject: (order: string) => `Напоминание: «${order}» ждёт вашего ответа`,
    body: (shop: string, order: string, name: string) =>
      `${name ? `Здравствуйте, ${name}!` : "Здравствуйте!"}<br><br>${shop} ждёт вашего ответа по «${order}». Откройте, оставьте комментарии прямо на картинке или утвердите одной кнопкой.`,
    open: "Посмотреть",
    footer: (shop: string) => `Письмо отправлено через Nodly от имени «${shop}». Чтобы связаться с ними, просто ответьте на него.`,
  },
}

const PLAN_REMINDER = {
  en: {
    subject: (n: number, project: string) => `Reminder: ${n} posts in “${project}” are waiting for you`,
    body: (shop: string, n: number, project: string, name: string) =>
      `${name ? `Hi ${name},` : "Hi,"}<br><br>${shop} is waiting for your decision on ${n} posts in “${project}”. Open the content plan, leave comments right on the pictures, or approve them all in one click.`,
    open: "Open the content plan",
  },
  ru: {
    subject: (n: number, project: string) => `Напоминание: ${n} ${ruPosts(n)} в «${project}» ждут вашего решения`,
    body: (shop: string, n: number, project: string, name: string) =>
      `${name ? `Здравствуйте, ${name}!` : "Здравствуйте!"}<br><br>${shop} ждёт вашего решения: ${n} ${ruPosts(n)} в «${project}». Откройте контент-план, оставьте комментарии прямо на картинках или утвердите всё одной кнопкой.`,
    open: "Открыть контент-план",
  },
}

/** Email to a client whose content plan has posts waiting for a decision. */
export function renderPlanReminder(lang: Lang, shopName: string, projectTitle: string, clientName: string, count: number, planUrl: string) {
  const L = PLAN_REMINDER[lang]
  const shop = escapeHtml(shopName)
  const project = escapeHtml(projectTitle)
  const html = `<div style="font-family:Inter,Arial,sans-serif;font-size:15px;line-height:1.5;color:#1f1e1d">
<p style="margin:0 0 20px">${L.body(shop, count, project, escapeHtml(clientName))}</p>
<p style="margin:0 0 24px"><a href="${planUrl}" style="display:inline-block;background:#1f1e1d;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px">${L.open}</a></p>
<p style="margin:0;font-size:12px;color:#8a8987">${REMINDER[lang].footer(shop)}</p>
</div>`
  return { subject: L.subject(count, projectTitle), html }
}

/** Email to a client who hasn't reviewed a design yet. */
export function renderReminder(lang: Lang, shopName: string, orderTitle: string, clientName: string, portalUrl: string) {
  const L = REMINDER[lang]
  const shop = escapeHtml(shopName)
  const order = escapeHtml(orderTitle)
  const html = `<div style="font-family:Inter,Arial,sans-serif;font-size:15px;line-height:1.5;color:#1f1e1d">
<p style="margin:0 0 20px">${L.body(shop, order, escapeHtml(clientName))}</p>
<p style="margin:0 0 24px"><a href="${portalUrl}" style="display:inline-block;background:#1f1e1d;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px">${L.open}</a></p>
<p style="margin:0;font-size:12px;color:#8a8987">${L.footer(shop)}</p>
</div>`
  return { subject: L.subject(orderTitle), html }
}
