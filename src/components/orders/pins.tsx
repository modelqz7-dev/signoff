"use client"

import { useLayoutEffect, useRef, useState } from "react"
import { CheckIcon, MoveIcon, PencilIcon, RotateCcwIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { Pin } from "@/lib/pins"
import { useT } from "@/lib/i18n"

function formatDate(dateStr: string, locale: string) {
  return new Date(dateStr).toLocaleString(locale, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  })
}

/** Teardrop pin; the tip (bottom center) sits exactly on the commented spot. */
function PinShape({ fill }: { fill: string }) {
  return (
    <svg viewBox="0 0 24 30" aria-hidden="true" className="absolute inset-0 size-full drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)]">
      <path
        d="M12 29c0 0-9-8.4-9-16a9 9 0 0 1 18 0c0 7.6-9 16-9 16z"
        style={{ fill }}
        stroke="#ffffff"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * The same pin as a static inline symbol for lists, feeds and cards, so comments look
 * identical everywhere: number inside, a check when resolved, or any short label.
 */
export function PinGlyph({
  label,
  resolved,
  size = "md",
  className,
}: {
  label?: React.ReactNode
  resolved?: boolean
  size?: "sm" | "md"
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-block shrink-0 font-semibold text-white",
        size === "sm" ? "h-[18px] w-[14px] text-[8px]" : "h-[23px] w-[18px] text-[9px]",
        className
      )}
    >
      <PinShape fill={resolved ? "var(--pin-resolved)" : "var(--pin)"} />
      <span className="absolute inset-x-0 top-0 flex h-[80%] items-center justify-center leading-none">
        {resolved ? <CheckIcon className={size === "sm" ? "size-2" : "size-2.5"} strokeWidth={3} /> : label}
      </span>
    </span>
  )
}

/** Outline pin in the current text color, sized like a lucide icon (for counters and tiles). */
export function PinOutlineIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true" className={cn("size-4", className)}>
      <path d="M12 22s-7-6.7-7-12.5a7 7 0 0 1 14 0C19 15.3 12 22 12 22z" />
      <circle cx="12" cy="9.5" r="2.2" />
    </svg>
  )
}

/**
 * Numbered comment pin, positioned in % of the page so it lands on the same spot at any zoom.
 * The pin's tip marks the spot. With `onMove` it can be dragged; the new position is reported
 * in % of its parent (the page). `pending` shows a pencil for a comment being written.
 */
export function PinMarker({
  pin,
  number,
  selected,
  onSelect,
  onMove,
  small,
  pending,
}: {
  pin: Pick<Pin, "x" | "y" | "resolved">
  number?: number | string
  selected?: boolean
  onSelect?: () => void
  onMove?: (x: number, y: number) => void
  small?: boolean
  pending?: boolean
}) {
  const dragRef = useRef<{ startX: number; startY: number; dx: number; dy: number; moved: boolean } | null>(null)
  // When a drag ended; the click a mouse fires right after it must not open the comment.
  // (Touch drags fire no click, so a plain flag would swallow the next real tap.)
  const draggedAtRef = useRef(0)
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)
  const { t } = useT()

  function pointerPercent(e: React.PointerEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.parentElement!.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    }
  }

  const clamp = (v: number) => Math.min(Math.max(v, 0), 100)

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (!onMove || e.button !== 0) return
    e.stopPropagation()
    // Capture right away so fast drags that leave the marker keep reporting to it.
    e.currentTarget.setPointerCapture(e.pointerId)
    // Remember where on the pin it was grabbed, so the tip doesn't jump to the cursor.
    const p = pointerPercent(e)
    dragRef.current = { startX: e.clientX, startY: e.clientY, dx: p.x - pin.x, dy: p.y - pin.y, moved: false }
  }

  function positionFromEvent(e: React.PointerEvent<HTMLButtonElement>) {
    const d = dragRef.current!
    const p = pointerPercent(e)
    return { x: clamp(p.x - d.dx), y: clamp(p.y - d.dy) }
  }

  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const d = dragRef.current
    if (!d) return
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 3) d.moved = true
    if (d.moved) setDragPos(positionFromEvent(e))
  }

  function onPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    const d = dragRef.current
    if (!d?.moved) { dragRef.current = null; return }
    const pos = positionFromEvent(e)
    dragRef.current = null
    draggedAtRef.current = Date.now()
    setDragPos(null)
    onMove?.(pos.x, pos.y)
  }

  const x = dragPos?.x ?? pin.x
  const y = dragPos?.y ?? pin.y
  const fill = pending ? "var(--status-changes)" : pin.resolved ? "var(--pin-resolved)" : "var(--pin)"

  return (
    <button
      type="button"
      data-pin-ui
      aria-label={pending ? t("New comment") : typeof number === "number" ? t("Comment {n}", { n: number }) : undefined}
      onClick={(e) => {
        e.stopPropagation()
        if (Date.now() - draggedAtRef.current < 400) return
        onSelect?.()
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { dragRef.current = null; setDragPos(null) }}
      // A long press would otherwise open the phone's own menu or start selecting text,
      // which cancels the drag.
      onContextMenu={(e) => e.preventDefault()}
      tabIndex={onSelect ? 0 : -1}
      title={onMove ? t("Drag to move") : undefined}
      className={cn(
        "absolute z-10 -translate-x-1/2 -translate-y-full touch-none origin-bottom select-none font-semibold text-white outline-none transition-transform [-webkit-touch-callout:none] [-webkit-tap-highlight-color:transparent] focus-visible:scale-110",
        small ? "h-[20px] w-[16px] text-[8px]" : "h-[28px] w-[22px] text-[10px]",
        onSelect || onMove ? "cursor-pointer hover:scale-110" : "pointer-events-none",
        onMove && "cursor-grab",
        dragPos && "scale-125 cursor-grabbing",
        selected && "scale-115",
        pending && "animate-in zoom-in-50 duration-200"
      )}
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      {/* A finger-sized grab area around the small marker. */}
      {(onSelect || onMove) && <span className="absolute -inset-3" aria-hidden="true" />}
      {selected && (
        <span className="absolute top-[4%] left-1/2 aspect-square w-[160%] -translate-x-1/2 -translate-y-[18%] rounded-full bg-accent/25" aria-hidden="true" />
      )}
      <PinShape fill={fill} />
      <span className="absolute inset-x-0 top-0 flex h-[80%] items-center justify-center leading-none">
        {pending ? (
          <PencilIcon className={small ? "size-2" : "size-2.5"} strokeWidth={2.5} />
        ) : pin.resolved ? (
          <CheckIcon className={small ? "size-2" : "size-3"} strokeWidth={3} />
        ) : (
          number
        )}
      </span>
    </button>
  )
}

