"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { STATUS_MAP, type OrderStatus, type Shop } from "@/components/dashboard/types"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

export type PanelId =
  | "profile" | "billing" | "notifications" | "security" | "appearance"
  | "help" | "contact" | "docs" | "status"

/** Dispatch `new CustomEvent(OPEN_PANEL_EVENT, { detail: "profile" })` to open a panel from anywhere. */
export const OPEN_PANEL_EVENT = "signoff:open-panel"

export function openPanel(panel: PanelId) {
  window.dispatchEvent(new CustomEvent(OPEN_PANEL_EVENT, { detail: panel }))
}

// Where clients and shops can reach you. Leave a field empty to hide it.
const SUPPORT = {
  email: "",
  telegram: "",
}

const TITLES: Record<PanelId, { title: string; description: string }> = {
  profile: { title: "Profile", description: "Your workshop and account." },
  billing: { title: "Billing", description: "Your plan and payments." },
  notifications: { title: "Notifications", description: "How you hear about client activity." },
  security: { title: "Security", description: "Your password and client access." },
  appearance: { title: "Appearance", description: "How Signoff looks." },
  help: { title: "Help Center", description: "Getting an order approved, step by step." },
  contact: { title: "Contact Us", description: "Questions, bugs or ideas." },
  docs: { title: "Documentation", description: "Statuses, comments and shortcuts." },
  status: { title: "Status", description: "Live check of the services Signoff depends on." },
}

export function SidebarPanel({ panel, onClose }: { panel: PanelId | null; onClose: () => void }) {
  // Keep the last panel rendered while the dialog animates out.
  const [shown, setShown] = useState<PanelId | null>(panel)
  if (panel && panel !== shown) setShown(panel)
  const meta = shown ? TITLES[shown] : null

  return (
    <Dialog isOpen={!!panel} onOpenChange={(v) => !v && onClose()} className="sm:max-w-md">
      {meta && (
        <DialogHeader>
          <DialogTitle>{meta.title}</DialogTitle>
          <DialogDescription>{meta.description}</DialogDescription>
        </DialogHeader>
      )}
      {shown === "profile" && <ProfilePanel />}
      {shown === "billing" && <BillingPanel />}
      {shown === "notifications" && <NotificationsPanel />}
      {shown === "security" && <SecurityPanel />}
      {shown === "appearance" && <AppearancePanel />}
      {shown === "help" && <HelpPanel />}
      {shown === "contact" && <ContactPanel />}
      {shown === "docs" && <DocsPanel />}
      {shown === "status" && <StatusPanel />}
    </Dialog>
  )
}

// ── Shared bits ──────────────────────────────────────────

function useAccount() {
  const [email, setEmail] = useState("")
  const [shop, setShop] = useState<Shop | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user || cancelled) { setLoading(false); return }
      setEmail(session.user.email || "")
      const { data } = await supabase.from("shops").select("*").eq("user_id", session.user.id).maybeSingle()
      if (!cancelled) {
        setShop((data as Shop) || null)
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return { email, shop, setShop, loading }
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right text-foreground">{children}</span>
    </div>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">{children}</p>
}

function Message({ status }: { status: { ok: boolean; text: string } | null }) {
  if (!status) return null
  return <p className={cn("text-xs", status.ok ? "text-muted-foreground" : "text-destructive")}>{status.text}</p>
}

// ── Panels ───────────────────────────────────────────────

function ProfilePanel() {
  const router = useRouter()
  const { email, shop, setShop, loading } = useAccount()
  const [name, setName] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)
  const value = name ?? shop?.name ?? ""

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!shop || !value.trim()) return
    setSaving(true)
    setStatus(null)
    const { data, error } = await supabase
      .from("shops").update({ name: value.trim() }).eq("id", shop.id).select().maybeSingle()
    if (error || !data) {
      setStatus({ ok: false, text: error?.message || "Couldn't save the name" })
    } else {
      setShop(data as Shop)
      setName(null)
      setStatus({ ok: true, text: "Saved. Reload to see it in the header." })
    }
    setSaving(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.replace("/login")
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={save} className="flex flex-col gap-2">
        <Label htmlFor="panel-shop-name">Workshop name</Label>
        <div className="flex gap-2">
          <Input
            id="panel-shop-name"
            value={value}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            disabled={!shop}
          />
          <Button type="submit" isDisabled={!shop || saving || !value.trim() || value.trim() === shop.name}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
        <Message status={status} />
      </form>
      <div className="divide-y divide-border border-y border-border">
        <Row label="Email">{email || "—"}</Row>
        <Row label="Member since">{shop ? new Date(shop.created_at).toLocaleDateString() : "—"}</Row>
      </div>
      <Button variant="outline" onPress={signOut}>Sign out</Button>
    </div>
  )
}

