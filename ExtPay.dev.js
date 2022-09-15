// Sign up at https://extensionpay.com to use this library. AGPLv3 licensed.
// WARNING: DON'T USE THIS FILE IN YOUR EXTENSION. USE A FILE FROM THE /dist FOLDER INSTEAD.


import * as browser from 'webextension-polyfill';


// For running as a content script. Receive a message from the successful payments page
// and pass it on to the background page to query if the user has paid.
if (typeof window !== 'undefined') {
    window.addEventListener('message', (event) => {
        if (event.origin !== 'http://localhost:3000') return;
        if (event.source != window) return;
        if (event.data === 'fetch-user' || event.data === 'trial-start') {
            browser.runtime.sendMessage(event.data)
        }
    }, false);
}

export default function ExtPay(extension_id) {

    const HOST = `http://localhost:3000`
    const EXTENSION_URL = `${HOST}/extension/${extension_id}`

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
            var permissions = ext_info.hostPermissions.concat(ext_info.permissions)
            throw `ExtPay Setup Error: please include the "storage" permission in manifest.json["permissions"] or else ExtensionPay won't work correctly.

You can copy and paste this to your manifest.json file to fix this error:

"permissions": [
    ${permissions.map(x => `"    ${x}"`).join(',\n')}${permissions.length > 0 ? ',' : ''}
    "storage"
]
`
        }

    })
    // ----- end configuration checks

    // run on "install"
    get(['extensionpay_installed_at', 'extensionpay_user']).then(async (storage) => {
        if (storage.extensionpay_installed_at) return;

        // Migration code: before v2.1 installedAt came from the server
        // so use that stored datetime instead of making a new one.
        const user = storage.extensionpay_user;
        const date = user ? user.installedAt : (new Date()).toISOString();
        await set({'extensionpay_installed_at': date})
    })

    const paid_callbacks = [];
    const trial_callbacks =  [];

    async function create_key() {
        var body = {};
        var ext_info;
        if (browser.management) {
            ext_info = await browser.management.getSelf();
        } else if (browser.runtime) {
            ext_info = await browser.runtime.sendMessage('extpay-extinfo') // ask background page for ext info
            if (!ext_info) {
                // Safari doesn't support browser.management for some reason
                const is_dev_mode = !('update_url' in browser.runtime.getManifest());
                ext_info = {installType: is_dev_mode ? 'development' : 'normal'}
            }
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
        })
        if (!resp.ok) {
            throw 'ExtPay: Error generating key. Server response: ', resp.status, `Are you sure you registered your extension on extensionpay.com? Check at this URL and make sure the ID matches '${extension_id}':`, `${HOST}/home`
        }
        const api_key = await resp.json();
        await set({extensionpay_api_key: api_key})
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
        var storage = await get(['extensionpay_user', 'extensionpay_installed_at'])
        const api_key = await get_key()
        if (!api_key) {
            return {
                paid: false,
                paidAt: null,
                installedAt: storage.extensionpay_installed_at ? new Date(storage.extensionpay_installed_at) : new Date(), // sometimes this function gets called before the initial install time can be flushed to storage
                trialStartedAt: null,
            }
        }

        const resp = await fetch(`${EXTENSION_URL}/api/user?api_key=${api_key}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            }
        })
        // TODO: think harder about error states and what users will want (bad connection, server error, id not found)
        if (!resp.ok) throw 'ExtPay error while fetching user: '+(await resp.text())

        const user_data = await resp.json();

        const parsed_user = {}
        for (var [key, value] of Object.entries(user_data)) {
            if (value && value.match && value.match(datetime_re)) {
                value = new Date(value)
            }
            parsed_user[key] = value
        }
        parsed_user.installedAt = new Date(storage.extensionpay_installed_at);
          

        if (parsed_user.paidAt) {
            if (!storage.extensionpay_user || (storage.extensionpay_user && !storage.extensionpay_user.paidAt)) {
                paid_callbacks.forEach(cb => cb(parsed_user))
            }
        }
        if (parsed_user.trialStartedAt) {
            if (!storage.extensionpay_user || (storage.extensionpay_user && !storage.extensionpay_user.trialStartedAt)) {
                trial_callbacks.forEach(cb => cb(parsed_user))
            }

        }
        await set({extensionpay_user: user_data})

        return parsed_user;
    }

    async function payment_page_link() {
        var api_key = await get_key();
        if (!api_key) {
            api_key = await create_key();
        }
        return `${EXTENSION_URL}?api_key=${api_key}`
    }

    async function open_popup(url, width, height) {
        if (browser.windows && browser.windows.create) {
            const current_window = await browser.windows.getCurrent()
            // https://stackoverflow.com/a/68456858
            const left = Math.round((current_window.width - width) * 0.5 + current_window.left)
            const top = Math.round((current_window.height - height) * 0.5 + current_window.top)
            try {
                browser.windows.create({
                    url: url,
                    type: "popup",
                    focused: true,
                    width,
                    height,
                    left,
                    top
                })
            } catch(e) {
                // firefox doesn't support 'focused'
                browser.windows.create({
                    url: url,
                    type: "popup",
                    width,
                    height,
                    left,
                    top
                })
            }
        } else {
            // for opening from a content script
            // https://developer.mozilla.org/en-US/docs/Web/API/Window/open
            window.open(url, null, `toolbar=no,location=no,directories=no,status=no,menubar=no,width=${width},height=${height},left=450`)
        }
    }

    async function open_payment_page() {
        const url = await payment_page_link()
        open_popup(url, 500, 800)
    }

    async function open_trial_page(period) {
        // let user have period string like '1 week' e.g. "start your 1 week free trial"

        var api_key = await get_key();
        if (!api_key) {
            api_key = await create_key();
        }
        var url = `${EXTENSION_URL}/trial?api_key=${api_key}`
        if (period) {
            url += `&period=${period}`
        }
        open_popup(url, 500, 650)
    }
    async function open_login_page() {
        var api_key = await get_key();
        if (!api_key) {
            api_key = await create_key();
        }
        const url = `${EXTENSION_URL}/reactivate?api_key=${api_key}`
        open_popup(url, 500, 800)
    }

    var polling = false;
    async function poll_user_paid() {
        // keep trying to fetch user in case stripe webhook is late
        if (polling) return;
        polling = true;
        var user = await fetch_user()
        for (var i=0; i < 2*60; ++i) {
            if (user.paidAt) {
                polling = false;
                return user;
            }
            await timeout(1000)
            user = await fetch_user()
        }
        polling = false;
    }


    
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
        }]`
                const manifest = browser.runtime.getManifest();
                if (!manifest.content_scripts) {
                    throw `ExtPay setup error: To use the onPaid callback handler, please include ExtPay as a content script in your manifest.json. You can copy the example below into your manifest.json or check the docs: https://github.com/Glench/ExtPay#2-configure-your-manifestjson

        ${content_script_template}`
                }
                const extpay_content_script_entry = manifest.content_scripts.find(obj => {
                    // removing port number because firefox ignores content scripts with port number
                    return obj.matches.includes(HOST.replace(':3000', '')+'/*')
                })
                if (!extpay_content_script_entry) {
                    throw `ExtPay setup error: To use the onPaid callback handler, please include ExtPay as a content script in your manifest.json matching "${HOST}/*". You can copy the example below into your manifest.json or check the docs: https://github.com/Glench/ExtPay#2-configure-your-manifestjson

        ${content_script_template}`
                } else {
                    if (!extpay_content_script_entry.run_at || extpay_content_script_entry.run_at !== 'document_start') {
                        throw `ExtPay setup error: To use the onPaid callback handler, please make sure the ExtPay content script in your manifest.json runs at document start. You can copy the example below into your manifest.json or check the docs: https://github.com/Glench/ExtPay#2-configure-your-manifestjson

        ${content_script_template}`
                    }
                }

                paid_callbacks.push(callback)
            },
            // removeListener: function(callback) {
            //     // TODO
            // }
        },
        openPaymentPage: open_payment_page,
        openTrialPage: open_trial_page,
        openLoginPage: open_login_page,
        onTrialStarted: {
            addListener: function(callback) {
                trial_callbacks.push(callback)
            }
        },
        startBackground: function() {
            browser.runtime.onMessage.addListener(function(message, sender, send_response) {
                console.log('service worker got message! Here it is:', message)
                if (message == 'fetch-user') {
                    // Only called via extensionpay.com/extension/[extension-id]/paid -> content_script when user successfully pays.
                    // It's possible attackers could trigger this but that is basically harmless. It would just query the user.
                    poll_user_paid()
                } else if (message == 'trial-start') {
                    // no need to poll since the trial confirmation page has already set trialStartedAt
                    fetch_user() 
                } else if (message == 'extpay-extinfo' && browser.management) {
                    // get this message from content scripts which can't access browser.management
                    return browser.management.getSelf()
                } 
            });
        }
    }
}

