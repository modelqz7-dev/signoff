"use client"

import { CheckIcon, InboxIcon, LayoutGridIcon, Link2Icon, MessageSquareIcon, SendIcon, StarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { T } from "@/lib/i18n"

// What an SMM specialist does in Nodly, in four steps, and the loop around it: the page in their
// bio brings a client, the client becomes a project, the project's posts get approved. Each step
// shows a small piece of the real screens, drawn in HTML so it reads in both themes.

const HEADLINE = "font-[family-name:var(--font-brand)] font-bold tracking-[-0.035em] text-foreground"
const PICS = ["#d9cfc2", "#c9d6c4", "#e6d3c7", "#cfd5df", "#e3dccb", "#d6cbd9", "#cddbd8", "#e5cfcf", "#d8d8cc"]

function Eyebrow({ no, label }: { no: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
      <span className="tabular-nums">{no}</span>
      <span aria-hidden="true">·</span>
      <span>{label}</span>
    </div>
  )
}

/** A soft picture tile standing in for a post's image. */
function Pic({ i, className }: { i: number; className?: string }) {
  return <span className={cn("block", className)} style={{ background: `linear-gradient(140deg, ${PICS[i % PICS.length]}, ${PICS[(i + 3) % PICS.length]})` }} />
}

export function HowItWorks({ t }: { t: T }) {
  const steps = [
    {
      title: t("Plan the month"),
      text: t("Posts with their day, format and caption. Pick the days in the calendar and the empty posts are made for you."),
      art: (
        <div className="grid grid-cols-3 gap-2">
          {[t("Mon"), t("Wed"), t("Fri")].map((d, i) => (
            <div key={d} className="overflow-hidden rounded-lg bg-card ring-1 ring-border">
              <Pic i={i} className="aspect-[4/5]" />
              <div className="px-2 py-1.5">
                <p className="text-[10px] text-muted-foreground">{d}</p>
                <p className="truncate text-[11px] font-semibold">{[t("Carousel"), t("Post"), t("Reels")][i]}</p>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: t("Send one link"),
      text: t("The client sees the whole plan on their phone, and the grid as it will look in the feed. No sign-up."),
      art: (
        <div className="mx-auto w-40 overflow-hidden rounded-[18px] bg-card p-1.5 ring-1 ring-border">
          <p className="px-1 pt-1 pb-1.5 text-[10px] font-semibold">{t("As in the feed")}</p>
          <div className="grid grid-cols-3 gap-0.5 overflow-hidden rounded-lg">
            {Array.from({ length: 9 }, (_, i) => <Pic key={i} i={i + 2} className="aspect-square" />)}
          </div>
        </div>
      ),
    },
    {
      title: t("Changes right on the picture"),
      text: t("The client taps where to fix and writes a word. You see each comment as a numbered pin, not a voice note."),
      art: (
        <div className="relative overflow-hidden rounded-xl ring-1 ring-border">
          <Pic i={4} className="aspect-[16/10]" />
          <span className="absolute top-[30%] left-[28%] flex size-6 items-center justify-center rounded-full bg-foreground text-[11px] font-bold text-background shadow">1</span>
          <span className="absolute top-[58%] left-[64%] flex size-6 items-center justify-center rounded-full bg-foreground text-[11px] font-bold text-background shadow">2</span>
          <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-[10.5px] font-medium shadow-sm">
            <MessageSquareIcon className="size-3" />{t("Bigger logo, please")}
          </span>
        </div>
      ),
    },
    {
      title: t("Approved, on record"),
      text: t("One post or all at once. Who approved and when stays saved, and the news reaches you in Telegram."),
      art: (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 rounded-xl bg-card px-3 py-2.5 ring-1 ring-border">
            <span className="flex size-6 items-center justify-center rounded-full bg-foreground text-background"><CheckIcon className="size-3.5" strokeWidth={3} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-semibold">{t("12 of 12 approved")}</span>
              <span className="block text-[10.5px] text-muted-foreground">{t("Anna K. · today, 14:02")}</span>
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-card px-3 py-2.5 ring-1 ring-border">
            <span className="flex size-6 items-center justify-center rounded-full bg-[#2aabee] text-white"><SendIcon className="size-3" /></span>
            <span className="truncate text-[11.5px]">{t("Telegram: the client approved the posts")}</span>
          </div>
        </div>
      ),
    },
  ]
  return (
    <section id="how" className="scroll-mt-16 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-12 flex flex-col gap-6">
          <Eyebrow no="01" label={t("How it works")} />
          <h2 className={cn(HEADLINE, "max-w-3xl text-4xl leading-[1.02] sm:text-5xl")}>{t("From the content plan to “approved” in one link.")}</h2>
        </div>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="flex flex-col gap-5 rounded-2xl bg-muted/60 p-5 ring-1 ring-border">
              <div className="flex min-h-40 items-center">{<div className="w-full">{s.art}</div>}</div>
              <div className="mt-auto flex flex-col gap-1.5">
                <span className="text-[12px] font-medium text-muted-foreground tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="text-[17px] font-semibold tracking-[-0.01em]">{s.title}</h3>
                <p className="text-[14px] leading-relaxed text-muted-foreground">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/** The loop: the page in the bio brings a client, and the work goes round again. */
export function TheLoop({ t }: { t: T }) {
  const steps: [React.ComponentType<{ className?: string }>, string, string][] = [
    [Link2Icon, t("Your page"), t("A link in your bio with your work, prices and reviews")],
    [StarIcon, t("A client looks"), t("They see your cases and what other clients say")],
    [InboxIcon, t("A request"), t("They leave a request right on the page")],
    [LayoutGridIcon, t("A project"), t("The request becomes a project with a content plan")],
    [CheckIcon, t("Approved posts"), t("They approve by one link, and come back next month")],
  ]
  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-12 flex flex-col gap-6">
          <Eyebrow no="02" label={t("The whole loop")} />
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
            <h2 className={cn(HEADLINE, "max-w-3xl text-4xl leading-[1.02] sm:text-5xl")}>{t("Not only approvals: new clients too.")}</h2>
            <p className="max-w-xs text-sm text-muted-foreground lg:pb-2 lg:text-right">{t("Your page in the bio brings requests, and each one turns into a project in a tap.")}</p>
          </div>
        </div>
        <ol className="grid gap-3 sm:grid-cols-5">
          {steps.map(([Icon, title, text], i) => (
            <li key={title} className="relative flex flex-col gap-3 rounded-2xl bg-card p-5 ring-1 ring-border">
              <span className="flex size-10 items-center justify-center rounded-full bg-foreground text-background"><Icon className="size-5" /></span>
              <h3 className="text-[15.5px] font-semibold">{title}</h3>
              <p className="text-[13.5px] leading-relaxed text-muted-foreground">{text}</p>
              {i < steps.length - 1 && <span aria-hidden="true" className="absolute top-1/2 -right-3 z-10 hidden size-6 -translate-y-1/2 items-center justify-center rounded-full bg-background text-muted-foreground ring-1 ring-border sm:flex">›</span>}
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
