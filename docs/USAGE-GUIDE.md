# Quick Usage Guide

## For GUI Developers: How to Use These Files

### 1. Loading Auth Type Options

When admin clicks "Add Auth Method", load from `auth-types-definition.json`:

```javascript
// Load auth types
const authTypes = require('./auth-types-definition.json');

// Display in dropdown/list
const authTypeOptions = Object.keys(authTypes.authTypes).map(key => ({
  value: key,
  label: authTypes.authTypes[key].label,
  description: authTypes.authTypes[key].description,
  category: authTypes.authTypes[key].category
}));

// Show to admin:
// - API Key (Header)
// - Bearer Token
// - OAuth 2.0 - Authorization Code
// etc.
```

---

### 2. Showing Configuration Fields

When admin selects an auth type, show its `configOptions`:

```javascript
// Admin selected "oauth2_authorization_code"
const selectedAuthType = authTypes.authTypes['oauth2_authorization_code'];
const configFields = selectedAuthType.configOptions;

// Generate form fields dynamically
Object.keys(configFields).forEach(fieldKey => {
  const field = configFields[fieldKey];

  // Create form input based on field.type:
  // - string → text input
  // - boolean → checkbox
  // - array → multi-input or tags
  // - object → JSON editor

  // Use field.options for dropdowns
  // Use field.default for initial value
  // Use field.required for validation
  // Show field.helpText as help text
  // Show field.examples as placeholder/examples
});
```

**Example GUI Form:**

```
┌─────────────────────────────────────────────────┐
│ Authorization URL *                             │
│ ┌─────────────────────────────────────────────┐ │
│ │ https://...                                 │ │
│ └─────────────────────────────────────────────┘ │
│ ℹ️ URL where users authorize your app          │
│ Examples: https://accounts.google.com/...      │
├─────────────────────────────────────────────────┤
│ Token URL *                                     │
│ ┌─────────────────────────────────────────────┐ │
│ │ https://...                                 │ │
│ └─────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│ Scopes                                          │
│ ┌─────────────────────────────────────────────┐ │
│ │ api, read, write                            │ │
│ └─────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│ Scope Separator                                 │
│ ┌───────────┐                                   │
│ │ Space   ▼ │                                   │
│ └───────────┘                                   │
│   Options: Space, Comma, Plus                   │
├─────────────────────────────────────────────────┤
│ ☑ Enable PKCE                                   │
├─────────────────────────────────────────────────┤
│ ☑ Enable Token Refresh                          │
├─────────────────────────────────────────────────┤
│ Refresh Token URL                               │
│ ┌─────────────────────────────────────────────┐ │
│ │ https://...                                 │ │
│ └─────────────────────────────────────────────┘ │
│ ℹ️ Only shown because refresh is enabled       │
└─────────────────────────────────────────────────┘
```

---

### 3. Handling Conditional Fields

```javascript
// Show field only if dependency is met
if (field.dependsOn) {
  const dependentField = field.dependsOn;
  const dependentFieldKey = Object.keys(dependentField)[0];
  const requiredValue = dependentField[dependentFieldKey];

  // Only show field if parent field has required value
  if (formValues[dependentFieldKey] === requiredValue) {
    showField(fieldKey);
  }
}
```

**Example:**
```javascript
// refreshTokenUrl has dependsOn: { tokenRefreshEnabled: true }
// So only show refreshTokenUrl field when tokenRefreshEnabled checkbox is checked
```

---

### 4. Customizing Credential Labels

Show default credential fields with option to customize:

```javascript
const credentialFields = selectedAuthType.credentialFields;

// For each credential field, allow admin to customize label
Object.keys(credentialFields).forEach(fieldKey => {
  const defaultField = credentialFields[fieldKey];

  // Show in GUI:
  // Field: clientId
  // Default Label: "Client ID"
  // Custom Label: [___________] (admin can override)
  // Help Text: [___________] (admin can override)
});
```

**Example GUI:**

