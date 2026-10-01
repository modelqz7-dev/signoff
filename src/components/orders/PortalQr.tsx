"use client"

import { useEffect, useState } from "react"
import { DownloadIcon, QrCodeIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useT } from "@/lib/i18n"

/**
 * The portal link as a QR code, for showing the design to a client in person (the showroom,
 * a site visit) or printing it on an estimate: the client points their phone's camera at it.
 */
export function PortalQrButton({ url, fileName }: { url: string; fileName: string }) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const [svg, setSvg] = useState<string | null>(null)

  // The QR library is only loaded when the dialog opens.
  useEffect(() => {
    if (!open || !url) return
    let cancelled = false
    import("qrcode")
      .then((QR) => QR.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#1f1e1d", light: "#ffffff" } }))
      .then((s) => { if (!cancelled) setSvg(s) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [open, url])

  async function download() {
    const QR = await import("qrcode")
    const href = await QR.toDataURL(url, { width: 1024, margin: 2, errorCorrectionLevel: "M" })
    const a = document.createElement("a")
    a.href = href
    a.download = `${fileName || "portal"}-qr.png`
    a.click()
  }

  return (
    <>
      <Button variant="outline" size="sm" onPress={() => setOpen(true)} aria-label={t("QR code")} className="mt-1 shrink-0">
        <QrCodeIcon />
        QR
      </Button>

      <Dialog isOpen={open} onOpenChange={setOpen} className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("QR code for the client")}</DialogTitle>
          <DialogDescription>
            {t("The client points their phone's camera at it and the portal opens. Show it in person or print it on the estimate.")}
          </DialogDescription>
        </DialogHeader>
        <div className="mx-auto w-full max-w-[240px] rounded-xl bg-white p-3 ring-1 ring-foreground/10">
          {svg ? (
            <div className="aspect-square [&>svg]:size-full" role="img" aria-label={t("QR code")} dangerouslySetInnerHTML={{ __html: svg }} />
          ) : (
            <div className="aspect-square animate-pulse rounded-lg bg-muted" />
          )}
        </div>
        <p className="truncate text-center font-mono text-[11px] text-muted-foreground">{url}</p>
        <Button onPress={download} isDisabled={!url}>
          <DownloadIcon />
          {t("Download PNG")}
        </Button>
      </Dialog>
    </>
  )
}
