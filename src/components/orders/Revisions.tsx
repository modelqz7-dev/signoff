"use client"

import { useEffect, useRef, useState } from "react"
import type { PDFDocumentProxy } from "pdfjs-dist"
import { CheckIcon, ColumnsIcon, RotateCcwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PinGlyph } from "@/components/orders/pins"
import { usePinNumbers, type FixStatus, type Pin } from "@/lib/pins"
import { useT } from "@/lib/i18n"
import { cn, isPdfUrl } from "@/lib/utils"

// "What changed in version N": when the workshop uploads a new version it answers each comment
// left on the previous one (fixed, or left as is, with an optional note). The client sees those
// answers next to a before / after view of the very spot, and can reopen anything that isn't
// done. So "we fixed it" is something the client can check, not take on trust.

export type FixAnswer = { status: Exclude<FixStatus, "reopened">; reply: string }

const STATUS_LABEL: Record<FixStatus | "none", string> = {
  fixed: "Fixed",
  kept: "Not changed",
  reopened: "Reopened by the client",
  none: "No answer yet",
}

function StatusChip({ status }: { status: FixStatus | null | undefined }) {
  const { t } = useT()
  const s = status ?? "none"
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap",
        s === "fixed" ? "bg-foreground text-background" : s === "reopened" ? "bg-destructive/12 text-destructive" : "bg-muted text-muted-foreground"
      )}
    >
      {s === "fixed" && <CheckIcon className="size-3" strokeWidth={3} />}
      {t(STATUS_LABEL[s])}
    </span>
  )
}

/** "3 of 4 comments fixed" */
function summary(pins: Pin[], t: ReturnType<typeof useT>["t"]) {
  const answered = pins.filter((p) => p.fix_status)
  if (!answered.length) return t("No answers yet.")
  const fixed = pins.filter((p) => p.fix_status === "fixed").length
  return t("{fixed} of {total} comments fixed", { fixed, total: pins.length })
}

// ── The workshop: answer the comments when uploading a version ──

