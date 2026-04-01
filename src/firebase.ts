import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const missingKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key)

if (missingKeys.length) {
  console.warn(
    `[firebase] Missing env vars: ${missingKeys.join(
      ', ',
    )}. Using placeholder values; Auth/Firestore werden erst mit echten Schluesseln funktionieren.`,
  )
}

const safeConfig = Object.fromEntries(
  Object.entries(firebaseConfig).map(([key, value]) => [key, value || `MISSING_${key}`]),
) as typeof firebaseConfig

const app = getApps().length ? getApp() : initializeApp(safeConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)

export { app }
