# Project Context & Instructions

**Last Updated:** 2025-11-23

---

## 🎯 Project Goal

Building a **no-code/low-code integration platform** similar to n8n that can connect to any third-party software (CRMs, databases, tools) using a **template-driven approach**.

---

## ✨ Latest Features & Progress

### Recently Implemented (November 2025):

#### 1. **User Connection Management System** ✅ NEW!
- **4-Step Connection Wizard**: Guided flow for creating connections
  - Step 1: Select authentication method with visual cards
  - Step 2: Configure dynamic variables from baseUrl
  - Step 3: Enter credentials with encryption
  - Step 4: Review, name & test connection
- **Multiple Connections Support**: Users can create multiple connections for same integration
  - Custom connection naming (e.g., "Salesforce Production", "Salesforce Sandbox")
  - Each connection has unique credentials and configuration
- **My Connections Dashboard**: Centralized connection management
  - View all user connections with integration logos
  - Filter by status (Active/Inactive)
  - Connection statistics (active count, total, recent)
  - Test and delete connections
  - Professional UI with status badges
- **Connection Testing**: Real-time connection validation
  - Test connections before and after creation
  - Last test status and date tracking
  - Detailed error messages for debugging
- **User Context Display**: Shows user and integration info throughout wizard
- **Schema Merging**: Combines global auth types with integration-specific schemas
- **Professional Design**: Integration icons, clean cards, responsive layout

#### 2. **Integration Management System** ✅
- Full CRUD operations for integrations
- Multi-step wizard for creating integrations (5 steps)
- Edit mode support for existing integrations
- Integration registry with metadata storage

#### 2. **Dynamic Additional Fields for Auth Methods** ✅
- Auth types can define `supportsAdditionalFields: true`
- Admins can add custom fields (e.g., company, subdomain) needed for API calls
- Fields support: name, label, type (string/number/boolean), required, placeholder
- Validation: Field names must be lowercase, no spaces, unique within method
- Real-time validation feedback

#### 3. **Panel Configuration System** ✅
- **`panel-config.json`**: Centralized field definitions for all forms
- **Template-driven form generation**: All forms render from config
- **`validators.js`**: Reusable validation functions
- **Separation of concerns**: `dataType` (validation) vs `htmlType` (rendering)
- **Dynamic field generation**: No hardcoded HTML, everything from config

#### 4. **Rate Limiting System** ✅
- Endpoint-specific rate limits configuration
- Per-minute, per-hour, per-day limits
- Concurrent request limits
- Retry strategy with exponential backoff
- Wildcard path support (e.g., `/api/*`)

#### 5. **Features & Endpoints Management** ✅
- Define API features/endpoints per integration
- HTTP method selection (GET, POST, PUT, PATCH, DELETE)
- Path validation (must start with `/`)
- Feature metadata: name, ID, description

#### 6. **Comprehensive Documentation** ✅
- **`PANEL_CONFIG_GUIDE.md`**: Complete guide for panel-config.json structure
- Property rules, validation matrix, best practices
- Examples for adding new fields and extending system

---

## 🏗️ Core Architecture Principles

### 1. Template-Driven Design
- Everything should be JSON-based/template-based
- When adding a new integration, write minimal code
- Configuration acts as "settings" that determine behavior

### 2. Almost No-Code Philosophy
- Each module should work like configurable settings
- Adding new software = Define settings in JSON
- Those settings determine how the integration behaves

---

## 📋 Key Requirements

### Authentication Module Requirements

The platform needs a flexible authentication system that supports:

#### Simple Authentication Methods:
- API Key / Token (header or query parameter)
- Personal Access Token (PAT)
- Generic Header Authentication
- Basic Authentication (username/password)
- Bearer Token / Access Token
- Database credentials

#### Advanced Authentication Methods:
- JWT (JSON Web Tokens)
- AWS Signature v4
- SSH / Private Key based authentication

#### OAuth Methods:
- OAuth2 – Authorization Code Flow
- OAuth2 – Client Credentials Flow
- OAuth2 – Service Account / JWT (Google-style)
- OAuth1 (legacy support)

#### Custom Methods:
- Any other custom authentication method
- Support for multiple custom headers
- Multi-step authentication flows

