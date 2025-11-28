# Panel Configuration Guide

## Overview

`panel-config.json` is a centralized configuration file that defines the structure, validation rules, and rendering properties for all form fields used in the integration management system. It serves as a **single source of truth** for field definitions, eliminating hardcoded field configurations scattered throughout the codebase.

## Purpose

The panel configuration system provides:

1. **Template-driven form generation** - Fields can be rendered dynamically based on configuration
2. **Centralized validation rules** - All validation logic is defined in one place
3. **Consistent field behavior** - Same configuration drives both frontend rendering and validation
4. **Easy maintenance** - Add, modify, or remove fields by editing JSON without touching code
5. **Type safety** - Clear separation between data types and HTML rendering types

## File Structure

The configuration file is organized into **sections**, where each section represents a step or category of fields:

```json
{
  "sectionName": {
    "fieldName": {
      // Field configuration properties
    }
  }
}
```

### Current Sections

- **`basicInfo`** - Fields for Step 1 (Basic Information)
- **`features`** - Fields for Step 3 (Features & Endpoints)
- **`rateLimits`** - Fields for Step 4 (Rate Limits configuration)
- **`additionalFields`** - Configuration for Extra Fields in Feature-Integration Mapping
- **`customHandlers`** - Configuration for Custom Handler Types (NEW)

## Field Configuration Properties

Each field in the configuration must follow this structure:

### Required Properties

#### `label` (string, required)
The display label shown to users in the UI.

```json
"label": "Integration Name"
```

**Rules:**
- Must be user-friendly and descriptive
- Should use title case
- Keep it concise (2-5 words recommended)

#### `description` (string, required)
Help text or instructions for the field. Provides additional context to users.

```json
"description": "The display name shown to users"
```

**Rules:**
- Should explain the purpose or expected input
- Can include examples or constraints
- Keep it under 100 characters for better UX

#### `dataType` (string, required)
Defines the data type for **validation purposes**. This is used by the backend/validators to ensure data integrity.

```json
"dataType": "string"
```

**Supported values:**
- `"string"` - Text data
- `"number"` - Numeric data (integer or float)
- `"url"` - Valid URL format
- `"email"` - Valid email format
- `"boolean"` - True/false values

**Rules:**
- Choose the appropriate type for validation
- This does NOT affect HTML rendering (use `htmlType` for that)

#### `htmlType` (string, required)
Defines how the field should be **rendered in HTML**. This strictly controls the UI element type.

```json
"htmlType": "text"
```

**Supported values:**
- `"text"` - Single-line text input (`<input type="text">`)
- `"textarea"` - Multi-line text input (`<textarea>`)
- `"number"` - Number input (`<input type="number">`)
- `"select"` - Dropdown menu (`<select>`)
- `"checkbox"` - Checkbox input (`<input type="checkbox">`)
- `"radio"` - Radio button (`<input type="radio">`)

**Rules:**
- Choose based on UI/UX requirements, not data type
- Example: A URL field should have `htmlType: "text"` (not "url") because HTML type="url" has browser-specific behavior

#### `required` (boolean, required)
Indicates whether the field must have a value.

```json
"required": true
```

**Rules:**
- Use `true` for mandatory fields
- Use `false` for optional fields
- If required, validation will fail when field is empty

### Optional Properties

#### `placeholder` (string, optional)
Placeholder text shown in empty input fields.

```json
"placeholder": "e.g., Salesforce"
```

**Rules:**
- Should provide an example value
- Use "e.g., ..." format for clarity
- Keep it short and relevant

#### `default` (any, optional)
Default value for the field when not provided by user.

```json
"default": "1.0.0"
```

**Rules:**
- Type should match `dataType`
- Used for optional fields with sensible defaults

#### `pattern` (string, optional)
Regular expression pattern for string validation.

```json
"pattern": "^[a-z0-9_-]+$"
```

**Rules:**
- Only applicable when `dataType: "string"`
- Must be a valid JavaScript regex pattern
- Used to enforce specific formats (e.g., lowercase, no spaces)

#### `minLength` (number, optional)
Minimum character length for string fields.

```json
"minLength": 3
```

**Rules:**
- Only applicable when `dataType: "string"`
- Must be a positive integer
- Validation fails if string length < minLength

#### `maxLength` (number, optional)
Maximum character length for string fields.

```json
"maxLength": 100
```

**Rules:**
- Only applicable when `dataType: "string"`
- Must be a positive integer
- Validation fails if string length > maxLength

#### `min` (number, optional)
Minimum value for numeric fields.

```json
"min": 1
```

**Rules:**
- Only applicable when `dataType: "number"`
- Can be any number (integer or float)
- Validation fails if value < min

#### `max` (number, optional)
Maximum value for numeric fields.

```json
"max": 10000
```

