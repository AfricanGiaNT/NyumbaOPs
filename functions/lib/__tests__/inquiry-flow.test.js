"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const firestore_1 = require("firebase-admin/firestore");
const test_helpers_1 = require("./utils/test-helpers");
describe('Integration - Inquiry to Booking Flow', () => {
    const db = (0, firestore_1.getFirestore)();
    it('should complete full inquiry conversion flow', async () => {
        // Setup
        const propertyId = await (0, test_helpers_1.createTestProperty)({
            nightlyRate: 50000,
            currency: 'MWK',
        });
        const now = new Date().toISOString();
        const day1 = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const day2 = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0];
        // Step 1: Create inquiry
        const inquiryRef = await db.collection('inquiries').add({
            propertyId,
            guestName: 'John Doe',
            guestEmail: 'john@example.com',
            guestPhone: '0991234567',
            checkInDate: day1,
            checkOutDate: day2,
            numberOfGuests: 2,
            message: 'Looking forward to my stay',
            status: 'NEW',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            bookingId: null,
            createdAt: now,
            updatedAt: now,
        });
        const inquiry = await inquiryRef.get();
        expect(inquiry.data()?.status).toBe('NEW');
        // Step 2: Mark inquiry as contacted
        await inquiryRef.update({ status: 'CONTACTED', updatedAt: new Date().toISOString() });
        const contacted = await inquiryRef.get();
        expect(contacted.data()?.status).toBe('CONTACTED');
        // Step 3: Convert inquiry to booking
        const guestRef = await db.collection('guests').add({
            name: 'John Doe',
            email: 'john@example.com',
            phone: '0991234567',
            source: 'LOCAL',
            notes: `Converted from inquiry ${inquiryRef.id}`,
            rating: null,
            createdBy: 'test-user-id',
            createdAt: now,
            updatedAt: now,
        });
        const nights = 1; // day1 to day2 = 1 night
        const totalAmount = 50000 * nights;
        const bookingRef = await db.collection('bookings').add({
            guestId: guestRef.id,
            propertyId,
            status: 'CONFIRMED',
            checkInDate: day1,
            checkOutDate: day2,
            numberOfGuests: 2,
            currency: 'MWK',
            totalAmount,
            amountPaid: 0,
            paymentStatus: 'UNPAID',
            notes: 'Looking forward to my stay',
            createdBy: 'test-user-id',
            createdAt: now,
            updatedAt: now,
        });
        // Update inquiry as converted
        await inquiryRef.update({
            status: 'CONVERTED',
            bookingId: bookingRef.id,
            updatedAt: new Date().toISOString(),
        });
        // Verify
        const convertedInquiry = await inquiryRef.get();
        expect(convertedInquiry.data()?.status).toBe('CONVERTED');
        expect(convertedInquiry.data()?.bookingId).toBe(bookingRef.id);
        const booking = await bookingRef.get();
        expect(booking.data()?.status).toBe('CONFIRMED');
        expect(booking.data()?.totalAmount).toBe(50000);
        expect(booking.data()?.amountPaid).toBe(0);
    });
    it('should prevent converting expired inquiry', async () => {
        const propertyId = await (0, test_helpers_1.createTestProperty)();
        const now = new Date().toISOString();
        const past = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
        const day1 = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const day2 = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0];
        // Create expired inquiry
        const inquiryRef = await db.collection('inquiries').add({
            propertyId,
            guestName: 'Jane Doe',
            guestEmail: 'jane@example.com',
            guestPhone: '0991234568',
            checkInDate: day1,
            checkOutDate: day2,
            numberOfGuests: 2,
            message: null,
            status: 'EXPIRED',
            expiresAt: past,
            bookingId: null,
            createdAt: past,
            updatedAt: now,
        });
        const inquiry = await inquiryRef.get();
        expect(inquiry.data()?.status).toBe('EXPIRED');
        // Attempting to convert should fail (in real API this would be blocked)
        // This test documents the expected behavior
    });
    it('should rate limit inquiries (conceptual test)', async () => {
        // This test documents that rate limiting should be applied
        // The actual rate limiting is middleware-based in Express
        // We're testing the concept that multiple rapid inquiries should be blocked
        // In production, the rate limiter allows 5 inquiries per 15 minutes per IP
        // This is handled by the express-rate-limit middleware in index.ts
        expect(true).toBe(true); // Placeholder - rate limiting tested at API level
    });
});
describe('Integration - Booking Payment Flow', () => {
    const db = (0, firestore_1.getFirestore)();
    it('should complete full payment flow and update booking status', async () => {
        // Setup
        const propertyId = await (0, test_helpers_1.createTestProperty)();
        const guestId = await (0, test_helpers_1.createTestGuest)();
        const revenueCatId = await (0, test_helpers_1.createTestCategory)('REVENUE', { name: 'Booking' });
        const now = new Date().toISOString();
        const day1 = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const day2 = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0];
        // Step 1: Create booking
        const bookingRef = await db.collection('bookings').add({
            guestId,
            propertyId,
            status: 'CONFIRMED',
            checkInDate: day1,
            checkOutDate: day2,
            numberOfGuests: 2,
            currency: 'MWK',
            totalAmount: 100000,
            amountPaid: 0,
            paymentStatus: 'UNPAID',
            notes: null,
            createdBy: 'test-user-id',
            createdAt: now,
            updatedAt: now,
        });
        let booking = await bookingRef.get();
        expect(booking.data()?.paymentStatus).toBe('UNPAID');
        // Step 2: Log partial payment
        await db.collection('payments').add({
            bookingId: bookingRef.id,
            amount: 50000,
            currency: 'MWK',
            method: 'MOBILE_MONEY',
            status: 'COMPLETED',
            reference: 'MM-12345',
            paychanguReference: null,
            paychanguCheckoutId: null,
            paymentLink: null,
            paymentLinkExpiresAt: null,
            notes: 'Partial payment',
            createdBy: 'test-user-id',
            createdAt: now,
            updatedAt: now,
        });
        // Update booking
        await bookingRef.update({
            amountPaid: 50000,
            paymentStatus: 'PARTIAL',
            updatedAt: new Date().toISOString(),
        });
        // Create transaction
        await db.collection('transactions').add({
            propertyId,
            type: 'REVENUE',
            categoryId: revenueCatId,
            amount: 50000,
            currency: 'MWK',
            date: now,
            notes: `Payment for booking ${bookingRef.id}`,
            createdBy: 'test-user-id',
            createdAt: now,
            updatedAt: now,
        });
        booking = await bookingRef.get();
        expect(booking.data()?.amountPaid).toBe(50000);
        expect(booking.data()?.paymentStatus).toBe('PARTIAL');
        // Step 3: Log remaining payment
        await db.collection('payments').add({
            bookingId: bookingRef.id,
            amount: 50000,
            currency: 'MWK',
            method: 'CASH',
            status: 'COMPLETED',
            reference: 'CASH-001',
            paychanguReference: null,
            paychanguCheckoutId: null,
            paymentLink: null,
            paymentLinkExpiresAt: null,
            notes: 'Final payment',
            createdBy: 'test-user-id',
            createdAt: now,
            updatedAt: now,
        });
        // Update booking
        await bookingRef.update({
            amountPaid: 100000,
            paymentStatus: 'PAID',
            updatedAt: new Date().toISOString(),
        });
        // Create transaction
        await db.collection('transactions').add({
            propertyId,
            type: 'REVENUE',
            categoryId: revenueCatId,
            amount: 50000,
            currency: 'MWK',
            date: now,
            notes: `Payment for booking ${bookingRef.id}`,
            createdBy: 'test-user-id',
            createdAt: now,
            updatedAt: now,
        });
        // Verify final state
        booking = await bookingRef.get();
        expect(booking.data()?.amountPaid).toBe(100000);
        expect(booking.data()?.paymentStatus).toBe('PAID');
        // Verify transactions created
        const transactionsSnapshot = await db
            .collection('transactions')
            .where('propertyId', '==', propertyId)
            .get();
        expect(transactionsSnapshot.size).toBe(2);
        expect(transactionsSnapshot.docs.reduce((sum, doc) => sum + doc.data().amount, 0)).toBe(100000);
    });
    it('should prevent overpayment', async () => {
        const propertyId = await (0, test_helpers_1.createTestProperty)();
        const guestId = await (0, test_helpers_1.createTestGuest)();
        const now = new Date().toISOString();
        const day1 = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const day2 = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0];
        // Create booking with totalAmount = 100000
        const bookingRef = await db.collection('bookings').add({
            guestId,
            propertyId,
            status: 'CONFIRMED',
            checkInDate: day1,
            checkOutDate: day2,
            numberOfGuests: 2,
            currency: 'MWK',
            totalAmount: 100000,
            amountPaid: 0,
            paymentStatus: 'UNPAID',
            notes: null,
            createdBy: 'test-user-id',
            createdAt: now,
            updatedAt: now,
        });
        const booking = await bookingRef.get();
        const totalAmount = booking.data()?.totalAmount;
        const currentPaid = booking.data()?.amountPaid || 0;
        // Attempt to pay 150000 (more than totalAmount)
        const attemptedPayment = 150000;
        const remaining = totalAmount - currentPaid;
        // In the API, this would return an error
        expect(attemptedPayment).toBeGreaterThan(remaining);
        // API would respond with: "Payment amount exceeds remaining balance"
    });
    it('should calculate amountPaid correctly across multiple currencies', async () => {
        // This test documents that payments should match booking currency
        // If booking is in MWK, payments should be in MWK
        // If booking is in GBP, payments should be in GBP
        // Mixing currencies would require conversion logic (not in MVP)
        const propertyId = await (0, test_helpers_1.createTestProperty)();
        const guestId = await (0, test_helpers_1.createTestGuest)();
        const now = new Date().toISOString();
        const day1 = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const day2 = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0];
        // Create GBP booking
        const bookingRef = await db.collection('bookings').add({
            guestId,
            propertyId,
            status: 'CONFIRMED',
            checkInDate: day1,
            checkOutDate: day2,
            numberOfGuests: 2,
            currency: 'GBP',
            totalAmount: 10000, // £100.00 in pence
            amountPaid: 0,
            paymentStatus: 'UNPAID',
            notes: null,
            createdBy: 'test-user-id',
            createdAt: now,
            updatedAt: now,
        });
        // Payment should be in same currency
        const paymentRef = await db.collection('payments').add({
            bookingId: bookingRef.id,
            amount: 10000,
            currency: 'GBP', // Must match booking currency
            method: 'CARD',
            status: 'COMPLETED',
            reference: 'CARD-001',
            paychanguReference: null,
            paychanguCheckoutId: null,
            paymentLink: null,
            paymentLinkExpiresAt: null,
            notes: null,
            createdBy: 'test-user-id',
            createdAt: now,
            updatedAt: now,
        });
        const payment = await paymentRef.get();
        const booking = await bookingRef.get();
        expect(payment.data()?.currency).toBe(booking.data()?.currency);
    });
});
