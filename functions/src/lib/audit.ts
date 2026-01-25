import { db } from "./firebase";

export async function logAudit(action: string, resourceType: string, resourceId: string, userId: string, details?: Record<string, unknown>) {
  await db.collection("auditLogs").add({
    action,
    resourceType,
    resourceId,
    userId,
    details: details ?? null,
    createdAt: new Date().toISOString(),
  });
}
