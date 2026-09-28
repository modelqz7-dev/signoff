"use client"

import * as React from "react"
import { cn } from "cn"
import { XIcon } from "lucide-react"
import {
  Dialog as DialogPrimitive,
  Heading,
  ModalOverlay,
  Modal,
  type ModalOverlayProps,
} from "react-aria-components"

import { Button } from "@/components/ui/button"

/** Panel that slides up from the bottom of the screen (mobile lists, pickers). */
function Sheet({
  className,
  title,
  children,
  ...props
}: Omit<ModalOverlayProps, "className" | "children"> & {
  className?: string
  title: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <ModalOverlay
      data-slot="sheet-overlay"
      isDismissable
      className="fixed inset-0 isolate z-50 bg-black/30 duration-200 data-entering:animate-in data-entering:fade-in-0 data-exiting:animate-out data-exiting:fade-out-0"
      {...props}
    >
      <Modal
        data-slot="sheet"
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[80vh] flex-col rounded-t-2xl bg-popover text-sm text-popover-foreground ring-1 ring-foreground/10 duration-200 outline-none data-entering:animate-in data-entering:slide-in-from-bottom data-exiting:animate-out data-exiting:slide-out-to-bottom",
          className
        )}
      >
        <DialogPrimitive className="flex min-h-0 flex-1 flex-col outline-none">
          <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30" aria-hidden="true" />
          <div className="flex shrink-0 items-center justify-between gap-2 px-4 pt-2 pb-3">
            <Heading slot="title" className="text-base font-medium">{title}</Heading>
            <Button slot="close" variant="ghost" size="icon-sm">
              <XIcon />
              <span className="sr-only">Close</span>
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</div>
        </DialogPrimitive>
      </Modal>
    </ModalOverlay>
  )
}

export { Sheet }
