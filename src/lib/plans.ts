export type Plan = {
  id: string
  name: string
  price: string
  features: string[]
}

// Placeholder pricing: shown in Billing, not enforced or charged yet.
export const PLANS: Plan[] = [
  { id: "free", name: "Free", price: "$0", features: ["Up to 3 active orders", "Client portal with comments", "PDF and image files"] },
  { id: "go", name: "Go", price: "$9/mo", features: ["Up to 25 active orders", "Everything in Free", "Order history"] },
  { id: "pro", name: "Pro", price: "$19/mo", features: ["Unlimited orders", "Everything in Go", "Priority support"] },
]

export function planById(id: string | null | undefined) {
  return PLANS.find((p) => p.id === id?.toLowerCase()) ?? PLANS[0]
}
