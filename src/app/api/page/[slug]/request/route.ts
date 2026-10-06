import { randomUUID } from "node:crypto"
import { adminClient, notifyShop, type NotifyShop } from "@/lib/server/notify"
import { clientIp, overLimit } from "@/lib/server/portal"
import { loadPublicPage } from "@/lib/server/page"
import { FILES_BUCKET } from "@/lib/storage-path"

type Params = { params: Promise<{ slug: string }> }

const MAX_FILES = 3
const MAX_FILE_BYTES = 2 * 1024 * 1024
/** Plain photos only (no SVG: it can carry scripts). */
const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/gif"])
const text = (v: FormDataEntryValue | null, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "")

/** A visitor leaves a request on a workshop's page; it lands in the workshop's Requests. */
export async function POST(request: Request, { params }: Params) {
  const page = await loadPublicPage((await params).slug)
  if (!page || !page.data.requests) return Response.json({ error: "not_found" }, { status: 404 })

  const form = await request.formData().catch(() => null)
  if (!form) return Response.json({ error: "invalid" }, { status: 400 })
  // Bots fill in every field, people never see this one.
  if (text(form.get("company"), 100)) return Response.json({ ok: true })

  const name = text(form.get("name"), 80)
  const contact = text(form.get("contact"), 120)
  const message = text(form.get("message"), 2000)
  if (!name || !contact) return Response.json({ error: "invalid" }, { status: 400 })

  const db = adminClient()
  const limited = await overLimit(db, `request:${clientIp(request)}:${page.shopId}`, 5, 10 * 60_000)
  if (limited) return limited

  // Reference photos go to the workshop's private folder, like order files.
  const files: string[] = []
  for (const entry of form.getAll("files").slice(0, MAX_FILES)) {
    if (!(entry instanceof File) || !PHOTO_TYPES.has(entry.type) || entry.size > MAX_FILE_BYTES) continue
    const ext = (entry.name.split(".").pop() || "jpg").replace(/[^a-z0-9]/gi, "").slice(0, 5) || "jpg"
    const path = `${page.shopId}/requests/${randomUUID()}.${ext}`
    const { error } = await db.storage.from(FILES_BUCKET).upload(path, entry, { contentType: entry.type })
    if (error) { console.error("Request file upload error:", error); continue }
    files.push(db.storage.from(FILES_BUCKET).getPublicUrl(path).data.publicUrl)
  }

  const { error } = await db.from("page_requests").insert({ shop_id: page.shopId, name, contact, message, files, status: "new" })
  if (error) {
    console.error("Request save error:", error)
    return Response.json({ error: "failed" }, { status: 500 })
  }

  const { data: shop } = await db.from("shops")
    .select("id, user_id, name, notify_email, notify_telegram, telegram_chat_id, notify_lang")
    .eq("id", page.shopId).maybeSingle()
  if (shop) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
    await notifyShop(shop as NotifyShop, { kind: "request", name, contact, message }, `${siteUrl}/requests`)
      .catch((e) => console.error("Notify error:", e))
  }
  return Response.json({ ok: true })
}
