
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
// import { getFunctions, type Functions } from 'firebase/functions'; // For later use

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAwpzWSRcpFbjazKym8MfpbCPyKavFrnpQ",
  authDomain: "join-us-p1u7f.firebaseapp.com",
  projectId: "join-us-p1u7f",
  storageBucket: "join-us-p1u7f.appspot.com",
  messagingSenderId: "901177101115",
  appId: "1:901177101115:web:199032597540089b1fc51e"
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth: Auth = getAuth(app);
// Connect to the specific database instance named "joiusdb"
const db: Firestore = getFirestore(app, "joiusdb");
// const functions: Functions = getFunctions(app); // You can initialize this when you're ready to use Cloud Functions from client

export { app, auth, db /*, functions */ };
