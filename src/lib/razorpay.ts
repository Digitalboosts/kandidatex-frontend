/** Razorpay Checkout (https://razorpay.com/docs/payments/subscriptions/integration-guide/). */

const SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

export interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  subscription_id: string;
  name?: string;
  description?: string;
  prefill?: { name?: string; email?: string };
  theme?: { color?: string };
  handler: (response: RazorpaySuccess) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: 'payment.failed', callback: (response: { error?: { description?: string } }) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

/** Thrown when the user closes Checkout without paying. Not an error to show. */
export class CheckoutDismissed extends Error {
  constructor() {
    super('Checkout closed');
  }
}

let loading: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loading = null;
      script.remove();
      reject(new Error('Could not load Razorpay Checkout. Check your connection or ad blocker, then try again.'));
    };
    document.body.appendChild(script);
  });
  return loading;
}

/**
 * Opens Checkout for a subscription and resolves with the three values to send
 * to /api/subscription/verify. Rejects with CheckoutDismissed if the user
 * closes it, or an Error if the payment fails.
 */
export async function openSubscriptionCheckout(options: {
  keyId: string;
  subscriptionId: string;
  description: string;
  prefill?: { name?: string; email?: string };
}): Promise<RazorpaySuccess> {
  await loadScript();
  const Razorpay = window.Razorpay;
  if (!Razorpay) throw new Error('Razorpay Checkout did not load.');

  return new Promise<RazorpaySuccess>((resolve, reject) => {
    let failure: string | null = null;
    const checkout = new Razorpay({
      key: options.keyId,
      subscription_id: options.subscriptionId,
      name: 'Kandidatex',
      description: options.description,
      prefill: options.prefill,
      theme: { color: '#2563eb' },
      handler: resolve,
      modal: {
        // A failed attempt keeps Checkout open so the user can retry; only report it if they then give up.
        ondismiss: () => reject(failure ? new Error(failure) : new CheckoutDismissed()),
      },
    });
    checkout.on('payment.failed', (response) => {
      failure = response.error?.description ?? 'The payment failed.';
    });
    checkout.open();
  });
}
