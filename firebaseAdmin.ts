import * as admin from 'firebase-admin';

interface ServiceAccount {
  project_id: string;
  private_key: string;
  client_email: string;
  [key: string]: unknown;
}

let isInitialized = false;

declare module 'firebase-admin' {
  function isInitialized(): boolean;
}

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    console.log("Attempting to initialize Firebase Admin...");
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) as ServiceAccount;

    if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
      throw new Error("Invalid service account: missing required fields");
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
    });

    isInitialized = true;
    console.log("Firebase Admin Initialized Successfully");
    console.log("   Project ID:", serviceAccount.project_id);
  } catch (err) {
    const error = err as Error;
    console.error("Failed to initialize Firebase Admin:", error.message);
    console.error("   Full error:", error);
  }
} else {
  console.error("FIREBASE_SERVICE_ACCOUNT not found in environment variables!");
  console.error("   Auth middleware will fail. Please check your .env file.");
}

(admin as any).isInitialized = (): boolean => isInitialized;

export default admin;
