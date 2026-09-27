export type OrderStatus = "await" | "changes" | "approved" | "prod"

export type Order = {
  id: string
  shop_id: string
  code: string
  title: string
  client_name: string
  client_contact: string
  client_email: string
  value: number
  stage: string
  status: OrderStatus
  password: string
  notes: string
  deadline: string | null
  file_url: string | null
  created_at: string
}

export type Shop = {
  id: string
  user_id: string
  name: string
  plan: string
  created_at: string
}

export const STATUS_MAP: Record<
  OrderStatus,
  { label: string; color: string; bg: string }
> = {
  await: {
    label: "Awaiting",
    color: "var(--chart-1)",
    bg: "rgba(78,153,163,.1)",
  },
  changes: {
    label: "Changes",
    color: "#c09a5a",
    bg: "rgba(192,154,90,.1)",
  },
  approved: {
    label: "Approved",
    color: "#5a9c6a",
    bg: "rgba(90,156,106,.1)",
  },
  prod: {
    label: "Production",
    color: "var(--muted-foreground)",
    bg: "rgba(214,213,212,.06)",
  },
}
