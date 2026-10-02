"use client"

import { useRef, useState } from "react"
import { PaperclipIcon, ReplyIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PinAnswer, PinGlyph } from "@/components/orders/pins"
import type { FixStatus, Pin } from "@/lib/pins"
import { useT } from "@/lib/i18n"
import { cn } from "@/lib/utils"

// Answering the client's comments right on the pins: fixed or left as is, a note, and a file
// (a photo or render of the fix) the client opens from the pin. One answer can go to several
// comments at once, e.g. one render that shows two fixes.

export type PinReply = { status: Exclude<FixStatus, "reopened">; reply: string; file: File | null }

/** The workshop's list of comments, with selection and "Answer". */
export function AnswerablePinList({
  pins,
  numbers,
  onSelect,
  onAnswer,
  emptyText,
}: {
  pins: Pin[]
  numbers: Map<string, number>
  onSelect?: (pin: Pin) => void
  /** Saves one answer for the given comments. */
  onAnswer: (pins: Pin[], reply: PinReply) => Promise<void>
  emptyText: string
}) {
  const { t } = useT()
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [answering, setAnswering] = useState<Pin[] | null>(null)
  const open = pins.filter((p) => !p.resolved || p.fix_status === "reopened")
  const done = pins.filter((p) => p.resolved && p.fix_status !== "reopened")
  const selected = pins.filter((p) => checked.has(p.id))

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (!pins.length) return <p className="py-6 text-center text-xs text-muted-foreground">{t(emptyText)}</p>

  const row = (pin: Pin) => (
    <div key={pin.id} className={cn("flex items-start gap-2.5 rounded-lg px-2 py-2.5 transition-colors", checked.has(pin.id) && "bg-muted/60")}>
      <input
        type="checkbox"
        checked={checked.has(pin.id)}
        onChange={() => toggle(pin.id)}
        aria-label={t("Select comment {n}", { n: numbers.get(pin.id) ?? "" })}
        className="mt-1 size-4 shrink-0 accent-[var(--foreground)]"
      />
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        <PinGlyph label={numbers.get(pin.id)} resolved={pin.resolved && pin.fix_status !== "reopened"} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <button type="button" onClick={() => onSelect?.(pin)} className={cn("block w-full text-left", !onSelect && "cursor-default")}>
            <span className={cn("block text-sm font-medium text-foreground", pin.resolved && pin.fix_status !== "reopened" && "text-muted-foreground")}>{pin.title}</span>
            {pin.description && <span className="mt-0.5 block text-xs text-muted-foreground">{pin.description}</span>}
            <span className="mt-0.5 block text-[11px] text-muted-foreground/70">{pin.author_name} · {t("p. {n}", { n: pin.page })}</span>
          </button>
          <PinAnswer pin={pin} className="mt-2" />
        </div>
      </div>
      <Button variant="ghost" size="sm" onPress={() => setAnswering([pin])} className="shrink-0">
        <ReplyIcon />
        <span className="hidden sm:inline">{pin.fix_status ? t("Edit") : t("Answer")}</span>
      </Button>
    </div>
  )

  return (
    <div className="flex flex-col gap-1">
      {selected.length > 0 && (
        <div className="sticky top-0 z-10 mb-1 flex items-center gap-2 rounded-lg bg-foreground px-3 py-2 text-background">
          <span className="text-xs font-medium">{t("{n} selected", { n: selected.length })}</span>
          <button type="button" onClick={() => setChecked(new Set())} aria-label={t("Clear selection")} className="opacity-70 hover:opacity-100">
            <XIcon className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setAnswering(selected)}
            className="ml-auto inline-flex h-7 items-center gap-1.5 rounded-md bg-background px-2.5 text-xs font-medium text-foreground"
          >
            <ReplyIcon className="size-3.5" />
            {t("Answer all")}
          </button>
        </div>
      )}
      {open.map(row)}
      {done.length > 0 && (
        <>
          <p className="mt-2 border-t border-border px-1 pt-3 text-[11px] text-muted-foreground/60">{t("Resolved")}</p>
          {done.map(row)}
        </>
      )}
      {answering && (
        <AnswerDialog
          pins={answering}
          numbers={numbers}
          onClose={() => setAnswering(null)}
          onSave={async (reply) => {
            await onAnswer(answering, reply)
            setChecked(new Set())
          }}
        />
      )}
    </div>
  )
}

function AnswerDialog({ pins, numbers, onClose, onSave }: {
  pins: Pin[]
  numbers: Map<string, number>
  onClose: () => void
  onSave: (reply: PinReply) => Promise<void>
}) {
  const { t } = useT()
  const first = pins[0]
  const [status, setStatus] = useState<PinReply["status"]>(first.fix_status === "kept" ? "kept" : "fixed")
  const [reply, setReply] = useState(pins.length === 1 ? first.reply ?? "" : "")
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await onSave({ status, reply: reply.trim(), file })
      onClose()
    } catch (e) {
      setError((e as Error)?.message || t("Something went wrong"))
      setSaving(false)
    }
  }

  return (
    <Dialog isOpen onOpenChange={(v) => !v && onClose()} className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{pins.length === 1 ? t("Answer the comment") : t("Answer {n} comments", { n: pins.length })}</DialogTitle>
        <DialogDescription>{t("The client sees your answer and the file when they tap the pin.")}</DialogDescription>
      </DialogHeader>

      <ul className="flex max-h-32 flex-col gap-1.5 overflow-y-auto">
        {pins.map((p) => (
          <li key={p.id} className="flex items-start gap-2 text-sm">
            <PinGlyph label={numbers.get(p.id)} size="sm" className="mt-0.5" />
            <span className="min-w-0 flex-1 truncate text-foreground">{p.title}</span>
          </li>
        ))}
      </ul>

      <div role="radiogroup" aria-label={t("What did you do?")} className="flex rounded-lg bg-muted p-0.5">
        {(["fixed", "kept"] as const).map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={status === s}
            onClick={() => setStatus(s)}
            className={cn("h-8 flex-1 rounded-md text-sm font-medium transition-colors", status === s ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            {s === "fixed" ? t("Fixed") : t("Not changed")}
          </button>
        ))}
      </div>

      <textarea
        value={reply}
        onChange={(e) => setReply(e.target.value.slice(0, 1000))}
        rows={3}
        placeholder={status === "fixed" ? t("What you changed (optional)") : t("Why it stays as is (optional)")}
        aria-label={t("Note for the client (optional)")}
        className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />

      <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] ?? null); e.target.value = "" }} />
      {file ? (
        <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm">
          <PaperclipIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate">{file.name}</span>
          <button type="button" onClick={() => setFile(null)} aria-label={t("Remove")} className="text-muted-foreground hover:text-foreground">
            <XIcon className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border py-3 text-sm text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
        >
          <PaperclipIcon className="size-4" />
          {pins.some((p) => p.reply_file_url) ? t("Replace the file (photo, render or PDF)") : t("Attach a file: photo, render or PDF")}
        </button>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
      <DialogFooter>
        <Button variant="outline" onPress={onClose} isDisabled={saving}>{t("Cancel")}</Button>
        <Button onPress={save} isDisabled={saving}>{saving ? t("Saving...") : t("Send to the client")}</Button>
      </DialogFooter>
    </Dialog>
  )
}
