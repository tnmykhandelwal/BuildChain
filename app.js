import { auth, db } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    signInAnonymously
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { 
    doc, 
    setDoc, 
    getDoc,
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

const loginForm = document.getElementById('loginForm');
const statusMessage = document.getElementById('statusMessage');
const signupForm = document.getElementById('signupForm');
const metamaskBtn = document.getElementById('metamaskLoginBtn');

// Standard Email/Password Login
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        statusMessage.style.color = "blue";
        statusMessage.innerText = "Attempting to login...";

        signInWithEmailAndPassword(auth, email, password)
            .then(() => {
                statusMessage.style.color = "green";
                statusMessage.innerText = "Success! Redirecting...";
                setTimeout(() => { window.location.href = "admin-dashboard.html"; }, 900);
            })
            .catch((error) => {
                statusMessage.style.color = "red";
                statusMessage.innerText = "Error: " + error.message;
            });
    });
}

// Standard Email/Password Signup
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await setDoc(doc(db, "users", userCredential.user.uid), {
                email: email,
                role: "admin", 
                createdAt: new Date()
            });
            window.location.href = "admin-dashboard.html";
        } catch (error) {
            statusMessage.innerText = error.message;
        }
    });
}

// MetaMask Login & Auto-Registration for Admin
if (metamaskBtn) {
    metamaskBtn.addEventListener('click', async () => {
        const status = document.getElementById('statusMessage');
        status.style.color = 'blue';
        status.innerText = 'Connecting to MetaMask...';

        if (typeof window.ethereum === 'undefined') {
            status.style.color = 'red';
            status.innerText = 'MetaMask not detected.';
            return;
        }

        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const wallet = accounts[0].toLowerCase();

            // Establish anonymous session to allow Firestore read permissions
            await signInAnonymously(auth);

            const q = query(collection(db, 'users'), where('walletAddress', '==', wallet), where('role', '==', 'admin'));
            const snap = await getDocs(q);

            if (snap.empty) {
                status.innerText = 'No account found. Registering Admin wallet...';
                await setDoc(doc(db, "users", auth.currentUser.uid), {
                    walletAddress: wallet,
                    role: "admin",
                    createdAt: new Date(),
                    email: "admin-wallet@buildchain.com"
                });
            }

            status.style.color = 'green';
            status.innerText = 'Authenticated. Redirecting...';
            // Store wallet address for dashboard display
            localStorage.setItem('adminWalletAddress', wallet);
            setTimeout(() => window.location.href = 'admin-dashboard.html', 600);

        } catch (err) {
            console.error('MetaMask login error:', err);
            status.style.color = 'red';
            status.innerText = 'MetaMask login failed: ' + err.message;
        }
    });
}