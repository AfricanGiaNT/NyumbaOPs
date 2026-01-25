import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import express from "express";
import cors from "cors";
import { verifyFirebaseToken, requireRole } from "./lib/auth";
import { db, storage } from "./lib/firebase";
import { isValidStatusTransition } from "./lib/booking-utils";
import { createCheckout, verifyWebhookSignature } from "./lib/paychangu";
import { createRateLimiter } from "./lib/rate-limiter";
import {
  BookingStatus,
  CategoryType,
  Currency,
  TransactionType,
} from "./lib/types";
import { logAudit } from "./lib/audit";
import { errorHandler, AppError, asyncHandler } from "./lib/errors";
import type { AuthContext } from "./lib/auth";
import type { Query } from "firebase-admin/firestore";

const inquiryRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.INQUIRY_RATE_LIMIT ?? 5),
  message: "Too many inquiries. Please try again in 15 minutes.",
});

const publicApiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: "Too many requests. Please try again later.",
});

const app = express();

// CORS configuration - restrict to known domains
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.PUBLIC_URL,
  process.env.DASHBOARD_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use("/v1/public/webhooks/paychangu", express.raw({ type: "application/json" }));
app.use(express.json());

const apiRouter = express.Router();
const publicRouter = express.Router();
const protectedRouter = express.Router();

protectedRouter.use(verifyFirebaseToken);

// ---- Public endpoints ----
publicRouter.get("/properties", publicApiRateLimiter, asyncHandler(async (req, res) => {
  const featured = req.query.featured === "true";
  const limit = featured ? 6 : Number(req.query.limit ?? 10);
  const offset = Number(req.query.offset ?? 0);

  const snapshot = await db
    .collection("properties")
    .where("status", "==", "ACTIVE")
    .orderBy("createdAt", "desc")
    .offset(offset)
    .limit(limit)
    .get();

  const data = snapshot.docs.map((doc) => {
    const payload = doc.data();
    const images = (payload.images ?? []) as { url: string; alt?: string | null; isCover?: boolean }[];
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
      total: snapshot.size,
      limit,
      offset,
    },
  });
}));

