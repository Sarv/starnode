# Authentication Template Variables

## Overview

Authentication Template Variables allow flexible credential formatting using `{{variableName}}` syntax in authentication configuration. This system enables a single authentication type to handle multiple credential patterns without creating separate auth types for each variation.

**Key Feature:** Auto-detection based on `{{` presence - templates are parsed, static values pass through unchanged.

---

## The Problem

Different APIs use the same authentication method (e.g., Basic Auth) but with different credential patterns:

| API | Pattern | Challenge |
|-----|---------|-----------|
| Freshdesk | `apiKey:X` | API key as username, literal "X" as password |
| Zendesk | `email/token:password` | Email/token concatenation in username |
| Mailgun | `api:apiKey` | Static "api" as username |
| GitHub | `token:` | Token as username, empty password |
| Standard | `username:password` | Traditional pattern |

**Old Approach Problems:**
- Creating separate auth types for each pattern (`basic_auth`, `basic_auth_api_key`, `basic_auth_mailgun`, etc.)
- Auth type proliferation (dozens of similar types)
- Difficult to handle new patterns
- Repetitive code in strategy classes

**New Solution:**
- Single auth type with template variables
- Admin configures patterns: `username: "{{apiKey}}"` or `username: "api"`
- User provides credential values
- System automatically replaces templates at runtime

---

## How It Works

### Syntax

Use double curly braces around credential field names:

```
{{fieldName}}
```

### Auto-Detection

The system automatically detects and processes templates:

```javascript
// Template detected (contains {{)
username: "{{apiKey}}"      → Replaced with user's API key value
username: "{{email}}/{{token}}"  → "user@example.com/abc123"

// Static value (no {{)
username: "api"             → Used as-is: "api"
password: "X"               → Used as-is: "X"
```

### Processing Flow

```
1. Admin Configuration
   └→ Sets pattern: username: "{{apiKey}}", password: "X"

2. User Provides Credentials
   └→ Enters: apiKey: "sk_live_abc123"

3. Runtime Replacement
   └→ parseTemplate("{{apiKey}}", {apiKey: "sk_live_abc123"})
   └→ Result: "sk_live_abc123"

4. Authentication Header
   └→ Authorization: Basic base64("sk_live_abc123:X")
```

---

## Supported Authentication Types

### 1. Basic Authentication

**Fields:**
- `username` - Template or static value
- `password` - Template or static value

**Examples:**

```json
// Traditional: username and password from user
{
  "config": {
    "username": "{{username}}",
    "password": "{{password}}"
  }
}

// API Key as username
{
  "config": {
    "username": "{{apiKey}}",
    "password": "X"
  }
}

// Complex pattern
{
  "config": {
    "username": "{{email}}/{{token}}",
    "password": "{{password}}"
  }
}
```

### 2. API Key (Header/Query)

**Fields:**
- `headerName` or `paramName` - Usually static, can be template
- `prefix` - Template or static
- `apiKeyValue` - Template for API key value

**Examples:**

```json
// Simple API key
{
  "config": {
    "headerName": "X-API-Key",
    "apiKeyValue": "{{apiKey}}"
  }
}

// With prefix
{
  "config": {
    "headerName": "Authorization",
    "prefix": "Bearer ",
    "apiKeyValue": "{{apiKey}}"
  }
}

// Complex key pattern
{
  "config": {
    "headerName": "X-Auth-Token",
    "apiKeyValue": "{{key1}}-{{key2}}"
  }
}
```

### 3. Bearer Token

**Fields:**
- `headerName` - Usually "Authorization"
- `prefix` - Usually "Bearer "
- `tokenValue` - Template for token

**Example:**

```json
{
  "config": {
    "headerName": "Authorization",
    "prefix": "Bearer ",
    "tokenValue": "{{token}}"
  }
}
```

### 4. Custom Headers

**Fields:**
- `headerName` - Template or static
- `prefix` - Template or static
- `value` - Template pattern for header value

**Example:**

```json
{
  "config": {
    "headers": [
      {
        "headerName": "X-Client-ID",
        "value": "{{clientId}}"
      },
      {
        "headerName": "X-Auth",
        "value": "{{key1}}-{{key2}}"
      }
    ]
  }
}
```

---

## Real-World Examples

### Example 1: Freshdesk

