// My Connections JavaScript

let allConnections = [];
let filteredConnections = [];
let selectedUserId = null;
let currentFilter = 'all';
let selectedConnectionId = null;

// Load on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadUsers();
    await checkUrlParams();
    setupConnectionEventListeners();
});

// Check URL parameters for pre-selected user/connection
async function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    const connectionId = urlParams.get('connectionId');

    if (userId) {
        const userSelect = document.getElementById('userSelect');
        userSelect.value = userId;

        // Wait for connections to load
        await handleUserChange();

        // If connectionId is specified, open that connection after loading
        if (connectionId) {
            const connection = allConnections.find(c => c.connectionId === connectionId);
            if (connection) {
                viewConnection(connection);
            } else {
                console.warn('Connection not found:', connectionId);
            }
        }
    }
}

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
    const connectionsContainer = document.getElementById('connectionsContainer');

    if (!selectedUserId) {
        noUserState.style.display = 'flex';
        connectionsContainer.style.display = 'none';
        return;
    }

    noUserState.style.display = 'none';
    connectionsContainer.style.display = 'block';

    await loadConnections();
}

// Load connections for selected user
async function loadConnections() {
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const connectionsList = document.getElementById('connectionsList');

    try {
        loadingState.style.display = 'flex';
        emptyState.style.display = 'none';
        connectionsList.innerHTML = '';

        const response = await fetch(`/api/user-integrations/my-connections?userId=${selectedUserId}`);
        const data = await response.json();

        allConnections = data.connections || [];

        loadingState.style.display = 'none';

        if (allConnections.length === 0) {
            emptyState.style.display = 'block';
            connectionsList.innerHTML = '';
        } else {
            emptyState.style.display = 'none';
            updateStats();
            filterByStatus(currentFilter);
        }

    } catch (error) {
        console.error('Error loading connections:', error);
        loadingState.style.display = 'none';
        showToast('Failed to load connections', 'error');
    }
}

// Update statistics
function updateStats() {
    const activeConnections = allConnections.filter(c => c.status === 'active' && c.isActive);
    const recentConnections = allConnections.filter(c => {
        const createdDate = new Date(c.createdAt);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return createdDate >= weekAgo;
    });

    document.getElementById('activeCount').textContent = activeConnections.length;
    document.getElementById('totalCount').textContent = allConnections.length;
    document.getElementById('recentCount').textContent = recentConnections.length;
}

// Filter connections by status
function filterByStatus(status) {
    currentFilter = status;

    // Update active tab
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.status === status) {
            tab.classList.add('active');
        }
    });

    // Filter connections
    if (status === 'all') {
        filteredConnections = allConnections;
    } else if (status === 'active') {
        filteredConnections = allConnections.filter(c => c.status === 'active' && c.isActive);
    } else if (status === 'inactive') {
        filteredConnections = allConnections.filter(c => c.status === 'inactive' || !c.isActive);
    }

    renderConnections();
}

