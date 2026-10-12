// Online booking: the settings a business keeps in shops.booking and the free times they give.
// Used by the settings screen, the public page and the server that checks and saves a booking.

export type BookingSettings = {
  /** Working days, 0 = Sunday … 6 = Saturday. */
  days: number[]
  /** Opening and closing time, "HH:MM". */
  from: string
  to: string
  /** Minutes between possible start times. */
  step: number
  /** How many days ahead clients can book. */
  ahead: number
  /** Hours' notice needed before an appointment. */
  notice: number
  /** Orders: days needed to make one. */
  lead: number
  /** Orders: at most this many for one day. */
  perDay: number
  /** The business's time zone, e.g. "Europe/Kyiv". */
  tz: string
  /** A few words for clients on the booking page. */
  about: string
}

export const DEFAULT_BOOKING: BookingSettings = {
  days: [1, 2, 3, 4, 5, 6],
  from: "10:00",
  to: "19:00",
  step: 30,
  ahead: 30,
  notice: 2,
  lead: 2,
  perDay: 5,
  tz: "Europe/Kyiv",
  about: "",
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const clamp = (v: unknown, min: number, max: number, fallback: number) => {
  const n = typeof v === "number" && Number.isFinite(v) ? Math.round(v) : fallback
  return Math.min(max, Math.max(min, n))
}

function validZone(tz: unknown) {
  if (typeof tz !== "string" || !tz) return null
  try { new Intl.DateTimeFormat("en", { timeZone: tz }); return tz } catch { return null }
}

/** Known fields within their limits; anything missing takes the default. */
export function cleanBooking(value: unknown): BookingSettings {
  const src = (value && typeof value === "object" ? value : {}) as Record<string, unknown>
  const days = Array.isArray(src.days) ? [...new Set(src.days.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6))].sort() : DEFAULT_BOOKING.days
  const from = typeof src.from === "string" && TIME.test(src.from) ? src.from : DEFAULT_BOOKING.from
  let to = typeof src.to === "string" && TIME.test(src.to) ? src.to : DEFAULT_BOOKING.to
  if (to <= from) to = DEFAULT_BOOKING.to > from ? DEFAULT_BOOKING.to : "23:59"
  return {
    days,
    from,
    to,
    step: [10, 15, 20, 30, 45, 60].includes(src.step as number) ? (src.step as number) : DEFAULT_BOOKING.step,
    ahead: clamp(src.ahead, 1, 120, DEFAULT_BOOKING.ahead),
    notice: clamp(src.notice, 0, 72, DEFAULT_BOOKING.notice),
    lead: clamp(src.lead, 0, 30, DEFAULT_BOOKING.lead),
    perDay: clamp(src.perDay, 1, 100, DEFAULT_BOOKING.perDay),
    tz: validZone(src.tz) ?? DEFAULT_BOOKING.tz,
    about: typeof src.about === "string" ? src.about.trim().slice(0, 500) : "",
  }
}

// ── Time in the business's zone ──────────────────────────

/** Minutes the zone is ahead of UTC at that moment. */
function zoneOffset(at: Date, tz: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(at).map((p) => [p.type, p.value]))
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second)
  return Math.round((asUtc - at.getTime()) / 60_000)
}

/** The moment a wall-clock time on a day happens in the zone. */
export function zonedTime(day: string, time: string, tz: string) {
  const guess = new Date(`${day}T${time}:00Z`)
  const first = new Date(guess.getTime() - zoneOffset(guess, tz) * 60_000)
  // around a clock change the offset differs at the result; settle on it
  return new Date(guess.getTime() - zoneOffset(first, tz) * 60_000)
}

/** "YYYY-MM-DD" of a moment in the zone. */
export function zonedDay(at: Date, tz: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(at)
}

/** "HH:MM" of a moment in the zone. */
export function zonedClock(at: Date, tz: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(at)
}

function addDays(day: string, n: number) {
  const d = new Date(`${day}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function weekday(day: string) {
  return new Date(`${day}T12:00:00Z`).getUTCDay()
}

const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`

/** An appointment that takes up time: [start, end) in ms. */
export type Busy = { start: number; end: number }

/** Free start times for a service, by day, over the days clients may book. */
export function freeSlots(settings: BookingSettings, duration: number, busy: Busy[], now = new Date()) {
  const out: Record<string, string[]> = {}
  const today = zonedDay(now, settings.tz)
  const earliest = now.getTime() + settings.notice * 3_600_000
  const open = minutes(settings.from), close = minutes(settings.to)
  for (let i = 0; i < settings.ahead; i++) {
    const day = addDays(today, i)
    if (!settings.days.includes(weekday(day))) continue
    const times: string[] = []
    for (let m = open; m + duration <= close; m += settings.step) {
      const start = zonedTime(day, hhmm(m), settings.tz).getTime()
      const end = start + duration * 60_000
      if (start < earliest) continue
      if (busy.some((b) => b.start < end && b.end > start)) continue
      times.push(hhmm(m))
    }
    if (times.length) out[day] = times
  }
  return out
}

/** Days an order can be made for: after the lead time, on working days, with room left. */
export function orderDays(settings: BookingSettings, perDayTaken: Record<string, number>, now = new Date()) {
  const today = zonedDay(now, settings.tz)
  const out: string[] = []
  for (let i = settings.lead; i < settings.lead + settings.ahead; i++) {
    const day = addDays(today, i)
    if (!settings.days.includes(weekday(day))) continue
    if ((perDayTaken[day] ?? 0) >= settings.perDay) continue
    out.push(day)
  }
  return out
}

/** Phone numbers compared by their last nine digits ("+380 67 …" and "067…" are the same). */
export function phoneKey(phone: string) {
  return phone.replace(/\D/g, "").slice(-9)
}
