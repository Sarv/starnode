# Connection Wizard - Technical Documentation

**Last Updated:** 2025-11-23

---

## 🎯 Overview

The Connection Wizard is a 4-step guided interface that helps users connect their accounts to third-party integrations. It handles authentication method selection, dynamic variable configuration, credential input, and connection testing.

---

## 📁 Files

```
public/
├── connect-integration.html    # Wizard HTML structure
├── css/
│   └── connect-integration.css # Wizard styles
└── js/
    └── connect-integration.js  # Wizard logic
```

---

## 🏗️ Architecture

### Wizard State Management

```javascript
let wizardData = {
    userId: null,              // User ID from URL params
    userName: null,            // Loaded from API
    userEmail: null,           // Loaded from API
    integrationId: null,       // Integration ID from URL params
    integrationName: null,     // Loaded from API
    selectedAuthMethod: null,  // Selected auth method object
    authMethodId: null,        // Selected auth method ID
    authMethodLabel: null,     // Selected auth method label
    dynamicVariables: {},      // Collected variables (Step 2)
    credentials: {},           // Collected credentials (Step 3)
    authSchema: null          // Full auth schema
};
```

---

## 📋 Step-by-Step Implementation

### **Step 1: Select Authentication Method**

#### HTML Structure
```html
<div class="wizard-panel active" id="step1">
    <div class="panel-header">
        <h2>Select Authentication Method</h2>
        <p>Choose how you want to authenticate with this integration</p>
    </div>
    <div id="authMethodsContainer" class="auth-methods-grid">
        <!-- Auth methods will be populated here -->
    </div>
</div>
```

#### JavaScript Implementation

**1. Load Auth Schema**
```javascript
async function loadAuthMethods() {
    const response = await fetch(`/api/integrations/${wizardData.integrationId}/auth-schema`);
    const data = await response.json();

    if (data.authSchema && data.authSchema.authMethods) {
        wizardData.authSchema = data.authSchema;
        renderAuthMethods(data.authSchema.authMethods);
    }
}
```

**Key Point:** The endpoint merges:
- Global credential fields from `auth-types-definition.json`
- Integration-specific fields from `integrations/providers/{id}/auth.schema.json`

**2. Render Auth Methods**
```javascript
function renderAuthMethods(authMethods) {
    container.innerHTML = authMethods.map(method => {
        // Get credential fields (handle both formats)
        let credentialFields = [];
        if (method.requiredFields) {
            credentialFields = method.requiredFields;
        } else if (method.credentials) {
            credentialFields = Object.keys(method.credentials);
        }

        // Get auth type badge
        const authType = method.authType || 'api-key';
        const badgeClass = authType.includes('oauth') ? 'oauth' :
                          authType.includes('basic') ? 'basic' : 'api-key';

        return `
            <div class="auth-method-card" data-method-id="${method.id}">
                <div class="auth-method-header">
                    <div class="auth-method-title">${method.label}</div>
                    <span class="auth-method-badge ${badgeClass}">
                        ${authType.toUpperCase()}
                    </span>
                </div>
                <div class="auth-method-description">
                    ${method.description || 'Standard authentication method'}
                </div>
                <div class="auth-method-features">
                    ${generateFeatureTags(method, credentialFields)}
                </div>
            </div>
        `;
    }).join('');

    // Add click handlers
    setupAuthMethodSelection();
}
```

**3. Handle Selection**
```javascript
function setupAuthMethodSelection() {
    const cards = document.querySelectorAll('.auth-method-card');

    cards.forEach(card => {
        card.addEventListener('click', () => {
            // Remove previous selection
            cards.forEach(c => c.classList.remove('selected'));

            // Mark selected
            card.classList.add('selected');

            // Store selection
            const methodId = card.dataset.methodId;
            wizardData.selectedAuthMethod = wizardData.authSchema.authMethods
                .find(m => m.id === methodId);
            wizardData.authMethodId = methodId;
            wizardData.authMethodLabel = wizardData.selectedAuthMethod.label;

            // Enable next button
            document.getElementById('nextBtn').disabled = false;
        });
    });
}
```

---

### **Step 2: Configure Dynamic Variables**

