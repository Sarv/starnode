# Dynamic Variables Guide

## Overview

Dynamic variables allow you to use placeholder values in your integration configuration that will be replaced with actual values at runtime. This is especially useful for OAuth URLs, API endpoints, and other configuration values that depend on user-specific data.

## Format

**Use double curly braces**: `{{fieldName}}`

```
{{variableName}}
```

## Rules

1. **Exact Match**: Variable name must exactly match the `name` field in `additionalFields`
2. **Case Sensitive**: `{{domain}}` ≠ `{{Domain}}`
3. **No Spaces**: Use `{{company}}` not `{{ company }}`
4. **Double Braces**: Always use `{{}}` not `{}` or `${}` or `%{}`
5. **Valid Fields Only**: Only use fields that are defined in the `additionalFields` array

## Example Configuration

```json
{
  "authMethods": [
    {
      "id": "oauth2_method",
      "authType": "oauth2_authorization_code",
      "label": "OAuth 2.0",
      "config": {
        "authorizationUrl": "https://{{domain}}/oauth/authorize",
        "tokenUrl": "https://api.{{region}}.service.com/oauth/token",
        "refreshTokenUrl": "{{domain}}/oauth/refresh",
        "baseUrl": "https://{{domain}}/api/v1"
      },
      "additionalFields": [
        {
          "name": "domain",
          "label": "Domain URL",
          "type": "url",
          "required": true,
          "placeholder": "e.g., https://mycompany.service.com"
        },
        {
          "name": "region",
          "label": "Region",
          "type": "string",
          "required": true,
          "placeholder": "e.g., us-east, eu-west"
        }
      ]
    }
  ]
}
```

## Common Use Cases

### 1. OAuth URLs with Dynamic Domains

```json
{
  "config": {
    "authorizationUrl": "https://{{company}}.hubspot.com/oauth/authorize",
    "tokenUrl": "https://api.{{company}}.hubspot.com/oauth/v1/token"
  },
  "additionalFields": [
    {
      "name": "company",
      "label": "Company Name",
      "type": "string",
      "required": true
    }
  ]
}
```

### 2. Multi-Region API Endpoints

```json
{
  "config": {
    "baseUrl": "https://api.{{region}}.service.com/v2",
    "tokenUrl": "https://auth.{{region}}.service.com/token"
  },
  "additionalFields": [
    {
      "name": "region",
      "label": "Data Center Region",
      "type": "string",
      "required": true,
      "placeholder": "us, eu, asia"
    }
  ]
}
```

### 3. Custom Domain with Workspace

```json
{
  "config": {
    "baseUrl": "https://{{domain}}/api/workspaces/{{workspace_id}}"
  },
  "additionalFields": [
    {
      "name": "domain",
      "label": "Your Domain",
      "type": "url",
      "required": true
    },
    {
      "name": "workspace_id",
      "label": "Workspace ID",
      "type": "string",
      "required": true
    }
  ]
}
```

### 4. Subdomain-based Services

```json
{
  "config": {
    "authorizationUrl": "https://{{subdomain}}.freshdesk.com/oauth/authorize",
    "tokenUrl": "https://{{subdomain}}.freshdesk.com/oauth/token"
  },
  "additionalFields": [
    {
      "name": "subdomain",
      "label": "Subdomain",
      "type": "string",
      "required": true,
      "placeholder": "Your company subdomain"
    }
  ]
}
```

## Where to Use Dynamic Variables

Dynamic variables can be used in the following configuration fields:

- ✅ `authorizationUrl`
- ✅ `tokenUrl`
- ✅ `refreshTokenUrl`
- ✅ `baseUrl`
- ✅ `webhookUrl`
- ✅ `revokeUrl`
- ✅ Any URL or endpoint in the configuration

## What NOT to Do

### ❌ Wrong Formats

```
{domain}           ❌ Single braces
${domain}          ❌ Dollar sign format
%domain%           ❌ Percent format
{{ domain }}       ❌ Spaces inside braces
{{Domain}}         ❌ Wrong case (if field is "domain")
{{domainnnn}}      ❌ Typo or non-existent field
```

### ❌ Using Undefined Fields

```json
{
  "config": {
    "tokenUrl": "https://{{company}}/token"  // ❌ 'company' not in additionalFields
  },
  "additionalFields": [
    {
      "name": "domain",  // Only 'domain' is defined
      "label": "Domain"
    }
  ]
}
```

