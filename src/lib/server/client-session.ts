import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"
import { adminClient } from "@/lib/server/notify"

// A client's sign-in (Telegram, through the Nodly bot) lives in a signed cookie: the account
// id and an expiry, with an HMAC made from a server-only key. Nothing else is stored in it.

export const CLIENT_COOKIE = "nodly_client"
const DAYS = 90

export type ClientAccount = { id: string; tg_id: number; name: string; username: string; chat_id: string | null }

function key() {
  const base = process.env.CLIENT_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  return createHmac("sha256", "nodly-client-session").update(base).digest()
}
const sign = (payload: string) => createHmac("sha256", key()).update(payload).digest("base64url")

export function sessionCookie(accountId: string) {
  const exp = Date.now() + DAYS * 864e5
  const payload = `${accountId}.${exp}`
  return `${CLIENT_COOKIE}=${payload}.${sign(payload)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${DAYS * 86400}`
}
export const clearCookie = () => `${CLIENT_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`

/** The account id from a valid, unexpired cookie. */
export function sessionId(request: Request) {
  const raw = (request.headers.get("cookie") ?? "").split(/;\s*/).find((c) => c.startsWith(`${CLIENT_COOKIE}=`))?.slice(CLIENT_COOKIE.length + 1)
  if (!raw) return null
  const [id, exp, sig] = raw.split(".")
  if (!id || !exp || !sig || Number(exp) < Date.now()) return null
  const want = Buffer.from(sign(`${id}.${exp}`)), got = Buffer.from(sig)
  return want.length === got.length && timingSafeEqual(want, got) ? id : null
}

/** The signed-in client, or null (also when the clients tables aren't set up yet). */
export async function sessionAccount(request: Request): Promise<ClientAccount | null> {
  const id = sessionId(request)
  if (!id) return null
  const { data } = await adminClient().from("client_accounts").select("id, tg_id, name, username, chat_id").eq("id", id).maybeSingle()
  return (data as ClientAccount | null) ?? null
}

export const newLoginToken = () => randomBytes(18).toString("base64url")
