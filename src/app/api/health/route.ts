import { adminClient } from "@/lib/server/notify"

/**
 * Health check for the Status panel and uptime monitors: can the server reach the database,
 * and which notification channels are configured (yes/no only, never values).
 */
export async function GET() {
  const started = Date.now()
  let database: { ok: boolean; ms?: number; error?: string }
  try {
    const { error } = await adminClient().from("shops").select("id", { head: true, count: "exact" }).limit(1)
      .abortSignal(AbortSignal.timeout(5000))
    database = error ? { ok: false, error: error.message } : { ok: true, ms: Date.now() - started }
  } catch (e) {
    database = { ok: false, error: (e as Error).message }
  }

  const has = (name: string) => Boolean(process.env[name]?.trim())
  const body = {
    ok: database.ok,
    database,
    telegram: has("TELEGRAM_BOT_TOKEN") && has("NOTIFY_WEBHOOK_SECRET"),
    email: has("RESEND_API_KEY"),
    reminders: has("CRON_SECRET") && has("RESEND_API_KEY"),
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
  }
  return Response.json(body, { status: database.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } })
}
