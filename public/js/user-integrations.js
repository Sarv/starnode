// User Integrations Marketplace JavaScript

let allIntegrations = [];
let userConnections = [];
let selectedUserId = null;
let currentCategory = 'all';
let currentStatus = 'all';

// Load on page load
document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
});

// Load all users into dropdown
async function loadUsers() {
    try {
        const response = await fetch('/api/users');
        const data = await response.json();

        const userSelect = document.getElementById('userSelect');

        if (data.users && data.users.length > 0) {
            data.users
                .filter(user => user.status === 'active')
                .forEach(user => {
                    const option = document.createElement('option');
                    option.value = user.userId;
                    option.textContent = `${user.name} (${user.email})`;
                    userSelect.appendChild(option);
                });
        }
    } catch (error) {
        console.error('Error loading users:', error);
        showToast('Failed to load users', 'error');
    }
}

// Handle user selection change
async function handleUserChange() {
    const userSelect = document.getElementById('userSelect');
    selectedUserId = userSelect.value;

    const noUserState = document.getElementById('noUserState');
    const integrationsGrid = document.getElementById('integrationsGrid');

    if (!selectedUserId) {
        noUserState.style.display = 'block';
        integrationsGrid.style.display = 'none';
        return;
    }

    noUserState.style.display = 'none';
    integrationsGrid.style.display = 'grid';

    await loadIntegrations();
}

// Load all integrations and user connections
async function loadIntegrations() {
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const integrationsGrid = document.getElementById('integrationsGrid');

    try {
        loadingState.style.display = 'block';
        emptyState.style.display = 'none';
        integrationsGrid.innerHTML = '';

        // Load integrations (only active ones)
        const integrationsResponse = await fetch('/api/integrations');
        const integrationsData = await integrationsResponse.json();
        allIntegrations = (integrationsData.integrations || []).filter(integration => integration.status === 'active');

        // Load user connections
        if (selectedUserId) {
            try {
                const connectionsResponse = await fetch(`/api/user-integrations/my-connections?userId=${selectedUserId}`);
                const connectionsData = await connectionsResponse.json();
                userConnections = connectionsData.connections || [];
            } catch (error) {
                console.log('No connections found for user');
                userConnections = [];
            }
        }

        loadingState.style.display = 'none';

        // Filter and render
        filterIntegrations();

    } catch (error) {
        console.error('Error loading integrations:', error);
        loadingState.style.display = 'none';
        showToast('Failed to load integrations', 'error');
    }
}

// Filter integrations based on search, category, and status
function filterIntegrations() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const integrationsGrid = document.getElementById('integrationsGrid');
    const emptyState = document.getElementById('emptyState');

    let filtered = allIntegrations.filter(integration => {
        // Search filter
        const matchesSearch =
            integration.displayName.toLowerCase().includes(searchTerm) ||
            (integration.description || '').toLowerCase().includes(searchTerm);

        // Category filter
        const matchesCategory = currentCategory === 'all' || integration.category === currentCategory;

        // Status filter
        let matchesStatus = true;
        if (currentStatus === 'connected') {
            matchesStatus = isIntegrationConnected(integration.id);
        } else if (currentStatus === 'not-connected') {
            matchesStatus = !isIntegrationConnected(integration.id);
        }

        return matchesSearch && matchesCategory && matchesStatus;
    });

    if (filtered.length === 0) {
        emptyState.style.display = 'block';
        integrationsGrid.innerHTML = '';
    } else {
        emptyState.style.display = 'none';
        renderIntegrations(filtered);
    }
}

// Check if integration is connected for current user
function isIntegrationConnected(integrationId) {
    return userConnections.some(conn =>
        conn.integrationId === integrationId &&
        conn.isActive &&
        conn.status === 'active'
    );
}

// Get connection for integration
function getConnection(integrationId) {
    return userConnections.find(conn =>
        conn.integrationId === integrationId &&
        conn.isActive &&
        conn.status === 'active'
    );
}

// Render integrations grid
function renderIntegrations(integrations) {
    const integrationsGrid = document.getElementById('integrationsGrid');

    integrationsGrid.innerHTML = integrations.map(integration => {
        const isConnected = isIntegrationConnected(integration.id);
        const connection = getConnection(integration.id);

        return `
            <div class="integration-card ${isConnected ? 'connected' : ''}" data-integration-id="${integration.id}">
                <div class="card-header">
                    <div class="integration-icon">
                        ${integration.iconUrl ?
                            `<img src="${escapeHtml(integration.iconUrl)}" alt="${escapeHtml(integration.displayName)}" onerror="this.style.display='none'">` :
                            getDefaultIcon(integration.category)
                        }
                    </div>
                    <div class="card-title">
                        <h3>${escapeHtml(integration.displayName)}</h3>
                        <span class="category-badge ${integration.category}">${escapeHtml(integration.category)}</span>
                    </div>
                </div>

                <div class="card-description">
                    ${escapeHtml(integration.description || 'No description available')}
                </div>

                <div class="card-footer">
                    <span class="integration-status ${isConnected ? 'connected' : 'not-connected'}">
                        ${isConnected ? '✓ Connected' : 'Not Connected'}
                    </span>
                    <div class="card-actions">
                        ${isConnected ?
                            `<button class="btn-view" onclick="viewConnection('${connection.connectionId}')">
                                View
                            </button>
                            <button class="btn-connect" onclick="connectIntegration('${integration.id}')">
                                Connect Again
                            </button>` :
                            `<button class="btn-connect" onclick="connectIntegration('${integration.id}')">
                                Connect
                            </button>`
                        }
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Filter by category
function filterByCategory(category) {
    currentCategory = category;

    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === category) {
            btn.classList.add('active');
        }
    });

    filterIntegrations();
}

// Filter by status
function filterByStatus(status) {
    currentStatus = status;

    // Update active button
    document.querySelectorAll('.status-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    filterIntegrations();
}

// Connect to integration
function connectIntegration(integrationId) {
    if (!selectedUserId) {
        showToast('Please select a user first', 'error');
        return;
    }

    // Redirect to connection wizard
    window.location.href = `/connect-integration?integrationId=${integrationId}&userId=${selectedUserId}`;
}

// View connection
function viewConnection(connectionId) {
    // Redirect to my connections page with this connection highlighted
    window.location.href = `/my-connections?userId=${selectedUserId}&connectionId=${connectionId}`;
}

// Get default icon for category
function getDefaultIcon(category) {
    const icons = {
        crm: '👥',
        payment: '💳',
        database: '🗄️',
        communication: '💬',
        analytics: '📊',
        storage: '📦',
        other: '🔌'
    };
    return icons[category] || '🔌';
}

// Utility Functions

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
