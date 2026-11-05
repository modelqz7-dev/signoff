"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { Stat } from "@/components/crm/AppointmentsHome"
import { FIELD } from "@/components/crm/BookingDialog"
import { DatePicker, Picker } from "@/components/crm/Pickers"
import { dayKey, money } from "@/lib/crm"
import { EXPENSE_CATEGORIES, parseAmount, totals, useLedger, type Expense } from "@/lib/ledger"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"

type Tab = "day" | "month" | "year"

/** Daily takings (cash and card) and expenses, with the month's and the year's totals. */
export function LedgerView({ shopId }: { shopId: string }) {
  const { t } = useT()
  const ledger = useLedger(shopId)
  const [tab, setTab] = useState<Tab>("day")
  const [day, setDay] = useState(() => dayKey(new Date()))
  const [error, setError] = useState<string | null>(null)
  // a day's unsaved figures are saved before the screen moves on
  const flushRef = useRef<() => void>(() => {})
  const go = (d: string) => { flushRef.current(); setDay(d) }
  const goTab = (id: Tab) => { flushRef.current(); setTab(id) }

  const tabs: [Tab, string][] = [["day", t("Day")], ["month", t("Month")], ["year", t("Year")]]
  const fail = (e: unknown) => setError(e instanceof Error ? e.message : (e as { message?: string })?.message ?? t("Couldn't save"))
  const open = (d: string) => { flushRef.current(); setDay(d); setTab("day") }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-5 sm:p-8">
      <div>
        <h1 className="text-[30px] leading-tight font-semibold tracking-[-0.02em] sm:text-[34px]">{t("Takings")}</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">{t("Enter cash, card and expenses every day. Month and year totals count themselves.")}</p>
      </div>

      <div role="tablist" className="flex w-fit gap-1 rounded-full bg-foreground/[0.05] p-1 text-[13.5px]">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => goTab(id)}
            className={cn("h-8 rounded-full px-5 transition-colors", tab === id ? "bg-card font-medium shadow-[0_1px_3px_rgba(0,0,0,0.12)]" : "text-muted-foreground hover:text-foreground")}>{label}</button>
        ))}
      </div>

      {(error || ledger.error) && <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-[13.5px] text-destructive">{error || ledger.error}{ledger.error && ` — ${t("Run supabase/ledger.sql in Supabase.")}`}</p>}

      {ledger.loading ? <p className="py-10 text-center text-sm text-muted-foreground">{t("Loading...")}</p>
        : tab === "day" ? <DayTab key={day} day={day} onDay={go} flushRef={flushRef} ledger={ledger} onError={fail} />
        : tab === "month" ? <MonthTab ledger={ledger} initial={day.slice(0, 7)} onOpen={open} />
        : <YearTab ledger={ledger} initial={Number(day.slice(0, 4))} />}
    </div>
  )
}

function shift(day: string, by: number) {
  const [y, m, d] = day.split("-").map(Number)
  return dayKey(new Date(y, m - 1, d + by))
}