```
┌─────────────────────────────────────────────────┐
│ Credential Fields Configuration                 │
├─────────────────────────────────────────────────┤
│ Field: clientId                                 │
│ Default Label: "Client ID"                      │
│                                                 │
│ Custom Label (optional):                        │
│ ┌─────────────────────────────────────────────┐ │
│ │ Consumer Key                                │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Help Text (optional):                           │
│ ┌─────────────────────────────────────────────┐ │
│ │ Get this from Connected App settings       │ │
│ └─────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│ Field: clientSecret                             │
│ Default Label: "Client Secret"                  │
│                                                 │
│ Custom Label (optional):                        │
│ ┌─────────────────────────────────────────────┐ │
│ │ Consumer Secret                             │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

---

### 5. Saving Software Template

When admin clicks "Save", create JSON structure:

```javascript
const softwareTemplate = {
  softwareId: generateId(),
  softwareName: adminInput.softwareName,
  baseUrl: adminInput.baseUrl,
  authMethods: [
    {
      id: generateId(),
      authType: selectedAuthTypeKey,  // e.g., "oauth2_authorization_code"
      label: adminInput.authMethodLabel,
      isDefault: true,
      priority: 1,

      config: {
        // Values from configOptions form
        authorizationUrl: adminInput.authorizationUrl,
        tokenUrl: adminInput.tokenUrl,
        scopes: adminInput.scopes,
        // ... all other config fields
      },

      credentials: {
        // Only include if admin customized labels
        clientId: {
          label: adminInput.customClientIdLabel || undefined,
          helpText: adminInput.customClientIdHelp || undefined
        }
        // ... other customized credentials
      },

      additionalFields: adminInput.additionalFields || []
    }
  ]
};

// Save this template to database or file
saveSoftwareTemplate(softwareTemplate);
```

---

### 6. End-User Connection Form

When end-user connects their account:

```javascript
// Load software template
const template = loadSoftwareTemplate('salesforce');
const authMethod = template.authMethods.find(m => m.isDefault);

// Get auth type definition
const authTypeDef = authTypes.authTypes[authMethod.authType];

// Merge default fields with customizations
const credentialFields = {};
Object.keys(authTypeDef.credentialFields).forEach(fieldKey => {
  const defaultField = authTypeDef.credentialFields[fieldKey];
  const customField = authMethod.credentials?.[fieldKey] || {};

  credentialFields[fieldKey] = {
    ...defaultField,
    label: customField.label || defaultField.label,
    helpText: customField.helpText || defaultField.helpText,
    placeholder: customField.placeholder || defaultField.placeholder
  };
});

// Generate form for user
generateUserForm(credentialFields);

// Also show any additionalFields from template
authMethod.additionalFields?.forEach(field => {
  addFormField(field);
});
```

**Example User Form:**

```
┌─────────────────────────────────────────────────┐
│ Connect to Salesforce                           │
├─────────────────────────────────────────────────┤
│ Consumer Key *                                  │
│ ┌─────────────────────────────────────────────┐ │
│ │                                             │ │
│ └─────────────────────────────────────────────┘ │
│ ℹ️ Get this from Connected App settings        │
├─────────────────────────────────────────────────┤
│ Consumer Secret *                               │
│ ┌─────────────────────────────────────────────┐ │
│ │ ••••••••••••••••••••                        │ │
│ └─────────────────────────────────────────────┘ │
│ ℹ️ Secret from your Salesforce Connected App   │
├─────────────────────────────────────────────────┤
│ Instance URL                                    │
│ ┌─────────────────────────────────────────────┐ │
│ │ https://login.salesforce.com                │ │
│ └─────────────────────────────────────────────┘ │
│ ℹ️ Use https://test.salesforce.com for sandbox │
├─────────────────────────────────────────────────┤
│             [ Cancel ]  [ Connect Account ]     │
└─────────────────────────────────────────────────┘
```

---

### 7. Executing Authentication

When user submits credentials:

```javascript
// Get auth method config and user credentials
const config = authMethod.config;
const credentials = userInput;

