"use client"

import { CopyButton, PageShell, usePageContext } from "@/components/page/PageShell"
import { useT } from "@/lib/i18n"

/** Post ideas for a furniture workshop: what to show and a caption to start from. */
const IDEAS: { title: string; how: string; caption: string }[] = [
  {
    title: "Before and after",
    how: "Put the client's old design next to what you made.",
    caption: "Before and after: what the client had and what we made. Want the same? Link in bio.",
  },
  {
    title: "Before and after",
    how: "The client's page before you started and the same page now.",
    caption: "Same page, three weeks apart. Tell us about your project: the link is in bio.",
  },
  {
    title: "Material up close",
    how: "A screen recording of the process: from the first sketch to the final file.",
    caption: "From a blank canvas to the final design in 30 seconds. Want yours? Link in bio.",
  },
  {
    title: "A day at work",
    how: "Five short clips: brief, references, sketch, design, handover.",
    caption: "How one project comes together, in 30 seconds. Want yours? Link in bio.",
  },
  {
    title: "What a price is made of",
    how: "Break one real project into stages: brief, concept, design, revisions, handover.",
    caption: "Why a project costs what it costs. Send a request for your own estimate: link in bio.",
  },
  {
    title: "A client's review",
    how: "A screenshot of a happy message from the client.",
    caption: "Words we love to hear. Thank you, [name]! Next could be yours: link in bio.",
  },
  {
    title: "Common mistake",
    how: "Show one thing people often get wrong: fonts, contrast, too much text.",
    caption: "One mistake we see on almost every brand's Instagram and how to fix it. Questions? Link in bio.",
  },
  {
    title: "How we work",
    how: "A simple scheme: request, brief, concept, design, approval, handover.",
    caption: "Six steps from your request to the finished project. Step one is in our bio.",
  },
  {
    title: "Detail of the week",
    how: "One small detail you're proud of: a hidden drawer, lighting, a joint.",
    caption: "Details make the design. Want something like this? Link in bio.",
  },
  {
    title: "Answer a question",
    how: "Take a question clients often ask and answer it in a short video.",
    caption: "You asked: how long does a project take? The answer is in the video. Ask yours: link in bio.",
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
