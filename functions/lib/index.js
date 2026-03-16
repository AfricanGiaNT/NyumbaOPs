"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduledCalendarSync = exports.api = exports.cleanupExpiredIntents = exports.expireInquiries = void 0;
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_1 = require("./lib/auth");
const firebase_1 = require("./lib/firebase");
const booking_utils_1 = require("./lib/booking-utils");
const paychangu_1 = require("./lib/paychangu");
const rate_limiter_1 = require("./lib/rate-limiter");
const audit_1 = require("./lib/audit");
const errors_1 = require("./lib/errors");
const sync_engine_1 = require("./calendar-sync/sync-engine");
const ical_parser_1 = require("./calendar-sync/ical-parser");
const ical_generator_1 = require("./calendar-sync/ical-generator");
const email_1 = require("./lib/email");
const inquiryRateLimiter = (0, rate_limiter_1.createRateLimiter)({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.INQUIRY_RATE_LIMIT ?? 5),
    message: "Too many inquiries. Please try again in 15 minutes.",
});
const publicApiRateLimiter = (0, rate_limiter_1.createRateLimiter)({
    windowMs: 60 * 1000,
    max: 60,
    message: "Too many requests. Please try again later.",
});
const bookingRateLimiter = (0, rate_limiter_1.createRateLimiter)({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: "Too many booking attempts. Please try again in an hour.",
});
const app = (0, express_1.default)();
// CORS configuration - restrict to known domains
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.PUBLIC_URL,
    process.env.DASHBOARD_URL,
].filter(Boolean);
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));
app.use("/v1/public/webhooks/paychangu", express_1.default.raw({ type: "application/json" }));
app.use(express_1.default.json());
const apiRouter = express_1.default.Router();
const publicRouter = express_1.default.Router();
const protectedRouter = express_1.default.Router();
const normalizePropertyStatus = (status) => {
    const normalized = typeof status === "string" ? status.toUpperCase() : "";
    if (normalized === "ACTIVE" || normalized === "INACTIVE" || normalized === "MAINTENANCE") {
        return normalized;
    }
    return "ACTIVE";
};
protectedRouter.use(auth_1.verifyFirebaseToken);
// ---- Public endpoints ----
publicRouter.get("/properties", publicApiRateLimiter, (0, errors_1.asyncHandler)(async (req, res) => {
    const featured = req.query.featured === "true";
    const limit = featured ? 6 : Number(req.query.limit ?? 10);
    const offset = Number(req.query.offset ?? 0);
    const snapshot = await firebase_1.db
        .collection("properties")
        .orderBy("createdAt", "desc")
        .get();
    const allDocs = snapshot.docs.filter((doc) => {
        const status = String(doc.data()?.status ?? "").toUpperCase();
        return status === "ACTIVE";
    });
    const paginatedDocs = allDocs.slice(offset, offset + limit);
    const data = paginatedDocs.map((doc) => {
        const payload = doc.data();
        const images = (payload.images ?? []);
        const cover = images.find((image) => image.isCover) ?? images[0];
        return {
            id: doc.id,
            name: payload.name,
            location: payload.location ?? null,
            bedrooms: payload.bedrooms,
            bathrooms: payload.bathrooms,
            maxGuests: payload.maxGuests,
            nightlyRate: payload.nightlyRate ?? null,
            currency: payload.currency,
            status: payload.status,
            coverImageUrl: cover?.url ?? null,
            coverImageAlt: cover?.alt ?? null,
            amenities: payload.amenities ?? [],
        };
    });
    return res.json({
        success: true,
        data,
        meta: {
            total: allDocs.length,
            limit,
            offset,
        },
    });
}));
publicRouter.get("/properties/:id", publicApiRateLimiter, (0, errors_1.asyncHandler)(async (req, res) => {
    const doc = await firebase_1.db.collection("properties").doc(req.params.id).get();
    if (!doc.exists) {
        return res.status(404).json({ message: "Property not found" });
    }
    const payload = doc.data();
    if (String(payload?.status ?? "").toUpperCase() !== "ACTIVE") {
        return res.status(404).json({ message: "Property not found" });
    }
    return res.json({
        success: true,
        data: {
            id: doc.id,
            name: payload?.name,
            location: payload?.location ?? null,
            bedrooms: payload?.bedrooms,
            bathrooms: payload?.bathrooms,
            maxGuests: payload?.maxGuests,
            nightlyRate: payload?.nightlyRate ?? null,
            currency: payload?.currency,
            status: payload?.status,
            images: payload?.images ?? [],
            amenities: payload?.amenities ?? [],
        },
    });
}));
publicRouter.post("/inquiries", inquiryRateLimiter, async (req, res) => {
    const payload = req.body ?? {};
    if (!payload.propertyId ||
        !payload.guestName ||
        !payload.guestPhone ||
        !payload.checkInDate ||
        !payload.checkOutDate ||
        !payload.numberOfGuests) {
        return res.status(400).json({
            success: false,
            error: { code: "VALIDATION_ERROR", message: "Missing required fields" },
        });
    }
    const checkIn = new Date(payload.checkInDate);
    const checkOut = new Date(payload.checkOutDate);
    if (!(checkIn < checkOut)) {
        return res.status(400).json({
            success: false,
            error: { code: "INVALID_DATE_RANGE", message: "Check-out must be after check-in" },
        });
    }
    const propertyDoc = await firebase_1.db.collection("properties").doc(payload.propertyId).get();
    if (!propertyDoc.exists || propertyDoc.data()?.status !== "ACTIVE") {
        return res.status(404).json({
            success: false,
            error: { code: "PROPERTY_NOT_FOUND", message: "Property not found" },
        });
    }
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const docRef = await firebase_1.db.collection("inquiries").add({
        propertyId: payload.propertyId,
        guestName: payload.guestName,
        guestEmail: payload.guestEmail ?? null,
        guestPhone: payload.guestPhone,
        checkInDate: payload.checkInDate,
        checkOutDate: payload.checkOutDate,
        numberOfGuests: payload.numberOfGuests,
        message: payload.message ?? null,
        status: "NEW",
        expiresAt,
        bookingId: null,
        createdAt: now,
        updatedAt: now,
    });
    const created = await docRef.get();
    return res.json({
        success: true,
        data: { id: docRef.id, ...created.data() },
    });
});
// ---- Public Booking Flow ----
publicRouter.get("/properties/:propertyId/availability", publicApiRateLimiter, (0, errors_1.asyncHandler)(async (req, res) => {
    const { propertyId } = req.params;
    const checkInDate = req.query.checkInDate;
    const checkOutDate = req.query.checkOutDate;
    if (!checkInDate || !checkOutDate) {
        throw new errors_1.AppError("VALIDATION_ERROR", "checkInDate and checkOutDate are required", 400);
    }
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
        throw new errors_1.AppError("VALIDATION_ERROR", "Invalid date format", 400);
    }
    if (checkIn < today) {
        throw new errors_1.AppError("VALIDATION_ERROR", "Check-in date cannot be in the past", 400);
    }
    if (checkOut <= checkIn) {
        throw new errors_1.AppError("VALIDATION_ERROR", "Check-out must be after check-in", 400);
    }
    const propertyDoc = await firebase_1.db.collection("properties").doc(propertyId).get();
    if (!propertyDoc.exists || propertyDoc.data()?.status !== "ACTIVE") {
        throw new errors_1.AppError("PROPERTY_NOT_FOUND", "Property not found", 404);
    }
    const property = propertyDoc.data();
    const nightlyRate = typeof property.nightlyRate === "number" ? property.nightlyRate : 0;
    const currency = (property.currency ?? "MWK");
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    if (nights < 1) {
        throw new errors_1.AppError("VALIDATION_ERROR", "Minimum booking is 1 night", 400);
    }
    const snapshot = await firebase_1.db.collection("bookings")
        .where("propertyId", "==", propertyId)
        .where("status", "in", ["PENDING", "CONFIRMED", "CHECKED_IN"])
        .get();
    const now = Date.now();
    const STALE_PENDING_MS = 30 * 60 * 1000; // 30 minutes
    const overlaps = snapshot.docs.filter((doc) => {
        const d = doc.data();
        // Skip stale PENDING bookings (unpaid after 30 min)
        if (d.status === "PENDING" && d.paymentStatus === "UNPAID") {
            const createdAt = d.createdAt ? new Date(d.createdAt).getTime() : 0;
            if (now - createdAt > STALE_PENDING_MS) {
                return false;
            }
        }
        return new Date(d.checkInDate) < checkOut && new Date(d.checkOutDate) > checkIn;
    });
    return res.json({
        success: true,
        data: {
            available: overlaps.length === 0,
            propertyId,
            propertyName: property.name,
            checkInDate,
            checkOutDate,
            nights,
            nightlyRate,
            currency,
            totalAmount: nights * nightlyRate,
            maxGuests: property.maxGuests ?? 1,
        },
    });
}));
// Blocked dates endpoint - returns booked date ranges for calendar UI
publicRouter.get("/properties/:propertyId/blocked-dates", publicApiRateLimiter, (0, errors_1.asyncHandler)(async (req, res) => {
    const { propertyId } = req.params;
    const propertyDoc = await firebase_1.db.collection("properties").doc(propertyId).get();
    if (!propertyDoc.exists || propertyDoc.data()?.status !== "ACTIVE") {
        throw new errors_1.AppError("PROPERTY_NOT_FOUND", "Property not found", 404);
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Get confirmed/checked-in bookings for this property
    const snapshot = await firebase_1.db.collection("bookings")
        .where("propertyId", "==", propertyId)
        .where("status", "in", ["CONFIRMED", "CHECKED_IN"])
        .get();
    const blockedRanges = snapshot.docs
        .map((doc) => {
        const d = doc.data();
        return {
            checkInDate: d.checkInDate,
            checkOutDate: d.checkOutDate,
        };
    })
        .filter((range) => new Date(range.checkOutDate) >= today);
    // Also include active (non-expired) payment intents that hold dates
    const intentSnapshot = await firebase_1.db.collection("payment_intents")
        .where("propertyId", "==", propertyId)
        .where("status", "==", "PENDING")
        .get();
    const now = new Date();
    for (const doc of intentSnapshot.docs) {
        const intent = doc.data();
        if (new Date(intent.expiresAt) > now && new Date(intent.checkOutDate) >= today) {
            blockedRanges.push({
                checkInDate: intent.checkInDate,
                checkOutDate: intent.checkOutDate,
            });
        }
    }
    return res.json({
        success: true,
        data: { propertyId, blockedRanges },
    });
}));
// New reserve-on-payment endpoint - creates payment intent instead of booking
publicRouter.post("/bookings/initiate", bookingRateLimiter, (0, errors_1.asyncHandler)(async (req, res) => {
    const payload = req.body ?? {};
    // Validate required fields
    if (!payload.propertyId || !payload.checkInDate || !payload.checkOutDate ||
        !payload.guestName || !payload.guestEmail || !payload.guestPhone) {
        throw new errors_1.AppError("VALIDATION_ERROR", "Missing required fields: propertyId, checkInDate, checkOutDate, guestName, guestEmail, guestPhone", 400);
    }
    // Validate dates
    const checkIn = new Date(payload.checkInDate);
    const checkOut = new Date(payload.checkOutDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
        throw new errors_1.AppError("VALIDATION_ERROR", "Invalid date format", 400);
    }
    if (checkIn < today) {
        throw new errors_1.AppError("VALIDATION_ERROR", "Check-in date cannot be in the past", 400);
    }
    if (checkOut <= checkIn) {
        throw new errors_1.AppError("VALIDATION_ERROR", "Check-out must be after check-in", 400);
    }
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    if (nights < 1) {
        throw new errors_1.AppError("VALIDATION_ERROR", "Minimum booking is 1 night", 400);
    }
    // Get property details
    const propertyDoc = await firebase_1.db.collection("properties").doc(payload.propertyId).get();
    if (!propertyDoc.exists || propertyDoc.data()?.status !== "ACTIVE") {
        throw new errors_1.AppError("PROPERTY_NOT_FOUND", "Property not found", 404);
    }
    const property = propertyDoc.data();
    const nightlyRate = typeof property.nightlyRate === "number" ? property.nightlyRate : 0;
    const currency = (property.currency ?? "MWK");
    const totalAmount = nights * nightlyRate;
    if (totalAmount <= 0) {
        throw new errors_1.AppError("VALIDATION_ERROR", "Property pricing not configured", 400);
    }
    // Check availability (including active payment intents)
    try {
        await ensurePropertyAvailableWithIntents(payload.propertyId, payload.checkInDate, payload.checkOutDate);
    }
    catch (error) {
        throw new errors_1.AppError("NOT_AVAILABLE", error.message, 409);
    }
    const numberOfGuests = Number(payload.numberOfGuests ?? 1);
    if (property.maxGuests && numberOfGuests > property.maxGuests) {
        throw new errors_1.AppError("VALIDATION_ERROR", `Maximum ${property.maxGuests} guests allowed`, 400);
    }
    const now = new Date().toISOString();
    // Generate PayChangu checkout
    const nameParts = String(payload.guestName).trim().split(" ");
    const firstName = nameParts[0] ?? "Guest";
    const lastName = nameParts.slice(1).join(" ") || firstName;
    const publicUrl = process.env.PUBLIC_URL ?? "http://localhost:3000";
    // Create payment intent FIRST so we have a real ID for the redirect URLs
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min expiry
    const intentRef = await firebase_1.db.collection("payment_intents").add({
        propertyId: payload.propertyId,
        checkInDate: payload.checkInDate,
        checkOutDate: payload.checkOutDate,
        guestName: payload.guestName,
        guestEmail: payload.guestEmail,
        guestPhone: payload.guestPhone,
        numberOfGuests,
        notes: payload.notes ?? null,
        totalAmount,
        currency,
        paychanguCheckoutId: null,
        status: "PENDING",
        expiresAt,
        createdAt: now,
        updatedAt: now,
    });
    const confirmationUrl = `${publicUrl}/booking-confirmation?intentId=${intentRef.id}`;
    const checkoutData = await (0, paychangu_1.createCheckout)({
        amount: totalAmount,
        currency,
        email: payload.guestEmail,
        firstName,
        lastName,
        callbackUrl: confirmationUrl,
        returnUrl: `${confirmationUrl}&status=failed`,
        customization: {
            title: `Payment for ${property.name ?? "Booking"}`,
            description: `${nights} night${nights > 1 ? "s" : ""} – ${payload.checkInDate} to ${payload.checkOutDate}`,
            logo: property.images?.[0]?.url,
        },
    });
    // Store the PayChangu checkout ID on the intent
    await intentRef.update({ paychanguCheckoutId: checkoutData.checkoutId });
    await (0, audit_1.logAudit)("CREATE", "PaymentIntent", intentRef.id, "GUEST", {
        propertyId: payload.propertyId,
        guestEmail: payload.guestEmail,
        checkoutId: checkoutData.checkoutId,
    });
    return res.json({
        success: true,
        data: {
            intentId: intentRef.id,
            checkoutUrl: checkoutData.checkoutUrl,
            totalAmount,
            currency,
            expiresAt,
        },
    });
}));
// @deprecated Use POST /bookings/initiate for new public bookings
publicRouter.post("/bookings", bookingRateLimiter, (0, errors_1.asyncHandler)(async (req, res) => {
    const payload = req.body ?? {};
    if (!payload.propertyId || !payload.checkInDate || !payload.checkOutDate ||
        !payload.guestName || !payload.guestEmail || !payload.guestPhone) {
        throw new errors_1.AppError("VALIDATION_ERROR", "Missing required fields: propertyId, checkInDate, checkOutDate, guestName, guestEmail, guestPhone", 400);
    }
    const checkIn = new Date(payload.checkInDate);
    const checkOut = new Date(payload.checkOutDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
        throw new errors_1.AppError("VALIDATION_ERROR", "Invalid date format", 400);
    }
    if (checkIn < today) {
        throw new errors_1.AppError("VALIDATION_ERROR", "Check-in date cannot be in the past", 400);
    }
    if (checkOut <= checkIn) {
        throw new errors_1.AppError("VALIDATION_ERROR", "Check-out must be after check-in", 400);
    }
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    if (nights < 1) {
        throw new errors_1.AppError("VALIDATION_ERROR", "Minimum booking is 1 night", 400);
    }
    const propertyDoc = await firebase_1.db.collection("properties").doc(payload.propertyId).get();
    if (!propertyDoc.exists || propertyDoc.data()?.status !== "ACTIVE") {
        throw new errors_1.AppError("PROPERTY_NOT_FOUND", "Property not found", 404);
    }
    const property = propertyDoc.data();
    const nightlyRate = typeof property.nightlyRate === "number" ? property.nightlyRate : 0;
    const currency = (property.currency ?? "MWK");
    const totalAmount = nights * nightlyRate;
    if (totalAmount <= 0) {
        throw new errors_1.AppError("VALIDATION_ERROR", "Property pricing not configured", 400);
    }
    // Auto-expire stale PENDING+UNPAID bookings for this property to free blocked dates
    const staleSnapshot = await firebase_1.db.collection("bookings")
        .where("propertyId", "==", payload.propertyId)
        .where("status", "==", "PENDING")
        .get();
    const TWO_MIN = 2 * 60 * 1000;
    const staleNow = Date.now();
    for (const doc of staleSnapshot.docs) {
        const d = doc.data();
        if (d.paymentStatus === "UNPAID") {
            const created = d.createdAt ? new Date(d.createdAt).getTime() : 0;
            if (staleNow - created > TWO_MIN) {
                await doc.ref.update({ status: "CANCELLED", notes: "Auto-expired: unpaid", updatedAt: new Date().toISOString() });
            }
        }
    }
    try {
        await ensurePropertyAvailable(payload.propertyId, payload.checkInDate, payload.checkOutDate);
    }
    catch (error) {
        throw new errors_1.AppError("NOT_AVAILABLE", error.message, 409);
    }
    const numberOfGuests = Number(payload.numberOfGuests ?? 1);
    if (property.maxGuests && numberOfGuests > property.maxGuests) {
        throw new errors_1.AppError("VALIDATION_ERROR", `Maximum ${property.maxGuests} guests allowed`, 400);
    }
    const now = new Date().toISOString();
    // Find or create guest by email
    let guestId;
    const existingGuests = await firebase_1.db.collection("guests")
        .where("email", "==", payload.guestEmail)
        .limit(1)
        .get();
    if (!existingGuests.empty) {
        guestId = existingGuests.docs[0].id;
        await existingGuests.docs[0].ref.update({
            name: payload.guestName,
            phone: payload.guestPhone,
            updatedAt: now,
        });
    }
    else {
        const guestRef = await firebase_1.db.collection("guests").add({
            name: payload.guestName,
            email: payload.guestEmail,
            phone: payload.guestPhone,
            source: "WEBSITE",
            createdAt: now,
            updatedAt: now,
        });
        guestId = guestRef.id;
    }
    // Create booking
    const bookingRef = await firebase_1.db.collection("bookings").add({
        guestId,
        propertyId: payload.propertyId,
        status: "PENDING",
        checkInDate: payload.checkInDate,
        checkOutDate: payload.checkOutDate,
        numberOfGuests,
        nights,
        totalAmount,
        amountPaid: 0,
        paymentStatus: "UNPAID",
        currency,
        notes: payload.notes ?? null,
        source: "WEBSITE",
        createdBy: "GUEST",
        createdAt: now,
        updatedAt: now,
    });
    await (0, audit_1.logAudit)("CREATE", "Booking", bookingRef.id, "GUEST", {
        source: "WEBSITE",
        guestEmail: payload.guestEmail,
    });
    // Generate PayChangu payment link
    const nameParts = String(payload.guestName).trim().split(" ");
    const firstName = nameParts[0] ?? "Guest";
    const lastName = nameParts.slice(1).join(" ") || firstName;
    const publicUrl = process.env.PUBLIC_URL ?? "http://localhost:3000";
    const confirmationUrl = `${publicUrl}/booking-confirmation?bookingId=${bookingRef.id}`;
    const checkoutData = await (0, paychangu_1.createCheckout)({
        amount: totalAmount,
        currency,
        email: payload.guestEmail,
        firstName,
        lastName,
        callbackUrl: confirmationUrl,
        returnUrl: `${confirmationUrl}&status=failed`,
        customization: {
            title: `Payment for ${property.name ?? "Booking"}`,
            description: `${nights} night${nights > 1 ? "s" : ""} – ${payload.checkInDate} to ${payload.checkOutDate}`,
            logo: property.images?.[0]?.url,
        },
    });
    // Create payment record
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const paymentRef = await firebase_1.db.collection("payments").add({
        bookingId: bookingRef.id,
        amount: totalAmount,
        currency,
        method: "MOBILE_MONEY",
        status: "PENDING",
        reference: null,
        paychanguReference: null,
        paychanguCheckoutId: checkoutData.checkoutId,
        paymentLink: checkoutData.checkoutUrl,
        paymentLinkExpiresAt: expiresAt,
        notes: "Public website booking",
        createdBy: "GUEST",
        createdAt: now,
        updatedAt: now,
    });
    await (0, audit_1.logAudit)("CREATE", "Payment", paymentRef.id, "GUEST", {
        bookingId: bookingRef.id,
        checkoutId: checkoutData.checkoutId,
    });
    // Send booking confirmation email (fire-and-forget)
    (0, email_1.sendBookingConfirmation)({
        guestEmail: payload.guestEmail,
        guestName: payload.guestName,
        bookingId: bookingRef.id,
        propertyName: property.name ?? "Property",
        checkInDate: payload.checkInDate,
        checkOutDate: payload.checkOutDate,
        nights,
        totalAmount,
        currency,
        paymentLink: checkoutData.checkoutUrl,
    }).catch((err) => console.error("Failed to send booking email:", err));
    return res.json({
        success: true,
        data: {
            bookingId: bookingRef.id,
            guestId,
            paymentId: paymentRef.id,
            checkoutUrl: checkoutData.checkoutUrl,
            totalAmount,
            currency,
            expiresAt,
        },
    });
}));
publicRouter.get("/bookings/:bookingId", publicApiRateLimiter, (0, errors_1.asyncHandler)(async (req, res) => {
    const bookingDoc = await firebase_1.db.collection("bookings").doc(req.params.bookingId).get();
    if (!bookingDoc.exists) {
        throw new errors_1.AppError("BOOKING_NOT_FOUND", "Booking not found", 404);
    }
    const booking = bookingDoc.data();
    // Fetch property name and image
    let propertyName = "Property";
    let propertyImage = null;
    if (booking.propertyId) {
        const propDoc = await firebase_1.db.collection("properties").doc(booking.propertyId).get();
        if (propDoc.exists) {
            const propData = propDoc.data();
            propertyName = propData.name ?? "Property";
            const images = (propData.images ?? []);
            const cover = images.find((img) => img.isCover) ?? images[0];
            propertyImage = cover?.url ?? null;
        }
    }
    // Fetch guest name
    let guestName = "Guest";
    if (booking.guestId) {
        const guestDoc = await firebase_1.db.collection("guests").doc(booking.guestId).get();
        if (guestDoc.exists) {
            guestName = guestDoc.data()?.name ?? "Guest";
        }
    }
    // Fetch latest payment status
    const paymentsSnap = await firebase_1.db.collection("payments")
        .where("bookingId", "==", req.params.bookingId)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();
    const latestPayment = paymentsSnap.empty ? null : paymentsSnap.docs[0].data();
    return res.json({
        success: true,
        data: {
            id: bookingDoc.id,
            propertyName,
            propertyImage,
            guestName,
            checkInDate: booking.checkInDate,
            checkOutDate: booking.checkOutDate,
            numberOfGuests: booking.numberOfGuests ?? 1,
            nights: booking.nights ?? null,
            totalAmount: booking.totalAmount ?? 0,
            amountPaid: booking.amountPaid ?? 0,
            currency: booking.currency ?? "MWK",
            paymentStatus: booking.paymentStatus ?? "UNPAID",
            status: booking.status,
            paymentLink: latestPayment?.paymentLink ?? null,
            paymentLinkExpiresAt: latestPayment?.paymentLinkExpiresAt ?? null,
            createdAt: booking.createdAt,
        },
    });
}));
publicRouter.post("/bookings/:bookingId/cancel", publicApiRateLimiter, (0, errors_1.asyncHandler)(async (req, res) => {
    const { guestEmail, reason } = req.body ?? {};
    if (!guestEmail) {
        throw new errors_1.AppError("VALIDATION_ERROR", "guestEmail is required for verification", 400);
    }
    const bookingDoc = await firebase_1.db.collection("bookings").doc(req.params.bookingId).get();
    if (!bookingDoc.exists) {
        throw new errors_1.AppError("BOOKING_NOT_FOUND", "Booking not found", 404);
    }
    const booking = bookingDoc.data();
    // Verify email matches
    let guestEmailOnFile = null;
    if (booking.guestId) {
        const guestDoc = await firebase_1.db.collection("guests").doc(booking.guestId).get();
        guestEmailOnFile = guestDoc.exists ? guestDoc.data()?.email ?? null : null;
    }
    if (!guestEmailOnFile || guestEmailOnFile.toLowerCase() !== guestEmail.toLowerCase()) {
        throw new errors_1.AppError("UNAUTHORIZED", "Email does not match booking", 403);
    }
    if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
        throw new errors_1.AppError("INVALID_STATUS", `Cannot cancel a booking with status ${booking.status}`, 400);
    }
    // Cancellation policy: calculate refund
    const checkInDate = new Date(booking.checkInDate);
    const now = new Date();
    const hoursUntilCheckIn = (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    const amountPaid = typeof booking.amountPaid === "number" ? booking.amountPaid : 0;
    let refundAmount = 0;
    let refundNote = "";
    if (hoursUntilCheckIn >= 48) {
        refundAmount = amountPaid;
        refundNote = "Full refund – cancelled 48+ hours before check-in";
    }
    else if (hoursUntilCheckIn >= 24) {
        refundAmount = Math.floor(amountPaid * 0.5);
        refundNote = "50% refund – cancelled 24-48 hours before check-in";
    }
    else {
        refundAmount = 0;
        refundNote = "No refund – cancelled less than 24 hours before check-in";
    }
    const nowStr = now.toISOString();
    await bookingDoc.ref.update({
        status: "CANCELLED",
        cancellationReason: reason ?? null,
        cancellationRefundAmount: refundAmount,
        cancellationRefundNote: refundNote,
        cancelledAt: nowStr,
        updatedAt: nowStr,
    });
    await (0, audit_1.logAudit)("UPDATE", "Booking", bookingDoc.id, "GUEST", {
        action: "CANCEL",
        refundAmount,
        reason: reason ?? null,
    });
    // Fetch property name for email
    let propertyName = "Property";
    if (booking.propertyId) {
        const propDoc = await firebase_1.db.collection("properties").doc(booking.propertyId).get();
        if (propDoc.exists) {
            propertyName = propDoc.data()?.name ?? "Property";
        }
    }
    // Send cancellation email (fire-and-forget)
    (0, email_1.sendCancellationConfirmation)({
        guestEmail,
        guestName: guestEmailOnFile ? (await firebase_1.db.collection("guests").doc(booking.guestId).get()).data()?.name ?? "Guest" : "Guest",
        bookingId: bookingDoc.id,
        propertyName,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        refundAmount,
        currency: booking.currency ?? "MWK",
    }).catch((err) => console.error("Failed to send cancellation email:", err));
    return res.json({
        success: true,
        data: {
            bookingId: bookingDoc.id,
            status: "CANCELLED",
            refundAmount,
            refundNote,
            currency: booking.currency ?? "MWK",
        },
    });
}));
publicRouter.post("/uploads", (0, errors_1.asyncHandler)(async (req, res) => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/c5f540ce-21d1-4d7f-896a-2f6702ebbfa3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'index.ts:198', message: 'Upload endpoint hit', data: { body: req.body, contentType: req.headers['content-type'] }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'D' }) }).catch(() => { });
    // #endregion
    const { propertyId, filename, contentType, alt, isCover, sortOrder } = req.body ?? {};
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/c5f540ce-21d1-4d7f-896a-2f6702ebbfa3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'index.ts:205', message: 'Extracted request data', data: { propertyId, filename, contentType, alt, isCover, sortOrder }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'D' }) }).catch(() => { });
    // #endregion
    if (!propertyId || !filename || !contentType) {
        throw new errors_1.AppError('VALIDATION_ERROR', 'Missing required fields');
    }
    const propertyDoc = await firebase_1.db.collection("properties").doc(propertyId).get();
    if (!propertyDoc.exists) {
        throw new errors_1.AppError('PROPERTY_NOT_FOUND', 'Property not found', 404);
    }
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/c5f540ce-21d1-4d7f-896a-2f6702ebbfa3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'index.ts:221', message: 'Env vars before bucket', data: { FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET, FIREBASE_STORAGE_EMULATOR_HOST: process.env.FIREBASE_STORAGE_EMULATOR_HOST, FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'C' }) }).catch(() => { });
    // #endregion
    // Get bucket - use default if not specified
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET || "nyumbaops.appspot.com";
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/c5f540ce-21d1-4d7f-896a-2f6702ebbfa3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'index.ts:229', message: 'Bucket name resolved', data: { bucketName }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'C' }) }).catch(() => { });
    // #endregion
    const bucket = firebase_1.storage.bucket(bucketName);
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/c5f540ce-21d1-4d7f-896a-2f6702ebbfa3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'index.ts:236', message: 'Bucket object created', data: { bucketExists: !!bucket, bucketName: bucket?.name }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'A' }) }).catch(() => { });
    // #endregion
    if (!bucket) {
        throw new errors_1.AppError('STORAGE_ERROR', `Storage bucket not configured. Set FIREBASE_STORAGE_BUCKET environment variable or ensure storage emulator is running.`, 500);
    }
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(contentType)) {
        throw new errors_1.AppError('INVALID_FILE_TYPE', 'Only JPEG, PNG, and WebP images are allowed');
    }
    const safeName = String(filename).toLowerCase().replace(/[^a-z0-9.-]+/g, "-");
    const key = `properties/${propertyId}/${Date.now()}-${safeName}`;
    const file = bucket.file(key);
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/c5f540ce-21d1-4d7f-896a-2f6702ebbfa3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'index.ts:251', message: 'Before URL generation', data: { key, safeName, hasEmulatorHost: !!process.env.FIREBASE_STORAGE_EMULATOR_HOST }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'B', runId: 'post-fix' }) }).catch(() => { });
    // #endregion
    let uploadUrl;
    // Check if we're in emulator mode
    const isEmulator = !!process.env.FIREBASE_STORAGE_EMULATOR_HOST;
    if (isEmulator) {
        // Emulator doesn't support signed URLs - use direct HTTP URL
        const emulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST || '127.0.0.1:9199';
        uploadUrl = `http://${emulatorHost}/upload/storage/v1/b/${bucket.name}/o?name=${encodeURIComponent(key)}`;
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/c5f540ce-21d1-4d7f-896a-2f6702ebbfa3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'index.ts:270', message: 'Emulator upload URL created', data: { uploadUrl, emulatorHost }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'B', runId: 'post-fix' }) }).catch(() => { });
        // #endregion
    }
    else {
        // Production: use signed URLs
        try {
            [uploadUrl] = await file.getSignedUrl({
                action: "write",
                expires: Date.now() + 15 * 60 * 1000,
                contentType,
            });
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/c5f540ce-21d1-4d7f-896a-2f6702ebbfa3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'index.ts:284', message: 'Production signed URL created', data: { uploadUrlLength: uploadUrl?.length }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'B', runId: 'post-fix' }) }).catch(() => { });
            // #endregion
        }
        catch (error) {
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/c5f540ce-21d1-4d7f-896a-2f6702ebbfa3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'index.ts:290', message: 'getSignedUrl failed', data: { errorMessage: error instanceof Error ? error.message : 'unknown' }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'B', runId: 'post-fix' }) }).catch(() => { });
            // #endregion
            console.error('Failed to generate signed URL:', error);
            throw new errors_1.AppError('STORAGE_ERROR', `Failed to generate upload URL. ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    // For emulator, use localhost URL; for production, use Google Cloud Storage URL  
    const publicUrl = isEmulator
        ? `http://${process.env.FIREBASE_STORAGE_EMULATOR_HOST || '127.0.0.1:9199'}/v0/b/${bucket.name}/o/${encodeURIComponent(key)}?alt=media`
        : `https://storage.googleapis.com/${bucket.name}/${key}`;
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/c5f540ce-21d1-4d7f-896a-2f6702ebbfa3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'index.ts:310', message: 'publicUrl constructed', data: { publicUrl, isEmulator }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'E', runId: 'post-fix' }) }).catch(() => { });
    // #endregion
    const image = {
        url: publicUrl,
        alt: alt ?? null,
        sortOrder: Number(sortOrder ?? 0),
        isCover: Boolean(isCover ?? false),
    };
    await firebase_1.db.collection("properties").doc(propertyId).update({
        images: [...(propertyDoc.data()?.images ?? []), image],
        updatedAt: new Date().toISOString(),
    });
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/c5f540ce-21d1-4d7f-896a-2f6702ebbfa3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'index.ts:328', message: 'Before response', data: { uploadUrlDefined: typeof uploadUrl, hasValue: !!uploadUrl }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'B', runId: 'post-fix' }) }).catch(() => { });
    // #endregion
    return res.json({ success: true, data: { uploadUrl: uploadUrl, publicUrl: image.url } });
}));
// Public endpoint: fetch payment intent status (used by booking-confirmation polling)
publicRouter.get("/payment-intents/:intentId", async (req, res) => {
    const doc = await firebase_1.db.collection("payment_intents").doc(req.params.intentId).get();
    if (!doc.exists) {
        return res.status(404).json({ error: "Payment intent not found" });
    }
    const data = doc.data();
    // Find associated booking if intent is completed
    let bookingId = null;
    if (data.status === "COMPLETED") {
        const bookingsSnap = await firebase_1.db
            .collection("bookings")
            .where("propertyId", "==", data.propertyId)
            .where("checkInDate", "==", data.checkInDate)
            .where("checkOutDate", "==", data.checkOutDate)
            .limit(1)
            .get();
        if (!bookingsSnap.empty) {
            bookingId = bookingsSnap.docs[0].id;
        }
    }
    return res.json({
        status: data.status,
        bookingId,
    });
});
publicRouter.post("/webhooks/paychangu", async (req, res) => {
    const signature = req.headers["x-paychangu-signature"];
    const rawBody = Buffer.isBuffer(req.body)
        ? req.body.toString("utf8")
        : JSON.stringify(req.body ?? {});
    if (!(0, paychangu_1.verifyWebhookSignature)(rawBody, signature)) {
        return res.status(401).json({ error: "Invalid signature" });
    }
    let payload = {};
    try {
        payload = Buffer.isBuffer(req.body) ? JSON.parse(rawBody) : req.body ?? {};
    }
    catch (error) {
        return res.status(400).json({ error: "Invalid payload" });
    }
    const event = payload.event ?? payload.type;
    if (event === "payment.success") {
        await handlePaymentSuccess(payload.data ?? payload);
    }
    else if (event === "payment.failed") {
        await handlePaymentFailed(payload.data ?? payload);
    }
    return res.json({ received: true });
});
// ---- Protected endpoints ----
protectedRouter.post("/properties", (0, auth_1.requireRole)(["OWNER", "STAFF"]), async (req, res) => {
    const payload = req.body ?? {};
    const now = new Date().toISOString();
    const docRef = await firebase_1.db.collection("properties").add({
        name: payload.name,
        location: payload.location ?? null,
        bedrooms: payload.bedrooms,
        bathrooms: payload.bathrooms,
        maxGuests: payload.maxGuests,
        nightlyRate: payload.nightlyRate ?? null,
        currency: payload.currency,
        status: normalizePropertyStatus(payload.status),
        amenities: payload.amenities ?? [],
        images: payload.images ?? [],
        createdAt: now,
        updatedAt: now,
    });
    await (0, audit_1.logAudit)("CREATE", "Property", docRef.id, req.auth.uid, { name: payload.name });
    const created = await docRef.get();
    return res.json({ id: docRef.id, ...created.data() });
});
protectedRouter.get("/properties", async (_req, res) => {
    const snapshot = await firebase_1.db.collection("properties").orderBy("createdAt", "desc").get();
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return res.json(data);
});
protectedRouter.get("/properties/:id", async (req, res) => {
    const doc = await firebase_1.db.collection("properties").doc(req.params.id).get();
    if (!doc.exists) {
        return res.status(404).json({ message: "Property not found" });
    }
    return res.json({ id: doc.id, ...doc.data() });
});
protectedRouter.patch("/properties/:id", (0, auth_1.requireRole)(["OWNER", "STAFF"]), async (req, res) => {
    const docRef = firebase_1.db.collection("properties").doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) {
        return res.status(404).json({ message: "Property not found" });
    }
    const body = { ...(req.body ?? {}) };
    if (Object.prototype.hasOwnProperty.call(body, "status")) {
        body.status = normalizePropertyStatus(body.status);
    }
    await docRef.update({ ...body, updatedAt: new Date().toISOString() });
    await (0, audit_1.logAudit)("UPDATE", "Property", docRef.id, req.auth.uid, { name: req.body?.name });
    const updated = await docRef.get();
    return res.json({ id: updated.id, ...updated.data() });
});
protectedRouter.delete("/properties/:id", (0, auth_1.requireRole)(["OWNER", "STAFF"]), async (req, res) => {
    const docRef = firebase_1.db.collection("properties").doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) {
        return res.status(404).json({ message: "Property not found" });
    }
    await docRef.update({ status: "INACTIVE", updatedAt: new Date().toISOString() });
    await (0, audit_1.logAudit)("DELETE", "Property", docRef.id, req.auth.uid);
    const updated = await docRef.get();
    return res.json({ id: updated.id, ...updated.data() });
});
protectedRouter.get("/categories", async (req, res) => {
    const type = req.query.type;
    let query = firebase_1.db.collection("categories");
    if (type) {
        query = query.where("type", "==", type);
    }
    const snapshot = await query.orderBy("name", "asc").get();
    return res.json(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
});
protectedRouter.post("/categories", (0, auth_1.requireRole)(["OWNER", "STAFF"]), async (req, res) => {
    const payload = req.body ?? {};
    const now = new Date().toISOString();
    const docRef = await firebase_1.db.collection("categories").add({
        name: payload.name,
        type: payload.type,
        isSystem: payload.isSystem ?? false,
        createdBy: req.auth.uid,
        createdAt: now,
        updatedAt: now,
    });
    await (0, audit_1.logAudit)("CREATE", "Category", docRef.id, req.auth.uid, { name: payload.name });
    const created = await docRef.get();
    return res.json({ id: docRef.id, ...created.data() });
});
protectedRouter.post("/transactions/revenue", (0, auth_1.requireRole)(["OWNER", "STAFF"]), async (req, res) => {
    return createTransaction(req, res, "REVENUE");
});
protectedRouter.post("/transactions/expense", (0, auth_1.requireRole)(["OWNER", "STAFF"]), async (req, res) => {
    return createTransaction(req, res, "EXPENSE");
});
protectedRouter.get("/transactions", (0, errors_1.asyncHandler)(async (req, res) => {
    const propertyId = req.query.propertyId;
    const type = req.query.type;
    const month = req.query.month;
    const year = req.query.year;
    let query = firebase_1.db.collection("transactions");
    if (propertyId) {
        query = query.where("propertyId", "==", propertyId);
    }
    if (type) {
        query = query.where("type", "==", type);
    }
    // Optimize: Apply date filtering at database level when possible
    const range = getDateRange(month, year);
    if (range) {
        // Use indexed date queries instead of in-memory filtering
        query = query
            .where("date", ">=", range.start.toISOString())
            .where("date", "<", range.end.toISOString());
    }
    const snapshot = await query.orderBy("date", "desc").limit(100).get();
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return res.json(data);
}));
protectedRouter.delete("/transactions/:id", (0, auth_1.requireRole)(["OWNER", "STAFF"]), async (req, res) => {
    const docRef = firebase_1.db.collection("transactions").doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) {
        return res.status(404).json({ message: "Transaction not found" });
    }
    await docRef.delete();
    await (0, audit_1.logAudit)("DELETE", "Transaction", docRef.id, req.auth.uid);
    return res.json({ id: doc.id, ...doc.data() });
});
protectedRouter.post("/guests", (0, auth_1.requireRole)(["OWNER", "STAFF"]), async (req, res) => {
    const payload = req.body ?? {};
    const now = new Date().toISOString();
    const docRef = await firebase_1.db.collection("guests").add({
        name: payload.name,
        email: payload.email ?? null,
        phone: payload.phone ?? null,
        source: payload.source,
        notes: payload.notes ?? null,
        rating: payload.rating ?? null,
        createdBy: req.auth.uid,
        createdAt: now,
        updatedAt: now,
    });
    await (0, audit_1.logAudit)("CREATE", "Guest", docRef.id, req.auth.uid, { name: payload.name });
    const created = await docRef.get();
    return res.json({ id: docRef.id, ...created.data() });
});
protectedRouter.get("/guests", async (_req, res) => {
    const snapshot = await firebase_1.db.collection("guests").orderBy("createdAt", "desc").get();
    return res.json(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
});
protectedRouter.get("/guests/:id", async (req, res) => {
    const doc = await firebase_1.db.collection("guests").doc(req.params.id).get();
    if (!doc.exists) {
        return res.status(404).json({ message: "Guest not found" });
    }
    return res.json({ id: doc.id, ...doc.data() });
});
protectedRouter.patch("/guests/:id", (0, auth_1.requireRole)(["OWNER", "STAFF"]), async (req, res) => {
    const docRef = firebase_1.db.collection("guests").doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) {
        return res.status(404).json({ message: "Guest not found" });
    }
    await docRef.update({ ...req.body, updatedAt: new Date().toISOString() });
    await (0, audit_1.logAudit)("UPDATE", "Guest", docRef.id, req.auth.uid);
    const updated = await docRef.get();
    return res.json({ id: updated.id, ...updated.data() });
});
protectedRouter.delete("/guests/:id", (0, auth_1.requireRole)(["OWNER", "STAFF"]), async (req, res) => {
    const docRef = firebase_1.db.collection("guests").doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) {
        return res.status(404).json({ message: "Guest not found" });
    }
    await docRef.delete();
    await (0, audit_1.logAudit)("DELETE", "Guest", docRef.id, req.auth.uid);
    return res.json({ id: doc.id, ...doc.data() });
});
protectedRouter.post("/bookings", (0, auth_1.requireRole)(["OWNER", "STAFF"]), async (req, res) => {
    const payload = req.body ?? {};
    try {
        await ensurePropertyAvailable(payload.propertyId, payload.checkInDate, payload.checkOutDate);
    }
    catch (error) {
        return res.status(400).json({ message: error.message });
    }
    const now = new Date().toISOString();
    const docRef = await firebase_1.db.collection("bookings").add({
        guestId: payload.guestId,
        propertyId: payload.propertyId,
        status: "PENDING",
        checkInDate: payload.checkInDate,
        checkOutDate: payload.checkOutDate,
        notes: payload.notes ?? null,
        createdBy: req.auth.uid,
        createdAt: now,
        updatedAt: now,
    });
    await (0, audit_1.logAudit)("CREATE", "Booking", docRef.id, req.auth.uid, { status: "PENDING" });
    const created = await docRef.get();
    return res.json({ id: docRef.id, ...created.data() });
});
protectedRouter.get("/bookings", async (_req, res) => {
    const snapshot = await firebase_1.db.collection("bookings").orderBy("createdAt", "desc").get();
    return res.json(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
});
protectedRouter.get("/inquiries", async (req, res) => {
    const status = req.query.status;
    const propertyId = req.query.propertyId;
    let query = firebase_1.db.collection("inquiries").orderBy("createdAt", "desc");
    if (status) {
        query = query.where("status", "==", status);
    }
    if (propertyId) {
        query = query.where("propertyId", "==", propertyId);
    }
    const snapshot = await query.get();
    return res.json({ success: true, data: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) });
});
protectedRouter.get("/inquiries/:id", async (req, res) => {
    const doc = await firebase_1.db.collection("inquiries").doc(req.params.id).get();
    if (!doc.exists) {
        return res.status(404).json({
            success: false,
            error: { code: "NOT_FOUND", message: "Inquiry not found" },
        });
    }
    return res.json({ success: true, data: { id: doc.id, ...doc.data() } });
});
protectedRouter.patch("/inquiries/:id/status", (0, auth_1.requireRole)(["OWNER", "STAFF"]), async (req, res) => {
    const { status } = req.body ?? {};
    const validStatuses = ["NEW", "CONTACTED", "CONVERTED", "EXPIRED"];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            error: { code: "VALIDATION_ERROR", message: "Invalid status" },
        });
    }
    const docRef = firebase_1.db.collection("inquiries").doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) {
        return res.status(404).json({
            success: false,
            error: { code: "NOT_FOUND", message: "Inquiry not found" },
        });
    }
    await docRef.update({ status, updatedAt: new Date().toISOString() });
    await (0, audit_1.logAudit)("UPDATE", "Inquiry", docRef.id, req.auth.uid, { status });
    const updated = await docRef.get();
    return res.json({ success: true, data: { id: updated.id, ...updated.data() } });
});
protectedRouter.post("/inquiries/:id/convert", (0, auth_1.requireRole)(["OWNER", "STAFF"]), async (req, res) => {
    const inquiryDoc = await firebase_1.db.collection("inquiries").doc(req.params.id).get();
    if (!inquiryDoc.exists) {
        return res.status(404).json({
            success: false,
            error: { code: "NOT_FOUND", message: "Inquiry not found" },
        });
    }
    const inquiry = inquiryDoc.data();
    if (inquiry.status === "CONVERTED") {
        return res.status(409).json({
            success: false,
            error: { code: "ALREADY_CONVERTED", message: "Inquiry already converted" },
        });
    }
    if (inquiry.status === "EXPIRED") {
        return res.status(400).json({
            success: false,
            error: { code: "INQUIRY_EXPIRED", message: "Cannot convert expired inquiry" },
        });
    }
    try {
        await ensurePropertyAvailable(inquiry.propertyId, inquiry.checkInDate, inquiry.checkOutDate);
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            error: { code: "BOOKING_CONFLICT", message: error.message },
        });
    }
    let guestId = req.body?.guestId;
    if (!guestId) {
        const now = new Date().toISOString();
        const guestRef = await firebase_1.db.collection("guests").add({
            name: inquiry.guestName,
            email: inquiry.guestEmail ?? null,
            phone: inquiry.guestPhone ?? null,
            source: "LOCAL",
            notes: `Converted from inquiry ${inquiryDoc.id}`,
            rating: null,
            createdBy: req.auth.uid,
            createdAt: now,
            updatedAt: now,
        });
        guestId = guestRef.id;
    }
    const propertyDoc = await firebase_1.db.collection("properties").doc(inquiry.propertyId).get();
    const property = propertyDoc.data();
    const nights = Math.ceil((new Date(inquiry.checkOutDate).getTime() - new Date(inquiry.checkInDate).getTime()) /
        (1000 * 60 * 60 * 24));
    const totalAmount = (property.nightlyRate ?? 0) * nights;
    const now = new Date().toISOString();
    const bookingRef = await firebase_1.db.collection("bookings").add({
        guestId,
        propertyId: inquiry.propertyId,
        status: "CONFIRMED",
        checkInDate: inquiry.checkInDate,
        checkOutDate: inquiry.checkOutDate,
        numberOfGuests: inquiry.numberOfGuests ?? null,
        currency: property.currency,
        totalAmount,
        amountPaid: 0,
        paymentStatus: "UNPAID",
        notes: inquiry.message ?? null,
        createdBy: req.auth.uid,
        createdAt: now,
        updatedAt: now,
    });
    await firebase_1.db.collection("inquiries").doc(req.params.id).update({
        status: "CONVERTED",
        bookingId: bookingRef.id,
        updatedAt: now,
    });
    await (0, audit_1.logAudit)("CREATE", "Booking", bookingRef.id, req.auth.uid, {
        source: "inquiry_conversion",
        inquiryId: req.params.id,
    });
    const booking = await bookingRef.get();
    return res.json({
        success: true,
        data: { bookingId: bookingRef.id, ...booking.data() },
    });
});
protectedRouter.get("/bookings/availability", async (req, res) => {
    const propertyId = req.query.propertyId;
    const checkInDate = req.query.checkInDate;
    const checkOutDate = req.query.checkOutDate;
    if (!propertyId || !checkInDate || !checkOutDate) {
        return res.status(400).json({ message: "Missing parameters" });
    }
    try {
        await ensurePropertyAvailable(propertyId, checkInDate, checkOutDate);
    }
    catch (error) {
        return res.status(400).json({ message: error.message });
    }
    return res.json({ available: true });
});
protectedRouter.post("/bookings/:bookingId/payment-link", (0, auth_1.requireRole)(["OWNER", "STAFF"]), async (req, res) => {
    const bookingDoc = await firebase_1.db.collection("bookings").doc(req.params.bookingId).get();
    if (!bookingDoc.exists) {
        return res.status(404).json({
            success: false,
            error: { code: "BOOKING_NOT_FOUND", message: "Booking not found" },
        });
    }
    const booking = bookingDoc.data();
    const totalAmount = typeof booking.totalAmount === "number" ? booking.totalAmount : 0;
    const currentPaid = typeof booking.amountPaid === "number" ? booking.amountPaid : 0;
    const remainingAmount = totalAmount - currentPaid;
    if (remainingAmount <= 0) {
        return res.status(400).json({
            success: false,
            error: { code: "ALREADY_PAID", message: "Booking is fully paid" },
        });
    }
    const guestDoc = await firebase_1.db.collection("guests").doc(booking.guestId).get();
    if (!guestDoc.exists) {
        return res.status(404).json({
            success: false,
            error: { code: "NOT_FOUND", message: "Guest not found" },
        });
    }
    const propertyDoc = await firebase_1.db.collection("properties").doc(booking.propertyId).get();
    if (!propertyDoc.exists) {
        return res.status(404).json({
            success: false,
            error: { code: "NOT_FOUND", message: "Property not found" },
        });
    }
    const guest = guestDoc.data();
    const property = propertyDoc.data();
    const nameParts = String(guest.name ?? "Guest").trim().split(" ");
    const firstName = nameParts[0] ?? "Guest";
    const lastName = nameParts.slice(1).join(" ") || firstName;
    const currency = (booking.currency ?? property.currency ?? "MWK");
    const publicUrl = process.env.PUBLIC_URL ?? "http://localhost:3000";
    const confirmationUrl = `${publicUrl}/booking-confirmation?bookingId=${req.params.bookingId}`;
    const checkoutData = await (0, paychangu_1.createCheckout)({
        amount: remainingAmount,
        currency,
        email: guest.email ?? undefined,
        firstName,
        lastName,
        callbackUrl: confirmationUrl,
        returnUrl: `${confirmationUrl}&status=failed`,
        customization: {
            title: `Payment for ${property.name ?? "Booking"}`,
            description: `Booking from ${booking.checkInDate} to ${booking.checkOutDate}`,
            logo: property.images?.[0]?.url,
        },
    });
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const paymentRef = await firebase_1.db.collection("payments").add({
        bookingId: req.params.bookingId,
        amount: remainingAmount,
        currency,
        method: "MOBILE_MONEY",
        status: "PENDING",
        reference: null,
        paychanguReference: null,
        paychanguCheckoutId: checkoutData.checkoutId,
        paymentLink: checkoutData.checkoutUrl,
        paymentLinkExpiresAt: expiresAt,
        notes: "PayChangu payment link generated",
        createdBy: req.auth.uid,
        createdAt: now,
        updatedAt: now,
    });
    await (0, audit_1.logAudit)("CREATE", "PaymentLink", paymentRef.id, req.auth.uid, {
        bookingId: req.params.bookingId,
        checkoutId: checkoutData.checkoutId,
    });
    return res.json({
        success: true,
        data: {
            paymentId: paymentRef.id,
            checkoutUrl: checkoutData.checkoutUrl,
            amount: remainingAmount,
            expiresAt,
        },
    });
});
protectedRouter.post("/payments", (0, auth_1.requireRole)(["OWNER", "STAFF"]), async (req, res) => {
    const payload = req.body ?? {};
    if (!payload.bookingId || !payload.amount || !payload.currency || !payload.method) {
        return res.status(400).json({
            success: false,
            error: { code: "VALIDATION_ERROR", message: "Missing required fields" },
        });
    }
    const bookingDoc = await firebase_1.db.collection("bookings").doc(payload.bookingId).get();
    if (!bookingDoc.exists) {
        return res.status(404).json({
            success: false,
            error: { code: "BOOKING_NOT_FOUND", message: "Booking not found" },
        });
    }
    const booking = bookingDoc.data();
    if (booking.status === "CANCELLED") {
        return res.status(400).json({
            success: false,
            error: { code: "BOOKING_CANCELLED", message: "Cannot add payment to a cancelled booking" },
        });
    }
    const amount = Number(payload.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({
            success: false,
            error: { code: "INVALID_AMOUNT", message: "Amount must be a positive number" },
        });
    }
    const totalAmount = typeof booking.totalAmount === "number" ? booking.totalAmount : null;
    const currentPaid = typeof booking.amountPaid === "number" ? booking.amountPaid : 0;
    if (totalAmount !== null && amount > totalAmount - currentPaid) {
        return res.status(400).json({
            success: false,
            error: { code: "OVERPAYMENT", message: "Payment exceeds remaining balance" },
        });
    }
    const now = new Date().toISOString();
    const paymentRef = await firebase_1.db.collection("payments").add({
        bookingId: payload.bookingId,
        amount,
        currency: payload.currency,
        method: payload.method,
        status: "COMPLETED",
        reference: payload.reference ?? null,
        paychanguReference: null,
        paychanguCheckoutId: null,
        paymentLink: null,
        paymentLinkExpiresAt: null,
        notes: payload.notes ?? null,
        createdBy: req.auth.uid,
        createdAt: now,
        updatedAt: now,
    });
    const newAmountPaid = currentPaid + amount;
    const paymentStatus = totalAmount === null
        ? "PARTIAL"
        : newAmountPaid >= totalAmount
            ? "PAID"
            : newAmountPaid > 0
                ? "PARTIAL"
                : "UNPAID";
    await firebase_1.db.collection("bookings").doc(payload.bookingId).update({
        amountPaid: newAmountPaid,
        paymentStatus,
        updatedAt: now,
    });
    const categoryId = await getOrCreateRevenueCategory();
    await firebase_1.db.collection("transactions").add({
        propertyId: booking.propertyId ?? null,
        type: "REVENUE",
        categoryId,
        amount,
        currency: payload.currency,
        date: now,
        notes: `Payment for booking ${payload.bookingId}`,
        createdBy: req.auth.uid,
        createdAt: now,
        updatedAt: now,
    });
    await (0, audit_1.logAudit)("CREATE", "Payment", paymentRef.id, req.auth.uid, {
        bookingId: payload.bookingId,
        amount,
        method: payload.method,
    });
    const payment = await paymentRef.get();
    return res.json({ success: true, data: { id: paymentRef.id, ...payment.data() } });
});
protectedRouter.get("/bookings/:bookingId/payments", async (req, res) => {
    const snapshot = await firebase_1.db
        .collection("payments")
        .where("bookingId", "==", req.params.bookingId)
        .orderBy("createdAt", "desc")
        .get();
    return res.json({ success: true, data: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) });
});
protectedRouter.get("/payment-intents", async (req, res) => {
    const limit = Number(req.query.limit ?? 50);
    const status = req.query.status;
    let query = firebase_1.db.collection("payment_intents")
        .orderBy("createdAt", "desc")
        .limit(limit);
    if (status) {
        query = query.where("status", "==", status);
    }
    const snapshot = await query.get();
    const intents = await Promise.all(snapshot.docs.map(async (doc) => {
        const data = doc.data();
        // Fetch property name
        let propertyName = "Unknown Property";
        if (data.propertyId) {
            const propDoc = await firebase_1.db.collection("properties").doc(data.propertyId).get();
            if (propDoc.exists) {
                propertyName = propDoc.data()?.name ?? "Unknown Property";
            }
        }
        return {
            id: doc.id,
            ...data,
            propertyName,
        };
    }));
    return res.json({ success: true, data: intents });
});
protectedRouter.get("/payment-intents/:intentId", async (req, res) => {
    const doc = await firebase_1.db.collection("payment_intents").doc(req.params.intentId).get();
    if (!doc.exists) {
        throw new errors_1.AppError("NOT_FOUND", "Payment intent not found", 404);
    }
    const data = doc.data();
    // Fetch property details
    let propertyName = "Unknown Property";
    if (data.propertyId) {
        const propDoc = await firebase_1.db.collection("properties").doc(data.propertyId).get();
        if (propDoc.exists) {
            propertyName = propDoc.data()?.name ?? "Unknown Property";
        }
    }
    return res.json({
        success: true,
        data: {
            id: doc.id,
            ...data,
            propertyName,
        },
    });
});
protectedRouter.get("/bookings/:id", async (req, res) => {
    const doc = await firebase_1.db.collection("bookings").doc(req.params.id).get();
    if (!doc.exists) {
        return res.status(404).json({ message: "Booking not found" });
    }
    return res.json({ id: doc.id, ...doc.data() });
});
protectedRouter.patch("/bookings/:id", (0, auth_1.requireRole)(["OWNER", "STAFF"]), async (req, res) => {
    const docRef = firebase_1.db.collection("bookings").doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) {
        return res.status(404).json({ message: "Booking not found" });
    }
    const payload = req.body ?? {};
    if (payload.propertyId || payload.checkInDate || payload.checkOutDate) {
        const existing = doc.data();
        try {
            await ensurePropertyAvailable(payload.propertyId ?? existing.propertyId, payload.checkInDate ?? existing.checkInDate, payload.checkOutDate ?? existing.checkOutDate, docRef.id);
        }
        catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }
    await docRef.update({ ...payload, updatedAt: new Date().toISOString() });
    await (0, audit_1.logAudit)("UPDATE", "Booking", docRef.id, req.auth.uid);
    const updated = await docRef.get();
    return res.json({ id: updated.id, ...updated.data() });
});
protectedRouter.patch("/bookings/:id/status", (0, auth_1.requireRole)(["OWNER", "STAFF"]), async (req, res) => {
    const docRef = firebase_1.db.collection("bookings").doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) {
        return res.status(404).json({ message: "Booking not found" });
    }
    const payload = req.body ?? {};
    const currentStatus = doc.data()?.status;
    if (!(0, booking_utils_1.isValidStatusTransition)(currentStatus, payload.status)) {
        return res.status(400).json({ message: "Invalid status transition" });
    }
    await docRef.update({
        status: payload.status,
        actualCheckIn: payload.actualCheckIn ?? null,
        actualCheckOut: payload.actualCheckOut ?? null,
        checkInNotes: payload.checkInNotes ?? null,
        checkOutNotes: payload.checkOutNotes ?? null,
        updatedAt: new Date().toISOString(),
    });
    await (0, audit_1.logAudit)("UPDATE", "Booking", docRef.id, req.auth.uid, { status: payload.status });
    const updated = await docRef.get();
    return res.json({ id: updated.id, ...updated.data() });
});
protectedRouter.delete("/bookings/:id", (0, auth_1.requireRole)(["OWNER", "STAFF"]), async (req, res) => {
    const docRef = firebase_1.db.collection("bookings").doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) {
        return res.status(404).json({ message: "Booking not found" });
    }
    await docRef.delete();
    await (0, audit_1.logAudit)("DELETE", "Booking", docRef.id, req.auth.uid);
    return res.json({ id: doc.id, ...doc.data() });
});
// In-memory cache for analytics (5 minute TTL)
const analyticsCache = new Map();
protectedRouter.get("/analytics/summary", (0, errors_1.asyncHandler)(async (req, res) => {
    const month = req.query.month;
    const cacheKey = `summary:${month ?? 'current'}`;
    // Check cache
    const cached = analyticsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        return res.json(cached.data);
    }
    const range = getDateRange(month);
    const snapshot = await firebase_1.db.collection("transactions").get();
    const data = snapshot.docs.map((doc) => doc.data());
    const filtered = range
        ? data.filter((item) => {
            const date = new Date(item.date);
            return date >= range.start && date < range.end;
        })
        : data;
    const result = {
        month: month ?? null,
        totals: calculateCurrencySummary(filtered),
    };
    // Cache result
    analyticsCache.set(cacheKey, {
        data: result,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    });
    return res.json(result);
}));
protectedRouter.get("/analytics/property/:id/summary", async (req, res) => {
    const month = req.query.month;
    const range = getDateRange(month);
    const snapshot = await firebase_1.db
        .collection("transactions")
        .where("propertyId", "==", req.params.id)
        .get();
    const data = snapshot.docs.map((doc) => doc.data());
    const filtered = range
        ? data.filter((item) => {
            const date = new Date(item.date);
            return date >= range.start && date < range.end;
        })
        : data;
    return res.json({
        propertyId: req.params.id,
        month: month ?? null,
        totals: calculateCurrencySummary(filtered),
    });
});
function calculateCurrencySummary(transactions) {
    const map = new Map();
    transactions.forEach((transaction) => {
        const entry = map.get(transaction.currency) ?? { revenue: 0, expense: 0 };
        if (transaction.type === "REVENUE") {
            entry.revenue += transaction.amount;
        }
        else {
            entry.expense += transaction.amount;
        }
        map.set(transaction.currency, entry);
    });
    return Array.from(map.entries()).map(([currency, values]) => ({
        currency,
        revenue: values.revenue,
        expense: values.expense,
        profit: values.revenue - values.expense,
    }));
}
async function createTransaction(req, res, type) {
    const payload = req.body ?? {};
    if (!payload.categoryId) {
        return res.status(400).json({ message: "Category is required" });
    }
    const categoryDoc = await firebase_1.db.collection("categories").doc(payload.categoryId).get();
    if (!categoryDoc.exists) {
        return res.status(404).json({ message: "Category not found" });
    }
    const category = categoryDoc.data();
    if (category?.type !== type) {
        return res.status(400).json({ message: "Category type does not match transaction type" });
    }
    if (payload.propertyId) {
        const propertyDoc = await firebase_1.db.collection("properties").doc(payload.propertyId).get();
        if (!propertyDoc.exists) {
            return res.status(404).json({ message: "Property not found" });
        }
        if (propertyDoc.data()?.status !== "ACTIVE") {
            return res.status(400).json({ message: "Property is not active" });
        }
    }
    const now = new Date().toISOString();
    const docRef = await firebase_1.db.collection("transactions").add({
        propertyId: payload.propertyId ?? null,
        type,
        categoryId: payload.categoryId,
        amount: payload.amount,
        currency: payload.currency,
        date: payload.date,
        notes: payload.notes ?? null,
        createdBy: req.auth.uid,
        createdAt: now,
        updatedAt: now,
    });
    await (0, audit_1.logAudit)("CREATE", "Transaction", docRef.id, req.auth.uid, {
        type,
        amount: payload.amount,
        currency: payload.currency,
    });
    const created = await docRef.get();
    return res.json({ id: docRef.id, ...created.data() });
}
async function ensurePropertyAvailable(propertyId, checkInDate, checkOutDate, excludeBookingId) {
    const propertyDoc = await firebase_1.db.collection("properties").doc(propertyId).get();
    if (!propertyDoc.exists) {
        throw new Error("Property not found");
    }
    if (propertyDoc.data()?.status !== "ACTIVE") {
        throw new Error("Property is not active");
    }
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    if (!(checkIn < checkOut)) {
        throw new Error("Check-out must be after check-in");
    }
    const snapshot = await firebase_1.db
        .collection("bookings")
        .where("propertyId", "==", propertyId)
        .where("status", "in", ["PENDING", "CONFIRMED", "CHECKED_IN"])
        .get();
    const now = Date.now();
    const STALE_PENDING_MS = 30 * 60 * 1000; // 30 minutes
    const overlaps = snapshot.docs.filter((doc) => {
        if (excludeBookingId && doc.id === excludeBookingId) {
            return false;
        }
        const data = doc.data();
        // Skip stale PENDING bookings (unpaid after 30 min) — they are abandoned
        if (data.status === "PENDING" && data.paymentStatus === "UNPAID") {
            const createdAt = data.createdAt ? new Date(data.createdAt).getTime() : 0;
            if (now - createdAt > STALE_PENDING_MS) {
                return false;
            }
        }
        const bookingCheckIn = new Date(data.checkInDate);
        const bookingCheckOut = new Date(data.checkOutDate);
        return bookingCheckIn < checkOut && bookingCheckOut > checkIn;
    });
    if (overlaps.length > 0) {
        throw new Error("Property is not available for these dates");
    }
}
async function ensurePropertyAvailableWithIntents(propertyId, checkInDate, checkOutDate, excludeIntentId) {
    // First check regular bookings
    await ensurePropertyAvailable(propertyId, checkInDate, checkOutDate);
    // Then check active payment intents
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const now = new Date();
    const intentsSnapshot = await firebase_1.db
        .collection("payment_intents")
        .where("propertyId", "==", propertyId)
        .where("status", "==", "PENDING")
        .get();
    const overlappingIntents = intentsSnapshot.docs.filter((doc) => {
        if (excludeIntentId && doc.id === excludeIntentId) {
            return false;
        }
        const data = doc.data();
        const expiresAt = new Date(data.expiresAt);
        // Skip expired intents
        if (expiresAt < now) {
            return false;
        }
        const intentCheckIn = new Date(data.checkInDate);
        const intentCheckOut = new Date(data.checkOutDate);
        return intentCheckIn < checkOut && intentCheckOut > checkIn;
    });
    if (overlappingIntents.length > 0) {
        throw new Error("Property is being reserved by another customer. Please try again in a few minutes.");
    }
}
function getDateRange(month, year) {
    if (!month && !year) {
        return null;
    }
    if (month) {
        const [yearPart, monthPart] = month.split("-").map((value) => Number(value));
        if (!yearPart || !monthPart || monthPart < 1 || monthPart > 12) {
            throw new Error("Invalid month format. Use YYYY-MM");
        }
        const start = new Date(Date.UTC(yearPart, monthPart - 1, 1));
        const end = new Date(Date.UTC(yearPart, monthPart, 1));
        return { start, end };
    }
    const yearPart = Number(year);
    const start = new Date(Date.UTC(yearPart, 0, 1));
    const end = new Date(Date.UTC(yearPart + 1, 0, 1));
    return { start, end };
}
async function getOrCreateRevenueCategory() {
    const snapshot = await firebase_1.db.collection("categories").where("type", "==", "REVENUE").get();
    const existing = snapshot.docs.find((doc) => doc.data()?.name === "Booking");
    if (existing) {
        return existing.id;
    }
    const now = new Date().toISOString();
    const categoryRef = await firebase_1.db.collection("categories").add({
        name: "Booking",
        type: "REVENUE",
        isSystem: true,
        createdBy: "SYSTEM",
        createdAt: now,
        updatedAt: now,
    });
    return categoryRef.id;
}
async function handlePaymentSuccess(data) {
    const checkoutId = data.checkout_id ?? data.checkoutId;
    if (!checkoutId) {
        return;
    }
    const now = new Date().toISOString();
    // First, check if this is a payment intent (new flow)
    const intentsSnapshot = await firebase_1.db
        .collection("payment_intents")
        .where("paychanguCheckoutId", "==", checkoutId)
        .limit(1)
        .get();
    if (!intentsSnapshot.empty) {
        // NEW FLOW: Create booking from payment intent
        const intentDoc = intentsSnapshot.docs[0];
        const intent = intentDoc.data();
        // Double-check availability before creating booking
        try {
            await ensurePropertyAvailable(intent.propertyId, intent.checkInDate, intent.checkOutDate);
        }
        catch (error) {
            // Dates no longer available - initiate automatic refund
            await intentDoc.ref.update({
                status: "FAILED",
                updatedAt: now,
            });
            try {
                const refundResult = await (0, paychangu_1.initiateRefund)({
                    checkoutId: intent.paychanguCheckoutId,
                    amount: intent.totalAmount,
                    reason: "Property no longer available for selected dates",
                });
                await (0, audit_1.logAudit)("REFUND", "PaymentIntent", intentDoc.id, "SYSTEM", {
                    reason: "Dates no longer available after payment",
                    refundId: refundResult.refundId,
                    error: error.message,
                });
            }
            catch (refundError) {
                // Log refund failure for manual processing
                await (0, audit_1.logAudit)("ERROR", "PaymentIntent", intentDoc.id, "SYSTEM", {
                    reason: "Automatic refund failed - requires manual processing",
                    originalError: error.message,
                    refundError: refundError.message,
                });
            }
            return;
        }
        // Find or create guest
        let guestId;
        const existingGuests = await firebase_1.db.collection("guests")
            .where("email", "==", intent.guestEmail)
            .limit(1)
            .get();
        if (!existingGuests.empty) {
            guestId = existingGuests.docs[0].id;
            await existingGuests.docs[0].ref.update({
                name: intent.guestName,
                phone: intent.guestPhone,
                updatedAt: now,
            });
        }
        else {
            const guestRef = await firebase_1.db.collection("guests").add({
                name: intent.guestName,
                email: intent.guestEmail,
                phone: intent.guestPhone,
                source: "WEBSITE",
                createdAt: now,
                updatedAt: now,
            });
            guestId = guestRef.id;
        }
        // Calculate nights
        const checkIn = new Date(intent.checkInDate);
        const checkOut = new Date(intent.checkOutDate);
        const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
        // Create CONFIRMED booking (payment already succeeded)
        const bookingRef = await firebase_1.db.collection("bookings").add({
            guestId,
            propertyId: intent.propertyId,
            status: "CONFIRMED",
            checkInDate: intent.checkInDate,
            checkOutDate: intent.checkOutDate,
            numberOfGuests: intent.numberOfGuests,
            nights,
            totalAmount: intent.totalAmount,
            amountPaid: intent.totalAmount,
            paymentStatus: "PAID",
            currency: intent.currency,
            notes: intent.notes ?? null,
            source: "WEBSITE",
            createdBy: "GUEST",
            createdAt: now,
            updatedAt: now,
        });
        // Create payment record
        await firebase_1.db.collection("payments").add({
            bookingId: bookingRef.id,
            amount: intent.totalAmount,
            currency: intent.currency,
            method: "MOBILE_MONEY",
            status: "COMPLETED",
            reference: data.mobile_number ?? data.card_last4 ?? null,
            paychanguReference: data.tx_ref ?? data.txRef ?? null,
            paychanguCheckoutId: checkoutId,
            paymentLink: null,
            paymentLinkExpiresAt: null,
            notes: "Public website booking - paid on checkout",
            createdBy: "GUEST",
            createdAt: now,
            updatedAt: now,
        });
        // Create revenue transaction
        const categoryId = await getOrCreateRevenueCategory();
        await firebase_1.db.collection("transactions").add({
            propertyId: intent.propertyId,
            type: "REVENUE",
            categoryId,
            amount: intent.totalAmount,
            currency: intent.currency,
            date: now,
            notes: `PayChangu payment for booking ${bookingRef.id}`,
            createdBy: "SYSTEM",
            createdAt: now,
            updatedAt: now,
        });
        // Mark intent as completed
        await intentDoc.ref.update({
            status: "COMPLETED",
            updatedAt: now,
        });
        await (0, audit_1.logAudit)("CREATE", "Booking", bookingRef.id, "GUEST", {
            source: "WEBSITE",
            fromIntent: intentDoc.id,
            guestEmail: intent.guestEmail,
        });
        // Send confirmation email
        const propertyDoc = await firebase_1.db.collection("properties").doc(intent.propertyId).get();
        const propertyName = propertyDoc.exists ? propertyDoc.data()?.name ?? "Property" : "Property";
        (0, email_1.sendPaymentSuccess)({
            guestEmail: intent.guestEmail,
            guestName: intent.guestName,
            bookingId: bookingRef.id,
            propertyName,
            checkInDate: intent.checkInDate,
            checkOutDate: intent.checkOutDate,
            amountPaid: intent.totalAmount,
            currency: intent.currency,
        }).catch((err) => console.error("Failed to send confirmation email:", err));
        return;
    }
    // OLD FLOW: Handle existing payment records (for backward compatibility)
    const paymentsSnapshot = await firebase_1.db
        .collection("payments")
        .where("paychanguCheckoutId", "==", checkoutId)
        .limit(1)
        .get();
    if (paymentsSnapshot.empty) {
        await (0, audit_1.logAudit)('WARNING', 'PaymentWebhook', checkoutId, 'SYSTEM', {
            reason: 'Payment not found for checkout',
            checkoutId,
        });
        return;
    }
    const paymentDoc = paymentsSnapshot.docs[0];
    const payment = paymentDoc.data();
    await paymentDoc.ref.update({
        status: "COMPLETED",
        paychanguReference: data.tx_ref ?? data.txRef ?? null,
        reference: data.mobile_number ?? data.card_last4 ?? null,
        updatedAt: now,
    });
    const bookingDoc = await firebase_1.db.collection("bookings").doc(payment.bookingId).get();
    if (!bookingDoc.exists) {
        return;
    }
    const booking = bookingDoc.data();
    const totalAmount = typeof booking.totalAmount === "number" ? booking.totalAmount : null;
    const currentPaid = typeof booking.amountPaid === "number" ? booking.amountPaid : 0;
    const newAmountPaid = currentPaid + (payment.amount ?? 0);
    const paymentStatus = totalAmount === null
        ? "PARTIAL"
        : newAmountPaid >= totalAmount
            ? "PAID"
            : newAmountPaid > 0
                ? "PARTIAL"
                : "UNPAID";
    const bookingUpdate = {
        amountPaid: newAmountPaid,
        paymentStatus,
        updatedAt: now,
    };
    // Auto-confirm PENDING bookings when fully paid
    if (paymentStatus === "PAID" && booking.status === "PENDING") {
        bookingUpdate.status = "CONFIRMED";
    }
    await bookingDoc.ref.update(bookingUpdate);
    const categoryId = await getOrCreateRevenueCategory();
    await firebase_1.db.collection("transactions").add({
        propertyId: booking.propertyId ?? null,
        type: "REVENUE",
        categoryId,
        amount: payment.amount ?? 0,
        currency: payment.currency,
        date: now,
        notes: `PayChangu payment for booking ${payment.bookingId}`,
        createdBy: "SYSTEM",
        createdAt: now,
        updatedAt: now,
    });
    await (0, audit_1.logAudit)("UPDATE", "Payment", paymentDoc.id, "SYSTEM", {
        status: "COMPLETED",
        txRef: data.tx_ref ?? data.txRef ?? null,
    });
    // Send payment success email to guest
    if (booking.guestId) {
        const guestDoc = await firebase_1.db.collection("guests").doc(booking.guestId).get();
        const guest = guestDoc.exists ? guestDoc.data() : null;
        if (guest?.email) {
            let propertyName = "Property";
            if (booking.propertyId) {
                const propDoc = await firebase_1.db.collection("properties").doc(booking.propertyId).get();
                if (propDoc.exists)
                    propertyName = propDoc.data()?.name ?? "Property";
            }
            (0, email_1.sendPaymentSuccess)({
                guestEmail: guest.email,
                guestName: guest.name ?? "Guest",
                bookingId: payment.bookingId,
                propertyName,
                checkInDate: booking.checkInDate,
                checkOutDate: booking.checkOutDate,
                amountPaid: newAmountPaid,
                currency: payment.currency ?? "MWK",
            }).catch((err) => console.error("Failed to send payment success email:", err));
        }
    }
}
async function handlePaymentFailed(data) {
    const checkoutId = data.checkout_id ?? data.checkoutId;
    if (!checkoutId) {
        return;
    }
    const paymentsSnapshot = await firebase_1.db
        .collection("payments")
        .where("paychanguCheckoutId", "==", checkoutId)
        .limit(1)
        .get();
    if (paymentsSnapshot.empty) {
        return;
    }
    const paymentDoc = paymentsSnapshot.docs[0];
    const now = new Date().toISOString();
    await paymentDoc.ref.update({
        status: "FAILED",
        notes: data.failure_reason ?? data.reason ?? "Payment failed",
        updatedAt: now,
    });
    await (0, audit_1.logAudit)("UPDATE", "Payment", paymentDoc.id, "SYSTEM", {
        status: "FAILED",
        reason: data.failure_reason ?? data.reason ?? null,
    });
}
exports.expireInquiries = (0, scheduler_1.onSchedule)("every 6 hours", async () => {
    const now = new Date().toISOString();
    const snapshot = await firebase_1.db
        .collection("inquiries")
        .where("status", "in", ["NEW", "CONTACTED"])
        .where("expiresAt", "<", now)
        .get();
    if (snapshot.empty) {
        return;
    }
    const batch = firebase_1.db.batch();
    snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { status: "EXPIRED", updatedAt: now });
    });
    await batch.commit();
});
// Cleanup expired payment intents every 5 minutes
exports.cleanupExpiredIntents = (0, scheduler_1.onSchedule)("*/5 * * * *", async () => {
    const now = new Date();
    const snapshot = await firebase_1.db
        .collection("payment_intents")
        .where("status", "==", "PENDING")
        .where("expiresAt", "<", now.toISOString())
        .get();
    console.log(`Cleaning up ${snapshot.size} expired payment intents`);
    const batch = firebase_1.db.batch();
    snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
            status: "EXPIRED",
            updatedAt: now.toISOString(),
        });
    });
    await batch.commit();
});
// iCal Export Endpoint (Public - for Airbnb to import our calendar)
// Route with .ics extension (required by Airbnb)
publicRouter.get("/ical/:propertyId.ics", (0, errors_1.asyncHandler)(async (req, res) => {
    const { propertyId } = req.params;
    try {
        const icalContent = await (0, ical_generator_1.generateICalFeed)(propertyId);
        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${propertyId}.ics"`);
        res.send(icalContent);
    }
    catch (error) {
        throw new errors_1.AppError("EXPORT_FAILED", error.message || "Failed to generate iCal feed", 500);
    }
}));
// Route without .ics extension (backward compatibility)
publicRouter.get("/ical/:propertyId", (0, errors_1.asyncHandler)(async (req, res) => {
    const { propertyId } = req.params;
    try {
        const icalContent = await (0, ical_generator_1.generateICalFeed)(propertyId);
        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${propertyId}.ics"`);
        res.send(icalContent);
    }
    catch (error) {
        throw new errors_1.AppError("EXPORT_FAILED", error.message || "Failed to generate iCal feed", 500);
    }
}));
// Calendar Sync Routes (Public test endpoint for local development)
publicRouter.post("/test/calendar-sync", (0, errors_1.asyncHandler)(async (req, res) => {
    const { propertyId, icalUrl } = req.body;
    if (!propertyId || !icalUrl) {
        throw new errors_1.AppError("VALIDATION_ERROR", "Missing propertyId or icalUrl", 400);
    }
    // Create sync config
    const now = new Date().toISOString();
    await firebase_1.db.collection("calendar_syncs").doc(propertyId).set({
        propertyId,
        platform: "AIRBNB",
        icalUrl,
        isEnabled: true,
        syncFrequency: 30,
        lastSyncAt: null,
        lastSyncStatus: null,
        lastSyncError: null,
        createdAt: now,
        updatedAt: now,
    });
    // Trigger sync
    const result = await (0, sync_engine_1.syncCalendar)(propertyId);
    // Log result
    await firebase_1.db.collection("calendar_sync_logs").add({
        propertyId,
        status: result.success ? "SUCCESS" : "FAILED",
        eventsImported: result.eventsImported,
        eventsSkipped: result.eventsSkipped,
        errorMessage: result.error || null,
        syncDuration: result.duration,
        createdAt: now,
    });
    res.json({ success: true, data: result });
}));
// Calendar Sync Routes
protectedRouter.post("/v1/calendar-syncs", (0, auth_1.requireRole)(["OWNER"]), (0, errors_1.asyncHandler)(async (req, res) => {
    const { propertyId, platform, icalUrl, isEnabled = true, syncFrequency = 30 } = req.body;
    if (!propertyId || !platform || !icalUrl) {
        throw new errors_1.AppError("VALIDATION_ERROR", "Missing required fields", 400);
    }
    if (!(0, ical_parser_1.validateICalUrl)(icalUrl)) {
        throw new errors_1.AppError("INVALID_ICAL_URL", "Invalid iCal URL. Must be HTTPS and end with .ics", 400);
    }
    const propertyDoc = await firebase_1.db.collection("properties").doc(propertyId).get();
    if (!propertyDoc.exists) {
        throw new errors_1.AppError("PROPERTY_NOT_FOUND", "Property not found", 404);
    }
    const existingSync = await firebase_1.db.collection("calendar_syncs").doc(propertyId).get();
    if (existingSync.exists) {
        throw new errors_1.AppError("SYNC_EXISTS", "Calendar sync already exists for this property", 409);
    }
    const now = new Date().toISOString();
    await firebase_1.db.collection("calendar_syncs").doc(propertyId).set({
        propertyId,
        platform,
        icalUrl,
        isEnabled,
        syncFrequency,
        lastSyncAt: null,
        lastSyncStatus: null,
        lastSyncError: null,
        createdAt: now,
        updatedAt: now,
    });
    const created = await firebase_1.db.collection("calendar_syncs").doc(propertyId).get();
    res.json({ success: true, data: { id: created.id, ...created.data() } });
}));
protectedRouter.get("/v1/calendar-syncs", (0, auth_1.requireRole)(["OWNER", "STAFF"]), (0, errors_1.asyncHandler)(async (req, res) => {
    const snapshot = await firebase_1.db.collection("calendar_syncs").orderBy("createdAt", "desc").get();
    const syncs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, data: syncs });
}));
protectedRouter.get("/v1/calendar-syncs/:propertyId", (0, auth_1.requireRole)(["OWNER", "STAFF"]), (0, errors_1.asyncHandler)(async (req, res) => {
    const doc = await firebase_1.db.collection("calendar_syncs").doc(req.params.propertyId).get();
    if (!doc.exists) {
        throw new errors_1.AppError("SYNC_NOT_FOUND", "Calendar sync not found", 404);
    }
    const logsSnapshot = await firebase_1.db.collection("calendar_sync_logs")
        .where("propertyId", "==", req.params.propertyId)
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();
    const logs = logsSnapshot.docs.map(log => ({ id: log.id, ...log.data() }));
    res.json({
        success: true,
        data: {
            id: doc.id,
            ...doc.data(),
            syncLogs: logs,
        }
    });
}));
protectedRouter.patch("/v1/calendar-syncs/:propertyId", (0, auth_1.requireRole)(["OWNER"]), (0, errors_1.asyncHandler)(async (req, res) => {
    const { platform, icalUrl, isEnabled, syncFrequency } = req.body;
    if (icalUrl && !(0, ical_parser_1.validateICalUrl)(icalUrl)) {
        throw new errors_1.AppError("INVALID_ICAL_URL", "Invalid iCal URL. Must be HTTPS and end with .ics", 400);
    }
    const updateData = { updatedAt: new Date().toISOString() };
    if (platform !== undefined)
        updateData.platform = platform;
    if (icalUrl !== undefined)
        updateData.icalUrl = icalUrl;
    if (isEnabled !== undefined)
        updateData.isEnabled = isEnabled;
    if (syncFrequency !== undefined)
        updateData.syncFrequency = syncFrequency;
    await firebase_1.db.collection("calendar_syncs").doc(req.params.propertyId).update(updateData);
    const updated = await firebase_1.db.collection("calendar_syncs").doc(req.params.propertyId).get();
    res.json({ success: true, data: { id: updated.id, ...updated.data() } });
}));
protectedRouter.delete("/v1/calendar-syncs/:propertyId", (0, auth_1.requireRole)(["OWNER"]), (0, errors_1.asyncHandler)(async (req, res) => {
    await firebase_1.db.collection("calendar_syncs").doc(req.params.propertyId).delete();
    res.json({ success: true, message: "Calendar sync deleted" });
}));
protectedRouter.post("/v1/calendar-syncs/:propertyId/sync", (0, auth_1.requireRole)(["OWNER", "STAFF"]), (0, errors_1.asyncHandler)(async (req, res) => {
    const result = await (0, sync_engine_1.syncCalendar)(req.params.propertyId);
    const now = new Date().toISOString();
    await firebase_1.db.collection("calendar_sync_logs").add({
        propertyId: req.params.propertyId,
        status: result.success ? "SUCCESS" : "FAILED",
        eventsImported: result.eventsImported,
        eventsSkipped: result.eventsSkipped,
        errorMessage: result.error || null,
        syncDuration: result.duration,
        createdAt: now,
    });
    res.json({ success: true, data: result });
}));
// Mount public routes first (no auth required)
app.use("/v1/public", publicRouter);
// Mount protected routes with auth middleware
apiRouter.use("/", protectedRouter);
app.use("/", apiRouter);
app.use(errors_1.errorHandler);
exports.api = (0, https_1.onRequest)({ region: "us-central1" }, app);
// Scheduled Calendar Sync - runs every 2 minutes
exports.scheduledCalendarSync = (0, scheduler_1.onSchedule)("*/2 * * * *", async () => {
    console.log("Starting scheduled calendar sync...");
    try {
        const snapshot = await firebase_1.db.collection("calendar_syncs")
            .where("isEnabled", "==", true)
            .get();
        if (snapshot.empty) {
            console.log("No enabled calendar syncs found");
            return;
        }
        console.log(`Found ${snapshot.size} calendar syncs to process`);
        const batchSize = 5;
        const syncs = snapshot.docs;
        let totalImported = 0;
        let totalFailed = 0;
        for (let i = 0; i < syncs.length; i += batchSize) {
            const batch = syncs.slice(i, i + batchSize);
            const results = await Promise.allSettled(batch.map(async (doc) => {
                const propertyId = doc.id;
                console.log(`Syncing property: ${propertyId}`);
                const result = await (0, sync_engine_1.syncCalendar)(propertyId);
                const now = new Date().toISOString();
                await firebase_1.db.collection("calendar_sync_logs").add({
                    propertyId,
                    status: result.success ? "SUCCESS" : "FAILED",
                    eventsImported: result.eventsImported,
                    eventsSkipped: result.eventsSkipped,
                    errorMessage: result.error || null,
                    syncDuration: result.duration,
                    createdAt: now,
                });
                return result;
            }));
            results.forEach((result) => {
                if (result.status === "fulfilled" && result.value.success) {
                    totalImported += result.value.eventsImported;
                }
                else {
                    totalFailed++;
                }
            });
        }
        console.log(`Scheduled sync completed: ${totalImported} events imported, ${totalFailed} failed`);
    }
    catch (error) {
        console.error("Scheduled sync failed", error);
    }
});
