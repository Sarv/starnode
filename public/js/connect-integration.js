// Connection Wizard JavaScript

// Global state
let currentStep = 1;
let totalSteps = 4;
let isEditMode = false;
let connectionId = null;
let wizardData = {
    userId: null,
    userName: null,
    userEmail: null,
    integrationId: null,
    integrationName: null,
    selectedAuthMethod: null,
    authMethodId: null,
    authMethodLabel: null,
    dynamicVariables: {},
    credentials: {},
    authSchema: null
};

// Initialize wizard on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeWizard();
    setupEventListeners();
});

// Initialize wizard with URL parameters
async function initializeWizard() {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    connectionId = urlParams.get('connectionId');

    // Check if we're in edit mode
    if (mode === 'edit' && connectionId) {
        isEditMode = true;

        // Load existing connection data
        await loadExistingConnection(connectionId);

        // Update page title and button text
        document.getElementById('wizardTitle').textContent = 'Edit Connection';
        document.getElementById('saveBtn').textContent = 'Update Connection';
    } else {
        // Create mode - get parameters from URL
        wizardData.userId = urlParams.get('userId');
        wizardData.integrationId = urlParams.get('integrationId');

        if (!wizardData.userId || !wizardData.integrationId) {
            showToast('Missing required parameters. Redirecting...', 'error');
            setTimeout(() => window.location.href = '/user-integrations', 2000);
            return;
        }

        // Load user and integration details
        await loadUserDetails();
        await loadIntegrationDetails();
    }

    // Load auth methods (works for both create and edit mode)
    await loadAuthMethods();
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('prevBtn').addEventListener('click', goToPreviousStep);
    document.getElementById('nextBtn').addEventListener('click', goToNextStep);
    document.getElementById('saveBtn').addEventListener('click', saveConnection);
    document.getElementById('testConnectionBtn').addEventListener('click', testConnection);
}

// Load user details
async function loadUserDetails() {
    try {
        const response = await fetch(`/api/users/${wizardData.userId}`);
        const data = await response.json();

        if (data.user) {
            wizardData.userName = data.user.name;
            wizardData.userEmail = data.user.email;
            updatePageHeader();
        }
    } catch (error) {
        console.error('Error loading user:', error);
        showToast('Failed to load user details', 'error');
    }
}

// Load integration details
async function loadIntegrationDetails() {
    try {
        const response = await fetch(`/api/integrations/${wizardData.integrationId}`);
        const data = await response.json();

        if (data && data.id) {
            wizardData.integrationName = data.displayName || data.name;
            updatePageHeader();
        }
    } catch (error) {
        console.error('Error loading integration:', error);
        showToast('Failed to load integration details', 'error');
    }
}

// Load existing connection for edit mode
async function loadExistingConnection(connId) {
    try {
        const response = await fetch(`/api/user-integrations/${connId}`);
        const data = await response.json();

        if (data.success && data.connection) {
            const connection = data.connection;

            // Debug: Log loaded connection data
            console.log('🔍 Loaded connection data:', connection);
            console.log('🔍 configuredVariables from API:', connection.configuredVariables);
            console.log('🔍 credentials from API:', connection.credentials);

            // Populate wizard data with existing connection
            wizardData.userId = connection.userId;
            wizardData.integrationId = connection.integrationId;
            wizardData.integrationName = connection.integrationName;
            wizardData.authMethodId = connection.authMethodId;
            wizardData.authMethodLabel = connection.authMethodLabel;
            wizardData.dynamicVariables = connection.configuredVariables || {};
            wizardData.credentials = connection.credentials?.decrypted || {};

            // Debug: Log wizardData after population
            console.log('🔍 wizardData.dynamicVariables after load:', wizardData.dynamicVariables);
            console.log('🔍 wizardData.credentials after load:', wizardData.credentials);

            // Load user details
            await loadUserDetails();

            // Load integration details
            await loadIntegrationDetails();

            // Pre-fill connection name in step 4
            setTimeout(() => {
                const connectionNameInput = document.getElementById('connectionName');
                if (connectionNameInput && connection.connectionName) {
                    connectionNameInput.value = connection.connectionName;
                }
            }, 500);
        } else {
            showToast('Failed to load connection details', 'error');
            setTimeout(() => window.location.href = '/my-connections', 2000);
        }
    } catch (error) {
        console.error('Error loading connection:', error);
        showToast('Failed to load connection', 'error');
        setTimeout(() => window.location.href = '/my-connections', 2000);
    }
}

