// Cities a business can pick for Nodly's catalog. Stored by id, shown in the site's language.

export type City = { id: string; uk: string; ru: string }

export const CITIES: City[] = [
  { id: "kyiv", uk: "Київ", ru: "Киев" },
  { id: "lviv", uk: "Львів", ru: "Львов" },
  { id: "odesa", uk: "Одеса", ru: "Одесса" },
  { id: "kharkiv", uk: "Харків", ru: "Харьков" },
  { id: "dnipro", uk: "Дніпро", ru: "Днепр" },
  { id: "zaporizhzhia", uk: "Запоріжжя", ru: "Запорожье" },
  { id: "vinnytsia", uk: "Вінниця", ru: "Винница" },
  { id: "poltava", uk: "Полтава", ru: "Полтава" },
  { id: "ivano-frankivsk", uk: "Івано-Франківськ", ru: "Ивано-Франковск" },
  { id: "ternopil", uk: "Тернопіль", ru: "Тернополь" },
  { id: "lutsk", uk: "Луцьк", ru: "Луцк" },
  { id: "rivne", uk: "Рівне", ru: "Ровно" },
  { id: "zhytomyr", uk: "Житомир", ru: "Житомир" },
  { id: "cherkasy", uk: "Черкаси", ru: "Черкассы" },
  { id: "chernihiv", uk: "Чернігів", ru: "Чернигов" },
  { id: "sumy", uk: "Суми", ru: "Сумы" },
  { id: "khmelnytskyi", uk: "Хмельницький", ru: "Хмельницкий" },
  { id: "chernivtsi", uk: "Чернівці", ru: "Черновцы" },
  { id: "uzhhorod", uk: "Ужгород", ru: "Ужгород" },
  { id: "mykolaiv", uk: "Миколаїв", ru: "Николаев" },
  { id: "kropyvnytskyi", uk: "Кропивницький", ru: "Кропивницкий" },
  { id: "kryvyi-rih", uk: "Кривий Ріг", ru: "Кривой Рог" },
  { id: "bila-tserkva", uk: "Біла Церква", ru: "Белая Церковь" },
  { id: "brovary", uk: "Бровари", ru: "Бровары" },
  { id: "irpin", uk: "Ірпінь", ru: "Ирпень" },
  { id: "bucha", uk: "Буча", ru: "Буча" },
  { id: "kherson", uk: "Херсон", ru: "Херсон" },
  { id: "mukachevo", uk: "Мукачево", ru: "Мукачево" },
]

export function cityById(id: string | null | undefined) {
  return CITIES.find((c) => c.id === id) ?? null
}
