// Add Integration Page - Wizard Logic
const API_BASE = 'http://localhost:3000/api';

// Global state
let authTypes = null;
let panelConfig = null;
let currentStep = 1;
let editMode = false;
let editIntegrationId = null;
let wizardData = {
    basicInfo: {},
    authSettings: {
        authMethods: []
    },
    rateLimits: {
        endpointLimits: [],
        retryStrategy: {
            maxRetries: 3,
            backoffMultiplier: 2,
            initialDelay: 1000
        }
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Check if edit mode
    const urlParams = new URLSearchParams(window.location.search);
    editIntegrationId = urlParams.get('edit');
    editMode = !!editIntegrationId;

    setupEventListeners();

    // Load configs in parallel
    await Promise.all([
        loadAuthTypes(),
        loadPanelConfig()
    ]);

    if (editMode) {
        loadExistingIntegration(editIntegrationId);
    } else {
        renderWizardStep(1);
    }
});

// Setup event listeners
function setupEventListeners() {
    document.getElementById('prevBtn').addEventListener('click', prevStep);
    document.getElementById('nextBtn').addEventListener('click', nextStep);
}

// Load auth types
async function loadAuthTypes() {
    try {
        const response = await fetch(`${API_BASE}/auth-types`);
        authTypes = await response.json();
        // Re-render current step if we're on step 2
        if (currentStep === 2) {
            renderWizardStep(2);
        }
    } catch (error) {
        console.error('Error loading auth types:', error);
        showError('Failed to load authentication types');
    }
}

// Load panel configuration
async function loadPanelConfig() {
    try {
        const response = await fetch(`${API_BASE}/panel-config`);
        panelConfig = await response.json();
        console.log('Panel config loaded:', panelConfig);
    } catch (error) {
        console.error('Error loading panel config:', error);
        showError('Failed to load panel configuration');
    }
}

// Generate form field HTML from panel config
function generateFieldHTML(fieldKey, fieldConfig, value = '', cssClass = '', addId = false) {
    const required = fieldConfig.required ? '<span class="required">*</span>' : '';
    const helpText = fieldConfig.description ? `<div class="help-text">${fieldConfig.description}</div>` : '';
    const fieldValue = value || fieldConfig.default || '';
    const className = cssClass || fieldKey;
    const idAttr = addId ? `id="${className}"` : '';

    switch (fieldConfig.htmlType) {
        case 'text':
            return `
                <div class="form-group">
                    <label>${fieldConfig.label}${required}</label>
                    <input type="text" ${idAttr} class="${className}" placeholder="${fieldConfig.placeholder || ''}" value="${fieldValue}">
                    ${helpText}
                </div>
            `;

        case 'textarea':
            return `
                <div class="form-group">
                    <label>${fieldConfig.label}${required}</label>
                    <textarea ${idAttr} class="${className}" rows="4" placeholder="${fieldConfig.placeholder || ''}">${fieldValue}</textarea>
                    ${helpText}
                </div>
            `;

        case 'number':
            return `
                <div class="form-group">
                    <label>${fieldConfig.label}${required}</label>
                    <input type="number" ${idAttr} class="${className}" placeholder="${fieldConfig.placeholder || ''}" value="${fieldValue}" ${fieldConfig.min !== undefined ? `min="${fieldConfig.min}"` : ''} ${fieldConfig.max !== undefined ? `max="${fieldConfig.max}"` : ''}>
                    ${helpText}
                </div>
            `;

        case 'select':
            const options = fieldConfig.options || [];
            const optionsHtml = options.map(opt => {
                const optValue = typeof opt === 'string' ? opt : opt.value;
                const optLabel = typeof opt === 'string' ? opt : opt.label;
                return `<option value="${optValue}" ${fieldValue === optValue ? 'selected' : ''}>${optLabel}</option>`;
            }).join('');

            // Only add empty option if field is not required or doesn't have a default value
            const includeEmptyOption = !fieldConfig.required || (!fieldValue && !fieldConfig.default);
            const emptyOption = includeEmptyOption ? `<option value="">Select ${fieldConfig.label.toLowerCase()}</option>` : '';

            return `
                <div class="form-group">
                    <label>${fieldConfig.label}${required}</label>
                    <select ${idAttr} class="${className}">
                        ${emptyOption}
                        ${optionsHtml}
                    </select>
                    ${helpText}
                </div>
            `;

        case 'checkbox':
            return `
                <div class="form-group">
                    <div class="checkbox-wrapper">
                        <input type="checkbox" ${idAttr} class="${className}" ${fieldValue ? 'checked' : ''}>
                        <label>${fieldConfig.label}</label>
                    </div>
                    ${helpText}
                </div>
            `;

        default:
            return '';
    }
}

