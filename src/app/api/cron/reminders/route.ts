import { adminClient, renderPlanReminder, renderReminder, secretMatches, sendEmail } from "@/lib/server/notify"
import { can } from "@/lib/plans"

const DAY = 86_400_000
/** Days a design waits on the client before each reminder. */
const WAIT_DAYS = 3
/** Reminders per review round (reset whenever the status changes). */
const MAX_REMINDERS = 2

/**
 * Daily job (vercel.json → crons): emails clients whose design has been awaiting review for
 * WAIT_DAYS days, on plans with reminders. Posts of a content plan are grouped: one email per plan. Vercel calls it with `Authorization: Bearer <CRON_SECRET>`.
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
    // posts are reminded once per content plan below
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
  const { data: posts, error: postsError } = await db
    .from("orders")
    .select("id, project_id, reminders_sent")
    .eq("status", "await")
    .eq("kind", "post")
    .not("project_id", "is", null)
    .not("file_url", "is", null)
    .lt("reminders_sent", MAX_REMINDERS)
    .lt("status_changed_at", cutoff)
    .or(`last_reminder_at.is.null,last_reminder_at.lt.${cutoff}`)
    .limit(1000)
  if (postsError) {
    console.error("Reminders posts query error:", postsError)
    return Response.json({ error: postsError.message }, { status: 500 })
  }

  const postsByProject = new Map<string, { id: string; reminders_sent: number | null }[]>()
  for (const post of posts ?? []) {
    const list = postsByProject.get(post.project_id) ?? []
    list.push(post)
    postsByProject.set(post.project_id, list)
  }
  const { data: projects } = postsByProject.size
    ? await db
        .from("orders")
        .select("id, title, client_name, client_email, shop_id")
        .in("id", [...postsByProject.keys()])
        .not("client_email", "is", null)
        .neq("client_email", "")
    : { data: [] }

  if (!orders?.length && !projects?.length) return Response.json({ sent: 0 })

  const shopIds = [...new Set([...(orders ?? []), ...(projects ?? [])].map((o) => o.shop_id))]
  const { data: shops } = await db.from("shops").select("*").in("id", shopIds)
  const shopById = new Map((shops ?? []).map((s) => [s.id, s]))
  const site = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
  const ownerEmails = new Map<string, string | undefined>()

  let sent = 0
  const failures: string[] = []
  const now = () => new Date().toISOString()

  /** Sends one reminder from the shop's name; false when the shop's plan has no reminders. */
  async function remind(shopId: string, to: string, id: string, render: (lang: "en" | "ru", shopName: string) => { subject: string; html: string }) {
    const shop = shopById.get(shopId)
    if (!shop || !can(shop, "reminders")) return false
    if (!ownerEmails.has(shop.user_id)) {
      try {
        const { data } = await db.auth.admin.getUserById(shop.user_id)
        ownerEmails.set(shop.user_id, data.user?.email)
      } catch {
        ownerEmails.set(shop.user_id, undefined)
      }
    }
    const msg = render(shop.notify_lang === "ru" ? "ru" : "en", shop.name || "Nodly")
    const result = await sendEmail(to, msg.subject, msg.html, {
      fromName: shop.name ? `${shop.name} via Nodly` : undefined,
      replyTo: ownerEmails.get(shop.user_id),
    })
    if (!result.ok) {
      failures.push(`${id}: ${result.error}`)
      return false
    }
    sent++
    return true
  }

  for (const order of orders ?? []) {
    const ok = await remind(order.shop_id, order.client_email, order.id, (lang, shopName) =>
      renderReminder(lang, shopName, order.title, order.client_name || "", `${site}/portal/${order.id}`))
    if (!ok) continue
    await db
      .from("orders")
      .update({ reminders_sent: (order.reminders_sent ?? 0) + 1, last_reminder_at: now() })
      .eq("id", order.id)
  }

  for (const project of projects ?? []) {
    const due = postsByProject.get(project.id) ?? []
    const ok = await remind(project.shop_id, project.client_email, project.id, (lang, shopName) =>
      renderPlanReminder(lang, shopName, project.title, project.client_name || "", due.length, `${site}/plan/${project.id}`))
    if (!ok) continue
    // each post keeps its own counter (reset on status change), so a plan stops nagging per post
    for (const post of due) {
      await db
        .from("orders")
        .update({ reminders_sent: (post.reminders_sent ?? 0) + 1, last_reminder_at: now() })
        .eq("id", post.id)
    }
  }

  if (failures.length) console.error("Reminder failures:", failures)
  return Response.json({ sent, failed: failures.length })
}
