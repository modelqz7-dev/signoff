export { cn } from "cn"

/** True for links to PDF files, including uppercase extensions and signed URLs with a query. */
export function isPdfUrl(url: string | null | undefined) {
  return !!url && /\.pdf($|[?#])/i.test(url)
}