// Update page header with user and integration info
function updatePageHeader() {
    if (wizardData.userName && wizardData.integrationName) {
        const descriptionElement = document.getElementById('integrationDescription');
        const action = isEditMode ? 'Editing' : 'Connecting';
        descriptionElement.innerHTML = `
            ${action} <strong>${escapeHtml(wizardData.integrationName)}</strong> for
            <strong>${escapeHtml(wizardData.userName)}</strong> (${escapeHtml(wizardData.userEmail)})
        `;
    }
}

// Load auth methods
async function loadAuthMethods() {
    const container = document.getElementById('authMethodsContainer');

    try {
        const response = await fetch(`/api/integrations/${wizardData.integrationId}/auth-schema`);
        const data = await response.json();

        if (data.authSchema && data.authSchema.authMethods) {
            wizardData.authSchema = data.authSchema;
            renderAuthMethods(data.authSchema.authMethods);

            // In edit mode, auto-select the existing auth method
            if (isEditMode && wizardData.authMethodId) {
                setTimeout(() => {
                    // Find and select the auth method
                    const selectedMethod = data.authSchema.authMethods.find(m => m.id === wizardData.authMethodId);
                    if (selectedMethod) {
                        wizardData.selectedAuthMethod = selectedMethod;

                        // Add selected class to the card using data attribute
                        const card = document.querySelector(`.auth-method-card[data-method-id="${wizardData.authMethodId}"]`);
                        if (card) {
                            card.classList.add('selected');
                        }
                    }
                }, 100);
            }
        } else {
            container.innerHTML = '<div class="empty-state"><p>No authentication methods available</p></div>';
        }
    } catch (error) {
        console.error('Error loading auth methods:', error);
        container.innerHTML = '<div class="empty-state"><p>Failed to load authentication methods</p></div>';
    }
}

// Render auth methods
function renderAuthMethods(authMethods) {
    const container = document.getElementById('authMethodsContainer');

    container.innerHTML = authMethods.map(method => {
        const authType = method.authType || 'api-key';
        const badgeClass = authType.includes('oauth') ? 'oauth' :
                          authType.includes('basic') ? 'basic' : 'api-key';

        // Get credential fields (handle both requiredFields and credentials object)
        let credentialFields = [];
        if (method.requiredFields) {
            credentialFields = method.requiredFields;
        } else if (method.credentials) {
            credentialFields = Object.keys(method.credentials);
        }

        return `
            <div class="auth-method-card" data-method-id="${method.id}" onclick="selectAuthMethod('${method.id}')">
                <div class="auth-method-header">
                    <div class="auth-method-title">${escapeHtml(method.label)}</div>
                    <div class="auth-method-badge ${badgeClass}">${authType}</div>
                </div>
                <div class="auth-method-description">
                    ${method.description || 'Standard authentication method'}
                </div>
                <div class="auth-method-features">
                    ${credentialFields.slice(0, 3).map(field =>
                        `<span class="auth-feature-tag">${field}</span>`
                    ).join('')}
                </div>
            </div>
        `;
    }).join('');
}