// Render connections grid
async function renderConnections() {
    const connectionsList = document.getElementById('connectionsList');
    const emptyState = document.getElementById('emptyState');

    if (filteredConnections.length === 0) {
        connectionsList.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    // Load integration details for all connections
    const connectionsWithDetails = await Promise.all(
        filteredConnections.map(async (connection) => {
            try {
                const response = await fetch(`/api/integrations/${connection.integrationId}`);
                const integration = await response.json();
                return { ...connection, integration };
            } catch (error) {
                console.error(`Error loading integration ${connection.integrationId}:`, error);
                return {
                    ...connection,
                    integration: {
                        displayName: connection.integrationId,
                        category: 'other'
                    }
                };
            }
        })
    );

    connectionsList.innerHTML = connectionsWithDetails.map(connection => {
        const isActive = connection.status === 'active' && connection.isActive;
        const integrationName = connection.integration?.displayName || connection.integrationId;
        // Use connectionName if available, otherwise use integration name
        const displayName = connection.connectionName || integrationName;
        const createdDate = new Date(connection.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        // Get icon for integration
        const iconUrl = connection.integration?.iconUrl;
        const category = connection.integration?.category || 'other';
        const iconHtml = iconUrl ?
            `<img src="${escapeHtml(iconUrl)}" alt="${escapeHtml(integrationName)}" onerror="this.parentElement.innerHTML='${getDefaultIcon(category)}'">` :
            getDefaultIcon(category);

        return `
            <div class="connection-card ${!isActive ? 'inactive' : ''}" data-connection-id="${connection.connectionId}">
                <div class="connection-header">
                    <div class="connection-icon">
                        ${iconHtml}
                    </div>
                    <div class="connection-info">
                        <div class="connection-title">${escapeHtml(displayName)}</div>
                        <div class="connection-subtitle">
                            ${connection.connectionName && connection.connectionName !== integrationName ?
                                `${escapeHtml(integrationName)} • ` : ''
                            }${escapeHtml(connection.authMethodLabel || connection.authMethodId)}
                        </div>
                    </div>
                    <span class="connection-status ${isActive ? 'active' : 'inactive'}">
                        ${isActive ? 'Active' : 'Inactive'}
                    </span>
                </div>

                <div class="connection-details">
                    <div class="connection-detail">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        <span>Connected ${createdDate}</span>
                    </div>
                    ${connection.lastTestDate ? `
                        <div class="connection-detail">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                <polyline points="22 4 12 14.01 9 11.01"/>
                            </svg>
                            <span>Last tested ${new Date(connection.lastTestDate).toLocaleDateString()}</span>
                        </div>
                    ` : ''}
                </div>

                <div class="connection-actions">
                    <button class="btn-action primary" data-action="test" data-connection-id="${connection.connectionId}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                            <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                        Test
                    </button>
                    <button class="btn-action" data-action="edit" data-connection-id="${connection.connectionId}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Edit
                    </button>
                    <button class="btn-action" data-action="view" data-connection-id="${connection.connectionId}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                        View
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Setup event listeners for connection cards and buttons
function setupConnectionEventListeners() {
    const connectionsList = document.getElementById('connectionsList');

    // Event delegation for all clicks within the connections list
    connectionsList.addEventListener('click', (e) => {
        // Find if click was on a button or card
        const button = e.target.closest('button[data-action]');
        const card = e.target.closest('.connection-card');

        if (button) {
            e.stopPropagation();
            const action = button.dataset.action;
            const connectionId = button.dataset.connectionId;

            if (action === 'test') {
                testConnectionFromCard(connectionId);
            } else if (action === 'edit') {
                editConnection(connectionId);
            } else if (action === 'view') {
                viewConnectionById(connectionId);
            }
        } else if (card && !e.target.closest('.connection-actions')) {
            // Click on card itself (not on buttons)
            const connectionId = card.dataset.connectionId;
            viewConnectionById(connectionId);
        }
    });
}

// View connection by ID
function viewConnectionById(connectionId) {
    const connection = filteredConnections.find(c => c.connectionId === connectionId);
    if (connection) {
        viewConnection(connection);
    }
}

// View connection details
function viewConnection(connection) {
    selectedConnectionId = connection.connectionId;

    const modal = document.getElementById('connectionModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    const integrationName = connection.integration?.displayName || connection.integrationId;
    const displayName = connection.connectionName || integrationName;

    // Get icon for integration
    const iconUrl = connection.integration?.iconUrl;
    const category = connection.integration?.category || 'other';
    const iconHtml = iconUrl ?
        `<img src="${escapeHtml(iconUrl)}" alt="${escapeHtml(integrationName)}" style="width: 24px; height: 24px; object-fit: contain; border-radius: 4px; margin-right: 8px; vertical-align: middle;">` :
        `<span style="margin-right: 8px; font-size: 20px; vertical-align: middle;">${getDefaultIcon(category)}</span>`;

    modalTitle.innerHTML = `${iconHtml}${escapeHtml(displayName)} Connection`;

    const createdDate = new Date(connection.createdAt).toLocaleString();
    const updatedDate = new Date(connection.updatedAt).toLocaleString();

    // Build connection details
    let credentialsHtml = '';
    if (connection.credentials) {
        // Extract actual credentials (use decrypted if available, otherwise use the credentials object)
        let actualCredentials = connection.credentials;
        if (connection.credentials.decrypted) {
            actualCredentials = connection.credentials.decrypted;
        } else if (connection.credentials.encrypted) {
            // If only encrypted is available, show masked
            actualCredentials = {};
        }

        credentialsHtml = Object.entries(actualCredentials)
            .map(([key, value]) => {
                // Skip non-credential keys
                if (key === 'encrypted' || key === 'decrypted') return '';

                // Convert value to string if it's not
                let stringValue = typeof value === 'string' ? value : JSON.stringify(value);

                const displayValue = (key.toLowerCase().includes('secret') ||
                                    key.toLowerCase().includes('password') ||
                                    key.toLowerCase().includes('token'))
                    ? '••••••••••••'
                    : escapeHtml(stringValue);

                const isMasked = displayValue.indexOf('••') !== -1;

                return `
                    <div class="detail-item">
                        <span class="detail-label">${escapeHtml(formatLabel(key))}</span>
                        <span class="detail-value ${isMasked ? 'masked' : ''}">${displayValue}</span>
                    </div>
                `;
            })
            .filter(html => html !== '')
            .join('');
    }

    let variablesHtml = '';
    // Use configuredVariables if dynamicVariables is not present
    const variables = connection.dynamicVariables || connection.configuredVariables || {};
    if (Object.keys(variables).length > 0) {
        variablesHtml = Object.entries(variables)
            .map(([key, value]) => {
                // Convert value to string if it's not
                let stringValue = typeof value === 'string' ? value : JSON.stringify(value);
                return `
                    <div class="detail-item">
                        <span class="detail-label">${escapeHtml(formatLabel(key))}</span>
                        <span class="detail-value">${escapeHtml(stringValue)}</span>
                    </div>
                `;
            }).join('');
    }

    modalBody.innerHTML = `
        <div class="detail-section">
            <h3>Connection Information</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Status</span>
                    <span class="detail-value">
                        <span class="connection-status ${connection.status === 'active' && connection.isActive ? 'active' : 'inactive'}">
                            ${connection.status === 'active' && connection.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Auth Method</span>
                    <span class="detail-value">${escapeHtml(connection.authMethodLabel || connection.authMethodId)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Created</span>
                    <span class="detail-value">${createdDate}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Last Updated</span>
                    <span class="detail-value">${updatedDate}</span>
                </div>
            </div>
        </div>

        ${variablesHtml ? `
            <div class="detail-section">
                <h3>Variables</h3>
                <div class="detail-grid">
                    ${variablesHtml}
                </div>
            </div>
        ` : ''}

        ${credentialsHtml ? `
            <div class="detail-section">
                <h3>Credentials</h3>
                <div class="detail-grid">
                    ${credentialsHtml}
                </div>
            </div>
        ` : ''}

        <div id="testResultModal" style="display: none;"></div>
    `;

    modal.classList.add('show');
}

// Close modal
function closeModal() {
    const modal = document.getElementById('connectionModal');
    modal.classList.remove('show');
    selectedConnectionId = null;
}

// Test connection from card
async function testConnectionFromCard(connectionId) {
    selectedConnectionId = connectionId;
    await testConnection();
}

// Test connection
async function testConnection() {
    if (!selectedConnectionId) return;

    const testResultModal = document.getElementById('testResultModal');
    if (testResultModal) {
        testResultModal.style.display = 'block';
        testResultModal.className = 'test-result loading';
        testResultModal.textContent = 'Testing connection...';
    }

    try {
        const response = await fetch(`/api/user-integrations/${selectedConnectionId}/test`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (testResultModal) {
            if (data.success) {
                testResultModal.className = 'test-result success';
                testResultModal.textContent = `✓ Connection test successful! ${data.message || ''}`;
            } else {
                testResultModal.className = 'test-result error';
                testResultModal.textContent = `✗ Connection test failed: ${data.message || data.error || 'Unknown error'}`;
            }
        }

        showToast(
            data.success ? 'Connection test successful!' : 'Connection test failed',
            data.success ? 'success' : 'error'
        );

        // Reload connections to update lastTestedAt
        if (data.success) {
            setTimeout(() => loadConnections(), 1000);
        }

    } catch (error) {
        console.error('Error testing connection:', error);
        if (testResultModal) {
            testResultModal.className = 'test-result error';
            testResultModal.textContent = `✗ Error testing connection: ${error.message}`;
        }
        showToast('Failed to test connection', 'error');
    }
}

// Delete connection
async function deleteConnection() {
    if (!selectedConnectionId) return;

    if (!confirm('Are you sure you want to delete this connection? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`/api/user-integrations/${selectedConnectionId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            showToast('Connection deleted successfully', 'success');
            closeModal();
            await loadConnections();
        } else {
            showToast(data.error || 'Failed to delete connection', 'error');
        }

    } catch (error) {
        console.error('Error deleting connection:', error);
        showToast('Failed to delete connection', 'error');
    }
}

// Go to integrations page
function goToIntegrations() {
    if (selectedUserId) {
        window.location.href = `/user-integrations`;
    } else {
        showToast('Please select a user first', 'error');
    }
}

// Format label from camelCase/snake_case
function formatLabel(str) {
    return str
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/^./, (s) => s.toUpperCase())
        .trim();
}

// Edit connection - redirect to wizard in edit mode
function editConnection(connectionId) {
    // Redirect to connection wizard with edit mode and connection ID
    window.location.href = `/connect-integration?mode=edit&connectionId=${connectionId}`;
}

// Utility Functions

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

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    if (typeof text !== 'string') return text;
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

// Close modal when clicking outside
document.getElementById('connectionModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'connectionModal') {
        closeModal();
    }
});
