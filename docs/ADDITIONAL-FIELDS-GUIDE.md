# Additional Fields Guide

## Overview

Additional Fields allow you to define extra fields needed for authentication beyond the standard credential fields. These fields can serve multiple purposes:
- **Credentials**: Additional authentication data (e.g., tenant ID, workspace name)
- **Headers**: Custom HTTP headers required by the API (e.g., User-Agent, X-API-Version)
- **Variables**: Dynamic values used in URL templates (e.g., subdomain, region)

---

## Field Properties

### Core Properties (Required)

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | Yes | Internal field identifier (used in templates like `{{fieldName}}`) |
| `label` | string | Yes | Display label shown to users in forms |
| `type` | string | Yes | Data type: `string`, `number`, `boolean` |
| `required` | boolean | Yes | Whether the field is mandatory |

### New Properties (Added for Enhanced Functionality)

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `useAs` | string | Yes | `"credential"` | How the field is used: `credential`, `header`, or `variable` |
| `fillBy` | string | Yes | `"user"` | Who provides the value: `user` (end-user) or `admin` (during integration setup) |
| `encrypted` | boolean | Yes | `false` | Whether to encrypt the value in storage |
| `htmlType` | string | No | `"text"` | HTML input type: `text`, `password`, `textarea`, `number`, `email`, `url` |
| `headerName` | string | No (required if `useAs="header"`) | - | Actual HTTP header name (e.g., `User-Agent`, `Accept`) |
| `defaultValue` | string | No (required if `fillBy="admin"`) | - | Default value set by admin |

### Optional Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `placeholder` | string | No | Placeholder text for input fields |
| `description` | string | No | Help text explaining the field's purpose |
| `default` | any | No | Default value for the field |

---

## `useAs` Property - Field Usage Types

### 1. `credential` (Default)
Used for authentication-related data that's part of the credentials.

**Example**: Tenant ID, Workspace Name, Organization ID
```json
{
  "name": "tenantId",
  "label": "Tenant ID",
  "type": "string",
  "required": true,
  "useAs": "credential",
  "fillBy": "user",
  "encrypted": false,
  "htmlType": "text"
}
```

**Usage in Auth Config**:
```json
{
  "username": "{{email}}/{{tenantId}}",
  "password": "{{apiKey}}"
}
```

---

### 2. `header`
Used for custom HTTP headers required by the API.

**Example**: User-Agent header for GitHub API
```json
{
  "name": "user-agent",
  "label": "User Agent",
  "type": "string",
  "required": true,
  "useAs": "header",
  "fillBy": "admin",
  "headerName": "User-Agent",
  "defaultValue": "MyApp/1.0",
  "encrypted": false,
  "htmlType": "text"
}
```

**Result**: Automatically adds `User-Agent: MyApp/1.0` header to all API requests.

**More Examples**:
```json
[
  {
    "name": "api-version",
    "label": "API Version",
    "type": "string",
    "required": true,
    "useAs": "header",
    "fillBy": "admin",
    "headerName": "X-API-Version",
    "defaultValue": "2023-10-01",
    "encrypted": false
  },
  {
    "name": "accept",
    "label": "Accept Header",
    "type": "string",
    "required": false,
    "useAs": "header",
    "fillBy": "admin",
    "headerName": "Accept",
    "defaultValue": "application/vnd.github+json",
    "encrypted": false
  }
]
```

---

### 3. `variable`
Used for dynamic values in URL templates.

**Example**: Subdomain for multi-tenant SaaS applications
```json
{
  "name": "sub_domain",
  "label": "Subdomain",
  "type": "string",
  "required": true,
  "useAs": "variable",
  "fillBy": "user",
  "encrypted": false,
  "htmlType": "text",
  "placeholder": "your-company"
}
```

**Usage in Test URL**:
```json
{
  "testUrl": "https://{{sub_domain}}.example.com/api/v1/me"
}
```

**Result**: If user enters `acme`, the URL becomes `https://acme.example.com/api/v1/me`

