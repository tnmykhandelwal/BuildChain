import { auth,db} from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

const loginForm = document.getElementById('loginForm');
const statusMessage = document.getElementById('statusMessage');
const signupForm = document.getElementById('signupForm');

// Login Logic
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        statusMessage.style.color = "blue";
        statusMessage.innerText = "Attempting to login...";

        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                console.log("Login Success:", userCredential.user);
                statusMessage.style.color = "green";
                statusMessage.innerText = "Success! Redirecting...";
                
                setTimeout(() => {
                    window.location.href = "admin-dashboard.html";
                }, 900);
            })
            .catch((error) => {
                console.error("Login Error Code:", error.code);
                console.error("Login Error Message:", error.message);
                
                statusMessage.style.color = "red";
                
                if (error.code === 'auth/invalid-credential') {
                    statusMessage.innerText = "Error: Invalid email or password.";
                } else if (error.code === 'auth/user-not-found') {
                    statusMessage.innerText = "Error: No user found with this email.";
                } else {
                    statusMessage.innerText = "Error: " + error.message;
                }
            });
    });
}
    signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                // 1. Create User in Auth
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // 2. Save Role as 'admin' in Firestore
                await setDoc(doc(db, "users", user.uid), {
                    email: email,
                    role: "admin", 
                    createdAt: new Date()
                });

                alert("Admin Account Created Successfully!");
                window.location.href = "admin-dashboard.html";
            } catch (error) {
                document.getElementById('statusMessage').innerText = error.message;
            }
        });
