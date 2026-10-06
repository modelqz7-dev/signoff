import { adminClient } from "@/lib/server/notify"
import { normalizeSlug, slugProblem } from "@/lib/page"

/** Is this page address free? The page table is private, so the editor asks here. */
export async function GET(request: Request) {
  const slug = normalizeSlug(new URL(request.url).searchParams.get("slug") ?? "")
  const problem = slugProblem(slug)
  if (problem) return Response.json({ slug, available: false, problem })
  const { data, error } = await adminClient().from("shop_pages").select("shop_id").eq("slug", slug).maybeSingle()
  if (error) return Response.json({ slug, available: false, problem: "unavailable" }, { status: 503 })
  return Response.json({ slug, available: !data })
}