publicRouter.get("/properties/:id", publicApiRateLimiter, asyncHandler(async (req, res) => {
  const doc = await db.collection("properties").doc(req.params.id).get();
  if (!doc.exists) {
    return res.status(404).json({ message: "Property not found" });
  }
  const payload = doc.data();
  if (payload?.status !== "ACTIVE") {
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
  if (
    !payload.propertyId ||
    !payload.guestName ||
    !payload.guestPhone ||
    !payload.checkInDate ||
    !payload.checkOutDate ||
    !payload.numberOfGuests
  ) {
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

  const propertyDoc = await db.collection("properties").doc(payload.propertyId).get();
  if (!propertyDoc.exists || propertyDoc.data()?.status !== "ACTIVE") {
    return res.status(404).json({
      success: false,
      error: { code: "PROPERTY_NOT_FOUND", message: "Property not found" },
    });
  }

  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const docRef = await db.collection("inquiries").add({
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

publicRouter.post("/uploads", asyncHandler(async (req, res) => {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/c5f540ce-21d1-4d7f-896a-2f6702ebbfa3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.ts:198',message:'Upload endpoint hit',data:{body:req.body,contentType:req.headers['content-type']},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  
  const { propertyId, filename, contentType, alt, isCover, sortOrder } = req.body ?? {};
  
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/c5f540ce-21d1-4d7f-896a-2f6702ebbfa3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.ts:205',message:'Extracted request data',data:{propertyId,filename,contentType,alt,isCover,sortOrder},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  
  if (!propertyId || !filename || !contentType) {
    throw new AppError('VALIDATION_ERROR', 'Missing required fields');
  }

  const propertyDoc = await db.collection("properties").doc(propertyId).get();
  if (!propertyDoc.exists) {
    throw new AppError('PROPERTY_NOT_FOUND', 'Property not found', 404);
  }

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/c5f540ce-21d1-4d7f-896a-2f6702ebbfa3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.ts:221',message:'Env vars before bucket',data:{FIREBASE_STORAGE_BUCKET:process.env.FIREBASE_STORAGE_BUCKET,FIREBASE_STORAGE_EMULATOR_HOST:process.env.FIREBASE_STORAGE_EMULATOR_HOST,FIRESTORE_EMULATOR_HOST:process.env.FIRESTORE_EMULATOR_HOST},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
  // #endregion

  // Get bucket - use default if not specified
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET || "nyumbaops.appspot.com";
  
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/c5f540ce-21d1-4d7f-896a-2f6702ebbfa3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.ts:229',message:'Bucket name resolved',data:{bucketName},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  
  const bucket = storage.bucket(bucketName);
  
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/c5f540ce-21d1-4d7f-896a-2f6702ebbfa3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.ts:236',message:'Bucket object created',data:{bucketExists:!!bucket,bucketName:bucket?.name},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  if (!bucket) {
    throw new AppError(
      'STORAGE_ERROR', 
      `Storage bucket not configured. Set FIREBASE_STORAGE_BUCKET environment variable or ensure storage emulator is running.`,
      500
    );
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(contentType)) {
    throw new AppError('INVALID_FILE_TYPE', 'Only JPEG, PNG, and WebP images are allowed');
  }

  const safeName = String(filename).toLowerCase().replace(/[^a-z0-9.-]+/g, "-");
  const key = `properties/${propertyId}/${Date.now()}-${safeName}`;
  const file = bucket.file(key);
  
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/c5f540ce-21d1-4d7f-896a-2f6702ebbfa3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.ts:251',message:'Before URL generation',data:{key,safeName,hasEmulatorHost:!!process.env.FIREBASE_STORAGE_EMULATOR_HOST},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B',runId:'post-fix'})}).catch(()=>{});
  // #endregion
  
  let uploadUrl: string;
  
  // Check if we're in emulator mode
  const isEmulator = !!process.env.FIREBASE_STORAGE_EMULATOR_HOST;
  
  if (isEmulator) {
    // Emulator doesn't support signed URLs - use direct HTTP URL
    const emulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST || '127.0.0.1:9199';
    uploadUrl = `http://${emulatorHost}/upload/storage/v1/b/${bucket.name}/o?name=${encodeURIComponent(key)}`;
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/c5f540ce-21d1-4d7f-896a-2f6702ebbfa3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.ts:270',message:'Emulator upload URL created',data:{uploadUrl,emulatorHost},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B',runId:'post-fix'})}).catch(()=>{});
    // #endregion
  } else {
    // Production: use signed URLs
    try {
      [uploadUrl] = await file.getSignedUrl({
        action: "write",
        expires: Date.now() + 15 * 60 * 1000,
        contentType,
      });
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/c5f540ce-21d1-4d7f-896a-2f6702ebbfa3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.ts:284',message:'Production signed URL created',data:{uploadUrlLength:uploadUrl?.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B',runId:'post-fix'})}).catch(()=>{});
      // #endregion
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/c5f540ce-21d1-4d7f-896a-2f6702ebbfa3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.ts:290',message:'getSignedUrl failed',data:{errorMessage:error instanceof Error?error.message:'unknown'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B',runId:'post-fix'})}).catch(()=>{});
      // #endregion
      console.error('Failed to generate signed URL:', error);
      throw new AppError(
        'STORAGE_ERROR',
        `Failed to generate upload URL. ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      );
    }
  }

  // For emulator, use localhost URL; for production, use Google Cloud Storage URL  
  const publicUrl = isEmulator
    ? `http://${process.env.FIREBASE_STORAGE_EMULATOR_HOST || '127.0.0.1:9199'}/v0/b/${bucket.name}/o/${encodeURIComponent(key)}`
    : `https://storage.googleapis.com/${bucket.name}/${key}`;
  
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/c5f540ce-21d1-4d7f-896a-2f6702ebbfa3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.ts:310',message:'publicUrl constructed',data:{publicUrl,isEmulator},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E',runId:'post-fix'})}).catch(()=>{});
  // #endregion

  const image = {
    url: publicUrl,
    alt: alt ?? null,
    sortOrder: Number(sortOrder ?? 0),
    isCover: Boolean(isCover ?? false),
  };

  await db.collection("properties").doc(propertyId).update({
    images: [...(propertyDoc.data()?.images ?? []), image],
    updatedAt: new Date().toISOString(),
  });
  
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/c5f540ce-21d1-4d7f-896a-2f6702ebbfa3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.ts:328',message:'Before response',data:{uploadUrlDefined:typeof uploadUrl,hasValue:!!uploadUrl},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B',runId:'post-fix'})}).catch(()=>{});
  // #endregion

  return res.json({ success: true, data: { uploadUrl: uploadUrl, publicUrl: image.url } });
}));

