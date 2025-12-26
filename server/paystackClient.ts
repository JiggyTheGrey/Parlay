const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

export function getPaystackSecretKey(): string {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('PAYSTACK_SECRET_KEY environment variable is not set');
  }
  return PAYSTACK_SECRET_KEY;
}

export function getPaystackPublicKey(): string {
  const publicKey = process.env.PAYSTACK_PUBLIC_KEY;
  if (!publicKey) {
    throw new Error('PAYSTACK_PUBLIC_KEY environment variable is not set');
  }
  return publicKey;
}

interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    status: string;
    reference: string;
    amount: number;
    currency: string;
    metadata: {
      userId?: string;
      packageId?: string;
      creditsToAward?: string;
    };
  };
}

export async function initializePaystackTransaction(
  email: string,
  amountKobo: number,
  reference: string,
  metadata: Record<string, string>,
  callbackUrl: string
): Promise<PaystackInitializeResponse> {
  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getPaystackSecretKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      amount: amountKobo,
      reference,
      metadata,
      callback_url: callbackUrl,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Paystack initialization failed: ${error}`);
  }

  return response.json();
}

export async function verifyPaystackTransaction(reference: string): Promise<PaystackVerifyResponse> {
  const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${getPaystackSecretKey()}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Paystack verification failed: ${error}`);
  }

  return response.json();
}
