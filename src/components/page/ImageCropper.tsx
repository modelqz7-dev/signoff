"use client"

import { useEffect, useRef, useState } from "react"
import { MinusIcon, PlusIcon, RotateCwIcon } from "lucide-react"
import { useT } from "@/lib/i18n"

type Shape = "round" | "wide"
type Pt = { x: number; y: number }

/** The cover is shown at about 2:1 (192px tall on a phone, 300px on a computer). */
const ASPECT: Record<Shape, number> = { round: 1, wide: 2 }
const OUT_WIDTH: Record<Shape, number> = { round: 800, wide: 1600 }
const MAX_ZOOM = 4

/**
 * Before a photo is uploaded: move it and zoom it inside the frame (a circle for the avatar,
 * a wide band for the cover), turn it if it came sideways, and only that part is kept.
 */
export function ImageCropper({ file, shape, onCancel, onDone }: {
  file: File
  shape: Shape
  onCancel: () => void
  onDone: (file: File) => void
}) {
  const { t } = useT()
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState<Pt>({ x: 0, y: 0 })
  const [frameW, setFrameW] = useState(360)
  const [busy, setBusy] = useState(false)
  const pointers = useRef(new Map<number, Pt>())
  const pinch = useRef<{ dist: number; zoom: number } | null>(null)

  // the photo, and again after each quarter turn (turned on a canvas so cropping stays simple)
  const [source, setSource] = useState<Blob>(file)
  useEffect(() => {
    const url = URL.createObjectURL(source)
    const el = new Image()
    el.onload = () => { setImg(el); setZoom(1); setOffset({ x: 0, y: 0 }) }
    el.src = url
    return () => URL.revokeObjectURL(url)
  }, [source])

  // the frame fits the screen, phones included
  useEffect(() => {
    const fit = () => setFrameW(Math.min(shape === "round" ? 340 : 520, window.innerWidth - 48))
    fit()
    window.addEventListener("resize", fit)
    return () => window.removeEventListener("resize", fit)
  }, [shape])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onCancel])

  const frameH = frameW / ASPECT[shape]
  const base = img ? Math.max(frameW / img.naturalWidth, frameH / img.naturalHeight) : 1
  const shownW = img ? img.naturalWidth * base * zoom : 0
  const shownH = img ? img.naturalHeight * base * zoom : 0
  // the photo always covers the whole frame
  const clamp = (p: Pt, w = shownW, h = shownH): Pt => ({
    x: Math.max(-(w - frameW) / 2, Math.min((w - frameW) / 2, p.x)),
    y: Math.max(-(h - frameH) / 2, Math.min((h - frameH) / 2, p.y)),
  })
  function setZoomKept(z: number) {
    if (!img) return
    const next = Math.max(1, Math.min(MAX_ZOOM, z))
    setZoom(next)
    setOffset((o) => clamp({ x: (o.x * next) / zoom, y: (o.y * next) / zoom }, img.naturalWidth * base * next, img.naturalHeight * base * next))
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom }
    }
  }
  function onPointerMove(e: React.PointerEvent) {
    const prev = pointers.current.get(e.pointerId)
    if (!prev) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()]
      setZoomKept((pinch.current.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.current.dist)
      return
    }
    setOffset((o) => clamp({ x: o.x + e.clientX - prev.x, y: o.y + e.clientY - prev.y }))
  }
  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
  }

  async function rotate() {
    if (!img) return
    const canvas = document.createElement("canvas")
    canvas.width = img.naturalHeight
    canvas.height = img.naturalWidth
    const ctx = canvas.getContext("2d")!
    ctx.translate(canvas.width, 0)
    ctx.rotate(Math.PI / 2)
    ctx.drawImage(img, 0, 0)
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.95))
    if (blob) setSource(blob)
  }

  async function done() {
    if (!img) return
    setBusy(true)
    const k = 1 / (base * zoom)
    const sw = frameW * k
    const sh = frameH * k
    const sx = img.naturalWidth / 2 - (frameW / 2 + offset.x) * k
    const sy = img.naturalHeight / 2 - (frameH / 2 + offset.y) * k
    const outW = Math.min(OUT_WIDTH[shape], Math.round(sw))
    const outH = Math.round(outW / ASPECT[shape])
    const canvas = document.createElement("canvas")
    canvas.width = outW
    canvas.height = outH
    const ctx = canvas.getContext("2d")!
    ctx.imageSmoothingQuality = "high"
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH)
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.9))
    setBusy(false)
    if (blob) onDone(new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }))
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-8 bg-black/85 px-6 backdrop-blur-xl" role="dialog" aria-modal="true"
      aria-label={shape === "round" ? t("Photo or logo") : t("Cover")}>
      <div className="relative z-10 text-center text-white">
        <p className="text-[17px] font-semibold">{shape === "round" ? t("Photo or logo") : t("Cover")}</p>
        <p className="mt-1 text-[13px] text-white/60">{t("Drag to move, pinch or scroll to zoom")}</p>
      </div>

      {/* The frame: what's inside is kept, the rest is dimmed around it */}
      <div className="relative touch-none select-none" style={{ width: frameW, height: frameH }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
        onWheel={(e) => setZoomKept(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08))}>
        {img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img.src} alt="" draggable={false} className="pointer-events-none absolute top-1/2 left-1/2 max-w-none cursor-grab"
            style={{ width: shownW, height: shownH, transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))` }} />
        )}
        <div className={`pointer-events-none absolute inset-0 shadow-[0_0_0_9999px_rgba(0,0,0,0.72)] ring-2 ring-white/90 ${shape === "round" ? "rounded-full" : "rounded-[18px]"}`} />
        <div className="absolute inset-0 cursor-grab active:cursor-grabbing" />
      </div>

      {/* Zoom on its own line (room for the slider on a phone), then the actions */}
      <div className="relative z-10 flex w-full max-w-[420px] flex-col items-center gap-3 text-white">
        <div className="flex w-full items-center gap-3 px-2">
          <button type="button" aria-label={t("Zoom out")} onClick={() => setZoomKept(zoom / 1.2)} className="flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-white/10"><MinusIcon className="size-4" /></button>
          <input type="range" min={1} max={MAX_ZOOM} step={0.01} value={zoom} aria-label={t("Zoom")} onChange={(e) => setZoomKept(Number(e.target.value))}
            className="h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-white/25 accent-white [&::-webkit-slider-thumb]:size-[18px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow" />
          <button type="button" aria-label={t("Zoom in")} onClick={() => setZoomKept(zoom * 1.2)} className="flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-white/10"><PlusIcon className="size-4" /></button>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-neutral-800/90 p-1.5 ring-1 ring-white/10 backdrop-blur">
          <button type="button" onClick={onCancel} className="h-10 rounded-full px-5 text-[14px] font-medium hover:bg-white/10">{t("Cancel")}</button>
          <button type="button" aria-label={t("Rotate")} title={t("Rotate")} onClick={rotate} className="flex size-10 items-center justify-center rounded-full hover:bg-white/10"><RotateCwIcon className="size-[18px]" /></button>
          <button type="button" onClick={done} disabled={!img || busy} className="h-10 rounded-full bg-white px-6 text-[14px] font-medium text-black hover:bg-white/90 disabled:opacity-50">
            {busy ? "…" : t("Done")}
          </button>
        </div>
      </div>
    </div>
  )
}
