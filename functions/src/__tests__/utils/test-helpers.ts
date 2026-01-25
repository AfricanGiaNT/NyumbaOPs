import { getFirestore } from 'firebase-admin/firestore';

export const createTestProperty = async (overrides: any = {}) => {
  const db = getFirestore();
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

export const createTestGuest = async (overrides: any = {}) => {
  const db = getFirestore();
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

export const createTestCategory = async (type: 'REVENUE' | 'EXPENSE', overrides: any = {}) => {
  const db = getFirestore();
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

export const createTestTransaction = async (
  propertyId: string,
  categoryId: string,
  overrides: any = {}
) => {
  const db = getFirestore();
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

export const createTestBooking = async (
  propertyId: string,
  guestId: string,
  overrides: any = {}
) => {
  const db = getFirestore();
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
