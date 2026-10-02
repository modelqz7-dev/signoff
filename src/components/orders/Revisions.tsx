"use client"

import { useState } from "react"
import { CheckIcon, MessageSquareReplyIcon, PaperclipIcon, ReplyIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PinGlyph } from "@/components/orders/pins"
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
}: {
  pins: Pin[]
  numbers: Map<string, number>
  /** Messages of each pin, oldest first. */
  messages: Map<string, PinMessage[]>
  onSelect?: (pin: Pin) => void
  /** Sends one message to the given pins. */
  onSend: (pins: Pin[], message: ThreadMessage) => Promise<void>
  emptyText: string
}) {
  const { t } = useT()
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [openId, setOpenId] = useState<string | null>(null)
  const [bulk, setBulk] = useState(false)
  const active = pins.filter((p) => !p.resolved || p.fix_status === "reopened")
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

  const row = (pin: Pin) => {
    const thread = messages.get(pin.id) ?? []
    const last = thread[thread.length - 1]
    const isOpen = openId === pin.id
    const isDone = pin.resolved && pin.fix_status !== "reopened"
    return (
      <div key={pin.id} className={cn("flex items-start gap-2.5 rounded-lg px-2 py-2.5 transition-colors", (checked.has(pin.id) || isOpen) && "bg-muted/50")}>
        <input
          type="checkbox"
          checked={checked.has(pin.id)}
          onChange={() => toggle(pin.id)}
          aria-label={t("Select comment {n}", { n: numbers.get(pin.id) ?? "" })}
          className="mt-1 size-4 shrink-0 accent-[var(--foreground)]"
        />
        <PinGlyph label={numbers.get(pin.id)} resolved={isDone} className="mt-0.5" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <button type="button" onClick={() => onSelect?.(pin)} className={cn("block w-full text-left", !onSelect && "cursor-default")}>
            <span className={cn("block text-sm font-medium", isDone ? "text-muted-foreground" : "text-foreground")}>{pin.title}</span>
            {pin.description && <span className="mt-0.5 block text-xs text-muted-foreground">{pin.description}</span>}
            <span className="mt-0.5 block text-[11px] text-muted-foreground/70">{pin.author_name} · {t("p. {n}", { n: pin.page })}</span>
          </button>
          {pin.fix_status === "reopened" && <p className="text-xs font-medium text-destructive">{t("The client says it isn't done yet")}</p>}
          {isOpen ? (
            <PinThread
              messages={thread}
              role="workshop"
              fixed={pin.fix_status === "fixed"}
              autoFocus
              onSend={(m) => onSend([pin], m)}
            />
          ) : last ? (
            <button type="button" onClick={() => setOpenId(pin.id)} className="flex min-w-0 items-center gap-1 text-left text-xs text-muted-foreground hover:text-foreground">
              {last.marks_fixed && <CheckIcon className="size-3 shrink-0" strokeWidth={3} />}
              {last.file_url && <PaperclipIcon className="size-3 shrink-0" />}
              <span className="truncate">
                {last.author_role === "workshop" ? t("You") : last.author_name}: {last.body || t("File")}
              </span>
              {thread.length > 1 && <span className="shrink-0">· {t("{n} messages", { n: thread.length })}</span>}
            </button>
          ) : null}
        </div>
        <Button variant="ghost" size="sm" onPress={() => setOpenId(isOpen ? null : pin.id)} className="shrink-0">
          {isOpen ? <XIcon /> : <ReplyIcon />}
          <span className="hidden sm:inline">{isOpen ? t("Close") : t("Answer")}</span>
        </Button>
      </div>
    )
  }

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
            onClick={() => setBulk(true)}
            className="ml-auto inline-flex h-7 items-center gap-1.5 rounded-md bg-background px-2.5 text-xs font-medium text-foreground"
          >
            <MessageSquareReplyIcon className="size-3.5" />
            {t("Answer all")}
          </button>
        </div>
      )}
      {active.map(row)}
      {done.length > 0 && (
        <>
          <p className="mt-2 border-t border-border px-1 pt-3 text-[11px] text-muted-foreground/60">{t("Resolved")}</p>
          {done.map(row)}
        </>
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
                <PinGlyph label={numbers.get(p.id)} size="sm" className="mt-0.5" />
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
              setChecked(new Set())
              setBulk(false)
            }}
          />
        </Dialog>
      )}
    </div>
  )
}
