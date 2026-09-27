"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"

type PDFViewerProps = {
  url: string
  className?: string
  onPageClick?: (x: number, y: number, page: number) => void
  overlay?: React.ReactNode
}

const MIN_SCALE = 0.5
const MAX_SCALE = 5
const MAX_CANVAS_DIM = 8192

export function PDFViewer({ url, className, onPageClick, overlay }: PDFViewerProps) {
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const modalCanvasRef = useRef<HTMLCanvasElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const scaleRef = useRef(1)
  const anchorRef = useRef<{ left: number; top: number } | null>(null)
  const dragRef = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null)
  const draggedRef = useRef(false)

  const [pdf, setPdf] = useState<any>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [scale, setScale] = useState(1)
  const [renderScale, setRenderScale] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [dragging, setDragging] = useState(false)

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
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load PDF")
      }
    }
    load()
    return () => { cancelled = true }
  }, [url])

  useEffect(() => {
    if (!pdf || !previewCanvasRef.current) return
    let cancelled = false
    let task: any = null
    async function render() {
      try {
        const pageObj = await pdf.getPage(1)
        if (cancelled || !previewCanvasRef.current) return
        const viewport = pageObj.getViewport({ scale: 1.2 })
        const canvas = previewCanvasRef.current
        canvas.width = viewport.width
        canvas.height = viewport.height
        task = pageObj.render({ canvasContext: canvas.getContext("2d")!, viewport })
        await task.promise
      } catch {}
    }
    render()
    return () => {
      cancelled = true
      task?.cancel()
    }
  }, [pdf])

  // Re-render at higher resolution shortly after zoom settles; CSS width handles the instant zoom.
  useEffect(() => {
    const t = setTimeout(() => setRenderScale(scale), 200)
    return () => clearTimeout(t)
  }, [scale])

  useEffect(() => {
    if (!pdf || !open || !modalCanvasRef.current || !scrollRef.current) return
    let cancelled = false
    let task: any = null
    async function render() {
      try {
        const pageObj = await pdf.getPage(page)
        if (cancelled || !modalCanvasRef.current || !scrollRef.current) return
        const base = pageObj.getViewport({ scale: 1 })
        const fit = scrollRef.current.clientWidth / base.width
        const dpr = window.devicePixelRatio || 1
        let s = fit * Math.max(renderScale, 1) * dpr
        const maxDim = Math.max(base.width, base.height) * s
        if (maxDim > MAX_CANVAS_DIM) s *= MAX_CANVAS_DIM / maxDim
        const viewport = pageObj.getViewport({ scale: s })

        const off = document.createElement("canvas")
        off.width = viewport.width
        off.height = viewport.height
        task = pageObj.render({ canvasContext: off.getContext("2d")!, viewport })
        await task.promise
        if (cancelled || !modalCanvasRef.current) return

        const canvas = modalCanvasRef.current
        canvas.width = off.width
        canvas.height = off.height
        canvas.getContext("2d")!.drawImage(off, 0, 0)
      } catch (e: any) {
        if (e?.name !== "RenderingCancelledException" && !cancelled) console.error("PDF render error:", e)
      }
    }
    render()
    return () => {
      cancelled = true
      task?.cancel()
    }
  }, [pdf, page, renderScale, open])

  function zoomTo(next: number, cx?: number, cy?: number) {
    const el = scrollRef.current
    const prev = scaleRef.current
    next = Math.min(Math.max(next, MIN_SCALE), MAX_SCALE)
    if (!el || next === prev) return
    const px = cx ?? el.clientWidth / 2
    const py = cy ?? el.clientHeight / 2
    const ratio = next / prev
    anchorRef.current = {
      left: (el.scrollLeft + px) * ratio - px,
      top: (el.scrollTop + py) * ratio - py,
    }
    scaleRef.current = next
    setScale(next)
  }

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el && anchorRef.current) {
      el.scrollLeft = anchorRef.current.left
      el.scrollTop = anchorRef.current.top
      anchorRef.current = null
    }
  }, [scale])

  useEffect(() => {
    const el = scrollRef.current
    if (!open || !el) return
    function onWheel(e: WheelEvent) {
      e.preventDefault()
      const rect = el!.getBoundingClientRect()
      const factor = Math.exp(-e.deltaY * 0.0015)
      zoomTo(scaleRef.current * factor, e.clientX - rect.left, e.clientY - rect.top)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    window.addEventListener("keydown", onKey)
    return () => {
      el.removeEventListener("wheel", onWheel)
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const el = scrollRef.current
    if (!el || e.button !== 0) return
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

  function handleModalCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (draggedRef.current) { draggedRef.current = false; return }
    if (!onPageClick || !modalCanvasRef.current) return
    const rect = modalCanvasRef.current.getBoundingClientRect()
    onPageClick(((e.clientX - rect.left) / rect.width) * 100, ((e.clientY - rect.top) / rect.height) * 100, page)
  }

  function openModal() {
    scaleRef.current = 1
    setScale(1)
    setRenderScale(1)
    setPage(1)
    setOpen(true)
  }

  function goToPage(p: number) {
    setPage(p)
    scrollRef.current?.scrollTo({ left: 0, top: 0 })
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center py-12 ${className || ""}`}>
        <p className="text-sm text-destructive">{error}</p>
      </div>
    )
  }

  if (!totalPages) {
    return (
      <div className={`flex items-center justify-center py-12 ${className || ""}`}>
        <p className="text-sm text-muted-foreground">Loading PDF...</p>
      </div>
    )
  }

  const btn = "rounded p-1 text-muted-foreground transition-colors hover:bg-white/[.08] hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"

  return (
    <>
      <div
        className={`relative rounded-lg border border-border/50 overflow-hidden bg-white cursor-pointer group ${className || ""}`}
        onClick={openModal}
      >
        <canvas ref={previewCanvasRef} className="w-full block" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
          <div className="rounded-full bg-black/60 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="h-6 w-6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <line x1="16" y1="16" x2="22" y2="22" />
              <line x1="9" y1="11" x2="13" y2="11" />
              <line x1="11" y1="9" x2="11" y2="13" />
            </svg>
          </div>
        </div>
        {totalPages > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[11px] px-2 py-0.5 rounded">
            {totalPages} pages
          </div>
        )}
        {overlay}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex flex-col w-[1200px] max-w-[95vw] h-[92vh] rounded-xl border border-border/50 bg-[#1e1d1c] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
              <div className="flex items-center gap-1">
                <button onClick={() => goToPage(Math.max(page - 1, 1))} disabled={page <= 1} className={btn}>
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 3L5 8l5 5" />
                  </svg>
                </button>
                <span className="text-xs text-foreground tabular-nums min-w-[50px] text-center">
                  {page} / {totalPages}
                </span>
                <button onClick={() => goToPage(Math.min(page + 1, totalPages))} disabled={page >= totalPages} className={btn}>
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 3l5 5-5 5" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button onClick={() => zoomTo(scale / 1.25)} disabled={scale <= MIN_SCALE} className={btn}>
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" strokeLinecap="round">
                    <line x1="4" y1="8" x2="12" y2="8" />
                  </svg>
                </button>
                <button
                  onClick={() => zoomTo(1)}
                  className="rounded px-1.5 py-0.5 text-xs text-muted-foreground tabular-nums min-w-[48px] text-center transition-colors hover:bg-white/[.08] hover:text-foreground"
                  title="Reset zoom"
                >
                  {Math.round(scale * 100)}%
                </button>
                <button onClick={() => zoomTo(scale * 1.25)} disabled={scale >= MAX_SCALE} className={btn}>
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" strokeLinecap="round">
                    <line x1="8" y1="4" x2="8" y2="12" />
                    <line x1="4" y1="8" x2="12" y2="8" />
                  </svg>
                </button>
              </div>

              <button onClick={() => setOpen(false)} className={btn}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" strokeLinecap="round">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </div>

            <div
              ref={scrollRef}
              className={`flex-1 min-h-0 overflow-auto bg-[#111] select-none ${dragging ? "cursor-grabbing" : scale > 1 && !onPageClick ? "cursor-grab" : ""}`}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <canvas
                ref={modalCanvasRef}
                onClick={handleModalCanvasClick}
                draggable={false}
                className={`block bg-white ${scale < 1 ? "mx-auto" : ""} ${onPageClick && !dragging ? "cursor-crosshair" : ""}`}
                style={{ width: `${scale * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
