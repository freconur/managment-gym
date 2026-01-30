import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getStorage, FirebaseStorage } from "firebase/storage";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB4hGAeFU5-o2deKdktNwoDKmYMJUZqBY4",
  authDomain: "gym-managment-10c42.firebaseapp.com",
  projectId: "gym-managment-10c42",
  storageBucket: "gym-managment-10c42.firebasestorage.app",
  messagingSenderId: "450500386725",
  appId: "1:450500386725:web:2007b44910b90e108c124c",
  measurementId: "G-BM7DL1M6BN"
};

// Initialize Firebase
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const storage: FirebaseStorage = getStorage(app);

// Initialize Firestore with Persistent Local Cache (IndexedDB)
let db: Firestore;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch (error) {
  // If already initialized (common in Next.js HMR), get the existing instance
  db = getFirestore(app);
}

export { app, storage, db };