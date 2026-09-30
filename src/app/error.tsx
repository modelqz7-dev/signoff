"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LogoMark } from "@/components/Logo"
import { reportError } from "@/lib/report-error"
import { useT } from "@/lib/i18n"

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const { t } = useT()
  useEffect(() => { reportError(error, "error boundary") }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <LogoMark className="size-12" />
      <div className="flex flex-col gap-1">
        <h1 className="text-base font-medium text-foreground">{t("Something went wrong")}</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          {t("We've been notified. Try again, and if it keeps happening, reload the page.")}
        </p>
        {error.digest && <p className="font-mono text-[11px] text-muted-foreground/70">{error.digest}</p>}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onPress={() => retry()}>{t("Try again")}</Button>
        <Link href="/dashboard" className="inline-flex items-center rounded-md px-3 text-sm text-muted-foreground hover:text-foreground">
          {t("Go to dashboard")}
        </Link>
      </div>
    </div>
  )
}
