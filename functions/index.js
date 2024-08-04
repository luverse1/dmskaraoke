const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.checkAdminAuth = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated",
    );
  }

  const email = context.auth.token.email;
  const settingsRef = admin.firestore().doc("settings/allowedEmails");
  const settingsSnap = await settingsRef.get();

  if (settingsSnap.exists && settingsSnap.data().emails.includes(email)) {
    return {isAdmin: true};
  } else {
    throw new functions.https.HttpsError(
        "permission-denied",
        "User is not authorized",
    );
  }
});
