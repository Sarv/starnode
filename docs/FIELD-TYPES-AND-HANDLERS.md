# Field Types and Custom Handlers Guide

**Last Updated:** 2025-11-26
**Purpose:** Comprehensive guide to field types, fillBy property, and custom handlers

---

## Table of Contents

1. [Field Type System](#field-type-system)
2. [fillBy Property Deep Dive](#fillby-property-deep-dive)
3. [Custom Handlers](#custom-handlers)
4. [Real-World Examples](#real-world-examples)
5. [Handler Library](#handler-library)
6. [Best Practices](#best-practices)

---

## Field Type System

### Overview

Four field types control **behavior and data sourcing**:

| Type | Purpose | Data Source | Visibility |
|------|---------|-------------|------------|
| `static` | Fixed configuration | Manual input | Always |
| `dynamic` | Runtime data | API/Computed | Always |
| `conditional` | Context-dependent | Manual input | Conditional |
| `api` | API configuration | Manual/System | Always |

---

### 1. Static Fields

**Definition**: Fixed configuration fields with values that don't change at runtime

#### Characteristics
- ✅ Value set once during setup
- ✅ No dynamic fetching
- ✅ Can be Admin or User filled
- ✅ Most common field type

#### Configuration
```json
{
  "type": "static",
  "label": "Default Priority",
  "fieldType": "string",
  "htmlType": "select",
  "fillBy": "Admin",
  "possibleValues": ["low", "medium", "high", "critical"]
}
```

#### Use Cases

**Configuration Settings**:
```json
{
  "type": "static",
  "label": "Email Format",
  "htmlType": "radio",
  "possibleValues": ["html", "plain"],
  "fillBy": "Admin"
}
```

**User Input** :
```json
{
  "type": "static",
  "label": "Contact Email",
  "htmlType": "email",
  "fillBy": "User"
}
```

**Static Tags**:
```json
{
  "type": "static",
  "label": "Contact Tags",
  "htmlType": "checkbox",
  "possibleValues": ["vip", "lead", "customer", "partner"],
  "fillBy": "Admin"
}
```

#### When to Use
- ✅ Dropdown selections
- ✅ Checkboxes/radio buttons
- ✅ Text inputs that don't change
- ✅ Configuration options
- ✅ Static categories or tags

---

### 2. Dynamic Fields

**Definition**: Fields with values fetched at runtime from APIs or computed dynamically

#### Characteristics
- ✅ Value determined at runtime
- ✅ Often populated via API calls
- ✅ Usually User-filled (at runtime)
- ✅ May depend on other fields

#### Configuration
```json
{
  "type": "dynamic",
  "label": "Project",
  "fieldType": "string",
  "htmlType": "select",
  "fillBy": "User",
  "description": "Fetched from your account"
}
```

#### Implementation Pattern

**Frontend**:
```javascript
// When field type is "dynamic", fetch options
if (field.type === 'dynamic' && field.htmlType === 'select') {
    const options = await fetchDynamicOptions(field.fieldKey, integrationId);
    populateSelectField(field.fieldKey, options);
}

async function fetchDynamicOptions(fieldKey, integrationId) {
    const response = await fetch(
        `/api/integrations/${integrationId}/dynamic-fields/${fieldKey}`
    );
    return response.json();
}
```

**Backend**:
```javascript
// API endpoint for dynamic field options
app.get('/api/integrations/:id/dynamic-fields/:fieldKey', async (req, res) => {
    const { id, fieldKey } = req.params;

    // Example: Fetch projects from external API
    if (fieldKey === 'project_id') {
        const projects = await externalAPI.getProjects(id);
        return res.json({
            success: true,
            options: projects.map(p => ({
                id: p.id,
                label: p.name
            }))
        });
    }
});
```

#### Use Cases

**Dropdown from API**:
```json
{
  "type": "dynamic",
  "label": "Salesforce Object",
  "htmlType": "select",
  "fillBy": "User",
  "description": "Fetched from your Salesforce account"
}
```

**Computed Values**:
```json
{
  "type": "dynamic",
  "label": "Full Name",
  "htmlType": "text",
  "fillBy": "User",
  "description": "Computed from first and last name"
}
```

**User List**:
```json
{
  "type": "dynamic",
  "label": "Assign To",
  "htmlType": "select",
  "fillBy": "User",
  "description": "List of users in your organization"
}
```

#### When to Use
- ✅ Dropdowns populated from API
- ✅ Lists that change frequently
- ✅ User/team/project selections
- ✅ Computed or derived values
- ✅ Real-time data

---

### 3. Conditional Fields

**Definition**: Fields that appear only when specific conditions are met

#### Characteristics
- ✅ Visibility controlled by expression
- ✅ Expression evaluated at runtime
- ✅ Can reference other field values
- ✅ Supports logical operators

#### Configuration
```json
{
  "type": "conditional",
  "label": "Webhook URL",
  "fieldType": "url",
  "htmlType": "url",
  "fillBy": "Admin",
  "conditionalExpression": "{{notification_enabled}}==true"
}
```

#### Expression Syntax

**Operators**:
- `==` - Equals
- `!=` - Not equals
- `and` - Logical AND
- `or` - Logical OR
- `{{field_key}}` - Reference to field value
- `'value'` - String literal
- `true`, `false` - Boolean literals

**Examples**:

**Simple Condition**:
```javascript
"{{priority}}=='high'"
// Show field only when priority is "high"
```

**Multiple Conditions**:
```javascript
"{{notification_enabled}}==true and {{priority}}!='low'"
// Show field when notifications are enabled AND priority is not low
```

**OR Logic**:
```javascript
"{{type}}=='vip' or {{type}}=='premium'"
// Show field when type is either vip or premium
```

**Complex Expression**:
```javascript
"({{send_email}}==true or {{send_sms}}==true) and {{contact_exists}}==true"
// Show field when either email or SMS is enabled AND contact exists
```

#### Implementation

**Frontend Evaluation**:
```javascript
function evaluateCondition(expression, fieldValues) {
    let evaluated = expression;

    // Replace field references with actual values
    for (const [key, value] of Object.entries(fieldValues)) {
        const placeholder = `{{${key}}}`;
        evaluated = evaluated.replaceAll(placeholder, JSON.stringify(value));
    }

    // Evaluate the expression
    try {
        return eval(evaluated);
    } catch (error) {
        console.error('Condition evaluation failed:', error);
        return false;
    }
}

// Usage
const showField = evaluateCondition(
    "{{priority}}=='high' and {{notify}}==true",
    { priority: 'high', notify: true }
);
// Returns: true
```

**Dynamic Display**:
```javascript
function updateFieldVisibility() {
    const conditionalFields = fields.filter(f => f.type === 'conditional');

    conditionalFields.forEach(field => {
        const shouldShow = evaluateCondition(
            field.conditionalExpression,
            getCurrentFieldValues()
        );

        const fieldElement = document.getElementById(`field_${field.fieldKey}`);
        fieldElement.style.display = shouldShow ? 'block' : 'none';
    });
}

// Call on any field value change
document.addEventListener('change', updateFieldVisibility);
```

#### Use Cases

**Advanced Settings**:
```json
{
  "type": "conditional",
  "label": "Advanced Options",
  "htmlType": "textarea",
  "fillBy": "Admin",
  "conditionalExpression": "{{enable_advanced}}==true"
}
```

**Dependent Fields**:
```json
{
  "type": "conditional",
  "label": "Custom Domain",
  "htmlType": "url",
  "fillBy": "Admin",
  "conditionalExpression": "{{email_provider}}=='custom'"
}
```

**Role-Based Fields**:
```json
{
  "type": "conditional",
  "label": "Admin Notes",
  "htmlType": "textarea",
  "fillBy": "Admin",
  "conditionalExpression": "{{user_role}}=='admin' or {{user_role}}=='manager'"
}
```

#### When to Use
- ✅ Progressive disclosure (show more options)
- ✅ Dependent fields
- ✅ Role-based fields
- ✅ Context-sensitive configuration
- ✅ Reducing UI complexity

---

### 4. API Fields

**Definition**: Fields requiring API endpoint configuration or external service integration

#### Characteristics
- ✅ Usually Admin-filled
- ✅ Triggers special UI (API Settings button)
- ✅ Stores API configuration
- ✅ May require authentication

#### Configuration
```json
{
  "type": "api",
  "label": "Webhook Endpoint",
  "fieldType": "string",
  "htmlType": "text",
  "fillBy": "Admin",
  "description": "Configure webhook URL and authentication"
}
```

#### UI Behavior

**Instead of regular input, shows**:
```html
<button class="api-settings-btn" onclick="showApiSettings('field_key')">
    <svg>...</svg>
    API Settings
</button>
```

**Clicking button opens panel with**:
- Field details
- API endpoint configuration
- Authentication settings
- Headers and parameters
- Testing interface

#### Implementation

**Check for API Type**:
```javascript
const isApiType = field.type === 'api';

if (isApiType) {
    // Show API Settings button
    html += `
        <button class="api-settings-btn" onclick="showApiSettings('${fieldKey}')">
            API Settings
        </button>
    `;
} else {
    // Show regular input
    html += generateInput(field);
}
```

**API Settings Panel**:
```javascript
function showApiSettings(fieldKey) {
    // Get field data
    const field = getFieldData(fieldKey);

    // Update right panel
    const panel = document.getElementById('apiConfigContent');
    panel.innerHTML = `
        <h5>${field.label}</h5>
        <div class="api-config-row">
            <label>Endpoint URL</label>
            <input type="url" value="${field.apiEndpoint || ''}">
        </div>
        <div class="api-config-row">
            <label>Method</label>
            <select>
                <option>GET</option>
                <option>POST</option>
                <option>PUT</option>
            </select>
        </div>
        <div class="api-config-row">
            <label>Authentication</label>
            <select>
                <option>None</option>
                <option>API Key</option>
                <option>Bearer Token</option>
            </select>
        </div>
        <button onclick="testApiEndpoint()">Test Connection</button>
    `;
}
```

#### Use Cases

**Webhook Configuration**:
```json
{
  "type": "api",
  "label": "Webhook URL",
  "htmlType": "url",
  "fillBy": "Admin",
  "description": "Webhook for real-time notifications"
}
```

**External API Integration**:
```json
{
  "type": "api",
  "label": "Third-party API",
  "htmlType": "text",
  "fillBy": "Admin",
  "description": "Configure external API connection"
}
```

**Custom Endpoint**:
```json
{
  "type": "api",
  "label": "Custom Endpoint",
  "htmlType": "text",
  "fillBy": "Admin",
  "description": "Override default API endpoint"
}
```

#### When to Use
- ✅ Webhook configurations
- ✅ External API connections
- ✅ Custom endpoints
- ✅ Service integrations
- ✅ Advanced API settings

---

## fillBy Property Deep Dive

### Admin Fill Mode

**Definition**: Administrator configures values during integration setup

#### When Values are Set
- During feature mapping creation (wizard)
- In Step 2 (template fields) or Step 4 (extra fields)
- Values saved to `adminValue` in mapping

#### Storage
```json
{
  "fieldMappings": {
    "default_priority": {
      "enabled": true,
      "customHandlers": null,
      "adminValue": "high"  // ← Stored here
    }
  }
}
```

#### UI Flow

**In Wizard**:
```
Admin opens field configuration
  ↓
Sees input field for the value
  ↓
Enters: "high"
  ↓
Saves mapping
  ↓
Value stored in adminValue
```

**In Detail View**:
```
Field: Default Priority
Value: [high]  ← Displays adminValue
```

**At Runtime**:
```
User triggers action
  ↓
System uses adminValue
  ↓
No user input needed
```

#### Code Example

**Wizard - Show Input**:
```javascript
if (field.fillBy === 'Admin') {
    // Show input field
    const input = generateValueInput(field, fieldKey, currentValue);
    container.innerHTML = input;
    container.style.display = 'block';
} else {
    // Hide input
    container.style.display = 'none';
}
```

**Save - Store Value**:
```javascript
if (field.fillBy === 'Admin') {
    const value = getInputValue(fieldKey);
    mapping.fieldMappings[fieldKey].adminValue = value;
}
```

**Runtime - Use Value**:
```javascript
function getFieldValue(fieldKey) {
    const mapping = getCurrentMapping();
    const fieldMapping = mapping.fieldMappings[fieldKey];

    if (field.fillBy === 'Admin') {
        return fieldMapping.adminValue;  // Use admin value
    } else {
        return getUserInput(fieldKey);  // Ask user
    }
}
```

#### Best For
- ✅ API keys and secrets
- ✅ Default configurations
- ✅ Business rules
- ✅ Integration-wide settings
- ✅ Fixed values same for all users

---

### User Fill Mode

**Definition**: End user provides values at runtime during action execution

#### When Values are Set
- At runtime when user triggers action
- System prompts user for input
- Values not stored in mapping

#### Storage
```json
{
  "fieldMappings": {
    "contact_email": {
      "enabled": true,
      "customHandlers": null
      // No adminValue property
    }
  }
}
```

#### UI Flow

**In Wizard**:
```
Admin configures field
  ↓
No value input shown
  ↓
Displays "To be filled by user"
```

**In Detail View**:
```
Field: Contact Email
Value: To be filled by user
```

**At Runtime**:
```
User triggers "Create Contact"
  ↓
System prompts: "Enter contact email"
  ↓
User inputs: "john@example.com"
  ↓
Action executes with user value
```

#### Code Example

**Wizard - No Input**:
```javascript
if (field.fillBy === 'User') {
    // Just show message
    container.innerHTML = '<span class="info">To be filled by user</span>';
}
```

**Runtime - Prompt User**:
```javascript
async function executeAction(actionId) {
    const mapping = getActionMapping(actionId);
    const values = {};

    // Collect values for User-filled fields
    for (const [fieldKey, field] of Object.entries(mapping.fields)) {
        if (field.fillBy === 'User') {
            values[fieldKey] = await promptUser(field.label, field.htmlType);
        } else {
            values[fieldKey] = field.adminValue;
        }
    }

    // Execute with collected values
    await callAPI(mapping.apiConfig, values);
}
```

#### Best For
- ✅ User-specific data (names, emails)
- ✅ Per-execution values (which project)
- ✅ Dynamic user choices
- ✅ Workflow parameters
- ✅ Context-dependent data

---

### Decision Matrix

| Scenario | fillBy | Why |
|----------|--------|-----|
| API Key for integration | Admin | Same key for all users |
| Default email signature | Admin | Standard signature |
| Contact's email address | User | Different per contact |
| Which project to use | User | User decides each time |
| Webhook URL | Admin | Fixed endpoint |
| Email subject line | User | Custom per email |
| Priority levels | Admin | Business rule configuration |
| Task description | User | Varies per task |
| Integration timeout | Admin | Technical setting |
| File to upload | User | Different each execution |

---

## Custom Handlers

### Dynamic Handler Configuration System

**New Feature (2025-11-26)**: Custom handler types are now centrally configured in `panel-config.json`, eliminating the need to update code when adding new handler types.

#### Configuration Location

All handler types are defined in:
```
/panel-config.json → "customHandlers" section
```

#### Handler Type Definition

Each handler type is defined with metadata:

```json
{
  "customHandlers": {
    "handlerTypeId": {
      "id": "handlerTypeId",
      "label": "Handler Type Label",
      "description": "What this handler does",
      "placeholder": "e.g., functionName",
      "icon": "🔧",
      "helpText": "Detailed explanation for users",
      "category": "transformation|validation|submission|formatting|parsing|conditional",
      "order": 1
    }
  }
}
```

#### Available Handler Types

The system now supports **6 handler types** (previously 3):

| Order | Handler Type | Icon | Purpose | Category |
|-------|-------------|------|---------|----------|
| 1 | Value Handler | ↓ | Transform or normalize field values | transformation |
| 2 | Validation Handler | ✓ | Validate field values | validation |
| 3 | Submit Handler | ⚙ | Process field values before API submission | submission |
| 4 | Format Handler | 📝 | Format field values for display | formatting |
| 5 | Parse Handler | 🔍 | Parse incoming data before populating fields | parsing |
| 6 | Conditional Handler | 🔀 | Determine field visibility/enablement | conditional |

#### Adding New Handler Types

To add a new handler type, simply add it to `panel-config.json`:

```json
{
  "customHandlers": {
    "myNewHandler": {
      "id": "myNewHandler",
      "label": "My New Handler",
      "description": "Description of what it does",
      "placeholder": "e.g., myHandlerFunction",
      "icon": "✨",
      "helpText": "How users should use this handler",
      "category": "custom",
      "order": 7
    }
  }
}
```

**No code changes required!** The UI automatically updates to display the new handler type.

#### API Endpoint

Handler configuration is accessible via:
```
GET /api/panel-config/custom-handlers
```

Returns:
```json
{
  "valueHandler": { ... },
  "validationHandler": { ... },
  "submitHandler": { ... },
  "formatHandler": { ... },
  "parseHandler": { ... },
  "conditionalHandler": { ... }
}
```

#### UI Rendering

Handlers are dynamically rendered in:
- **Feature-Integration Mapping Wizard**: Field configuration modal
- **Extra Fields Modal**: Handler input section
- **Integration Detail Page**: Handler columns in tables

The system automatically:
- ✅ Sorts handlers by `order` property
- ✅ Displays icons and labels
- ✅ Shows help text and placeholders
- ✅ Validates handler function names
- ✅ Updates table headers dynamically

---

### Handler Execution Flow

```
Field Value Entered
  ↓
┌─────────────────────┐
│  Value Handler      │ ← Transform value
│  (optional)         │
└──────┬──────────────┘
       ↓
┌─────────────────────┐
│  Validation Handler │ ← Validate value
│  (optional)         │ → Return true or error message
└──────┬──────────────┘
       ↓
┌─────────────────────┐
│  Format Handler     │ ← Format for display
│  (optional)         │
└──────┬──────────────┘
       ↓
┌─────────────────────┐
│  Parse Handler      │ ← Parse incoming data
│  (optional)         │
└──────┬──────────────┘
       ↓
┌─────────────────────┐
│  Conditional Handler│ ← Check visibility
│  (optional)         │
└──────┬──────────────┘
       ↓
┌─────────────────────┐
│  Submit Handler     │ ← Process for API
│  (optional)         │
└──────┬──────────────┘
       ↓
    API Call
```

### Value Handler

**Purpose**: Transform or normalize field values

#### Function Signature
```javascript
function handlerName(value, field, allFieldValues) {
    // Transform value
    return transformedValue;
}
```

#### Parameters
- `value` - The current field value
- `field` - Field configuration object
- `allFieldValues` - Object with all field values (for cross-field logic)

#### Examples

**Capitalize Text**:
```javascript
function capitalizeFirstName(value) {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
```

**Format Phone Number**:
```javascript
function formatPhoneNumber(value) {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');

    // Format as (XXX) XXX-XXXX
    if (digits.length === 10) {
        return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
    }

    return value;
}
```

**Parse JSON**:
```javascript
function parseJSONString(value) {
    try {
        return JSON.parse(value);
    } catch (error) {
        console.error('Invalid JSON:', error);
        return value;
    }
}
```

**Trim Whitespace**:
```javascript
function trimAndNormalize(value) {
    return value.trim().replace(/\s+/g, ' ');
}
```

**Convert to Lowercase**:
```javascript
function toLowerCase(value) {
    return value.toLowerCase();
}
```

**Extract Domain from Email**:
```javascript
function extractEmailDomain(value) {
    const match = value.match(/@(.+)$/);
    return match ? match[1] : '';
}
```

**Build Full Name**:
```javascript
function buildFullName(value, field, allFieldValues) {
    const firstName = allFieldValues.first_name || '';
    const lastName = allFieldValues.last_name || '';
    return `${firstName} ${lastName}`.trim();
}
```

---

### Validation Handler

**Purpose**: Validate field values and return errors

#### Function Signature
```javascript
function handlerName(value, field, allFieldValues) {
    // Validate value
    // Return true if valid
    // Return error message string if invalid
    return true | "Error message";
}
```

#### Return Values
- `true` - Validation passed
- `string` - Error message (validation failed)

#### Examples

**Email Validation**:
```javascript
function validateEmailFormat(value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(value)) {
        return "Please enter a valid email address";
    }

    return true;
}
```

**Phone Number Validation**:
```javascript
function validatePhoneNumber(value) {
    const digits = value.replace(/\D/g, '');

    if (digits.length !== 10) {
        return "Phone number must be 10 digits";
    }

    return true;
}
```

**URL Validation**:
```javascript
function validateURL(value) {
    try {
        new URL(value);
        return true;
    } catch (error) {
        return "Please enter a valid URL (include http:// or https://)";
    }
}
```

**Length Validation**:
```javascript
function validateLength(value, field) {
    const minLength = field.minLength || 0;
    const maxLength = field.maxLength || Infinity;

    if (value.length < minLength) {
        return `Minimum length is ${minLength} characters`;
    }

    if (value.length > maxLength) {
        return `Maximum length is ${maxLength} characters`;
    }

    return true;
}
```

**Number Range Validation**:
```javascript
function validateNumberRange(value, field) {
    const num = parseFloat(value);
    const min = field.min !== undefined ? field.min : -Infinity;
    const max = field.max !== undefined ? field.max : Infinity;

    if (isNaN(num)) {
        return "Please enter a valid number";
    }

    if (num < min || num > max) {
        return `Value must be between ${min} and ${max}`;
    }

    return true;
}
```

**Cross-Field Validation**:
```javascript
function validatePasswordMatch(value, field, allFieldValues) {
    const password = allFieldValues.password;

    if (value !== password) {
        return "Passwords do not match";
    }

    return true;
}
```

**Async API Validation**:
```javascript
async function validateEmailExists(value) {
    try {
        const response = await fetch(`/api/validate-email?email=${value}`);
        const result = await response.json();

        if (!result.exists) {
            return "Email address not found in system";
        }

        return true;
    } catch (error) {
        return "Unable to validate email";
    }
}
```

---

### Submit Handler

**Purpose**: Process field before API submission

#### Function Signature
```javascript
function handlerName(value, field, allFieldValues, requestBody) {
    // Process value
    // Optionally modify requestBody
    return processedValue | requestBody;
}
```

#### Parameters
- `value` - Field value (after transformation and validation)
- `field` - Field configuration
- `allFieldValues` - All field values
- `requestBody` - Current request body object (can be modified)

#### Examples

**Add to Request Body**:
```javascript
function addToRequestBody(value, field, allFieldValues, requestBody) {
    requestBody[field.fieldKey] = value;
    return requestBody;
}
```

**Nest in Object**:
```javascript
function nestInAttributes(value, field) {
    return {
        attributes: {
            [field.fieldKey]: value
        }
    };
}
```

**Encrypt Value**:
```javascript
function encryptSensitiveData(value) {
    const encrypted = encrypt(value, process.env.ENCRYPTION_KEY);
    return encrypted;
}
```

**Convert to API Format**:
```javascript
function convertToSalesforceFormat(value, field, allFieldValues) {
    return {
        sobjectType: 'Contact',
        fields: {
            [field.fieldKey]: value
        }
    };
}
```

**Build Complex Structure**:
```javascript
function buildEmailPayload(value, field, allFieldValues) {
    return {
        to: value,
        from: allFieldValues.sender_email,
        subject: allFieldValues.subject,
        body: {
            type: 'html',
            content: allFieldValues.message
        },
        metadata: {
            source: 'integration',
            timestamp: new Date().toISOString()
        }
    };
}
```

**Add Metadata**:
```javascript
function addMetadata(value, field, allFieldValues, requestBody) {
    requestBody.metadata = {
        ...requestBody.metadata,
        integration_field: field.fieldKey,
        processed_at: new Date().toISOString(),
        version: '1.0'
    };

    requestBody[field.fieldKey] = value;
    return requestBody;
}
```

---

### Format Handler

**Purpose**: Format field values for display purposes

#### Function Signature
```javascript
function handlerName(value, field, allFieldValues) {
    // Format value for display
    return formattedValue;
}
```

#### Parameters
- `value` - The field value to format
- `field` - Field configuration object
- `allFieldValues` - Object with all field values

#### Examples

**Format Currency**:
```javascript
function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(value);
}
```

**Format Date**:
```javascript
function formatDate(value) {
    const date = new Date(value);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}
```

**Format Phone Number**:
```javascript
function formatPhoneDisplay(value) {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 10) {
        return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
    }
    return value;
}
```

**Format File Size**:
```javascript
function formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}
```

---

### Parse Handler

**Purpose**: Parse incoming data before populating fields

#### Function Signature
```javascript
function handlerName(rawData, field, context) {
    // Parse raw data
    return parsedValue;
}
```

#### Parameters
- `rawData` - Raw data received from API or external source
- `field` - Field configuration object
- `context` - Additional context (response headers, metadata, etc.)

#### Examples

**Parse JSON**:
```javascript
function parseJSON(rawData) {
    try {
        return JSON.parse(rawData);
    } catch (error) {
        console.error('Failed to parse JSON:', error);
        return null;
    }
}
```

**Parse XML**:
```javascript
function parseXML(rawData) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(rawData, 'text/xml');
    return xmlDoc;
}
```

**Parse CSV**:
```javascript
function parseCSV(rawData) {
    const lines = rawData.split('\n');
    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
        const values = line.split(',');
        return headers.reduce((obj, header, index) => {
            obj[header.trim()] = values[index]?.trim();
            return obj;
        }, {});
    });
}
```

**Extract from Nested Object**:
```javascript
function extractFromNested(rawData, field) {
    // Extract data.user.profile.email from nested object
    const path = field.dataPath || ''; // e.g., "data.user.profile.email"
    return path.split('.').reduce((obj, key) => obj?.[key], rawData);
}
```

**Parse Date String**:
```javascript
function parseDateString(rawData) {
    // Parse various date formats into ISO string
    const date = new Date(rawData);
    return date.toISOString();
}
```

---

### Conditional Handler

**Purpose**: Determine if field should be shown/enabled based on conditions

#### Function Signature
```javascript
function handlerName(field, allFieldValues, userContext) {
    // Evaluate condition
    return true | false; // true = show, false = hide
}
```

#### Parameters
- `field` - Field configuration object
- `allFieldValues` - Current values of all fields
- `userContext` - User information (role, permissions, etc.)

#### Examples

**Show if Premium**:
```javascript
function showIfPremium(field, allFieldValues, userContext) {
    return userContext.subscriptionTier === 'premium' ||
           userContext.subscriptionTier === 'enterprise';
}
```

**Enable if Admin**:
```javascript
function enableIfAdmin(field, allFieldValues, userContext) {
    return userContext.role === 'admin' || userContext.role === 'superadmin';
}
```

**Show Based on Field Value**:
```javascript
function showIfNotificationEnabled(field, allFieldValues) {
    return allFieldValues.enable_notifications === true;
}
```

**Complex Conditional Logic**:
```javascript
function showAdvancedSettings(field, allFieldValues, userContext) {
    // Show if user is admin AND advanced mode is enabled
    const isAdmin = userContext.role === 'admin';
    const advancedMode = allFieldValues.advanced_mode === true;
    const hasPermission = userContext.permissions.includes('advanced_settings');

    return isAdmin && advancedMode && hasPermission;
}
```

**Show Based on Integration Type**:
```javascript
function showIfIntegrationType(field, allFieldValues) {
    const requiredTypes = field.requiredIntegrationTypes || [];
    const currentType = allFieldValues.integration_type;
    return requiredTypes.includes(currentType);
}
```

---

## Real-World Examples

### Example 1: Create Contact in Salesforce

**Feature Template**:
```json
{
  "id": "create_contact",
  "name": "Create Contact",
  "fields": {
    "first_name": {
      "type": "static",
      "fillBy": "User",
      "htmlType": "text"
    },
    "last_name": {
      "type": "static",
      "fillBy": "User",
      "htmlType": "text"
    },
    "email": {
      "type": "static",
      "fillBy": "User",
      "htmlType": "email"
    },
    "object_type": {
      "type": "static",
      "fillBy": "Admin",
      "htmlType": "select",
      "possibleValues": ["Contact", "Lead"]
    }
  }
}
```

**Salesforce Mapping**:
```json
{
  "fieldMappings": {
    "first_name": {
      "enabled": true,
      "customHandlers": {
        "valueHandler": "capitalizeFirstName",
        "validationHandler": "validateMinLength",
        "submitHandler": "addToSalesforcePayload"
      }
    },
    "email": {
      "enabled": true,
      "customHandlers": {
        "validationHandler": "validateEmailFormat"
      }
    },
    "object_type": {
      "enabled": true,
      "adminValue": "Contact"
    }
  },
  "extraFields": [
    {
      "fieldKey": "account_id",
      "label": "Salesforce Account",
      "type": "dynamic",
      "fillBy": "User",
      "htmlType": "select"
    }
  ]
}
```

**Handler Functions**:
```javascript
function capitalizeFirstName(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function validateMinLength(value) {
    return value.length >= 2 ? true : "Name must be at least 2 characters";
}

function addToSalesforcePayload(value, field, allFieldValues, requestBody) {
    if (!requestBody.salesforce) {
        requestBody.salesforce = { fields: {} };
    }
    requestBody.salesforce.fields[field.fieldKey] = value;
    requestBody.salesforce.objectType = allFieldValues.object_type;
    return requestBody;
}
```

---

### Example 2: Send Email via SendGrid

**Feature Template**:
```json
{
  "id": "send_email",
  "name": "Send Email",
  "fields": {
    "to_email": {
      "type": "static",
      "fillBy": "User",
      "htmlType": "email"
    },
    "subject": {
      "type": "static",
      "fillBy": "User",
      "htmlType": "text"
    },
    "body": {
      "type": "static",
      "fillBy": "User",
      "htmlType": "textarea"
    },
    "from_email": {
      "type": "static",
      "fillBy": "Admin",
      "htmlType": "email"
    },
    "template_id": {
      "type": "conditional",
      "fillBy": "Admin",
      "htmlType": "select",
      "conditionalExpression": "{{use_template}}==true"
    }
  }
}
```

**SendGrid Mapping**:
```json
{
  "fieldMappings": {
    "to_email": {
      "enabled": true,
      "customHandlers": {
        "validationHandler": "validateEmail"
      }
    },
    "subject": {
      "enabled": true,
      "customHandlers": {
        "valueHandler": "trimWhitespace"
      }
    },
    "body": {
      "enabled": true,
      "customHandlers": {
        "valueHandler": "convertMarkdownToHTML",
        "submitHandler": "buildSendGridPayload"
      }
    },
    "from_email": {
      "enabled": true,
      "adminValue": "noreply@company.com"
    }
  }
}
```

---

## Handler Library

### String Handlers

```javascript
// Capitalize first letter
function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

// Title case
function titleCase(value) {
    return value.replace(/\w\S*/g, txt =>
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
}

// Trim whitespace
function trimWhitespace(value) {
    return value.trim();
}

// Remove special characters
function removeSpecialChars(value) {
    return value.replace(/[^a-zA-Z0-9\s]/g, '');
}

// Slugify
function slugify(value) {
    return value
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
```

### Number Handlers

```javascript
// Format currency
function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(value);
}

// Round to decimals
function roundToDecimals(value, decimals = 2) {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

// Parse number
function parseNumber(value) {
    const num = parseFloat(value.toString().replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? 0 : num;
}
```

### Date Handlers

```javascript
// Format date
function formatDate(value, format = 'YYYY-MM-DD') {
    const date = new Date(value);
    // Implement formatting logic
    return formattedDate;
}

// Get timestamp
function getTimestamp(value) {
    return new Date(value).getTime();
}

// Add days
function addDays(value, days) {
    const date = new Date(value);
    date.setDate(date.getDate() + days);
    return date.toISOString();
}
```

### Validation Handlers

```javascript
// Email validation
function isValidEmail(value) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(value) ? true : "Invalid email format";
}

// URL validation
function isValidURL(value) {
    try {
        new URL(value);
        return true;
    } catch {
        return "Invalid URL format";
    }
}

// Required field
function isRequired(value) {
    return value && value.toString().trim() !== ''
        ? true
        : "This field is required";
}

// Min length
function minLength(value, min = 1) {
    return value.length >= min
        ? true
        : `Minimum ${min} characters required`;
}
```

---

## Best Practices

### Field Type Selection

✅ **DO**:
- Use `static` for most fixed-value fields
- Use `dynamic` only when data truly changes
- Use `conditional` to simplify UI
- Use `api` for actual API configurations

❌ **DON'T**:
- Make everything dynamic (performance cost)
- Overuse conditional fields (complexity)
- Use wrong type for simplicity

---

### fillBy Decision

✅ **DO**:
- Ask: "Does this value change per execution?"
- Use Admin for configuration
- Use User for runtime data
- Document the decision

❌ **DON'T**:
- Default everything to Admin
- Make users fill config values
- Mix concerns (config vs data)

---

### Handler Development

✅ **DO**:
- Keep handlers simple and focused
- Use descriptive names
- Handle edge cases
- Return consistent types
- Add error handling
- Document complex logic

❌ **DON'T**:
- Create mega-handlers doing multiple things
- Use abbreviations in names
- Assume input format
- Throw unhandled errors
- Skip validation

---

### Handler Naming

✅ **Good Names**:
- `capitalizeFirstName`
- `validateEmailFormat`
- `formatPhoneNumber`
- `convertToSalesforcePayload`
- `encryptSensitiveData`

❌ **Bad Names**:
- `handler1`
- `process`
- `doStuff`
- `transform`
- `h1`

---

## Summary

This guide covered:

✅ **Field Types**: Static, Dynamic, Conditional, API
✅ **fillBy Property**: Admin vs User modes
✅ **Custom Handlers**: Value, Validation, Submit
✅ **Real Examples**: Practical implementations
✅ **Handler Library**: Reusable functions
✅ **Best Practices**: Decision frameworks

Use this guide to make informed decisions about field configurations and handler implementations in your feature mappings!
