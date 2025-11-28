// Integrations Management JavaScript

const API_BASE = 'http://localhost:3000/api';

// State
let allIntegrations = [];
let authTypes = null;
let panelConfig = null;
let currentStep = 1;
let wizardData = {
    basicInfo: {},
    authSettings: { authMethods: [] },
    features: { features: [] },
    rateLimits: {
        global: {
            requestsPerMinute: 100,
            requestsPerHour: 5000,
            requestsPerDay: 100000,
            concurrentRequests: 10
        },
        endpoints: {},
        retryStrategy: {
            maxRetries: 3,
            backoffMultiplier: 2,
            initialDelay: 1000
        }
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([
        loadPanelConfig(),
        loadAuthTypes()
    ]);
    loadIntegrations();
    initEventListeners();
});

// Load integrations from API
async function loadIntegrations() {
    try {
        const response = await fetch(`${API_BASE}/integrations`);
        const data = await response.json();
        allIntegrations = data.integrations || [];

        renderIntegrations();
        updateIntegrationCount();
    } catch (error) {
        console.error('Error loading integrations:', error);
        showError('Failed to load integrations');
    }
}

// Load auth types
async function loadAuthTypes() {
    try {
        const response = await fetch(`${API_BASE}/auth-types`);
        authTypes = await response.json();
    } catch (error) {
        console.error('Error loading auth types:', error);
    }
}

// Load panel config
async function loadPanelConfig() {
    try {
        const response = await fetch('/panel-config.json');
        panelConfig = await response.json();
    } catch (error) {
        console.error('Error loading panel config:', error);
    }
}

// Get status badge HTML with colors from panel config
function getStatusBadge(status) {
    // Find status config from basicInfo.status.options
    const statusOptions = panelConfig?.basicInfo?.status?.options || [];
    const statusConfig = statusOptions.find(opt => opt.value === status);

    if (!statusConfig) {
        // Fallback for unknown status
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

// Render integrations grid
function renderIntegrations(filter = 'all') {
    const grid = document.getElementById('integrationsGrid');
    const emptyState = document.getElementById('emptyState');

    let filteredIntegrations = allIntegrations;
    if (filter !== 'all') {
        filteredIntegrations = allIntegrations.filter(i => i.category === filter);
    }

    if (filteredIntegrations.length === 0) {
        grid.style.display = 'none';
        emptyState.style.display = 'flex';
        emptyState.style.flexDirection = 'column';
        emptyState.style.alignItems = 'center';
        return;
    }

    grid.style.display = 'grid';
    emptyState.style.display = 'none';

    grid.innerHTML = filteredIntegrations.map(integration => {
        const iconHtml = integration.iconUrl
            ? `<img src="${integration.iconUrl}" alt="${integration.displayName}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" style="width: 100%; height: 100%; object-fit: contain;">
               <span style="display: none;">${integration.displayName.charAt(0)}</span>`
            : integration.displayName.charAt(0);

        return `
        <div class="integration-card" data-id="${integration.id}">
            <div class="integration-card-header">
                <div class="integration-icon">
                    ${iconHtml}
                </div>
                <div class="integration-actions">
                    <button class="integration-action-btn" onclick="editIntegration('${integration.id}')" title="Edit">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button class="integration-action-btn" onclick="toggleStatus('${integration.id}', '${integration.status}')" title="Toggle Status">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                    </button>
                    <button class="integration-action-btn" onclick="deleteIntegration('${integration.id}')" title="Delete">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="integration-info">
                <h3 class="integration-name">${integration.displayName}</h3>
                <p class="integration-description">${integration.description || 'No description provided'}</p>
                <div class="integration-meta">
                    <span class="integration-category">${integration.category}</span>
                    ${getStatusBadge(integration.status)}
                </div>
            </div>
        </div>
    `;
    }).join('');

    // Attach click handlers to make cards clickable
    attachCardClickHandlers();
}

// Update integration count badge
function updateIntegrationCount() {
    const badge = document.getElementById('integrationCount');
    if (badge) {
        badge.textContent = allIntegrations.length;
    }
}

// Initialize event listeners
function initEventListeners() {
    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            renderIntegrations(e.target.dataset.filter);
        });
    });

    // Search
    document.getElementById('searchInput').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        if (searchTerm) {
            const filtered = allIntegrations.filter(i =>
                i.displayName.toLowerCase().includes(searchTerm) ||
                i.description.toLowerCase().includes(searchTerm) ||
                i.category.toLowerCase().includes(searchTerm)
            );
            renderFilteredIntegrations(filtered);
        } else {
            renderIntegrations();
        }
    });
}

