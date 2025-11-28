# My Connections Page - Documentation

**Last Updated:** 2025-11-23

---

## 🎯 Overview

The My Connections page is a centralized dashboard where users can view, manage, test, and delete all their integration connections. It provides a clean, professional interface with statistics, filters, and detailed connection information.

---

## 📁 Files

```
public/
├── my-connections.html         # Page HTML structure
├── css/
│   └── my-connections.css      # Page styles
└── js/
    └── my-connections.js       # Page logic
```

---

## ✨ Key Features

### 1. **User Selector**
- Dropdown to select which user's connections to view
- Only shows active users
- Persists selection in URL params

### 2. **Connection Statistics**
Three key metrics displayed as cards:
- **Active Connections:** Currently active connections count
- **Total Connections:** All connections (active + inactive)
- **Added This Week:** Connections created in last 7 days

### 3. **Filter Tabs**
- **All Connections:** Show everything
- **Active:** Only active connections
- **Inactive:** Only inactive connections

### 4. **Connection Cards**
Each card displays:
- Integration logo/icon (with emoji fallback)
- Connection name (custom or integration name)
- Integration name (if custom name used)
- Authentication method
- Connection date
- Last test date (if tested)
- Status badge (Active/Inactive)
- Quick actions (Test, Edit, View)

### 5. **Connection Details Modal**
Detailed view showing:
- Full connection information
- Dynamic variables configured
- Credentials (masked for security)
- Test connection button
- Delete connection button

### 6. **Connection Testing**
- Test connection directly from card or modal
- Visual feedback (loading, success, error)
- Updates last test date
- Shows error messages

### 7. **Connection Deletion**
- Delete with confirmation
- Removes from database
- Refreshes list automatically

---

## 🏗️ Architecture

### Data Flow

```
User selects user
    ↓
Load connections from API
    ↓
Calculate statistics
    ↓
Render connection cards
    ↓
User actions (filter, test, view, delete)
    ↓
Update UI / Make API call
    ↓
Refresh data if needed
```

---

## 💻 Implementation Details

### State Management

```javascript
let allConnections = [];         // All connections for selected user
let filteredConnections = [];    // Filtered by status
let selectedUserId = null;       // Currently selected user
let currentFilter = 'all';       // Current filter (all/active/inactive)
let selectedConnectionId = null; // Connection being viewed in modal
```

---

### Key Functions

#### 1. **Load Users**
```javascript
async function loadUsers() {
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
}
```

---

#### 2. **Load Connections**
```javascript
async function loadConnections() {
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');

    try {
        loadingState.style.display = 'flex';

        const response = await fetch(
            `/api/user-integrations/my-connections?userId=${selectedUserId}`
        );
        const data = await response.json();

        allConnections = data.connections || [];
        loadingState.style.display = 'none';

        if (allConnections.length === 0) {
            emptyState.style.display = 'block';
        } else {
            emptyState.style.display = 'none';
            updateStats();
            filterByStatus(currentFilter);
        }
    } catch (error) {
        console.error('Error loading connections:', error);
        showToast('Failed to load connections', 'error');
    }
}
```

---

#### 3. **Calculate Statistics**
```javascript
function updateStats() {
    // Active connections
    const activeConnections = allConnections.filter(
        c => c.status === 'active' && c.isActive
    );

    // Recent connections (last 7 days)
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
```

---

#### 4. **Filter Connections**
```javascript
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
        filteredConnections = allConnections.filter(
            c => c.status === 'active' && c.isActive
        );
    } else if (status === 'inactive') {
        filteredConnections = allConnections.filter(
            c => c.status === 'inactive' || !c.isActive
        );
    }

    renderConnections();
}
```

---

