'use strict';

var browser = require('webextension-polyfill');

// Sign up at https://extensionpay.com to use this library. AGPLv3 licensed.


// For running as a content script. Receive a message from the successful payments page
// and pass it on to the background page to query if the user has paid.
if (typeof window !== 'undefined') {
    window.addEventListener('message', (event) => {
        if (event.origin !== 'https://extensionpay.com') return;
        if (event.source != window) return;
        if (event.data === 'fetch-user') {
            browser.runtime.sendMessage(event.data);
        }
    }, false);
}

function ExtPay(extension_id) {

    const HOST = `https://extensionpay.com`;
    const EXTENSION_URL = `${HOST}/extension/${extension_id}`;

    function timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async function get(key) {
        try {
            return await browser.storage.sync.get(key)
        } catch(e) {
            // if sync not available (like with Firefox temp addons), fall back to local
            return await browser.storage.local.get(key)
        }
    }
    async function set(dict) {
        try {
            return await browser.storage.sync.set(dict)
        } catch(e) {
            // if sync not available (like with Firefox temp addons), fall back to local
            return await browser.storage.local.set(dict)
        }
    }

    // ----- start configuration checks
    browser.management && browser.management.getSelf().then(async (ext_info) => {
        if (!ext_info.permissions.includes('storage')) {
            var permissions = ext_info.hostPermissions.concat(ext_info.permissions);
            throw `ExtPay Setup Error: please include the "storage" permission in manifest.json["permissions"] or else ExtensionPay won't work correctly.

You can copy and paste this to your manifest.json file to fix this error:

"permissions": [
    ${permissions.map(x => `"    ${x}"`).join(',\n')}${permissions.length > 0 ? ',' : ''}
    "storage"
]
`
        }

    });
    // ----- end configuration checks

    // run on "install"
    get(['extensionpay_installed_at', 'extensionpay_user']).then(async (storage) => {
        if (storage.extensionpay_installed_at) return;

        // Migration code: before v2.1 installedAt came from the server
        // so use that stored datetime instead of making a new one.
        const user = storage.extensionpay_user;
        const date = user ? user.installedAt : (new Date()).toISOString();
        await set({'extensionpay_installed_at': date});
    });

    var paid_callbacks = [];

    async function create_key() {
        var body = {};
        var ext_info;
        if (browser.management) {
            ext_info = await browser.management.getSelf();
        } else if (browser.runtime) {
            ext_info = await browser.runtime.sendMessage('extpay-extinfo'); // ask background page for ext info
        } else {
            throw 'ExtPay needs to be run in a browser extension context'
        }

        if (ext_info.installType == 'development') {
            body.development = true;
        } 

        const resp = await fetch(`${EXTENSION_URL}/api/new-key`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        if (!resp.ok) {
            throw resp.status, `${HOST}/home`
        }
        const api_key = await resp.json();
        await set({extensionpay_api_key: api_key});
        return api_key;
    }

    async function get_key() {
        const storage = await get(['extensionpay_api_key']);
        if (storage.extensionpay_api_key) {
            return storage.extensionpay_api_key;
        }
        return null;
    }

    const datetime_re = /^\d\d\d\d-\d\d-\d\dT/;

    async function fetch_user() {
        var storage = await get(['extensionpay_user', 'extensionpay_installed_at']);
        const api_key = await get_key();
        if (!api_key) {
            return {
                paid: false,
                paidAt: null,
                installedAt: new Date(storage.extensionpay_installed_at),
            }
        }

        const resp = await fetch(`${EXTENSION_URL}/api/user?api_key=${api_key}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            }
        });
        // TODO: think harder about error states and what users will want (bad connection, server error, id not found)
        if (!resp.ok) throw 'ExtPay error while fetching user: '+resp

        const user_data = await resp.json();

        const parsed_user = {};
        for (var [key, value] of Object.entries(user_data)) {
            if (value && value.match && value.match(datetime_re)) {
                value = new Date();
            }
            parsed_user[key] = value;
        }
        parsed_user.installedAt = new Date(storage.extensionpay_installed_at);
          

        if (parsed_user.paidAt) {
            if (!storage.extensionpay_user || (storage.extensionpay_user && !storage.extensionpay_user.paidAt)) {
                paid_callbacks.forEach(cb => cb(parsed_user));
            }
        }
        await set({extensionpay_user: user_data});

        return parsed_user;
    }

    async function payment_page_link() {
        var api_key = await get_key();
        if (!api_key) {
            api_key = await create_key();
        }
        return `${EXTENSION_URL}?api_key=${api_key}`
    }

    async function open_payment_page() {
        const url = await payment_page_link();
        if (browser.windows) {
            try {
                browser.windows.create({
                    url: url,
                    type: "popup",
                    focused: true,
                    width: 500,
                    height: 800,
                    left: 450
                });
            } catch(e) {
                // firefox doesn't support 'focused'
                browser.windows.create({
                    url: url,
                    type: "popup",
                    width: 500,
                    height: 800,
                    left: 450
                });
            }
        } else {
            // https://developer.mozilla.org/en-US/docs/Web/API/Window/open
            window.open(url, null, "toolbar=no,location=no,directories=no,status=no,menubar=no,width=500,height=800,left=450");
        }
    }


    var polling = false;
    async function poll_user() {
        // keep trying to fetch user in case stripe webhook is late
        if (polling) return;
        polling = true;
        var user = await fetch_user();
        for (var i=0; i < 2*60; ++i) {
            if (user.paidAt) {
                polling = false;
                return user;
            }
            await timeout(1000);
            user = await fetch_user();
        }
        polling = false;
    }

    browser.runtime.onMessage.addListener(function(message, sender, send_response) {
        if (message == 'fetch-user') {
            // Only called via extensionpay.com/extension/[extension-id]/paid -> content_script when user successfully pays.
            // It's possible attackers could trigger this but that is basically harmless. It would just query the user.
            poll_user();
        } else if (message == 'extpay-extinfo' && browser.management) {
            // get this message from content scripts which can't access browser.management
            return browser.management.getSelf()
        }
    });
    
    return {
        getUser: function() {
            return fetch_user()
        },
        onPaid: {
            addListener: function(callback) {
                const content_script_template = `"content_scripts": [
                {
            "matches": ["${HOST}/*"],
            "js": ["ExtPay.js"],
            "run_at": "document_start"
        }]`;
                const manifest = browser.runtime.getManifest();
                if (!manifest.content_scripts) {
                    throw `ExtPay setup error: To use the onPaid callback handler, please include ExtPay as a content script in your manifest.json. You can copy the example below into your manifest.json or check the docs: https://github.com/Glench/ExtPay#2-configure-your-manifestjson

        ${content_script_template}`
                }
                const extpay_content_script_entry = manifest.content_scripts.find(obj => {
                    // removing port number because firefox ignores content scripts with port number
                    return obj.matches.includes(HOST.replace(':3000', '')+'/*')
                });
                if (!extpay_content_script_entry) {
                    throw `ExtPay setup error: To use the onPaid callback handler, please include ExtPay as a content script in your manifest.json matching "${HOST}/*". You can copy the example below into your manifest.json or check the docs: https://github.com/Glench/ExtPay#2-configure-your-manifestjson

        ${content_script_template}`
                } else {
                    if (!extpay_content_script_entry.run_at || extpay_content_script_entry.run_at !== 'document_start') {
                        throw `ExtPay setup error: To use the onPaid callback handler, please make sure the ExtPay content script in your manifest.json runs at document start. You can copy the example below into your manifest.json or check the docs: https://github.com/Glench/ExtPay#2-configure-your-manifestjson

        ${content_script_template}`
                    }
                }

                paid_callbacks.push(callback);
            },
            // removeListener: function(callback) {
            //     // TODO
            // }
        },
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

module.exports = ExtPay;
