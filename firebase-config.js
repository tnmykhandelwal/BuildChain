// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

const firebaseConfig = {
  apiKey: "AIzaSyByt6IeWXmyAahhog8ve0QHaFl9Ke7g5BQ",
  authDomain: "buildchain-3ae7b.firebaseapp.com",
  projectId: "buildchain-3ae7b",
  storageBucket: "buildchain-3ae7b.firebasestorage.app",
  messagingSenderId: "447991074244",
  appId: "1:447991074244:web:5b399257ad052b84396891"
};


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
export { auth, db};