// Load existing integration for editing
async function loadExistingIntegration(id) {
    try {
        // Load basic info from registry
        const registryResponse = await fetch(`${API_BASE}/integrations`);
        const registryData = await registryResponse.json();
        const integration = registryData.integrations.find(i => i.id === id);

        if (!integration) {
            showError('Integration not found');
            window.location.href = '/integrations';
            return;
        }

        // Load auth schema
        const authResponse = await fetch(`${API_BASE}/integrations/${id}/auth`);
        const authData = await authResponse.json();

        // Load rate limits
        const rateLimitsResponse = await fetch(`${API_BASE}/integrations/${id}/ratelimits`);
        const rateLimitsData = await rateLimitsResponse.json();

        // Populate wizardData
        wizardData.basicInfo = {
            id: integration.id,
            displayName: integration.displayName,
            description: integration.description,
            category: integration.category,
            version: integration.version,
            iconUrl: integration.iconUrl,
            docsUrl: integration.docsUrl,
            status: integration.status
        };

        wizardData.authSettings = {
            authMethods: authData.authMethods || []
        };

        wizardData.rateLimits = {
            endpointLimits: rateLimitsData.endpointLimits || [],
            retryStrategy: rateLimitsData.retryStrategy || {
                maxRetries: 3,
                backoffMultiplier: 2,
                initialDelay: 1000
            }
        };

        // Update page title and breadcrumb
        document.title = `Edit ${integration.displayName} - Integration Platform`;
        const breadcrumb = document.querySelector('.breadcrumb span:last-child');
        if (breadcrumb) {
            breadcrumb.textContent = `Edit ${integration.displayName}`;
        }

        // Render first step
        renderWizardStep(1);
    } catch (error) {
        console.error('Error loading integration:', error);
        showError('Failed to load integration data');
        window.location.href = '/integrations';
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

// Next step
function nextStep() {
    if (validateStep(currentStep)) {
        if (currentStep < 4) {
            currentStep++;
            renderWizardStep(currentStep);
            updateWizardProgress();
        } else {
            submitIntegration();
        }
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
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    prevBtn.style.display = currentStep === 1 ? 'none' : 'flex';

    if (currentStep === 4) {
        nextBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                <polyline points="20 6 9 17 4 12"/>
            </svg>
            ${editMode ? 'Update Integration' : 'Create Integration'}
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
            break;
        case 4:
            wizardBody.innerHTML = renderStep4();
            break;
    }

    updateWizardProgress();
}

// Step 1: Basic Information
function renderStep1() {
    if (!panelConfig || !panelConfig.basicInfo) {
        return '<div class="loading-state"><div class="spinner"></div><p>Loading configuration...</p></div>';
    }

    // Generate fields dynamically from panel config
    let fieldsHtml = '';
    const fieldKeys = Object.keys(panelConfig.basicInfo);

    // Group fields into rows (2 fields per row)
    let currentRow = [];
    fieldKeys.forEach((fieldKey, idx) => {
        const fieldConfig = panelConfig.basicInfo[fieldKey];
        const fieldValue = wizardData.basicInfo[fieldKey] || '';

        // Map field keys to element IDs (for backward compatibility with validation)
        let cssClass = fieldKey;
        if (fieldKey === 'id') {
            cssClass = 'integrationId';
        }

        // Generate field HTML (with ID for Step 1 fields)
        let fieldHtml = generateFieldHTML(fieldKey, fieldConfig, fieldValue, cssClass, true);

        // Special handling for 'id' field in edit mode
        if (fieldKey === 'id' && editMode) {
            const required = fieldConfig.required ? '<span class="required">*</span>' : '';
            fieldHtml = `
                <div class="form-group">
                    <label>${fieldConfig.label}${required}</label>
                    <input type="text" id="integrationId" class="${cssClass}" value="${fieldValue}" disabled>
                    <div class="help-text">Integration ID cannot be changed</div>
                </div>
            `;
        }

        // Check if this should be in a row or single
        if (fieldConfig.htmlType === 'textarea') {
            // Flush current row if any
            if (currentRow.length > 0) {
                fieldsHtml += `<div class="form-row">${currentRow.join('')}</div>`;
                currentRow = [];
            }
            // Add textarea in single row
            fieldsHtml += `<div class="form-row single">${fieldHtml}</div>`;
        } else {
            currentRow.push(fieldHtml);

            // If we have 2 fields or it's the last field, flush the row
            if (currentRow.length === 2 || idx === fieldKeys.length - 1) {
                fieldsHtml += `<div class="form-row">${currentRow.join('')}</div>`;
                currentRow = [];
            }
        }
    });

    return `
        <div class="step-content">
            <div class="step-header">
                <h2 class="step-title">Basic Information</h2>
                <p class="step-description">Provide the basic details about your integration</p>
            </div>
            ${fieldsHtml}
        </div>
    `;
}

// Step 2: Authorization Settings - Dropdown-based approach
function renderStep2() {
    if (!authTypes) {
        return '<div class="loading-state"><div class="spinner"></div><p>Loading authentication methods...</p></div>';
    }

    // Render configuration forms for added auth methods
    const methodsConfig = wizardData.authSettings.authMethods.map((method, index) => {
        const authTypeDef = authTypes.authTypes[method.authType];
        return renderAuthMethodConfig(method, authTypeDef, index);
    }).join('');

    // Build dropdown options
    const dropdownOptions = Object.keys(authTypes.authTypes).map(key => {
        const authType = authTypes.authTypes[key];
        return `<option value="${key}">${authType.label}</option>`;
    }).join('');

    return `
        <div class="step-content">
            <div class="step-header">
                <h2 class="step-title">Authorization Settings</h2>
                <p class="step-description">Add and configure authentication methods for your integration</p>
            </div>

            <!-- Add Auth Method Section -->
            <div class="add-auth-method-section">
                <div class="form-row">
                    <div class="form-group">
                        <label>Select Authentication Type</label>
                        <select id="authTypeDropdown" style="width: auto; min-width: 300px;">
                            <option value="">Choose authentication method...</option>
                            ${dropdownOptions}
                        </select>
                    </div>
                    <div style="display: flex; align-items: flex-end;">
                        <button class="btn btn-primary" id="addAuthMethodBtn" style="min-width: 140px;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                                <line x1="12" y1="5" x2="12" y2="19"/>
                                <line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                            Add Method
                        </button>
                    </div>
                </div>
            </div>

            <!-- Added Methods Configuration -->
            <div class="auth-methods-config">
                ${methodsConfig.length > 0 ? methodsConfig : `
                    <div class="auth-config-empty" style="margin-top: 20px; padding: 40px 20px;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width: 48px; height: 48px; opacity: 0.3; margin-bottom: 12px;">
                            <rect x="5" y="11" width="14" height="10" rx="2" ry="2"/>
                            <circle cx="12" cy="16" r="1"/>
                            <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
                        </svg>
                        <p><strong>No authentication methods added yet</strong></p>
                        <p style="margin-top: 8px; font-size: 13px;">Select a method from the dropdown above and click "Add Method"</p>
                    </div>
                `}
            </div>

            <div class="info-box">
                <svg class="info-box-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="16" x2="12" y2="12"/>
                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                <div class="info-box-text">
                    You can add multiple instances of the same authentication type with different configurations (e.g., multiple API keys for different purposes).
                </div>
            </div>
        </div>
    `;
}

// Render test configuration fields for an auth method
function renderTestConfigFields(authTypeDef, index, existingTestConfig = {}) {
    const testConfig = authTypeDef.testConfig || {};

    if (Object.keys(testConfig).length === 0) {
        return ''; // No test config defined for this auth type
    }

    let testConfigFields = '';

    Object.keys(testConfig).forEach(fieldKey => {
        const field = testConfig[fieldKey];

        // Skip locked fields (they use defaults and shouldn't be edited)
        if (field.locked) {
            return;
        }

        const currentValue = existingTestConfig[fieldKey] !== undefined
            ? existingTestConfig[fieldKey]
            : field.default;

        testConfigFields += generateAuthConfigField(fieldKey, field, index, currentValue, true);
    });

    if (!testConfigFields) {
        return ''; // All fields were locked
    }

    return `
        <div class="test-config-section" style="margin-top: 20px; padding-top: 20px; border-top: 2px solid var(--gray-200);">
            <div style="margin-bottom: 12px;">
                <h5 style="font-size: 15px; font-weight: 600; color: var(--gray-900); margin: 0 0 4px 0;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16" style="vertical-align: middle; margin-right: 6px;">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                    Test Configuration
                </h5>
                <p style="font-size: 12px; color: var(--gray-600); margin: 0;">Configure how to test this authentication method</p>
            </div>
            ${testConfigFields}
        </div>
    `;
}

// Render auth method configuration (same as integrations.js)
function renderAuthMethodConfig(method, authTypeDef, index) {
    if (!method.config) {
        method.config = {};
    }

    if (!method.testConfig) {
        method.testConfig = {};
    }

    let configFields = '';
    const configOptions = authTypeDef.configOptions || {};

    if (Object.keys(configOptions).length === 0) {
        configFields = `
            <div class="info-box">
                <svg class="info-box-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <div class="info-box-text">No additional configuration required for this authentication method.</div>
            </div>
        `;
    } else {
        Object.keys(configOptions).forEach(fieldKey => {
            const field = configOptions[fieldKey];
            configFields += generateAuthConfigField(fieldKey, field, index, method.config[fieldKey], false);
        });
    }

    // Render test configuration section
    const testConfigSection = renderTestConfigFields(authTypeDef, index, method.testConfig);

    return `
        <div class="auth-config-card">
            <div class="auth-config-header">
                <h4 class="auth-config-title">${authTypeDef.label} ${index > 0 || wizardData.authSettings.authMethods.filter(m => m.authType === method.authType).length > 1 ? `#${wizardData.authSettings.authMethods.filter((m, i) => m.authType === method.authType && i <= index).length}` : ''}</h4>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span class="auth-config-badge">${method.isDefault ? 'Default Method' : 'Priority ' + method.priority}</span>
                    <button class="remove-auth-method-btn" data-index="${index}" style="background: none; border: none; color: var(--error-600); cursor: pointer; padding: 6px 12px; border-radius: 8px; font-size: 13px; font-weight: 500; transition: all 0.2s;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16" style="vertical-align: middle; margin-right: 4px;">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                        Remove
                    </button>
                </div>
            </div>

            ${configFields}

            ${authTypeDef.supportsAdditionalFields ? renderAdditionalFieldsSection(method, index) : ''}

            ${testConfigSection}

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

// Render additional fields section
function renderAdditionalFieldsSection(method, methodIndex) {
    if (!panelConfig || !panelConfig.additionalFields) {
        return ''; // Return empty if config not loaded
    }

    if (!method.additionalFields) {
        method.additionalFields = [];
    }

    const fieldsHtml = method.additionalFields.map((field, fieldIndex) => {
        // Generate fields dynamically from panel config
        let fieldInputsHtml = '';
        const fieldKeys = Object.keys(panelConfig.additionalFields);

        // Group fields into rows (2 fields per row)
        let currentRow = [];
        fieldKeys.forEach((fieldKey, idx) => {
            const fieldConfig = panelConfig.additionalFields[fieldKey];
            const fieldValue = field[fieldKey] || '';
            const cssClass = `additional-field-input`;

            // Generate field HTML based on config
            const fieldHtml = generateAdditionalFieldHTML(fieldKey, fieldConfig, fieldValue, methodIndex, fieldIndex, cssClass);

            // Check if this should be in a row or single
            if (fieldConfig.htmlType === 'textarea') {
                // Flush current row if any
                if (currentRow.length > 0) {
                    fieldInputsHtml += `<div class="form-row">${currentRow.join('')}</div>`;
                    currentRow = [];
                }
                // Add textarea in single row
                fieldInputsHtml += `<div class="form-row single">${fieldHtml}</div>`;
            } else {
                currentRow.push(fieldHtml);

                // If we have 2 fields or it's the last field, flush the row
                if (currentRow.length === 2 || idx === fieldKeys.length - 1) {
                    fieldInputsHtml += `<div class="form-row">${currentRow.join('')}</div>`;
                    currentRow = [];
                }
            }
        });

        return `
            <div class="feature-card" data-field-index="${fieldIndex}" style="margin-bottom: 12px; background: var(--gray-50); border: 2px solid var(--gray-200); padding: 16px; border-radius: 8px;">
                <div class="feature-card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <span class="feature-card-title" style="font-weight: 600; color: var(--primary-600);">Field ${fieldIndex + 1}</span>
                    <button class="remove-additional-field-btn" data-method-index="${methodIndex}" data-field-index="${fieldIndex}"
                            style="background: none; border: none; color: var(--error-600); cursor: pointer; padding: 4px 8px; border-radius: 6px; font-size: 12px;">
                        Remove
                    </button>
                </div>
                ${fieldInputsHtml}
            </div>
        `;
    }).join('');

    return `
        <div class="additional-fields-section" style="margin-top: 20px; padding-top: 20px; border-top: 2px solid var(--gray-200);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div>
                    <h5 style="font-size: 15px; font-weight: 600; color: var(--gray-900); margin: 0 0 4px 0;">Additional Fields</h5>
                    <p style="font-size: 12px; color: var(--gray-600); margin: 0;">Fields needed for API calls (e.g., company subdomain, tenant ID)</p>
                </div>
            </div>
            <div class="additional-fields-list">
                ${fieldsHtml || '<p style="color: var(--gray-500); font-size: 13px; text-align: center; padding: 20px;">No additional fields defined</p>'}
            </div>
            <button class="btn btn-secondary add-additional-field-btn" data-method-index="${methodIndex}" style="width: 100%; margin-top: 12px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add Additional Field
            </button>
        </div>
    `;
}

// Generate additional field HTML from panel config
function generateAdditionalFieldHTML(fieldKey, fieldConfig, value, methodIndex, fieldIndex, cssClass) {
    const required = fieldConfig.required ? '<span class="required">*</span>' : '';
    const helpText = fieldConfig.description ? `<div class="help-text">${fieldConfig.description}</div>` : '';
    const fieldValue = value || fieldConfig.default || '';

    const dataAttributes = `data-method-index="${methodIndex}" data-field-index="${fieldIndex}" data-property="${fieldKey}"`;

    switch (fieldConfig.htmlType) {
        case 'text':
            return `
                <div class="form-group">
                    <label>${fieldConfig.label}${required}</label>
                    <input type="text" class="${cssClass}" ${dataAttributes}
                           placeholder="${fieldConfig.placeholder || ''}" value="${fieldValue}">
                    ${helpText}
                </div>
            `;

        case 'textarea':
            return `
                <div class="form-group">
                    <label>${fieldConfig.label}${required}</label>
                    <textarea class="${cssClass}" ${dataAttributes} rows="3"
                              placeholder="${fieldConfig.placeholder || ''}">${fieldValue}</textarea>
                    ${helpText}
                </div>
            `;

        case 'number':
            return `
                <div class="form-group">
                    <label>${fieldConfig.label}${required}</label>
                    <input type="number" class="${cssClass}" ${dataAttributes}
                           placeholder="${fieldConfig.placeholder || ''}" value="${fieldValue}">
                    ${helpText}
                </div>
            `;

        case 'select':
            const options = fieldConfig.options || [];
            const optionsHtml = options.map(opt => {
                const optValue = typeof opt === 'object' ? opt.value : opt;
                const optLabel = typeof opt === 'object' ? opt.label : opt;
                return `<option value="${optValue}" ${fieldValue == optValue ? 'selected' : ''}>${optLabel}</option>`;
            }).join('');

            return `
                <div class="form-group">
                    <label>${fieldConfig.label}${required}</label>
                    <select class="${cssClass}" ${dataAttributes}>
                        <option value="">Select ${fieldConfig.label.toLowerCase()}</option>
                        ${optionsHtml}
                    </select>
                    ${helpText}
                </div>
            `;

        default:
            return '';
    }
}

// Generate auth config field (same as integrations.js - abbreviated for space)
function generateAuthConfigField(fieldKey, field, methodIndex, currentValue, isTestConfig = false) {
    const required = field.required ? '<span class="required">*</span>' : '';
    const helpText = field.helpText ? `<div class="help-text">${field.helpText}</div>` : '';
    const examples = field.examples ? `<div class="examples">Examples: ${Array.isArray(field.examples) ? field.examples.join(', ') : field.examples}</div>` : '';
    const value = currentValue !== undefined ? currentValue : (field.default || '');
    const fieldClass = isTestConfig ? 'auth-test-config-field' : 'auth-config-field';
    const dataConfigType = isTestConfig ? 'data-config-type="testConfig"' : '';

    switch (field.type) {
        case 'string':
            if (field.options) {
                return `
                    <div class="form-group">
                        <label>${field.label}${required}</label>
                        <select class="${fieldClass}" data-index="${methodIndex}" data-field="${fieldKey}" ${dataConfigType}>
                            ${field.options.map(opt => `<option value="${opt}" ${opt === value ? 'selected' : ''}>${opt}</option>`).join('')}
                        </select>
                        ${helpText}${examples}
                    </div>
                `;
            } else {
                return `
                    <div class="form-group">
                        <label>${field.label}${required}</label>
                        <input type="text" class="${fieldClass}" data-index="${methodIndex}" data-field="${fieldKey}" ${dataConfigType}
                            placeholder="${field.placeholder || ''}" value="${value}">
                        ${helpText}${examples}
                    </div>
                `;
            }

        case 'number':
            return `
                <div class="form-group">
                    <label>${field.label}${required}</label>
                    <input type="number" class="${fieldClass}" data-index="${methodIndex}" data-field="${fieldKey}" ${dataConfigType} value="${value}">
                    ${helpText}${examples}
                </div>
            `;

        case 'boolean':
            return `
                <div class="form-group">
                    <div class="checkbox-wrapper">
                        <input type="checkbox" class="${fieldClass}" data-index="${methodIndex}" data-field="${fieldKey}" ${dataConfigType}
                            ${value ? 'checked' : ''} id="${fieldKey}_${methodIndex}">
                        <label for="${fieldKey}_${methodIndex}">${field.label}</label>
                    </div>
                    ${helpText}
                </div>
            `;

        case 'array':
            const arrayValues = Array.isArray(value) ? value : (value ? value.split(',').map(s => s.trim()).filter(s => s) : []);
            const chipsHtml = arrayValues.map((item, idx) => `
                <span class="chip" data-value="${item}">
                    ${item}
                    <button type="button" class="chip-remove" onclick="removeChip(${methodIndex}, '${fieldKey}', ${idx}, ${isTestConfig})">×</button>
                </span>
            `).join('');

            return `
                <div class="form-group">
                    <label>${field.label}${required}</label>
                    <div class="chip-input-container">
                        <div class="chips-display" id="chips-${methodIndex}-${fieldKey}" data-index="${methodIndex}" data-field="${fieldKey}" ${dataConfigType}>
                            ${chipsHtml}
                        </div>
                        <div class="chip-input-row">
                            <input type="text" id="chip-input-${methodIndex}-${fieldKey}"
                                   placeholder="${field.placeholder || 'Add item...'}"
                                   onkeypress="if(event.key==='Enter'){event.preventDefault();addChip(${methodIndex}, '${fieldKey}', ${isTestConfig});}">
                            <button type="button" class="chip-add-btn" onclick="addChip(${methodIndex}, '${fieldKey}', ${isTestConfig})">Add</button>
                        </div>
                    </div>
                    ${helpText}${examples}
                </div>
            `;

        case 'object':
            const objectValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : value;
            return `
                <div class="form-group">
                    <label>${field.label}${required}</label>
                    <textarea class="${fieldClass}" data-index="${methodIndex}" data-field="${fieldKey}" ${dataConfigType}
                        placeholder='${field.examples ? field.examples[0] : '{}'}' rows="4">${objectValue || ''}</textarea>
                    ${helpText}${examples}
                </div>
            `;

        default:
            return '';
    }
}

// Initialize Step 2 handlers
function initStep2Handlers() {
    // Handle "Add Method" button
    const addBtn = document.getElementById('addAuthMethodBtn');
    const dropdown = document.getElementById('authTypeDropdown');

    if (addBtn) {
        addBtn.addEventListener('click', function() {
            const selectedAuthType = dropdown.value;

            if (!selectedAuthType) {
                showError('Please select an authentication method from the dropdown');
                return;
            }

            // Add the selected auth method
            const authTypeDef = authTypes.authTypes[selectedAuthType];

            // Initialize config with default values from configOptions
            const initialConfig = {};
            if (authTypeDef.configOptions) {
                Object.keys(authTypeDef.configOptions).forEach(fieldKey => {
                    const field = authTypeDef.configOptions[fieldKey];
                    if (field.default !== undefined) {
                        initialConfig[fieldKey] = field.default;
                    }
                });
            }

            const newMethod = {
                id: `${selectedAuthType}_method_${Date.now()}`,
                authType: selectedAuthType,
                label: authTypeDef.label,
                isDefault: wizardData.authSettings.authMethods.length === 0,
                priority: wizardData.authSettings.authMethods.length + 1,
                config: initialConfig
            };

            wizardData.authSettings.authMethods.push(newMethod);

            // Reset dropdown and re-render
            dropdown.value = '';
            renderWizardStep(2);
        });
    }

    // Handle "Remove" button for each method
    document.querySelectorAll('.remove-auth-method-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);

            // Remove the method
            wizardData.authSettings.authMethods.splice(index, 1);

            // Re-assign priorities
            wizardData.authSettings.authMethods.forEach((m, i) => {
                m.priority = i + 1;
            });

            // If removed method was default, make first one default
            if (wizardData.authSettings.authMethods.length > 0 &&
                !wizardData.authSettings.authMethods.some(m => m.isDefault)) {
                wizardData.authSettings.authMethods[0].isDefault = true;
            }

            // Re-render
            renderWizardStep(2);
        });
    });

    // Handle configuration field changes
    const handleFieldChange = function() {
        const index = parseInt(this.dataset.index);
        const fieldName = this.dataset.field;
        const configType = this.dataset.configType; // 'testConfig' or undefined (regular config)
        const method = wizardData.authSettings.authMethods[index];

        if (!method) return;

        // Initialize config objects if needed
        if (!method.config) method.config = {};
        if (!method.testConfig) method.testConfig = {};

        // Determine which config object to update
        const targetConfig = configType === 'testConfig' ? method.testConfig : method.config;

        if (this.type === 'checkbox') {
            if (fieldName === 'isDefault') {
                wizardData.authSettings.authMethods.forEach((m, i) => {
                    if (i !== index) m.isDefault = false;
                });
                method.isDefault = this.checked;
                renderWizardStep(2); // Re-render to update badges
            } else {
                targetConfig[fieldName] = this.checked;
            }
        } else if (this.type === 'number') {
            targetConfig[fieldName] = parseFloat(this.value) || 0;
        } else if (this.tagName === 'TEXTAREA') {
            try {
                targetConfig[fieldName] = JSON.parse(this.value);
            } catch (e) {
                targetConfig[fieldName] = this.value;
            }
        } else {
            const authTypeDef = authTypes.authTypes[method.authType];
            const fieldDef = configType === 'testConfig'
                ? (authTypeDef.testConfig ? authTypeDef.testConfig[fieldName] : null)
                : (authTypeDef.configOptions ? authTypeDef.configOptions[fieldName] : null);

            if (fieldDef && fieldDef.type === 'array') {
                targetConfig[fieldName] = this.value.split(',').map(s => s.trim()).filter(s => s);
            } else {
                targetConfig[fieldName] = this.value;
            }
        }
    };

    // Handle both regular config fields and test config fields
    const allConfigFields = [
        ...document.querySelectorAll('.auth-config-field'),
        ...document.querySelectorAll('.auth-test-config-field')
    ];

    allConfigFields.forEach(field => {
        // Initialize the config with current field values (for fields with defaults or pre-filled values)
        const index = parseInt(field.dataset.index);
        const fieldName = field.dataset.field;
        const configType = field.dataset.configType;
        const method = wizardData.authSettings.authMethods[index];

        if (method) {
            // Initialize config objects if needed
            if (!method.config) method.config = {};
            if (!method.testConfig) method.testConfig = {};

            const targetConfig = configType === 'testConfig' ? method.testConfig : method.config;

            // Only initialize if the field is not already in config
            if (targetConfig[fieldName] === undefined) {
                const authTypeDef = authTypes.authTypes[method.authType];
                const fieldDef = configType === 'testConfig'
                    ? (authTypeDef.testConfig ? authTypeDef.testConfig[fieldName] : null)
                    : (authTypeDef.configOptions ? authTypeDef.configOptions[fieldName] : null);

                if (field.type === 'checkbox') {
                    targetConfig[fieldName] = field.checked;
                } else if (field.type === 'number') {
                    targetConfig[fieldName] = parseFloat(field.value) || 0;
                } else if (field.tagName === 'TEXTAREA') {
                    try {
                        targetConfig[fieldName] = JSON.parse(field.value);
                    } catch (e) {
                        targetConfig[fieldName] = field.value;
                    }
                } else {
                    if (fieldDef && fieldDef.type === 'array') {
                        targetConfig[fieldName] = field.value.split(',').map(s => s.trim()).filter(s => s);
                    } else {
                        targetConfig[fieldName] = field.value;
                    }
                }
            }
        }

        // Add both 'input' and 'change' event listeners for real-time capture
        if (field.type === 'checkbox') {
            field.addEventListener('change', handleFieldChange);
        } else {
            field.addEventListener('input', handleFieldChange);
            field.addEventListener('change', handleFieldChange);
        }
    });

    // Handle "Add Additional Field" button
    document.querySelectorAll('.add-additional-field-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const methodIndex = parseInt(this.dataset.methodIndex);
            const method = wizardData.authSettings.authMethods[methodIndex];

            if (!method.additionalFields) {
                method.additionalFields = [];
            }

            method.additionalFields.push({
                name: '',
                label: '',
                type: 'string',
                required: true,
                placeholder: ''
            });

            renderWizardStep(2);
        });
    });

    // Handle "Remove Additional Field" button
    document.querySelectorAll('.remove-additional-field-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const methodIndex = parseInt(this.dataset.methodIndex);
            const fieldIndex = parseInt(this.dataset.fieldIndex);
            const method = wizardData.authSettings.authMethods[methodIndex];

            if (method && method.additionalFields) {
                method.additionalFields.splice(fieldIndex, 1);
            }

            renderWizardStep(2);
        });
    });

    // Handle additional field input changes
    document.querySelectorAll('.additional-field-input').forEach(input => {
        const handleAdditionalFieldChange = function() {
            const methodIndex = parseInt(this.dataset.methodIndex);
            const fieldIndex = parseInt(this.dataset.fieldIndex);
            const property = this.dataset.property;
            const method = wizardData.authSettings.authMethods[methodIndex];

            if (method && method.additionalFields && method.additionalFields[fieldIndex]) {
                const field = method.additionalFields[fieldIndex];

                if (property === 'required') {
                    field[property] = this.value === 'true';
                } else {
                    field[property] = this.value;
                }
            }
        };

        input.addEventListener('input', handleAdditionalFieldChange);
        input.addEventListener('change', handleAdditionalFieldChange);
    });
}