// Execute based on auth type
switch (authMethod.authType) {
  case 'api_key_header':
    // Simply store API key, inject in requests
    storeCredentials(userId, softwareId, {
      apiKey: credentials.apiKey
    });
    break;

  case 'bearer_token':
    storeCredentials(userId, softwareId, {
      token: credentials.token
    });
    break;

  case 'basic_auth':
    storeCredentials(userId, softwareId, {
      username: credentials.username,
      password: encrypt(credentials.password)
    });
    break;

  case 'oauth2_authorization_code':
    // Initiate OAuth flow
    const authUrl = buildOAuthUrl(
      config.authorizationUrl,
      credentials.clientId,
      config.scopes,
      config.additionalAuthParams
    );

    // Redirect user to authUrl
    // Handle callback
    // Exchange code for tokens at config.tokenUrl
    // Store tokens
    break;

  // ... other auth types
}
```

---

### 8. Making Authenticated Requests

When making API calls to the integrated software:

```javascript
async function makeRequest(userId, softwareId, endpoint, method, body) {
  // Load software template
  const template = loadSoftwareTemplate(softwareId);
  const authMethod = template.authMethods.find(m => m.isDefault);

  // Load user's stored credentials
  const storedCreds = loadCredentials(userId, softwareId);

  // Get auth type definition
  const authTypeDef = authTypes.authTypes[authMethod.authType];

  // Build request based on auth type
  const headers = {};
  const queryParams = {};

  // Inject authentication
  switch (authMethod.authType) {
    case 'api_key_header':
      const headerName = authMethod.config.headerName;
      const prefix = authMethod.config.prefix || '';
      headers[headerName] = prefix + storedCreds.apiKey;
      break;

    case 'bearer_token':
      headers['Authorization'] = 'Bearer ' + storedCreds.token;
      break;

    case 'basic_auth':
      const encoded = base64Encode(
        storedCreds.username + ':' + decrypt(storedCreds.password)
      );
      headers['Authorization'] = 'Basic ' + encoded;
      break;

    case 'oauth2_authorization_code':
      // Check if token expired
      if (isTokenExpired(storedCreds.expiresAt)) {
        // Refresh token
        const newTokens = await refreshOAuthToken(
          authMethod.config.refreshTokenUrl,
          storedCreds.refreshToken,
          storedCreds.clientId,
          storedCreds.clientSecret
        );
        storedCreds.accessToken = newTokens.access_token;
        updateStoredCredentials(userId, softwareId, storedCreds);
      }
      headers['Authorization'] = 'Bearer ' + storedCreds.accessToken;
      break;

    case 'custom_headers':
      authMethod.config.headers.forEach(headerConfig => {
        const value = storedCreds[headerConfig.credentialKey];
        const prefix = headerConfig.prefix || '';
        headers[headerConfig.headerName] = prefix + value;
      });
      break;

    // ... other auth types
  }

  // Make request
  const url = template.baseUrl + endpoint;
  return fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
}
```

---

## Testing Authentication

Add a test endpoint in software template:

```json
{
  "validation": {
    "testEndpoint": "/api/test",
    "testMethod": "GET",
    "expectedStatus": [200, 201]
  }
}
```

Test after user connects:

```javascript
async function testConnection(userId, softwareId) {
  const template = loadSoftwareTemplate(softwareId);
  const authMethod = template.authMethods.find(m => m.isDefault);

  if (authMethod.validation) {
    const response = await makeRequest(
      userId,
      softwareId,
      authMethod.validation.testEndpoint,
      authMethod.validation.testMethod
    );

    const isValid = authMethod.validation.expectedStatus.includes(
      response.status
    );

    return isValid;
  }
}
```

---

## User Connection Management Flow

### Complete End-User Journey

The platform now has a complete user-facing interface for managing connections:

#### Phase 1: Browse Integrations
```javascript
// User visits: /user-integrations.html

// Load active integrations for user
async function loadUserIntegrations(userId) {
  // Get all active integrations
  const integrations = await fetch('/api/integrations').then(r => r.json());
  const activeIntegrations = integrations.filter(i => i.status === 'active');

  // Get user's existing connections
  const connections = await fetch(`/api/user-integrations/my-connections?userId=${userId}`)
    .then(r => r.json());

  // Display integrations with connection status
  activeIntegrations.forEach(integration => {
    const userConnections = connections.filter(c => c.integrationId === integration.id);

    // Show "Connect" or "View + Connect Again" buttons
    displayIntegrationCard(integration, userConnections);
  });
}
```

#### Phase 2: Connection Wizard (4 Steps)

**Step 1: Select Authentication Method**
```javascript
// Load auth schema for integration
const authSchema = await fetch(`/api/integrations/${integrationId}/auth-schema`)
  .then(r => r.json());

// Display auth methods as cards
authSchema.authMethods.forEach(method => {
  displayAuthMethodCard({
    id: method.id,
    type: method.type,
    label: method.label,
    description: method.description
  });
});
```

**Step 2: Configure Dynamic Variables**
```javascript
// Extract variables from baseUrl (e.g., {{instance_url}})
const variables = extractVariables(integration.baseUrl);

// Merge with additionalFields from auth method
const allFields = [...variables, ...authMethod.additionalFields];

// Generate form with validation
allFields.forEach(field => {
  generateFormField({
    name: field.name,
    label: field.label,
    type: field.type,
    required: field.required,
    placeholder: field.placeholder
  });
});
```

**Step 3: Enter Credentials**
```javascript
// Get credential fields from merged schema
const credentialFields = authMethod.fields;

