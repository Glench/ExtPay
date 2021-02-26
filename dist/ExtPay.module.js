import { runtime, management, storage, windows } from 'webextension-polyfill';

// Sign up at https://extensionpay.com to use this library. AGPLv3 licensed.


// For running as a content script. Receive a message from the successful payments page
// and pass it on to the background page to query if the user has paid.
if (typeof window !== 'undefined') {
    window.addEventListener('message', (event) => {
        if (event.source != window) return;
        runtime.sendMessage(event.data); // event.data === 'fetch-user'
    }, false);
}

function ExtPay(extension_id) {

    const HOST = `https://extensionpay.com`;
    const EXTENSION_URL = `${HOST}/extension/${extension_id}`;

    async function get(key) {
        try {
            return await storage.sync.get(key)
        } catch(e) {
            // if sync not available (like with Firefox temp addons), fall back to local
            return await storage.local.get(key)
        }
    }
    async function set(dict) {
        try {
            return await storage.sync.set(dict)
        } catch(e) {
            // if sync not available (like with Firefox temp addons), fall back to local
            return await storage.local.set(dict)
        }
    }

    runtime.onInstalled && runtime.onInstalled.addListener(async function(install_details) {
        
        const ext_info = await management.getSelf();
        if (ext_info.installType == 'development') {
            if (!ext_info.hostPermissions.includes(HOST+'/*')) {
                var permissions = ext_info.permissions.concat(ext_info.hostPermissions);
                throw `ExtPay Setup Error: please include "${HOST}/*" in manifest.json["permissions"] or else ExtensionPay won't work correctly.

You can copy and paste this to your manifest.json file to fix this error:

    "permissions": [
        ${permissions.map(x => `"${x}"`).join(',\n        ')}${permissions.length > 0 ? ',' : ''}
        "${HOST}/*"
    ]
 `
            }

            if (!ext_info.permissions.includes('storage')) {
                var permissions = ext_info.hostPermissions.concat(ext_info.permissions);
                throw `ExtPay Setup Error: please include the "storage" permission in manifest.json["permissions"] or else ExtensionPay won't work correctly.

You can copy and paste this to your manifest.json file to fix this error:

    "permissions": [
        ${permissions.map(x => `"${x}"`).join(',\n')}${permissions.length > 0 ? ',' : ''}
        "storage"
    ]
 `
            }

            const content_script_template = `"content_scripts": [
    {
        "matches": ["${HOST}/*"],
        "js": ["ExtPay.js"],
        "run_at": "document_start"
    }]`;
            var manifest_resp;
            try {
                manifest_resp = await fetch('manifest.json');
            } catch(e) {
                throw 'ExtPay setup error: cannot locate manifest.json in top-level. If this is a problem for you, please contact me so I can add a feature for you.'
            }
            const manifest = await manifest_resp.json();
            if (!manifest.content_scripts) {
                throw `ExtPay setup error: Please include ExtPay as a content script in your manifest.json. You can copy the example below into your manifest.json or check the docs: https://github.com/Glench/ExtPay#2-configure-your-manifestjson

    ${content_script_template}`
            }
            const extpay_content_script = manifest.content_scripts.find(obj => {
                // removing port number because firefox ignores content scripts with port number
                return obj.matches.includes(HOST.replace(':3000', '')+'/*')
            });
            if (!extpay_content_script) {
                throw `ExtPay setup error: Please include ExtPay as a content script in your manifest.json matching "${HOST}/*". You can copy the example below into your manifest.json or check the docs: https://github.com/Glench/ExtPay#2-add-extension-permissions-to-your-manifestjson

    ${content_script_template}`
            } else {
                if (!extpay_content_script.run_at || extpay_content_script.run_at !== 'document_start') {
                    throw `ExtPay setup error: Please make sure the ExtPay content script in your manifest.json runs at document start. You can copy the example below into your manifest.json or check the docs: https://github.com/Glench/ExtPay#2-add-extension-permissions-to-your-manifestjson

    ${content_script_template}`
                }
            }
        }

        if (install_details.reason !== 'install' && install_details.reason !== 'update') {
            return
        }

        const storage = await get(['extensionpay_api_key']);
        if (storage.extensionpay_api_key) return;

        var body = {};
        if (ext_info.installType == 'development') {
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
            console.error('ExtPay: Error generating API key (server response): ', resp.status, `Are you sure you registered your extension? Check at this URL and make sure the ID matches '${extension_id}':`, `${HOST}/home`);
            return;
        }
        const api_key = await resp.json();
        await set({extensionpay_api_key: api_key});
        fetch_user();
    }); // installed

    var paid_callbacks = [];

    function timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async function open_payment_page() {
        var storage = await get(['extensionpay_api_key']);
        // wait 10 seconds for api key to be returned if creator is running this in background.js immediately after extpay initialization
        for (var i=0; i < 20; ++i) {
            if (storage.extensionpay_api_key) break;
            await timeout(500);
            storage = await get(['extensionpay_api_key', 'extensionpay_user']);
        }
        if (!storage.extensionpay_api_key) throw 'ExtPay Error: timed out registering user.'
        try {
            windows.create({
                url: `${EXTENSION_URL}?api_key=${storage.extensionpay_api_key}`,
                type: "popup",
                focused: true,
                width: 500,
                height: 800,
                left: 450
            });
        } catch(e) {
            // firefox doesn't support 'focused'
            windows.create({
                url: `${EXTENSION_URL}?api_key=${storage.extensionpay_api_key}`,
                type: "popup",
                width: 500,
                height: 800,
                left: 450
            });
        }
    }


    async function fetch_user() {
        var storage = await get(['extensionpay_api_key', 'extensionpay_user']);
        // wait 10 seconds for api key to be returned if creator is running this in background.js immediately after extpay initialization
        for (var i=0; i < 20; ++i) {
            if (storage.extensionpay_api_key) break;
            await timeout(500);
            storage = await get(['extensionpay_api_key', 'extensionpay_user']);
        }
        if (!storage.extensionpay_api_key) throw 'ExtPay Error: timed out registering user.'

        const resp = await fetch(`${EXTENSION_URL}/api/user?api_key=${storage.extensionpay_api_key}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            }
        });
        // TODO: think harder about error states and what users will want (bad connection, server error, id not found)
        if (!resp.ok) throw 'ExtPay error while fetching user: '+resp

        const user_data = await resp.json();

        const parsed_user = {
            paid: user_data.paid,
            paidAt: user_data.paidAt ? new Date(user_data.paidAt) : null,
            installedAt: new Date(user_data.installedAt),
        };

        if (parsed_user.paid) {
            if (!storage.extensionpay_user || (storage.extensionpay_user && !storage.extensionpay_user.paid)) {
                paid_callbacks.forEach(cb => cb(parsed_user));
            }
        }
        await set({extensionpay_user: user_data}); // useful for future purposes perhaps

        return parsed_user;
    }

    runtime.onMessage.addListener(async function(message) {
        if (message == 'fetch-user') {
            // Only called via extensionpay.com/extension/[extension-id]/paid -> content_script when user successfully pays.
            // It's possible attackers could trigger this but it wouldn't do anything but query.

            // keep trying to fetch user in case stripe webhook is late
            var user = await fetch_user();
            for (var i=0; i < 60; ++i) {
                if (user.paid) return
                await timeout(1000);
                user = await fetch_user();
            }
        }
    });
    
    return {
        getUser: function() {
            return fetch_user()
        },
        onPaid: {
            addListener: function(callback) {
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

export default ExtPay;
