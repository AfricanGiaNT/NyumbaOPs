"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDocOrThrow = getDocOrThrow;
exports.updateDoc = updateDoc;
exports.deleteDoc = deleteDoc;
exports.validateDateRange = validateDateRange;
exports.validateAmount = validateAmount;
const firestore_1 = require("firebase-admin/firestore");
const audit_1 = require("./audit");
const errors_1 = require("./errors");
const db = (0, firestore_1.getFirestore)();
async function getDocOrThrow(collection, id, errorMessage = 'Document not found') {
    const doc = await db.collection(collection).doc(id).get();
    if (!doc.exists) {
        throw new errors_1.AppError('NOT_FOUND', errorMessage, 404);
    }
    return doc.data();
}
async function updateDoc(collection, id, data, userId, resourceType) {
    const docRef = db.collection(collection).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
        throw new errors_1.AppError('NOT_FOUND', `${collection} not found`, 404);
    }
    await docRef.update({
        ...data,
        updatedAt: new Date().toISOString(),
    });
    if (resourceType) {
        await (0, audit_1.logAudit)('UPDATE', resourceType, id, userId, data);
    }
}
async function deleteDoc(collection, id, userId, resourceType) {
    const docRef = db.collection(collection).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
        throw new errors_1.AppError('NOT_FOUND', `${collection} not found`, 404);
    }
    await docRef.delete();
    if (resourceType) {
        await (0, audit_1.logAudit)('DELETE', resourceType, id, userId);
    }
}
function validateDateRange(checkIn, checkOut) {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    if (!(checkInDate < checkOutDate)) {
        throw new errors_1.AppError('INVALID_DATE_RANGE', 'Check-out must be after check-in');
    }
}
function validateAmount(amount) {
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new errors_1.AppError('INVALID_AMOUNT', 'Amount must be a positive number');
    }
}
