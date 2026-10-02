"use client"

import { useEffect, useRef, useState } from "react"
import { CheckIcon, MessageSquareReplyIcon, PencilIcon, RotateCcwIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { PinGroups, PinNumber, PinOutlineIcon, PinRow } from "@/components/orders/pins"
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
 * The client's comments: pins are put on the file first, then a comment is written here for
 * one of them, picked by its number. Described comments open their conversation with the
 * workshop.
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
  onOpenFile,
  onPick,
}: {
  pins: Pin[]
  numbers: Map<string, number>
  messages: Map<string, PinMessage[]>
  /** Open this comment (or pick this pin for a new one) and bring it into view (change `nonce` to repeat). */
  focus?: { id: string; nonce: number } | null
  onDescribe: (pin: Pin, title: string, description: string | null) => Promise<void> | void
  onSend: (pin: Pin, text: string) => Promise<void>
  onDelete: (pin: Pin) => Promise<void> | void
  onToggleResolved: (pin: Pin) => void
  /** Show the pin on the file. */
  onShow: (pin: Pin) => void
  /** Open the file to put a pin on it. */
  onOpenFile: () => void
  /** The pin picked for a new comment, to highlight it on the file. */
  onPick?: (pin: Pin | null) => void
}) {
  const { t } = useT()
  const [openId, setOpenId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [handled, setHandled] = useState<number | null>(null)
  const bare = pins.filter((p) => !p.title.trim()).sort((a, b) => (numbers.get(a.id) ?? 0) - (numbers.get(b.id) ?? 0))
  const described = pins.filter((p) => p.title.trim())
  const focusIsBare = !!focus && bare.some((p) => p.id === focus.id)
  if (focus && focus.nonce !== handled) {
    setHandled(focus.nonce)
    if (!focusIsBare) setOpenId(focus.id)
  }
  useEffect(() => {
    if (handled === null) return
    const target = document.getElementById(focusIsBare ? "new-comment" : `pin-row-${openId}`)
    target?.scrollIntoView({ behavior: "smooth", block: "center" })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when a new request comes in
  }, [handled])

  const row = (pin: Pin) => {
    const thread = messages.get(pin.id) ?? []
    const editing = editingId === pin.id
    const isOpen = editing || openId === pin.id
    return (
      <PinRow
        key={pin.id}
        pin={pin}
        number={numbers.get(pin.id)}
        last={isOpen ? undefined : thread[thread.length - 1]}
        selected={isOpen}
        onClick={() => { setOpenId(isOpen ? null : pin.id); setEditingId(null) }}
        trailing={(
          <button
            type="button"
            onClick={() => onShow(pin)}
            title={t("Show on the file")}
            aria-label={t("Show on the file")}
            className="-mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-hover hover:text-foreground"
          >
            <PinOutlineIcon />
          </button>
        )}
      >
        {isOpen && (
          <div className="flex flex-col gap-3 px-3 pb-3 sm:pl-12">
            {editing ? (
              <DescribeField
                initial={pin.title}
                focusKey="mount"
                onSave={async (text) => { await onDescribe(pin, text, pin.description ?? null); setEditingId(null) }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <PinThread messages={thread} role="client" fixed={pin.fix_status === "fixed"} onSend={(m) => onSend(pin, m.body)} />
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {!editing && (
                <button type="button" onClick={() => setEditingId(pin.id)} className="inline-flex items-center gap-1 hover:text-foreground">
                  <PencilIcon className="size-3" />{t("Edit text")}
                </button>
              )}
              {!pin.fix_status && (
                <button type="button" onClick={() => onToggleResolved(pin)} className="inline-flex items-center gap-1 hover:text-foreground">
                  {pin.resolved ? <RotateCcwIcon className="size-3" /> : <CheckIcon className="size-3" />}
                  {pin.resolved ? t("Reopen") : t("Resolve")}
                </button>
              )}
              <DeleteLink onDelete={() => onDelete(pin)} />
            </div>
          </div>
        )}
      </PinRow>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <NewComment
        bare={bare}
        numbers={numbers}
        focus={focusIsBare ? focus : null}
        onSave={onDescribe}
        onDelete={onDelete}
        onOpenFile={onOpenFile}
        onPick={onPick}
      />
      {described.length > 0 && <PinGroups pins={described} render={row} />}
    </div>
  )
}

/** "New comment": pick one of the pins put on the file by its number, then say what is wrong. */
function NewComment({ bare, numbers, focus, onSave, onDelete, onOpenFile, onPick }: {
  bare: Pin[]
  numbers: Map<string, number>
  focus: { id: string; nonce: number } | null
  onSave: (pin: Pin, title: string, description: string | null) => Promise<void> | void
  onDelete: (pin: Pin) => Promise<void> | void
  onOpenFile: () => void
  onPick?: (pin: Pin | null) => void
}) {
  const { t } = useT()
  const [chosenId, setChosenId] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const [handled, setHandled] = useState<number | null>(null)
  if (focus && focus.nonce !== handled) {
    setHandled(focus.nonce)
    setChosenId(focus.id)
  }
  // The pin asked for, else the one last put on the file.
  const chosen = bare.find((p) => p.id === chosenId) ?? bare[bare.length - 1] ?? null
  const chosenKey = chosen?.id ?? null
  useEffect(() => { onPick?.(chosen) }, [chosenKey]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (handled === null) return
    // After the viewer closes it hands focus back to its button; take it once that is done.
    const timer = window.setTimeout(() => titleRef.current?.focus({ preventScroll: true }), 350)
    return () => window.clearTimeout(timer)
  }, [handled])

  const saved = !!chosen && !chosen.id.startsWith("temp-")
  const canSave = saved && !!title.trim() && !saving

  async function save() {
    if (!chosen || !canSave) return
    setSaving(true)
    setError(null)
    try {
      await onSave(chosen, title.trim(), description.trim() || null)
      setTitle("")
      setDescription("")
      setChosenId(null)
    } catch (e) {
      setError((e as Error)?.message || t("Something went wrong"))
    }
    setSaving(false)
  }

  return (
    <div id="new-comment" className="flex scroll-mt-20 flex-col gap-3 rounded-xl bg-muted/40 p-3 ring-1 ring-foreground/5">
      <p className="text-sm font-medium text-foreground">{t("New comment")}</p>
      {bare.length === 0 ? (
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{t("First put a pin on the file where something should change. It will show up here.")}</p>
          <Button size="sm" variant="outline" onPress={onOpenFile} className="shrink-0">
            <PinOutlineIcon />{t("Put a pin")}
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">{t("Pin")}</span>
            <div role="radiogroup" aria-label={t("Pin")} className="flex flex-wrap gap-1.5">
              {bare.map((p) => {
                const on = p.id === chosen?.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setChosenId(p.id)}
                    className={cn(
                      "flex size-8 items-center justify-center rounded-full text-xs font-semibold tabular-nums transition-colors",
                      on ? "bg-foreground text-background" : "bg-background text-foreground ring-1 ring-border hover:bg-hover"
                    )}
                  >
                    {numbers.get(p.id) ?? ""}
                  </button>
                )
              })}
            </div>
            <span className="text-xs text-muted-foreground">{chosen ? t("p. {n}", { n: chosen.page }) : ""}</span>
            {chosen && saved && (
              <button type="button" onClick={() => onDelete(chosen)} className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
                <Trash2Icon className="size-3" />{t("Remove pin")}
              </button>
            )}
          </div>
          <Input
            ref={titleRef}
            value={title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value.slice(0, 200))}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") { e.preventDefault(); save() } }}
            placeholder={t("Title, e.g. Black handles")}
            aria-label={t("Title")}
            className="h-10 bg-background text-[15px]"
          />
          <Textarea
            value={description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value.slice(0, 2000))}
            placeholder={t("What is wrong and how it should be (optional)")}
            aria-label={t("Description")}
            rows={2}
            className="bg-background text-[15px]"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onPress={onOpenFile}>
              <PinOutlineIcon />{t("Put another pin")}
            </Button>
            <Button size="sm" onPress={save} isDisabled={!canSave}>
              {saving ? t("Saving...") : t("Add comment")}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

function DescribeField({ initial, focusKey, disabled, onSave, onCancel }: {
  initial: string
  /** Take the focus whenever this changes (and on mount when set). */
  focusKey?: string
  disabled?: boolean
  onSave: (text: string) => Promise<void>
  onCancel?: () => void
}) {
  const { t } = useT()
  const [text, setText] = useState(initial)
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (!focusKey) return
    // After the viewer closes it hands focus back to its button; take it once that is done.
    const timer = window.setTimeout(() => ref.current?.focus({ preventScroll: true }), 350)
    return () => window.clearTimeout(timer)
  }, [focusKey])
  const canSave = !!text.trim() && !saving && !disabled

  async function save() {
    if (!canSave) return
    setSaving(true)
    try { await onSave(text.trim()) } finally { setSaving(false) }
  }

  return (
    <div className="flex items-end gap-1.5 rounded-xl border border-input bg-background px-2 py-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
      <textarea
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 200))}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); save() } else if (e.key === "Escape") onCancel?.() }}
        rows={1}
        placeholder={t("What should change here?")}
        aria-label={t("What should change here?")}
        className="max-h-40 min-h-8 flex-1 resize-none bg-transparent px-1 py-1.5 text-[15px] outline-none [field-sizing:content] placeholder:text-muted-foreground"
      />
      <button
        type="button"
        onClick={save}
        disabled={!canSave}
        className="mb-0.5 inline-flex h-8 shrink-0 items-center rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition-opacity disabled:opacity-30"
      >
        {t("Save")}
      </button>
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
