export { cn } from "cn"

/** True for links to PDF files, including uppercase extensions and signed URLs with a query. */
export function isPdfUrl(url: string | null | undefined) {
  return !!url && /\.pdf($|[?#])/i.test(url)
}

type Translate = (text: string, vars?: Record<string, string | number>) => string

/** "5m ago", "3h ago", "2d ago" relative to `now` (pass it in to keep renders pure). */
export function timeAgo(dateStr: string, now: number, t: Translate = (s, v) => s.replace("{n}", String(v?.n ?? ""))) {
  const mins = Math.max(0, Math.floor((now - new Date(dateStr).getTime()) / 60000))
  if (mins < 1) return t("just now")
  if (mins < 60) return t("{n}m ago", { n: mins })
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return t("{n}h ago", { n: hrs })
  return t("{n}d ago", { n: Math.floor(hrs / 24) })
}
