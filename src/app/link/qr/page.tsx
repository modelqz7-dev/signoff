"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import QRCode from "qrcode"
import { DownloadIcon } from "lucide-react"
import { CopyButton, PageNotice, PageShell, usePageContext } from "@/components/page/PageShell"
import { useT } from "@/lib/i18n"
import { pagePath } from "@/lib/page"

const noop = () => () => {}

/** A QR code of the page's address for business cards, stickers on furniture and invoices. */
export default function PageQr() {
  const { t } = useT()
  const { shop, page, loading, missingTable } = usePageContext()
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "")
  const url = page && origin ? origin + pagePath(page.slug) : ""
  const [png, setPng] = useState("")
  const [svg, setSvg] = useState("")

  useEffect(() => {
    if (!url) return
    let cancelled = false
    const opts = { margin: 2, errorCorrectionLevel: "M" as const, color: { dark: "#111111", light: "#ffffff" } }
    Promise.all([QRCode.toDataURL(url, { ...opts, width: 1024 }), QRCode.toString(url, { ...opts, type: "svg" })])
      .then(([p, s]) => { if (!cancelled) { setPng(p); setSvg(s) } })
    return () => { cancelled = true }
  }, [url])

  const file = page ? `nodly-${page.slug}-qr` : "qr"
  const svgHref = svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : ""

  return (
    <PageShell activePage="link-qr" title={t("QR code")} shopName={shop?.name ?? ""}
      subtitle={t("Clients point their phone camera at it and your page opens. Put it on business cards, presentations, contracts and your portfolio.")}>
      {!loading && <PageNotice missingTable={missingTable} hasPage={!!page} />}
      {page && (
        <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-start">
          <div className="flex w-full max-w-[340px] flex-col items-center gap-4 rounded-3xl bg-card p-6 ring-1 ring-foreground/10">
            <div className="aspect-square w-full overflow-hidden rounded-2xl bg-white">
              {png && <img src={png} alt={t("QR code")} className="size-full" />}
            </div>
            <p className="max-w-full truncate text-sm font-medium">{url.replace(/^https?:\/\//, "")}</p>
          </div>
          <div className="flex flex-col gap-4">
            {!page.published && (
              <p className="rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                {t("Your page is hidden: the code will open it only after you publish it.")}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <a href={png || undefined} download={`${file}.png`} aria-disabled={!png}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90">
                <DownloadIcon className="size-4" />{t("Download PNG")}
              </a>
              <a href={svgHref || undefined} download={`${file}.svg`} aria-disabled={!svg}
                className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium ring-1 ring-foreground/15 hover:bg-hover">
                <DownloadIcon className="size-4" />{t("Download SVG for print")}
              </a>
            </div>
            <div className="flex items-center gap-2"><CopyButton text={url} label={t("Copy Link")} /></div>
            <ul className="flex max-w-md list-disc flex-col gap-1.5 pl-5 text-sm text-muted-foreground">
              <li>{t("PNG is for messengers and the screen, SVG stays sharp at any print size.")}</li>
              <li>{t("Print it at least 2 × 2 cm so phones read it easily.")}</li>
              <li>{t("The code keeps working when you edit the page; it only changes if you change the address.")}</li>
            </ul>
          </div>
        </div>
      )}
    </PageShell>
  )
}
