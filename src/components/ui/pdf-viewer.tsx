"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist"
import { ChevronLeftIcon, ChevronRightIcon, MinusIcon, PlusIcon, XIcon, Maximize2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogTitle } from "@/components/ui/dialog"
import { PinMarker, PinOutlineIcon } from "@/components/orders/pins"
import { usePinNumbers, type NewPin, type Pin } from "@/lib/pins"
import { useT } from "@/lib/i18n"
import { fileNameFromUrl } from "@/lib/versions"

type PDFViewerProps = {
  url: string
  /** Shown on the file tile; taken from the URL when omitted. */
  fileName?: string
  className?: string
  /** Comments to show on the pages, positioned in % of the page. */
  pins?: Pin[]
  /**
   * When set, a click on a page puts a numbered pin there right away; what it is about is
   * written afterwards in the comment list, not in the viewer.
   */
  onAddPin?: (pin: NewPin) => Promise<void>
  /** Drag-to-move, for pins where `canEdit` returns true (all pins if omitted). */
  onMovePin?: (pin: Pin, x: number, y: number) => void
  canEdit?: (pin: Pin) => boolean
  /** A pin was tapped: the viewer closes and the page shows that comment in its list. */
  onPinClick?: (pin: Pin) => void
  /** Open the viewer on this pin's page with the pin selected (change `nonce` to repeat). */
  focusPin?: { id: string; nonce: number } | null
  /** Just the full-screen viewer, already open, without the file tile (e.g. an attachment). */
  startOpen?: boolean
  /** Called when the viewer is closed. */
  onClose?: () => void
}

const MIN_SCALE = 0.5
const MAX_SCALE = 5
// Keep canvases under the smallest common browser limits (iOS Safari: 16.7M pixels).
const MAX_CANVAS_DIM = 16384
const MAX_CANVAS_PIXELS = 16_000_000
// Gap between the page and the edges of the viewing area, in CSS px.
const PAD = 16

function capScale(s: number, w: number, h: number) {
  const dim = Math.max(w, h) * s
  if (dim > MAX_CANVAS_DIM) s *= MAX_CANVAS_DIM / dim
  const px = w * h * s * s
  if (px > MAX_CANVAS_PIXELS) s *= Math.sqrt(MAX_CANVAS_PIXELS / px)
  return s
}

function isCancelled(e: unknown) {
  return (e as { name?: string } | null)?.name === "RenderingCancelledException"
}

