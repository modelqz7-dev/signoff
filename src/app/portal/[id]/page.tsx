"use client"

import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PDFViewer } from "@/components/ui/pdf-viewer"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { STATUS_MAP } from "@/components/dashboard/types"
import type { Order } from "@/components/dashboard/types"
import { PinDetails, PinList, PinMarker } from "@/components/orders/pins"
import { usePinNumbers, usePins, type Pin } from "@/lib/pins"
import { isPdfUrl } from "@/lib/utils"
import { useT } from "@/lib/i18n"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { ThemeToggle } from "@/components/ThemeToggle"

export default function PortalPage() {
  const params = useParams()
  const orderId = params.id as string

  const [phase, setPhase] = useState<"auth" | "view">("auth")
  const [password, setPassword] = useState("")
  const [clientName, setClientName] = useState("")
  const [authError, setAuthError] = useState("")
  const { t, locale } = useT()

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(false)

  const { pins, addPin, setResolved, movePin, deletePin } = usePins(phase === "view" ? orderId : null)
  // No accounts in the portal: a client can move and delete only comments left under their name.
  const canEdit = (pin: Pin) => pin.author_name === clientName
  const numbers = usePinNumbers(pins)
  const [focusPin, setFocusPin] = useState<{ id: string; nonce: number } | null>(null)
  const isPdf = isPdfUrl(order?.file_url)

  // Pin creation
  const [pendingPin, setPendingPin] = useState<{ x: number; y: number } | null>(null)
  const [pinTitle, setPinTitle] = useState("")
  const [pinDesc, setPinDesc] = useState("")
  const [savingPin, setSavingPin] = useState(false)
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null)

  const [actionLoading, setActionLoading] = useState(false)
  const fileContainerRef = useRef<HTMLDivElement>(null)

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    if (!clientName.trim()) { setAuthError(t("Enter your name")); return }
    setLoading(true)
    setAuthError("")

    const { data: orderData, error } = await supabase
      .from("orders").select("*").eq("id", orderId).single()

    if (error || !orderData) {
      setAuthError(t("Order not found"))
      setLoading(false)
      return
    }

    const ord = orderData as Order

    if (ord.password && ord.password !== password) {
      setAuthError(t("Incorrect password"))
      setLoading(false)
      return
    }

    setOrder(ord)
    setPhase("view")
    setLoading(false)
  }

  // Realtime order updates (pins are synced by usePins)
  useEffect(() => {
    if (phase !== "view") return

    const orderSub = supabase
      .channel(`order-${orderId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        (payload) => { if (payload.new) setOrder(payload.new as Order) }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(orderSub)
    }
  }, [phase, orderId])

  function handleFileClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!fileContainerRef.current) return
    const rect = fileContainerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
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
      }, clientName)
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

  async function handleAction(newStatus: string) {
    if (!order) return
    setActionLoading(true)

    await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", order.id)

    setActionLoading(false)
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleDateString(locale, {
      year: "numeric", month: "long", day: "numeric",
    })
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
                  value={clientName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClientName(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="portal-pass">{t("Password")}</Label>
                <Input
                  id="portal-pass"
                  type="password"
                  placeholder={t("Enter access password")}
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                />
              </div>
              {authError && <p className="text-sm text-destructive">{authError}</p>}
              <Button type="submit" isDisabled={loading}>
                {loading ? t("Loading...") : t("View Order")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── View screen ──
  if (!order) return null
  const status = STATUS_MAP[order.status] || STATUS_MAP.await
  const selectedPin = pins.find((p) => p.id === selectedPinId) || null

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-border/40 px-6 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-medium text-foreground">{order.title}</h1>
          <Badge
            variant="secondary"
            className="border-0 text-[11px] px-2 py-0.5"
            style={{ backgroundColor: status.bg, color: status.color }}
          >
            {t(status.label)}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
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
        <div className="flex-1 overflow-y-auto p-6 flex justify-center">
          <div className="w-full max-w-4xl flex flex-col gap-6">

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
                  <CardTitle className="text-sm">{t("File")}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {isPdf ? t("Open the file and click anywhere on a page to leave a comment.") : t("Click on the file to leave a comment.")}
                  </p>
                </CardHeader>
                <CardContent>
                  {isPdf ? (
                    <PDFViewer
                      url={order.file_url}
                      pins={pins}
                      onAddPin={(pin) => addPin(pin, clientName)}
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
                  {selectedPin && !pendingPin && !isPdf && (
                    <div className="mt-4 rounded-lg border border-border/40 p-4 text-sm">
                      <PinDetails
                        key={selectedPin.id}
                        pin={selectedPin}
                        number={numbers.get(selectedPin.id) ?? 0}
                        onToggleResolved={() => setResolved(selectedPin.id, !selectedPin.resolved)}
                        onDelete={canEdit(selectedPin) ? async () => { await deletePin(selectedPin.id); setSelectedPinId(null) } : undefined}
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

            {/* Actions */}
            <div className="flex gap-3 justify-center pb-8">
              <Button
                variant="outline"
                onPress={() => handleAction("changes")}
                isDisabled={actionLoading || order.status === "changes"}
                className="px-6"
              >
                <span className="flex items-center gap-2">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 1.5l3.5 3.5L5 14.5H1.5V11z" />
                  </svg>
                  {t("Request Changes")}
                </span>
              </Button>
              <Button
                onPress={() => handleAction("approved")}
                isDisabled={actionLoading || order.status === "approved"}
                className="px-6 bg-[var(--status-approved)] hover:opacity-90 text-white"
              >
                <span className="flex items-center gap-2">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 8.5l3 3 7-7" />
                  </svg>
                  {t("Approve")}
                </span>
              </Button>
            </div>

          </div>
        </div>

        {/* Right sidebar — pins list */}
        <aside className="hidden w-[280px] shrink-0 border-l border-border/40 lg:flex flex-col overflow-y-auto">
          <div className="p-4 border-b border-border/40">
            <h2 className="text-sm font-medium text-foreground">{t("Comments ({n})", { n: pins.filter((p) => !p.resolved).length })}</h2>
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
