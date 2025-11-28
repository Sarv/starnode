# API Endpoints Reference

**Last Updated:** 2025-11-26

---

## 🎯 Overview

This document provides comprehensive documentation for all REST API endpoints in the User Connection Management System. Each endpoint includes request/response formats, authentication requirements, error handling, and usage examples.

---

## 📋 Table of Contents

1. [Base Configuration](#base-configuration)
2. [User Management Endpoints](#user-management-endpoints)
3. [Integration Endpoints](#integration-endpoints)
4. [Connection Management Endpoints](#connection-management-endpoints)
5. [Connection Testing Endpoints](#connection-testing-endpoints)
6. [Feature Template Endpoints](#-feature-template-endpoints)
7. [Feature Mapping Endpoints](#-feature-mapping-endpoints)
8. [Error Handling](#error-handling)
9. [Status Codes](#status-codes)

---

## ⚙️ Base Configuration

### Base URL
```
http://localhost:3000
```

### Content Type
All requests and responses use `application/json` content type unless otherwise specified.

### Authentication
Currently, the system does not implement authentication tokens. User identification is done via `userId` parameter in requests.

**Future:** OAuth 2.0 or JWT-based authentication will be implemented.

---

## 👥 User Management Endpoints

### Get User by ID

Retrieve detailed information about a specific user.

**Endpoint:** `GET /api/users/:userId`

**URL Parameters:**
- `userId` (string, required) - Unique identifier for the user

**Request Example:**
```http
GET /api/users/user_123 HTTP/1.1
Host: localhost:3000
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "userId": "user_123",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "status": "active",
    "createdAt": "2025-11-01T10:00:00.000Z",
    "updatedAt": "2025-11-23T15:30:00.000Z"
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "message": "User not found"
}
```

**Error Response (500 Internal Server Error):**
```json
{
  "success": false,
  "message": "Failed to fetch user",
  "error": "Elasticsearch connection timeout"
}
```

---

### Get All Users

Retrieve a list of all active users in the system.

**Endpoint:** `GET /api/users`

**Query Parameters:**
- `status` (string, optional) - Filter by user status (`active` or `inactive`). Default: all statuses

**Request Example:**
```http
GET /api/users?status=active HTTP/1.1
Host: localhost:3000
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "users": [
    {
      "userId": "user_123",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "status": "active",
      "createdAt": "2025-11-01T10:00:00.000Z"
    },
    {
      "userId": "user_456",
      "name": "Jane Smith",
      "email": "jane.smith@example.com",
      "status": "active",
      "createdAt": "2025-11-02T14:20:00.000Z"
    }
  ],
  "total": 2
}
```

**Error Response (500 Internal Server Error):**
```json
{
  "success": false,
  "message": "Failed to fetch users",
  "error": "Database error"
}
```

---

## 🔌 Integration Endpoints

### Get All Integrations

Retrieve a list of all available integrations with their metadata.

**Endpoint:** `GET /api/integrations`

**Query Parameters:**
- `category` (string, optional) - Filter by category (e.g., `crm`, `payment`, `database`)
- `status` (string, optional) - Filter by status (`active` or `inactive`). Default: `active`

**Request Example:**
```http
GET /api/integrations?category=crm&status=active HTTP/1.1
Host: localhost:3000
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "integrations": [
    {
      "id": "salesforce",
      "displayName": "Salesforce",
      "description": "Customer Relationship Management platform",
      "category": "crm",
      "iconUrl": "https://logo.clearbit.com/salesforce.com",
      "status": "active",
      "baseUrl": "https://{{instance_url}}.salesforce.com/services/data/v58.0",
      "authMethods": ["oauth2", "api-key"]
    },
    {
      "id": "hubspot",
      "displayName": "HubSpot",
      "description": "Marketing, sales, and service software",
      "category": "crm",
      "iconUrl": "https://logo.clearbit.com/hubspot.com",
      "status": "active",
      "baseUrl": "https://api.hubapi.com",
      "authMethods": ["oauth2", "api-key"]
    }
  ],
  "total": 2
}
```

**Error Response (500 Internal Server Error):**
```json
{
  "success": false,
  "message": "Failed to load integrations",
  "error": "File system error"
}
```

---

### Get Integration Authentication Schema

Retrieve the authentication schema for a specific integration, including available auth methods and required fields.

**Endpoint:** `GET /api/integrations/:integrationId/auth-schema`

**URL Parameters:**
- `integrationId` (string, required) - Unique identifier for the integration

**Request Example:**
```http
GET /api/integrations/salesforce/auth-schema HTTP/1.1
Host: localhost:3000
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "integration": {
    "id": "salesforce",
    "displayName": "Salesforce",
    "baseUrl": "https://{{instance_url}}.salesforce.com/services/data/v58.0"
  },
  "authMethods": [
    {
      "id": "oauth2",
      "type": "OAUTH",
      "label": "OAuth 2.0",
      "description": "Secure OAuth 2.0 authentication with automatic token refresh",
      "fields": [
        {
          "name": "clientId",
          "label": "Client ID",
          "type": "string",
          "required": true,
          "description": "OAuth Client ID from Salesforce Connected App"
        },
        {
          "name": "clientSecret",
          "label": "Client Secret",
          "type": "password",
          "required": true,
          "description": "OAuth Client Secret (will be encrypted)"
        }
      ],
      "additionalFields": [
        {
          "name": "instance_url",
          "label": "Instance URL",
          "type": "url",
          "required": true,
          "placeholder": "https://your-instance.salesforce.com",
          "description": "Your Salesforce instance URL"
        }
      ]
    },
    {
      "id": "api-key",
      "type": "API-KEY",
      "label": "API Key",
      "description": "Simple API key authentication",
      "fields": [
        {
          "name": "apiKey",
          "label": "API Key",
          "type": "password",
          "required": true,
          "description": "Your Salesforce API key"
        }
      ],
      "additionalFields": [
        {
          "name": "instance_url",
          "label": "Instance URL",
          "type": "url",
          "required": true,
          "placeholder": "https://your-instance.salesforce.com",
          "description": "Your Salesforce instance URL"
        }
      ]
    }
  ]
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Integration not found"
}
```

**Error Response (500 Internal Server Error):**
```json
{
  "success": false,
  "message": "Failed to load authentication schema",
  "error": "Schema file not found"
}
```

---

## 🔗 Connection Management Endpoints

### Create New Connection

Create a new user connection to an integration.

**Endpoint:** `POST /api/user-integrations/connect`

**Request Body:**
```json
{
  "userId": "user_123",
  "integrationId": "salesforce",
  "authMethodId": "oauth2",
  "connectionName": "Salesforce Production",
  "configuredVariables": {
    "instance_url": "https://mycompany.salesforce.com"
  },
  "credentials": {
    "clientId": "3MVG9...",
    "clientSecret": "1234567890ABCDEF"
  }
}
```

**Request Fields:**
- `userId` (string, required) - ID of the user creating the connection
- `integrationId` (string, required) - ID of the integration to connect
- `authMethodId` (string, required) - Authentication method to use
- `connectionName` (string, optional) - Custom name for the connection. If not provided, uses integration display name
- `configuredVariables` (object, optional) - Dynamic variables extracted from baseUrl (e.g., `{{instance_url}}`)
- `credentials` (object, required) - Authentication credentials (will be encrypted)

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Connection created successfully",
  "connectionId": "conn_abc123xyz",
  "connection": {
    "connectionId": "conn_abc123xyz",
    "userId": "user_123",
    "integrationId": "salesforce",
    "integrationName": "Salesforce",
    "connectionName": "Salesforce Production",
    "authMethodId": "oauth2",
    "authMethodLabel": "OAuth 2.0",
    "status": "active",
    "createdAt": "2025-11-23T15:45:00.000Z"
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    "userId is required",
    "integrationId is required",
    "credentials.clientId is required"
  ]
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Integration not found"
}
```

**Error Response (500 Internal Server Error):**
```json
{
  "success": false,
  "message": "Failed to create connection",
  "error": "Database write error"
}
```

---

### Get User Connections

Retrieve all connections for a specific user.

**Endpoint:** `GET /api/user-integrations/my-connections`

**Query Parameters:**
- `userId` (string, required) - ID of the user
- `status` (string, optional) - Filter by status (`active` or `inactive`). Default: all statuses
- `integrationId` (string, optional) - Filter by specific integration

**Request Example:**
```http
GET /api/user-integrations/my-connections?userId=user_123&status=active HTTP/1.1
Host: localhost:3000
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "connections": [
    {
      "connectionId": "conn_abc123xyz",
      "userId": "user_123",
      "integrationId": "salesforce",
      "integrationName": "Salesforce",
      "connectionName": "Salesforce Production",
      "authMethodId": "oauth2",
      "authMethodLabel": "OAuth 2.0",
      "status": "active",
      "configuredVariables": {
        "instance_url": "https://mycompany.salesforce.com"
      },
      "credentials": {
        "encrypted": "U2FsdGVkX1...",
        "decrypted": {
          "clientId": "3MVG9...",
          "clientSecret": "••••••••••••"
        }
      },
      "lastTestStatus": "success",
      "lastTestMessage": "Connection successful",
      "lastTestDate": "2025-11-23T14:30:00.000Z",
      "createdAt": "2025-11-20T10:00:00.000Z",
      "updatedAt": "2025-11-23T14:30:00.000Z",
      "integration": {
        "displayName": "Salesforce",
        "category": "crm",
        "iconUrl": "https://logo.clearbit.com/salesforce.com"
      }
    },
    {
      "connectionId": "conn_def456uvw",
      "userId": "user_123",
      "integrationId": "salesforce",
      "integrationName": "Salesforce",
      "connectionName": "Salesforce Sandbox",
      "authMethodId": "oauth2",
      "authMethodLabel": "OAuth 2.0",
      "status": "active",
      "configuredVariables": {
        "instance_url": "https://test.salesforce.com"
      },
      "credentials": {
        "encrypted": "U2FsdGVkX1...",
        "decrypted": {
          "clientId": "3MVG9...",
          "clientSecret": "••••••••••••"
        }
      },
      "lastTestStatus": null,
      "lastTestMessage": null,
      "lastTestDate": null,
      "createdAt": "2025-11-22T09:15:00.000Z",
      "updatedAt": "2025-11-22T09:15:00.000Z",
      "integration": {
        "displayName": "Salesforce",
        "category": "crm",
        "iconUrl": "https://logo.clearbit.com/salesforce.com"
      }
    }
  ],
  "total": 2,
  "stats": {
    "active": 2,
    "inactive": 0,
    "total": 2,
    "recent": 1
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "userId query parameter is required"
}
```

**Error Response (500 Internal Server Error):**
```json
{
  "success": false,
  "message": "Failed to fetch connections",
  "error": "Elasticsearch query error"
}
```

---

### Get Connection by ID

Retrieve detailed information about a specific connection, including embedded integration metadata. This endpoint is commonly used when loading a connection for editing in the Connection Wizard.

**Endpoint:** `GET /api/user-integrations/:connectionId`

**URL Parameters:**
- `connectionId` (string, required) - Unique identifier for the connection

**Request Example:**
```http
GET /api/user-integrations/conn_abc123xyz HTTP/1.1
Host: localhost:3000
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "connection": {
    "connectionId": "conn_abc123xyz",
    "userId": "user_123",
    "integrationId": "salesforce",
    "integrationName": "Salesforce",
    "connectionName": "Salesforce Production",
    "authMethodId": "oauth2",
    "authMethodLabel": "OAuth 2.0",
    "status": "active",
    "configuredVariables": {
      "instance_url": "https://mycompany.salesforce.com"
    },
    "credentials": {
      "encrypted": "U2FsdGVkX1...",
      "decrypted": {
        "clientId": "3MVG9...",
        "clientSecret": "1234567890ABCDEF"
      }
    },
    "lastTestStatus": "success",
    "lastTestMessage": "Connection successful",
    "lastTestDate": "2025-11-23T14:30:00.000Z",
    "createdAt": "2025-11-20T10:00:00.000Z",
    "updatedAt": "2025-11-23T14:30:00.000Z",
    "integration": {
      "displayName": "Salesforce",
      "description": "Customer Relationship Management platform",
      "category": "crm",
      "iconUrl": "https://logo.clearbit.com/salesforce.com"
    }
  }
}
```

**Response Fields:**
- `success` (boolean) - Always `true` for successful responses. Frontend should check this field before processing data
- `connection` (object) - Complete connection details
  - `integration` (object) - Embedded integration metadata loaded from integration's auth.schema.json file

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Connection not found"
}
```

**Error Response (500 Internal Server Error):**
```json
{
  "success": false,
  "error": "Failed to get connection",
  "message": "Elasticsearch connection timeout"
}
```

**Usage in Edit Mode:**

This endpoint is essential for the edit connection feature. When a user clicks the "Edit" button on a connection card:

1. **Frontend redirects** to wizard with URL params: `/connect-integration.html?mode=edit&connectionId=conn_abc123xyz`
2. **Wizard calls this endpoint** to load existing connection data
3. **Response includes `success: true`** - Frontend checks this field to ensure data loaded successfully
4. **Wizard pre-fills all form fields** with data from the response
5. **Integration metadata is included** - No need for separate API call to load integration details

**Example Usage:**
```javascript
async function loadExistingConnection(connectionId) {
  try {
    const response = await fetch(`/api/user-integrations/${connectionId}`);
    const data = await response.json();

    // Check success field before processing
    if (data.success && data.connection) {
      const connection = data.connection;

      // Pre-fill wizard with existing data
      wizardData.userId = connection.userId;
      wizardData.integrationId = connection.integrationId;
      wizardData.integrationName = connection.integrationName;
      wizardData.authMethodId = connection.authMethodId;
      wizardData.authMethodLabel = connection.authMethodLabel;
      wizardData.dynamicVariables = connection.configuredVariables || {};
      wizardData.credentials = connection.credentials?.decrypted || {};

      // Integration details are already embedded
      displayIntegrationInfo(connection.integration);

      // Pre-fill connection name
      document.getElementById('connectionName').value = connection.connectionName || '';
    } else {
      // If success is false or missing, redirect back
      showToast('Failed to load connection details', 'error');
      setTimeout(() => window.location.href = '/my-connections.html', 2000);
    }
  } catch (error) {
    console.error('Error loading connection:', error);
    showToast('Failed to load connection', 'error');
  }
}
```

**Important Notes:**
- **Always check `success` field** - Frontend must verify `data.success === true` before processing
- **Integration metadata is embedded** - Saves an extra API call to `/api/integrations/:id`
- **Credentials are decrypted** - Ready to use for pre-filling form fields (except password fields)
- **Error handling** - If connection not found or error occurs, redirect user back to My Connections page

---

### Update Connection

Update an existing connection's configuration, credentials, or authentication method.

**Endpoint:** `PUT /api/user-integrations/:connectionId`

**URL Parameters:**
- `connectionId` (string, required) - Unique identifier for the connection

**Request Body:**
```json
{
  "connectionName": "Salesforce Production v2",
  "authMethodId": "oauth2",
  "authMethodLabel": "OAuth 2.0",
  "configuredVariables": {
    "instance_url": "https://newinstance.salesforce.com"
  },
  "credentials": {
    "clientId": "3MVG9...",
    "clientSecret": "newSecretValue123"
  }
}
```

**Request Fields (all optional):**
- `connectionName` (string) - Update connection name
- `authMethodId` (string) - Update authentication method ID
- `authMethodLabel` (string) - Update authentication method display label
- `configuredVariables` (object) - Update dynamic variables
- `credentials` (object) - Update credentials (will be re-encrypted). **Note:** If a password field is omitted or empty, the existing password value is preserved
- `status` (string) - Update status (`active` or `inactive`)

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Connection updated successfully",
  "connection": {
    "connectionId": "conn_abc123xyz",
    "connectionName": "Salesforce Production v2",
    "updatedAt": "2025-11-23T16:00:00.000Z"
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Connection not found"
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    "Invalid status value. Must be 'active' or 'inactive'"
  ]
}
```

**Error Response (500 Internal Server Error):**
```json
{
  "success": false,
  "message": "Failed to update connection",
  "error": "Database update error"
}
```

**Usage in Edit Mode:**

When a user edits an existing connection through the Connection Wizard:

1. **Wizard loads existing connection** using GET endpoint
2. **User modifies fields** in the wizard interface
3. **Wizard sends PUT request** with updated fields
4. **Smart password handling:** If password fields are left empty, they are omitted from the request and existing passwords are preserved

**Example Edit Workflow:**
```javascript
// Step 1: Load existing connection
const response = await fetch('/api/user-integrations/conn_abc123xyz');
const { connection } = await response.json();

// Step 2: User updates connection name and instance URL
const updates = {
  connectionName: 'Salesforce Production v2',
  authMethodId: connection.authMethodId,
  authMethodLabel: connection.authMethodLabel,
  configuredVariables: {
    instance_url: 'https://newinstance.salesforce.com'
  },
  credentials: {
    clientId: connection.credentials.decrypted.clientId
    // clientSecret omitted - existing value will be preserved
  }
};

// Step 3: Send PUT request
const updateResponse = await fetch('/api/user-integrations/conn_abc123xyz', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(updates)
});
```

**Security Notes:**
- Password fields that are empty or omitted will preserve existing encrypted values
- All provided credentials are re-encrypted before storage
- Only fields included in the request body will be updated

---

### Delete Connection

Delete a user connection (soft delete by setting status to inactive).

**Endpoint:** `DELETE /api/user-integrations/:connectionId`

**URL Parameters:**
- `connectionId` (string, required) - Unique identifier for the connection

**Request Example:**
```http
DELETE /api/user-integrations/conn_abc123xyz HTTP/1.1
Host: localhost:3000
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Connection deleted successfully",
  "connectionId": "conn_abc123xyz"
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Connection not found"
}
```

**Error Response (500 Internal Server Error):**
```json
{
  "success": false,
  "message": "Failed to delete connection",
  "error": "Database error"
}
```

**Note:** This is a soft delete. The connection status is set to `inactive` rather than permanently deleting the record. This preserves connection history and allows for potential recovery.

---

## 🧪 Connection Testing Endpoints

### Test Connection

Test a connection by making a sample API call to the integrated service.

**Endpoint:** `POST /api/user-integrations/:connectionId/test`

**URL Parameters:**
- `connectionId` (string, required) - Unique identifier for the connection

**Request Example:**
```http
POST /api/user-integrations/conn_abc123xyz/test HTTP/1.1
Host: localhost:3000
```

**Request Body:** Empty (no body required)

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Connection test successful",
  "testResult": {
    "status": "success",
    "statusCode": 200,
    "responseTime": 245,
    "timestamp": "2025-11-23T16:15:00.000Z",
    "endpoint": "https://mycompany.salesforce.com/services/data/v58.0/sobjects"
  }
}
```

**Error Response (400 Bad Request) - Connection Failed:**
```json
{
  "success": false,
  "message": "Connection test failed",
  "testResult": {
    "status": "error",
    "statusCode": 401,
    "errorMessage": "Invalid credentials. Please check your client ID and secret.",
    "timestamp": "2025-11-23T16:15:00.000Z",
    "endpoint": "https://mycompany.salesforce.com/services/data/v58.0/sobjects"
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Connection not found"
}
```

**Error Response (500 Internal Server Error):**
```json
{
  "success": false,
  "message": "Failed to test connection",
  "error": "Network timeout"
}
```

**Side Effects:**
- Updates `lastTestStatus` field with result (`success` or `error`)
- Updates `lastTestMessage` field with result message
- Updates `lastTestDate` field with current timestamp

---

## ⚠️ Error Handling

### Standard Error Response Format

All error responses follow this consistent format:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": "Technical error details (optional)",
  "errors": ["Array of validation errors (optional)"]
}
```

### Common Error Scenarios

#### 1. Validation Errors (400 Bad Request)
Returned when request data is invalid or missing required fields.

**Example:**
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    "userId is required",
    "integrationId must be a valid integration ID",
    "credentials.clientSecret cannot be empty"
  ]
}
```

#### 2. Resource Not Found (404 Not Found)
Returned when requested resource doesn't exist.

**Example:**
```json
{
  "success": false,
  "message": "Connection not found"
}
```

#### 3. Database Errors (500 Internal Server Error)
Returned when database operations fail.

**Example:**
```json
{
  "success": false,
  "message": "Failed to fetch connections",
  "error": "Elasticsearch connection timeout after 30s"
}
```

#### 4. Integration Errors (500 Internal Server Error)
Returned when integration configuration is invalid.

**Example:**
```json
{
  "success": false,
  "message": "Failed to load integration",
  "error": "Auth schema file not found: integrations/providers/salesforce/auth.schema.json"
}
```

#### 5. Encryption Errors (500 Internal Server Error)
Returned when credential encryption/decryption fails.

**Example:**
```json
{
  "success": false,
  "message": "Failed to encrypt credentials",
  "error": "Encryption key not configured in environment"
}
```

---

## 📊 Status Codes

### HTTP Status Codes Used

| Status Code | Meaning | Usage |
|------------|---------|-------|
| `200 OK` | Success | Successful GET, PUT, DELETE, or POST operations |
| `201 Created` | Resource Created | Successful POST operation creating a new resource |
| `400 Bad Request` | Client Error | Invalid request data or validation errors |
| `404 Not Found` | Resource Not Found | Requested resource doesn't exist |
| `500 Internal Server Error` | Server Error | Database errors, configuration errors, or unexpected failures |

### Connection Test Status Values

| Status | Meaning | Description |
|--------|---------|-------------|
| `success` | Test Passed | Connection successfully authenticated and API call succeeded |
| `error` | Test Failed | Connection failed (invalid credentials, network error, etc.) |
| `null` | Not Tested | Connection has never been tested |

### Connection Status Values

| Status | Meaning | Description |
|--------|---------|-------------|
| `active` | Active | Connection is active and available for use |
| `inactive` | Inactive | Connection has been soft-deleted or deactivated |

---

## 🔐 Security Considerations

### 1. **Credential Encryption**
- All credentials are encrypted using AES-256 before storage
- Encryption key is stored in environment variables
- Decryption only occurs when needed for API calls

### 2. **Input Validation**
- All user inputs are validated before processing
- SQL injection prevention through parameterized queries
- XSS protection through input sanitization

### 3. **Sensitive Data Masking**
- Password fields are masked in responses (`••••••••••••`)
- Secret keys and tokens are never returned in plain text
- Only encrypted versions are stored in database

### 4. **Rate Limiting** (Future)
- API rate limiting will be implemented to prevent abuse
- Per-user and per-endpoint limits

### 5. **Authentication** (Future)
- OAuth 2.0 or JWT-based authentication
- Role-based access control (RBAC)
- API key management

---

## 🎨 Feature Template Endpoints

### Get All Feature Templates

Retrieve a list of all feature templates.

**Endpoint:** `GET /api/feature-templates`

**Request Example:**
```http
GET /api/feature-templates HTTP/1.1
Host: localhost:3000
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "features": [
    {
      "id": "create_contact",
      "name": "Create Contact",
      "description": "Create a new contact in the CRM",
      "category": "contacts",
      "fields": {
        "first_name": {
          "type": "static",
          "label": "First Name",
          "required": true,
          "fieldType": "string",
          "htmlType": "text",
          "fillBy": "User"
        }
      },
      "createdAt": "2025-11-24T10:00:00.000Z",
      "updatedAt": "2025-11-24T10:00:00.000Z"
    }
  ]
}
```

---

### Get Feature Template by ID

Retrieve a specific feature template.

**Endpoint:** `GET /api/feature-templates/:id`

**URL Parameters:**
- `id` (string, required) - Feature template ID

**Request Example:**
```http
GET /api/feature-templates/create_contact HTTP/1.1
Host: localhost:3000
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "feature": {
    "id": "create_contact",
    "name": "Create Contact",
    "description": "Create a new contact in the CRM",
    "category": "contacts",
    "fields": { ... },
    "createdAt": "2025-11-24T10:00:00.000Z",
    "updatedAt": "2025-11-24T10:00:00.000Z"
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Feature template not found"
}
```

---

## 🔗 Feature Mapping Endpoints

### Get All Feature Mappings for Integration

Retrieve all feature mappings for a specific integration.

**Endpoint:** `GET /api/integrations/:integrationId/feature-mappings`

**URL Parameters:**
- `integrationId` (string, required) - Integration ID

**Request Example:**
```http
GET /api/integrations/freshdesk/feature-mappings HTTP/1.1
Host: localhost:3000
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "featureMappings": [
    {
      "id": "mapping_1764100935626_abc123",
      "featureTemplateId": "create_contact",
      "featureTemplateName": "Create Contact",
      "fieldMappings": {
        "first_name": {
          "enabled": true,
          "overrides": null,
          "customHandlers": {
            "valueHandler": "capitalizeFirstName",
            "validationHandler": "validateNameLength",
            "submitHandler": null
          },
          "adminValue": null
        },
        "email": {
          "enabled": true,
          "customHandlers": {
            "validationHandler": "validateEmailFormat"
          }
        }
      },
      "apiConfig": {
        "apiConfigId": null,
        "method": "POST",
        "endpoint": "/api/contacts"
      },
      "extraFields": [
        {
          "fieldKey": "object_type",
          "label": "Object Type",
          "type": "static",
          "fieldType": "string",
          "htmlType": "select",
          "fillBy": "Admin",
          "required": true,
          "possibleValues": [
            {"id": "contact", "label": "Contact"},
            {"id": "lead", "label": "Lead"}
          ],
          "customHandlers": null,
          "adminValue": "contact",
          "order": 1
        }
      ],
      "status": "active",
      "createdAt": "2025-11-26T10:00:00.000Z",
      "updatedAt": "2025-11-26T10:00:00.000Z"
    }
  ]
}
```

---

### Create Feature Mapping

Create a new feature mapping for an integration.

**Endpoint:** `POST /api/integrations/:integrationId/feature-mappings`

**URL Parameters:**
- `integrationId` (string, required) - Integration ID

**Request Body:**
```json
{
  "featureTemplateId": "create_contact",
  "featureTemplateName": "Create Contact",
  "fieldMappings": {
    "first_name": {
      "enabled": true,
      "customHandlers": {
        "valueHandler": "capitalizeFirstName"
      }
    },
    "email": {
      "enabled": true,
      "customHandlers": {
        "validationHandler": "validateEmailFormat"
      }
    }
  },
  "apiConfig": {
    "apiConfigId": null,
    "method": "POST",
    "endpoint": "/api/contacts"
  },
  "extraFields": [
    {
      "fieldKey": "sheet_id",
      "label": "Google Sheet ID",
      "type": "static",
      "fieldType": "string",
      "htmlType": "text",
      "fillBy": "Admin",
      "required": true,
      "adminValue": "1BxiMVs0...",
      "order": 1
    }
  ]
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "mapping": {
    "id": "mapping_1764100935626_abc123",
    "featureTemplateId": "create_contact",
    ...
  },
  "message": "Feature mapping created successfully"
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Invalid feature template ID"
}
```

---

### Update Feature Mapping

Update an existing feature mapping.

**Endpoint:** `PUT /api/integrations/:integrationId/feature-mappings/:mappingId`

**URL Parameters:**
- `integrationId` (string, required) - Integration ID
- `mappingId` (string, required) - Mapping ID

**Request Body:** Same as Create Feature Mapping

**Success Response (200 OK):**
```json
{
  "success": true,
  "mapping": {
    "id": "mapping_1764100935626_abc123",
    "featureTemplateId": "create_contact",
    "updatedAt": "2025-11-26T11:00:00.000Z",
    ...
  },
  "message": "Feature mapping updated successfully"
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Feature mapping not found"
}
```

---

### Delete Feature Mapping

Delete a feature mapping.

**Endpoint:** `DELETE /api/integrations/:integrationId/feature-mappings/:mappingId`

**URL Parameters:**
- `integrationId` (string, required) - Integration ID
- `mappingId` (string, required) - Mapping ID

**Request Example:**
```http
DELETE /api/integrations/freshdesk/feature-mappings/mapping_1764100935626_abc123 HTTP/1.1
Host: localhost:3000
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Feature mapping deleted successfully"
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Feature mapping not found"
}
```

---

## 📝 Best Practices

### For Frontend Developers

1. **Always check `success` field** in responses before processing data
2. **Handle all error cases** with user-friendly messages
3. **Show loading states** during API calls
4. **Validate data client-side** before sending to API
5. **Never log sensitive data** (credentials, tokens) to console

### For Backend Developers

1. **Always encrypt credentials** before storage
2. **Use try-catch blocks** for all database operations
3. **Return consistent error formats** across all endpoints
4. **Validate all inputs** before processing
5. **Log errors** with context for debugging
6. **Use transaction** for operations that modify multiple records

### Testing Connections

1. **Test immediately after creation** to validate credentials
2. **Re-test periodically** to ensure connections remain valid
3. **Handle test failures gracefully** with helpful error messages
4. **Update test status** in database after each test

---

## 🔄 Changelog

### Version 1.2 (2025-11-26)
- **Feature Templates** - Added GET endpoints for feature templates
- **Feature Mappings** - Added full CRUD endpoints for feature-integration mappings
- **Table of Contents** - Updated with new endpoint sections
- **Documentation** - Added comprehensive request/response examples for feature system

### Version 1.1 (2025-11-23)
- **Enhanced PUT endpoint** - Added support for `authMethodId`, `authMethodLabel`, and `connectionName` fields
- **Enhanced GET endpoint** - Now returns `success: true` field and embedded integration metadata
- **Edit mode support** - Added comprehensive documentation for edit connection workflow
- **Smart password handling** - Documented password preservation when fields are omitted
- **Usage examples** - Added code examples for edit mode workflows

### Version 1.0 (2025-11-23)
- Initial API documentation
- Connection management endpoints
- Connection testing endpoints
- User and integration endpoints
- Comprehensive error handling documentation

---

## 📚 Related Documentation

- [User Connection Management System](./USER-CONNECTION-MANAGEMENT.md)
- [Connection Wizard Technical Guide](./CONNECTION-WIZARD.md)
- [My Connections Page Documentation](./MY-CONNECTIONS-PAGE.md)
- [Feature Templates Documentation](./FEATURE-TEMPLATES.md)
- [Feature Mapping System Guide](./FEATURE-MAPPING-SYSTEM.md)
- [Field Types and Handlers Guide](./FIELD-TYPES-AND-HANDLERS.md)
- [Elasticsearch Schema](./ELASTICSEARCH-SCHEMA.md)

---

## 🆘 Support

For issues or questions about the API:
1. Check the error message in the response
2. Verify request format matches documentation
3. Check server logs for detailed error information
4. Consult related documentation files
