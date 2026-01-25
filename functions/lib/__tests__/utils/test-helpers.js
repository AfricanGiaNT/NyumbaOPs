"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTestBooking = exports.createTestTransaction = exports.createTestCategory = exports.createTestGuest = exports.createTestProperty = void 0;
const firestore_1 = require("firebase-admin/firestore");
const createTestProperty = async (overrides = {}) => {
    const db = (0, firestore_1.getFirestore)();
    const now = new Date().toISOString();
    const docRef = await db.collection('properties').add({
        name: 'Test Property',
        location: 'Test Area',
        bedrooms: 2,
        bathrooms: 1,
        maxGuests: 4,
        nightlyRate: 50000,
        currency: 'MWK',
        status: 'ACTIVE',
        amenities: [],
        images: [],
        createdAt: now,
        updatedAt: now,
        ...overrides,
    });
    return docRef.id;
};
exports.createTestProperty = createTestProperty;
const createTestGuest = async (overrides = {}) => {
    const db = (0, firestore_1.getFirestore)();
    const now = new Date().toISOString();
    const docRef = await db.collection('guests').add({
        name: 'Test Guest',
        email: 'test@example.com',
        phone: '0991234567',
        source: 'LOCAL',
        notes: null,
        rating: null,
        createdBy: 'test-user-id',
        createdAt: now,
        updatedAt: now,
        ...overrides,
    });
    return docRef.id;
};
exports.createTestGuest = createTestGuest;
const createTestCategory = async (type, overrides = {}) => {
    const db = (0, firestore_1.getFirestore)();
    const now = new Date().toISOString();
    const docRef = await db.collection('categories').add({
        name: type === 'REVENUE' ? 'Booking' : 'Utilities',
        type,
        isSystem: true,
        createdBy: 'test-user-id',
        createdAt: now,
        updatedAt: now,
        ...overrides,
    });
    return docRef.id;
};
exports.createTestCategory = createTestCategory;
const createTestTransaction = async (propertyId, categoryId, overrides = {}) => {
    const db = (0, firestore_1.getFirestore)();
    const now = new Date().toISOString();
    const docRef = await db.collection('transactions').add({
        propertyId,
        type: 'REVENUE',
        categoryId,
        amount: 100000,
        currency: 'MWK',
        date: now,
        notes: null,
        createdBy: 'test-user-id',
        createdAt: now,
        updatedAt: now,
        ...overrides,
    });
    return docRef.id;
};
exports.createTestTransaction = createTestTransaction;
const createTestBooking = async (propertyId, guestId, overrides = {}) => {
    const db = (0, firestore_1.getFirestore)();
    const now = new Date().toISOString();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dayAfter = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0];
    const docRef = await db.collection('bookings').add({
        guestId,
        propertyId,
        status: 'PENDING',
        checkInDate: tomorrow,
        checkOutDate: dayAfter,
        numberOfGuests: 2,
        currency: 'MWK',
        totalAmount: 100000,
        amountPaid: 0,
        paymentStatus: 'UNPAID',
        notes: null,
        createdBy: 'test-user-id',
        createdAt: now,
        updatedAt: now,
        ...overrides,
    });
    return docRef.id;
};
exports.createTestBooking = createTestBooking;