### Multi-Method Support
- A single software integration **MUST** support multiple authentication methods
- Example: Salesforce can use OAuth2 OR Session ID
- Example: GitHub can use OAuth2 OR Personal Access Token

---

## 📐 Structure Design

### Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│ LAYER 1: Auth Type Definitions                          │
│ File: auth-types-definition.json                        │
│                                                          │
│ • Master schema of ALL possible auth types              │
│ • Defines configOptions (admin fills)                   │
│ • Defines credentialFields (user fills)                 │
│ • Created by: Developers                                │
│ • Used by: Admin GUI                                    │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ LAYER 2: Software Templates                             │
│ Files: example-software-template-*.json                 │
│                                                          │
│ • Configuration for specific software                   │
│ • References auth type from Layer 1                     │
│ • Fills in configOptions values                         │
│ • Optionally customizes credential labels               │
│ • Created by: Admins via GUI                            │
│ • Used by: Runtime system & User GUI                    │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ LAYER 3: User Credentials                               │
│ Storage: Database (encrypted)                           │
│                                                          │
│ • User's actual credentials & tokens                    │
│ • Unique per user per software                          │
│ • Created by: End-users                                 │
│ • Used by: API request execution                        │
└─────────────────────────────────────────────────────────┘
```

---

## 🔑 Critical Concepts

### configOptions vs credentialFields

**This is the MOST IMPORTANT distinction:**

| Aspect | configOptions | credentialFields |
|--------|---------------|------------------|
| **Who fills?** | Admin (once) | End-user (each) |
| **When?** | Template creation | Account connection |
| **Scope** | Same for all users | Unique per user |
| **Examples** | URLs, header names, scopes | API keys, passwords, tokens |

### Examples:

**OAuth2:**
- `configOptions`: Authorization URL, Token URL, Scopes (same for all)
- `credentialFields`: Client ID, Client Secret (unique per user)

**API Key:**
- `configOptions`: Header name like "X-API-Key" (same for all)
- `credentialFields`: The actual API key value (unique per user)

---

## 🎨 Admin GUI Workflow

### Step 1: Select Auth Type
Admin sees dropdown of all auth types from `auth-types-definition.json`:
- API Key (Header)
- Bearer Token
- OAuth 2.0 - Authorization Code
- Basic Auth
- etc.

### Step 2: Configure Settings
GUI dynamically generates form based on selected auth type's `configOptions`:
- For OAuth2: Show fields for Authorization URL, Token URL, Scopes, etc.
- For API Key: Show fields for Header Name, Prefix, etc.

### Step 3: Customize Labels (Optional)
Admin can customize how credential fields appear to users:
- Change "Client ID" → "Consumer Key"
- Add custom help text
- Add placeholder text

### Step 4: Save Template
Result is saved as a software template JSON file

---

## 👤 End-User Workflow

### Step 1: Select Software
User chooses which software to connect (e.g., "Salesforce")

### Step 2: Fill Credentials
System generates form from `credentialFields` + template customizations:
- Shows customized labels if admin provided them
- Shows help text and placeholders
- Encrypts sensitive fields

### Step 3: Connect
System executes authentication based on auth type:
- API Key: Simply stores key
- OAuth: Initiates OAuth flow, exchanges tokens
- Basic Auth: Stores username/password (encrypted)

### Step 4: Use
System injects authentication into API requests automatically

---

## 📂 File Structure

```
integrations/
├── server.js                           # Node.js Express backend
├── package.json                        # Dependencies
├── auth-types-definition.json          # Master auth schema (MOST IMPORTANT)
├── panel-config.json                   # Centralized field definitions for forms
├── registry.json                       # Integration registry with metadata
│
├── public/                             # Frontend files (Vanilla JS)
│   ├── index.html                      # Auth config page (original)
│   ├── dashboard.html                  # Dashboard with stats
│   ├── integrations.html               # Integrations list page
│   ├── add-integration.html            # Add/Edit integration wizard
│   ├── user-integrations.html          # User integrations marketplace
│   ├── connect-integration.html        # 4-step connection wizard
│   ├── my-connections.html             # User connections dashboard
│   │
│   ├── css/
│   │   ├── styles.css                  # Original styles
│   │   ├── theme.css                   # Theme variables & global styles
│   │   ├── dashboard.css               # Dashboard styles
│   │   ├── integrations.css            # Integrations list styles
│   │   ├── add-integration.css         # Wizard styles
│   │   ├── user-integrations.css       # User marketplace styles
│   │   ├── connect-integration.css     # Connection wizard styles
│   │   └── my-connections.css          # Connections dashboard styles
│   │
│   └── js/
│       ├── app.js                      # Auth config logic (original)
│       ├── dashboard.js                # Dashboard & sidebar logic
│       ├── integrations.js             # Integrations list logic
│       ├── add-integration.js          # Wizard logic
│       ├── user-integrations.js        # User marketplace logic
│       ├── connect-integration.js      # Connection wizard logic
│       ├── my-connections.js           # Connections dashboard logic
│       └── validators.js               # Reusable validation functions
│
├── integrations/                       # Integration storage
│   └── providers/
│       └── {integration-id}/
│           ├── auth-schema.json        # Auth methods configuration
│           ├── features-schema.json    # API endpoints definition
│           └── rate-limits.json        # Rate limiting configuration
│
└── docs/                               # Documentation & Templates
    ├── example-software-template-*.json    # Example templates
    │   ├── salesforce.json             # OAuth2 example
    │   ├── stripe.json                 # Simple bearer token
    │   └── custom-crm.json             # Custom headers
    │
    ├── AUTH-STRUCTURE-README.md        # Complete documentation
    ├── USAGE-GUIDE.md                  # Developer implementation guide
    ├── FILES-OVERVIEW.md               # Quick reference
    ├── COMPARISON-TABLE.md             # Visual comparisons
    ├── README-SERVER.md                # Server setup guide
    ├── PANEL_CONFIG_GUIDE.md           # Panel config documentation
    ├── USER-CONNECTION-MANAGEMENT.md   # User connection system overview
    ├── CONNECTION-WIZARD.md            # Connection wizard technical guide
    ├── MY-CONNECTIONS-PAGE.md          # Connections dashboard documentation
    ├── API-ENDPOINTS.md                # REST API reference
    ├── ELASTICSEARCH-SCHEMA.md         # Database schema documentation
    └── PROJECT-CONTEXT.md              # This file
