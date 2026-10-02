"use client"

import { useState, useRef } from "react"
import { ArrowRightIcon, ChevronLeftIcon } from "lucide-react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PDFViewer } from "@/components/ui/pdf-viewer"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { STATUS_MAP } from "@/components/dashboard/types"
import { CommentsIcon, PinDetails, PinList, PinMarker, PinNav } from "@/components/orders/pins"
import { messagesByPin, pinsOfVersion, usePinNumbers, type NewPin, type Pin } from "@/lib/pins"
import { PinThread } from "@/components/orders/PinThread"
import { usePortal } from "@/lib/portal-client"
import { fileKey } from "@/lib/storage-path"
import { isPdfUrl } from "@/lib/utils"
import { useT } from "@/lib/i18n"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { ThemeToggle } from "@/components/ThemeToggle"
import { BrandMark, MadeWithNodly, NodlyMark, PortalContactCard, PortalWelcome, usePortalBrand } from "@/components/portal/PortalBrand"
import { ActionBar, ApproveDialog, ApprovedBanner, ChangesDialog, DoneDialog, ReviewSteps } from "@/components/portal/ReviewFlow"
import { Sheet } from "@/components/ui/sheet"

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
  const { phase, order, setResolved, movePin, deletePin, sendMessage } = portal
  const [loading, setLoading] = useState(false)

  // The client always works on the latest version; comments on earlier versions stay with them.
  const pins = pinsOfVersion(portal.pins, order?.version)
  const threads = messagesByPin(portal.messages)
  const lastMessages = new Map([...threads].map(([id, list]) => [id, list[list.length - 1]]))
  // Pins where the workshop has the last word: the client should look at those.
  const answered = pins.filter((p) => lastMessages.get(p.id)?.author_role === "workshop")
  // The client writes in a pin; the workshop's files and "fixed" come from the other side.
  const thread = (pin: Pin) => (
    <PinThread messages={threads.get(pin.id) ?? []} role="client" fixed={pin.fix_status === "fixed"} onSend={(m) => sendMessage(pin.id, m.body)} />
  )
  // The server puts the comment on the current version under the visitor's name.
  const addPin = (pin: NewPin) => portal.addPin(pin)
  // The portal belongs to the client: they can move and delete any comment on their order.
  const canEdit: (pin: Pin) => boolean = () => true
  const numbers = usePinNumbers(pins)
  const [focusPin, setFocusPin] = useState<{ id: string; nonce: number } | null>(null)
  const isPdf = isPdfUrl(order?.file_url)

  // Pin creation
  const [pendingPin, setPendingPin] = useState<{ x: number; y: number } | null>(null)
  const [pinTitle, setPinTitle] = useState("")
  const [pinDesc, setPinDesc] = useState("")
  const [savingPin, setSavingPin] = useState(false)
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null)
  // Tap-to-move on images: the next tap on the file puts this pin there.
  const [movingPinId, setMovingPinId] = useState<string | null>(null)

  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<"approved" | "changes" | null>(null)
  const [done, setDone] = useState<"approved" | "changes" | null>(null)
  const [commentsOpen, setCommentsOpen] = useState(false)
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

  function handleFileClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!fileContainerRef.current) return
    const rect = fileContainerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    if (movingPinId) {
      movePin(movingPinId, x, y)
      setSelectedPinId(movingPinId)
      setMovingPinId(null)
      return
    }
    setPendingPin({ x, y })
    setPinTitle("")
    setPinDesc("")
    setSelectedPinId(null)
  }

  async function handleSavePin() {
    if (!pendingPin || !pinTitle.trim()) return
    setSavingPin(true)

    try {
      await addPin({
        x: pendingPin.x,
        y: pendingPin.y,
        page: 1,
        title: pinTitle.trim(),
        description: pinDesc.trim() || null,
      })
      setPendingPin(null)
      setPinTitle("")
      setPinDesc("")
    } catch (e) {
      console.error("Pin save error:", e)
    }
    setSavingPin(false)
  }

  function handleSelectPin(pin: Pin) {
    setPendingPin(null)
    if (isPdf) setFocusPin({ id: pin.id, nonce: Date.now() })
    else {
      setSelectedPinId(pin.id === selectedPinId ? null : pin.id)
      // the comment opens under the design: bring it into view
      requestAnimationFrame(() => document.getElementById("pin-details")?.scrollIntoView({ behavior: "smooth", block: "center" }))
    }
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
  const selectedPin = pins.find((p) => p.id === selectedPinId) || null
  const openCount = pins.filter((p) => !p.resolved).length
  // Comments in their numbered order, for "‹ 2 of 5 ›".
  const ordered = [...pins].sort((a, b) => (numbers.get(a.id) ?? 0) - (numbers.get(b.id) ?? 0))
  const pinDetails = (pin: Pin) => {
    const at = ordered.findIndex((p) => p.id === pin.id)
    const step = (d: number) => setSelectedPinId(ordered[(at + d + ordered.length) % ordered.length].id)
    return (
      <PinDetails
        key={pin.id}
        pin={pin}
        number={numbers.get(pin.id) ?? 0}
        onToggleResolved={() => setResolved(pin.id, !pin.resolved)}
        onDelete={canEdit(pin) ? async () => { await deletePin(pin.id); setSelectedPinId(null) } : undefined}
        onStartMove={canEdit(pin) ? () => { setMovingPinId(pin.id); setSelectedPinId(null) } : undefined}
        thread={thread(pin)}
        nav={<PinNav index={at} total={ordered.length} onPrev={() => step(-1)} onNext={() => step(1)} />}
      />
    )
  }

  const fileCard = order.file_url ? (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          {t("Design")}
          {(order.version ?? 1) > 1 && (
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-normal text-muted-foreground">
              {t("version {n}", { n: order.version ?? 1 })}
            </span>
          )}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {isPdf ? t("Open the file and click anywhere on a page to leave a comment.") : t("Click on the file to leave a comment.")}
        </p>
      </CardHeader>
      <CardContent>
          {isPdf ? (
            <PDFViewer
              key={fileKey(order.file_url)}
              url={order.file_url}
              pins={pins}
              onAddPin={addPin}
              onToggleResolved={(pin) => setResolved(pin.id, !pin.resolved)}
              onMovePin={(pin, x, y) => movePin(pin.id, x, y)}
              onDeletePin={(pin) => deletePin(pin.id)}
              renderThread={thread}
              lastMessages={lastMessages}
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
                  onSelect={() => { setSelectedPinId(pin.id === selectedPinId ? null : pin.id); setPendingPin(null) }}
                  onMove={canEdit(pin) ? (x, y) => { movePin(pin.id, x, y); setMovingPinId(null) } : undefined}
                />
              ))}
              {pendingPin && <PinMarker pin={{ ...pendingPin, resolved: false }} pending />}
            </div>
          )}

          {/* New pin form */}
          {pendingPin && (
            <div className="mt-4 rounded-lg border border-border/40 p-4 flex flex-col gap-3">
              <p className="text-xs font-medium text-foreground">{t("New comment")}</p>
              <Input
                placeholder={t("Title *")}
                value={pinTitle}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPinTitle(e.target.value)}
                className="text-sm"
              />
              <Textarea
                placeholder={t("Description (optional)")}
                value={pinDesc}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPinDesc(e.target.value)}
                rows={2}
                className="text-sm"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onPress={() => setPendingPin(null)}>{t("Cancel")}</Button>
                <Button size="sm" onPress={handleSavePin} isDisabled={savingPin || !pinTitle.trim()}>
                  {savingPin ? t("Saving...") : t("Add comment")}
                </Button>
              </div>
            </div>
          )}

          {/* Selected pin detail */}
          {movingPinId && !isPdf && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-border/40 px-4 py-2.5 text-sm">
              <span>{t("Tap the spot where the pin should go.")}</span>
              <Button variant="ghost" size="sm" onPress={() => setMovingPinId(null)}>{t("Cancel")}</Button>
            </div>
          )}

          {/* phones and tablets: the open comment sits under the design */}
          {selectedPin && !pendingPin && !isPdf && (
            <div id="pin-details" className="mt-4 scroll-mt-20 rounded-lg border border-border/40 p-4 text-sm lg:hidden">
              {pinDetails(selectedPin)}
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

      <main className="flex-1 px-4 pt-6 pb-28 sm:px-6 sm:pt-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
          {/* the order, set like a title page */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
              {order.code}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="font-[family-name:var(--font-brand)] text-2xl leading-tight font-bold tracking-[-0.03em] text-foreground sm:text-3xl">{order.title}</h1>
              <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">{t(status.label)}</span>
            </div>
          </div>

          {order.status === "approved" || order.status === "prod" ? (
            <ApprovedBanner order={order} />
          ) : (
            <ReviewSteps status={order.status} commented={pins.length > 0} />
          )}

          {/* the workshop wrote back: say so, instead of waiting for the client to find it */}
          {answered.length > 0 && order.status !== "approved" && order.status !== "prod" && (
            <div className="flex flex-col gap-3 rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                  <CommentsIcon className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {answered.length === 1
                      ? t("{shop} answered your comment", { shop: brand?.shopName || t("The workshop") })
                      : t("{shop} answered {n} of your comments", { shop: brand?.shopName || t("The workshop"), n: answered.length })}
                  </p>
                  <p className="text-xs text-muted-foreground">{t("Open a pin to see the answer. If something isn't right, write back in it.")}</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onPress={() => handleSelectPin(answered[0])} className="shrink-0 self-start sm:self-auto">
                {t("See the answer")}
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex min-w-0 flex-col gap-5">
              {fileCard}
            </div>

            <aside className="flex min-w-0 flex-col gap-4">
              <Card size="sm">
                <CardHeader>
                  <CardTitle>{t("Details")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="flex flex-col divide-y divide-border/50 text-[13px]">
                    <Row label={t("Price")} value={order.value > 0 ? `$${order.value.toLocaleString()}` : "—"} />
                    <Row label={t("Deadline")} value={formatDate(order.deadline)} />
                  </dl>
                </CardContent>
              </Card>

              {order.notes && (
                <Card size="sm">
                  <CardHeader>
                    <CardTitle>{t("Notes")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap text-muted-foreground">{order.notes}</p>
                  </CardContent>
                </Card>
              )}

              {/* on phones the comments open from the bar at the bottom */}
              {/* wide screens: the open comment takes the place of the list, off the design */}
              {selectedPin && !pendingPin && !isPdf ? (
                <Card size="sm" className="hidden lg:flex">
                  <div className="-mt-1 px-1.5">
                    <Button variant="ghost" size="sm" onPress={() => setSelectedPinId(null)}>
                      <ChevronLeftIcon />
                      {t("All comments")}
                    </Button>
                  </div>
                  <CardContent className="text-sm">{pinDetails(selectedPin)}</CardContent>
                </Card>
              ) : (
              <Card size="sm" className="hidden lg:flex">
                <CardHeader>
                  <CardTitle>{t("Comments ({n})", { n: openCount })}</CardTitle>
                </CardHeader>
                <CardContent className="px-1.5">
                  <PinList
                    pins={pins}
                    numbers={numbers}
                    selectedId={isPdf ? null : selectedPinId}
                    onSelect={handleSelectPin}
                    emptyText="No comments yet. Click on the file to add one."
                    lastMessages={lastMessages}
                  />
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
        onComments={() => setCommentsOpen(true)}
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

      <Sheet
        isOpen={commentsOpen}
        onOpenChange={setCommentsOpen}
        title={t("Comments ({n})", { n: openCount })}
        className="lg:hidden"
      >
        <PinList
          pins={pins}
          numbers={numbers}
          selectedId={isPdf ? null : selectedPinId}
          onSelect={(pin) => { setCommentsOpen(false); handleSelectPin(pin) }}
          emptyText="No comments yet. Click on the file to add one."
          lastMessages={lastMessages}
        />
      </Sheet>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 first:pt-0 last:pb-0">
      <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium text-foreground" title={value} suppressHydrationWarning>{value}</dd>
    </div>
  )
}
