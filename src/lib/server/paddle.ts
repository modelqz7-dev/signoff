// Server-only Paddle helpers: the API (with the secret key) and webhook signature checks.
import { createHmac, timingSafeEqual } from "node:crypto"

const API = process.env.NEXT_PUBLIC_PADDLE_ENV === "sandbox" ? "https://sandbox-api.paddle.com" : "https://api.paddle.com"

/** Calls the Paddle API; returns the parsed body or throws with Paddle's error text. */
export async function paddleApi<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const key = process.env.PADDLE_API_KEY?.trim()
  if (!key) throw new Error("PADDLE_API_KEY is not configured")
  const res = await fetch(API + path, {
    method: init.method ?? "GET",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = (json as { error?: { code?: string; detail?: string } }).error
    throw new PaddleError(res.status, err?.code ?? "unknown", err?.detail ?? "", JSON.stringify(err ?? json))
  }
  return json as T
}

/** An error answer from the Paddle API; `detail` is Paddle's own human-readable reason. */
export class PaddleError extends Error {
  constructor(public status: number, public code: string, public detail: string, raw: string) {
    super(`Paddle ${status}: ${raw}`)
  }
}

/**
 * Checks the Paddle-Signature header ("ts=…;h1=…"): HMAC-SHA256 of "ts:rawBody" with the
 * notification destination's secret. Old deliveries (over 5 minutes) are refused as replays.
 */
export function verifyPaddleSignature(rawBody: string, header: string | null, now = Date.now()) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET?.trim()
  if (!secret || !header) return false
  const parts = Object.fromEntries(header.split(";").map((p) => p.split("=", 2) as [string, string]))
  const ts = Number(parts.ts)
  const given = parts.h1
  if (!ts || !given || Math.abs(now / 1000 - ts) > 300) return false
  const expected = createHmac("sha256", secret).update(`${parts.ts}:${rawBody}`).digest("hex")
  const a = Buffer.from(expected, "hex")
  const b = Buffer.from(given, "hex")
  return a.length === b.length && timingSafeEqual(a, b)
}
