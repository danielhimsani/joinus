
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage'; // Import Firebase Storage
// import { getFunctions, type Functions } from 'firebase/functions'; // For later use

const firebaseConfig = {
  apiKey: "AIzaSyAwpzWSRcpFbjazKym8MfpbCPyKavFrnpQ",
  authDomain: "join-us-p1u7f.firebaseapp.com",
  projectId: "join-us-p1u7f",
  storageBucket: "join-us-p1u7f.firebasestorage.app",
  messagingSenderId: "901177101115",
  appId: "1:901177101115:web:199032597540089b1fc51e"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

const auth: Auth = getAuth(app);
// Connect to the specific database instance named "(default)"
const db: Firestore = getFirestore(app, "(default)");
const storage: FirebaseStorage = getStorage(app); // Initialize Firebase Storage
// const functions: Functions = getFunctions(app); // You can initialize this when you're ready to use Cloud Functions from client

export { app, auth, db, storage /*, functions */ };
