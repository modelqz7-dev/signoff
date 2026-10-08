"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"
import type { T } from "@/lib/i18n"

// What the client's "yes" leaves behind: the approval certificate. Images live in public/landing.

const HEADLINE = "font-[family-name:var(--font-brand)] font-bold tracking-[-0.035em] text-foreground"

function Label({ no, children }: { no: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
      <span className="tabular-nums">{no}</span>
      <span aria-hidden="true">·</span>
      <span>{children}</span>
    </div>
  )
}

function Points({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2.5 text-sm text-muted-foreground">
      {items.map((p) => (
        <li key={p} className="flex gap-3">
          <span aria-hidden="true" className="mt-2 h-px w-4 shrink-0 bg-foreground/40" />
          {p}
        </li>
      ))}
    </ul>
  )
}

export function ProductShowcase({ t }: { t: T }) {
  return (
    <>
      {/* 01 · the record */}
      <section className="py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex flex-col gap-6">
            <Label no="01">{t("On record")}</Label>
            <h2 className={cn(HEADLINE, "text-4xl leading-[1.02] sm:text-5xl")}>{t("Proof of the “yes”, when it matters.")}</h2>
            <Points items={[t("Who approved, which version and when"), t("A PDF certificate for your files"), t("Every revision kept, comments stay with theirs")]} />
          </div>
          <div className="relative">
            <Image
              src="/landing/certificate.webp"
              alt={t("An approval certificate: who approved, which version and when")}
              width={1588}
              height={1296}
              className="h-auto w-full rounded-xl shadow-2xl ring-1 ring-foreground/10"
              sizes="(min-width: 1152px) 620px, 100vw"
            />
          </div>
        </div>
      </section>
    </>
  )
}

/** Nodly next to the chat SMM people already use: the objection, answered row by row. */
export function TelegramVsNodly({ t }: { t: T }) {
  const rows: [string, string, string][] = [
    ["Changes", "Scattered across voice notes, screenshots and replies", "Pinned right on the post, numbered"],
    ["Versions", "“Which one is final?” and files named final_2", "Every version in order, the latest on top"],
    ["Approval", "A thumbs-up that is easy to deny later", "“Approved” with who and when, plus a PDF"],
    ["For the client", "Scroll back through the chat to find the post", "One link, opens on the phone, no sign-up"],
    ["Notifications", "Buried among other chats", "Still in Telegram: a comment, a new version, approved"],
  ]
  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-12 flex flex-col gap-6">
          <Label no="02">{t("Telegram or Nodly")}</Label>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
            <h2 className={cn(HEADLINE, "max-w-3xl text-4xl leading-[1.02] sm:text-5xl")}>{t("Keep Telegram. Lose the chaos.")}</h2>
            <p className="max-w-xs text-sm text-muted-foreground lg:pb-2 lg:text-right">
              {t("Nodly doesn’t replace your chat with the client: notifications still arrive in Telegram.")}
            </p>
          </div>
        </div>

        <div className="border-t border-border">
          <div className="hidden grid-cols-[200px_1fr_1fr] gap-8 border-b border-border py-4 text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase md:grid">
            <span />
            <span>{t("In a Telegram chat")}</span>
            <span className="text-foreground">{t("In Nodly")}</span>
          </div>
          {rows.map(([topic, chat, nodly]) => (
            <div key={topic} className="grid gap-2 border-b border-border py-5 md:grid-cols-[200px_1fr_1fr] md:gap-8">
              <p className="text-sm font-medium text-foreground">{t(topic)}</p>
              <p className="flex gap-3 text-sm text-muted-foreground">
                <span aria-hidden="true" className="mt-2 h-px w-4 shrink-0 bg-foreground/25" />
                <span><span className="font-medium md:hidden">Telegram: </span>{t(chat)}</span>
              </p>
              <p className="flex gap-3 text-sm text-foreground">
                <span aria-hidden="true" className="mt-2 h-px w-4 shrink-0 bg-foreground" />
                <span><span className="font-medium md:hidden">Nodly: </span>{t(nodly)}</span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
