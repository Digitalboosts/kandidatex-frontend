/** Razorpay Checkout for one-time order payments (https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/). */

const SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

/** What Checkout hands back after a successful payment. All three go to /api/subscription/verify. */
export interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  order_id: string;
  /** Smallest currency unit (paise). Must match the order. */
  amount: number;
  currency: string;
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
 * Opens Checkout for an order created by /api/subscription/checkout and
 * resolves with the three values to send to /api/subscription/verify. Rejects
 * with CheckoutDismissed if the user closes it, or an Error if the payment fails.
 */
export async function openOrderCheckout(options: {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
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
      order_id: options.orderId,
      amount: options.amount,
      currency: options.currency,
      name: 'Kandidatex',
      description: options.description,
      prefill: options.prefill,
      theme: { color: '#2563eb' },
      handler: (response) => {
        if (!response.razorpay_payment_id || !response.razorpay_order_id || !response.razorpay_signature) {
          reject(new Error('Razorpay did not return the payment details. If money was taken, it will be confirmed shortly.'));
          return;
        }
        resolve(response);
      },
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
