import { db } from './firebase-config.js';
import { collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

// --- DOM ELEMENTS ---
const projectSelect = document.getElementById('laborProjectSelect');
const sidebar = document.getElementById('rightSidebar');
const toggleBtn = document.getElementById('toggleSidebarBtn');
const backBtn = document.getElementById('backBtn');

// Sections
const sections = {
    metrics: document.getElementById('metricsSection'),
    charts: document.getElementById('chartsSection'),
    table: document.getElementById('laborTableSection'),
    profiles: document.getElementById('workerCardsSection'),
    insights: document.getElementById('insightsSection')
};

// Nav Buttons
const navs = {
    metrics: document.getElementById('navMetrics'),
    charts: document.getElementById('navCharts'),
    table: document.getElementById('navTable'),
    profiles: document.getElementById('navProfiles'),
    insights: document.getElementById('navInsights')
};

// Chart Instances
let workIntensityChart = null;
let roleDistributionChart = null;
let attendancePatternChart = null;
let statusDistributionChart = null;

// Current Data
let currentProjectData = null;
let allWorkers = [];
let allAttendance = [];

// Initialize
document.getElementById('sidebarName').innerText = "Guest";
loadProjects();

// SIDEBAR TOGGLE
let isCollapsed = false;
toggleBtn.addEventListener('click', () => {
    isCollapsed = !isCollapsed;
    if (isCollapsed) {
        sidebar.style.width = "60px";
        sidebar.classList.add('collapsed');
        document.querySelectorAll('.sidebar-nav button, .profile-info h3, .profile-info small, .logout-btn').forEach(el => el.style.display = 'none');
    } else {
        sidebar.style.width = "250px";
        sidebar.classList.remove('collapsed');
        document.querySelectorAll('.sidebar-nav button, .profile-info h3, .profile-info small, .logout-btn').forEach(el => el.style.display = 'block');
    }
});

// BACK BUTTON
backBtn.addEventListener('click', () => {
    window.location.href = "index.html";
});

// SECTION NAVIGATION
function switchTab(tabName) {
    Object.values(sections).forEach(sec => sec.style.display = 'none');
    Object.values(navs).forEach(nav => nav.classList.remove('active'));
    sections[tabName].style.display = 'block';
    navs[tabName].classList.add('active');
}

Object.keys(navs).forEach(key => {
    navs[key].addEventListener('click', () => switchTab(key));
});

// LOAD PROJECTS
async function loadProjects() {
    try {
        const snap = await getDocs(collection(db, "projects"));
        projectSelect.innerHTML = "<option value=''>-- Select a Project --</option>";
        snap.forEach(doc => {
            const data = doc.data();
            const opt = document.createElement("option");
            opt.value = doc.id;
            opt.innerText = data.title || "Untitled Project";
            projectSelect.appendChild(opt);
        });
    } catch (e) {
        console.error("Error loading projects:", e);
    }
}

// HANDLE PROJECT SELECTION
projectSelect.addEventListener('change', async () => {
    const pid = projectSelect.value;
    if (!pid) {
        Object.values(sections).forEach(sec => sec.style.display = 'none');
        return;
    }
    
    await loadLaborData(pid);
    Object.values(sections).forEach(sec => sec.style.display = 'none');
    sections.metrics.style.display = 'block';
    navs.metrics.classList.add('active');
});

// LOAD ALL LABOR DATA
async function loadLaborData(pid) {
    try {
        // Load workers
        const qWorkers = query(collection(db, "laborers"), where("projectId", "==", pid));
        const snapWorkers = await getDocs(qWorkers);
        allWorkers = [];
        snapWorkers.forEach(doc => {
            allWorkers.push({ id: doc.id, ...doc.data() });
        });

        // Load attendance
        const qAtt = query(collection(db, "attendance_logs"), where("projectId", "==", pid));
        const snapAtt = await getDocs(qAtt);
        allAttendance = [];
        snapAtt.forEach(doc => {
            allAttendance.push(doc.data());
        });

        // Update all views
        updateMetrics();
        renderCharts();
        renderLaborTable();
        renderWorkerCards();
        renderInsights();

    } catch (error) {
        console.error("Error loading labor data:", error);
        alert("Error loading labor data. Please try again.");
    }
}

// UPDATE KEY METRICS
function updateMetrics() {
    const totalWorkers = allWorkers.length;
    
    const attendanceCount = {};
    let totalManDays = 0;
    allAttendance.forEach(att => {
        if (att.laborerId) {
            attendanceCount[att.laborerId] = (attendanceCount[att.laborerId] || 0) + 1;
            totalManDays++;
        }
    });

    const avgAttendance = totalWorkers > 0 
        ? Math.round((totalManDays / (totalWorkers * 30)) * 100) 
        : 0;

    // Count roles
    const roleCounts = {};
    allWorkers.forEach(worker => {
        const role = worker.role || "Unassigned";
        roleCounts[role] = (roleCounts[role] || 0) + 1;
    });
    const mostCommonRole = Object.keys(roleCounts).reduce((a, b) => 
        roleCounts[a] > roleCounts[b] ? a : b, "None");

    document.getElementById('totalWorkers').innerText = totalWorkers;
    document.getElementById('totalManDays').innerText = totalManDays;
    document.getElementById('avgAttendance').innerText = avgAttendance + "%";
    document.getElementById('commonRole').innerText = mostCommonRole;
}

// RENDER CHARTS
async function renderCharts() {
    renderWorkIntensityChart();
    renderRoleDistributionChart();
    renderAttendancePatternChart();
    renderStatusDistributionChart();
}

// Chart 1: Work Intensity (7-Day Trend)
function renderWorkIntensityChart() {
    const ctx = document.getElementById('workIntensityChart').getContext('2d');
    
    const last7Days = {};
    const today = new Date();
    
    for(let i=6; i>=0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateStr = d.toDateString();
        last7Days[dateStr] = new Set();
    }

    allAttendance.forEach(att => {
        if (att.date && last7Days.hasOwnProperty(att.date)) {
            last7Days[att.date].add(att.laborerId);
        }
    });

    const labels = Object.keys(last7Days).map(dateStr => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    });
    
    const dataPoints = Object.values(last7Days).map(set => set.size);

    if (workIntensityChart) workIntensityChart.destroy();

    const ctx2d = ctx;
    let gradient = ctx2d.createLinearGradient(0, 0, 0, 350);
    gradient.addColorStop(0, 'rgba(52, 152, 219, 0.4)');
    gradient.addColorStop(1, 'rgba(52, 152, 219, 0.0)');

    workIntensityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Active Workers',
                data: dataPoints,
                borderColor: '#3498db',
                backgroundColor: gradient,
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#3498db',
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            return '👷 Workers: ' + context.parsed.y;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 },
                    grid: { borderDash: [5, 5] }
                },
                x: { grid: { display: false } }
            }
        }
    });
}

