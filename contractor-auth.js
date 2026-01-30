import { auth, db } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { 
    doc, 
    setDoc, 
    getDoc 
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

// LOGIC FOR LOGIN PAGE
const loginForm = document.getElementById('contractorLoginForm');

if (loginForm) {
    const errorMsg = document.getElementById('errorMsg');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMsg.innerText = "Verifying credentials...";

        const email = document.getElementById('cEmail').value;
        const password = document.getElementById('cPassword').value;

        try {
            // 1. Authenticate
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Check Role in Firestore
            const userDoc = await getDoc(doc(db, "users", user.uid));

            if (userDoc.exists() && userDoc.data().role === "contractor") {
                window.location.href = "contractor-dashboard.html"; 
            } else {
                errorMsg.innerText = "Access Denied: Not a Contractor account.";
                await auth.signOut();
            }
        } catch (error) {
            console.error("Login Error:", error);
            errorMsg.innerText = "Login failed: " + error.message;
        }
    });
}

// LOGIC FOR SIGNUP PAGE
const signupForm = document.getElementById('contractorSignupForm');

if (signupForm) {
    const statusMessage = document.getElementById('statusMessage');

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        statusMessage.innerText = "Creating account...";

        const name = document.getElementById('cName').value;
        const email = document.getElementById('cEmail').value;
        const password = document.getElementById('cPassword').value;

        try {
            // 1. Create User
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Save Role
            await setDoc(doc(db, "users", user.uid), {
                name: name,
                email: email,
                role: "contractor",
                company: name,
                createdAt: new Date()
            });

            alert("Contractor Account Created!");
            window.location.href = "contractor-dashboard.html";

        } catch (error) {
            console.error("Signup Error:", error);
            statusMessage.innerText = "Error: " + error.message;
        }
    });
}