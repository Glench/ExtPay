How to Add Discount Codes to your Extensions
============================================

This document explains how to add coupons / promotion codes for your extensions on [ExtensionPay.com](https://extensionpay.com). You should already have ExtPay installed in your extension and a connected Stripe account set up through ExtensionPay. 

## Create a coupon / promotion code in your Stripe settings

Stripe allows [creation and management of coupons and promotion codes on this page in your Stripe settings](https://dashboard.stripe.com/test/coupons).

In Stripe, a "coupon" is an object that when applied to a purchase can create a discount. Coupons can have associated "promotion codes" which is the actual short alphanumeric string a user enters when paying in order to apply the coupon discount.

To create a coupon, use [the Stripe coupon creation form](https://dashboard.stripe.com/coupons/create), pictured here:

![Stripe Coupon creation form screenshot](/docs/coupon_form_screenshot.png)

You can use any settings you want for the discount, but the important part is to turn on the option labeled "Use customer-facing coupon codes". This will allow you to create a promotion code you can give out to customers.

To apply a coupon during payment for your extension, customers will just need to click the "add promotion code" button shown below on the Stripe Checkout page:

![Stripe Checkout screenshot](/docs/stripe_checkout_screenshot_with_promo.png)
