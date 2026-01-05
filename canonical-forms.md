# Canonical Forms Feature Documentation

## Overview

Canonical Forms provide a standardized way to define **scopes** (categories), **operations** (actions), and **variables** (data fields) that can be reused across different integrations. This enables consistent data mapping from various API responses to a unified structure.

---

## Data Structure

### Storage Location

- **File**: `canonical-scope-operation.json`

### Schema

```json
{
  "scopes": [
    {
      "id": "employee",
      "label": "Employee",
      "description": "Employee management operations",
      "operations": [
        {
          "id": "list_employees",
          "label": "List Employees",
          "description": "..."
        }
      ],
      "variables": [
        {
          "id": "unique_id",
          "label": "Unique ID",
          "description": "...",
          "fieldType": "string"
        }
      ]
    }
  ],
  "lastUpdated": "2025-12-26T00:00:00.000Z"
}
```

---

## API Endpoints

| Method | Endpoint                                     | Description                 |
| ------ | -------------------------------------------- | --------------------------- |
| GET    | `/api/canonical/scopes`                      | List all scopes             |
| POST   | `/api/canonical/scopes`                      | Create a new scope          |
| PUT    | `/api/canonical/scopes/:id`                  | Update a scope              |
| DELETE | `/api/canonical/scopes/:id`                  | Delete a scope              |
| GET    | `/api/canonical/scopes/:id/operations`       | List operations for a scope |
| POST   | `/api/canonical/scopes/:id/operations`       | Add operation to scope      |
| PUT    | `/api/canonical/scopes/:id/operations/:opId` | Update an operation         |
| DELETE | `/api/canonical/scopes/:id/operations/:opId` | Delete an operation         |
| GET    | `/api/canonical/scopes/:id/variables`        | List variables for a scope  |
| POST   | `/api/canonical/scopes/:id/variables`        | Add variable to scope       |
| PUT    | `/api/canonical/scopes/:id/variables/:varId` | Update a variable           |
| DELETE | `/api/canonical/scopes/:id/variables/:varId` | Delete a variable           |

---

## UI Components

### 1. Canonical Forms Page (`/canonical-forms`)

**Files:**

- `views/canonical-forms.ejs` - EJS template
- `public/css/canonical-forms.css` - Styles
- `public/js/canonical-forms.js` - JavaScript logic

**Layout:** 3-pane layout matching API Configuration style

- **Left Pane**: Scope list with add/delete
- **Middle Pane**: Tabs for Operations/Variables with item cards
- **Right Pane**: Editor form for selected item

### 2. Canonical Template Tab (API Configuration)

**Location:** Second pane in API Configuration page, next to "Response" tab

**Features:**

- **Scope Selector**: Dropdown populated from canonical scopes
- **Response Template**: Textarea for mapping API response to canonical variables
- **Available Variables**: Clickable chips to insert variables at cursor
- **Format Button**: Formats JSON while preserving canonical variables
- **Validate Button**: Validates canonical variables against their scopes

---

## Canonical Template Syntax

```
{{canonical.<scope>.<variable>}}
```

**Examples:**

- `{{canonical.employee.unique_id}}`
- `{{canonical.contacts.email}}`
- `{{canonical.tickets.status}}`

---

## Storage in API Configuration

Canonical templates are stored in `api.schema.json` under each API's `response` object:

```json
"response": {
  "successPath": "",
  "errorPath": "",
  "dataFormat": "json",
  "canonicalTemplate": {
    "scope": "employee",
    "rawTemplate": "{\n  \"emp_id\": \"{{canonical.employee.unique_id}}\",\n  \"dept\": \"{{canonical.employee.dept}}\"\n}",
    "processedTemplate": {
      "emp_id": "{{canonical.employee.unique_id}}",
      "dept": "{{canonical.employee.dept}}"
    },
    "responseFormat": "json"
  }
}
```

### Storage Format by Response Type

| Type | rawTemplate                       | processedTemplate                              |
| ---- | --------------------------------- | ---------------------------------------------- |
| JSON | Original JSON with canonical vars | Flattened dot-notation object                  |
| XML  | Original XML with canonical vars  | XPath-to-variable mapping (`@` for attributes) |
| Text | Line-based with canonical vars    | Array of line/pattern/variable objects         |

---

## Validation Logic

The `Validate` button checks each canonical variable against its **own scope** (not the dropdown):

```javascript
// {{canonical.employee.unique_id}} → looks up "employee" scope → checks "unique_id"
```

**Error Messages:**

- `(scope "xyz" not found)` - The scope doesn't exist
- `(variable "abc" not found in "xyz")` - Variable doesn't exist in that scope

---

## Files Modified/Created

### Created

| File                             | Purpose                                        |
| -------------------------------- | ---------------------------------------------- |
| `canonical-scope-operation.json` | Data storage for scopes, operations, variables |
| `views/canonical-forms.ejs`      | Canonical Forms page template                  |
| `public/css/canonical-forms.css` | Styles for Canonical Forms                     |
| `public/js/canonical-forms.js`   | JavaScript for Canonical Forms CRUD            |

### Modified

| File                               | Changes                                          |
| ---------------------------------- | ------------------------------------------------ |
| `server.js`                        | Added `/canonical-forms` route and API endpoints |
| `views/partials/sidebar.ejs`       | Added "Canonical Forms" navigation link          |
| `views/api-configuration.ejs`      | Added "Canonical Template" tab                   |
| `public/js/api-configuration.js`   | Added canonical template functions               |
| `public/css/api-configuration.css` | Added canonical variable chip styles             |
| `views/add-feature.ejs`            | Dynamic category dropdown from scopes            |
| `public/js/add-feature.js`         | `loadCategoryScopes()` function                  |

---

## Key Functions

### api-configuration.js

| Function                             | Purpose                                  |
| ------------------------------------ | ---------------------------------------- |
| `loadCanonicalScopes()`              | Fetches scopes and populates dropdown    |
| `updateCanonicalPreview()`           | Shows variable chips when scope changes  |
| `insertVariableAtCursor(variable)`   | Inserts variable at cursor position      |
| `formatCanonicalTemplate()`          | Formats JSON preserving canonical vars   |
| `validateCanonicalTemplate()`        | Validates variables against their scopes |
| `flattenCanonicalTemplate(template)` | Flattens nested JSON to dot notation     |
| `getCanonicalTemplateData()`         | Collects template data for saving        |

---

## Default Scopes

The following scopes are pre-configured:

| Scope        | Variables                                                              |
| ------------ | ---------------------------------------------------------------------- |
| Contacts     | unique_id, first_name, last_name, email, phone, company, address       |
| Email        | unique_id, from, to, subject, body, timestamp                          |
| SMS          | unique_id, from, to, message, timestamp                                |
| Leads        | unique_id, name, email, phone, source, status                          |
| Tasks        | unique_id, title, description, assignee, due_date, status              |
| Tickets      | unique_id, subject, description, requester, assignee, status, priority |
| Employee     | unique_id, name, email, dept, position, status                         |
| Organization | _(user-defined)_                                                       |
