"use client"

import { CopyButton, PageShell, usePageContext } from "@/components/page/PageShell"
import { useT } from "@/lib/i18n"

/** Post ideas for a furniture workshop: what to show and a caption to start from. */
const IDEAS: { title: string; how: string; caption: string }[] = [
  {
    title: "Drawing vs result",
    how: "Put the drawing the client approved next to a photo of the finished piece.",
    caption: "From drawing to kitchen: what we agreed on and what we built. Want the same? Link in bio.",
  },
  {
    title: "Before and after",
    how: "The empty room on the day you measured and the same corner after installation.",
    caption: "Same wall, three weeks apart. Tell us about your room: the link is in bio.",
  },
  {
    title: "Material up close",
    how: "A short video of the veneer, edge or hardware in good light. Touch it, open and close.",
    caption: "This is what solid oak looks like up close. We'll help you pick the right finish: link in bio.",
  },
  {
    title: "A day in the workshop",
    how: "Five short clips: cutting, edging, assembly, sanding, packing.",
    caption: "How one wardrobe is made, in 30 seconds. Order yours: link in bio.",
  },
  {
    title: "What a price is made of",
    how: "Break one real project into materials, hardware, work and installation.",
    caption: "Why a kitchen costs what it costs. Send a request for your own estimate: link in bio.",
  },
  {
    title: "A client's review",
    how: "A screenshot of a message or a short video from the client next to their furniture.",
    caption: "Words we love to hear. Thank you, [name]! Next could be yours: link in bio.",
  },
  {
    title: "Common mistake",
    how: "Show one thing people often get wrong: depth of shelves, sockets behind cabinets, handles.",
    caption: "One mistake we see in almost every kitchen and how we avoid it. Questions? Link in bio.",
  },
  {
    title: "How we work",
    how: "A simple scheme: request, measuring, drawing, approval, production, installation.",
    caption: "Six steps from your request to the finished furniture. Step one is in our bio.",
  },
  {
    title: "Detail of the week",
    how: "One small detail you're proud of: a hidden drawer, lighting, a joint.",
    caption: "Small things make the furniture. Want something like this? Link in bio.",
  },
  {
    title: "Answer a question",
    how: "Take a question clients often ask and answer it in a short video.",
    caption: "You asked: how long does a kitchen take? The answer is in the video. Ask yours: link in bio.",
  },
]

export default function PostIdeas() {
  const { t } = useT()
  const { shop } = usePageContext()
  return (
    <PageShell activePage="link-ideas" title={t("Post ideas")} shopName={shop?.name ?? ""}
      subtitle={t("What to post when you don't know what to post. Each idea ends with your page: that's how followers become requests.")}>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {IDEAS.map((idea, i) => (
          <section key={idea.title} className="flex flex-col gap-3 rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
            <div className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold tabular-nums">{i + 1}</span>
              <div className="flex flex-col gap-1">
                <h2 className="text-base font-bold">{t(idea.title)}</h2>
                <p className="text-sm text-muted-foreground">{t(idea.how)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl bg-muted p-3">
              <p className="flex-1 text-sm leading-5">{t(idea.caption)}</p>
              <CopyButton text={t(idea.caption)} />
            </div>
          </section>
        ))}
      </div>
    </PageShell>
  )
}
