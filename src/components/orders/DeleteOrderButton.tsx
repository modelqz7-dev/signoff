"use client"

import { useState } from "react"
import { Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Order } from "@/components/dashboard/types"
import { deleteOrder } from "@/lib/orders"

/** Trash icon button that asks for confirmation, then deletes the order, its comments and file. */
export function DeleteOrderButton({ order, onDeleted }: { order: Order; onDeleted: () => void }) {
  const [open, setOpen] = useState(false)
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
      setError((e as Error)?.message || "Failed to delete order")
    }
    setDeleting(false)
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Delete order"
        className="text-muted-foreground hover:text-destructive"
        onPress={() => { setError(null); setOpen(true) }}
      >
        <Trash2Icon />
      </Button>

      <Dialog isOpen={open} onOpenChange={(v) => !deleting && setOpen(v)} className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete order?</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{order.title}</span> will be deleted together with its
            file and all client comments. This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onPress={() => setOpen(false)} isDisabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onPress={handleDelete} isDisabled={deleting}>
            {deleting ? "Deleting..." : "Delete order"}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  )
}