export function FixesDialog({
  open,
  onOpenChange,
  version,
  pins,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The new version these answers come with. */
  version: number
  /** Comments left on the version before it. */
  pins: Pin[]
  onSave: (answers: Record<string, FixAnswer>) => Promise<void>
}) {
  const { t } = useT()
  const numbers = usePinNumbers(pins)
  const [answers, setAnswers] = useState<Record<string, FixAnswer>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Start from what was answered before; open comments default to "fixed".
  const [seeded, setSeeded] = useState(false)
  if (open && !seeded) {
    setSeeded(true)
    setAnswers(Object.fromEntries(pins.map((p) => [p.id, {
      status: p.fix_status === "kept" ? "kept" : "fixed",
      reply: p.reply ?? "",
    } satisfies FixAnswer])))
  }
  if (!open && seeded) setSeeded(false)

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await onSave(answers)
      onOpenChange(false)
    } catch (e) {
      setError((e as Error)?.message || t("Something went wrong"))
    }
    setSaving(false)
  }

  return (
    <Dialog isOpen={open} onOpenChange={onOpenChange} className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{t("What changed in version {n}?", { n: version })}</DialogTitle>
        <DialogDescription>
          {t("Answer each comment from the previous version. The client sees your answers next to a before / after view of the spot.")}
        </DialogDescription>
      </DialogHeader>

      <div className="-mx-1 flex max-h-[55vh] flex-col divide-y divide-border/60 overflow-y-auto px-1">
        {pins.map((pin) => {
          const a = answers[pin.id] ?? { status: "fixed", reply: "" }
          const set = (patch: Partial<FixAnswer>) => setAnswers((prev) => ({ ...prev, [pin.id]: { ...a, ...patch } }))
          return (
            <div key={pin.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
              <div className="flex items-start gap-2.5">
                <PinGlyph label={numbers.get(pin.id)} className="mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{pin.title}</p>
                  {pin.description && <p className="text-xs text-muted-foreground">{pin.description}</p>}
                  {pin.fix_status === "reopened" && <p className="mt-0.5 text-xs text-destructive">{t("The client said this isn't done yet.")}</p>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 pl-7.5">
                <div role="radiogroup" aria-label={pin.title} className="flex rounded-lg bg-muted p-0.5">
                  {(["fixed", "kept"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      role="radio"
                      aria-checked={a.status === s}
                      onClick={() => set({ status: s })}
                      className={cn("h-7 rounded-md px-2.5 text-xs font-medium transition-colors", a.status === s ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                    >
                      {t(STATUS_LABEL[s])}
                    </button>
                  ))}
                </div>
                <input
                  value={a.reply}
                  onChange={(e) => set({ reply: e.target.value.slice(0, 1000) })}
                  placeholder={a.status === "fixed" ? t("Note for the client (optional)") : t("Why it stays as is (optional)")}
                  aria-label={t("Note for the client (optional)")}
                  className="h-8 min-w-0 flex-1 basis-48 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
            </div>
          )
        })}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
      <DialogFooter>
        <Button variant="outline" onPress={() => onOpenChange(false)} isDisabled={saving}>{t("Later")}</Button>
        <Button onPress={save} isDisabled={saving}>{saving ? t("Saving...") : t("Save and show the client")}</Button>
      </DialogFooter>
    </Dialog>
  )
}

/** The workshop's view of its answers on the order page, with a way to change them. */
export function MakerChangesCard({ version, pins, onEdit }: { version: number; pins: Pin[]; onEdit: () => void }) {
  const { t } = useT()
  const numbers = usePinNumbers(pins)
  if (!pins.length) return null
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("Changes in version {n}", { n: version })}</CardTitle>
        <CardDescription className="text-xs">{summary(pins, t)}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {pins.map((pin) => (
          <div key={pin.id} className="flex items-start gap-2.5">
            <PinGlyph label={numbers.get(pin.id)} size="sm" className="mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground">{pin.title}</p>
              {pin.reply && <p className="truncate text-[11px] text-muted-foreground">{pin.reply}</p>}
            </div>
            <StatusChip status={pin.fix_status} />
          </div>
        ))}
        <Button variant="outline" size="sm" onPress={onEdit} className="mt-1 self-start">
          {pins.some((p) => p.fix_status) ? t("Edit answers") : t("Answer the comments")}
        </Button>
      </CardContent>
    </Card>
  )
}

// ── The client: see the answers and check them ──

export function ClientChangesCard({
  version,
  pins,
  previousUrl,
  currentUrl,
  onReopen,
}: {
  version: number
  /** Comments the client left on the previous version. */
  pins: Pin[]
  previousUrl: string | null
  currentUrl: string | null
  /** true: "this isn't done", false: "it's fine after all". */
  onReopen: (pin: Pin, reopen: boolean) => void
}) {
  const { t } = useT()
  const numbers = usePinNumbers(pins)
  const [comparing, setComparing] = useState<Pin | null>(null)
  if (!pins.length) return null

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("What changed in version {n}", { n: version })}</CardTitle>
        <CardDescription className="text-xs">
          {pins.some((p) => p.fix_status)
            ? `${summary(pins, t)}. ${t("Compare each spot before and after.")}`
            : t("The workshop hasn't answered your comments yet. You can still compare each spot.")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col divide-y divide-border/60">
        {pins.map((pin) => (
          <div key={pin.id} className="flex flex-col gap-2 py-2.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-start gap-2.5">
              <PinGlyph label={numbers.get(pin.id)} className="mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="text-sm font-medium text-foreground">{pin.title}</p>
                  <StatusChip status={pin.fix_status} />
                </div>
                {pin.reply && (
                  <p className="mt-1 border-l-2 border-foreground/20 pl-2 text-xs text-muted-foreground">{pin.reply}</p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 pl-7.5 sm:pl-0">
              {previousUrl && currentUrl && (
                <Button variant="outline" size="sm" onPress={() => setComparing(pin)}>
                  <ColumnsIcon />
                  {t("Before / after")}
                </Button>
              )}
              {pin.fix_status === "fixed" && (
                <Button variant="ghost" size="sm" onPress={() => onReopen(pin, true)}>{t("Not done?")}</Button>
              )}
              {pin.fix_status === "reopened" && (
                <Button variant="ghost" size="sm" onPress={() => onReopen(pin, false)}>
                  <RotateCcwIcon />
                  {t("It's fine")}
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>

      {comparing && previousUrl && currentUrl && (
        <CompareDialog
          pin={comparing}
          number={numbers.get(comparing.id)}
          version={version}
          previousUrl={previousUrl}
          currentUrl={currentUrl}
          onClose={() => setComparing(null)}
        />
      )}
    </Card>
  )
}

function CompareDialog({ pin, number, version, previousUrl, currentUrl, onClose }: {
  pin: Pin
  number?: number
  version: number
  previousUrl: string
  currentUrl: string
  onClose: () => void
}) {
  const { t } = useT()
  return (
    <Dialog isOpen onOpenChange={(v) => !v && onClose()} className="sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <PinGlyph label={number} />
          {pin.title}
        </DialogTitle>
        <DialogDescription>
          {pin.reply ? pin.reply : t("The same spot on both versions, page {n}.", { n: pin.page })}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        <figure className="flex flex-col gap-1.5">
          <figcaption className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{t("Before · version {n}", { n: version - 1 })}</figcaption>
          <SpotCrop url={previousUrl} page={pin.page} x={pin.x} y={pin.y} />
        </figure>
        <figure className="flex flex-col gap-1.5">
          <figcaption className="text-[11px] font-medium tracking-wide text-foreground uppercase">{t("After · version {n}", { n: version })}</figcaption>
          <SpotCrop url={currentUrl} page={pin.page} x={pin.x} y={pin.y} />
        </figure>
      </div>
    </Dialog>
  )
}

// ── Zoomed view of one spot of a file (image or PDF page) ──

const pdfDocs = new Map<string, Promise<PDFDocumentProxy>>()

function loadPdf(url: string) {
  const key = url.split("?")[0]
  let doc = pdfDocs.get(key)
  if (!doc) {
    doc = import("pdfjs-dist").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"
      return pdfjs.getDocument({ url, disableAutoFetch: true }).promise
    })
    doc.catch(() => pdfDocs.delete(key))
    pdfDocs.set(key, doc)
  }
  return doc
}

async function sourceOf(url: string, page: number): Promise<CanvasImageSource & { width: number; height: number }> {
  if (isPdfUrl(url)) {
    const doc = await loadPdf(url)
    const p = await doc.getPage(Math.min(Math.max(page, 1), doc.numPages))
    const base = p.getViewport({ scale: 1 })
    const viewport = p.getViewport({ scale: Math.min(2400 / base.width, 4) })
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    await p.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise
    return canvas
  }
  const img = new Image()
  img.src = url
  await img.decode()
  return Object.assign(img, { width: img.naturalWidth, height: img.naturalHeight })
}

/** A 4:3 window on the file, zoomed in on (x, y) in % of the page, with the spot circled. */
function SpotCrop({ url, page, x, y, zoom = 3 }: { url: string; page: number; x: number; y: number; zoom?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<"loading" | "ready" | "error">("loading")

  useEffect(() => {
    let cancelled = false
    sourceOf(url, page)
      .then((src) => {
        const canvas = ref.current
        if (cancelled || !canvas) return
        const W = (canvas.width = 1200)
        const H = (canvas.height = 900)
        const sw = Math.min(src.width / zoom, src.width)
        const sh = Math.min(sw * (H / W), src.height)
        const cx = (x / 100) * src.width
        const cy = (y / 100) * src.height
        const sx = Math.min(Math.max(cx - sw / 2, 0), src.width - sw)
        const sy = Math.min(Math.max(cy - sh / 2, 0), src.height - sh)
        const ctx = canvas.getContext("2d")!
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, W, H)
        ctx.drawImage(src, sx, sy, sw, sh, 0, 0, W, H)
        // the spot the comment points at
        const px = ((cx - sx) / sw) * W
        const py = ((cy - sy) / sh) * H
        ctx.lineWidth = 6
        ctx.strokeStyle = "rgba(255,255,255,0.9)"
        ctx.beginPath(); ctx.arc(px, py, 46, 0, Math.PI * 2); ctx.stroke()
        ctx.lineWidth = 3
        ctx.strokeStyle = "rgba(20,20,20,0.85)"
        ctx.beginPath(); ctx.arc(px, py, 46, 0, Math.PI * 2); ctx.stroke()
        setState("ready")
      })
      .catch(() => { if (!cancelled) setState("error") })
    return () => { cancelled = true }
  }, [url, page, x, y, zoom])

  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/10">
      <canvas ref={ref} className={cn("size-full transition-opacity", state === "ready" ? "opacity-100" : "opacity-0")} />
      {state !== "ready" && (
        <span className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
          {state === "loading" ? <span className="size-5 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground/60" /> : "—"}
        </span>
      )}
    </div>
  )
}