function DayTab({ day, onDay, flushRef, ledger, onError }: { day: string; onDay: (d: string) => void; flushRef: React.RefObject<() => void>; ledger: ReturnType<typeof useLedger>; onError: (e: unknown) => void }) {
  const { t, locale } = useT()
  const saved = ledger.days.find((x) => x.day === day)
  const [cash, setCash] = useState(saved?.cash ? String(saved.cash) : "")
  const [card, setCard] = useState(saved?.card ? String(saved.card) : "")
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0])
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)

  const spent = ledger.expenses.filter((x) => x.day === day)
  const today = dayKey(new Date())
  const revenue = parseAmount(cash) + parseAmount(card)
  const spentSum = spent.reduce((s, x) => s + x.amount, 0)

  const dirty = parseAmount(cash) !== (saved?.cash ?? 0) || parseAmount(card) !== (saved?.card ?? 0)
  const commit = () => ledger.saveDay(day, parseAmount(cash), parseAmount(card)).catch(onError)
  useEffect(() => { flushRef.current = () => { if (dirty) commit() } })
  useEffect(() => () => { flushRef.current = () => {} }, [flushRef])
  const add = async () => {
    const value = parseAmount(amount)
    if (!value || busy) return
    setBusy(true)
    try { await ledger.addExpense(day, value, category, note.trim()); setAmount(""); setNote("") } catch (e) { onError(e) } finally { setBusy(false) }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onDay(shift(day, -1))} aria-label={t("Previous day")} className="flex size-10 items-center justify-center rounded-full bg-foreground/[0.05] hover:bg-hover"><ChevronLeftIcon className="size-4" /></button>
        <DatePicker value={day} onChange={onDay} label={t("Date")} className="flex-1" />
        <button type="button" onClick={() => onDay(shift(day, 1))} aria-label={t("Next day")} className="flex size-10 items-center justify-center rounded-full bg-foreground/[0.05] hover:bg-hover"><ChevronRightIcon className="size-4" /></button>
        {day !== today && <button type="button" onClick={() => onDay(today)} className="h-10 rounded-full bg-foreground/[0.05] px-4 text-[13.5px] hover:bg-hover">{t("Today")}</button>}
      </div>

      <div className="grid gap-3 rounded-[22px] apple-card p-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-[13px] text-muted-foreground">{t("Cash")}
          <input value={cash} onChange={(e) => setCash(e.target.value)} onKeyDown={(e) => e.key === "Enter" && commit()} inputMode="decimal" placeholder="0" className={cn(FIELD, "h-14 text-[20px] font-semibold tabular-nums")} />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] text-muted-foreground">{t("Card")}
          <input value={card} onChange={(e) => setCard(e.target.value)} onKeyDown={(e) => e.key === "Enter" && commit()} inputMode="decimal" placeholder="0" className={cn(FIELD, "h-14 text-[20px] font-semibold tabular-nums")} />
        </label>
        <div className="flex items-center justify-between gap-3 sm:col-span-2">
          <span className={cn("text-[13px]", dirty ? "text-foreground" : "text-muted-foreground")}>
            {dirty ? t("Not saved") : saved ? <span className="flex items-center gap-1.5"><CheckIcon className="size-4" />{t("Saved")}</span> : ""}
          </span>
          <button type="button" onClick={commit} disabled={!dirty} className="h-11 rounded-full bg-foreground px-6 text-[14px] font-medium text-background hover:opacity-90 disabled:opacity-30">{t("Save takings")}</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label={t("Takings")} value={money(revenue, locale)} />
        <Stat label={t("Expenses")} value={money(spentSum, locale)} />
        <Stat label={t("Left")} value={money(revenue - spentSum, locale)} />
      </div>

      <div className="flex flex-col gap-3 rounded-[22px] apple-card p-5">
        <h2 className="text-[16px] font-semibold">{t("Expenses")}</h2>
        <div className="grid gap-2 sm:grid-cols-[8rem_10rem_1fr_auto]">
          <input value={amount} onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} inputMode="decimal" placeholder={t("Amount")} aria-label={t("Amount")} className={FIELD} />
          <Picker value={category} onChange={setCategory} label={t("Category")} options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: t(c) }))} />
          <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} maxLength={200} placeholder={t("Note (optional)")} aria-label={t("Note")} className={FIELD} />
          <button type="button" onClick={add} disabled={!parseAmount(amount) || busy} className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-foreground px-4 text-[14px] font-medium text-background hover:opacity-90 disabled:opacity-40"><PlusIcon className="size-4" />{t("Add")}</button>
        </div>
        {spent.length ? <ul className="divide-y divide-border/70">
          {spent.map((x) => <ExpenseRow key={x.id} x={x} onDelete={() => ledger.removeExpense(x.id).catch(onError)} />)}
        </ul> : <p className="py-4 text-center text-[13.5px] text-muted-foreground">{t("No expenses this day.")}</p>}
      </div>
    </div>
  )
}

function ExpenseRow({ x, onDelete }: { x: Expense; onDelete: () => void }) {
  const { t, locale } = useT()
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-medium">{t(x.category) || t("Other")}</span>
        {x.note && <span className="block truncate text-[12.5px] text-muted-foreground">{x.note}</span>}
      </span>
      <span className="text-[14px] tabular-nums">{money(x.amount, locale)}</span>
      <button type="button" onClick={onDelete} aria-label={t("Delete")} className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-hover hover:text-foreground"><Trash2Icon className="size-4" /></button>
    </li>
  )
}

