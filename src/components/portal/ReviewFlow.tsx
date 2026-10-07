"use client"

import { useState } from "react"
import { CheckIcon, PencilIcon, PartyPopperIcon, SendIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { CommentsIcon } from "@/components/orders/pins"
import { useT } from "@/lib/i18n"
import type { Order } from "@/components/dashboard/types"

/** "Look → comment → decide" hint at the top of the portal while a decision is pending. */
export function ReviewSteps({ status, commented }: { status: Order["status"]; commented: boolean }) {
  const { t } = useT()
  // Look → comment → decide, drawn like the workshop's order progress: thin bars, short labels.
  const steps = [
    { label: t("Look through the design"), done: true },
    { label: t("Click on it to leave comments"), done: commented || status === "changes" },
    { label: t("Approve it or ask for changes"), done: status === "changes" },
  ]
  const current = steps.findIndex((s) => !s.done)
  return (
    <ol className="grid grid-cols-3 gap-3" aria-label={t("Your review")}>
      {steps.map((s, i) => (
        <li key={s.label} className="flex min-w-0 flex-col gap-1.5" aria-current={i === current ? "step" : undefined}>
          <span className={cn("h-1 rounded-full", s.done ? "bg-primary/70" : i === current ? "bg-foreground/25" : "bg-muted")} />
          <span className={cn("flex items-start gap-1.5 text-xs leading-tight sm:text-sm", s.done || i === current ? "text-foreground" : "text-muted-foreground")}>
            <span className="shrink-0 tabular-nums text-muted-foreground">{i + 1}</span>
            {s.label}
          </span>
        </li>
      ))}
    </ol>
  )
}

export function ApprovedBanner({ order }: { order: Pick<Order, "approved_at" | "approved_by"> }) {
  const { t, locale } = useT()
  const when = order.approved_at ? new Date(order.approved_at).toLocaleDateString(locale, { dateStyle: "long" }) : null
  return (
    <div className="flex items-center gap-3 rounded-xl bg-card px-5 py-4 text-base text-foreground ring-1 ring-foreground/10">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <CheckIcon className="size-5" />
      </span>
      <div className="flex flex-col">
        <span className="font-medium">{t("This design is approved")}</span>
        {(when || order.approved_by) && (
          <span className="text-sm text-muted-foreground">
            {[when, order.approved_by].filter(Boolean).join(" · ")}
          </span>
        )}
      </div>
    </div>
  )
}

/** Decision buttons pinned to the bottom of the screen, plus the comments button on phones. */
export function ActionBar({ status, commentCount, busy, onComments, onChanges, onApprove, children }: {
  status: Order["status"]
  commentCount: number
  busy: boolean
  onComments: () => void
  onChanges: () => void
  onApprove: () => void
  children?: React.ReactNode
}) {
  const { t } = useT()
  const approved = status === "approved" || status === "prod"
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/90 backdrop-blur supports-backdrop-filter:bg-background/75">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-8">
        <Button variant="outline" size="sm" className="lg:hidden" onPress={onComments}>
          <CommentsIcon />
          <span className="hidden min-[400px]:inline">{t("Comments")}</span>
          {commentCount}
        </Button>
        <div className="hidden min-w-0 flex-1 sm:block">{children}</div>
        <div className="ml-auto flex items-center gap-2">
          {approved ? (
            <>
              <span className="hidden items-center gap-1.5 text-sm text-foreground sm:flex">
                <CheckIcon className="size-4" />
                {t("Approved")}
              </span>
              {status === "approved" && (
                <Button variant="ghost" size="sm" onPress={onChanges} isDisabled={busy}>
                  {t("Something's wrong? Ask for changes")}
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="outline" onPress={onChanges} isDisabled={busy || status === "changes"}>
                <PencilIcon />
                {status === "changes" ? t("Changes requested") : t("Request Changes")}
              </Button>
              <Button onPress={onApprove} isDisabled={busy}>
                <CheckIcon />
                {t("Approve")}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/** Confirmation before approving: approval is final for the workshop and goes on the certificate. */
export function ApproveDialog({ open, onOpenChange, title, version, openComments, busy, onConfirm }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  version: number
  openComments: number
  busy: boolean
  onConfirm: () => void
}) {
  const { t } = useT()
  const [checked, setChecked] = useState(false)
  if (!open) return null
  return (
    <Dialog isOpen onOpenChange={(v) => { if (!v) setChecked(false); onOpenChange(v) }} className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{t("Approve this design?")}</DialogTitle>
        <DialogDescription>
          {version > 1
            ? t("You're approving version {n} of “{title}”. Work continues from this version.", { n: version, title })
            : t("You're approving “{title}”. Work continues from this version.", { title })}
        </DialogDescription>
      </DialogHeader>
      {openComments > 0 && (
        <p className="rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: "var(--status-changes-bg)", color: "var(--status-changes)" }}>
          {t("You still have {n} open comments. If they matter, ask for changes instead.", { n: openComments })}
        </p>
      )}
      <label className="flex cursor-pointer items-start gap-2.5 text-sm">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-[var(--foreground)]"
        />
        <span>{t("I've checked the design and confirm it")}</span>
      </label>
      <DialogFooter>
        <DialogClose variant="outline">{t("Cancel")}</DialogClose>
        <Button onPress={onConfirm} isDisabled={!checked || busy}>
          <CheckIcon />
          {busy ? t("Saving...") : t("Approve")}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

/** Confirmation before asking for changes, nudging to leave comments first. */
export function ChangesDialog({ open, onOpenChange, openComments, busy, onConfirm }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  openComments: number
  busy: boolean
  onConfirm: () => void
}) {
  const { t } = useT()
  if (!open) return null
  return (
    <Dialog isOpen onOpenChange={onOpenChange} className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{t("Ask for changes?")}</DialogTitle>
        <DialogDescription>
          {openComments > 0
            ? t("They'll get your request with {n} comments and send a new version.", { n: openComments })
            : t("You haven't left any comments yet. Click on the design to show what to change, so they know what to fix.")}
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <DialogClose variant="outline">{openComments > 0 ? t("Cancel") : t("Add comments first")}</DialogClose>
        <Button onPress={onConfirm} isDisabled={busy}>
          <SendIcon />
          {busy ? t("Saving...") : openComments > 0 ? t("Send request") : t("Send without comments")}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

/** Thank-you screen after a decision. */
export function DoneDialog({ kind, shopName, onClose, footer }: {
  kind: "approved" | "changes" | null
  shopName: string
  onClose: () => void
  /** Extra line under the button (the Nodly link on Free-plan portals). */
  footer?: React.ReactNode
}) {
  const { t } = useT()
  if (!kind) return null
  const approved = kind === "approved"
  return (
    <Dialog isOpen onOpenChange={(v) => !v && onClose()} className="sm:max-w-sm" showCloseButton={false}>
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-muted text-foreground">
          {approved ? <PartyPopperIcon className="size-7" /> : <SendIcon className="size-6" />}
        </span>
        <DialogTitle className="text-lg">{approved ? t("Thank you! The design is approved") : t("Your request has been sent")}</DialogTitle>
        <DialogDescription>
          {approved
            ? shopName
              ? t("{shop} has been notified and will start working. You can close this page.", { shop: shopName })
              : t("They've been notified and will get to work. You can close this page.")
            : t("Your comments have been sent. Open this same link later to see the new version.")}
        </DialogDescription>
        <Button className="mt-2 w-full" onPress={onClose}>{t("Done")}</Button>
        {footer}
      </div>
    </Dialog>
  )
}
