# API Configuration Guide

**Last Updated:** December 13, 2025
**Purpose:** Complete guide for API Configuration feature - how APIs are configured, saved, and tested

---

## Table of Contents

1. [Overview](#overview)
2. [Data Flow](#data-flow)
3. [File Structure](#file-structure)
4. [API Configuration Storage](#api-configuration-storage)
5. [Important Functions](#important-functions)
6. [Dynamic Variables](#dynamic-variables)
7. [Saving Process](#saving-process)
8. [Loading Process](#loading-process)
9. [Testing Process](#testing-process)

---

## Overview

API Configuration page allows users to:
- Configure API endpoints for integration features
- Set HTTP method, URL, headers, query parameters, request body
- Use dynamic variables like `{{sub_domain}}` in configurations
- Save configurations to Elasticsearch
- Test APIs with real user credentials

**Page URL Format:**
```
/api-configuration?integrationId=freshdesk&featureId=tickets&fieldId=title
```

---

## Data Flow

```
User Input → Frontend Validation → API Call → Elasticsearch Storage
     ↓                                              ↓
  Display ←──────── Load from ES ←──────────────────┘
     ↓
  Test API → Merge with Connection → Execute → Show Response
```

---

## File Structure

### Frontend Files

**1. EJS Template**
- **File:** `views/api-configuration.ejs`
- **Purpose:** HTML structure for API configuration page
- **Key Sections:**
  - Basic configuration (Method, URL)
  - Headers configuration
  - Query parameters
  - Request body (JSON/Form/Raw)
  - Response mapping
  - Test API modal

**2. JavaScript**
- **File:** `public/js/api-configuration.js`
- **Purpose:** Handle all client-side logic
- **Key Functions:**
  - `saveApiConfiguration()` - Save config to server
  - `loadApiConfiguration()` - Load existing config
  - `testApi()` - Test API with user connection
  - `addHeader()`, `addQueryParam()` - Dynamic form fields

**3. CSS**
- **File:** `public/css/api-configuration.css`
- **Purpose:** Styling for configuration page and test modal

### Backend Files

**1. Server Routes**
- **File:** `server.js`
- **Endpoints:**
  - `GET /api/integrations/:id/features/:fid/fields/:fieldId/api-config` - Load config
  - `POST /api/integrations/:id/features/:fid/fields/:fieldId/api-config` - Save config
  - `DELETE /api/integrations/:id/features/:fid/fields/:fieldId/api-config` - Delete config
  - `POST /api/integrations/:id/features/:fid/fields/:fieldId/test-api` - Test API

**2. Elasticsearch Service**
- **File:** `services/elasticsearch.js`
- **Index:** `integration_feature_configs`

---

## API Configuration Storage

### Elasticsearch Index Structure

**Index Name:** `integration_feature_configs`

**Document ID Format:**
```
{integrationId}_{featureId}_{fieldId}
```

**Example:**
```
freshdesk_tickets_title
slack_get_conversation_api
```

### Document Schema

```javascript
{
  configId: "freshdesk_tickets_title",
  integrationId: "freshdesk",
  featureId: "tickets",
  featureName: "Tickets",
  apiConfig: {
    method: "POST",
    url: "{{sub_domain}}.freshdesk.com/api/v2/tickets",
    headers: [
      { key: "Content-Type", value: "application/json" }
    ],
    queryParams: [
      { key: "limit", value: "100" }
    ],
    bodyType: "json",
    body: {
      json: {
        subject: "{{subject}}",
        description: "{{description}}",
        priority: 1
      }
    },
    authMethodRef: "basic_auth_api_key",
    responseMapping: {
      successPath: "id",
      errorPath: "errors"
    }
  },
  staticFieldValues: {},
  enabled: true,
  createdAt: "2025-12-13T10:00:00.000Z",
  updatedAt: "2025-12-13T10:00:00.000Z"
}
```

---

## Important Functions

### 1. Save API Configuration

**Location:** `server.js` (lines ~1920-1970)

**Endpoint:** `POST /api/integrations/:integrationId/features/:featureId/fields/:fieldId/api-config`

**Request Body:**
```javascript
{
  method: "POST",
  url: "{{sub_domain}}.freshdesk.com/api/v2/contacts",
  headers: [
    { key: "Content-Type", value: "application/json" }
  ],
  queryParams: [
    { key: "include", value: "stats" }
  ],
  bodyType: "json",
  body: { json: { /* ... */ } },
  authMethodRef: "basic_auth",
  responseMapping: { /* ... */ }
}
```

**Code:**
```javascript
app.post('/api/integrations/:integrationId/features/:featureId/fields/:fieldId/api-config', async (req, res) => {
    try {
        const { integrationId, featureId, fieldId } = req.params;
        const apiConfig = req.body;

        // Create unique config ID
        const configId = `${integrationId}_${featureId}_${fieldId}`;

        // Get feature name from integration schema
        const integrationPath = path.join(__dirname, 'integrations/providers', integrationId, 'integration.json');
        const integration = JSON.parse(fs.readFileSync(integrationPath, 'utf8'));
        const feature = integration.features?.find(f => f.id === featureId);

        // Save to Elasticsearch
        const result = await elasticsearch.client.index({
            index: elasticsearch.INDEXES.FEATURE_CONFIGS,
            id: configId,
            body: {
                configId,
                integrationId,
                featureId,
                featureName: feature?.name || featureId,
                apiConfig: apiConfig,
                staticFieldValues: {},
                enabled: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        });

        res.json({
            success: true,
            configId,
            message: 'API configuration saved successfully'
        });
    } catch (error) {
        console.error('Error saving API configuration:', error);
        res.status(500).json({ error: 'Failed to save API configuration' });
    }
});
```

**Key Points:**
- Uses integration ID + feature ID + field ID as unique identifier
- Stores complete API configuration including headers, params, body
- Timestamps automatically added
- Overwrites existing config with same ID

---

### 2. Load API Configuration

**Location:** `server.js` (lines ~1900-1918)

**Endpoint:** `GET /api/integrations/:integrationId/features/:featureId/fields/:fieldId/api-config`

**Code:**
```javascript
app.get('/api/integrations/:integrationId/features/:featureId/fields/:fieldId/api-config', async (req, res) => {
    try {
        const { integrationId, featureId, fieldId } = req.params;
        const configId = `${integrationId}_${featureId}_${fieldId}`;

        const result = await elasticsearch.client.get({
            index: elasticsearch.INDEXES.FEATURE_CONFIGS,
            id: configId
        });

        res.json(result._source.apiConfig);
    } catch (error) {
        if (error.meta?.statusCode === 404) {
            return res.status(404).json({ error: 'Configuration not found' });
        }
        res.status(500).json({ error: 'Failed to load API configuration' });
    }
});
```

**Response:**
```json
{
  "method": "POST",
  "url": "{{sub_domain}}.freshdesk.com/api/v2/contacts",
  "headers": [ /* ... */ ],
  "queryParams": [ /* ... */ ],
  "bodyType": "json",
  "body": { /* ... */ }
}
```

---

### 3. Test API Configuration

**Location:** `server.js` (lines 2023-2150)

**Endpoint:** `POST /api/integrations/:integrationId/features/:featureId/fields/:fieldId/test-api`

**Request:**
```javascript
{
  userId: "user_123",
  connectionId: "conn_456",
  variableValues: {
    sub_domain: "mycompany",
    custom_var: "value"
  }
}
```

**Process:**
```javascript
app.post('/api/integrations/:integrationId/features/:featureId/fields/:fieldId/test-api', async (req, res) => {
    try {
        const { integrationId, featureId, fieldId } = req.params;
        const { userId, connectionId, variableValues = {} } = req.body;

        // 1. Load API configuration (saved or template)
        const featureConfigId = `${integrationId}_${featureId}_${fieldId}`;
        let apiConfig;
        try {
            const savedConfig = await elasticsearch.client.get({
                index: elasticsearch.INDEXES.FEATURE_CONFIGS,
                id: featureConfigId
            });
            apiConfig = savedConfig._source.apiConfig;
        } catch (error) {
            // Fallback to template
            const apiSchemaPath = path.join(__dirname, 'integrations/providers', integrationId, 'api.schema.json');
            const apiSchema = JSON.parse(fs.readFileSync(apiSchemaPath, 'utf8'));
            apiConfig = apiSchema.apis.find(a => a.featureId === featureId && a.fieldId === fieldId);
        }

        // 2. Get user's connection
        const connection = await elasticsearch.getConnectionById(connectionId);

        // 3. Decrypt credentials
        const encryptionManager = require('./services/encryption');
        if (connection.credentials && connection.credentials.encrypted) {
            connection.credentials = encryptionManager.decrypt(connection.credentials.encrypted);
        }

        // 4. Load authentication schemas
        const authSchemaPath = path.join(__dirname, 'integrations/providers', integrationId, 'auth.schema.json');
        const authSchema = JSON.parse(fs.readFileSync(authSchemaPath, 'utf8'));
        const authMethod = authSchema.authMethods.find(m => m.id === connection.authMethodId);

        const authTypes = JSON.parse(fs.readFileSync(path.join(__dirname, 'auth-types-definition.json'), 'utf8'));
        const authType = authTypes.authTypes[authMethod.authType];

        // 5. Create AuthenticationManager
        const AuthenticationManager = require('./utils/AuthenticationManager/AuthenticationManager');
        const authManager = new AuthenticationManager(connection, authType, authMethod);

        // 6. Merge variables
        const allVariables = {
            ...connection.configuredVariables,
            ...variableValues
        };

        // 7. Convert queryParams array to params object
        let params = apiConfig.params || {};
        if (apiConfig.queryParams && Array.isArray(apiConfig.queryParams)) {
            params = {};
            apiConfig.queryParams.forEach(param => {
                if (param.key && param.value !== undefined) {
                    params[param.key] = param.value;
                }
            });
        }

        // 8. Execute API request
        const requestConfig = {
            url: apiConfig.url,
            method: apiConfig.method || 'GET',
            headers: apiConfig.headers || {},
            params: params,
            body: apiConfig.body || null
        };

        const response = await authManager.executeApiRequest(requestConfig, allVariables);

        // 9. Return response
        res.json({
            success: response.success,
            response: {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                data: response.data,
                responseTime: response.responseTime
            },
            request: response.request
        });

    } catch (error) {
        res.status(500).json({
            error: 'Failed to test API',
            message: error.message,
            details: error.stack
        });
    }
});
```

---

## Dynamic Variables

### What are Dynamic Variables?

Dynamic variables allow placeholders in API configurations that are replaced at runtime with actual values.

**Format:** `{{variable_name}}`

**Example:**
```
URL: https://{{sub_domain}}.freshdesk.com/api/v2/contacts
```

### Where Variables Can Be Used

1. **URL**
   ```
   https://{{sub_domain}}.api.com/{{endpoint}}
   ```

2. **Headers**
   ```json
   { "key": "X-Custom-Header", "value": "{{custom_value}}" }
   ```

3. **Query Parameters**
   ```json
   { "key": "user_id", "value": "{{user_id}}" }
   ```

4. **Request Body**
   ```json
   {
     "name": "{{name}}",
     "email": "{{email}}"
   }
   ```

### Variable Sources

**1. Connection Variables (Stored in user_integration_connections)**
```javascript
{
  connectionId: "conn_123",
  configuredVariables: {
    sub_domain: "mycompany",
    region: "us-east-1",
    custom_field: "value"
  }
}
```

**2. Test-time Variables (Provided in test request)**
```javascript
{
  variableValues: {
    subject: "Test Ticket",
    description: "This is a test"
  }
}
```

**Priority:** Connection variables are base, test-time variables override

### Variable Replacement Utility

**Location:** `utils/dynamicVariables.js`

**Function:** `replaceDynamicVariables(str, values, strict = false)`

**Code:**
```javascript
function replaceDynamicVariables(str, values, strict = false) {
    if (!str || typeof str !== 'string') {
        return str;
    }

    let result = str;
    const regex = /\{\{([^}]+)\}\}/g;

    // Replace all variables
    result = result.replace(regex, (match, variableName) => {
        const trimmedVar = variableName.trim();

        if (values.hasOwnProperty(trimmedVar)) {
            const value = values[trimmedVar];

            if (value === null || value === undefined) {
                return strict ? match : '';
            }

            return String(value);
        } else {
            return strict ? match : '';
        }
    });

    return result;
}
```

**Usage:**
```javascript
const url = "https://{{sub_domain}}.api.com/users";
const values = { sub_domain: "mycompany" };
const result = replaceDynamicVariables(url, values);
// Result: "https://mycompany.api.com/users"
```

---

## Saving Process

### Frontend (api-configuration.js)

**Function:** `saveApiConfiguration()`

**Location:** `public/js/api-configuration.js` (lines ~100-200)

**Steps:**

1. **Collect Basic Info**
```javascript
const urlParams = new URLSearchParams(window.location.search);
const integrationId = urlParams.get('integrationId');
const featureId = urlParams.get('featureId');
const fieldId = urlParams.get('fieldId');
```

2. **Gather Form Data**
```javascript
const config = {
    method: document.getElementById('apiMethod').value,
    url: document.getElementById('apiUrl').value,
    headers: [],
    queryParams: [],
    bodyType: document.querySelector('input[name="bodyType"]:checked').value,
    body: {},
    authMethodRef: document.getElementById('authMethodRef')?.value || '',
    responseMapping: {
        successPath: document.getElementById('successPath')?.value || '',
        errorPath: document.getElementById('errorPath')?.value || ''
    }
};
```

3. **Process Headers**
```javascript
// Collect all header rows
document.querySelectorAll('.header-row').forEach(row => {
    const key = row.querySelector('.header-key').value;
    const value = row.querySelector('.header-value').value;
    if (key) {
        config.headers.push({ key, value });
    }
});
```

4. **Process Query Parameters**
```javascript
// Collect all query param rows
document.querySelectorAll('.query-param-row').forEach(row => {
    const key = row.querySelector('.param-key').value;
    const value = row.querySelector('.param-value').value;
    if (key) {
        config.queryParams.push({ key, value });
    }
});
```

5. **Process Body**
```javascript
if (config.bodyType === 'json') {
    const bodyEditor = document.getElementById('jsonBody');
    try {
        config.body = { json: JSON.parse(bodyEditor.value) };
    } catch (e) {
        showToast('Invalid JSON in request body', 'error');
        return;
    }
} else if (config.bodyType === 'form') {
    config.body = { form: collectFormData() };
} else {
    config.body = {};
}
```

6. **Send to Server**
```javascript
const response = await fetch(
    `/api/integrations/${integrationId}/features/${featureId}/fields/${fieldId}/api-config`,
    {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
    }
);
```

### Backend (server.js)

**Function:** Save endpoint handler

**Location:** `server.js` (lines 1920-1970)

**Process:**

1. **Extract Parameters**
```javascript
const { integrationId, featureId, fieldId } = req.params;
const apiConfig = req.body;
```

2. **Create Config ID**
```javascript
const configId = `${integrationId}_${featureId}_${fieldId}`;
```

3. **Load Integration Metadata**
```javascript
const integrationPath = path.join(__dirname, 'integrations/providers', integrationId, 'integration.json');
const integration = JSON.parse(fs.readFileSync(integrationPath, 'utf8'));
const feature = integration.features?.find(f => f.id === featureId);
```

4. **Save to Elasticsearch**
```javascript
const result = await elasticsearch.client.index({
    index: elasticsearch.INDEXES.FEATURE_CONFIGS,
    id: configId,
    body: {
        configId,
        integrationId,
        featureId,
        featureName: feature?.name || featureId,
        apiConfig: apiConfig,  // Complete API config object
        staticFieldValues: {},
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
});
```

---

## Loading Process

### Frontend

**Function:** `loadApiConfiguration()`

**Location:** `public/js/api-configuration.js` (lines ~500-650)

**Steps:**

1. **Fetch from Server**
```javascript
const response = await fetch(
    `/api/integrations/${integrationId}/features/${featureId}/fields/${fieldId}/api-config`
);
const config = await response.json();
```

2. **Populate Form Fields**
```javascript
// Basic fields
document.getElementById('apiMethod').value = config.method || 'GET';
document.getElementById('apiUrl').value = config.url || '';

// Headers
config.headers?.forEach(header => {
    addHeaderRow(header.key, header.value);
});

// Query Params
config.queryParams?.forEach(param => {
    addQueryParamRow(param.key, param.value);
});

// Body
if (config.bodyType === 'json' && config.body?.json) {
    document.getElementById('jsonBody').value = JSON.stringify(config.body.json, null, 2);
}
```

### Backend

**Function:** Load endpoint handler

**Location:** `server.js` (lines 1900-1918)

**Process:**

1. **Get from Elasticsearch**
```javascript
const configId = `${integrationId}_${featureId}_${fieldId}`;

const result = await elasticsearch.client.get({
    index: elasticsearch.INDEXES.FEATURE_CONFIGS,
    id: configId
});

res.json(result._source.apiConfig);
```

2. **Handle Not Found**
```javascript
if (error.meta?.statusCode === 404) {
    return res.status(404).json({ error: 'Configuration not found' });
}
```

---

## Testing Process

### Frontend Flow

**Function:** `executeApiTest()`

**Location:** `public/js/api-configuration.js` (lines 1232-1285)

**Steps:**

1. **Validate Selection**
```javascript
if (!selectedConnection || !currentApiConfig) {
    showToast('Please select a connection first', 'error');
    return;
}
```

2. **Collect Variable Values**
```javascript
const variableValues = {};
document.querySelectorAll('[data-variable]').forEach(input => {
    const varName = input.getAttribute('data-variable');
    variableValues[varName] = input.value;
});
```

3. **Send Test Request**
```javascript
const response = await fetch(
    `/api/integrations/${integrationId}/features/${featureId}/fields/${fieldId}/test-api`,
    {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId: selectedUserId,
            connectionId: selectedConnection.id,
            variableValues: variableValues
        })
    }
);
```

4. **Display Results**
```javascript
const result = await response.json();
displayTestResults(result);
```

### Backend Flow

**Complete Process in Test Endpoint:**

1. **Load Configuration**
   - Try Elasticsearch (saved with user edits)
   - Fallback to template file

2. **Get User Connection**
   ```javascript
   const connection = await elasticsearch.getConnectionById(connectionId);
   ```

3. **Decrypt Credentials**
   ```javascript
   const encryptionManager = require('./services/encryption');
   connection.credentials = encryptionManager.decrypt(connection.credentials.encrypted);
   ```

4. **Merge Variables**
   ```javascript
   const allVariables = {
       ...connection.configuredVariables,  // From connection setup
       ...variableValues                    // From test form
   };
   ```

5. **Convert Formats**
   ```javascript
   // queryParams array → params object
   let params = {};
   apiConfig.queryParams?.forEach(p => {
       params[p.key] = p.value;
   });
   ```

6. **Execute via AuthenticationManager**
   ```javascript
   const authManager = new AuthenticationManager(connection, authType, authMethod);
   const response = await authManager.executeApiRequest(requestConfig, allVariables);
   ```

---

## Data Structure Keys

### API Config Object

```javascript
{
  // HTTP Method
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",

  // API URL (can contain variables)
  url: "https://{{sub_domain}}.api.com/endpoint",

  // Headers (array format)
  headers: [
    { key: "Content-Type", value: "application/json" },
    { key: "Accept", value: "application/json" },
    { key: "X-Custom", value: "{{custom_header}}" }
  ],

  // Query Parameters (array format)
  queryParams: [
    { key: "limit", value: "100" },
    { key: "offset", value: "0" },
    { key: "filter", value: "{{filter_value}}" }
  ],

  // Body Type
  bodyType: "none" | "json" | "form" | "raw",

  // Request Body
  body: {
    json: { /* JSON object */ },      // if bodyType = json
    form: { /* form data */ },         // if bodyType = form
    raw: "string content"              // if bodyType = raw
  },

  // Authentication Reference
  authMethodRef: "basic_auth_api_key",

  // Response Mapping
  responseMapping: {
    successPath: "data.result",
    errorPath: "error.message",
    dataFormat: "json"
  }
}
```

### User Connection Object

```javascript
{
  connectionId: "conn_1764534949690_ta7vovya5",
  userId: "user_1763841624466_qniz794rp",
  integrationId: "freshdesk",
  integrationName: "Freshdesk",
  connectionName: "Freshdesk First Connection",
  authMethodId: "freshdesk_basic_auth",
  authMethodLabel: "Basic Auth (API Key)",

  // Configured Variables
  configuredVariables: {
    sub_domain: "sarvtesting",
    testing: "Abhimanyu",
    region: "us-east-1"
  },

  // Encrypted Credentials
  credentials: {
    encrypted: "encrypted_string_here",
    decrypted: { apiKey: "actual_key_value" }  // After decryption
  },

  status: "active",
  isActive: true,
  createdAt: "2025-11-30T12:00:00.000Z",
  updatedAt: "2025-11-30T12:00:00.000Z"
}
```

---

## Important Helper Functions

### 1. Format Conversion Functions

**Headers Array to Object:**
```javascript
// Input: [{ key: 'Content-Type', value: 'application/json' }]
// Output: { 'Content-Type': 'application/json' }

if (Array.isArray(apiConfig.headers)) {
    apiConfig.headers.forEach(header => {
        if (header.key && header.value) {
            processedHeaders[header.key] = header.value;
        }
    });
}
```

**QueryParams Array to Object:**
```javascript
// Input: [{ key: 'limit', value: '100' }]
// Output: { limit: '100' }

let params = {};
apiConfig.queryParams?.forEach(param => {
    params[param.key] = param.value;
});
```

**Body Unwrapping:**
```javascript
// Input: { json: { name: "test" } }
// Output: { name: "test" }

let bodyToProcess = apiConfig.body;
if (bodyToProcess.json) {
    bodyToProcess = bodyToProcess.json;
}
```

### 2. Variable Extraction

**Function:** `extractDynamicVariables(str)`

**Location:** `utils/dynamicVariables.js`

```javascript
function extractDynamicVariables(str) {
    if (!str || typeof str !== 'string') {
        return [];
    }

    const regex = /\{\{([^}]+)\}\}/g;
    const variables = [];
    let match;

    while ((match = regex.exec(str)) !== null) {
        const variableName = match[1].trim();
        if (variableName && !variables.includes(variableName)) {
            variables.push(variableName);
        }
    }

    return variables;
}

// Example:
extractDynamicVariables("https://{{domain}}.api.com/{{endpoint}}")
// Returns: ["domain", "endpoint"]
```

### 3. Credential Decryption

**Function:** `decrypt(encryptedData)`

**Location:** `services/encryption.js`

```javascript
// Usage in test endpoint
const encryptionManager = require('./services/encryption');

if (connection.credentials && connection.credentials.encrypted) {
    connection.credentials = encryptionManager.decrypt(connection.credentials.encrypted);
}

// Before: { encrypted: "U2FsdGVkX1..." }
// After: { apiKey: "VbACGuEqmvL493JAtNmU" }
```

---

## Configuration Storage Examples

### Example 1: Freshdesk Create Contact

**Stored in Elasticsearch:**
```json
{
  "configId": "freshdesk_create_contact_new_api",
  "integrationId": "freshdesk",
  "featureId": "create_contact_new",
  "featureName": "Create Contact New",
  "apiConfig": {
    "method": "POST",
    "url": "{{sub_domain}}.freshdesk.com/api/v2/contacts",
    "headers": [
      { "key": "Content-Type", "value": "application/json" }
    ],
    "queryParams": [],
    "bodyType": "json",
    "body": {
      "json": {
        "name": "{{name}}",
        "email": "{{email}}",
        "phone": "{{phone}}"
      }
    },
    "authMethodRef": "freshdesk_basic_auth",
    "responseMapping": {
      "successPath": "id",
      "errorPath": "errors"
    }
  },
  "enabled": true,
  "createdAt": "2025-12-13T10:00:00.000Z",
  "updatedAt": "2025-12-13T10:00:00.000Z"
}
```

### Example 2: Slack List Conversations

**Stored in Elasticsearch:**
```json
{
  "configId": "slack_get_conversation_api",
  "integrationId": "slack",
  "featureId": "get_conversation",
  "featureName": "Get Conversations Slack",
  "apiConfig": {
    "method": "GET",
    "url": "https://slack.com/api/conversations.list",
    "headers": [],
    "queryParams": [
      { "key": "limit", "value": "100" },
      { "key": "types", "value": "public_channel,private_channel" }
    ],
    "bodyType": "none",
    "body": {},
    "authMethodRef": "slack_bearer_token",
    "responseMapping": {
      "successPath": "channels",
      "errorPath": "error"
    }
  },
  "enabled": true,
  "createdAt": "2025-12-13T18:55:30.732Z",
  "updatedAt": "2025-12-13T19:24:57.580Z"
}
```

---

## Variable Resolution Flow

### Step-by-Step Example

**API Config:**
```
URL: https://{{sub_domain}}.freshdesk.com/api/v2/tickets/{{ticket_id}}
```

**Connection Variables:**
```javascript
{ sub_domain: "mycompany" }
```

**Test Variables:**
```javascript
{ ticket_id: "12345" }
```

**Resolution Process:**

1. **Merge Variables**
```javascript
allVariables = {
    sub_domain: "mycompany",  // from connection
    ticket_id: "12345"         // from test
}
```

2. **Replace in URL**
```javascript
replaceDynamicVariables(
    "https://{{sub_domain}}.freshdesk.com/api/v2/tickets/{{ticket_id}}",
    { sub_domain: "mycompany", ticket_id: "12345" }
)
```

3. **Result**
```
https://mycompany.freshdesk.com/api/v2/tickets/12345
```

---

## Error Handling

### Save Errors

**1. Invalid JSON Body**
```javascript
try {
    config.body = { json: JSON.parse(bodyEditor.value) };
} catch (e) {
    showToast('Invalid JSON in request body', 'error');
    return;
}
```

**2. Elasticsearch Error**
```javascript
catch (error) {
    console.error('Error saving API configuration:', error);
    res.status(500).json({ error: 'Failed to save API configuration' });
}
```

### Load Errors

**1. Config Not Found**
```javascript
if (error.meta?.statusCode === 404) {
    return res.status(404).json({ error: 'Configuration not found' });
}
```

**2. Parse Error**
```javascript
catch (error) {
    res.status(500).json({ error: 'Failed to load API configuration' });
}
```

### Test Errors

**1. Module Not Found**
- Fixed: Correct module paths
- Example: `./services/encryption` instead of `./utils/encryption`

**2. Function Not Found**
- Fixed: Use correct function names
- Example: `getConnectionById()` instead of `getUserConnection()`

**3. Decryption Error**
```javascript
try {
    connection.credentials = encryptionManager.decrypt(connection.credentials.encrypted);
} catch (error) {
    return res.status(500).json({ error: 'Failed to decrypt credentials' });
}
```

---

## Best Practices

### 1. Variable Naming
- Use lowercase with underscores: `sub_domain`, `api_key`
- Be descriptive: `user_email` not `ue`
- Consistent across integrations

### 2. Configuration Updates
- Always increment `updatedAt` timestamp
- Preserve existing `createdAt`
- Keep `configId` unchanged for updates

### 3. Testing
- Test with real credentials first
- Verify variable replacement in Request tab
- Check query params in final URL
- Validate response structure

### 4. Security
- Never log decrypted credentials in production
- Always decrypt on-demand, never cache in memory
- Use environment variable for encryption key

---

## Maintenance Guide

### Adding New Field Types

1. Update `api-configuration.ejs` with new field UI
2. Update `saveApiConfiguration()` to collect new field
3. Update save endpoint to store new field
4. Update load endpoint to return new field
5. Update test endpoint to use new field

### Modifying Storage Structure

1. Update Elasticsearch mapping in `elasticsearch.js`
2. Update save endpoint to store new structure
3. Add migration script for existing data
4. Update load endpoint to handle both old and new formats
5. Update documentation

### Debugging Tips

**Enable Console Logs:**
```javascript
console.log('Connection configuredVariables:', connection.configuredVariables);
console.log('Provided variableValues:', variableValues);
console.log('Merged allVariables:', allVariables);
console.log('Request config before replacement:', requestConfig);
```

**Check Elasticsearch:**
```bash
# View saved config
GET integration_feature_configs/_doc/freshdesk_tickets_title

# List all configs
GET integration_feature_configs/_search
```

---

## Related Files

- **Authentication:** `utils/AuthenticationManager/`
- **Variable Utilities:** `utils/dynamicVariables.js`
- **HTTP Client:** `utils/AuthenticationManager/httpClient.js`
- **Encryption:** `services/encryption.js`
- **Elasticsearch:** `services/elasticsearch.js`

---

## Success Criteria

✓ API configuration saved to Elasticsearch
✓ Configuration loads correctly on page refresh
✓ Variables extracted and displayed
✓ Test executes with proper authentication
✓ Variables replaced in URL, headers, params, body
✓ Response displayed with status, timing, and data
✓ Query parameters included in request
✓ Headers sent correctly
✓ Body formatted properly

---

**Status:** Production Ready
**Last Tested:** December 13, 2025
**Version:** 1.0
