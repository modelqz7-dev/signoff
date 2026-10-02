"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckIcon } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { STATUS_MAP, type OrderStatus, type Shop } from "@/components/dashboard/types"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { ACTIVITIES, COMING_SOON_ACTIVITIES, updateProfile, uploadAvatar, useProfile } from "@/lib/profile"
import { PLANS, can, effectivePlan, trialDaysLeft } from "@/lib/plans"
import { uploadPublicAsset, useFileUrl } from "@/lib/files"
import { setTheme, useTheme, type Theme } from "@/lib/theme"
import { useT } from "@/lib/i18n"
import { cleanContacts, type PortalContacts } from "@/lib/brand"
import { openPanel, type PanelId } from "@/lib/panels"
import { notifyPlanChanged, usePlanUsage } from "@/lib/use-plan"
import { BillingCycleToggle, PlanPrice, UpgradeChip, UsageMeter } from "@/components/plans/PlanBits"

export { OPEN_PANEL_EVENT, openPanel, type PanelId } from "@/lib/panels"

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
  appearance: { title: "Appearance", description: "How Nodly looks." },
  help: { title: "Help Center", description: "Getting an order approved, step by step." },
  contact: { title: "Contact Us", description: "Questions, bugs or ideas." },
  docs: { title: "Documentation", description: "Statuses, comments and shortcuts." },
  status: { title: "Status", description: "Live check of the services Nodly depends on." },
}

