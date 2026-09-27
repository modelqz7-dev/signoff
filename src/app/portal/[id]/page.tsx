"use client"

import { useEffect, useState, useRef, useCallback } from "react"
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

type Pin = {
  id: string
  order_id: string
  x: number
  y: number
  page: number
  title: string
  description: string | null
  author_name: string
  resolved: boolean
  created_at: string
}

export default function PortalPage() {
  const params = useParams()
  const orderId = params.id as string

  const [phase, setPhase] = useState<"auth" | "view">("auth")
  const [password, setPassword] = useState("")
  const [clientName, setClientName] = useState("")
  const [authError, setAuthError] = useState("")

  const [order, setOrder] = useState<Order | null>(null)
  const [pins, setPins] = useState<Pin[]>([])
  const [loading, setLoading] = useState(false)

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
    if (!clientName.trim()) { setAuthError("Enter your name"); return }
    setLoading(true)
    setAuthError("")

    const { data: orderData, error } = await supabase
      .from("orders").select("*").eq("id", orderId).single()

    if (error || !orderData) {
      setAuthError("Order not found")
      setLoading(false)
      return
    }

    const ord = orderData as Order

    if (ord.password && ord.password !== password) {
      setAuthError("Incorrect password")
      setLoading(false)
      return
    }

    setOrder(ord)
    await loadPins()
    setPhase("view")
    setLoading(false)
  }

  const loadPins = useCallback(async () => {
    const { data } = await supabase
      .from("order_pins").select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true })
    if (data) setPins(data as Pin[])
  }, [orderId])

  // Realtime subscriptions
  useEffect(() => {
    if (phase !== "view") return

    const orderSub = supabase
      .channel(`order-${orderId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        (payload) => { if (payload.new) setOrder(payload.new as Order) }
      )
      .subscribe()

    const pinsSub = supabase
      .channel(`pins-${orderId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_pins", filter: `order_id=eq.${orderId}` },
        () => { loadPins() }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(orderSub)
      supabase.removeChannel(pinsSub)
    }
  }, [phase, orderId, loadPins])

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

    await supabase.from("order_pins").insert({
      order_id: orderId,
      x: pendingPin.x,
      y: pendingPin.y,
      page: 1,
      title: pinTitle.trim(),
      description: pinDesc.trim() || null,
      author_name: clientName,
    })

    setPendingPin(null)
    setPinTitle("")
    setPinDesc("")
    setSavingPin(false)
    await loadPins()
  }

  async function handleResolvePin(pinId: string) {
    await supabase.from("order_pins").update({ resolved: true }).eq("id", pinId)
    await loadPins()
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
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    })
  }

  // ── Auth screen ──
  if (phase === "auth") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#171615] p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-base">Order Portal</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Enter your details to view this order.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="portal-name">Your Name *</Label>
                <Input
                  id="portal-name"
                  placeholder="John Doe"
                  value={clientName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClientName(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="portal-pass">Password</Label>
                <Input
                  id="portal-pass"
                  type="password"
                  placeholder="Enter access password"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                />
              </div>
              {authError && <p className="text-sm text-destructive">{authError}</p>}
              <Button type="submit" isDisabled={loading}>
                {loading ? "Loading..." : "View Order"}
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
    <div className="min-h-screen bg-[#171615] flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-border/40 px-6 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-medium text-foreground">{order.title}</h1>
          <Badge
            variant="secondary"
            className="border-0 text-[11px] px-2 py-0.5"
            style={{ backgroundColor: status.bg, color: status.color }}
          >
            {status.label}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">
          Viewing as <span className="text-foreground font-medium">{clientName}</span>
        </span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main — file viewer */}
        <div className="flex-1 overflow-y-auto p-6 flex justify-center">
          <div className="w-full max-w-4xl flex flex-col gap-6">

            {/* Order info */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <InfoBlock label="Client" value={order.client_name || "—"} />
              <InfoBlock label="Price" value={order.value > 0 ? `$${order.value.toLocaleString()}` : "—"} />
              <InfoBlock label="Deadline" value={formatDate(order.deadline)} />
              <InfoBlock label="Created" value={formatDate(order.created_at)} />
            </div>

            {/* Notes */}
            {order.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Notes</CardTitle>
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
                  <CardTitle className="text-sm">File</CardTitle>
                  <p className="text-xs text-muted-foreground">Click on the file to leave a comment.</p>
                </CardHeader>
                <CardContent>
                  {order.file_url.endsWith(".pdf") ? (
                    <PDFViewer
                      url={order.file_url}
                      onPageClick={(x, y, pg) => { setPendingPin({ x, y }); setPinTitle(""); setPinDesc(""); setSelectedPinId(null) }}
                      overlay={
                        <>
                          {pins.filter((p) => !p.resolved).map((pin, i) => (
                            <button
                              key={pin.id}
                              onClick={(e) => { e.stopPropagation(); setSelectedPinId(pin.id === selectedPinId ? null : pin.id); setPendingPin(null) }}
                              className={`absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center text-[10px] font-bold transition-transform hover:scale-110 z-10 ${
                                pin.id === selectedPinId
                                  ? "bg-[#4e99a3] text-white ring-2 ring-[#4e99a3]/40"
                                  : "bg-[#4e99a3]/90 text-white"
                              }`}
                              style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                            >
                              {i + 1}
                            </button>
                          ))}
                          {pendingPin && (
                            <div
                              className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#c09a5a] text-white flex items-center justify-center text-[10px] font-bold animate-pulse z-10"
                              style={{ left: `${pendingPin.x}%`, top: `${pendingPin.y}%` }}
                            >
                              +
                            </div>
                          )}
                        </>
                      }
                    />
                  ) : (
                    <div
                      ref={fileContainerRef}
                      className="relative w-full rounded-lg border border-border/50 overflow-hidden bg-black/20 cursor-crosshair"
                      onClick={handleFileClick}
                    >
                      <img
                        src={order.file_url}
                        alt={order.title}
                        className="w-full object-contain pointer-events-none"
                      />
                      {pins.filter((p) => !p.resolved).map((pin, i) => (
                        <button
                          key={pin.id}
                          onClick={(e) => { e.stopPropagation(); setSelectedPinId(pin.id === selectedPinId ? null : pin.id); setPendingPin(null) }}
                          className={`absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center text-[10px] font-bold transition-transform hover:scale-110 ${
                            pin.id === selectedPinId
                              ? "bg-[#4e99a3] text-white ring-2 ring-[#4e99a3]/40"
                              : "bg-[#4e99a3]/90 text-white"
                          }`}
                          style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                        >
                          {i + 1}
                        </button>
                      ))}
                      {pendingPin && (
                        <div
                          className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#c09a5a] text-white flex items-center justify-center text-[10px] font-bold animate-pulse"
                          style={{ left: `${pendingPin.x}%`, top: `${pendingPin.y}%` }}
                        >
                          +
                        </div>
                      )}
                    </div>
                  )}

                  {/* New pin form */}
                  {pendingPin && (
                    <div className="mt-4 rounded-lg border border-border/40 p-4 flex flex-col gap-3">
                      <p className="text-xs font-medium text-foreground">New Comment</p>
                      <Input
                        placeholder="Title *"
                        value={pinTitle}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPinTitle(e.target.value)}
                        className="text-sm"
                      />
                      <Textarea
                        placeholder="Description (optional)"
                        value={pinDesc}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPinDesc(e.target.value)}
                        rows={2}
                        className="text-sm"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onPress={() => setPendingPin(null)}>Cancel</Button>
                        <Button size="sm" onPress={handleSavePin} isDisabled={savingPin || !pinTitle.trim()}>
                          {savingPin ? "Saving..." : "Add Pin"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Selected pin detail */}
                  {selectedPin && !pendingPin && (
                    <div className="mt-4 rounded-lg border border-border/40 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{selectedPin.title}</p>
                          {selectedPin.description && (
                            <p className="text-xs text-muted-foreground mt-1">{selectedPin.description}</p>
                          )}
                          <p className="text-[11px] text-muted-foreground/60 mt-2">
                            by {selectedPin.author_name} &middot; {formatDate(selectedPin.created_at)}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onPress={() => handleResolvePin(selectedPin.id)}
                          className="shrink-0 text-xs"
                        >
                          Resolve
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* No file */}
            {!order.file_url && (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-sm text-muted-foreground">No file uploaded yet.</p>
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
                  Request Changes
                </span>
              </Button>
              <Button
                onPress={() => handleAction("approved")}
                isDisabled={actionLoading || order.status === "approved"}
                className="px-6 bg-[#5a9c6a] hover:bg-[#4a8c5a] text-white"
              >
                <span className="flex items-center gap-2">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 8.5l3 3 7-7" />
                  </svg>
                  Approve
                </span>
              </Button>
            </div>

          </div>
        </div>

        {/* Right sidebar — pins list */}
        <aside className="hidden w-[280px] shrink-0 border-l border-border/40 lg:flex flex-col overflow-y-auto">
          <div className="p-4 border-b border-border/40">
            <h2 className="text-sm font-medium text-foreground">Comments ({pins.filter((p) => !p.resolved).length})</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {pins.filter((p) => !p.resolved).length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">No comments yet.<br />Click on the file to add one.</p>
            )}
            {pins.filter((p) => !p.resolved).map((pin, i) => (
              <button
                key={pin.id}
                onClick={() => { setSelectedPinId(pin.id === selectedPinId ? null : pin.id); setPendingPin(null) }}
                className={`flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors ${
                  pin.id === selectedPinId ? "bg-white/[.06]" : "hover:bg-white/[.03]"
                }`}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#4e99a3]/90 text-[10px] font-bold text-white mt-0.5">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">{pin.title}</p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {pin.author_name} &middot; {new Date(pin.created_at).toLocaleDateString()}
                  </p>
                </div>
              </button>
            ))}

            {/* Resolved */}
            {pins.filter((p) => p.resolved).length > 0 && (
              <>
                <div className="border-t border-border/40 mt-2 pt-3">
                  <p className="text-[11px] text-muted-foreground/50 px-1 mb-1">Resolved</p>
                </div>
                {pins.filter((p) => p.resolved).map((pin) => (
                  <div key={pin.id} className="flex items-start gap-2.5 rounded-lg px-3 py-2 opacity-40">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground mt-0.5">
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 8.5l3 3 7-7" />
                      </svg>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground line-through truncate">{pin.title}</p>
                      <p className="text-[11px] text-muted-foreground/60 truncate mt-0.5">{pin.author_name}</p>
                    </div>
                  </div>
                ))}
              </>
            )}
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
