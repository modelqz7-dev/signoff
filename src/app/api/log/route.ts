/** Receives client errors (src/lib/report-error.ts) and writes them to the function logs. */
export async function POST(request: Request) {
  try {
    const text = await request.text()
    if (text.length > 8000) return new Response(null, { status: 413 })
    const report = JSON.parse(text) as Record<string, unknown>
    const pick = (key: string, max: number) => (typeof report[key] === "string" ? (report[key] as string).slice(0, max) : undefined)
    console.error("[client error]", JSON.stringify({
      message: pick("message", 500),
      context: pick("context", 100),
      path: pick("path", 200),
      digest: pick("digest", 100),
      userAgent: pick("userAgent", 300),
      stack: pick("stack", 2000),
    }))
  } catch {
    return new Response(null, { status: 400 })
  }
  return new Response(null, { status: 204 })
}