## Validation

The system automatically validates dynamic variables when you create or update integrations:

1. **Extracts** all variables from URLs (e.g., `{{domain}}`, `{{region}}`)
2. **Checks** if each variable exists in `additionalFields`
3. **Reports errors** if any variable is undefined

### How Validation Works

When you submit an integration through the UI or API:

1. ✅ **Valid Configuration**: Saves successfully
2. ❌ **Invalid Configuration**: Shows detailed error modal with:
   - Which auth method has the issue
   - Which variable is invalid
   - Where the variable is being used (e.g., `tokenUrl`, `refreshTokenUrl`)
   - List of available field names
   - Suggestions for typos (e.g., "Did you mean `{{domain}}`?")

### Example Validation Errors

**UI Error Modal:**
```
┌─────────────────────────────────────────────────────────┐
│ ⊗ Error                                                  │
├─────────────────────────────────────────────────────────┤
│ Invalid dynamic variables in authentication              │
│ configuration                                            │
│                                                          │
│ Validation Errors:                                       │
│                                                          │
│ • OAuth 2.0 - Authorization Code:                       │
│   Invalid dynamic variable '{{companyyyy}}' found in:   │
│   tokenUrl.                                              │
│   Available fields: company, domain                      │
│   Did you mean '{{company}}'?                            │
│   Used in: tokenUrl                                      │
│                                                          │
│ • OAuth 2.0 - Authorization Code:                       │
│   Invalid dynamic variable '{{invalid_field}}' found    │
│   in: authorizationUrl.                                  │
│   Available fields: company, domain                      │
│   Used in: authorizationUrl                              │
│                                           [OK]           │
└─────────────────────────────────────────────────────────┘
```

**API Error Response:**
```json
{
  "success": false,
  "error": "Invalid dynamic variables in authentication configuration",
  "validationErrors": [
    {
      "authMethodIndex": 0,
      "authMethodLabel": "OAuth 2.0 - Authorization Code",
      "variable": "companyyyy",
      "usedIn": ["tokenUrl"],
      "message": "Invalid dynamic variable '{{companyyyy}}' found in: tokenUrl. Available fields: company, domain. Did you mean '{{company}}'?"
    },
    {
      "authMethodIndex": 0,
      "authMethodLabel": "OAuth 2.0 - Authorization Code",
      "variable": "invalid_field",
      "usedIn": ["authorizationUrl"],
      "message": "Invalid dynamic variable '{{invalid_field}}' found in: authorizationUrl. Available fields: company, domain"
    }
  ]
}
```

### Common Validation Errors

1. **Typo in Variable Name**
   ```
   Error: Invalid dynamic variable '{{domainnnn}}' found in refreshTokenUrl.
   Did you mean '{{domain}}'?
   ```
   **Fix**: Correct the typo: `{{domainnnn}}` → `{{domain}}`

2. **Using Undefined Field**
   ```
   Error: Invalid dynamic variable '{{workspace}}' found in tokenUrl.
   Available fields: domain, region
   ```
   **Fix**: Either add `workspace` to `additionalFields` or use an existing field

3. **Case Mismatch**
   ```
   Error: Invalid dynamic variable '{{Domain}}' found in tokenUrl.
   Did you mean '{{domain}}'?
   ```
   **Fix**: Match the exact case: `{{Domain}}` → `{{domain}}`

4. **Wrong Format**
   ```
   Error: Invalid dynamic variable '{domain}' found in tokenUrl.
   ```
   **Fix**: Use double braces: `{domain}` → `{{domain}}`

## Runtime Replacement

At runtime, the system replaces dynamic variables with actual user values:

**Configuration:**
```
tokenUrl: "https://{{company}}.service.com/token"
```

**User provides:**
```json
{ "company": "acme" }
```

**Result:**
```
tokenUrl: "https://acme.service.com/token"
```

## Best Practices

1. **Use Descriptive Names**: Use clear field names like `domain`, `region`, `workspace_id`
2. **Mark as Required**: If a variable is used in critical URLs (like `tokenUrl`), mark the field as `required: true`
3. **Provide Examples**: Always include placeholder text to guide users
4. **Add Help Text**: Use `helpText` to explain what the field is used for
5. **Validate Format**: Use appropriate `type` (url, string, etc.) for validation

