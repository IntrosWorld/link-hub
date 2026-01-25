const admin = require("firebase-admin");

let isInitialized = false;

// Initialize with environment variables
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        console.log("Attempting to initialize Firebase Admin...");
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

        // Validate service account has required fields
        if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
            throw new Error("Invalid service account: missing required fields");
        }

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });

        isInitialized = true;
        console.log("✅ Firebase Admin Initialized Successfully");
        console.log("   Project ID:", serviceAccount.project_id);
    } catch (err) {
        console.error("❌ Failed to initialize Firebase Admin:", err.message);
        console.error("   Full error:", err);
    }
} else {
    console.error("❌ FIREBASE_SERVICE_ACCOUNT not found in environment variables!");
    console.error("   Auth middleware will fail. Please check your .env file.");
}

// Helper to check if initialized
admin.isInitialized = () => isInitialized;

module.exports = admin;
