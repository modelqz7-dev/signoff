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
  // Notification settings (see supabase/notifications.sql)
  notify_email?: boolean
  notify_telegram?: boolean
  telegram_chat_id?: string | null
  telegram_link_code?: string | null
  notify_lang?: string
}

export const STATUS_MAP: Record<
  OrderStatus,
  { label: string; color: string; bg: string }
> = {
  await: {
    label: "Awaiting",
    color: "var(--status-await)",
    bg: "var(--status-await-bg)",
  },
  changes: {
    label: "Changes",
    color: "var(--status-changes)",
    bg: "var(--status-changes-bg)",
  },
  approved: {
    label: "Approved",
    color: "var(--status-approved)",
    bg: "var(--status-approved-bg)",
  },
  prod: {
    label: "Production",
    color: "var(--status-prod)",
    bg: "var(--status-prod-bg)",
  },
}