**Authentication:** API Key as username, literal "X" as password

```json
{
  "authType": "basic_auth_api_key",
  "config": {
    "username": "{{apiKey}}",
    "password": "X"
  },
  "credentialFields": {
    "apiKey": {
      "type": "string",
      "label": "API Key",
      "encrypted": true
    }
  }
}
```

**User provides:** `apiKey = "abc123def456"`
**Result:** `Authorization: Basic base64("abc123def456:X")`

### Example 2: Zendesk

**Authentication:** Email/token concatenation in username

```json
{
  "authType": "basic_auth",
  "config": {
    "username": "{{email}}/{{token}}",
    "password": "{{password}}"
  },
  "credentialFields": {
    "email": { "type": "string", "label": "Email" },
    "token": { "type": "string", "label": "API Token" },
    "password": { "type": "string", "label": "Password" }
  }
}
```

**User provides:**
- `email = "user@example.com"`
- `token = "token123"`
- `password = "pass456"`

**Result:** `Authorization: Basic base64("user@example.com/token123:pass456")`

### Example 3: Mailgun

**Authentication:** Static "api" as username, API key as password

```json
{
  "authType": "basic_auth_api_key",
  "config": {
    "username": "api",
    "password": "{{apiKey}}"
  },
  "credentialFields": {
    "apiKey": {
      "type": "string",
      "label": "API Key"
    }
  }
}
```

**User provides:** `apiKey = "key-abc123"`
**Result:** `Authorization: Basic base64("api:key-abc123")`

### Example 4: GitHub

**Authentication:** Token as username, empty password

```json
{
  "authType": "basic_auth_api_key",
  "config": {
    "username": "{{token}}",
    "password": ""
  },
  "credentialFields": {
    "token": {
      "type": "string",
      "label": "Personal Access Token"
    }
  }
}
```

**User provides:** `token = "ghp_abc123"`
**Result:** `Authorization: Basic base64("ghp_abc123:")`

---

## Configuration Guide

### Step 1: Define Credential Fields

Specify what users will provide:

```json
{
  "credentialFields": {
    "apiKey": {
      "type": "string",
      "label": "API Key",
      "inputType": "password",
      "required": true,
      "encrypted": true,
      "helpText": "Your API key from Settings"
    }
  }
}
```

### Step 2: Configure Template Pattern

Use credential field names in templates:

```json
{
  "config": {
    "username": "{{apiKey}}",
    "password": "X"
  }
}
```

### Step 3: Variables Must Match

Template variables must exactly match credential field keys:

```json
// ✅ Correct - matches credentialFields
{
  "credentialFields": {
    "apiKey": { ... }
  },
  "config": {
    "username": "{{apiKey}}"
  }
}

// ❌ Wrong - typo or mismatch
{
  "credentialFields": {
    "apiKey": { ... }
  },
  "config": {
    "username": "{{api_key}}"  // Wrong! Should be {{apiKey}}
  }
}
```

---

## Implementation Details

### Template Parser (`utils/AuthenticationManager/helpers/templateParser.js`)

Core utility functions:

```javascript
// Parse template and replace variables
parseTemplate(template, credentials, variables, decryptValues = true)

// Check if string contains templates
hasTemplateVariables(str)  // Returns true if contains {{

// Extract variable names from template
extractVariables(template)  // ["apiKey", "email"] from "{{apiKey}}/{{email}}"

// Decrypt encrypted values
decryptValue(encryptedValue)
```

### Strategy Classes

Each auth strategy uses `parseTemplateValue()` from BaseStrategy:

```javascript
// In BasicAuthStrategy.js
const username = this.parseTemplateValue(config.username, credentials, variables);
const password = this.parseTemplateValue(config.password, credentials, variables);
```

### BaseStrategy (`utils/AuthenticationManager/strategies/BaseStrategy.js`)

Provides `parseTemplateValue()` method to all strategies:

```javascript
parseTemplateValue(template, credentials = {}, variables = {}) {
    return parseTemplate(template, credentials, variables, true);
}
```

---

## Migration Guide

### From Old Approach

**Old:**
```json
{
  "config": {
    "usernameSource": "credential",  // ❌ Deprecated
    "password": "X"
  }
}
```

