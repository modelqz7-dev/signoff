"use client"

import { useState } from "react"
import { Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Order } from "@/components/dashboard/types"
import { deleteOrder } from "@/lib/orders"
import { useT } from "@/lib/i18n"

/** Trash icon button that asks for confirmation, then deletes the order, its comments and file. */
export function DeleteOrderButton({ order, onDeleted }: { order: Order; onDeleted: () => void }) {
  const [open, setOpen] = useState(false)
  const { t } = useT()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    try {
      await deleteOrder(order)
      setOpen(false)
      onDeleted()
    } catch (e) {
      setError(t((e as Error)?.message || "Failed to delete order"))
    }
    setDeleting(false)
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t("Delete order")}
        className="text-muted-foreground hover:text-destructive"
        onPress={() => { setError(null); setOpen(true) }}
      >
        <Trash2Icon />
      </Button>

      <Dialog isOpen={open} onOpenChange={(v) => !deleting && setOpen(v)} className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("Delete order?")}</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{order.title}</span>{" "}
            {t("will be deleted together with its file and all client comments. This can't be undone.")}
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onPress={() => setOpen(false)} isDisabled={deleting}>
            {t("Cancel")}
          </Button>
          <Button variant="destructive" onPress={handleDelete} isDisabled={deleting}>
            {deleting ? t("Deleting...") : t("Delete order")}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  )
}
