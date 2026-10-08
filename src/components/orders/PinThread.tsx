"use client"

import { useRef, useState } from "react"
import { ArrowUpIcon, CheckIcon, FileTextIcon, PaperclipIcon, XIcon } from "lucide-react"
import { AttachmentViewer } from "@/components/orders/AttachmentViewer"
import { useFileUrl } from "@/lib/files"
import { useT } from "@/lib/i18n"
import type { PinMessage } from "@/lib/pins"
import { cn, isPdfUrl } from "@/lib/utils"

// A pin is one conversation about one spot: the client's comment, then short messages from
// both sides. The workshop can attach a file and mark the spot fixed; a client message on a
// fixed pin opens it again (the server does that). The last two messages show, older ones fold.

export type ThreadMessage = { body: string; file: File | null; fixed: boolean }

const SHOWN = 4

export function PinThread({
  messages,
  role,
  fixed,
  onSend,
  autoFocus,
}: {
  messages: PinMessage[]
  /** Who is writing here. Only the workshop attaches files and marks the spot fixed. */
  role: "client" | "workshop"
  /** The pin is currently marked fixed. */
  fixed: boolean
  onSend: (message: ThreadMessage) => Promise<void>
  autoFocus?: boolean
}) {
  const { t } = useT()
  const [expanded, setExpanded] = useState(false)
  const hidden = expanded ? 0 : Math.max(0, messages.length - SHOWN)
  const shown = messages.slice(hidden)

  return (
    <div className="flex flex-col gap-4">
      {hidden > 0 && (
        <button type="button" onClick={() => setExpanded(true)} className="self-start pl-10 text-xs text-muted-foreground hover:text-foreground">
          {t("Show earlier messages ({n})", { n: hidden })}
        </button>
      )}
      {shown.map((m) => <Message key={m.id} message={m} />)}
      <Composer role={role} fixed={fixed} onSend={onSend} autoFocus={autoFocus} hasMessages={messages.length > 0} />
    </div>
  )
}

/**
 * One line of a conversation, like in a messenger: initial, name, time, then the text in a
 * size that reads easily. The client's comment itself is shown the same way.
 */
function ChatLine({
  name,
  shop,
  date,
  extra,
  children,
}: {
  name: string
  /** Written by the workshop (its initial is filled). */
  shop?: boolean
  date: string
  /** Shown after the date, e.g. "✓ Fixed". */
  extra?: React.ReactNode
  children: React.ReactNode
}) {
  const { locale } = useT()
  const when = new Date(date).toLocaleDateString(locale, { day: "numeric", month: "short" })
  return (
    <div className="flex gap-3">
      <span
        aria-hidden="true"
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold uppercase",
          shop ? "bg-primary text-primary-foreground" : "bg-muted text-foreground ring-1 ring-foreground/10"
        )}
      >
        {name.trim().charAt(0) || "·"}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-x-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{name}</span>
          <span suppressHydrationWarning>{when}</span>
          {extra}
        </div>
        {children}
      </div>
    </div>
  )
}

