// Dashboard JavaScript (Plain Vanilla JS)

// Sample data for integrations
const integrationsData = [
    { name: 'Salesforce', type: 'CRM', status: 'active', users: 248, requests: '15.2K', lastActive: '2 mins ago' },
    { name: 'Stripe', type: 'Payment', status: 'active', users: 892, requests: '43.1K', lastActive: '5 mins ago' },
    { name: 'HubSpot', type: 'CRM', status: 'active', users: 156, requests: '8.7K', lastActive: '12 mins ago' },
    { name: 'GitHub', type: 'Development', status: 'active', users: 421, requests: '22.4K', lastActive: '18 mins ago' },
    { name: 'Slack', type: 'Communication', status: 'active', users: 673, requests: '31.9K', lastActive: '25 mins ago' },
    { name: 'Google Analytics', type: 'Analytics', status: 'inactive', users: 89, requests: '3.2K', lastActive: '2 hours ago' },
    { name: 'Mailchimp', type: 'Email', status: 'active', users: 234, requests: '12.8K', lastActive: '35 mins ago' },
    { name: 'AWS S3', type: 'Storage', status: 'active', users: 512, requests: '67.3K', lastActive: '8 mins ago' },
    { name: 'MongoDB', type: 'Database', status: 'error', users: 145, requests: '9.1K', lastActive: '1 hour ago' },
    { name: 'Twilio', type: 'Communication', status: 'active', users: 98, requests: '5.4K', lastActive: '42 mins ago' }
];

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    initSidebar();
    populateTable();
    initMobileMenu();
    animateStats();
    updateIntegrationCount();
});

// Sidebar functionality
function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
        });
    }

    // Restore sidebar state from localStorage
    const sidebarCollapsed = localStorage.getItem('sidebarCollapsed');
    if (sidebarCollapsed === 'true') {
        sidebar.classList.add('collapsed');
    }
}

// Mobile menu functionality
function initMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
        });
    }

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            if (!sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                sidebar.classList.remove('mobile-open');
            }
        }
    });
}

// Populate integrations table
function populateTable() {
    const tbody = document.querySelector('#integrationsTable tbody');

    if (!tbody) return;

    tbody.innerHTML = '';

    integrationsData.forEach((integration, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 14px;">
                        ${integration.name.charAt(0)}
                    </div>
                    <span style="font-weight: 600;">${integration.name}</span>
                </div>
            </td>
            <td>
                <span style="color: var(--gray-600); font-size: 13px;">${integration.type}</span>
            </td>
            <td>
                <span class="status-badge ${integration.status}">${integration.status}</span>
            </td>
            <td>${integration.users.toLocaleString()}</td>
            <td>${integration.requests}</td>
            <td style="color: var(--gray-500); font-size: 13px;">${integration.lastActive}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn" title="View" onclick="handleView(${index})">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                    </button>
                    <button class="action-btn" title="Edit" onclick="handleEdit(${index})">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button class="action-btn" title="Delete" onclick="handleDelete(${index})">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Animate stats on page load
function animateStats() {
    const statValues = document.querySelectorAll('.stat-value');

    statValues.forEach(stat => {
        const finalValue = stat.textContent;
        let currentValue = 0;
        const isPercentage = finalValue.includes('%');
        const isK = finalValue.includes('K');

        let targetValue;
        if (isPercentage) {
            targetValue = parseFloat(finalValue);
        } else if (isK) {
            targetValue = parseFloat(finalValue) * 1000;
        } else {
            targetValue = parseInt(finalValue.replace(/,/g, ''));
        }

        const duration = 1500;
        const steps = 60;
        const increment = targetValue / steps;
        const stepDuration = duration / steps;

        const timer = setInterval(() => {
            currentValue += increment;

            if (currentValue >= targetValue) {
                currentValue = targetValue;
                clearInterval(timer);
            }

            if (isPercentage) {
                stat.textContent = currentValue.toFixed(1) + '%';
            } else if (isK) {
                stat.textContent = (currentValue / 1000).toFixed(1) + 'K';
            } else {
                stat.textContent = Math.floor(currentValue).toLocaleString();
            }
        }, stepDuration);
    });
}

// Action handlers
function handleView(index) {
    const integration = integrationsData[index];
    showToast(`Viewing ${integration.name}`, 'info');
    console.log('View integration:', integration);
}

function handleEdit(index) {
    const integration = integrationsData[index];
    showToast(`Editing ${integration.name}`, 'info');
    console.log('Edit integration:', integration);
}

function handleDelete(index) {
    const integration = integrationsData[index];
    if (confirm(`Are you sure you want to delete ${integration.name}?`)) {
        integrationsData.splice(index, 1);
        populateTable();
        showToast(`${integration.name} deleted successfully`, 'success');
    }
}

// Toast notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';

    const bgColors = {
        success: 'var(--green-500)',
        error: 'var(--red-500)',
        info: 'var(--blue-500)',
        warning: 'var(--orange-500)'
    };

    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: ${bgColors[type] || bgColors.success};
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;

    toast.textContent = message;
    document.body.appendChild(toast);

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            toast.remove();
            style.remove();
        }, 300);
    }, 3000);
}

