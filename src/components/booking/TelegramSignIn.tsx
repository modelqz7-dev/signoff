"use client"

import { useClientAccount } from "@/lib/client-account"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"

/** The paper plane of Telegram, drawn in the current colour. */
export function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M21.9 4.3 18.7 19.4c-.2 1.1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.4-5 9.1-8.2c.4-.4-.1-.6-.6-.2L6.3 13 1.5 11.5c-1-.3-1.1-1 .2-1.5L20.6 2.7c.9-.3 1.6.2 1.3 1.6Z" />
    </svg>
  )
}

/** "Sign in with Telegram": opens the bot, then the page signs in by itself. */
export function TelegramSignIn({ className, label }: { className?: string; label?: string }) {
  const { t } = useT()
  const { signIn, signing, error } = useClientAccount()
  return (
    <div className="flex flex-col gap-1.5">
      <button type="button" onClick={signIn} disabled={signing}
        className={cn("flex h-12 items-center justify-center gap-2 rounded-full bg-[#2aabee] px-5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-70", className)}>
        <TelegramIcon className="size-5" />
        {signing ? t("Waiting for Telegram…") : label ?? t("Sign in with Telegram")}
      </button>
      {signing && <p className="text-center text-[12.5px] text-muted-foreground">{t("Press “Start” in the bot, then come back here.")}</p>}
      {error && !signing && <p className="text-center text-[12.5px] text-destructive">{error === "expired" ? t("The sign-in link expired. Try again.") : t("Couldn't sign in. Try again.")}</p>}
    </div>
  )
}
