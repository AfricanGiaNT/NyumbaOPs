"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const firestore_1 = require("firebase-admin/firestore");
const test_helpers_1 = require("./utils/test-helpers");
describe('Analytics - calculateCurrencySummary', () => {
    const db = (0, firestore_1.getFirestore)();
    it('should calculate profit with MWK transactions only', async () => {
        const propertyId = await (0, test_helpers_1.createTestProperty)();
        const revenueCatId = await (0, test_helpers_1.createTestCategory)('REVENUE');
        const expenseCatId = await (0, test_helpers_1.createTestCategory)('EXPENSE');
        // Create transactions
        await (0, test_helpers_1.createTestTransaction)(propertyId, revenueCatId, {
            type: 'REVENUE',
            amount: 150000,
            currency: 'MWK',
        });
        await (0, test_helpers_1.createTestTransaction)(propertyId, revenueCatId, {
            type: 'REVENUE',
            amount: 200000,
            currency: 'MWK',
        });
        await (0, test_helpers_1.createTestTransaction)(propertyId, expenseCatId, {
            type: 'EXPENSE',
            amount: 50000,
            currency: 'MWK',
        });
        // Fetch and calculate
        const snapshot = await db.collection('transactions').get();
        const transactions = snapshot.docs.map((doc) => doc.data());
        const summary = calculateCurrencySummary(transactions);
        expect(summary).toHaveLength(1);
        expect(summary[0]).toEqual({
            currency: 'MWK',
            revenue: 350000,
            expense: 50000,
            profit: 300000,
        });
    });
    it('should calculate profit with mixed MWK and GBP transactions', async () => {
        const propertyId = await (0, test_helpers_1.createTestProperty)();
        const revenueCatId = await (0, test_helpers_1.createTestCategory)('REVENUE');
        const expenseCatId = await (0, test_helpers_1.createTestCategory)('EXPENSE');
        // MWK transactions
        await (0, test_helpers_1.createTestTransaction)(propertyId, revenueCatId, {
            type: 'REVENUE',
            amount: 150000,
            currency: 'MWK',
        });
        await (0, test_helpers_1.createTestTransaction)(propertyId, expenseCatId, {
            type: 'EXPENSE',
            amount: 50000,
            currency: 'MWK',
        });
        // GBP transactions
        await (0, test_helpers_1.createTestTransaction)(propertyId, revenueCatId, {
            type: 'REVENUE',
            amount: 10000, // £100.00 in pence
            currency: 'GBP',
        });
        await (0, test_helpers_1.createTestTransaction)(propertyId, expenseCatId, {
            type: 'EXPENSE',
            amount: 2000, // £20.00 in pence
            currency: 'GBP',
        });
        // Fetch and calculate
        const snapshot = await db.collection('transactions').get();
        const transactions = snapshot.docs.map((doc) => doc.data());
        const summary = calculateCurrencySummary(transactions);
        expect(summary).toHaveLength(2);
        const mwkSummary = summary.find((s) => s.currency === 'MWK');
        expect(mwkSummary).toEqual({
            currency: 'MWK',
            revenue: 150000,
            expense: 50000,
            profit: 100000,
        });
        const gbpSummary = summary.find((s) => s.currency === 'GBP');
        expect(gbpSummary).toEqual({
            currency: 'GBP',
            revenue: 10000,
            expense: 2000,
            profit: 8000,
        });
    });
    it('should handle zero transactions', () => {
        const summary = calculateCurrencySummary([]);
        expect(summary).toEqual([]);
    });
    it('should handle only revenue transactions', async () => {
        const propertyId = await (0, test_helpers_1.createTestProperty)();
        const revenueCatId = await (0, test_helpers_1.createTestCategory)('REVENUE');
        await (0, test_helpers_1.createTestTransaction)(propertyId, revenueCatId, {
            type: 'REVENUE',
            amount: 100000,
            currency: 'MWK',
        });
        const snapshot = await db.collection('transactions').get();
        const transactions = snapshot.docs.map((doc) => doc.data());
        const summary = calculateCurrencySummary(transactions);
        expect(summary).toEqual([
            {
                currency: 'MWK',
                revenue: 100000,
                expense: 0,
                profit: 100000,
            },
        ]);
    });
});
describe('Analytics - getDateRange', () => {
    it('should return correct range for YYYY-MM format', () => {
        const range = getDateRange('2026-01');
        expect(range).not.toBeNull();
        expect(range.start).toEqual(new Date(Date.UTC(2026, 0, 1)));
        expect(range.end).toEqual(new Date(Date.UTC(2026, 1, 1)));
    });
    it('should return correct range for December (year rollover)', () => {
        const range = getDateRange('2026-12');
        expect(range).not.toBeNull();
        expect(range.start).toEqual(new Date(Date.UTC(2026, 11, 1)));
        expect(range.end).toEqual(new Date(Date.UTC(2027, 0, 1)));
    });
    it('should return null when no month or year provided', () => {
        const range = getDateRange();
        expect(range).toBeNull();
    });
    it('should throw error for invalid month format', () => {
        expect(() => getDateRange('invalid-format')).toThrow('Invalid month format');
    });
    it('should throw error for invalid month number', () => {
        expect(() => getDateRange('2026-13')).toThrow('Invalid month format');
        expect(() => getDateRange('2026-00')).toThrow('Invalid month format');
    });
    it('should return correct range for year only', () => {
        const range = getDateRange(undefined, '2026');
        expect(range).not.toBeNull();
        expect(range.start).toEqual(new Date(Date.UTC(2026, 0, 1)));
        expect(range.end).toEqual(new Date(Date.UTC(2027, 0, 1)));
    });
});
// Helper function from index.ts for testing
function calculateCurrencySummary(transactions) {
    const map = new Map();
    transactions.forEach((transaction) => {
        const entry = map.get(transaction.currency) ?? { revenue: 0, expense: 0 };
        if (transaction.type === 'REVENUE') {
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
function getDateRange(month, year) {
    if (!month && !year) {
        return null;
    }
    if (month) {
        const [yearPart, monthPart] = month.split('-').map((value) => Number(value));
        if (!yearPart || !monthPart || monthPart < 1 || monthPart > 12) {
            throw new Error('Invalid month format. Use YYYY-MM');
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
