# Files Overview

## What You Have Now

### 1. **auth-types-definition.json**
**Purpose:** Master schema of all authentication types

**Who uses it:** Your frontend GUI when admin is creating a software template

**What it contains:**
- All supported authentication types (API Key, OAuth2, Basic Auth, etc.)
- For each auth type:
  - `configOptions`: Fields that admin fills when setting up software
  - `credentialFields`: Fields that end-user fills when connecting
  - Metadata like labels, descriptions, help text, examples

**Example:**
```json
{
  "authTypes": {
    "api_key_header": {
      "label": "API Key (Header)",
      "configOptions": {
        "headerName": { "type": "string", "required": true }
      },
      "credentialFields": {
        "apiKey": { "type": "string", "required": true, "encrypted": true }
      }
    }
  }
}
```

---

### 2. **example-software-template-salesforce.json**
**Purpose:** Example of what admin creates for Salesforce

**Who creates it:** Admin through your GUI

**What it contains:**
- Software identification
- Selected auth type reference
- Configured values for that auth type
- Customized credential field labels
- Additional software-specific fields

**Example:**
```json
{
  "softwareId": "salesforce",
  "authMethods": [
    {
      "authType": "oauth2_authorization_code",
      "config": {
        "authorizationUrl": "https://login.salesforce.com/...",
        "tokenUrl": "https://login.salesforce.com/..."
      },
      "credentials": {
        "clientId": {
          "label": "Consumer Key"  // Customized!
        }
      }
    }
  ]
}
```

---

### 3. **example-software-template-stripe.json**
**Purpose:** Example of simpler authentication (Stripe)

**Shows:**
- How to use bearer token auth type
- Minimal configuration
- Simple one-field credential

---

### 4. **example-software-template-custom-crm.json**
**Purpose:** Example of custom headers authentication

**Shows:**
- How to use custom_headers auth type
- Multiple headers configuration
- Multiple credential fields mapping to headers

---

### 5. **AUTH-STRUCTURE-README.md**
**Purpose:** Complete documentation of the structure

**Contains:**
- Overview of the system
- Detailed explanation of each component
- How admin GUI should work
- How end-user flow works
- Examples for each auth type
- Field types and special features

---

### 6. **USAGE-GUIDE.md**
**Purpose:** Practical guide for GUI developers

**Contains:**
- Code examples for loading auth types
- How to generate forms dynamically
- How to handle conditional fields
- How to save templates
- How to generate user connection forms
- How to execute authentication
- How to make authenticated API requests

---

### 7. **USER-CONNECTION-MANAGEMENT.md**
**Purpose:** Comprehensive documentation for user connection system

**Contains:**
- Overview of connection workflow
- User journey diagrams for all phases
- 4-step connection wizard details
- My Connections dashboard features
- Architecture overview (frontend + backend)
- Security features (encryption, validation)
- UI/UX design principles
- Troubleshooting guide

---

### 8. **CONNECTION-WIZARD.md**
**Purpose:** Technical guide for connection wizard implementation

**Contains:**
- Step-by-step wizard implementation
- State management with wizardData
- Schema merging logic (global + integration-specific)
- Field validation patterns
- Dynamic form generation
- Testing checklist
- Common issues and solutions

---

### 9. **MY-CONNECTIONS-PAGE.md**
**Purpose:** Documentation for connections dashboard

**Contains:**
- Feature overview (stats, filters, actions)
- Implementation details for all functions
- Event delegation pattern
- Connection testing and deletion
- URL integration support
- Performance optimizations
- Security considerations

---

### 10. **API-ENDPOINTS.md**
**Purpose:** REST API reference

**Contains:**
- All API endpoints documentation
- Request/response formats
- Authentication requirements
- Error handling patterns
- Status codes reference
- Usage examples
- Security considerations

---

### 11. **ELASTICSEARCH-SCHEMA.md**
**Purpose:** Database schema documentation

**Contains:**
- All Elasticsearch indices
- Field mappings and types
- Document examples
- Relationship diagrams
- Query examples
- Best practices
- Maintenance guidelines

---

### 12. **features-definition.json** ⭐ NEW (2025-11-24)
**Purpose:** Storage for all feature templates

**Who uses it:** Feature templates admin page, future mapping system

