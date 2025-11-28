# Quick Comparison: What Goes Where

## Understanding configOptions vs credentialFields

This is the KEY distinction to understand:

| Aspect | configOptions | credentialFields |
|--------|--------------|------------------|
| **Who fills it?** | Admin | End-user |
| **When?** | During software template creation | During account connection |
| **How many times?** | Once per software | Once per user |
| **Example (OAuth2)** | Authorization URL, Token URL, Scopes | Client ID, Client Secret |
| **Example (API Key)** | Header name, Key prefix | The actual API key |
| **Visibility** | Same for all users | Private to each user |
| **Storage** | In software template | In user credentials table |

---

## Examples by Auth Type

### API Key (Header)

```
┌─────────────────────────────────────────────────────────────┐
│ Admin Configures (configOptions):                           │
├─────────────────────────────────────────────────────────────┤
│ • Header Name: "X-API-Key"                                  │
│ • Prefix: ""                                                │
│                                                             │
│ This is SAME for ALL users of this software                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Fills (credentialFields):                              │
├─────────────────────────────────────────────────────────────┤
│ • API Key: "abc123xyz789"                                   │
│                                                             │
│ This is UNIQUE to each user                                 │
└─────────────────────────────────────────────────────────────┘

Result: X-API-Key: abc123xyz789
```

---

### Basic Auth

```
┌─────────────────────────────────────────────────────────────┐
│ Admin Configures (configOptions):                           │
├─────────────────────────────────────────────────────────────┤
│ • (Nothing - Basic Auth is standardized)                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Fills (credentialFields):                              │
├─────────────────────────────────────────────────────────────┤
│ • Username: "john@company.com"                              │
│ • Password: "secret123"                                     │
└─────────────────────────────────────────────────────────────┘

Result: Authorization: Basic am9obkBjb21wYW55LmNvbTpzZWNyZXQxMjM=
```

---

### OAuth 2.0 Authorization Code

```
┌─────────────────────────────────────────────────────────────┐
│ Admin Configures (configOptions):                           │
├─────────────────────────────────────────────────────────────┤
│ • Authorization URL: https://provider.com/oauth/authorize   │
│ • Token URL: https://provider.com/oauth/token               │
│ • Scopes: ["read", "write"]                                 │
│ • Scope Separator: " "                                      │
│ • PKCE Enabled: false                                       │
│ • Token Refresh Enabled: true                               │
│                                                             │
│ These URLs are SAME for all users                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Fills (credentialFields):                              │
├─────────────────────────────────────────────────────────────┤
│ • Client ID: "xyz789abc123"                                 │
│ • Client Secret: "super_secret_key"                         │
│                                                             │
│ These are UNIQUE to each user's OAuth app                   │
└─────────────────────────────────────────────────────────────┘

Result:
1. Redirect to Authorization URL with Client ID
2. Exchange code for tokens at Token URL
3. Store: access_token, refresh_token
4. Use: Authorization: Bearer {access_token}
```

---

### Custom Headers

```
┌─────────────────────────────────────────────────────────────┐
│ Admin Configures (configOptions):                           │
├─────────────────────────────────────────────────────────────┤
│ • Headers:                                                  │
│   - Header Name: "X-Auth-Token"                             │
│     Credential Key: "authToken"                             │
│   - Header Name: "X-User-ID"                                │
│     Credential Key: "userId"                                │
│                                                             │
│ Header NAMES are same for all users                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Fills (credentialFields):                              │
├─────────────────────────────────────────────────────────────┤
│ • authToken: "token_abc123"                                 │
│ • userId: "user_456"                                        │
│                                                             │
│ Header VALUES are unique to each user                      │
└─────────────────────────────────────────────────────────────┘

Result:
X-Auth-Token: token_abc123
X-User-ID: user_456
```

---

### AWS Signature v4

```
┌─────────────────────────────────────────────────────────────┐
│ Admin Configures (configOptions):                           │
├─────────────────────────────────────────────────────────────┤
│ • Service: "execute-api"                                    │
│ • Region: "us-east-1"                                       │
│                                                             │
│ AWS service and region are same for all users               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Fills (credentialFields):                              │
├─────────────────────────────────────────────────────────────┤
│ • Access Key ID: "AKIAIOSFODNN7EXAMPLE"                     │
│ • Secret Access Key: "wJalrXUtnFEMI/K7MDENG/..."           │
│ • Session Token: (optional)                                 │
│                                                             │
│ AWS credentials are unique to each user                     │
└─────────────────────────────────────────────────────────────┘

Result:
Authorization: AWS4-HMAC-SHA256 Credential=...
X-Amz-Date: 20230615T120000Z
(Computed signature using user's credentials)
```

