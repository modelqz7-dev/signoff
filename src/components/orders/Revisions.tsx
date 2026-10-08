"use client"

import { useEffect, useRef, useState } from "react"
import { CheckIcon, FileTextIcon, MessageSquareReplyIcon, PencilIcon, RotateCcwIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { PinNumber, PinOutlineIcon, PinStatus } from "@/components/orders/pins"
import { PinThread, type ThreadMessage } from "@/components/orders/PinThread"
import type { Pin, PinMessage } from "@/lib/pins"
import { useT } from "@/lib/i18n"
import { cn } from "@/lib/utils"

// The workshop's side of the comments: the same switch of pins by number as the client has,
// with the picked comment and its conversation below. Several pins can be ticked and answered
// with one message (e.g. one render showing two fixes), which lands in each of them.

export function AnswerablePinList({
  pins,
  numbers,
  messages,
  onSelect,
  onSend,
  emptyText,
  focus,
}: {
  pins: Pin[]
  numbers: Map<string, number>
  /** Messages of each pin, oldest first. */
  messages: Map<string, PinMessage[]>
  /** Show the pin on the file. */
  onSelect?: (pin: Pin) => void
  /** Sends one message to the given pins. */
  onSend: (pins: Pin[], message: ThreadMessage) => Promise<void>
  emptyText: string
  /** Switch to this pin and bring it into view (change `nonce` to repeat). */
  focus?: { id: string; nonce: number } | null
}) {
  const { t, locale } = useT()
  const ordered = [...pins].sort((a, b) => (numbers.get(a.id) ?? 0) - (numbers.get(b.id) ?? 0))
  const [chosenId, setChosenId] = useState<string | null>(null)
  const [handled, setHandled] = useState<number | null>(null)
  if (focus && focus.nonce !== handled) {
    setHandled(focus.nonce)
    setChosenId(focus.id)
  }
  useEffect(() => {
    if (handled === null) return
    document.getElementById("pin-switch")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [handled])
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [selecting, setSelecting] = useState(false)
  const [bulk, setBulk] = useState(false)
  const selected = ordered.filter((p) => checked.has(p.id))
  const open = ordered.filter((p) => !p.resolved || p.fix_status === "reopened")
  // Where the client waits for the workshop: asked to redo, or the client spoke last.
  const waiting = (p: Pin) => {
    const thread = messages.get(p.id) ?? []
    return p.fix_status === "reopened" || (!p.resolved && thread[thread.length - 1]?.author_role !== "workshop")
  }
  const chosen =
    ordered.find((p) => p.id === chosenId) ??
    ordered.find((p) => p.fix_status === "reopened") ??
    ordered.find(waiting) ??
    open[0] ??
    ordered[0] ??
    null

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function stopSelecting() {
    setSelecting(false)
    setChecked(new Set())
  }

  if (!chosen) return <p className="py-6 text-center text-sm text-muted-foreground">{t(emptyText)}</p>

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <PinSwitch
          pins={ordered}
          numbers={numbers}
          chosenId={chosen.id}
          onChoose={setChosenId}
          checked={selecting ? checked : undefined}
          onToggle={selecting ? toggle : undefined}
        />
        {selecting ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="text-muted-foreground">
              {selected.length ? t("{n} selected", { n: selected.length }) : t("Tick the pins to answer with one message.")}
            </span>
            <button type="button" onClick={stopSelecting} className="text-muted-foreground hover:text-foreground">{t("Cancel")}</button>
            <Button size="sm" onPress={() => setBulk(true)} isDisabled={!selected.length} className="ml-auto">
              <MessageSquareReplyIcon />{t("Answer all")}
            </Button>
          </div>
        ) : open.length > 1 && (
          <button type="button" onClick={() => setSelecting(true)} className="self-start text-sm text-muted-foreground hover:text-foreground">
            {t("Answer several at once")}
          </button>
        )}
      </div>

      {!selecting && (
        <div className="flex flex-col gap-5 rounded-xl bg-muted/40 p-5 ring-1 ring-foreground/5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-base font-medium text-foreground">{t("Pin {n}", { n: numbers.get(chosen.id) ?? "" })}</span>
            <span className="text-sm text-muted-foreground">{t("p. {n}", { n: chosen.page })}</span>
            <PinStatus pin={chosen} />
            {onSelect && (
              <button
                type="button"
                onClick={() => onSelect(chosen)}
                className="ml-auto inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <PinOutlineIcon className="size-4" />{t("Show on the file")}
              </button>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground" suppressHydrationWarning>
              {chosen.author_name} · {new Date(chosen.created_at).toLocaleDateString(locale, { day: "numeric", month: "short" })}
            </p>
            {chosen.title.trim()
              ? <p className="text-xl leading-snug font-medium break-words text-foreground">{chosen.title}</p>
              : <p className="text-base text-muted-foreground italic">{t("The client marked this spot but didn't write anything. Ask what they meant.")}</p>}
            {chosen.description && <p className="text-base leading-relaxed whitespace-pre-wrap break-words text-muted-foreground">{chosen.description}</p>}
          </div>
          {chosen.fix_status === "reopened" && <p className="text-sm font-medium text-destructive">{t("The client says it isn't done yet")}</p>}
          <PinThread
            key={chosen.id}
            messages={messages.get(chosen.id) ?? []}
            role="workshop"
            fixed={chosen.fix_status === "fixed"}
            onSend={(m) => onSend([chosen], m)}
          />
        </div>
      )}

      {bulk && (
        <Dialog isOpen onOpenChange={(v) => !v && setBulk(false)} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Answer {n} comments", { n: selected.length })}</DialogTitle>
            <DialogDescription>{t("The same message and file go into each of these pins.")}</DialogDescription>
          </DialogHeader>
          <ul className="flex max-h-32 flex-col gap-1.5 overflow-y-auto">
            {selected.map((p) => (
              <li key={p.id} className="flex items-start gap-2 text-sm">
                <PinNumber n={numbers.get(p.id)} className="size-5 text-[10px]" />
                <span className="min-w-0 flex-1 truncate text-foreground">{p.title || t("No description yet")}</span>
              </li>
            ))}
          </ul>
          <PinThread
            messages={[]}
            role="workshop"
            fixed={false}
            autoFocus
            onSend={async (m) => {
              await onSend(selected, m)
              stopSelecting()
              setBulk(false)
            }}
          />
        </Dialog>
      )}
    </div>
  )
}

/**
 * The client's comments: pins are put on the file first. Here a switch lists every pin by its
 * number; picking one shows it below, where the client writes its title and what to change,
 * or reads and continues the conversation with the workshop.
 */
export function ClientPinList({
  pins,
  numbers,
  messages,
  focus,
  onDescribe,
  onSend,
  onDelete,
  onToggleResolved,
  onShow,
  onPick,
  onOpenFile,
}: {
  pins: Pin[]
  numbers: Map<string, number>
  messages: Map<string, PinMessage[]>
  /** Switch to this pin and bring it into view (change `nonce` to repeat). */
  focus?: { id: string; nonce: number } | null
  onDescribe: (pin: Pin, title: string, description: string | null) => Promise<void> | void
  onSend: (pin: Pin, text: string) => Promise<void>
  onDelete: (pin: Pin) => Promise<void> | void
  onToggleResolved: (pin: Pin) => void
  /** Show the pin on the file. */
  onShow: (pin: Pin) => void
  /** The pin switched to, to highlight it on the file. */
  onPick?: (pin: Pin | null) => void
  /** Open the file to put pins on it. */
  onOpenFile: () => void
}) {
  const ordered = [...pins].sort((a, b) => (numbers.get(a.id) ?? 0) - (numbers.get(b.id) ?? 0))
  const [chosenId, setChosenId] = useState<string | null>(null)
  const [handled, setHandled] = useState<number | null>(null)
  if (focus && focus.nonce !== handled) {
    setHandled(focus.nonce)
    setChosenId(focus.id)
  }
  // The pin asked for; else the first one still without words; else the first still open.
  const chosen =
    ordered.find((p) => p.id === chosenId) ??
    ordered.find((p) => !p.title.trim()) ??
    ordered.find((p) => !p.resolved || p.fix_status === "reopened") ??
    ordered[0] ??
    null
  const chosenKey = chosen?.id ?? null
  useEffect(() => { onPick?.(chosen) }, [chosenKey]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (handled === null) return
    document.getElementById("pin-switch")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [handled])

  if (!chosen) return <FirstSteps onOpenFile={onOpenFile} />

  return (
    <div className="flex flex-col gap-4">
      <PinSwitch pins={ordered} numbers={numbers} chosenId={chosen.id} onChoose={setChosenId} />

      <PinPanel
        key={chosen.id}
        pin={chosen}
        number={numbers.get(chosen.id)}
        thread={messages.get(chosen.id) ?? []}
        focusKey={focus?.id === chosen.id ? `focus-${focus.nonce}` : undefined}
        onDescribe={onDescribe}
        onSend={onSend}
        onDelete={onDelete}
        onToggleResolved={onToggleResolved}
        onShow={onShow}
      />
    </div>
  )
}

/** One pin, picked in the switch: its words (written here) and the conversation about it. */
function PinPanel({ pin, number, thread, focusKey, onDescribe, onSend, onDelete, onToggleResolved, onShow }: {
  pin: Pin
  number?: number
  thread: PinMessage[]
  focusKey?: string
  onDescribe: (pin: Pin, title: string, description: string | null) => Promise<void> | void
  onSend: (pin: Pin, text: string) => Promise<void>
  onDelete: (pin: Pin) => Promise<void> | void
  onToggleResolved: (pin: Pin) => void
  onShow: (pin: Pin) => void
}) {
  const { t } = useT()
  const bare = !pin.title.trim()
  const [editing, setEditing] = useState(false)
  const writing = bare || editing
  const saved = !pin.id.startsWith("temp-")

  return (
    <div className="flex flex-col gap-5 rounded-xl bg-muted/40 p-5 ring-1 ring-foreground/5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-base font-medium text-foreground">{t("Pin {n}", { n: number ?? "" })}</span>
        <span className="text-sm text-muted-foreground">{t("p. {n}", { n: pin.page })}</span>
        {!bare && <PinStatus pin={pin} />}
        <button
          type="button"
          onClick={() => onShow(pin)}
          className="ml-auto inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <PinOutlineIcon className="size-4" />{t("Show on the file")}
        </button>
      </div>

      {writing ? (
        <PinTextForm
          pin={pin}
          disabled={!saved}
          focusKey={focusKey ?? (bare ? "mount" : "edit")}
          onSave={async (title, description) => { await onDescribe(pin, title, description); setEditing(false) }}
          onCancel={bare ? undefined : () => setEditing(false)}
        />
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <p className="text-xl leading-snug font-medium break-words text-foreground">{pin.title}</p>
            {pin.description && <p className="text-base leading-relaxed whitespace-pre-wrap break-words text-muted-foreground">{pin.description}</p>}
          </div>
          <PinThread messages={thread} role="client" fixed={pin.fix_status === "fixed"} onSend={(m) => onSend(pin, m.body)} />
        </>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
        {!writing && (
          <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1 hover:text-foreground">
            <PencilIcon className="size-3.5" />{t("Edit text")}
          </button>
        )}
        {!bare && !pin.fix_status && (
          <button type="button" onClick={() => onToggleResolved(pin)} className="inline-flex items-center gap-1 hover:text-foreground">
            {pin.resolved ? <RotateCcwIcon className="size-3.5" /> : <CheckIcon className="size-3.5" />}
            {pin.resolved ? t("Reopen") : t("Resolve")}
          </button>
        )}
        {saved && <DeleteLink onDelete={() => onDelete(pin)} />}
      </div>
    </div>
  )
}

/** The pin's title and what to change. */
function PinTextForm({ pin, disabled, focusKey, onSave, onCancel }: {
  pin: Pin
  disabled?: boolean
  /** Take the focus whenever this changes (and on mount). */
  focusKey: string
  onSave: (title: string, description: string | null) => Promise<void>
  onCancel?: () => void
}) {
  const { t } = useT()
  const [title, setTitle] = useState(pin.title)
  const [description, setDescription] = useState(pin.description ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    // After the viewer closes it hands focus back to its button; take it once that is done.
    const timer = window.setTimeout(() => titleRef.current?.focus({ preventScroll: true }), 350)
    return () => window.clearTimeout(timer)
  }, [focusKey])
  const canSave = !disabled && !!title.trim() && !saving

  async function save() {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      await onSave(title.trim(), description.trim() || null)
    } catch (e) {
      setError((e as Error)?.message || t("Something went wrong"))
    }
    setSaving(false)
  }

  return (
    <div className="flex flex-col gap-2.5">
      <Input
        ref={titleRef}
        value={title}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value.slice(0, 200))}
        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") { e.preventDefault(); save() } }}
        placeholder={t("Title, e.g. Bigger logo")}
        aria-label={t("Title")}
        className="h-11 bg-background text-base"
      />
      <Textarea
        value={description}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value.slice(0, 2000))}
        placeholder={t("Your question or what to change (optional)")}
        aria-label={t("Description")}
        rows={3}
        className="bg-background text-base"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        {onCancel && <Button variant="ghost" size="sm" onPress={onCancel}>{t("Cancel")}</Button>}
        <Button size="sm" onPress={save} isDisabled={!canSave}>
          {saving ? t("Saving...") : t("Save")}
        </Button>
      </div>
    </div>
  )
}

