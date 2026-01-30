import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { collection, getDocs, query, where, addDoc, orderBy, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

console.log("Contractor Dashboard Script Loaded");

// DOM Elements
const contractorName = document.getElementById('contractorName');
const contractorProjects = document.getElementById('contractorProjects');
const sidebar = document.getElementById('contractorSidebar');
const sidebarToggle = document.getElementById('sidebarToggle');

// Sections
const projectSection = document.getElementById('projectSection');
const logSection = document.getElementById('logSection');
const materialEntrySection = document.getElementById('materialEntrySection');
const laborSection = document.getElementById('laborSection');
const historySection = document.getElementById('historySection'); 

// Nav Buttons
const navMyProjects = document.getElementById('navMyProjects');
const navDailyLog = document.getElementById('navDailyLog');
const navMaterialEntry = document.getElementById('navMaterialEntry');
const navLabor = document.getElementById('navLabor');
const navHistory = document.getElementById('navHistory'); 

// Forms & Containers
const dailyLogForm = document.getElementById('dailyLogForm');
const materialForm = document.getElementById('materialForm');
const addLaborForm = document.getElementById('addLaborForm');
const laborListContainer = document.getElementById('laborListContainer');
const historyListContainer = document.getElementById('historyListContainer'); 
const searchInput = document.getElementById('searchInput'); 
const sortSelect = document.getElementById('sortSelect'); 

// Dropdowns
const logProjectSelect = document.getElementById('logProjectSelect');
const materialProjectSelect = document.getElementById('materialProjectSelect');
const laborProjectSelect = document.getElementById('laborProjectSelect');

// State
let globalProjectMap = {}; 
let globalLogs = []; 

// --- 0. SIDEBAR TOGGLE ---
if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
    });
}

// --- 1. AUTH CHECK ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        if(contractorName) contractorName.innerText = user.email;
        loadContractorProjects(user.email);
    } else {
        window.location.href = "login-contractor.html";
    }
});

// --- 2. LOAD PROJECTS ---
async function loadContractorProjects(email) {
    const q = query(collection(db, "projects"), where("contractor", "==", email));
    
    try {
        const querySnapshot = await getDocs(q);
        
        if(contractorProjects) contractorProjects.innerHTML = "";
        const dropdowns = [logProjectSelect, materialProjectSelect, laborProjectSelect];
        dropdowns.forEach(dd => { if(dd) dd.innerHTML = "<option value=''>-- Select Project --</option>"; });

        if (querySnapshot.empty) {
            if(contractorProjects) contractorProjects.innerHTML = "<p>No projects assigned.</p>";
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            globalProjectMap[doc.id] = data.title; // Save to map

            // Card
            if(contractorProjects) {
                contractorProjects.insertAdjacentHTML('beforeend', `
                    <div class="portal-card contractor-card" style="width: auto; margin:0; text-align:left; align-items:start;">
                        <h3>${data.title}</h3>
                        <p><strong>Loc:</strong> ${data.location}</p>
                        <p><strong>Status:</strong> ${data.status}</p>
                    </div>
                `);
            }
            // Dropdown Options
            const opt = `<option value="${doc.id}">${data.title}</option>`;
            dropdowns.forEach(dd => { if(dd) dd.insertAdjacentHTML('beforeend', opt); });
        });

    } catch (error) { console.error(error); }
}

// --- 3. NAVIGATION ---
function resetView() {
    [projectSection, logSection, materialEntrySection, laborSection, historySection].forEach(el => { if(el) el.style.display = 'none'; });
    [navMyProjects, navDailyLog, navMaterialEntry, navLabor, navHistory].forEach(el => { if(el) el.classList.remove('active'); });
}

// Listeners
if(navMyProjects) navMyProjects.addEventListener('click', () => { resetView(); projectSection.style.display='block'; navMyProjects.classList.add('active'); });
if(navDailyLog) navDailyLog.addEventListener('click', () => { resetView(); logSection.style.display='block'; navDailyLog.classList.add('active'); });
if(navMaterialEntry) navMaterialEntry.addEventListener('click', () => { resetView(); materialEntrySection.style.display='block'; navMaterialEntry.classList.add('active'); });
if(navLabor) navLabor.addEventListener('click', () => { resetView(); laborSection.style.display='block'; navLabor.classList.add('active'); });
if(navHistory) navHistory.addEventListener('click', () => { 
    resetView(); 
    historySection.style.display='block'; 
    navHistory.classList.add('active');
    loadHistory(); 
});