#### Purpose
Extract and collect variables from:
1. **BaseUrl Variables:** `{{variable}}` syntax in baseUrl
2. **Additional Fields:** Extra fields defined in auth method

#### Implementation

**1. Extract Variables**
```javascript
function loadDynamicVariables() {
    // Extract from baseUrl
    const baseUrl = wizardData.authSchema.baseUrl || '';
    const variableMatches = baseUrl.match(/\{\{([^}]+)\}\}/g);
    const baseUrlVars = variableMatches ?
        [...new Set(variableMatches.map(v => v.replace(/[{}]/g, '')))] : [];

    // Get additional fields
    const additionalFields = wizardData.selectedAuthMethod.additionalFields || [];

    // Combine both
    const allFields = [
        ...baseUrlVars.map(variable => ({
            key: variable,
            label: formatVariableName(variable),
            type: 'text',
            required: true,
            helpText: `This will replace {{${variable}}} in API requests`
        })),
        ...additionalFields.map(field => {
            const fieldKey = field.key || field.name; // Support both properties
            return {
                key: fieldKey,
                label: field.label || formatVariableName(fieldKey),
                type: field.type || field.inputType || 'text',
                required: field.required !== false,
                helpText: field.helpText || '',
                placeholder: field.placeholder || `Enter ${field.label || fieldKey}`,
                default: field.default || ''
            };
        })
    ];

    renderVariableFields(allFields);
}
```

**2. Field Type Auto-Detection**
```javascript
function renderVariableFields(fields) {
    container.innerHTML = fields.map(field => {
        let inputType = 'text';
        let title = '';

        // Auto-detect based on field type
        if (field.type === 'url') {
            inputType = 'url';
            title = 'Please enter a valid URL (e.g., https://example.com)';
        } else if (field.type === 'email') {
            inputType = 'email';
            title = 'Please enter a valid email address';
        } else if (field.type === 'number') {
            inputType = 'number';
        } else {
            // Auto-detect from field name
            const fieldName = field.key.toLowerCase();

            if (fieldName.includes('url') || fieldName.includes('uri') ||
                fieldName.includes('endpoint') || fieldName.includes('domain')) {
                inputType = 'url';
                title = 'Please enter a valid URL (e.g., https://example.com)';
            } else if (fieldName.includes('email') || fieldName.includes('mail')) {
                inputType = 'email';
                title = 'Please enter a valid email address';
            }
        }

        return `
            <div class="form-group">
                <label for="var_${field.key}">
                    ${escapeHtml(field.label)}
                    ${field.required ? '<span class="required">*</span>' : ''}
                </label>
                <input
                    type="${inputType}"
                    id="var_${field.key}"
                    name="${field.key}"
                    placeholder="${escapeHtml(field.placeholder || field.label)}"
                    value="${escapeHtml(field.default || '')}"
                    ${field.required ? 'required' : ''}
                    ${title ? `title="${escapeHtml(title)}"` : ''}
                    oninvalid="this.setCustomValidity('${title}')"
                    oninput="this.setCustomValidity('')"
                >
                <span class="help-text">${escapeHtml(field.helpText)}</span>
            </div>
        `;
    }).join('');
}
```

**3. Validation**
```javascript
function collectDynamicVariables() {
    const inputs = container.querySelectorAll('input');
    const variables = {};
    let isValid = true;
    let errorMessage = '';
    let firstInvalidField = null;

    inputs.forEach(input => {
        const value = input.value.trim();
        const inputType = input.type;

        // HTML5 validation check
        if (!input.checkValidity()) {
            input.style.borderColor = 'var(--error-500)';
            isValid = false;
            if (!firstInvalidField) {
                firstInvalidField = input;
                errorMessage = input.validationMessage || 'Invalid input';
            }
            return;
        }

        // Additional URL validation
        if (inputType === 'url' && value) {
            try {
                new URL(value);
                input.style.borderColor = '';
                variables[input.name] = value;
            } catch (e) {
                input.style.borderColor = 'var(--error-500)';
                isValid = false;
                if (!errorMessage) {
                    errorMessage = 'Invalid URL format. Please enter a valid URL (e.g., https://example.com)';
                }
            }
        } else {
            input.style.borderColor = '';
            variables[input.name] = value;
        }
    });

    if (!isValid) {
        showToast(errorMessage, 'error');
        if (firstInvalidField) {
            firstInvalidField.focus();
        }
        return null;
    }

    return variables;
}
```