---

## `fillBy` Property - Who Provides the Value

### 1. `user` (Default)
End-user provides the value when creating a connection.

**Use Case**: User-specific values like email, tenant ID, workspace name.

```json
{
  "name": "email",
  "label": "Email Address",
  "type": "string",
  "required": true,
  "useAs": "credential",
  "fillBy": "user",
  "encrypted": false,
  "htmlType": "email"
}
```

---

### 2. `admin`
Admin sets the value during integration setup. End-users don't see or edit this field.

**Use Case**: Static values like API version, User-Agent, Accept headers.

```json
{
  "name": "user-agent",
  "label": "User Agent",
  "type": "string",
  "required": true,
  "useAs": "header",
  "fillBy": "admin",
  "headerName": "User-Agent",
  "defaultValue": "IntegrationPlatform/1.0",
  "encrypted": false
}
```

**Note**: When `fillBy="admin"`, you must provide a `defaultValue`.

---

## `encrypted` Property - Value Encryption

Controls whether the field value is encrypted in storage.

```json
{
  "name": "apiKey",
  "label": "API Key",
  "type": "string",
  "required": true,
  "useAs": "credential",
  "fillBy": "user",
  "encrypted": true,     // ← Encrypt sensitive data
  "htmlType": "password"
}
```

**Best Practices**:
- `encrypted: true` → For sensitive data (API keys, tokens, passwords)
- `encrypted: false` → For non-sensitive data (email, subdomain, tenant ID)

---

## `htmlType` Property - Input Type

Controls the HTML input type for rendering forms.

| Value | Description | Use Case |
|-------|-------------|----------|
| `text` | Plain text input (default) | Names, IDs, subdomains |
| `password` | Masked input | API keys, tokens, passwords |
| `textarea` | Multi-line text area | Long text, JSON, descriptions |
| `number` | Numeric input | Port numbers, IDs |
| `email` | Email input with validation | Email addresses |
| `url` | URL input with validation | Webhook URLs, endpoints |

**Example**:
```json
{
  "name": "token",
  "label": "Access Token",
  "type": "string",
  "required": true,
  "useAs": "credential",
  "fillBy": "user",
  "encrypted": true,
  "htmlType": "password"  // ← Masked input in forms
}
```

---

## Complete Examples

### Example 1: Zendesk (Multi-tenant with subdomain)

```json
{
  "authType": "basic_auth_api_key",
  "config": {
    "username": "{{email}}/token",
    "password": "{{apiKey}}"
  },
  "testConfig": {
    "testUrl": "https://{{sub_domain}}.zendesk.com/api/v2/users/me.json"
  },
  "additionalFields": [
    {
      "name": "sub_domain",
      "label": "Subdomain",
      "type": "string",
      "required": true,
      "placeholder": "your-company",
      "useAs": "variable",
      "fillBy": "user",
      "encrypted": false,
      "htmlType": "text"
    },
    {
      "name": "email",
      "label": "Email Address",
      "type": "string",
      "required": true,
      "placeholder": "user@example.com",
      "useAs": "credential",
      "fillBy": "user",
      "encrypted": false,
      "htmlType": "email"
    }
  ]
}
```

---

### Example 2: GitHub (Requires User-Agent header)

```json
{
  "authType": "bearer_token",
  "config": {
    "headerName": "Authorization",
    "prefix": "Bearer ",
    "tokenValue": "{{token}}"
  },
  "testConfig": {
    "testUrl": "https://api.github.com/user"
  },
  "additionalFields": [
    {
      "name": "user-agent",
      "label": "User Agent",
      "type": "string",
      "required": true,
      "useAs": "header",
      "fillBy": "admin",
      "headerName": "User-Agent",
      "defaultValue": "MyIntegrationPlatform/1.0",
      "encrypted": false,
      "htmlType": "text",
      "description": "GitHub requires User-Agent header"
    },
    {
      "name": "accept",
      "label": "Accept Header",
      "type": "string",
      "required": false,
      "useAs": "header",
      "fillBy": "admin",
      "headerName": "Accept",
      "defaultValue": "application/vnd.github+json",
      "encrypted": false,
      "htmlType": "text"
    }
  ]
}
```