// --- 4. HISTORY, SEARCH & SORT ---
async function loadHistory() {
    historyListContainer.innerHTML = "<p>Loading your history...</p>";
    try {
        const userEmail = auth.currentUser.email;
        const q = query(collection(db, "logs"), where("submittedBy", "==", userEmail), orderBy("timestamp", "desc"));
        const snapshot = await getDocs(q);
        
        globalLogs = []; 
        snapshot.forEach(doc => {
            globalLogs.push({ id: doc.id, ...doc.data() });
        });

        renderLogs(globalLogs);
    } catch (error) {
        console.error(error);
        if (error.code === 'failed-precondition') {
             historyListContainer.innerHTML = "<p style='color:red'>Index Missing. Check Console.</p>";
        } else {
             historyListContainer.innerHTML = "<p>No logs found or error loading.</p>";
        }
    }
}

function renderLogs(logsToRender) {
    if(logsToRender.length === 0) {
        historyListContainer.innerHTML = "<p>No matching logs found.</p>";
        return;
    }
    
    historyListContainer.innerHTML = "";
    
    logsToRender.forEach(log => {
        const projectTitle = globalProjectMap[log.projectId] || "Unknown Project";
        const dateStr = log.timestamp && log.timestamp.toDate ? log.timestamp.toDate().toLocaleString() : "Date Error";
        const isVerified = log.verified;
        
        let details = "";
        if (log.type === "Material Delivery") {
            details = `<b>📦 Material:</b> ${log.materialName} | <b>Qty:</b> ${log.quantity}`;
        } else {
            details = `<b>📝 Work:</b> ${log.workDescription || log.workDone}`;
        }

        const card = `
            <div style="background: white; padding: 15px; border-left: 5px solid ${isVerified ? '#27ae60' : '#f39c12'}; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <div style="display:flex; justify-content:space-between;">
                    <h4 style="margin:0; color:#2c3e50;">${projectTitle}</h4>
                    <span style="font-size:0.8rem; color:#888;">${dateStr}</span>
                </div>
                <div style="margin:5px 0; font-size:0.95rem;">${details}</div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                     <span style="font-size:0.8rem; background:${isVerified ? '#27ae60' : '#f39c12'}; color:white; padding:2px 6px; border-radius:4px;">
                        ${isVerified ? "Verified" : "Pending"}
                     </span>
                     <span style="font-size:0.8rem; color:#999;">Type: ${log.type || 'Log'}</span>
                </div>
            </div>
        `;
        historyListContainer.insertAdjacentHTML('beforeend', card);
    });
}

// Search Logic
if(searchInput) {
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = globalLogs.filter(log => {
            const pTitle = (globalProjectMap[log.projectId] || "").toLowerCase();
            const wDesc = (log.workDescription || "").toLowerCase();
            const matName = (log.materialName || "").toLowerCase();
            return pTitle.includes(term) || wDesc.includes(term) || matName.includes(term);
        });
        applySort(filtered);
    });
}

// Sort Logic
if(sortSelect) {
    sortSelect.addEventListener('change', () => {
        const term = searchInput.value.toLowerCase();
        const filtered = globalLogs.filter(log => {
            const pTitle = (globalProjectMap[log.projectId] || "").toLowerCase();
            const wDesc = (log.workDescription || "").toLowerCase();
            const matName = (log.materialName || "").toLowerCase();
            return pTitle.includes(term) || wDesc.includes(term) || matName.includes(term);
        });
        applySort(filtered);
    });
}

function applySort(logs) {
    const method = sortSelect.value;
    let sorted = [...logs];

    if (method === 'newest') {
        sorted.sort((a, b) => b.timestamp - a.timestamp);
    } else if (method === 'oldest') {
        sorted.sort((a, b) => a.timestamp - b.timestamp);
    } else if (method === 'verified') {
        sorted = sorted.filter(l => l.verified);
    } else if (method === 'pending') {
        sorted = sorted.filter(l => !l.verified);
    } else if (method === 'material') {
        sorted = sorted.filter(l => l.type === 'Material Delivery');
    }
    
    renderLogs(sorted);
}


// --- 5. LABOR LOGIC ---
if(laborProjectSelect) {
    laborProjectSelect.addEventListener('change', () => {
        const pid = laborProjectSelect.value;
        if(pid) loadLaborers(pid);
    });
}

