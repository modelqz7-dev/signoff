"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import { AwardIcon, ChevronLeftIcon, LockIcon } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Sidebar } from "@/components/dashboard/Sidebar"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { PDFViewer } from "@/components/ui/pdf-viewer"
import type { Shop, Order } from "@/components/dashboard/types"
import { STATUS_MAP } from "@/components/dashboard/types"
import { PinMarker } from "@/components/orders/pins"
import { PortalQrButton } from "@/components/orders/PortalQr"
import { NextStep, OrderProgress, useDeadlineText } from "@/components/orders/OrderOverview"
import { DeleteOrderButton } from "@/components/orders/DeleteOrderButton"
import { messagesByPin, pinsOfVersion, usePinMessages, usePinNumbers, usePins, type Pin } from "@/lib/pins"
import { AnswerablePinList } from "@/components/orders/Revisions"
import type { ThreadMessage } from "@/components/orders/PinThread"
import { fileNameFromUrl, uploadNewVersion, uploadOrderFile, useOrderVersions } from "@/lib/versions"
import { can } from "@/lib/plans"
import { openPanel } from "@/lib/panels"
import { markLinkShared } from "@/lib/onboarding"
import { UpgradeChip } from "@/components/plans/PlanBits"
import { cn } from "@/lib/utils"
import { useFileUrl } from "@/lib/files"
import { fileKey } from "@/lib/storage-path"
import { isPdfUrl } from "@/lib/utils"
import { getOrCreateShop } from "@/lib/shop"
import { useT } from "@/lib/i18n"
import { siteOrigin } from "@/lib/site"

