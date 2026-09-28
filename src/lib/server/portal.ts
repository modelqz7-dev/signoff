// Server-only helpers for the client portal: password hashing, signed sessions and file links.
// The portal never talks to the database directly; everything goes through /api/portal/[id]/*.
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto"
import type { SupabaseClient } from "@supabase/supabase-js"
import { FILES_BUCKET, needsSignedUrl, storageObject } from "@/lib/storage-path"

const SESSION_DAYS = 30
const FILE_LINK_SECONDS = 6 * 60 * 60

// ── Passwords ────────────────────────────────────────────

/** scrypt hash stored as "scrypt$<salt>$<hash>" (base64url). */
export function hashPassword(password: string) {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, 32)
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`
}

function verifyHash(password: string, stored: string) {
  const [scheme, salt, hash] = stored.split("$")
  if (scheme !== "scrypt" || !salt || !hash) return false
  const expected = Buffer.from(hash, "base64url")
  const actual = scryptSync(password, Buffer.from(salt, "base64url"), expected.length)
  return timingSafeEqual(actual, expected)
}

function safeEqual(a: string, b: string) {
  const x = createHash("sha256").update(a).digest()
  const y = createHash("sha256").update(b).digest()
  return timingSafeEqual(x, y)
}

type PasswordFields = { password?: string | null; password_hash?: string | null }

export function hasPassword(order: PasswordFields) {
  return !!(order.password_hash || order.password)
}

/**
 * Checks a portal password. Orders from before hashing keep a plain `password` until the
 * first successful check, which then stores the hash (`upgrade` is set) and clears it.
 */
export function checkPassword(order: PasswordFields, given: string) {
  if (order.password_hash) return { ok: verifyHash(given, order.password_hash), upgrade: false }
  if (order.password) return { ok: safeEqual(given, order.password), upgrade: true }
  return { ok: true, upgrade: false }
}

// ── Sessions ─────────────────────────────────────────────

function secret() {
  const own = process.env.PORTAL_SESSION_SECRET?.trim()
  if (own) return own
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!service) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured")
  return createHash("sha256").update(`nodly-portal:${service}`).digest("hex")
}

/** Changes whenever the order's password changes, which signs everyone out of the portal. */
function passwordFingerprint(order: PasswordFields) {
  return createHash("sha256").update(order.password_hash || order.password || "").digest("base64url").slice(0, 12)
}

type Session = { o: string; n: string; f: string; e: number }

export function sessionCookieName(orderId: string) {
  return `nodly_portal_${orderId.replace(/[^0-9a-f]/gi, "")}`
}

export function createSessionCookie(orderId: string, name: string, order: PasswordFields) {
  const session: Session = { o: orderId, n: name, f: passwordFingerprint(order), e: Date.now() + SESSION_DAYS * 86_400_000 }
  const body = Buffer.from(JSON.stringify(session)).toString("base64url")
  const sig = createHmac("sha256", secret()).update(body).digest("base64url")
  return [
    `${sessionCookieName(orderId)}=${body}.${sig}`,
    `Path=/api/portal/${orderId}`,
    `Max-Age=${SESSION_DAYS * 86_400}`,
    "HttpOnly",
    "SameSite=Lax",
    ...(process.env.NODE_ENV === "production" ? ["Secure"] : []),
  ].join("; ")
}

export function clearSessionCookie(orderId: string) {
  return `${sessionCookieName(orderId)}=; Path=/api/portal/${orderId}; Max-Age=0; HttpOnly; SameSite=Lax`
}

/** The client's name from a valid session cookie for this order, or null. */
export function readSession(request: Request, orderId: string, order: PasswordFields) {
  const cookie = request.headers.get("cookie") ?? ""
  const raw = cookie.split(/;\s*/).find((c) => c.startsWith(`${sessionCookieName(orderId)}=`))?.split("=")[1]
  if (!raw) return null
  const [body, sig] = raw.split(".")
  if (!body || !sig) return null
  const expected = createHmac("sha256", secret()).update(body).digest("base64url")
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  try {
    const s = JSON.parse(Buffer.from(body, "base64url").toString()) as Session
    if (s.o !== orderId || s.e < Date.now() || s.f !== passwordFingerprint(order)) return null
    return s.n
  } catch {
    return null
  }
}

// ── Brute-force protection (best effort, per server instance) ──

const attempts = new Map<string, { count: number; until: number }>()
const WINDOW_MS = 15 * 60_000
const MAX_ATTEMPTS = 10

export function tooManyAttempts(key: string) {
  const a = attempts.get(key)
  return !!a && a.until > Date.now() && a.count >= MAX_ATTEMPTS
}

export function recordFailedAttempt(key: string) {
  const now = Date.now()
  const a = attempts.get(key)
  if (!a || a.until < now) attempts.set(key, { count: 1, until: now + WINDOW_MS })
  else a.count++
  if (attempts.size > 5000) for (const [k, v] of attempts) if (v.until < now) attempts.delete(k)
}

export function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown"
}

// ── Files ────────────────────────────────────────────────

/** A time-limited link for files in the private bucket; other URLs pass through. */
export async function signedFileUrl(db: SupabaseClient, url: string | null | undefined) {
  if (!url) return null
  if (!needsSignedUrl(url)) return url
  const obj = storageObject(url)!
  const { data, error } = await db.storage.from(FILES_BUCKET).createSignedUrl(obj.path, FILE_LINK_SECONDS)
  if (error || !data) {
    console.error("Signed URL error:", error)
    return url
  }
  return data.signedUrl
}

// ── What the portal may see ─────────────────────────────

export const ORDER_PUBLIC_FIELDS = [
  "id", "title", "code", "client_name", "value", "deadline", "notes", "status", "created_at",
  "version", "approved_at", "approved_by",
] as const

export async function publicOrder(db: SupabaseClient, order: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  for (const key of ORDER_PUBLIC_FIELDS) if (key in order) out[key] = order[key]
  out.file_url = await signedFileUrl(db, order.file_url as string | null)
  return out
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(id: string) {
  return UUID.test(id)
}

export type PortalContext = { db: SupabaseClient; order: Record<string, unknown> & PasswordFields; name: string }

/**
 * Loads the order behind a portal request and checks the session cookie.
 * Returns the context, or a ready error Response (404 unknown order, 401 not signed in).
 */
export async function portalContext(
  request: Request,
  orderId: string,
  db: SupabaseClient,
): Promise<PortalContext | Response> {
  if (!isUuid(orderId)) return Response.json({ error: "not_found" }, { status: 404 })
  const { data: order, error } = await db.from("orders").select("*").eq("id", orderId).maybeSingle()
  if (error) {
    console.error("Portal order load error:", error)
    return Response.json({ error: "unavailable" }, { status: 503 })
  }
  if (!order) return Response.json({ error: "not_found" }, { status: 404 })
  const name = readSession(request, orderId, order)
  if (!name) return Response.json({ error: "unauthorized", hasPassword: hasPassword(order) }, { status: 401 })
  return { db, order, name }
}