async function loadLaborers(projectId) {
    laborListContainer.innerHTML = "<tr><td colspan='6' style='text-align:center;'>Loading...</td></tr>";
    try {
        const qLabor = query(collection(db, "laborers"), where("projectId", "==", projectId));
        const laborSnap = await getDocs(qLabor);

        const qAttendance = query(collection(db, "attendance_logs"), where("projectId", "==", projectId));
        const attSnap = await getDocs(qAttendance);
        
        const attendanceCount = {};
        attSnap.forEach(doc => {
            const d = doc.data();
            attendanceCount[d.laborerId] = (attendanceCount[d.laborerId] || 0) + 1;
        });

        laborListContainer.innerHTML = "";
        if(laborSnap.empty) {
            laborListContainer.innerHTML = "<tr><td colspan='6' style='text-align:center;'>No laborers found.</td></tr>";
            return;
        }

        laborSnap.forEach(doc => {
            const p = doc.data();
            const days = attendanceCount[doc.id] || 0;
            const wage = days * p.dailyWage;
            
            laborListContainer.insertAdjacentHTML('beforeend', `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:10px;">${p.name}</td>
                    <td style="padding:10px;">${p.role}</td>
                    <td style="padding:10px;">₹${p.dailyWage}</td>
                    <td style="padding:10px;">${days} Days</td>
                    <td style="padding:10px; color:#27ae60; font-weight:bold;">₹${wage}</td>
                    <td style="padding:10px;">
                        <button onclick="markAttendance('${doc.id}', '${projectId}')" style="background:#f39c12; color:white; border:none; padding:5px; border-radius:4px;">Present</button>
                        <button onclick="removeLaborer('${doc.id}', '${projectId}')" style="background:#c0392b; color:white; border:none; padding:5px; margin-left:5px; border-radius:4px;">🗑️</button>
                    </td>
                </tr>
            `);
        });
    } catch (e) { console.error(e); }
}

if(addLaborForm) {
    addLaborForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pid = laborProjectSelect.value;
        if(!pid) return alert("Select project");
        try {
            await addDoc(collection(db, "laborers"), {
                projectId: pid,
                name: document.getElementById('laborName').value,
                role: document.getElementById('laborRole').value,
                dailyWage: Number(document.getElementById('laborWage').value),
                joinedAt: new Date()
            });
            alert("Added!");
            addLaborForm.reset();
            loadLaborers(pid);
        } catch (e) { alert(e.message); }
    });
}

window.markAttendance = async (lid, pid) => {
    if(!confirm("Mark Present?")) return;
    try {
        await addDoc(collection(db, "attendance_logs"), { laborerId: lid, projectId: pid, date: new Date().toDateString(), timestamp: new Date(), status: "Present" });
        alert("Marked!");
        loadLaborers(pid);
    } catch (e) { alert(e.message); }
};

window.removeLaborer = async (lid, pid) => {
    if(!confirm("Remove laborer?")) return;
    try { await deleteDoc(doc(db, "laborers", lid)); loadLaborers(pid); } catch (e) { alert(e.message); }
};

// --- SUBMIT LOGIC ---
if(dailyLogForm) {
    dailyLogForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const logData = {
            projectId: logProjectSelect.value,
            workDescription: document.getElementById('logWork').value,
            type: "Site Progress",
            submittedBy: auth.currentUser.email,
            timestamp: new Date(),
            verified: false,
            status: "Pending Review"
        };
        try { await addDoc(collection(db, "logs"), logData); alert("Submitted!"); dailyLogForm.reset(); } catch (e) { alert(e.message); }
    });
}

if(materialForm) {
    materialForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const materialData = {
            projectId: materialProjectSelect.value,
            materialName: document.getElementById('matName').value,
            supplier: document.getElementById('matSupplier').value,
            quantity: document.getElementById('matQuantity').value,
            deliveryTime: document.getElementById('matTime').value,
            photoLink: document.getElementById('matPhoto').value,
            batchID: document.getElementById('matBatchID').value,
            type: "Material Delivery",
            submittedBy: auth.currentUser.email,
            timestamp: new Date(),
            verified: false,
            status: "Pending Review"
        };
        try { await addDoc(collection(db, "logs"), materialData); alert("Submitted!"); materialForm.reset(); } catch (e) { alert(e.message); }
    });
}

document.getElementById('logoutBtn')?.addEventListener('click', () => signOut(auth).then(() => window.location.href = "index.html"));