---

### Example 3: Stripe (Multiple regions)

```json
{
  "authType": "bearer_token",
  "config": {
    "headerName": "Authorization",
    "prefix": "Bearer ",
    "tokenValue": "{{apiKey}}"
  },
  "testConfig": {
    "testUrl": "https://api.stripe.com/v1/customers"
  },
  "additionalFields": [
    {
      "name": "stripe-version",
      "label": "API Version",
      "type": "string",
      "required": true,
      "useAs": "header",
      "fillBy": "admin",
      "headerName": "Stripe-Version",
      "defaultValue": "2023-10-16",
      "encrypted": false,
      "htmlType": "text",
      "description": "Stripe API version to use"
    }
  ]
}
```

---

## Migration Guide

### Existing Integrations Without New Properties

If you have existing integrations with `additionalFields` that don't have the new properties, you need to add them:

**Before**:
```json
{
  "name": "sub_domain",
  "label": "Subdomain",
  "type": "string",
  "required": true,
  "placeholder": "your-company"
}
```

**After** (add required properties):
```json
{
  "name": "sub_domain",
  "label": "Subdomain",
  "type": "string",
  "required": true,
  "placeholder": "your-company",
  "useAs": "variable",      // ← Add this
  "fillBy": "user",         // ← Add this
  "encrypted": false,       // ← Add this
  "htmlType": "text"        // ← Add this (optional but recommended)
}
```

---

## Validation Rules

1. **`useAs`**: Required, must be one of: `credential`, `header`, `variable`
2. **`fillBy`**: Required, must be one of: `user`, `admin`
3. **`encrypted`**: Required, must be `true` or `false` (boolean)
4. **`htmlType`**: Optional, but defaults to `text`
5. **`headerName`**: Required when `useAs="header"`, ignored otherwise
6. **`defaultValue`**: Required when `fillBy="admin"`, recommended otherwise

---

## Best Practices

1. **Use `fillBy="admin"` for static values** like API versions, User-Agent headers
2. **Use `fillBy="user"` for user-specific values** like email, subdomain, tenant ID
3. **Encrypt sensitive fields**: Always set `encrypted: true` for API keys, tokens, passwords
4. **Use appropriate `htmlType`**:
   - `password` for sensitive fields
   - `email` for email addresses
   - `url` for URLs
5. **Provide helpful descriptions**: Add `description` field to explain what the field is for
6. **Use meaningful placeholders**: Add `placeholder` to guide users on the expected format

---

## Technical Implementation

### How Headers Are Built

When `useAs="header"`, the system automatically builds HTTP headers:

```javascript
// For fillBy="admin"
headers[headerName] = defaultValue;

// For fillBy="user"
headers[headerName] = credentials[fieldName] || variables[fieldName];
```

### How Template Variables Work

When `useAs="variable"`, values are replaced in URL templates:

```javascript
// Template: "https://{{sub_domain}}.example.com/api"
// Value: "acme"
// Result: "https://acme.example.com/api"
```

### How Credentials Are Used

When `useAs="credential"`, values are available in credential templates:

```javascript
// Config: "username": "{{email}}/{{tenantId}}"
// Values: email="user@example.com", tenantId="12345"
// Result: "user@example.com/12345"
```

---

## Related Documentation

- [AUTH-STRUCTURE-README.md](./AUTH-STRUCTURE-README.md) - Authentication structure overview
- [AUTHENTICATION-TEMPLATE-VARIABLES.md](./AUTHENTICATION-TEMPLATE-VARIABLES.md) - Template variables system
- [PANEL_CONFIG_GUIDE.md](./PANEL_CONFIG_GUIDE.md) - Panel configuration guide