#### 5. **Render Connections**
```javascript
async function renderConnections() {
    // Load integration details for all connections
    const connectionsWithDetails = await Promise.all(
        filteredConnections.map(async (connection) => {
            try {
                const response = await fetch(
                    `/api/integrations/${connection.integrationId}`
                );
                const integration = await response.json();
                return { ...connection, integration };
            } catch (error) {
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

    // Render cards
    connectionsList.innerHTML = connectionsWithDetails.map(connection => {
        const isActive = connection.status === 'active' && connection.isActive;
        const integrationName = connection.integration?.displayName ||
                               connection.integrationId;
        const displayName = connection.connectionName || integrationName;

        // Get icon
        const iconUrl = connection.integration?.iconUrl;
        const category = connection.integration?.category || 'other';
        const iconHtml = iconUrl ?
            `<img src="${escapeHtml(iconUrl)}" alt="${escapeHtml(integrationName)}">` :
            getDefaultIcon(category);

        return `
            <div class="connection-card" data-connection-id="${connection.connectionId}">
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
                        <svg><!-- Clock icon --></svg>
                        <span>Connected ${createdDate}</span>
                    </div>
                    ${connection.lastTestDate ? `
                        <div class="connection-detail">
                            <svg><!-- Check icon --></svg>
                            <span>Last tested ${lastTestDate}</span>
                        </div>
                    ` : ''}
                </div>

                <div class="connection-actions">
                    <button data-action="test" data-connection-id="${connection.connectionId}">
                        Test
                    </button>
                    <button data-action="edit" data-connection-id="${connection.connectionId}">
                        Edit
                    </button>
                    <button data-action="view" data-connection-id="${connection.connectionId}">
                        View
                    </button>
                </div>
            </div>
        `;
    }).join('');
}
```

---

#### 6. **Event Delegation Pattern**
```javascript
function setupConnectionEventListeners() {
    const connectionsList = document.getElementById('connectionsList');

    // Event delegation for all clicks
    connectionsList.addEventListener('click', (e) => {
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
```

**Why Event Delegation?**
- Better performance (one listener instead of many)
- Works with dynamically added elements
- Easier to maintain

---

#### 7. **View Connection Details**
```javascript
function viewConnection(connection) {
    selectedConnectionId = connection.connectionId;

    const modal = document.getElementById('connectionModal');
    const integrationName = connection.integration?.displayName ||
                           connection.integrationId;
    const displayName = connection.connectionName || integrationName;

    // Get icon for modal title
    const iconUrl = connection.integration?.iconUrl;
    const category = connection.integration?.category || 'other';
    const iconHtml = iconUrl ?
        `<img src="${iconUrl}" style="width: 24px; height: 24px;">` :
        `<span style="font-size: 20px;">${getDefaultIcon(category)}</span>`;

    modalTitle.innerHTML = `${iconHtml}${escapeHtml(displayName)} Connection`;

    // Build credentials HTML (with masking)
    let credentialsHtml = '';
    if (connection.credentials) {
        let actualCredentials = connection.credentials;
        if (connection.credentials.decrypted) {
            actualCredentials = connection.credentials.decrypted;
        }

        credentialsHtml = Object.entries(actualCredentials)
            .filter(([key]) => key !== 'encrypted' && key !== 'decrypted')
            .map(([key, value]) => {
                let stringValue = typeof value === 'string' ?
                                 value : JSON.stringify(value);

                const displayValue = (
                    key.toLowerCase().includes('secret') ||
                    key.toLowerCase().includes('password') ||
                    key.toLowerCase().includes('token')
                ) ? '••••••••••••' : escapeHtml(stringValue);

                const isMasked = displayValue.indexOf('••') !== -1;

                return `
                    <div class="detail-item">
                        <span class="detail-label">${escapeHtml(formatLabel(key))}</span>
                        <span class="detail-value ${isMasked ? 'masked' : ''}">
                            ${displayValue}
                        </span>
                    </div>
                `;
            })
            .join('');
    }

    // Build variables HTML
    const variables = connection.dynamicVariables ||
                     connection.configuredVariables || {};
    let variablesHtml = Object.entries(variables)
        .map(([key, value]) => {
            let stringValue = typeof value === 'string' ?
                             value : JSON.stringify(value);
            return `
                <div class="detail-item">
                    <span class="detail-label">${escapeHtml(formatLabel(key))}</span>
                    <span class="detail-value">${escapeHtml(stringValue)}</span>
                </div>
            `;
        })
        .join('');

    // Display modal body
    modalBody.innerHTML = `
        <div class="detail-section">
            <h3>Connection Information</h3>
            <div class="detail-grid">
                <!-- Status, Auth Method, Dates -->
            </div>
        </div>

        ${variablesHtml ? `
            <div class="detail-section">
                <h3>Variables</h3>
                <div class="detail-grid">${variablesHtml}</div>
            </div>
        ` : ''}

        ${credentialsHtml ? `
            <div class="detail-section">
                <h3>Credentials</h3>
                <div class="detail-grid">${credentialsHtml}</div>
            </div>
        ` : ''}

        <div id="testResultModal" style="display: none;"></div>
    `;

    modal.classList.add('show');
}
```

