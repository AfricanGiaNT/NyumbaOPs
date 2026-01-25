"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAudit = logAudit;
const firebase_1 = require("./firebase");
async function logAudit(action, resourceType, resourceId, userId, details) {
    await firebase_1.db.collection("auditLogs").add({
        action,
        resourceType,
        resourceId,
        userId,
        details: details ?? null,
        createdAt: new Date().toISOString(),
    });
}
