"use client"

import { useEffect, useRef } from "react"
import * as maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import type { CrmNiche } from "@/lib/niches"
import { useTheme } from "@/lib/theme"

// The catalog's map: OpenFreeMap's free vector tiles (no key), grey in the light theme and
// dark in the dark one, with each business as a round face. Loaded only where a map shows.

// MapLibre's worker can't be found inside the bundle, so it's served from public/ (copied from
// node_modules/maplibre-gl/dist: keep the folder in step with the package version).
maplibregl.setWorkerUrl("/maplibre/6.11.2/maplibre-gl-worker.mjs")

const STYLE = { light: "https://tiles.openfreemap.org/styles/positron", dark: "https://tiles.openfreemap.org/styles/dark" }

export type MapPoint = { id: string; lat: number; lng: number; image: string | null; niche: CrmNiche; label: string }
type LatLng = { lat: number; lng: number }

/** A face on the map: the business's photo, or its niche's character. */
function pin(p: MapPoint, selected: boolean) {
  const el = document.createElement("button")
  el.type = "button"
  el.setAttribute("aria-label", p.label)
  el.title = p.label
  el.style.cssText = `width:${selected ? 52 : 40}px;height:${selected ? 52 : 40}px;border-radius:9999px;background:#fff center/cover no-repeat;` +
    `box-shadow:0 0 0 ${selected ? 3 : 2}px ${selected ? "#1d1d1f" : "#fff"},0 6px 18px rgba(0,0,0,.28);cursor:pointer;transition:width .2s,height .2s;padding:0;border:0;` +
    `background-image:url("${p.image || `/niches/${p.niche}.svg`}")`
  return el
}

/** The owner's own pin in the editor: a red map pin that stands out on the light and the dark map. */
function ownPin() {
  const el = document.createElement("div")
  el.style.cssText = "width:34px;height:44px;cursor:grab;filter:drop-shadow(0 4px 8px rgba(0,0,0,.35))"
  el.innerHTML = '<svg viewBox="0 0 34 44" width="34" height="44"><path d="M17 43C17 43 32 27.6 32 16.5A15 15 0 0 0 2 16.5C2 27.6 17 43 17 43Z" fill="#ff3b30" stroke="#fff" stroke-width="2.5"/><circle cx="17" cy="16.5" r="5.5" fill="#fff"/></svg>'
  return el
}

export function MapView({ center, zoom, points = [], selected, onSelect, me, picker, className }: {
  center: LatLng
  zoom: number
  points?: MapPoint[]
  selected?: string | null
  onSelect?: (id: string) => void
  /** The visitor's own position, shown as a blue dot. */
  me?: LatLng | null
  /** Editor mode: one draggable pin the owner puts by clicking. */
  picker?: { value: LatLng | null; onChange: (value: LatLng) => void }
  className?: string
}) {
  const theme = useTheme()
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const markers = useRef<maplibregl.Marker[]>([])
  const pickerRef = useRef(picker)
  const darkRef = useRef(theme === "dark")
  // the pins are redrawn only when they really change, not on every render of the page
  const pointsRef = useRef(points)
  const pointsKey = points.map((p) => `${p.id}:${p.lat}:${p.lng}:${p.image}`).join("|")
  useEffect(() => { pointsRef.current = points })
  useEffect(() => { pickerRef.current = picker })

  // the map itself, once
  useEffect(() => {
    if (!box.current) return
    const m = new maplibregl.Map({
      container: box.current,
      style: STYLE[theme],
      center: [center.lng, center.lat],
      zoom,
      attributionControl: { compact: true },
      cooperativeGestures: false,
    })
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right")
    // if the dark style can't load, the light one stands in
    let loaded = false
    m.once("load", () => { loaded = true })
    m.on("error", () => { if (!loaded && darkRef.current) { darkRef.current = false; m.setStyle(STYLE.light) } })
    m.on("click", (e: maplibregl.MapMouseEvent) => pickerRef.current?.onChange({ lat: e.lngLat.lat, lng: e.lngLat.lng }))
    map.current = m
    return () => { m.remove(); map.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // the theme follows the site's
  useEffect(() => { darkRef.current = theme === "dark"; map.current?.setStyle(STYLE[theme]) }, [theme])

  // where to look: a new city, or a new pin in the editor
  useEffect(() => { map.current?.easeTo({ center: [center.lng, center.lat], zoom, duration: 600 }) }, [center.lat, center.lng, zoom])

  // the faces, the owner's pin and the visitor's dot
  useEffect(() => {
    const m = map.current
    if (!m) return
    for (const mk of markers.current) mk.remove()
    markers.current = []
    // the visitor's dot first, so a business right where they stand stays on top of it
    if (me) {
      const dot = document.createElement("span")
      dot.style.cssText = "width:14px;height:14px;border-radius:9999px;background:#0a84ff;box-shadow:0 0 0 3px #fff,0 0 0 8px rgba(10,132,255,.2);pointer-events:none"
      markers.current.push(new maplibregl.Marker({ element: dot }).setLngLat([me.lng, me.lat]).addTo(m))
    }
    for (const p of pointsRef.current) {
      const el = pin(p, p.id === selected)
      el.addEventListener("click", (e) => { e.stopPropagation(); onSelect?.(p.id) })
      markers.current.push(new maplibregl.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(m))
    }
    if (picker?.value) {
      const mk = new maplibregl.Marker({ element: ownPin(), anchor: "bottom", draggable: true }).setLngLat([picker.value.lng, picker.value.lat]).addTo(m)
      mk.on("dragend", () => { const { lat, lng } = mk.getLngLat(); pickerRef.current?.onChange({ lat, lng }) })
      markers.current.push(mk)
    }
  }, [pointsKey, selected, onSelect, picker?.value, me])

  return <div ref={box} className={className} />
}