export function SidebarPanel({ panel, onClose }: { panel: PanelId | null; onClose: () => void }) {
  // Keep the last panel rendered while the dialog animates out.
  const [shown, setShown] = useState<PanelId | null>(panel)
  if (panel && panel !== shown) setShown(panel)
  const meta = shown ? TITLES[shown] : null
  const { t } = useT()

  return (
    <Dialog isOpen={!!panel} onOpenChange={(v) => !v && onClose()} className="sm:max-w-md">
      {meta && (
        <DialogHeader>
          <DialogTitle>{t(meta.title)}</DialogTitle>
          <DialogDescription>{t(meta.description)}</DialogDescription>
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
  const profile = useProfile()
  const avatarSrc = useFileUrl(profile?.avatarUrl) || ""
  const fileRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState<string | null>(null)
  const [soonFor, setSoonFor] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)
  const value = name ?? shop?.name ?? ""
  const plan = effectivePlan(shop)
  const trialDays = trialDaysLeft(shop)
  const { t, locale } = useT()
  const initials = (shop?.name || email).split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)

  async function run(task: () => Promise<void>, okText?: string) {
    setStatus(null)
    try {
      await task()
      if (okText) setStatus({ ok: true, text: okText })
    } catch (e) {
      setStatus({ ok: false, text: (e as Error)?.message || t("Something went wrong") })
    }
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault()
    if (!shop || !value.trim()) return
    setSaving(true)
    await run(async () => {
      const { data, error } = await supabase
        .from("shops").update({ name: value.trim() }).eq("id", shop.id).select().maybeSingle()
      if (error || !data) throw error ?? new Error(t("Couldn't save the name"))
      setShop(data as Shop)
      setName(null)
    }, t("Saved. Reload to see it in the header."))
    setSaving(false)
  }

  async function onAvatarPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || !shop) return
    setUploading(true)
    await run(() => uploadAvatar(file, shop.id))
    setUploading(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.replace("/login")
  }

  if (loading || !profile) return <p className="text-muted-foreground">{t("Loading...")}</p>

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Avatar className="size-14">
          <AvatarImage src={avatarSrc} alt="" />
          <AvatarFallback className="text-sm">{initials || "S"}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{shop?.name || t("Your workshop")}</p>
          <p className="truncate text-xs text-muted-foreground">{profile.activity ? t(profile.activity) : t("Add your activity below")}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button size="sm" variant="outline" onPress={() => fileRef.current?.click()} isDisabled={!shop || uploading}>
            {uploading ? t("Uploading...") : t("Change photo")}
          </Button>
          {profile.avatarUrl && (
            <button
              type="button"
              className="text-[11px] text-muted-foreground hover:text-foreground"
              onClick={() => run(() => updateProfile({ avatar_url: "" }))}
            >
              {t("Remove")}
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onAvatarPicked} />
      </div>

      <form onSubmit={saveName} className="flex flex-col gap-2">
        <Label htmlFor="panel-shop-name">{t("Workshop name")}</Label>
        <div className="flex gap-2">
          <Input
            id="panel-shop-name"
            value={value}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            disabled={!shop}
          />
          <Button type="submit" isDisabled={!shop || saving || !value.trim() || value.trim() === shop.name}>
            {saving ? t("Saving...") : t("Save")}
          </Button>
        </div>
      </form>

      <div className="flex flex-col gap-2">
        <Label>{t("What do you do?")}</Label>
        <div className="flex flex-wrap gap-1.5">
          {[...ACTIVITIES, ...COMING_SOON_ACTIVITIES].map((a) => {
            const active = profile.activity === a
            const soon = (COMING_SOON_ACTIVITIES as readonly string[]).includes(a)
            return (
              <button
                key={a}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  // Still saved, so we know which trade to tailor Nodly to next.
                  run(() => updateProfile({ activity: active ? "" : a }))
                  if (soon && !active) setSoonFor(a)
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                  active
                    ? "border-accent bg-accent/15 text-foreground"
                    : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {t(a)}
                {soon && <span className="rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">{t("Soon")}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Picking a trade Nodly isn't tailored to yet */}
      <Dialog isOpen={!!soonFor} onOpenChange={(v) => !v && setSoonFor(null)} className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("Coming soon")}</DialogTitle>
          <DialogDescription>
            {t("Nodly is built for furniture makers and kitchen studios right now. A version for “{activity}” is on the way: we'll tailor the words, order stages and examples to your work.", { activity: soonFor ? t(soonFor) : "" })}
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{t("Until then, everything works for you as it is: upload a design, send the link, get comments and approval.")}</p>
        <Button onPress={() => setSoonFor(null)}>{t("Got it")}</Button>
      </Dialog>

      <PortalLogo shop={shop} onSaved={setShop} />

      <BrandKit shop={shop} onSaved={setShop} />

      <Message status={status} />

      <div className="divide-y divide-border border-y border-border">
        <Row label={t("Email")}>{email || "—"}</Row>
        <Row label={t("Plan")}>
          <span className="flex items-center justify-end gap-2">
            {trialDays > 0 ? t("{plan} trial", { plan: t(plan.name) }) : t(plan.name)}
            <button type="button" className="text-xs text-accent hover:underline" onClick={() => openPanel("billing")}>
              {t("Change")}
            </button>
          </span>
        </Row>
        <Row label={t("Language")}>
          <span className="flex justify-end"><LanguageSwitcher /></span>
        </Row>
        <Row label={t("Member since")}>{shop ? new Date(shop.created_at).toLocaleDateString(locale) : "—"}</Row>
      </div>
      <Button variant="outline" onPress={signOut}>{t("Sign out")}</Button>
    </div>
  )
}

const MAX_LOGO_BYTES = 2 * 1024 * 1024

/** The workshop's logo shown to clients at the top of the portal (Maker and Studio). */
function PortalLogo({ shop, onSaved }: { shop: Shop | null; onSaved: (shop: Shop) => void }) {
  const { t } = useT()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const allowed = can(shop, "branding")
  const logoSrc = useFileUrl(shop?.logo_url)

  async function save(logoUrl: string | null) {
    if (!shop) return
    const { data, error } = await supabase.from("shops").update({ logo_url: logoUrl }).eq("id", shop.id).select().maybeSingle()
    if (error && /logo_url|column/i.test(error.message)) throw new Error(t("Run supabase/update.sql in Supabase first, then try again."))
    if (error || !data) throw error ?? new Error(t("Couldn't save the logo"))
    onSaved(data as Shop)
  }

  async function onPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || !shop) return
    setError(null)
    if (!file.type.startsWith("image/")) { setError(t("Choose an image file")); return }
    if (file.size > MAX_LOGO_BYTES) { setError(t("Image must be under 2 MB")); return }
    setBusy(true)
    try {
      await save(await uploadPublicAsset(shop.id, file, "logo"))
    } catch (err) {
      setError((err as Error)?.message || t("Something went wrong"))
    }
    setBusy(false)
  }

  async function remove() {
    setBusy(true)
    setError(null)
    try { await save(null) } catch (err) { setError((err as Error)?.message || t("Something went wrong")) }
    setBusy(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <Label className="flex items-center gap-2">
        {t("Portal logo")}
        {!allowed && <UpgradeChip feature="branding" />}
      </Label>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted px-2">
          {logoSrc ? (
            <img src={logoSrc} alt="" className="max-h-8 max-w-full object-contain" />
          ) : (
            <span className="text-[11px] text-muted-foreground">{t("No logo")}</span>
          )}
        </div>
        <Button size="sm" variant="outline" onPress={() => fileRef.current?.click()} isDisabled={!shop || !allowed || busy}>
          {busy ? t("Uploading...") : shop?.logo_url ? t("Change") : t("Upload")}
        </Button>
        {shop?.logo_url && (
          <button type="button" className="text-[11px] text-muted-foreground hover:text-foreground" onClick={remove} disabled={busy}>
            {t("Remove")}
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPicked} />
      </div>
      <p className="text-xs text-muted-foreground">
        {t("Clients see it at the top of the portal and on approval certificates, instead of the Nodly badge.")}
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function BillingPanel() {
  const usage = usePlanUsage()
  const [yearly, setYearly] = useState(false)
  const [switching, setSwitching] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { t, locale } = useT()

  async function choose(id: string) {
    if (!usage) return
    setSwitching(id)
    setError(null)
    const { data, error } = await supabase.from("shops").update({ plan: id }).eq("id", usage.shop.id).select().maybeSingle()
    if (error || !data) setError(error?.message || t("Couldn't change the plan"))
    else {
      notifyPlanChanged()
      // The pressed "Choose" button disappears; keep focus inside the dialog so Esc still works.
      requestAnimationFrame(() => document.getElementById(`plan-${id}`)?.focus())
    }
    setSwitching(null)
  }

  if (!usage) return <p className="text-muted-foreground">{t("Loading...")}</p>

  const trialEnds = usage.shop.trial_ends_at ? new Date(usage.shop.trial_ends_at).toLocaleDateString(locale) : ""

  return (
    <div className="flex flex-col gap-3">
      {usage.trialDays > 0 && usage.chosen.id === "free" && (
        <div className="rounded-lg bg-accent/10 px-3 py-2 text-xs ring-1 ring-accent/30">
          <p className="font-medium text-foreground">
            {t("Studio trial: {n} days left", { n: usage.trialDays })}
          </p>
          <p className="mt-0.5 text-muted-foreground">
            {t("Everything in Studio is unlocked until {date}. Then you move to Start unless you choose a plan.", { date: trialEnds })}
          </p>
        </div>
      )}

      <UsageMeter used={usage.activeOrders} limit={usage.plan.activeOrders} />

      <div className="flex justify-center pt-1">
        <BillingCycleToggle yearly={yearly} onChange={setYearly} />
      </div>

      <div className="flex flex-col gap-2">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === usage.chosen.id
          return (
            <div
              key={plan.id}
              id={`plan-${plan.id}`}
              tabIndex={-1}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 transition-colors outline-none",
                isCurrent ? "border-accent bg-accent/10" : "border-border"
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <p className="font-medium">{t(plan.name)}</p>
                  <PlanPrice plan={plan} yearly={yearly} className="text-xs text-muted-foreground" />
                </div>
                <ul className="mt-1 flex flex-col gap-0.5">
                  {plan.highlights.map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CheckIcon className="size-3 shrink-0 text-accent" />
                      {t(f)}
                    </li>
                  ))}
                </ul>
              </div>
              {isCurrent ? (
                <span className="rounded-md bg-accent/20 px-2 py-0.5 text-xs text-foreground">{t("Current")}</span>
              ) : (
                <Button size="sm" variant="outline" onPress={() => choose(plan.id)} isDisabled={!!switching}>
                  {switching === plan.id ? t("Switching...") : t("Choose")}
                </Button>
              )}
            </div>
          )
        })}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Note>{t("No charges during early access: you can switch plans freely. Billing will be announced before any payment.")}</Note>
    </div>
  )
}

const TELEGRAM_BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || ""

function Switch({ checked, onChange, disabled, label }: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        checked ? "bg-accent" : "bg-muted-foreground/30"
      )}
    >
      <span className={cn("absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform", checked && "translate-x-4")} />
    </button>
  )
}