**Rules:**
- Only applicable when `dataType: "number"`
- Can be any number (integer or float)
- Validation fails if value > max

#### `options` (array, optional)
Available options for select/dropdown fields.

```json
"options": [
  { "value": "crm", "label": "CRM" },
  { "value": "payment", "label": "Payment" }
]
```

**Rules:**
- Only applicable when `htmlType: "select"`
- Each option must have `value` and `label`
- `value` is stored in data, `label` is shown to user

## dataType vs htmlType

This is a critical distinction in the configuration system:

### dataType
- **Purpose:** Validation and data integrity
- **Used by:** Backend validators, type checking
- **Example:** `"dataType": "url"` ensures the value is a valid URL

### htmlType
- **Purpose:** UI rendering and user interaction
- **Used by:** Frontend form generation
- **Example:** `"htmlType": "text"` renders a text input box

### Example Scenario

For a documentation URL field:

```json
"docsUrl": {
  "label": "Documentation URL",
  "description": "Link to API documentation",
  "dataType": "url",        // ← Validates as URL
  "htmlType": "text",       // ← Renders as text input
  "required": false,
  "placeholder": "https://docs.example.com"
}
```

**Why this combination?**
- `dataType: "url"` - Ensures the value is a valid URL using URL validation
- `htmlType: "text"` - Renders as a simple text input (not HTML5 type="url" which has browser-specific validation and behavior)

## Validation Flow

When a form is submitted:

1. **Data Collection:** Field values are collected from the form
2. **Config Loading:** The relevant section from `panel-config.json` is loaded
3. **Field Validation:** For each field:
   - Check `required` property
   - Validate against `dataType` rules
   - Apply `pattern`, `min`, `max`, etc. constraints
4. **Error Handling:** First validation error is shown to user
5. **Data Storage:** Valid data is stored and processed

## Adding New Sections

To add a new section (e.g., for a new wizard step):

```json
{
  "basicInfo": { ... },
  "features": { ... },
  "rateLimits": { ... },
  "newSection": {
    "fieldOne": {
      "label": "Field One",
      "description": "Description of field one",
      "dataType": "string",
      "htmlType": "text",
      "required": true
    },
    "fieldTwo": {
      "label": "Field Two",
      "description": "Description of field two",
      "dataType": "number",
      "htmlType": "number",
      "required": false,
      "default": 0
    }
  }
}
```

## Adding New Fields

To add a new field to an existing section:

```json
"sectionName": {
  "existingField": { ... },
  "newField": {
    "label": "New Field Label",           // Required: User-facing label
    "description": "What this field does", // Required: Help text
    "dataType": "string",                  // Required: Validation type
    "htmlType": "text",                    // Required: HTML element type
    "required": true,                      // Required: Is it mandatory?
    "placeholder": "e.g., example",        // Optional: Example value
    "pattern": "^[a-z]+$",                // Optional: Regex validation
    "default": "defaultValue"              // Optional: Default value
  }
}
```

## Validation Property Matrix

| Property | dataType | Required | Notes |
|----------|----------|----------|-------|
| `pattern` | `string` | No | Regex pattern for string matching |
| `minLength` | `string` | No | Minimum character length |
| `maxLength` | `string` | No | Maximum character length |
| `min` | `number` | No | Minimum numeric value |
| `max` | `number` | No | Maximum numeric value |
| `options` | any | No | Only with `htmlType: "select"` |

## Best Practices

### 1. Always Provide Label and Description
Every field must have both properties for clear UI and user guidance.

```json
// ✅ Good
"displayName": {
  "label": "Integration Name",
  "description": "The display name shown to users",
  ...
}

// ❌ Bad
"displayName": {
  "dataType": "string",
  ...
}
```

### 2. Choose Appropriate dataType
Use the most specific type for proper validation.

```json
// ✅ Good - URL validation will be applied
"iconUrl": {
  "dataType": "url",
  "htmlType": "text"
}

// ❌ Bad - No URL validation
"iconUrl": {
  "dataType": "string",
  "htmlType": "text"
}
```

### 3. Use Patterns for Format Enforcement
For fields requiring specific formats, use regex patterns.

```json
"id": {
  "label": "Unique Identifier",
  "description": "Lowercase, numbers, hyphens, and underscores only",
  "dataType": "string",
  "htmlType": "text",
  "required": true,
  "pattern": "^[a-z0-9_-]+$"  // ✅ Enforces format
}
```

### 4. Provide Helpful Placeholders
Use examples that show the expected format.

```json
// ✅ Good
"placeholder": "e.g., salesforce"

// ❌ Bad
"placeholder": "Enter value"
```

### 5. Set Sensible Defaults
For optional fields, provide defaults when appropriate.

```json
"version": {
  "label": "Version",
  "dataType": "string",
  "htmlType": "text",
  "required": false,
  "default": "1.0.0"  // ✅ Good default
}
```