function BillingPanel() {
  const { shop, loading } = useAccount()
  const plan = shop?.plan ? shop.plan.charAt(0).toUpperCase() + shop.plan.slice(1) : "Free"
  return (
    <div className="flex flex-col gap-3">
      <div className="divide-y divide-border border-y border-border">
        <Row label="Current plan">{loading ? "..." : plan}</Row>
        <Row label="Orders">Unlimited</Row>
        <Row label="Next payment">—</Row>
      </div>
      <Note>Signoff is free during early access. Paid plans will be announced before any charge.</Note>
    </div>
  )
}

function NotificationsPanel() {
  return (
    <div className="flex flex-col gap-3">
      <div className="divide-y divide-border border-y border-border">
        <Row label="Live updates on the order page"><span className="text-chart-4">On</span></Row>
        <Row label="Email notifications"><span className="text-muted-foreground">Coming soon</span></Row>
        <Row label="Telegram notifications"><span className="text-muted-foreground">Coming soon</span></Row>
      </div>
      <Note>
        New client comments, moved pins and status changes appear on the order page instantly, with no
        reload needed.
      </Note>
    </div>
  )
}

function SecurityPanel() {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)

  async function change(e: React.FormEvent) {
    e.preventDefault()
    setStatus(null)
    if (password.length < 8) return setStatus({ ok: false, text: "Use at least 8 characters" })
    if (password !== confirm) return setStatus({ ok: false, text: "Passwords don't match" })
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setStatus({ ok: false, text: error.message })
    else {
      setPassword("")
      setConfirm("")
      setStatus({ ok: true, text: "Password updated" })
    }
    setSaving(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={change} className="flex flex-col gap-2">
        <Label htmlFor="panel-new-password">New password</Label>
        <Input
          id="panel-new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
        />
        <Label htmlFor="panel-confirm-password" className="mt-1">Confirm password</Label>
        <Input
          id="panel-confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirm(e.target.value)}
        />
        <div className="mt-1 flex items-center justify-between gap-3">
          <Message status={status} />
          <Button type="submit" variant="outline" className="ml-auto" isDisabled={saving || !password || !confirm}>
            {saving ? "Updating..." : "Change password"}
          </Button>
        </div>
      </form>
      <Note>
        Client portal links are protected per order: set an access password on each order page before
        sharing the link.
      </Note>
    </div>
  )
}

function AppearancePanel() {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-ring p-3">
          <div className="mb-2 h-12 rounded-md bg-background ring-1 ring-border" />
          <p className="font-medium">Dark</p>
          <p className="text-xs text-muted-foreground">Active</p>
        </div>
        <div className="rounded-lg border border-border p-3 opacity-50">
          <div className="mb-2 h-12 rounded-md bg-white" />
          <p className="font-medium">Light</p>
          <p className="text-xs text-muted-foreground">Coming soon</p>
        </div>
      </div>
      <Note>The client portal uses the same dark theme, so drawings and photos keep good contrast.</Note>
    </div>
  )
}

