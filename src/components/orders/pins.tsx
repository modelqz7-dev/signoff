"use client"

import { useLayoutEffect, useRef, useState } from "react"
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon, MoveIcon, PaperclipIcon, PencilIcon, RotateCcwIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { Pin, PinMessage } from "@/lib/pins"
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

const PIN_ICON_PATH = "M8.1 21.2125C6.88333 20.6875 5.825 19.975 4.925 19.075C4.025 18.175 3.3125 17.1167 2.7875 15.9C2.2625 14.6833 2 13.3833 2 12C2 10.6167 2.2625 9.31667 2.7875 8.1C3.3125 6.88333 4.025 5.825 4.925 4.925C5.825 4.025 6.88333 3.3125 8.1 2.7875C9.31667 2.2625 10.6167 2 12 2C13.3833 2 14.6833 2.2625 15.9 2.7875C17.1167 3.3125 18.175 4.025 19.075 4.925C19.975 5.825 20.6875 6.88333 21.2125 8.1C21.7375 9.31667 22 10.6167 22 12C22 13.3833 21.7375 14.6833 21.2125 15.9C20.6875 17.1167 19.975 18.175 19.075 19.075C18.175 19.975 17.1167 20.6875 15.9 21.2125C14.6833 21.7375 13.3833 22 12 22C10.6167 22 9.31667 21.7375 8.1 21.2125ZM12 17.5C12.75 16.75 13.4167 15.975 14 15.175C14.5 14.4917 14.9583 13.7417 15.375 12.925C15.7917 12.1083 16 11.3 16 10.5C16 9.4 15.6083 8.45833 14.825 7.675C14.0417 6.89167 13.1 6.5 12 6.5C10.9 6.5 9.95833 6.89167 9.175 7.675C8.39167 8.45833 8 9.4 8 10.5C8 11.3 8.20833 12.1083 8.625 12.925C9.04167 13.7417 9.5 14.4917 10 15.175C10.5833 15.975 11.25 16.75 12 17.5ZM10.9375 11.5625C10.6458 11.2708 10.5 10.9167 10.5 10.5C10.5 10.0833 10.6458 9.72917 10.9375 9.4375C11.2292 9.14583 11.5833 9 12 9C12.4167 9 12.7708 9.14583 13.0625 9.4375C13.3542 9.72917 13.5 10.0833 13.5 10.5C13.5 10.9167 13.3542 11.2708 13.0625 11.5625C12.7708 11.8542 12.4167 12 12 12C11.5833 12 11.2292 11.8542 10.9375 11.5625Z"

/**
 * A comment as an inline symbol for lists, feeds and cards: the round pin icon, with the
 * comment's number (or a check when resolved) in a small badge at its corner.
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
  const badge = resolved ? <CheckIcon className="size-2" strokeWidth={3.5} /> : label
  return (
    <span aria-hidden="true" className={cn("relative inline-block shrink-0 text-foreground", size === "sm" ? "size-4" : "size-5", className)}>
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-full"><path d={PIN_ICON_PATH} /></svg>
      {badge !== undefined && badge !== null && badge !== "" && (
        <span className="absolute -right-1 -bottom-1 flex h-3 min-w-3 items-center justify-center rounded-full bg-foreground px-0.5 text-[8px] leading-none font-semibold text-background ring-2 ring-card tabular-nums">
          {badge}
        </span>
      )}
    </span>
  )
}

/** Comments: an envelope in front of an opened one. */
export function CommentsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={cn("size-4", className)}>
      <path d="M4 17C3.45 17 2.97917 16.8042 2.5875 16.4125C2.19583 16.0208 2 15.55 2 15V7.15C2 6.9 2.07083 6.65417 2.2125 6.4125C2.35417 6.17083 2.55 5.98333 2.8 5.85L10.5 2L18.05 5.85C18.25 5.95 18.4208 6.10833 18.5625 6.325C18.7042 6.54167 18.8 6.76667 18.85 7H15.925L10.5 4.25L4 7.475V17ZM7 21C6.45 21 5.97917 20.8042 5.5875 20.4125C5.19583 20.0208 5 19.55 5 19V10C5 9.45 5.19583 8.97917 5.5875 8.5875C5.97917 8.19583 6.45 8 7 8H20C20.55 8 21.0208 8.19583 21.4125 8.5875C21.8042 8.97917 22 9.45 22 10V19C22 19.55 21.8042 20.0208 21.4125 20.4125C21.0208 20.8042 20.55 21 20 21H7ZM13.5 15.35L7 12V19H20V12L13.5 15.35ZM13.5 13.35L20 10H7L13.5 13.35Z" />
    </svg>
  )
}

