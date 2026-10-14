import { adminClient } from "@/lib/server/notify"
import { clientIp, overLimit } from "@/lib/server/portal"
import { newLoginToken, sessionCookie } from "@/lib/server/client-session"

const TEN_MIN = 10 * 60_000

/** Start signing in: a token for the bot link (t.me/<bot>?start=login_<token>). */
export async function POST(request: Request) {
  const bot = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
  if (!bot) return Response.json({ error: "no_bot" }, { status: 503 })
  const db = adminClient()
  const limited = await overLimit(db, `client-login:${clientIp(request)}`, 10, TEN_MIN)
  if (limited) return limited
  const token = newLoginToken()
  const { error } = await db.from("client_logins").insert({ token })
  if (error) { console.error("Client login error:", error); return Response.json({ error: "failed" }, { status: 500 }) }
  return Response.json({ token, url: `https://t.me/${bot}?start=login_${token}` })
}

/** Has the bot confirmed this token yet? Once it has, the cookie is set and the token spent. */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? ""
  if (!/^[\w-]{20,40}$/.test(token)) return Response.json({ error: "invalid" }, { status: 400 })
  const db = adminClient()
  const { data } = await db.from("client_logins").select("account_id, created_at").eq("token", token).maybeSingle()
  if (!data || Date.now() - Date.parse(data.created_at) > TEN_MIN) return Response.json({ error: "expired" }, { status: 410 })
  if (!data.account_id) return Response.json({ pending: true }, { headers: { "cache-control": "no-store" } })
  await db.from("client_logins").delete().eq("token", token)
  return Response.json({ ok: true }, { headers: { "Set-Cookie": sessionCookie(data.account_id), "cache-control": "no-store" } })
}
