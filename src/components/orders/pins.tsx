"use client"

import { useRef, useState } from "react"
import { CheckIcon, RotateCcwIcon, Trash2Icon } from "lucide-react"

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

/**
 * Round numbered marker, positioned in % of the page so it lands on the same spot at any zoom.
 * With `onMove` it can be dragged; the new position is reported in % of its parent (the page).
 */
export function PinMarker({
  pin,
  number,
  selected,
  onSelect,
  onMove,
  small,
}: {
  pin: Pick<Pin, "x" | "y" | "resolved">
  number: number | string
  selected?: boolean
  onSelect?: () => void
  onMove?: (x: number, y: number) => void
  small?: boolean
}) {
  const dragRef = useRef<{ startX: number; startY: number; moved: boolean } | null>(null)
  const justDraggedRef = useRef(false)
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)
  const { t } = useT()

  function positionFromEvent(e: React.PointerEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.parentElement!.getBoundingClientRect()
    const clamp = (v: number) => Math.min(Math.max(v, 0), 100)
    return {
      x: clamp(((e.clientX - rect.left) / rect.width) * 100),
      y: clamp(((e.clientY - rect.top) / rect.height) * 100),
    }
  }

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (!onMove || e.button !== 0) return
    e.stopPropagation()
    // Capture right away so fast drags that leave the marker keep reporting to it.
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, moved: false }
  }

  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const d = dragRef.current
    if (!d) return
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 3) d.moved = true
    if (d.moved) setDragPos(positionFromEvent(e))
  }

  function onPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    const d = dragRef.current
    dragRef.current = null
    if (!d?.moved) return
    const pos = positionFromEvent(e)
    justDraggedRef.current = true
    setDragPos(null)
    onMove?.(pos.x, pos.y)
  }

  const x = dragPos?.x ?? pin.x
  const y = dragPos?.y ?? pin.y

  return (
    <button
      type="button"
      data-pin-ui
      onClick={(e) => {
        e.stopPropagation()
        if (justDraggedRef.current) { justDraggedRef.current = false; return }
        onSelect?.()
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { dragRef.current = null; setDragPos(null) }}
      tabIndex={onSelect ? 0 : -1}
      title={onMove ? t("Drag to move") : undefined}
      className={cn(
        "absolute z-10 flex -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center rounded-full font-semibold text-white shadow-md ring-2 ring-white transition-transform",
        small ? "size-5 text-[9px]" : "size-7 text-[11px]",
        onSelect || onMove ? "cursor-pointer hover:scale-110" : "pointer-events-none",
        onMove && "cursor-grab",
        dragPos && "scale-125 cursor-grabbing",
        pin.resolved ? "bg-muted-foreground/70" : "bg-accent",
        selected && "scale-110 ring-accent/50 ring-4"
      )}
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      {pin.resolved ? <CheckIcon className="size-3" /> : number}
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
  const left = x > 60
  const up = y > 60
  // The outer box handles placement, the inner one the pop-in animation (both use transforms).
  return (
    <div
      data-pin-ui
      onClick={(e) => e.stopPropagation()}
      className="absolute z-20 w-72"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: `translate(${left ? "calc(-100% - 20px)" : "20px"}, ${up ? "calc(-100% + 12px)" : "-12px"})`,
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
}: {
  pin: Pin
  number: number
  onToggleResolved?: () => void
  onDelete?: () => Promise<void> | void
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
        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-accent-foreground">
          {number}
        </span>
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
      {(onToggleResolved || onDelete) && (
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
        <span
          className={cn(
            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
            pin.resolved ? "bg-muted text-muted-foreground" : "bg-accent text-accent-foreground"
          )}
        >
          {pin.resolved ? <CheckIcon className="size-3" /> : numbers.get(pin.id)}
        </span>
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