// Search functionality
const searchInput = document.querySelector('.search-input');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#integrationsTable tbody tr');

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    });
}

// Period selector for charts
const periodSelect = document.querySelector('.period-select');
if (periodSelect) {
    periodSelect.addEventListener('change', (e) => {
        showToast(`Chart updated to ${e.target.value}`, 'info');
    });
}

// Pagination
const paginationBtns = document.querySelectorAll('.pagination-btn:not([disabled])');
paginationBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        if (!btn.classList.contains('active')) {
            document.querySelectorAll('.pagination-btn.active').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            showToast(`Page ${btn.textContent} loaded`, 'info');
        }
    });
});

// Real-time updates simulation
function simulateRealTimeUpdates() {
    setInterval(() => {
        // Update API Requests stat
        const apiRequestsStat = document.querySelectorAll('.stat-value')[2];
        if (apiRequestsStat) {
            const currentValue = parseFloat(apiRequestsStat.textContent);
            const newValue = (currentValue + (Math.random() * 0.5)).toFixed(1);
            apiRequestsStat.textContent = newValue + 'K';
        }

        // Update last active times randomly
        const lastActiveCells = document.querySelectorAll('#integrationsTable tbody tr td:nth-child(6)');
        if (lastActiveCells.length > 0) {
            const randomIndex = Math.floor(Math.random() * lastActiveCells.length);
            lastActiveCells[randomIndex].textContent = 'just now';
            lastActiveCells[randomIndex].style.color = 'var(--green-600)';

            setTimeout(() => {
                lastActiveCells[randomIndex].style.color = 'var(--gray-500)';
            }, 2000);
        }
    }, 5000);
}

// Start real-time updates
simulateRealTimeUpdates();

// Export table functionality
const exportBtn = document.querySelector('.card-actions .btn-secondary');
if (exportBtn && exportBtn.textContent === 'Export') {
    exportBtn.addEventListener('click', () => {
        const csvContent = convertTableToCSV();
        downloadCSV(csvContent, 'integrations.csv');
        showToast('Table exported successfully', 'success');
    });
}

function convertTableToCSV() {
    const table = document.getElementById('integrationsTable');
    let csv = [];

    // Headers
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent);
    csv.push(headers.join(','));

    // Rows
    integrationsData.forEach(row => {
        csv.push([
            row.name,
            row.type,
            row.status,
            row.users,
            row.requests,
            row.lastActive
        ].join(','));
    });

    return csv.join('\n');
}

function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Notification bell
const notificationBtn = document.getElementById('notificationBtn');
if (notificationBtn) {
    notificationBtn.addEventListener('click', () => {
        showToast('You have 3 new notifications', 'info');
    });
}

// Update integration count badge
async function updateIntegrationCount() {
    try {
        const response = await fetch('http://localhost:3000/api/integrations');
        const data = await response.json();
        const badge = document.getElementById('integrationCount');
        if (badge && data.integrations) {
            badge.textContent = data.integrations.length;
        }
    } catch (error) {
        console.error('Failed to fetch integration count:', error);
    }
}

// Console welcome message
console.log(`
╔════════════════════════════════════════════════╗
║   Welcome to Integration Platform Dashboard    ║
║   Built with Vanilla JavaScript & CSS          ║
╚════════════════════════════════════════════════╝
`);
