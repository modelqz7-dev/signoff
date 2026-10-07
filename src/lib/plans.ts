import type { Order, Shop } from "@/components/dashboard/types"

export type PlanId = "free" | "go" | "pro"

/** Paid features, checked with `can(shop, feature)`. */
export type Feature = "versions" | "certificate" | "branding" | "reminders" | "brandKit"

export type Plan = {
  id: PlanId
  name: string
  /** Monthly price in USD; yearly billing is 20% off. */
  monthly: number
  /** Active orders at once (awaiting review or changes requested); null = unlimited. */
  activeOrders: number | null
  features: Feature[]
  /** Selling points shown on the plan card, in English (translated with t()). */
  highlights: string[]
}

export const YEARLY_DISCOUNT = 0.2
export const TRIAL_DAYS = 7

// Not charged yet: plans can be switched freely in Billing during early access.
export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Start",
    monthly: 0,
    activeOrders: 3,
    features: [],
    highlights: [
      "Up to 3 active orders",
      "Client portal with pinned comments",
      "Telegram and email notifications",
      "Nodly logo in the portal header",
    ],
  },
  {
    id: "go",
    name: "Pro",
    monthly: 19,
    activeOrders: 25,
    features: ["versions", "certificate", "branding", "reminders"],
    highlights: [
      "Up to 25 active orders",
      "Version history with comments per version",
      "Approval certificate (PDF)",
      "Your logo in the portal instead of Nodly's",
      "Automatic reminders to clients",
    ],
  },
  {
    id: "pro",
    name: "Studio",
    monthly: 39,
    activeOrders: null,
    features: ["versions", "certificate", "branding", "reminders", "brandKit"],
    highlights: [
      "Unlimited active orders",
      "Everything in Pro",
      "Your welcome message and contacts in the portal",
      "Priority support",
    ],
  },
]

export function planById(id: string | null | undefined): Plan {
  return PLANS.find((p) => p.id === id?.toLowerCase()) ?? PLANS[0]
}

type PlanShop = Pick<Shop, "plan" | "trial_ends_at"> | null | undefined

/** Days of the free Pro trial left (0 when there is none or it is over). */
export function trialDaysLeft(shop: PlanShop, now = Date.now()) {
  if (!shop?.trial_ends_at) return 0
  const ms = new Date(shop.trial_ends_at).getTime() - now
  return ms > 0 ? Math.ceil(ms / 86_400_000) : 0
}

/** The plan whose limits apply right now: Pro while a trial runs on the Free plan. */
export function effectivePlan(shop: PlanShop, now = Date.now()): Plan {
  const chosen = planById(shop?.plan)
  if (chosen.id === "free" && trialDaysLeft(shop, now) > 0) return planById("pro")
  return chosen
}

export function can(shop: PlanShop, feature: Feature) {
  return effectivePlan(shop).features.includes(feature)
}

/** The cheapest plan that includes a feature, for "Available on Go" hints. */
export function planFor(feature: Feature) {
  return PLANS.find((p) => p.features.includes(feature)) ?? PLANS[PLANS.length - 1]
}

/** Orders that count towards the plan limit: waiting on the client or on the shop. */
export function isActiveOrder(order: Pick<Order, "status">) {
  return order.status === "await" || order.status === "changes"
}

export function formatPrice(plan: Plan, yearly: boolean) {
  if (!plan.monthly) return "$0"
  const perMonth = yearly ? plan.monthly * (1 - YEARLY_DISCOUNT) : plan.monthly
  return `$${Number.isInteger(perMonth) ? perMonth : perMonth.toFixed(2)}`
}

/** Error text raised by the order-limit trigger in supabase/plans.sql. */
export function isPlanLimitError(error: { message?: string } | null | undefined) {
  return !!error?.message?.includes("plan_limit")
}
