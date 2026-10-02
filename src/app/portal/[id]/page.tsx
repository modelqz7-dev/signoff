"use client"

import { useState, useRef } from "react"
import { ArrowRightIcon } from "lucide-react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PDFViewer } from "@/components/ui/pdf-viewer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { STATUS_MAP } from "@/components/dashboard/types"
import { CommentsIcon, PinMarker } from "@/components/orders/pins"
import { ClientPinList } from "@/components/orders/Revisions"
import { messagesByPin, pinsOfVersion, usePinNumbers, type NewPin, type Pin } from "@/lib/pins"
import { usePortal } from "@/lib/portal-client"
import { fileKey } from "@/lib/storage-path"
import { isPdfUrl } from "@/lib/utils"
import { useT } from "@/lib/i18n"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { ThemeToggle } from "@/components/ThemeToggle"
import { BrandMark, MadeWithNodly, NodlyMark, PortalContactCard, PortalWelcome, usePortalBrand } from "@/components/portal/PortalBrand"
import { ActionBar, ApproveDialog, ApprovedBanner, ChangesDialog, DoneDialog, ReviewSteps } from "@/components/portal/ReviewFlow"

export default function PortalPage() {
  const params = useParams()
  const orderId = params.id as string

  const [password, setPassword] = useState("")
  const [nameInput, setNameInput] = useState("")
  const [authError, setAuthError] = useState("")
  const { t, locale } = useT()
  const brand = usePortalBrand(orderId)

  // Everything goes through the server: the database itself is closed to portal visitors.
  const portal = usePortal(orderId)
  const { phase, order, setResolved, movePin, describePin, deletePin, sendMessage } = portal
  const [loading, setLoading] = useState(false)

  // The client always works on the latest version; comments on earlier versions stay with them.
  const pins = pinsOfVersion(portal.pins, order?.version)
  const threads = messagesByPin(portal.messages)
  const lastMessages = new Map([...threads].map(([id, list]) => [id, list[list.length - 1]]))
  // Pins where the workshop has the last word: the client should look at those.
  const answered = pins.filter((p) => lastMessages.get(p.id)?.author_role === "workshop")
  // The server puts the comment on the current version under the visitor's name.
  const addPin = (pin: NewPin) => portal.addPin(pin)
  // The portal belongs to the client: they can move and delete any comment on their order.
  const canEdit: (pin: Pin) => boolean = () => true
  const numbers = usePinNumbers(pins)
  // Open a pin in the full-screen PDF viewer, or a comment in the list (each `nonce` once).
  const [focusPin, setFocusPin] = useState<{ id: string; nonce: number } | null>(null)
  const [listFocus, setListFocus] = useState<{ id: string; nonce: number } | null>(null)
  const isPdf = isPdfUrl(order?.file_url)

  // The pin picked from the list, highlighted on an image.
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null)

  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<"approved" | "changes" | null>(null)
  const [done, setDone] = useState<"approved" | "changes" | null>(null)
  const fileContainerRef = useRef<HTMLDivElement>(null)

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    if (!nameInput.trim()) { setAuthError(t("Enter your name")); return }
    setLoading(true)
    setAuthError("")
    const error = await portal.enter(nameInput.trim(), password)
    setLoading(false)
    if (!error) { setPassword(""); return }
    setAuthError(
      error === "wrong_password" ? t("Incorrect password")
      : error === "too_many_attempts" ? t("Too many attempts. Try again in 15 minutes.")
      : error === "not_found" ? t("Order not found")
      : t("Something went wrong")
    )
  }

  // A tap on the image puts a numbered pin there; what it is about is written in the list.
  function handleFileClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!fileContainerRef.current) return
    const rect = fileContainerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setSelectedPinId(null)
    addPin({ x, y, page: 1, title: "", description: null }).catch((err) => console.error("Pin save error:", err))
  }

  /** Open the comment in the list under the file. */
  function handleSelectPin(pin: Pin) {
    setListFocus((f) => ({ id: pin.id, nonce: (f?.nonce ?? 0) + 1 }))
  }

  /** Open the file to put pins on it: the PDF full screen, an image brought into view. */
  function openFile() {
    if (isPdf) { setFocusPin((f) => ({ id: "", nonce: (f?.nonce ?? 0) + 1 })); return }
    fileContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  /** Show where a comment sits: the PDF opens on it, an image gets it highlighted. */
  function showOnFile(pin: Pin) {
    if (isPdf) { setFocusPin((f) => ({ id: pin.id, nonce: (f?.nonce ?? 0) + 1 })); return }
    setSelectedPinId(pin.id)
    fileContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  async function handleAction(newStatus: "approved" | "changes") {
    if (!order) return
    setActionLoading(true)
    setActionError(null)
    const ok = await portal.decide(newStatus)
    setActionLoading(false)
    setConfirm(null)
    if (!ok) {
      setActionError(t("Couldn't save your decision. Please try again."))
      return
    }
    setDone(newStatus)
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleDateString(locale, {
      year: "numeric", month: "long", day: "numeric",
    })
  }

  if (phase === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">{t("Loading...")}</p>
      </div>
    )
  }

  if (phase === "missing") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <p className="text-sm text-muted-foreground">{t("Order not found")}</p>
      </div>
    )
  }

  // ── Auth screen ──
  if (phase === "auth") {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <NodlyMark brand={brand} />
          <div className="ml-auto flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex flex-1 items-center justify-center px-4 pb-16">
          <div className="flex w-full max-w-sm flex-col gap-6">
            <div className="flex flex-col gap-2">
              {brand?.logoUrl
                ? <BrandMark brand={brand} className="mb-2" />
                : <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">{brand?.shopName || t("Order Portal")}</p>}
              <h1 className="font-[family-name:var(--font-brand)] text-3xl leading-tight font-bold tracking-[-0.03em] text-foreground">
                {t("Your design is ready")}
              </h1>
              <p className="text-sm text-muted-foreground">{t("Enter your name to view it, leave comments on the spot and approve.")}</p>
            </div>
            {brand?.welcome && <PortalWelcome brand={brand} className="border-l-2 border-foreground/30 bg-transparent px-3 py-0.5 text-muted-foreground" />}
            <form onSubmit={handleAuth} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="portal-name">{t("Your Name *")}</Label>
                <Input
                  id="portal-name"
                  placeholder={t("John Doe")}
                  value={nameInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNameInput(e.target.value)}
                  autoComplete="name"
                  className="h-10"
                  required
                />
              </div>
              {portal.hasPassword && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="portal-pass">{t("Password")}</Label>
                  <Input
                    id="portal-pass"
                    type="password"
                    placeholder={t("Enter access password")}
                    value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="h-10"
                  />
                </div>
              )}
              {authError && <p className="text-sm text-destructive">{authError}</p>}
              <Button type="submit" size="lg" isDisabled={loading} className="h-10">
                {loading ? t("Loading...") : t("View Order")}
                {!loading && <ArrowRightIcon />}
              </Button>
            </form>
          </div>
        </main>
      </div>
    )
  }

  // ── View screen ──
  if (!order) return null
  const status = STATUS_MAP[order.status] || STATUS_MAP.await
  const openCount = pins.filter((p) => !p.resolved).length

  const fileCard = order.file_url ? (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {t("Design")}
          {(order.version ?? 1) > 1 && (
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
              {t("version {n}", { n: order.version ?? 1 })}
            </span>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {isPdf ? t("Open the file and tap the spot that needs a change. Describe it below.") : t("Tap the spot that needs a change. Describe it below.")}
        </p>
      </CardHeader>
      <CardContent>
          {isPdf ? (
            <PDFViewer
              key={fileKey(order.file_url)}
              url={order.file_url}
              pins={pins}
              onAddPin={addPin}
              onMovePin={(pin, x, y) => movePin(pin.id, x, y)}
              onPinClick={handleSelectPin}
              canEdit={canEdit}
              focusPin={focusPin}
            />
          ) : (
            <div
              ref={fileContainerRef}
              className="relative w-full rounded-lg border border-border/50 overflow-hidden bg-muted/60 cursor-crosshair"
              onClick={handleFileClick}
            >
              <img
                src={order.file_url}
                alt={order.title}
                className="w-full object-contain pointer-events-none"
              />
              {/* answered comments stay on the design, with a check, so the client can open the answer */}
              {pins.filter((p) => !p.resolved || p.fix_status).map((pin) => (
                <PinMarker
                  key={pin.id}
                  pin={pin}
                  number={numbers.get(pin.id) ?? ""}
                  selected={pin.id === selectedPinId}
                  onSelect={() => { setSelectedPinId(pin.id); handleSelectPin(pin) }}
                  onMove={canEdit(pin) ? (x, y) => movePin(pin.id, x, y) : undefined}
                />
              ))}
            </div>
          )}
      </CardContent>
    </Card>
  ) : (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-sm text-muted-foreground">{t("No file uploaded yet.")}</p>
      </CardContent>
    </Card>
  )

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border/40 bg-background/90 px-4 py-2.5 backdrop-blur sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <NodlyMark brand={brand} />
          <BrandMark brand={brand} className={brand?.badge ? "hidden border-l border-border/40 pl-3 sm:flex" : ""} />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pt-6 pb-28 sm:px-8 sm:pt-10">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          {/* the order, set like a title page */}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
              {order.code}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="font-[family-name:var(--font-brand)] text-2xl leading-tight font-bold tracking-[-0.03em] text-foreground sm:text-4xl">{order.title}</h1>
              <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-foreground">{t(status.label)}</span>
            </div>
          </div>

          {order.status === "approved" || order.status === "prod" ? (
            <ApprovedBanner order={order} />
          ) : (
            <ReviewSteps status={order.status} commented={pins.length > 0} />
          )}

          {/* the workshop wrote back: say so, instead of waiting for the client to find it */}
          {answered.length > 0 && order.status !== "approved" && order.status !== "prod" && (
            <div className="flex flex-col gap-3 rounded-xl bg-card px-5 py-4 ring-1 ring-foreground/10 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                  <CommentsIcon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-base font-medium text-foreground">
                    {answered.length === 1
                      ? t("{shop} answered your comment", { shop: brand?.shopName || t("The workshop") })
                      : t("{shop} answered {n} of your comments", { shop: brand?.shopName || t("The workshop"), n: answered.length })}
                  </p>
                  <p className="text-sm text-muted-foreground">{t("Open a pin to see the answer. If something isn't right, write back in it.")}</p>
                </div>
              </div>
              <Button variant="outline" onPress={() => handleSelectPin(answered[0])} className="shrink-0 self-start sm:self-auto">
                {t("See the answer")}
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="flex min-w-0 flex-col gap-6">
              {fileCard}
              {order.file_url && (
                <Card id="comments" className="scroll-mt-20">
                  <CardHeader>
                    <CardTitle className="text-lg">{t("Comments ({n})", { n: pins.filter((p) => p.title.trim()).length })}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ClientPinList
                      pins={pins}
                      numbers={numbers}
                      messages={threads}
                      focus={listFocus}
                      onDescribe={(pin, title, description) => describePin(pin.id, title, description)}
                      onSend={(pin, text) => sendMessage(pin.id, text)}
                      onDelete={(pin) => deletePin(pin.id)}
                      onToggleResolved={(pin) => setResolved(pin.id, !pin.resolved)}
                      onShow={showOnFile}
                      onPick={(pin) => setSelectedPinId(pin?.id ?? null)}
                      onOpenFile={openFile}
                    />
                  </CardContent>
                </Card>
              )}
            </div>

            <aside className="flex min-w-0 flex-col gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t("Details")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="flex flex-col divide-y divide-border/50 text-sm">
                    <Row label={t("Price")} value={order.value > 0 ? `$${order.value.toLocaleString()}` : "—"} />
                    <Row label={t("Deadline")} value={formatDate(order.deadline)} />
                  </dl>
                </CardContent>
              </Card>

              {order.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{t("Notes")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-muted-foreground">{order.notes}</p>
                  </CardContent>
                </Card>
              )}

              <PortalContactCard brand={brand} />
            </aside>
          </div>
        </div>
      </main>

      <ActionBar
        status={order.status}
        commentCount={openCount}
        busy={actionLoading}
        onComments={() => document.getElementById("comments")?.scrollIntoView({ behavior: "smooth", block: "start" })}
        onChanges={() => setConfirm("changes")}
        onApprove={() => setConfirm("approved")}
      >
        {actionError && <span className="text-xs text-destructive">{actionError}</span>}
      </ActionBar>

      {actionError && (
        <p className="fixed inset-x-4 bottom-20 z-30 rounded-lg bg-destructive/10 px-3 py-2 text-center text-xs text-destructive sm:hidden">
          {actionError}
        </p>
      )}

      <ApproveDialog
        open={confirm === "approved"}
        onOpenChange={(v) => !v && setConfirm(null)}
        title={order.title}
        version={order.version ?? 1}
        openComments={openCount}
        busy={actionLoading}
        onConfirm={() => handleAction("approved")}
      />
      <ChangesDialog
        open={confirm === "changes"}
        onOpenChange={(v) => !v && setConfirm(null)}
        openComments={openCount}
        busy={actionLoading}
        onConfirm={() => handleAction("changes")}
      />
      <DoneDialog kind={done} shopName={brand?.shopName ?? ""} onClose={() => setDone(null)} footer={<MadeWithNodly brand={brand} />} />

    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium text-foreground" title={value} suppressHydrationWarning>{value}</dd>
    </div>
  )
}
