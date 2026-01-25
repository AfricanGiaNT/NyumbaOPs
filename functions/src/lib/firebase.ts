import * as admin from "firebase-admin";

// #region agent log
fetch('http://127.0.0.1:7243/ingest/c5f540ce-21d1-4d7f-896a-2f6702ebbfa3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'firebase.ts:4',message:'Firebase init - env vars',data:{FIREBASE_STORAGE_BUCKET:process.env.FIREBASE_STORAGE_BUCKET,FIREBASE_STORAGE_EMULATOR_HOST:process.env.FIREBASE_STORAGE_EMULATOR_HOST,FIRESTORE_EMULATOR_HOST:process.env.FIRESTORE_EMULATOR_HOST},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
// #endregion

const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || "nyumbaops.appspot.com";

// #region agent log
fetch('http://127.0.0.1:7243/ingest/c5f540ce-21d1-4d7f-896a-2f6702ebbfa3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'firebase.ts:10',message:'Resolved storageBucket',data:{storageBucket,fromEnv:!!process.env.FIREBASE_STORAGE_BUCKET},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
// #endregion

if (!admin.apps.length) {
  const initConfig = {
    projectId: "nyumbaops",
    storageBucket: storageBucket,
    ...(process.env.FIRESTORE_EMULATOR_HOST ? {} : { credential: admin.credential.applicationDefault() }),
  };
  
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/c5f540ce-21d1-4d7f-896a-2f6702ebbfa3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'firebase.ts:21',message:'Before admin.initializeApp',data:{initConfig,isEmulator:!!process.env.FIRESTORE_EMULATOR_HOST},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  
  admin.initializeApp(initConfig);
  
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/c5f540ce-21d1-4d7f-896a-2f6702ebbfa3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'firebase.ts:28',message:'After admin.initializeApp',data:{appsLength:admin.apps.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
}

export const db = admin.firestore();
export const auth = admin.auth();
export const storage = admin.storage();

// Connect to emulators if environment variable is set
if (process.env.FIRESTORE_EMULATOR_HOST) {
  console.log('🔧 Using Firestore Emulator:', process.env.FIRESTORE_EMULATOR_HOST);
}
if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.log('🔧 Using Auth Emulator:', process.env.FIREBASE_AUTH_EMULATOR_HOST);
}
if (process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
  console.log('🔧 Using Storage Emulator:', process.env.FIREBASE_STORAGE_EMULATOR_HOST);
} else if (process.env.FIRESTORE_EMULATOR_HOST) {
  // If other emulators are running, suggest setting storage emulator
  console.log('⚠️  Storage Emulator not detected. Set FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199');
}
