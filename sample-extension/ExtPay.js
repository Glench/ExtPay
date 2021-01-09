var ExtPay = (function () {
    'use strict';

    // Sign up at https://extensionpay.com to use this library. AGPLv3 licensed.

    // WARNING: DON'T USE THIS FILE IN YOUR EXTENSION. USE A FILE FROM THE /build FOLDER INSTEAD.

        // "content_scripts": [
        //     {
        //         "matches": ["https://extensionpay.com/*"],
        //         "js": ["ExtPay.js"],
        //         "run_at": "document_start"
        //     }
        // ],

    // for running as a content script
    // window.addEventListener('message', (event) => {
    //     if (event.source != window) return;
    //     chrome.runtime.sendMessage(event.data)
    // }, false);

    function ExtPay(extension_id) {
        var browser;
        if (typeof browser !== 'undefined') {
            browser = browser;
        } else if (typeof chrome !== 'undefined') {
            browser = chrome;
        } else {
            throw "ExtPay: No browser found. ExtPay needs to run in a browser extension context."
        }

        const HOST = `https://extensionpay.com`;
        var EXTENSION_URL = `${HOST}/extension/${extension_id}`;

        browser.runtime.onInstalled.addListener(async function(details) {
            
            browser.management.getSelf(function(info) { 
                if (info.installType == 'development') {
                    if (!info.hostPermissions.includes(HOST+'/*')) {
                        var permissions = info.permissions.concat(info.hostPermissions);
                        throw `ExtPay Setup Error: please include "${HOST}/*" in manifest.json["permissions"] or else ExtensionPay won't work correctly.

You can copy and paste this to your manifest.json file to fix this error:

    "permissions": [
        ${permissions.map(x => `"${x}"`).join(',\n        ')}${permissions.length > 0 ? ',' : ''}
        "${HOST}/*"
    ]
 `
                    }

                    if (!info.permissions.includes('storage')) {
                        var permissions = info.hostPermissions.concat(info.permissions);
                        throw `ExtPay Setup Error: please include the "storage" permission in manifest.json["permissions"] or else ExtensionPay won't work correctly.

You can copy and paste this to your manifest.json file to fix this error:

    "permissions": [
        ${permissions.map(x => `"${x}"`).join(',\n')}${permissions.length > 0 ? ',' : ''}
        "storage"
    ]
 `
                    }
                }
            });

            if (details.reason == 'install' || details.reason == 'update') {
                browser.storage.sync.get(['extensionpay_api_key'], function(storage) {
                    if (storage.extensionpay_api_key) return;

                    browser.management.getSelf(async function(info) { 
                        var body = {};
                        if (info.installType == 'development') {
                            body.development = true;
                        } 
                        // TODO: what to do if this request fails?
                        const resp = await fetch(`${EXTENSION_URL}/api/new-key`, {
                            method: 'POST',
                            headers: {
                                'Accept': 'application/json',
                                'Content-type': 'application/json',
                            },
                            body: JSON.stringify(body),
                        });
                        if (!resp.ok) {
                            console.error('ExtPay: Error generating API key (server response): ', resp.status, `Are you sure you registered your extension? Check here and make sure the ID matches '${extension_id}':`, `${HOST}/home`);
                            return;
                        }
                        const api_key = await resp.json();
                        browser.storage.sync.set({extensionpay_api_key: api_key}, function() {
                            fetch_user();
                        });
                    });
                });
            }
        });

        function open_payment_page() {
            browser.storage.sync.get(['extensionpay_api_key'], function(storage) {
                browser.windows.create({
                    url: `${EXTENSION_URL}?api_key=${storage.extensionpay_api_key}`,
                    type: "popup",
                    width: 500,
                    height: 800,
                    left: 200
                });
            });
        }

        // var paid_callbacks = [];

        function fetch_user() {
            return new Promise((resolve, reject) => {
                browser.storage.sync.get(['extensionpay_api_key'], async function(obj) {
                    const resp = await fetch(`${EXTENSION_URL}/api/user?api_key=${obj.extensionpay_api_key}`, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                        }
                    });
                    // TODO: think harder about error states and what users will want (bad connection, server error, id not found)
                    if (!resp.ok) return reject() 

                    const user = await resp.json();
                    if (user.paidAt) {
                        user.paidAt = new Date(user.paidAt);
                    }
                    if (user.installedAt) {
                        user.installedAt = new Date(user.installedAt);
                    }
                    browser.storage.sync.get(['extensionpay_user'], function(storage) {
                        browser.storage.sync.set({extensionpay_user: user});
                        if (user.paid) {
                            if (!storage.extensionpay_user || (storage.extensionpay_user && !storage.extensionpay_user.paid)) ;
                        }
                    });
                    resolve(user);
                });
            })
        }

        // browser.runtime.onMessage.addListener(async function(message) {
        //     if (message == 'query-user') {
        //         // only called via extensionpay.com/extension/<>/paid -> content_script when user successfully paid
        //         fetch_user()
        //     }
        //
        // });
        
        // function save(key, value) {
        //     // if no ID found in firefox manifest.json/browser_specific_settings, give warning
        //     browser.storage.sync.set(data)
        //     // check API -> storage.sync -> storage.local
        // }
        // function get(key) {
        // }

        return {
            getUser: function() {
                return fetch_user()
            },
            // onPaid: function(callback) {
            //     paid_callbacks.push(callback)
            // },
            openPaymentPage: open_payment_page,
            // paymentPageLink: function() {
            //     return new Promise((resolve, reject) => {
            //         browser.storage.sync.get(['extensionpay_api_key'], function(storage) {
            //             resolve(`${EXTENSION_URL}?api_key=${storage.extensionpay_api_key}`)
            //         })
            //     })
            // }
        }
    }

    return ExtPay;

}());