### 6. Keep Sections Organized
Group related fields into logical sections.

```json
{
  "basicInfo": {
    // Basic integration details
  },
  "authSettings": {
    // Authentication configuration
  },
  "advanced": {
    // Advanced options
  }
}
```

## Integration with Validators

The `Validators` utility (`public/js/validators.js`) reads this configuration and applies rules automatically:

```javascript
// Load config
const panelConfig = await fetch('/api/panel-config').then(r => r.json());

// Collect form data
const formData = {
  displayName: "My Integration",
  id: "my-integration",
  category: "crm"
};

// Validate using config
const result = Validators.validateFields(formData, panelConfig.basicInfo);

if (!result.valid) {
  console.log(result.errors); // { displayName: ["..."], id: ["..."] }
}
```

## Error Messages

Validation errors are generated automatically based on field configuration:

- **Required:** `"{label} is required"`
- **Pattern:** `"{label} format is invalid. {description}"`
- **Min/Max:** `"{label} must be at least {min}"` or `"{label} must be at most {max}"`
- **Type:** `"{label} must be a valid {dataType}"`

Example:
```json
"id": {
  "label": "Unique Identifier",
  "pattern": "^[a-z0-9_-]+$",
  "required": true
}
```

Error: `"Unique Identifier is required"` or `"Unique Identifier format is invalid"`

## Extending the System

### Adding New dataTypes

To add a new data type (e.g., `date`, `json`):

1. Add validation function in `validators.js`:
```javascript
isDate(value) {
  return !isNaN(Date.parse(value));
}
```

2. Add case in `validateField()`:
```javascript
case 'date':
  if (!this.isDate(value)) {
    errors.push(`${label} must be a valid date`);
  }
  break;
```

3. Use in `panel-config.json`:
```json
"createdAt": {
  "dataType": "date",
  "htmlType": "text"
}
```

### Adding New htmlTypes

For new HTML elements (e.g., `file`, `color`):

1. Add to supported `htmlType` values in this documentation
2. Update form rendering logic to handle the new type
3. Use in `panel-config.json`:
```json
"logo": {
  "dataType": "string",
  "htmlType": "file"
}
```

## Troubleshooting

### Validation Not Working
- Ensure `dataType` is spelled correctly
- Check if validators.js is loaded
- Verify panel-config.json is valid JSON

### Field Not Rendering
- Ensure form rendering logic reads the config
- Check `htmlType` is a supported value
- Verify the section name matches

### Wrong Validation Applied
- Double-check `dataType` vs `htmlType`
- Ensure `pattern` is valid regex
- Verify `min`/`max` match data type

## Custom Handlers Section

**Added:** 2025-11-26
**Purpose:** Centralized configuration for custom handler types

The `customHandlers` section defines handler types that can be applied to fields for transformation, validation, and processing. This is a **special section** - unlike other sections, it doesn't define form fields but rather defines **handler type metadata**.

### Structure

```json
{
  "customHandlers": {
    "handlerTypeId": {
      "id": "handlerTypeId",
      "label": "Handler Type Label",
      "description": "What this handler does",
      "placeholder": "e.g., functionName",
      "icon": "🔧",
      "helpText": "Detailed explanation",
      "category": "transformation|validation|submission|formatting|parsing|conditional",
      "order": 1
    }
  }
}
```

### Handler Type Properties

#### `id` (string, required)
Unique identifier matching the key. Must be camelCase.

```json
"id": "valueHandler"
```

#### `label` (string, required)
Display name shown in UI.

```json
"label": "Value Handler"
```

#### `description` (string, required)
Brief explanation of handler purpose (for tooltips).

```json
"description": "Transform or normalize field values before processing"
```

#### `placeholder` (string, required)
Example function name shown in input field.

```json
"placeholder": "e.g., capitalizeFirstName, formatPhoneNumber"
```

#### `icon` (string, required)
Unicode icon displayed next to handler name.

```json
"icon": "↓"
```

**Common icons:**
- `↓` - Transformation/input
- `✓` - Validation/check
- `⚙` - Processing/submission
- `📝` - Formatting/display
- `🔍` - Parsing/extraction
- `🔀` - Conditional/branching

#### `helpText` (string, required)
Detailed explanation shown below input field.

```json
"helpText": "Function to transform field values (e.g., uppercase, trim spaces)"
```

#### `category` (string, required)
Handler category for organization.

```json
"category": "transformation"
```

**Supported categories:**
- `transformation` - Value transformation
- `validation` - Value validation
- `submission` - API submission processing
- `formatting` - Display formatting
- `parsing` - Data parsing
- `conditional` - Conditional logic

#### `order` (number, required)
Display order in UI (ascending). Determines column order in tables.

```json
"order": 1
```

### Default Handler Types

The system includes 6 built-in handler types:

