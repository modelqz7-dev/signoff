import { adminClient, renderReminder, secretMatches, sendEmail } from "@/lib/server/notify"
import { can } from "@/lib/plans"

const DAY = 86_400_000
/** Days a design waits on the client before each reminder. */
const WAIT_DAYS = 3
/** Reminders per review round (reset whenever the status changes). */
const MAX_REMINDERS = 2

/**
 * Daily job (vercel.json → crons): emails clients whose design has been awaiting review for
 * WAIT_DAYS days, on plans with reminders. Vercel calls it with `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  const auth = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null
  if (!secret || !secretMatches(auth, secret)) {
    return Response.json({ error: secret ? "unauthorized" : "CRON_SECRET is not configured" }, { status: 401 })
  }

  const db = adminClient()
  const cutoff = new Date(Date.now() - WAIT_DAYS * DAY).toISOString()
  const { data: orders, error } = await db
    .from("orders")
    .select("id, title, client_name, client_email, shop_id, last_reminder_at, reminders_sent")
    .eq("status", "await")
    // projects get their own client link in the next step; posts are reminded through it
    .eq("kind", "single")
    .not("client_email", "is", null)
    .neq("client_email", "")
    .lt("reminders_sent", MAX_REMINDERS)
    .lt("status_changed_at", cutoff)
    .or(`last_reminder_at.is.null,last_reminder_at.lt.${cutoff}`)
    .limit(200)
  if (error) {
    console.error("Reminders query error:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }
  if (!orders?.length) return Response.json({ sent: 0 })

  const shopIds = [...new Set(orders.map((o) => o.shop_id))]
  const { data: shops } = await db.from("shops").select("*").in("id", shopIds)
  const shopById = new Map((shops ?? []).map((s) => [s.id, s]))
  const site = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
  const ownerEmails = new Map<string, string | undefined>()

  let sent = 0
  const failures: string[] = []
  for (const order of orders) {
    const shop = shopById.get(order.shop_id)
    if (!shop || !can(shop, "reminders")) continue

    if (!ownerEmails.has(shop.user_id)) {
      try {
        const { data } = await db.auth.admin.getUserById(shop.user_id)
        ownerEmails.set(shop.user_id, data.user?.email)
      } catch {
        ownerEmails.set(shop.user_id, undefined)
      }
    }

    const lang = shop.notify_lang === "ru" ? "ru" : "en"
    const msg = renderReminder(lang, shop.name || "Nodly", order.title, order.client_name || "", `${site}/portal/${order.id}`)
    const result = await sendEmail(order.client_email, msg.subject, msg.html, {
      fromName: shop.name ? `${shop.name} via Nodly` : undefined,
      replyTo: ownerEmails.get(shop.user_id),
    })
    if (!result.ok) {
      failures.push(`${order.id}: ${result.error}`)
      continue
    }
    sent++
    await db
      .from("orders")
      .update({ reminders_sent: (order.reminders_sent ?? 0) + 1, last_reminder_at: new Date().toISOString() })
      .eq("id", order.id)
  }

  if (failures.length) console.error("Reminder failures:", failures)
  return Response.json({ sent, failed: failures.length })
}
