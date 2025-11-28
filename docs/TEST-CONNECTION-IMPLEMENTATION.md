# Test Authentication Connection - Implementation Plan

**Created:** 2025-01-27
**Status:** Planning Phase
**Priority:** High

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture Principles](#architecture-principles)
3. [Current State Analysis](#current-state-analysis)
4. [Proposed Solution](#proposed-solution)
5. [Data Flow](#data-flow)
6. [Implementation Details](#implementation-details)
7. [File Structure](#file-structure)
8. [Test Config Structure](#test-config-structure)
9. [Authentication Strategies](#authentication-strategies)
10. [API Endpoints](#api-endpoints)
11. [Testing Strategy](#testing-strategy)
12. [Success Criteria](#success-criteria)

---

## 🎯 Overview

Implement actual connection testing functionality that validates user credentials against third-party provider APIs. Currently, the test connection feature exists but returns mock success responses without making real API calls.

### Goals

- ✅ Make actual HTTP requests to provider APIs
- ✅ Validate credentials are correct and working
- ✅ Check OAuth token expiry and auto-refresh if needed
- ✅ Verify API permissions/scopes
- ✅ Create centralized, reusable authentication library
- ✅ Support all 11 auth types defined in system
- ✅ Provide detailed error messages for failures

---

## 🏗️ Architecture Principles

### 1. Master → Instance Pattern

```
auth-types-definition.json (MASTER - Field Structures)
    ↓
Add Integration GUI (ADMIN - Fills Values)
    ↓
{integration}/auth.schema.json (INSTANCE - Saved Values)
```

**Why?**
- **Standardization**: All integrations using same auth type test consistently
- **No Duplication**: Test configuration defined once in master
- **Easy Maintenance**: Update in one place
- **No Forgotten Configs**: Automatically available for all integrations

### 2. Strategy Pattern

Each auth type has its own strategy class that implements:
- How to build authentication headers
- How to make authenticated requests
- How to refresh tokens (if applicable)

### 3. Centralized Library

All authentication logic consolidated in `utils/AuthenticationManager/` folder:
- ✅ Code reusability across entire project
- ✅ Consistency in auth handling
- ✅ Single point of bug fixes
- ✅ Easy to add new auth types
- ✅ Testable in isolation

### 4. Zero Duplication

No developer should write auth logic more than once. Import and use the centralized library everywhere.

---

## 📊 Current State Analysis

### What Exists

#### UI Components ✅
- Test connection button on "My Connections" page
- Test result modal showing success/failure
- Loading states and error handling

#### API Endpoints ✅ (But Stub Implementation)
- `POST /api/user-integrations/test-connection` - Test before saving
- `POST /api/user-integrations/:connectionId/test` - Test existing connection

**Current Implementation (server.js:845, 888):**
```javascript
// For now, return success (actual API testing will be implemented in connectionTester.js)
res.json({
    success: true,
    message: 'Connection configuration is valid'
});
```

### What Doesn't Exist

- ❌ Actual HTTP requests to provider APIs
- ❌ Real credential validation
- ❌ OAuth token refresh logic
- ❌ Centralized authentication library
- ❌ Strategy classes for different auth types
- ❌ Test configuration in auth-types-definition.json

---

## 💡 Proposed Solution

### High-Level Architecture

```
┌─────────────────────────────────────────────┐
│  User Clicks "Test Connection"              │
└────────────────┬────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────┐
│  Server Endpoint (server.js)                │
│  POST /api/user-integrations/:id/test       │
└────────────────┬────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────┐
│  ConnectionTester.js                         │
│  1. Load connection from Elasticsearch       │
│  2. Load auth type from auth-types-def.json │
│  3. Load integration auth.schema.json        │
│  4. Merge test configs (defaults+overrides)  │
└────────────────┬────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────┐
│  AuthenticationManager.js                    │
│  1. Select correct Strategy based on type    │
│  2. Create strategy instance                 │
└────────────────┬────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────┐
│  Strategy Class (e.g., ApiKeyStrategy)       │
│  1. Build authentication headers/params      │
│  2. Check token expiry (OAuth only)          │
│  3. Refresh token if needed (OAuth only)     │
└────────────────┬────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────┐
│  httpClient.js                               │
│  1. Make HTTP request to provider API        │
│  2. Handle timeouts and errors               │
│  3. Return response with status code         │
└────────────────┬────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────┐
│  Update Elasticsearch                        │
│  - lastTestStatus: 'success' | 'failed'      │
│  - lastTestDate: timestamp                   │
│  - lastTestMessage: details                  │
└────────────────┬────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────┐
│  Return Result to User                       │
│  ✓ Success or ✗ Failed with details         │
└─────────────────────────────────────────────┘
```

---

## 🔄 Data Flow

### 1. Test Configuration Flow

```
Developer Phase:
┌──────────────────────────────────────┐
│ auth-types-definition.json           │
│                                      │
│ "api_key_header": {                  │
│   "testConfig": {                    │
│     "endpoint": {                    │
│       "type": "string",              │
│       "default": "/api/v1/me",       │
│       "required": false              │
│     },                               │
│     "timeout": {                     │
│       "type": "number",              │
│       "default": 10000               │
│     }                                │
│   }                                  │
│ }                                    │
└──────────────────────────────────────┘
              ↓
Admin Phase:
┌──────────────────────────────────────┐
│ Admin GUI                            │
│ - Selects auth type                  │
│ - Optionally overrides testConfig    │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│ integrations/freshdesk/auth.schema.json│
│                                      │
│ "authMethods": [{                    │
│   "authType": "api_key_header",      │
│   "testConfig": {                    │
│     "endpoint": "/api/v2/tickets"    │← OVERRIDE
│   }                                  │
│ }]                                   │
└──────────────────────────────────────┘
              ↓
Runtime Phase:
┌──────────────────────────────────────┐
│ Merged Config Used for Testing       │
│                                      │
│ {                                    │
│   "endpoint": "/api/v2/tickets",     │← From integration
│   "timeout": 10000,                  │← From master
│   "method": "GET"                    │← From master
│ }                                    │
└──────────────────────────────────────┘
```

### 2. Authentication Flow

```
┌──────────────────────────────────────┐
│ User Connection (Elasticsearch)      │
│                                      │
│ {                                    │
│   "connectionId": "conn_123",        │
│   "userId": "user_456",              │
│   "integrationId": "freshdesk",      │
│   "authMethodId": "api_key_method",  │
│   "credentials": {                   │
│     "apiKey": "encrypted_key"        │
│   },                                 │
│   "configuredVariables": {           │
│     "subdomain": "mycompany"         │
│   }                                  │
│ }                                    │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│ AuthenticationManager                │
│ - Loads ApiKeyStrategy               │
│ - Decrypts credentials               │
│ - Builds auth headers                │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│ HTTP Request                         │
│                                      │
│ GET https://mycompany.freshdesk.com/api/v2/tickets
│ Headers:                             │
│   X-API-Key: actual_decrypted_key    │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│ Provider API Response                │
│ - 200 OK = Success                   │
│ - 401 Unauthorized = Invalid Key     │
│ - 403 Forbidden = No Permission      │
│ - 404 Not Found = Wrong Endpoint     │
│ - 500 Server Error = Provider Issue  │
└──────────────────────────────────────┘
```

---

## 🛠️ Implementation Details

### Phase 1: Update Master Configuration

#### File: `auth-types-definition.json`

Add `testConfig` field definitions to each auth type.

**Important:** We define FIELD STRUCTURE, not values!

**For Simple Auth Types** (api_key_header, api_key_query, bearer_token, basic_auth):

```json
{
  "authTypes": {
    "api_key_header": {
      "label": "API Key (Header)",
      "description": "API key passed in request header",
      "category": "simple",

      "configOptions": {
        // ... existing config options ...
      },

      "credentialFields": {
        // ... existing credential fields ...
      },

      "testConfig": {
        "endpoint": {
          "type": "string",
          "label": "Test Endpoint",
          "required": false,
          "default": "/api/v1/me",
          "helpText": "API endpoint to test the connection (lightweight endpoint like /me, /user, /health)",
          "placeholder": "/api/v1/me",
          "examples": ["/api/v1/me", "/api/user", "/api/health", "/api/info"]
        },
        "method": {
          "type": "string",
          "label": "HTTP Method",
          "required": false,
          "default": "GET",
          "options": ["GET", "POST"],
          "locked": true,
          "helpText": "HTTP method for test request (usually GET)"
        },
        "timeout": {
          "type": "number",
          "label": "Request Timeout (ms)",
          "required": false,
          "default": 10000,
          "helpText": "Maximum time to wait for API response in milliseconds"
        },
        "expectedStatusCodes": {
          "type": "array",
          "label": "Expected Success Status Codes",
          "required": false,
          "default": [200, 201],
          "helpText": "HTTP status codes that indicate successful connection",
          "examples": [[200, 201], [200, 201, 204]]
        }
      }
    }
  }
}
```

**For OAuth Types** (oauth2_authorization_code, oauth2_client_credentials, oauth2_service_account):

```json
{
  "authTypes": {
    "oauth2_authorization_code": {
      "label": "OAuth 2.0 - Authorization Code",
      "description": "OAuth2 flow requiring user authorization",
      "category": "oauth",

      "configOptions": {
        // ... existing config options ...
      },

      "credentialFields": {
        // ... existing credential fields ...
      },

      "testConfig": {
        "endpoint": {
          "type": "string",
          "label": "Test Endpoint",
          "required": false,
          "default": "/api/v1/me",
          "helpText": "API endpoint to test the connection",
          "examples": ["/api/v1/me", "/api/user", "/oauth2/userinfo"]
        },
        "method": {
          "type": "string",
          "label": "HTTP Method",
          "required": false,
          "default": "GET",
          "options": ["GET"],
          "locked": true
        },
        "timeout": {
          "type": "number",
          "label": "Request Timeout (ms)",
          "required": false,
          "default": 10000
        },
        "expectedStatusCodes": {
          "type": "array",
          "label": "Expected Success Status Codes",
          "required": false,
          "default": [200, 201]
        },
        "checkTokenExpiry": {
          "type": "boolean",
          "label": "Check Token Expiry",
          "required": false,
          "default": true,
          "locked": true,
          "helpText": "Automatically check if access token is expired before testing"
        },
        "autoRefreshToken": {
          "type": "boolean",
          "label": "Auto-Refresh Expired Token",
          "required": false,
          "default": true,
          "locked": true,
          "helpText": "Automatically refresh token if expired before testing"
        },
        "validateScopes": {
          "type": "boolean",
          "label": "Validate Token Scopes",
          "required": false,
          "default": false,
          "helpText": "Check if token has required scopes/permissions"
        },
        "requiredScopes": {
          "type": "array",
          "label": "Required Scopes",
          "required": false,
          "default": [],
          "helpText": "List of scopes that must be present in token",
          "dependsOn": {
            "validateScopes": true
          }
        }
      },

      "storedTokens": ["accessToken", "refreshToken", "tokenType", "expiresIn", "expiresAt", "scope"]
    }
  }
}
```

**For Custom Headers:**

```json
{
  "authTypes": {
    "custom_headers": {
      "label": "Custom Headers",
      "description": "Multiple custom headers for authentication",
      "category": "simple",

      "testConfig": {
        "endpoint": {
          "type": "string",
          "label": "Test Endpoint",
          "required": false,
          "default": "/api/v1/health"
        },
        "method": {
          "type": "string",
          "label": "HTTP Method",
          "required": false,
          "default": "GET",
          "options": ["GET", "POST"]
        },
        "timeout": {
          "type": "number",
          "label": "Request Timeout (ms)",
          "required": false,
          "default": 10000
        },
        "expectedStatusCodes": {
          "type": "array",
          "label": "Expected Success Status Codes",
          "required": false,
          "default": [200, 201]
        }
      }
    }
  }
}
```

**For Database Credentials:**

```json
{
  "authTypes": {
    "database_credentials": {
      "label": "Database Credentials",
      "description": "Database connection credentials",
      "category": "database",

      "testConfig": {
        "testQuery": {
          "type": "string",
          "label": "Test Query",
          "required": false,
          "default": "SELECT 1",
          "helpText": "Simple query to test database connection"
        },
        "timeout": {
          "type": "number",
          "label": "Connection Timeout (ms)",
          "required": false,
          "default": 5000
        }
      }
    }
  }
}
```

**For SSH Key:**

```json
{
  "authTypes": {
    "ssh_key": {
      "label": "SSH Private Key",
      "description": "SSH authentication using private key",
      "category": "advanced",

      "testConfig": {
        "testCommand": {
          "type": "string",
          "label": "Test Command",
          "required": false,
          "default": "echo 'connected'",
          "helpText": "Simple command to test SSH connection"
        },
        "timeout": {
          "type": "number",
          "label": "Connection Timeout (ms)",
          "required": false,
          "default": 10000
        }
      }
    }
  }
}
```

---

### Phase 2: Create Authentication Library

#### Folder Structure

```
utils/
└── AuthenticationManager/
    ├── index.js                    # Main export
    ├── AuthenticationManager.js    # Core orchestrator class
    ├── ConnectionTester.js         # Test connection logic
    ├── httpClient.js               # HTTP request wrapper
    ├── strategies/
    │   ├── BaseStrategy.js         # Abstract base class
    │   ├── ApiKeyStrategy.js       # API Key (Header/Query)
    │   ├── BasicAuthStrategy.js    # Basic Authentication
    │   ├── BearerTokenStrategy.js  # Bearer Token
    │   ├── OAuth2Strategy.js       # OAuth 2.0 (all grant types)
    │   ├── OAuth1Strategy.js       # OAuth 1.0a
    │   ├── JWTStrategy.js          # JWT tokens
    │   ├── CustomHeadersStrategy.js # Custom headers
    │   ├── AWSSignatureStrategy.js # AWS Signature v4
    │   ├── DatabaseStrategy.js     # Database connections
    │   └── SSHStrategy.js          # SSH connections
    └── helpers/
        ├── tokenValidator.js       # Token expiry checking
        ├── scopeChecker.js         # Scope validation
        ├── errorHandler.js         # Error formatting
        └── configMerger.js         # Merge default + override configs
```

---

### Phase 3: Implementation of Core Classes

#### 1. `index.js` - Main Export

```javascript
/**
 * Authentication Manager Module
 * Centralized authentication library for all auth types
 */

const AuthenticationManager = require('./AuthenticationManager');
const ConnectionTester = require('./ConnectionTester');

module.exports = {
    AuthenticationManager,
    ConnectionTester
};
```

---

#### 2. `AuthenticationManager.js` - Core Orchestrator

```javascript
/**
 * AuthenticationManager.js
 * Main class that orchestrates authentication for different auth types
 */

const ApiKeyStrategy = require('./strategies/ApiKeyStrategy');
const BasicAuthStrategy = require('./strategies/BasicAuthStrategy');
const BearerTokenStrategy = require('./strategies/BearerTokenStrategy');
const OAuth2Strategy = require('./strategies/OAuth2Strategy');
const OAuth1Strategy = require('./strategies/OAuth1Strategy');
const JWTStrategy = require('./strategies/JWTStrategy');
const CustomHeadersStrategy = require('./strategies/CustomHeadersStrategy');
const AWSSignatureStrategy = require('./strategies/AWSSignatureStrategy');
const DatabaseStrategy = require('./strategies/DatabaseStrategy');
const SSHStrategy = require('./strategies/SSHStrategy');

class AuthenticationManager {
    constructor(connection, authTypeDefinition, authMethodConfig) {
        this.connection = connection;
        this.authTypeDefinition = authTypeDefinition;
        this.authMethodConfig = authMethodConfig;
        this.authType = connection.authType || authMethodConfig.authType;

        // Load appropriate strategy
        this.strategy = this.loadStrategy(this.authType);
    }

    /**
     * Load the appropriate strategy based on auth type
     */
    loadStrategy(authType) {
        const strategies = {
            'api_key_header': new ApiKeyStrategy(),
            'api_key_query': new ApiKeyStrategy(),
            'bearer_token': new BearerTokenStrategy(),
            'basic_auth': new BasicAuthStrategy(),
            'custom_headers': new CustomHeadersStrategy(),
            'oauth2_authorization_code': new OAuth2Strategy(),
            'oauth2_client_credentials': new OAuth2Strategy(),
            'oauth2_service_account': new OAuth2Strategy(),
            'oauth1': new OAuth1Strategy(),
            'jwt': new JWTStrategy(),
            'aws_signature_v4': new AWSSignatureStrategy(),
            'database_credentials': new DatabaseStrategy(),
            'ssh_key': new SSHStrategy()
        };

        const strategy = strategies[authType];
        if (!strategy) {
            throw new Error(`Unsupported auth type: ${authType}`);
        }

        return strategy;
    }

    /**
     * Build authentication headers/params
     */
    async buildAuthHeaders() {
        return await this.strategy.buildHeaders(
            this.connection.credentials,
            this.authMethodConfig.config,
            this.connection.configuredVariables
        );
    }

    /**
     * Test connection to provider API
     */
    async testConnection(baseUrl, testConfig) {
        // Check token expiry for OAuth (if applicable)
        if (this.strategy.supportsTokenRefresh && testConfig.checkTokenExpiry) {
            const tokenStatus = await this.checkTokenExpiry();

            if (tokenStatus.expired && testConfig.autoRefreshToken) {
                await this.refreshToken();
            } else if (tokenStatus.expired && !testConfig.autoRefreshToken) {
                return {
                    success: false,
                    message: 'Access token expired',
                    details: { tokenStatus: 'expired' }
                };
            }
        }

        // Build authentication headers
        const authHeaders = await this.buildAuthHeaders();

        // Make test request
        const result = await this.strategy.testConnection(
            baseUrl,
            testConfig.endpoint,
            authHeaders,
            testConfig
        );

        return result;
    }

    /**
     * Check if token is expired (OAuth only)
     */
    async checkTokenExpiry() {
        if (!this.strategy.supportsTokenRefresh) {
            return { expired: false };
        }

        const tokenValidator = require('./helpers/tokenValidator');
        return tokenValidator.checkExpiry(this.connection.storedTokens);
    }

    /**
     * Refresh expired token (OAuth only)
     */
    async refreshToken() {
        if (!this.strategy.supportsTokenRefresh) {
            throw new Error('Token refresh not supported for this auth type');
        }

        const newTokens = await this.strategy.refreshToken(
            this.connection.credentials,
            this.connection.storedTokens,
            this.authMethodConfig.config
        );

        // Update connection with new tokens
        const elasticsearch = require('../../services/elasticsearch');
        await elasticsearch.updateConnection(this.connection.connectionId, {
            storedTokens: newTokens
        });

        // Update local instance
        this.connection.storedTokens = newTokens;

        return newTokens;
    }

    /**
     * Validate credentials (basic validation before making request)
     */
    validateCredentials() {
        const authTypeFields = this.authTypeDefinition.credentialFields;
        const providedCreds = this.connection.credentials;

        const missing = [];

        for (const [fieldKey, fieldDef] of Object.entries(authTypeFields)) {
            if (fieldDef.required && !providedCreds[fieldKey]) {
                missing.push(fieldKey);
            }
        }

        if (missing.length > 0) {
            throw new Error(`Missing required credentials: ${missing.join(', ')}`);
        }

        return true;
    }
}

module.exports = AuthenticationManager;
```

---

#### 3. `ConnectionTester.js` - Test Logic

```javascript
/**
 * ConnectionTester.js
 * Handles connection testing logic
 */

const fs = require('fs');
const path = require('path');
const AuthenticationManager = require('./AuthenticationManager');
const elasticsearch = require('../../services/elasticsearch');
const dynamicVariables = require('../dynamicVariables');
const configMerger = require('./helpers/configMerger');
const errorHandler = require('./helpers/errorHandler');

class ConnectionTester {
    /**
     * Test an existing connection
     */
    static async testExistingConnection(connectionId) {
        const startTime = Date.now();

        try {
            // 1. Load connection from Elasticsearch
            const connection = await elasticsearch.getConnectionById(connectionId);

            if (!connection) {
                throw new Error('Connection not found');
            }

            // 2. Load auth type definition
            const authTypesPath = path.join(__dirname, '../../auth-types-definition.json');
            const authTypesDef = JSON.parse(fs.readFileSync(authTypesPath, 'utf8'));
            const authType = connection.authType || connection.authMethodId.split('_')[0]; // Extract from ID
            const authTypeDefinition = authTypesDef.authTypes[authType];

            if (!authTypeDefinition) {
                throw new Error(`Auth type definition not found: ${authType}`);
            }

            // 3. Load integration auth schema
            const authSchemaPath = path.join(
                __dirname,
                '../../integrations/providers',
                connection.integrationId,
                'auth.schema.json'
            );

            const authSchema = JSON.parse(fs.readFileSync(authSchemaPath, 'utf8'));
            const authMethod = authSchema.authMethods.find(m => m.id === connection.authMethodId);

            if (!authMethod) {
                throw new Error('Auth method not found in schema');
            }

            // 4. Merge test configs (defaults from auth-types-definition + overrides from auth.schema)
            const testConfig = configMerger.mergeTestConfig(
                authTypeDefinition.testConfig,
                authMethod.testConfig
            );

            // 5. Build base URL with dynamic variables
            const baseUrl = dynamicVariables.replaceDynamicVariables(
                authSchema.baseUrl || '',
                connection.configuredVariables
            );

            // 6. Create AuthenticationManager instance
            const authManager = new AuthenticationManager(
                connection,
                authTypeDefinition,
                authMethod
            );

            // 7. Validate credentials
            authManager.validateCredentials();

            // 8. Test connection
            const result = await authManager.testConnection(baseUrl, testConfig);

            const responseTime = Date.now() - startTime;

            // 9. Update connection in Elasticsearch with test result
            await elasticsearch.updateConnection(connectionId, {
                lastTestStatus: result.success ? 'success' : 'failed',
                lastTestMessage: result.message,
                lastTestDate: new Date().toISOString()
            });

            // 10. Return result
            return {
                success: result.success,
                statusCode: result.statusCode,
                responseTime,
                message: result.message,
                details: result.details,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            const responseTime = Date.now() - startTime;

            // Update connection with failure
            try {
                await elasticsearch.updateConnection(connectionId, {
                    lastTestStatus: 'failed',
                    lastTestMessage: error.message,
                    lastTestDate: new Date().toISOString()
                });
            } catch (updateError) {
                console.error('Error updating test status:', updateError);
            }

            return errorHandler.formatError(error, responseTime);
        }
    }

    /**
     * Test connection before saving (wizard flow)
     */
    static async testConnectionBeforeSave(integrationId, authMethodId, credentials, configuredVariables) {
        const startTime = Date.now();

        try {
            // Load auth type definition
            const authTypesPath = path.join(__dirname, '../../auth-types-definition.json');
            const authTypesDef = JSON.parse(fs.readFileSync(authTypesPath, 'utf8'));

            // Load integration auth schema
            const authSchemaPath = path.join(
                __dirname,
                '../../integrations/providers',
                integrationId,
                'auth.schema.json'
            );

            const authSchema = JSON.parse(fs.readFileSync(authSchemaPath, 'utf8'));
            const authMethod = authSchema.authMethods.find(m => m.id === authMethodId);

            if (!authMethod) {
                throw new Error('Auth method not found');
            }

            const authType = authMethod.authType;
            const authTypeDefinition = authTypesDef.authTypes[authType];

            // Create temporary connection object
            const tempConnection = {
                integrationId,
                authMethodId,
                authType,
                credentials,
                configuredVariables,
                storedTokens: {}
            };

            // Merge test configs
            const testConfig = configMerger.mergeTestConfig(
                authTypeDefinition.testConfig,
                authMethod.testConfig
            );

            // Build base URL
            const baseUrl = dynamicVariables.replaceDynamicVariables(
                authSchema.baseUrl || '',
                configuredVariables
            );

            // Create AuthenticationManager
            const authManager = new AuthenticationManager(
                tempConnection,
                authTypeDefinition,
                authMethod
            );

            // Validate and test
            authManager.validateCredentials();
            const result = await authManager.testConnection(baseUrl, testConfig);

            const responseTime = Date.now() - startTime;

            return {
                success: result.success,
                statusCode: result.statusCode,
                responseTime,
                message: result.message,
                details: result.details,
                baseUrl,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            const responseTime = Date.now() - startTime;
            return errorHandler.formatError(error, responseTime);
        }
    }
}

module.exports = ConnectionTester;
```

---

#### 4. `httpClient.js` - HTTP Wrapper

```javascript
/**
 * httpClient.js
 * Wrapper around Node.js https/http module
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

class HttpClient {
    /**
     * Make HTTP request
     */
    static async request(url, options = {}) {
        return new Promise((resolve, reject) => {
            const parsedUrl = new URL(url);
            const isHttps = parsedUrl.protocol === 'https:';
            const client = isHttps ? https : http;

            const requestOptions = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (isHttps ? 443 : 80),
                path: parsedUrl.pathname + parsedUrl.search,
                method: options.method || 'GET',
                headers: options.headers || {},
                timeout: options.timeout || 10000
            };

            const req = client.request(requestOptions, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    const result = {
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: data
                    };

                    // Try to parse JSON
                    try {
                        result.json = JSON.parse(data);
                    } catch (e) {
                        result.json = null;
                    }

                    resolve(result);
                });
            });

            req.on('error', (error) => {
                reject(new Error(`Request failed: ${error.message}`));
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            // Send body if provided
            if (options.body) {
                req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
            }

            req.end();
        });
    }

    /**
     * Make GET request
     */
    static async get(url, headers = {}, timeout = 10000) {
        return this.request(url, { method: 'GET', headers, timeout });
    }

    /**
     * Make POST request
     */
    static async post(url, body = {}, headers = {}, timeout = 10000) {
        return this.request(url, { method: 'POST', body, headers, timeout });
    }
}

module.exports = HttpClient;
```

---

#### 5. Base Strategy Class

**File:** `strategies/BaseStrategy.js`

```javascript
/**
 * BaseStrategy.js
 * Abstract base class for all authentication strategies
 */

const HttpClient = require('../httpClient');
const CryptoJS = require('crypto-js');

class BaseStrategy {
    constructor() {
        this.supportsTokenRefresh = false;
    }

    /**
     * Build authentication headers (must be implemented by subclass)
     */
    async buildHeaders(credentials, config, variables) {
        throw new Error('buildHeaders must be implemented by subclass');
    }

    /**
     * Test connection (common implementation)
     */
    async testConnection(baseUrl, endpoint, headers, testConfig) {
        try {
            const url = baseUrl + endpoint;
            const method = testConfig.method || 'GET';
            const timeout = testConfig.timeout || 10000;

            const response = await HttpClient.request(url, {
                method,
                headers,
                timeout
            });

            const expectedCodes = testConfig.expectedStatusCodes || [200, 201];
            const success = expectedCodes.includes(response.statusCode);

            return {
                success,
                statusCode: response.statusCode,
                message: success
                    ? 'Connection successful'
                    : `Unexpected status code: ${response.statusCode}`,
                details: {
                    endpoint,
                    method,
                    responseHeaders: response.headers
                }
            };

        } catch (error) {
            return {
                success: false,
                statusCode: null,
                message: error.message,
                details: {
                    endpoint,
                    error: error.message
                }
            };
        }
    }

    /**
     * Decrypt credential (common utility)
     */
    decryptCredential(encryptedValue) {
        const SECRET_KEY = process.env.ENCRYPTION_KEY || 'default-secret-key';
        const decrypted = CryptoJS.AES.decrypt(encryptedValue, SECRET_KEY);
        return decrypted.toString(CryptoJS.enc.Utf8);
    }

    /**
     * Refresh token (override if auth type supports refresh)
     */
    async refreshToken(credentials, storedTokens, config) {
        throw new Error('Token refresh not supported for this auth type');
    }
}

module.exports = BaseStrategy;
```

---

#### 6. API Key Strategy

**File:** `strategies/ApiKeyStrategy.js`

```javascript
/**
 * ApiKeyStrategy.js
 * Handles API Key authentication (Header and Query param)
 */

const BaseStrategy = require('./BaseStrategy');

class ApiKeyStrategy extends BaseStrategy {
    async buildHeaders(credentials, config, variables) {
        const apiKey = this.decryptCredential(credentials.apiKey);
        const headers = {};

        if (config.headerName) {
            // API Key in header
            const prefix = config.prefix || '';
            headers[config.headerName] = prefix + apiKey;
        }

        return headers;
    }

    async testConnection(baseUrl, endpoint, headers, testConfig) {
        // For query param auth, add key to URL
        if (testConfig.authType === 'api_key_query') {
            const apiKey = headers['X-API-Key']; // Temp stored in header
            delete headers['X-API-Key'];

            const separator = endpoint.includes('?') ? '&' : '?';
            const paramName = testConfig.config.paramName || 'apiKey';
            endpoint = `${endpoint}${separator}${paramName}=${apiKey}`;
        }

        return super.testConnection(baseUrl, endpoint, headers, testConfig);
    }
}

module.exports = ApiKeyStrategy;
```

---

#### 7. OAuth2 Strategy

**File:** `strategies/OAuth2Strategy.js`

```javascript
/**
 * OAuth2Strategy.js
 * Handles OAuth 2.0 authentication
 */

const BaseStrategy = require('./BaseStrategy');
const HttpClient = require('../httpClient');

class OAuth2Strategy extends BaseStrategy {
    constructor() {
        super();
        this.supportsTokenRefresh = true;
    }

    async buildHeaders(credentials, config, variables) {
        // For OAuth, we use stored access token, not credentials directly
        // This is called from AuthenticationManager which has storedTokens

        return {
            'Authorization': 'Bearer ' // Token will be added by caller
        };
    }

    async testConnection(baseUrl, endpoint, headers, testConfig) {
        // Add actual token to header (from connection.storedTokens)
        // This will be passed by AuthenticationManager

        return super.testConnection(baseUrl, endpoint, headers, testConfig);
    }

    async refreshToken(credentials, storedTokens, config) {
        try {
            const tokenUrl = config.refreshTokenUrl || config.tokenUrl;

            const body = {
                grant_type: 'refresh_token',
                refresh_token: storedTokens.refreshToken,
                client_id: credentials.clientId,
                client_secret: this.decryptCredential(credentials.clientSecret)
            };

            const response = await HttpClient.post(
                tokenUrl,
                new URLSearchParams(body).toString(),
                {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            );

            if (response.statusCode !== 200) {
                throw new Error('Token refresh failed');
            }

            const tokens = response.json;

            return {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token || storedTokens.refreshToken,
                tokenType: tokens.token_type,
                expiresIn: tokens.expires_in,
                expiresAt: Date.now() + (tokens.expires_in * 1000),
                scope: tokens.scope
            };

        } catch (error) {
            throw new Error(`Token refresh failed: ${error.message}`);
        }
    }
}

module.exports = OAuth2Strategy;
```

---

#### 8. Helper: Token Validator

**File:** `helpers/tokenValidator.js`

```javascript
/**
 * tokenValidator.js
 * Validates OAuth token expiry
 */

class TokenValidator {
    /**
     * Check if token is expired
     */
    static checkExpiry(storedTokens) {
        if (!storedTokens || !storedTokens.expiresAt) {
            return { expired: false, message: 'No expiry info available' };
        }

        const now = Date.now();
        const expiresAt = storedTokens.expiresAt;
        const bufferTime = 60000; // 1 minute buffer

        const expired = now >= (expiresAt - bufferTime);

        return {
            expired,
            expiresAt,
            remainingTime: expiresAt - now,
            message: expired ? 'Token expired' : 'Token valid'
        };
    }
}

module.exports = TokenValidator;
```

---

#### 9. Helper: Config Merger

**File:** `helpers/configMerger.js`

```javascript
/**
 * configMerger.js
 * Merges default testConfig with integration overrides
 */

class ConfigMerger {
    /**
     * Merge test config from master definition and integration override
     */
    static mergeTestConfig(masterTestConfig, integrationTestConfig) {
        // Extract default values from master
        const defaults = {};

        if (masterTestConfig) {
            for (const [key, fieldDef] of Object.entries(masterTestConfig)) {
                if (fieldDef.default !== undefined) {
                    defaults[key] = fieldDef.default;
                }
            }
        }

        // Merge with integration overrides
        return {
            ...defaults,
            ...(integrationTestConfig || {})
        };
    }
}

module.exports = ConfigMerger;
```

---

#### 10. Helper: Error Handler

**File:** `helpers/errorHandler.js`

```javascript
/**
 * errorHandler.js
 * Formats errors for consistent response
 */

class ErrorHandler {
    static formatError(error, responseTime = null) {
        let statusCode = null;
        let message = error.message;
        let errorType = 'unknown';

        // Categorize errors
        if (message.includes('timeout')) {
            errorType = 'timeout';
            message = 'Connection timeout - Provider API did not respond';
        } else if (message.includes('ENOTFOUND') || message.includes('ECONNREFUSED')) {
            errorType = 'connection';
            message = 'Cannot reach provider API - Check endpoint URL';
        } else if (message.includes('401')) {
            errorType = 'authentication';
            statusCode = 401;
            message = 'Authentication failed - Invalid credentials';
        } else if (message.includes('403')) {
            errorType = 'authorization';
            statusCode = 403;
            message = 'Authorization failed - Insufficient permissions';
        } else if (message.includes('404')) {
            errorType = 'not_found';
            statusCode = 404;
            message = 'Endpoint not found - Check test endpoint URL';
        }

        return {
            success: false,
            statusCode,
            responseTime,
            message,
            error: {
                type: errorType,
                details: error.stack
            },
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = ErrorHandler;
```

---

### Phase 4: Update Server Endpoints

#### File: `server.js`

Replace stub implementations with actual testing logic.

**Current Implementation (Line ~812):**

```javascript
// Test connection before saving (used in wizard)
app.post('/api/user-integrations/test-connection', async (req, res) => {
    try {
        const { integrationId, authMethodId, configuredVariables, credentials } = req.body;

        // ... validation code ...

        // For now, return success (actual API testing will be implemented in connectionTester.js)
        res.json({
            success: true,
            message: 'Connection configuration is valid',
            baseUrl: baseUrl
        });
    } catch (error) {
        console.error('Error testing connection:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Connection test failed'
        });
    }
});
```

**New Implementation:**

```javascript
// Test connection before saving (used in wizard)
const { ConnectionTester } = require('./utils/AuthenticationManager');

app.post('/api/user-integrations/test-connection', async (req, res) => {
    try {
        const { integrationId, authMethodId, configuredVariables, credentials } = req.body;

        if (!integrationId || !authMethodId || !credentials) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: integrationId, authMethodId, or credentials'
            });
        }

        const result = await ConnectionTester.testConnectionBeforeSave(
            integrationId,
            authMethodId,
            credentials,
            configuredVariables
        );

        const statusCode = result.success ? 200 : 400;
        res.status(statusCode).json(result);

    } catch (error) {
        console.error('Error testing connection:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Connection test failed',
            timestamp: new Date().toISOString()
        });
    }
});
```

**Current Implementation (Line ~861):**

```javascript
// Test existing connection
app.post('/api/user-integrations/:connectionId/test', async (req, res) => {
    try {
        const connection = await elasticsearch.getConnectionById(req.params.connectionId);

        // ... validation and loading auth schema ...

        // For now, return success (actual API testing will be implemented in connectionTester.js)
        const testResult = {
            success: true,
            message: 'Connection test successful',
            statusCode: 200,
            timestamp: new Date().toISOString()
        };

        // Update connection with test result
        await elasticsearch.updateConnection(req.params.connectionId, {
            lastTestStatus: 'success',
            lastTestMessage: testResult.message,
            lastTestDate: testResult.timestamp
        });

        res.json(testResult);
    } catch (error) {
        console.error('Error testing connection:', error);
        // ... error handling ...
    }
});
```

**New Implementation:**

```javascript
// Test existing connection
const { ConnectionTester } = require('./utils/AuthenticationManager');

app.post('/api/user-integrations/:connectionId/test', async (req, res) => {
    try {
        const result = await ConnectionTester.testExistingConnection(
            req.params.connectionId
        );

        const statusCode = result.success ? 200 : 400;
        res.status(statusCode).json(result);

    } catch (error) {
        console.error('Error testing connection:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Connection test failed',
            timestamp: new Date().toISOString()
        });
    }
});
```

---

### Phase 5: Add Test Config to Integration Schemas (Optional)

Admins can override test endpoints for specific integrations.

#### Example: `integrations/providers/freshdesk/auth.schema.json`

```json
{
  "version": "1.0.0",
  "authMethods": [
    {
      "id": "api_key_header_method",
      "authType": "api_key_header",
      "label": "API Key (Header)",
      "isDefault": true,
      "priority": 3,
      "config": {
        "headerName": "API Key",
        "prefix": "apiKey",
        "isDefault": true
      },
      "testConfig": {
        "endpoint": "/api/v2/tickets?per_page=1",
        "timeout": 8000
      },
      "additionalFields": [
        {
          "name": "sub_domain",
          "label": "Sub Domain Company Name",
          "type": "string",
          "required": true
        }
      ]
    }
  ]
}
```

**Note:** If `testConfig` is not provided, defaults from `auth-types-definition.json` will be used.

---

## 📊 Test Config Structure

### Summary of All Auth Types

| Auth Type | Needs Test Endpoint? | Token Refresh? | Special Handling |
|-----------|---------------------|----------------|------------------|
| `api_key_header` | ✅ Yes | ❌ No | None |
| `api_key_query` | ✅ Yes | ❌ No | Add key to query param |
| `bearer_token` | ✅ Yes | ❌ No | None |
| `basic_auth` | ✅ Yes | ❌ No | None |
| `custom_headers` | ✅ Yes | ❌ No | Multiple headers |
| `oauth2_authorization_code` | ✅ Yes | ✅ Yes | Token expiry check |
| `oauth2_client_credentials` | ✅ Yes | ✅ Yes | Token expiry check |
| `oauth2_service_account` | ✅ Yes | ✅ Yes | Generate JWT first |
| `oauth1` | ✅ Yes | ❌ No | OAuth signature |
| `jwt` | ✅ Yes | ❌ No | Generate JWT |
| `aws_signature_v4` | ✅ Yes | ❌ No | AWS signature |
| `database_credentials` | ✅ Yes (Query) | ❌ No | Database connection |
| `ssh_key` | ✅ Yes (Command) | ❌ No | SSH connection |

---

## 🔐 Authentication Strategies

### Strategy Implementation Checklist

#### ✅ Priority 1 (Common Auth Types)
- [ ] `ApiKeyStrategy.js` - API Key (Header/Query)
- [ ] `BasicAuthStrategy.js` - Basic Authentication
- [ ] `BearerTokenStrategy.js` - Bearer Token
- [ ] `OAuth2Strategy.js` - OAuth 2.0 (all variants)
- [ ] `CustomHeadersStrategy.js` - Custom Headers

#### ✅ Priority 2 (Advanced Auth Types)
- [ ] `JWTStrategy.js` - JWT Tokens
- [ ] `OAuth1Strategy.js` - OAuth 1.0a
- [ ] `AWSSignatureStrategy.js` - AWS Signature v4

#### ✅ Priority 3 (Specialized)
- [ ] `DatabaseStrategy.js` - Database Connections
- [ ] `SSHStrategy.js` - SSH Key Authentication

---

## 🔌 API Endpoints

### Existing Endpoints (to be updated)

#### 1. Test Connection Before Saving

**Endpoint:** `POST /api/user-integrations/test-connection`

**Purpose:** Test credentials in wizard before saving connection

**Request Body:**
```json
{
  "integrationId": "freshdesk",
  "authMethodId": "api_key_header_method",
  "credentials": {
    "apiKey": "encrypted_key_value"
  },
  "configuredVariables": {
    "subdomain": "mycompany"
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "statusCode": 200,
  "responseTime": 1234,
  "message": "Connection successful",
  "details": {
    "endpoint": "/api/v2/tickets?per_page=1",
    "method": "GET"
  },
  "baseUrl": "https://mycompany.freshdesk.com",
  "timestamp": "2025-01-27T10:30:00.000Z"
}
```

**Response (Failure):**
```json
{
  "success": false,
  "statusCode": 401,
  "responseTime": 856,
  "message": "Authentication failed - Invalid credentials",
  "error": {
    "type": "authentication",
    "details": "..."
  },
  "timestamp": "2025-01-27T10:30:00.000Z"
}
```

---

#### 2. Test Existing Connection

**Endpoint:** `POST /api/user-integrations/:connectionId/test`

**Purpose:** Test an existing saved connection

**Parameters:**
- `connectionId` - Connection ID from Elasticsearch

**Response (Success):**
```json
{
  "success": true,
  "statusCode": 200,
  "responseTime": 1123,
  "message": "Connection successful",
  "details": {
    "endpoint": "/api/v2/tickets",
    "method": "GET",
    "tokenStatus": "valid"
  },
  "timestamp": "2025-01-27T10:30:00.000Z"
}
```

**Response (Token Refreshed):**
```json
{
  "success": true,
  "statusCode": 200,
  "responseTime": 2345,
  "message": "Connection successful (token refreshed)",
  "details": {
    "endpoint": "/api/v2/tickets",
    "method": "GET",
    "tokenStatus": "refreshed"
  },
  "timestamp": "2025-01-27T10:30:00.000Z"
}
```

---

## 🧪 Testing Strategy

### Unit Testing

#### 1. Test Each Strategy Individually

```javascript
// tests/strategies/ApiKeyStrategy.test.js
const ApiKeyStrategy = require('../utils/AuthenticationManager/strategies/ApiKeyStrategy');

describe('ApiKeyStrategy', () => {
    test('should build headers correctly', async () => {
        const strategy = new ApiKeyStrategy();
        const credentials = { apiKey: 'encrypted_test_key' };
        const config = { headerName: 'X-API-Key', prefix: '' };

        const headers = await strategy.buildHeaders(credentials, config, {});

        expect(headers['X-API-Key']).toBeDefined();
    });
});
```

#### 2. Test AuthenticationManager

```javascript
// tests/AuthenticationManager.test.js
const AuthenticationManager = require('../utils/AuthenticationManager/AuthenticationManager');

describe('AuthenticationManager', () => {
    test('should load correct strategy for api_key_header', () => {
        const connection = { authType: 'api_key_header' };
        const manager = new AuthenticationManager(connection, {}, {});

        expect(manager.strategy.constructor.name).toBe('ApiKeyStrategy');
    });
});
```

### Integration Testing

#### 1. Test Real API Calls (with test credentials)

```javascript
// tests/integration/freshdesk.test.js
const ConnectionTester = require('../utils/AuthenticationManager/ConnectionTester');

describe('Freshdesk Integration', () => {
    test('should successfully test Freshdesk connection', async () => {
        const result = await ConnectionTester.testConnectionBeforeSave(
            'freshdesk',
            'api_key_header_method',
            { apiKey: process.env.TEST_FRESHDESK_KEY },
            { subdomain: 'testcompany' }
        );

        expect(result.success).toBe(true);
        expect(result.statusCode).toBe(200);
    });
});
```

### Manual Testing Checklist

- [ ] Test API Key authentication with valid key
- [ ] Test API Key authentication with invalid key
- [ ] Test Basic Auth with valid credentials
- [ ] Test Basic Auth with invalid credentials
- [ ] Test OAuth 2.0 with valid token
- [ ] Test OAuth 2.0 with expired token (should auto-refresh)
- [ ] Test OAuth 2.0 with invalid refresh token
- [ ] Test connection timeout scenario
- [ ] Test unreachable endpoint
- [ ] Test wrong endpoint (404)
- [ ] Test with missing credentials
- [ ] Test token refresh for OAuth

---

## ✅ Success Criteria

### Functional Requirements

- ✅ All 11 auth types supported
- ✅ Actual HTTP requests made to provider APIs
- ✅ Credentials validated against real endpoints
- ✅ OAuth token expiry detected and handled
- ✅ Automatic token refresh for OAuth
- ✅ API permissions/scopes verified (OAuth)
- ✅ Detailed error messages for all failure types
- ✅ Test results saved to Elasticsearch
- ✅ Response time tracking

### Technical Requirements

- ✅ Centralized authentication library created
- ✅ Strategy pattern implemented for all auth types
- ✅ Zero code duplication across project
- ✅ Reusable across all pages/components
- ✅ Easy to add new auth types
- ✅ Easy to swap implementations (e.g., add third-party library later)
- ✅ Proper error handling and categorization
- ✅ Timeout handling

### UI/UX Requirements

- ✅ Clear success/failure messages
- ✅ Loading state during test
- ✅ Detailed error information
- ✅ Last test date and status displayed
- ✅ One-click test from connection card
- ✅ Test results persist in database

---

## 📝 Files Summary

### Files to Create (17 files)

#### Core Library (4 files)
1. `utils/AuthenticationManager/index.js`
2. `utils/AuthenticationManager/AuthenticationManager.js`
3. `utils/AuthenticationManager/ConnectionTester.js`
4. `utils/AuthenticationManager/httpClient.js`

#### Strategy Classes (10 files)
5. `utils/AuthenticationManager/strategies/BaseStrategy.js`
6. `utils/AuthenticationManager/strategies/ApiKeyStrategy.js`
7. `utils/AuthenticationManager/strategies/BasicAuthStrategy.js`
8. `utils/AuthenticationManager/strategies/BearerTokenStrategy.js`
9. `utils/AuthenticationManager/strategies/OAuth2Strategy.js`
10. `utils/AuthenticationManager/strategies/OAuth1Strategy.js`
11. `utils/AuthenticationManager/strategies/JWTStrategy.js`
12. `utils/AuthenticationManager/strategies/CustomHeadersStrategy.js`
13. `utils/AuthenticationManager/strategies/AWSSignatureStrategy.js`
14. `utils/AuthenticationManager/strategies/DatabaseStrategy.js`

#### Helper Utilities (3 files)
15. `utils/AuthenticationManager/helpers/tokenValidator.js`
16. `utils/AuthenticationManager/helpers/configMerger.js`
17. `utils/AuthenticationManager/helpers/errorHandler.js`

### Files to Modify (2 files)

1. **`auth-types-definition.json`**
   - Add `testConfig` structure to all 11 auth types
   - Follow existing pattern (define fields, not values)

2. **`server.js`**
   - Line ~812: Update `POST /api/user-integrations/test-connection`
   - Line ~861: Update `POST /api/user-integrations/:connectionId/test`

### Files Optional to Modify

3. **`integrations/providers/*/auth.schema.json`** (multiple files)
   - Add `testConfig` overrides only if needed
   - Use defaults from auth-types-definition.json otherwise

---

## 🚀 Implementation Timeline

### Phase 1: Foundation (Week 1)
- [ ] Update `auth-types-definition.json` with testConfig structures
- [ ] Create base folder structure
- [ ] Implement `BaseStrategy.js`
- [ ] Implement `httpClient.js`
- [ ] Implement helper utilities

### Phase 2: Core Strategies (Week 2)
- [ ] Implement `ApiKeyStrategy.js`
- [ ] Implement `BasicAuthStrategy.js`
- [ ] Implement `BearerTokenStrategy.js`
- [ ] Implement `CustomHeadersStrategy.js`
- [ ] Implement `AuthenticationManager.js`

### Phase 3: OAuth Support (Week 3)
- [ ] Implement `OAuth2Strategy.js`
- [ ] Implement token refresh logic
- [ ] Implement token validation
- [ ] Test with real OAuth providers

### Phase 4: Advanced Strategies (Week 4)
- [ ] Implement `OAuth1Strategy.js`
- [ ] Implement `JWTStrategy.js`
- [ ] Implement `AWSSignatureStrategy.js`
- [ ] Implement `DatabaseStrategy.js`

### Phase 5: Integration (Week 5)
- [ ] Implement `ConnectionTester.js`
- [ ] Update server endpoints
- [ ] Integration testing
- [ ] Bug fixes and refinements

### Phase 6: Testing & Deployment (Week 6)
- [ ] Unit tests for all strategies
- [ ] Integration tests with real APIs
- [ ] Manual testing with all auth types
- [ ] Documentation updates
- [ ] Deployment

---

## 🔮 Future Enhancements

### Phase 2 Features

1. **Connection Health Monitoring**
   - Periodic automatic testing of all connections
   - Alert users when connections fail
   - Dashboard showing connection health

2. **Advanced Token Management**
   - Proactive token refresh before expiry
   - Token rotation strategies
   - Secure token storage improvements

3. **Retry Logic**
   - Automatic retry with exponential backoff
   - Circuit breaker pattern for failing connections
   - Fallback strategies

4. **Performance Optimization**
   - Parallel testing of multiple connections
   - Connection pooling
   - Response caching

5. **Enhanced Error Reporting**
   - Categorized error types
   - Actionable suggestions for fixes
   - Error history and trends

6. **Third-Party Library Integration**
   - Evaluate and integrate n8n OAuth library if needed
   - Support for more auth types
   - Plugin architecture for custom auth types

---

## 📚 References

### Internal Documentation
- [AUTH-STRUCTURE-README.md](./AUTH-STRUCTURE-README.md)
- [USER-CONNECTION-MANAGEMENT.md](./USER-CONNECTION-MANAGEMENT.md)
- [API-ENDPOINTS.md](./API-ENDPOINTS.md)

### External Resources
- [OAuth 2.0 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- [OAuth 1.0a RFC 5849](https://datatracker.ietf.org/doc/html/rfc5849)
- [JWT RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519)
- [AWS Signature v4](https://docs.aws.amazon.com/general/latest/gr/signature-version-4.html)
- [n8n OAuth Library](https://github.com/n8n-io/js-client-oauth2-extended)

---

## 📧 Questions & Support

For questions or clarifications, please contact the development team or create an issue in the project repository.

---

**Last Updated:** 2025-01-27
**Document Version:** 1.0
**Status:** Planning Phase
