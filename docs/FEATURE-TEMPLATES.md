# Feature Templates System

**Last Updated**: 2025-11-24
**Status**: Active Development
**Related Files**:
- `public/feature-templates.html`
- `public/js/feature-templates.js`
- `public/css/feature-templates.css`
- `features-definition.json`

---

## Table of Contents
1. [Overview](#overview)
2. [Why Feature Templates?](#why-feature-templates)
3. [System Architecture](#system-architecture)
4. [Field Types Explained](#field-types-explained)
5. [Field Properties Reference](#field-properties-reference)
6. [Field Type: API Configuration](#field-type-api-configuration)
7. [Field Type: Static](#field-type-static)
8. [Field Type: Dynamic](#field-type-dynamic)
9. [Field Type: Conditional](#field-type-conditional)
10. [HTML Input Types](#html-input-types)
11. [Possible Values System](#possible-values-system)
12. [Conditional Expressions](#conditional-expressions)
13. [Validation Rules](#validation-rules)
14. [Storage Structure](#storage-structure)
15. [UI Components](#ui-components)
16. [API Endpoints](#api-endpoints)
17. [Examples](#examples)
18. [Best Practices](#best-practices)
19. [Troubleshooting](#troubleshooting)

---

## Overview

The **Feature Templates System** is the foundation of our integration platform. It allows admins to define **generic, reusable feature templates** that can be mapped to multiple integrations without duplicating code or configuration.

### Key Concepts

- **Feature Template**: A generic definition of what a feature does (e.g., "Fetch Contacts", "Send Email")
- **Field**: A configurable parameter within a feature
- **Field Type**: Determines when and how a field value is provided (API, Static, Dynamic, Conditional)
- **Field Properties**: Metadata about the field (label, data type, HTML type, validation)
- **Categories**: Logical grouping of features (Contacts, Email, SMS, Leads, Tasks)

---

## Why Feature Templates?

### The Problem

Different software platforms (CRMs, email tools, HR systems, etc.) have different features, but many features are conceptually similar:
- "Fetch Contacts" exists in Salesforce, HubSpot, Zoho, and 50+ other CRMs
- Each CRM has a different API, but the **concept** is the same

### The Solution

**Create the feature template once** → **Map to many integrations**

```
Feature Template: "Fetch Contacts"
    ↓
├─ Map to Salesforce (with Salesforce API details)
├─ Map to HubSpot (with HubSpot API details)
├─ Map to Zoho (with Zoho API details)
└─ Map to 10+ other CRMs...
```

### Benefits

✅ **No Duplication**: Write feature definition once
✅ **Consistency**: All integrations use same field structure
✅ **Maintainability**: Update template once, affects all mappings
✅ **Scalability**: Add new integration = just map existing features
✅ **Speed**: Fast integration development

---

## System Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────┐
│  1. Admin Creates Feature Template                  │
│     → Defines fields, types, validations            │
│     → Saved to features-definition.json             │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│  2. Admin Maps Feature to Integration (Future)      │
│     → Provides integration-specific API details     │
│     → Saved to database/Elasticsearch               │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│  3. Feature Available in Workflows                  │
│     → Users can use feature in automation           │
│     → Engine executes using template + mapping      │
└─────────────────────────────────────────────────────┘
```

### Current Implementation Status

- ✅ **Feature Template Creation**: Fully implemented
- ✅ **Field Management**: Create, edit, delete fields
- ✅ **Validation**: Field-level and expression validation
- ✅ **UI**: Complete admin interface
- 🔄 **Feature-Integration Mapping**: Future implementation
- 🔄 **Custom Handlers**: Future implementation (see `/docs/future/custom-handler-architecture.md`)

---

## Field Types Explained

Features contain **fields** that collect information. Each field has a **type** that determines when and how its value is provided.

### Summary Table

| Field Type | When Value Provided | Can Change | Example Use Case |
|------------|-------------------|------------|------------------|
| **API** | During Feature-Integration Mapping | No (per mapping) | API endpoint details |
| **Static** | Once at feature activation | No (unless reconfigured) | From email address, API key |
| **Dynamic** | At runtime (each execution) | Yes (every time) | Recipient email, contact name |
| **Conditional** | Based on expression evaluation | Yes (when condition changes) | Optional fields, dependent values |

---

## Field Properties Reference

Every field has these properties:

### Core Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `field_key` | string | ✅ Yes | Unique identifier (lowercase, underscore, numbers only) |
| `label` | string | ✅ Yes | User-friendly display name |
| `type` | enum | ✅ Yes | Field type: `api`, `static`, `dynamic`, `conditional` |
| `required` | boolean | ✅ Yes | Whether field is mandatory |
| `description` | string | ❌ No | Help text for users |

### Data Type Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `fieldType` | enum | ✅ Yes | Data type: `string`, `number`, `boolean`, `email`, `url`, `text`, `html`, `json`, `array`, `object` |
| `htmlType` | enum | ✅ Yes | HTML input type: `text`, `textarea`, `number`, `email`, `url`, `password`, `select`, `checkbox`, `radio` |

### Optional Properties

| Property | Type | Required | Field Types | Description |
|----------|------|----------|-------------|-------------|
| `default` | any | ❌ No | `static` | Default value for static fields |
| `possibleValues` | array | ❌ No | All (when htmlType is `select`, `checkbox`, `radio`) | List of allowed values |
| `multipleValueAllowed` | boolean | ❌ No | All (when htmlType is `select` or `checkbox`) | Allow selecting multiple values |
| `conditionalExpression` | string | ✅ Yes (for conditional type) | `conditional` | Logical expression using {{field_name}} syntax |

---

## Field Type: API Configuration

### Purpose
Represents an API call that needs to be made. API details (endpoint, method, headers) are provided **later** during Feature-Integration Mapping.

### When to Use
- Feature requires making an HTTP API call
- API details vary per integration

### Configuration
During **template creation**:
- ❌ Do NOT collect API endpoint, method, headers
- ✅ Only mark field as type "API"

During **mapping** (future):
- ✅ Collect: HTTP method, endpoint URL, headers, body, parameters

### Example

```json
{
  "api": {
    "type": "api",
    "label": "API Configuration",
    "required": true,
    "description": "HTTP API endpoint details for fetching contacts",
    "fieldType": "string",
    "htmlType": "text"
  }
}
```

**Note**: The actual API details will be collected when mapping this feature to a specific integration (e.g., Salesforce, HubSpot).

---

## Field Type: Static

### Purpose
Value is set **once** during feature activation/configuration and remains constant.

### When to Use
- Configuration values that don't change per execution
- API keys, credentials
- Default settings
- From email addresses
- Company-specific values

### Properties
- Can have `default` value
- Value provided at setup time
- Doesn't change unless manually reconfigured

### Example

```json
{
  "from_email": {
    "type": "static",
    "label": "From Email Address",
    "fieldType": "email",
    "htmlType": "email",
    "required": true,
    "default": "noreply@company.com",
    "description": "Email address to send from"
  }
}
```

### Use Case
**Sending emails**: The "from" address is configured once and used for all emails sent through this integration.

---

## Field Type: Dynamic

### Purpose
Value is provided **at runtime** during each workflow execution. Changes every time.

### When to Use
- Values that change with each execution
- User-provided data
- Workflow variables
- Mapped values from previous steps

### Properties
- No `default` value (meaningless for dynamic fields)
- Value comes from workflow execution context
- Different every time feature runs

### Example

```json
{
  "to_email": {
    "type": "dynamic",
    "label": "Recipient Email",
    "fieldType": "email",
    "htmlType": "email",
    "required": true,
    "description": "Email address of recipient (provided at runtime)"
  }
}
```

### Use Case
**Sending emails**: The "to" address is different for each email (comes from contact list, form submission, etc.).

---

## Field Type: Conditional

### Purpose
Field is shown/required only when a **condition** is met based on other fields.

### When to Use
- Optional fields that depend on selections
- Fields that only apply in certain cases
- Cascading/dependent form fields

### Properties
- Must have `conditionalExpression`
- Expression references other fields using `{{field_name}}` syntax
- Evaluated at runtime or during form filling

### Example

```json
{
  "webhook": {
    "type": "conditional",
    "label": "Webhook URL",
    "fieldType": "url",
    "htmlType": "url",
    "required": false,
    "description": "URL to send webhook notifications",
    "conditionalExpression": "{{push_pull}}=='push'"
  }
}
```

### Explanation
The `webhook` field is only shown/required when the `push_pull` field has value `"push"`.

### Expression Syntax
See [Conditional Expressions](#conditional-expressions) section below.

---

## HTML Input Types

The `htmlType` property determines how the field is rendered in the UI.

### Available Types

| HTML Type | Description | Example Use Case | Supports possibleValues |
|-----------|-------------|------------------|------------------------|
| `text` | Single-line text input | Names, short strings | No |
| `textarea` | Multi-line text input | Descriptions, long text | No |
| `number` | Numeric input with +/- controls | Age, quantity, price | No |
| `email` | Email input with validation | Email addresses | No |
| `url` | URL input with validation | Website, webhook URL | No |
| `password` | Password input (masked) | API keys, passwords | No |
| `select` | Dropdown menu | Status, country, category | ✅ Yes (required) |
| `checkbox` | Multiple checkboxes | Tags, permissions | ✅ Yes (required) |
| `radio` | Radio buttons (single choice) | Gender, priority | ✅ Yes (required) |

### HTML Types Requiring possibleValues

When using `select`, `checkbox`, or `radio`, you **must** provide `possibleValues`:

```json
{
  "status": {
    "type": "static",
    "label": "Status",
    "fieldType": "string",
    "htmlType": "select",
    "required": true,
    "possibleValues": ["active", "inactive", "pending"],
    "multipleValueAllowed": false
  }
}
```

---

## Possible Values System

### Purpose
Define a list of allowed values for dropdown, checkbox, or radio fields.

### Structure

```json
{
  "possibleValues": ["value1", "value2", "value3"],
  "multipleValueAllowed": true
}
```

### Properties

**possibleValues** (array of strings):
- List of allowed options
- User can only select from these values
- Required when `htmlType` is `select`, `checkbox`, or `radio`

**multipleValueAllowed** (boolean):
- Only applicable for `select` and `checkbox`
- If `true`: User can select multiple values
- If `false`: User can select only one value
- Not applicable for `radio` (always single selection)

### Examples

#### Single Select Dropdown
```json
{
  "priority": {
    "type": "static",
    "label": "Priority",
    "fieldType": "string",
    "htmlType": "select",
    "possibleValues": ["low", "medium", "high", "urgent"],
    "multipleValueAllowed": false
  }
}
```

#### Multi-Select Dropdown
```json
{
  "tags": {
    "type": "dynamic",
    "label": "Tags",
    "fieldType": "array",
    "htmlType": "select",
    "possibleValues": ["important", "urgent", "review", "follow-up"],
    "multipleValueAllowed": true
  }
}
```

#### Checkboxes (Always Multi-Select)
```json
{
  "permissions": {
    "type": "static",
    "label": "Permissions",
    "fieldType": "array",
    "htmlType": "checkbox",
    "possibleValues": ["read", "write", "delete", "admin"],
    "multipleValueAllowed": true
  }
}
```

#### Radio Buttons (Always Single Select)
```json
{
  "gender": {
    "type": "static",
    "label": "Gender",
    "fieldType": "string",
    "htmlType": "radio",
    "possibleValues": ["male", "female", "other"],
    "multipleValueAllowed": false
  }
}
```

### UI Behavior

**During field creation**:
1. Select `htmlType` as `select`, `checkbox`, or `radio`
2. "Possible Values" input section appears
3. Add values one by one
4. Each value shown as a chip/tag
5. Can remove individual values

---

## Conditional Expressions

### Syntax

Conditional expressions use **`{{field_name}}`** syntax to reference other fields.

```
{{field_name}} operator value
```

### Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `==` | Equals | `{{status}} == 'active'` |
| `!=` | Not equals | `{{type}} != 'guest'` |
| `>` | Greater than | `{{age}} > 18` |
| `<` | Less than | `{{price}} < 100` |
| `>=` | Greater than or equal | `{{quantity}} >= 10` |
| `<=` | Less than or equal | `{{score}} <= 50` |
| `AND` | Logical AND | `{{age}} >= 18 AND {{country}} == 'US'` |
| `OR` | Logical OR | `{{type}} == 'premium' OR {{type}} == 'enterprise'` |

### Grouping with Parentheses

Use parentheses to group conditions:

```
(({{field1}} == 'value1' AND {{field2}} != 'value2') OR {{field3}} > 234)
```

### Examples

#### Simple Condition
```json
{
  "conditionalExpression": "{{push_pull}}=='push'"
}
```
**Meaning**: Show this field only when `push_pull` field has value "push".

#### Multiple Conditions with AND
```json
{
  "conditionalExpression": "{{age}} >= 18 AND {{country}} == 'US'"
}
```
**Meaning**: Show this field only when age is 18 or more AND country is US.

#### Multiple Conditions with OR
```json
{
  "conditionalExpression": "{{type}} == 'premium' OR {{type}} == 'enterprise'"
}
```
**Meaning**: Show this field when type is either "premium" or "enterprise".

#### Complex Nested Conditions
```json
{
  "conditionalExpression": "(({{subscription}} == 'paid' AND {{plan}} != 'basic') OR {{is_admin}} == true)"
}
```
**Meaning**: Show this field when:
- (User has paid subscription AND plan is not basic) OR
- User is an admin

### Field Reference Validation

The system automatically validates that:
1. ✅ All referenced fields use `{{field_name}}` syntax
2. ✅ All referenced fields actually exist in the feature
3. ✅ Fields cannot reference themselves

**Error Examples**:
- ❌ `field_name == 'value'` → Error: "No fields referenced. Use {{field_name}} syntax"
- ❌ `{{nonexistent}} == 'value'` → Error: "Referenced field(s) do not exist: {{nonexistent}}"
- ❌ `{{webhook}} == 'value'` (in webhook field itself) → Error: "Field cannot reference itself"

---

## Validation Rules

### Field Key Validation

**Rules**:
- Lowercase letters only
- Numbers allowed
- Underscores allowed
- No spaces, special characters, or uppercase

**Regex**: `^[a-z0-9_]+$`

**Valid**: `contact_name`, `email_address`, `user_id123`
**Invalid**: `Contact Name`, `email-address`, `user@id`, `userName`

### Required Fields

**During field creation**:
- ✅ Field Key
- ✅ Field Label
- ✅ Field Type (`api`, `static`, `dynamic`, `conditional`)
- ✅ Data Type (`fieldType`)
- ✅ HTML Type (`htmlType`)

**Conditionally required**:
- `possibleValues`: Required when `htmlType` is `select`, `checkbox`, or `radio`
- `conditionalExpression`: Required when field `type` is `conditional`

### Conditional Expression Validation

**Checks**:
1. Expression must use `{{field_name}}` syntax
2. All referenced fields must exist
3. Field cannot reference itself
4. Syntax must be valid (proper quotes, operators)

### Possible Values Validation

**Checks**:
- At least one value must be added
- Values cannot be empty strings
- Duplicate values not allowed

---

## Storage Structure

### features-definition.json

```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-11-24T10:00:00Z",
  "categories": {
    "contacts": {
      "label": "Contacts",
      "icon": "👥",
      "color": "#4CAF50",
      "description": "Contact management features"
    },
    "email": {
      "label": "Email",
      "icon": "📧",
      "color": "#2196F3",
      "description": "Email communication features"
    }
  },
  "features": {
    "feature_id": {
      "id": "feature_id",
      "name": "Feature Name",
      "description": "Feature description",
      "category": "contacts",
      "fields": {
        "field_key": {
          "type": "static",
          "label": "Field Label",
          "fieldType": "string",
          "htmlType": "text",
          "required": true,
          "description": "Field description"
        }
      },
      "createdAt": "2025-11-24T10:00:00Z",
      "updatedAt": "2025-11-24T10:00:00Z"
    }
  }
}
```

### Field Object Structure

```json
{
  "field_key": {
    "type": "static|dynamic|api|conditional",
    "label": "Display Label",
    "fieldType": "string|number|boolean|email|url|text|html|json|array|object",
    "htmlType": "text|textarea|number|email|url|password|select|checkbox|radio",
    "required": true|false,
    "description": "Help text",

    // Optional properties
    "default": "default value",                      // For static fields
    "possibleValues": ["value1", "value2"],         // For select/checkbox/radio
    "multipleValueAllowed": true|false,             // For select/checkbox
    "conditionalExpression": "{{field}}=='value'"   // For conditional fields
  }
}
```

---

## UI Components

### Main Page Structure

**URL**: `http://localhost:3000/feature-templates.html`

**Sections**:
1. **Header**: Page title, stats, add feature button
2. **Category Filters**: Filter features by category
3. **Search**: Search features by name/description
4. **Features Table**: List of all features with actions
5. **Modals**: Create/edit feature, add/edit field, delete confirmation

### Features Table

**Columns**:
- Checkbox (for bulk actions)
- Name (with icon and ID)
- Category (with color badge)
- Fields count
- Status (Active/Inactive/Beta)
- Last Updated
- Actions (Edit, Delete)

**Sorting**: By creation time (newest first)

### Feature Modal

**Tabs/Sections**:
1. **Basic Information**: ID, name, description, category
2. **Field Definitions**: List of fields with add/edit/remove actions

### Field Modal

**Form Groups** (dynamically shown based on field type):
- Field Key
- Field Label
- Field Type (API, Static, Dynamic, Conditional)
- Data Type (appears for all types)
- HTML Type (appears for all types)
- Possible Values (appears when htmlType is select/checkbox/radio)
- Multiple Value Allowed (appears for select/checkbox)
- Conditional Expression (appears for conditional type)
- Required checkbox
- Default Value (appears for static type)
- Description

---

## API Endpoints

### GET /api/feature-templates
**Purpose**: Fetch all feature templates

**Response**:
```json
{
  "success": true,
  "features": [...],
  "categories": {...}
}
```

### GET /api/feature-templates/:id
**Purpose**: Fetch single feature template

**Response**:
```json
{
  "success": true,
  "feature": {...}
}
```

### POST /api/feature-templates
**Purpose**: Create new feature template

**Request Body**:
```json
{
  "id": "feature_id",
  "name": "Feature Name",
  "description": "Description",
  "category": "contacts",
  "fields": {...}
}
```

**Response**:
```json
{
  "success": true,
  "feature": {...}
}
```

### PUT /api/feature-templates/:id
**Purpose**: Update existing feature template

**Request Body**: Same as POST

**Response**:
```json
{
  "success": true,
  "feature": {...}
}
```

### DELETE /api/feature-templates/:id
**Purpose**: Delete feature template

**Response**:
```json
{
  "success": true,
  "message": "Feature deleted successfully"
}
```

---

## Examples

### Example 1: Simple Contact Creation Feature

```json
{
  "id": "create_contact",
  "name": "Create Contact",
  "description": "Create a new contact in the CRM",
  "category": "contacts",
  "fields": {
    "api": {
      "type": "api",
      "label": "API Configuration",
      "fieldType": "string",
      "htmlType": "text",
      "required": true,
      "description": "API details for creating contacts"
    },
    "contact_name": {
      "type": "dynamic",
      "label": "Contact Name",
      "fieldType": "string",
      "htmlType": "text",
      "required": true,
      "description": "Full name of the contact"
    },
    "email": {
      "type": "dynamic",
      "label": "Email Address",
      "fieldType": "email",
      "htmlType": "email",
      "required": true,
      "description": "Contact's email address"
    },
    "auto_assign": {
      "type": "static",
      "label": "Auto-assign to User",
      "fieldType": "boolean",
      "htmlType": "checkbox",
      "required": false,
      "default": false,
      "description": "Automatically assign contact to a user"
    }
  }
}
```

### Example 2: Email with Conditional CC Field

```json
{
  "id": "send_email",
  "name": "Send Email",
  "description": "Send email via integration",
  "category": "email",
  "fields": {
    "api": {
      "type": "api",
      "label": "API Configuration",
      "fieldType": "string",
      "htmlType": "text",
      "required": true
    },
    "from_email": {
      "type": "static",
      "label": "From Email",
      "fieldType": "email",
      "htmlType": "email",
      "required": true,
      "description": "Sender email address"
    },
    "to_email": {
      "type": "dynamic",
      "label": "To Email",
      "fieldType": "email",
      "htmlType": "email",
      "required": true,
      "description": "Recipient email address"
    },
    "send_copy": {
      "type": "static",
      "label": "Send Copy to Others",
      "fieldType": "boolean",
      "htmlType": "checkbox",
      "required": false,
      "default": false
    },
    "cc_email": {
      "type": "conditional",
      "label": "CC Email",
      "fieldType": "email",
      "htmlType": "email",
      "required": false,
      "description": "Carbon copy email address",
      "conditionalExpression": "{{send_copy}}==true"
    }
  }
}
```

### Example 3: Multi-Select Tags

```json
{
  "id": "tag_contact",
  "name": "Tag Contact",
  "description": "Add tags to a contact",
  "category": "contacts",
  "fields": {
    "api": {
      "type": "api",
      "label": "API Configuration",
      "fieldType": "string",
      "htmlType": "text",
      "required": true
    },
    "contact_id": {
      "type": "dynamic",
      "label": "Contact ID",
      "fieldType": "string",
      "htmlType": "text",
      "required": true
    },
    "tags": {
      "type": "dynamic",
      "label": "Tags",
      "fieldType": "array",
      "htmlType": "checkbox",
      "required": true,
      "possibleValues": ["important", "vip", "follow-up", "hot-lead", "cold-lead"],
      "multipleValueAllowed": true,
      "description": "Select one or more tags"
    }
  }
}
```

---

## Best Practices

### Naming Conventions

**Feature IDs**:
- Use lowercase with underscores
- Be descriptive: `create_contact`, `send_email`, `fetch_leads`
- Avoid abbreviations unless well-known

**Field Keys**:
- Use lowercase with underscores
- Be descriptive: `contact_name`, `email_address`, `webhook_url`
- Avoid generic names like `field1`, `value`

### Field Organization

**Order fields logically**:
1. API configuration (if present)
2. Required static fields
3. Required dynamic fields
4. Optional fields
5. Conditional fields last

### Description Guidelines

**Be clear and helpful**:
- ✅ "Email address of the recipient (provided at runtime)"
- ❌ "Email address"

**Explain when/how field is used**:
- ✅ "Only shown when 'Send Copy' is enabled"
- ❌ "CC email"

### Conditional Expressions

**Keep them simple**:
- ✅ `{{status}} == 'active'`
- ❌ `(({{a}}=='x' AND {{b}}=='y') OR ({{c}}!='z' AND {{d}}>5)) AND {{e}}<=10`

**Document complex conditions** in field description.

---

## Troubleshooting

### Issue: Form Collapses When Clicking Edit

**Cause**: Missing `type="button"` on buttons inside form
**Solution**: All buttons inside `<form>` must have `type="button"` to prevent form submission

### Issue: Conditional Expression Not Working

**Check**:
1. Are you using `{{field_name}}` syntax?
2. Does the referenced field exist?
3. Is the field name spelled correctly?
4. Are quotes matching (single vs double)?

### Issue: Possible Values Not Saving

**Check**:
1. Did you click "Add" button after typing each value?
2. Are values showing as chips/tags before saving field?
3. Is `htmlType` set to `select`, `checkbox`, or `radio`?

### Issue: Field Not Showing in List

**Check**:
1. Did you click "Add Field" or "Update Field"?
2. Is there a validation error (check toast messages)?
3. Refresh the page to reload from `features-definition.json`

---

## Related Documentation

- [Custom Handler Architecture](/docs/future/custom-handler-architecture.md) - Future implementation for complex cases
- [Panel Config Guide](/docs/PANEL_CONFIG_GUIDE.md) - Integration configuration
- [API Endpoints](/docs/API-ENDPOINTS.md) - All API endpoints

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-24 | Initial documentation |

---

**Status**: This system is actively being developed. Current focus is on feature template creation and management. Feature-Integration Mapping will be implemented next.
