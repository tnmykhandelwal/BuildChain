import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy, where, limit, getDoc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

// --- DOM ELEMENTS ---
const adminEmailSpan = document.getElementById('adminEmail');
const logoutBtn = document.getElementById('logoutBtn');
const sidebar = document.getElementById('adminSidebar');
const sidebarToggle = document.getElementById('sidebarToggle');

// Navigation Links
const createProjectLink = document.getElementById('navCreate');
const viewProjectsLink = document.getElementById('navView');
const navMilestones = document.getElementById('navMilestones');
const navLogs = document.getElementById('navLogs');

// Sections
const createProjectFormElement = document.getElementById('createProjectForm');
const createProjectSection = createProjectFormElement ? createProjectFormElement.parentElement : null;

const listSection = document.getElementById('projectListSection');
const milestoneSection = document.getElementById('milestoneSection');
const logsSection = document.getElementById('logsSection');
const projectsContainer = document.getElementById('projectsContainer');
const logsContainer = document.getElementById('logsContainer');

// Forms
const milestoneForm = document.getElementById('milestoneForm');
const milestoneSelect = document.getElementById('milestoneProjectSelect');

// --- AUTHENTICATION ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        if (adminEmailSpan) adminEmailSpan.innerText = user.email;
    } else {
        window.location.href = "login-admin.html";
    }
});

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => window.location.href = "index.html");
    });
}

// --- SIDEBAR TOGGLE ---
if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
    });
}

// --- NAVIGATION LOGIC ---
function resetView() {
    if (createProjectSection) createProjectSection.style.display = 'none';
    if (listSection) listSection.style.display = 'none';
    if (milestoneSection) milestoneSection.style.display = 'none';
    if (logsSection) logsSection.style.display = 'none';

    if (createProjectLink) createProjectLink.classList.remove('active');
    if (viewProjectsLink) viewProjectsLink.classList.remove('active');
    if (navMilestones) navMilestones.classList.remove('active');
    if (navLogs) navLogs.classList.remove('active');
}

if (createProjectLink) {
    createProjectLink.addEventListener('click', (e) => {
        e.preventDefault();
        resetView();
        createProjectLink.classList.add('active');
        if (createProjectSection) createProjectSection.style.display = 'block';
    });
}

if (viewProjectsLink) {
    viewProjectsLink.addEventListener('click', (e) => {
        e.preventDefault();
        resetView();
        viewProjectsLink.classList.add('active');
        if (listSection) listSection.style.display = 'block';
        loadProjects();
    });
}

if (navMilestones) {
    navMilestones.addEventListener('click', async (e) => {
        e.preventDefault();
        resetView();
        navMilestones.classList.add('active');
        if (milestoneSection) {
            milestoneSection.style.display = 'block';
            const innerForm = milestoneSection.querySelector('.project-form');
            if (innerForm) innerForm.style.display = 'block';
        }
        await loadProjectsIntoDropdown();
    });
}

if (navLogs) {
    navLogs.addEventListener('click', (e) => {
        e.preventDefault();
        resetView();
        navLogs.classList.add('active');
        if (logsSection) logsSection.style.display = 'block';
        loadLogs();
    });
}

// --- PROJECT FUNCTIONS ---
async function loadProjects() {
    if (!projectsContainer) return;
    projectsContainer.innerHTML = "<p>Loading projects...</p>";
    try {
        const querySnapshot = await getDocs(collection(db, "projects"));
        projectsContainer.innerHTML = "";

        if (querySnapshot.empty) {
            projectsContainer.innerHTML = "<p>No projects registered yet.</p>";
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const projectCard = `
                <div class="portal-card" id="project-card-${docSnap.id}" style="border: 1px solid #eee; padding: 15px; margin-bottom: 20px; border-radius: 8px; background: #fff;">
                    <h3>${data.title}</h3>
                    <p><strong>Contractor:</strong> ${data.contractor}</p>
                    <p><strong>Budget:</strong> ₹${data.budget}</p>
                    <p><strong>Stage:</strong> <span style="color: blue; font-weight: bold;">${data.currentStage || 'Initiated'}</span></p>
                    <p><strong>Status:</strong> <span style="color: green;">${data.status}</span></p>
                    <button class="delete-btn" data-id="${docSnap.id}" 
                        style="background-color: #c0392b; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; margin-top:10px;">
                        Delete Project
                    </button>
                </div>
            `;
            projectsContainer.insertAdjacentHTML('beforeend', projectCard);
        });
        attachDeleteListeners();
    } catch (error) {
        console.error("Error loading projects:", error);
    }
}

