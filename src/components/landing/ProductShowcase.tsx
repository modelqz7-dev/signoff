"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"
import type { T } from "@/lib/i18n"

// Real screenshots of Nodly (a demo workshop, captured from the app itself) instead of
// illustrations. Files live in public/landing.

const HEADLINE = "font-[family-name:var(--font-brand)] font-bold tracking-[-0.035em] text-foreground"

function Label({ no, children }: { no: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
      <span className="tabular-nums">{no}</span>
      <span className="h-px flex-1 bg-border" />
      <span>{children}</span>
    </div>
  )
}

/** A quiet browser window around a screenshot. */
function Window({ url, children, className }: { url: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-xl bg-card shadow-2xl ring-1 ring-foreground/10", className)}>
      <div className="flex items-center border-b border-border px-4 py-2">
        <span className="mx-auto rounded-md bg-muted px-3 py-0.5 text-[11px] text-muted-foreground">{url}</span>
      </div>
      {children}
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
      {/* 01 · the client's side */}
      <section id="product" className="scroll-mt-16 border-t border-border py-24">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 sm:px-6">
          <Label no="01">{t("The client's side")}</Label>
          <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-end">
            <h2 className={cn(HEADLINE, "text-4xl leading-[1.02] sm:text-5xl")}>{t("They point at the drawing. You get exact changes.")}</h2>
            <Points items={[t("Opens from one link, no account"), t("Pins land on the exact spot, on any page"), t("Approve or ask for changes in one tap")]} />
          </div>
          <Window url="nodly.app/portal/kitchen-modern">
            <Image src="/landing/portal-desktop.webp" alt={t("The client portal: a kitchen drawing with three pinned comments")} width={2880} height={2120} className="h-auto w-full" sizes="(min-width: 1152px) 1152px, 100vw" />
          </Window>
        </div>
      </section>

      {/* 02 · the workshop's side + phone */}
      <section className="border-t border-border py-24">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 sm:px-6">
          <Label no="02">{t("Your side")}</Label>
          <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-end">
            <h2 className={cn(HEADLINE, "text-4xl leading-[1.02] sm:text-5xl")}>{t("Every order, and who you're waiting on.")}</h2>
            <Points items={[t("Comments arrive live, no reload"), t("Overdue and changed orders float to the top"), t("Telegram and email when a client acts")]} />
          </div>
          <div className="grid items-end gap-8 lg:grid-cols-[1fr_260px]">
            <Window url="nodly.app/dashboard">
              <Image src="/landing/dashboard.webp" alt={t("The workshop dashboard with orders, activity and client comments")} width={2880} height={1800} className="h-auto w-full" sizes="(min-width: 1152px) 860px, 100vw" />
            </Window>
            {/* the same portal on the client's phone */}
            <figure className="mx-auto flex w-[240px] flex-col items-center gap-3 lg:w-full">
              <div className="overflow-hidden rounded-[2rem] bg-card p-2 shadow-2xl ring-1 ring-foreground/10">
                <Image src="/landing/portal-phone.webp" alt={t("The client portal on a phone")} width={780} height={1688} className="h-auto w-full rounded-[1.6rem]" sizes="260px" />
              </div>
              <figcaption className="text-xs text-muted-foreground">{t("On the client's phone")}</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* 03 · the record */}
      <section className="border-t border-border py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex flex-col gap-6">
            <Label no="03">{t("On record")}</Label>
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