---

### **Step 3: Enter Credentials**

#### Implementation

**1. Load Credential Fields**
```javascript
function loadCredentialsForm() {
    const method = wizardData.selectedAuthMethod;

    // Handle both formats
    let credentialFields = {};
    if (method.credentials && typeof method.credentials === 'object') {
        credentialFields = method.credentials;
    } else if (method.requiredFields) {
        // Convert array to object
        method.requiredFields.forEach(field => {
            credentialFields[field] = {
                label: formatVariableName(field),
                type: 'string',
                required: true
            };
        });
    }

    renderCredentialFields(credentialFields);
}
```

**2. Render Fields**
```javascript
function renderCredentialFields(credentials) {
    container.innerHTML = Object.entries(credentials).map(([key, field]) => {
        // Determine input type
        let inputType = 'text';
        if (field.inputType === 'password' ||
            key.toLowerCase().includes('secret') ||
            key.toLowerCase().includes('password') ||
            key.toLowerCase().includes('token')) {
            inputType = 'password';
        }

        return `
            <div class="form-group">
                <label for="cred_${key}">
                    ${escapeHtml(field.label || formatVariableName(key))}
                    ${field.required ? '<span class="required">*</span>' : ''}
                </label>
                <input
                    type="${inputType}"
                    id="cred_${key}"
                    name="${key}"
                    placeholder="${escapeHtml(field.placeholder || field.label)}"
                    ${field.required ? 'required' : ''}
                >
                <span class="help-text">${escapeHtml(field.helpText || '')}</span>
            </div>
        `;
    }).join('');
}
```

**3. Collect Credentials**
```javascript
function collectCredentials() {
    const inputs = container.querySelectorAll('input');
    const credentials = {};
    let isValid = true;

    inputs.forEach(input => {
        if (!input.checkValidity()) {
            input.style.borderColor = 'var(--error-500)';
            isValid = false;
            return;
        }

        input.style.borderColor = '';
        credentials[input.name] = input.value.trim();
    });

    if (!isValid) {
        showToast('Please fill all required credential fields', 'error');
        return null;
    }

    return credentials;
}
```

---

### **Step 4: Review & Save**

#### Features
1. Connection name input (optional)
2. Configuration summary
3. Test connection
4. Save connection

#### Implementation

**1. Load Review**
```javascript
function loadReview() {
    // Set connection name placeholder
    const connectionNameInput = document.getElementById('connectionName');
    if (connectionNameInput && !connectionNameInput.value) {
        connectionNameInput.placeholder =
            `${wizardData.integrationName} (e.g., Production, Sandbox, Testing)`;
    }

    // Display summary
    container.innerHTML = `
        <div class="review-item">
            <span class="review-label">Integration:</span>
            <span class="review-value">${escapeHtml(wizardData.integrationName)}</span>
        </div>
        <div class="review-item">
            <span class="review-label">Authentication Method:</span>
            <span class="review-value">${escapeHtml(wizardData.authMethodLabel)}</span>
        </div>
        <div class="review-item">
            <span class="review-label">Dynamic Variables:</span>
            <span class="review-value">
                ${Object.keys(wizardData.dynamicVariables).length} configured
            </span>
        </div>
        <div class="review-item">
            <span class="review-label">Credentials:</span>
            <span class="review-value">
                ${Object.keys(wizardData.credentials).length} fields provided
            </span>
        </div>
    `;
}
```

**2. Test Connection**
```javascript
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                integrationId: wizardData.integrationId,
                authMethodId: wizardData.authMethodId,
                configuredVariables: wizardData.dynamicVariables,
                credentials: wizardData.credentials
            })
        });

        const data = await response.json();

        if (data.success) {
            resultDiv.className = 'test-result success';
            resultDiv.textContent = '✓ Connection test successful!';
            showToast('Connection test successful!', 'success');
        } else {
            resultDiv.className = 'test-result error';
            resultDiv.textContent = `✗ ${data.error || 'Connection test failed'}`;
            showToast('Connection test failed', 'error');
        }
    } catch (error) {
        resultDiv.className = 'test-result error';
        resultDiv.textContent = `✗ Error: ${error.message}`;
        showToast('Failed to test connection', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Test Connection';
    }
}
```