function Message({ message }: { message: PinMessage }) {
  const { t } = useT()
  const shop = message.author_role === "workshop"
  return (
    <ChatLine
      name={message.author_name || (shop ? t("Contractor") : t("Client"))}
      shop={shop}
      date={message.created_at}
      extra={message.marks_fixed && (
        <span className="inline-flex items-center gap-0.5 font-medium text-foreground">
          <CheckIcon className="size-3" strokeWidth={3} />
          {t("Fixed")}
        </span>
      )}
    >
      {message.body && <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words text-foreground">{message.body}</p>}
      {message.file_url && <Attachment url={message.file_url} />}
    </ChatLine>
  )
}

function Attachment({ url }: { url: string }) {
  const { t } = useT()
  // The portal gets links already signed by the server; the workshop signs its own.
  const presigned = url.includes("/object/sign/")
  const signed = useFileUrl(presigned ? null : url)
  const file = presigned ? url : signed
  const [viewing, setViewing] = useState(false)
  // A small thumbnail: tapping opens it large, so a tall photo never pushes the reply box away.
  if (!file) return <span className="h-20 w-32 animate-pulse rounded-md bg-muted" />
  return (
    <>
      <button type="button" onClick={() => setViewing(true)} className="group w-fit overflow-hidden rounded-md text-left ring-1 ring-foreground/10">
        {isPdfUrl(url) ? (
          <span className="flex items-center gap-2 bg-background px-3 py-2 text-sm text-foreground group-hover:bg-hover">
            <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
            {t("Open the file")}
          </span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={file} alt={t("The fix")} className="block h-20 w-32 bg-background object-cover transition-opacity group-hover:opacity-85" />
        )}
      </button>
      {viewing && <AttachmentViewer url={file} onClose={() => setViewing(false)} />}
    </>
  )
}

function Composer({ role, fixed, onSend, autoFocus, hasMessages }: {
  role: "client" | "workshop"
  fixed: boolean
  onSend: (message: ThreadMessage) => Promise<void>
  autoFocus?: boolean
  hasMessages: boolean
}) {
  const { t } = useT()
  const shop = role === "workshop"
  const [body, setBody] = useState("")
  const [file, setFile] = useState<File | null>(null)
  // The workshop's reply marks the spot fixed unless it already is or they untick it.
  const [fixedChoice, setFixedChoice] = useState<boolean | null>(null)
  const markFixed = fixedChoice ?? !fixed
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const canSend = !sending && (!!body.trim() || !!file)

  async function send() {
    if (!canSend) return
    setSending(true)
    setError(null)
    try {
      await onSend({ body: body.trim(), file, fixed: shop && markFixed })
      setBody("")
      setFile(null)
      setFixedChoice(null)
    } catch (e) {
      setError(t((e as Error)?.message || "Something went wrong"))
    }
    setSending(false)
  }

  const placeholder = shop
    ? t("Answer: what you changed")
    : fixed
      ? t("Not right? Write what to change")
      : hasMessages ? t("Reply…") : t("Add a detail…")

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-end gap-1.5 rounded-xl border border-input bg-background px-2 py-1.5 focus-within:border-ring">
        {shop && (
          <>
            <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] ?? null); e.target.value = "" }} />
            <button type="button" onClick={() => fileRef.current?.click()} aria-label={t("Attach a file: image, screenshot or PDF")} className="mb-0.5 flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-hover hover:text-foreground">
              <PaperclipIcon className="size-4" />
            </button>
          </>
        )}
        {shop && !fixed && (
          <button
            type="button"
            onClick={() => setFixedChoice(!markFixed)}
            aria-pressed={markFixed}
            title={t("Mark as fixed")}
            className={cn(
              "order-last mb-0.5 ml-auto inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-medium transition-colors",
              markFixed ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:bg-hover"
            )}
          >
            <CheckIcon className="size-3.5" strokeWidth={markFixed ? 3 : 2} />
            {t("Fixed")}
          </button>
        )}
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, 2000))}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() } }}
          rows={1}
          autoFocus={autoFocus}
          placeholder={placeholder}
          aria-label={placeholder}
          className="max-h-40 min-h-8 min-w-0 flex-1 basis-48 resize-none bg-transparent px-1 py-1.5 text-[15px] outline-none [field-sizing:content] placeholder:text-muted-foreground"
        />
        <button
          type="button"
          onClick={send}
          disabled={!canSend}
          aria-label={t("Send")}
          className="order-last mb-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity disabled:opacity-30"
        >
          <ArrowUpIcon className="size-4" />
        </button>
      </div>
      {file && (
        <span className="inline-flex min-w-0 items-center gap-1 px-0.5 text-xs text-muted-foreground">
          <PaperclipIcon className="size-3 shrink-0" />
          <span className="max-w-48 truncate">{file.name}</span>
          <button type="button" onClick={() => setFile(null)} aria-label={t("Remove")} className="hover:text-foreground"><XIcon className="size-3" /></button>
        </span>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
