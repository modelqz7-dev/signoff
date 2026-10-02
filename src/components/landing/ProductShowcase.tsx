"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"
import { LivePortal } from "@/components/landing/LivePortal"
import { BeforeAfter } from "@/components/landing/BeforeAfter"
import type { T } from "@/lib/i18n"

// The product itself instead of illustrations: a live, self-playing client portal, a before /
// after of the client's changes, and the approval certificate. Images live in public/landing.

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
      {/* 01 · the client's side */}
      <section id="product" className="scroll-mt-16 py-24">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 sm:px-6">
          <Label no="01">{t("The client's side")}</Label>
          <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-end">
            <h2 className={cn(HEADLINE, "text-4xl leading-[1.02] sm:text-5xl")}>{t("They point at the drawing. You get exact changes.")}</h2>
            <Points items={[t("Opens from one link, no account"), t("Pins land on the exact spot, on any page"), t("Approve or ask for changes in one tap")]} />
          </div>
          <LivePortal t={t} />
        </div>
      </section>

      {/* 02 · changes the client can check */}
      <section className="py-24">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 sm:px-6">
          <Label no="02">{t("Changes")}</Label>
          <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-end">
            <h2 className={cn(HEADLINE, "text-4xl leading-[1.02] sm:text-5xl")}>{t("“We fixed it.” Now the client can see it.")}</h2>
            <Points items={[t("Each comment answered: fixed, or why it stays"), t("Before and after on the very spot"), t("Reopen in one tap if it isn't right")]} />
          </div>
          <BeforeAfter t={t} />
        </div>
      </section>

      {/* 03 · the record */}
      <section className="py-24">
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
