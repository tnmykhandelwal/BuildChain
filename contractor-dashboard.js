import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { collection, getDocs, query, where, addDoc, orderBy, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

console.log("Contractor Dashboard Script Loaded");


const contractorName = document.getElementById('contractorName');
const contractorProjects = document.getElementById('contractorProjects');
const logoutBtn = document.getElementById('logoutBtn');


console.log('DOM refs:', {
    contractorName, contractorProjects, logoutBtn
});

// Sections
const projectSection = document.getElementById('projectSection');
const logSection = document.getElementById('logSection');
const materialEntrySection = document.getElementById('materialEntrySection');
const laborSection = document.getElementById('laborSection');
const historySection = document.getElementById('historySection');

// Nav Links
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

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => window.location.href = "index.html");
    });
}

const contractorIDSpan = document.getElementById('contractorID');

onAuthStateChanged(auth, async (user) => {
    try {
        console.log('Auth state changed, user:', user);
        if (user) {
            const email = user.email || localStorage.getItem('contractorEmail') || '';
            if(contractorName) contractorName.innerText = email || 'Unknown';

            const walletAddress = localStorage.getItem('contractorWalletAddress');
            if(contractorIDSpan) {
                if(walletAddress) {
                    contractorIDSpan.innerText = walletAddress;
                } else {
                    contractorIDSpan.innerText = '#Contractor';
                }
            }

            const emailToUse = email || localStorage.getItem('contractorEmail') || '';
            await loadContractorProjects(emailToUse);
        } else {
            window.location.href = "login-contractor.html";
        }
    } catch (err) {
        console.error('Error in auth callback:', err);
        if(contractorProjects) contractorProjects.innerHTML = '<p style="color:red; padding:16px;">Error loading dashboard. Check console.</p>';
    }
});

async function loadContractorProjects(email) {
    console.log('loadContractorProjects called with email:', email);
    if (!email) {
        console.warn('No email provided to loadContractorProjects');
        if(contractorProjects) contractorProjects.innerHTML = "<p style='padding: 20px; text-align: center; color: #666;'>Unable to load projects: no email.</p>";
        return;
    }
    
    const q = query(collection(db, "projects"), where("contractor", "==", email));
    
    try {
        console.log('Fetching projects for email:', email);
        const querySnapshot = await getDocs(q);
        console.log('Query results:', querySnapshot.docs.length, 'projects found');
        
        if(contractorProjects) contractorProjects.innerHTML = "";
        const dropdowns = [logProjectSelect, materialProjectSelect, laborProjectSelect];
        dropdowns.forEach(dd => { if(dd) dd.innerHTML = "<option value=''>-- Select Project --</option>"; });

        if (querySnapshot.empty) {
            console.log('No projects found for contractor');
            if(contractorProjects) contractorProjects.innerHTML = "<p style='padding: 20px; text-align: center; color: #666;'>No projects assigned.</p>";
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            globalProjectMap[doc.id] = data.title; 

          
            if(contractorProjects) {
                contractorProjects.insertAdjacentHTML('beforeend', `
                    <div class="portal-card contractor-card" style="width: auto; margin:0; text-align:left; align-items:start;">
                        <h3>${data.title}</h3>
                        <p><strong>Loc:</strong> ${data.location}</p>
                        <p><strong>Status:</strong> ${data.status}</p>
                    </div>
                `);
            }
            
            const opt = `<option value="${doc.id}">${data.title}</option>`;
            dropdowns.forEach(dd => { if(dd) dd.insertAdjacentHTML('beforeend', opt); });
        });
        console.log('Projects loaded and rendered successfully');

    } catch (error) { 
        console.error('Error loading projects:', error);
        if(contractorProjects) contractorProjects.innerHTML = `<p style='color:red; padding:16px;'>Error loading projects: ${error.message}</p>`;
    }
}


function resetView() {
    [projectSection, logSection, materialEntrySection, laborSection, historySection].forEach(el => { if(el) el.style.display = 'none'; });
    [navMyProjects, navDailyLog, navMaterialEntry, navLabor, navHistory].forEach(el => { if(el) el.classList.remove('active'); });
}


