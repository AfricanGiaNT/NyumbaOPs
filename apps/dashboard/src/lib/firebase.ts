import { initializeApp, getApps } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

// #region agent log
// Connect to Auth emulator if running locally
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  fetch('http://127.0.0.1:7242/ingest/97d11b96-e9f2-4d25-8c35-1cf76da3d5e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'firebase.ts:19',message:'Attempting to connect to Auth emulator',data:{nodeEnv:process.env.NODE_ENV,hasWindow:typeof window !== 'undefined',emulatorUrl:'http://localhost:9099'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,D'})}).catch(()=>{});
  connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
  fetch('http://127.0.0.1:7242/ingest/97d11b96-e9f2-4d25-8c35-1cf76da3d5e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'firebase.ts:21',message:'Auth emulator connected',data:{authEmulatorConnected:true},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
}
// #endregion

export { app, auth };
