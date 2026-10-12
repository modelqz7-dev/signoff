"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { CalendarIcon, CheckIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon, XIcon } from "lucide-react"
import { Button, Dialog, DialogTrigger, ListBox, ListBoxItem, Popover, Select, SelectValue } from "react-aria-components"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"

// Nodly's own controls for the CRM: a dropdown, a time picker and a date picker in the app's
// look, in place of the browser's (no "AM/PM", no system wheels, the same in every browser).
// They're built on react-aria, so they position themselves and work inside dialogs.

const TRIGGER = "flex h-10 w-full items-center gap-2 rounded-lg bg-foreground/[0.06] px-3 text-left text-[14px] text-foreground outline-none ring-1 ring-transparent transition-colors hover:bg-foreground/[0.09] data-[focus-visible]:ring-foreground/25 data-[pressed]:bg-foreground/[0.09]"
const PANEL = "rounded-xl bg-popover text-popover-foreground shadow-[0_12px_40px_rgba(0,0,0,0.18)] ring-1 ring-border outline-none data-[entering]:animate-in data-[entering]:fade-in-0 data-[entering]:zoom-in-95 data-[exiting]:animate-out data-[exiting]:fade-out-0"
const ITEM = "flex cursor-default items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-[13.5px] outline-none data-[focused]:bg-hover data-[selected]:font-semibold"

export type Option<V extends string | number> = { value: V; label: string }

/** A dropdown: the chosen option shows on the button, the list opens under it. */
export function Picker<V extends string | number>({ value, onChange, options, label, className }: {
  value: V
  onChange: (value: V) => void
  options: Option<V>[]
  label: string
  className?: string
}) {
  return (
    <Select aria-label={label} selectedKey={String(value)} className={cn("w-full", className)}
      onSelectionChange={(key) => { const o = options.find((x) => String(x.value) === String(key)); if (o) onChange(o.value) }}>
      <Button className={TRIGGER}>
        <SelectValue className="min-w-0 flex-1 truncate" />
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
      </Button>
      <Popover offset={6} className={cn(PANEL, "min-w-(--trigger-width)")}>
        <ListBox className="nice-scroll max-h-72 overflow-y-auto p-1 outline-none">
          {options.map((o) => (
            <ListBoxItem key={String(o.value)} id={String(o.value)} textValue={o.label} className={ITEM}>
              {({ isSelected }) => <>{o.label}{isSelected && <CheckIcon className="size-4 shrink-0" />}</>}
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </Select>
  )
}

const pad = (n: number) => String(n).padStart(2, "0")

/** "HH:MM" in two columns, hours and minutes; picking the minutes closes it. Empty when `clearable`. */
export function TimePicker({ value, onChange, label, step = 5, clearable, placeholder, className }: {
  value: string
  onChange: (value: string) => void
  label: string
  step?: number
  clearable?: boolean
  placeholder?: string
  className?: string
}) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const [h, m] = value ? value.split(":").map(Number) : [null, null]
  const minutes = useMemo(() => Array.from({ length: Math.ceil(60 / step) }, (_, i) => i * step), [step])
  const set = (hour: number, minute: number) => onChange(`${pad(hour)}:${pad(minute)}`)

  return (
    <DialogTrigger isOpen={open} onOpenChange={setOpen}>
      <Button aria-label={label} className={cn(TRIGGER, className)}>
        <ClockIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className={cn("min-w-0 flex-1 truncate tabular-nums", !value && "text-muted-foreground")}>{value || placeholder || "—"}</span>
        {clearable && value && (
          <span role="button" tabIndex={-1} aria-label={t("Clear")} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onChange("") }}
            className="-mr-1 flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-hover hover:text-foreground"><XIcon className="size-3.5" /></span>
        )}
      </Button>
      <Popover offset={6} placement="bottom start" className={PANEL}>
        <Dialog aria-label={label} className="flex gap-1 p-1.5 outline-none">
          <Column label={t("Hours")} items={Array.from({ length: 24 }, (_, i) => i)} selected={h}
            onPick={(hour) => set(hour, m ?? 0)} />
          <div className="w-px self-stretch bg-border" />
          <Column label={t("Minutes")} items={minutes} selected={m}
            onPick={(minute) => { set(h ?? 9, minute); setOpen(false) }} />
        </Dialog>
      </Popover>
    </DialogTrigger>
  )
}

