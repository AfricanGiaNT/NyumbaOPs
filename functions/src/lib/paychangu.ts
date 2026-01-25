import axios from "axios";
import crypto from "crypto";

const PAYCHANGU_BASE_URL =
  process.env.PAYCHANGU_ENVIRONMENT === "production"
    ? "https://api.paychangu.com"
    : "https://api.paychangu.com/sandbox";

export type PayChanguCheckoutParams = {
  amount: number;
  currency: "MWK" | "GBP";
  email?: string;
  firstName: string;
  lastName: string;
  callbackUrl: string;
  returnUrl: string;
  customization?: {
    title?: string;
    description?: string;
    logo?: string;
  };
};

export type PayChanguCheckoutResponse = {
  status: string;
  checkoutId: string;
  checkoutUrl: string;
};

export async function createCheckout(
  params: PayChanguCheckoutParams,
): Promise<PayChanguCheckoutResponse> {
  try {
    const response = await axios.post(
      `${PAYCHANGU_BASE_URL}/payment/checkout`,
      {
        amount: params.amount,
        currency: params.currency,
        email: params.email,
        first_name: params.firstName,
        last_name: params.lastName,
        callback_url: params.callbackUrl,
        return_url: params.returnUrl,
        customization: params.customization,
      },
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.PAYCHANGU_SECRET_KEY}`,
        },
      },
    );

    return {
      status: response.data.status,
      checkoutId: response.data.checkout_id,
      checkoutUrl: response.data.checkout_url,
    };
  } catch (error: any) {
    // Log error details for debugging but don't expose to client
    const errorDetails = {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    };
    // In production, this should go to a logging service
    if (process.env.NODE_ENV === 'development') {
      console.error("PayChangu checkout error:", errorDetails);
    }
    throw new Error("Failed to create PayChangu checkout");
  }
}

export function verifyWebhookSignature(payload: string, signature: string | undefined): boolean {
  if (!signature || !process.env.PAYCHANGU_WEBHOOK_SECRET) {
    return false;
  }
  const expectedSignature = crypto
    .createHmac("sha256", process.env.PAYCHANGU_WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");
  return signature === expectedSignature;
}
