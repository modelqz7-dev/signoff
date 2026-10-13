"use client"

import { useCallback, useEffect, useSyncExternalStore } from "react"
import { ru } from "@/lib/i18n-ru"
import { uk } from "@/lib/i18n-uk"

/** Nodly speaks Ukrainian and Russian; Ukrainian unless the person chose Russian or browses in it. */
export type Lang = "uk" | "ru"

const STORAGE_KEY = "signoff-lang"
const CHANGE_EVENT = "signoff:lang"

function readLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === "uk" || saved === "ru") return saved
  } catch {}
  return typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("ru") ? "ru" : "uk"
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange)
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener("storage", onChange)
    window.removeEventListener(CHANGE_EVENT, onChange)
  }
}

export function setLang(lang: Lang) {
  try { localStorage.setItem(STORAGE_KEY, lang) } catch {}
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

/** Current UI language; Ukrainian on the server, the saved or browser language on the client. */
export function useLang(): Lang {
  const lang = useSyncExternalStore(subscribe, readLang, () => "uk" as Lang)
  useEffect(() => { document.documentElement.lang = lang }, [lang])
  return lang
}

export type Vars = Record<string, string | number>
export type T = (text: string, vars?: Vars) => string

function format(text: string, vars?: Vars) {
  return vars ? text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`)) : text
}

/**
 * Translation hook. Keys are the English strings of the code; each language has its dictionary
 * (a Ukrainian gap falls back to Russian, then to the key). Placeholders look like {name}.
 */
export function useT() {
  const lang = useLang()
  const t = useCallback<T>(
    (text, vars) => format(lang === "ru" ? ru[text] ?? text : uk[text] ?? ru[text] ?? text, vars),
    [lang]
  )
  const locale = lang === "ru" ? "ru-RU" : "uk-UA"
  return { t, lang, locale }
}
