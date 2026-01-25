"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCheckout = createCheckout;
exports.verifyWebhookSignature = verifyWebhookSignature;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const PAYCHANGU_BASE_URL = process.env.PAYCHANGU_ENVIRONMENT === "production"
    ? "https://api.paychangu.com"
    : "https://api.paychangu.com/sandbox";
async function createCheckout(params) {
    try {
        const response = await axios_1.default.post(`${PAYCHANGU_BASE_URL}/payment/checkout`, {
            amount: params.amount,
            currency: params.currency,
            email: params.email,
            first_name: params.firstName,
            last_name: params.lastName,
            callback_url: params.callbackUrl,
            return_url: params.returnUrl,
            customization: params.customization,
        }, {
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.PAYCHANGU_SECRET_KEY}`,
            },
        });
        return {
            status: response.data.status,
            checkoutId: response.data.checkout_id,
            checkoutUrl: response.data.checkout_url,
        };
    }
    catch (error) {
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
