// Integration Detail Page JavaScript

const API_BASE = 'http://localhost:3000/api';

// State
let integrationId = null;
let integrationData = null;
let authData = null;
let rateLimitsData = null;
let panelConfig = null;
let customHandlersConfig = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Get integration ID from URL path
    // URL format: /integration-detail/salesforce
    const pathParts = window.location.pathname.split('/');
    integrationId = pathParts[pathParts.length - 1];

    if (!integrationId || integrationId === 'integration-detail') {
        showError('Integration ID not provided');
        setTimeout(() => window.location.href = '/integrations', 2000);
        return;
    }

    // Load panel config and custom handlers first
    await loadPanelConfig();
    await loadCustomHandlers();

    // Load all integration data
    await loadIntegrationData();

    // Setup event listeners
    setupEventListeners();
});

// Load panel config
async function loadPanelConfig() {
    try {
        const response = await fetch('/panel-config.json');
        panelConfig = await response.json();
    } catch (error) {
        console.error('Error loading panel config:', error);
    }
}

// Load custom handlers config
async function loadCustomHandlers() {
    try {
        const response = await fetch('/api/panel-config/custom-handlers');
        if (response.ok) {
            customHandlersConfig = await response.json();
        } else {
            console.error('Failed to load custom handlers config');
            customHandlersConfig = {};
        }
    } catch (error) {
        console.error('Error loading custom handlers:', error);
        customHandlersConfig = {};
    }
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load all integration data
async function loadIntegrationData() {
    try {
        // Load basic info
        const response = await fetch(`${API_BASE}/integrations`);
        const data = await response.json();
        integrationData = data.integrations.find(i => i.id === integrationId);

        if (!integrationData) {
            showError('Integration not found');
            setTimeout(() => window.location.href = '/integrations', 2000);
            return;
        }

        // Load auth schema
        try {
            const authResponse = await fetch(`${API_BASE}/integrations/${integrationId}/auth`);
            authData = await authResponse.json();
        } catch (e) {
            console.error('Error loading auth data:', e);
            authData = { authMethods: [] };
        }

        // Load rate limits
        try {
            const rateLimitsResponse = await fetch(`${API_BASE}/integrations/${integrationId}/ratelimits`);
            rateLimitsData = await rateLimitsResponse.json();
        } catch (e) {
            console.error('Error loading rate limits:', e);
            rateLimitsData = { endpointLimits: [], retryStrategy: {} };
        }

        // Render all sections
        renderHeader();
        renderBasicInfo();
        renderAuthMethods();
        renderRateLimits();

        // Hide loading, show content
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';

    } catch (error) {
        console.error('Error loading integration:', error);
        showError('Failed to load integration data');
    }
}

// Render header section
function renderHeader() {
    // Update page title
    document.title = `${integrationData.displayName} - Integration Platform`;
    document.getElementById('breadcrumbName').textContent = integrationData.displayName;

    // Icon
    const iconContainer = document.getElementById('integrationIcon');
    if (integrationData.iconUrl) {
        // Remove gradient background when image is present
        iconContainer.style.background = 'transparent';
        iconContainer.style.boxShadow = 'none';
        iconContainer.innerHTML = `<img src="${integrationData.iconUrl}" alt="${integrationData.displayName}"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'; this.parentElement.style.background='linear-gradient(135deg, var(--primary-500), var(--primary-700))'; this.parentElement.style.boxShadow='0 8px 24px rgba(59, 130, 246, 0.3), 0 2px 8px rgba(59, 130, 246, 0.2)';"
            style="width: 100%; height: 100%; object-fit: contain;">
            <span style="display: none; color: white; font-size: 32px; font-weight: 700;">${integrationData.displayName.charAt(0)}</span>`;
    } else {
        iconContainer.textContent = integrationData.displayName.charAt(0);
    }

    // Title and description
    document.getElementById('integrationTitle').textContent = integrationData.displayName;
    document.getElementById('integrationDescription').textContent = integrationData.description || 'No description provided';

    // Meta info
    document.getElementById('integrationCategory').textContent = integrationData.category || 'N/A';
    document.getElementById('integrationVersion').textContent = `v${integrationData.version || '1.0.0'}`;
    document.getElementById('integrationStatus').innerHTML = getStatusBadge(integrationData.status);
}

// Get status badge with colors
function getStatusBadge(status) {
    const statusOptions = panelConfig?.basicInfo?.status?.options || [];
    const statusConfig = statusOptions.find(opt => opt.value === status);

    if (!statusConfig) {
        return `<span class="integration-status" style="color: #6b7280; background-color: #f3f4f6;">
            <span class="integration-status-dot"></span>
            ${status}
        </span>`;
    }

    return `<span class="integration-status" style="color: ${statusConfig.color}; background-color: ${statusConfig.bgColor};">
        <span class="integration-status-dot" style="background-color: ${statusConfig.color};"></span>
        ${statusConfig.label}
    </span>`;
}

// Render basic info tab
function renderBasicInfo() {
    document.getElementById('infoId').textContent = integrationData.id || '-';
    document.getElementById('infoDisplayName').textContent = integrationData.displayName || '-';
    document.getElementById('infoCategory').textContent = integrationData.category || '-';
    document.getElementById('infoVersion').textContent = integrationData.version || '-';
    document.getElementById('infoStatus').innerHTML = getStatusBadge(integrationData.status);

    // Icon URL
    const iconUrlEl = document.getElementById('infoIconUrl');
    if (integrationData.iconUrl) {
        iconUrlEl.innerHTML = `<a href="${integrationData.iconUrl}" target="_blank" class="info-link">${integrationData.iconUrl}</a>`;
    } else {
        iconUrlEl.textContent = 'Not set';
    }

    // Docs URL
    const docsUrlEl = document.getElementById('infoDocsUrl');
    if (integrationData.docsUrl) {
        docsUrlEl.innerHTML = `<a href="${integrationData.docsUrl}" target="_blank" class="info-link">${integrationData.docsUrl}</a>`;
    } else {
        docsUrlEl.textContent = 'Not set';
    }

    document.getElementById('infoCreatedAt').textContent = formatDate(integrationData.createdAt);
    document.getElementById('infoUpdatedAt').textContent = formatDate(integrationData.updatedAt);
    document.getElementById('infoDescription').textContent = integrationData.description || 'No description provided';
}

// Render authentication methods
function renderAuthMethods() {
    const container = document.getElementById('authMethods');

    if (!authData.authMethods || authData.authMethods.length === 0) {
        container.innerHTML = '<div class="empty-state">No authentication methods configured</div>';
        return;
    }

    const html = authData.authMethods.map((method, index) => `
        <div class="auth-method-card">
            <div class="card-header">
                <div class="card-header-left">
                    <div class="auth-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
                            <rect x="5" y="11" width="14" height="10" rx="2" ry="2"/>
                            <circle cx="12" cy="16" r="1"/>
                            <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
                        </svg>
                    </div>
                    <div>
                        <h3 class="card-title">${method.label || method.type}</h3>
                        <span class="auth-type-label">${method.authType || method.type}</span>
                    </div>
                </div>
                <span class="badge ${method.isDefault ? 'badge-primary' : 'badge-secondary'}">
                    ${method.isDefault ? 'Default' : `Priority ${method.priority || index + 1}`}
                </span>
            </div>
            <div class="card-body">
                <div class="config-grid">
                    ${renderAuthConfigCompact(method.config || {}, method.authType)}
                </div>
                ${method.additionalFields && method.additionalFields.length > 0 ? renderAdditionalFields(method.additionalFields) : ''}
            </div>
        </div>
    `).join('');

    container.innerHTML = html;
}

// Render auth config compact
function renderAuthConfigCompact(config, authType) {
    const keys = Object.keys(config);
    if (keys.length === 0) {
        return '<div class="config-empty">No configuration required</div>';
    }

    return keys.map(key => {
        let value = config[key];
        if (typeof value === 'boolean') {
            value = value ? 'Yes' : 'No';
        } else if (Array.isArray(value)) {
            value = value.join(', ');
        } else if (typeof value === 'object') {
            value = JSON.stringify(value);
        }

        return `
            <div class="config-item">
                <span class="config-label">${formatLabel(key)}</span>
                <span class="config-value">${value || '-'}</span>
            </div>
        `;
    }).join('');
}

// Render auth config (old method for backward compatibility)
function renderAuthConfig(config) {
    const keys = Object.keys(config);
    if (keys.length === 0) return '';

    return keys.map(key => {
        let value = config[key];
        if (Array.isArray(value)) {
            value = value.join(', ');
        } else if (typeof value === 'object') {
            value = JSON.stringify(value, null, 2);
        }

        return `
            <div class="info-row">
                <span class="info-label">${formatLabel(key)}</span>
                <span class="info-value">${value || '-'}</span>
            </div>
        `;
    }).join('');
}

// Render additional fields
function renderAdditionalFields(fields) {
    if (!fields || fields.length === 0) return '';

    const fieldsHtml = fields.map((field, index) => `
        <div class="additional-field-card">
            <div class="field-card-header">
                <span class="field-number">#${index + 1}</span>
                <h5 class="field-card-title">${field.label || field.name}</h5>
            </div>
            <div class="field-card-body">
                <div class="field-detail-row">
                    <span class="field-detail-label">Field Name:</span>
                    <code class="field-detail-value">${field.name || '-'}</code>
                </div>
                <div class="field-detail-row">
                    <span class="field-detail-label">Type:</span>
                    <span class="field-detail-value">${field.type || 'string'}</span>
                </div>
                <div class="field-detail-row">
                    <span class="field-detail-label">Required:</span>
                    <span class="field-detail-value ${field.required ? 'text-error' : 'text-muted'}">${field.required ? 'Yes' : 'No'}</span>
                </div>
                ${field.placeholder ? `
                    <div class="field-detail-row">
                        <span class="field-detail-label">Placeholder:</span>
                        <span class="field-detail-value">${field.placeholder}</span>
                    </div>
                ` : ''}
                ${field.helpText ? `
                    <div class="field-detail-row">
                        <span class="field-detail-label">Help Text:</span>
                        <span class="field-detail-value">${field.helpText}</span>
                    </div>
                ` : ''}
                ${field.default ? `
                    <div class="field-detail-row">
                        <span class="field-detail-label">Default Value:</span>
                        <code class="field-detail-value">${field.default}</code>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');

    return `
        <div class="additional-fields-section">
            <h4 class="subsection-title">Additional Fields</h4>
            <div class="additional-fields-grid">
                ${fieldsHtml}
            </div>
        </div>
    `;
}

// Render rate limits
function renderRateLimits() {
    const container = document.getElementById('rateLimitsContent');

    let html = '';

    // Endpoint limits
    if (rateLimitsData.endpointLimits && rateLimitsData.endpointLimits.length > 0) {
        html += `
            <div class="ratelimit-section">
                <h3 class="section-title">Endpoint Rate Limits</h3>
                <div class="ratelimit-grid">
                    ${rateLimitsData.endpointLimits.map(limit => `
                        <div class="ratelimit-card">
                            <div class="ratelimit-path">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                                </svg>
                                <code>${limit.path || '/*'}</code>
                            </div>
                            <div class="ratelimit-stats">
                                <div class="stat-item">
                                    <span class="stat-label">Per Minute</span>
                                    <span class="stat-value">${limit.requestsPerMinute || 0}</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Per Hour</span>
                                    <span class="stat-value">${limit.requestsPerHour || 0}</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Per Day</span>
                                    <span class="stat-value">${limit.requestsPerDay || 0}</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Concurrent</span>
                                    <span class="stat-value">${limit.concurrentRequests || 0}</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Retry strategy
    if (rateLimitsData.retryStrategy) {
        html += `
            <div class="ratelimit-section" style="margin-top: 24px;">
                <h3 class="section-title">Retry Strategy</h3>
                <div class="info-card">
                    <div class="info-row">
                        <span class="info-label">Max Retries</span>
                        <span class="info-value">${rateLimitsData.retryStrategy.maxRetries || 0}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Backoff Multiplier</span>
                        <span class="info-value">${rateLimitsData.retryStrategy.backoffMultiplier || 1}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Initial Delay</span>
                        <span class="info-value">${rateLimitsData.retryStrategy.initialDelay || 0}ms</span>
                    </div>
                </div>
            </div>
        `;
    }

    if (!html) {
        html = '<div class="empty-state">No rate limits configured</div>';
    }

    container.innerHTML = html;
}

// Load feature mappings
async function loadFeatureMappings() {
    const tabsContainer = document.getElementById('featureFolderTabs');
    const emptyState = document.getElementById('mappingsEmptyState');
    const contentContainer = document.getElementById('featureMappingTabsContainer');
    const countEl = document.getElementById('mappingsCount');

    try {
        // Show loading state
        tabsContainer.innerHTML = '<div class="loading-spinner" style="text-align: center; padding: 40px;"><div class="spinner"></div></div>';
        emptyState.style.display = 'none';
        contentContainer.style.display = 'none';

        // Fetch feature mappings
        const response = await fetch(`${API_BASE}/integrations/${integrationId}/feature-mappings`);

        if (!response.ok) {
            throw new Error('Failed to load feature mappings');
        }

        const data = await response.json();
        const mappings = data.featureMappings || [];

        // Update count
        countEl.textContent = mappings.length;

        if (mappings.length === 0) {
            tabsContainer.innerHTML = '';
            emptyState.style.display = 'block';
            contentContainer.style.display = 'none';
            return;
        }

        // Render mappings
        renderFeatureMappings(mappings);
        emptyState.style.display = 'none';

    } catch (error) {
        console.error('Error loading feature mappings:', error);
        tabsContainer.innerHTML = `
            <div class="empty-state" style="color: #e53e3e;">
                <p>Failed to load feature mappings</p>
                <button onclick="loadFeatureMappings()" class="btn btn-secondary" style="margin-top: 10px;">Retry</button>
            </div>
        `;
        emptyState.style.display = 'none';
        contentContainer.style.display = 'none';
    }
}

// Store all mappings globally for selection
let allMappings = [];
let selectedMappingId = null;

/**
 * Render handler table headers dynamically
 * @returns {string} HTML string for handler header cells
 */
function renderHandlerHeaders() {
    if (!customHandlersConfig) {
        return '';
    }

    const sortedHandlers = Object.entries(customHandlersConfig)
        .sort(([, a], [, b]) => a.order - b.order);

    let headers = '';
    sortedHandlers.forEach(([key, config]) => {
        headers += `<th class="handler-col">${config.label.toUpperCase()}</th>`;
    });

    return headers;
}

/**
 * Populate table header with dynamic handler columns
 * @param {string} headerId - ID of the thead element
 */
function populateTableHeader(headerId) {
    const thead = document.getElementById(headerId);
    if (!thead) return;

    thead.innerHTML = `
        <tr>
            <th class="field-detail-col">FIELD DETAILS</th>
            ${renderHandlerHeaders()}
            <th class="value-col">VALUE</th>
        </tr>
    `;
}

/**
 * Render handler cells for table display
 * @param {object} handlers - Handler object with handler values
 * @returns {string} HTML string for handler cells
 */
function renderHandlerCells(handlers) {
    if (!handlers || !customHandlersConfig) {
        return '';
    }

    const sortedHandlers = Object.entries(customHandlersConfig)
        .sort(([, a], [, b]) => a.order - b.order);

    let cells = '';
    sortedHandlers.forEach(([key, config]) => {
        const handlerValue = handlers[key];
        cells += `
            <td class="handler-cell">
                ${handlerValue ? `
                    <div class="handler-item">
                        <span class="handler-icon" title="${config.description}">${config.icon}</span>
                        <span class="handler-name">${escapeHtml(handlerValue)}</span>
                    </div>
                ` : '<span class="empty-cell">-</span>'}
            </td>
        `;
    });

    return cells;
}

// Render feature mappings (MODERN PILL TABS)
function renderFeatureMappings(mappings) {
    allMappings = mappings;
    const tabsContainer = document.getElementById('featureFolderTabs');
    const contentContainer = document.getElementById('featureMappingTabsContainer');

    // Create feature pill tabs
    const tabsHTML = mappings.map((mapping, index) => {
        const isActive = index === 0 ? 'active' : '';
        return `
            <button class="feature-pill ${isActive}" data-mapping-id="${mapping.id}" onclick="selectFeatureTab('${mapping.id}')">
                ${mapping.featureTemplateName || 'Unnamed Feature'}
            </button>
        `;
    }).join('');

    tabsContainer.innerHTML = tabsHTML;
    contentContainer.style.display = 'block';

    // Auto-select first mapping
    if (mappings.length > 0) {
        selectFeatureTab(mappings[0].id);
    }
}

// Select a feature tab and render its content
function selectFeatureTab(mappingId) {
    // Update active tab
    const allTabs = document.querySelectorAll('.feature-pill');
    allTabs.forEach(tab => {
        if (tab.dataset.mappingId === mappingId) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // Find the selected mapping
    const mapping = allMappings.find(m => m.id === mappingId);
    if (!mapping) return;

    selectedMappingId = mappingId;

    // Render the 2-column content
    renderFeatureContent(mapping);
}

// Render feature content (2-column layout)
function renderFeatureContent(mapping) {
    // Render feature-level handlers (if any)
    renderFeatureLevelHandlers(mapping);

    // Render template fields
    renderTemplateFields(mapping);

    // Render extra fields
    renderExtraFields(mapping);

    // Render API config in right column
    renderApiConfigPanel(mapping);
}

// Function renderFieldMappingsTab removed - replaced by renderFeatureContent()

// Render feature-level custom handlers
function renderFeatureLevelHandlers(mapping) {
    // Check if feature has custom handlers
    const handlers = mapping.customHandlers_for_feature;

    // Find the fields column container (parent of all sections)
    const fieldsColumn = document.querySelector('.fields-column');

    if (!fieldsColumn) {
        return; // Can't find where to insert
    }

    // Get the first section-block (template fields section)
    const firstSection = fieldsColumn.querySelector('.section-block');

    // Remove any existing feature handlers display
    const existingHandlers = document.getElementById('featureLevelHandlersDisplay');
    if (existingHandlers) {
        existingHandlers.remove();
    }

    // If no handlers, don't display anything
    if (!handlers || Object.keys(handlers).length === 0) {
        return;
    }

    // Create handlers display element
    const handlersDiv = document.createElement('div');
    handlersDiv.id = 'featureLevelHandlersDisplay';
    handlersDiv.style.cssText = 'background: #e3f2fd; border-left: 4px solid #2196f3; padding: 16px; margin-bottom: 24px; border-radius: 4px;';

    let html = '<div style="display: flex; align-items: center; gap: 12px;">';
    html += '<span style="font-size: 24px;">🚀</span>';
    html += '<div style="flex: 1;">';
    html += '<h4 style="margin: 0 0 8px 0; color: #1976d2; font-size: 14px; font-weight: 600;">Feature-Level Custom Handlers</h4>';
    html += '<div style="display: flex; flex-wrap: wrap; gap: 12px;">';

    Object.entries(handlers).forEach(([handlerType, handlerName]) => {
        const displayName = handlerType.replace(/([A-Z])/g, ' $1').trim();
        const capitalizedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

        html += `<div style="background: white; padding: 8px 12px; border-radius: 4px; border: 1px solid #bbdefb;">`;
        html += `<span style="font-size: 12px; color: #64b5f6; font-weight: 500;">${capitalizedName}:</span> `;
        html += `<code style="font-size: 13px; color: #1565c0; font-weight: 600;">${handlerName}</code>`;
        html += `</div>`;
    });

    html += '</div></div></div>';

    handlersDiv.innerHTML = html;

    // Insert before the first section (template fields)
    if (firstSection) {
        fieldsColumn.insertBefore(handlersDiv, firstSection);
    } else {
        // If no section found, prepend to column
        fieldsColumn.prepend(handlersDiv);
    }
}

// Render template fields (borderless table with full details)
async function renderTemplateFields(mapping) {
    const tbody = document.getElementById('templateFieldsBody');
    const countEl = document.getElementById('templateFieldsCount');

    // Populate table header dynamically
    populateTableHeader('templateFieldsHeader');

    const fieldMappings = mapping.fieldMappings || {};
    // Filter out disabled fields
    const fields = Object.entries(fieldMappings).filter(([fieldKey, fieldMapping]) =>
        fieldMapping.enabled !== false
    );

    countEl.textContent = fields.length;

    if (fields.length === 0) {
        tbody.innerHTML = '<div style="text-align: center; padding: 40px; color: #94a3b8;">No template fields</div>';
        return;
    }

    // Fetch feature template to get field details
    let templateFields = {};
    try {
        const response = await fetch(`${API_BASE}/feature-templates/${mapping.featureTemplateId}`);
        const data = await response.json();
        if (data.success && data.feature && data.feature.fields) {
            templateFields = data.feature.fields;
        }
    } catch (error) {
        console.error('Error loading template fields:', error);
    }

    tbody.innerHTML = fields.map(([fieldKey, fieldMapping]) => {
        const handlers = fieldMapping.customHandlers || {};
        const adminValue = fieldMapping.adminValue || '-';
        const templateField = templateFields[fieldKey] || {};

        const displayValue = Array.isArray(adminValue) ? adminValue.join(', ') : adminValue;
        const description = templateField.description || templateField.label || 'No description available';

        const isApiType = templateField.type === 'api';

        return `
            <tr>
                <td class="field-detail-cell">
                    <div class="field-detail-content">
                        <div class="field-name-row">
                            <span class="field-name-text">${templateField.label}</span>
                            ${templateField.required ? '<span class="field-req-badge">REQ</span>' : ''}
                        </div>
                        <p class="field-description-text">${description}</p>
                        <div class="field-meta-grid">
                            <div class="field-meta-item">
                                
                                <span class="field-meta-value">${templateField.type || 'static'}</span>
                            </div>
                            <div class="field-meta-item">
                                
                                <span class="field-meta-value">${templateField.fieldType || 'string'}</span>
                            </div>
                        </div>
                    </div>
                </td>
                ${renderHandlerCells(handlers)}
                <td class="value-cell">
                    ${isApiType ? `
                        <button class="api-settings-btn" onclick="showApiSettings('${fieldKey}', 'template')">
                            
                            API Settings
                        </button>
                    ` : displayValue !== '-' ? `<span class="value-text">${displayValue}</span>` : '<span class="empty-cell">To be filled by user</span>'}
                </td>
            </tr>
        `;
    }).join('');
}

// Get badge class based on type
function getBadgeClass(type) {
    const typeMap = {
        'api': 'badge-api',
        'static': 'badge-static',
        'dynamic': 'badge-dynamic',
        'conditional': 'badge-conditional'
    };
    return typeMap[type] || 'badge-secondary';
}

// Render extra fields (borderless table with full details)
function renderExtraFields(mapping) {
    const tbody = document.getElementById('extraFieldsBody');
    const countEl = document.getElementById('extraFieldsCount');

    // Populate table header dynamically
    populateTableHeader('extraFieldsHeader');

    const extraFields = mapping.extraFields || [];

    countEl.textContent = extraFields.length;

    if (extraFields.length === 0) {
        tbody.innerHTML = '<div style="text-align: center; padding: 40px; color: #94a3b8;">No extra fields</div>';
        return;
    }

    tbody.innerHTML = extraFields.map(field => {
        const handlers = field.customHandlers || {};
        const adminValue = field.adminValue || '-';
        const displayValue = Array.isArray(adminValue) ? adminValue.join(', ') : adminValue;
        const description = field.description || field.label || 'No description available';

        const isApiType = field.type === 'api';

        return `
            <tr>
                <td class="field-detail-cell">
                    <div class="field-detail-content">
                        <div class="field-name-row">
                            <span class="field-name-text">${field.label}</span>
                            ${field.required ? '<span class="field-req-badge">REQ</span>' : ''}
                        </div>
                        <p class="field-description-text">${description}</p>
                        <div class="field-meta-grid">
                            <div class="field-meta-item">
                                
                                <span class="field-meta-value">${field.type || 'static'}</span>
                            </div>
                            <div class="field-meta-item">
                                
                                <span class="field-meta-value">${field.fieldType || 'string'}</span>
                            </div>
                        </div>
                    </div>
                </td>
                ${renderHandlerCells(handlers)}
                <td class="value-cell">
                    ${isApiType ? `
                        <button class="api-settings-btn" onclick="showApiSettings('${field.fieldKey}', 'extra')">
                            
                            API Settings
                        </button>
                    ` : displayValue !== '-' ? `<span class="value-text">${displayValue}</span>` : '<span class="empty-cell">To be filled by user</span>'}
                </td>
            </tr>
        `;
    }).join('');
}

// Render API config panel (right column)
function renderApiConfigPanel(mapping) {
    const container = document.getElementById('apiConfigContent');

    if (!mapping.apiConfig || !mapping.apiConfig.endpoint) {
        container.innerHTML = '<div class="api-config-empty">No API Configuration</div>';
        return;
    }

    const config = mapping.apiConfig;

    container.innerHTML = `
        <div class="api-config-row">
            <span class="api-config-label">Method</span>
            <div class="api-config-value"><code>${config.method || 'GET'}</code></div>
        </div>
        <div class="api-config-row">
            <span class="api-config-label">Endpoint</span>
            <div class="api-config-value"><code>${config.endpoint}</code></div>
        </div>
        ${config.apiConfigId ? `
            <div class="api-config-row">
                <span class="api-config-label">Config ID</span>
                <div class="api-config-value">${config.apiConfigId}</div>
            </div>
        ` : ''}
        <button class="btn btn-secondary" style="margin-top: 16px; width: 100%;">
            View Full API Settings
        </button>
    `;
}

// Helper functions (camelize and capitalizeFirst removed - no longer needed)

// Show API Settings for a field in the right panel
function showApiSettings(fieldKey, fieldType) {
    const container = document.getElementById('apiConfigContent');

    // Find the currently selected mapping
    const mapping = allMappings.find(m => m.id === selectedMappingId);
    if (!mapping) {
        console.error('No mapping selected');
        return;
    }

    let fieldData = null;
    let templateField = null;

    // Find the field data based on type (template or extra)
    if (fieldType === 'template') {
        // Get field from mapping's fieldMappings
        fieldData = mapping.fieldMappings?.[fieldKey];
        // We need to fetch template fields again to get the full field definition
        // For now, we'll show what we have from the mapping
    } else if (fieldType === 'extra') {
        // Get field from mapping's extraFields
        fieldData = mapping.extraFields?.find(f => f.fieldKey === fieldKey);
    }

    if (!fieldData) {
        container.innerHTML = '<div class="api-config-empty">Field not found</div>';
        return;
    }

    // Build the display based on field type
    let content = `
        <div class="api-field-detail-header">
            <h5 style="margin: 0 0 8px 0; color: #6366f1; font-size: 14px; font-weight: 600;">
                ${fieldKey}
            </h5>
            <span style="display: inline-block; padding: 2px 8px; background: #ddd6fe; color: #5b21b6; font-size: 11px; font-weight: 600; border-radius: 4px; text-transform: uppercase;">
                API Configuration Field
            </span>
        </div>
        <div style="margin-top: 20px;">
    `;

    // For extra fields, we have more data
    if (fieldType === 'extra' && fieldData.label) {
        content += `
            <div class="api-config-row">
                <span class="api-config-label">Label</span>
                <div class="api-config-value">${fieldData.label}</div>
            </div>
        `;

        if (fieldData.description) {
            content += `
                <div class="api-config-row">
                    <span class="api-config-label">Description</span>
                    <div class="api-config-value">${fieldData.description}</div>
                </div>
            `;
        }

        content += `
            <div class="api-config-row">
                <span class="api-config-label">Field Type</span>
                <div class="api-config-value"><code>${fieldData.fieldType || 'string'}</code></div>
            </div>
            <div class="api-config-row">
                <span class="api-config-label">HTML Type</span>
                <div class="api-config-value"><code>${fieldData.htmlType || 'text'}</code></div>
            </div>
            <div class="api-config-row">
                <span class="api-config-label">Required</span>
                <div class="api-config-value">${fieldData.required ? 'Yes' : 'No'}</div>
            </div>
            <div class="api-config-row">
                <span class="api-config-label">Fill By</span>
                <div class="api-config-value"><code>${fieldData.fillBy || 'User'}</code></div>
            </div>
        `;

        // Show possible values if they exist
        if (fieldData.possibleValues && fieldData.possibleValues.length > 0) {
            const valuesHTML = fieldData.possibleValues.map(v =>
                `<div style="padding: 4px 8px; background: #f1f5f9; border-radius: 4px; margin-bottom: 4px;">
                    <code>${v.id || v}</code>: ${v.label || v}
                </div>`
            ).join('');

            content += `
                <div class="api-config-row">
                    <span class="api-config-label">Possible Values</span>
                    <div class="api-config-value">${valuesHTML}</div>
                </div>
            `;
        }

        // Show custom handlers
        if (fieldData.customHandlers) {
            content += `<div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
                <div style="font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Custom Handlers</div>
            `;

            if (fieldData.customHandlers.valueHandler) {
                content += `
                    <div class="api-config-row">
                        <span class="api-config-label">Value Handler</span>
                        <div class="api-config-value"><code>${fieldData.customHandlers.valueHandler}</code></div>
                    </div>
                `;
            }

            if (fieldData.customHandlers.validationHandler) {
                content += `
                    <div class="api-config-row">
                        <span class="api-config-label">Validation Handler</span>
                        <div class="api-config-value"><code>${fieldData.customHandlers.validationHandler}</code></div>
                    </div>
                `;
            }

            if (fieldData.customHandlers.submitHandler) {
                content += `
                    <div class="api-config-row">
                        <span class="api-config-label">Submit Handler</span>
                        <div class="api-config-value"><code>${fieldData.customHandlers.submitHandler}</code></div>
                    </div>
                `;
            }

            content += `</div>`;
        }

        // Show admin value if exists
        if (fieldData.adminValue !== null && fieldData.adminValue !== undefined) {
            const displayValue = Array.isArray(fieldData.adminValue) ? fieldData.adminValue.join(', ') : fieldData.adminValue;
            content += `
                <div class="api-config-row">
                    <span class="api-config-label">Admin Value</span>
                    <div class="api-config-value"><code>${displayValue}</code></div>
                </div>
            `;
        }
    } else {
        // Template field - show what we have
        if (fieldData.customHandlers) {
            content += `<div style="margin-top: 16px;">
                <div style="font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Custom Handlers</div>
            `;

            if (fieldData.customHandlers.valueHandler) {
                content += `
                    <div class="api-config-row">
                        <span class="api-config-label">Value Handler</span>
                        <div class="api-config-value"><code>${fieldData.customHandlers.valueHandler}</code></div>
                    </div>
                `;
            }

            if (fieldData.customHandlers.validationHandler) {
                content += `
                    <div class="api-config-row">
                        <span class="api-config-label">Validation Handler</span>
                        <div class="api-config-value"><code>${fieldData.customHandlers.validationHandler}</code></div>
                    </div>
                `;
            }

            if (fieldData.customHandlers.submitHandler) {
                content += `
                    <div class="api-config-row">
                        <span class="api-config-label">Submit Handler</span>
                        <div class="api-config-value"><code>${fieldData.customHandlers.submitHandler}</code></div>
                    </div>
                `;
            }

            content += `</div>`;
        }

        if (fieldData.adminValue !== null && fieldData.adminValue !== undefined) {
            const displayValue = Array.isArray(fieldData.adminValue) ? fieldData.adminValue.join(', ') : fieldData.adminValue;
            content += `
                <div class="api-config-row">
                    <span class="api-config-label">Admin Value</span>
                    <div class="api-config-value"><code>${displayValue}</code></div>
                </div>
            `;
        }
    }

    content += `</div>`;

    container.innerHTML = content;

    // Scroll to the right panel smoothly
    const configColumn = document.querySelector('.config-column');
    if (configColumn) {
        configColumn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Edit selected mapping
function editSelectedMapping() {
    if (selectedMappingId) {
        window.location.href = `/feature-integration-mapping?integrationId=${integrationId}&mappingId=${selectedMappingId}`;
    }
}

// Delete selected mapping
async function deleteSelectedMapping() {
    if (!selectedMappingId) return;

    if (!confirm('Are you sure you want to delete this feature mapping?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/integrations/${integrationId}/feature-mappings/${selectedMappingId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete mapping');
        }

        // Show success message
        showToast('Feature mapping deleted successfully', 'success');

        // Reload mappings
        loadFeatureMappings();

    } catch (error) {
        console.error('Error deleting mapping:', error);
        showToast('Failed to delete feature mapping', 'error');
    }
}

// Delete mapping (kept for compatibility)
async function deleteMapping(mappingId) {
    if (!confirm('Are you sure you want to delete this feature mapping?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/integrations/${integrationId}/feature-mappings/${mappingId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete mapping');
        }

        // Show success message
        showToast('Feature mapping deleted successfully', 'success');

        // Reload mappings
        loadFeatureMappings();

    } catch (error) {
        console.error('Error deleting mapping:', error);
        showToast('Failed to delete feature mapping', 'error');
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    // Simple toast implementation
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#f56565' : '#4299e1'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-size: 14px;
        font-weight: 500;
        animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Setup event listeners
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            switchTab(tabName);
        });
    });

    // Edit button
    document.getElementById('editBtn').addEventListener('click', () => {
        window.location.href = `/add-integration?edit=${integrationId}`;
    });

    // Map New Feature button
    document.getElementById('mapNewFeatureBtn').addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = `/feature-integration-mapping?integrationId=${integrationId}`;
    });
}

// Switch tabs
function switchTab(tabName) {
    // Update buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });

    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    const tabMap = {
        'basic': 'basicTab',
        'auth': 'authTab',
        'ratelimits': 'rateLimitsTab',
        'feature-mappings': 'featureMappingsTab'
    };

    const contentId = tabMap[tabName];
    if (contentId) {
        document.getElementById(contentId).classList.add('active');
    }

    // Load feature mappings when tab is activated
    if (tabName === 'feature-mappings') {
        loadFeatureMappings();
    }
}

// Utility functions
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function formatLabel(key) {
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
}

function showError(message) {
    alert(message); // Simple alert for now, can be improved
}
