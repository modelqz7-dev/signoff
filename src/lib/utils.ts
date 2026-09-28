export { cn } from "cn"

/** True for links to PDF files, including uppercase extensions and signed URLs with a query. */
export function isPdfUrl(url: string | null | undefined) {
  return !!url && /\.pdf($|[?#])/i.test(url)
}

/** "5m ago", "3h ago", "2d ago" relative to `now` (pass it in to keep renders pure). */
export function timeAgo(dateStr: string, now: number) {
  const mins = Math.max(0, Math.floor((now - new Date(dateStr).getTime()) / 60000))
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}