publicRouter.post("/webhooks/paychangu", async (req, res) => {
  const signature = req.headers["x-paychangu-signature"] as string | undefined;
  const rawBody = Buffer.isBuffer(req.body)
    ? req.body.toString("utf8")
    : JSON.stringify(req.body ?? {});

  if (!verifyWebhookSignature(rawBody, signature)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  let payload: any = {};
  try {
    payload = Buffer.isBuffer(req.body) ? JSON.parse(rawBody) : req.body ?? {};
  } catch (error) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const event = payload.event ?? payload.type;
  if (event === "payment.success") {
    await handlePaymentSuccess(payload.data ?? payload);
  } else if (event === "payment.failed") {
    await handlePaymentFailed(payload.data ?? payload);
  }

  return res.json({ received: true });
});

// ---- Protected endpoints ----
protectedRouter.post("/properties", requireRole(["OWNER", "STAFF"]), async (req, res) => {
  const payload = req.body ?? {};
  const now = new Date().toISOString();
  const docRef = await db.collection("properties").add({
    name: payload.name,
    location: payload.location ?? null,
    bedrooms: payload.bedrooms,
    bathrooms: payload.bathrooms,
    maxGuests: payload.maxGuests,
    nightlyRate: payload.nightlyRate ?? null,
    currency: payload.currency as Currency,
    status: payload.status ?? "ACTIVE",
    amenities: payload.amenities ?? [],
    images: payload.images ?? [],
    createdAt: now,
    updatedAt: now,
  });

  await logAudit("CREATE", "Property", docRef.id, req.auth!.uid, { name: payload.name });
  const created = await docRef.get();
  return res.json({ id: docRef.id, ...created.data() });
});

protectedRouter.get("/properties", async (_req, res) => {
  const snapshot = await db.collection("properties").orderBy("createdAt", "desc").get();
  const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return res.json(data);
});

protectedRouter.get("/properties/:id", async (req, res) => {
  const doc = await db.collection("properties").doc(req.params.id).get();
  if (!doc.exists) {
    return res.status(404).json({ message: "Property not found" });
  }
  return res.json({ id: doc.id, ...doc.data() });
});

protectedRouter.patch("/properties/:id", requireRole(["OWNER", "STAFF"]), async (req, res) => {
  const docRef = db.collection("properties").doc(req.params.id);
  const doc = await docRef.get();
  if (!doc.exists) {
    return res.status(404).json({ message: "Property not found" });
  }
  await docRef.update({ ...req.body, updatedAt: new Date().toISOString() });
  await logAudit("UPDATE", "Property", docRef.id, req.auth!.uid, { name: req.body?.name });
  const updated = await docRef.get();
  return res.json({ id: updated.id, ...updated.data() });
});

protectedRouter.delete("/properties/:id", requireRole(["OWNER", "STAFF"]), async (req, res) => {
  const docRef = db.collection("properties").doc(req.params.id);
  const doc = await docRef.get();
  if (!doc.exists) {
    return res.status(404).json({ message: "Property not found" });
  }
  await docRef.update({ status: "INACTIVE", updatedAt: new Date().toISOString() });
  await logAudit("DELETE", "Property", docRef.id, req.auth!.uid);
  const updated = await docRef.get();
  return res.json({ id: updated.id, ...updated.data() });
});

protectedRouter.get("/categories", async (req, res) => {
  const type = req.query.type as CategoryType | undefined;
  let query: Query = db.collection("categories");
  if (type) {
    query = query.where("type", "==", type);
  }
  const snapshot = await query.orderBy("name", "asc").get();
  return res.json(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
});

protectedRouter.post("/categories", requireRole(["OWNER", "STAFF"]), async (req, res) => {
  const payload = req.body ?? {};
  const now = new Date().toISOString();
  const docRef = await db.collection("categories").add({
    name: payload.name,
    type: payload.type,
    isSystem: payload.isSystem ?? false,
    createdBy: req.auth!.uid,
    createdAt: now,
    updatedAt: now,
  });
  await logAudit("CREATE", "Category", docRef.id, req.auth!.uid, { name: payload.name });
  const created = await docRef.get();
  return res.json({ id: docRef.id, ...created.data() });
});

protectedRouter.post("/transactions/revenue", requireRole(["OWNER", "STAFF"]), async (req, res) => {
  return createTransaction(req, res, "REVENUE");
});

protectedRouter.post("/transactions/expense", requireRole(["OWNER", "STAFF"]), async (req, res) => {
  return createTransaction(req, res, "EXPENSE");
});

protectedRouter.get("/transactions", asyncHandler(async (req, res) => {
  const propertyId = req.query.propertyId as string | undefined;
  const type = req.query.type as TransactionType | undefined;
  const month = req.query.month as string | undefined;
  const year = req.query.year as string | undefined;

  let query: Query = db.collection("transactions");
  
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
  const data = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as TransactionRecord) }));

  return res.json(data);
}));