// Attach card click handlers after rendering
function attachCardClickHandlers() {
    document.querySelectorAll('.integration-card').forEach(card => {
        card.addEventListener('click', function(e) {
            // Don't navigate if clicking on action buttons
            if (e.target.closest('.integration-action-btn') || e.target.closest('.integration-actions')) {
                return;
            }

            const integrationId = this.dataset.id;
            window.location.href = `/integration-detail/${integrationId}`;
        });

        // Add pointer cursor to indicate clickability
        card.style.cursor = 'pointer';
    });
}

// Open wizard modal
function openWizard() {
    currentStep = 1;
    wizardData = {
        basicInfo: {},
        authSettings: { authMethods: [] },
        features: { features: [] },
        rateLimits: {
            global: {
                requestsPerMinute: 100,
                requestsPerHour: 5000,
                requestsPerDay: 100000,
                concurrentRequests: 10
            },
            endpoints: {},
            retryStrategy: {
                maxRetries: 3,
                backoffMultiplier: 2,
                initialDelay: 1000
            }
        }
    };

    document.getElementById('wizardModal').classList.add('active');
    renderWizardStep(1);
    updateWizardProgress();
}

// Close wizard
function closeWizard() {
    document.getElementById('wizardModal').classList.remove('active');
}

// Next step
function nextStep() {
    if (validateStep(currentStep)) {
        if (currentStep < 5) {
            currentStep++;
            renderWizardStep(currentStep);
            updateWizardProgress();
        } else {
            submitIntegration();
        }
    }
}

// Previous step
function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        renderWizardStep(currentStep);
        updateWizardProgress();
    }
}