// Select auth method
function selectAuthMethod(methodId) {
    // Remove previous selection
    document.querySelectorAll('.auth-method-card').forEach(card => {
        card.classList.remove('selected');
    });

    // Add selection to clicked card
    event.currentTarget.classList.add('selected');

    // Store selected method
    const selectedMethod = wizardData.authSchema.authMethods.find(m => m.id === methodId);
    wizardData.selectedAuthMethod = selectedMethod;
    wizardData.authMethodId = methodId;
    wizardData.authMethodLabel = selectedMethod.label;
}

// Navigate to next step
async function goToNextStep() {
    // Validate current step
    if (!validateCurrentStep()) {
        return;
    }

    if (currentStep < totalSteps) {
        currentStep++;
        updateWizardUI();

        // Load content for the new step
        if (currentStep === 2) {
            loadDynamicVariables();
        } else if (currentStep === 3) {
            loadCredentialsForm();
        } else if (currentStep === 4) {
            loadReview();
        }
    }
}

// Navigate to previous step
function goToPreviousStep() {
    if (currentStep > 1) {
        currentStep--;
        updateWizardUI();
    }
}

// Validate current step
function validateCurrentStep() {
    if (currentStep === 1) {
        if (!wizardData.selectedAuthMethod) {
            showToast('Please select an authentication method', 'error');
            return false;
        }
    } else if (currentStep === 2) {
        // Validate dynamic variables
        const variables = collectDynamicVariables();
        if (!variables) {
            return false;
        }
        wizardData.dynamicVariables = variables;
    } else if (currentStep === 3) {
        // Validate credentials
        const credentials = collectCredentials();
        if (!credentials) {
            return false;
        }
        wizardData.credentials = credentials;
    }

    return true;
}

// Update wizard UI
function updateWizardUI() {
    // Update step indicators
    document.querySelectorAll('.wizard-step').forEach((step, index) => {
        const stepNumber = index + 1;
        step.classList.remove('active', 'completed');

        if (stepNumber < currentStep) {
            step.classList.add('completed');
        } else if (stepNumber === currentStep) {
            step.classList.add('active');
        }
    });

    // Update panels
    document.querySelectorAll('.wizard-panel').forEach((panel, index) => {
        panel.classList.remove('active');
        if (index + 1 === currentStep) {
            panel.classList.add('active');
        }
    });

    // Update navigation buttons
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const saveBtn = document.getElementById('saveBtn');

    prevBtn.style.display = currentStep === 1 ? 'none' : 'inline-flex';
    nextBtn.style.display = currentStep === totalSteps ? 'none' : 'inline-flex';
    saveBtn.style.display = currentStep === totalSteps ? 'inline-flex' : 'none';
}

