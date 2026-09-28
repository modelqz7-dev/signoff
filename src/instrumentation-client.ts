import { reportError } from "@/lib/report-error"

// Uncaught errors and rejected promises anywhere in the app go to the server logs.
try {
  window.addEventListener("error", (event) => {
    // Resource loading errors (images etc.) have no error object; skip them.
    if (event.error) reportError(event.error, "window.onerror")
  })
  window.addEventListener("unhandledrejection", (event) => {
    reportError(event.reason, "unhandledrejection")
  })
} catch {}