```

---

## 🎨 Panel Configuration System

### Overview

The panel configuration system is a **template-driven form generation** system that eliminates hardcoded HTML for form fields.

### Key Files:

1. **`panel-config.json`** - Centralized field definitions
2. **`validators.js`** - Reusable validation functions
3. **`add-integration.js`** - Dynamic form rendering

### dataType vs htmlType

**Critical distinction for field configuration:**

| Property | Purpose | Examples | Used By |
|----------|---------|----------|---------|
| `dataType` | Validation & type checking | `string`, `number`, `url`, `email`, `boolean` | `validators.js` backend validation |
| `htmlType` | HTML rendering | `text`, `textarea`, `select`, `number`, `checkbox` | Form generation frontend |

**Example:**

```json
"docsUrl": {
  "label": "Documentation URL",
  "description": "Link to API documentation",
  "dataType": "url",        // ← Validates as URL
  "htmlType": "text",       // ← Renders as text input
  "required": false
}
```

### Panel Config Structure

```json
{
  "sectionName": {
    "fieldName": {
      "label": "Field Label",           // Required: Display label
      "description": "Help text",       // Required: Instructions
      "dataType": "string",             // Required: Validation type
      "htmlType": "text",               // Required: HTML element type
      "required": true,                 // Required: Is mandatory?
      "placeholder": "e.g., example",   // Optional
      "pattern": "^[a-z]+$",           // Optional: Regex validation
      "min": 1,                         // Optional: For numbers
      "max": 100,                       // Optional: For numbers
      "default": "value",               // Optional: Default value
      "options": [...]                  // Optional: For select fields
    }
  }
}
```

### Current Sections:

- **`basicInfo`**: Integration metadata (name, ID, category, version, description, status, URLs)
- **`features`**: API endpoints (name, ID, description, HTTP method, path)
- **`rateLimits`**: Rate limiting (path, requests per minute/hour/day, concurrent requests)

### Validation Flow

```
User Input → panel-config.json → validators.js → Validation Result
                                       ↓
                              validateFields(data, config)
                                       ↓
                    Returns: { valid: boolean, errors: {...} }