// Load dynamic variables form
function loadDynamicVariables() {
    const container = document.getElementById('dynamicVariablesContainer');

    // Debug: Log current state
    console.log('🔍 Loading dynamic variables in edit mode:', isEditMode);
    console.log('🔍 Current wizardData.dynamicVariables:', wizardData.dynamicVariables);

    // Extract dynamic variables from baseUrl
    const baseUrl = wizardData.authSchema.baseUrl || '';
    const variableMatches = baseUrl.match(/\{\{([^}]+)\}\}/g);
    const baseUrlVars = variableMatches ? [...new Set(variableMatches.map(v => v.replace(/[{}]/g, '')))] : [];

    // Get additionalFields from selected auth method
    const additionalFields = wizardData.selectedAuthMethod.additionalFields || [];

    // Combine both into a single form
    const allFields = [
        // Base URL variables
        ...baseUrlVars.map(variable => ({
            key: variable,
            label: formatVariableName(variable),
            type: 'text',
            required: true,
            helpText: `This will replace {{${variable}}} in API requests`
        })),
        // Additional fields from auth method (handle both 'key' and 'name' properties)
        ...additionalFields.map(field => {
            const fieldKey = field.key || field.name; // Support both key and name
            return {
                key: fieldKey,
                label: field.label || formatVariableName(fieldKey),
                type: field.type || field.inputType || 'text',
                required: field.required !== false, // Default to true unless explicitly false
                helpText: field.helpText || '',
                placeholder: field.placeholder || `Enter ${field.label || fieldKey}`,
                default: field.default || ''
            };
        })
    ];

    if (allFields.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No dynamic variables required for this integration</p>
            </div>
        `;
        return;
    }

    container.innerHTML = allFields.map(field => {
        // Map field types to HTML input types
        let inputType = 'text';
        let pattern = '';
        let title = '';

        // Determine input type - respect explicit field type first
        if (field.type === 'url' || field.inputType === 'url') {
            inputType = 'url';
            title = 'Please enter a valid URL (e.g., https://example.com)';
        } else if (field.type === 'email' || field.inputType === 'email') {
            inputType = 'email';
            title = 'Please enter a valid email address';
        } else if (field.type === 'number' || field.inputType === 'number') {
            inputType = 'number';
        } else if (field.type === 'password' || field.inputType === 'password') {
            inputType = 'password';
        } else if (field.type === 'text' || field.type === 'string' || field.inputType === 'text') {
            // Explicitly defined as text/string - use text input
            inputType = 'text';
        } else {
            // Auto-detect only if no explicit type is defined
            const fieldName = field.key.toLowerCase();
            const fieldDefault = (field.default || '').toLowerCase();

            if (fieldName.includes('url') || fieldName.includes('uri') ||
                fieldName.includes('endpoint') || fieldName === 'domain' ||
                fieldName.includes('_url') || fieldName.includes('_uri') ||
                fieldDefault.startsWith('http://') || fieldDefault.startsWith('https://')) {
                inputType = 'url';
                title = 'Please enter a valid URL (e.g., https://example.com)';
            } else if (fieldName.includes('email') || fieldName.includes('mail')) {
                inputType = 'email';
                title = 'Please enter a valid email address';
            } else {
                inputType = 'text';
            }
        }

        // Get value: use existing value in edit mode, otherwise use default
        const fieldValue = isEditMode && wizardData.dynamicVariables[field.key]
            ? wizardData.dynamicVariables[field.key]
            : (field.default || '');

        // Debug: Log field value assignment
        console.log(`🔍 Field "${field.key}":`, {
            isEditMode,
            savedValue: wizardData.dynamicVariables[field.key],
            defaultValue: field.default,
            finalValue: fieldValue
        });

        return `
            <div class="form-group">
                <label for="var_${field.key}">
                    ${escapeHtml(field.label)} ${field.required ? '<span class="required">*</span>' : ''}
                </label>
                <input
                    type="${inputType}"
                    id="var_${field.key}"
                    name="${field.key}"
                    placeholder="${escapeHtml(field.placeholder || field.label)}"
                    value="${escapeHtml(fieldValue)}"
                    ${field.required ? 'required' : ''}
                    ${pattern ? `pattern="${pattern}"` : ''}
                    ${title ? `title="${escapeHtml(title)}"` : ''}
                    oninvalid="this.setCustomValidity('${title}')"
                    oninput="this.setCustomValidity('')"
                >
                <small class="help-text">
                    ${escapeHtml(field.helpText)}
                </small>
            </div>
        `;
    }).join('');
}

// Collect dynamic variables
function collectDynamicVariables() {
    const container = document.getElementById('dynamicVariablesContainer');
    const inputs = container.querySelectorAll('input');

    if (inputs.length === 0) {
        return {}; // No variables required
    }

    const variables = {};
    let isValid = true;
    let errorMessage = '';
    let firstInvalidField = null;

    inputs.forEach(input => {
        const value = input.value.trim();
        const isRequired = input.hasAttribute('required');
        const inputType = input.type;

        // Check HTML5 validity first
        if (!input.checkValidity()) {
            input.style.borderColor = 'var(--error-500)';
            isValid = false;
            if (!firstInvalidField) {
                firstInvalidField = input;
                errorMessage = input.validationMessage || 'Invalid input';
            }
            return;
        }

        // Check required fields
        if (isRequired && !value) {
            input.style.borderColor = 'var(--error-500)';
            isValid = false;
            if (!errorMessage) {
                errorMessage = `Please fill the ${input.placeholder || input.name} field`;
            }
            return;
        }

        // Additional validation based on input type
        if (value) {
            if (inputType === 'url') {
                try {
                    new URL(value);
                    input.style.borderColor = '';
                    variables[input.name] = value;
                } catch (e) {
                    input.style.borderColor = 'var(--error-500)';
                    isValid = false;
                    if (!errorMessage) {
                        errorMessage = `Invalid URL format. Please enter a valid URL (e.g., https://example.com)`;
                    }
                }
            } else if (inputType === 'email') {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (emailRegex.test(value)) {
                    input.style.borderColor = '';
                    variables[input.name] = value;
                } else {
                    input.style.borderColor = 'var(--error-500)';
                    isValid = false;
                    if (!errorMessage) {
                        errorMessage = 'Invalid email format';
                    }
                }
            } else {
                input.style.borderColor = '';
                variables[input.name] = value;
            }
        } else {
            input.style.borderColor = '';
        }
    });

    if (!isValid) {
        showToast(errorMessage || 'Please fill all required fields', 'error');
        // Focus on first invalid field
        if (firstInvalidField) {
            firstInvalidField.focus();
        }
        return null;
    }

    return variables;
}