// Chart 2: Role Distribution
function renderRoleDistributionChart() {
    const ctx = document.getElementById('roleDistributionChart').getContext('2d');
    
    const roleCounts = {};
    const roleColors = {
        'Engineer': '#3498db',
        'Laborer': '#e67e22',
        'Supervisor': '#27ae60',
        'Mason': '#9b59b6',
        'Carpenter': '#f39c12',
        'Electrician': '#1abc9c',
        'Plumber': '#c0392b',
        'Helper': '#95a5a6'
    };

    allWorkers.forEach(worker => {
        const role = worker.role || "Unassigned";
        roleCounts[role] = (roleCounts[role] || 0) + 1;
    });

    const labels = Object.keys(roleCounts);
    const data = Object.values(roleCounts);
    const colors = labels.map(role => roleColors[role] || '#34495e');

    if (roleDistributionChart) roleDistributionChart.destroy();

    roleDistributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 15, font: { size: 12 } }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return context.label + ': ' + context.parsed + ' (' + percentage + '%)';
                        }
                    }
                }
            }
        }
    });
}

// Chart 3: Attendance Pattern (by day of week)
function renderAttendancePatternChart() {
    const ctx = document.getElementById('attendancePatternChart').getContext('2d');
    
    const dayCount = {
        'Monday': 0,
        'Tuesday': 0,
        'Wednesday': 0,
        'Thursday': 0,
        'Friday': 0,
        'Saturday': 0,
        'Sunday': 0
    };

    allAttendance.forEach(att => {
        if (att.date) {
            const d = new Date(att.date);
            const day = d.toLocaleDateString('en-US', { weekday: 'long' });
            if (dayCount.hasOwnProperty(day)) {
                dayCount[day]++;
            }
        }
    });

    const labels = Object.keys(dayCount);
    const data = Object.values(dayCount);

    if (attendancePatternChart) attendancePatternChart.destroy();

    attendancePatternChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Workers Present',
                data: data,
                backgroundColor: '#e67e22',
                borderColor: '#d35400',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    padding: 10
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 },
                    grid: { borderDash: [5, 5] }
                },
                x: { grid: { display: false } }
            }
        }
    });
}

