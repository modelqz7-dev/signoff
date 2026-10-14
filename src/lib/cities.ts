// Where a business is, for Nodly's catalog: every region of Ukraine and its towns.
// Stored by id, shown in the site's language. A town not on the list: pick the region and put a pin.

/** A region (oblast, or Kyiv itself): its name in both languages and where the map opens on it. */
export type Region = { id: string; uk: string; ru: string; lat: number; lng: number }
/** A town: its name in both languages, its centre and its region. */
export type City = { id: string; uk: string; ru: string; lat: number; lng: number; region: string }

export const REGIONS: Region[] = [
  { id: "vinnytska", uk: "Вінницька область", ru: "Винницкая область", lat: 49.2331, lng: 28.4682 },
  { id: "volynska", uk: "Волинська область", ru: "Волынская область", lat: 50.95, lng: 25.0 },
  { id: "dnipropetrovska", uk: "Дніпропетровська область", ru: "Днепропетровская область", lat: 48.35, lng: 34.9 },
  { id: "donetska", uk: "Донецька область", ru: "Донецкая область", lat: 48.55, lng: 37.6 },
  { id: "zhytomyrska", uk: "Житомирська область", ru: "Житомирская область", lat: 50.4, lng: 28.4 },
  { id: "zakarpatska", uk: "Закарпатська область", ru: "Закарпатская область", lat: 48.4, lng: 23.1 },
  { id: "zaporizka", uk: "Запорізька область", ru: "Запорожская область", lat: 47.8388, lng: 35.1396 },
  { id: "ivano-frankivska", uk: "Івано-Франківська область", ru: "Ивано-Франковская область", lat: 48.75, lng: 24.7 },
  { id: "kyiv-city", uk: "Київ", ru: "Киев", lat: 50.4501, lng: 30.5234 },
  { id: "kyivska", uk: "Київська область", ru: "Киевская область", lat: 50.3, lng: 30.4 },
  { id: "kirovohradska", uk: "Кіровоградська область", ru: "Кировоградская область", lat: 48.5, lng: 32.3 },
  { id: "luhanska", uk: "Луганська область", ru: "Луганская область", lat: 48.9, lng: 39.0 },
  { id: "lvivska", uk: "Львівська область", ru: "Львовская область", lat: 49.7, lng: 23.95 },
  { id: "mykolaivska", uk: "Миколаївська область", ru: "Николаевская область", lat: 47.3, lng: 31.6 },
  { id: "odeska", uk: "Одеська область", ru: "Одесская область", lat: 46.7, lng: 30.2 },
  { id: "poltavska", uk: "Полтавська область", ru: "Полтавская область", lat: 49.55, lng: 33.9 },
  { id: "rivnenska", uk: "Рівненська область", ru: "Ровенская область", lat: 50.9, lng: 26.3 },
  { id: "sumska", uk: "Сумська область", ru: "Сумская область", lat: 50.9, lng: 34.0 },
  { id: "ternopilska", uk: "Тернопільська область", ru: "Тернопольская область", lat: 49.4, lng: 25.5 },
  { id: "kharkivska", uk: "Харківська область", ru: "Харьковская область", lat: 49.6, lng: 36.4 },
  { id: "khersonska", uk: "Херсонська область", ru: "Херсонская область", lat: 46.6354, lng: 32.6169 },
  { id: "khmelnytska", uk: "Хмельницька область", ru: "Хмельницкая область", lat: 49.4, lng: 26.9 },
  { id: "cherkaska", uk: "Черкаська область", ru: "Черкасская область", lat: 49.3, lng: 31.6 },
  { id: "chernivetska", uk: "Чернівецька область", ru: "Черновицкая область", lat: 48.3, lng: 25.9 },
  { id: "chernihivska", uk: "Чернігівська область", ru: "Черниговская область", lat: 51.3, lng: 32.0 },
  { id: "krym", uk: "Автономна Республіка Крим", ru: "Автономная Республика Крым", lat: 45.0, lng: 34.1 },
]

