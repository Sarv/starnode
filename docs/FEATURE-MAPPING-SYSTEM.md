# Feature-Integration Mapping System

> [!CAUTION] > **DEPRECATED**: This document describes the **old** 5-step Feature-Integration Mapping wizard which has been replaced by a simplified 3-step Add Feature wizard.
>
> **See**: [Updated Feature Creation Process](./updated_feature_creation_process.md) for the current approach.
>
> Key changes:
>
> - Features are now created directly within integrations (no templates)
> - Wizard reduced from 5 steps to 3 steps
> - URL changed from `/feature-integration-mapping` to `/add-feature`

**Last Updated:** 2025-11-26
**Purpose:** ~~Complete guide to the Feature Template and Feature-Integration Mapping system~~ **DEPRECATED - See updated process**

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Feature Templates](#feature-templates)
4. [Feature-Integration Mapping](#feature-integration-mapping)
5. [Field Types](#field-types)
6. [fillBy Property](#fillby-property)
7. [Custom Handlers](#custom-handlers)
8. [Extra Fields](#extra-fields)
9. [Wizard Flow](#wizard-flow)
10. [Data Storage](#data-storage)
11. [UI Components](#ui-components)
12. [API Endpoints](#api-endpoints)

---

## Overview

The Feature-Integration Mapping System enables flexible configuration of reusable features across multiple integrations. It provides:

- **Reusable Templates**: Define features once, use across many integrations
- **Custom Configuration**: Each integration can customize how features work
- **Admin vs User Control**: Decide what's configured during setup vs runtime
- **Handler System**: Custom transformation, validation, and submission logic
- **Extra Fields**: Add integration-specific fields beyond the template

### Real-World Example

**Feature Template**: "Create Contact"

- Works for Salesforce, HubSpot, Freshdesk, etc.
- Template defines common fields: name, email, phone

**Integration Mappings**:

- **Salesforce**: Adds extra field "Account ID", custom handler for Salesforce API format
- **HubSpot**: Adds extra field "Pipeline", different API endpoint
- **Freshdesk**: Adds extra field "Ticket Priority", validation handler for email format

Same template, different configurations per integration!

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Feature Templates                        │
│            (features-definition.json)                       │
│  Reusable definitions for common features                  │
└───────────────┬─────────────────────────────────────────────┘
                │
                │ (Referenced by)
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│            Feature-Integration Mappings                     │
│  (integrations/providers/{id}/features.schema.json)        │
│                                                             │
│  ┌───────────────────────────────────────────┐            │
│  │  Mapping 1: "Create Contact"              │            │
│  │  - Field configurations                    │            │
│  │  - Custom handlers                         │            │
│  │  - API endpoint                            │            │
│  │  - Extra fields                            │            │
│  └───────────────────────────────────────────┘            │
│                                                             │
│  ┌───────────────────────────────────────────┐            │
│  │  Mapping 2: "Send Email"                   │            │
│  │  - Different configuration                 │            │
│  └───────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────┘
                │
                │ (Used at runtime)
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Runtime Execution                        │
│  1. Load feature mapping                                    │
│  2. Apply admin values (pre-configured)                     │
│  3. Collect user values (at runtime)                        │
│  4. Execute handlers (transform → validate → submit)        │
│  5. Call integration API                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Feature Templates

### Definition Location

`/features-definition.json`

### Template Structure

```json
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
      "description": "Contact's first name",
      "fieldType": "string",
      "htmlType": "text",
      "fillBy": "User"
    },
    "email": {
      "type": "static",
      "label": "Email Address",
      "required": true,
      "description": "Contact's email",
      "fieldType": "email",
      "htmlType": "email",
      "fillBy": "User"
    },
    "tags": {
      "type": "static",
      "label": "Tags",
      "required": false,
      "description": "Contact tags",
      "fieldType": "string",
      "htmlType": "checkbox",
      "fillBy": "Admin",
      "possibleValues": ["vip", "lead", "customer"]
    },
    "account_id": {
      "type": "dynamic",
      "label": "Account ID",
      "required": false,
      "description": "Fetched from API",
      "fieldType": "string",
      "htmlType": "select",
      "fillBy": "User"
    },
    "webhook_url": {
      "type": "conditional",
      "label": "Webhook URL",
      "required": false,
      "description": "Webhook for notifications",
      "fieldType": "url",
      "htmlType": "url",
      "fillBy": "Admin",
      "conditionalExpression": "{{tags}}=='vip'"
    },
    "api_endpoint": {
      "type": "api",
      "label": "API Configuration",
      "required": true,
      "description": "API endpoint details",
      "fieldType": "string",
      "htmlType": "text",
      "fillBy": "Admin"
    }
  },
  "createdAt": "2025-11-26T00:00:00.000Z",
  "updatedAt": "2025-11-26T00:00:00.000Z"
}
```

### Field Properties

| Property                | Type    | Required | Description                                                                                     |
| ----------------------- | ------- | -------- | ----------------------------------------------------------------------------------------------- |
| `type`                  | enum    | Yes      | Field behavior: `static`, `dynamic`, `conditional`, `api`                                       |
| `label`                 | string  | Yes      | Display name shown to users                                                                     |
| `required`              | boolean | Yes      | Whether field is mandatory                                                                      |
| `description`           | string  | No       | Help text explaining the field                                                                  |
| `fieldType`             | enum    | Yes      | Data type: `string`, `number`, `email`, `url`, `boolean`                                        |
| `htmlType`              | enum    | Yes      | Input type: `text`, `number`, `email`, `url`, `checkbox`, `radio`, `select`, `textarea`, `date` |
| `fillBy`                | enum    | Yes      | Who provides value: `Admin` or `User`                                                           |
| `possibleValues`        | array   | No       | Options for select/radio/checkbox                                                               |
| `default`               | any     | No       | Default value                                                                                   |
| `conditionalExpression` | string  | No       | Show field only if expression is true                                                           |

### Field Type Details

See [Field Types](#field-types) section below.

---

## Feature-Integration Mapping

### Purpose

Map a feature template to a specific integration with custom configuration.

### Wizard Access

- **New Mapping**: `/feature-integration-mapping?integrationId={id}`
- **Edit Mapping**: `/feature-integration-mapping?integrationId={id}&mappingId={mappingId}`

### Mapping Structure

```json
{
  "id": "mapping_1732630935626_abc123",
  "featureTemplateId": "create_contact",
  "featureTemplateName": "Create Contact",

  "fieldMappings": {
    "first_name": {
      "enabled": true,
      "overrides": null,
      "customHandlers": {
        "valueHandler": "capitalizeFirstName",
        "validationHandler": "validateNameLength",
        "submitHandler": "formatForAPI"
      },
      "adminValue": null
    },
    "email": {
      "enabled": true,
      "overrides": null,
      "customHandlers": {
        "valueHandler": null,
        "validationHandler": "validateEmailFormat",
        "submitHandler": null
      },
      "adminValue": null
    },
    "tags": {
      "enabled": true,
      "overrides": null,
      "customHandlers": null,
      "adminValue": ["lead", "customer"]
    }
  },

  "apiConfig": {
    "apiConfigId": null,
    "method": "POST",
    "endpoint": "/api/contacts"
  },

  "extraFields": [
    {
      "fieldKey": "salesforce_object_type",
      "label": "Salesforce Object Type",
      "description": "The type of Salesforce object",
      "type": "static",
      "fieldType": "string",
      "htmlType": "select",
      "fillBy": "Admin",
      "required": true,
      "default": null,
      "possibleValues": [
        { "id": "Contact", "label": "Contact" },
        { "id": "Lead", "label": "Lead" }
      ],
      "customHandlers": {
        "valueHandler": null,
        "validationHandler": null,
        "submitHandler": "addToRequestBody"
      },
      "adminValue": "Contact",
      "order": 1
    }
  ],

  "customHandlers": {},
  "customHandlers_for_feature": {
    "submitHandler": "transformContactPayload"
  },
  "status": "active",
  "createdAt": "2025-11-26T10:00:00.000Z",
  "updatedAt": "2025-11-26T10:00:00.000Z"
}
```

### Field Mapping Properties

| Property         | Type    | Description                                 |
| ---------------- | ------- | ------------------------------------------- |
| `enabled`        | boolean | Whether field is active in this mapping     |
| `overrides`      | object  | Override template field properties (future) |
| `customHandlers` | object  | Custom functions for this field             |
| `adminValue`     | any     | Value set by admin (if `fillBy: "Admin"`)   |

---

## Field Types

### 1. Static Fields

**Purpose**: Fixed configuration fields, values don't change

**Characteristics**:

- Value set once during configuration
- No runtime fetching
- Can be `fillBy: "Admin"` or `fillBy: "User"`

**Example**:

```json
{
  "type": "static",
  "label": "Default Priority",
  "fillBy": "Admin",
  "htmlType": "select",
  "possibleValues": ["low", "medium", "high"]
}
```

**Use Cases**:

- Configuration options
- Default values
- Static tags or categories

---

### 2. Dynamic Fields

**Purpose**: Values fetched at runtime from API or computed

**Characteristics**:

- Value determined at runtime
- Often populated by API calls
- Usually `fillBy: "User"`

**Example**:

```json
{
  "type": "dynamic",
  "label": "Project",
  "fillBy": "User",
  "htmlType": "select",
  "description": "Fetched from your account"
}
```

**Use Cases**:

- Dropdown populated from API (projects, users, categories)
- Computed values based on other fields
- Real-time data

**Implementation Note**: Frontend calls API to fetch possible values before showing field.

---

### 3. Conditional Fields

**Purpose**: Fields that appear only when conditions are met

**Characteristics**:

- Visibility controlled by `conditionalExpression`
- Expression uses template syntax: `{{fieldKey}}`
- Evaluated at runtime

**Example**:

```json
{
  "type": "conditional",
  "label": "Webhook URL",
  "fillBy": "Admin",
  "htmlType": "url",
  "conditionalExpression": "{{notification_enabled}}==true and {{priority}}=='high'"
}
```

**Expression Syntax**:

- `{{field_key}}` - Reference other field values
- `==`, `!=` - Equality operators
- `and`, `or` - Logical operators
- `'value'` - String literals

**Use Cases**:

- Advanced settings shown only when enabled
- Fields dependent on other field values
- Progressive disclosure

---

### 4. API Fields

**Purpose**: Fields requiring API endpoint configuration

**Characteristics**:

- Usually `fillBy: "Admin"`
- Triggers "API Settings" button in UI
- Stores API configuration details

**Example**:

```json
{
  "type": "api",
  "label": "API Endpoint Configuration",
  "fillBy": "Admin",
  "htmlType": "text"
}
```

**UI Behavior**:

- Shows blue "API Settings" button instead of regular input
- Clicking button opens API configuration panel
- Displays endpoint, method, authentication details

**Use Cases**:

- Custom API endpoints
- Webhook configurations
- External service connections

---

## fillBy Property

Controls **who** provides the field value and **when**.

### fillBy: "Admin"

**Who**: Administrator during integration setup
**When**: During feature mapping configuration (wizard Step 2/4)
**Storage**: Value stored in `adminValue` property

**UI Behavior**:

- Shows input field in mapping wizard
- Value saved to `features.schema.json`
- End users don't see or configure these fields
- Displays in detail view as configured value

**Example Flow**:

```
Admin opens wizard
  → Configures "Default Tags" = ["vip", "customer"]
  → Saves mapping
  → All users inherit this default value
```

**Use Cases**:

- API keys and credentials
- Default settings applied to all users
- Integration-wide configurations
- Business rules and constants

**Code Example**:

```javascript
// In wizard - show input if fillBy === 'Admin'
if (field.fillBy === 'Admin') {
  adminValueInputContainer.innerHTML = generateValueInput(
    field,
    fieldKey,
    currentValue,
  );
  adminValueSection.style.display = 'block';
} else {
  adminValueSection.style.display = 'none';
}
```

---

### fillBy: "User"

**Who**: End user during integration activation/usage
**When**: At runtime when using the integration
**Storage**: No `adminValue` stored

**UI Behavior**:

- No input field in mapping wizard
- Shows "To be filled by user" in tables
- User provides value when executing workflow/action

**Example Flow**:

```
Admin creates mapping (no value set)
  → User triggers "Create Contact" action
  → System prompts user: "Enter contact email"
  → User provides: "john@example.com"
  → Action executes with user's value
```

**Use Cases**:

- User-specific data (emails, names, phone numbers)
- Per-execution values (which project, which task)
- Dynamic user choices
- Runtime parameters

**Display in Tables**:

```html
<!-- fillBy: Admin with value -->
<span class="value-text">["vip", "customer"]</span>

<!-- fillBy: Admin without value -->
<span class="empty-cell">Not set</span>

<!-- fillBy: User -->
<span class="empty-cell">To be filled by user</span>
```

---

### Choosing fillBy

| Scenario         | fillBy | Reason                        |
| ---------------- | ------ | ----------------------------- |
| API Key          | Admin  | Same for all users, set once  |
| Default Priority | Admin  | Business rule, consistent     |
| Contact Email    | User   | Different for each execution  |
| Which Project    | User   | User decides at runtime       |
| Webhook URL      | Admin  | Same endpoint for integration |
| Custom Message   | User   | User provides each time       |

---

## Custom Handlers

Custom handlers allow executing JavaScript functions to transform, validate, or process field values.

### Handler Scopes

There are two types of custom handler scopes in the feature mapping system:

#### 1. Field-Level Handlers

**Location**: `fieldMappings[fieldKey].customHandlers`

**Purpose**: Process individual field values

**Available Handlers**:

- `valueHandler`: Transform field value after entry
- `validationHandler`: Validate field value before submission
- `submitHandler`: Process field value before API submission
- `formatHandler`: Format field value for display
- `parseHandler`: Parse incoming data for field population
- `conditionalHandler`: Control field visibility/enablement

**Scope**: Applies only to the specific field

**Example**:

```json
{
  "fieldMappings": {
    "email": {
      "enabled": true,
      "customHandlers": {
        "valueHandler": "toLowerCase",
        "validationHandler": "validateEmail"
      }
    }
  }
}
```

---

#### 2. Feature-Level Handlers

**Location**: `customHandlers_for_feature`

**Purpose**: Process entire feature data before API submission

**Available Handlers**:

- `submitHandler`: Transform complete feature payload before API call

**Scope**: Applies to all feature data collectively

**When to Use**:

- Transform entire request payload structure
- Combine multiple field values
- Apply feature-wide business logic
- Prepare data for specific API requirements
- Add metadata or authentication tokens

**Example**:

```json
{
  "featureTemplateId": "sync_contacts",
  "fieldMappings": { ... },
  "customHandlers_for_feature": {
    "submitHandler": "transformContactPayload"
  }
}
```

**Function Signature**:

```javascript
// Feature-level submit handler receives entire feature data
function transformContactPayload(featureData) {
  return {
    api_version: '2.0',
    data: {
      contact: {
        email: featureData.email,
        name: featureData.name,
        metadata: {
          source: 'integration_platform',
          timestamp: Date.now(),
        },
      },
    },
  };
}
```

---

### Execution Order

```
1. User/Admin enters field values
   ↓
2. Field-level valueHandler (per field)
   ↓
3. Field-level validationHandler (per field)
   ↓
4. Field-level submitHandler (per field)
   ↓
5. Feature-level submitHandler (entire payload)
   ↓
6. API Call
```

**Key Differences**:

| Aspect   | Field-Level                           | Feature-Level                |
| -------- | ------------------------------------- | ---------------------------- |
| Scope    | Single field                          | Entire feature               |
| Location | `fieldMappings[field].customHandlers` | `customHandlers_for_feature` |
| Input    | Field value                           | Complete feature data        |
| Output   | Transformed field value               | Transformed payload          |
| Use Case | Field validation/formatting           | Payload structuring          |

---

### Three Field-Level Handler Types

#### 1. Value Handler (Transform)

**Purpose**: Transform field value before use
**Execution**: After value is entered, before validation
**Property**: `customHandlers.valueHandler`

**Examples**:

```javascript
// Function name: "capitalizeFirstName"
function capitalizeFirstName(value) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

// Function name: "formatPhoneNumber"
function formatPhoneNumber(value) {
  return value.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
}

// Function name: "parseJSON"
function parseJSON(value) {
  return JSON.parse(value);
}
```

**Use Cases**:

- Format data (phone numbers, dates, currency)
- Normalize values (trim, lowercase)
- Parse complex structures
- Apply business logic transformations

---

#### 2. Validation Handler (Validity)

**Purpose**: Validate field value
**Execution**: After transformation, before submission
**Property**: `customHandlers.validationHandler`
**Return**: `true` or error message string

**Examples**:

```javascript
// Function name: "validateEmailFormat"
function validateEmailFormat(value) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return 'Invalid email format';
  }
  return true;
}

// Function name: "validatePhoneNumber"
function validatePhoneNumber(value) {
  if (value.length < 10) {
    return 'Phone number must be at least 10 digits';
  }
  return true;
}

// Function name: "validateAgainstAPI"
async function validateAgainstAPI(value) {
  const response = await fetch(`/api/validate?value=${value}`);
  const result = await response.json();
  return result.valid ? true : result.error;
}
```

**Use Cases**:

- Format validation (email, phone, URL)
- Range validation (min/max)
- Cross-field validation
- External API validation
- Business rule validation

---

#### 3. Submit Handler (Configuration)

**Purpose**: Process field before API submission
**Execution**: Just before making API call
**Property**: `customHandlers.submitHandler`

**Examples**:

```javascript
// Function name: "encryptSensitiveData"
function encryptSensitiveData(value) {
  return encrypt(value, SECRET_KEY);
}

// Function name: "addToRequestBody"
function addToRequestBody(value, requestBody) {
  requestBody.salesforce_object = value;
  return requestBody;
}

// Function name: "convertToAPIFormat"
function convertToAPIFormat(value) {
  return {
    type: 'contact',
    attributes: {
      email: value,
    },
  };
}
```

**Use Cases**:

- Encrypt sensitive data
- Build complex request structures
- Add metadata
- Format for specific API requirements
- Apply final transformations

---

### Handler Configuration

**In Mapping**:

```json
{
  "customHandlers": {
    "valueHandler": "capitalizeFirstName",
    "validationHandler": "validateEmailFormat",
    "submitHandler": "encryptSensitiveData"
  }
}
```

**Execution Order**:

```
User enters value
  ↓
Value Handler (transform)
  ↓
Validation Handler (validate)
  ↓
Submit Handler (process)
  ↓
API Call
```

**Important Notes**:

- Handler names stored as strings
- Functions executed at runtime
- All handlers are optional
- Handlers can be async/await
- Errors stop the flow and notify user

---

## Extra Fields

### Purpose

Add integration-specific fields not in the feature template.

### Why Extra Fields?

- Integration needs fields not in generic template
- Salesforce needs "Object Type", Google Sheets needs "Sheet ID"
- Avoid modifying template for one integration
- Keep templates generic and reusable

### Extra Field Structure

```json
{
  "fieldKey": "sheet_id",
  "label": "Google Sheet ID",
  "description": "The ID of your Google Sheet",
  "type": "static",
  "fieldType": "string",
  "htmlType": "text",
  "fillBy": "Admin",
  "required": true,
  "default": null,
  "possibleValues": [],
  "customHandlers": {
    "valueHandler": "extractSheetId",
    "validationHandler": "validateSheetExists",
    "submitHandler": "addToGoogleAPIRequest"
  },
  "adminValue": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
  "order": 1
}
```

### All Extra Field Properties

| Property         | Type    | Required | Description                                                                |
| ---------------- | ------- | -------- | -------------------------------------------------------------------------- |
| `fieldKey`       | string  | Yes      | Unique identifier                                                          |
| `label`          | string  | Yes      | Display name                                                               |
| `description`    | string  | No       | Help text                                                                  |
| `type`           | enum    | Yes      | `static`, `dynamic`, `api`, `conditional`                                  |
| `fieldType`      | enum    | Yes      | `string`, `number`, `email`, `url`, `boolean`                              |
| `htmlType`       | enum    | Yes      | `text`, `checkbox`, `radio`, `select`, `textarea`, `url`, `date`, `number` |
| `fillBy`         | enum    | Yes      | `Admin` or `User`                                                          |
| `required`       | boolean | Yes      | Is mandatory                                                               |
| `default`        | any     | No       | Default value                                                              |
| `possibleValues` | array   | No       | Options for select/radio/checkbox                                          |
| `customHandlers` | object  | No       | Transform/validate/submit functions                                        |
| `adminValue`     | any     | No       | Pre-filled value (if fillBy: Admin)                                        |
| `order`          | number  | Yes      | Display order                                                              |

### Adding Extra Fields

**In Wizard Step 4**:

1. Click "Add Field" button
2. Fill out extra field modal with all properties
3. Configure possible values (if select/radio/checkbox)
4. Set custom handlers
5. Set admin value (if fillBy: Admin)
6. Save

**UI Components**:

- Dynamic input generation based on `htmlType`
- Possible values list builder
- Custom handlers input fields
- Conditional admin value section

---

## Wizard Flow

### 5-Step Wizard

Location: `/feature-integration-mapping`

#### Step 1: Select Feature Template

**Purpose**: Choose which feature to map

**UI**:

- Search bar
- Category filters (contacts, email, sms, leads, tasks)
- Feature cards with name, description, category

**Actions**:

- Click feature card to select
- Auto-advance to Step 2

---

#### Step 2: Configure Template Fields

**Purpose**: Enable/disable fields and configure handlers

**UI**: Professional table layout

- **ENABLE** column - Checkbox to enable/disable field
- **FIELD DETAILS** column - Field name, description, type, data type, required badge
- **VALUE HANDLER** column - Custom transform function
- **VALIDITY HANDLER** column - Custom validation function
- **SUBMIT HANDLER** column - Custom submit function
- **VALUE** column - Admin value (if fillBy: Admin) or "To be filled by user"
- **ACTIONS** column - Settings icon to configure

**Features**:

- Disable unwanted fields
- Configure custom handlers per field
- Set admin values for Admin-filled fields
- Field configuration modal

**Configuration Modal**:
Opens when clicking settings icon:

- Field label override
- Description override
- Custom handler inputs (valueHandler, validationHandler, submitHandler)
- Admin value input (conditional on fillBy and htmlType)

---

#### Step 3: API Configuration

**Purpose**: Configure API endpoint

**UI**:

- API Config ID input (optional, for existing configs)
- **OR** Quick Setup:
  - Method dropdown (GET, POST, PUT, PATCH, DELETE)
  - Endpoint input (supports placeholders: `/api/{field_name}`)

**Example**:

```
Method: POST
Endpoint: /api/contacts/{object_type}
```

**Notes**:

- Leave config ID empty for new setup
- Endpoint placeholders replaced at runtime
- Full API management coming later

---

#### Step 4: Extra Fields

**Purpose**: Add integration-specific fields

**UI**: Same table layout as Step 2

- **FIELD DETAILS**, **VALUE HANDLER**, **VALIDITY HANDLER**, **SUBMIT HANDLER**, **VALUE**, **ACTIONS** columns
- "Add Field" button opens modal
- Edit and Delete actions per field

**Add Field Modal**:
Complete form with:

- Field Key (unique ID)
- Label
- Description
- Type dropdown (static, dynamic, api, conditional)
- Field Type dropdown (string, number, email, url, boolean)
- HTML Type dropdown (text, checkbox, radio, select, textarea, url, date, number)
- Fill By dropdown (Admin, User)
- Required checkbox
- Default value input
- Possible Values section (for select/radio/checkbox)
  - Add/remove value rows
  - Each row: ID and Label
- Custom Handlers section
  - Value Handler input
  - Validation Handler input
  - Submit Handler input
- Admin Value section (conditional on fillBy)
  - Dynamically generated based on htmlType
  - Uses `generateValueInput()` function
- Order input

**Possible Values Builder**:

```
Possible Values:
[+] Add Value

┌──────────────────────────────────────┐
│ ID: contact      Label: Contact   [×]│
├──────────────────────────────────────┤
│ ID: lead         Label: Lead      [×]│
├──────────────────────────────────────┤
│ ID: opportunity  Label: Opportunity[×]│
└──────────────────────────────────────┘
```

---

#### Step 5: Review & Save

**Purpose**: Review entire configuration before saving

**UI**:

- Mapping summary
- Feature name and template ID
- Field count (enabled/total)
- API configuration summary
- Extra fields count
- Action buttons: Save, Cancel

**Save Action**:

- Validates entire configuration
- Generates unique mapping ID: `mapping_{timestamp}_{random}`
- Saves to `/integrations/providers/{integrationId}/features.schema.json`
- Redirects to integration detail page

---

### Edit Mode

**Access**: `/feature-integration-mapping?integrationId={id}&mappingId={mappingId}`

**Behavior**:

- Loads existing mapping
- Pre-fills all wizard steps
- Same flow as create
- Update saves to same mapping ID
- Updates `updatedAt` timestamp

---

## Data Storage

### File Location

`/integrations/providers/{integrationId}/features.schema.json`

### File Structure

```json
{
  "version": "1.0.0",
  "features": [],
  "featureMappings": [
    {
      "id": "mapping_1764100935626_uikt58e78",
      "featureTemplateId": "create_contact",
      "featureTemplateName": "Create Contact",
      "fieldMappings": {
        /* ... */
      },
      "apiConfig": {
        /* ... */
      },
      "extraFields": [
        /* ... */
      ],
      "customHandlers": {},
      "status": "active",
      "createdAt": "2025-11-26T10:00:00.000Z",
      "updatedAt": "2025-11-26T10:00:00.000Z"
    }
  ],
  "lastUpdated": "2025-11-26T10:00:00.000Z"
}
```

### Multiple Mappings

- One integration can have multiple feature mappings
- Each mapping has unique ID
- Array stored in `featureMappings`
- File updated on create/update/delete

---

## UI Components

### Integration Detail Page

**Location**: `/integration-detail/{integrationId}`

**Feature Mappings Tab**:

#### Feature Pills (Tabs)

Horizontal pill navigation:

```
┌──────────────┬──────────────┬──────────────┐
│ Create Contact│ Send Email   │ Update Lead  │
│   (active)   │              │              │
└──────────────┴──────────────┴──────────────┘
```

#### 2-Column Layout

**Left Column**: Field Tables

- **Template Fields** section
  - Table with all template fields
  - Shows enabled fields only
  - Field details, handlers, values
- **Extra Fields** section
  - Same table format
  - Integration-specific fields

**Right Column**: API Configuration (Sticky)

- Panel showing API details
- Method and Endpoint
- Edit and Delete buttons
- Changes when clicking "API Settings" on api-type fields

#### Table Format

Same professional table used in wizard:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ FIELD DETAILS     │ VALUE HANDLER │ VALIDITY HANDLER │ SUBMIT HANDLER │ VALUE  │
├──────────────────────────────────────────────────────────────────────────────┤
│ First Name    REQ │ capitalize... │ validateLength   │ formatForAPI   │ [User] │
│ Static · String   │               │                  │                │        │
│                   │               │                  │                │        │
├──────────────────────────────────────────────────────────────────────────────┤
│ Email         REQ │       -       │ validateEmail    │       -        │ [User] │
│ Static · Email    │               │                  │                │        │
│                   │               │                  │                │        │
├──────────────────────────────────────────────────────────────────────────────┤
│ Sheet ID      REQ │ extractId     │ validateExists   │ addToRequest   │ 1Bxi...│
│ API · String      │               │                  │                │        │
│                   │               │                  │                │[Settings]│
└──────────────────────────────────────────────────────────────────────────────┘
```

**API Settings Button**:

- Shown for fields with `type: "api"`
- Blue button with icon
- Clicking updates right panel with field details

---

### Dynamic Input Generation

**Function**: `generateValueInput(field, fieldKey, currentValue)`

**Purpose**: Generate appropriate HTML input based on field configuration

**Supported Types**:

- text, password, email, url, tel - `<input>` elements
- number - `<input type="number">`
- date - `<input type="date">`
- textarea - `<textarea>`
- select - `<select>` with options from `possibleValues`
- checkbox - Multiple checkboxes or single checkbox
- radio - Radio button group

**Features**:

- Handles array values (checkbox groups)
- Pre-fills current values
- Uses possibleValues for options
- Generates labels and containers

**Example**:

```javascript
// Field with select
generateValueInput(
  {
    label: 'Priority',
    htmlType: 'select',
    possibleValues: [
      { id: 'low', label: 'Low' },
      { id: 'high', label: 'High' },
    ],
  },
  'priority',
  'low',
);

// Generates:
// <label for="adminValue_priority">Priority</label>
// <select id="adminValue_priority" class="form-select">
//   <option value="">Select priority</option>
//   <option value="low" selected>Low</option>
//   <option value="high">High</option>
// </select>
```

---

## API Endpoints

### Feature Templates

#### GET `/api/feature-templates`

Get all feature templates

**Response**:

```json
{
  "success": true,
  "features": [
    { "id": "create_contact", "name": "Create Contact", ... }
  ]
}
```

#### GET `/api/feature-templates/:id`

Get single feature template

**Response**:

```json
{
  "success": true,
  "feature": {
    "id": "create_contact",
    "name": "Create Contact",
    "fields": { ... }
  }
}
```

---

### Feature Mappings

#### GET `/api/integrations/:integrationId/feature-mappings`

Get all feature mappings for an integration

**Response**:

```json
{
  "success": true,
  "featureMappings": [
    { "id": "mapping_123", "featureTemplateId": "create_contact", ... }
  ]
}
```

#### POST `/api/integrations/:integrationId/feature-mappings`

Create new feature mapping

**Request Body**:

```json
{
  "featureTemplateId": "create_contact",
  "featureTemplateName": "Create Contact",
  "fieldMappings": { ... },
  "apiConfig": { ... },
  "extraFields": [ ... ]
}
```

**Response**:

```json
{
  "success": true,
  "mapping": { "id": "mapping_123", ... }
}
```

#### PUT `/api/integrations/:integrationId/feature-mappings/:mappingId`

Update existing feature mapping

**Request Body**: Same as POST

**Response**:

```json
{
  "success": true,
  "mapping": { "id": "mapping_123", ... }
}
```

#### DELETE `/api/integrations/:integrationId/feature-mappings/:mappingId`

Delete feature mapping

**Response**:

```json
{
  "success": true,
  "message": "Feature mapping deleted"
}
```

---

## Best Practices

### Template Design

✅ **DO**:

- Keep templates generic and reusable
- Use clear, descriptive field names
- Provide helpful descriptions
- Choose appropriate field types
- Set sensible defaults

❌ **DON'T**:

- Make integration-specific templates
- Use vague field names
- Skip descriptions
- Overuse conditional fields
- Ignore field type implications

---

### Mapping Configuration

✅ **DO**:

- Enable only needed fields
- Set admin values for Admin-filled fields
- Add meaningful handler function names
- Use extra fields for integration specifics
- Test the mapping after creation

❌ **DON'T**:

- Enable all fields by default
- Leave required Admin fields empty
- Use generic handler names like "handler1"
- Duplicate template fields in extra fields
- Skip validation

---

### Handler Functions

✅ **DO**:

- Use descriptive function names
- Handle errors gracefully
- Return consistent types
- Document function purpose
- Keep handlers simple and focused

❌ **DON'T**:

- Use abbreviations in names
- Throw unhandled errors
- Mix return types
- Create complex multi-purpose handlers
- Assume data format

---

### fillBy Decision

✅ **Use Admin when**:

- Same value for all users
- Set once, rarely changes
- Configuration or settings
- API keys or credentials
- Business rules

✅ **Use User when**:

- Different per execution
- User provides at runtime
- Dynamic or contextual data
- Per-instance values
- Workflow parameters

---

## Troubleshooting

### Mapping not showing in detail page

**Possible Causes**:

- Mapping status is "inactive"
- Wrong integration ID
- File not saved properly
- JSON syntax error

**Solution**:

```bash
# Check features.schema.json
cat integrations/providers/{id}/features.schema.json

# Verify mapping exists and status is "active"
```

---

### Admin value not displaying

**Possible Causes**:

- Field fillBy is "User"
- adminValue not set in mapping
- Field is disabled

**Solution**:

- Verify fillBy: "Admin" in template
- Check adminValue exists in fieldMappings
- Ensure enabled: true

---

### Extra field not appearing

**Possible Causes**:

- Missing required properties
- Invalid field type
- Order conflict

**Solution**:

- Validate all required properties present
- Check field type enum values
- Verify unique order numbers

---

### Handler not executing

**Possible Causes**:

- Function doesn't exist
- Function name typo
- Handler throws error

**Solution**:

- Verify function is defined
- Check exact spelling
- Add try-catch in handler
- Check console for errors

---

## Future Enhancements

### Planned Features

- [ ] Handler library with pre-built functions
- [ ] Visual handler builder
- [ ] Field override system
- [ ] Conditional expression builder
- [ ] Dynamic field API integration
- [ ] Mapping templates
- [ ] Bulk mapping operations
- [ ] Mapping version history
- [ ] Testing interface for mappings
- [ ] Handler debugging tools

---

## Summary

The Feature-Integration Mapping System provides:

✅ **Flexibility**: Reusable templates, custom configurations
✅ **Control**: Admin vs User fillBy modes
✅ **Extensibility**: Custom handlers, extra fields
✅ **Usability**: Wizard interface, professional tables
✅ **Maintainability**: JSON storage, versioning, clear structure

This system enables scalable, maintainable integration configurations that adapt to each integration's unique requirements while maintaining consistency through shared templates.
