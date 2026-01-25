import { Request, Response, NextFunction } from "express";
import { auth, db } from "./firebase";

export type AuthContext = {
  uid: string;
  role: "OWNER" | "STAFF";
};

export async function verifyFirebaseToken(
  req: Request & { auth?: AuthContext },
  res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization ?? "";
  const [, token] = header.split(" ");
  if (!token) {
    return res.status(401).json({ message: "Missing Authorization token" });
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    const role =
      (decoded.role as AuthContext["role"] | undefined) ??
      (await getUserRole(decoded.uid));
    if (!role) {
      return res.status(403).json({ message: "User role not configured" });
    }
    req.auth = { uid: decoded.uid, role };
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid auth token" });
  }
}

async function getUserRole(uid: string): Promise<AuthContext["role"] | null> {
  const doc = await db.collection("users").doc(uid).get();
  if (!doc.exists) {
    return null;
  }
  const data = doc.data();
  if (data?.role === "OWNER" || data?.role === "STAFF") {
    return data.role;
  }
  return null;
}

export function requireRole(roles: AuthContext["role"][]) {
  return (req: Request & { auth?: AuthContext }, res: Response, next: NextFunction) => {
    const role = req.auth?.role;
    if (!role || !roles.includes(role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    return next();
  };
}
