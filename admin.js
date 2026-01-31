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
        // Check if logged in via MetaMask
        const walletAddress = localStorage.getItem('adminWalletAddress');
        if (walletAddress) {
            if (adminEmailSpan) adminEmailSpan.innerText = walletAddress;
        } else {
            if (adminEmailSpan) adminEmailSpan.innerText = user.email;
        }
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
            const projectDoc = await getDoc(doc(db, "projects", id));
            const projectData = projectDoc.data();
            const storedPIN = projectData?.securityPIN;

            if (!storedPIN) {
                alert("This project has no security PIN set.");
                return;
            }

            if (!confirm("Delete this project?")) return;
            
            const enteredPIN = prompt("Enter the security PIN to confirm deletion:");
            if (enteredPIN !== storedPIN) {
                alert("Incorrect PIN. Deletion cancelled.");
                return;
            }

            try {
                await deleteDoc(doc(db, "projects", id));
                const card = document.getElementById(`project-card-${id}`);
                if (card) card.remove(); else loadProjects();
                alert("Project deleted successfully.");
            } catch (error) {
                alert("Error: " + error.message);
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
        // Load project titles to map projectId -> title
        const projectsSnap = await getDocs(collection(db, "projects"));
        const projectMap = {};
        projectsSnap.forEach(doc => { projectMap[doc.id] = doc.data().title; });

        // Expose projectMap globally for render helpers
        window.projectMap = projectMap;

        // Load logs ordered by timestamp desc
        const q = query(collection(db, "logs"), orderBy("timestamp", "desc"));
        const logsSnap = await getDocs(q);

        if (logsSnap.empty) {
            logsContainer.innerHTML = "<p>No logs found.</p>";
            window.adminLogsData = [];
            window.adminLogsImages = {};
            return;
        }

        // Build logs data array
        const logsData = logsSnap.docs.map(d => ({ id: d.id, data: d.data() }));

        // Preload images (proofs) concurrently using fetch + promises
        const imagePromises = logsData.map(async (log) => {
            const photoLink = log.data.photoLink || log.data.photoURL || null;
            if (!photoLink) return { id: log.id, url: null };
            try {
                const resp = await fetch(photoLink);
                if (!resp.ok) return { id: log.id, url: null };
                const blob = await resp.blob();
                const url = URL.createObjectURL(blob);
                return { id: log.id, url };
            } catch (e) {
                console.warn('Image fetch failed for', photoLink, e);
                return { id: log.id, url: null };
            }
        });

        const imageResults = await Promise.all(imagePromises);
        const imagesMap = {};
        imageResults.forEach(r => { if (r && r.id) imagesMap[r.id] = r.url; });

        // Store globally for filtering/sorting
        window.adminLogsData = logsData;
        window.adminLogsImages = imagesMap;

        // Setup search/sort handlers
        const searchInput = document.getElementById('logsSearchInput');
        const sortSelect = document.getElementById('logsSortSelect');
        if (searchInput) searchInput.addEventListener('input', () => renderAdminLogs());
        if (sortSelect) sortSelect.addEventListener('change', () => renderAdminLogs());

        // Initial render
        renderAdminLogs();

    } catch (error) {
        console.error('Error in loadLogs:', error);
        logsContainer.innerHTML = "<p>Error loading logs.</p>";
    }
}

