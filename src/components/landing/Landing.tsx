"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { Logo } from "@/components/Logo"
import { supabase } from "@/lib/supabase"
import { useT, type T } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { KeyHero } from "@/components/landing/KeyHero"
import { ProductShowcase } from "@/components/landing/ProductShowcase"
import { Closing, Pricing, Questions, WorkshopFooter } from "@/components/landing/WorkshopSections"

/** next/link styled like the shadcn Button, for calls to action. */
function CtaLink({ href, children, variant = "primary", className }: {
  href: string
  children: React.ReactNode
  variant?: "primary" | "outline"
  className?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring",
        variant === "primary"
          ? "bg-primary text-primary-foreground hover:bg-primary/85"
          : "border border-border bg-card text-foreground hover:bg-hover",
        className
      )}
    >
      {children}
    </Link>
  )
}

export function Landing() {
  const { t } = useT()
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session))
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header t={t} signedIn={signedIn} />
      <main>
        <KeyHero t={t} signedIn={signedIn} />
        <ProductShowcase t={t} />
        <Pricing t={t} />
        <Questions t={t} />
        <Closing t={t} signedIn={signedIn} />
      </main>
      <WorkshopFooter t={t} />
    </div>
  )
}

// ── Header ──────────────────────────────────────────────

function Header({ t, signedIn }: { t: T; signedIn: boolean }) {
  const links = [
    ["#product", t("How it works")],
    ["#pricing", t("Pricing")],
    ["#faq", t("FAQ")],
  ]
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="Nodly"><Logo /></Link>
        <nav className="hidden items-center gap-6 md:flex">
          {links.map(([href, label]) => (
            <a key={href} href={href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <LanguageSwitcher className="hidden sm:flex" />
          {signedIn ? (
            <CtaLink href="/dashboard" className="h-8 px-3">{t("Open dashboard")}</CtaLink>
          ) : (
            <>
              <Link href="/login" className="hidden px-2 text-sm text-muted-foreground hover:text-foreground sm:block">
                {t("Sign in")}
              </Link>
              <CtaLink href="/signup" className="h-8 px-3">{t("Start free")}</CtaLink>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