protectedRouter.delete("/transactions/:id", requireRole(["OWNER", "STAFF"]), async (req, res) => {
  const docRef = db.collection("transactions").doc(req.params.id);
  const doc = await docRef.get();
  if (!doc.exists) {
    return res.status(404).json({ message: "Transaction not found" });
  }
  await docRef.delete();
  await logAudit("DELETE", "Transaction", docRef.id, req.auth!.uid);
  return res.json({ id: doc.id, ...doc.data() });
});

protectedRouter.post("/guests", requireRole(["OWNER", "STAFF"]), async (req, res) => {
  const payload = req.body ?? {};
  const now = new Date().toISOString();
  const docRef = await db.collection("guests").add({
    name: payload.name,
    email: payload.email ?? null,
    phone: payload.phone ?? null,
    source: payload.source,
    notes: payload.notes ?? null,
    rating: payload.rating ?? null,
    createdBy: req.auth!.uid,
    createdAt: now,
    updatedAt: now,
  });
  await logAudit("CREATE", "Guest", docRef.id, req.auth!.uid, { name: payload.name });
  const created = await docRef.get();
  return res.json({ id: docRef.id, ...created.data() });
});

protectedRouter.get("/guests", async (_req, res) => {
  const snapshot = await db.collection("guests").orderBy("createdAt", "desc").get();
  return res.json(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
});

protectedRouter.get("/guests/:id", async (req, res) => {
  const doc = await db.collection("guests").doc(req.params.id).get();
  if (!doc.exists) {
    return res.status(404).json({ message: "Guest not found" });
  }
  return res.json({ id: doc.id, ...doc.data() });
});

protectedRouter.patch("/guests/:id", requireRole(["OWNER", "STAFF"]), async (req, res) => {
  const docRef = db.collection("guests").doc(req.params.id);
  const doc = await docRef.get();
  if (!doc.exists) {
    return res.status(404).json({ message: "Guest not found" });
  }
  await docRef.update({ ...req.body, updatedAt: new Date().toISOString() });
  await logAudit("UPDATE", "Guest", docRef.id, req.auth!.uid);
  const updated = await docRef.get();
  return res.json({ id: updated.id, ...updated.data() });
});

protectedRouter.delete("/guests/:id", requireRole(["OWNER", "STAFF"]), async (req, res) => {
  const docRef = db.collection("guests").doc(req.params.id);
  const doc = await docRef.get();
  if (!doc.exists) {
    return res.status(404).json({ message: "Guest not found" });
  }
  await docRef.delete();
  await logAudit("DELETE", "Guest", docRef.id, req.auth!.uid);
  return res.json({ id: doc.id, ...doc.data() });
});

protectedRouter.post("/bookings", requireRole(["OWNER", "STAFF"]), async (req, res) => {
  const payload = req.body ?? {};
  try {
    await ensurePropertyAvailable(payload.propertyId, payload.checkInDate, payload.checkOutDate);
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message });
  }
  const now = new Date().toISOString();
  const docRef = await db.collection("bookings").add({
    guestId: payload.guestId,
    propertyId: payload.propertyId,
    status: "PENDING",
    checkInDate: payload.checkInDate,
    checkOutDate: payload.checkOutDate,
    notes: payload.notes ?? null,
    createdBy: req.auth!.uid,
    createdAt: now,
    updatedAt: now,
  });
  await logAudit("CREATE", "Booking", docRef.id, req.auth!.uid, { status: "PENDING" });
  const created = await docRef.get();
  return res.json({ id: docRef.id, ...created.data() });
});

protectedRouter.get("/bookings", async (_req, res) => {
  const snapshot = await db.collection("bookings").orderBy("createdAt", "desc").get();
  return res.json(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
});

protectedRouter.get("/inquiries", async (req, res) => {
  const status = req.query.status as string | undefined;
  const propertyId = req.query.propertyId as string | undefined;
  let query: Query = db.collection("inquiries").orderBy("createdAt", "desc");
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
  const doc = await db.collection("inquiries").doc(req.params.id).get();
  if (!doc.exists) {
    return res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: "Inquiry not found" },
    });
  }
  return res.json({ success: true, data: { id: doc.id, ...doc.data() } });
});

