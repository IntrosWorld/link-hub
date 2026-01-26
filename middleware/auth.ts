import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AuthenticatedRequest } from '../types/express';
import admin from '../firebaseAdmin';

export const verifyToken = (async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const adminWithInit = admin as any;

  if (!adminWithInit.isInitialized || !adminWithInit.isInitialized()) {
    console.error("Firebase Admin not initialized - cannot verify token");
    res.status(500).json({
      error: "Server configuration error: Firebase not initialized. Check server logs."
    });
    return;
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("No authorization header or invalid format");
    res.status(401).json({ error: "Unauthorized: No token provided" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    console.log("Verifying token...");
    const decodedToken = await admin.auth().verifyIdToken(token);
    console.log("Token verified for user:", decodedToken.uid);
    authReq.user = decodedToken;
    next();
  } catch (err) {
    const error = err as Error;
    console.error("Token verification failed:", error.message);
    res.status(403).json({ error: "Unauthorized: Invalid token" });
  }
}) as RequestHandler;
