import { db } from './firebase-config.js';
import { collection, getDocs, query, where, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";


const typewriterElement = document.getElementById('typewriter');
const phrases = [
    'Where Trust Meets Transparency',
    'Building Accountability in Construction',
    'Every Layer, Every Hash, Verified'
];
let phraseIndex = 0;
let charIndex = 0;
let isDeleting = false;

function typeWriter() {
    const currentPhrase = phrases[phraseIndex];
    if(!typewriterElement) return;
    
    if (!isDeleting) {
        if (charIndex < currentPhrase.length) {
            typewriterElement.textContent += currentPhrase.charAt(charIndex);
            charIndex++;
            setTimeout(typeWriter, 50);
        } else {
            isDeleting = true;
            setTimeout(typeWriter, 2000);
        }
    } else {
        if (charIndex > 0) {
            typewriterElement.textContent = currentPhrase.substring(0, charIndex - 1);
            charIndex--;
            setTimeout(typeWriter, 30);
        } else {
            isDeleting = false;
            phraseIndex = (phraseIndex + 1) % phrases.length;
            setTimeout(typeWriter, 500);
        }
    }
}

if (typewriterElement) {
    typeWriter();
}

function startSlideshow() {
    const slides = document.querySelectorAll('.slide');
    if(slides.length === 0) return;
    let currentSlide = 0;

    setInterval(() => {
        slides.forEach(slide => slide.style.display = 'none');
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].style.display = 'block';
    }, 5000);
}

startSlideshow();

const projectsGrid = document.getElementById('projectsGrid');
const projectDetailsSection = document.getElementById('projectDetailsSection');
const closeDetailsBtn = document.getElementById('closeDetailsBtn');
const projectDetailsContent = document.getElementById('projectDetailsContent');

async function loadAllProjects() {
    try {
        const snap = await getDocs(collection(db, "projects"));
        if(!projectsGrid) return;
        projectsGrid.innerHTML = '';
        
        if (snap.empty) {
            projectsGrid.innerHTML = '<p>No projects available.</p>';
            return;
        }

        snap.forEach(doc => {
            const data = doc.data();
            const card = document.createElement('div');
            card.className = 'project-card';
            card.style.cssText = `
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                cursor: pointer;
                transition: all 0.3s ease;
                border-top: 4px solid #2c5282;
            `;
            
            card.innerHTML = `
                <h3 style="margin: 0 0 10px 0; color: #0b1c2c;">${data.title}</h3>
                <p style="margin: 0 0 10px 0; color: #666; font-size: 0.9rem;">${data.location}</p>
                <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
                    <span><strong>Budget:</strong> ₹${data.budget}</span>
                    <span><strong>Status:</strong> <span style="color: #27ae60; font-weight: bold;">${data.status}</span></span>
                </div>
            `;
            
            card.addEventListener('click', () => showProjectDetails(doc.id, data));
            projectsGrid.appendChild(card);
        });
    } catch (e) {
        if(projectsGrid) projectsGrid.innerHTML = '<p>Error loading projects.</p>';
        console.error(e);
    }
}