// Add/Remove endpoint limit
function addEndpointLimit() {
    // Capture current values before re-rendering
    captureEndpointLimits();

    if (!wizardData.rateLimits.endpointLimits) {
        wizardData.rateLimits.endpointLimits = [];
    }
    wizardData.rateLimits.endpointLimits.push({
        path: '',
        requestsPerMinute: 60,
        requestsPerHour: 3000,
        requestsPerDay: 50000,
        concurrentRequests: 5
    });
    renderWizardStep(3);
}

function removeEndpointLimit(index) {
    // Capture current values before re-rendering
    captureEndpointLimits();

    wizardData.rateLimits.endpointLimits.splice(index, 1);
    renderWizardStep(3);
}

// Helper function to capture endpoint limits from DOM
function captureEndpointLimits() {
    if (!panelConfig || !panelConfig.rateLimits) return;

    document.querySelectorAll('.feature-card[data-index]').forEach((card, index) => {
        if (wizardData.rateLimits.endpointLimits && wizardData.rateLimits.endpointLimits[index]) {
            // Get all field keys from config
            const fieldKeys = Object.keys(panelConfig.rateLimits);

            fieldKeys.forEach(fieldKey => {
                const input = card.querySelector(`.endpoint-limit-${fieldKey}`);
                const fieldConfig = panelConfig.rateLimits[fieldKey];

                if (input) {
                    // Convert value based on dataType
                    if (fieldConfig.dataType === 'number') {
                        wizardData.rateLimits.endpointLimits[index][fieldKey] = parseInt(input.value) || fieldConfig.default || 0;
                    } else {
                        wizardData.rateLimits.endpointLimits[index][fieldKey] = input.value || fieldConfig.default || '';
                    }
                }
            });
        }
    });
}

