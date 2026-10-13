// Cities a business can pick for Nodly's catalog. Stored by id, shown in the site's language.

/** A city: its name in both languages and its centre, where the map opens. */
export type City = { id: string; uk: string; ru: string; lat: number; lng: number }

export const CITIES: City[] = [
  { id: "kyiv", uk: "Київ", ru: "Киев", lat: 50.4501, lng: 30.5234 },
  { id: "lviv", uk: "Львів", ru: "Львов", lat: 49.8397, lng: 24.0297 },
  { id: "odesa", uk: "Одеса", ru: "Одесса", lat: 46.4825, lng: 30.7233 },
  { id: "kharkiv", uk: "Харків", ru: "Харьков", lat: 49.9935, lng: 36.2304 },
  { id: "dnipro", uk: "Дніпро", ru: "Днепр", lat: 48.4647, lng: 35.0462 },
  { id: "zaporizhzhia", uk: "Запоріжжя", ru: "Запорожье", lat: 47.8388, lng: 35.1396 },
  { id: "vinnytsia", uk: "Вінниця", ru: "Винница", lat: 49.2331, lng: 28.4682 },
  { id: "poltava", uk: "Полтава", ru: "Полтава", lat: 49.5883, lng: 34.5514 },
  { id: "ivano-frankivsk", uk: "Івано-Франківськ", ru: "Ивано-Франковск", lat: 48.9226, lng: 24.7111 },
  { id: "ternopil", uk: "Тернопіль", ru: "Тернополь", lat: 49.5535, lng: 25.5948 },
  { id: "lutsk", uk: "Луцьк", ru: "Луцк", lat: 50.7472, lng: 25.3254 },
  { id: "rivne", uk: "Рівне", ru: "Ровно", lat: 50.6199, lng: 26.2516 },
  { id: "zhytomyr", uk: "Житомир", ru: "Житомир", lat: 50.2547, lng: 28.6587 },
  { id: "cherkasy", uk: "Черкаси", ru: "Черкассы", lat: 49.4444, lng: 32.0598 },
  { id: "chernihiv", uk: "Чернігів", ru: "Чернигов", lat: 51.4982, lng: 31.2893 },
  { id: "sumy", uk: "Суми", ru: "Сумы", lat: 50.9077, lng: 34.7981 },
  { id: "khmelnytskyi", uk: "Хмельницький", ru: "Хмельницкий", lat: 49.4229, lng: 26.9871 },
  { id: "chernivtsi", uk: "Чернівці", ru: "Черновцы", lat: 48.2921, lng: 25.9358 },
  { id: "uzhhorod", uk: "Ужгород", ru: "Ужгород", lat: 48.6208, lng: 22.2879 },
  { id: "mykolaiv", uk: "Миколаїв", ru: "Николаев", lat: 46.975, lng: 31.9946 },
  { id: "kropyvnytskyi", uk: "Кропивницький", ru: "Кропивницкий", lat: 48.5079, lng: 32.2623 },
  { id: "kryvyi-rih", uk: "Кривий Ріг", ru: "Кривой Рог", lat: 47.9105, lng: 33.3918 },
  { id: "bila-tserkva", uk: "Біла Церква", ru: "Белая Церковь", lat: 49.7968, lng: 30.1311 },
  { id: "brovary", uk: "Бровари", ru: "Бровары", lat: 50.5111, lng: 30.7909 },
  { id: "irpin", uk: "Ірпінь", ru: "Ирпень", lat: 50.5218, lng: 30.2506 },
  { id: "bucha", uk: "Буча", ru: "Буча", lat: 50.5435, lng: 30.2125 },
  { id: "kherson", uk: "Херсон", ru: "Херсон", lat: 46.6354, lng: 32.6169 },
  { id: "mukachevo", uk: "Мукачево", ru: "Мукачево", lat: 48.4393, lng: 22.7178 },
]

export function cityById(id: string | null | undefined) {
  return CITIES.find((c) => c.id === id) ?? null
}

/** Ukraine as a whole, for a map with no city picked. */
export const UKRAINE = { lat: 48.6, lng: 31.2, zoom: 5 }

/** Straight-line distance in kilometres between two points. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = (d: number) => (d * Math.PI) / 180
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}
