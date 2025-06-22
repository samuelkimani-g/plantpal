import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCl-dEWDT4pdIad6wpqdMKv3G1Q6qTFlGo",
  authDomain: "plantpal-3d.firebaseapp.com",
  projectId: "plantpal-3d",
  storageBucket: "plantpal-3d.firebasestorage.app",
  messagingSenderId: "901447664388",
  appId: "1:901447664388:web:da98fb32c6fc3fa5ec8651",
  measurementId: "G-BCC5PBXV3F"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const analytics = getAnalytics(app);

export default app;
