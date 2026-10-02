"""Builds the Nodly emails for Supabase Auth: one centred layout, six messages.

Run `python3 supabase/email-templates/build.py` after editing, then paste each .html into
Supabase (see README.md). Only Supabase's own variables are used, so the logo and links follow
the project's Site URL.
"""
from pathlib import Path

FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif"

LAYOUT = """<!doctype html>
<html lang="ru">
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
        <img src="{{{{ .SiteURL }}}}/brand/nodly-key-light.png" width="64" height="64" alt="Nodly" style="display:block;margin:0 auto;border:0;">
        <div style="margin-top:10px;font-family:{font};font-size:22px;font-weight:700;letter-spacing:-0.03em;color:#171615;">Nodly</div>
      </td></tr>
      <tr><td align="center" style="background:#ffffff;border:1px solid #e7e5e2;border-radius:20px;padding:44px 32px 36px;font-family:{font};color:#171615;text-align:center;">
        <h1 style="margin:0 0 14px;font-size:26px;line-height:1.25;font-weight:700;letter-spacing:-0.02em;color:#171615;">{heading}</h1>
        <p style="margin:0 auto 28px;max-width:380px;font-size:16px;line-height:1.6;color:#4a4744;">{text}</p>
        {action}
        <p style="margin:32px 0 0;padding-top:22px;border-top:1px solid #efedea;font-size:13px;line-height:1.6;color:#8a8783;">{note}</p>
      </td></tr>
      <tr><td align="center" style="padding-top:24px;font-family:{font};font-size:12px;line-height:1.7;color:#8a8783;text-align:center;">
        Nodly — согласование макетов с клиентами<br>
        <a href="{{{{ .SiteURL }}}}" style="color:#8a8783;text-decoration:underline;">{{{{ .SiteURL }}}}</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>
"""


def button(label: str) -> str:
    return (
        '<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;"><tr>'
        '<td align="center" style="border-radius:12px;background:#171615;">'
        '<a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:15px 32px;font-family:' + FONT + ';'
        'font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:12px;">' + label + '</a>'
        '</td></tr></table>'
        '<p style="margin:22px auto 0;max-width:380px;font-size:13px;line-height:1.6;color:#8a8783;">'
        'Если кнопка не открывается, скопируйте ссылку в браузер:<br>'
        '<a href="{{ .ConfirmationURL }}" style="color:#4a4744;word-break:break-all;">{{ .ConfirmationURL }}</a></p>'
    )


CODE = (
    '<div style="display:inline-block;padding:18px 28px;background:#f4f3f1;border:1px solid #e7e5e2;border-radius:14px;'
    'font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:34px;font-weight:700;'
    'letter-spacing:0.35em;color:#171615;">{{ .Token }}</div>'
)

EMAILS = {
    "confirm-signup": dict(
        subject="Подтвердите почту в Nodly",
        title="Подтвердите почту", preheader="Один шаг до первого согласованного макета.",
        heading="Подтвердите почту",
        text="Спасибо за регистрацию в Nodly. Нажмите кнопку, чтобы подтвердить адрес {{ .Email }} и войти в кабинет.",
        action=button("Подтвердить почту"),
        note="Если вы не регистрировались в Nodly, просто проигнорируйте это письмо."),
    "reset-password": dict(
        subject="Сброс пароля в Nodly",
        title="Сброс пароля", preheader="Ссылка для нового пароля.",
        heading="Сброс пароля",
        text="Мы получили запрос на сброс пароля для {{ .Email }}. Нажмите кнопку и придумайте новый пароль.",
        action=button("Задать новый пароль"),
        note="Если вы не запрашивали сброс, ничего делать не нужно: пароль останется прежним."),
    "magic-link": dict(
        subject="Вход в Nodly",
        title="Вход в Nodly", preheader="Ссылка для входа.",
        heading="Вход в Nodly",
        text="Нажмите кнопку, чтобы войти в кабинет Nodly как {{ .Email }}.",
        action=button("Войти"),
        note="Если вы не пытались войти, проигнорируйте это письмо."),
    "change-email": dict(
        subject="Подтвердите новую почту в Nodly",
        title="Смена почты", preheader="Подтвердите новый адрес.",
        heading="Подтвердите новую почту",
        text="Вы меняете почту аккаунта Nodly с {{ .Email }} на {{ .NewEmail }}. Нажмите кнопку, чтобы подтвердить.",
        action=button("Подтвердить новую почту"),
        note="Если вы не меняли почту, срочно смените пароль в разделе «Безопасность»."),
    "reauthentication": dict(
        subject="Код подтверждения Nodly",
        title="Код подтверждения", preheader="Код для смены пароля в Nodly.",
        heading="Код подтверждения",
        text="Введите этот код в Nodly, чтобы подтвердить смену пароля.",
        action=CODE,
        note="Код действует несколько минут. Если это были не вы, никому не сообщайте код и смените пароль."),
    "invite": dict(
        subject="Вас пригласили в Nodly",
        title="Приглашение в Nodly", preheader="Примите приглашение.",
        heading="Вас пригласили в Nodly",
        text="Вас пригласили в кабинет мастерской в Nodly. Нажмите кнопку, чтобы принять приглашение и задать пароль.",
        action=button("Принять приглашение"),
        note="Если вы не ждали приглашения, проигнорируйте это письмо."),
}

if __name__ == "__main__":
    here = Path(__file__).parent
    for name, e in EMAILS.items():
        fields = {k: v for k, v in e.items() if k != "subject"}
        (here / f"{name}.html").write_text(LAYOUT.format(font=FONT, **fields))
        print(f"{name}.html  —  {e['subject']}")
