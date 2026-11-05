import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { env } from './env';

let firebaseApp: App | null = null;
let firestoreDb: Firestore | null = null;
let isFirebaseConfigured = false;

try {
  const projectId = env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = env.FIREBASE_CLIENT_EMAIL?.trim();
  const rawPrivateKey = env.FIREBASE_PRIVATE_KEY?.trim();

  if (projectId && clientEmail && rawPrivateKey) {
    // Unescape newline characters from private key string
    const privateKey = rawPrivateKey.replace(/\\n/g, '\n');

    // Prevent re-initialization if already initialized
    if (getApps().length === 0) {
      firebaseApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log('🔥 Firebase Admin SDK initialized successfully');
    } else {
      firebaseApp = getApp();
    }

    firestoreDb = getFirestore(firebaseApp);
    isFirebaseConfigured = true;
  } else {
    console.warn(
      '⚠️ Firebase credentials are missing in .env. Firestore is currently inactive until keys are supplied.'
    );
  }
} catch (error) {
  console.error('❌ Error during Firebase Admin SDK initialization:', error);
  firebaseApp = null;
  firestoreDb = null;
  isFirebaseConfigured = false;
}

export { firebaseApp, firestoreDb, isFirebaseConfigured };

