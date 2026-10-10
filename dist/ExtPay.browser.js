// Browser-context companion to ExtPay.module.js.
//
// ExtPay.module.js assumes it's running inside a browser *extension*
// (content script or background/service worker) and leans on chrome.storage,
// chrome.tabs/chrome.windows, and chrome.runtime message passing.
//
// This module is for the *plain web page* context where none of those extension
// APIs exist. It talks to the same ExtensionPay HTTP endpoints, but persists
// the api key with window.localStorage and opens pages with window.open instead
// of the chrome.* extension APIs.
//
// Only what's needed on a plain page is exposed: creating an api key,
// opening the trial page, and opening the payment page (each of the latter
// two will create a key first if one doesn't exist yet, same as
// ExtPay.module.js).

const STORAGE_KEY = 'extensionpay_api_key';

const ExtPay = (extension_id, options = {}) => {
    const HOST = `https://extensionpay.com`;
    const EXTENSION_URL = `${HOST}/extension/${extension_id}`;

    if (typeof window === 'undefined' || !window.localStorage) {
        throw 'ExtPay needs to be run in a browser page context with access to window.localStorage';
    }

    function get_key() {
        try {
            return window.localStorage.getItem(STORAGE_KEY) ?? null;
        } catch (e) {
            return null;
        }
    }

    function set_key(api_key) {
        window.localStorage.setItem(STORAGE_KEY, api_key);
    }

    function remove_key() {
        window.localStorage.removeItem(STORAGE_KEY);
    }

    async function create_key() {
        const body = {};
        if (options.development) {
            body.development = true;
        }

        const resp = await fetch(`${EXTENSION_URL}/api/new-key`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        if (!resp.ok) {
            throw `ExtPay: HTTP error while creating a new key. Received http code: ${resp.status}`;
        }
        const api_key = await resp.json();
        set_key(api_key);
        return api_key;
    }

    async function get_or_create_key() {
        const existing = get_key();
        if (existing) return existing;
        return await create_key();
    }

    function open_popup(url, width, height) {
        const left = Math.round(
            (window.screen.width - width) * 0.5 +
            (window.screenLeft ?? window.screenX ?? 0),
        );
        const top = Math.round(
            (window.screen.height - height) * 0.5 +
            (window.screenTop ?? window.screenY ?? 0),
        );
        window.open(
            url,
            '_blank',
            `popup=yes,width=${width},height=${height},left=${left},top=${top}`,
        );
    }

    async function open_payment_page(plan_nickname) {
        const api_key = await get_or_create_key();
        let url = `${EXTENSION_URL}/choose-plan?api_key=${api_key}`;
        if (plan_nickname) {
            url = `${EXTENSION_URL}/choose-plan/${plan_nickname}?api_key=${api_key}`;
        }
        window.open(url, '_blank');
    }

    async function open_trial_page(period) {
        // let user have period string like '1 week' e.g. "start your 1 week free trial"
        const api_key = await get_or_create_key();
        let url = `${EXTENSION_URL}/trial?api_key=${api_key}`;
        if (period) {
            url += `&period=${period}`;
        }
        open_popup(url, 500, 700);
    }

    return {
        createKey: create_key,
        getKey: async function () {
            return get_key();
        },
        removeKey: async function () {
            remove_key();
        },
        openTrialPage: open_trial_page,
        openPaymentPage: open_payment_page,
    };
};

export { ExtPay, ExtPay as default };
