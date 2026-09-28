How to Run a Referral Program Today
====================================

This document explains how to run a simple referral or affiliate program with the tools ExtensionPay and Stripe already provide, plus `extpay.setReferral()`. You should already have ExtPay installed and a connected Stripe account. For coupons themselves, see [How to Add Discount Codes](/docs/discount_code_guide.md).

ExtensionPay.com does not yet attribute purchases, calculate commissions, or pay referrers. The steps below use a Stripe promotion code as the referral code, so Stripe counts who paid with each code. You pay commissions, or grant a free month, yourself.

## What you can configure today

| Choice | How to do it now |
| --- | --- |
| Discount for the person who was referred | Stripe coupon + promotion code (percentage or fixed amount; once, for several months, or forever) |
| Free month (or other free time) for the referrer | ExtensionPay "add free users" page, or a 100% off coupon that lasts one month |
| Cash reward for the referrer | Export that promotion code's redemptions from Stripe and pay the referrer outside ExtensionPay |
| Limits | Stripe settings: first-time customers only, maximum redemptions, expiry date |

One promotion code per referrer (for example `youtuber123`) is the whole tracking system. Stripe's coupon page shows how many times each code was redeemed.

## 1. Create one promotion code per referrer

Create a coupon with [Stripe's coupon form](https://dashboard.stripe.com/coupons/create) and turn on "Use customer-facing coupon codes", as described in the [discount code guide](/docs/discount_code_guide.md). Then create a promotion code whose code is the referral code you want to share.

Useful limits on that form:

- **First-time customers only**, so an existing subscriber cannot redeem their own code.
- **Maximum redemptions** and an **expiry date**.
- **Duration**: once (first payment), a number of months, or forever.

Give the referrer a link to your extension and the code, for example `youtuber123`. On Stripe Checkout the buyer clicks "add promotion code" and enters it. ExtensionPay does not apply the code automatically.

## 2. Store the same code with `setReferral`

When your extension or landing page knows which referrer sent the user, store that code before opening checkout:

```js
await extpay.setReferral('youtuber123')
extpay.openPaymentPage()
```

`setReferral` keeps the first code it stores. Pass `{overwrite: true}` to replace it. `getReferral()` returns `{code, capturedAt}` or `null`.

ExtPay sends the code as `ref` on the payment, trial, and login page URLs, and as `referral` when it creates the user's API key. ExtensionPay.com does not read those fields yet, so this step does not change who gets paid. It records the code so a future server-side referral program can use it.

Codes must be 1–64 characters: letters, numbers, `_`, or `-`.

## 3. Reward the referrer

**Free time.** When you see a redemption for that code, grant the referrer access from the "add free users" page on extensionpay.com, or give them a 100% off promotion code that lasts one billing period.

**Cash.** In the Stripe Dashboard, open the promotion code and use its redemption count (or export the redemptions). Multiply by the amount you promised (a percentage of the payment, or a fixed amount) and pay the referrer yourself. Wait until the refund window has passed before you pay, and subtract refunds.

There is no referrer account, earnings page, or automatic payout.

## What this does not do

- It does not apply the discount from `setReferral` alone. The buyer still types the promotion code.
- It does not count clicks or signups, only completed Checkout redemptions of that code.
- It does not block someone from referring themselves, except for the Stripe "first-time customers only" limit.
- It does not pay commissions or extend a subscription when a referred user pays.

Those need ExtensionPay.com to store the code, attach it to the Stripe Checkout session, and calculate the reward.
