const admin = require("../firebaseAdmin");

const verifyToken = async (req, res, next) => {
    // Check if Firebase Admin is initialized
    if (!admin.isInitialized || !admin.isInitialized()) {
        console.error("❌ Firebase Admin not initialized - cannot verify token");
        return res.status(500).json({
            error: "Server configuration error: Firebase not initialized. Check server logs."
        });
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        console.log("No authorization header or invalid format");
        return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];

    try {
        console.log("Verifying token...");
        const decodedToken = await admin.auth().verifyIdToken(token);
        console.log("✅ Token verified for user:", decodedToken.uid);
        req.user = decodedToken; // contains uid, email, etc.
        next();
    } catch (err) {
        console.error("❌ Token verification failed:", err.message);
        return res.status(403).json({ error: "Unauthorized: Invalid token" });
    }
};

module.exports = verifyToken;