## Complete Example

```json
{
  "version": "1.0.0",
  "authMethods": [
    {
      "id": "oauth2_method",
      "authType": "oauth2_authorization_code",
      "label": "OAuth 2.0 - Authorization Code",
      "config": {
        "authorizationUrl": "https://{{subdomain}}.service.com/oauth/authorize",
        "tokenUrl": "https://api.{{region}}.service.com/oauth/token",
        "refreshTokenUrl": "https://api.{{region}}.service.com/oauth/refresh",
        "scopes": ["read", "write"],
        "scopeSeparator": " "
      },
      "additionalFields": [
        {
          "name": "subdomain",
          "label": "Subdomain",
          "type": "string",
          "required": true,
          "placeholder": "mycompany",
          "helpText": "Your company's subdomain (e.g., if your URL is mycompany.service.com, enter 'mycompany')"
        },
        {
          "name": "region",
          "label": "Data Center Region",
          "type": "string",
          "required": true,
          "placeholder": "us-east",
          "helpText": "Choose your data center region: us-east, us-west, eu-west, asia-pacific"
        }
      ]
    }
  ]
}
```

## FAQ

### Q: Can I use multiple variables in one URL?
**A:** Yes! `https://{{subdomain}}.service.{{region}}.com/api`

### Q: Can I use the same variable multiple times?
**A:** Yes! The variable will be replaced everywhere it appears.

### Q: What if user doesn't provide a value?
**A:** If the field is `required: true`, the system won't allow submission. If it's optional and not provided, the variable won't be replaced.

### Q: Can I have default values?
**A:** Yes! Add a `default` field to your additionalFields:
```json
{
  "name": "region",
  "label": "Region",
  "type": "string",
  "default": "us-east",
  "required": false
}
```

## Troubleshooting

### Integration Won't Save

**Problem**: Getting validation error when trying to save integration.

**Solution**:
1. Check the error modal for specific variable names that are invalid
2. Verify each variable exists in `additionalFields` with exact name match
3. Check for typos - the error message will suggest corrections
4. Ensure you're using `{{variableName}}` format (double braces)

### Variables Not Being Replaced at Runtime

**Problem**: URLs still showing `{{variable}}` instead of actual values.

**Solution**:
1. Ensure the field is defined in `additionalFields`
2. Check that users are providing values for required fields
3. Verify the variable name matches exactly (case-sensitive)
4. Check server logs for runtime replacement errors

### "Did you mean" Suggestions Not Working

**Problem**: Typo detection not suggesting the right field.

**Solution**:
- The system checks for:
  - Case-insensitive exact matches
  - Substring matches
  - Similar field names
- Make sure field names are reasonably distinct
- Check if multiple fields have similar names

### Modal Not Showing Detailed Errors

**Problem**: Only seeing generic error message.

**Solution**:
1. Check browser console for JavaScript errors
2. Verify `add-integration.css` is loaded properly
3. Clear browser cache and reload
4. Check if `validationErrors` array is in API response

## Testing Your Configuration

Before deploying, test your dynamic variables:

1. **Manual Testing**:
   ```javascript
   // Test in browser console
   const testUrl = "https://{{company}}.service.com/api";
   const testValues = { company: "acme" };
   // Expected: "https://acme.service.com/api"
   ```

2. **API Testing**:
   ```bash
   # Test with curl
   curl -X POST http://localhost:3000/api/integrations \
     -H "Content-Type: application/json" \
     -d '{"basicInfo":{...},"authSettings":{...}}'
   ```

3. **Validation Testing**:
   - Try saving with invalid variable names
   - Verify error messages are clear
   - Check typo suggestions work
   - Test with missing fields

## Support

For issues or questions about dynamic variables:

1. **Check the Error Modal**: The UI provides detailed validation errors with:
   - Exact variable names that are invalid
   - Which config fields they're used in
   - Available field names
   - Suggestions for typos

2. **Review Server Logs**: Check console output for validation details

3. **API Response**: Review the `validationErrors` array in API responses

4. **Documentation**: Refer to this guide for format and examples

5. **Test Utilities**: Use the test scripts:
   - `node test-dynamic-variables.js` - Test utility functions
   - `node test-api-validation.js` - Test API validation