// Step 3: Rate Limits
function renderStep3() {
    if (!panelConfig || !panelConfig.rateLimits) {
        return '<div class="loading-state"><div class="spinner"></div><p>Loading configuration...</p></div>';
    }

    // Initialize endpoint limits array if not exists
    if (!wizardData.rateLimits.endpointLimits) {
        wizardData.rateLimits.endpointLimits = [];
    }

    // Render endpoint-specific limits
    const endpointLimitsHtml = wizardData.rateLimits.endpointLimits.map((limit, index) => {
        // Generate fields dynamically from panel config
        let fieldsHtml = '';
        const fieldKeys = Object.keys(panelConfig.rateLimits);

        // Group fields into rows (2 fields per row)
        let currentRow = [];
        fieldKeys.forEach((fieldKey, idx) => {
            const fieldConfig = panelConfig.rateLimits[fieldKey];
            const fieldValue = limit[fieldKey] || '';
            const cssClass = `endpoint-limit-${fieldKey}`;

            const fieldHtml = generateFieldHTML(fieldKey, fieldConfig, fieldValue, cssClass);

            // Check if this should be in a row or single
            if (fieldConfig.htmlType === 'textarea') {
                // Flush current row if any
                if (currentRow.length > 0) {
                    fieldsHtml += `<div class="form-row">${currentRow.join('')}</div>`;
                    currentRow = [];
                }
                // Add textarea in single row
                fieldsHtml += `<div class="form-row single">${fieldHtml}</div>`;
            } else {
                currentRow.push(fieldHtml);

                // If we have 2 fields or it's the last field, flush the row
                if (currentRow.length === 2 || idx === fieldKeys.length - 1) {
                    fieldsHtml += `<div class="form-row">${currentRow.join('')}</div>`;
                    currentRow = [];
                }
            }
        });

        return `
            <div class="feature-card" data-index="${index}">
                <div class="feature-card-header">
                    <span class="feature-card-title">Endpoint Limit ${index + 1}</span>
                    <button class="remove-feature-btn" onclick="removeEndpointLimit(${index})">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                        Remove
                    </button>
                </div>
                ${fieldsHtml}
            </div>
        `;
    }).join('');

    return `
        <div class="step-content">
            <div class="step-header">
                <h2 class="step-title">Rate Limits</h2>
                <p class="step-description">Configure endpoint-specific rate limiting for your API</p>
            </div>

            <h3 class="section-subtitle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                    <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
                Endpoint Rate Limits
            </h3>

            <div class="features-list">
                ${endpointLimitsHtml}
            </div>

            <button class="btn btn-primary add-feature-btn" onclick="addEndpointLimit()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add Endpoint Limit
            </button>

            <div class="info-box">
                <svg class="info-box-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="16" x2="12" y2="12"/>
                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                <div class="info-box-text">
                    <strong>How limits work:</strong> Rate limits are checked from generic to specific (top to bottom). Each level must pass before checking next. Example order: <code>/*</code> → <code>/api/*</code> → <code>/api/search</code>. If request passes all matching limits, API is called. First failed limit rejects the request.
                </div>
            </div>

            <h3 class="section-subtitle" style="margin-top: 24px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20">
                    <polyline points="23 4 23 10 17 10"/>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
                Retry Strategy
            </h3>

            <div class="form-row">
                <div class="form-group">
                    <label>Max Retries</label>
                    <input type="number" id="maxRetries" value="${wizardData.rateLimits.retryStrategy.maxRetries}">
                    <div class="help-text">Number of retry attempts for failed requests</div>
                </div>

                <div class="form-group">
                    <label>Backoff Multiplier</label>
                    <input type="number" id="backoffMultiplier" value="${wizardData.rateLimits.retryStrategy.backoffMultiplier}">
                    <div class="help-text">Multiplier for exponential backoff</div>
                </div>
            </div>

            <div class="form-group">
                <label>Initial Delay (ms)</label>
                <input type="number" id="initialDelay" value="${wizardData.rateLimits.retryStrategy.initialDelay}">
                <div class="help-text">Initial delay before first retry</div>
            </div>
        </div>
    `;
}

