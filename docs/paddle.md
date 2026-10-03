# Payments with Paddle

Paddle is the Merchant of Record: it shows the checkout, charges the card, adds and pays taxes,
sends receipts and handles refunds. Nodly opens the checkout and listens to Paddle's
notifications to switch the workshop's plan.

Until the variables below are set, the Billing panel keeps the early-access behaviour (plans
switch for free).

## 1. Paddle account

1. Sign up at paddle.com and complete the business verification. Paddle reviews the site: it
   needs the pricing on the landing page and the legal pages `/terms`, `/privacy`, `/refund`
   (already in Nodly).
2. Start in the **sandbox** (sandbox-vendors.paddle.com) to test, then repeat in the live account.

## 2. Products and prices

Catalog → Products → New product, twice:

| Product | Prices                                   |
|---------|------------------------------------------|
| Maker   | $19 / month, and $182.40 / year (−20%)   |
| Studio  | $39 / month, and $374.40 / year (−20%)   |

Copy each price ID (`pri_…`).

## 3. Keys and notifications

- Developer tools → Authentication → **Client-side token** (`test_…` / `live_…`).
- Developer tools → Authentication → **API key** with write access to customers and
  subscriptions.
- Developer tools → Notifications → New destination:
  URL `https://nodly.princeeio.com/api/paddle/webhook`, events `subscription.created`,
  `subscription.updated`, `subscription.activated`, `subscription.canceled`,
  `subscription.paused`, `subscription.resumed`, `subscription.past_due`.
  Copy the destination's **secret key**.
- Checkout → Checkout settings → **Default payment link**: `https://nodly.princeeio.com`.

## 4. Vercel environment variables

| Variable                               | Value                                   |
|----------------------------------------|-----------------------------------------|
| `NEXT_PUBLIC_PADDLE_ENV`               | `sandbox` while testing, remove for live |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`      | client-side token                        |
| `NEXT_PUBLIC_PADDLE_PRICE_GO_MONTHLY`  | Maker monthly price ID                   |
| `NEXT_PUBLIC_PADDLE_PRICE_GO_YEARLY`   | Maker yearly price ID                    |
| `NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTHLY` | Studio monthly price ID                  |
| `NEXT_PUBLIC_PADDLE_PRICE_PRO_YEARLY`  | Studio yearly price ID                   |
| `PADDLE_API_KEY`                       | API key (secret)                         |
| `PADDLE_WEBHOOK_SECRET`                | notification secret (secret)             |
| `NEXT_PUBLIC_LEGAL_NAME`               | seller's legal name, as in Paddle        |
| `NEXT_PUBLIC_SUPPORT_EMAIL`            | support address shown on legal pages     |

Redeploy after adding them.

## 5. Database

Run `supabase/billing.sql` in Supabase → SQL Editor. It adds the subscription columns and makes
the plan, trial and billing fields writable only by the server, so a plan can't be switched
from the browser without paying.

## 6. Test (sandbox)

Pay with Paddle's test card `4242 4242 4242 4242`, any future date, CVC `100`. Within a few
seconds the plan in Billing changes. "Manage subscription and invoices" opens Paddle's portal,
where cancelling moves the workshop back to Start at the end of the paid period.
