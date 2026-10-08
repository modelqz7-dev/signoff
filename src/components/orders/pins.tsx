"use client"

import { useRef, useState } from "react"
import { CheckIcon, PencilIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import type { Pin } from "@/lib/pins"
import { useT } from "@/lib/i18n"

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
        <span className="absolute -right-1 -bottom-1 flex h-3 min-w-3 items-center justify-center rounded-full bg-primary px-0.5 text-[8px] leading-none font-semibold text-primary-foreground ring-2 ring-card tabular-nums">
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

/** Where a comment stands, in a few words: the same chip in the list and in the open comment. */
export function PinStatus({ pin, className }: { pin: Pin; className?: string }) {
  const { t } = useT()
  const reopened = pin.fix_status === "reopened"
  const done = pin.resolved && !reopened
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        reopened ? "bg-destructive/10 text-destructive" : done ? "bg-muted text-muted-foreground" : "bg-foreground/10 text-foreground",
        className
      )}
    >
      {done && <CheckIcon className="size-3" strokeWidth={3} />}
      {reopened ? t("The client asks to redo it") : done ? t(pin.fix_status === "fixed" ? "Fixed" : "Done") : t("Waiting for a fix")}
    </span>
  )
}

/** The comment's number in a circle, the same number its pin carries on the file. */
export function PinNumber({ n, done, className }: { n?: number; done?: boolean; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums",
        done ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground",
        className
      )}
    >
      {n ?? ""}
    </span>
  )
}

