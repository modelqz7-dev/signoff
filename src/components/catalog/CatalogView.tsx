"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRightIcon, ListIcon, LocateFixedIcon, MapIcon, MapPinIcon, SearchIcon, StarIcon } from "lucide-react"
import dynamic from "next/dynamic"
import { Header } from "@/components/landing/SalonLanding"
import { NICHE_COVER } from "@/components/booking/BookingPage"
import { WorkshopFooter } from "@/components/landing/WorkshopSections"
import { NicheIcon } from "@/components/crm/NicheIcon"
import { Picker } from "@/components/crm/Pickers"
import { CITIES, REGIONS, UKRAINE, cityById, distanceKm, regionById } from "@/lib/cities"
import { NICHES, type CrmNiche } from "@/lib/niches"
import { pagePath } from "@/lib/page"
import { supabase } from "@/lib/supabase"
import type { CatalogEntry } from "@/lib/server/catalog"
import { useT } from "@/lib/i18n"
import { cn } from "@/lib/utils"

// the map loads only when someone opens it
const MapView = dynamic(() => import("@/components/catalog/MapView").then((m) => m.MapView), {
  ssr: false, loading: () => <div className="size-full animate-pulse bg-muted" />,
})

const H = "font-semibold tracking-[-0.035em] text-foreground"
const COVER = NICHE_COVER

