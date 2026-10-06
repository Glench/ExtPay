// Sign up at https://extensionpay.com to use this library. AGPLv3 licensed.
// WARNING: DON'T USE THIS FILE IN YOUR EXTENSION. USE A FILE FROM THE /dist FOLDER INSTEAD.

import * as browser from 'webextension-polyfill';

class ExtPayEngine {
  host = "https://extensionpay.com";
  extensionUrl = "";

  extPayStorage;
  extPayPages;
  extPayUser;
  extPayLifeCycle;

  constructor(extensionId) {
    this.extensionUrl = `${this.host}/extension/${extensionId}`;

    this.extPayStorage = new ExtPayStorage(this.host, this.extensionUrl);
    this.extPayPages = new ExtPayPages(this.extensionUrl, this.extPayStorage);
    this.extPayUser = new ExtPayUser(this.extensionUrl, this.extPayStorage);

    this.extPayLifeCycle = new ExtPayLifeCycle(this.extPayStorage, this.extPayUser);
    this.extPayLifeCycle.start();
  }

  getApi() {
    return {
      getUser: this.extPayUser.getUser,
      getPlans: this.extPayUser.getPlans,

      // Pages
      openPaymentPage: this.extPayPages.openPaymentPage,
      openTrialPage: this.extPayPages.openTrialPage,
      openLoginPage: this.extPayPages.openLoginPage,

      // Events
      onTrialStarted: {
        addListener: this.extPayUser.onTrialStartedEvent.addListener,
        removeListener: this.extPayUser.onTrialStartedEvent.removeListener,
      },
      onPaid: {
        addListener: this.extPayUser.onPaidEvent.addListener,
        removeListener: this.extPayUser.onPaidEvent.removeListener,
      },
    };
  }
}

class ExtPayStorage {
  host;
  extensionUrl;

  constructor(host, extensionUrl) {
    this.host = host;
    this.extensionUrl = extensionUrl;
  }

  get = async (keys) => {
    try {
      return await browser.storage.sync.get(keys);
    } catch (e) {
      // if sync not available (like with Firefox temp addons), fall back to local
      return await browser.storage.local.get(keys);
    }
  }

  set = async (dict) => {
    try {
      return await browser.storage.sync.set(dict);
    } catch (e) {
      // if sync not available (like with Firefox temp addons), fall back to local
      return await browser.storage.local.set(dict);
    }
  }

  remove = async (keys) => {
    try {
      return await browser.storage.sync.remove(keys);
    } catch (e) {
      // if sync not available (like with Firefox temp addons), fall back to local
      return await browser.storage.local.remove(keys);
    }
  }

  getOrCreateKey = async () => {
    return await this.getKey() ?? await this.createKey();
  }

  getKey = async () => {
    const storage = await this.get(['extensionpay_api_key']);

    if (storage.extensionpay_api_key) {
      return storage.extensionpay_api_key;
    }

    return null;
  }

  createKey = async () => {
    const ext_info = await this.getExtensionInfo();

    const body = {
      development: ext_info.installType === 'development',
    };

    const resp = await fetch(`${this.extensionUrl}/api/new-key`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      throw resp.status, `${this.host}/home`;
    }

    const api_key = await resp.json();
    await this.set({ extensionpay_api_key: api_key });

    return api_key;
  }

  getExtensionInfo = async () => {
    if (browser.management) {
      return browser.management.getSelf();
    }

    if (browser.runtime) {
      const ext_info = await browser.runtime.sendMessage('extpay-extinfo'); // ask background page for ext info

      if (ext_info) {
        return ext_info;
      }

      // Safari doesn't support browser.management for some reason
      const is_dev_mode = !('update_url' in browser.runtime.getManifest());

      return {
        installType: is_dev_mode ? 'development' : 'normal',
      };
    }

    throw 'ExtPay needs to be run in a browser extension context';
  }
}

class ExtPayLifeCycle {
  extPayStorage;
  extPayUser;