// Update wizard progress
function updateWizardProgress() {
    document.querySelectorAll('.wizard-step').forEach(step => {
        const stepNumber = parseInt(step.dataset.step);
        step.classList.remove('active', 'completed');

        if (stepNumber === currentStep) {
            step.classList.add('active');
        } else if (stepNumber < currentStep) {
            step.classList.add('completed');
        }
    });

    // Update buttons
    const prevBtn = document.getElementById('wizardPrevBtn');
    const nextBtn = document.getElementById('wizardNextBtn');

    prevBtn.style.display = currentStep === 1 ? 'none' : 'flex';

    if (currentStep === 5) {
        nextBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                <polyline points="20 6 9 17 4 12"/>
            </svg>
            Create Integration
        `;
    } else {
        nextBtn.innerHTML = `
            Next
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
        `;
    }
}

// Render wizard step
function renderWizardStep(step) {
    const wizardBody = document.getElementById('wizardBody');

    switch(step) {
        case 1:
            wizardBody.innerHTML = renderStep1();
            break;
        case 2:
            wizardBody.innerHTML = renderStep2();
            initStep2Handlers();
            break;
        case 3:
            wizardBody.innerHTML = renderStep3();
            initStep3Handlers();
            break;
        case 4:
            wizardBody.innerHTML = renderStep4();
            break;
        case 5:
            wizardBody.innerHTML = renderStep5();
            break;
    }
}

// Step 1: Basic Information
function renderStep1() {
    return `
        <h2 class="step-title">Basic Information</h2>
        <p class="step-description">Enter the basic details of the integration</p>

        <div class="form-group">
            <label>Integration Name <span class="required">*</span></label>
            <input type="text" id="displayName" placeholder="e.g., Salesforce, HubSpot, Stripe" value="${wizardData.basicInfo.displayName || ''}">
        </div>

        <div class="form-group">
            <label>Unique Identifier <span class="required">*</span></label>
            <input type="text" id="integrationId" placeholder="e.g., salesforce, hubspot, stripe (lowercase, no spaces)" value="${wizardData.basicInfo.id || ''}">
            <div class="help-text">This will be used as the folder name and API identifier</div>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label>Category <span class="required">*</span></label>
                <select id="category">
                    <option value="">Select category</option>
                    <option value="crm" ${wizardData.basicInfo.category === 'crm' ? 'selected' : ''}>CRM</option>
                    <option value="payment" ${wizardData.basicInfo.category === 'payment' ? 'selected' : ''}>Payment</option>
                    <option value="database" ${wizardData.basicInfo.category === 'database' ? 'selected' : ''}>Database</option>
                    <option value="communication" ${wizardData.basicInfo.category === 'communication' ? 'selected' : ''}>Communication</option>
                    <option value="analytics" ${wizardData.basicInfo.category === 'analytics' ? 'selected' : ''}>Analytics</option>
                    <option value="storage" ${wizardData.basicInfo.category === 'storage' ? 'selected' : ''}>Storage</option>
                    <option value="other" ${wizardData.basicInfo.category === 'other' ? 'selected' : ''}>Other</option>
                </select>
            </div>

            <div class="form-group">
                <label>Version</label>
                <input type="text" id="version" placeholder="1.0.0" value="${wizardData.basicInfo.version || '1.0.0'}">
            </div>
        </div>

        <div class="form-group">
            <label>Description</label>
            <textarea id="description" placeholder="Brief description of the integration" rows="3">${wizardData.basicInfo.description || ''}</textarea>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label>Icon URL (optional)</label>
                <input type="url" id="iconUrl" placeholder="https://example.com/icon.svg" value="${wizardData.basicInfo.iconUrl || ''}">
            </div>

            <div class="form-group">
                <label>Documentation URL (optional)</label>
                <input type="url" id="docsUrl" placeholder="https://docs.example.com" value="${wizardData.basicInfo.docsUrl || ''}">
            </div>
        </div>
    `;
}

// Step 2: Authorization Settings
function renderStep2() {
    if (!authTypes) {
        return '<div class="loading-state"><div class="spinner"></div><p>Loading auth types...</p></div>';
    }

    const authTypesList = Object.keys(authTypes.authTypes).map(key => {
        const authType = authTypes.authTypes[key];
        const isSelected = wizardData.authSettings.authMethods.some(m => m.authType === key);

        return `
            <div class="auth-method-option ${isSelected ? 'selected' : ''}" data-auth-type="${key}">
                <input type="checkbox" class="auth-method-checkbox" ${isSelected ? 'checked' : ''}>
                <div class="auth-method-info">
                    <div class="auth-method-label">${authType.label}</div>
                    <div class="auth-method-description">${authType.description}</div>
                </div>
            </div>
        `;
    }).join('');

    // Render configuration forms for selected auth methods
    const selectedMethodsConfig = wizardData.authSettings.authMethods.map((method, index) => {
        const authTypeDef = authTypes.authTypes[method.authType];
        return renderAuthMethodConfig(method, authTypeDef, index);
    }).join('');

    return `
        <h2 class="step-title">Authorization Settings</h2>
        <p class="step-description">Select and configure authentication methods this integration will support</p>

        <div style="margin-bottom: 32px;">
            <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 16px;">Step 1: Select Authentication Methods</h3>
            <div class="auth-methods-list">
                ${authTypesList}
            </div>
        </div>

        ${wizardData.authSettings.authMethods.length > 0 ? `
            <div style="margin-top: 32px; padding-top: 32px; border-top: 2px solid var(--gray-200);">
                <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 16px;">Step 2: Configure Selected Methods</h3>
                <div id="authMethodsConfig">
                    ${selectedMethodsConfig}
                </div>
            </div>
        ` : ''}

        <div class="info-box" style="margin-top: 24px;">
            <svg class="info-box-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            <div class="info-box-text">
                You can select multiple authentication methods. Configure each method's details below.
            </div>
        </div>
    `;
}

// Render configuration form for a specific auth method
function renderAuthMethodConfig(method, authTypeDef, index) {
    if (!method.config) {
        method.config = {};
    }

    let configFields = '';
    const configOptions = authTypeDef.configOptions || {};

    // Generate fields dynamically from configOptions
    if (Object.keys(configOptions).length === 0) {
        configFields = `
            <div class="info-box" style="background: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.2); padding: 12px; border-radius: 8px;">
                <p style="margin: 0; color: var(--gray-600); font-size: 13px;">No additional configuration required for this auth method.</p>
            </div>
        `;
    } else {
        Object.keys(configOptions).forEach(fieldKey => {
            const field = configOptions[fieldKey];
            configFields += generateAuthConfigField(fieldKey, field, index, method.config[fieldKey]);
        });
    }

    return `
        <div class="auth-method-config-card" style="background: var(--gray-50); border: 1px solid var(--gray-300); border-radius: 10px; padding: 20px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h4 style="font-size: 15px; font-weight: 600; color: var(--primary-600);">
                    ${authTypeDef.label}
                </h4>
                <span style="font-size: 12px; color: var(--gray-600); background: white; padding: 4px 10px; border-radius: 6px;">
                    ${method.isDefault ? 'Default Method' : 'Priority ' + method.priority}
                </span>
            </div>

            ${configFields}

            <div class="form-group">
                <div class="checkbox-wrapper">
                    <input type="checkbox" class="auth-config-field" data-index="${index}" data-field="isDefault"
                           ${method.isDefault ? 'checked' : ''} id="isDefault_${index}">
                    <label for="isDefault_${index}">Set as default authentication method</label>
                </div>
            </div>
        </div>
    `;
}

// Generate individual config field HTML (similar to app.js generateField)
function generateAuthConfigField(fieldKey, field, methodIndex, currentValue) {
    const required = field.required ? '<span class="required">*</span>' : '';
    const helpText = field.helpText ? `<div class="help-text">${field.helpText}</div>` : '';
    const examples = field.examples ? `<div class="examples">Examples: ${Array.isArray(field.examples) ? field.examples.join(', ') : field.examples}</div>` : '';
    const value = currentValue !== undefined ? currentValue : (field.default || '');

    switch (field.type) {
        case 'string':
            if (field.options) {
                // Dropdown
                return `
                    <div class="form-group">
                        <label>${field.label}${required}</label>
                        <select class="auth-config-field" data-index="${methodIndex}" data-field="${fieldKey}"
                                ${field.required ? 'required' : ''} ${field.locked ? 'disabled' : ''}>
                            ${field.options.map(opt =>
                                `<option value="${opt}" ${opt === value ? 'selected' : ''}>${opt}</option>`
                            ).join('')}
                        </select>
                        ${helpText}
                        ${examples}
                    </div>
                `;
            } else {
                // Text input
                return `
                    <div class="form-group">
                        <label>${field.label}${required}</label>
                        <input type="text" class="auth-config-field" data-index="${methodIndex}" data-field="${fieldKey}"
                            placeholder="${field.placeholder || ''}"
                            value="${value}"
                            ${field.required ? 'required' : ''}
                            ${field.locked ? 'readonly' : ''}>
                        ${helpText}
                        ${examples}
                    </div>
                `;
            }

        case 'number':
            return `
                <div class="form-group">
                    <label>${field.label}${required}</label>
                    <input type="number" class="auth-config-field" data-index="${methodIndex}" data-field="${fieldKey}"
                        value="${value}"
                        ${field.required ? 'required' : ''}>
                    ${helpText}
                    ${examples}
                </div>
            `;

        case 'boolean':
            return `
                <div class="form-group">
                    <div class="checkbox-wrapper">
                        <input type="checkbox" class="auth-config-field" data-index="${methodIndex}" data-field="${fieldKey}"
                            ${value ? 'checked' : ''} id="${fieldKey}_${methodIndex}">
                        <label for="${fieldKey}_${methodIndex}">${field.label}</label>
                    </div>
                    ${helpText}
                </div>
            `;

        case 'array':
            // For arrays, show as textarea with comma-separated values or JSON
            const arrayValue = Array.isArray(value) ? value.join(', ') : (value || '');
            return `
                <div class="form-group">
                    <label>${field.label}${required}</label>
                    <input type="text" class="auth-config-field" data-index="${methodIndex}" data-field="${fieldKey}"
                        placeholder="${field.placeholder || 'Comma-separated values'}"
                        value="${arrayValue}"
                        ${field.required ? 'required' : ''}>
                    ${helpText}
                    ${examples}
                </div>
            `;

        case 'object':
            const objectValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : value;
            return `
                <div class="form-group">
                    <label>${field.label}${required}</label>
                    <textarea class="auth-config-field" data-index="${methodIndex}" data-field="${fieldKey}"
                        placeholder='${field.examples ? field.examples[0] : '{}'}'
                        ${field.required ? 'required' : ''}
                        rows="4">${objectValue || ''}</textarea>
                    ${helpText}
                    ${examples}
                </div>
            `;

        default:
            return '';
    }
}

// Initialize Step 2 handlers
function initStep2Handlers() {
    // Handle auth method selection
    document.querySelectorAll('.auth-method-option').forEach(option => {
        option.addEventListener('click', function(e) {
            if (e.target.type !== 'checkbox') {
                const checkbox = this.querySelector('.auth-method-checkbox');
                checkbox.checked = !checkbox.checked;
            }

            const authType = this.dataset.authType;
            const checkbox = this.querySelector('.auth-method-checkbox');

            if (checkbox.checked) {
                this.classList.add('selected');
                if (!wizardData.authSettings.authMethods.some(m => m.authType === authType)) {
                    wizardData.authSettings.authMethods.push({
                        id: authType + '_method',
                        authType: authType,
                        label: authTypes.authTypes[authType].label,
                        isDefault: wizardData.authSettings.authMethods.length === 0,
                        priority: wizardData.authSettings.authMethods.length + 1,
                        config: {}
                    });
                }
            } else {
                this.classList.remove('selected');
                wizardData.authSettings.authMethods = wizardData.authSettings.authMethods.filter(m => m.authType !== authType);
            }

            // Re-render to show/hide configuration forms
            renderWizardStep(2);
            initStep2Handlers();
        });
    });

    // Handle configuration field changes
    document.querySelectorAll('.auth-config-field').forEach(field => {
        field.addEventListener('change', function() {
            const index = parseInt(this.dataset.index);
            const fieldName = this.dataset.field;
            const method = wizardData.authSettings.authMethods[index];

            if (!method.config) {
                method.config = {};
            }

            // Handle different field types
            if (this.type === 'checkbox') {
                if (fieldName === 'isDefault') {
                    // Clear other defaults
                    wizardData.authSettings.authMethods.forEach((m, i) => {
                        if (i !== index) m.isDefault = false;
                    });
                    method.isDefault = this.checked;
                } else {
                    method.config[fieldName] = this.checked;
                }
            } else if (this.type === 'number') {
                method.config[fieldName] = parseFloat(this.value) || 0;
            } else if (this.tagName === 'TEXTAREA') {
                // Try to parse as JSON for object/array fields
                try {
                    method.config[fieldName] = JSON.parse(this.value);
                } catch (e) {
                    // If not valid JSON, store as string
                    method.config[fieldName] = this.value;
                }
            } else {
                // Check if field is defined as array type in configOptions
                const authTypeDef = authTypes.authTypes[method.authType];
                const fieldDef = authTypeDef.configOptions[fieldName];

                if (fieldDef && fieldDef.type === 'array') {
                    // Convert comma-separated string to array
                    method.config[fieldName] = this.value.split(',').map(s => s.trim()).filter(s => s);
                } else {
                    method.config[fieldName] = this.value;
                }
            }

            console.log('Updated auth method config:', method);
        });

        // Also handle input events for text fields (real-time updates)
        if (field.tagName === 'INPUT' && field.type !== 'checkbox') {
            field.addEventListener('input', function() {
                const index = parseInt(this.dataset.index);
                const fieldName = this.dataset.field;
                const method = wizardData.authSettings.authMethods[index];

                if (!method.config) {
                    method.config = {};
                }

                // For simple text/number inputs, update immediately
                // Arrays and objects will be handled on change event
                const authTypeDef = authTypes.authTypes[method.authType];
                const fieldDef = authTypeDef.configOptions[fieldName];

                if (!fieldDef || (fieldDef.type !== 'array' && fieldDef.type !== 'object')) {
                    if (this.type === 'number') {
                        method.config[fieldName] = parseFloat(this.value) || 0;
                    } else {
                        method.config[fieldName] = this.value;
                    }
                }
            });
        }
    });
}

// Step 3: Features & Endpoints
function renderStep3() {
    const featuresHtml = wizardData.features.features.map((feature, index) => `
        <div class="feature-item" data-index="${index}">
            <div class="feature-item-header">
                <span class="feature-item-title">Feature ${index + 1}</span>
                <button class="remove-feature-btn" onclick="removeFeature(${index})">Remove</button>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Feature Name</label>
                    <input type="text" class="feature-name" placeholder="e.g., Get Contacts" value="${feature.name || ''}">
                </div>

                <div class="form-group">
                    <label>Feature ID</label>
                    <input type="text" class="feature-id" placeholder="e.g., get_contacts" value="${feature.id || ''}">
                </div>
            </div>

            <div class="form-group">
                <label>Description</label>
                <input type="text" class="feature-description" placeholder="Brief description" value="${feature.description || ''}">
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>HTTP Method</label>
                    <select class="feature-method">
                        <option value="GET" ${feature.endpoint?.method === 'GET' ? 'selected' : ''}>GET</option>
                        <option value="POST" ${feature.endpoint?.method === 'POST' ? 'selected' : ''}>POST</option>
                        <option value="PUT" ${feature.endpoint?.method === 'PUT' ? 'selected' : ''}>PUT</option>
                        <option value="DELETE" ${feature.endpoint?.method === 'DELETE' ? 'selected' : ''}>DELETE</option>
                        <option value="PATCH" ${feature.endpoint?.method === 'PATCH' ? 'selected' : ''}>PATCH</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Endpoint Path</label>
                    <input type="text" class="feature-path" placeholder="/api/v1/contacts" value="${feature.endpoint?.path || ''}">
                </div>
            </div>
        </div>
    `).join('');

    return `
        <h2 class="step-title">Features & Endpoints</h2>
        <p class="step-description">Define the features and API endpoints this integration provides</p>

        <div class="features-list" id="featuresList">
            ${featuresHtml || '<p style="text-align: center; color: var(--gray-500);">No features added yet</p>'}
        </div>

        <button class="btn btn-secondary add-feature-btn" onclick="addFeature()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Feature
        </button>
    `;
}

// Initialize Step 3 handlers
function initStep3Handlers() {
    // Handlers will be attached via onclick in HTML
}

// Add feature
function addFeature() {
    wizardData.features.features.push({
        id: '',
        name: '',
        description: '',
        category: '',
        endpoint: {
            path: '',
            method: 'GET'
        }
    });
    renderWizardStep(3);
}

// Remove feature
function removeFeature(index) {
    wizardData.features.features.splice(index, 1);
    renderWizardStep(3);
}

// Step 4: Rate Limits
function renderStep4() {
    const rl = wizardData.rateLimits.global;
    const rs = wizardData.rateLimits.retryStrategy;

    return `
        <h2 class="step-title">Rate Limits</h2>
        <p class="step-description">Configure API rate limits and retry strategy</p>

        <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 16px; color: var(--gray-900);">Global Rate Limits</h3>

        <div class="form-row">
            <div class="form-group">
                <label>Requests per Minute</label>
                <input type="number" id="rpmLimit" value="${rl.requestsPerMinute}" min="1">
            </div>

            <div class="form-group">
                <label>Requests per Hour</label>
                <input type="number" id="rphLimit" value="${rl.requestsPerHour}" min="1">
            </div>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label>Requests per Day</label>
                <input type="number" id="rpdLimit" value="${rl.requestsPerDay}" min="1">
            </div>

            <div class="form-group">
                <label>Concurrent Requests</label>
                <input type="number" id="concurrentLimit" value="${rl.concurrentRequests}" min="1">
            </div>
        </div>

        <h3 style="font-size: 16px; font-weight: 600; margin: 24px 0 16px; color: var(--gray-900);">Retry Strategy</h3>

        <div class="form-row">
            <div class="form-group">
                <label>Max Retries</label>
                <input type="number" id="maxRetries" value="${rs.maxRetries}" min="0">
            </div>

            <div class="form-group">
                <label>Initial Delay (ms)</label>
                <input type="number" id="initialDelay" value="${rs.initialDelay}" min="0" step="100">
            </div>
        </div>

        <div class="form-group">
            <label>Backoff Multiplier</label>
            <input type="number" id="backoffMultiplier" value="${rs.backoffMultiplier}" min="1" step="0.5">
            <div class="help-text">Each retry will wait: initialDelay * (backoffMultiplier ^ retryAttempt)</div>
        </div>
    `;
}

// Step 5: Review
function renderStep5() {
    const authMethods = wizardData.authSettings.authMethods.map(m => m.label).join(', ') || 'None';
    const featureCount = wizardData.features.features.length;

    return `
        <h2 class="step-title">Review & Create</h2>
        <p class="step-description">Review your integration configuration before creating</p>

        <div class="review-section">
            <div class="review-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="16" x2="12" y2="12"/>
                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                Basic Information
            </div>
            <div class="review-item">
                <span class="review-label">Name:</span>
                <span class="review-value">${wizardData.basicInfo.displayName}</span>
            </div>
            <div class="review-item">
                <span class="review-label">Identifier:</span>
                <span class="review-value">${wizardData.basicInfo.id}</span>
            </div>
            <div class="review-item">
                <span class="review-label">Category:</span>
                <span class="review-value">${wizardData.basicInfo.category}</span>
            </div>
            <div class="review-item">
                <span class="review-label">Version:</span>
                <span class="review-value">${wizardData.basicInfo.version || '1.0.0'}</span>
            </div>
        </div>

        <div class="review-section">
            <div class="review-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Authorization
            </div>
            <div class="review-item">
                <span class="review-label">Auth Methods:</span>
                <span class="review-value">${authMethods}</span>
            </div>
            <div class="review-item">
                <span class="review-label">Count:</span>
                <span class="review-value">${wizardData.authSettings.authMethods.length} method(s)</span>
            </div>
        </div>

        <div class="review-section">
            <div class="review-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
                Features & Rate Limits
            </div>
            <div class="review-item">
                <span class="review-label">Features:</span>
                <span class="review-value">${featureCount} feature(s)</span>
            </div>
            <div class="review-item">
                <span class="review-label">Rate Limit:</span>
                <span class="review-value">${wizardData.rateLimits.global.requestsPerMinute} req/min</span>
            </div>
            <div class="review-item">
                <span class="review-label">Max Retries:</span>
                <span class="review-value">${wizardData.rateLimits.retryStrategy.maxRetries}</span>
            </div>
        </div>

        <div class="info-box">
            <svg class="info-box-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            <div class="info-box-text">
                Once created, the integration will be available for users to connect. Configuration files will be stored in <code>integrations/providers/${wizardData.basicInfo.id}/</code>
            </div>
        </div>
    `;
}

// Validate step
function validateStep(step) {
    switch(step) {
        case 1:
            const displayName = document.getElementById('displayName').value.trim();
            const integrationId = document.getElementById('integrationId').value.trim();
            const category = document.getElementById('category').value;

            if (!displayName || !integrationId || !category) {
                showError('Please fill in all required fields');
                return false;
            }

            if (!/^[a-z0-9_-]+$/.test(integrationId)) {
                showError('Integration ID can only contain lowercase letters, numbers, hyphens, and underscores');
                return false;
            }

            // Save step 1 data
            wizardData.basicInfo = {
                displayName,
                id: integrationId,
                category,
                description: document.getElementById('description').value.trim(),
                version: document.getElementById('version').value.trim() || '1.0.0',
                iconUrl: document.getElementById('iconUrl').value.trim(),
                docsUrl: document.getElementById('docsUrl').value.trim()
            };
            return true;

        case 2:
            if (wizardData.authSettings.authMethods.length === 0) {
                showError('Please select at least one authentication method');
                return false;
            }
            return true;

        case 3:
            // Save features data
            const features = [];
            document.querySelectorAll('.feature-item').forEach((item, index) => {
                const name = item.querySelector('.feature-name').value.trim();
                const id = item.querySelector('.feature-id').value.trim();
                const description = item.querySelector('.feature-description').value.trim();
                const method = item.querySelector('.feature-method').value;
                const path = item.querySelector('.feature-path').value.trim();

                if (name && id) {
                    features.push({
                        id,
                        name,
                        description,
                        category: '',
                        endpoint: { path, method }
                    });
                }
            });

            wizardData.features.features = features;
            return true;

        case 4:
            // Save rate limits data
            wizardData.rateLimits.global = {
                requestsPerMinute: parseInt(document.getElementById('rpmLimit').value),
                requestsPerHour: parseInt(document.getElementById('rphLimit').value),
                requestsPerDay: parseInt(document.getElementById('rpdLimit').value),
                concurrentRequests: parseInt(document.getElementById('concurrentLimit').value)
            };

            wizardData.rateLimits.retryStrategy = {
                maxRetries: parseInt(document.getElementById('maxRetries').value),
                backoffMultiplier: parseFloat(document.getElementById('backoffMultiplier').value),
                initialDelay: parseInt(document.getElementById('initialDelay').value)
            };
            return true;

        case 5:
            return true;
    }
}

// Submit integration
async function submitIntegration() {
    try {
        const response = await fetch(`${API_BASE}/integrations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(wizardData)
        });

        const result = await response.json();

        if (result.success) {
            showSuccess('Integration created successfully!');
            closeWizard();
            loadIntegrations();
        } else {
            showError(result.error || 'Failed to create integration');
        }
    } catch (error) {
        console.error('Error creating integration:', error);
        showError('Failed to create integration');
    }
}

