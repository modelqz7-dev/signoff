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
  /** Plain-text password of orders from before hashing; new ones only have password_hash. */
  password?: string | null
  password_hash?: string | null
  notes: string
  deadline: string | null
  file_url: string | null
  created_at: string
  // Versions and approval (see supabase/retention.sql); undefined until that script runs.
  version?: number
  approved_at?: string | null
  approved_by?: string | null
  status_changed_at?: string | null
}

export type OrderVersion = {
  id: string
  order_id: string
  version: number
  file_url: string
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
  // Plans (see supabase/plans.sql)
  trial_ends_at?: string | null
  logo_url?: string | null
  // Brand kit, Pro (see supabase/branding.sql)
  brand_color?: string | null
  portal_theme?: "dark" | "light" | null
  portal_welcome?: string | null
  portal_contacts?: { phone?: string; telegram?: string; instagram?: string; website?: string } | null
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
