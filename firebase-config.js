// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

const firebaseConfig = {
  apiKey: window.FIREBASE_API_KEY || "fallback_if_local",
  authDomain: "buildchain-3ae7b.firebaseapp.com",
  databaseURL: "https://buildchain-3ae7b-default-rtdb.firebaseio.com",
  projectId: "buildchain-3ae7b",
  storageBucket: "buildchain-3ae7b.firebasestorage.app",
  messagingSenderId: "447991074244",
  appId: "1:447991074244:web:5b399257ad052b84396891"
};


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
export { auth, db};