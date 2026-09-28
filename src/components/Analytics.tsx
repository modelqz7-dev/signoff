"use client"

import { Analytics as VercelAnalytics, type BeforeSendEvent } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

const ID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi

/** Order and portal ids are private: count visits per page type, not per order. */
function redact<T extends { url: string }>(event: T): T {
  return { ...event, url: event.url.replace(ID, "[id]") }
}

/** Vercel Web Analytics and Speed Insights (enable both in the Vercel project; free tier is enough). */
export function Analytics() {
  return (
    <>
      <VercelAnalytics beforeSend={(event: BeforeSendEvent) => redact(event)} />
      <SpeedInsights beforeSend={(event) => redact(event)} />
    </>
  )
}