**3. Save Connection**
```javascript
async function saveConnection() {
    const btn = document.getElementById('saveBtn');
    const originalText = btn.innerHTML;

    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        // Get connection name
        const connectionNameInput = document.getElementById('connectionName');
        const connectionName = connectionNameInput.value.trim() ||
                              wizardData.integrationName;

        const response = await fetch('/api/user-integrations/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: wizardData.userId,
                integrationId: wizardData.integrationId,
                authMethodId: wizardData.authMethodId,
                connectionName: connectionName,
                configuredVariables: wizardData.dynamicVariables,
                credentials: wizardData.credentials
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showToast('Connection saved successfully!', 'success');
            setTimeout(() => {
                window.location.href = `/user-integrations.html?userId=${wizardData.userId}`;
            }, 1500);
        } else {
            showToast(data.error || 'Failed to save connection', 'error');
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    } catch (error) {
        console.error('Error saving connection:', error);
        showToast('Failed to save connection', 'error');
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}
```

---

## ✏️ Edit Mode

The wizard supports editing existing connections. When opened in edit mode, it pre-fills all fields with existing data and changes the save behavior to update instead of create.

### Activation

**URL Format:**
```
/connect-integration.html?mode=edit&connectionId=conn_123abc
```

**From My Connections:**
```javascript
function editConnection(connectionId) {
    window.location.href = `/connect-integration.html?mode=edit&connectionId=${connectionId}`;
}
```

### State Variables

```javascript
let isEditMode = false;        // Flag for edit vs create mode
let connectionId = null;       // Connection ID being edited
```

### Initialization Flow

```javascript
async function initializeWizard() {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    connectionId = urlParams.get('connectionId');

    if (mode === 'edit' && connectionId) {
        isEditMode = true;

        // Load existing connection data
        await loadExistingConnection(connectionId);

        // Update UI for edit mode
        document.getElementById('wizardTitle').textContent = 'Edit Connection';
        document.getElementById('saveBtn').textContent = 'Update Connection';
    } else {
        // Create mode - load from URL params
        wizardData.userId = urlParams.get('userId');
        wizardData.integrationId = urlParams.get('integrationId');

        await loadUserDetails();
        await loadIntegrationDetails();
    }

    await loadAuthMethods();
}
```

### Loading Existing Connection

```javascript
async function loadExistingConnection(connId) {
    const response = await fetch(`/api/user-integrations/${connId}`);
    const data = await response.json();

    if (data.success && data.connection) {
        const connection = data.connection;

        // Populate wizard data
        wizardData.userId = connection.userId;
        wizardData.integrationId = connection.integrationId;
        wizardData.integrationName = connection.integrationName;
        wizardData.authMethodId = connection.authMethodId;
        wizardData.authMethodLabel = connection.authMethodLabel;
        wizardData.dynamicVariables = connection.configuredVariables || {};
        wizardData.credentials = connection.credentials?.decrypted || {};

        // Load user and integration details
        await loadUserDetails();
        await loadIntegrationDetails();

        // Pre-fill connection name
        setTimeout(() => {
            const connectionNameInput = document.getElementById('connectionName');
            if (connectionNameInput && connection.connectionName) {
                connectionNameInput.value = connection.connectionName;
            }
        }, 500);
    }
}
```

### Step 1: Auto-Select Auth Method

```javascript
async function loadAuthMethods() {
    const response = await fetch(`/api/integrations/${wizardData.integrationId}/auth-schema`);
    const data = await response.json();

    wizardData.authSchema = data.authSchema;
    renderAuthMethods(data.authSchema.authMethods);

    // In edit mode, auto-select existing auth method
    if (isEditMode && wizardData.authMethodId) {
        setTimeout(() => {
            const selectedMethod = data.authSchema.authMethods.find(
                m => m.id === wizardData.authMethodId
            );
            if (selectedMethod) {
                wizardData.selectedAuthMethod = selectedMethod;

                // Add selected class to card
                const card = document.querySelector(
                    `.auth-method-card[data-method-id="${wizardData.authMethodId}"]`
                );
                if (card) {
                    card.classList.add('selected');
                }
            }
        }, 100);
    }
}
```