// Edit integration
async function editIntegration(id) {
    // Redirect to add-integration page with edit mode
    window.location.href = `/add-integration?edit=${id}`;
}

// Toggle status (aligned with panel-config status values)
async function toggleStatus(id, currentStatus) {
    // Toggle between active and inactive (beta stays as is unless explicitly changed)
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

    try {
        const response = await fetch(`${API_BASE}/integrations/${id}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });

        const result = await response.json();

        if (result.success) {
            showSuccess(`Integration is now ${newStatus}!`);
            loadIntegrations();
        } else {
            showError(result.error || 'Failed to update status');
        }
    } catch (error) {
        console.error('Error updating status:', error);
        showError('Failed to update status');
    }
}

// Delete integration
async function deleteIntegration(id) {
    if (!confirm('Are you sure you want to delete this integration? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/integrations/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            showSuccess('Integration deleted successfully!');
            loadIntegrations();
        } else {
            showError(result.error || 'Failed to delete integration');
        }
    } catch (error) {
        console.error('Error deleting integration:', error);
        showError('Failed to delete integration');
    }
}

// Utility: Render filtered integrations
function renderFilteredIntegrations(integrations) {
    const grid = document.getElementById('integrationsGrid');
    const emptyState = document.getElementById('emptyState');

    if (integrations.length === 0) {
        grid.style.display = 'none';
        emptyState.style.display = 'flex';
        emptyState.style.flexDirection = 'column';
        emptyState.style.alignItems = 'center';
        return;
    }

    grid.style.display = 'grid';
    emptyState.style.display = 'none';

    grid.innerHTML = integrations.map(integration => `
        <div class="integration-card" data-id="${integration.id}">
            <div class="integration-card-header">
                <div class="integration-icon">
                    ${integration.displayName.charAt(0)}
                </div>
                <div class="integration-actions">
                    <button class="integration-action-btn" onclick="editIntegration('${integration.id}')" title="Edit">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button class="integration-action-btn" onclick="toggleStatus('${integration.id}', '${integration.status}')" title="Toggle Status">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                    </button>
                    <button class="integration-action-btn" onclick="deleteIntegration('${integration.id}')" title="Delete">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="integration-info">
                <h3 class="integration-name">${integration.displayName}</h3>
                <p class="integration-description">${integration.description || 'No description provided'}</p>
                <div class="integration-meta">
                    <span class="integration-category">${integration.category}</span>
                    ${getStatusBadge(integration.status)}
                </div>
            </div>
        </div>
    `).join('');

    // Attach click handlers to make cards clickable
    attachCardClickHandlers();
}

// Utility: Show notifications
function showSuccess(message) {
    showNotification(message, 'success');
}

function showError(message) {
    showNotification(message, 'error');
}

function showInfo(message) {
    showNotification(message, 'info');
}

function showNotification(message, type = 'success') {
    // Use the dashboard.js toast function
    if (typeof showToast === 'function') {
        showToast(message, type);
    } else {
        alert(message);
    }
}