---

#### 8. **Test Connection**
```javascript
async function testConnection() {
    if (!selectedConnectionId) return;

    const testResultModal = document.getElementById('testResultModal');
    testResultModal.style.display = 'block';
    testResultModal.className = 'test-result loading';
    testResultModal.textContent = 'Testing connection...';

    try {
        const response = await fetch(
            `/api/user-integrations/${selectedConnectionId}/test`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }
        );

        const data = await response.json();

        if (data.success) {
            testResultModal.className = 'test-result success';
            testResultModal.textContent = `✓ Connection test successful! ${data.message || ''}`;
            showToast('Connection test successful!', 'success');

            // Reload connections to update lastTestDate
            setTimeout(() => loadConnections(), 1000);
        } else {
            testResultModal.className = 'test-result error';
            testResultModal.textContent = `✗ Connection test failed: ${data.message || data.error}`;
            showToast('Connection test failed', 'error');
        }
    } catch (error) {
        testResultModal.className = 'test-result error';
        testResultModal.textContent = `✗ Error testing connection: ${error.message}`;
        showToast('Failed to test connection', 'error');
    }
}
```

---

#### 9. **Delete Connection**
```javascript
async function deleteConnection() {
    if (!selectedConnectionId) return;

    if (!confirm('Are you sure you want to delete this connection? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(
            `/api/user-integrations/${selectedConnectionId}`,
            { method: 'DELETE' }
        );

        const data = await response.json();

        if (data.success) {
            showToast('Connection deleted successfully', 'success');
            closeModal();
            await loadConnections();
        } else {
            showToast(data.error || 'Failed to delete connection', 'error');
        }
    } catch (error) {
        showToast('Failed to delete connection', 'error');
    }
}
```

---

#### 10. **Edit Connection**
```javascript
function editConnection(connectionId) {
    // Redirect to connection wizard with edit mode and connection ID
    window.location.href = `/connect-integration.html?mode=edit&connectionId=${connectionId}`;
}
```

**How it Works:**
1. User clicks **Edit** button on connection card
2. Redirects to Connection Wizard page with special URL parameters:
   - `mode=edit` - Tells wizard to enter edit mode
   - `connectionId=conn_123` - ID of connection to edit
3. Wizard loads existing connection data
4. User can modify any fields (auth method, variables, credentials, name)
5. On save, wizard sends PUT request instead of POST

**Integration with Wizard:**
- Wizard detects edit mode via URL parameters
- Loads existing connection using GET `/api/user-integrations/:connectionId`
- Pre-fills all form fields with existing data
- Changes "Save Connection" button to "Update Connection"
- Sends PUT request to `/api/user-integrations/:connectionId` on submit

**Security:**
- Password fields are never pre-filled (security best practice)
- Empty password fields preserve existing passwords
- Only updates password when user explicitly enters new value

**Use Cases:**
- Rotating expired API keys or tokens
- Switching from sandbox to production credentials
- Updating instance URLs or domains
- Renaming connections for better organization
- Changing authentication methods

---

## 🎨 Styling

### Key CSS Features

#### 1. **Connection Cards**
```css
.connection-card {
    background: white;
    border-radius: 12px;
    border: 1px solid var(--gray-200);
    padding: 24px;
    transition: all 0.2s;
    cursor: pointer;
}

.connection-card:hover {
    border-color: var(--primary-500);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    transform: translateY(-2px);
}
```

#### 2. **Integration Icons**
```css
.connection-icon {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    background: var(--gray-50);
    border: 1px solid var(--gray-200);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    flex-shrink: 0;
}

.connection-icon img {
    width: 40px;
    height: 40px;
    object-fit: contain;
    border-radius: 8px;
}
```

#### 3. **Status Badges**
```css
.connection-status.active {
    background: rgba(16, 185, 129, 0.1);
    color: var(--success-600);
}

.connection-status.inactive {
    background: rgba(239, 68, 68, 0.1);
    color: var(--error-600);
}
```

