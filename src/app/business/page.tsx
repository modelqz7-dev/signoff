import type { Metadata } from "next"
import { SalonLanding } from "@/components/landing/SalonLanding"
import "../landing.css"

export const metadata: Metadata = {
  title: "Nodly для майстрів — онлайн-запис, клієнти й сторінка в каталозі",
  description: "Одне посилання для Instagram: клієнти бачать ваші роботи й ціни та записуються на вільний час без реєстрації. Записи — у календарі, сповіщення — в Telegram.",
}

/** The landing for masters ("Для майстрів"); the home page is the catalog for their clients. */
export default function Business() {
  return <SalonLanding />
}