protectedRouter.patch("/inquiries/:id/status", requireRole(["OWNER", "STAFF"]), async (req, res) => {
  const { status } = req.body ?? {};
  const validStatuses = ["NEW", "CONTACTED", "CONVERTED", "EXPIRED"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid status" },
    });
  }

  const docRef = db.collection("inquiries").doc(req.params.id);
  const doc = await docRef.get();
  if (!doc.exists) {
    return res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: "Inquiry not found" },
    });
  }

  await docRef.update({ status, updatedAt: new Date().toISOString() });
  await logAudit("UPDATE", "Inquiry", docRef.id, req.auth!.uid, { status });
  const updated = await docRef.get();
  return res.json({ success: true, data: { id: updated.id, ...updated.data() } });
});

protectedRouter.post("/inquiries/:id/convert", requireRole(["OWNER", "STAFF"]), async (req, res) => {
  const inquiryDoc = await db.collection("inquiries").doc(req.params.id).get();
  if (!inquiryDoc.exists) {
    return res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: "Inquiry not found" },
    });
  }

  const inquiry = inquiryDoc.data()!;
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
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: { code: "BOOKING_CONFLICT", message: (error as Error).message },
    });
  }

  let guestId = req.body?.guestId as string | undefined;
  if (!guestId) {
    const now = new Date().toISOString();
    const guestRef = await db.collection("guests").add({
      name: inquiry.guestName,
      email: inquiry.guestEmail ?? null,
      phone: inquiry.guestPhone ?? null,
      source: "LOCAL",
      notes: `Converted from inquiry ${inquiryDoc.id}`,
      rating: null,
      createdBy: req.auth!.uid,
      createdAt: now,
      updatedAt: now,
    });
    guestId = guestRef.id;
  }

  const propertyDoc = await db.collection("properties").doc(inquiry.propertyId).get();
  const property = propertyDoc.data()!;
  const nights = Math.ceil(
    (new Date(inquiry.checkOutDate).getTime() - new Date(inquiry.checkInDate).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  const totalAmount = (property.nightlyRate ?? 0) * nights;
  const now = new Date().toISOString();

  const bookingRef = await db.collection("bookings").add({
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
    createdBy: req.auth!.uid,
    createdAt: now,
    updatedAt: now,
  });

  await db.collection("inquiries").doc(req.params.id).update({
    status: "CONVERTED",
    bookingId: bookingRef.id,
    updatedAt: now,
  });

  await logAudit("CREATE", "Booking", bookingRef.id, req.auth!.uid, {
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
  const propertyId = req.query.propertyId as string | undefined;
  const checkInDate = req.query.checkInDate as string | undefined;
  const checkOutDate = req.query.checkOutDate as string | undefined;
  if (!propertyId || !checkInDate || !checkOutDate) {
    return res.status(400).json({ message: "Missing parameters" });
  }
  try {
    await ensurePropertyAvailable(propertyId, checkInDate, checkOutDate);
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message });
  }
  return res.json({ available: true });
});