### Step 2: Pre-fill Dynamic Variables

```javascript
// In field rendering
const fieldValue = isEditMode && wizardData.dynamicVariables[field.key]
    ? wizardData.dynamicVariables[field.key]
    : (field.default || '');

return `
    <input
        type="${inputType}"
        id="var_${field.key}"
        value="${escapeHtml(fieldValue)}"
        ${field.required ? 'required' : ''}
    >
`;
```

### Step 3: Pre-fill Credentials (Smart Password Handling)

```javascript
// Pre-fill non-password fields only
let fieldValue = '';
if (isEditMode && wizardData.credentials[field.key]) {
    // Don't pre-fill password fields for security
    if (fieldType !== 'password') {
        fieldValue = wizardData.credentials[field.key];
    }
}

return `
    <input
        type="${fieldType}"
        id="cred_${field.key}"
        value="${escapeHtml(fieldValue)}"
        ${field.required && !isEditMode ? 'required' : ''}
    >
`;
```

**Smart Password Collection:**
```javascript
function collectCredentials() {
    inputs.forEach(input => {
        const value = input.value.trim();
        const inputType = input.type;

        // In edit mode, if password field is empty, keep existing value
        if (isEditMode && inputType === 'password' && !value &&
            wizardData.credentials[input.name]) {
            credentials[input.name] = wizardData.credentials[input.name];
            return;
        }

        // Otherwise, collect new value
        if (value) {
            credentials[input.name] = value;
        }
    });

    return credentials;
}
```

### Save vs Update

```javascript
async function saveConnection() {
    const connectionName = document.getElementById('connectionName').value.trim()
        || wizardData.integrationName;

    // Determine endpoint and method based on mode
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
    });

    if (response.ok) {
        const message = isEditMode
            ? 'Connection updated successfully!'
            : 'Connection saved successfully!';
        showToast(message, 'success');

        setTimeout(() => {
            window.location.href = `/my-connections.html?userId=${wizardData.userId}`;
        }, 1500);
    }
}
```

### UI Changes in Edit Mode

| Element | Create Mode | Edit Mode |
|---------|-------------|-----------|
| Page Title | "Connect Integration" | "Edit Connection" |
| Button Text | "Save Connection" | "Update Connection" |
| Button Action | "Saving..." | "Updating..." |
| Header Text | "Connecting..." | "Editing..." |
| Redirect After | User Integrations | My Connections |
| Password Required | Yes | No (optional) |
| Pre-fill Data | No | Yes |

### Security Considerations

**Password Handling:**
- ✅ Password fields are **never** pre-filled in edit mode
- ✅ Empty password fields preserve existing passwords
- ✅ Only updates password when user explicitly enters new value
- ✅ Prevents password exposure in browser

**Data Validation:**
- ✅ Required fields still validated (except passwords in edit mode)
- ✅ URL and email validation still applies
- ✅ Cannot submit without valid data

### Testing Checklist

- [ ] Edit button appears on all connection cards
- [ ] Clicking edit redirects to wizard with correct URL params
- [ ] Page title changes to "Edit Connection"
- [ ] Auth method is pre-selected
- [ ] Dynamic variables are pre-filled
- [ ] Non-password credentials are pre-filled
- [ ] Password fields are empty
- [ ] Leaving password empty keeps existing password
- [ ] Entering new password updates it
- [ ] Update button shows "Updating..." during save
- [ ] Success message shows "Connection updated successfully!"
- [ ] Redirects to My Connections after success
- [ ] Connection reflects updated values

---

## 🎨 Styling

### Key CSS Classes