function NotificationsPanel() {
  const { t, lang } = useT()
  const { email, shop, setShop, loading } = useAccount()
  const [error, setError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)

  // Pick up the Telegram connection when the user comes back from the bot.
  useEffect(() => {
    if (!shop) return
    const id = shop.id
    async function refresh() {
      const { data } = await supabase.from("shops").select("*").eq("id", id).maybeSingle()
      if (data) setShop(data as Shop)
    }
    window.addEventListener("focus", refresh)
    return () => window.removeEventListener("focus", refresh)
  }, [shop, setShop])

  async function save(patch: Partial<Shop>) {
    if (!shop) return false
    setError(null)
    // Notifications are sent in the language the owner uses the app in.
    const { data, error: saveError } = await supabase
      .from("shops").update({ ...patch, notify_lang: lang }).eq("id", shop.id).select().maybeSingle()
    if (saveError || !data) {
      setError(saveError?.message || t("Couldn't save the settings"))
      return false
    }
    setShop(data as Shop)
    return true
  }

  async function connectTelegram() {
    setConnecting(true)
    const code = crypto.randomUUID().replace(/-/g, "")
    // Open the tab right away (popup blockers), then point it at the bot once the code is saved.
    const tab = window.open("", "_blank")
    if (await save({ telegram_link_code: code })) {
      const link = `https://t.me/${TELEGRAM_BOT}?start=${code}`
      if (tab) tab.location.href = link
      else window.location.href = link
    } else tab?.close()
    setConnecting(false)
  }

  if (loading) return <p className="text-muted-foreground">{t("Loading...")}</p>

  const telegramConnected = !!shop?.telegram_chat_id

  return (
    <div className="flex flex-col gap-3">
      <div className="divide-y divide-border border-y border-border">
        <div className="flex items-center justify-between gap-4 py-3">
          <div className="min-w-0">
            <p className="text-foreground">{t("Email")}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>
          <Switch
            label={t("Email notifications")}
            checked={shop?.notify_email !== false}
            disabled={!shop}
            onChange={(v) => save({ notify_email: v })}
          />
        </div>

        <div className="flex items-center justify-between gap-4 py-3">
          <div className="min-w-0">
            <p className="text-foreground">Telegram</p>
            <p className="text-xs text-muted-foreground">
              {telegramConnected ? t("Connected") : TELEGRAM_BOT ? t("Not connected") : t("The Telegram bot isn't set up yet")}
            </p>
          </div>
          {telegramConnected ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-destructive"
                onClick={() => save({ telegram_chat_id: null })}
              >
                {t("Disconnect")}
              </button>
              <Switch
                label={t("Telegram notifications")}
                checked={shop?.notify_telegram !== false}
                onChange={(v) => save({ notify_telegram: v })}
              />
            </div>
          ) : (
            <Button size="sm" variant="outline" onPress={connectTelegram} isDisabled={!shop || !TELEGRAM_BOT || connecting}>
              {t("Connect Telegram")}
            </Button>
          )}
        </div>

        <Row label={t("Live updates on the order page")}><span className="text-chart-4">{t("On")}</span></Row>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Note>{t("You'll be notified when a client leaves a comment, approves a design or asks for changes. Messages come in the language you use Nodly in.")}</Note>
    </div>
  )
}

