"use client"

import { useState } from "react"
import { CheckIcon, RotateCcwIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { Pin } from "@/lib/pins"

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  })
}

/** Round numbered marker, positioned in % of the page so it lands on the same spot at any zoom. */
export function PinMarker({
  pin,
  number,
  selected,
  onSelect,
  small,
}: {
  pin: Pick<Pin, "x" | "y" | "resolved">
  number: number | string
  selected?: boolean
  onSelect?: () => void
  small?: boolean
}) {
  return (
    <button
      type="button"
      data-pin-ui
      onClick={(e) => { e.stopPropagation(); onSelect?.() }}
      tabIndex={onSelect ? 0 : -1}
      className={cn(
        "absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-semibold text-white shadow-md ring-2 ring-white transition-transform",
        small ? "size-5 text-[9px]" : "size-7 text-[11px]",
        onSelect ? "cursor-pointer hover:scale-110" : "pointer-events-none",
        pin.resolved ? "bg-muted-foreground/70" : "bg-accent",
        selected && "scale-110 ring-accent/50 ring-4"
      )}
      style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
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
  return (
    <div
      data-pin-ui
      onClick={(e) => e.stopPropagation()}
      className="absolute z-20 w-72 rounded-xl bg-popover p-3 text-sm text-popover-foreground shadow-xl ring-1 ring-foreground/10"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: `translate(${x > 60 ? "calc(-100% - 20px)" : "20px"}, ${y > 60 ? "calc(-100% + 12px)" : "-12px"})`,
      }}
    >
      {children}
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
      setError((e as Error)?.message || "Failed to save")
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
      <p className="text-xs font-medium">New comment</p>
      <Input
        autoFocus
        placeholder="Title *"
        value={title}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
      />
      <Textarea
        placeholder="What should be changed? (optional)"
        value={description}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
        rows={3}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onPress={onCancel}>Cancel</Button>
        <Button type="submit" size="sm" isDisabled={saving || !title.trim()}>
          {saving ? "Saving..." : "Add comment"}
        </Button>
      </div>
    </form>
  )
}

export function PinDetails({
  pin,
  number,
  onToggleResolved,
}: {
  pin: Pin
  number: number
  onToggleResolved?: () => void
}) {
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
            {pin.author_name} · {formatDate(pin.created_at)} · page {pin.page}
          </p>
        </div>
      </div>
      {onToggleResolved && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onPress={onToggleResolved}>
            {pin.resolved ? <><RotateCcwIcon /> Reopen</> : <><CheckIcon /> Resolve</>}
          </Button>
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
            {pin.author_name} · p. {pin.page}
          </p>
        </div>
      </button>
    )
  }

  if (pins.length === 0) {
    return <p className="py-6 text-center text-xs text-muted-foreground">{emptyText}</p>
  }

  return (
    <div className="flex flex-col gap-1">
      {open.map(item)}
      {resolved.length > 0 && (
        <>
          <p className="mt-2 border-t border-border px-1 pt-3 text-[11px] text-muted-foreground/60">Resolved</p>
          {resolved.map(item)}
        </>
      )}
    </div>
  )
}