// Chart 4: Status Distribution
function renderStatusDistributionChart() {
    const ctx = document.getElementById('statusDistributionChart').getContext('2d');
    
    const statusCounts = {
        'Active': allWorkers.length,
        'On Leave': 0,
        'Inactive': 0
    };

    // Simple logic: if worker has no recent attendance, mark as inactive
    const recentWorkers = new Set();
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    allAttendance.forEach(att => {
        if (att.date) {
            const attDate = new Date(att.date);
            if (attDate >= thirtyDaysAgo) {
                recentWorkers.add(att.laborerId);
            }
        }
    });

    statusCounts.Active = recentWorkers.size;
    statusCounts.Inactive = allWorkers.length - recentWorkers.size;

    if (statusDistributionChart) statusDistributionChart.destroy();

    const colors = ['#27ae60', '#f39c12', '#e74c3c'];
    
    statusDistributionChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(statusCounts),
            datasets: [{
                data: Object.values(statusCounts),
                backgroundColor: colors,
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 15, font: { size: 12 } }
                }
            }
        }
    });
}

// RENDER LABOR TABLE
function renderLaborTable() {
    const tbody = document.getElementById('laborTableBody');
    
    if (allWorkers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="padding: 20px; text-align: center; color: #7f8c8d;">No workers registered for this project.</td></tr>';
        return;
    }

    const attendanceCount = {};
    allAttendance.forEach(att => {
        if (att.laborerId) {
            attendanceCount[att.laborerId] = (attendanceCount[att.laborerId] || 0) + 1;
        }
    });

    // Populate role filter
    const roleFilter = document.getElementById('roleFilter');
    const roles = new Set();
    allWorkers.forEach(w => roles.add(w.role || "Unassigned"));
    const existingOptions = Array.from(roleFilter.options).map(o => o.value);
    roles.forEach(role => {
        if (!existingOptions.includes(role)) {
            const opt = document.createElement('option');
            opt.value = role;
            opt.innerText = role;
            roleFilter.appendChild(opt);
        }
    });

    let html = '';
    allWorkers.forEach(worker => {
        const days = attendanceCount[worker.id] || 0;
        const attendance = allWorkers.length > 0 ? Math.round((days / 30) * 100) : 0;
        const statusBadge = days > 15 ? '<span style="background: #27ae60; color: white; padding: 4px 12px; border-radius: 10px; font-size: 0.8rem; font-weight: bold;">Active</span>' 
                          : days > 5 ? '<span style="background: #f39c12; color: white; padding: 4px 12px; border-radius: 10px; font-size: 0.8rem; font-weight: bold;">Regular</span>'
                          : '<span style="background: #e74c3c; color: white; padding: 4px 12px; border-radius: 10px; font-size: 0.8rem; font-weight: bold;">Inactive</span>';

        html += `
            <tr style="border-bottom: 1px solid #ecf0f1; transition: background 0.3s;">
                <td style="padding: 15px; border: 1px solid #ecf0f1; color: #3498db; font-weight: bold;">${worker.id.substring(0, 8).toUpperCase()}</td>
                <td style="padding: 15px; border: 1px solid #ecf0f1; font-weight: 500;">${worker.name || 'N/A'}</td>
                <td style="padding: 15px; border: 1px solid #ecf0f1; color: #7f8c8d;">${worker.role || 'Unassigned'}</td>
                <td style="padding: 15px; border: 1px solid #ecf0f1; text-align: center; font-weight: bold;">${days}</td>
                <td style="padding: 15px; border: 1px solid #ecf0f1; text-align: center; color: #2980b9; font-weight: bold;">${attendance}%</td>
                <td style="padding: 15px; border: 1px solid #ecf0f1; text-align: center;">${statusBadge}</td>
                <td style="padding: 15px; border: 1px solid #ecf0f1; text-align: center; color: #7f8c8d;">${worker.phone || 'N/A'}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;

    // Search & Filter
    document.getElementById('laborSearch').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const role = document.getElementById('roleFilter').value;
        const rows = tbody.querySelectorAll('tr');
        
        rows.forEach(row => {
            const name = row.children[1].textContent.toLowerCase();
            const rowRole = row.children[2].textContent.toLowerCase();
            const matchesSearch = name.includes(query);
            const matchesRole = !role || rowRole === role.toLowerCase();
            row.style.display = (matchesSearch && matchesRole) ? '' : 'none';
        });
    });

    document.getElementById('roleFilter').addEventListener('change', () => {
        document.getElementById('laborSearch').dispatchEvent(new Event('input'));
    });
}

// RENDER WORKER PROFILE CARDS
function renderWorkerCards() {
    const container = document.getElementById('workerCardsContainer');
    
    if (allWorkers.length === 0) {
        container.innerHTML = '<p style="color: #7f8c8d; grid-column: 1/-1;">No workers registered.</p>';
        return;
    }

    const attendanceCount = {};
    allAttendance.forEach(att => {
        if (att.laborerId) {
            attendanceCount[att.laborerId] = (attendanceCount[att.laborerId] || 0) + 1;
        }
    });

    container.innerHTML = '';
    allWorkers.forEach(worker => {
        const days = attendanceCount[worker.id] || 0;
        const attendance = Math.round((days / 30) * 100);

        const card = document.createElement('div');
        card.style.cssText = `
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            border-left: 5px solid #3498db;
        `;

        card.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 15px;">
                <div style="width: 50px; height: 50px; background: #3498db; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.5rem; margin-right: 15px;">👤</div>
                <div>
                    <h3 style="margin: 0; color: #2c3e50;">${worker.name || 'Unknown'}</h3>
                    <small style="color: #7f8c8d;">${worker.role || 'Unassigned'}</small>
                </div>
            </div>

            <div style="background: white; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span style="color: #7f8c8d;">Days Present</span>
                    <strong style="color: #27ae60;">${days} days</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span style="color: #7f8c8d;">Attendance Rate</span>
                    <strong style="color: #3498db;">${attendance}%</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: #7f8c8d;">Phone</span>
                    <strong style="color: #34495e;">${worker.phone || 'N/A'}</strong>
                </div>
            </div>

            <div style="background: #ecf0f1; padding: 10px; border-radius: 4px; font-size: 0.85rem; color: #34495e; text-align: center;">
                <strong>Status:</strong> ${attendance > 50 ? '✅ Active' : attendance > 20 ? '⚠️ Regular' : '❌ Inactive'}
            </div>
        `;

        container.appendChild(card);
    });
}