function HelpPanel() {
  const steps = [
    ["Create an order", "Orders → New Order. Add the client and deadline."],
    ["Upload the file", "Attach the PDF or image on the order page."],
    ["Share the portal", "Set an access password and copy the portal link to the client."],
    ["Collect comments", "The client clicks on the file to pin comments; you see them live."],
    ["Get approval", "The client presses Approve or Request Changes; the status updates instantly."],
  ]
  return (
    <ol className="flex flex-col gap-3">
      {steps.map(([title, text], i) => (
        <li key={title} className="flex gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-medium text-accent-foreground">
            {i + 1}
          </span>
          <div>
            <p className="font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">{text}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

function ContactPanel() {
  const hasContacts = SUPPORT.email || SUPPORT.telegram
  return (
    <div className="flex flex-col gap-3">
      {hasContacts ? (
        <div className="divide-y divide-border border-y border-border">
          {SUPPORT.email && (
            <Row label="Email">
              <a href={`mailto:${SUPPORT.email}`} className="text-accent hover:underline">{SUPPORT.email}</a>
            </Row>
          )}
          {SUPPORT.telegram && (
            <Row label="Telegram">
              <a
                href={`https://t.me/${SUPPORT.telegram.replace(/^@/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                {SUPPORT.telegram}
              </a>
            </Row>
          )}
        </div>
      ) : (
        <Note>Contact details will be added here soon.</Note>
      )}
      <p className="text-xs text-muted-foreground">We usually reply within one working day.</p>
    </div>
  )
}

function DocsPanel() {
  const statusHelp: Record<OrderStatus, string> = {
    await: "Waiting for the client to review.",
    changes: "The client asked for changes.",
    approved: "The client approved the design.",
    prod: "In production.",
  }
  const shortcuts = [
    ["← →", "Previous / next page"],
    ["+ −", "Zoom in / out"],
    ["0", "Fit page"],
    ["Esc", "Close the viewer"],
  ]
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">Order statuses</p>
        {(Object.keys(STATUS_MAP) as OrderStatus[]).map((key) => (
          <div key={key} className="flex items-center gap-3">
            <span
              className="w-24 shrink-0 rounded-md px-2 py-0.5 text-center text-xs"
              style={{ backgroundColor: STATUS_MAP[key].bg, color: STATUS_MAP[key].color }}
            >
              {STATUS_MAP[key].label}
            </span>
            <span className="text-xs text-muted-foreground">{statusHelp[key]}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium text-muted-foreground">Comments</p>
        <p className="text-xs text-muted-foreground">
          Clients click anywhere on a page to pin a comment, and can drag or delete their own pins. Pins keep
          their exact spot at any zoom. You can resolve them from the order page.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">File viewer shortcuts</p>
        {shortcuts.map(([keys, action]) => (
          <div key={keys} className="flex items-center gap-3 text-xs">
            <kbd className="w-12 shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-center font-mono">{keys}</kbd>
            <span className="text-muted-foreground">{action}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

type Check = { name: string; state: "checking" | "ok" | "down"; detail?: string }

function StatusPanel() {
  const [checks, setChecks] = useState<Check[]>([
    { name: "Database", state: "checking" },
    { name: "Authentication", state: "checking" },
    { name: "Live updates", state: "checking" },
  ])

  useEffect(() => {
    let cancelled = false
    const update = (name: string, state: Check["state"], detail?: string) => {
      if (!cancelled) setChecks((prev) => prev.map((c) => (c.name === name ? { name, state, detail } : c)))
    }

    const t0 = performance.now()
    supabase.from("shops").select("id", { head: true, count: "exact" }).then(({ error }) => {
      update("Database", error ? "down" : "ok", error ? error.message : `${Math.round(performance.now() - t0)} ms`)
    })

    supabase.auth.getSession().then(({ data, error }) => {
      update("Authentication", error ? "down" : "ok", error ? error.message : data.session ? "Signed in" : "Signed out")
    })

    const channel = supabase.channel(`status-${Date.now()}`)
    const timeout = setTimeout(() => update("Live updates", "down", "No connection"), 8000)
    const t1 = performance.now()
    channel.subscribe((s) => {
      if (s === "SUBSCRIBED") {
        clearTimeout(timeout)
        update("Live updates", "ok", `${Math.round(performance.now() - t1)} ms`)
      } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") {
        clearTimeout(timeout)
        update("Live updates", "down", "No connection")
      }
    })

    return () => {
      cancelled = true
      clearTimeout(timeout)
      supabase.removeChannel(channel)
    }
  }, [])

  const allOk = checks.every((c) => c.state === "ok")
  const anyDown = checks.some((c) => c.state === "down")

  return (
    <div className="flex flex-col gap-3">
      <div className="divide-y divide-border border-y border-border">
        {checks.map((c) => (
          <Row key={c.name} label={c.name}>
            <span className="flex items-center justify-end gap-2">
              <span className="text-xs text-muted-foreground">{c.detail}</span>
              <span
                className={cn(
                  "size-2 rounded-full",
                  c.state === "ok" && "bg-chart-4",
                  c.state === "down" && "bg-destructive",
                  c.state === "checking" && "animate-pulse bg-muted-foreground"
                )}
              />
            </span>
          </Row>
        ))}
      </div>
      <Note>
        {allOk ? "All systems operational." : anyDown ? "Some services are unavailable right now." : "Checking..."}
      </Note>
    </div>
  )
}
