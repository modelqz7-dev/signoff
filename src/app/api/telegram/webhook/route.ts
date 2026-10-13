import { adminClient, secretMatches, sendTelegram, webhookSecret } from "@/lib/server/notify"

/**
 * Telegram bot updates. Connecting works through a deep link from the Notifications panel:
 * t.me/<bot>?start=<link code> → the bot receives "/start <code>" and stores this chat's id
 * on the shop with that code. "/stop" disconnects.
 */
type Update = { message?: { chat: { id: number }; text?: string; from?: { language_code?: string } } }

export async function POST(request: Request) {
  if (!secretMatches(request.headers.get("x-telegram-bot-api-secret-token"), webhookSecret())) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }
  const update = (await request.json()) as Update
  const message = update.message
  if (!message?.text) return Response.json({ ok: true })

  const chatId = String(message.chat.id)
  // Russian for a Russian Telegram, Ukrainian for everyone else
  const ru = message.from?.language_code?.startsWith("ru")
  const db = adminClient()
  const [command, code] = message.text.trim().split(/\s+/)

  if (command === "/start" && code) {
    const { data: shop } = await db
      .from("shops")
      .update({ telegram_chat_id: chatId, telegram_link_code: null, notify_telegram: true })
      .eq("telegram_link_code", code)
      .select("name")
      .maybeSingle()
    await sendTelegram(
      chatId,
      shop
        ? ru
          ? `✅ Готово! Уведомления для «${shop.name}» будут приходить сюда.`
          : `✅ Готово! Сповіщення для «${shop.name}» надходитимуть сюди.`
        : ru
          ? "Ссылка устарела. Откройте Nodly → Уведомления и нажмите «Подключить Telegram» ещё раз."
          : "Посилання застаріло. Відкрийте Nodly → Сповіщення та натисніть «Підключити Telegram» ще раз."
    )
  } else if (command === "/stop") {
    await db.from("shops").update({ telegram_chat_id: null }).eq("telegram_chat_id", chatId)
    await sendTelegram(chatId, ru ? "Уведомления отключены." : "Сповіщення вимкнено.")
  } else {
    await sendTelegram(
      chatId,
      ru
        ? "Чтобы получать уведомления, подключите бота в Nodly → Уведомления."
        : "Щоб отримувати сповіщення, підключіть бота в Nodly → Сповіщення."
    )
  }
  return Response.json({ ok: true })
}