// RENDER INSIGHTS
function renderInsights() {
    const container = document.getElementById('insightsContent');
    
    const attendanceCount = {};
    allAttendance.forEach(att => {
        if (att.laborerId) {
            attendanceCount[att.laborerId] = (attendanceCount[att.laborerId] || 0) + 1;
        }
    });

    const averageAttendance = allWorkers.length > 0 
        ? Math.round(Object.values(attendanceCount).reduce((a, b) => a + b, 0) / allWorkers.length)
        : 0;

    const mostConsistent = Object.entries(attendanceCount).sort((a, b) => b[1] - a[1])[0];
    const mostConsistentWorker = allWorkers.find(w => w.id === mostConsistent?.[0]);
    const mostConsistentDays = mostConsistent?.[1] || 0;

    const roleCounts = {};
    allWorkers.forEach(w => {
        const role = w.role || "Unassigned";
        roleCounts[role] = (roleCounts[role] || 0) + 1;
    });

    let insights = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div style="background: #e8f8f5; padding: 15px; border-radius: 8px; border-left: 4px solid #27ae60;">
                <h4 style="margin-top: 0; color: #27ae60;">✅ Average Attendance</h4>
                <p style="font-size: 1.8rem; color: #16a085; font-weight: bold; margin: 0;">${averageAttendance} days/month</p>
                <small style="color: #7f8c8d;">Based on current workforce</small>
            </div>

            <div style="background: #fef5e7; padding: 15px; border-radius: 8px; border-left: 4px solid #f39c12;">
                <h4 style="margin-top: 0; color: #f39c12;">🏆 Most Consistent Worker</h4>
                <p style="font-size: 1.2rem; color: #d68910; font-weight: bold; margin: 0;">${mostConsistentWorker?.name || 'N/A'}</p>
                <small style="color: #7f8c8d;">${mostConsistentDays} days present</small>
            </div>
        </div>

        <h4 style="margin-top: 20px; color: #2c3e50;">Workforce Breakdown:</h4>
        <ul style="list-style: none; padding: 0;">
    `;

    Object.entries(roleCounts).forEach(([role, count]) => {
        const percentage = Math.round((count / allWorkers.length) * 100);
        insights += `
            <li style="display: flex; align-items: center; margin-bottom: 10px; padding: 10px; background: #f8f9fa; border-radius: 4px;">
                <span style="font-weight: bold; color: #34495e; min-width: 120px;">${role}:</span>
                <div style="flex: 1; background: #ecf0f1; border-radius: 10px; height: 20px; overflow: hidden; margin: 0 10px;">
                    <div style="background: #3498db; height: 100%; width: ${percentage}%; display: flex; align-items: center; justify-content: center; color: white; font-size: 0.7rem;">
                        ${count > 2 ? percentage + '%' : ''}
                    </div>
                </div>
                <span style="color: #7f8c8d; min-width: 50px; text-align: right;">${count} workers</span>
            </li>
        `;
    });

    insights += `</ul>`;
    container.innerHTML = insights;
}

console.log("Labor Activity Dashboard loaded successfully!");
