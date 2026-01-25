import { getFirestore } from 'firebase-admin/firestore';
import { logAudit } from './audit';
import { AppError } from './errors';

const db = getFirestore();

export async function getDocOrThrow<T = any>(
  collection: string,
  id: string,
  errorMessage: string = 'Document not found'
): Promise<T> {
  const doc = await db.collection(collection).doc(id).get();
  if (!doc.exists) {
    throw new AppError('NOT_FOUND', errorMessage, 404);
  }
  return doc.data() as T;
}

export async function updateDoc(
  collection: string,
  id: string,
  data: any,
  userId: string,
  resourceType?: string
): Promise<void> {
  const docRef = db.collection(collection).doc(id);
  const doc = await docRef.get();
  if (!doc.exists) {
    throw new AppError('NOT_FOUND', `${collection} not found`, 404);
  }
  
  await docRef.update({
    ...data,
    updatedAt: new Date().toISOString(),
  });
  
  if (resourceType) {
    await logAudit('UPDATE', resourceType, id, userId, data);
  }
}

export async function deleteDoc(
  collection: string,
  id: string,
  userId: string,
  resourceType?: string
): Promise<void> {
  const docRef = db.collection(collection).doc(id);
  const doc = await docRef.get();
  if (!doc.exists) {
    throw new AppError('NOT_FOUND', `${collection} not found`, 404);
  }
  
  await docRef.delete();
  
  if (resourceType) {
    await logAudit('DELETE', resourceType, id, userId);
  }
}

export function validateDateRange(checkIn: string, checkOut: string): void {
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  
  if (!(checkInDate < checkOutDate)) {
    throw new AppError('INVALID_DATE_RANGE', 'Check-out must be after check-in');
  }
}

export function validateAmount(amount: number): void {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError('INVALID_AMOUNT', 'Amount must be a positive number');
  }
}
