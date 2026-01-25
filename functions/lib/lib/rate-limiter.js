"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRateLimiter = createRateLimiter;
const buckets = new Map();
function createRateLimiter({ windowMs, max, message }) {
    return (req, res, next) => {
        const now = Date.now();
        const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ?? req.ip;
        const key = ip || "unknown";
        const entry = buckets.get(key);
        if (!entry || now > entry.resetAt) {
            buckets.set(key, { count: 1, resetAt: now + windowMs });
            return next();
        }
        if (entry.count >= max) {
            const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
            res.setHeader("Retry-After", String(retryAfterSeconds));
            return res.status(429).json({
                success: false,
                error: {
                    code: "RATE_LIMITED",
                    message,
                    details: { retry_after: retryAfterSeconds },
                },
            });
        }
        entry.count += 1;
        buckets.set(key, entry);
        return next();
    };
}