/** One scrolling column of numbers, opened on the chosen one. */
function Column({ label, items, selected, onPick }: { label: string; items: number[]; selected: number | null; onPick: (n: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>("[data-on=true]")
    if (el && ref.current) ref.current.scrollTop = el.offsetTop - ref.current.clientHeight / 2 + el.clientHeight / 2
  }, [])
  return (
    <div className="flex flex-col">
      <span className="px-2 pt-0.5 pb-1 text-center text-[11px] font-medium text-muted-foreground">{label}</span>
      <div ref={ref} role="listbox" aria-label={label} className="nice-scroll relative flex h-56 w-16 flex-col gap-0.5 overflow-y-auto pr-0.5">
        {items.map((n) => (
          <button key={n} type="button" role="option" aria-selected={n === selected} data-on={n === selected} onClick={() => onPick(n)}
            className={cn("h-9 shrink-0 rounded-lg text-[14px] tabular-nums transition-colors",
              n === selected ? "bg-foreground font-semibold text-background" : "hover:bg-hover")}>
            {pad(n)}
          </button>
        ))}
      </div>
    </div>
  )
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** A day ("YYYY-MM-DD") from a month grid, Monday first. */
export function DatePicker({ value, onChange, label, className }: {
  value: string
  onChange: (value: string) => void
  label: string
  className?: string
}) {
  const { t, locale } = useT()
  const [open, setOpen] = useState(false)
  const chosen = value ? new Date(`${value}T00:00:00`) : null
  const [month, setMonth] = useState(() => { const d = chosen ?? new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const today = dayKey(new Date())

  const cells = useMemo(() => {
    const first = (month.getDay() + 6) % 7
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    return [...Array.from({ length: first }, () => null), ...Array.from({ length: days }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))]
  }, [month])
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: "short" }))

  return (
    <DialogTrigger isOpen={open} onOpenChange={(v) => { setOpen(v); if (v && chosen) setMonth(new Date(chosen.getFullYear(), chosen.getMonth(), 1)) }}>
      <Button aria-label={label} className={cn(TRIGGER, className)}>
        <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className={cn("min-w-0 flex-1 truncate first-letter:uppercase", !chosen && "text-muted-foreground")}>
          {chosen ? chosen.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "long" }) : t("Pick a day")}
        </span>
      </Button>
      <Popover offset={6} placement="bottom start" className={PANEL}>
        <Dialog aria-label={label} className="w-[280px] p-3 outline-none">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" aria-label={t("Previous month")} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              className="flex size-8 items-center justify-center rounded-lg hover:bg-hover"><ChevronLeftIcon className="size-4" /></button>
            <span className="text-[14px] font-semibold first-letter:uppercase">{month.toLocaleDateString(locale, { month: "long", year: "numeric" })}</span>
            <button type="button" aria-label={t("Next month")} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              className="flex size-8 items-center justify-center rounded-lg hover:bg-hover"><ChevronRightIcon className="size-4" /></button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {weekdays.map((w) => <span key={w} className="pb-1 text-[11px] font-medium text-muted-foreground uppercase">{w}</span>)}
            {cells.map((d, i) => {
              if (!d) return <span key={`e${i}`} />
              const k = dayKey(d)
              return (
                <button key={k} type="button" onClick={() => { onChange(k); setOpen(false) }}
                  className={cn("flex h-9 items-center justify-center rounded-lg text-[13.5px] tabular-nums transition-colors",
                    k === value ? "bg-foreground font-semibold text-background" : "hover:bg-hover",
                    k === today && k !== value && "font-semibold underline decoration-2 underline-offset-4")}>
                  {d.getDate()}
                </button>
              )
            })}
          </div>
          <div className="mt-2 flex justify-between border-t border-border pt-2">
            <button type="button" onClick={() => { onChange(today); setOpen(false) }} className="rounded-md px-2 py-1 text-[12.5px] font-medium hover:bg-hover">{t("Today")}</button>
            <button type="button" onClick={() => { const d = new Date(); d.setDate(d.getDate() + 1); onChange(dayKey(d)); setOpen(false) }} className="rounded-md px-2 py-1 text-[12.5px] font-medium hover:bg-hover">{t("Tomorrow")}</button>
          </div>
        </Dialog>
      </Popover>
    </DialogTrigger>
  )
}

/** An on/off switch with its words beside it. */
export function Toggle({ checked, onChange, children, className }: { checked: boolean; onChange: (v: boolean) => void; children?: React.ReactNode; className?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className={cn("flex items-center gap-2.5 text-left text-[13.5px]", className)}>
      <span className={cn("relative h-6 w-10 shrink-0 rounded-full transition-colors", checked ? "bg-foreground" : "bg-foreground/15")}>
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-background shadow-sm transition-all", checked ? "left-[18px]" : "left-0.5")} />
      </span>
      {children}
    </button>
  )
}
