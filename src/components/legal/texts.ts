// The legal pages' text, in English, Ukrainian and Russian (the site shows Ukrainian or Russian). {seller}, {email} and {site} are filled in
// from src/lib/legal.ts. The English text is the binding one; the Russian is a translation.

export type LegalDocId = "terms" | "privacy" | "refund"

type Section = { heading: string; body: (string | string[])[] }
type Doc = { title: string; intro?: string; sections: Section[] }

export const LEGAL_DOCS: Record<LegalDocId, Record<"en" | "uk" | "ru", Doc>> = {
  terms: {
    en: {
      title: "Terms of service",
      intro:
        "These terms govern your use of Nodly ({site}), a web service that lets freelancers, designers, agencies and other professionals share designs with their clients, collect pinned comments and get approvals. Nodly is provided by {seller}. By creating an account or using Nodly you agree to these terms.",
      sections: [
        {
          heading: "1. Your account",
          body: [
            "You need an account to use Nodly as a freelancer or a team. Give accurate information, keep your password safe and tell us at {email} if you think someone else has access to your account. You are responsible for what happens in your account.",
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
    uk: {
      "title": "Умови використання",
      "intro": "Ці умови регулюють використання Nodly ({site}), вебсервісу, у якому фрилансери, дизайнери, агенції та інші фахівці показують клієнтам макети, збирають коментарі на пінах і отримують затвердження. Nodly надає {seller}. Створюючи акаунт або користуючись Nodly, ви погоджуєтеся з цими умовами. Юридичну силу має англійська версія; це переклад.",
      "sections": [
        {
          "heading": "1. Ваш акаунт",
          "body": [
            "Щоб користуватися Nodly як виконавець або команда, потрібен акаунт. Вказуйте правильні дані, зберігайте пароль у таємниці й напишіть нам на {email}, якщо вважаєте, що хтось отримав доступ до вашого акаунта. Ви відповідаєте за дії у своєму акаунті.",
            "Вашим клієнтам акаунт не потрібен: вони відкривають посилання на замовлення, яке ви їм надіслали, і за потреби вводять заданий вами пароль."
          ]
        },
        {
          "heading": "2. Тарифи, пробний період і оплата",
          "body": [
            "У Nodly є безкоштовний тариф з обмеженнями й платні тарифи («Про» і «Студія») з оплатою помісячно або за рік. Ціни вказано на сайті й в акаунті до оплати.",
            "Нові акаунти отримують безкоштовний пробний період тарифу «Студія». Картка для нього не потрібна. Коли він закінчується, акаунт переходить на безкоштовний тариф, якщо ви не обрали платний.",
            "Оформлення замовлень виконує наш онлайн-реселер Paddle.com. Paddle.com є продавцем (Merchant of Record) за всіма нашими замовленнями: приймає оплату, виставляє рахунки, стягує застосовні податки, відповідає на запитання щодо оплати й оформлює повернення.",
            "Платні тарифи подовжуються автоматично наприкінці кожного оплаченого періоду, доки ви їх не скасуєте. Скасувати можна будь-коли в акаунті; тариф діє до кінця оплаченого періоду.",
            "Ми можемо змінювати ціни на майбутні періоди й повідомимо про це поштою щонайменше за 30 днів до того, як зміна вас стосуватиметься."
          ]
        },
        {
          "heading": "3. Повернення коштів",
          "body": [
            "Порядок повернення описано в Політиці повернення коштів, яка є частиною цих умов."
          ]
        },
        {
          "heading": "4. Ваші матеріали",
          "body": [
            "Файли, коментарі та інші матеріали, які завантажуєте ви або ваші клієнти, залишаються вашими. Ви надаєте нам лише те право, яке потрібне, щоб зберігати, обробляти й показувати ці матеріали вам і тим, з ким ви ними ділитеся, для роботи Nodly.",
            "Ви підтверджуєте, що маєте право завантажувати ці матеріали й показувати їх своїм клієнтам."
          ]
        },
        {
          "heading": "5. Допустиме використання",
          "body": [
            "Не використовуйте Nodly, щоб порушувати закон, завантажувати шкідливі програми або матеріали, якими ви не маєте права ділитися, розсилати спам, отримувати доступ до чужих акаунтів і даних, перевантажувати або атакувати сервіс.",
            "Ми можемо призупинити акаунт, який порушує ці правила. Коли можливо, ми спершу попередимо."
          ]
        },
        {
          "heading": "6. Доступність і зміни",
          "body": [
            "Ми намагаємося, щоб Nodly працював без перебоїв, а дані були в безпеці, і регулярно робимо резервні копії, але сервіс надається «як є» й інколи може бути недоступним. Ми можемо покращувати й змінювати функції."
          ]
        },
        {
          "heading": "7. Відповідальність",
          "body": [
            "У межах, дозволених законом, ми не відповідаємо за непрямі збитки, наприклад упущений прибуток. Наша загальна відповідальність за будь-якою претензією обмежена сумою, яку ви сплатили за Nodly за 12 місяців до претензії. Ніщо в цих умовах не обмежує ваших прав споживача, які не можна обмежити за законом."
          ]
        },
        {
          "heading": "8. Закриття акаунта",
          "body": [
            "Ви можете будь-коли припинити користуватися Nodly й попросити видалити акаунт, написавши на {email}. Ми можемо закрити акаунт, який порушує ці умови. Після закриття акаунта ми видаляємо його дані протягом 30 днів, крім записів, які зобовʼязані зберігати за законом."
          ]
        },
        {
          "heading": "9. Зміна умов",
          "body": [
            "Ми можемо оновлювати ці умови. Про важливі зміни повідомимо поштою або в акаунті до того, як вони наберуть чинності. Продовжуючи користуватися Nodly після цього, ви приймаєте нові умови."
          ]
        },
        {
          "heading": "10. Право й контакти",
          "body": [
            "До цих умов застосовується право України, без обмеження обовʼязкового захисту споживачів, що діє там, де ви живете.",
            "Запитання щодо умов: {email}."
          ]
        }
      ]
    },
    ru: {
      title: "Условия использования",
      intro:
        "Эти условия регулируют использование Nodly ({site}), веб-сервиса, в котором фрилансеры, дизайнеры, агентства и другие специалисты показывают клиентам макеты, собирают комментарии на пинах и получают утверждение. Nodly предоставляет {seller}. Создавая аккаунт или пользуясь Nodly, вы соглашаетесь с этими условиями. Юридическую силу имеет английская версия; это перевод.",
      sections: [
        {
          heading: "1. Ваш аккаунт",
          body: [
            "Чтобы пользоваться Nodly как исполнитель или команда, нужен аккаунт. Указывайте верные данные, храните пароль в тайне и напишите нам на {email}, если думаете, что кто-то получил доступ к вашему аккаунту. Вы отвечаете за действия в своём аккаунте.",
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
              "Account data: your email address, password (stored only as a secure hash), brand name, logo and contact details you choose to add.",
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
    uk: {
      "title": "Політика конфіденційності",
      "intro": "Тут описано, які персональні дані збирає Nodly ({site}), навіщо і які у вас є права. Оператор ваших даних: {seller}. Для даних ваших клієнтів, які ви завантажуєте в Nodly, оператором є ви, а ми обробляємо їх за вашим дорученням. Юридичну силу має англійська версія; це переклад.",
      "sections": [
        {
          "heading": "1. Що ми збираємо",
          "body": [
            [
              "Дані акаунта: адреса пошти, пароль (зберігається лише у вигляді захищеного хешу), назва бренду, логотип і контакти, які ви вирішили додати.",
              "Дані замовлень: макети й файли, які ви завантажуєте, деталі замовлень, імена клієнтів та їхня пошта або телефон, якщо ви їх вказали, коментарі, повідомлення й записи про затвердження.",
              "Дані ваших клієнтів: імʼя, яке вони вводять, відкриваючи посилання на замовлення, їхні коментарі та рішення.",
              "Дані про оплату: тариф і статус підписки. Дані картки обробляє Paddle, до нас вони не потрапляють.",
              "Технічні дані: базові журнали (IP-адреса, браузер, час запиту), потрібні для роботи й захисту сервісу, і знеособлена статистика без рекламних трекерів."
            ]
          ]
        },
        {
          "heading": "2. Навіщо ми їх використовуємо",
          "body": [
            [
              "Щоб Nodly працював: показувати макети, збирати коментарі й затвердження, надсилати сповіщення, які ви увімкнули.",
              "Щоб вести ваш акаунт, тариф і оплати.",
              "Щоб захищати сервіс, запобігати зловживанням і виправляти помилки.",
              "Щоб повідомляти про важливі зміни сервісу й цих документів."
            ],
            "Підстави: договір із вами, наш законний інтерес у безпечній роботі сервісу й вимоги закону. Ми не продаємо персональні дані й не використовуємо їх для реклами."
          ]
        },
        {
          "heading": "3. Хто обробляє дані за нашим дорученням",
          "body": [
            "Ми користуємося надійними постачальниками, які обробляють дані лише за нашими вказівками:",
            [
              "Supabase: база даних, зберігання файлів і вхід в акаунт.",
              "Vercel: хостинг сайту.",
              "Resend: надсилання листів.",
              "Telegram: сповіщення, лише якщо ви його підключили.",
              "Paddle: оплата, рахунки й податки як продавець (Merchant of Record)."
            ],
            "Деякі з них можуть зберігати дані за межами вашої країни, зокрема в ЄС і США, з належними гарантіями, наприклад стандартними договірними умовами."
          ]
        },
        {
          "heading": "4. Скільки ми зберігаємо дані",
          "body": [
            "Ми зберігаємо дані, доки акаунт активний. Коли ви видаляєте акаунт або просите про це, ми видаляємо дані протягом 30 днів, крім записів про оплату, які зобовʼязані зберігати за законом. Резервні копії перезаписуються ще протягом 30 днів."
          ]
        },
        {
          "heading": "5. Cookies",
          "body": [
            "Ми використовуємо лише cookies і сховище браузера, без яких Nodly не працює: щоб ви залишалися в акаунті, щоб запамʼятати мову й тему, щоб клієнт залишався в посиланні на замовлення. Рекламних cookies немає."
          ]
        },
        {
          "heading": "6. Ваші права",
          "body": [
            "Ви можете запросити доступ до своїх даних, їх виправлення, вивантаження або видалення, а також заперечити проти обробки чи обмежити її. Пишіть на {email}. Якщо до нас звернуться ваші клієнти щодо своїх даних, ми передамо запит вам. Ви також можете поскаржитися до органу із захисту даних у своїй країні."
          ]
        },
        {
          "heading": "7. Безпека",
          "body": [
            "Дані передаються зашифрованими зʼєднаннями, файли зберігаються закрито й відкриваються за посиланнями з коротким терміном дії, посилання на замовлення можна захистити паролем, а доступ усередині бази обмежено суворими правилами."
          ]
        },
        {
          "heading": "8. Зміни й контакти",
          "body": [
            "Зміни ми публікуємо на цій сторінці, про важливі повідомимо окремо. Запитання: {email}."
          ]
        }
      ]
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
              "Данные аккаунта: адрес почты, пароль (хранится только в виде защищённого хеша), название бренда, логотип и контакты, которые вы решили добавить.",
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
    uk: {
      "title": "Політика повернення коштів",
      "intro": "Ми хочемо, щоб ви платили за Nodly, лише якщо він допомагає вашій роботі. Платежі приймає Paddle, наш продавець (Merchant of Record). Він же оформлює повернення. Юридичну силу має англійська версія; це переклад.",
      "sections": [
        {
          "heading": "1. Спершу безкоштовно",
          "body": [
            "Кожен новий акаунт отримує безкоштовний пробний період тарифу «Студія» без картки, щоб ви спробували Nodly на справжніх замовленнях до оплати."
          ]
        },
        {
          "heading": "2. Гарантія повернення 14 днів",
          "body": [
            "Якщо платний тариф вам не підійшов, ви можете попросити повне повернення протягом 14 днів після оплати. Це стосується першої оплати й кожного подовження, помісячно й за рік. Без пояснення причин."
          ]
        },
        {
          "heading": "3. Після 14 днів",
          "body": [
            "Після 14 днів оплата не повертається, але ви можете скасувати підписку будь-коли, і списань більше не буде. Тариф діє до кінця оплаченого періоду, потім акаунт переходить на безкоштовний тариф. Замовлення й файли зберігаються."
          ]
        },
        {
          "heading": "4. Як попросити повернення",
          "body": [
            "Напишіть на {email} з пошти акаунта, або дайте відповідь на чек від Paddle, або знайдіть замовлення на paddle.net. Гроші повертаються тим самим способом, яким ви платили, зазвичай за 5-10 робочих днів залежно від банку."
          ]
        },
        {
          "heading": "5. Ваші права за законом",
          "body": [
            "Ця політика не обмежує прав, які дають вам закони про захист споживачів у вашій країні."
          ]
        }
      ]
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
