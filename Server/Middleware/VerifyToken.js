const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let firebaseInitialized = false;

const resolveServiceAccount = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }

  const configuredPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!configuredPath) {
    throw new Error(
      'Missing Firebase credentials. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH in Server/.env'
    );
  }
  const credentialsPath = path.resolve(process.cwd(), configuredPath);

  if (!fs.existsSync(credentialsPath)) {
    throw new Error(`Firebase credentials file not found at: ${credentialsPath}`);
  }

  const credentialsRaw = fs.readFileSync(credentialsPath, 'utf-8');
  return JSON.parse(credentialsRaw);
};

const ensureFirebaseInitialized = () => {
  if (firebaseInitialized || admin.apps.length) {
    firebaseInitialized = true;
    return;
  }
  const serviceAccount = resolveServiceAccount();
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  firebaseInitialized = true;
};

async function verifyFirebaseToken(idToken) {
  try {
    ensureFirebaseInitialized();
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    throw new Error('Invalid Firebase ID token');
  }
}

module.exports = { verifyFirebaseToken };
