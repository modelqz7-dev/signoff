"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist"
import { ChevronLeftIcon, ChevronRightIcon, MinusIcon, PlusIcon, XIcon, ZoomInIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogTitle } from "@/components/ui/dialog"
import { PinComposer, PinDetails, PinList, PinMarker, PinOutlineIcon, PinPopover } from "@/components/orders/pins"
import { usePinNumbers, type NewPin, type Pin } from "@/lib/pins"
import { useT } from "@/lib/i18n"

type PDFViewerProps = {
  url: string
  className?: string
  /** Comments to show on the pages, positioned in % of the page. */
  pins?: Pin[]
  /** When set, clicking a page in the viewer lets the user add a comment there. */
  onAddPin?: (pin: NewPin) => Promise<void>
  onToggleResolved?: (pin: Pin) => void
  /** Drag-to-move and delete, for pins where `canEdit` returns true (all pins if omitted). */
  onMovePin?: (pin: Pin, x: number, y: number) => void
  onDeletePin?: (pin: Pin) => Promise<void>
  canEdit?: (pin: Pin) => boolean
  /** Open the viewer on this pin's page with the pin selected (change `nonce` to repeat). */
  focusPin?: { id: string; nonce: number } | null
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
  className,
  pins = [],
  onAddPin,
  onToggleResolved,
  onMovePin,
  onDeletePin,
  canEdit = () => true,
  focusPin,
}: PDFViewerProps) {
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const modalCanvasRef = useRef<HTMLCanvasElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const scaleRef = useRef(1)
  const anchorRef = useRef<{ left: number; top: number } | null>(null)
  const dragRef = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null)
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
  const [open, setOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [pending, setPending] = useState<{ x: number; y: number } | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const scrollToPinRef = useRef<string | null>(null)

  const numbers = usePinNumbers(pins)
  const { t } = useT()
  const pagePins = pins.filter((p) => p.page === page)
  const selectedPin = pagePins.find((p) => p.id === selectedId) || null

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const pdfjsLib = await import("pdfjs-dist")
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
        const doc = await pdfjsLib.getDocument(url).promise
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

  // Preview: first page rendered at the card's real pixel width so it stays sharp on HiDPI screens.
  useEffect(() => {
    const canvas = previewCanvasRef.current
    if (!pdf || !canvas) return
    let cancelled = false
    let task: RenderTask | null = null
    async function render() {
      try {
        const pageObj = await pdf!.getPage(1)
        if (cancelled || !canvas) return
        const base = pageObj.getViewport({ scale: 1 })
        const cssWidth = canvas.parentElement?.clientWidth || base.width
        const s = capScale((cssWidth / base.width) * (window.devicePixelRatio || 1), base.width, base.height)
        const viewport = pageObj.getViewport({ scale: s })
        canvas.width = Math.round(viewport.width)
        canvas.height = Math.round(viewport.height)
        task = pageObj.render({ canvasContext: canvas.getContext("2d")!, viewport })
        await task.promise
      } catch (e) {
        if (!isCancelled(e) && !cancelled) console.error("PDF preview error:", e)
      }
    }
    render()
    return () => {
      cancelled = true
      task?.cancel()
    }
  }, [pdf])

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
    const ratio = next / prev
    anchorRef.current = {
      left: (el.scrollLeft + px - PAD) * ratio - px + PAD,
      top: (el.scrollTop + py - PAD) * ratio - py + PAD,
    }
    scaleRef.current = next
    setScale(next)
  }

  useLayoutEffect(() => {
    scaleRef.current = scale
    const el = scrollRef.current
    if (el && anchorRef.current) {
      el.scrollLeft = anchorRef.current.left
      el.scrollTop = anchorRef.current.top
      anchorRef.current = null
    }
  }, [scale])

  function goToPage(p: number) {
    setPage(Math.min(Math.max(p, 1), totalPages))
    setPending(null)
    scrollRef.current?.scrollTo({ left: 0, top: 0 })
  }

  function selectPin(pin: Pin) {
    setPending(null)
    setSelectedId(pin.id)
    setPage(pin.page)
    scrollToPinRef.current = pin.id
  }

  // Bring a pin picked from the list into view when zoomed in.
  useLayoutEffect(() => {
    const el = scrollRef.current
    const pin = pins.find((p) => p.id === scrollToPinRef.current)
    if (!el || !pin || pin.page !== page || !cssW) return
    el.scrollLeft = PAD + (pin.x / 100) * cssW - el.clientWidth / 2
    el.scrollTop = PAD + (pin.y / 100) * cssH - el.clientHeight / 2
    scrollToPinRef.current = null
  }, [pins, page, cssW, cssH, selectedId])

  useEffect(() => {
    const el = scrollRef.current
    if (!open || !el) return
    function onWheel(e: WheelEvent) {
      e.preventDefault()
      const rect = el!.getBoundingClientRect()
      const factor = Math.exp(-e.deltaY * 0.0015)
      zoomTo(scaleRef.current * factor, e.clientX - rect.left, e.clientY - rect.top)
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if ((e.target as HTMLElement | null)?.closest?.("input, textarea, [contenteditable=true]")) return
      if (e.key === "ArrowLeft") { setPage((p) => Math.max(p - 1, 1)); setPending(null) }
      else if (e.key === "ArrowRight") { setPage((p) => Math.min(p + 1, totalPages)); setPending(null) }
      else if (e.key === "+" || e.key === "=") zoomTo(scaleRef.current * 1.25)
      else if (e.key === "-") zoomTo(scaleRef.current / 1.25)
      else if (e.key === "0") zoomTo(1)
      else return
      e.preventDefault()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, totalPages])

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const el = scrollRef.current
    if (!el || e.button !== 0) return
    // Don't start panning from the comment form or markers.
    pressOnPinUiRef.current = !!(e.target as HTMLElement).closest("[data-pin-ui]")
    if (pressOnPinUiRef.current) return
    dragRef.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop, moved: false }
    draggedRef.current = false
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
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

  function onPointerUp() {
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
    // First click outside an open comment just closes it.
    if (selectedId) { setSelectedId(null); return }
    if (!onAddPin) return
    const rect = e.currentTarget.getBoundingClientRect()
    setPending({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    })
  }

  async function savePending(title: string, description: string) {
    if (!pending || !onAddPin) return
    await onAddPin({ x: pending.x, y: pending.y, page, title, description: description || null })
    setPending(null)
  }

  function openModal(pinId?: string) {
    const pin = pins.find((p) => p.id === pinId)
    setScale(1)
    setRenderScale(1)
    setPage(pin?.page ?? 1)
    setPageSize(null)
    setPending(null)
    setSelectedId(pin?.id ?? null)
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

  if (!totalPages) {
    return (
      <div className={`flex items-center justify-center py-12 ${className || ""}`}>
        <p className="text-sm text-muted-foreground">{t("Loading PDF...")}</p>
      </div>
    )
  }

  return (
    <>
      <div
        className={`relative rounded-lg border border-border overflow-hidden bg-white cursor-pointer group ${className || ""}`}
        onClick={() => openModal()}
      >
        <canvas ref={previewCanvasRef} className="w-full block" />
        {pins.filter((p) => p.page === 1 && !p.resolved).map((pin) => (
          <PinMarker key={pin.id} pin={pin} number={numbers.get(pin.id) ?? ""} small />
        ))}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
          <div className="rounded-full bg-black/60 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <ZoomInIcon className="size-6 text-white" />
          </div>
        </div>
        {totalPages > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[11px] px-2 py-0.5 rounded">
            {t("{n} pages", { n: totalPages })}
          </div>
        )}
        {pins.some((p) => !p.resolved) && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 text-white text-[11px] px-2 py-0.5 rounded">
            <PinOutlineIcon className="size-3" />
            {pins.filter((p) => !p.resolved).length}
          </div>
        )}
      </div>

      <Dialog
        isOpen={open}
        onOpenChange={setOpen}
        showCloseButton={false}
        className="flex h-[94vh] w-[1400px] max-w-[96vw] flex-col gap-0 overflow-hidden p-0 shadow-2xl sm:max-w-[96vw] data-entering:duration-300 data-entering:ease-out data-entering:slide-in-from-bottom-6 [&>[data-slot=dialog]]:h-full [&>[data-slot=dialog]]:min-h-0 [&>[data-slot=dialog]]:flex-col [&>[data-slot=dialog]]:gap-0"
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
            className={`min-h-0 min-w-0 flex-1 overflow-auto bg-background outline-none select-none ${dragging ? "cursor-grabbing" : scale > 1 && !onAddPin ? "cursor-grab" : ""}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <div className="flex min-h-full min-w-full w-max items-center justify-center" style={{ padding: PAD }}>
              <div
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
                    onSelect={() => { setPending(null); setSelectedId(pin.id === selectedId ? null : pin.id) }}
                    onMove={onMovePin && canEdit(pin) ? (x, y) => onMovePin(pin, x, y) : undefined}
                  />
                ))}
                {pending && (
                  <>
                    <PinMarker pin={{ ...pending, resolved: false }} pending />
                    <PinPopover x={pending.x} y={pending.y}>
                      <PinComposer onSave={savePending} onCancel={() => setPending(null)} />
                    </PinPopover>
                  </>
                )}
                {selectedPin && !pending && (
                  <PinPopover x={selectedPin.x} y={selectedPin.y}>
                    <PinDetails
                      key={selectedPin.id}
                      pin={selectedPin}
                      number={numbers.get(selectedPin.id) ?? 0}
                      onToggleResolved={onToggleResolved ? () => onToggleResolved(selectedPin) : undefined}
                      onDelete={onDeletePin && canEdit(selectedPin) ? () => onDeletePin(selectedPin) : undefined}
                    />
                  </PinPopover>
                )}
              </div>
            </div>
          </div>

          <aside className="hidden w-72 shrink-0 flex-col border-l border-border md:flex">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-medium">{t("Comments ({n})", { n: pins.filter((p) => !p.resolved).length })}</p>
              {onAddPin && <p className="mt-0.5 text-xs text-muted-foreground">{t("Click on the page to add one, drag a pin to move it.")}</p>}
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <PinList pins={pins} numbers={numbers} selectedId={selectedId} onSelect={selectPin} />
            </div>
          </aside>
        </div>
      </Dialog>
    </>
  )
}