```json
{
  "customHandlers": {
    "valueHandler": {
      "id": "valueHandler",
      "label": "Value Handler",
      "description": "Transform or normalize field values before processing",
      "placeholder": "e.g., capitalizeFirstName, formatPhoneNumber",
      "icon": "↓",
      "helpText": "Function to transform field values (e.g., uppercase, trim spaces)",
      "category": "transformation",
      "order": 1
    },
    "validationHandler": {
      "id": "validationHandler",
      "label": "Validation Handler",
      "description": "Validate field values and return error messages if invalid",
      "placeholder": "e.g., validateEmail, validatePhoneNumber",
      "icon": "✓",
      "helpText": "Function to validate field values (returns true or error message)",
      "category": "validation",
      "order": 2
    },
    "submitHandler": {
      "id": "submitHandler",
      "label": "Submit Handler",
      "description": "Process field values before API submission",
      "placeholder": "e.g., encryptData, base64Encode",
      "icon": "⚙",
      "helpText": "Function to process values before sending to API",
      "category": "submission",
      "order": 3
    },
    "formatHandler": {
      "id": "formatHandler",
      "label": "Format Handler",
      "description": "Format field values for display purposes",
      "placeholder": "e.g., formatCurrency, formatDate",
      "icon": "📝",
      "helpText": "Function to format values for display",
      "category": "formatting",
      "order": 4
    },
    "parseHandler": {
      "id": "parseHandler",
      "label": "Parse Handler",
      "description": "Parse incoming data before populating fields",
      "placeholder": "e.g., parseJSON, parseXML",
      "icon": "🔍",
      "helpText": "Function to parse data from API responses",
      "category": "parsing",
      "order": 5
    },
    "conditionalHandler": {
      "id": "conditionalHandler",
      "label": "Conditional Handler",
      "description": "Determine if field should be shown/enabled based on conditions",
      "placeholder": "e.g., showIfPremium, enableIfAdmin",
      "icon": "🔀",
      "helpText": "Function to evaluate field visibility/enablement",
      "category": "conditional",
      "order": 6
    }
  }
}
```

### API Access

Handler configuration is accessible via REST API:

**Endpoint:**
```
GET /api/panel-config/custom-handlers
```

**Response:**
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

### UI Integration

Handler types are automatically integrated into:

1. **Feature-Integration Mapping Wizard**
   - Field Configuration Modal (Step 2)
   - Extra Fields Modal (Step 4)

2. **Integration Detail Page**
   - Template Fields table columns
   - Extra Fields table columns

The system automatically:
- ✅ Renders input fields based on handler config
- ✅ Sorts handlers by `order` property
- ✅ Displays icons, labels, and help text
- ✅ Validates handler function names (alphanumeric + underscore only)
- ✅ Updates table headers dynamically

### Adding New Handler Types

To add a custom handler type:

1. **Add to panel-config.json:**
```json
{
  "customHandlers": {
    "myCustomHandler": {
      "id": "myCustomHandler",
      "label": "My Custom Handler",
      "description": "Does something custom",
      "placeholder": "e.g., myCustomFunction",
      "icon": "✨",
      "helpText": "Detailed instructions for using this handler",
      "category": "custom",
      "order": 7
    }
  }
}
```

2. **Restart the server** (handler config is loaded on startup)

3. **No code changes needed!** The UI automatically updates to show the new handler type in all relevant locations.

### Best Practices

✅ **DO:**
- Use clear, descriptive labels
- Provide helpful placeholders with examples
- Write comprehensive help text
- Choose appropriate icons that convey meaning
- Assign logical order values (gaps of 1 or 10)
- Keep handler IDs in camelCase

❌ **DON'T:**
- Use generic labels like "Handler 1"
- Leave placeholder or helpText empty
- Use random emojis that don't relate to function
- Reuse order numbers (causes unpredictable sorting)
- Use special characters in handler IDs

### Migration Notes

Prior to this feature (before 2025-11-26), handler types were hardcoded in JavaScript files. The old system had only 3 handlers: `valueHandler`, `validationHandler`, and `submitHandler`.

**Benefits of the new system:**
- ✅ No code changes to add/modify handler types
- ✅ Centralized configuration
- ✅ Consistent behavior across all pages
- ✅ Easy to extend with new handler types
- ✅ Self-documenting with metadata

---

## Summary

The `panel-config.json` system provides a powerful, maintainable way to manage form fields:

- ✅ Single source of truth for field definitions
- ✅ Automatic validation based on configuration
- ✅ Clear separation: `dataType` for validation, `htmlType` for rendering
- ✅ Easy to extend and maintain
- ✅ Consistent user experience across the application
- ✅ **NEW:** Dynamic custom handler configuration without code changes

When adding or modifying fields, always follow the property rules and best practices outlined in this guide.
