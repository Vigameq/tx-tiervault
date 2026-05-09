import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, setPersistence, inMemoryPersistence } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const functions = getFunctions(app)

// Set auth persistence to NONE (in-memory only)
// User must login again after refreshing page or closing browser
// Auth session clears on any page reload
setPersistence(auth, inMemoryPersistence).catch((error) => {
  console.error('Error setting auth persistence:', error)
})

// Connect to emulators in development
if (import.meta.env.DEV) {
  connectFunctionsEmulator(functions, 'localhost', 5001)
  // Uncomment if you want to use other emulators
  // connectAuthEmulator(auth, 'http://localhost:9099')
  // connectFirestoreEmulator(db, 'localhost', 8080)
}

export default app