**What it contains:**
- `version`: Schema version for compatibility
- `lastUpdated`: Timestamp of last modification
- `categories`: Category definitions (Contacts, Email, SMS, Leads, Tasks)
  - Each with label, icon, color, description
- `features`: All feature templates indexed by ID
  - Each feature has: id, name, description, category
  - `fields` object containing all field definitions
  - `createdAt` and `updatedAt` timestamps

**Example:**
```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-11-24T06:28:54.530Z",
  "categories": {
    "contacts": {
      "label": "Contacts",
      "icon": "👥",
      "color": "#4CAF50"
    }
  },
  "features": {
    "create_contact": {
      "id": "create_contact",
      "name": "Create Contact",
      "description": "Create a new contact in the CRM",
      "category": "contacts",
      "fields": {
        "contact_name": {
          "type": "dynamic",
          "label": "Contact Name",
          "fieldType": "string",
          "htmlType": "text",
          "required": true
        }
      },
      "createdAt": "2025-11-24T00:00:00Z",
      "updatedAt": "2025-11-24T00:00:00Z"
    }
  }
}
```

---

### 13. **FEATURE-TEMPLATES.md** ⭐ NEW (2025-11-24)
**Purpose:** Complete Feature Templates system documentation

**Contains:**
- Overview of Feature Templates system
- Why Feature Templates exist (generic definitions for reusability)
- Field Types explained (API, Static, Dynamic, Conditional)
- Field Properties reference (all properties and their meanings)
- HTML Input Types (text, select, checkbox, etc.)
- Possible Values system (for dropdowns/checkboxes)
- Conditional Expressions syntax (`{{field_name}}` format)
- Validation rules for all fields
- Storage structure (features-definition.json)
- UI Components overview
- API Endpoints reference
- Complete examples
- Best practices and troubleshooting

---

### 14. **future/custom-handler-architecture.md** ⭐ NEW (2025-11-24)
**Purpose:** Future architecture for custom handlers (20% complex cases)

**Contains:**
- Foundational context: Why features exist, declaration vs definition
- Problem statement and current challenges
- Hybrid approach: Templates (80%) + Custom Handlers (20%)
- Architecture overview with data flow diagrams
- Custom Handler Types (valueHandler, validationHandler, submitHandler)
- Context Object Structure (what gets passed to handlers)
- Return Format Contracts (strict format specifications)
- Handler Organization (file structure, exports)
- Handler Discovery & Execution (how engine calls handlers)
- Dependency Handling (cascading fields like Google Sheets)
- Error Handling Strategy (user feedback + logging)
- Complete Google Sheets implementation example
- Feature-Integration Mapping flow
- Database Schema Considerations (Elasticsearch, mappings)
- UI Requirements (wireframes, components)
- Future Decision Points (items to finalize)
- Best Practices for writing handlers

---

## Frontend Pages

### Admin Pages:
| Page | File | Purpose |
|------|------|---------|
| Dashboard | `dashboard.html` | Admin homepage with stats and navigation |
| Integrations List | `integrations.html` | Browse and manage integrations |
| Add/Edit Integration | `add-integration.html` | 5-step wizard for creating/editing integrations |
| Feature Templates | `feature-templates.html` ⭐ NEW | Manage feature templates with fields and validation |

### User Pages:
| Page | File | Purpose |
|------|------|---------|
| User Integrations | `user-integrations.html` | Browse available integrations marketplace |
| Connection Wizard | `connect-integration.html` | 4-step wizard for creating connections |
| My Connections | `my-connections.html` | Manage user connections dashboard |

---

## Quick Reference

### For Frontend Developers:

**Creating Admin GUI:**
```
Load auth-types-definition.json
→ Show auth types dropdown
→ When selected, show configOptions as form
→ Allow customization of credential labels
→ Save as software template
```

**Creating User Connection Form:**
```
Load software template
→ Get auth method
→ Get credentialFields from auth-types-definition
→ Merge with custom labels from template
→ Show form to user
→ Submit to backend
```

### For Backend Developers:

**Storing Credentials:**
```
Receive user credentials
→ Encrypt sensitive fields (where encrypted: true)
→ Store in database with userId + softwareId
→ For OAuth: execute flow and store tokens
```

**Making API Calls:**
```
Load software template
→ Load user credentials
→ Build request based on auth type
→ Inject authentication (headers/query/etc)
→ Handle token refresh for OAuth
→ Make API call
```

