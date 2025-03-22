Changelog
=========
This changelog includes both changes in the client-side ExtPay.js library as well as the online service.

### ExtPay 3.1.1
* Fix double function declaration.

### ExtPay 3.1.0
* Added the option to have multiple payment plans in extensions. Plans are created in the extension editing page on extensionpay.com. When `extpay.openPaymentPage()` is called, a new full-screen page will open with buttons to choose between plans. There's an optional `planNickname` parameter that can be used to open directly to the Stripe Checkout page when calling `extpay.openPaymentPage()`. `extpay.getPlans()` is also available if you don't want to use ExtPay's plan choosing page.
* Stripe Checkout is now used. This allows more payment methods as well as coupon codes and increases conversion rates. It also means developers can make test payments using Stripe's test cards when developing their extensions.
* The developer experience has been improved. Now developers can simply click the "reset" link and input a password in order to reset their extension to a pre-trial pre-paid state instead of uninstalling and reinstalling their extension.

### ExtensionPay.com March 2025
* Separately from ExtPay 3.1.0 we also made backend infrastructure upgrades that should allow ExtensionPay to scale beautifully into the future.
* Just wanted to say that I'm extremely grateful for all ExtensionPay customers. By and large you've been very kind, understanding, grateful, and overall positive and that is such a gift to me and makes developing the service much more enjoyable than otherwise. Thanks so much!

### ExtensionPay.com February 2025
* Fixed a bug where a developer using their extension in test mode with their dev credentials would receive an incorrect API response after using the "log in" function.
* Upgraded to latest Stripe API on the backend. You shouldn't notice a difference in your extensions now but this upgrade lays the groundwork for exciting future updates.

### ExtensionPay.com January 2025

* The "add free users" page has been modified to show a list of your existing free users. You can now remove their free access as well. This was one of the top requests — sorry it took so long!
* Added a form for developers to reset the login limit for users that exceed their login limit.

### ExtensionPay.com June 2024

* Extension trial signup page now automatically corrects common typos of ".com" in email addresses to increase trial conversion rate.

### ExtensionPay.com April 2024

* Fixed issue where users that logged in to a paid account, the subscription expired, then they paid again would receive an incorrect API response.

### ExtensionPay.com March 2024

* Removed Google ReCaptcha on extension trial page due to negligible bot activity and price increase.
* Fixed a bug where users that logged in to a free trial and then paid a subscription would experience looping redirects on the subscription management page.

### ExtensionPay.com February 2024

* Users can now log in to an existing trial. Their trialStartedAt will be the same after they log in. This means users will no longer see an error message saying they've already started a trial if they attempt to put the same email in twice. Which means it's now up to you to show an appropriate message if their trial period is already over after they log in.

### ExtensionPay.com November 2023

* Fixed login for users that would try to log in with valid alternates to their email addresses. For example, if their original paid email is hello.there@gmail.com now they can log in with hellothere@gmail.com as well.
    Added totals to the free trial user dashboard.

### ExtensionPay.com October 2023

* Added better temporary email detection to trial pages.
* Fixed rare error for customers whose first payment fails and then later make a successful payment.

### ExtensionPay.com September 2023

* Added a captcha on the trial page to prevent bots from signing up for free trials.
* Secured the payment page more to prevent possible card testing.

### ExtensionPay.com July 2023

* Added an "add free users" UI for each extension.
* Fixed a backend caching issue that would sometimes cause the API for extpay.getUser() to return inconsistent information across logged-in sessions.
* Fixed a security vulnerability where extension creators' emails and encrypted password hashes were leaked in an API endpoint. While it is unlikely that passwords could be decrypted from this information, it would be prudent to change your ExtensionPay password to be safe. No extension user information was affected.

### ExtensionPay.com May 2023

* Removed ExtensionPay link from trial and payment pages due to the confusion it caused some users.
* Temporary email services have been blocked from signing up for extension trials for several months now with more added daily.
* Many performance improvements and a server upgrade were performed in the past month. ExtensionPay now serves around 4 million requests per day.
