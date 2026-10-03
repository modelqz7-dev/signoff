"""Builds the Nodly emails for Supabase Auth: one centred layout, eight messages, each in
Russian and English.

Each email carries both texts and Supabase picks one per person: Russian when the account's
`lang` (user_metadata, saved by the app at sign-up and whenever the language is switched) is
"ru", English otherwise. `printf "%v"` keeps the test safe for accounts without `lang`.

Run `python3 supabase/email-templates/build.py` after editing, then paste each .html and its
subject into Supabase (see README.md).
"""
from pathlib import Path

# The live site, written into the emails so the logo and links work whatever Supabase's
# Site URL setting says.
SITE = "https://nodly.princeeio.com"

FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif"


def L(ru: str, en: str) -> str:
    """Russian for accounts in Russian, English for everyone else."""
    return '{{ if eq (printf "%v" .Data.lang) "ru" }}' + ru + "{{ else }}" + en + "{{ end }}"


LAYOUT = """<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f3f1;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">{preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3f1;">
  <tr><td align="center" style="padding:48px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
      <tr><td align="center" style="padding-bottom:28px;">
        <img src="{site}/brand/nodly-key-light.png" width="64" height="64" alt="Nodly" style="display:block;margin:0 auto;border:0;">
        <div style="margin-top:10px;font-family:{font};font-size:22px;font-weight:700;letter-spacing:-0.03em;color:#171615;">Nodly</div>
      </td></tr>
      <tr><td align="center" style="background:#ffffff;border:1px solid #e7e5e2;border-radius:20px;padding:44px 32px 36px;font-family:{font};color:#171615;text-align:center;">
        <h1 style="margin:0 0 14px;font-size:26px;line-height:1.25;font-weight:700;letter-spacing:-0.02em;color:#171615;">{heading}</h1>
        <p style="margin:0 auto 28px;max-width:380px;font-size:16px;line-height:1.6;color:#4a4744;">{text}</p>
        {action}
        <p style="margin:32px 0 0;padding-top:22px;border-top:1px solid #efedea;font-size:13px;line-height:1.6;color:#8a8783;">{note}</p>
      </td></tr>
      <tr><td align="center" style="padding-top:24px;font-family:{font};font-size:12px;line-height:1.7;color:#8a8783;text-align:center;">
        {tagline}<br>
        <a href="{site}" style="color:#8a8783;text-decoration:underline;">{site_name}</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>
"""

TAGLINE = L("Согласование макетов с клиентами", "Client approvals for designs")


def dark_button(href: str, label: str) -> str:
    return (
        '<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;"><tr>'
        '<td align="center" style="border-radius:12px;background:#171615;">'
        '<a href="' + href + '" style="display:inline-block;padding:15px 32px;font-family:' + FONT + ';'
        'font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:12px;">' + label + '</a>'
        '</td></tr></table>'
    )


def button(ru: str, en: str) -> str:
    """The confirmation link as a button, plus the plain link in case the button won't open."""
    return dark_button("{{ .ConfirmationURL }}", L(ru, en)) + (
        '<p style="margin:22px auto 0;max-width:380px;font-size:13px;line-height:1.6;color:#8a8783;">'
        + L("Если кнопка не открывается, скопируйте ссылку в браузер:", "If the button doesn't open, copy this link into your browser:")
        + '<br><a href="{{ .ConfirmationURL }}" style="color:#4a4744;word-break:break-all;">{{ .ConfirmationURL }}</a></p>'
    )


def site_button(ru: str, en: str) -> str:
    """A button to the site itself, for notices that need no confirmation."""
    return dark_button(SITE + "/login", L(ru, en))


CODE = (
    '<div style="display:inline-block;padding:18px 28px;background:#f4f3f1;border:1px solid #e7e5e2;border-radius:14px;'
    'font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:34px;font-weight:700;'
    'letter-spacing:0.35em;color:#171615;">{{ .Token }}</div>'
)