  constructor(extPayStorage, extPayUser) {
    this.extPayStorage = extPayStorage;
    this.extPayUser = extPayUser;
  }

  start = () => {
    // For running as a content script. Receive a message from the successful payments page
    // and pass it on to the background page to query if the user has paid.
    if (typeof window !== 'undefined') {
      this.startContentScript();
      this.clearEventStorage();
    } else {
      this.startBackground();
      this.validateSettings();
    }
  }

  startContentScript = () => {
    window.addEventListener('message', (event) => {
      if (event.origin !== 'https://extensionpay.com' && event.source !== window) {
        return;
      }

      if (event.data === 'extpay-fetch-user' || event.data === 'extpay-trial-start') {
        window.postMessage(`${event.data}-received`);
        browser.runtime.sendMessage(event.data);
      }
    });
  }

  startBackground = () => {
    browser.runtime.onMessage.addListener((message, sender, send_response) => {
      switch (message) {
        case "extpay-fetch-user":
          // Only called via extensionpay.com/extension/[extension-id]/paid -> content_script when user successfully pays.
          // It's possible attackers could trigger this but that is basically harmless. It would just query the user.
          return this.extPayUser.pollUserPaid();

        case "extpay-trial-start":
          // no need to poll since the trial confirmation page has already set trialStartedAt
          return this.extPayUser.getUser();

        case "extpay-extinfo":
          // get this message from content scripts which can't access browser.management
          return browser.management?.getSelf();
      }
    });
  }

  clearEventStorage = () => {
    this.extPayUser.onPaidEvent.reset();
    this.extPayUser.onTrialStartedEvent.reset();
  }

  validateSettings = async () => {
    if (!browser.management) {
      return;
    }

    const ext_info = await browser.management.getSelf();

    if (!ext_info.permissions.includes('storage')) {
      const permissions = ext_info.hostPermissions.concat(ext_info.permissions);

      throw `ExtPay Setup Error: please include the "storage" permission in manifest.json["permissions"] or else ExtensionPay won't work correctly.

You can copy and paste this to your manifest.json file to fix this error:

"permissions": [
    ${permissions.map(x => `"    ${x}"`).join(',\n')}${permissions.length > 0 ? ',' : ''}
    "storage"
]
`;
    }
  }
}

class ExtPayPages {
  extensionUrl;
  extPayStorage;

  constructor(extensionUrl, extPayStorage) {
    this.extensionUrl = extensionUrl;
    this.extPayStorage = extPayStorage;
  }

  openPaymentPage = async (plan_nickname) => {
    const apiKey = await this.extPayStorage.getOrCreateKey();

    let url = `${this.extensionUrl}/choose-plan?api_key=${apiKey}`;

    if (plan_nickname) {
      url = `${this.extensionUrl}/choose-plan/${plan_nickname}?api_key=${apiKey}`;
    }

    if (browser.tabs && browser.tabs.create) {
      await browser.tabs.create({ url, active: true });
    } else {
      window.open(url, '_blank');
    }
  }

  openTrialPage = async (period) => {
    // let user have period string like '1 week' e.g. "start your 1 week free trial"
    const apiKey = await this.extPayStorage.getOrCreateKey();

    let url = `${this.extensionUrl}/trial?api_key=${apiKey}`;
    if (period) {
      url += `&period=${period}`;
    }

    this.openPopup(url, 500, 700);
  }

  openLoginPage = async (back = "choose-plan") => {
    const api_key = await this.extPayStorage.getOrCreateKey();
    const url = `${this.extensionUrl}/reactivate?api_key=${api_key}&back=${back}&v2`;
    this.openPopup(url, 500, 800);
  }

