"use client"

import { CheckIcon, SendIcon, XIcon } from "lucide-react"
import { LogoMark } from "@/components/Logo"
import { cn } from "@/lib/utils"
import type { T } from "@/lib/i18n"

// Nodly next to the chat SMM people already use: their main objection, answered row by row.
// The Nodly column is one dark panel behind its cells, like a highlighted plan in a pricing table.

const HEADLINE = "font-[family-name:var(--font-brand)] font-bold tracking-[-0.035em] text-foreground"

const ROWS: [topic: string, chat: string, nodly: string][] = [
  ["Changes", "Scattered across voice notes, screenshots and replies", "Pinned right on the post, numbered"],
  ["Versions", "“Which one is final?” and files named final_2", "Every version in order, the latest on top"],
  ["Approval", "A thumbs-up that is easy to deny later", "“Approved” with who and when, plus a PDF"],
  ["For the client", "Scroll back through the chat to find the post", "One link, opens on the phone, no sign-up"],
  ["Notifications", "Buried among other chats", "Still in Telegram: a comment, a new version, approved"],
]

function No() {
  return (
    <span aria-hidden="true" className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground/[0.06] text-muted-foreground">
      <XIcon className="size-3" strokeWidth={2.5} />
    </span>
  )
}

function Yes() {
  return (
    <span aria-hidden="true" className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-background text-foreground">
      <CheckIcon className="size-3" strokeWidth={3} />
    </span>
  )
}

/** The Nodly key drawn for a dark panel (the panel is light in dark mode, so the key flips too). */
function KeyOnPanel() {
  return (
    <>
      <LogoMark surface="dark" className="size-6 dark:hidden" />
      <LogoMark surface="light" className="hidden size-6 dark:block" />
    </>
  )
}

export function TelegramVsNodly({ t }: { t: T }) {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-14 flex flex-col gap-6">
          <div className="flex items-center gap-2 text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
            <span className="tabular-nums">01</span>
            <span aria-hidden="true">·</span>
            <span>{t("Telegram or Nodly")}</span>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
            <h2 className={cn(HEADLINE, "max-w-3xl text-4xl leading-[1.02] sm:text-5xl")}>{t("Keep Telegram. Lose the chaos.")}</h2>
            <p className="max-w-xs text-sm text-muted-foreground lg:pb-2 lg:text-right">
              {t("Nodly doesn’t replace your chat with the client: notifications still arrive in Telegram.")}
            </p>
          </div>
        </div>

        {/* desktop: a three-column table with the Nodly column raised */}
        <div role="table" className="relative hidden grid-cols-[200px_minmax(0,1fr)_minmax(0,1fr)] md:grid" style={{ gridTemplateRows: `repeat(${ROWS.length + 1}, auto)` }}>
          <div aria-hidden="true" className="col-start-3 -my-3 rounded-2xl bg-foreground shadow-[0_30px_60px_-30px_rgba(0,0,0,0.45)]" style={{ gridRow: "1 / -1" }} />

          <div role="row" className="contents">
            <div role="columnheader" className="col-start-1 row-start-1 border-b border-border" />
            <div role="columnheader" className="col-start-2 row-start-1 flex items-center gap-2.5 border-b border-border px-6 py-5 text-sm font-medium text-muted-foreground">
              <span className="flex size-6 items-center justify-center rounded-full bg-foreground/[0.06]">
                <SendIcon className="size-3.5 -translate-x-px translate-y-px" />
              </span>
              {t("In a Telegram chat")}
            </div>
            <div role="columnheader" className="relative col-start-3 row-start-1 flex items-center gap-2.5 border-b border-background/10 px-7 py-5 text-sm font-semibold text-background">
              <KeyOnPanel />
              {t("In Nodly")}
            </div>
          </div>

          {ROWS.map(([topic, chat, nodly], i) => {
            const last = i === ROWS.length - 1
            const row = { gridRowStart: i + 2 }
            return (
              <div key={topic} role="row" className="contents">
                <div role="rowheader" style={row} className={cn("col-start-1 py-6 pr-6 text-[15px] font-medium text-foreground", !last && "border-b border-border")}>
                  {t(topic)}
                </div>
                <div role="cell" style={row} className={cn("col-start-2 flex gap-3 px-6 py-6 text-[15px] leading-snug text-muted-foreground", !last && "border-b border-border")}>
                  <No />
                  {t(chat)}
                </div>
                <div role="cell" style={row} className={cn("relative col-start-3 flex gap-3 px-7 py-6 text-[15px] leading-snug text-background", !last && "border-b border-background/10")}>
                  <Yes />
                  {t(nodly)}
                </div>
              </div>
            )
          })}
        </div>

        {/* phones: one card per topic, the Nodly answer on the dark panel */}
        <div className="flex flex-col gap-3 md:hidden">
          {ROWS.map(([topic, chat, nodly]) => (
            <div key={topic} className="rounded-2xl bg-card p-2 ring-1 ring-border">
              <p className="px-3 pt-2.5 pb-3 text-[15px] font-medium text-foreground">{t(topic)}</p>
              <p className="flex gap-3 px-3 pb-3.5 text-sm leading-snug text-muted-foreground">
                <No />
                <span><span className="sr-only">{t("In a Telegram chat")}: </span>{t(chat)}</span>
              </p>
              <p className="flex gap-3 rounded-xl bg-foreground px-3 py-3 text-sm leading-snug text-background">
                <Yes />
                <span><span className="sr-only">{t("In Nodly")}: </span>{t(nodly)}</span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
