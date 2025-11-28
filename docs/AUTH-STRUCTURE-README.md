# Authentication Structure Documentation

## Overview

This template-driven authentication system consists of three main components:

1. **Auth Type Definitions** - Master list of all supported auth types and their parameters
2. **Software Templates** - Admin-created configurations for specific software/CRMs
3. **User Credentials** - End-user filled values (stored at runtime)

---

## File Structure

```
auth-types-definition.json          # Master auth types with all available options
example-software-template-*.json    # Examples of what admin creates
```

---

## 1. Auth Types Definition (`auth-types-definition.json`)

This is your **master schema** that defines all possible authentication types and their configuration options.

### Structure:

```json
{
  "authTypes": {
    "auth_type_key": {
      "label": "Display Name",
      "description": "What this auth type does",
      "category": "simple|oauth|advanced|database",

      "configOptions": {
        // Options that ADMIN configures when creating software template
        // These are software-specific settings
      },

      "credentialFields": {
        // Fields that END-USER fills in when connecting
        // These are user-specific credentials
      },

      "storedTokens": []  // For OAuth: tokens received from auth flow
    }
  }
}
```

### Key Points:

- **configOptions**: What the admin sees and configures in the GUI when setting up auth for a software
- **credentialFields**: What the end-user sees when connecting their account
- Each option has properties like:
  - `type`: string, number, boolean, array, object, json
  - `required`: true/false
  - `default`: default value
  - `options`: array of allowed values (for dropdowns)
  - `locked`: true means admin cannot change this value
  - `dependsOn`: shows field only if another field has specific value
  - `examples`: example values to help admin
  - `helpText`: explanation text

---

## 2. Software Template (Admin Creates)

When an admin adds a new software to your platform, they:

1. **Choose an auth type** from the master list
2. **Fill in the config options** specific to that software
3. **Optionally customize credential field labels** to match the software's terminology
4. **Add any additional fields** needed for that software

### Structure:

```json
{
  "softwareId": "unique_id",
  "softwareName": "Display Name",
  "baseUrl": "https://api.example.com",

  "authMethods": [
    {
      "id": "unique_auth_method_id",
      "authType": "oauth2_authorization_code",  // References auth-types-definition.json
      "label": "OAuth 2.0",
      "isDefault": true,
      "priority": 1,

      "config": {
        // Values for configOptions defined in auth-types-definition.json
        "authorizationUrl": "https://...",
        "tokenUrl": "https://...",
        "scopes": ["api", "read"]
      },

      "credentials": {
        // Customize labels for credentialFields
        "clientId": {
          "label": "App Key",  // Custom label instead of default "Client ID"
          "helpText": "Find this in settings..."
        }
      },

      "additionalFields": [
        // Any extra fields specific to this software
        {
          "key": "instance_url",
          "label": "Instance URL",
          "type": "string",
          "required": false
        }
      ]
    }
  ]
}
```

---

## 3. How It Works: Admin GUI Flow

### Step 1: Admin Selects Auth Type

When admin clicks "Add Authentication Method", they see a list from `auth-types-definition.json`:

```
○ API Key (Header)
○ API Key (Query Parameter)
○ Bearer Token
○ Basic Authentication
○ Custom Headers
○ OAuth 2.0 - Authorization Code
○ OAuth 2.0 - Client Credentials
○ OAuth 2.0 - Service Account (JWT)
○ OAuth 1.0a
○ JWT
○ AWS Signature v4
○ SSH Private Key
○ Database Credentials
```

### Step 2: Admin Configures Based on Selected Type

Let's say admin selects **"OAuth 2.0 - Authorization Code"**

The GUI shows fields from `configOptions` of that auth type:

```
Authorization URL: [___________________________] (required)
                   Example: https://accounts.google.com/o/oauth2/v2/auth

Token URL:         [___________________________] (required)
                   Example: https://oauth2.googleapis.com/token

Scopes:            [___________________________] (optional)
                   Example: read,write

Scope Separator:   [ ▼ Space ]  (dropdown: Space, Comma, Plus)

Enable PKCE:       [☐]

Client Auth:       [ ▼ client_secret_post ]  (dropdown)

Additional Auth Params: [___________________________] (optional)
                       Example: {"prompt": "consent"}

Enable Token Refresh: [☑]

Refresh Token URL: [___________________________] (shown only if refresh enabled)
```

### Step 3: Admin Customizes Credential Labels (Optional)

