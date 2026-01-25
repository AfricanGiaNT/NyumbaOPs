"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
// Initialize Firebase Admin
(0, app_1.initializeApp)({
    projectId: process.env.FIREBASE_PROJECT_ID || 'nyumbaops',
});
const db = (0, firestore_1.getFirestore)();
async function validateData() {
    console.log('Starting data integrity validation...\n');
    let errorCount = 0;
    // Check: No bookings with amountPaid > totalAmount
    console.log('Checking bookings for overpayment...');
    const bookings = await db.collection('bookings').get();
    bookings.forEach((doc) => {
        const data = doc.data();
        if (data.amountPaid > data.totalAmount) {
            console.error(`❌ Booking ${doc.id} has overpayment: paid ${data.amountPaid}, total ${data.totalAmount}`);
            errorCount++;
        }
    });
    console.log(`✓ Checked ${bookings.size} bookings\n`);
    // Check: All transactions have valid categoryId
    console.log('Checking transactions for valid categories...');
    const transactions = await db.collection('transactions').get();
    for (const doc of transactions.docs) {
        const data = doc.data();
        try {
            const category = await db.collection('categories').doc(data.categoryId).get();
            if (!category.exists) {
                console.error(`❌ Transaction ${doc.id} has invalid category: ${data.categoryId}`);
                errorCount++;
            }
        }
        catch (error) {
            console.error(`❌ Transaction ${doc.id} error checking category:`, error);
            errorCount++;
        }
    }
    console.log(`✓ Checked ${transactions.size} transactions\n`);
    // Check: All payments link to existing bookings
    console.log('Checking payments for valid bookings...');
    const payments = await db.collection('payments').get();
    for (const doc of payments.docs) {
        const data = doc.data();
        try {
            const booking = await db.collection('bookings').doc(data.bookingId).get();
            if (!booking.exists) {
                console.error(`❌ Payment ${doc.id} has invalid booking: ${data.bookingId}`);
                errorCount++;
            }
        }
        catch (error) {
            console.error(`❌ Payment ${doc.id} error checking booking:`, error);
            errorCount++;
        }
    }
    console.log(`✓ Checked ${payments.size} payments\n`);
    // Check: All bookings have valid propertyId
    console.log('Checking bookings for valid properties...');
    for (const doc of bookings.docs) {
        const data = doc.data();
        try {
            const property = await db.collection('properties').doc(data.propertyId).get();
            if (!property.exists) {
                console.error(`❌ Booking ${doc.id} has invalid property: ${data.propertyId}`);
                errorCount++;
            }
        }
        catch (error) {
            console.error(`❌ Booking ${doc.id} error checking property:`, error);
            errorCount++;
        }
    }
    console.log(`✓ Verified property references\n`);
    // Check: Inquiries with CONVERTED status have bookingId
    console.log('Checking converted inquiries...');
    const inquiries = await db.collection('inquiries').get();
    inquiries.forEach((doc) => {
        const data = doc.data();
        if (data.status === 'CONVERTED' && !data.bookingId) {
            console.error(`❌ Inquiry ${doc.id} is CONVERTED but has no bookingId`);
            errorCount++;
        }
    });
    console.log(`✓ Checked ${inquiries.size} inquiries\n`);
    // Summary
    console.log('=====================================');
    if (errorCount === 0) {
        console.log('✅ Data integrity validation passed!');
    }
    else {
        console.log(`❌ Found ${errorCount} integrity issues`);
    }
    console.log('=====================================');
    process.exit(errorCount === 0 ? 0 : 1);
}
validateData().catch((error) => {
    console.error('Validation script error:', error);
    process.exit(1);
});
