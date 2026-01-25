#!/usr/bin/env node
"use strict";
/**
 * Setup Admin User Script
 *
 * Creates or updates a user document in Firestore with OWNER role.
 * Run this after creating a user in Firebase Auth emulator.
 *
 * Usage:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 pnpm tsx src/scripts/setup-admin-user.ts <uid> <email> [name]
 *
 * Example:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 pnpm tsx src/scripts/setup-admin-user.ts abc123 owner@test.com "Test Owner"
 */
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_1 = require("../lib/firebase");
async function setupAdminUser() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error("❌ Missing required arguments");
        console.log("\nUsage:");
        console.log("  FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 pnpm tsx src/scripts/setup-admin-user.ts <uid> <email> [name]");
        console.log("\nExample:");
        console.log('  FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 pnpm tsx src/scripts/setup-admin-user.ts abc123 owner@test.com "Test Owner"');
        console.log("\nSteps to get UID:");
        console.log("  1. Go to http://localhost:9099/auth");
        console.log("  2. Find your user and copy the UID");
        process.exit(1);
    }
    const [uid, email, name = "Admin User"] = args;
    console.log("\n🔧 Setting up admin user...");
    console.log(`  UID: ${uid}`);
    console.log(`  Email: ${email}`);
    console.log(`  Name: ${name}`);
    console.log(`  Role: OWNER\n`);
    try {
        const now = new Date().toISOString();
        // Check if user already exists
        const userDoc = await firebase_1.db.collection("users").doc(uid).get();
        if (userDoc.exists) {
            console.log("⚠️  User document already exists");
            const existingData = userDoc.data();
            console.log(`  Current role: ${existingData?.role}`);
            // Update role to OWNER if different
            if (existingData?.role !== "OWNER") {
                await firebase_1.db.collection("users").doc(uid).update({
                    role: "OWNER",
                    updatedAt: now,
                });
                console.log("✅ Updated role to OWNER");
            }
            else {
                console.log("✅ User already has OWNER role");
            }
        }
        else {
            // Create new user document
            await firebase_1.db.collection("users").doc(uid).set({
                email,
                name,
                role: "OWNER",
                createdAt: now,
                updatedAt: now,
            });
            console.log("✅ Created user document with OWNER role");
        }
        console.log("\n✅ Admin user setup complete!");
        console.log("\nNext steps:");
        console.log("  1. Login to dashboard: http://localhost:3000");
        console.log(`  2. Use credentials: ${email} / your password`);
        console.log("  3. You should now be able to create properties, guests, and bookings");
    }
    catch (error) {
        console.error("\n❌ Error setting up admin user:", error);
        process.exit(1);
    }
}
setupAdminUser()
    .then(() => process.exit(0))
    .catch((error) => {
    console.error(error);
    process.exit(1);
});