```

### Benefits

✅ **Zero hardcoded HTML** - All fields from config
✅ **Easy to extend** - Add fields without code changes
✅ **Consistent validation** - Same config drives rendering & validation
✅ **Type-safe** - Clear separation of data types and HTML types
✅ **Self-documenting** - Config includes labels and descriptions

### Adding New Fields

```json
// In panel-config.json
"basicInfo": {
  "newField": {
    "label": "New Field",
    "description": "Description of new field",
    "dataType": "string",
    "htmlType": "text",
    "required": true
  }
}
```

Field automatically:
- Renders in form
- Gets validated
- Captures data
- Shows error messages

See `PANEL_CONFIG_GUIDE.md` for complete documentation.

---

## 🌐 API Endpoints

### Integration Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/integrations` | GET | List all integrations from registry |
| `/api/integrations` | POST | Create new integration |
| `/api/integrations/:id` | GET | Get integration details |
| `/api/integrations/:id` | PUT | Update integration |
| `/api/integrations/:id` | DELETE | Delete integration |
| `/api/integrations/:id/auth` | GET | Get auth schema |
| `/api/integrations/:id/auth-schema` | GET | Get merged auth schema for wizard |
| `/api/integrations/:id/features` | GET | Get features schema |
| `/api/integrations/:id/ratelimits` | GET | Get rate limits |

### User Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/users` | GET | Get all active users |
| `/api/users/:userId` | GET | Get user by ID |
| `/api/users` | POST | Create new user |
| `/api/users/:userId` | PUT | Update user |
| `/api/users/:userId` | DELETE | Delete user (soft delete) |

### Connection Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/user-integrations/connect` | POST | Create new connection |
| `/api/user-integrations/my-connections` | GET | Get user connections |
| `/api/user-integrations/:connectionId` | GET | Get connection by ID |
| `/api/user-integrations/:connectionId` | PUT | Update connection |
| `/api/user-integrations/:connectionId` | DELETE | Delete connection (soft delete) |
| `/api/user-integrations/:connectionId/test` | POST | Test connection |

