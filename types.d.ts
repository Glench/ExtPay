declare module "extpay" {
  interface Plan {
    unitAmountCents: number
    currency: string
    nickname: String | null,
    interval: "month" | "year" | "once"
    intervalCount: number | null
  }
  interface User {
    /** user.paid is meant to be a simple way to tell if the user should have paid features activated.
     * For subscription payments, paid is only true if subscriptionStatus is active. */
    paid: boolean

    /** date that the user first paid or null. */
    paidAt: Date | null

    /** date the user installed the extension. */
    installedAt: Date

    /** date the user confirmed their free trial. */
    trialStartedAt: Date | null

    plan: Plan | null

    /** active means the user's subscription is paid-for.
     * past_due means the user's most recent subscription payment has failed (expired card, insufficient funds, etc).
     * canceled means that the user has canceled their subscription and the end of their last paid period has passed. */
    subscriptionStatus?: "active" | "past_due" | "canceled"

    /** date that the user's subscription is set to cancel or did cancel at. */
    subscriptionCancelAt?: Date | null
  }

  interface Plan {
    unitAmountCents: number;
    currency: string;
    nickname: string | null;
    interval: 'month' | 'year' | 'once';
    intervalCount: number | null;
  }
    

  interface ExtPay {
    getUser: () => Promise<User>
    getPlans: () => Promise<Plan[]>
    onPaid: {
      addListener: (cb: (user: User) => void) => void
    }
    openPaymentPage: (planNickname?: string) => Promise<void>
    openLoginPage: () => Promise<void>
    openTrialPage: (displayText?: string) => Promise<void>
    onTrialStarted: {
      addListener: (cb: (user: User) => void) => void
    }
    startBackground: () => void
  }

  export default function ExtPay(extensionId: string): ExtPay
}
