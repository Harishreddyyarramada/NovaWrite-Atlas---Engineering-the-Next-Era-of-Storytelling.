const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const resolveServiceAccount = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }

  const configuredPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const fallbackPath = path.resolve(__dirname, '../Config/GoogleService.json');
  const credentialsPath = configuredPath
    ? path.resolve(process.cwd(), configuredPath)
    : fallbackPath;

  if (!fs.existsSync(credentialsPath)) {
    throw new Error('Firebase service account credentials file not found');
  }

  const credentialsRaw = fs.readFileSync(credentialsPath, 'utf-8');
  return JSON.parse(credentialsRaw);
};

if (!admin.apps.length) {
  const serviceAccount = resolveServiceAccount();
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

async function verifyFirebaseToken(idToken) {
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    throw new Error('Invalid Firebase ID token');
  }
}

module.exports = { verifyFirebaseToken };