export function PinOutlineIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={cn("size-4", className)}>
      <path d={PIN_ICON_PATH} />
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
  thread,
  nav,
}: {
  pin: Pin
  number: number
  onToggleResolved?: () => void
  onDelete?: () => Promise<void> | void
  /** Tap-to-move: the next tap on the page puts the pin there (easier than dragging on phones). */
  onStartMove?: () => void
  /** The conversation inside the pin (messages and a reply box). */
  thread?: React.ReactNode
  /** "‹ 2 of 5 ›" to step through the comments without aiming at pins. */
  nav?: React.ReactNode
}) {
  const { t, locale } = useT()
  const [menu, setMenu] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Once the workshop answers, the conversation decides; resolving by hand is for the rest.
  const canResolve = onToggleResolved && !pin.fix_status
  const hasMenu = onStartMove || onDelete || (canResolve && thread)

  async function handleDelete() {
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
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <PinGlyph label={number} resolved={pin.resolved} />
        <span className="text-xs text-muted-foreground">
          {pin.fix_status === "fixed" ? t("Fixed") : pin.resolved ? t("Resolved") : t("Comment {n}", { n: number })}
        </span>
        <span className="ml-auto flex items-center gap-1">
          {nav}
          {hasMenu && (
            <span
              className="relative"
              onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setMenu(false) }}
            >
              <button
                type="button"
                onClick={() => setMenu((v) => !v)}
                aria-label={t("More")}
                aria-expanded={menu}
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-hover hover:text-foreground"
              >
                <MoreHorizontalIcon className="size-4" />
              </button>
              {menu && (
                <span role="menu" className="absolute top-full right-0 z-20 mt-1 flex w-44 flex-col rounded-lg bg-popover p-1 text-sm shadow-lg ring-1 ring-foreground/10">
                  {onStartMove && (
                    <button type="button" role="menuitem" onClick={() => { setMenu(false); onStartMove() }} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-hover">
                      <MoveIcon className="size-4 text-muted-foreground" />{t("Move")}
                    </button>
                  )}
                  {canResolve && thread && (
                    <button type="button" role="menuitem" onClick={() => { setMenu(false); onToggleResolved?.() }} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-hover">
                      {pin.resolved ? <RotateCcwIcon className="size-4 text-muted-foreground" /> : <CheckIcon className="size-4 text-muted-foreground" />}
                      {pin.resolved ? t("Reopen") : t("Resolve")}
                    </button>
                  )}
                  {onDelete && (
                    <button type="button" role="menuitem" onClick={() => { setMenu(false); setConfirmDelete(true) }} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-destructive hover:bg-destructive/10">
                      <Trash2Icon className="size-4" />{t("Delete")}
                    </button>
                  )}
                </span>
              )}
            </span>
          )}
        </span>
      </div>

      {/* the comment itself, as the first message of the conversation */}
      <div className="flex flex-col gap-0.5">
        <p className="text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">{pin.author_name}</span> · {formatDate(pin.created_at, locale)} · {t("page {n}", { n: pin.page })}
        </p>
        <p className="font-medium break-words text-foreground">{pin.title}</p>
        {pin.description && <p className="text-sm whitespace-pre-wrap break-words text-muted-foreground">{pin.description}</p>}
      </div>

      {thread}

      {/* without a conversation, resolving stays a plain button */}
      {canResolve && !thread && (
        <Button variant="outline" size="sm" onPress={onToggleResolved} className="self-end">
          {pin.resolved ? <><RotateCcwIcon /> {t("Reopen")}</> : <><CheckIcon /> {t("Resolve")}</>}
        </Button>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
      {confirmDelete && (
        <div className="flex items-center justify-end gap-2 rounded-lg bg-destructive/8 px-2.5 py-2">
          <span className="mr-auto text-xs text-foreground">{t("Delete this comment?")}</span>
          <Button variant="ghost" size="sm" onPress={() => setConfirmDelete(false)} isDisabled={deleting}>
            {t("Cancel")}
          </Button>
          <Button size="sm" onPress={handleDelete} isDisabled={deleting} className="bg-destructive text-white hover:bg-destructive/90">
            {deleting ? t("Deleting...") : t("Delete")}
          </Button>
        </div>
      )}
    </div>
  )
}

/** "‹ 2 of 5 ›": step through comments in order. */
export function PinNav({ index, total, onPrev, onNext }: { index: number; total: number; onPrev: () => void; onNext: () => void }) {
  const { t } = useT()
  if (total < 2) return null
  return (
    <span className="flex items-center text-xs text-muted-foreground tabular-nums">
      <button type="button" onClick={onPrev} aria-label={t("Previous comment")} className="flex size-7 items-center justify-center rounded-md hover:bg-hover hover:text-foreground">
        <ChevronLeftIcon className="size-4" />
      </button>
      {t("{i} of {n}", { i: index + 1, n: total })}
      <button type="button" onClick={onNext} aria-label={t("Next comment")} className="flex size-7 items-center justify-center rounded-md hover:bg-hover hover:text-foreground">
        <ChevronRightIcon className="size-4" />
      </button>
    </span>
  )
}

