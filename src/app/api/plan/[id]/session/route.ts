import { adminClient } from "@/lib/server/notify"
import {
  checkPassword, clearSessionCookie, clientIp, createSessionCookie, isUuid, recordFailedAttempt, tooManyAttempts,
} from "@/lib/server/portal"

type Params = { params: Promise<{ id: string }> }

/**
 * Enter a project's content plan: checks the name (and the project's password, if it has one),
 * then signs the client in to the plan and to the portal of each of its posts that has no password
 * of its own, so opening a post to comment on it doesn't ask for the name again.
 */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params
  if (!isUuid(id)) return Response.json({ error: "not_found" }, { status: 404 })

  const body = (await request.json().catch(() => ({}))) as { name?: unknown; password?: unknown }
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : ""
  const password = typeof body.password === "string" ? body.password.slice(0, 200) : ""
  if (!name) return Response.json({ error: "name_required" }, { status: 400 })

  const db = adminClient()
  const key = `${clientIp(request)}:${id}`
  if (await tooManyAttempts(db, key)) return Response.json({ error: "too_many_attempts" }, { status: 429 })

  const { data: project } = await db.from("orders").select("*").eq("id", id).eq("kind", "project").maybeSingle()
  if (!project) return Response.json({ error: "not_found" }, { status: 404 })

  if (!checkPassword(project, password).ok) {
    await recordFailedAttempt(db, key)
    return Response.json({ error: "wrong_password" }, { status: 401 })
  }

  const headers = new Headers({ "Cache-Control": "no-store" })
  headers.append("Set-Cookie", createSessionCookie(id, name, project, "plan"))
  const { data: posts } = await db.from("orders").select("id, password, password_hash").eq("project_id", id)
  for (const post of posts ?? []) {
    if (post.password || post.password_hash) continue
    headers.append("Set-Cookie", createSessionCookie(post.id, name, post))
  }
  return Response.json({ ok: true, name }, { headers })
}

/** Leave the plan. */
export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params
  return new Response(null, { status: 204, headers: { "Set-Cookie": clearSessionCookie(id, "plan") } })
}