function renderAdminLogs() {
    const data = window.adminLogsData || [];
    const images = window.adminLogsImages || {};
    const searchTerm = (document.getElementById('logsSearchInput')?.value || '').toLowerCase();
    const sortBy = document.getElementById('logsSortSelect')?.value || 'newest';

    let filtered = data.filter(item => {
        const d = item.data;
        const projectTitle = (window.projectMap && window.projectMap[d.projectId]) || '';
        const text = [projectTitle, d.type, d.materialName, d.supplier, d.submittedBy, d.workDescription, d.batchID].filter(Boolean).join(' ').toLowerCase();
        return text.includes(searchTerm);
    });

    // Sorting
    filtered.sort((a, b) => {
        const da = a.data;
        const db = b.data;
        const ta = da.timestamp?.toDate?.() ? da.timestamp.toDate() : new Date(0);
        const tb = db.timestamp?.toDate?.() ? db.timestamp.toDate() : new Date(0);
        if (sortBy === 'newest') return tb - ta;
        if (sortBy === 'oldest') return ta - tb;
        if (sortBy === 'verified') return (b.data.verified ? 1 : 0) - (a.data.verified ? 1 : 0);
        if (sortBy === 'project') {
            const pa = (window.projectMap && window.projectMap[da.projectId]) || '';
            const pb = (window.projectMap && window.projectMap[db.projectId]) || '';
            return pa.localeCompare(pb);
        }
        return 0;
    });

    // Render
    logsContainer.innerHTML = '';
    if (filtered.length === 0) {
        logsContainer.innerHTML = '<p>No logs match your search.</p>';
        return;
    }

    // Build cards
    filtered.forEach(item => {
        const id = item.id;
        const d = item.data;
        const projectTitle = (window.projectMap && window.projectMap[d.projectId]) || '';
        const dateStr = d.timestamp && d.timestamp.toDate ? d.timestamp.toDate().toLocaleString() : 'Unknown';

        let statusBadge = d.verified
            ? `<span style="background:#27ae60; color:white; padding:3px 8px; border-radius:4px; font-size:0.8rem;">✔ On Blockchain</span>`
            : `<span style="background:#f39c12; color:white; padding:3px 8px; border-radius:4px; font-size:0.8rem;">⏳ Pending Verification</span>`;

        let actionButton = '';
        if (!d.verified) {
            actionButton = `<button class="verify-btn" data-id="${id}" data-pid="${d.projectId}" style="margin-top:10px; background:#2980b9; color:white; border:none; padding:8px 15px; border-radius:4px; cursor:pointer;">✅ Verify & Chain</button>`;
        }

        let details = '';
        if (d.type === 'Material Delivery') {
            details = `
                <p><strong>📦 Material:</strong> ${d.materialName || 'N/A'} (${d.quantity || 'N/A'})</p>
                <p><strong>🏭 Supplier:</strong> ${d.supplier || 'N/A'}</p>
                <p><strong>🔢 Batch ID:</strong> ${d.batchID || 'N/A'}</p>
            `;
            const imgUrl = images[id];
            if (imgUrl) {
                details += `<div><strong>📸 Proof:</strong><br><img src="${imgUrl}" alt="proof" style="max-width:300px; margin-top:8px; border-radius:6px; border:1px solid #eee;"></div>`;
            } else {
                details += `<p><strong>📸 Proof:</strong> ${d.photoLink ? `<a href="${d.photoLink}" target="_blank">Open</a>` : 'None'}</p>`;
            }
        } else {
            details = `<p><strong>🛠️ Work:</strong> ${d.workDescription || d.workDone || 'N/A'}</p>`;
        }

        const hashDisplay = d.verified && d.hash ?
            `<p style="font-size:0.75rem; color:#333; word-break:break-all; font-family: 'Courier New', monospace; margin-top:8px;">⛓ Hash: <span class="log-hash" data-hash="${d.hash}">${d.hash}</span></p>`
            : (d.verified ? `<p style="font-size:0.7rem; color:#999;">⛓ Hash: N/A</p>` : '');

        const card = `
            <div style="background: white; padding: 15px; border-left: 5px solid ${d.verified ? '#27ae60' : '#f39c12'}; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom:15px;">
                <div style="display:flex; justify-content:space-between;">
                    <h4 style="margin:0;">${projectTitle}</h4>
                    <small>${dateStr}</small>
                </div>
                <div style="margin:5px 0;">${statusBadge}</div>
                ${details}
                <p style="font-size:0.8rem; color:#666;">By: ${d.submittedBy || 'Unknown'}</p>
                ${hashDisplay}
                ${actionButton}
            </div>
        `;
        logsContainer.insertAdjacentHTML('beforeend', card);
    });

    // Re-attach verify listeners after render
    attachVerifyListeners();

    // Allow clicking the hash text to copy (no separate button)
    const hashSpans = logsContainer.querySelectorAll('.log-hash');
    hashSpans.forEach(span => {
        span.style.cursor = 'pointer';
        span.title = 'Click to copy full hash';
        span.addEventListener('click', async (e) => {
            const h = span.getAttribute('data-hash');
            if (!h) return;
            try {
                await navigator.clipboard.writeText(h);
                // small visual feedback by briefly changing color
                const orig = span.style.color;
                span.style.color = '#27ae60';
                setTimeout(() => { span.style.color = orig; }, 1000);
            } catch (err) {
                console.error('Clipboard write failed', err);
            }
        });
    });
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
                currentStage: "Initiated",
                securityPIN: getVal('pPIN')
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
        
        // Fetch project to get PIN
        const projectDoc = await getDoc(doc(db, "projects", pid));
        const projectData = projectDoc.data();
        const storedPIN = projectData?.securityPIN;

        if (!storedPIN) {
            alert("This project has no security PIN set.");
            return;
        }

        const enteredPIN = prompt("Enter the security PIN to update milestone:");
        if (enteredPIN !== storedPIN) {
            alert("Incorrect PIN. Update cancelled.");
            return;
        }

        try {
            await updateDoc(doc(db, "projects", pid), { currentStage: stage });
            alert("Milestone Updated!");
        } catch (e) { alert(e.message); }
    });
}