declare module "extpay" {
  interface Plan {
    unitAmountCents: number;
    currency: string;
    nickname: string | null;
    interval: "month" | "year" | "once";
    intervalCount: number | null;
  }

  interface User {
    /** user.paid is meant to be a simple way to tell if the user should have paid features activated.
     * For subscription payments, paid is only true if subscriptionStatus is active. */
    paid: boolean;

    /** date that the user first paid or null. */
    paidAt: string | null;

    /** The user's email if there is one or `null`. */
    email: string | null;

    /** date the user installed the extension. */
    installedAt: string;

    /** date the user confirmed their free trial. */
    trialStartedAt: string | null;

    plan: Plan | null;

    /** active means the user's subscription is paid-for.
     * past_due means the user's most recent subscription payment has failed (expired card, insufficient funds, etc).
     * canceled means that the user has canceled their subscription and the end of their last paid period has passed. */
    subscriptionStatus?: "active" | "past_due" | "canceled";

    /** date that the user's subscription is set to cancel or did cancel at. */
    subscriptionCancelAt?: string | null;
  }


  interface ExtPay {
    getUser: () => Promise<User>;
    getPlans: () => Promise<Plan[]>;

    openPaymentPage: (planNickname?: string) => Promise<void>;
    openTrialPage: (displayText?: string) => Promise<void>;
    openLoginPage: (back?: "choose-plan" | "trial") => Promise<void>;
    
    onTrialStarted: {
      addListener: (callback: (user: User) => void) => number;
      removeListener: (listenerId: number) => void;
    };
    onPaid: {
      addListener: (callback: (user: User) => void) => number;
      removeListener: (listenerId: number) => void;
    };
  }

  export default function ExtPay(extensionId: string): ExtPay
}