export function PDFViewer({
  url,
  fileName,
  className,
  pins = [],
  onAddPin,
  onMovePin,
  canEdit = () => true,
  onPinClick,
  focusPin,
  startOpen = false,
  onClose,
}: PDFViewerProps) {
  const modalCanvasRef = useRef<HTMLCanvasElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const scaleRef = useRef(1)
  const pageRef = useRef<HTMLDivElement>(null)
  // Point of the page (as a fraction of its size) that must stay under the cursor / fingers
  // at (px, py) in the viewing area while zooming.
  const anchorRef = useRef<{ fx: number; fy: number; px: number; py: number } | null>(null)
  const dragRef = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null)
  // Fingers on the page (touch pinch-zoom) and the pinch in progress.
  const pointersRef = useRef(new Map<number, { x: number; y: number }>())
  const pinchRef = useRef<{ dist: number; scale: number } | null>(null)
  const draggedRef = useRef(false)
  // A press that started on a marker or comment card must not end up adding a new pin.
  const pressOnPinUiRef = useRef(false)

  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [pageSize, setPageSize] = useState<{ w: number; h: number } | null>(null)
  const [box, setBox] = useState<{ w: number; h: number } | null>(null)
  const [scale, setScale] = useState(1)
  const [renderScale, setRenderScale] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(startOpen)
  const [dragging, setDragging] = useState(false)
  const [adding, setAdding] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // A pin to bring into view once its page is laid out.
  const [scrollToPin, setScrollToPin] = useState<{ id: string } | null>(null)
  const scrolledRef = useRef<{ id: string } | null>(null)

  const numbers = usePinNumbers(pins)
  const { t } = useT()
  const pagePins = pins.filter((p) => p.page === page)
  // Pins put here that still need a few words, oldest first.
  const untitled = pins.filter((p) => !p.title.trim()).sort((a, b) => (numbers.get(a.id) ?? 0) - (numbers.get(b.id) ?? 0))

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const pdfjsLib = await import("pdfjs-dist")
        // Served from /public (scripts/copy-pdf-worker.mjs), always the same version as pdfjs-dist.
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"
        // Fetch only the parts needed for the visible page when the server supports ranges,
        // so the first page shows up sooner on slow mobile connections.
        const doc = await pdfjsLib.getDocument({ url, disableAutoFetch: true }).promise
        if (!cancelled) {
          setPdf(doc)
          setTotalPages(doc.numPages)
        }
      } catch (e) {
        if (!cancelled) setError((e as Error)?.message || "Failed to load PDF")
      }
    }
    load()
    return () => { cancelled = true }
  }, [url])

  // Page size in PDF units, used to fit the whole page into the viewing area.
  useEffect(() => {
    if (!pdf || !open) return
    let cancelled = false
    pdf.getPage(page).then((p) => {
      if (cancelled) return
      const v = p.getViewport({ scale: 1 })
      setPageSize({ w: v.width, h: v.height })
    })
    return () => { cancelled = true }
  }, [pdf, page, open])

  // Track the viewing area size so the page re-fits when the window is resized.
  useEffect(() => {
    const el = scrollRef.current
    if (!open || !el) return
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [open])

  // Scale at which the whole page fits the viewing area ("100%").
  const fit = pageSize && box
    ? Math.max(Math.min((box.w - PAD * 2) / pageSize.w, (box.h - PAD * 2) / pageSize.h), 0.01)
    : 0
  const cssW = pageSize ? pageSize.w * fit * scale : 0
  const cssH = pageSize ? pageSize.h * fit * scale : 0

  // Re-render at full resolution shortly after zoom settles; CSS size handles the instant zoom.
  useEffect(() => {
    const t = setTimeout(() => setRenderScale(scale), 200)
    return () => clearTimeout(t)
  }, [scale])

  useEffect(() => {
    if (!pdf || !open || !fit) return
    let cancelled = false
    let task: RenderTask | null = null
    async function render() {
      try {
        const pageObj = await pdf!.getPage(page)
        if (cancelled || !modalCanvasRef.current) return
        const base = pageObj.getViewport({ scale: 1 })
        const s = capScale(fit * renderScale * (window.devicePixelRatio || 1), base.width, base.height)
        const viewport = pageObj.getViewport({ scale: s })

        // Render off-screen, then swap in, so the old image stays visible while zooming.
        const off = document.createElement("canvas")
        off.width = Math.round(viewport.width)
        off.height = Math.round(viewport.height)
        task = pageObj.render({ canvasContext: off.getContext("2d")!, viewport })
        await task.promise
        if (cancelled || !modalCanvasRef.current) return

        const canvas = modalCanvasRef.current
        canvas.width = off.width
        canvas.height = off.height
        canvas.getContext("2d")!.drawImage(off, 0, 0)
      } catch (e) {
        if (!isCancelled(e) && !cancelled) console.error("PDF render error:", e)
      }
    }
    render()
    return () => {
      cancelled = true
      task?.cancel()
    }
  }, [pdf, page, renderScale, open, fit])

  function zoomTo(next: number, cx?: number, cy?: number) {
    const el = scrollRef.current
    const prev = scaleRef.current
    next = Math.min(Math.max(next, MIN_SCALE), MAX_SCALE)
    if (!el || next === prev) return
    const px = cx ?? el.clientWidth / 2
    const py = cy ?? el.clientHeight / 2
    // Measure where the page really is (it is centered while smaller than the viewing area).
    const pageEl = pageRef.current
    if (pageEl) {
      const area = el.getBoundingClientRect()
      const r = pageEl.getBoundingClientRect()
      anchorRef.current = {
        fx: r.width ? (area.left + px - r.left) / r.width : 0.5,
        fy: r.height ? (area.top + py - r.top) / r.height : 0.5,
        px,
        py,
      }
    }
    scaleRef.current = next
    setScale(next)
  }

  useLayoutEffect(() => {
    scaleRef.current = scale
    const el = scrollRef.current
    const a = anchorRef.current
    if (el && a && cssW) {
      // Where the page starts inside the scrolled content: centered, or at the padding when larger.
      const pageLeft = Math.max((el.clientWidth - cssW) / 2, PAD)
      const pageTop = Math.max((el.clientHeight - cssH) / 2, PAD)
      el.scrollLeft = pageLeft + a.fx * cssW - a.px
      el.scrollTop = pageTop + a.fy * cssH - a.py
      anchorRef.current = null
    }
  }, [scale, cssW, cssH])

  function goToPage(p: number) {
    setPage(Math.min(Math.max(p, 1), totalPages))
    scrollRef.current?.scrollTo({ left: 0, top: 0 })
  }

  // Bring a pin picked from the list into view when zoomed in.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!scrollToPin || scrolledRef.current === scrollToPin) return
    const pin = pins.find((p) => p.id === scrollToPin.id)
    if (!el || !pin || pin.page !== page || !cssW) return
    el.scrollLeft = PAD + (pin.x / 100) * cssW - el.clientWidth / 2
    el.scrollTop = PAD + (pin.y / 100) * cssH - el.clientHeight / 2
    scrolledRef.current = scrollToPin
  }, [pins, page, cssW, cssH, scrollToPin])

  useEffect(() => {
    const el = scrollRef.current
    if (!open || !el) return
    function onWheel(e: WheelEvent) {
      e.preventDefault()
      const rect = el!.getBoundingClientRect()
      const factor = Math.exp(-e.deltaY * 0.0015)
      zoomTo(scaleRef.current * factor, e.clientX - rect.left, e.clientY - rect.top)
    }
    // Safari's own pinch gesture would zoom the whole web page instead of the PDF.
    const stopGesture = (e: Event) => e.preventDefault()
    el.addEventListener("wheel", onWheel, { passive: false })
    el.addEventListener("gesturestart", stopGesture)
    el.addEventListener("gesturechange", stopGesture)
    return () => {
      el.removeEventListener("wheel", onWheel)
      el.removeEventListener("gesturestart", stopGesture)
      el.removeEventListener("gesturechange", stopGesture)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if ((e.target as HTMLElement | null)?.closest?.("input, textarea, [contenteditable=true]")) return
      if (e.key === "ArrowLeft") setPage((p) => Math.max(p - 1, 1))
      else if (e.key === "ArrowRight") setPage((p) => Math.min(p + 1, totalPages))
      else if (e.key === "+" || e.key === "=") zoomTo(scaleRef.current * 1.25)
      else if (e.key === "-") zoomTo(scaleRef.current / 1.25)
      else if (e.key === "0") zoomTo(1)
      else return
      e.preventDefault()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, totalPages])

  function pinchDistance() {
    const [a, b] = [...pointersRef.current.values()]
    return Math.hypot(a.x - b.x, a.y - b.y)
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const el = scrollRef.current
    if (!el || e.button !== 0) return
    if (e.pointerType === "touch") {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointersRef.current.size === 2) {
        // Second finger: pinch-zoom the page instead of panning.
        pinchRef.current = { dist: pinchDistance(), scale: scaleRef.current }
        dragRef.current = null
        draggedRef.current = true
        setDragging(false)
        return
      }
    }
    // Don't start panning from the comment form or markers.
    pressOnPinUiRef.current = !!(e.target as HTMLElement).closest("[data-pin-ui]")
    if (pressOnPinUiRef.current) return
    dragRef.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop, moved: false }
    draggedRef.current = false
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (pointersRef.current.has(e.pointerId)) pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const pinch = pinchRef.current
    if (pinch && pointersRef.current.size >= 2) {
      const el = scrollRef.current
      if (!el) return
      const [a, b] = [...pointersRef.current.values()]
      const rect = el.getBoundingClientRect()
      zoomTo(pinch.scale * (pinchDistance() / pinch.dist), (a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top)
      return
    }
    const d = dragRef.current
    const el = scrollRef.current
    if (!d || !el) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (!d.moved && Math.hypot(dx, dy) > 4) {
      d.moved = true
      setDragging(true)
      el.setPointerCapture(e.pointerId)
    }
    if (d.moved) {
      el.scrollLeft = d.left - dx
      el.scrollTop = d.top - dy
    }
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    pointersRef.current.delete(e.pointerId)
    if (pinchRef.current) {
      // Keep suppressing clicks until the last finger lifts, so a pinch never adds a pin.
      if (pointersRef.current.size < 2) pinchRef.current = null
      dragRef.current = null
      draggedRef.current = true
      return
    }
    draggedRef.current = !!dragRef.current?.moved
    dragRef.current = null
    setDragging(false)
  }

  function handlePageClick(e: React.MouseEvent<HTMLDivElement>) {
    if (draggedRef.current) { draggedRef.current = false; return }
    if (pressOnPinUiRef.current || (e.target as HTMLElement).closest("[data-pin-ui]")) {
      pressOnPinUiRef.current = false
      return
    }
    if (!onAddPin || adding) return
    const rect = e.currentTarget.getBoundingClientRect()
    const at = { x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 }
    setSelectedId(null)
    setAdding(true)
    onAddPin({ x: at.x, y: at.y, page, title: "", description: null })
      .catch((err) => console.error("Pin save error:", err))
      .finally(() => setAdding(false))
  }

  /** Close the viewer and show this comment in the page's list. */
  function showInList(pin: Pin) {
    setOpen(false)
    onClose?.()
    onPinClick?.(pin)
  }

  function openModal(pinId?: string) {
    const pin = pins.find((p) => p.id === pinId)
    setScale(1)
    setRenderScale(1)
    setPage(pin?.page ?? 1)
    setPageSize(null)
    setSelectedId(pin?.id ?? null)
    setScrollToPin(pin ? { id: pin.id } : null)
    setOpen(true)
  }

  // Opening from an external list (e.g. the comments sidebar): react to each new request once.
  const [handledFocus, setHandledFocus] = useState<number | null>(null)
  if (focusPin && totalPages && focusPin.nonce !== handledFocus) {
    setHandledFocus(focusPin.nonce)
    openModal(focusPin.id)
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center py-12 ${className || ""}`}>
        <p className="text-sm text-destructive">{t(error)}</p>
      </div>
    )
  }

  return (
    <>
      {/* A file tile instead of a page preview: a tall drawing at full width pushed everything
          below far down. The whole file opens full screen, with zoom and comments. */}
      {!startOpen && <button
        type="button"
        onClick={() => openModal()}
        disabled={!totalPages}
        className={`group flex w-full items-center gap-3 rounded-lg border border-border bg-muted/40 p-3 text-left transition-colors hover:bg-hover disabled:cursor-default ${className || ""}`}
      >
        <PdfFileIcon className="h-12 w-10 shrink-0" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-medium text-foreground">{fileName || fileNameFromUrl(url) || "PDF"}</span>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            {totalPages ? (totalPages === 1 ? t("1 page") : t("{n} pages", { n: totalPages })) : t("Loading PDF...")}
            {pins.filter((p) => !p.resolved).length > 0 && (
              <span className="inline-flex items-center gap-1">
                <PinOutlineIcon className="size-3" />
                {pins.filter((p) => !p.resolved).length}
              </span>
            )}
          </span>
        </span>
        <span className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-card px-3 text-xs font-medium text-foreground ring-1 ring-foreground/10 transition-colors group-hover:bg-background">
          <Maximize2Icon className="size-3.5" />
          <span className="hidden sm:inline">{t("Open full screen")}</span>
          <span className="sm:hidden">{t("Open")}</span>
        </span>
      </button>}

      <Dialog
        isOpen={open}
        onOpenChange={(v) => { setOpen(v); if (!v) onClose?.() }}
        showCloseButton={false}
        className="flex h-[calc(var(--vvh,100dvh)*0.94)] w-[1400px] max-w-[96vw] flex-col gap-0 overflow-hidden p-0 shadow-2xl sm:max-w-[96vw] data-entering:duration-300 data-entering:ease-out data-entering:slide-in-from-bottom-6 [&>[data-slot=dialog]]:h-full [&>[data-slot=dialog]]:min-h-0 [&>[data-slot=dialog]]:flex-col [&>[data-slot=dialog]]:gap-0"
      >
        <DialogTitle className="sr-only">{t("Document preview")}</DialogTitle>

        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-2 py-1.5">
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon-sm" aria-label={t("Previous page")} onPress={() => goToPage(page - 1)} isDisabled={page <= 1}>
              <ChevronLeftIcon />
            </Button>
            <span className="min-w-14 text-center text-xs tabular-nums text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button variant="ghost" size="icon-sm" aria-label={t("Next page")} onPress={() => goToPage(page + 1)} isDisabled={page >= totalPages}>
              <ChevronRightIcon />
            </Button>
          </div>

          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon-sm" aria-label={t("Zoom out")} onPress={() => zoomTo(scale / 1.25)} isDisabled={scale <= MIN_SCALE}>
              <MinusIcon />
            </Button>
            <Button variant="ghost" size="sm" className="min-w-14 tabular-nums text-muted-foreground" aria-label={t("Fit page")} onPress={() => zoomTo(1)}>
              {Math.round(scale * 100)}%
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label={t("Zoom in")} onPress={() => zoomTo(scale * 1.25)} isDisabled={scale >= MAX_SCALE}>
              <PlusIcon />
            </Button>
          </div>

          <Button variant="ghost" size="icon-sm" aria-label={t("Close")} slot="close">
            <XIcon />
          </Button>
        </div>

        <div className="flex min-h-0 flex-1">
          <div
            ref={scrollRef}
            data-pin-bounds
            // Panning and pinch-zoom are handled here, so the browser must not zoom the web page.
            style={{ touchAction: "none" }}
            className={`min-h-0 min-w-0 flex-1 overflow-auto bg-background outline-none select-none ${dragging ? "cursor-grabbing" : scale > 1 && !onAddPin ? "cursor-grab" : ""}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <div className="flex min-h-full min-w-full w-max items-center justify-center" style={{ padding: PAD }}>
              <div
                ref={pageRef}
                className={`relative shrink-0 ${onAddPin && !dragging ? "cursor-crosshair" : ""}`}
                style={{ width: cssW, height: cssH }}
                onClick={handlePageClick}
              >
                <canvas
                  ref={modalCanvasRef}
                  draggable={false}
                  className="block size-full rounded-sm bg-white shadow-lg ring-1 ring-foreground/10"
                />
                {pagePins.map((pin) => (
                  <PinMarker
                    key={pin.id}
                    pin={pin}
                    number={numbers.get(pin.id) ?? ""}
                    selected={pin.id === selectedId}
                    onSelect={onPinClick ? () => showInList(pin) : undefined}
                    onMove={onMovePin && canEdit(pin) ? (x, y) => onMovePin(pin, x, y) : undefined}
                  />
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Only the file and its pins live here; the words go in the comment list. */}
        {onAddPin && (
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-popover px-4 py-2.5 text-sm">
            <span className="min-w-0 text-muted-foreground">
              {untitled.length
                ? t("Pins without a description: {n}. Describe them in the comment list.", { n: untitled.length })
                : t("Tap the spot that needs a change to put a pin there.")}
            </span>
            {untitled.length > 0 && (
              <Button size="sm" onPress={() => showInList(untitled[0])} className="shrink-0">
                {t("Describe")}
              </Button>
            )}
          </div>
        )}
      </Dialog>
    </>
  )
}

/** A sheet with a folded corner and a red PDF label. */
function PdfFileIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 48" className={className} aria-hidden="true">
      <path d="M6 1h20l11 11v31a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V5a4 4 0 0 1 4-4Z" className="fill-card stroke-foreground/20" strokeWidth="1.5" />
      <path d="M26 1v8a3 3 0 0 0 3 3h8" className="fill-none stroke-foreground/20" strokeWidth="1.5" />
      <rect x="0" y="26" width="28" height="13" rx="3" fill="#e5484d" />
      <text x="14" y="35.5" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#fff" fontFamily="system-ui, sans-serif">PDF</text>
    </svg>
  )
}
