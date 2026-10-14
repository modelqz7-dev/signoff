import { adminClient, secretMatches, webhookSecret } from "@/lib/server/notify"
import { overLimit } from "@/lib/server/portal"
import { OwnerBot, tg } from "@/lib/server/telegram-bot"
import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Telegram bot updates. The owner opens the bot and sends the 6-digit code shown in
 * Nodly → Notifications; from then on the chat gets new bookings and a menu: today,
 * the coming week, the clients (search by typing), a client's card, a booking's card
 * with its next steps, and a link to the CRM. "/stop" disconnects.
 */
type Chat = { id: number }
type From = { id?: number; language_code?: string; username?: string; first_name?: string; last_name?: string }
type Update = {
  message?: { chat: Chat; text?: string; from?: From }
  callback_query?: { id: string; data?: string; from?: From; message?: { chat: Chat; message_id: number } }
}

export async function POST(request: Request) {
  if (!secretMatches(request.headers.get("x-telegram-bot-api-secret-token"), webhookSecret())) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }
  const update = (await request.json()) as Update
  const db = adminClient()

  // a button under a message
  const cb = update.callback_query
  if (cb?.message && cb.data) {
    const chatId = String(cb.message.chat.id)
    const bot = new OwnerBot(db, chatId, cb.from?.language_code?.startsWith("ru") ? "ru" : "uk")
    await tg("answerCallbackQuery", { callback_query_id: cb.id })
    const shop = await bot.shop()
    if (!shop) { await bot.askCode(); return Response.json({ ok: true }) }
    const [kind, id, extra] = cb.data.split(":")
    const msg = cb.message.message_id
    if (kind === "b") await bot.booking(shop, id)
    else if (kind === "c") await bot.client(shop, id)
    else if (kind === "h") await bot.history(shop, id)
    else if (kind === "cl") await bot.clients(shop, Math.max(0, Number(id) || 0), msg)
    else if (kind === "s" && extra) await bot.setStatus(shop, id, extra, msg)
    return Response.json({ ok: true })
  }

  const message = update.message
  if (!message?.text) return Response.json({ ok: true })
  const chatId = String(message.chat.id)
  // Russian for a Russian Telegram, Ukrainian for everyone else
  const bot = new OwnerBot(db, chatId, message.from?.language_code?.startsWith("ru") ? "ru" : "uk")
  const text = message.text.trim()
  const [command, arg] = text.split(/\s+/)

  if (command === "/stop") { await bot.stop(); return Response.json({ ok: true }) }

  // a client signing in on the site: t.me/<bot>?start=login_<token>
  if (command === "/start" && arg?.startsWith("login_") && message.from?.id) {
    await clientLogin(db, bot, chatId, message.from, arg.slice(6))
    return Response.json({ ok: true })
  }

  // a code: the 6 digits from Nodly (or an older link's code after /start)
  const code = /^\d[\d\s-]{4,}\d$/.test(text) ? text.replace(/\D/g, "") : command === "/start" && arg ? arg : null
  if (code) {
    // a few tries per chat, so codes can't be guessed
    if (await overLimit(db, `tg-code:${chatId}`, 6, 10 * 60_000)) {
      await bot.send(message.from?.language_code?.startsWith("ru") ? "Слишком много попыток. Попробуйте через несколько минут." : "Забагато спроб. Спробуйте за кілька хвилин.")
      return Response.json({ ok: true })
    }
    await bot.connect(code)
    return Response.json({ ok: true })
  }

  const shop = await bot.shop()
  if (!shop) { await bot.askCode(); return Response.json({ ok: true }) }

  // the menu under the input: matched by its emoji, so either language works
  if (text.startsWith("📅")) await bot.today(shop)
  else if (text.startsWith("🗓")) await bot.upcoming(shop)
  else if (text.startsWith("👥")) await bot.clients(shop)
  else if (text.startsWith("🌐")) await bot.openCrm()
  else if (text.startsWith("/")) await bot.menu()
  else await bot.search(shop, text)
  return Response.json({ ok: true })
}

/** The bot confirms a client's sign-in: their Telegram becomes (or finds) their Nodly account. */
async function clientLogin(db: SupabaseClient, bot: OwnerBot, chatId: string, from: From, token: string) {
  const ru = from.language_code?.startsWith("ru")
  const name = [from.first_name, from.last_name].filter(Boolean).join(" ").slice(0, 120)
  const { data: account, error } = await db.from("client_accounts")
    .upsert({ tg_id: from.id, name, username: from.username ?? "", chat_id: chatId }, { onConflict: "tg_id" })
    .select("id").single()
  if (error || !account) {
    console.error("Client account error:", error)
    await bot.send(ru ? "Не получилось войти. Попробуйте ещё раз на сайте." : "Не вдалося увійти. Спробуйте ще раз на сайті.")
    return
  }
  const since = new Date(Date.now() - 10 * 60_000).toISOString()
  const { data: login } = await db.from("client_logins").update({ account_id: account.id })
    .eq("token", token).is("account_id", null).gte("created_at", since).select("token").maybeSingle()
  await bot.send(login
    ? (ru ? "✅ Вы вошли в Nodly. Вернитесь на сайт — всё уже готово.\n\nСюда будут приходить подтверждения ваших записей." : "✅ Ви увійшли в Nodly. Поверніться на сайт — усе вже готово.\n\nСюди надходитимуть підтвердження ваших записів.")
    : (ru ? "Ссылка для входа устарела. Нажмите «Войти через Telegram» на сайте ещё раз." : "Посилання для входу застаріло. Натисніть «Увійти через Telegram» на сайті ще раз."))
}
