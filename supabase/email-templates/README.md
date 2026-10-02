# Nodly emails from Supabase Auth

Branded templates for the emails Supabase Auth sends (sign-up, password reset, etc.).
They use only Supabase's own variables (`{{ .SiteURL }}`, `{{ .ConfirmationURL }}`,
`{{ .Token }}`, `{{ .Email }}`, `{{ .NewEmail }}`), so the logo is loaded from
`{{ .SiteURL }}/brand/nodly-key-light.png`. The Site URL in Supabase must be the live site.

## 1. Send from your own address (custom SMTP)

Without this, mail comes from `noreply@mail.app.supabase.io` and is rate-limited.

1. Resend → Domains → Add domain (e.g. `princeeio.com`), then add the DNS records it shows
   at your DNS host and wait for "Verified".
2. Resend → API Keys → create a key with "Sending access".
3. Supabase → Authentication → Emails → SMTP Settings → Enable custom SMTP:
   - Sender email: `no-reply@princeeio.com`
   - Sender name: `Nodly`
   - Host: `smtp.resend.com`, Port: `465`
   - Username: `resend`, Password: the Resend API key
4. Use the same address for the app's own notifications: set `NOTIFY_FROM_EMAIL` in Vercel to
   `Nodly <no-reply@princeeio.com>`.

## 2. Templates

The HTML files are built by `build.py` (one centred layout); edit it and run
`python3 supabase/email-templates/build.py` to regenerate them.

Supabase → Authentication → Emails → Templates. For each one, paste the subject and the
whole HTML file:

| Supabase template   | File                     | Subject                           |
|---------------------|--------------------------|-----------------------------------|
| Confirm sign up     | `confirm-signup.html`    | Подтвердите почту в Nodly         |
| Reset password      | `reset-password.html`    | Сброс пароля в Nodly              |
| Magic link          | `magic-link.html`        | Вход в Nodly                      |
| Change email address| `change-email.html`      | Подтвердите новую почту в Nodly   |
| Reauthentication    | `reauthentication.html`  | Код подтверждения Nodly           |
| Invite user         | `invite.html`            | Вас пригласили в Nodly            |

Security notices (turn these two on, leave the rest off):

| Supabase notice        | File                    | Subject                 |
|------------------------|-------------------------|-------------------------|
| Password changed       | `password-changed.html` | Пароль в Nodly изменён  |
| Email address changed  | `email-changed.html`    | Почта в Nodly изменена  |

## 3. Password changes need the emailed code

The Security panel always asks for the code from the Reauthentication email before
changing the password. To make the server insist on it too:
Supabase → Authentication → Providers → Email → turn on **Secure password change**.