### Configuration

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth-types` | GET | Get all auth type definitions |
| `/api/panel-config` | GET | Get panel field configurations |

### Request/Response Examples

**Create Integration:**
```javascript
POST /api/integrations
{
  "basicInfo": {
    "id": "salesforce",
    "displayName": "Salesforce",
    "category": "crm",
    "description": "...",
    "version": "1.0.0"
  },
  "authSettings": {
    "authMethods": [...]
  },
  "features": {
    "features": [...]
  },
  "rateLimits": {
    "endpointLimits": [...],
    "retryStrategy": {...}
  }
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Integration created successfully",
  "integrationId": "salesforce"
}
```

---

## 🔧 Implementation Notes

### For Frontend Developers:

1. **Load auth types:**
   ```javascript
   const authTypes = require('./auth-types-definition.json');
   ```

2. **Generate admin form dynamically:**
   ```javascript
   const authType = authTypes.authTypes[selectedType];
   const configFields = authType.configOptions;
   // Render form based on field types
   ```

3. **Generate user form dynamically:**
   ```javascript
   const credFields = authType.credentialFields;
   const customLabels = softwareTemplate.credentials;
   // Merge and render form
   ```

### For Backend Developers:

1. **Store credentials (encrypted):**
   - Encrypt all fields marked `encrypted: true`
   - Store per user per software

2. **Execute authentication:**
   - Load software template
   - Load user credentials
   - Execute based on auth type

3. **Make authenticated requests:**
   - Inject auth based on `requestInjection` config
   - Handle token refresh for OAuth
   - Check expiry and refresh tokens

---

## ✅ Design Decisions Made

### 1. Separation of Concerns
- Auth type definitions = Reusable schemas
- Software templates = Software-specific configuration
- User credentials = User-specific data

### 2. Flexibility
- Support for multiple auth methods per software
- Custom label support for better UX
- Extensible: Easy to add new auth types

### 3. Security
- Mark sensitive fields with `encrypted: true`
- Store tokens separately for OAuth
- Support for token refresh

### 4. Simplicity
- No complex inheritance or nesting
- Clear distinction: config vs credentials
- Template-driven: Minimal code for new integrations

---

## 🚫 What to Avoid

### Common Mistakes:

1. **Don't put URLs in credentialFields**
   - Authorization URLs are same for all users
   - Should be in configOptions

2. **Don't put API keys in configOptions**
   - API keys are unique per user
   - Should be in credentialFields

3. **Don't hardcode auth logic**
   - Everything should be driven by JSON templates
   - Auth execution should be generic based on type

4. **Don't create separate structures for similar auth types**
   - Reuse auth types (like oauth2_authorization_code)
   - Differentiate via configuration, not structure

---

## 🎯 Success Criteria

The system is successful if:

1. ✅ Adding a new software requires **NO code changes**
   - Just create a new template JSON file

2. ✅ Adding a new auth type is **straightforward**
   - Add entry to auth-types-definition.json
   - Update auth execution handler

3. ✅ Admin can configure without technical knowledge
   - GUI shows relevant fields only
   - Clear labels and help text

4. ✅ Users can connect easily
   - Simple forms with custom labels
   - Clear error messages

5. ✅ System handles auth automatically
   - Token refresh for OAuth
   - Proper injection into requests
   - Security (encryption, secure storage)

---

## 🔄 Future Considerations

### Completed Enhancements:
- [x] **Rate limiting system** - Endpoint-specific with retry strategy
- [x] **Additional fields for auth** - Dynamic fields per auth method
- [x] **Integration management** - Full CRUD with wizard UI
- [x] **Template-driven forms** - Panel config system
- [x] **Validation framework** - Reusable validators

### Potential Future Enhancements:
- [x] **User connection management** - Completed (Nov 2025)
- [x] **Connection testing** - Completed (Nov 2025)
- [x] **Multiple connections per integration** - Completed (Nov 2025)
- [ ] Auth method validation/testing before saving
- [ ] Auto-discovery of OAuth endpoints
- [ ] Multi-step custom authentication flows
- [ ] Credential sharing/team access
- [ ] Credential rotation/expiry management
- [ ] Webhook authentication support
- [ ] mTLS (mutual TLS) support
- [ ] API request testing/playground
- [ ] Integration templates marketplace
- [ ] Workflow builder (n8n-like visual flow)
- [ ] Real-time API monitoring & logs
- [ ] Integration analytics & usage stats
- [ ] Automatic connection health monitoring
- [ ] Connection sharing between users
- [ ] Connection usage analytics

---

## 📝 Notes for Parallel Development

When continuing work in a new chat session, provide:

1. **This file** (`PROJECT-CONTEXT.md`) - For understanding project goals and progress
2. **`auth-types-definition.json`** - For current auth schema
3. **`panel-config.json`** - For field definitions and validation rules
4. **`PANEL_CONFIG_GUIDE.md`** - For understanding config system
5. **`COMPARISON-TABLE.md`** - For understanding key concepts
6. **Specific task** - What needs to be built/modified

### Example prompt for new session:
```
I'm building a no-code integration platform. Please read:
1. PROJECT-CONTEXT.md (project overview & progress)
2. auth-types-definition.json (auth schema)
3. panel-config.json (field configurations)
4. PANEL_CONFIG_GUIDE.md (config system guide)