/** Compact list of all comments; open ones first, resolved ones below. */
/** The comment's number in a circle, the same number its pin carries on the file. */
export function PinNumber({ n, done, className }: { n?: number; done?: boolean; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums",
        done ? "bg-muted text-muted-foreground" : "bg-foreground text-background",
        className
      )}
    >
      {n ?? ""}
    </span>
  )
}

/**
 * One comment in a list, the same for the client and the workshop: number, what was asked,
 * where, and the latest answer as a short quote. `leading` and `trailing` hold extra controls,
 * `children` whatever opens under it.
 */
export function PinRow({
  pin,
  number,
  last,
  selected,
  onClick,
  leading,
  trailing,
  children,
}: {
  pin: Pin
  number?: number
  last?: PinMessage
  selected?: boolean
  onClick?: () => void
  leading?: React.ReactNode
  trailing?: React.ReactNode
  children?: React.ReactNode
}) {
  const { t } = useT()
  const reopened = pin.fix_status === "reopened"
  const done = pin.resolved && !reopened
  // Old comments carry the same words in both fields; say them once.
  const detail = pin.description && pin.description.trim() !== pin.title.trim() ? pin.description : null
  const who = last ? (last.author_role === "workshop" ? t("Workshop") : last.author_name) : null
  return (
    <div id={`pin-row-${pin.id}`} className={cn("scroll-mt-20 rounded-xl transition-colors", selected ? "bg-muted/70" : onClick && "hover:bg-muted/40")}>
      <div className="flex items-start gap-3 px-3 py-3">
        {leading}
        <PinNumber n={number} done={done} className="mt-px" />
        <button type="button" onClick={onClick} className={cn("flex min-w-0 flex-1 flex-col gap-1 text-left", !onClick && "cursor-default")}>
          <span className="flex items-baseline gap-2">
            <span className={cn("min-w-0 flex-1 text-sm leading-snug", done ? "text-muted-foreground" : "font-medium text-foreground")}>{pin.title}</span>
            <span className="shrink-0 text-[11px] text-muted-foreground/70 tabular-nums">{t("p. {n}", { n: pin.page })}</span>
          </span>
          {detail && !done && <span className="line-clamp-2 text-xs text-muted-foreground">{detail}</span>}
          {last && (
            <span className="mt-0.5 flex min-w-0 items-center gap-1.5 border-l-2 border-border pl-2 text-xs text-muted-foreground">
              {last.file_url && <PaperclipIcon className="size-3 shrink-0" />}
              <span className="truncate">
                <span className="text-foreground/80">{who}</span>
                {" · "}
                {last.body || t("sent a file")}
              </span>
            </span>
          )}
          {(done || reopened) && (
            <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium", reopened ? "text-destructive" : "text-muted-foreground")}>
              {reopened ? t("The client asks to redo it") : <><CheckIcon className="size-3" strokeWidth={3} />{t(pin.fix_status === "fixed" ? "Fixed" : "Resolved")}</>}
            </span>
          )}
        </button>
        {trailing}
      </div>
      {children}
    </div>
  )
}

/** Open comments first; resolved ones fold under one line unless nothing else is left. */
export function PinGroups({ pins, render }: { pins: Pin[]; render: (pin: Pin) => React.ReactNode }) {
  const { t } = useT()
  const open = pins.filter((p) => !p.resolved || p.fix_status === "reopened")
  const done = pins.filter((p) => p.resolved && p.fix_status !== "reopened")
  const [showDone, setShowDone] = useState(false)
  const expanded = showDone || open.length === 0
  return (
    <div className="flex flex-col">
      {open.map(render)}
      {done.length > 0 && open.length > 0 && (
        <button
          type="button"
          onClick={() => setShowDone((v) => !v)}
          className="mt-1 flex items-center gap-1.5 border-t border-border px-3 pt-3 pb-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <CheckIcon className="size-3" strokeWidth={3} />
          {t("Resolved: {n}", { n: done.length })}
          <ChevronRightIcon className={cn("size-3.5 transition-transform", expanded && "rotate-90")} />
        </button>
      )}
      {expanded && done.map(render)}
    </div>
  )
}

export function PinList({
  pins,
  numbers,
  selectedId,
  onSelect,
  emptyText = "No comments yet.",
  lastMessages,
}: {
  pins: Pin[]
  numbers: Map<string, number>
  selectedId?: string | null
  onSelect?: (pin: Pin) => void
  emptyText?: string
  /** The latest message in each pin, shown as one line. */
  lastMessages?: Map<string, PinMessage>
}) {
  const { t } = useT()
  if (pins.length === 0) {
    return <p className="py-6 text-center text-xs text-muted-foreground">{t(emptyText)}</p>
  }
  return (
    <PinGroups
      pins={pins}
      render={(pin) => (
        <PinRow
          key={pin.id}
          pin={pin}
          number={numbers.get(pin.id)}
          last={lastMessages?.get(pin.id)}
          selected={pin.id === selectedId}
          onClick={onSelect ? () => onSelect(pin) : undefined}
        />
      )}
    />
  )
}

