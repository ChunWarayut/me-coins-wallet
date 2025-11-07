export interface CreatePaymentData {
  amount: number;
  email: string;
  description: string;
  callbackUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export interface Payment {
  id: string;
  status: string;
  amount: number;
  currency: string;
  description?: string;
  qrCodeUrl?: string;
  callbackSignature?: string;
  metadata?: {
    qrCodeUrl?: string;
    callbackUrl?: string;
    cancelUrl?: string;
    [key: string]: any;
  };
}

export const createPayment = async (data: CreatePaymentData): Promise<any> => {
  const response = await fetch('/payments/intents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create payment');
  }

  return response.json();
};

export const getPaymentStatus = async (id: string): Promise<Payment> => {
  const response = await fetch(`/payments/${id}?t=${Date.now()}`, {
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error('Failed to fetch payment status');
  }

  return response.json();
};