// Step 4: Review
function renderStep4() {
    return `
        <div class="step-content">
            <div class="step-header">
                <h2 class="step-title">Review & Confirm</h2>
                <p class="step-description">Review your integration configuration before ${editMode ? 'updating' : 'creating'}</p>
            </div>

            <div class="review-grid">
                <div class="review-card">
                    <h3 class="review-card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                            <polyline points="10 9 9 9 8 9"/>
                        </svg>
                        Basic Information
                    </h3>
                    <div class="review-item">
                        <span class="review-label">Name:</span>
                        <span class="review-value">${wizardData.basicInfo.displayName || 'Not set'}</span>
                    </div>
                    <div class="review-item">
                        <span class="review-label">Identifier:</span>
                        <span class="review-value">${wizardData.basicInfo.id || 'Not set'}</span>
                    </div>
                    <div class="review-item">
                        <span class="review-label">Category:</span>
                        <span class="review-value">${wizardData.basicInfo.category || 'Not set'}</span>
                    </div>
                    <div class="review-item">
                        <span class="review-label">Version:</span>
                        <span class="review-value">${wizardData.basicInfo.version || '1.0.0'}</span>
                    </div>
                </div>

                <div class="review-card">
                    <h3 class="review-card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <rect x="5" y="11" width="14" height="10" rx="2" ry="2"/>
                            <circle cx="12" cy="16" r="1"/>
                            <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
                        </svg>
                        Authentication Methods
                    </h3>
                    <div class="review-item">
                        <span class="review-label">Selected Methods:</span>
                        <span class="review-value">${wizardData.authSettings.authMethods.length}</span>
                    </div>
                    ${wizardData.authSettings.authMethods.map(method => `
                        <div class="review-item">
                            <span class="review-label">${method.label}:</span>
                            <span class="review-value">${method.isDefault ? 'Default' : 'Priority ' + method.priority}</span>
                        </div>
                    `).join('')}
                </div>

                <div class="review-card">
                    <h3 class="review-card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        Rate Limits
                    </h3>
                    <div class="review-item">
                        <span class="review-label">Endpoint Limits:</span>
                        <span class="review-value">${wizardData.rateLimits.endpointLimits.length}</span>
                    </div>
                    ${wizardData.rateLimits.endpointLimits.slice(0, 3).map(limit => `
                        <div class="review-item">
                            <span class="review-label">${limit.path}:</span>
                            <span class="review-value">${limit.requestsPerMinute}/min</span>
                        </div>
                    `).join('')}
                    ${wizardData.rateLimits.endpointLimits.length > 3 ? `
                        <div class="review-item">
                            <span class="review-label"></span>
                            <span class="review-value">+${wizardData.rateLimits.endpointLimits.length - 3} more...</span>
                        </div>
                    ` : ''}
                </div>
            </div>

            <div class="info-box" style="margin-top: 32px;">
                <svg class="info-box-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
                </svg>
                <div class="info-box-text">
                    Your integration will be created at: <strong>integrations/providers/${wizardData.basicInfo.id || '{id}'}/</strong>
                </div>
            </div>
        </div>
    `;
}