export const CITIES: City[] = [
  { id: "vinnytsia", uk: "Вінниця", ru: "Винница", lat: 49.2331, lng: 28.4682, region: "vinnytska" },
  { id: "zhmerynka", uk: "Жмеринка", ru: "Жмеринка", lat: 49.0391, lng: 28.1086, region: "vinnytska" },
  { id: "mohyliv-podilskyi", uk: "Могилів-Подільський", ru: "Могилёв-Подольский", lat: 48.4467, lng: 27.7979, region: "vinnytska" },
  { id: "khmilnyk", uk: "Хмільник", ru: "Хмельник", lat: 49.5598, lng: 27.9572, region: "vinnytska" },
  { id: "koziatyn", uk: "Козятин", ru: "Казатин", lat: 49.7146, lng: 28.8328, region: "vinnytska" },
  { id: "haisyn", uk: "Гайсин", ru: "Гайсин", lat: 48.8106, lng: 29.3896, region: "vinnytska" },
  { id: "ladyzhyn", uk: "Ладижин", ru: "Ладыжин", lat: 48.6847, lng: 29.2361, region: "vinnytska" },
  { id: "lutsk", uk: "Луцьк", ru: "Луцк", lat: 50.7472, lng: 25.3254, region: "volynska" },
  { id: "kovel", uk: "Ковель", ru: "Ковель", lat: 51.2154, lng: 24.7086, region: "volynska" },
  { id: "novovolynsk", uk: "Нововолинськ", ru: "Нововолынск", lat: 50.7259, lng: 24.1631, region: "volynska" },
  { id: "volodymyr", uk: "Володимир", ru: "Владимир", lat: 50.8473, lng: 24.3217, region: "volynska" },
  { id: "dnipro", uk: "Дніпро", ru: "Днепр", lat: 48.4647, lng: 35.0462, region: "dnipropetrovska" },
  { id: "kryvyi-rih", uk: "Кривий Ріг", ru: "Кривой Рог", lat: 47.9105, lng: 33.3918, region: "dnipropetrovska" },
  { id: "kamianske", uk: "Кам'янське", ru: "Каменское", lat: 48.5079, lng: 34.6132, region: "dnipropetrovska" },
  { id: "nikopol", uk: "Нікополь", ru: "Никополь", lat: 47.5712, lng: 34.3964, region: "dnipropetrovska" },
  { id: "pavlohrad", uk: "Павлоград", ru: "Павлоград", lat: 48.5338, lng: 35.8706, region: "dnipropetrovska" },
  { id: "samar", uk: "Самар", ru: "Самар", lat: 48.6297, lng: 35.2531, region: "dnipropetrovska" },
  { id: "zhovti-vody", uk: "Жовті Води", ru: "Жёлтые Воды", lat: 48.3456, lng: 33.5023, region: "dnipropetrovska" },
  { id: "kramatorsk", uk: "Краматорськ", ru: "Краматорск", lat: 48.7389, lng: 37.5848, region: "donetska" },
  { id: "sloviansk", uk: "Слов'янськ", ru: "Славянск", lat: 48.8517, lng: 37.6058, region: "donetska" },
  { id: "druzhkivka", uk: "Дружківка", ru: "Дружковка", lat: 48.6203, lng: 37.5276, region: "donetska" },
  { id: "zhytomyr", uk: "Житомир", ru: "Житомир", lat: 50.2547, lng: 28.6587, region: "zhytomyrska" },
  { id: "berdychiv", uk: "Бердичів", ru: "Бердичев", lat: 49.8993, lng: 28.6023, region: "zhytomyrska" },
  { id: "korosten", uk: "Коростень", ru: "Коростень", lat: 50.9504, lng: 28.6378, region: "zhytomyrska" },
  { id: "zviahel", uk: "Звягель", ru: "Звягель", lat: 50.5891, lng: 27.6157, region: "zhytomyrska" },
  { id: "uzhhorod", uk: "Ужгород", ru: "Ужгород", lat: 48.6208, lng: 22.2879, region: "zakarpatska" },
  { id: "mukachevo", uk: "Мукачево", ru: "Мукачево", lat: 48.4393, lng: 22.7178, region: "zakarpatska" },
  { id: "khust", uk: "Хуст", ru: "Хуст", lat: 48.1764, lng: 23.2981, region: "zakarpatska" },
  { id: "berehove", uk: "Берегове", ru: "Берегово", lat: 48.2058, lng: 22.6444, region: "zakarpatska" },
  { id: "zaporizhzhia", uk: "Запоріжжя", ru: "Запорожье", lat: 47.8388, lng: 35.1396, region: "zaporizka" },
  { id: "ivano-frankivsk", uk: "Івано-Франківськ", ru: "Ивано-Франковск", lat: 48.9226, lng: 24.7111, region: "ivano-frankivska" },
  { id: "kalush", uk: "Калуш", ru: "Калуш", lat: 49.0428, lng: 24.3605, region: "ivano-frankivska" },
  { id: "kolomyia", uk: "Коломия", ru: "Коломыя", lat: 48.5306, lng: 25.0373, region: "ivano-frankivska" },
  { id: "nadvirna", uk: "Надвірна", ru: "Надворная", lat: 48.6337, lng: 24.5797, region: "ivano-frankivska" },
  { id: "yaremche", uk: "Яремче", ru: "Яремче", lat: 48.4582, lng: 24.5521, region: "ivano-frankivska" },
  { id: "kyiv", uk: "Київ", ru: "Киев", lat: 50.4501, lng: 30.5234, region: "kyiv-city" },
  { id: "bila-tserkva", uk: "Біла Церква", ru: "Белая Церковь", lat: 49.7968, lng: 30.1311, region: "kyivska" },
  { id: "brovary", uk: "Бровари", ru: "Бровары", lat: 50.5111, lng: 30.7909, region: "kyivska" },
  { id: "irpin", uk: "Ірпінь", ru: "Ирпень", lat: 50.5218, lng: 30.2506, region: "kyivska" },
  { id: "bucha", uk: "Буча", ru: "Буча", lat: 50.5435, lng: 30.2125, region: "kyivska" },
  { id: "boryspil", uk: "Бориспіль", ru: "Борисполь", lat: 50.3527, lng: 30.9551, region: "kyivska" },
  { id: "vyshneve", uk: "Вишневе", ru: "Вишнёвое", lat: 50.3867, lng: 30.3712, region: "kyivska" },
  { id: "boiarka", uk: "Боярка", ru: "Боярка", lat: 50.329, lng: 30.2883, region: "kyivska" },
  { id: "vyshhorod", uk: "Вишгород", ru: "Вышгород", lat: 50.5844, lng: 30.4898, region: "kyivska" },
  { id: "obukhiv", uk: "Обухів", ru: "Обухов", lat: 50.1072, lng: 30.6211, region: "kyivska" },
  { id: "fastiv", uk: "Фастів", ru: "Фастов", lat: 50.0763, lng: 29.9177, region: "kyivska" },
  { id: "vasylkiv", uk: "Васильків", ru: "Васильков", lat: 50.1774, lng: 30.3172, region: "kyivska" },
  { id: "slavutych", uk: "Славутич", ru: "Славутич", lat: 51.5225, lng: 30.7202, region: "kyivska" },
  { id: "kropyvnytskyi", uk: "Кропивницький", ru: "Кропивницкий", lat: 48.5079, lng: 32.2623, region: "kirovohradska" },
  { id: "oleksandriia", uk: "Олександрія", ru: "Александрия", lat: 48.6696, lng: 33.1159, region: "kirovohradska" },
  { id: "svitlovodsk", uk: "Світловодськ", ru: "Светловодск", lat: 49.0485, lng: 33.2412, region: "kirovohradska" },
  { id: "lviv", uk: "Львів", ru: "Львов", lat: 49.8397, lng: 24.0297, region: "lvivska" },
  { id: "drohobych", uk: "Дрогобич", ru: "Дрогобыч", lat: 49.3489, lng: 23.5069, region: "lvivska" },
  { id: "sheptytskyi", uk: "Шептицький", ru: "Шептицкий", lat: 50.3891, lng: 24.2356, region: "lvivska" },
  { id: "stryi", uk: "Стрий", ru: "Стрый", lat: 49.2617, lng: 23.8536, region: "lvivska" },
  { id: "sambir", uk: "Самбір", ru: "Самбор", lat: 49.5183, lng: 23.1972, region: "lvivska" },
  { id: "truskavets", uk: "Трускавець", ru: "Трускавец", lat: 49.2786, lng: 23.5061, region: "lvivska" },
  { id: "zolochiv", uk: "Золочів", ru: "Золочев", lat: 49.8077, lng: 24.9036, region: "lvivska" },
  { id: "zhovkva", uk: "Жовква", ru: "Жолква", lat: 50.0566, lng: 23.9707, region: "lvivska" },
  { id: "mykolaiv", uk: "Миколаїв", ru: "Николаев", lat: 46.975, lng: 31.9946, region: "mykolaivska" },
  { id: "pervomaisk", uk: "Первомайськ", ru: "Первомайск", lat: 48.0447, lng: 30.8508, region: "mykolaivska" },
  { id: "voznesensk", uk: "Вознесенськ", ru: "Вознесенск", lat: 47.5679, lng: 31.3341, region: "mykolaivska" },
  { id: "yuzhnoukrainsk", uk: "Южноукраїнськ", ru: "Южноукраинск", lat: 47.8169, lng: 31.1739, region: "mykolaivska" },
  { id: "odesa", uk: "Одеса", ru: "Одесса", lat: 46.4825, lng: 30.7233, region: "odeska" },
  { id: "izmail", uk: "Ізмаїл", ru: "Измаил", lat: 45.3511, lng: 28.8366, region: "odeska" },
  { id: "chornomorsk", uk: "Чорноморськ", ru: "Черноморск", lat: 46.3011, lng: 30.6564, region: "odeska" },
  { id: "pivdenne", uk: "Південне", ru: "Южное", lat: 46.6222, lng: 31.1013, region: "odeska" },
  { id: "podilsk", uk: "Подільськ", ru: "Подольск", lat: 47.7425, lng: 29.5357, region: "odeska" },
  { id: "bilhorod-dnistrovskyi", uk: "Білгород-Дністровський", ru: "Белгород-Днестровский", lat: 46.1871, lng: 30.3412, region: "odeska" },
  { id: "poltava", uk: "Полтава", ru: "Полтава", lat: 49.5883, lng: 34.5514, region: "poltavska" },
  { id: "kremenchuk", uk: "Кременчук", ru: "Кременчуг", lat: 49.0659, lng: 33.4204, region: "poltavska" },
  { id: "horishni-plavni", uk: "Горішні Плавні", ru: "Горишние Плавни", lat: 49.0123, lng: 33.6466, region: "poltavska" },
  { id: "lubny", uk: "Лубни", ru: "Лубны", lat: 50.0186, lng: 32.9869, region: "poltavska" },
  { id: "myrhorod", uk: "Миргород", ru: "Миргород", lat: 49.9686, lng: 33.6083, region: "poltavska" },
  { id: "rivne", uk: "Рівне", ru: "Ровно", lat: 50.6199, lng: 26.2516, region: "rivnenska" },
  { id: "varash", uk: "Вараш", ru: "Вараш", lat: 51.3509, lng: 25.8474, region: "rivnenska" },
  { id: "dubno", uk: "Дубно", ru: "Дубно", lat: 50.4192, lng: 25.7349, region: "rivnenska" },
  { id: "sarny", uk: "Сарни", ru: "Сарны", lat: 51.338, lng: 26.6019, region: "rivnenska" },
  { id: "sumy", uk: "Суми", ru: "Сумы", lat: 50.9077, lng: 34.7981, region: "sumska" },
  { id: "konotop", uk: "Конотоп", ru: "Конотоп", lat: 51.2402, lng: 33.2026, region: "sumska" },
  { id: "shostka", uk: "Шостка", ru: "Шостка", lat: 51.8733, lng: 33.4797, region: "sumska" },
  { id: "okhtyrka", uk: "Охтирка", ru: "Ахтырка", lat: 50.3103, lng: 34.8988, region: "sumska" },
  { id: "romny", uk: "Ромни", ru: "Ромны", lat: 50.7515, lng: 33.4746, region: "sumska" },
  { id: "ternopil", uk: "Тернопіль", ru: "Тернополь", lat: 49.5535, lng: 25.5948, region: "ternopilska" },
  { id: "chortkiv", uk: "Чортків", ru: "Чортков", lat: 49.017, lng: 25.7983, region: "ternopilska" },
  { id: "kremenets", uk: "Кременець", ru: "Кременец", lat: 50.1033, lng: 25.7258, region: "ternopilska" },
  { id: "kharkiv", uk: "Харків", ru: "Харьков", lat: 49.9935, lng: 36.2304, region: "kharkivska" },
  { id: "lozova", uk: "Лозова", ru: "Лозовая", lat: 48.8892, lng: 36.3162, region: "kharkivska" },
  { id: "chuhuiv", uk: "Чугуїв", ru: "Чугуев", lat: 49.8353, lng: 36.688, region: "kharkivska" },
  { id: "izium", uk: "Ізюм", ru: "Изюм", lat: 49.2128, lng: 37.2569, region: "kharkivska" },
  { id: "kherson", uk: "Херсон", ru: "Херсон", lat: 46.6354, lng: 32.6169, region: "khersonska" },
  { id: "khmelnytskyi", uk: "Хмельницький", ru: "Хмельницкий", lat: 49.4229, lng: 26.9871, region: "khmelnytska" },
  { id: "kamianets-podilskyi", uk: "Кам'янець-Подільський", ru: "Каменец-Подольский", lat: 48.6845, lng: 26.5856, region: "khmelnytska" },
  { id: "shepetivka", uk: "Шепетівка", ru: "Шепетовка", lat: 50.1822, lng: 27.0632, region: "khmelnytska" },
  { id: "netishyn", uk: "Нетішин", ru: "Нетешин", lat: 50.34, lng: 26.6418, region: "khmelnytska" },
  { id: "starokostiantyniv", uk: "Старокостянтинів", ru: "Староконстантинов", lat: 49.7568, lng: 27.2034, region: "khmelnytska" },
  { id: "cherkasy", uk: "Черкаси", ru: "Черкассы", lat: 49.4444, lng: 32.0598, region: "cherkaska" },
  { id: "uman", uk: "Умань", ru: "Умань", lat: 48.7484, lng: 30.2218, region: "cherkaska" },
  { id: "smila", uk: "Сміла", ru: "Смела", lat: 49.2223, lng: 31.8874, region: "cherkaska" },
  { id: "zolotonosha", uk: "Золотоноша", ru: "Золотоноша", lat: 49.6684, lng: 32.0408, region: "cherkaska" },
  { id: "chernivtsi", uk: "Чернівці", ru: "Черновцы", lat: 48.2921, lng: 25.9358, region: "chernivetska" },
  { id: "khotyn", uk: "Хотин", ru: "Хотин", lat: 48.5069, lng: 26.486, region: "chernivetska" },
  { id: "chernihiv", uk: "Чернігів", ru: "Чернигов", lat: 51.4982, lng: 31.2893, region: "chernihivska" },
  { id: "nizhyn", uk: "Ніжин", ru: "Нежин", lat: 51.048, lng: 31.8869, region: "chernihivska" },
  { id: "pryluky", uk: "Прилуки", ru: "Прилуки", lat: 50.5934, lng: 32.3876, region: "chernihivska" },
]

export function cityById(id: string | null | undefined) {
  return CITIES.find((c) => c.id === id) ?? null
}

export function regionById(id: string | null | undefined) {
  return REGIONS.find((r) => r.id === id) ?? null
}

/** A business's region: the one it picked, or its town's. */
export function regionOf(place: { region?: string; city?: string }) {
  return place.region || cityById(place.city)?.region || ""
}

/** The town nearest to a point, if one is within `maxKm`. */
export function nearestCity(p: { lat: number; lng: number }, maxKm = 25) {
  let best: City | null = null
  let bestKm = maxKm
  for (const c of CITIES) { const d = distanceKm(p, c); if (d <= bestKm) { best = c; bestKm = d } }
  return best
}

/** Ukraine as a whole, for a map with no city picked. */
export const UKRAINE = { lat: 48.6, lng: 31.2, zoom: 5 }

/** Straight-line distance in kilometres between two points. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = (d: number) => (d * Math.PI) / 180
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}
