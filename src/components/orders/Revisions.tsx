"use client"

import { useEffect, useState } from "react"
import { MessageSquareReplyIcon } from "lucide-react"
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PinGroups, PinNumber, PinOutlineIcon, PinRow } from "@/components/orders/pins"
import { PinThread, type ThreadMessage } from "@/components/orders/PinThread"
import type { Pin, PinMessage } from "@/lib/pins"
import { useT } from "@/lib/i18n"

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