Task: [Describe specific task]
```

### Key Implementation Files:
- **Admin Frontend**: `add-integration.js`, `integrations.js`, `validators.js`
- **User Frontend**: `connect-integration.js`, `my-connections.js`, `user-integrations.js`
- **Backend**: `server.js` (Express API routes), `elasticsearch.js` (database layer)
- **Config**: `panel-config.json`, `auth-types-definition.json`, `registry.json`
- **Admin Docs**: `PANEL_CONFIG_GUIDE.md`, `AUTH-STRUCTURE-README.md`
- **User Docs**: `USER-CONNECTION-MANAGEMENT.md`, `CONNECTION-WIZARD.md`, `MY-CONNECTIONS-PAGE.md`
- **Technical Docs**: `API-ENDPOINTS.md`, `ELASTICSEARCH-SCHEMA.md`

---

## 🤝 Contributing Guidelines

When adding new auth types:

1. Add to `auth-types-definition.json`
2. Define clear `configOptions` (admin fills)
3. Define clear `credentialFields` (user fills)
4. Add example software template
5. Update documentation if needed

When modifying structure:

1. Ensure backward compatibility
2. Update all example templates
3. Update documentation
4. Test with multiple auth types

---

## 🔒 Field Locking Guidelines

### Understanding `locked: true`

The `locked` property prevents admins from modifying fields that follow standards or specifications.

#### **When to Use `locked: true`:**

✅ Field follows a **standard/specification** (RFC, HTTP spec, OAuth spec)
✅ Value **MUST NOT change** for compatibility
✅ Changing it would **break the integration**

**Examples:**

```json
{
  "bearer_token": {
    "configOptions": {
      "headerName": {
        "default": "Authorization",
        "locked": true  // RFC 6750 standard
      },
      "prefix": {
        "default": "Bearer ",
        "locked": true  // Must be "Bearer " with space
      }
    }
  },

  "basic_auth": {
    "configOptions": {
      "headerName": {
        "default": "Authorization",
        "locked": true  // HTTP Basic Auth standard
      }
    }
  },

  "oauth1": {
    "configOptions": {
      "version": {
        "default": "1.0",
        "locked": true  // OAuth 1.0 spec version
      }
    }
  }
}
```

#### **When NOT to Use `locked`:**

❌ Different APIs use **different conventions**
❌ Field is **customizable by design**
❌ No standard dictates the value

**Examples:**

```json
{
  "api_key_header": {
    "configOptions": {
      "headerName": {
        "default": "X-API-Key",
        "locked": false  // Each API uses different names
      },
      "prefix": {
        "default": "",
        "locked": false  // Optional, varies by API
      }
    }
  }
}
```

#### **Quick Reference Table:**

| Auth Type | Field | Locked? | Reason |
|-----------|-------|---------|---------|
| bearer_token | headerName | ✅ Yes | RFC 6750 standard requires "Authorization" |
| bearer_token | prefix | ✅ Yes | RFC 6750 requires "Bearer " (with space) |
| api_key_header | headerName | ❌ No | APIs use various headers (X-API-Key, X-Auth-Token, etc.) |
| api_key_header | prefix | ❌ No | Some APIs need prefix, others don't |
| basic_auth | headerName | ✅ Yes | HTTP Basic Auth standard |
| oauth2 | authorizationUrl | ❌ No | Each provider has different URL |
| oauth1 | version | ✅ Yes | OAuth 1.0 specification version |

#### **Benefits:**

1. **Prevents Admin Errors** - Can't accidentally misconfigure standard fields
2. **Ensures Compatibility** - Integration works with all standard-compliant APIs
3. **Better UX** - Shows admins what cannot be changed
4. **Self-Documenting** - Locked fields indicate "this is the standard"

#### **UI Implementation:**

```javascript
// In app.js, handle locked fields:
if (field.locked) {
    input.setAttribute('readonly', true);
    input.style.background = 'var(--gray-50)';
    // Optionally add a lock icon
}
```

**Rule of Thumb:** Lock fields that follow universal standards. Keep flexible fields unlocked for API-specific customization.

---

## 📞 Key Stakeholders

- **Developers**: Build the platform code
- **Admins**: Configure software integrations (via GUI)
- **End-users**: Connect their accounts and use integrations

Each role has clear responsibilities and clear interfaces (JSON schemas).

---

## 💻 Tech Stack

### Backend:
- **Node.js** with **Express.js** - REST API server
- **File system** - JSON-based storage (integrations, registry)
- **Built-in encryption** - For sensitive credentials

### Frontend:
- **Vanilla JavaScript** - No framework dependencies
- **Modern CSS** - CSS Grid, Flexbox, CSS Variables
- **HTML5** - Semantic markup

### Data Format:
- **JSON** - All configurations and templates
- **Template-driven** - Zero hardcoded schemas

### Architecture Pattern:
- **Three-layer architecture** - Auth types → Software templates → User credentials
- **Config-driven forms** - Panel config system
- **RESTful API** - Standard CRUD operations
- **File-based storage** - Easy to understand and debug

### Key Libraries/Tools:
- None! Pure vanilla JavaScript for maximum flexibility and learning

---

*This document should be updated as new decisions are made or requirements change.*