export default function OrderPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string

  const [loading, setLoading] = useState(true)
  const [shop, setShop] = useState<Shop | null>(null)
  const [order, setOrder] = useState<Order | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [password, setPassword] = useState("")
  const [savingPassword, setSavingPassword] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const { t, locale } = useT()
  const [focusPin, setFocusPin] = useState<{ id: string; nonce: number } | null>(null)
  // A pin clicked on the file: open its conversation in the comment list.
  const [threadFocus, setThreadFocus] = useState<{ id: string; nonce: number } | null>(null)

  // Client comments from the portal, updated live.
  // The shop only reviews comments here: moving and deleting pins is left to the client.
  const { pins: allPins, reload: reloadPins } = usePins(order ? orderId : null)
  // The conversation inside each pin.
  const { messages: allMessages, send: sendMessages } = usePinMessages(order ? orderId : null)
  const threads = messagesByPin(allMessages)

  // Earlier files of the order; null = the current file.
  const versions = useOrderVersions(order ? orderId : null, order?.version)
  const [viewVersion, setViewVersion] = useState<number | null>(null)
  const oldVersion = versions.find((v) => v.version === viewVersion) ?? null
  const shownVersion = oldVersion?.version ?? order?.version
  const storedUrl = oldVersion?.file_url ?? order?.file_url ?? null
  // Files are private: show them through a short-lived signed link.
  const fileUrl = useFileUrl(storedUrl)
  const pins = pinsOfVersion(allPins, shownVersion)
  const numbers = usePinNumbers(pins)
  const isPdf = isPdfUrl(storedUrl)
  const canSeeHistory = can(shop, "versions")

  function handleSelectPin(pin: Pin) {
    if (isPdf) setFocusPin({ id: pin.id, nonce: Date.now() })
  }
  const fileRef = useRef<HTMLInputElement>(null)
  const commentsRef = useRef<HTMLDivElement>(null)
  const deadline = useDeadlineText(order)

  useEffect(() => {
    async function init() {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (!session?.user) { router.replace("/login"); return }

      const { data: shopData, error: shopError } = await getOrCreateShop(session.user)
      if (shopError) throw shopError

      if (!shopData) { setLoadError(t("Shop not found for this account")); setLoading(false); return }
      setShop(shopData as Shop)

      const { data: orderData, error: orderError } = await supabase
        .from("orders").select("*").eq("id", orderId).maybeSingle()
      if (orderError) throw orderError

      if (orderData) {
        setOrder(orderData as Order)
      }
      setLoading(false)
    }
    init().catch((e) => {
      console.error("Order load error:", e)
      setLoadError(e?.message || t("Failed to load order"))
      setLoading(false)
    })
  }, [router, orderId])

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || !order) return
    setUploading(true)
    setUploadError(null)
    try {
      setOrder(await uploadNewVersion(order, file))
      setViewVersion(null)
    } catch (err) {
      setUploadError((err as Error)?.message || t("Couldn't upload the file"))
    }
    setUploading(false)
  }

  /** A message from the workshop into one or more pins, with an optional file. */
  async function sendToPins(targets: Pin[], message: ThreadMessage) {
    if (!order) return
    const fileUrl = message.file ? await uploadOrderFile(order.shop_id, message.file) : null
    try {
      await sendMessages(targets, { body: message.body, fileUrl, fixed: message.fixed }, shop?.name || "")
    } catch (e) {
      const text = (e as Error)?.message ?? ""
      throw new Error(/pin_messages|relation|schema cache/i.test(text) ? t("Run supabase/update.sql in Supabase first, then try again.") : text)
    }
    if (message.fixed) await reloadPins()
  }

  // The password is hashed on the server and never comes back, so we only know whether one is set.
  const passwordSet = !!(order?.password_hash || order?.password)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  async function savePassword(value: string) {
    if (!order) return
    setSavingPassword(true)
    setPasswordError(null)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`/api/orders/${order.id}/password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
      body: JSON.stringify({ password: value }),
    }).catch(() => null)
    const body = await res?.json().catch(() => null)
    if (res?.ok && body) {
      setOrder({ ...order, password: "", password_hash: body.hasPassword ? "set" : null })
      setPassword("")
    } else {
      setPasswordError(t("Couldn't save the password"))
    }
    setSavingPassword(false)
  }

  function getPortalUrl() {
    const origin = siteOrigin()
    return origin ? `${origin}/portal/${order?.id}` : ""
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(getPortalUrl())
      markLinkShared()
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleDateString(locale, {
      year: "numeric", month: "long", day: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">{t("Loading...")}</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className={`text-sm ${loadError ? "text-destructive" : "text-muted-foreground"}`}>
          {loadError || t("Order not found")}
        </p>
      </div>
    )
  }

  const status = STATUS_MAP[order.status]
  // Link and password for the client: at the top of the right column (after the file on phones).
  const portalCard = (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("Client Portal")}</CardTitle>
        <CardDescription className="text-xs">{t("Share this link with your client to view and approve.")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Input
              aria-label={t("Portal Link")}
              readOnly
              value={getPortalUrl()}
              className="text-xs font-mono"
            />
            <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onPress={handleCopyLink}
              className="flex-1"
            >
              {copied ? (
                <span className="flex items-center gap-1.5 text-[var(--status-approved)]">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 8.5l3 3 7-7" />
                  </svg>
                  {t("Copied")}
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" className="h-3.5 w-3.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="5" width="9" height="9" rx="1.5" />
                    <path d="M5 11H3.5A1.5 1.5 0 0 1 2 9.5v-7A1.5 1.5 0 0 1 3.5 1h7A1.5 1.5 0 0 1 12 2.5V5" />
                  </svg>
                  {t("Copy Link")}
                </span>
              )}
            </Button>
            <PortalQrButton url={getPortalUrl()} fileName={order.code} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 border-t border-border/40 pt-3">
            <Label className="text-xs">{t("Access Password")}</Label>
            <div className="flex gap-2">
              <Input
                type="password"
                autoComplete="new-password"
                placeholder={passwordSet ? t("New password") : t("Set a password")}
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                className="min-w-0 flex-1 text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onPress={() => savePassword(password.trim())}
                isDisabled={savingPassword || !password.trim()}
                className="h-auto shrink-0"
              >
                {savingPassword ? t("Saving...") : t("Save")}
              </Button>
            </div>
            <p className={`flex items-center gap-2 text-[11px] ${passwordError ? "text-destructive" : "text-muted-foreground/70"}`}>
              <span className="min-w-0 flex-1">
                {passwordError ?? (passwordSet
                  ? t("Password is set. Client needs this to access.")
                  : t("No password. Anyone with the link can view."))}
              </span>
              {passwordSet && (
                <button type="button" onClick={() => savePassword("")} disabled={savingPassword} className="shrink-0 font-medium text-foreground/80 hover:text-foreground disabled:opacity-50">
                  {t("Remove")}
                </button>
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="flex min-h-screen">
      <Sidebar open={sidebarOpen} activePage="orders" />

      <div className="flex flex-1 flex-col min-w-0">
        <DashboardHeader
          shopName={shop?.name || ""}
          avatarUrl=""
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">

            {/* Header */}
            <div className="flex flex-col gap-3">
              <Link href="/orders" className="flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
                <ChevronLeftIcon className="size-3.5" />
                {t("Orders")}
              </Link>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="font-[family-name:var(--font-brand)] text-2xl leading-tight font-bold tracking-[-0.03em] text-foreground sm:text-3xl">{order.title}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">{order.client_name || "—"} · {order.code}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {(order.status === "approved" || order.status === "prod") && (
                    can(shop, "certificate") ? (
                      <Link
                        href={`/orders/${order.id}/certificate`}
                        target="_blank"
                        className="mr-1 flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
                      >
                        <AwardIcon className="size-3.5" />
                        {t("Certificate")}
                      </Link>
                    ) : (
                      <span className="mr-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <AwardIcon className="size-3.5" />
                        {t("Certificate")}
                        <UpgradeChip feature="certificate" />
                      </span>
                    )
                  )}
                  <Badge
                    variant="secondary"
                    className="border-0 text-xs px-2.5 py-1"
                    style={{ backgroundColor: status.bg, color: status.color }}
                  >
                    {t(status.label)}
                  </Badge>
                  <DeleteOrderButton order={order} onDeleted={() => router.replace("/orders")} />
                </div>
              </div>
            </div>

            <OrderProgress order={order} pins={allPins} />

            <NextStep
              order={order}
              pins={allPins}
              unanswered={pins.filter((p) => !p.resolved && threads.get(p.id)?.at(-1)?.author_role !== "workshop").length}
              copied={copied}
              uploading={uploading}
              certificateHref={can(shop, "certificate") ? `/orders/${order.id}/certificate` : null}
              onCopyLink={handleCopyLink}
              onUpload={() => fileRef.current?.click()}
              onSeeComments={() => commentsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            />

            <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
              {/* the design and what the client said about it */}
              <div className="flex min-w-0 flex-col gap-5">
                {/* File / PDF */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      {t("File")}
                      {(order.version ?? 1) > 1 && (
                        <span className="text-xs font-normal text-muted-foreground">
                          {t("version {n}", { n: shownVersion ?? 1 })}
                        </span>
                      )}
                    </CardTitle>
                    {(order.version ?? 1) > 1 && (
                      <VersionPicker
                        current={order.version ?? 1}
                        shown={shownVersion ?? 1}
                        locked={!canSeeHistory}
                        onPick={(v) => setViewVersion(v === order.version ? null : v)}
                      />
                    )}
                  </CardHeader>
                  <CardContent>
                    {oldVersion && (
                      <p className="mb-3 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                        {t("You're looking at version {n}. The client sees the latest version.", { n: oldVersion.version })}
                      </p>
                    )}
                    {storedUrl && !fileUrl ? (
                      <div className="flex h-48 items-center justify-center rounded-lg bg-muted/60 text-sm text-muted-foreground">
                        {t("Loading file...")}
                      </div>
                    ) : fileUrl ? (
                      <div className="flex flex-col gap-4">
                        {isPdf ? (
                          <PDFViewer
                            key={fileKey(storedUrl)}
                            url={fileUrl}
                            fileName={fileNameFromUrl(storedUrl)}
                            pins={pins}
                            onPinClick={(pin) => setThreadFocus({ id: pin.id, nonce: Date.now() })}
                            focusPin={focusPin}
                          />
                        ) : (
                          <div className="w-full rounded-lg border border-border/50 overflow-hidden bg-muted/60 flex items-center justify-center">
                            <div className="relative">
                              <img src={fileUrl} alt={order.title} className="block max-w-full max-h-[500px] object-contain" />
                              {/* a pin opens its conversation in the list below */}
                              {pins.filter((p) => !p.resolved || p.fix_status).map((pin) => (
                                <PinMarker key={pin.id} pin={pin} number={numbers.get(pin.id) ?? ""} small onSelect={() => setThreadFocus({ id: pin.id, nonce: Date.now() })} />
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-accent hover:text-foreground transition-colors flex items-center gap-1"
                          >
                            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" className="h-3.5 w-3.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M8 2v8M5 7l3 3 3-3" />
                              <path d="M2 11v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2" />
                            </svg>
                            {t("Download")}
                          </a>
                          {/* a PDF's name is already on its tile */}
                          {!isPdf && <span className="min-w-0 truncate text-xs text-muted-foreground">{fileNameFromUrl(storedUrl)}</span>}
                          <button
                            onClick={() => fileRef.current?.click()}
                            disabled={uploading}
                            className="ml-auto shrink-0 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {uploading ? t("Uploading...") : order.version !== undefined ? t("Upload new version") : t("Replace file")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileRef.current?.click()}
                        className="w-full flex flex-col items-center gap-3 rounded-lg border border-dashed border-border/60 py-8 text-muted-foreground transition-colors hover:bg-hover hover:text-foreground hover:border-accent/40"
                      >
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" className="h-8 w-8 opacity-50" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M8 10V2M5 5l3-3 3 3" />
                          <path d="M2 11v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2" />
                        </svg>
                        <span className="text-sm">{uploading ? t("Uploading...") : t("Upload PDF or image")}</span>
                        <span className="text-xs opacity-60">PDF, PNG, JPG</span>
                      </button>
                    )}
                    {uploadError && (
                    <p className="text-sm text-destructive mt-2">{uploadError}</p>
                  )}
                  <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileUpload} className="hidden" />
                  </CardContent>
                </Card>

                {/* Client comments */}
                <div ref={commentsRef} className="scroll-mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">{t("Client comments ({n})", { n: pins.length })}</CardTitle>
                    <CardDescription>
                      {t("Tap a comment to answer. The client sees your answer on the pin.")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AnswerablePinList
                      pins={pins}
                      numbers={numbers}
                      onSelect={isPdf ? handleSelectPin : undefined}
                      messages={threads}
                      onSend={sendToPins}
                      focus={threadFocus}
                      emptyText="No comments from the client yet."
                    />
                  </CardContent>
                </Card>
                </div>
              </div>

              {/* the link for the client, then the order's facts */}
              <aside className="flex min-w-0 flex-col gap-4">
                {portalCard}

                <Card size="sm">
                  <CardHeader>
                    <CardTitle>{t("Details")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="flex flex-col divide-y divide-border/50 text-[13px]">
                      <Row label={t("Client")} value={order.client_name || "—"} />
                      {order.client_email && <Row label={t("Email")} value={order.client_email} />}
                      {order.client_contact && <Row label={t("Contact")} value={order.client_contact} />}
                      <Row label={t("Price")} value={order.value > 0 ? `$${order.value.toLocaleString()}` : "—"} />
                      <Row label={t("Deadline")} value={deadline.text} color={deadline.late ? "var(--destructive)" : undefined} />
                      <Row label={t("Created")} value={formatDate(order.created_at)} />
                      {order.approved_at && (
                        <Row label={t("Approved")} value={`${formatDate(order.approved_at)}${order.approved_by ? ` · ${order.approved_by}` : ""}`} />
                      )}
                    </dl>
                  </CardContent>
                </Card>

                {order.notes && (
                  <Card size="sm">
                    <CardHeader>
                      <CardTitle className="text-sm">{t("Notes")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap text-muted-foreground">{order.notes}</p>
                    </CardContent>
                  </Card>
                )}
              </aside>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 first:pt-0 last:pb-0">
      <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium text-foreground" style={color ? { color } : undefined} title={value} suppressHydrationWarning>{value}</dd>
    </div>
  )
}

/** v1 · v2 · v3 chips; earlier versions are locked on plans without version history. */
function VersionPicker({ current, shown, locked, onPick }: {
  current: number
  shown: number
  locked: boolean
  onPick: (version: number) => void
}) {
  const { t } = useT()
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1">
      {Array.from({ length: current }, (_, i) => i + 1).map((v) => {
        const isLocked = locked && v !== current
        return (
          <button
            key={v}
            type="button"
            aria-pressed={v === shown}
            title={isLocked ? t("Version history is available on Maker and Studio") : undefined}
            onClick={() => (isLocked ? openPanel("billing") : onPick(v))}
            className={cn(
              "flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs transition-colors sm:px-2 sm:py-0.5",
              v === shown ? "bg-accent/15 text-foreground ring-1 ring-accent/40" : "text-muted-foreground hover:bg-hover hover:text-foreground"
            )}
          >
            {isLocked && <LockIcon className="size-3" />}
            v{v}
            {v === current && <span className="text-[10px] text-muted-foreground">{t("latest")}</span>}
          </button>
        )
      })}
      {locked && <UpgradeChip feature="versions" className="ml-1" />}
    </div>
  )
}