// Generate credential form
credentialFields.forEach(field => {
  const inputType = field.type === 'password' ? 'password' : 'text';

  generateFormField({
    name: field.name,
    label: field.label,
    type: inputType,
    required: field.required,
    description: field.description
  });
});
```

**Step 4: Review & Save**
```javascript
// Save connection with all collected data
async function saveConnection() {
  const connectionName = document.getElementById('connectionName').value.trim()
    || wizardData.integrationName;

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

  if (response.ok) {
    // Redirect to My Connections
    window.location.href = '/my-connections.html';
  }
}
```

#### Phase 3: Manage Connections

**List User Connections**
```javascript
// User visits: /my-connections.html

async function loadMyConnections(userId) {
  const response = await fetch(`/api/user-integrations/my-connections?userId=${userId}`);
  const data = await response.json();

  // Display statistics
  displayStats({
    active: data.stats.active,
    total: data.stats.total,
    recent: data.stats.recent
  });

  // Display connection cards
  data.connections.forEach(connection => {
    displayConnectionCard({
      connectionId: connection.connectionId,
      connectionName: connection.connectionName,
      integrationName: connection.integrationName,
      authMethod: connection.authMethodLabel,
      status: connection.status,
      lastTestDate: connection.lastTestDate,
      icon: connection.integration?.iconUrl
    });
  });
}
```

**Test Connection**
```javascript
async function testConnection(connectionId) {
  const response = await fetch(`/api/user-integrations/${connectionId}/test`, {
    method: 'POST'
  });

  const result = await response.json();

  if (result.success) {
    showSuccessMessage('Connection test successful!');
    // Update UI with last test date
    updateConnectionCard(connectionId, {
      lastTestStatus: 'success',
      lastTestDate: new Date().toISOString()
    });
  } else {
    showErrorMessage(result.testResult.errorMessage);
  }
}
```

**Delete Connection**
```javascript
async function deleteConnection(connectionId) {
  if (!confirm('Are you sure you want to delete this connection?')) {
    return;
  }

  const response = await fetch(`/api/user-integrations/${connectionId}`, {
    method: 'DELETE'
  });

  if (response.ok) {
    showSuccessMessage('Connection deleted successfully');
    // Remove from UI
    removeConnectionCard(connectionId);
  }
}
```

### Multiple Connections Support

Users can create multiple connections for the same integration:

```javascript
// Example: User has 3 Salesforce connections
const salesforceConnections = [
  {
    connectionName: "Salesforce Production",
    integrationId: "salesforce",
    authMethodId: "oauth2",
    credentials: { /* production creds */ }
  },
  {
    connectionName: "Salesforce Sandbox",
    integrationId: "salesforce",
    authMethodId: "oauth2",
    credentials: { /* sandbox creds */ }
  },
  {
    connectionName: "Salesforce Testing",
    integrationId: "salesforce",
    authMethodId: "api-key",
    credentials: { /* testing creds */ }
  }
];
```

### State Management in Wizard

```javascript
// Global state object
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

// Update state as user progresses
function updateWizardState(updates) {
  wizardData = { ...wizardData, ...updates };
}
```

### Schema Merging

The system merges global auth types with integration-specific schemas:

```javascript
// Server-side merging (server.js)
app.get('/api/integrations/:id/auth-schema', async (req, res) => {
  const integrationId = req.params.id;

  // Load global auth types
  const authTypes = require('./auth-types-definition.json');

  // Load integration-specific auth schema
  const authSchema = require(`./integrations/providers/${integrationId}/auth-schema.json`);

  // Merge auth methods
  const mergedMethods = authSchema.authMethods.map(method => {
    const globalAuthType = authTypes.authTypes[method.type];

    return {
      id: method.id,
      type: method.type,
      label: method.label || globalAuthType.label,
      description: method.description || globalAuthType.description,
      // Merge credential fields
      fields: [
        ...globalAuthType.credentialFields.map(f => ({ ...f })),
        ...(method.fields || [])
      ],
      // Merge additional fields
      additionalFields: [
        ...(globalAuthType.additionalFields || []),
        ...(method.additionalFields || [])
      ]
    };
  });

  res.json({
    integration: { /* integration data */ },
    authMethods: mergedMethods
  });
});
```

---

## Summary

**Admin Flow:**
1. Select auth type → Load `configOptions`
2. Fill config form → Store in software template
3. Optionally customize credential labels
4. Save template

**User Flow (New!):**
1. Browse integrations → Select integration
2. **4-Step Wizard:**
   - Step 1: Choose auth method
   - Step 2: Configure variables
   - Step 3: Enter credentials
   - Step 4: Name & test connection
3. Manage connections → Test/delete/view
4. Make API calls → Inject auth automatically

**Runtime:**
1. Load template + stored credentials
2. Build authenticated request based on auth type
3. Handle token refresh for OAuth
4. Make API call