if(navMyProjects) {
    navMyProjects.addEventListener('click', (e) => { e.preventDefault(); resetView(); projectSection.style.display='block'; navMyProjects.classList.add('active'); });
}
if(navDailyLog) {
    navDailyLog.addEventListener('click', (e) => { e.preventDefault(); resetView(); logSection.style.display='block'; navDailyLog.classList.add('active'); });
}
if(navMaterialEntry) {
    navMaterialEntry.addEventListener('click', (e) => { e.preventDefault(); resetView(); materialEntrySection.style.display='block'; navMaterialEntry.classList.add('active'); });
}
if(navLabor) {
    navLabor.addEventListener('click', (e) => { e.preventDefault(); resetView(); laborSection.style.display='block'; navLabor.classList.add('active'); });
}
if(navHistory) {
    navHistory.addEventListener('click', (e) => { 
        e.preventDefault();
        resetView(); 
        historySection.style.display='block'; 
        navHistory.classList.add('active');
        loadHistory(); 
    });
}


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
                        <button class="btn-attendance" data-labor-id="${doc.id}" data-project-id="${projectId}" style="background:#f39c12; color:white; border:none; padding:5px; border-radius:4px;">Present</button>
                        <button class="btn-remove-laborer" data-labor-id="${doc.id}" data-project-id="${projectId}" style="background:#c0392b; color:white; border:none; padding:5px; margin-left:5px; border-radius:4px;">🗑️</button>
                    </td>
                </tr>
            `);
        });

        attachLaborButtonListeners();
    } catch (e) { console.error(e); }
}

function attachLaborButtonListeners() {
    laborListContainer.querySelectorAll('.btn-attendance').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const laborId = btn.getAttribute('data-labor-id');
            const projectId = btn.getAttribute('data-project-id');
            if(!confirm("Mark Present?")) return;
            try {
                await addDoc(collection(db, "attendance_logs"), { 
                    laborerId: laborId, 
                    projectId: projectId, 
                    date: new Date().toDateString(), 
                    timestamp: new Date(), 
                    status: "Present" 
                });
                alert("Marked!");
                loadLaborers(projectId);
            } catch (err) { alert(err.message); }
        });
    });

    laborListContainer.querySelectorAll('.btn-remove-laborer').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const laborId = btn.getAttribute('data-labor-id');
            const projectId = btn.getAttribute('data-project-id');
            if(!confirm("Remove laborer?")) return;
            try { 
                await deleteDoc(doc(db, "laborers", laborId)); 
                loadLaborers(projectId); 
            } catch (err) { alert(err.message); }
        });
    });
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

if(dailyLogForm) {
    dailyLogForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitterEmail = auth.currentUser.email || localStorage.getItem('contractorEmail') || 'Unknown';
        const logData = {
            projectId: logProjectSelect.value,
            workDescription: document.getElementById('logWork').value,
            type: "Site Progress",
            submittedBy: submitterEmail,
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
        const submitterEmail = auth.currentUser.email || localStorage.getItem('contractorEmail') || 'Unknown';
        const materialData = {
            projectId: materialProjectSelect.value,
            name: document.getElementById('matName').value,
            supplier: document.getElementById('matSupplier').value,
            quantity: document.getElementById('matQuantity').value,
            cost: parseFloat(document.getElementById('matCost').value),
            deliveryTime: document.getElementById('matTime').value,
            photoLink: document.getElementById('matPhoto').value,
            batchID: document.getElementById('matBatchID').value,
            type: "Material Delivery",
            submittedBy: submitterEmail,
            timestamp: new Date(),
            verified: false,
            status: "Pending Review"
        };
        try { 
            await addDoc(collection(db, "logs"), materialData); 
            alert("Material logged successfully!"); 
            materialForm.reset(); 
        } catch (e) { 
            alert(e.message); 
        }
    });
}