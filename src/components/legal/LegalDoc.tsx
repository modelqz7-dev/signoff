"use client"

import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { Logo } from "@/components/Logo"
import { LEGAL_DOCS, type LegalDocId } from "@/components/legal/texts"
import { LEGAL } from "@/lib/legal"
import { useT } from "@/lib/i18n"
import { cn } from "@/lib/utils"

/** Terms, privacy and refunds: one quiet reading page, in the site's language. */
export function LegalDoc({ id }: { id: LegalDocId }) {
  const { t, lang, locale } = useT()
  const doc = LEGAL_DOCS[id][lang]
  const updated = new Date(LEGAL.updated).toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" })
  const others: [LegalDocId, string][] = [
    ["terms", t("Terms of service")],
    ["privacy", t("Privacy policy")],
    ["refund", t("Refund policy")],
  ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" aria-label="Nodly"><Logo /></Link>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon className="size-4" />
          {t("Back to Nodly")}
        </Link>
        <h1 className="mt-6 font-[family-name:var(--font-brand)] text-3xl leading-tight font-bold tracking-[-0.03em] sm:text-4xl">{doc.title}</h1>
        <p className="mt-3 text-sm text-muted-foreground" suppressHydrationWarning>{t("Last updated: {date}", { date: updated })}</p>
        {doc.intro && <p className="mt-6 text-base leading-relaxed text-muted-foreground">{fill(doc.intro)}</p>}

        <div className="mt-10 flex flex-col gap-9">
          {doc.sections.map((s) => (
            <section key={s.heading} className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold text-foreground">{s.heading}</h2>
              {s.body.map((p, i) =>
                Array.isArray(p) ? (
                  <ul key={i} className="flex list-disc flex-col gap-1.5 pl-5 text-base leading-relaxed text-muted-foreground">
                    {p.map((item) => <li key={item}>{fill(item)}</li>)}
                  </ul>
                ) : (
                  <p key={i} className="text-base leading-relaxed text-muted-foreground">{fill(p)}</p>
                )
              )}
            </section>
          ))}
        </div>

        <nav className="mt-14 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-6 text-sm">
          {others.map(([other, label]) => (
            <Link key={other} href={`/${other}`} className={cn(other === id ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
              {label}
            </Link>
          ))}
        </nav>
      </main>
    </div>
  )
}

/** Puts the seller's name, email and site into a text. */
function fill(text: string) {
  return text.replaceAll("{seller}", LEGAL.seller).replaceAll("{email}", LEGAL.email).replaceAll("{site}", LEGAL.site)
}
