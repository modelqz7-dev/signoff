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
    text: "Hello! Thank you for your request. I'm {name}. To give you an estimate I need a few details: the room size, the style you like and your budget. A photo of the room helps a lot.",
  },
  {
    title: "Ask for measurements",
    text: "To make the drawing, please send the wall length and ceiling height, and mark windows, sockets and pipes on a photo. If it's easier, I can come and measure myself.",
  },
  {
    title: "Send the price",
    text: "Here is the estimate: [price]. It includes materials, making, delivery and installation. The price is valid for 14 days. Shall I start the drawing?",
  },
  {
    title: "Send the drawing for approval",
    text: "The drawing is ready. I've sent you a link: you can open it on your phone, leave comments right on the picture and approve it with one button. I start production only after your approval.",
  },
  {
    title: "Follow up after silence",
    text: "Hello! Just checking in about the [kitchen]. Do you have any questions about the drawing or the price? If the timing has changed, no problem, just let me know.",
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
