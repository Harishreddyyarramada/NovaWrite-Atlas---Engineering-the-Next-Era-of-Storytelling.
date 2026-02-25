const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let firebaseInitialized = false;
let firebaseInitError = null;

const toTrimmedString = (value) => String(value || '').trim();

const resolveServiceAccount = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch (_error) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON');
    }
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

  try {
    const serviceAccount = resolveServiceAccount();
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id || toTrimmedString(process.env.FIREBASE_PROJECT_ID) || undefined,
    });
    firebaseInitialized = true;
    return;
  } catch (error) {
    const projectId =
      toTrimmedString(process.env.FIREBASE_PROJECT_ID) ||
      toTrimmedString(process.env.GOOGLE_OAUTH_PROJECT_ID);

    if (!projectId) {
      firebaseInitError = error;
      throw error;
    }

    // verifyIdToken can work with projectId + Google public certs for signature validation.
    admin.initializeApp({ projectId });
    firebaseInitialized = true;
  }
};

async function verifyFirebaseToken(idToken) {
  try {
    ensureFirebaseInitialized();
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    const message = error?.message || 'Invalid Firebase ID token';
    console.error('Error verifying Firebase ID token:', message);

    if (
      firebaseInitError ||
      message.includes('Missing Firebase credentials') ||
      message.includes('Firebase credentials file not found') ||
      message.includes('not valid JSON')
    ) {
      throw new Error(`Firebase server configuration error: ${message}`);
    }

    throw new Error('Invalid Firebase ID token');
  }
}

module.exports = { verifyFirebaseToken };
