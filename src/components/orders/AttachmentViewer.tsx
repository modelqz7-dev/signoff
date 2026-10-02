"use client"

import dynamic from "next/dynamic"
import { Dialog, DialogTitle } from "@/components/ui/dialog"
import { useT } from "@/lib/i18n"
import { isPdfUrl } from "@/lib/utils"

// Loaded on demand (the PDF viewer itself shows pins, which import this file).
const PDFViewer = dynamic(() => import("@/components/ui/pdf-viewer").then((m) => m.PDFViewer), { ssr: false })

/** A file attached to an answer, opened over the page: PDFs in Nodly's viewer, images large. */
export function AttachmentViewer({ url, onClose }: { url: string; onClose: () => void }) {
  const { t } = useT()
  if (isPdfUrl(url)) return <PDFViewer url={url} startOpen onClose={onClose} />
  return (
    <Dialog isOpen onOpenChange={(v) => !v && onClose()} className="w-auto max-w-[96vw] p-2 sm:max-w-[96vw]">
      <DialogTitle className="sr-only">{t("The fix")}</DialogTitle>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={t("The fix")} className="max-h-[86dvh] max-w-full rounded-lg object-contain" />
    </Dialog>
  )
}
