const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

// Helper to increment points on users/{uid}
async function pts(uid, n) {
  if (!uid) return;
  const userRef = db.collection("users").doc(uid);
  await userRef.set(
    {
      points: admin.firestore.FieldValue.increment(n),
    },
    { merge: true }
  );
}

// Helper haversine distance in kilometres
function km(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// onSpot (spot created): give the reporter +10 points.
// Query alerts where destLat is greater than lat - 0.5/111 and less than lat + 0.5/111
// In code keep documents where alertOn is true, a token exists, document id is not reporter, and km(...) < 0.5.
// Send multicast notification with Android priority high.
exports.onSpot = onDocumentCreated("spots/{id}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;
  const data = snapshot.data();
  const reporterUid = data.uid;
  const lat = data.lat;
  const lng = data.lng;

  // 1. Give reporter +10 points
  await pts(reporterUid, 10);

  if (typeof lat !== "number" || typeof lng !== "number") return;

  // 2. Range query on destLat (range on one field only to avoid composite index)
  const delta = 0.5 / 111.0;
  const minLat = lat - delta;
  const maxLat = lat + delta;

  const alertsSnapshot = await db
    .collection("alerts")
    .where("destLat", ">=", minLat)
    .where("destLat", "<=", maxLat)
    .get();

  const tokens = [];
  alertsSnapshot.forEach((doc) => {
    const alertData = doc.data();
    if (doc.id === reporterUid) return;
    if (!alertData.alertOn) return;
    if (!alertData.token) return;
    if (typeof alertData.destLng !== "number") return;

    const distance = km(lat, lng, alertData.destLat, alertData.destLng);
    if (distance < 0.5) {
      tokens.push(alertData.token);
    }
  });

  if (tokens.length > 0) {
    // Deduplicate tokens
    const uniqueTokens = [...new Set(tokens)];
    await messaging.sendEachForMulticast({
      tokens: uniqueTokens,
      notification: {
        title: "Parking spot opened",
        body: "A spot just opened near your destination.",
      },
      android: {
        priority: "high",
      },
    });
  }
});

// onRule (rule created): +5 points to the author.
exports.onRule = onDocumentCreated("rules/{id}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;
  const data = snapshot.data();
  await pts(data.uid, 5);
});

// onGarage (garage created): +10 points to the author.
exports.onGarage = onDocumentCreated("garages/{id}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;
  const data = snapshot.data();
  await pts(data.uid, 10);
});

// onTaken (spot updated): if taken changed from false to true,
// takenBy is set and takenBy is not the reporter, +3 points to takenBy.
exports.onTaken = onDocumentUpdated("spots/{id}", async (event) => {
  const before = event.data.before?.data();
  const after = event.data.after?.data();
  if (!before || !after) return;

  if (before.taken === false && after.taken === true) {
    const takenBy = after.takenBy;
    const reporter = after.uid;
    if (takenBy && takenBy !== reporter) {
      await pts(takenBy, 3);
    }
  }
});