**New:**
```json
{
  "config": {
    "username": "{{apiKey}}",  // ✅ Template-based
    "password": "X"
  }
}
```

### Migration Steps

1. **Remove** `usernameSource` field
2. **Add** `username` field with template syntax
3. **Keep** existing `password` or add if needed
4. **Test** connection with sample credentials

---

## Benefits

### 1. No Auth Type Proliferation
Single `basic_auth_api_key` type handles all patterns instead of:
- `basic_auth_api_key_freshdesk`
- `basic_auth_api_key_zendesk`
- `basic_auth_api_key_mailgun`
- etc.

### 2. Self-Documenting
Configuration clearly shows the pattern:
```json
"username": "api"           // Static value
"username": "{{apiKey}}"    // Variable replacement
"username": "{{a}}/{{b}}"   // Complex pattern
```

### 3. Backward Compatible
Existing static configurations work without changes:
```json
"username": "admin"  // No {{, used as-is
```

### 4. Handles Edge Cases
Complex patterns like:
```
{{email}}/{{token}}:{{password}}
{{clientId}}/{{clientSecret}}
prefix-{{key1}}-{{key2}}-suffix
```

### 5. Clean Architecture
- Single template parser implementation
- Consistent across all auth types
- No special-case logic in strategies

---

## Troubleshooting

### Issue: Template Not Being Replaced

**Symptom:** Seeing `{{apiKey}}` in actual API requests

**Causes:**
1. Variable name mismatch
2. Missing credential value
3. Template parser not called

**Solution:**
```javascript
// Check variable name matches exactly
credentialFields: { "apiKey": ... }
config: { "username": "{{apiKey}}" }  // Must match!

// Check credential is provided
// Check strategy calls parseTemplateValue()
```

### Issue: "undefined" in Credentials

**Symptom:** Getting `undefined` or empty string

**Causes:**
1. User didn't provide required credential
2. Credential field not marked as `required`
3. Encryption/decryption issue

**Solution:**
```json
{
  "credentialFields": {
    "apiKey": {
      "required": true,  // Enforce at input time
      "encrypted": true  // Ensure proper encryption
    }
  }
}
```

### Issue: Static Values Being Parsed

**Symptom:** Static value like "api" is being treated as template

**Cause:** Bug in template detection logic

**Check:**
```javascript
// Should only parse if contains {{
if (!template.includes('{{')) {
    return template;  // Return as-is
}
```

---

## Best Practices

### 1. Clear Naming
Use descriptive variable names:
```json
✅ "username": "{{apiKey}}"
✅ "username": "{{email}}/{{token}}"
❌ "username": "{{a}}/{{b}}"  // Unclear what a and b are
```

### 2. Document Patterns
Add helpText explaining the pattern:
```json
{
  "config": {
    "username": "{{email}}/{{token}}",
    "helpText": "Zendesk requires email/token format in username field"
  }
}
```

### 3. Validate Credentials
Mark required fields:
```json
{
  "credentialFields": {
    "email": { "required": true },
    "token": { "required": true }
  }
}
```

### 4. Test Patterns
Test with actual API before deployment:
```bash
# Test Freshdesk pattern
curl -u "API_KEY:X" https://domain.freshdesk.com/api/v2/agents/me

# Test Zendesk pattern
curl -u "email/token:password" https://domain.zendesk.com/api/v2/users/me.json
```

### 5. Encryption
Always encrypt sensitive credentials:
```json
{
  "credentialFields": {
    "apiKey": {
      "inputType": "password",
      "encrypted": true  // Auto-decrypt during template parsing
    }
  }
}
```

---

## Related Documentation

- **[AUTH-STRUCTURE-README.md](./AUTH-STRUCTURE-README.md)** - Overall authentication structure
- **[DYNAMIC_VARIABLES.md](./DYNAMIC_VARIABLES.md)** - OAuth URL variables (different system)
- **[TEST-CONNECTION-IMPLEMENTATION.md](./TEST-CONNECTION-IMPLEMENTATION.md)** - Testing authentication

---

## Version History

- **v1.0.0** (2025-12-01) - Initial implementation
  - Created templateParser.js utility
  - Updated all strategy classes (BasicAuth, ApiKey, BearerToken, CustomHeaders)
  - Enhanced auth-types-definition.json with template support
  - Removed deprecated `usernameSource` field