# name: (subject, heading, text, action, note, preheader); each text as (ru, en).
EMAILS = {
    "confirm-signup": dict(
        subject=("Подтвердите почту в Nodly", "Confirm your email for Nodly"),
        heading=("Подтвердите почту", "Confirm your email"),
        text=("Спасибо за регистрацию в Nodly. Нажмите кнопку, чтобы подтвердить адрес {{ .Email }} и войти в кабинет.",
              "Thanks for signing up for Nodly. Press the button to confirm {{ .Email }} and open your workspace."),
        action=button("Подтвердить почту", "Confirm email"),
        note=("Если вы не регистрировались в Nodly, просто проигнорируйте это письмо.",
              "If you didn't sign up for Nodly, you can ignore this email."),
        preheader=("Один шаг до первого согласованного макета.", "One step to your first approved design.")),
    "reset-password": dict(
        subject=("Сброс пароля в Nodly", "Reset your Nodly password"),
        heading=("Сброс пароля", "Reset your password"),
        text=("Мы получили запрос на сброс пароля для {{ .Email }}. Нажмите кнопку и придумайте новый пароль.",
              "We got a request to reset the password for {{ .Email }}. Press the button to choose a new one."),
        action=button("Задать новый пароль", "Choose a new password"),
        note=("Если вы не запрашивали сброс, ничего делать не нужно: пароль останется прежним.",
              "If you didn't ask for this, you don't need to do anything: your password stays the same."),
        preheader=("Ссылка для нового пароля.", "A link to choose a new password.")),
    "magic-link": dict(
        subject=("Вход в Nodly", "Sign in to Nodly"),
        heading=("Вход в Nodly", "Sign in to Nodly"),
        text=("Нажмите кнопку, чтобы войти в кабинет Nodly как {{ .Email }}.",
              "Press the button to sign in to Nodly as {{ .Email }}."),
        action=button("Войти", "Sign in"),
        note=("Если вы не пытались войти, проигнорируйте это письмо.",
              "If you didn't try to sign in, you can ignore this email."),
        preheader=("Ссылка для входа.", "Your sign-in link.")),
    "change-email": dict(
        subject=("Подтвердите новую почту в Nodly", "Confirm your new email for Nodly"),
        heading=("Подтвердите новую почту", "Confirm your new email"),
        text=("Вы меняете почту аккаунта Nodly с {{ .Email }} на {{ .NewEmail }}. Нажмите кнопку, чтобы подтвердить.",
              "You're changing your Nodly email from {{ .Email }} to {{ .NewEmail }}. Press the button to confirm."),
        action=button("Подтвердить новую почту", "Confirm new email"),
        note=("Если вы не меняли почту, срочно смените пароль в разделе «Безопасность».",
              "If you didn't change it, change your password in Security right away."),
        preheader=("Подтвердите новый адрес.", "Confirm your new address.")),
    "reauthentication": dict(
        subject=("Код подтверждения Nodly", "Your Nodly confirmation code"),
        heading=("Код подтверждения", "Confirmation code"),
        text=("Введите этот код в Nodly, чтобы подтвердить смену пароля.",
              "Enter this code in Nodly to confirm your new password."),
        action=CODE,
        note=("Код действует несколько минут. Если это были не вы, никому не сообщайте код и смените пароль.",
              "The code works for a few minutes. If this wasn't you, don't share it and change your password."),
        preheader=("Код для смены пароля в Nodly.", "Your code to change the Nodly password.")),
    "password-changed": dict(
        subject=("Пароль в Nodly изменён", "Your Nodly password was changed"),
        heading=("Пароль изменён", "Password changed"),
        text=("Пароль аккаунта Nodly {{ .Email }} только что изменён. Если это сделали вы, ничего делать не нужно.",
              "The password for your Nodly account {{ .Email }} was just changed. If that was you, there's nothing to do."),
        action=site_button("Открыть Nodly", "Open Nodly"),
        note=("Если вы не меняли пароль, сразу восстановите доступ через «Забыли пароль?» на странице входа.",
              "If you didn't change it, reset it right away with \"Forgot password?\" on the sign-in page."),
        preheader=("Пароль вашего аккаунта Nodly изменён.", "Your Nodly password was changed.")),
    "email-changed": dict(
        subject=("Почта в Nodly изменена", "Your Nodly email was changed"),
        heading=("Почта изменена", "Email changed"),
        text=("Почта аккаунта Nodly изменена. Теперь для входа используется новый адрес. Если это сделали вы, ничего делать не нужно.",
              "The email of your Nodly account was changed and is now used to sign in. If that was you, there's nothing to do."),
        action=site_button("Открыть Nodly", "Open Nodly"),
        note=("Если вы не меняли почту, срочно напишите нам в поддержку.",
              "If you didn't change it, contact our support right away."),
        preheader=("Почта вашего аккаунта Nodly изменена.", "Your Nodly email was changed.")),
    "invite": dict(
        subject=("Вас пригласили в Nodly", "You're invited to Nodly"),
        heading=("Вас пригласили в Nodly", "You're invited to Nodly"),
        text=("Вас пригласили в кабинет мастерской в Nodly. Нажмите кнопку, чтобы принять приглашение и задать пароль.",
              "You've been invited to a workshop on Nodly. Press the button to accept and set your password."),
        action=button("Принять приглашение", "Accept invitation"),
        note=("Если вы не ждали приглашения, проигнорируйте это письмо.",
              "If you weren't expecting this, you can ignore this email."),
        preheader=("Примите приглашение.", "Accept your invitation.")),
}


def subject(name: str) -> str:
    return L(*EMAILS[name]["subject"])


if __name__ == "__main__":
    here = Path(__file__).parent
    lines = []
    for name, e in EMAILS.items():
        html = LAYOUT.format(
            font=FONT,
            lang=L("ru", "en"),
            title=L(*e["heading"]),
            preheader=L(*e["preheader"]),
            heading=L(*e["heading"]),
            text=L(*e["text"]),
            action=e["action"],
            note=L(*e["note"]),
            tagline=TAGLINE,
            site=SITE,
            site_name=SITE.removeprefix("https://"),
        )
        (here / f"{name}.html").write_text(html)
        lines.append(f"{name}: {subject(name)}")
    (here / "subjects.txt").write_text("\n".join(lines) + "\n")
    print("\n".join(lines))