/** Floating card anchored next to a point on the page; flips so it stays inside the page. */
export function PinPopover({
  x,
  y,
  children,
}: {
  x: number
  y: number
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const left = x > 60
  const up = y > 60

  // Keep the card fully on screen: nudge it back inside the viewing area (the element marked
  // data-pin-bounds, or the window) when the pin sits near an edge or the screen is narrow.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const bounds = el.closest("[data-pin-bounds]")
    function fit() {
      if (!el) return
      el.style.marginLeft = "0px"
      el.style.marginTop = "0px"
      const r = el.getBoundingClientRect()
      const b = bounds?.getBoundingClientRect() ?? { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight }
      const M = 8
      let dx = 0
      let dy = 0
      if (r.right > b.right - M) dx = b.right - M - r.right
      if (r.left + dx < b.left + M) dx = b.left + M - r.left
      if (r.bottom > b.bottom - M) dy = b.bottom - M - r.bottom
      if (r.top + dy < b.top + M) dy = b.top + M - r.top
      el.style.marginLeft = `${dx}px`
      el.style.marginTop = `${dy}px`
    }
    fit()
    bounds?.addEventListener("scroll", fit, { passive: true })
    window.addEventListener("resize", fit)
    return () => {
      bounds?.removeEventListener("scroll", fit)
      window.removeEventListener("resize", fit)
    }
  }, [x, y])

  // The outer box handles placement, the inner one the pop-in animation (both use transforms).
  return (
    <div
      ref={ref}
      data-pin-ui
      onClick={(e) => e.stopPropagation()}
      className="absolute z-20 w-72 max-w-[calc(100vw-2rem)]"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: `translate(${left ? "calc(-100% - 18px)" : "18px"}, ${up ? "calc(-100% - 6px)" : "-34px"})`,
      }}
    >
      <div
        className={cn(
          "rounded-xl bg-popover p-3 text-sm text-popover-foreground shadow-xl ring-1 ring-foreground/10",
          "animate-in fade-in-0 zoom-in-90 duration-200 ease-out",
          left ? "slide-in-from-right-2" : "slide-in-from-left-2",
          left ? (up ? "origin-bottom-right" : "origin-top-right") : (up ? "origin-bottom-left" : "origin-top-left")
        )}
      >
        {children}
      </div>
    </div>
  )
}