---

## Real-World Example: Salesforce vs HubSpot

Both use OAuth2, but with different endpoints:

### Salesforce Template

```json
{
  "softwareId": "salesforce",
  "authMethods": [{
    "authType": "oauth2_authorization_code",
    "config": {
      "authorizationUrl": "https://login.salesforce.com/services/oauth2/authorize",
      "tokenUrl": "https://login.salesforce.com/services/oauth2/token",
      "scopes": ["api", "refresh_token"]
    },
    "credentials": {
      "clientId": { "label": "Consumer Key" },
      "clientSecret": { "label": "Consumer Secret" }
    }
  }]
}
```

### HubSpot Template

```json
{
  "softwareId": "hubspot",
  "authMethods": [{
    "authType": "oauth2_authorization_code",
    "config": {
      "authorizationUrl": "https://app.hubspot.com/oauth/authorize",
      "tokenUrl": "https://api.hubapi.com/oauth/v1/token",
      "scopes": ["contacts", "crm.objects.contacts.read"]
    },
    "credentials": {
      "clientId": { "label": "App ID" },
      "clientSecret": { "label": "App Secret" }
    }
  }]
}
```

**Notice:**
- Same `authType` (oauth2_authorization_code)
- Different `config` values (URLs, scopes)
- Different credential labels (Consumer Key vs App ID)
- Users fill in their own Client ID/Secret for each

---

## What Gets Stored Where

### In Software Template (Database/File)
```json
{
  "softwareId": "salesforce",
  "authMethods": [{
    "authType": "oauth2_authorization_code",
    "config": {
      "authorizationUrl": "https://...",
      "tokenUrl": "https://...",
      "scopes": ["api"]
    }
  }]
}
```
**One record per software**

### In User Credentials (Database)
```
user_credentials table:

| user_id | software_id | credentials                          |
|---------|-------------|--------------------------------------|
| user1   | salesforce  | {"clientId": "abc", "clientSecret": "..."} |
| user2   | salesforce  | {"clientId": "xyz", "clientSecret": "..."} |
| user1   | hubspot     | {"clientId": "def", "clientSecret": "..."} |
```
**One record per user per software**

### In Stored Tokens (Database - for OAuth)
```
oauth_tokens table:

| user_id | software_id | access_token | refresh_token | expires_at |
|---------|-------------|--------------|---------------|------------|
| user1   | salesforce  | ya29.a0A... | 1//0gB...     | 2024-...   |
| user2   | salesforce  | ya29.a0C... | 1//0hD...     | 2024-...   |
```
**One record per user per software (OAuth only)**

---

## Decision Tree: Where Does This Setting Go?

```
Is it the same for ALL users of this software?
│
├─ YES → configOptions
│  │
│  └─ Examples:
│     • API endpoints (Authorization URL, Token URL)
│     • Header names (X-API-Key, Authorization)
│     • Scopes/permissions
│     • Service configuration (AWS region, Database type)
│     • Format settings (Scope separator, Key prefix)
│
└─ NO → credentialFields
   │
   └─ Examples:
      • API keys
      • Usernames/passwords
      • OAuth Client ID/Secret
      • Access tokens
      • Database credentials
```

---

## Common Mistakes to Avoid

❌ **WRONG:**
```json
{
  "credentialFields": {
    "authorizationUrl": {
      "type": "string",
      "label": "Authorization URL"
    }
  }
}
```
**Why wrong:** Authorization URL is same for all users, should be in configOptions

✅ **CORRECT:**
```json
{
  "configOptions": {
    "authorizationUrl": {
      "type": "string",
      "label": "Authorization URL"
    }
  },
  "credentialFields": {
    "clientId": {
      "type": "string",
      "label": "Client ID"
    }
  }
}
```

---

❌ **WRONG:**
```json
{
  "configOptions": {
    "apiKey": {
      "type": "string",
      "label": "API Key"
    }
  }
}
```
**Why wrong:** API key is unique per user, should be in credentialFields

✅ **CORRECT:**
```json
{
  "configOptions": {
    "headerName": {
      "type": "string",
      "label": "Header Name"
    }
  },
  "credentialFields": {
    "apiKey": {
      "type": "string",
      "label": "API Key"
    }
  }
}
```

---

## Mental Model

Think of it like a restaurant:

**configOptions** = The menu
- Same for all customers
- Defines what's available
- Created by the restaurant (admin)

**credentialFields** = The order
- Unique to each customer
- Actual food selected
- Created by the customer (user)

**Software Template** = Restaurant's complete menu
- Lists all dishes (auth methods)
- Prices, ingredients (config)

**User Credentials** = Customer's receipt
- What this customer ordered
- Their unique order number