// Load credentials form
function loadCredentialsForm() {
    const container = document.getElementById('credentialsContainer');
    const authMethod = wizardData.selectedAuthMethod;

    // Handle both requiredFields array and credentials object
    let credentialFields = [];
    if (authMethod.requiredFields) {
        // Old format: array of field names
        credentialFields = authMethod.requiredFields.map(field => ({
            key: field,
            label: formatVariableName(field),
            helpText: 'Required for authentication'
        }));
    } else if (authMethod.credentials) {
        // New format: object with field definitions
        credentialFields = Object.keys(authMethod.credentials).map(key => {
            const fieldDef = authMethod.credentials[key];
            return {
                key: key,
                label: fieldDef.label || formatVariableName(key),
                helpText: fieldDef.helpText || 'Required for authentication',
                placeholder: fieldDef.placeholder || `Enter ${fieldDef.label || key}`,
                inputType: fieldDef.inputType || 'text',
                required: fieldDef.required !== false // Default to true
            };
        });
    }

    if (credentialFields.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No credentials required for this authentication method</p>
            </div>
        `;
        return;
    }

    container.innerHTML = credentialFields.map(field => {
        // Use inputType from field definition, or auto-detect
        let fieldType = field.inputType || 'text';
        let title = '';

        // Only auto-detect if no explicit type is defined (fieldType is 'text' by default)
        if (fieldType === 'text' && !field.inputType) {
            const fieldName = field.key.toLowerCase();

            // Auto-detect field types based on name (more specific matching)
            if (fieldName.includes('secret') || fieldName.includes('password') || fieldName.includes('token')) {
                fieldType = 'password';
            } else if (fieldName.includes('url') || fieldName.includes('uri') ||
                      fieldName.includes('endpoint') || fieldName === 'domain' ||
                      fieldName.includes('_url') || fieldName.includes('_uri')) {
                fieldType = 'url';
                title = 'Please enter a valid URL (e.g., https://example.com)';
            } else if (fieldName.includes('email') || fieldName.includes('mail')) {
                fieldType = 'email';
                title = 'Please enter a valid email address';
            }
        }

        // Add validation hints based on type
        if (fieldType === 'url' && !title) {
            title = 'Please enter a valid URL (e.g., https://example.com)';
        } else if (fieldType === 'email' && !title) {
            title = 'Please enter a valid email address';
        }

        // Get value: use existing value in edit mode (but not for password fields)
        let fieldValue = '';
        if (isEditMode && wizardData.credentials[field.key]) {
            // Don't pre-fill password fields for security
            if (fieldType !== 'password') {
                fieldValue = wizardData.credentials[field.key];
            }
        }

        return `
            <div class="form-group">
                <label for="cred_${field.key}">
                    ${escapeHtml(field.label)} ${field.required ? '<span class="required">*</span>' : ''}
                </label>
                <input
                    type="${fieldType}"
                    id="cred_${field.key}"
                    name="${field.key}"
                    value="${escapeHtml(fieldValue)}"
                    placeholder="${escapeHtml(field.placeholder || field.label)}"
                    ${field.required && !isEditMode ? 'required' : ''}
                    ${title ? `title="${escapeHtml(title)}"` : ''}
                    ${title ? `oninvalid="this.setCustomValidity('${escapeHtml(title)}'); event.preventDefault();"` : ''}
                    oninput="this.setCustomValidity('')"
                >
                <small class="help-text">
                    ${escapeHtml(field.helpText)}
                </small>
            </div>
        `;
    }).join('');
}

// Collect credentials
function collectCredentials() {
    const container = document.getElementById('credentialsContainer');
    const inputs = container.querySelectorAll('input');

    if (inputs.length === 0) {
        return {}; // No credentials required
    }

    const credentials = {};
    let isValid = true;
    let errorMessage = '';
    let firstInvalidField = null;

    inputs.forEach(input => {
        const value = input.value.trim();
        const isRequired = input.hasAttribute('required');
        const inputType = input.type;

        // In edit mode, if password field is empty, keep existing value
        if (isEditMode && inputType === 'password' && !value && wizardData.credentials[input.name]) {
            credentials[input.name] = wizardData.credentials[input.name];
            input.style.borderColor = '';
            return;
        }

        // Check HTML5 validity first
        if (!input.checkValidity()) {
            input.style.borderColor = 'var(--error-500)';
            isValid = false;
            if (!firstInvalidField) {
                firstInvalidField = input;
                errorMessage = input.validationMessage || 'Invalid input';
            }
            return;
        }

        // Check required fields (but not in edit mode for password fields)
        if (isRequired && !value && !(isEditMode && inputType === 'password')) {
            input.style.borderColor = 'var(--error-500)';
            isValid = false;
            if (!errorMessage) {
                errorMessage = `Please fill the ${input.placeholder || input.name} field`;
            }
            return;
        }

        // Additional validation based on input type
        if (value) {
            if (inputType === 'url') {
                try {
                    new URL(value);
                    input.style.borderColor = '';
                    credentials[input.name] = value;
                } catch (e) {
                    input.style.borderColor = 'var(--error-500)';
                    isValid = false;
                    if (!errorMessage) {
                        errorMessage = 'Invalid URL format. Please enter a valid URL (e.g., https://example.com)';
                    }
                }
            } else if (inputType === 'email') {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (emailRegex.test(value)) {
                    input.style.borderColor = '';
                    credentials[input.name] = value;
                } else {
                    input.style.borderColor = 'var(--error-500)';
                    isValid = false;
                    if (!errorMessage) {
                        errorMessage = 'Invalid email format';
                    }
                }
            } else {
                input.style.borderColor = '';
                credentials[input.name] = value;
            }
        } else {
            input.style.borderColor = '';
        }
    });

    if (!isValid) {
        showToast(errorMessage || 'Please fill all required credential fields', 'error');
        // Focus on first invalid field
        if (firstInvalidField) {
            firstInvalidField.focus();
        }
        return null;
    }

    return credentials;
}

// Load review
function loadReview() {
    const container = document.getElementById('reviewDetails');

    // Set default placeholder for connection name
    const connectionNameInput = document.getElementById('connectionName');
    if (connectionNameInput && !connectionNameInput.value) {
        connectionNameInput.placeholder = `${wizardData.integrationName} (e.g., Production, Sandbox, Testing)`;
    }

    container.innerHTML = `
        <div class="review-item">
            <span class="review-label">Integration:</span>
            <span class="review-value">${escapeHtml(wizardData.integrationName)}</span>
        </div>
        <div class="review-item">
            <span class="review-label">Authentication Method:</span>
            <span class="review-value">${escapeHtml(wizardData.authMethodLabel)}</span>
        </div>
        ${Object.keys(wizardData.dynamicVariables).length > 0 ? `
            <div class="review-item">
                <span class="review-label">Dynamic Variables:</span>
                <span class="review-value">${Object.keys(wizardData.dynamicVariables).length} configured</span>
            </div>
        ` : ''}
        <div class="review-item">
            <span class="review-label">Credentials:</span>
            <span class="review-value">${Object.keys(wizardData.credentials).length} fields provided</span>
        </div>
    `;
}

// Test connection
async function testConnection() {
    const btn = document.getElementById('testConnectionBtn');
    const resultDiv = document.getElementById('testResult');

    btn.disabled = true;
    btn.textContent = 'Testing...';
    resultDiv.style.display = 'block';
    resultDiv.className = 'test-result loading';
    resultDiv.textContent = 'Testing connection...';

    try {
        const response = await fetch('/api/user-integrations/test-connection', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                integrationId: wizardData.integrationId,
                authMethodId: wizardData.authMethodId,
                configuredVariables: wizardData.dynamicVariables,
                credentials: wizardData.credentials
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            resultDiv.className = 'test-result success';
            resultDiv.textContent = '✓ Connection test successful! You can now save the connection.';
        } else {
            resultDiv.className = 'test-result error';
            resultDiv.textContent = '✗ Connection test failed: ' + (data.error || 'Unknown error');
        }
    } catch (error) {
        console.error('Error testing connection:', error);
        resultDiv.className = 'test-result error';
        resultDiv.textContent = '✗ Connection test failed: ' + error.message;
    } finally {
        btn.disabled = false;
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            Test Connection
        `;
    }
}

