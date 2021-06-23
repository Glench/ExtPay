# ExtPay.js — Payments in browser extensions
The JavaScript library for [ExtensionPay.com](https://extensionpay.com), a service to easily add payments to browser extensions without running your own server backend.

Below are directions for using this library in your browser extension. If you learn better by example, you can also view the code for a **[sample extension](sample-extension/)**. This library uses [Mozilla's webextension-polyfill library](https://github.com/mozilla/webextension-polyfill) internally for compatability across browsers which means it should work on almost all modern browsers.

  1. [Install](#1-install)
  2. [Configure your `manifest.json`](#2-configure-your-manifestjson)
  3. [Add `ExtPay` to `background.js` (required!)](#3-add-extpay-to-backgroundjs-required)
  4. [Use `extpay.getUser()` to check a user's paid status](#4-use-extpaygetuser-to-check-a-users-paid-status)
      * [`user` object properties](#user-object-properties)
  5. [Use `extpay.openPaymentPage()` to let the user pay](#5-use-extpayopenpaymentpage-to-let-the-user-pay)
  6. [Use `extpay.onPaid.addListener()` to run code when the user pays](#6-use-extpayonpaidaddlistener-to-run-code-when-the-user-pays)
  7. [Use `extpay.openPaymentPage()` to let the user manage their subscription preferences](#7-use-extpayopenpaymentpage-to-let-the-user-manage-their-subscription-preferences)

**Note**: ExtPay.js doesn't contain malware or track your users in any way. This library only communicates with ExtensionPay.com servers to manage users' paid status.

## 1. Install

Copy the [dist/ExtPay.js](dist/ExtPay.js) file into your project, or, if you're using a bundler (like Webpack or Rollup):

```bash
npm install extpay --save
```


## 2. Configure your `manifest.json`
ExtPay needs the following configuration in your V2 `manifest.json`:
```json
{
    "manifest_version": 2,
    "permissions": [
        "storage"
    ]
}
```

ExtPay will not show a scary permission warning when users try to install your extension.

If you have a `"content_security_policy"` in your manifest or get a `Refused to connect to 'https://extensionpay.com...'` error, you'll have to add `connect-src https://extensionpay.com` to your extension's content security policy. <a href="https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/content_security_policy">See Mozilla's documentation for more details</a>.

Manifest V3 support coming soon.


## 3. Add `ExtPay` to `background.js` (required!)

You need to put `ExtPay` in your background file, often named something like `background.js`. If you don't include `ExtPay` in your background file it won't work correctly.

If you're not using a bundler, add `ExtPay.js` to `manifest.json`:
```js
{
    "background": {
        "scripts": ["ExtPay.js", "background.js"]
    }
}
```

Then initialize ExtPay with your extension's unique `extension-id`, which you get by **[signing up and registering an extension](https://extensionpay.com)**. In the example below, the `extension-id` is `sample-extension`.

```js
// background.js
const extpay = ExtPay('sample-extension')
```

If you're using a bundler you can `import 'ExtPay'` or `require('ExtPay')` right in your `background.js`.


## 4. Use `extpay.getUser()` to check a user's paid status

This method makes a network call to get the extension user's paid status and returns a `user` object.
```js
extpay.getUser().then(user => {
    if (user.paid) {
        // ...
    } else {
        // ...
    }
})
```
or use `await`:
```js
async function foo() {
    const user = await extpay.getUser();
    if (user.paid) {
        // ...
    }
}
```
It is possible for `extpay.getUser()` to throw an error in case of a network failure. Please consider this possibility in your code e.g. `extpay.getUser().then(/* ... */).catch(/* handle error */)`

The `user` object returned from `extpay.getUser()` has the following properties:

### `user` object properties
| property | description |
| --- | --- |
| `user.paid` | `true` or `false`. `user.paid` is meant to be a simple way to tell if the user should have paid features activated. For subscription payments, `paid` is only true if `subscriptionStatus` is `active`. |
| `user.paidAt` | `Date()` object that the user first paid or `null`.|
| `user.installedAt` | `Date()` object the user installed the extension. |
| **subscription only**| |
| `user.subscriptionStatus` | One of `active`, `past_due`, or `canceled`. `active` means the user's subscription is paid-for. `past_due` means the user's most recent subscription payment has failed (expired card, insufficient funds, etc). `canceled` means that the user has canceled their subscription and the end of their last paid period has passed. [You can read more about how subscriptions work here](/docs/how_subscriptions_work.md). |
| `user.subscriptionCancelAt` | `null` or `Date()` object that the user's subscription is set to cancel or did cancel at. |

## 5. Use `extpay.openPaymentPage()` to let the user pay

Opens a browser popup where the user can pay to upgrade their status.
```js
extpay.openPaymentPage()
```
The payment page looks like this:

![popup screenshot](docs/popup_screenshot.png)

Note: `extpay.openPaymentPage()` can fail to open the popup if there is a network error. Please consider this possibility in your code.

It is best to open the payment page when the user has a clear idea of what they're paying for.

While testing, use your ExtensionPay email to test payments without entering credit card information. Reinstall the extension to reset back to an unpaid user.

Depending on how you configure your extension, users that have paid before can log in to activate their paid features on different browsers, profiles, or after uninstalling/reinstalling.


## 6. Use `extpay.onPaid.addListener()` to run code when the user pays

If you want to run some code when your user pays, use `extpay.onPaid.addListener()`:

```js
extpay.onPaid.addListener(user => {
    console.log('user paid!')
})
```

To use this feature, you will need to include the following content script configuration in your `manifest.json`:

```json
{
    "manifest_version": 2,
    "content_scripts": [
        {
            "matches": ["https://extensionpay.com/*"],
            "js": ["ExtPay.js"],
            "run_at": "document_start"
        }
    ]
}
```

The content script is required to enable `extpay.onPaid` callbacks. It will add a permissions warning when installing your extension. If you're using a bundler, you can create a file called something like `ExtPay_content_script.js` that only contains `import 'ExtPay'` or `require('ExtPay')` and use that in the `"js"` field above.

You can add as many callback functions as you want.

Note: `onPaid` callbacks will be called after a user pays as well as after a user "logs in" (e.g. activates their paid account on a different browser/profile/install). This may change in the future -- if you'd like this to work differently, please contact me with a detailed explanation of your use case :)


## 7. Use `extpay.openPaymentPage()` to let the user manage their subscription preferences

If your extension is configured for subscription payments, you can let the user manage their subscription from within the extension with the same function you used to let them pay:

```js
extpay.openPaymentPage()
```

The subscription management page looks something like this:

<img src="docs/subscription_management_screenshot.png" alt="Screenshot of example subscription management page." width="400"> 
