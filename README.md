# ExtPay — Payments in browser extensions
The JavaScript library for [ExtensionPay.com](https://extensionpay.com), a service to easily add payments to browser extensions without needing to run your own server backend.

Below are the directions for using this library in your browser extension. If you learn better by example, you can also view a **[sample extension's code](sample-extension/)**. This library uses [Mozilla's webextension-polyfill library](https://github.com/mozilla/webextension-polyfill) internally for compatability across browsers which means it should work on pretty much all modern browsers.

Note: It should go without saying but I'll say it anyway: ExtPay does not contain malware or track your users in any way. The library only communicates with ExtensionPay.com servers to manage users' paid status.

### 1. Install

Copy the [dist/ExtPay.js](dist/ExtPay.js) file into your project, or, if you're using a bundler (like Webpack or Rollup):

```bash
npm install extpay --save
```


### 2. Configure your `manifest.json`
ExtPay needs the following configuration in your `manifest.json`:
```json
{
    "manifest_version": 2,
    "content_scripts": [
        {
            "matches": ["https://extensionpay.com/*"],
            "js": ["ExtPay.js"],
            "run_at": "document_start"
        }
    ],
    "permissions": [
        "https://extensionpay.com/*",
        "storage"
    ]
}
```
The content script is required to enable `extpay.onPaid` callbacks (see below). If you're using a bundler, you can create a file called something like `ExtPay_content_script.js` that only contains `import 'ExtPay'` or `require('ExtPay')` and use that instead of `ExtPay.js` in the `"js"` field of the manifest shown above.

Also please note: the library doesn't currently support optional permissions but may in the future.


### 3. Add `ExtPay` to `background.js` (important!)

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


### 4. Use `extpay.getUser()` to check user's paid status

This method makes a network call to get the extension user's paid status and returns a `user` object.
```js
extpay.getUser().then(user => {
    if (user.paid) // ...
    else // ...
})
```
or use `await`:
```js
async function foo() {
    const user = await extpay.getUser();
    if (user.paid) // ...
}
```
It is possible for `extpay.getUser()` to throw an error in case of a network failure. Please consider this possibility in your code.

The `user` object returned from `extpay.getUser()` has the following properties:

* `user.paid` - boolean `true` or `false`.
* `user.paidAt` - JS `Date()` object that the user paid or `null`.
* `user.installedAt` - JS `Date()` object the user installed the extension.


### 5. Use `extpay.openPaymentPage()` to let the user pay

Opens a browser popup where the user can pay for the extension. You can bind this to a button.
```js
extpay.openPaymentPage()
```
The payment page looks like this:

![popup screenshot](popup_screenshot.png)

While testing, use your ExtensionPay email to test payments without needing to enter credit card information. Reinstall the extension to reset back to an unpaid user.


### 6. Use `extpay.onPaid.addListener()` to run code when the user pays

If you want to run some code when your user pays, use `extpay.onPaid.addListener()`:

```js
extpay.onPaid.addListener(user => {
    console.log('user paid!')
})
```

You can add as many callback functions as you want.

Note: `onPaid` callbacks will be called after a user pays as well as after a user "logs in" (e.g. activates their paid account on a different browser/profile/install). This may change in the future. If you'd like this to work differently, please contact me with a detailed explanation of your use case :)