function SecurityPanel() {
  const { t } = useT()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)

  async function change(e: React.FormEvent) {
    e.preventDefault()
    setStatus(null)
    if (password.length < 8) return setStatus({ ok: false, text: t("Use at least 8 characters") })
    if (password !== confirm) return setStatus({ ok: false, text: t("Passwords don't match") })
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setStatus({ ok: false, text: error.message })
    else {
      setPassword("")
      setConfirm("")
      setStatus({ ok: true, text: t("Password updated") })
    }
    setSaving(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={change} className="flex flex-col gap-2">
        <Label htmlFor="panel-new-password">{t("New password")}</Label>
        <Input
          id="panel-new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
        />
        <Label htmlFor="panel-confirm-password" className="mt-1">{t("Confirm password")}</Label>
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
            {saving ? t("Updating...") : t("Change password")}
          </Button>
        </div>
      </form>
      <Note>{t("Client portal links are protected per order: set an access password on each order page before sharing the link.")}</Note>
    </div>
  )
}

function AppearancePanel() {
  const { t } = useT()
  const theme = useTheme()
  const options: { id: Theme; label: string }[] = [
    { id: "dark", label: t("Dark") },
    { id: "light", label: t("Light") },
  ]

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        {options.map(({ id, label }) => {
          const active = theme === id
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={(e) => setTheme(id, { x: e.clientX, y: e.clientY })}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors",
                active ? "border-accent ring-1 ring-accent" : "border-border hover:bg-hover"
              )}
            >
              <ThemePreview theme={id} />
              <div className="mt-2 flex items-center justify-between">
                <p className="font-medium">{label}</p>
                {active && <CheckIcon className="size-4 text-accent" />}
              </div>
            </button>
          )
        })}
      </div>
      <Note>{t("Your choice is saved in this browser and switches instantly.")}</Note>
    </div>
  )
}

