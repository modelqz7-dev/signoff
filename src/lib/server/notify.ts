// Server-only helpers for Telegram and email notifications. Never import from client code:
// they use the Supabase service-role key and the bot / email API keys.
import { createClient } from "@supabase/supabase-js"

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

export function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

type Lang = "en" | "ru"

const TEXT = {
  en: {
    comment: (who: string, order: string) => `💬 ${who} left a comment on “${order}”`,
    approved: (order: string) => `✅ The client approved “${order}”`,
    changes: (order: string) => `✏️ The client requested changes on “${order}”`,
    request: (who: string) => `📩 New request from ${who}`,
    openRequests: "Open requests",
    open: "Open order",
    page: (n: number) => `page ${n}`,
    footer: "You get this because notifications are on in Nodly → Notifications.",
  },
  ru: {
    comment: (who: string, order: string) => `💬 ${who} оставил(а) комментарий к «${order}»`,
    approved: (order: string) => `✅ Клиент утвердил «${order}»`,
    changes: (order: string) => `✏️ Клиент попросил правки по «${order}»`,
    request: (who: string) => `📩 Новая заявка от ${who}`,
    openRequests: "Открыть заявки",
    open: "Открыть заказ",
    page: (n: number) => `стр. ${n}`,
    footer: "Вы получили это письмо, потому что уведомления включены в Nodly → Уведомления.",
  },
}

export type NotifyEvent =
  | { kind: "comment"; orderTitle: string; author: string; title: string; description: string | null; page: number }
  | { kind: "approved" | "changes"; orderTitle: string }
  | { kind: "request"; name: string; contact: string; message: string }

/** Builds the Telegram text and the email subject/body for an event. */
export function renderEvent(event: NotifyEvent, lang: Lang, orderUrl: string) {
  const L = TEXT[lang]
  const order = event.kind === "request" ? "" : escapeHtml(event.orderTitle)
  const headline =
    event.kind === "request" ? L.request(escapeHtml(event.name))
    : event.kind === "comment" ? L.comment(escapeHtml(event.author), order)
    : event.kind === "approved" ? L.approved(order)
    : L.changes(order)
  const details = event.kind === "comment"
    ? `<b>${escapeHtml(event.title)}</b>${event.description ? `\n${escapeHtml(event.description)}` : ""}\n<i>${L.page(event.page)}</i>`
    : event.kind === "request"
      ? `<b>${escapeHtml(event.contact)}</b>${event.message ? `\n${escapeHtml(event.message.slice(0, 600))}` : ""}`
      : ""
  const linkLabel = event.kind === "request" ? L.openRequests : L.open
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
  if (shop.notify_email !== false) {
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
      `${name ? `Hi ${name},` : "Hi,"}<br><br>${shop} is waiting for your feedback on “${order}”. Open the design, leave comments right on it, or approve it in one click.`,
    open: "Review the design",
    footer: (shop: string) => `Sent by Nodly on behalf of ${shop}. Reply to this email to reach them.`,
  },
  ru: {
    subject: (order: string) => `Напоминание: «${order}» ждёт вашего ответа`,
    body: (shop: string, order: string, name: string) =>
      `${name ? `Здравствуйте, ${name}!` : "Здравствуйте!"}<br><br>${shop} ждёт вашего ответа по «${order}». Откройте макет, оставьте комментарии прямо на нём или утвердите одной кнопкой.`,
    open: "Посмотреть макет",
    footer: (shop: string) => `Письмо отправлено через Nodly от имени «${shop}». Чтобы связаться с ними, просто ответьте на него.`,
  },
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