  openPopup = async (url, width, height) => {
    if (browser.windows && browser.windows.create) {
      const current_window = await browser.windows.getCurrent();
      // https://stackoverflow.com/a/68456858
      const left = Math.round((current_window.width - width) * 0.5 + current_window.left);
      const top = Math.round((current_window.height - height) * 0.5 + current_window.top);

      try {
        browser.windows.create({
          url,
          type: "popup",
          focused: true,
          width,
          height,
          left,
          top,
        });
      } catch (e) {
        // firefox doesn't support 'focused'
        browser.windows.create({
          url,
          type: "popup",
          width,
          height,
          left,
          top,
        });
      }
    } else {
      // for opening from a content script
      // https://developer.mozilla.org/en-US/docs/Web/API/Window/open
      window.open(
        url,
        undefined,
        `toolbar=no,location=no,directories=no,status=no,menubar=no,width=${width},height=${height},left=450`,
      );
    }
  }
}

class ExtPayUser {
  extensionUrl;
  extPayStorage;
  polling = false;

  onPaidEvent;
  onTrialStartedEvent;
  
  constructor(extensionUrl, extPayStorage) {
    this.extensionUrl = extensionUrl;
    this.extPayStorage = extPayStorage;

    this.onPaidEvent = new ExtPayEvent("extensionpay_event_paid", this.extPayStorage);
    this.onTrialStartedEvent = new ExtPayEvent("extensionpay_event_trial_started", this.extPayStorage);
  }

  getUser = async () => {
    const [storage, apiKey] = await Promise.all([
      this.extPayStorage.get("extensionpay_user"),
      this.extPayStorage.getKey(),
    ]);

    if (!apiKey) {
      return {
        paid: false,
        paidAt: null,
        installedAt: new Date().toISOString(), // sometimes this function gets called before the initial install time can be flushed to storage
        trialStartedAt: null,
      };
    }

    const resp = await fetch(`${this.extensionUrl}/api/v2/user?api_key=${apiKey}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    // TODO: think harder about error states and what users will want (bad connection, server error, id not found)
    if (!resp.ok) {
      const error = await resp.text();
      throw `ExtPay error while fetching user: ${error}`;
    }

    const user_data = await resp.json();

    await this.extPayStorage.set({ extensionpay_user: user_data });

    if (user_data.paidAt) {
      if (!storage.extensionpay_user || (storage.extensionpay_user && !storage.extensionpay_user.paidAt)) {
        this.onPaidEvent.notify(user_data);
      }
    }

    if (user_data.trialStartedAt) {
      if (!storage.extensionpay_user || (storage.extensionpay_user && !storage.extensionpay_user.trialStartedAt)) {
        this.onTrialStartedEvent.notify(user_data);
      }

    }

    return user_data;
  }

  getPlans = async () => {
    const resp = await fetch(`${this.extensionUrl}/api/v2/current-plans`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-type': 'application/json',
      },
    });

    if (!resp.ok) {
      throw `ExtPay: HTTP error while getting plans. Received http code: ${resp.status}`;
    }

    return resp.json();
  }

  pollUserPaid = async () => {
    // keep trying to fetch user in case stripe webhook is late
    if (this.polling) {
      return;
    }

    this.polling = true;

    for (let i = 0; i < 2 * 60; ++i) {
      const user = await this.getUser();

      if (user.paidAt) {
        this.polling = false;
        return user;
      }

      await this.sleep(1000);
    }

    this.polling = false;
  }

  sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

class ExtPayEvent {
  eventName;
  extPayStorage;

  constructor(eventName, extPayStorage) {
    this.eventName = eventName;
    this.extPayStorage = extPayStorage;
  }

  addListener = (callback) => {
    const intervalId = setInterval(async () => {
      const storage = await this.extPayStorage.get(this.eventName);

      if (this.eventName in storage) {
        callback(storage[this.eventName]);
        clearInterval(intervalId);
      }
    }, 1000);

    return intervalId;
  }

  removeListener = (listenerId) => {
    clearInterval(listenerId);
  }

  notify = (value) => {
    const data = {};
    data[this.eventName] = value;

    return this.extPayStorage.set(data);
  }

  reset = () => {
    return this.extPayStorage.remove(this.eventName);
  }
}

export default function ExtPay(extension_id) {
  const extpay = new ExtPayEngine(extension_id);
  const api = extpay.getApi();

  return api;
};
