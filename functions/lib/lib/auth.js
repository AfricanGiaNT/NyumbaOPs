"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyFirebaseToken = verifyFirebaseToken;
exports.requireRole = requireRole;
const firebase_1 = require("./firebase");
async function verifyFirebaseToken(req, res, next) {
    const header = req.headers.authorization ?? "";
    const [, token] = header.split(" ");
    if (!token) {
        return res.status(401).json({ message: "Missing Authorization token" });
    }
    try {
        const decoded = await firebase_1.auth.verifyIdToken(token);
        const role = decoded.role ??
            (await getUserRole(decoded.uid));
        if (!role) {
            return res.status(403).json({ message: "User role not configured" });
        }
        req.auth = { uid: decoded.uid, role };
        return next();
    }
    catch (error) {
        return res.status(401).json({ message: "Invalid auth token" });
    }
}
async function getUserRole(uid) {
    const doc = await firebase_1.db.collection("users").doc(uid).get();
    if (!doc.exists) {
        return null;
    }
    const data = doc.data();
    if (data?.role === "OWNER" || data?.role === "STAFF") {
        return data.role;
    }
    return null;
}
function requireRole(roles) {
    return (req, res, next) => {
        const role = req.auth?.role;
        if (!role || !roles.includes(role)) {
            return res.status(403).json({ message: "Forbidden" });
        }
        return next();
    };
}
