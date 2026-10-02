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

Every email is in Russian and English: Supabase shows Russian to accounts whose `lang` is "ru"
(the app saves it at sign-up and whenever the language is switched) and English to everyone
else. The files are built by `build.py`; edit it and run
`python3 supabase/email-templates/build.py` to regenerate them and `subjects.txt`.

Supabase → Authentication → Emails. For each one, paste the line from `subjects.txt` into
Subject and the whole HTML file into Body:

| Supabase template                 | File                      |
|-----------------------------------|---------------------------|
| Confirm sign up                   | `confirm-signup.html`     |
| Invite user                       | `invite.html`             |
| Magic link or OTP                 | `magic-link.html`         |
| Change email address              | `change-email.html`       |
| Reset password                    | `reset-password.html`     |
| Reauthentication                  | `reauthentication.html`   |
| Security → Password changed (on)  | `password-changed.html`   |
| Security → Email address changed (on) | `email-changed.html`  |

Leave the other security notices off.

## 3. Password changes need the emailed code

The Security panel always asks for the code from the Reauthentication email before
changing the password. To make the server insist on it too:
Supabase → Authentication → Providers → Email → turn on **Secure password change**.