async function showProjectDetails(projectId, projectData) {
    projectDetailsSection.style.display = 'block';
    projectDetailsContent.innerHTML = '<p>Loading project details...</p>';
    projectDetailsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
        let html = `
            <div style="background: linear-gradient(135deg, #0b1c2c, #2c5282); color: white; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="margin: 0 0 10px 0; color: #ffffff;">${projectData.title}</h2>
                <p style="margin: 0; color: #e8f0f7;">📍 ${projectData.location}</p>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px;">
                <div style="background: #ecf0f1; padding: 20px; border-radius: 8px; text-align: center;">
                    <h4 style="margin: 0; color: #7f8c8d; font-size: 0.9rem;">Total Budget</h4>
                    <p style="margin: 10px 0 0 0; font-size: 1.8rem; color: #0b1c2c; font-weight: bold;">₹${projectData.budget}</p>
                </div>
                <div style="background: #ecf0f1; padding: 20px; border-radius: 8px; text-align: center;">
                    <h4 style="margin: 0; color: #7f8c8d; font-size: 0.9rem;">Current Status</h4>
                    <p style="margin: 10px 0 0 0; font-size: 1.8rem; color: #27ae60; font-weight: bold;">${projectData.status}</p>
                </div>
                <div style="background: #ecf0f1; padding: 20px; border-radius: 8px; text-align: center;">
                    <h4 style="margin: 0; color: #7f8c8d; font-size: 0.9rem;">Contractor</h4>
                    <p style="margin: 10px 0 0 0; font-size: 1.2rem; color: #0b1c2c; font-weight: bold;">${projectData.contractor}</p>
                </div>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                <h3 style="margin: 0 0 15px 0; color: #0b1c2c;">📋 Project Details</h3>
                <p><strong>Start Date:</strong> ${projectData.startDate}</p>
                <p><strong>Current Stage:</strong> ${projectData.currentStage || 'Initiated'}</p>
                <p><strong>Location:</strong> ${projectData.location}</p>
            </div>
        `;

        const stages = ["Foundation", "Structure", "Flooring", "Roofing", "Completed"];
        const currentStage = projectData.currentStage || "Initiated";
        const currentIndex = stages.indexOf(currentStage);
        
        const progressPercent = (currentIndex / (stages.length - 1)) * 100;
        
        html += `
        <div style="background: white; padding: 30px 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
            <h3 style="margin: 0 0 40px 0; color: #0b1c2c;">🚩 Construction Progress</h3>
            
            <div style="position: relative; padding: 0 10px;">
                <div style="position: absolute; top: 15px; left: 0; right: 0; height: 4px; background: #e0e0e0; z-index: 0; border-radius: 2px;"></div>
                
                <div style="position: absolute; top: 15px; left: 0; width: ${progressPercent}%; height: 4px; background: #27ae60; z-index: 0; border-radius: 2px; transition: width 1s ease;"></div>
                
                <div style="display: flex; justify-content: space-between; position: relative; z-index: 1;">
        `;
        
        stages.forEach((stage, idx) => {
             const isCompleted = idx <= currentIndex;
             const isCurrent = idx === currentIndex;
             
             const bgColor = isCompleted ? '#27ae60' : 'white';
             const borderColor = isCompleted ? '#27ae60' : '#bdc3c7';
             const textColor = isCompleted ? 'white' : '#bdc3c7';
             const icon = isCompleted ? '✓' : idx + 1;
             const fontWeight = isCurrent ? 'bold' : 'normal';
             const labelColor = isCurrent ? '#2c3e50' : '#95a5a6';

             html += `
                <div style="text-align: center; width: 80px; display: flex; flex-direction: column; align-items: center;">
                    <div style="width: 34px; height: 34px; background: ${bgColor}; border: 3px solid ${borderColor}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: ${textColor}; font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.1); transition: all 0.3s ease;">
                        ${icon}
                    </div>
                    <small style="margin-top: 10px; color: ${labelColor}; font-weight: ${fontWeight}; font-size: 0.8rem; text-align: center;">${stage}</small>
                </div>
             `;
        });
        
        html += `   </div>
                </div>
            </div>`;

        const q = query(collection(db, "logs"), where("projectId", "==", projectId));
        const projectLogsSnap = await getDocs(q);
        
        const allLogs = [];
        projectLogsSnap.forEach(doc => {
            allLogs.push({ id: doc.id, ...doc.data() });
        });

        allLogs.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

        html += `
            <h3 style="margin: 30px 0 15px 0; color: #0b1c2c;">📋 Site Progress & Activity Logs</h3>
            <div style="margin-bottom: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
                <input type="text" id="logsSearchInput" placeholder="Search by type, material, or supplier..." 
                       style="flex: 1; min-width: 200px; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                <select id="logsSortSelect" style="padding: 10px 15px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; background: white; cursor: pointer;">
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="verified">Verified First</option>
                </select>
            </div>

            <div style="overflow-x: auto; background: white; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.08);">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead style="background: linear-gradient(135deg, #2c5282, #3a6a9f); color: white;">
                        <tr>
                            <th style="padding: 14px; text-align: left; border: 1px solid #ecf0f1;">Type</th>
                            <th style="padding: 14px; text-align: left; border: 1px solid #ecf0f1;">Details</th>
                            <th style="padding: 14px; text-align: left; border: 1px solid #ecf0f1;">Date/Time</th>
                            <th style="padding: 14px; text-align: center; border: 1px solid #ecf0f1;">Status</th>
                            <th style="padding: 14px; text-align: left; border: 1px solid #ecf0f1;">Hash (256-bit)</th>
                        </tr>
                    </thead>
                    <tbody id="logsTableBody">
        `;

        if (allLogs.length === 0) {
             html += `<tr><td colspan="5" style="padding: 20px; text-align: center;">No activity logs found for this project yet.</td></tr>`;
        } else {
            allLogs.forEach(log => {
                const timestamp = log.timestamp?.toDate ? new Date(log.timestamp.toDate()).toLocaleString('en-IN') : 'N/A';
                const details = log.materialName ? `${log.materialName} (${log.quantity})` : (log.workDescription || log.type);
                const statusColor = log.verified ? '#d4edda' : '#fff3cd';
                const statusText = log.verified ? '✓ Verified' : 'Pending';
                const statusTextColor = log.verified ? '#155724' : '#856404';

                html += `
                    <tr class="logs-row" data-type="${(log.type || '').toLowerCase()}" data-verified="${log.verified || false}" style="border-bottom: 1px solid #eee; transition: background 0.2s;">
                        <td style="padding: 12px; border: 1px solid #ecf0f1;"><strong>${log.type || 'N/A'}</strong></td>
                        <td style="padding: 12px; border: 1px solid #ecf0f1;">
                            <div style="font-size: 0.9rem;">
                                ${details}<br>
                                ${log.supplier ? `<small style="color: #666;">Supplier: ${log.supplier}</small>` : ''}
                            </div>
                        </td>
                        <td style="padding: 12px; border: 1px solid #ecf0f1; text-align: center; font-size: 0.9rem;">${timestamp}</td>
                        <td style="padding: 12px; border: 1px solid #ecf0f1; text-align: center;">
                            <span style="background: ${statusColor}; color: ${statusTextColor}; padding: 4px 10px; border-radius: 4px; font-size: 0.8rem; font-weight: bold;">
                                ${statusText}
                            </span>
                        </td>
                        <td style="padding: 12px; border: 1px solid #ecf0f1; word-break: break-all;">
                            <span style="background: #ecf0f1; color: #0b1c2c; padding: 8px; border-radius: 4px; font-size: 0.7rem; font-family: 'Courier New', monospace; cursor: pointer; display: block; line-height: 1.4;" title="Click to copy" onclick="navigator.clipboard.writeText('${log.hash || ''}').then(()=>alert('Hash copied!'))">
                                ${log.hash ? log.hash.substring(0, 20) + '...' : 'Pending Verification'}
                            </span>
                        </td>
                    </tr>
                `;
            });
        }

        html += `</tbody></table></div>`;
        projectDetailsContent.innerHTML = html;

        setTimeout(() => {
            const logsSearchInput = document.getElementById('logsSearchInput');
            const logsSortSelect = document.getElementById('logsSortSelect');
            
            if (logsSearchInput && logsSortSelect && allLogs.length > 0) {
                function filterAndSortLogs() {
                    const searchTerm = logsSearchInput.value.toLowerCase();
                    const sortBy = logsSortSelect.value;
                    const logsTableBody = document.getElementById('logsTableBody');
                    
                    const filteredLogs = allLogs.filter(log => {
                        const txt = (log.type + log.materialName + log.workDescription + log.supplier).toLowerCase();
                        return txt.includes(searchTerm);
                    });

                    filteredLogs.sort((a, b) => {
                        const tA = a.timestamp?.seconds || 0;
                        const tB = b.timestamp?.seconds || 0;
                        if (sortBy === 'newest') return tB - tA;
                        if (sortBy === 'oldest') return tA - tB;
                        if (sortBy === 'verified') return (b.verified ? 1 : 0) - (a.verified ? 1 : 0);
                        return 0;
                    });

                    let rowsHtml = '';
                    filteredLogs.forEach(log => {
                         const timestamp = log.timestamp?.toDate ? new Date(log.timestamp.toDate()).toLocaleString('en-IN') : 'N/A';
                         const details = log.materialName ? `${log.materialName} (${log.quantity})` : (log.workDescription || log.type);
                         const statusColor = log.verified ? '#d4edda' : '#fff3cd';
                         const statusText = log.verified ? 'Verified' : 'Pending';
                         const statusTextColor = log.verified ? '#155724' : '#856404';

                         rowsHtml += `
                            <tr style="border-bottom: 1px solid #eee;">
                                <td style="padding: 12px; border: 1px solid #ecf0f1;"><strong>${log.type}</strong></td>
                                <td style="padding: 12px; border: 1px solid #ecf0f1;">${details}</td>
                                <td style="padding: 12px; border: 1px solid #ecf0f1;">${timestamp}</td>
                                <td style="padding: 12px; border: 1px solid #ecf0f1;"><span style="background: ${statusColor}; color: ${statusTextColor}; padding: 4px;">${statusText}</span></td>
                                <td style="padding: 12px; border: 1px solid #ecf0f1; font-family:monospace; font-size:0.8rem;">${log.hash ? log.hash.substring(0,10)+'...' : '-'}</td>
                            </tr>
                         `;
                    });
                    logsTableBody.innerHTML = rowsHtml;
                }

                logsSearchInput.addEventListener('input', filterAndSortLogs);
                logsSortSelect.addEventListener('change', filterAndSortLogs);
            }
        }, 100);

    } catch (error) {
        console.error('Error in showProjectDetails:', error);
        projectDetailsContent.innerHTML = '<p style="color: red;">Error loading project details: ' + error.message + '</p>';
    }
}