function DeleteLink({ onDelete }: { onDelete: () => Promise<void> | void }) {
  const { t } = useT()
  const [asking, setAsking] = useState(false)
  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className="inline-flex items-center gap-1 hover:text-destructive">
        <Trash2Icon className="size-3" />{t("Delete")}
      </button>
    )
  }
  return (
    <span className="inline-flex items-center gap-2">
      <span className="text-foreground">{t("Delete this comment?")}</span>
      <button type="button" onClick={() => onDelete()} className="font-medium text-destructive">{t("Delete")}</button>
      <button type="button" onClick={() => setAsking(false)} className="hover:text-foreground">{t("Cancel")}</button>
    </span>
  )
}

/**
 * Every pin by its number, as one row of round buttons: the same switch for the client and the
 * workshop. Bare pins are dashed, resolved ones carry a check, a red dot means the client asked
 * to redo it. With `checked`, the buttons tick several pins instead of switching.
 */
function PinSwitch({ pins, numbers, chosenId, onChoose, checked, onToggle }: {
  pins: Pin[]
  numbers: Map<string, number>
  chosenId: string | null
  onChoose: (id: string) => void
  checked?: Set<string>
  onToggle?: (id: string) => void
}) {
  const { t } = useT()
  const ticking = !!checked && !!onToggle
  return (
    <div id="pin-switch" role={ticking ? "group" : "tablist"} aria-label={t("Pins")} className="flex scroll-mt-20 flex-wrap gap-2">
      {pins.map((p) => {
        const on = ticking ? checked!.has(p.id) : p.id === chosenId
        const bare = !p.title.trim()
        const reopened = p.fix_status === "reopened"
        const done = p.resolved && !reopened
        return (
          <button
            key={p.id}
            type="button"
            role={ticking ? "checkbox" : "tab"}
            aria-selected={ticking ? undefined : on}
            aria-checked={ticking ? on : undefined}
            title={p.title || t("No description yet")}
            onClick={() => (ticking ? onToggle!(p.id) : onChoose(p.id))}
            className={cn(
              "relative flex size-11 items-center justify-center rounded-full text-base font-semibold tabular-nums transition-colors",
              on
                ? "bg-primary text-primary-foreground"
                : bare
                  ? "text-foreground outline-1 -outline-offset-1 outline-dashed outline-foreground/50 hover:bg-hover"
                  : done
                    ? "bg-muted text-muted-foreground hover:bg-hover"
                    : "bg-muted text-foreground ring-1 ring-border hover:bg-hover"
            )}
          >
            {numbers.get(p.id) ?? ""}
            {ticking && on && <CheckIcon className="absolute -right-0.5 -bottom-0.5 size-4 rounded-full bg-primary p-0.5 text-primary-foreground ring-2 ring-card" strokeWidth={3} />}
            {!ticking && done && !on && <CheckIcon className="absolute -right-0.5 -bottom-0.5 size-3.5 rounded-full bg-card p-0.5" strokeWidth={3} />}
            {reopened && <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-destructive ring-2 ring-card" />}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Before the first pin: how commenting works, in three small pictures drawn like the real
 * thing (the file tile, a pin on a page, the switch of numbers).
 */
function FirstSteps({ onOpenFile }: { onOpenFile: () => void }) {
  const { t } = useT()
  const steps = [
    {
      title: t("Open the file"),
      text: t("It opens full screen. Zoom in and look at every page."),
      picture: (
        <span className="flex w-full items-center gap-2.5 rounded-lg bg-card p-2.5 ring-1 ring-foreground/10">
          <FileTextIcon className="size-6 shrink-0 text-muted-foreground" />
          <span className="flex flex-1 flex-col gap-1.5">
            <span className="h-1.5 w-3/4 rounded-full bg-foreground/25" />
            <span className="h-1.5 w-1/2 rounded-full bg-foreground/10" />
          </span>
        </span>
      ),
    },
    {
      title: t("Tap where something is wrong"),
      text: t("A pin with a number appears there. Put as many as you need."),
      picture: (
        <span className="relative block h-16 w-full rounded-lg bg-white ring-1 ring-foreground/10">
          <span className="absolute top-3 left-3 h-1.5 w-1/3 rounded-full bg-black/15" />
          <span className="absolute top-7 left-3 h-6 w-2/5 rounded-sm bg-black/8" />
          <PinNumber n={1} className="absolute top-2 right-1/4 size-6 shadow-sm" />
          <PinNumber n={2} className="absolute bottom-2 left-1/2 size-6 shadow-sm" />
        </span>
      ),
    },
    {
      title: t("Pick the number here and write"),
      text: t("A short title and what to change. The answer comes in the same pin."),
      picture: (
        <span className="flex w-full flex-col gap-2 rounded-lg bg-card p-2.5 ring-1 ring-foreground/10">
          <span className="flex gap-1.5">
            <PinNumber n={1} className="size-6" />
            <span className="flex size-6 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-foreground ring-1 ring-border">2</span>
          </span>
          <span className="h-1.5 w-2/3 rounded-full bg-foreground/25" />
        </span>
      ),
    },
  ]
  return (
    <div className="flex flex-col gap-5">
      <ol className="grid gap-3 sm:grid-cols-3">
        {steps.map((step, i) => (
          <li key={i} className="flex flex-col gap-3 rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/5">
            {step.picture}
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-foreground">
                <span className="mr-1.5 text-muted-foreground tabular-nums">{i + 1}</span>
                {step.title}
              </p>
              <p className="text-sm text-muted-foreground">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <Button onPress={onOpenFile} className="self-start">
        <PinOutlineIcon />{t("Open the file and put a pin")}
      </Button>
    </div>
  )
}
