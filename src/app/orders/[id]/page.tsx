"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
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
import { PinList, PinMarker } from "@/components/orders/pins"
import { DeleteOrderButton } from "@/components/orders/DeleteOrderButton"
import { usePinNumbers, usePins, type Pin } from "@/lib/pins"
import { isPdfUrl } from "@/lib/utils"
import { getOrCreateShop } from "@/lib/shop"
import { useT } from "@/lib/i18n"

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

  // Client comments from the portal, updated live.
  // The shop only reviews comments here: moving and deleting pins is left to the client.
  const { pins, setResolved } = usePins(order ? orderId : null)
  const numbers = usePinNumbers(pins)
  const isPdf = isPdfUrl(order?.file_url)

  function handleSelectPin(pin: Pin) {
    if (isPdf) setFocusPin({ id: pin.id, nonce: Date.now() })
  }
  const fileRef = useRef<HTMLInputElement>(null)

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
        setPassword((orderData as Order).password || "")
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
    if (!file || !order) return
    setUploading(true)
    setUploadError(null)

    const ext = file.name.split(".").pop()
    const path = `${order.shop_id}/${Date.now()}.${ext}`
    const { error: uploadErr } = await supabase.storage
      .from("order-files").upload(path, file)

    if (uploadErr) {
      setUploadError(uploadErr.message)
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage
      .from("order-files").getPublicUrl(path)

    const { data, error: updateErr } = await supabase
      .from("orders")
      .update({ file_url: urlData.publicUrl })
      .eq("id", order.id)
      .select().single()

    if (updateErr) {
      setUploadError(updateErr.message)
    } else if (data) {
      setOrder(data as Order)
    }
    setUploading(false)
  }

  async function handleSavePassword() {
    if (!order) return
    setSavingPassword(true)

    const { data } = await supabase
      .from("orders")
      .update({ password: password.trim() })
      .eq("id", order.id)
      .select().single()

    if (data) setOrder(data as Order)
    setSavingPassword(false)
  }

  function getPortalUrl() {
    if (typeof window === "undefined") return ""
    return `${window.location.origin}/portal/${order?.id}`
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(getPortalUrl())
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

        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex gap-6">

            {/* Left — main content, centered */}
            <div className="flex-1 min-w-0 flex justify-center">
            <div className="w-full max-w-2xl flex flex-col gap-6">

              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-lg font-medium text-foreground">{order.title}</h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {order.code}
                  </p>
                </div>
                <div className="flex items-center gap-1">
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

              {/* Info grid */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t("Details")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                    <InfoBlock label={t("Client")} value={order.client_name || "—"} />
                    <InfoBlock label={t("Email")} value={order.client_email || "—"} />
                    <InfoBlock label={t("Contact")} value={order.client_contact || "—"} />
                    <InfoBlock label={t("Price")} value={order.value > 0 ? `$${order.value.toLocaleString()}` : "—"} />
                    <InfoBlock label={t("Deadline")} value={formatDate(order.deadline)} />
                    <InfoBlock label={t("Created")} value={formatDate(order.created_at)} />
                    <InfoBlock label={t("Status")} value={t(status.label)} color={status.color} />
                    <InfoBlock label={t("Stage")} value={order.stage || "—"} />
                    <InfoBlock label={t("Code")} value={order.code} />
                  </div>
                </CardContent>
              </Card>
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

              {/* File / PDF */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t("File")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {order.file_url ? (
                    <div className="flex flex-col gap-4">
                      {isPdf ? (
                        <PDFViewer
                          url={order.file_url}
                          pins={pins}
                          onToggleResolved={(pin) => setResolved(pin.id, !pin.resolved)}
                          focusPin={focusPin}
                        />
                      ) : (
                        <div className="w-full rounded-lg border border-border/50 overflow-hidden bg-muted/60 flex items-center justify-center">
                          <div className="relative">
                            <img src={order.file_url} alt={order.title} className="block max-w-full max-h-[500px] object-contain" />
                            {pins.filter((p) => !p.resolved).map((pin) => (
                              <PinMarker key={pin.id} pin={pin} number={numbers.get(pin.id) ?? ""} small />
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <a
                          href={order.file_url}
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
                        <button
                          onClick={() => fileRef.current?.click()}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {t("Replace file")}
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
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t("Client comments ({n})", { n: pins.filter((p) => !p.resolved).length })}</CardTitle>
                  <CardDescription>
                    {t("Comments left in the client portal appear here instantly.")}{isPdf && " " + t("Click one to open it on the file.")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PinList
                    pins={pins}
                    numbers={numbers}
                    onSelect={isPdf ? handleSelectPin : undefined}
                    emptyText="No comments from the client yet."
                  />
                </CardContent>
              </Card>

            </div>
            </div>

            {/* Right sidebar — Client Portal */}
            <aside className="hidden w-[300px] shrink-0 lg:flex flex-col gap-5 sticky top-0 self-start">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t("Client Portal")}</CardTitle>
                  <CardDescription>{t("Share this link with your client to view and approve.")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs">{t("Portal Link")}</Label>
                      <Input
                        readOnly
                        value={getPortalUrl()}
                        className="text-xs font-mono"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onPress={handleCopyLink}
                        className="w-full mt-1"
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
                    </div>

                    <div className="border-t border-border/40 pt-4 flex flex-col gap-1.5">
                      <Label className="text-xs">{t("Access Password")}</Label>
                      <Input
                        type="text"
                        placeholder={t("Set a password")}
                        value={password}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                        className="text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onPress={handleSavePassword}
                        isDisabled={savingPassword || password === (order.password || "")}
                        className="w-full mt-1"
                      >
                        {savingPassword ? t("Saving...") : t("Save Password")}
                      </Button>
                      <p className="text-[11px] text-muted-foreground/60 mt-1">
                        {order.password
                          ? t("Password is set. Client needs this to access.")
                          : t("No password. Anyone with the link can view.")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </aside>

          </div>
        </div>
      </div>
    </div>
  )
}

function InfoBlock({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-sm font-medium" style={color ? { color } : undefined}>{value}</span>
    </div>
  )
}