function attachDeleteListeners() {
    const deleteButtons = document.querySelectorAll('.delete-btn');
    deleteButtons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            if (confirm("Delete this project?")) {
                try {
                    await deleteDoc(doc(db, "projects", id));
                    const card = document.getElementById(`project-card-${id}`);
                    if (card) card.remove(); else loadProjects();
                } catch (error) {
                    alert("Error: " + error.message);
                }
            }
        });
    });
}

// --- LOGS & VERIFICATION SYSTEM ---
function generateHash(data) {
    if (typeof CryptoJS === 'undefined') {
        alert("Error: CryptoJS not loaded. Refresh page.");
        return null;
    }
    return CryptoJS.SHA256(JSON.stringify(data)).toString();
}

async function getLastVerifiedHash(projectId) {
    const q = query(
        collection(db, "logs"), 
        where("projectId", "==", projectId),
        where("verified", "==", true), 
        orderBy("timestamp", "desc"), 
        limit(1)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data().hash;
    }
    return "0000000000000000000000000000000000000000000000000000000000000000";
}

async function loadLogs() {
    if (!logsContainer) return;
    logsContainer.innerHTML = "<p>Fetching logs...</p>";
    try {
        const projectsSnap = await getDocs(collection(db, "projects"));
        const projectMap = {};
        projectsSnap.forEach(doc => { projectMap[doc.id] = doc.data().title; });

        const q = query(collection(db, "logs"), orderBy("timestamp", "desc"));
        const logsSnap = await getDocs(q);

        logsContainer.innerHTML = "";
        if (logsSnap.empty) {
            logsContainer.innerHTML = "<p>No logs found.</p>";
            return;
        }

        logsSnap.forEach(docSnap => {
            const data = docSnap.data();
            const dateStr = data.timestamp && data.timestamp.toDate 
                ? data.timestamp.toDate().toLocaleString() 
                : "Unknown";
            const projectTitle = projectMap[data.projectId] || "Unknown Project";

            let statusBadge = "";
            let actionButton = "";

            if (data.verified) {
                statusBadge = `<span style="background:#27ae60; color:white; padding:3px 8px; border-radius:4px; font-size:0.8rem;">✔ On Blockchain</span>`;
            } else {
                statusBadge = `<span style="background:#f39c12; color:white; padding:3px 8px; border-radius:4px; font-size:0.8rem;">⏳ Pending Verification</span>`;
                actionButton = `
                    <button class="verify-btn" data-id="${docSnap.id}" data-pid="${data.projectId}"
                        style="margin-top:10px; background:#2980b9; color:white; border:none; padding:8px 15px; border-radius:4px; cursor:pointer;">
                        ✅ Verify & Chain
                    </button>
                `;
            }

            let details = "";
            if (data.type === "Material Delivery") {
                details = `
                    <p><strong>📦 Material:</strong> ${data.materialName} (${data.quantity})</p>
                    <p><strong>🏭 Supplier:</strong> ${data.supplier}</p>
                    <p><strong>🔢 Batch ID:</strong> ${data.batchID || 'N/A'}</p>
                    <p><strong>📸 Proof:</strong> ${data.photoLink ? `<a href="${data.photoLink}" target="_blank">View Image</a>` : 'None'}</p>
                `;
            } else {
                details = `<p><strong>🛠️ Work:</strong> ${data.workDescription || data.workDone}</p>`;
            }

            const card = `
                <div style="background: white; padding: 15px; border-left: 5px solid ${data.verified ? '#27ae60' : '#f39c12'}; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom:15px;">
                    <div style="display:flex; justify-content:space-between;">
                        <h4 style="margin:0;">${projectTitle}</h4>
                        <small>${dateStr}</small>
                    </div>
                    <div style="margin:5px 0;">${statusBadge}</div>
                    ${details}
                    <p style="font-size:0.8rem; color:#666;">By: ${data.submittedBy}</p>
                    ${data.verified ? `<p style="font-size:0.7rem; color:#999;">⛓ Hash: ${data.hash.substring(0,20)}...</p>` : ''}
                    ${actionButton}
                </div>
            `;
            logsContainer.insertAdjacentHTML('beforeend', card);
        });
        attachVerifyListeners();
    } catch (error) {
        console.error(error);
        logsContainer.innerHTML = "<p>Error loading logs.</p>";
    }
}