/** Nodly's catalog: businesses that chose to be found, by trade and city, each a step from booking. */
export function CatalogView({ entries, initialNiche, initialCity, initialRegion }: { entries: CatalogEntry[]; initialNiche: string; initialCity: string; initialRegion: string }) {
  const { t, lang } = useT()
  const [signedIn, setSignedIn] = useState(false)
  useEffect(() => { supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session)) }, [])
  const [niche, setNiche] = useState<CrmNiche | "">(NICHES.some((n) => n.id === initialNiche) ? (initialNiche as CrmNiche) : "")
  const [city, setCity] = useState(cityById(initialCity) ? initialCity : "")
  const [region, setRegion] = useState(cityById(initialCity)?.region ?? (regionById(initialRegion) ? initialRegion : ""))
  const [q, setQ] = useState("")
  const [view, setView] = useState<"list" | "map">("list")
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [locError, setLocError] = useState(false)
  const [picked, setPicked] = useState<string | null>(null)

  function nearMe() {
    if (!navigator.geolocation) { setLocError(true); return }
    setLocating(true)
    setLocError(false)
    navigator.geolocation.getCurrentPosition(
      (pos) => { setMe({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setCity(""); setRegion(""); setLocating(false) },
      () => { setLocError(true); setLocating(false) },
      { enableHighAccuracy: false, timeout: 10000 },
    )
  }

  // the filters live in the address too, so a search can be shared
  useEffect(() => {
    const u = new URL(window.location.href)
    for (const [k, v] of [["niche", niche], ["region", city ? "" : region], ["city", city]] as const) { if (v) u.searchParams.set(k, v); else u.searchParams.delete(k) }
    window.history.replaceState(null, "", u.pathname + u.search)
  }, [niche, region, city])

  // regions and towns that have someone listed, the most populated first
  const regions = useMemo(() => {
    const count = new Map<string, number>()
    for (const e of entries) if (e.region) count.set(e.region, (count.get(e.region) ?? 0) + 1)
    return REGIONS.filter((x) => count.has(x.id)).sort((a, b) => count.get(b.id)! - count.get(a.id)!)
  }, [entries])
  const cities = useMemo(() => {
    const count = new Map<string, number>()
    for (const e of entries) if (e.city && (!region || e.region === region)) count.set(e.city, (count.get(e.city) ?? 0) + 1)
    return CITIES.filter((c) => count.has(c.id)).sort((a, b) => count.get(b.id)! - count.get(a.id)!)
  }, [entries, region])
  // where each one is: its pin, or else its city's centre
  const where = (e: CatalogEntry) => e.geo ?? cityById(e.city) ?? regionById(e.region)
  const km = (e: CatalogEntry) => { const w = where(e); return me && w ? distanceKm(me, w) : null }
  const shown = entries.filter((e) => (!niche || e.niche === niche) && (!region || e.region === region) && (!city || e.city === city)
    && (!q.trim() || `${e.title} ${e.category}`.toLowerCase().includes(q.trim().toLowerCase())))
  // near me: the closest first, those with no place at the end
  if (me) shown.sort((a, b) => (km(a) ?? 1e9) - (km(b) ?? 1e9))
  const points = shown.flatMap((e) => (e.geo ? [{ id: e.slug, lat: e.geo.lat, lng: e.geo.lng, image: e.avatar, niche: e.niche, label: e.title }] : []))
  const pickedEntry = shown.find((e) => e.slug === picked) ?? null
  const cityInfo = cityById(city)
  const regionInfo = regionById(region)
  const focus = pickedEntry?.geo ?? me ?? cityInfo ?? regionInfo ?? UKRAINE
  const focusZoom = pickedEntry?.geo ? 14 : me ? 12 : cityInfo ? 11 : regionInfo ? (region === "kyiv-city" ? 10 : 7.5) : UKRAINE.zoom
  const tabs: { id: CrmNiche | ""; label: string }[] = [
    { id: "", label: t("Everyone") }, { id: "nails", label: t("Nails") }, { id: "barber", label: t("Barbershop") }, { id: "cakes", label: t("Cakes") },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header t={t} signedIn={signedIn} />
      <main className="mx-auto max-w-6xl px-4 pt-12 pb-20 sm:px-6 sm:pt-16">
        <h1 className={cn(H, "text-[40px] leading-[1.02] sm:text-[64px]")}>{t("Find your master.")}</h1>
        <p className="mt-4 max-w-xl text-[17px] text-muted-foreground sm:text-[19px]">{t("Nails, barbershops and cakes to order. Look at the work, read the reviews and book online.")}</p>

        {/* filters: trade, city, name */}
        <div className="mt-10 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div role="tablist" className="flex max-w-full gap-1 overflow-x-auto rounded-full bg-foreground/[0.06] p-1 no-scrollbar">
            {tabs.map((x) => (
              <button key={x.id || "all"} type="button" role="tab" aria-selected={niche === x.id} onClick={() => setNiche(x.id)}
                className={cn("flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-[14px] font-medium transition-all",
                  x.id && "pl-1.5", niche === x.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                {x.id && <NicheIcon niche={x.id} className="size-7" />}{x.label}
              </button>
            ))}
          </div>
          <div className="flex flex-1 flex-wrap gap-3">
            <div className="w-52 shrink-0">
              <Picker value={region || "all"} onChange={(v) => { setRegion(v === "all" ? "" : v); setCity("") }} label={t("Region")}
                options={[{ value: "all", label: t("All regions") }, ...regions.map((x) => ({ value: x.id, label: x[lang] }))]} />
            </div>
            {cities.length > 0 && (
              <div className="w-44 shrink-0">
                <Picker value={city || "all"} onChange={(v) => { setCity(v === "all" ? "" : v); if (v !== "all") setRegion(cityById(v)!.region) }} label={t("Town")}
                  options={[{ value: "all", label: t("All towns") }, ...cities.map((c) => ({ value: c.id, label: c[lang] }))]} />
              </div>
            )}
            <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl bg-foreground/[0.05] px-3 ring-1 ring-transparent focus-within:ring-foreground/25">
              <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Name or what they do")} aria-label={t("Search")}
                className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground" />
            </label>
          </div>
        </div>

        {/* near me, and list or map */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={me ? () => setMe(null) : nearMe} disabled={locating} aria-pressed={!!me}
            className={cn("flex h-10 items-center gap-2 rounded-full px-4 text-[14px] font-medium ring-1 transition-colors",
              me ? "bg-foreground text-background ring-foreground" : "ring-border hover:bg-hover")}>
            <LocateFixedIcon className="size-4" />{locating ? t("Finding you…") : t("Near me")}
          </button>
          {locError && <span className="text-[13px] text-muted-foreground">{t("Couldn't get your location. Allow it in the browser or pick a city.")}</span>}
          <div role="tablist" className="ml-auto flex gap-0.5 rounded-full bg-foreground/[0.06] p-1">
            {([["list", t("List"), ListIcon], ["map", t("Map"), MapIcon]] as const).map(([id, label, Icon]) => (
              <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => setView(id)}
                className={cn("flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] font-medium transition-all",
                  view === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                <Icon className="size-4" />{label}
              </button>
            ))}
          </div>
        </div>

        {view === "map" ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-[360px_1fr]">
            <div className="order-2 flex flex-col gap-3 lg:order-1 lg:max-h-[640px] lg:overflow-y-auto lg:pr-1">
              {pickedEntry && <Card entry={pickedEntry} km={km(pickedEntry)} />}
              {shown.filter((e) => e !== pickedEntry).map((e) => (
                <button key={e.slug} type="button" onClick={() => setPicked(e.slug)}
                  className="flex items-center gap-3 rounded-2xl bg-card p-3 text-left ring-1 ring-border transition-colors hover:ring-foreground/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {e.avatar ? <img src={e.avatar} alt="" className="size-11 shrink-0 rounded-full object-cover" /> : <NicheIcon niche={e.niche} className="size-11" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">{e.title}</span>
                    <span className="block truncate text-[13px] text-muted-foreground">
                      {[e.rating != null ? `★ ${e.rating.toFixed(1)}` : "", km(e) != null ? kmLabel(km(e)!, t) : (cityById(e.city) ?? regionById(e.region))?.[lang] ?? "", !e.geo ? t("no pin") : ""].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </button>
              ))}
              {!shown.length && <p className="rounded-2xl apple-card p-6 text-center text-[14px] text-muted-foreground">{t("Nobody here yet")}</p>}
            </div>
            <div className="order-1 h-[60vh] overflow-hidden rounded-[24px] ring-1 ring-border lg:order-2 lg:h-[640px]">
              <MapView className="size-full" center={focus} zoom={focusZoom} points={points} selected={picked} onSelect={setPicked} me={me} />
            </div>
          </div>
        ) : shown.length ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((e) => <Card key={e.slug} entry={e} km={km(e)} />)}
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center gap-3 rounded-[28px] apple-card px-6 py-16 text-center">
            <div className="flex -space-x-3">{(["nails", "barber", "cakes"] as CrmNiche[]).map((n) => <NicheIcon key={n} niche={n} className="size-12 ring-4 ring-card" />)}</div>
            <p className="mt-2 text-[18px] font-semibold">{entries.length ? t("Nobody here yet") : t("The catalog is just opening")}</p>
            <p className="max-w-sm text-[15px] text-muted-foreground">{entries.length ? t("Try another city or trade.") : t("The first masters are setting up their pages. Come back soon.")}</p>
          </div>
        )}

        {/* for masters */}
        <div className="mt-16 flex flex-col items-start justify-between gap-6 rounded-[32px] bg-[#1d1d1f] p-8 text-white sm:flex-row sm:items-center sm:p-12 dark:bg-white dark:text-[#1d1d1f]">
          <div>
            <h2 className="text-[28px] leading-tight font-semibold tracking-[-0.03em] sm:text-[36px]">{t("Are you a master?")}</h2>
            <p className="mt-2 max-w-md text-[16px] opacity-70">{t("Make your page with online booking and get into the catalog. It's free.")}</p>
          </div>
          <Link href={signedIn ? "/link/edit" : "/signup"} className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-white px-6 text-[15px] font-medium text-[#1d1d1f] hover:opacity-90 dark:bg-[#1d1d1f] dark:text-white">
            {signedIn ? t("Set up my page") : t("Start free")}<ArrowRightIcon className="size-4" />
          </Link>
        </div>
      </main>
      <WorkshopFooter t={t} />
    </div>
  )
}

/** A business: its cover, face, name, what it does, where, how it's rated, and the way to book. */
/** "350 m", "1.2 km", "15 km": how far, in the site's words. */
function kmLabel(km: number, t: ReturnType<typeof useT>["t"]) {
  return km < 1 ? t("{n} m", { n: Math.round(km * 1000 / 10) * 10 }) : t("{n} km", { n: km < 10 ? km.toFixed(1).replace(".", ",") : Math.round(km) })
}

function Card({ entry: e, km }: { entry: CatalogEntry; km?: number | null }) {
  const { t, lang } = useT()
  const city = cityById(e.city) ?? regionById(e.region)
  const config = NICHES.find((n) => n.id === e.niche)!
  return (
    <Link href={pagePath(e.slug)} className="group flex shrink-0 flex-col overflow-hidden rounded-[24px] apple-card transition-transform duration-300 hover:-translate-y-0.5">
      <div className="relative h-36" style={{ background: COVER[e.niche] }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {e.cover && <img src={e.cover} alt="" loading="lazy" className="size-full object-cover" />}
        <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[12px] font-medium text-[#1d1d1f] backdrop-blur">{t(config.name)}</span>
      </div>
      <div className="flex flex-1 flex-col gap-3 px-5 pb-5">
        <div className="relative z-10 -mt-8 flex items-end gap-3">
          {e.avatar
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={e.avatar} alt="" className="size-16 shrink-0 rounded-full bg-card object-cover ring-4 ring-card" />
            : <NicheIcon niche={e.niche} className="size-16 ring-4 ring-card" />}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-[18px] font-semibold tracking-[-0.02em]">{e.title}</h3>
          {e.category && <p className="mt-0.5 line-clamp-2 text-[14px] text-muted-foreground">{e.category}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
          {e.rating != null && (
            <span className="flex items-center gap-1 font-medium text-foreground">
              <StarIcon className="size-3.5 fill-[#f5a623] text-[#f5a623]" />{e.rating.toFixed(1)}
              <span className="font-normal text-muted-foreground">({e.reviews})</span>
            </span>
          )}
          {(city || km != null) && <span className="flex items-center gap-1"><MapPinIcon className="size-3.5" />{[city?.[lang], km != null ? kmLabel(km, t) : ""].filter(Boolean).join(" · ")}</span>}
          {e.works > 0 && <span>{t("Work photos: {n}", { n: e.works })}</span>}
        </div>
        <span className="mt-auto flex h-10 items-center justify-center rounded-full bg-foreground text-[14px] font-medium text-background transition-opacity group-hover:opacity-90">
          {config.kind === "order" ? t("Order now") : t("Book now")}
        </span>
      </div>
    </Link>
  )
}
