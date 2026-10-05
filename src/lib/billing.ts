// Paddle prices of each paid plan. The IDs are public (Paddle shows them in the checkout), so
// they live in NEXT_PUBLIC_ variables and the client and the webhook read the same ones.
import type { PlanId } from "@/lib/plans"

export type Cycle = "monthly" | "yearly"

/** Tolerates values pasted with spaces, line breaks or quotes around them. */
const clean = (v: string | undefined) => v?.trim().replace(/^["']|["']$/g, "").trim() || undefined

const PRICES: Record<Exclude<PlanId, "free">, Record<Cycle, string | undefined>> = {
  go: {
    monthly: clean(process.env.NEXT_PUBLIC_PADDLE_PRICE_GO_MONTHLY),
    yearly: clean(process.env.NEXT_PUBLIC_PADDLE_PRICE_GO_YEARLY),
  },
  pro: {
    monthly: clean(process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTHLY),
    yearly: clean(process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_YEARLY),
  },
}

/** A Paddle price id looks like "pri_" followed by 26 letters and digits. */
export const isPriceId = (v: string | undefined) => !!v && /^pri_[a-z0-9]{26}$/i.test(v)

/** Paddle is set up: a client token and at least the monthly prices. */
export const PADDLE_ENABLED = !!(
  process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN &&
  PRICES.go.monthly &&
  PRICES.pro.monthly
)

/** The Paddle price for a plan and billing cycle (yearly falls back to monthly if not set). */
export function priceFor(plan: PlanId, cycle: Cycle): string | null {
  if (plan === "free") return null
  return PRICES[plan][cycle] || PRICES[plan].monthly || null
}

/** Which plan a Paddle price belongs to. */
export function planForPrice(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null
  for (const [plan, cycles] of Object.entries(PRICES) as [PlanId, Record<Cycle, string | undefined>][]) {
    if (cycles.monthly === priceId || cycles.yearly === priceId) return plan
  }
  return null
}
