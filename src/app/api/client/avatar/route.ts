import { adminClient } from "@/lib/server/notify"
import { sessionAccount } from "@/lib/server/client-session"
import { ASSETS_BUCKET, FILES_BUCKET } from "@/lib/storage-path"

const TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

/** A client's own photo: a small picture in the public bucket, its link kept on the account. */
export async function POST(request: Request) {
  const me = await sessionAccount(request)
  if (!me) return Response.json({ error: "login" }, { status: 401 })
  const form = await request.formData().catch(() => null)
  const file = form?.get("file")
  if (!(file instanceof File) || !TYPES.has(file.type) || file.size > 3 * 1024 * 1024) return Response.json({ error: "invalid" }, { status: 400 })
  const db = adminClient()
  const path = `clients/${me.id}/avatar-${Date.now()}.${file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"}`
  let url: string | null = null
  for (const bucket of [ASSETS_BUCKET, FILES_BUCKET]) {
    const { error } = await db.storage.from(bucket).upload(path, file, { contentType: file.type })
    if (!error) { url = db.storage.from(bucket).getPublicUrl(path).data.publicUrl; break }
    if (!/bucket not found/i.test(error.message)) { console.error("Client avatar error:", error); break }
  }
  if (!url) return Response.json({ error: "failed" }, { status: 500 })
  await db.from("client_accounts").update({ avatar_url: url }).eq("id", me.id)
  return Response.json({ ok: true, avatar_url: url })
}

/** Remove the photo. */
export async function DELETE(request: Request) {
  const me = await sessionAccount(request)
  if (!me) return Response.json({ error: "login" }, { status: 401 })
  await adminClient().from("client_accounts").update({ avatar_url: null }).eq("id", me.id)
  return Response.json({ ok: true })
}
