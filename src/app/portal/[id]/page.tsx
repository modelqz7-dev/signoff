"use client"

import { useState, useRef } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PDFViewer } from "@/components/ui/pdf-viewer"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { STATUS_MAP } from "@/components/dashboard/types"
import { PinDetails, PinList, PinMarker } from "@/components/orders/pins"
import { pinsOfVersion, usePinNumbers, type NewPin, type Pin } from "@/lib/pins"
import { usePortal } from "@/lib/portal-client"
import { fileKey } from "@/lib/storage-path"
import { isPdfUrl } from "@/lib/utils"
import { useT } from "@/lib/i18n"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { ThemeToggle } from "@/components/ThemeToggle"
import { BrandMark, MadeWithNodly, usePortalBrand } from "@/components/portal/PortalBrand"
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
  const { phase, order, viewer: clientName, setResolved, movePin, deletePin } = portal
  const [loading, setLoading] = useState(false)

  // The client always works on the latest version; comments on earlier versions stay with them.
  const pins = pinsOfVersion(portal.pins, order?.version)
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
    else setSelectedPinId(pin.id === selectedPinId ? null : pin.id)
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
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex items-center gap-1">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
            {brand?.shopName && <BrandMark brand={brand} className="mx-auto mb-1 justify-center" />}
            <CardTitle className="text-base">{t("Order Portal")}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {t("Enter your details to view this order.")}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="portal-name">{t("Your Name *")}</Label>
                <Input
                  id="portal-name"
                  placeholder={t("John Doe")}
                  value={nameInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNameInput(e.target.value)}
                  autoComplete="name"
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
                  />
                </div>
              )}
              {authError && <p className="text-sm text-destructive">{authError}</p>}
              <Button type="submit" isDisabled={loading}>
                {loading ? t("Loading...") : t("View Order")}
              </Button>
            </form>
          </CardContent>
        </Card>
        <MadeWithNodly brand={brand} />
      </div>
    )
  }

  // ── View screen ──
  if (!order) return null
  const status = STATUS_MAP[order.status] || STATUS_MAP.await
  const selectedPin = pins.find((p) => p.id === selectedPinId) || null
  const openCount = pins.filter((p) => !p.resolved).length

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between gap-3 border-b border-border/40 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <BrandMark brand={brand} className="hidden border-r border-border/40 pr-3 sm:flex" />
          <h1 className="truncate text-sm font-medium text-foreground">{order.title}</h1>
          <Badge
            variant="secondary"
            className="border-0 text-[11px] px-2 py-0.5"
            style={{ backgroundColor: status.bg, color: status.color }}
          >
            {t(status.label)}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {t("Viewing as")} <span className="text-foreground font-medium">{clientName}</span>
          </span>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main — file viewer */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-28 sm:px-6 sm:pt-6 flex justify-center">
          <div className="w-full max-w-4xl flex flex-col gap-6">
            {order.status === "approved" || order.status === "prod" ? (
              <ApprovedBanner order={order} />
            ) : (
              <ReviewSteps status={order.status} />
            )}

            {/* Order info */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <InfoBlock label={t("Client")} value={order.client_name || "—"} />
              <InfoBlock label={t("Price")} value={order.value > 0 ? `$${order.value.toLocaleString()}` : "—"} />
              <InfoBlock label={t("Deadline")} value={formatDate(order.deadline)} />
              <InfoBlock label={t("Created")} value={formatDate(order.created_at)} />
            </div>

            {/* Notes */}
            {order.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t("Notes")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* File viewer with pins */}
            {order.file_url && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    {t("File")}
                    {(order.version ?? 1) > 1 && (
                      <span className="rounded-md bg-accent/15 px-1.5 py-0.5 text-[11px] font-normal text-accent">
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
                      {pins.filter((p) => !p.resolved).map((pin) => (
                        <PinMarker
                          key={pin.id}
                          pin={pin}
                          number={numbers.get(pin.id) ?? ""}
                          selected={pin.id === selectedPinId}
                          onSelect={() => { setSelectedPinId(pin.id === selectedPinId ? null : pin.id); setPendingPin(null) }}
                          onMove={canEdit(pin) ? (x, y) => movePin(pin.id, x, y) : undefined}
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

                  {selectedPin && !pendingPin && !isPdf && (
                    <div className="mt-4 rounded-lg border border-border/40 p-4 text-sm">
                      <PinDetails
                        key={selectedPin.id}
                        pin={selectedPin}
                        number={numbers.get(selectedPin.id) ?? 0}
                        onToggleResolved={() => setResolved(selectedPin.id, !selectedPin.resolved)}
                        onDelete={canEdit(selectedPin) ? async () => { await deletePin(selectedPin.id); setSelectedPinId(null) } : undefined}
                        onStartMove={canEdit(selectedPin) ? () => { setMovingPinId(selectedPin.id); setSelectedPinId(null) } : undefined}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* No file */}
            {!order.file_url && (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-sm text-muted-foreground">{t("No file uploaded yet.")}</p>
                </CardContent>
              </Card>
            )}

            <MadeWithNodly brand={brand} inline />

          </div>
        </div>

        {/* Right sidebar — pins list */}
        <aside className="hidden w-[280px] shrink-0 border-l border-border/40 lg:flex flex-col overflow-y-auto">
          <div className="p-4 border-b border-border/40">
            <h2 className="text-sm font-medium text-foreground">{t("Comments ({n})", { n: openCount })}</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <PinList
              pins={pins}
              numbers={numbers}
              selectedId={isPdf ? null : selectedPinId}
              onSelect={handleSelectPin}
              emptyText="No comments yet. Click on the file to add one."
            />
          </div>
        </aside>
      </div>

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
      <DoneDialog kind={done} shopName={brand?.shopName ?? ""} onClose={() => setDone(null)} />

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
        />
      </Sheet>
    </div>
  )
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}