function Totals({ p, ledger }: { p: string; ledger: ReturnType<typeof useLedger> }) {
  const { t, locale } = useT()
  const s = totals(ledger.days, ledger.expenses, p)
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      <Stat label={t("Cash")} value={money(s.cash, locale)} />
      <Stat label={t("Card")} value={money(s.card, locale)} />
      <Stat label={t("Takings")} value={money(s.revenue, locale)} />
      <Stat label={t("Expenses")} value={money(s.spent, locale)} />
      <Stat label={t("Profit")} value={money(s.profit, locale)} />
    </div>
  )
}

function MonthTab({ ledger, initial, onOpen }: { ledger: ReturnType<typeof useLedger>; initial: string; onOpen: (d: string) => void }) {
  const { t, locale } = useT()
  const [month, setMonth] = useState(initial)
  const [y, m] = month.split("-").map(Number)
  const go = (by: number) => { const d = new Date(y, m - 1 + by, 1); setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`) }
  const label = new Date(y, m - 1, 1).toLocaleDateString(locale, { month: "long", year: "numeric" })

  const rows = useMemo(() => {
    const map = new Map<string, { cash: number; card: number; spent: number }>()
    const row = (d: string) => map.get(d) ?? map.set(d, { cash: 0, card: 0, spent: 0 }).get(d)!
    for (const x of ledger.days) if (x.day.startsWith(month)) { const r = row(x.day); r.cash = x.cash; r.card = x.card }
    for (const x of ledger.expenses) if (x.day.startsWith(month)) row(x.day).spent += x.amount
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [ledger.days, ledger.expenses, month])

  const byCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const x of ledger.expenses) if (x.day.startsWith(month)) map.set(x.category, (map.get(x.category) ?? 0) + x.amount)
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [ledger.expenses, month])

  return (
    <div className="flex flex-col gap-6">
      <Period label={label} onPrev={() => go(-1)} onNext={() => go(1)} />
      <Totals p={month} ledger={ledger} />
      {byCategory.length > 0 && (
        <div className="flex flex-col gap-2.5 rounded-[22px] apple-card p-5">
          <h2 className="text-[16px] font-semibold">{t("Where the money went")}</h2>
          {byCategory.map(([c, v]) => (
            <div key={c} className="flex items-center gap-3 text-[13.5px]">
              <span className="w-28 shrink-0 truncate">{t(c) || t("Other")}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-foreground/[0.06]"><span className="block h-full rounded-full bg-foreground/70" style={{ width: `${(v / byCategory[0][1]) * 100}%` }} /></span>
              <span className="w-24 shrink-0 text-right tabular-nums">{money(v, locale)}</span>
            </div>
          ))}
        </div>
      )}
      <MonthGrid month={month} rows={rows} onOpen={onOpen} />
      <div className="overflow-hidden rounded-[22px] apple-card">
        {rows.length ? rows.map(([d, r], i) => (
          <button key={d} type="button" onClick={() => onOpen(d)} className={cn("flex w-full items-center gap-3 px-4 py-3 text-left text-[13.5px] hover:bg-hover", i > 0 && "border-t border-border/70")}>
            <span className="w-24 shrink-0 font-medium">{new Date(`${d}T00:00`).toLocaleDateString(locale, { day: "numeric", month: "short", weekday: "short" })}</span>
            <span className="min-w-0 flex-1 truncate text-muted-foreground tabular-nums">{money(r.cash, locale)} · {money(r.card, locale)}</span>
            <span className="w-24 shrink-0 text-right tabular-nums">{money(r.cash + r.card, locale)}</span>
            <span className="w-24 shrink-0 text-right text-muted-foreground tabular-nums">{r.spent ? `− ${money(r.spent, locale)}` : "—"}</span>
          </button>
        )) : <p className="px-6 py-12 text-center text-[14px] text-muted-foreground">{t("Nothing entered for this month.")}</p>}
      </div>
    </div>
  )
}

function YearTab({ ledger, initial }: { ledger: ReturnType<typeof useLedger>; initial: number }) {
  const { t, locale } = useT()
  const [year, setYear] = useState(initial)
  return (
    <div className="flex flex-col gap-6">
      <Period label={String(year)} onPrev={() => setYear(year - 1)} onNext={() => setYear(year + 1)} />
      <Totals p={String(year)} ledger={ledger} />
      <div className="overflow-hidden rounded-[22px] apple-card">
        {Array.from({ length: 12 }, (_, i) => {
          const s = totals(ledger.days, ledger.expenses, `${year}-${String(i + 1).padStart(2, "0")}`)
          return (
            <div key={i} className={cn("flex items-center gap-3 px-4 py-3 text-[13.5px]", i > 0 && "border-t border-border/70")}>
              <span className="w-28 shrink-0 font-medium capitalize">{new Date(year, i, 1).toLocaleDateString(locale, { month: "long" })}</span>
              <span className="min-w-0 flex-1 text-right tabular-nums">{s.revenue ? money(s.revenue, locale) : "—"}</span>
              <span className="w-24 shrink-0 text-right text-muted-foreground tabular-nums">{s.spent ? `− ${money(s.spent, locale)}` : "—"}</span>
              <span className="w-24 shrink-0 text-right tabular-nums">{s.revenue || s.spent ? money(s.profit, locale) : "—"}</span>
            </div>
          )
        })}
        <div className="flex gap-3 border-t border-border/70 px-4 py-2 text-[12px] text-muted-foreground"><span className="w-28 shrink-0" /><span className="flex-1 text-right">{t("Takings")}</span><span className="w-24 text-right">{t("Expenses")}</span><span className="w-24 text-right">{t("Profit")}</span></div>
      </div>
    </div>
  )
}

function Period({ label, onPrev, onNext }: { label: string; onPrev: () => void; onNext: () => void }) {
  const { t } = useT()
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onPrev} aria-label={t("Previous")} className="flex size-10 items-center justify-center rounded-full bg-foreground/[0.05] hover:bg-hover"><ChevronLeftIcon className="size-4" /></button>
      <span className="flex-1 text-center text-[16px] font-medium capitalize">{label}</span>
      <button type="button" onClick={onNext} aria-label={t("Next")} className="flex size-10 items-center justify-center rounded-full bg-foreground/[0.05] hover:bg-hover"><ChevronRightIcon className="size-4" /></button>
    </div>
  )
}

/** The month as a calendar: each day with its takings and expenses; a tap opens the day. */
function MonthGrid({ month, rows, onOpen }: { month: string; rows: [string, { cash: number; card: number; spent: number }][]; onOpen: (d: string) => void }) {
  const { locale } = useT()
  const [y, m] = month.split("-").map(Number)
  const byDay = new Map(rows)
  const today = dayKey(new Date())
  const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7
  const count = new Date(y, m, 0).getDate()
  const short = (v: number) => new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(v)
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: "short" }))
  return (
    <div className="rounded-[22px] apple-card p-3 sm:p-4">
      <div className="grid grid-cols-7 gap-1 text-center">
        {weekdays.map((w) => <span key={w} className="pb-1 text-[11px] font-medium text-muted-foreground uppercase">{w}</span>)}
        {Array.from({ length: lead }, (_, i) => <span key={`e${i}`} />)}
        {Array.from({ length: count }, (_, i) => {
          const k = `${month}-${String(i + 1).padStart(2, "0")}`
          const r = byDay.get(k)
          const revenue = r ? r.cash + r.card : 0
          return (
            <button key={k} type="button" onClick={() => onOpen(k)} aria-label={k}
              className={cn("flex min-h-14 flex-col items-center justify-start gap-0.5 rounded-lg px-0.5 py-1.5 text-[11px] tabular-nums transition-colors sm:min-h-[4.5rem] sm:text-[12px]",
                r ? "bg-foreground/[0.07] hover:bg-foreground/[0.12]" : "hover:bg-hover", k === today && "ring-1 ring-foreground/50")}>
              <span className={cn("text-[13px]", k === today ? "font-semibold" : "text-muted-foreground")}>{i + 1}</span>
              {revenue > 0 && <span className="font-medium">{short(revenue)}</span>}
              {r && r.spent > 0 && <span className="text-muted-foreground">−{short(r.spent)}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
