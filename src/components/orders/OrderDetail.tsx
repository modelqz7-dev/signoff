"use client"

import { useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Order } from "@/components/dashboard/types"
import { STATUS_MAP } from "@/components/dashboard/types"
import { DeleteOrderButton } from "@/components/orders/DeleteOrderButton"

type OrderDetailProps = {
  order: Order
  onUpdated?: (order: Order) => void
  onDeleted?: (order: Order) => void
}

export function OrderDetail({ order, onUpdated, onDeleted }: OrderDetailProps) {
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const status = STATUS_MAP[order.status]

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)

    const ext = file.name.split(".").pop()
    const path = `${order.shop_id}/${Date.now()}.${ext}`
    const { error: uploadErr } = await supabase.storage
      .from("order-files")
      .upload(path, file)

    if (!uploadErr) {
      const { data: urlData } = supabase.storage
        .from("order-files")
        .getPublicUrl(path)

      const { data, error } = await supabase
        .from("orders")
        .update({ file_url: urlData.publicUrl })
        .eq("id", order.id)
        .select()
        .single()

      if (!error && data) {
        onUpdated?.(data as Order)
      }
    }
    setUploading(false)
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    })
  }

  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-medium text-foreground">{order.title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {order.client_name}
            {order.client_email && <span> &middot; {order.client_email}</span>}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Badge
            variant="secondary"
            className="border-0 text-xs px-2.5 py-1"
            style={{ backgroundColor: status.bg, color: status.color }}
          >
            {status.label}
          </Badge>
          {onDeleted && <DeleteOrderButton order={order} onDeleted={() => onDeleted(order)} />}
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-4">
        <InfoBlock label="Price" value={order.value > 0 ? `$${order.value.toLocaleString()}` : "—"} />
        <InfoBlock label="Deadline" value={formatDate(order.deadline)} />
        <InfoBlock label="Created" value={formatDate(order.created_at)} />
        <InfoBlock label="Status" value={status.label} color={status.color} />
      </div>

      {/* Notes */}
      {order.notes && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* File / PDF */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">File</CardTitle>
        </CardHeader>
        <CardContent>
          {order.file_url ? (
            <div className="flex flex-col gap-4">
              {/* PDF preview */}
              {order.file_url.endsWith(".pdf") ? (
                <div className="w-full rounded-lg border border-border/50 overflow-hidden bg-black/20">
                  <iframe
                    src={order.file_url}
                    className="w-full h-[500px]"
                    title="Order PDF"
                  />
                </div>
              ) : (
                <div className="w-full rounded-lg border border-border/50 overflow-hidden bg-black/20 flex items-center justify-center">
                  <img
                    src={order.file_url}
                    alt={order.title}
                    className="max-w-full max-h-[500px] object-contain"
                  />
                </div>
              )}

              <div className="flex items-center gap-3">
                <a
                  href={order.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#4e99a3] hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" className="h-3.5 w-3.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 2v8M5 7l3 3 3-3" />
                    <path d="M2 11v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2" />
                  </svg>
                  Download
                </a>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Replace file
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full flex flex-col items-center gap-3 rounded-lg border border-dashed border-border/60 py-8 text-muted-foreground transition-colors hover:bg-white/[.03] hover:text-foreground hover:border-[#4e99a3]/40"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" className="h-8 w-8 opacity-50" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 10V2M5 5l3-3 3 3" />
                <path d="M2 11v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2" />
              </svg>
              <span className="text-sm">
                {uploading ? "Uploading..." : "Upload PDF or image"}
              </span>
              <span className="text-xs opacity-60">PDF, PNG, JPG</span>
            </button>
          )}

          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileUpload}
            className="hidden"
          />
        </CardContent>
      </Card>
    </div>
  )
}

function InfoBlock({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium" style={color ? { color } : undefined}>
        {value}
      </span>
    </div>
  )
}
