"use client"

import { I18nProvider } from "react-aria-components"
import { useT } from "@/lib/i18n"

/** Tells react-aria the site's language, so its own hidden labels and dates follow Nodly's, not the browser's. */
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const { locale } = useT()
  return <I18nProvider locale={locale}>{children}</I18nProvider>
}