#### 4. **Modal**
```css
.modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1000;
    display: none;
}

.modal.show {
    display: flex;
    align-items: center;
    justify-content: center;
}

.modal-content {
    background: white;
    border-radius: 16px;
    max-width: 600px;
    width: 100%;
    max-height: 90vh;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}
```

---

## 🔧 Helper Functions

### Get Default Icon
```javascript
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
```

### Format Label
```javascript
function formatLabel(str) {
    return str
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/^./, (s) => s.toUpperCase())
        .trim();
}
```

---

## 🔗 URL Integration

### Support for Deep Links
```javascript
function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    const connectionId = urlParams.get('connectionId');

    if (userId) {
        const userSelect = document.getElementById('userSelect');
        userSelect.value = userId;
        handleUserChange();

        // If connectionId specified, open that connection
        if (connectionId) {
            setTimeout(() => {
                const connection = allConnections.find(
                    c => c.connectionId === connectionId
                );
                if (connection) {
                    viewConnection(connection);
                }
            }, 500);
        }
    }
}
```

**Usage:**
- `/my-connections.html?userId=user_123` - Opens with user selected
- `/my-connections.html?userId=user_123&connectionId=conn_456` - Opens connection modal

---

## 🎯 Performance Optimizations

1. **Event Delegation:** Single listener for all cards
2. **Lazy Loading:** Load integration details on demand
3. **Debouncing:** Debounce filter changes
4. **Caching:** Cache loaded connections
5. **Virtual Scrolling:** (Future) For large connection lists

---

## 🐛 Troubleshooting

### Issue: Connections Not Loading
**Symptoms:**
- Empty state shown even with connections
- Loading state stuck

**Solutions:**
1. Check API endpoint: `/api/user-integrations/my-connections?userId=xxx`
2. Verify user has connections in database
3. Check browser console for errors
4. Verify Elasticsearch is running

### Issue: Icons Not Showing
**Symptoms:**
- Broken image icons
- No fallback emoji

**Solutions:**
1. Check `integration.iconUrl` is valid
2. Verify `getDefaultIcon()` function exists
3. Check category mapping in `getDefaultIcon()`
4. Use browser inspector to check image load errors

### Issue: Test Connection Fails
**Symptoms:**
- Always shows error
- No response

**Solutions:**
1. Check endpoint: `/api/user-integrations/:id/test`
2. Verify connection exists in database
3. Check credentials are valid
4. Review server logs for errors

---

## 📊 Analytics Tracking

**Key Events to Track:**
- Connection viewed
- Connection tested (success/failure)
- Connection deleted
- Filter changed
- User selected

```javascript
// Example tracking
function trackEvent(eventName, properties) {
    if (window.analytics) {
        window.analytics.track(eventName, properties);
    }
}

// Usage
trackEvent('Connection Tested', {
    connectionId: selectedConnectionId,
    success: testResult.success
});
```

---

## 🔒 Security Considerations

1. **Credential Masking:** Always mask sensitive fields in UI
2. **Authorization:** Verify user can access connections
3. **Input Sanitization:** Escape all user-generated content
4. **XSS Prevention:** Use `escapeHtml()` for all dynamic content
5. **CSRF Protection:** Use CSRF tokens for destructive actions

---

## 🎯 Testing Checklist

- [ ] User selector loads active users
- [ ] Connections load for selected user
- [ ] Statistics calculate correctly
- [ ] Filter tabs work (all/active/inactive)
- [ ] Connection cards render properly
- [ ] Icons display correctly (image + fallback)
- [ ] Status badges show correct state
- [ ] Click on card opens modal
- [ ] Test button works
- [ ] Edit button redirects to wizard with correct URL parameters
- [ ] Edit mode pre-fills all existing data in wizard
- [ ] Edit mode allows updating all connection fields
- [ ] Delete button works with confirmation
- [ ] Modal closes properly
- [ ] Empty state shows when no connections
- [ ] Loading state shows during fetch
- [ ] Toast notifications appear
- [ ] URL params work correctly
- [ ] Responsive design works

---

## 📚 Related Documentation

- [User Connection Management](./USER-CONNECTION-MANAGEMENT.md)
- [Connection Wizard](./CONNECTION-WIZARD.md)
- [API Endpoints](./API-ENDPOINTS.md)
