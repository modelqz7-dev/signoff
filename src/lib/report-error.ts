// Sends client-side errors to /api/log, where they land in the Vercel function logs.
// Deduplicated and capped per page load so a loop can't flood the logs.

const sent = new Set<string>()
const MAX_PER_PAGE = 10

export function reportError(error: unknown, context?: string) {
  if (typeof window === "undefined") return
  const err = error instanceof Error ? error : new Error(typeof error === "string" ? error : JSON.stringify(error))
  const key = `${context ?? ""}|${err.message}`
  if (sent.has(key) || sent.size >= MAX_PER_PAGE) return
  sent.add(key)

  const body = JSON.stringify({
    message: err.message.slice(0, 500),
    stack: err.stack?.slice(0, 2000),
    digest: (err as Error & { digest?: string }).digest,
    context,
    // Order ids stay out of the logs.
    path: window.location.pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/gi, "[id]"),
    userAgent: navigator.userAgent,
  })
  try {
    if (!navigator.sendBeacon?.("/api/log", new Blob([body], { type: "application/json" }))) {
      fetch("/api/log", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {})
    }
  } catch {}
}