---

## The Three Layers

```
┌──────────────────────────────────────────────────────┐
│ Layer 1: Auth Type Definitions                       │
│ (auth-types-definition.json)                         │
│                                                       │
│ What: All possible auth types and their options      │
│ Created by: Developers                                │
│ Used by: Admin GUI                                    │
└──────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────┐
│ Layer 2: Software Templates                          │
│ (example-software-template-*.json)                   │
│                                                       │
│ What: Configured auth for specific software          │
│ Created by: Admins via GUI                            │
│ Used by: Runtime system & User GUI                    │
└──────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────┐
│ Layer 3: User Credentials                            │
│ (stored in database at runtime)                      │
│                                                       │
│ What: User's actual credentials & tokens             │
│ Created by: End-users                                 │
│ Used by: API request execution                        │
└──────────────────────────────────────────────────────┘
```

---

## Data Flow Example: Salesforce OAuth

### Setup Phase (Admin):
1. Admin opens GUI to add Salesforce
2. GUI loads `auth-types-definition.json`
3. Admin selects "OAuth 2.0 - Authorization Code"
4. GUI shows fields from `configOptions`:
   - Authorization URL
   - Token URL
   - Scopes, etc.
5. Admin fills in Salesforce-specific URLs
6. Admin customizes "Client ID" label to "Consumer Key"
7. System saves `software-template-salesforce.json`

### Connection Phase (End-User):
1. User clicks "Connect Salesforce"
2. System loads `software-template-salesforce.json`
3. System gets auth type: `oauth2_authorization_code`
4. System loads credential fields from `auth-types-definition.json`
5. System applies custom labels from template
6. User sees form:
   - Consumer Key (custom label!)
   - Consumer Secret
7. User fills and submits
8. System executes OAuth flow using config from template
9. Stores access_token, refresh_token in database

### Usage Phase (API Call):
1. User triggers action (e.g., "Get Contacts")
2. System loads template and user credentials
3. Checks if token expired
4. If expired, refreshes using refresh_token
5. Injects `Authorization: Bearer {access_token}` header
6. Makes API call to Salesforce
7. Returns data to user

---

## Next Steps

### 1. Build Admin GUI
- Auth type selector
- Dynamic config form generator
- Credential customization interface
- Template save/edit

### 2. Build User Connection UI
- Software selector
- Dynamic credential form
- OAuth flow handler
- Connection testing

### 3. Build Backend Auth Handler
- Template loader
- Credential storage (encrypted)
- OAuth flow executor
- Token refresh handler
- Request authentication injector

### 4. Add More Auth Types
You can easily add new auth types to `auth-types-definition.json`:
```json
{
  "my_custom_auth": {
    "label": "My Custom Auth",
    "configOptions": { ... },
    "credentialFields": { ... }
  }
}
```

---

## Support for Different Softwares

### Same Auth Type, Different Labels
Salesforce and Google both use OAuth2, but:
- Salesforce calls it "Consumer Key"
- Google calls it "Client ID"

**Solution:** Use credential customization in template

### Multiple Auth Methods
Some software supports multiple ways to authenticate:
- Salesforce: OAuth OR Session ID
- GitHub: OAuth OR Personal Access Token

**Solution:** Add multiple items to `authMethods` array in template

### Software-Specific Fields
Some software needs extra fields:
- Salesforce needs "Instance URL"
- Shopify needs "Shop Domain"

**Solution:** Use `additionalFields` in template

---

## FAQ

**Q: Can one software support multiple auth methods?**
A: Yes! Add multiple objects to the `authMethods` array.

**Q: What if a software has unique auth that doesn't fit any type?**
A: Use the `custom_headers` or `custom` auth type, or add a new auth type to the definition.

**Q: Where do user credentials get stored?**
A: In your database, encrypted. This structure just defines the schema.

**Q: How do I add a new auth type?**
A: Add it to `auth-types-definition.json` with its `configOptions` and `credentialFields`.

**Q: Can credential fields be conditional?**
A: Yes, use `dependsOn` in field definition (see auth-types-definition.json).

**Q: How do I handle token refresh for OAuth?**
A: Enable `tokenRefreshEnabled` in config, store refresh_token, check expiry before each request.
