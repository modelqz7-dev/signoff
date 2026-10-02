"use client"

import { useEffect, useRef, useState } from "react"
import { CheckIcon, MessageSquareReplyIcon, PencilIcon, RotateCcwIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { PinGroups, PinNumber, PinOutlineIcon, PinRow, PinStatus } from "@/components/orders/pins"
import { PinThread, type ThreadMessage } from "@/components/orders/PinThread"
import type { Pin, PinMessage } from "@/lib/pins"
import { useT } from "@/lib/i18n"
import { cn } from "@/lib/utils"

// The workshop's list of the client's comments. Each one is a conversation that opens right
// under it; several can be ticked and answered with one message (e.g. one render showing two
// fixes), which lands in each of them.

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
  onSelect?: (pin: Pin) => void
  /** Sends one message to the given pins. */
  onSend: (pins: Pin[], message: ThreadMessage) => Promise<void>
  emptyText: string
  /** Open this pin's conversation and bring it into view (change `nonce` to repeat). */
  focus?: { id: string; nonce: number } | null
}) {
  const { t } = useT()
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [openId, setOpenId] = useState<string | null>(null)
  const [handled, setHandled] = useState<number | null>(null)
  if (focus && focus.nonce !== handled) {
    setHandled(focus.nonce)
    setOpenId(focus.id)
  }
  useEffect(() => {
    if (handled === null || !openId) return
    document.getElementById(`pin-row-${openId}`)?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [handled, openId])
  const [bulk, setBulk] = useState(false)
  // Ticking several comments to answer them at once is a mode, so the rows stay plain.
  const [selecting, setSelecting] = useState(false)
  const selected = pins.filter((p) => checked.has(p.id))
  const answerable = pins.filter((p) => !p.resolved || p.fix_status === "reopened").length

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

  if (!pins.length) return <p className="py-6 text-center text-xs text-muted-foreground">{t(emptyText)}</p>

  const row = (pin: Pin) => {
    const thread = messages.get(pin.id) ?? []
    const isOpen = openId === pin.id && !selecting
    return (
      <PinRow
        key={pin.id}
        pin={pin}
        number={numbers.get(pin.id)}
        last={isOpen ? undefined : thread[thread.length - 1]}
        selected={checked.has(pin.id) || isOpen}
        onClick={() => (selecting ? toggle(pin.id) : setOpenId(isOpen ? null : pin.id))}
        leading={selecting && (
          <input
            type="checkbox"
            checked={checked.has(pin.id)}
            onChange={() => toggle(pin.id)}
            aria-label={t("Select comment {n}", { n: numbers.get(pin.id) ?? "" })}
            className="mt-1 size-4 shrink-0 accent-[var(--foreground)]"
          />
        )}
        trailing={onSelect && !selecting && (
          <button
            type="button"
            onClick={() => onSelect(pin)}
            title={t("Show on the file")}
            aria-label={t("Show on the file")}
            className="-mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-hover hover:text-foreground"
          >
            <PinOutlineIcon />
          </button>
        )}
      >
        {/* the conversation opens under the comment, at the text's width (room to type on phones) */}
        {isOpen && (
          <div className="px-3 pb-3 sm:pl-12">
            <PinThread
              messages={thread}
              role="workshop"
              fixed={pin.fix_status === "fixed"}
              autoFocus
              onSend={(m) => onSend([pin], m)}
            />
          </div>
        )}
      </PinRow>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {selecting ? (
        <div className="sticky top-0 z-10 mb-1 flex items-center gap-2 rounded-lg bg-foreground px-3 py-2 text-background">
          <span className="text-xs font-medium">{t("{n} selected", { n: selected.length })}</span>
          <button type="button" onClick={stopSelecting} className="text-xs opacity-70 hover:opacity-100">
            {t("Cancel")}
          </button>
          <button
            type="button"
            onClick={() => setBulk(true)}
            disabled={!selected.length}
            className="ml-auto inline-flex h-7 items-center gap-1.5 rounded-md bg-background px-2.5 text-xs font-medium text-foreground disabled:opacity-40"
          >
            <MessageSquareReplyIcon className="size-3.5" />
            {t("Answer all")}
          </button>
        </div>
      ) : answerable > 1 && (
        <button
          type="button"
          onClick={() => { setSelecting(true); setOpenId(null) }}
          className="self-end px-3 text-xs text-muted-foreground hover:text-foreground"
        >
          {t("Answer several at once")}
        </button>
      )}
      <PinGroups pins={pins} render={row} />

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
                <span className="min-w-0 flex-1 truncate text-foreground">{p.title}</span>
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
}) {
  const { t } = useT()
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

  if (!chosen) {
    return (
      <p className="px-1 py-6 text-center text-sm text-muted-foreground">
        {t("Open the file and put pins where something should change. They will show up here by their numbers.")}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div id="pin-switch" role="tablist" aria-label={t("Pins")} className="flex scroll-mt-20 flex-wrap gap-2">
        {ordered.map((p) => {
          const on = p.id === chosen.id
          const bare = !p.title.trim()
          const reopened = p.fix_status === "reopened"
          const done = p.resolved && !reopened
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={on}
              title={p.title || t("No description yet")}
              onClick={() => setChosenId(p.id)}
              className={cn(
                "relative flex size-11 items-center justify-center rounded-full text-base font-semibold tabular-nums transition-colors",
                on
                  ? "bg-foreground text-background"
                  : bare
                    ? "text-foreground outline-1 -outline-offset-1 outline-dashed outline-foreground/50 hover:bg-hover"
                    : done
                      ? "bg-muted text-muted-foreground hover:bg-hover"
                      : "bg-muted text-foreground ring-1 ring-border hover:bg-hover"
              )}
            >
              {numbers.get(p.id) ?? ""}
              {done && !on && <CheckIcon className="absolute -right-0.5 -bottom-0.5 size-3.5 rounded-full bg-card p-0.5" strokeWidth={3} />}
              {reopened && <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-destructive ring-2 ring-card" />}
            </button>
          )
        })}
      </div>

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
        placeholder={t("Title, e.g. Black handles")}
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
