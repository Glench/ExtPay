
export {};

declare global {
  interface User {
    readonly paid: boolean;
    readonly paidAt: Date | null;
    readonly installedAt: Date;
    readonly trialStartedAt: Date | null;
    readonly subscriptionStatus?: 'active' | 'past_due' | 'canceled';
    readonly subscriptionCancelAt?: Date | null;
    readonly plan?: Record<string, unknown>;
  }

  interface ExtPayInstance {
    getUser(): Promise<User>;
    openPaymentPage(): Promise<void>;
    openLoginPage(): Promise<void>;
    openTrialPage(displayText?: string): Promise<void>;
    getPlans(): Promise<unknown[]>;

    readonly onPaid: {
      addListener(callback: (user: User) => void): void;
    };

    readonly onTrialStarted: {
      addListener(callback: (user: User) => void): void;
    };

    startBackground(): void;

    configUser?(email: string, name?: string): Promise<void>;
  }

  const ExtPay: (extensionId: string) => ExtPayInstance;
}