if(closeDetailsBtn) {
    closeDetailsBtn.addEventListener('click', () => {
        projectDetailsSection.style.display = 'none';
        document.getElementById('Projects').scrollIntoView({ behavior: 'smooth' });
    });
}

if (projectsGrid) {
    loadAllProjects();
}


const laborProjectSelect = document.getElementById('laborProjectSelect');
const laborStatsContainer = document.getElementById('laborStatsContainer');
const closeLaborBtn = document.getElementById('closeLaborBtn');
const closeVerifyBtn = document.getElementById('closeVerifyBtn');

async function loadProjectsForLabor() {
    try {
        const snap = await getDocs(collection(db, "projects"));
        if (!laborProjectSelect) return;
        
        laborProjectSelect.innerHTML = "<option value=''>-- Select a Project --</option>";
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const opt = document.createElement("option");
            opt.value = docSnap.id;
            opt.innerText = data.title;
            laborProjectSelect.appendChild(opt);
        });
    } catch (e) {}
}

if (laborProjectSelect) {
    laborProjectSelect.addEventListener('change', async () => {
        const projectId = laborProjectSelect.value;
        if (!projectId) return;
        
        laborStatsContainer.innerHTML = "<p>Loading labor data...</p>";
        const chartSection = document.getElementById('laborChartSection');
        if (chartSection) chartSection.style.display = 'block'; 
        
        try {
            const laborersQuery = query(collection(db, "laborers"), where("projectId", "==", projectId));
            const laborersSnap = await getDocs(laborersQuery);

            const attendanceQuery = query(collection(db, "attendance_logs"), where("projectId", "==", projectId));
            const attendanceSnap = await getDocs(attendanceQuery);

            const attendanceCount = {};
            let totalManDays = 0;

            attendanceSnap.forEach(docSnap => {
                const data = docSnap.data();
                if (data.laborerId) {
                    attendanceCount[data.laborerId] = (attendanceCount[data.laborerId] || 0) + 1;
                    totalManDays++;
                }
            });

            const today = new Date();
            const dailyCount = {};
            for (let i = 6; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                dailyCount[dateStr] = 0;
            }

            attendanceSnap.forEach(docSnap => {
                const data = docSnap.data();
                let dateStr;
                if(data.date && data.date.toDate) {
                     dateStr = data.date.toDate().toISOString().split('T')[0];
                } else if(data.date) {
                     const d = new Date(data.date);
                     if(!isNaN(d)) dateStr = d.toISOString().split('T')[0];
                }
                
                if (dateStr && dailyCount.hasOwnProperty(dateStr)) {
                    dailyCount[dateStr]++;
                }
            });

            let html = `
                <div style="display: flex; gap: 20px; margin-bottom: 20px; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 200px; text-align: center; padding: 20px; background: linear-gradient(135deg, #3498db, #2980b9); color: white; border-radius: 8px;">
                        <h3 style="margin: 0; font-size: 2rem;">${laborersSnap.size}</h3>
                        <p style="margin: 10px 0 0 0;">Total Workforce</p>
                    </div>
                    <div style="flex: 1; min-width: 200px; text-align: center; padding: 20px; background: linear-gradient(135deg, #2ecc71, #27ae60); color: white; border-radius: 8px;">
                        <h3 style="margin: 0; font-size: 2rem;">${totalManDays}</h3>
                        <p style="margin: 10px 0 0 0;">Total Verified Man-Days</p>
                    </div>
                </div>

                <h3 style="margin: 20px 0 15px 0; color: #0b1c2c;">👷 On-Site Personnel Report</h3>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 5px rgba(0,0,0,0.08);">
                        <thead style="background: linear-gradient(135deg, #2c5282, #3a6a9f); color: white;">
                            <tr>
                                <th style="padding: 14px; text-align: left;">Worker Name</th>
                                <th style="padding: 14px; text-align: left;">Role</th>
                                <th style="padding: 14px; text-align: center;">Days Present</th>
                                <th style="padding: 14px; text-align: center;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            if(laborersSnap.empty) {
                html += `<tr><td colspan="4" style="padding:15px; text-align:center;">No laborers found.</td></tr>`;
            } else {
                laborersSnap.forEach(laborDoc => {
                    const person = laborDoc.data();
                    const days = attendanceCount[laborDoc.id] || 0;
                    html += `
                        <tr style="border-bottom: 1px solid #f0f0f0;">
                            <td style="padding: 12px;"><strong>${person.name}</strong></td>
                            <td style="padding: 12px;">${person.role}</td>
                            <td style="padding: 12px; text-align: center; font-weight: bold;">${days}</td>
                            <td style="padding: 12px; text-align: center;">
                                <span style="background: #27ae60; color: white; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">Active</span>
                            </td>
                        </tr>
                    `;
                });
            }

            html += `</tbody></table></div>`;
            laborStatsContainer.innerHTML = html;

            setTimeout(() => {
                renderLaborChart(dailyCount);
            }, 100);

        } catch (error) {
            console.error(error);
            laborStatsContainer.innerHTML = "<p>Error loading labor data. Please try again.</p>";
        }
    });
}

function renderLaborChart(dailyCount) {
    const canvasElement = document.getElementById('laborChart');
    if (!canvasElement) return;

    const ctx = canvasElement.getContext('2d');
    
    if (window.laborChartInstance) {
        window.laborChartInstance.destroy();
    }

    const dates = Object.keys(dailyCount).sort();
    const labels = dates.map(date => {
        const d = new Date(date);
        return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    });
    const data = dates.map(date => dailyCount[date]);

    window.laborChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Active Workers',
                data: data,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } }
            }
        }
    });
}

const verifyHashBtn = document.getElementById('verifyHashBtn');
if (verifyHashBtn) {
    verifyHashBtn.addEventListener('click', async () => {
        const hashInput = document.getElementById('hashInput');
        const verificationResult = document.getElementById('verificationResult');
        const hashValue = hashInput.value.trim();
        
        if (!hashValue) {
            verificationResult.style.display = 'block';
            verificationResult.innerHTML = '<span style="color:red">Please enter a hash.</span>';
            return;
        }

        verificationResult.style.display = 'block';
        verificationResult.innerText = '⏳ Verifying...';

        try {
            const logsQuery = query(collection(db, "logs"), where("hash", "==", hashValue));
            const logsSnap = await getDocs(logsQuery);

            if (!logsSnap.empty) {
                const logData = logsSnap.docs[0].data();
                verificationResult.innerHTML = `
                    <div style="background:#e8f8f5; color:#155724; padding:10px; border-radius:4px; border:1px solid #c3e6cb;">
                        ✅ <strong>Record Verified!</strong><br>
                        Type: ${logData.type}<br>
                        Status: Verified<br>
                        Timestamp: ${logData.timestamp?.toDate?.().toLocaleString('en-IN') || 'N/A'}
                    </div>
                `;
            } else {
                verificationResult.innerHTML = '<span style="color:red">❌ Hash not found. Record invalid or not yet verified.</span>';
            }
        } catch (error) {
            verificationResult.innerText = '❌ Error during verification.';
        }
    });
}

if (closeLaborBtn) {
    closeLaborBtn.addEventListener('click', () => {
        document.getElementById('laborSection').style.display = 'none';
        document.getElementById('Projects').scrollIntoView({ behavior: 'smooth' });
    });
}
if (closeVerifyBtn) {
    closeVerifyBtn.addEventListener('click', () => {
        document.getElementById('verifierSection').style.display = 'none';
        document.getElementById('Projects').scrollIntoView({ behavior: 'smooth' });
    });
}

const navLaborActivity = document.getElementById('navLaborActivity');
if (navLaborActivity) {
    navLaborActivity.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('laborSection').style.display = 'block';
        document.getElementById('laborSection').scrollIntoView({ behavior: 'smooth' });
        loadProjectsForLabor();
    });
}

const navVerify = document.getElementById('navVerify');
if (navVerify) {
    navVerify.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('verifierSection').style.display = 'block';
        document.getElementById('verifierSection').scrollIntoView({ behavior: 'smooth' });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadProjectsForLabor();
});