export function PinComposer({
  onSave,
  onCancel,
}: {
  onSave: (title: string, description: string) => Promise<void>
  onCancel: () => void
}) {
  const { t } = useT()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (!title.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      await onSave(title.trim(), description.trim())
    } catch (e) {
      setError((e as Error)?.message || t("Failed to save"))
      setSaving(false)
    }
  }

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => { e.preventDefault(); save() }}
      onKeyDown={(e) => {
        // Keep Escape from closing the whole viewer while typing a comment.
        if (e.key === "Escape") { e.stopPropagation(); onCancel() }
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); save() }
      }}
    >
      <p className="text-xs font-medium">{t("New comment")}</p>
      <Input
        autoFocus
        placeholder={t("Title *")}
        value={title}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
      />
      <Textarea
        placeholder={t("What should be changed? (optional)")}
        value={description}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
        rows={3}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onPress={onCancel}>{t("Cancel")}</Button>
        <Button type="submit" size="sm" isDisabled={saving || !title.trim()}>
          {saving ? t("Saving...") : t("Add comment")}
        </Button>
      </div>
    </form>
  )
}

export function PinDetails({
  pin,
  number,
  onToggleResolved,
  onDelete,
  onStartMove,
}: {
  pin: Pin
  number: number
  onToggleResolved?: () => void
  onDelete?: () => Promise<void> | void
  /** Tap-to-move: the next tap on the page puts the pin there (easier than dragging on phones). */
  onStartMove?: () => void
}) {
  const { t, locale } = useT()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    setError(null)
    try {
      await onDelete?.()
    } catch (e) {
      setError(t((e as Error)?.message || "Failed to delete"))
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-2">
        <PinGlyph label={number} resolved={pin.resolved} className="-mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className={cn("font-medium break-words", pin.resolved && "text-muted-foreground line-through")}>{pin.title}</p>
          {pin.description && (
            <p className="mt-1 text-xs whitespace-pre-wrap break-words text-muted-foreground">{pin.description}</p>
          )}
          <p className="mt-1.5 text-[11px] text-muted-foreground/70">
            {pin.author_name} · {formatDate(pin.created_at, locale)} · {t("page {n}", { n: pin.page })}
          </p>
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {(onToggleResolved || onDelete || onStartMove) && (
        <div className="flex items-center justify-end gap-2">
          {onDelete && (
            <Button
              variant="destructive"
              size="sm"
              onPress={handleDelete}
              isDisabled={deleting}
              className="mr-auto"
            >
              <Trash2Icon />
              {deleting ? t("Deleting...") : confirmDelete ? t("Confirm delete") : t("Delete")}
            </Button>
          )}
          {onStartMove && (
            <Button variant="outline" size="sm" onPress={onStartMove}>
              <MoveIcon />
              {t("Move")}
            </Button>
          )}
          {onToggleResolved && (
            <Button variant="outline" size="sm" onPress={onToggleResolved}>
              {pin.resolved ? <><RotateCcwIcon /> {t("Reopen")}</> : <><CheckIcon /> {t("Resolve")}</>}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

/** Compact list of all comments; open ones first, resolved ones below. */
export function PinList({
  pins,
  numbers,
  selectedId,
  onSelect,
  emptyText = "No comments yet.",
}: {
  pins: Pin[]
  numbers: Map<string, number>
  selectedId?: string | null
  onSelect?: (pin: Pin) => void
  emptyText?: string
}) {
  const { t } = useT()
  const open = pins.filter((p) => !p.resolved)
  const resolved = pins.filter((p) => p.resolved)

  function item(pin: Pin) {
    return (
      <button
        key={pin.id}
        type="button"
        onClick={() => onSelect?.(pin)}
        className={cn(
          "flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
          onSelect && "hover:bg-muted/60",
          pin.id === selectedId && "bg-muted",
          pin.resolved && "opacity-50"
        )}
      >
        <PinGlyph label={numbers.get(pin.id)} resolved={pin.resolved} className="-mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className={cn("truncate text-xs font-medium", pin.resolved && "line-through")}>{pin.title}</p>
          {pin.description && !pin.resolved && (
            <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{pin.description}</p>
          )}
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground/70">
            {pin.author_name} · {t("p. {n}", { n: pin.page })}
          </p>
        </div>
      </button>
    )
  }

  if (pins.length === 0) {
    return <p className="py-6 text-center text-xs text-muted-foreground">{t(emptyText)}</p>
  }

  return (
    <div className="flex flex-col gap-1">
      {open.map(item)}
      {resolved.length > 0 && (
        <>
          <p className="mt-2 border-t border-border px-1 pt-3 text-[11px] text-muted-foreground/60">{t("Resolved")}</p>
          {resolved.map(item)}
        </>
      )}
    </div>
  )
}
