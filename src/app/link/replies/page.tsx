"use client"

import { useSyncExternalStore } from "react"
import { CopyButton, PageShell, usePageContext } from "@/components/page/PageShell"
import { useT } from "@/lib/i18n"
import { pagePath } from "@/lib/page"

const noop = () => () => {}

/** Each text may use {name} (the workshop) and {link} (the page). */
const TEMPLATES: { title: string; text: string }[] = [
  {
    title: "First reply to a request",
    text: "Hello! Thank you for your request. I'm {name}. To give you an estimate I need a few details: what you need, examples you like, the deadline and your budget.",
  },
  {
    title: "Ask for a brief",
    text: "To start, please send a short brief: what you need, examples you like, the deadline and the budget. If it's easier, let's have a 15-minute call.",
  },
  {
    title: "Send the price",
    text: "Here is the estimate: [price]. It includes 3 logo concepts, 2 rounds of revisions and all source files. The price is valid for 14 days. Shall we start?",
  },
  {
    title: "Send the design for approval",
    text: "The logo concepts are ready. Here is your link: open it on your phone, leave comments right on the picture and approve with one button. I move on only after your approval.",
  },
  {
    title: "Follow up after silence",
    text: "Hello! Just checking in about the [project]. Do you have any questions about the design or the price? If the timing has changed, no problem, just let me know.",
  },
  {
    title: "Thanks and a review",
    text: "Thank you for choosing us! If you like the result, a short review and a photo would help us a lot. Here's our page, you can share it with friends: {link}",
  },
  {
    title: "Reply in Instagram DMs",
    text: "Hello! Thanks for writing. All our work, prices and a request form are here: {link}. Leave a request and I'll reply with an estimate today.",
  },
]

/** Ready answers for typical moments with a client: copy, fill in, send. */
export default function ReplyTemplates() {
  const { t } = useT()
  const { shop, page } = usePageContext()
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "")
  const link = page && origin ? origin + pagePath(page.slug) : t("[your page link]")
  const name = page?.data.title || shop?.name || ""
  const fill = (s: string) => t(s).replaceAll("{link}", link).replaceAll("{name}", name)

  return (
    <PageShell activePage="link-replies" title={t("Reply templates")} shopName={shop?.name ?? ""}
      subtitle={t("Ready answers for typical moments with a client. Copy, change the words in brackets and send in any messenger.")}>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {TEMPLATES.map((tpl) => {
          const text = fill(tpl.text)
          return (
            <section key={tpl.title} className="flex flex-col gap-3 rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-bold">{t(tpl.title)}</h2>
                <CopyButton text={text} />
              </div>
              <p className="text-[15px] leading-6 whitespace-pre-line text-muted-foreground">{text}</p>
            </section>
          )
        })}
      </div>
    </PageShell>
  )
}
