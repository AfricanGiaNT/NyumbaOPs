"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCheckout = createCheckout;
exports.initiateRefund = initiateRefund;
exports.verifyWebhookSignature = verifyWebhookSignature;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const PAYCHANGU_BASE_URL = "https://api.paychangu.com";
async function createCheckout(params) {
    // Detect Firebase emulator environment
    const isEmulator = process.env.FUNCTIONS_EMULATOR === "true" ||
        process.env.FIREBASE_CONFIG?.includes("localhost");
    // In emulator, return mock checkout for testing
    // TEMPORARILY DISABLED: Testing real PayChangu flow
    if (false && isEmulator) {
        const mockCheckoutId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log("🧪 EMULATOR MODE: Returning mock PayChangu checkout", {
            checkoutId: mockCheckoutId,
            amount: params.amount,
            currency: params.currency,
        });
        // Extract bookingId from returnUrl
        const bookingIdMatch = params.returnUrl.match(/bookingId=([^&]+)/);
        const bookingId = bookingIdMatch?.[1] ?? "";
        // Point to mock payment page instead of real PayChangu
        const baseUrl = params.returnUrl.split("/booking-confirmation")[0];
        const mockUrl = `${baseUrl}/mock-payment?bookingId=${bookingId}&checkoutId=${mockCheckoutId}`;
        return {
            status: "success",
            checkoutId: mockCheckoutId,
            checkoutUrl: mockUrl,
        };
    }
    try {
        // Generate unique transaction reference
        const tx_ref = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const response = await axios_1.default.post(`${PAYCHANGU_BASE_URL}/payment`, {
            amount: params.amount,
            currency: params.currency,
            email: params.email,
            first_name: params.firstName,
            last_name: params.lastName,
            callback_url: params.callbackUrl,
            return_url: params.returnUrl,
            tx_ref: tx_ref,
            customization: params.customization,
        }, {
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.PAYCHANGU_SECRET_KEY}`,
            },
        });
        // Log the full response to debug
        console.log("PayChangu API Response:", JSON.stringify(response.data, null, 2));
        // Actual response structure from PayChangu:
        // { status: "success", data: { checkout_url: "...", data: { tx_ref: "..." } } }
        const checkoutUrl = response.data.data?.checkout_url;
        const txRef = response.data.data?.data?.tx_ref || tx_ref;
        if (!checkoutUrl) {
            throw new Error("No checkout URL in PayChangu response");
        }
        return {
            status: response.data.status,
            checkoutId: txRef,
            checkoutUrl: checkoutUrl,
        };
    }
    catch (error) {
        // Log error details for debugging but don't expose to client
        const errorDetails = {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data,
            url: `${PAYCHANGU_BASE_URL}/payment/checkout`,
            hasSecretKey: !!process.env.PAYCHANGU_SECRET_KEY,
        };
        // Always log in emulator for debugging
        console.error("PayChangu checkout error:", JSON.stringify(errorDetails, null, 2));
        throw new Error("Failed to create PayChangu checkout");
    }
}
async function initiateRefund(params) {
    const isEmulator = process.env.FUNCTIONS_EMULATOR === "true" ||
        process.env.FIREBASE_CONFIG?.includes("localhost");
    // TEMPORARILY DISABLED: Testing real PayChangu refunds
    if (false && isEmulator) {
        console.log("🧪 EMULATOR MODE: Mock refund initiated", params);
        return {
            success: true,
            refundId: `mock_refund_${Date.now()}`,
        };
    }
    try {
        const response = await axios_1.default.post(`${PAYCHANGU_BASE_URL}/payment/refund`, {
            checkout_id: params.checkoutId,
            amount: params.amount,
            reason: params.reason,
        }, {
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.PAYCHANGU_SECRET_KEY}`,
            },
        });
        return {
            success: response.data.status === "success",
            refundId: response.data.refund_id,
        };
    }
    catch (error) {
        console.error("PayChangu refund failed:", error.response?.data ?? error.message);
        throw new Error(error.response?.data?.message ?? "Refund failed");
    }
}
function verifyWebhookSignature(payload, signature) {
    if (!signature || !process.env.PAYCHANGU_WEBHOOK_SECRET) {
        return false;
    }
    const expectedSignature = crypto_1.default
        .createHmac("sha256", process.env.PAYCHANGU_WEBHOOK_SECRET)
        .update(payload)
        .digest("hex");
    return signature === expectedSignature;
}
