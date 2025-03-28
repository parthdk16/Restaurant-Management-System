// Import the functions you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA0XSHEZavemXBRsKwcww3ygH5PxCPliD0",
  authDomain: "restaurant-management-sy-8023d.firebaseapp.com",
  projectId: "restaurant-management-sy-8023d",
  storageBucket: "restaurant-management-sy-8023d.firebasestorage.app",
  messagingSenderId: "590220789562",
  appId: "1:590220789562:web:bbb1d6ed409c9dc5827203"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firestore instance
export const db = getFirestore(app);

// Initialize Firebase Authentication and export it
export const auth = getAuth(app);

// Export the Google Auth provider
export const googleProvider = new GoogleAuthProvider();

export const imgDB = getStorage(app);

export const resDB = getStorage(app);