import { secretMatches, webhookSecret } from "@/lib/server/notify"

/**
 * One-time setup: open /api/telegram/setup?secret=<NOTIFY_WEBHOOK_SECRET> on the deployed
 * site to point the Telegram bot at /api/telegram/webhook.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const secret = webhookSecret()
  if (!secret) {
    return Response.json({ error: "NOTIFY_WEBHOOK_SECRET is not configured on this deployment (redeploy after adding it)" }, { status: 500 })
  }
  if (!/^[A-Za-z0-9_-]{1,256}$/.test(secret)) {
    return Response.json({ error: "NOTIFY_WEBHOOK_SECRET may only contain letters, digits, _ and -" }, { status: 500 })
  }
  if (!secretMatches(url.searchParams.get("secret"), secret)) {
    return Response.json({ error: "unauthorized: the secret in the link does not match NOTIFY_WEBHOOK_SECRET" }, { status: 401 })
  }
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return Response.json({ error: "TELEGRAM_BOT_TOKEN is not configured" }, { status: 500 })

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || url.origin
  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: `${siteUrl}/api/telegram/webhook`,
      secret_token: secret,
      allowed_updates: ["message"],
    }),
  })
  return Response.json(await res.json(), { status: res.ok ? 200 : 502 })
}