protectedRouter.post("/bookings/:bookingId/payment-link", requireRole(["OWNER", "STAFF"]), async (req, res) => {
  const bookingDoc = await db.collection("bookings").doc(req.params.bookingId).get();
  if (!bookingDoc.exists) {
    return res.status(404).json({
      success: false,
      error: { code: "BOOKING_NOT_FOUND", message: "Booking not found" },
    });
  }

  const booking = bookingDoc.data()!;
  const totalAmount = typeof booking.totalAmount === "number" ? booking.totalAmount : 0;
  const currentPaid = typeof booking.amountPaid === "number" ? booking.amountPaid : 0;
  const remainingAmount = totalAmount - currentPaid;
  if (remainingAmount <= 0) {
    return res.status(400).json({
      success: false,
      error: { code: "ALREADY_PAID", message: "Booking is fully paid" },
    });
  }

  const guestDoc = await db.collection("guests").doc(booking.guestId).get();
  if (!guestDoc.exists) {
    return res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: "Guest not found" },
    });
  }

  const propertyDoc = await db.collection("properties").doc(booking.propertyId).get();
  if (!propertyDoc.exists) {
    return res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: "Property not found" },
    });
  }

  const guest = guestDoc.data()!;
  const property = propertyDoc.data()!;
  const nameParts = String(guest.name ?? "Guest").trim().split(" ");
  const firstName = nameParts[0] ?? "Guest";
  const lastName = nameParts.slice(1).join(" ") || firstName;
  const currency = (booking.currency ?? property.currency ?? "MWK") as Currency;

  const webhookUrl =
    process.env.PAYCHANGU_WEBHOOK_URL ??
    `${process.env.PUBLIC_URL}/api/v1/public/webhooks/paychangu`;

  const checkoutData = await createCheckout({
    amount: remainingAmount,
    currency,
    email: guest.email ?? undefined,
    firstName,
    lastName,
    callbackUrl: webhookUrl,
    returnUrl: `${process.env.PUBLIC_URL}/booking-confirmation?bookingId=${req.params.bookingId}`,
    customization: {
      title: `Payment for ${property.name ?? "Booking"}`,
      description: `Booking from ${booking.checkInDate} to ${booking.checkOutDate}`,
      logo: property.images?.[0]?.url,
    },
  });

  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const paymentRef = await db.collection("payments").add({
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
    createdBy: req.auth!.uid,
    createdAt: now,
    updatedAt: now,
  });

  await logAudit("CREATE", "PaymentLink", paymentRef.id, req.auth!.uid, {
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

protectedRouter.post("/payments", requireRole(["OWNER", "STAFF"]), async (req, res) => {
  const payload = req.body ?? {};
  if (!payload.bookingId || !payload.amount || !payload.currency || !payload.method) {
    return res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Missing required fields" },
    });
  }

  const bookingDoc = await db.collection("bookings").doc(payload.bookingId).get();
  if (!bookingDoc.exists) {
    return res.status(404).json({
      success: false,
      error: { code: "BOOKING_NOT_FOUND", message: "Booking not found" },
    });
  }

  const booking = bookingDoc.data()!;
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
  const paymentRef = await db.collection("payments").add({
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
    createdBy: req.auth!.uid,
    createdAt: now,
    updatedAt: now,
  });

  const newAmountPaid = currentPaid + amount;
  const paymentStatus =
    totalAmount === null
      ? "PARTIAL"
      : newAmountPaid >= totalAmount
        ? "PAID"
        : newAmountPaid > 0
          ? "PARTIAL"
          : "UNPAID";

  await db.collection("bookings").doc(payload.bookingId).update({
    amountPaid: newAmountPaid,
    paymentStatus,
    updatedAt: now,
  });

  const categoryId = await getOrCreateRevenueCategory();
  await db.collection("transactions").add({
    propertyId: booking.propertyId ?? null,
    type: "REVENUE",
    categoryId,
    amount,
    currency: payload.currency,
    date: now,
    notes: `Payment for booking ${payload.bookingId}`,
    createdBy: req.auth!.uid,
    createdAt: now,
    updatedAt: now,
  });

  await logAudit("CREATE", "Payment", paymentRef.id, req.auth!.uid, {
    bookingId: payload.bookingId,
    amount,
    method: payload.method,
  });

  const payment = await paymentRef.get();
  return res.json({ success: true, data: { id: paymentRef.id, ...payment.data() } });
});

protectedRouter.get("/bookings/:bookingId/payments", async (req, res) => {
  const snapshot = await db
    .collection("payments")
    .where("bookingId", "==", req.params.bookingId)
    .orderBy("createdAt", "desc")
    .get();
  return res.json({ success: true, data: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) });
});

protectedRouter.get("/bookings/:id", async (req, res) => {
  const doc = await db.collection("bookings").doc(req.params.id).get();
  if (!doc.exists) {
    return res.status(404).json({ message: "Booking not found" });
  }
  return res.json({ id: doc.id, ...doc.data() });
});

protectedRouter.patch("/bookings/:id", requireRole(["OWNER", "STAFF"]), async (req, res) => {
  const docRef = db.collection("bookings").doc(req.params.id);
  const doc = await docRef.get();
  if (!doc.exists) {
    return res.status(404).json({ message: "Booking not found" });
  }
  const payload = req.body ?? {};
  if (payload.propertyId || payload.checkInDate || payload.checkOutDate) {
    const existing = doc.data()!;
    try {
      await ensurePropertyAvailable(
        payload.propertyId ?? existing.propertyId,
        payload.checkInDate ?? existing.checkInDate,
        payload.checkOutDate ?? existing.checkOutDate,
        docRef.id,
      );
    } catch (error) {
      return res.status(400).json({ message: (error as Error).message });
    }
  }
  await docRef.update({ ...payload, updatedAt: new Date().toISOString() });
  await logAudit("UPDATE", "Booking", docRef.id, req.auth!.uid);
  const updated = await docRef.get();
  return res.json({ id: updated.id, ...updated.data() });
});