Admin can customize how credential fields appear to end-users:

```
Default Label: "Client ID"
Custom Label:  [Consumer Key____________] ← Admin can rename

Help Text:     [Get this from your Connected App settings...]
Placeholder:   [Enter your Consumer Key...]
```

### Step 4: Admin Saves

Result is saved as a software template (like the examples).

---

## 4. How It Works: End-User Flow

When an end-user wants to connect their account:

1. They see the software name: "Salesforce"
2. They see available auth methods: "OAuth 2.0 (Recommended)" or "Session ID"
3. They select one and see credential fields:

```
For OAuth 2.0:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Consumer Key:    [________________________]
                 Get this from your Salesforce Connected App settings

Consumer Secret: [************************]
                 Secret from your Salesforce Connected App

Instance URL:    [https://login.salesforce.com]
                 Use https://test.salesforce.com for sandbox

                 [Connect Account]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

4. User fills in their credentials
5. System executes OAuth flow based on the config
6. Tokens are stored securely

---

## 5. Examples

### Example 1: Simple API Key (Stripe)

**Admin selects:** `api_key_header`

**Admin configures:**
```json
{
  "authType": "api_key_header",
  "config": {
    "headerName": "Authorization",
    "prefix": "Bearer "
  }
}
```

**User sees:**
```
API Key: [____________________]
```

**System sends:**
```
Authorization: Bearer sk_test_abc123...
```

---

### Example 2: Custom Headers (Custom CRM)

**Admin selects:** `custom_headers`

**Admin configures:**
```json
{
  "authType": "custom_headers",
  "config": {
    "headers": [
      {"headerName": "X-API-Token", "credentialKey": "apiToken"},
      {"headerName": "X-User-ID", "credentialKey": "userId"}
    ]
  }
}
```

**User sees:**
```
API Token: [____________________]
User ID:   [____________________]
```

**System sends:**
```
X-API-Token: abc123
X-User-ID: user456
```

---

### Example 3: OAuth 2.0 (Salesforce)

**Admin selects:** `oauth2_authorization_code`

**Admin configures:**
```json
{
  "authType": "oauth2_authorization_code",
  "config": {
    "authorizationUrl": "https://login.salesforce.com/services/oauth2/authorize",
    "tokenUrl": "https://login.salesforce.com/services/oauth2/token",
    "scopes": ["api", "refresh_token"],
    "scopeSeparator": " "
  },
  "credentials": {
    "clientId": {
      "label": "Consumer Key"  // Custom label!
    }
  }
}
```

**User sees:**
```
Consumer Key:    [____________________]
Consumer Secret: [____________________]
                 [Connect via OAuth]
```

**System does:**
1. Redirects to authorization URL
2. Exchanges code for tokens at token URL
3. Stores access_token, refresh_token
4. Uses refresh_token when access_token expires

---

## 6. Supported Field Types

In `credentialFields`:

- **string**: Text input
- **number**: Numeric input
- **boolean**: Checkbox
- **json**: Textarea for JSON (like service account files)

Input types:
- **text**: Plain text
- **password**: Masked input
- **textarea**: Multi-line input
- **number**: Numeric input
- **checkbox**: Boolean toggle

---

## 7. Special Features

### Dependent Fields

```json
{
  "tokenRefreshEnabled": {
    "type": "boolean"
  },
  "refreshTokenUrl": {
    "type": "string",
    "dependsOn": {
      "tokenRefreshEnabled": true
    }
  }
}
```
Field only shows if dependency is met.

### Locked Fields

```json
{
  "prefix": {
    "type": "string",
    "default": "Bearer ",
    "locked": true
  }
}
```
Admin cannot change locked fields (uses default).

### Dynamic Credentials

For `custom_headers`, credential fields are dynamically generated based on headers configuration.

---

## 8. Summary

| Component | Purpose | Created By | Used By |
|-----------|---------|------------|---------|
| `auth-types-definition.json` | Master schema of all auth types | Developers | Admin GUI |
| Software Template | Configuration for specific software | Admin | Runtime system |
| User Credentials | Actual authentication values | End-user | API requests |

**Flow:**
```
Developer creates auth-types-definition.json
    ↓
Admin selects auth type from master list
    ↓
Admin configures software-specific settings
    ↓
System generates form based on credentialFields
    ↓
End-user fills in credentials
    ↓
System makes authenticated API requests
```
