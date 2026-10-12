// The niches Nodly's CRM is set up for. A niche is only settings: which kind of booking it
// takes, the services a new account starts with and the fields an order asks for. The
// dashboard, the clients and the services screens are shared.

export type CrmNiche = "nails" | "barber" | "cakes"
export type Niche = CrmNiche | "smm"
/** How a niche takes bookings: at a time (appointments) or for a date (orders). */
export type BookingKind = "appointment" | "order"

export type StarterService = {
  /** English; shown through t() and saved in the account's language. */
  title: string
  duration_min?: number
  price: number
  price_from?: boolean
  unit?: string
}

/** A field of an order's form, kept in the booking's details. */
export type OrderField = {
  key: string
  label: string
  type: "text" | "number" | "choice"
  placeholder?: string
  /** For "choice": the options, in English. */
  options?: string[]
  /** Shown only when another field has this value, e.g. the address for delivery. */
  when?: { key: string; value: string }
}

export type NicheConfig = {
  id: CrmNiche
  /** English; through t(). */
  name: string
  hint: string
  emoji: string
  kind: BookingKind
  /** What the person doing the work is called. */
  staffWord: string
  services: StarterService[]
  orderFields?: OrderField[]
}

export const NICHES: NicheConfig[] = [
  {
    id: "nails",
    name: "Nails & manicure",
    hint: "Appointments by time, clients and their visits",
    emoji: "💅",
    kind: "appointment",
    staffWord: "Master",
    services: [
      { title: "Manicure with gel polish", duration_min: 90, price: 600 },
      { title: "Manicure without coating", duration_min: 60, price: 400 },
      { title: "Pedicure with coating", duration_min: 90, price: 750 },
      { title: "Nail extensions", duration_min: 150, price: 900 },
      { title: "Coating removal", duration_min: 20, price: 100 },
    ],
  },
  {
    id: "barber",
    name: "Barbershop",
    hint: "Appointments by time for each barber",
    emoji: "💈",
    kind: "appointment",
    staffWord: "Barber",
    services: [
      { title: "Men's haircut", duration_min: 60, price: 450 },
      { title: "Beard trim", duration_min: 30, price: 250 },
      { title: "Haircut + beard", duration_min: 90, price: 650 },
      { title: "Kids' haircut", duration_min: 45, price: 350 },
      { title: "Head shave", duration_min: 30, price: 300 },
    ],
  },
  {
    id: "cakes",
    name: "Custom cakes",
    hint: "Orders for a date: filling, weight, inscription",
    emoji: "🎂",
    kind: "order",
    staffWord: "Confectioner",
    services: [
      { title: "Bento cake", price: 450 },
      { title: "Cake", price: 650, price_from: true, unit: "kg" },
      { title: "Cupcakes, set of 6", price: 480 },
      { title: "Macarons, set of 12", price: 420 },
    ],
    orderFields: [
      { key: "weight", label: "Weight, kg", type: "number", placeholder: "e.g. 2" },
      { key: "filling", label: "Filling", type: "text", placeholder: "Snickers, red velvet…" },
      { key: "inscription", label: "Inscription", type: "text", placeholder: "Happy birthday, Anna!" },
      { key: "decor", label: "Decor and wishes", type: "text", placeholder: "Colours, figures, a reference photo in Instagram…" },
      { key: "delivery", label: "How to get it", type: "choice", options: ["Pickup", "Delivery"] },
      { key: "address", label: "Delivery address", type: "text", when: { key: "delivery", value: "Delivery" } },
    ],
  },
]

export function nicheConfig(niche: string | null | undefined): NicheConfig | null {
  return NICHES.find((n) => n.id === niche) ?? null
}

export function isCrmNiche(niche: string | null | undefined): niche is CrmNiche {
  return !!nicheConfig(niche)
}
