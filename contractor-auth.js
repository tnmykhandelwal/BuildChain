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
                // store email locally for dashboard
                localStorage.setItem('contractorEmail', email);
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
            localStorage.setItem('contractorEmail', email);
            window.location.href = "contractor-dashboard.html";

        } catch (error) {
            console.error("Signup Error:", error);
            statusMessage.innerText = "Error: " + error.message;
        }
    });
}
const metamaskBtn = document.getElementById('metamaskLoginBtn');
// metamaskBtn listener in contractor-auth.js
if (metamaskBtn) {
    metamaskBtn.addEventListener('click', async () => {
        const statusMessage = document.getElementById('statusMessage');
        const errorMsg = document.getElementById('errorMsg');
        statusMessage.style.color = 'blue';
        statusMessage.innerText = 'Connecting to MetaMask...';
        errorMsg.innerText = '';

        if (typeof window.ethereum === 'undefined') {
            statusMessage.style.color = 'red';
            statusMessage.innerText = 'MetaMask not detected.';
            return;
        }

        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const wallet = accounts[0].toLowerCase();

            await signInAnonymously(auth);

            // Query for CONTRACTOR specifically
            const q = query(
                collection(db, 'users'), 
                where('walletAddress', '==', wallet), 
                where('role', '==', 'contractor')
            );
            const snap = await getDocs(q);

            if (snap.empty) {
                // Wallet not registered - ask for email
                statusMessage.style.color = 'blue';
                statusMessage.innerText = 'Wallet not found. Please enter your contractor email to register this wallet.';
                
                const contractorEmail = prompt('Enter your contractor email (must match your project assignment):');
                if (!contractorEmail || !contractorEmail.includes('@')) {
                    statusMessage.style.color = 'red';
                    statusMessage.innerText = 'Invalid email. Registration cancelled.';
                    return;
                }

                // Create contractor account with wallet
                statusMessage.style.color = 'blue';
                statusMessage.innerText = 'Registering wallet with your account...';
                await setDoc(doc(db, "users", auth.currentUser.uid), {
                    email: contractorEmail,
                    walletAddress: wallet,
                    role: "contractor",
                    company: 'Independent',
                    createdAt: new Date()
                });
                statusMessage.style.color = 'green';
                statusMessage.innerText = 'Wallet registered! Redirecting to dashboard...';
                localStorage.setItem('contractorWalletAddress', wallet);
                // store contractor email locally for dashboard usage
                localStorage.setItem('contractorEmail', contractorEmail);
                setTimeout(() => window.location.href = 'contractor-dashboard.html', 1000);
            } else {
                // Wallet found - login
                statusMessage.style.color = 'green';
                statusMessage.innerText = 'Authenticated! Redirecting...';
                // store email from user record if available
                const foundEmail = snap.docs[0].data().email;
                if (foundEmail) localStorage.setItem('contractorEmail', foundEmail);
                localStorage.setItem('contractorWalletAddress', wallet);
                setTimeout(() => window.location.href = 'contractor-dashboard.html', 600);
            }
        } catch (err) {
            statusMessage.style.color = 'red';
            statusMessage.innerText = 'MetaMask login failed: ' + err.message;
        }
    });
}