```css
/* Wizard Progress Steps */
.wizard-steps {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px 24px;
}

.wizard-step.active .step-number {
    background: var(--primary-600);
    color: white;
}

.wizard-step.completed .step-number {
    background: var(--success-500);
    color: white;
}

/* Auth Method Cards */
.auth-method-card {
    padding: 20px;
    border: 2px solid var(--gray-200);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
}

.auth-method-card.selected {
    border-color: var(--primary-600);
    background: rgba(59, 130, 246, 0.05);
    box-shadow: 0 4px 16px rgba(59, 130, 246, 0.15);
}

/* Form Fields */
.form-group input:focus {
    outline: none;
    border-color: var(--primary-600);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Validation */
input:invalid {
    border-color: var(--error-500);
}

/* Test Results */
.test-result.success {
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid var(--success-500);
    color: var(--success-600);
}

.test-result.error {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid var(--error-500);
    color: var(--error-600);
}
```

---

## 🔧 Key Technical Decisions

### 1. **Schema Merging Strategy**
- Server-side merging of auth-types-definition + integration-specific
- Integration fields override global fields
- Ensures consistency and maintainability

### 2. **Field Property Support**
- Support both `key` and `name` for field identifiers
- Backward compatibility with existing schemas
- Flexible schema format

### 3. **Validation Approach**
- HTML5 validation for basic checks (required, type, pattern)
- JavaScript validation for complex rules (URL parsing)
- Custom error messages for better UX

### 4. **State Management**
- Global `wizardData` object for wizard state
- State persists across steps
- Easy to debug and maintain

### 5. **Event Handling**
- Separate setup functions for event listeners
- Clear separation of concerns
- Easy to test and modify

---

## 🐛 Common Issues & Solutions

### Issue 1: Auth Methods Not Loading
**Symptom:** "Failed to load authentication methods" error

**Causes:**
- Integration auth.schema.json file missing
- Invalid JSON in auth schema
- Server endpoint error

**Solution:**
```bash
# Check if file exists
ls integrations/providers/{integration-id}/auth.schema.json

# Validate JSON
cat integrations/providers/{integration-id}/auth.schema.json | python -m json.tool

# Check server logs
tail -f /tmp/integration-server.log
```

### Issue 2: Field Validation Not Working
**Symptom:** Form submits even with invalid data

**Causes:**
- Missing `required` attribute
- Incorrect input type
- Event handler not attached

**Solution:**
- Ensure HTML5 attributes are set: `required`, `type="url"`, `pattern`
- Check `input.checkValidity()` is called
- Verify custom validation functions

### Issue 3: Credentials Not Merging
**Symptom:** Missing credential fields in Step 3

**Causes:**
- Server not merging schemas
- Auth type not found in auth-types-definition.json
- Credential field property mismatch

**Solution:**
- Check server merge logic in `/api/integrations/:id/auth-schema`
- Verify auth type exists in auth-types-definition.json
- Ensure consistent property names (use `credentials` object)

---

## 📊 Performance Considerations

1. **Lazy Loading:** Load auth schema only when needed
2. **Debouncing:** Debounce validation on input fields
3. **Caching:** Cache auth schema for session
4. **Minimal Reflows:** Batch DOM updates
5. **Event Delegation:** Use for dynamic elements

---

## 🔒 Security Best Practices

1. **Client-Side:**
   - Never log credentials to console
   - Clear sensitive data on page unload
   - Use HTTPS for all API calls
   - Validate all inputs

2. **Server-Side:**
   - Encrypt credentials before storage
   - Validate all inputs
   - Use parameterized queries
   - Implement rate limiting

---

## 🎯 Testing Checklist

- [ ] All 4 steps navigate correctly
- [ ] Progress indicator updates
- [ ] Auth methods load and render
- [ ] Auth method selection works
- [ ] Dynamic variables extracted correctly
- [ ] Field validation works (URL, email, required)
- [ ] Error messages display properly
- [ ] Credentials collected securely
- [ ] Connection name saves correctly
- [ ] Test connection works
- [ ] Save redirects properly
- [ ] Error handling works
- [ ] Responsive design works

---

## 📚 Related Documentation

- [User Connection Management](./USER-CONNECTION-MANAGEMENT.md)
- [API Endpoints](./API-ENDPOINTS.md)
- [Dynamic Variables Guide](./DYNAMIC_VARIABLES.md)
