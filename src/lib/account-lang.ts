"use client"

import { useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useLang } from "@/lib/i18n"

/**
 * Keeps the signed-in user's language in their account (user_metadata.lang), so the emails
 * Supabase sends them (codes, password resets) come in the language they use Nodly in.
 */
export function useSyncAccountLang() {
  const lang = useLang()
  useEffect(() => {
    let cancelled = false
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user
      if (cancelled || !user || user.user_metadata?.lang === lang) return
      supabase.auth.updateUser({ data: { lang } }).catch(() => {})
    })
    return () => { cancelled = true }
  }, [lang])
}