/** Tiny static mock of the app in the given theme (fixed colors on purpose). */
function ThemePreview({ theme }: { theme: Theme }) {
  const c = theme === "dark"
    ? { bg: "#171615", card: "#1e1d1c", line: "rgba(214,213,212,.18)", text: "rgba(214,213,212,.55)" }
    : { bg: "#f6f5f3", card: "#ffffff", line: "rgba(31,30,29,.12)", text: "rgba(31,30,29,.35)" }
  return (
    <div className="flex h-16 gap-1.5 overflow-hidden rounded-md p-1.5" style={{ backgroundColor: c.bg, boxShadow: `inset 0 0 0 1px ${c.line}` }}>
      <div className="w-5 rounded-sm" style={{ backgroundColor: c.card }} />
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="h-2 w-3/4 rounded-sm" style={{ backgroundColor: c.text }} />
        <div className="flex flex-1 gap-1.5">
          <div className="flex-1 rounded-sm" style={{ backgroundColor: c.card }} />
          <div className="flex-1 rounded-sm" style={{ backgroundColor: c.card }}>
            <div className="m-1 h-1.5 w-1/2 rounded-sm bg-[#8a8783]" />
          </div>
        </div>
      </div>
    </div>
  )
}

function HelpPanel() {
  const { t } = useT()
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
            <p className="font-medium">{t(title)}</p>
            <p className="text-xs text-muted-foreground">{t(text)}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

function ContactPanel() {
  const { t } = useT()
  const hasContacts = SUPPORT.email || SUPPORT.telegram
  return (
    <div className="flex flex-col gap-3">
      {hasContacts ? (
        <div className="divide-y divide-border border-y border-border">
          {SUPPORT.email && (
            <Row label={t("Email")}>
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
        <Note>{t("Contact details will be added here soon.")}</Note>
      )}
      <p className="text-xs text-muted-foreground">{t("We usually reply within one working day.")}</p>
    </div>
  )
}

function DocsPanel() {
  const { t } = useT()
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
        <p className="text-xs font-medium text-muted-foreground">{t("Order statuses")}</p>
        {(Object.keys(STATUS_MAP) as OrderStatus[]).map((key) => (
          <div key={key} className="flex items-center gap-3">
            <span
              className="w-24 shrink-0 rounded-md px-2 py-0.5 text-center text-xs"
              style={{ backgroundColor: STATUS_MAP[key].bg, color: STATUS_MAP[key].color }}
            >
              {t(STATUS_MAP[key].label)}
            </span>
            <span className="text-xs text-muted-foreground">{t(statusHelp[key])}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium text-muted-foreground">{t("Comments")}</p>
        <p className="text-xs text-muted-foreground">
          {t("Clients click anywhere on a page to pin a comment, and can drag or delete their own pins. Pins keep their exact spot at any zoom. You can resolve them from the order page.")}
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">{t("File viewer shortcuts")}</p>
        {shortcuts.map(([keys, action]) => (
          <div key={keys} className="flex items-center gap-3 text-xs">
            <kbd className="w-12 shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-center font-mono">{keys}</kbd>
            <span className="text-muted-foreground">{t(action)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

type Check = { name: string; state: "checking" | "ok" | "down"; detail?: string }

function StatusPanel() {
  const { t } = useT()
  const [checks, setChecks] = useState<Check[]>([
    { name: "Database", state: "checking" },
    { name: "Authentication", state: "checking" },
    { name: "Live updates", state: "checking" },
    { name: "Server", state: "checking" },
    { name: "Telegram notifications", state: "checking" },
    { name: "Email notifications", state: "checking" },
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

    fetch("/api/health", { cache: "no-store" })
      .then((r) => r.json())
      .then((h: { database?: { ok: boolean; ms?: number; error?: string }; telegram?: boolean; email?: boolean }) => {
        const db = h.database
        update("Server", db?.ok ? "ok" : "down", db?.ok ? `${db.ms} ms` : db?.error?.includes("not configured") ? "Not configured" : "Unavailable")
        update("Telegram notifications", h.telegram ? "ok" : "down", h.telegram ? "Configured" : "Not configured")
        update("Email notifications", h.email ? "ok" : "down", h.email ? "Configured" : "Not configured")
      })
      .catch(() => {
        for (const name of ["Server", "Telegram notifications", "Email notifications"]) update(name, "down", "No connection")
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
          <Row key={c.name} label={t(c.name)}>
            <span className="flex items-center justify-end gap-2">
              <span className="text-xs text-muted-foreground">{c.detail ? t(c.detail) : null}</span>
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
        {allOk ? t("All systems operational.") : anyDown ? t("Some services are unavailable right now.") : t("Checking...")}
      </Note>
    </div>
  )
}

const WELCOME_MAX = 500
const CONTACT_FIELDS: { key: keyof PortalContacts; label: string; placeholder: string }[] = [
  { key: "phone", label: "Phone", placeholder: "+1 555 010 2030" },
  { key: "telegram", label: "Telegram", placeholder: "@workshop" },
  { key: "instagram", label: "Instagram", placeholder: "@workshop" },
  { key: "website", label: "Website", placeholder: "workshop.com" },
]

/** Studio: a welcome message and contacts the client sees in the portal. */
function BrandKit({ shop, onSaved }: { shop: Shop | null; onSaved: (shop: Shop) => void }) {
  const { t } = useT()
  const allowed = can(shop, "brandKit")
  const [welcome, setWelcome] = useState<string | null>(null)
  const [contacts, setContacts] = useState<PortalContacts | null>(null)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)

  // Edits live in local state until saved; untouched fields show what's stored.
  const welcomeValue = welcome ?? shop?.portal_welcome ?? ""
  const contactsValue = contacts ?? cleanContacts(shop?.portal_contacts)

  async function save() {
    if (!shop) return
    setSaving(true)
    setStatus(null)
    const patch = {
      portal_welcome: welcomeValue.trim().slice(0, WELCOME_MAX) || null,
      portal_contacts: cleanContacts(contactsValue),
    }
    const { data, error } = await supabase.from("shops").update(patch).eq("id", shop.id).select().maybeSingle()
    setSaving(false)
    if (error || !data) {
      const missing = /portal_|column/i.test(error?.message ?? "")
      setStatus({ ok: false, text: missing ? t("Run supabase/update.sql in Supabase first, then try again.") : error?.message || t("Something went wrong") })
      return
    }
    onSaved(data as Shop)
    setWelcome(null); setContacts(null)
    setStatus({ ok: true, text: t("Saved. Clients see it the next time they open the portal.") })
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/60 p-4">
      <div className="flex flex-col gap-1">
        <Label className="flex items-center gap-2">
          {t("Welcome and contacts")}
          {!allowed && <UpgradeChip feature="brandKit" />}
        </Label>
        <p className="text-xs text-muted-foreground">
          {t("What clients see in the portal: a few words from you and how to reach you.")}
        </p>
      </div>

      <fieldset disabled={!allowed || !shop} className="flex flex-col gap-4 disabled:opacity-60">
        <div className="flex flex-col gap-2">
          <Label htmlFor="portal-welcome" className="text-xs">{t("Welcome message")}</Label>
          <Textarea
            id="portal-welcome"
            rows={3}
            maxLength={WELCOME_MAX}
            value={welcomeValue}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setWelcome(e.target.value)}
            placeholder={t("Hi! Here is your project. Tap anywhere on the drawing to leave a comment.")}
            className="text-sm"
          />
          <p className="text-right text-[11px] text-muted-foreground">{welcomeValue.length}/{WELCOME_MAX}</p>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-foreground">{t("Contacts shown to clients")}</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {CONTACT_FIELDS.map((f) => (
              <Input
                key={f.key}
                aria-label={t(f.label)}
                value={contactsValue[f.key] ?? ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContacts({ ...contactsValue, [f.key]: e.target.value })}
                placeholder={`${t(f.label)}: ${f.placeholder}`}
                className="h-8 text-sm"
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button size="sm" onPress={save} isDisabled={!allowed || !shop || saving}>
            {saving ? t("Saving...") : t("Save")}
          </Button>
          <Message status={status} />
        </div>
      </fieldset>
    </div>
  )
}
