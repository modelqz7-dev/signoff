"use client"

import { useEffect } from "react"
import { reportError } from "@/lib/report-error"

// Replaces the root layout when it fails, so it can't rely on app styles or translations.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => { reportError(error, "global error") }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#1f1e1d", color: "#f5f4f2" }}>
        <title>Nodly — something went wrong</title>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>Something went wrong · Что-то пошло не так</h1>
          <p style={{ fontSize: 14, opacity: 0.7, margin: 0 }}>Please try again or reload the page.</p>
          <button
            onClick={() => retry()}
            style={{ marginTop: 8, padding: "8px 16px", borderRadius: 8, border: "1px solid #444", background: "transparent", color: "inherit", cursor: "pointer" }}
          >
            Try again · Повторить
          </button>
        </div>
      </body>
    </html>
  )
}
