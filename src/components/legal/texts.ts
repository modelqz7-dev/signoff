// The legal pages' text, in English and Russian. {seller}, {email} and {site} are filled in
// from src/lib/legal.ts. The English text is the binding one; the Russian is a translation.

export type LegalDocId = "terms" | "privacy" | "refund"

type Section = { heading: string; body: (string | string[])[] }
type Doc = { title: string; intro?: string; sections: Section[] }

export const LEGAL_DOCS: Record<LegalDocId, Record<"en" | "ru", Doc>> = {
  terms: {
    en: {
      title: "Terms of service",
      intro:
        "These terms govern your use of Nodly ({site}), a web service that lets interior designers, design studios and other professionals share designs with their clients, collect pinned comments and get approvals. Nodly is provided by {seller}. By creating an account or using Nodly you agree to these terms.",
      sections: [
        {
          heading: "1. Your account",
          body: [
            "You need an account to use Nodly as a designer. Give accurate information, keep your password safe and tell us at {email} if you think someone else has access to your account. You are responsible for what happens in your account.",
            "Your clients do not need an account: they open the order link you send them and may be asked for the password you set.",
          ],
        },
        {
          heading: "2. Plans, trial and payment",
          body: [
            "Nodly has a free plan with limits and paid plans (Pro and Studio) billed monthly or yearly. Prices are shown on the website and in your account before you pay.",
            "New accounts get a free trial of the Studio plan. No payment card is needed for the trial. When it ends, the account moves to the free plan unless you choose a paid plan.",
            "Our order process is conducted by our online reseller Paddle.com. Paddle.com is the Merchant of Record for all our orders. Paddle provides all customer service inquiries and handles returns. Paddle charges your payment method, issues invoices and collects applicable taxes.",
            "Paid plans renew automatically at the end of each billing period until you cancel. You can cancel at any time from your account; the plan stays active until the end of the period you have paid for.",
            "We may change prices for future billing periods. We will tell you by email at least 30 days before a change affects you.",
          ],
        },
        {
          heading: "3. Refunds",
          body: ["Refunds are described in our Refund policy, which is part of these terms."],
        },
        {
          heading: "4. Your content",
          body: [
            "Files, comments and other material you or your clients upload stay yours. You give us only the permission needed to store, process and show that content to you and to the people you share it with, in order to run Nodly.",
            "You confirm that you have the right to upload the content and to share it with your clients.",
          ],
        },
        {
          heading: "5. Acceptable use",
          body: [
            "Do not use Nodly to break the law, to upload malware or content you have no right to share, to send spam, or to try to access other people's accounts or data, and do not overload or attack the service.",
            "We may suspend an account that breaks these rules. Where we can, we will warn you first.",
          ],
        },
        {
          heading: "6. Availability and changes",
          body: [
            "We work to keep Nodly available and your data safe, and we back it up regularly, but the service is provided \"as is\" and may sometimes be unavailable. We may improve or change features over time.",
          ],
        },
        {
          heading: "7. Liability",
          body: [
            "To the extent the law allows, we are not liable for indirect or consequential losses, such as lost profit or lost business. Our total liability for any claim is limited to the amount you paid for Nodly in the 12 months before the claim. Nothing in these terms limits rights you have as a consumer that cannot be limited by law.",
          ],
        },
        {
          heading: "8. Ending your account",
          body: [
            "You can stop using Nodly and ask us to delete your account at any time by writing to {email}. We may close accounts that break these terms. After an account is closed we delete its data within 30 days, except where we must keep records by law.",
          ],
        },
        {
          heading: "9. Changes to these terms",
          body: [
            "We may update these terms. If a change is important, we will tell you by email or in your account before it takes effect. Continuing to use Nodly after that means you accept the new terms.",
          ],
        },
        {
          heading: "10. Law and contact",
          body: [
            "These terms are governed by the laws of Ukraine, without limiting any mandatory consumer protection that applies where you live.",
            "Questions about these terms: {email}.",
          ],
        },
      ],
    },
    ru: {
      title: "Условия использования",
      intro:
        "Эти условия регулируют использование Nodly ({site}), веб-сервиса, в котором дизайнеры интерьера, дизайн-студии и другие специалисты показывают клиентам макеты, собирают комментарии на пинах и получают утверждение. Nodly предоставляет {seller}. Создавая аккаунт или пользуясь Nodly, вы соглашаетесь с этими условиями. Юридическую силу имеет английская версия; это перевод.",
      sections: [
        {
          heading: "1. Ваш аккаунт",
          body: [
            "Чтобы пользоваться Nodly как дизайнер, нужен аккаунт. Указывайте верные данные, храните пароль в тайне и напишите нам на {email}, если думаете, что кто-то получил доступ к вашему аккаунту. Вы отвечаете за действия в своём аккаунте.",
            "Вашим клиентам аккаунт не нужен: они открывают ссылку на заказ, которую вы им отправили, и при необходимости вводят заданный вами пароль.",
          ],
        },
        {
          heading: "2. Тарифы, пробный период и оплата",
          body: [
            "В Nodly есть бесплатный тариф с ограничениями и платные тарифы («Про» и «Студия») с оплатой помесячно или за год. Цены указаны на сайте и в аккаунте до оплаты.",
            "Новые аккаунты получают бесплатный пробный период тарифа «Студия». Карта для него не нужна. Когда он заканчивается, аккаунт переходит на бесплатный тариф, если вы не выбрали платный.",
            "Оформление заказов выполняет наш онлайн-реселлер Paddle.com. Paddle.com является продавцом (Merchant of Record) по всем нашим заказам: принимает оплату, выставляет счета, взимает применимые налоги, отвечает на вопросы по оплате и оформляет возвраты.",
            "Платные тарифы продлеваются автоматически в конце каждого оплаченного периода, пока вы их не отмените. Отменить можно в любой момент в аккаунте; тариф действует до конца оплаченного периода.",
            "Мы можем менять цены на будущие периоды и сообщим об этом по почте минимум за 30 дней до того, как изменение вас коснётся.",
          ],
        },
        {
          heading: "3. Возвраты",
          body: ["Порядок возврата описан в Политике возврата, которая является частью этих условий."],
        },
        {
          heading: "4. Ваши материалы",
          body: [
            "Файлы, комментарии и другие материалы, которые загружаете вы или ваши клиенты, остаются вашими. Вы даёте нам только то право, которое нужно, чтобы хранить, обрабатывать и показывать эти материалы вам и тем, с кем вы ими делитесь, для работы Nodly.",
            "Вы подтверждаете, что имеете право загружать эти материалы и показывать их своим клиентам.",
          ],
        },
        {
          heading: "5. Допустимое использование",
          body: [
            "Не используйте Nodly, чтобы нарушать закон, загружать вредоносные программы или материалы, которыми вы не вправе делиться, рассылать спам, получать доступ к чужим аккаунтам и данным, перегружать или атаковать сервис.",
            "Мы можем приостановить аккаунт, который нарушает эти правила. Когда возможно, мы сначала предупредим.",
          ],
        },
        {
          heading: "6. Доступность и изменения",
          body: [
            "Мы стараемся, чтобы Nodly работал без перебоев, а данные были в сохранности, и регулярно делаем резервные копии, но сервис предоставляется «как есть» и иногда может быть недоступен. Мы можем улучшать и менять функции.",
          ],
        },
        {
          heading: "7. Ответственность",
          body: [
            "В пределах, допустимых законом, мы не отвечаем за косвенные убытки, например упущенную прибыль. Наша общая ответственность по любой претензии ограничена суммой, которую вы заплатили за Nodly за 12 месяцев до претензии. Ничто в этих условиях не ограничивает ваши права потребителя, которые нельзя ограничить по закону.",
          ],
        },
        {
          heading: "8. Закрытие аккаунта",
          body: [
            "Вы можете в любой момент перестать пользоваться Nodly и попросить удалить аккаунт, написав на {email}. Мы можем закрыть аккаунт, который нарушает эти условия. После закрытия аккаунта мы удаляем его данные в течение 30 дней, кроме записей, которые обязаны хранить по закону.",
          ],
        },
        {
          heading: "9. Изменение условий",
          body: [
            "Мы можем обновлять эти условия. О важных изменениях сообщим по почте или в аккаунте до того, как они вступят в силу. Продолжая пользоваться Nodly после этого, вы принимаете новые условия.",
          ],
        },
        {
          heading: "10. Право и контакты",
          body: [
            "К этим условиям применяется право Украины, без ограничения обязательной защиты потребителей, действующей там, где вы живёте.",
            "Вопросы об условиях: {email}.",
          ],
        },
      ],
    },
  },

  privacy: {
    en: {
      title: "Privacy policy",
      intro:
        "This policy explains what personal data Nodly ({site}) collects, why, and what rights you have. The controller of your data is {seller}. For your clients' data that you upload to Nodly, you are the controller and we process it on your behalf.",
      sections: [
        {
          heading: "1. What we collect",
          body: [
            [
              "Account data: your email address, password (stored only as a secure hash), studio name, logo and contact details you choose to add.",
              "Order data: designs and files you upload, order details, your clients' names, emails or phone numbers if you enter them, comments, messages and approval records.",
              "Data from your clients: the name they enter when opening an order link, their comments and approvals.",
              "Billing data: your plan and subscription status. Payment card details are handled by Paddle and never reach us.",
              "Technical data: basic logs (IP address, browser, time of request) needed to run and protect the service, and privacy-friendly usage statistics without advertising trackers.",
            ],
          ],
        },
        {
          heading: "2. Why we use it",
          body: [
            [
              "To provide Nodly: show designs, collect comments and approvals, send the notifications you turn on.",
              "To manage your account, plan and payments.",
              "To keep the service secure, prevent abuse and fix problems.",
              "To tell you about important changes to the service or these documents.",
            ],
            "We rely on our contract with you, our legitimate interest in running a safe service, and legal obligations. We do not sell personal data and do not use it for advertising.",
          ],
        },
        {
          heading: "3. Who processes it for us",
          body: [
            "We use trusted providers that process data only on our instructions:",
            [
              "Supabase: database, file storage and sign-in.",
              "Vercel: hosting of the website.",
              "Resend: sending emails.",
              "Telegram: notifications, only if you connect it.",
              "Paddle: payments, invoices and taxes, as the Merchant of Record.",
            ],
            "Some of them may store data outside your country, including in the EU and the USA, under appropriate safeguards such as standard contractual clauses.",
          ],
        },
        {
          heading: "4. How long we keep it",
          body: [
            "We keep your data while your account is active. When you delete your account or ask us to, we delete it within 30 days, except billing records we must keep by law. Backups are overwritten within a further 30 days.",
          ],
        },
        {
          heading: "5. Cookies",
          body: [
            "We use only cookies and browser storage needed for Nodly to work, such as keeping you signed in, remembering your language and theme, and keeping a client signed in to an order link. We do not use advertising cookies.",
          ],
        },
        {
          heading: "6. Your rights",
          body: [
            "You can ask to access, correct, export or delete your personal data, and to object to or restrict its processing. Write to {email}. If your clients ask us about their data, we will pass the request to you. You can also complain to your local data protection authority.",
          ],
        },
        {
          heading: "7. Security",
          body: [
            "Data is sent over encrypted connections, files are stored privately and shown through short-lived links, order links can be protected with a password, and access inside the database is limited by strict rules.",
          ],
        },
        {
          heading: "8. Changes and contact",
          body: ["We will post changes on this page and tell you about important ones. Questions: {email}."],
        },
      ],
    },
    ru: {
      title: "Политика конфиденциальности",
      intro:
        "Здесь описано, какие персональные данные собирает Nodly ({site}), зачем и какие у вас есть права. Оператор ваших данных: {seller}. Для данных ваших клиентов, которые вы загружаете в Nodly, оператором являетесь вы, а мы обрабатываем их по вашему поручению. Юридическую силу имеет английская версия; это перевод.",
      sections: [
        {
          heading: "1. Что мы собираем",
          body: [
            [
              "Данные аккаунта: адрес почты, пароль (хранится только в виде защищённого хеша), название студии, логотип и контакты, которые вы решили добавить.",
              "Данные заказов: макеты и файлы, которые вы загружаете, детали заказов, имена клиентов и их почта или телефон, если вы их указали, комментарии, сообщения и записи об утверждении.",
              "Данные ваших клиентов: имя, которое они вводят, открывая ссылку на заказ, их комментарии и решения.",
              "Данные об оплате: тариф и статус подписки. Данные карты обрабатывает Paddle, к нам они не попадают.",
              "Технические данные: базовые журналы (IP-адрес, браузер, время запроса), нужные для работы и защиты сервиса, и обезличенная статистика без рекламных трекеров.",
            ],
          ],
        },
        {
          heading: "2. Зачем мы их используем",
          body: [
            [
              "Чтобы Nodly работал: показывать макеты, собирать комментарии и утверждения, отправлять уведомления, которые вы включили.",
              "Чтобы вести ваш аккаунт, тариф и оплаты.",
              "Чтобы защищать сервис, предотвращать злоупотребления и исправлять ошибки.",
              "Чтобы сообщать о важных изменениях сервиса и этих документов.",
            ],
            "Основания: договор с вами, наш законный интерес в безопасной работе сервиса и требования закона. Мы не продаём персональные данные и не используем их для рекламы.",
          ],
        },
        {
          heading: "3. Кто обрабатывает данные по нашему поручению",
          body: [
            "Мы пользуемся надёжными поставщиками, которые обрабатывают данные только по нашим указаниям:",
            [
              "Supabase: база данных, хранение файлов и вход в аккаунт.",
              "Vercel: хостинг сайта.",
              "Resend: отправка писем.",
              "Telegram: уведомления, только если вы его подключили.",
              "Paddle: оплата, счета и налоги как продавец (Merchant of Record).",
            ],
            "Некоторые из них могут хранить данные за пределами вашей страны, в том числе в ЕС и США, с надлежащими гарантиями, например стандартными договорными условиями.",
          ],
        },
        {
          heading: "4. Сколько мы храним данные",
          body: [
            "Мы храним данные, пока аккаунт активен. Когда вы удаляете аккаунт или просите об этом, мы удаляем данные в течение 30 дней, кроме записей об оплате, которые обязаны хранить по закону. Резервные копии перезаписываются ещё в течение 30 дней.",
          ],
        },
        {
          heading: "5. Cookies",
          body: [
            "Мы используем только cookies и хранилище браузера, без которых Nodly не работает: чтобы вы оставались в аккаунте, чтобы запомнить язык и тему, чтобы клиент оставался в ссылке на заказ. Рекламных cookies нет.",
          ],
        },
        {
          heading: "6. Ваши права",
          body: [
            "Вы можете запросить доступ к своим данным, их исправление, выгрузку или удаление, а также возразить против обработки или ограничить её. Пишите на {email}. Если к нам обратятся ваши клиенты по поводу своих данных, мы передадим запрос вам. Вы также можете пожаловаться в орган по защите данных в своей стране.",
          ],
        },
        {
          heading: "7. Безопасность",
          body: [
            "Данные передаются по зашифрованным соединениям, файлы хранятся закрыто и открываются по ссылкам с коротким сроком действия, ссылки на заказы можно защитить паролем, а доступ внутри базы ограничен строгими правилами.",
          ],
        },
        {
          heading: "8. Изменения и контакты",
          body: ["Изменения мы публикуем на этой странице, о важных сообщим отдельно. Вопросы: {email}."],
        },
      ],
    },
  },

  refund: {
    en: {
      title: "Refund policy",
      intro:
        "We want you to pay for Nodly only if it helps your work. Payments are processed by Paddle, our Merchant of Record, which also handles refunds.",
      sections: [
        {
          heading: "1. Try it free first",
          body: ["Every new account gets a free trial of the Studio plan without a payment card, so you can try Nodly on real orders before paying."],
        },
        {
          heading: "2. 14-day money-back guarantee",
          body: [
            "If you are not happy with a paid plan, you can ask for a full refund within 14 days of the payment. This applies to the first payment and to each renewal, for monthly and yearly plans. No questions asked.",
          ],
        },
        {
          heading: "3. After 14 days",
          body: [
            "After 14 days payments are not refunded, but you can cancel at any time and you will not be charged again. Your plan stays active until the end of the period you paid for, then the account moves to the free plan. Your orders and files are kept.",
          ],
        },
        {
          heading: "4. How to ask for a refund",
          body: [
            "Write to {email} from your account email, or reply to the receipt you got from Paddle, or use paddle.net to find your order. Refunds go back to the original payment method, usually within 5-10 business days, depending on your bank.",
          ],
        },
        {
          heading: "5. Your legal rights",
          body: ["This policy does not limit any rights you have under consumer law where you live."],
        },
      ],
    },
    ru: {
      title: "Политика возврата",
      intro:
        "Мы хотим, чтобы вы платили за Nodly, только если он помогает вашей работе. Платежи принимает Paddle, наш продавец (Merchant of Record). Он же оформляет возвраты. Юридическую силу имеет английская версия; это перевод.",
      sections: [
        {
          heading: "1. Сначала бесплатно",
          body: ["Каждый новый аккаунт получает бесплатный пробный период тарифа «Студия» без карты, чтобы вы попробовали Nodly на настоящих заказах до оплаты."],
        },
        {
          heading: "2. Гарантия возврата 14 дней",
          body: [
            "Если платный тариф вам не подошёл, вы можете попросить полный возврат в течение 14 дней после оплаты. Это касается первой оплаты и каждого продления, помесячно и за год. Без объяснения причин.",
          ],
        },
        {
          heading: "3. После 14 дней",
          body: [
            "После 14 дней оплата не возвращается, но вы можете отменить подписку в любой момент, и списаний больше не будет. Тариф действует до конца оплаченного периода, затем аккаунт переходит на бесплатный тариф. Заказы и файлы сохраняются.",
          ],
        },
        {
          heading: "4. Как попросить возврат",
          body: [
            "Напишите на {email} с почты аккаунта, или ответьте на чек от Paddle, или найдите заказ на paddle.net. Деньги возвращаются тем же способом, которым вы платили, обычно за 5-10 рабочих дней в зависимости от банка.",
          ],
        },
        {
          heading: "5. Ваши права по закону",
          body: ["Эта политика не ограничивает права, которые дают вам законы о защите потребителей в вашей стране."],
        },
      ],
    },
  },
}