function attachVerifyListeners() {
    const btns = document.querySelectorAll('.verify-btn');
    btns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const logId = e.target.getAttribute('data-id');
            const projectId = e.target.getAttribute('data-pid');
            if(!confirm("Verify this work? This will permanently add it to the blockchain ledger.")) return;
            e.target.innerText = "Verifying...";
            e.target.disabled = true;
            try {
                const logRef = doc(db, "logs", logId);
                const logSnap = await getDoc(logRef);
                const logData = logSnap.data();
                const previousHash = await getLastVerifiedHash(projectId);
                const dataToHash = {
                    projectId: logData.projectId,
                    type: logData.type,
                    timestamp: logData.timestamp,
                    content: logData.workDescription || (logData.materialName + logData.batchID),
                    previousHash: previousHash
                };
                const newHash = generateHash(dataToHash);
                await updateDoc(logRef, {
                    verified: true,
                    status: "Verified",
                    hash: newHash,
                    previousHash: previousHash,
                    verifiedAt: new Date()
                });
                alert("Work Verified and Added to Blockchain!");
                loadLogs();
            } catch (err) {
                console.error(err);
                alert("Verification Failed: " + err.message);
                e.target.innerText = "Verify & Chain";
                e.target.disabled = false;
            }
        });
    });
}

// --- OTHER LOGIC ---
if (createProjectFormElement) {
    createProjectFormElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        const getVal = (id) => document.getElementById(id) ? document.getElementById(id).value.trim() : "";
        const contractorEmail = getVal('pContractor');
        if (!contractorEmail.includes('@')) {
            alert("Enter valid contractor email.");
            return;
        }
        try {
            await addDoc(collection(db, "projects"), {
                title: getVal('pTitle'),
                budget: getVal('pBudget'),
                location: getVal('pLocation'),
                contractor: contractorEmail,
                startDate: getVal('pStartDate'),
                endDate: getVal('pEndDate'),
                createdAt: new Date(),
                blueprint: getVal('pDocument'),
                status: "Active",
                currentStage: "Initiated"
            });
            alert("Project Assigned!");
            createProjectFormElement.reset();
        } catch (e) { alert(e.message); }
    });
}

async function loadProjectsIntoDropdown() {
    if (!milestoneSelect) return;
    try {
        const snap = await getDocs(collection(db, "projects"));
        milestoneSelect.innerHTML = "<option value=''>-- Select Project --</option>";
        snap.forEach(doc => {
            const opt = document.createElement("option");
            opt.value = doc.id;
            opt.innerText = doc.data().title;
            milestoneSelect.appendChild(opt);
        });
    } catch (e) {}
}

if (milestoneForm) {
    milestoneForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pid = milestoneSelect.value;
        const stage = document.querySelector('input[name="stage"]:checked')?.value;
        if (!pid || !stage) return alert("Select all fields");
        try {
            await updateDoc(doc(db, "projects", pid), { currentStage: stage });
            alert("Milestone Updated!");
        } catch (e) { alert(e.message); }
    });
}