protectedRouter.patch("/bookings/:id/status", requireRole(["OWNER", "STAFF"]), async (req, res) => {
  const docRef = db.collection("bookings").doc(req.params.id);
  const doc = await docRef.get();
  if (!doc.exists) {
    return res.status(404).json({ message: "Booking not found" });
  }
  const payload = req.body ?? {};
  const currentStatus = doc.data()?.status as BookingStatus;
  if (!isValidStatusTransition(currentStatus, payload.status)) {
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
  await logAudit("UPDATE", "Booking", docRef.id, req.auth!.uid, { status: payload.status });
  const updated = await docRef.get();
  return res.json({ id: updated.id, ...updated.data() });
});

protectedRouter.delete("/bookings/:id", requireRole(["OWNER", "STAFF"]), async (req, res) => {
  const docRef = db.collection("bookings").doc(req.params.id);
  const doc = await docRef.get();
  if (!doc.exists) {
    return res.status(404).json({ message: "Booking not found" });
  }
  await docRef.delete();
  await logAudit("DELETE", "Booking", docRef.id, req.auth!.uid);
  return res.json({ id: doc.id, ...doc.data() });
});

// In-memory cache for analytics (5 minute TTL)
const analyticsCache = new Map<string, { data: any; expiresAt: number }>();

protectedRouter.get("/analytics/summary", asyncHandler(async (req, res) => {
  const month = req.query.month as string | undefined;
  const cacheKey = `summary:${month ?? 'current'}`;
  
  // Check cache
  const cached = analyticsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return res.json(cached.data);
  }
  
  const range = getDateRange(month);
  const snapshot = await db.collection("transactions").get();
  const data = snapshot.docs.map((doc) => doc.data() as TransactionRecord);
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
  const month = req.query.month as string | undefined;
  const range = getDateRange(month);
  const snapshot = await db
    .collection("transactions")
    .where("propertyId", "==", req.params.id)
    .get();
  const data = snapshot.docs.map((doc) => doc.data() as TransactionRecord);
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

function calculateCurrencySummary(
  transactions: { currency: Currency; type: TransactionType; amount: number }[],
) {
  const map = new Map<Currency, { revenue: number; expense: number }>();
  transactions.forEach((transaction) => {
    const entry = map.get(transaction.currency) ?? { revenue: 0, expense: 0 };
    if (transaction.type === "REVENUE") {
      entry.revenue += transaction.amount;
    } else {
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

type TransactionRecord = {
  currency: Currency;
  type: TransactionType;
  amount: number;
  date: string;
  propertyId?: string | null;
};

async function createTransaction(
  req: express.Request & { auth?: AuthContext },
  res: express.Response,
  type: TransactionType,
) {
  const payload = req.body ?? {};
  if (!payload.categoryId) {
    return res.status(400).json({ message: "Category is required" });
  }

  const categoryDoc = await db.collection("categories").doc(payload.categoryId).get();
  if (!categoryDoc.exists) {
    return res.status(404).json({ message: "Category not found" });
  }
  const category = categoryDoc.data();
  if (category?.type !== type) {
    return res.status(400).json({ message: "Category type does not match transaction type" });
  }

  if (payload.propertyId) {
    const propertyDoc = await db.collection("properties").doc(payload.propertyId).get();
    if (!propertyDoc.exists) {
      return res.status(404).json({ message: "Property not found" });
    }
    if (propertyDoc.data()?.status !== "ACTIVE") {
      return res.status(400).json({ message: "Property is not active" });
    }
  }

  const now = new Date().toISOString();
  const docRef = await db.collection("transactions").add({
    propertyId: payload.propertyId ?? null,
    type,
    categoryId: payload.categoryId,
    amount: payload.amount,
    currency: payload.currency,
    date: payload.date,
    notes: payload.notes ?? null,
    createdBy: req.auth!.uid,
    createdAt: now,
    updatedAt: now,
  });

  await logAudit("CREATE", "Transaction", docRef.id, req.auth!.uid, {
    type,
    amount: payload.amount,
    currency: payload.currency,
  });

  const created = await docRef.get();
  return res.json({ id: docRef.id, ...created.data() });
}

async function ensurePropertyAvailable(
  propertyId: string,
  checkInDate: string,
  checkOutDate: string,
  excludeBookingId?: string,
) {
  const propertyDoc = await db.collection("properties").doc(propertyId).get();
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

  const snapshot = await db
    .collection("bookings")
    .where("propertyId", "==", propertyId)
    .where("status", "in", ["PENDING", "CONFIRMED", "CHECKED_IN"])
    .get();
  const overlaps = snapshot.docs.filter((doc) => {
    if (excludeBookingId && doc.id === excludeBookingId) {
      return false;
    }
    const data = doc.data();
    const bookingCheckIn = new Date(data.checkInDate);
    const bookingCheckOut = new Date(data.checkOutDate);
    return bookingCheckIn < checkOut && bookingCheckOut > checkIn;
  });
  if (overlaps.length > 0) {
    throw new Error("Property is not available for these dates");
  }
}

function getDateRange(month?: string, year?: string) {
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
  const snapshot = await db.collection("categories").where("type", "==", "REVENUE").get();
  const existing = snapshot.docs.find((doc) => doc.data()?.name === "Booking");
  if (existing) {
    return existing.id;
  }

  const now = new Date().toISOString();
  const categoryRef = await db.collection("categories").add({
    name: "Booking",
    type: "REVENUE",
    isSystem: true,
    createdBy: "SYSTEM",
    createdAt: now,
    updatedAt: now,
  });

  return categoryRef.id;
}

async function handlePaymentSuccess(data: any) {
  const checkoutId = data.checkout_id ?? data.checkoutId;
  if (!checkoutId) {
    return;
  }

  const paymentsSnapshot = await db
    .collection("payments")
    .where("paychanguCheckoutId", "==", checkoutId)
    .limit(1)
    .get();

  if (paymentsSnapshot.empty) {
    // Payment not found - log to audit for tracking
    await logAudit('WARNING', 'PaymentWebhook', checkoutId, 'SYSTEM', {
      reason: 'Payment not found for checkout',
      checkoutId,
    });
    return;
  }

  const paymentDoc = paymentsSnapshot.docs[0];
  const payment = paymentDoc.data();
  const now = new Date().toISOString();

  await paymentDoc.ref.update({
    status: "COMPLETED",
    paychanguReference: data.tx_ref ?? data.txRef ?? null,
    reference: data.mobile_number ?? data.card_last4 ?? null,
    updatedAt: now,
  });

  const bookingDoc = await db.collection("bookings").doc(payment.bookingId).get();
  if (!bookingDoc.exists) {
    return;
  }

  const booking = bookingDoc.data()!;
  const totalAmount = typeof booking.totalAmount === "number" ? booking.totalAmount : null;
  const currentPaid = typeof booking.amountPaid === "number" ? booking.amountPaid : 0;
  const newAmountPaid = currentPaid + (payment.amount ?? 0);
  const paymentStatus =
    totalAmount === null
      ? "PARTIAL"
      : newAmountPaid >= totalAmount
        ? "PAID"
        : newAmountPaid > 0
          ? "PARTIAL"
          : "UNPAID";

  await bookingDoc.ref.update({
    amountPaid: newAmountPaid,
    paymentStatus,
    updatedAt: now,
  });

  const categoryId = await getOrCreateRevenueCategory();
  await db.collection("transactions").add({
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

  await logAudit("UPDATE", "Payment", paymentDoc.id, "SYSTEM", {
    status: "COMPLETED",
    txRef: data.tx_ref ?? data.txRef ?? null,
  });
}

async function handlePaymentFailed(data: any) {
  const checkoutId = data.checkout_id ?? data.checkoutId;
  if (!checkoutId) {
    return;
  }

  const paymentsSnapshot = await db
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

  await logAudit("UPDATE", "Payment", paymentDoc.id, "SYSTEM", {
    status: "FAILED",
    reason: data.failure_reason ?? data.reason ?? null,
  });
}

export const expireInquiries = onSchedule("every 6 hours", async () => {
  const now = new Date().toISOString();
  const snapshot = await db
    .collection("inquiries")
    .where("status", "in", ["NEW", "CONTACTED"])
    .where("expiresAt", "<", now)
    .get();

  if (snapshot.empty) {
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, { status: "EXPIRED", updatedAt: now });
  });
  await batch.commit();
});

apiRouter.use("/v1/public", publicRouter);
apiRouter.use("/", protectedRouter);
app.use("/", apiRouter);
app.use(errorHandler);

export const api = onRequest({ region: "us-central1" }, app);
