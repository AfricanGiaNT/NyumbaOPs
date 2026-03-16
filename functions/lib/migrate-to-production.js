"use strict";
/**
 * Migration script: Export emulator Firestore data to production Firestore.
 *
 * Two-step process to avoid shared env var issues:
 *   Step 1 (export):  FIRESTORE_EMULATOR_HOST=localhost:8080 npx ts-node src/migrate-to-production.ts export
 *   Step 2 (import):  npx ts-node src/migrate-to-production.ts import
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const admin = __importStar(require("firebase-admin"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const DUMP_FILE = path.join(__dirname, "..", "emulator-dump.json");
const COLLECTIONS_TO_MIGRATE = [
    "properties",
    "bookings",
    "guests",
    "users",
    "calendar_syncs",
    "calendar_sync_logs",
    "categories",
    "payment_intents",
];
// ---- Step 1: Export from emulator to JSON ----
async function exportFromEmulator() {
    console.log("Reading from Firestore Emulator (localhost:8080)...\n");
    const app = admin.initializeApp({ projectId: "nyumbaops" }, "emulator-read");
    const db = app.firestore();
    const dump = {};
    for (const col of COLLECTIONS_TO_MIGRATE) {
        const snapshot = await db.collection(col).get();
        dump[col] = {};
        for (const doc of snapshot.docs) {
            dump[col][doc.id] = doc.data();
        }
        console.log(`  ${col}: ${snapshot.size} documents`);
    }
    fs.writeFileSync(DUMP_FILE, JSON.stringify(dump, null, 2));
    console.log(`\nExported to ${DUMP_FILE}`);
    process.exit(0);
}
// ---- Step 2: Import from JSON to production ----
async function importToProduction() {
    if (!fs.existsSync(DUMP_FILE)) {
        console.error(`Dump file not found: ${DUMP_FILE}`);
        console.error("Run the export step first.");
        process.exit(1);
    }
    console.log("Writing to Production Firestore (nyumbaops)...\n");
    const app = admin.initializeApp({ projectId: "nyumbaops" }, "prod-write");
    const db = app.firestore();
    const dump = JSON.parse(fs.readFileSync(DUMP_FILE, "utf-8"));
    let totalDocs = 0;
    for (const col of Object.keys(dump)) {
        const docs = dump[col];
        const ids = Object.keys(docs);
        if (ids.length === 0) {
            console.log(`  ${col}: empty, skipping`);
            continue;
        }
        // Write in batches of 450 (Firestore limit is 500)
        for (let i = 0; i < ids.length; i += 450) {
            const batch = db.batch();
            const batchIds = ids.slice(i, i + 450);
            for (const docId of batchIds) {
                batch.set(db.collection(col).doc(docId), docs[docId], { merge: true });
            }
            await batch.commit();
            totalDocs += batchIds.length;
        }
        console.log(`  ${col}: ${ids.length} documents migrated`);
    }
    console.log(`\nMigration complete! Total: ${totalDocs} documents.`);
    process.exit(0);
}
// ---- Main ----
const mode = process.argv[2];
if (mode === "export") {
    exportFromEmulator().catch((err) => { console.error(err); process.exit(1); });
}
else if (mode === "import") {
    importToProduction().catch((err) => { console.error(err); process.exit(1); });
}
else {
    console.log("Usage:");
    console.log("  Step 1: set FIRESTORE_EMULATOR_HOST=localhost:8080 then run: npx ts-node src/migrate-to-production.ts export");
    console.log("  Step 2: (without emulator env var) run: npx ts-node src/migrate-to-production.ts import");
    process.exit(1);
}