// Validate URL format
function isValidUrl(urlString) {
    try {
        const url = new URL(urlString);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (e) {
        return false;
    }
}

// Validate step
function validateStep(step) {
    switch(step) {
        case 1:
            // Capture basic info from form (without hardcoded defaults)
            const basicInfoData = {
                id: document.getElementById('integrationId')?.value.toLowerCase().trim(),
                displayName: document.getElementById('displayName')?.value.trim(),
                category: document.getElementById('category')?.value,
                version: document.getElementById('version')?.value.trim(),
                description: document.getElementById('description')?.value.trim(),
                status: document.getElementById('status')?.value,
                iconUrl: document.getElementById('iconUrl')?.value.trim(),
                docsUrl: document.getElementById('docsUrl')?.value.trim()
            };

            // Validate using panel config and Validators
            if (panelConfig && panelConfig.basicInfo) {
                const validationResult = Validators.validateFields(basicInfoData, panelConfig.basicInfo);

                if (!validationResult.valid) {
                    const firstError = Validators.getFirstError(validationResult);
                    showError(firstError);
                    return false;
                }

                // Apply default values from panel-config for non-required empty fields
                Object.keys(panelConfig.basicInfo).forEach(fieldKey => {
                    const fieldConfig = panelConfig.basicInfo[fieldKey];
                    // Only apply default if field is not required and value is empty
                    if (!fieldConfig.required && !basicInfoData[fieldKey] && fieldConfig.default !== undefined) {
                        basicInfoData[fieldKey] = fieldConfig.default;
                    }
                });
            }

            // Store validated data
            wizardData.basicInfo = basicInfoData;
            return true;

        case 2:
            if (wizardData.authSettings.authMethods.length === 0) {
                showError('Please select at least one authentication method');
                return false;
            }

            // Validate test URL for each auth method
            for (let i = 0; i < wizardData.authSettings.authMethods.length; i++) {
                const method = wizardData.authSettings.authMethods[i];
                const authTypeDef = authTypes.authTypes[method.authType];

                // Check if testUrl is required and validate it
                if (authTypeDef.testConfig && authTypeDef.testConfig.testUrl) {
                    const testUrlField = authTypeDef.testConfig.testUrl;
                    const testUrl = method.testConfig?.testUrl;

                    if (testUrlField.required && !testUrl) {
                        showError(`Auth Method ${i + 1}: Test URL is required`);
                        return false;
                    }

                    if (testUrl && !isValidUrl(testUrl)) {
                        showError(`Auth Method ${i + 1}: Test URL must be a valid URL (e.g., https://api.example.com/v1/me)`);
                        return false;
                    }
                }
            }

            // Validate additional fields for each auth method using panel config
            if (panelConfig && panelConfig.additionalFields) {
                for (let i = 0; i < wizardData.authSettings.authMethods.length; i++) {
                    const method = wizardData.authSettings.authMethods[i];

                    if (method.additionalFields && method.additionalFields.length > 0) {
                        for (let j = 0; j < method.additionalFields.length; j++) {
                            const field = method.additionalFields[j];

                            // Validate using config-driven validators
                            const validationResult = Validators.validateFields(field, panelConfig.additionalFields);

                            if (!validationResult.valid) {
                                const firstError = Validators.getFirstError(validationResult);
                                showError(`Auth Method ${i + 1}, Additional Field ${j + 1}: ${firstError}`);
                                return false;
                            }

                            // Check for duplicate field names within the same method
                            const duplicates = method.additionalFields.filter(f => f.name === field.name);
                            if (duplicates.length > 1) {
                                showError(`Auth Method ${i + 1}: Duplicate field name '${field.name}'. Each field must have a unique name.`);
                                return false;
                            }
                        }
                    }
                }
            }

            return true;

        case 3:
            // Capture endpoint-specific limits
            document.querySelectorAll('.feature-card[data-index]').forEach((card, index) => {
                if (wizardData.rateLimits.endpointLimits && wizardData.rateLimits.endpointLimits[index]) {
                    wizardData.rateLimits.endpointLimits[index].path = card.querySelector('.endpoint-limit-path')?.value || '';
                    wizardData.rateLimits.endpointLimits[index].requestsPerMinute = parseInt(card.querySelector('.endpoint-limit-rpm')?.value) || 60;
                    wizardData.rateLimits.endpointLimits[index].requestsPerHour = parseInt(card.querySelector('.endpoint-limit-rph')?.value) || 3000;
                    wizardData.rateLimits.endpointLimits[index].requestsPerDay = parseInt(card.querySelector('.endpoint-limit-rpd')?.value) || 50000;
                    wizardData.rateLimits.endpointLimits[index].concurrentRequests = parseInt(card.querySelector('.endpoint-limit-concurrent')?.value) || 5;
                }
            });

            // Validate endpoint limits using panel config
            if (panelConfig && panelConfig.rateLimits) {
                for (let i = 0; i < wizardData.rateLimits.endpointLimits.length; i++) {
                    const limit = wizardData.rateLimits.endpointLimits[i];
                    const validationResult = Validators.validateFields(limit, panelConfig.rateLimits);

                    if (!validationResult.valid) {
                        const firstError = Validators.getFirstError(validationResult);
                        showError(`Endpoint Limit ${i + 1}: ${firstError}`);
                        return false;
                    }
                }
            }

            // Capture retry strategy
            wizardData.rateLimits.retryStrategy.maxRetries = parseInt(document.getElementById('maxRetries')?.value) || 3;
            wizardData.rateLimits.retryStrategy.backoffMultiplier = parseInt(document.getElementById('backoffMultiplier')?.value) || 2;
            wizardData.rateLimits.retryStrategy.initialDelay = parseInt(document.getElementById('initialDelay')?.value) || 1000;
            return true;

        case 4:
            return true;

        default:
            return true;
    }
}

// Submit integration
async function submitIntegration() {
    try {
        const url = editMode
            ? `${API_BASE}/integrations/${editIntegrationId}`
            : `${API_BASE}/integrations`;

        const method = editMode ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(wizardData)
        });

        const result = await response.json();

        if (result.success) {
            const actionText = editMode ? 'Updated' : 'Created';
            const actionTextLower = editMode ? 'updated' : 'created';

            // Show success message
            document.getElementById('wizardBody').innerHTML = `
                <div class="success-box">
                    <svg class="success-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    <h2 class="success-title">Integration ${actionText} Successfully!</h2>
                    <p class="success-message">Your integration has been ${actionTextLower} and is ready to use.</p>
                </div>
                <div class="info-box" style="margin-top: 24px;">
                    <svg class="info-box-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="16" x2="12" y2="12"/>
                        <line x1="12" y1="8" x2="12.01" y2="8"/>
                    </svg>
                    <div class="info-box-text">
                        Files ${actionTextLower} at: <strong>integrations/providers/${wizardData.basicInfo.id}/</strong>
                    </div>
                </div>
            `;

            // Update next button to go back
            const nextBtn = document.getElementById('nextBtn');
            nextBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                </svg>
                Go to Integrations
            `;

            // Remove old event listener by cloning and replacing
            const newNextBtn = nextBtn.cloneNode(true);
            nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);

            // Add new event listener
            newNextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = '/integrations';
            });

            document.getElementById('prevBtn').style.display = 'none';

        } else {
            showError(result.error || `Failed to ${editMode ? 'update' : 'create'} integration`, result.validationErrors);
        }
    } catch (error) {
        console.error(`Error ${editMode ? 'updating' : 'creating'} integration:`, error);
        showError(`Failed to ${editMode ? 'update' : 'create'} integration. Please try again.`);
    }
}

// Show error with detailed validation messages
function showError(message, validationErrors = null) {
    let errorHtml = `
        <div class="error-overlay" id="errorOverlay">
            <div class="error-modal">
                <div class="error-header">
                    <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="15" y1="9" x2="9" y2="15"/>
                        <line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                    <h3 class="error-title">Error</h3>
                </div>
                <div class="error-body">
                    <p class="error-message">${message}</p>
    `;

    // Add validation errors if present
    if (validationErrors && Array.isArray(validationErrors) && validationErrors.length > 0) {
        errorHtml += `
            <div class="validation-errors">
                <h4 class="validation-errors-title">Validation Errors:</h4>
                <ul class="validation-errors-list">
        `;

        validationErrors.forEach(error => {
            const authMethodLabel = error.authMethodLabel ? `<strong>${error.authMethodLabel}</strong>: ` : '';
            const usedInText = error.usedIn ? `<br><small>Used in: <code>${error.usedIn.join(', ')}</code></small>` : '';

            errorHtml += `
                <li class="validation-error-item">
                    ${authMethodLabel}${error.message}${usedInText}
                </li>
            `;
        });

        errorHtml += `
                </ul>
            </div>
        `;
    }

    errorHtml += `
                </div>
                <div class="error-footer">
                    <button class="btn btn-primary" onclick="closeErrorModal()">OK</button>
                </div>
            </div>
        </div>
    `;

    // Remove existing error modal if any
    const existingModal = document.getElementById('errorOverlay');
    if (existingModal) {
        existingModal.remove();
    }

    // Add to body
    document.body.insertAdjacentHTML('beforeend', errorHtml);
}

// Close error modal
function closeErrorModal() {
    const modal = document.getElementById('errorOverlay');
    if (modal) {
        modal.remove();
    }
}

// Chip/Tag management functions
function addChip(methodIndex, fieldKey, isTestConfig = false) {
    const input = document.getElementById(`chip-input-${methodIndex}-${fieldKey}`);
    const value = input.value.trim();

    if (!value) {
        return;
    }

    const chipsContainer = document.getElementById(`chips-${methodIndex}-${fieldKey}`);
    const method = wizardData.authSettings.authMethods[methodIndex];

    // Initialize config objects if needed
    if (!method.config) method.config = {};
    if (!method.testConfig) method.testConfig = {};

    const targetConfig = isTestConfig ? method.testConfig : method.config;

    // Initialize array if needed
    if (!targetConfig[fieldKey]) {
        targetConfig[fieldKey] = [];
    }

    // Ensure it's an array
    if (!Array.isArray(targetConfig[fieldKey])) {
        targetConfig[fieldKey] = [];
    }

    // Check for duplicates
    if (targetConfig[fieldKey].includes(value)) {
        showError(`"${value}" already exists`);
        return;
    }

    // Add to data
    targetConfig[fieldKey].push(value);

    // Clear input
    input.value = '';

    // Re-render chips
    renderChips(methodIndex, fieldKey, isTestConfig);
}

function removeChip(methodIndex, fieldKey, chipIndex, isTestConfig = false) {
    const method = wizardData.authSettings.authMethods[methodIndex];

    // Initialize config objects if needed
    if (!method.config) method.config = {};
    if (!method.testConfig) method.testConfig = {};

    const targetConfig = isTestConfig ? method.testConfig : method.config;

    if (targetConfig[fieldKey] && Array.isArray(targetConfig[fieldKey])) {
        targetConfig[fieldKey].splice(chipIndex, 1);
    }

    // Re-render chips
    renderChips(methodIndex, fieldKey, isTestConfig);
}

function renderChips(methodIndex, fieldKey, isTestConfig = false) {
    const chipsContainer = document.getElementById(`chips-${methodIndex}-${fieldKey}`);
    const method = wizardData.authSettings.authMethods[methodIndex];

    // Initialize config objects if needed
    if (!method.config) method.config = {};
    if (!method.testConfig) method.testConfig = {};

    const targetConfig = isTestConfig ? method.testConfig : method.config;
    const values = targetConfig[fieldKey] || [];

    if (values.length === 0) {
        chipsContainer.innerHTML = '';
        return;
    }

    const chipsHtml = values.map((item, idx) => `
        <span class="chip" data-value="${item}">
            ${item}
            <button type="button" class="chip-remove" onclick="removeChip(${methodIndex}, '${fieldKey}', ${idx}, ${isTestConfig})">×</button>
        </span>
    `).join('');

    chipsContainer.innerHTML = chipsHtml;
}