// Save connection
async function saveConnection() {
    const btn = document.getElementById('saveBtn');
    const originalText = btn.innerHTML;

    btn.disabled = true;
    btn.textContent = isEditMode ? 'Updating...' : 'Saving...';

    try {
        // Get connection name from input field
        const connectionNameInput = document.getElementById('connectionName');
        const connectionName = connectionNameInput.value.trim() || wizardData.integrationName;

        // Determine API endpoint and method based on mode
        const endpoint = isEditMode
            ? `/api/user-integrations/${connectionId}`
            : '/api/user-integrations/connect';
        const method = isEditMode ? 'PUT' : 'POST';

        const requestBody = {
            connectionName: connectionName,
            authMethodId: wizardData.authMethodId,
            authMethodLabel: wizardData.authMethodLabel,
            configuredVariables: wizardData.dynamicVariables,
            credentials: wizardData.credentials
        };

        // Add user and integration IDs only for create mode
        if (!isEditMode) {
            requestBody.userId = wizardData.userId;
            requestBody.integrationId = wizardData.integrationId;
        }

        const response = await fetch(endpoint, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (response.ok && data.success) {
            const successMessage = isEditMode
                ? 'Connection updated successfully!'
                : 'Connection saved successfully!';
            showToast(successMessage, 'success');
            setTimeout(() => {
                window.location.href = `/my-connections?userId=${wizardData.userId}`;
            }, 1500);
        } else {
            const errorMessage = isEditMode
                ? 'Failed to update connection'
                : 'Failed to save connection';
            showToast(data.error || errorMessage, 'error');
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    } catch (error) {
        console.error('Error saving connection:', error);
        const errorMessage = isEditMode
            ? 'Failed to update connection'
            : 'Failed to save connection';
        showToast(errorMessage, 'error');
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// Utility functions
function formatVariableName(name) {
    return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function escapeHtml(text) {
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
