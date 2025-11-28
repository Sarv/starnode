# Integration Platform

A comprehensive Node.js integration platform for managing third-party service connections and feature mappings.

## Overview

This platform enables users to:
- **Connect** to third-party services (Salesforce, Freshdesk, Google Sheets, etc.)
- **Manage** multiple connections per integration with custom names
- **Configure** reusable feature templates
- **Map** features to integrations with custom handlers and fields
- **Execute** actions with proper authentication and data transformation

## Quick Start

### Prerequisites
- Node.js 14+
- Elasticsearch 7+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env and set ENCRYPTION_KEY

# Start Elasticsearch (if not running)
# Start the server
npm start
```

Server runs on `http://localhost:3000`

### First Steps

1. Visit `http://localhost:3000`
2. Browse available integrations
3. Create a connection to an integration
4. Configure feature mappings (optional)
5. Use the connection in your workflows

## Key Features

### 1. User Connection Management
- Create, read, update, delete user connections
- Multiple connections per integration (e.g., "Production", "Sandbox")
- Encrypted credential storage (AES-256)
- Connection testing and health monitoring

### 2. Integration Marketplace
- Browse 50+ available integrations
- Category filtering (CRM, Payment, Email, etc.)
- Visual logos and descriptions
- Connection status indicators

### 3. Feature Templates
- Reusable feature definitions (Create Contact, Send Email, etc.)
- Four field types: Static, Dynamic, Conditional, API
- Rich validation and configuration options
- Category-based organization

### 4. Feature-Integration Mapping
- Map feature templates to specific integrations
- Custom field configurations and handlers
- Admin vs User fill modes
- Extra integration-specific fields
- Professional table-based UI

### 5. Authentication Support
- OAuth 2.0 (Authorization Code, Client Credentials)
- API Key (Header, Query, Custom)
- Basic Authentication
- Custom authentication methods per integration

## Project Structure

```
/
├── server.js                          # Express server (main entry point)
├── lib/
│   ├── elasticsearch.js               # Database operations
│   └── encryption.js                  # Credential encryption/decryption
├── public/
│   ├── *.html                         # All HTML pages
│   ├── js/                            # Frontend JavaScript
│   │   ├── connect-integration.js     # Connection wizard
│   │   ├── my-connections.js          # Connections dashboard
│   │   ├── feature-templates.js       # Feature management
│   │   ├── feature-integration-mapping.js  # Mapping wizard
│   │   └── integration-detail.js      # Integration details
│   ├── css/                           # Stylesheets
│   └── assets/                        # Static assets
├── views/                             # EJS templates
│   ├── integration-detail.ejs         # Integration detail page
│   └── feature-integration-mapping.ejs # Mapping wizard
├── integrations/
│   └── providers/                     # Integration definitions
│       └── {id}/
│           ├── auth.schema.json       # Auth configuration
│           └── features.schema.json   # Feature mappings
├── features-definition.json           # Feature templates storage
├── auth-types-definition.json         # Global auth types
├── panel-config.json                  # UI panel configuration
├── docs/                              # Documentation
│   ├── FEATURE-MAPPING-SYSTEM.md      # Feature mapping guide
│   ├── FIELD-TYPES-AND-HANDLERS.md    # Field types guide
│   ├── USER-CONNECTION-MANAGEMENT.md  # Connection system docs
│   ├── CONNECTION-WIZARD.md           # Wizard implementation
│   ├── MY-CONNECTIONS-PAGE.md         # Dashboard docs
│   ├── API-ENDPOINTS.md               # API reference
│   └── ...                            # More documentation
└── elasticsearch/                     # ES index mappings
    ├── users-mapping.json
    ├── integrations-mapping.json
    └── user_integrations-mapping.json
```

## Core Concepts

### Integrations
Third-party services like Salesforce, Freshdesk, Google Sheets. Each integration has:
- Metadata (name, description, category, logo)
- Authentication schema (auth methods, credentials, variables)
- Feature mappings (optional, configured by admin)

### User Connections
User-specific connections to integrations. Each connection has:
- Custom name (e.g., "Production Salesforce")
- Selected auth method
- Configured dynamic variables
- Encrypted credentials
- Test status and history

### Feature Templates
Reusable definitions for common operations. Each template has:
- Generic field definitions
- Field types (static, dynamic, conditional, api)
- Validation rules
- Categorization

### Feature Mappings
Integration-specific configurations of feature templates. Each mapping has:
- Field enable/disable settings
- Custom handlers (transform, validate, submit)
- Admin-configured values
- Extra integration-specific fields
- API endpoint configuration

### Field Types

**Static**: Fixed configuration fields
```json
{
  "type": "static",
  "label": "Priority",
  "htmlType": "select",
  "possibleValues": ["low", "medium", "high"]
}
```

**Dynamic**: Runtime-fetched fields
```json
{
  "type": "dynamic",
  "label": "Project",
  "htmlType": "select"
  // Options fetched from API at runtime
}
```

**Conditional**: Context-dependent fields
```json
{
  "type": "conditional",
  "label": "Webhook URL",
  "conditionalExpression": "{{notifications}}==true"
}
```

**API**: API configuration fields
```json
{
  "type": "api",
  "label": "Custom Endpoint"
  // Shows "API Settings" button in UI
}
```

### fillBy Property

**Admin**: Value set during setup
- Configured in mapping wizard
- Saved in `adminValue`
- Same for all users
- Examples: API keys, default settings

**User**: Value set at runtime
- Prompted when executing action
- Not stored in mapping
- Different per execution
- Examples: Contact email, task description

### Custom Handlers

**Value Handler**: Transform field values
```javascript
function capitalizeFirstName(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}
```

**Validation Handler**: Validate field values
```javascript
function validateEmailFormat(value) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(value) ? true : "Invalid email format";
}
```

**Submit Handler**: Process before API call
```javascript
function encryptSensitiveData(value) {
    return encrypt(value, SECRET_KEY);
}
```

## API Endpoints

### Users
- `GET /api/users` - List all users
- `POST /api/users` - Create user
- `GET /api/users/:id` - Get user
- `PUT /api/users/:id` - Update user

### Integrations
- `GET /api/integrations` - List all integrations
- `POST /api/integrations` - Create integration
- `GET /api/integrations/:id` - Get integration
- `PUT /api/integrations/:id` - Update integration

### User Connections
- `GET /api/users/:userId/integrations` - List user connections
- `POST /api/users/:userId/integrations` - Create connection
- `GET /api/users/:userId/integrations/:integrationId` - Get connection
- `PUT /api/users/:userId/integrations/:integrationId` - Update connection
- `DELETE /api/users/:userId/integrations/:integrationId` - Delete connection
- `POST /api/users/:userId/integrations/:integrationId/test` - Test connection

### Feature Templates
- `GET /api/feature-templates` - List all templates
- `POST /api/feature-templates` - Create template
- `GET /api/feature-templates/:id` - Get template
- `PUT /api/feature-templates/:id` - Update template
- `DELETE /api/feature-templates/:id` - Delete template

### Feature Mappings
- `GET /api/integrations/:id/feature-mappings` - List mappings
- `POST /api/integrations/:id/feature-mappings` - Create mapping
- `PUT /api/integrations/:id/feature-mappings/:mappingId` - Update mapping
- `DELETE /api/integrations/:id/feature-mappings/:mappingId` - Delete mapping

Complete API documentation: [`docs/API-ENDPOINTS.md`](docs/API-ENDPOINTS.md)

## Pages

| Page | Path | Purpose |
|------|------|---------|
| Dashboard | `/` | User dashboard |
| Integrations | `/integrations` | Browse integrations marketplace |
| My Connections | `/my-connections` | Manage user connections |
| Connect Wizard | `/connect-integration` | Create/edit connections |
| Integration Detail | `/integration-detail/{id}` | View integration details and mappings |
| Feature Templates | `/feature-templates` | Manage feature templates (admin) |
| Feature Mapping | `/feature-integration-mapping` | Create/edit feature mappings |

## Technology Stack

### Backend
- **Node.js** + **Express.js** - REST API server
- **Elasticsearch** - NoSQL database
- **Crypto (AES-256)** - Credential encryption

### Frontend
- **Vanilla JavaScript** - No frameworks
- **HTML5 + CSS3** - Modern responsive UI
- **EJS** - Server-side templating (for some pages)
- **Fetch API** - AJAX requests

### Security
- AES-256-CBC encryption for credentials
- Environment-based encryption keys
- Password field masking
- Input validation (frontend + backend)
- Soft delete (data preservation)

## Documentation

Comprehensive documentation available in [`docs/`](docs/) folder:

### Core Documentation
- [`README.md`](docs/README.md) - Documentation index
- [`FILES-OVERVIEW.md`](docs/FILES-OVERVIEW.md) - File structure guide

### Feature Documentation
- [`USER-CONNECTION-MANAGEMENT.md`](docs/USER-CONNECTION-MANAGEMENT.md) - Connection system
- [`CONNECTION-WIZARD.md`](docs/CONNECTION-WIZARD.md) - Wizard implementation
- [`MY-CONNECTIONS-PAGE.md`](docs/MY-CONNECTIONS-PAGE.md) - Dashboard details
- [`FEATURE-TEMPLATES.md`](docs/FEATURE-TEMPLATES.md) - Feature templates guide
- [`FEATURE-MAPPING-SYSTEM.md`](docs/FEATURE-MAPPING-SYSTEM.md) - Mapping system guide
- [`FIELD-TYPES-AND-HANDLERS.md`](docs/FIELD-TYPES-AND-HANDLERS.md) - Field types reference

### Technical Documentation
- [`API-ENDPOINTS.md`](docs/API-ENDPOINTS.md) - Complete API reference
- [`ELASTICSEARCH-SCHEMA.md`](docs/ELASTICSEARCH-SCHEMA.md) - Database schema
- [`AUTH-STRUCTURE-README.md`](docs/AUTH-STRUCTURE-README.md) - Authentication system
- [`PANEL_CONFIG_GUIDE.md`](docs/PANEL_CONFIG_GUIDE.md) - UI configuration
- [`DYNAMIC_VARIABLES.md`](docs/DYNAMIC_VARIABLES.md) - Dynamic variables system

## Development

### Running in Development

```bash
# Start with nodemon (auto-restart)
npm run dev

# Start normally
npm start
```

### Code Conventions

1. **Event Delegation**: Single listener on parent for dynamic elements
2. **Wizard State**: Global state object for multi-step forms
3. **Smart Password Handling**: Never pre-fill, preserve if empty on edit
4. **URL Parameters**: Pass data between pages via query strings
5. **Toast Notifications**: User feedback for all actions
6. **Modal System**: Overlays for detailed views

### Adding a New Integration

1. Create folder: `integrations/providers/{integration-id}/`
2. Add `auth.schema.json` with authentication configuration
3. (Optional) Add `features.schema.json` for feature mappings
4. Add integration to Elasticsearch `integrations` index
5. Test connection and feature mappings

### Adding a New Feature Template

1. Visit `/feature-templates`
2. Click "Create New Feature Template"
3. Define fields with types, validation, possible values
4. Set category and description
5. Save template
6. Map to integrations as needed

## Environment Variables

```bash
# Required
ENCRYPTION_KEY=your-32-character-encryption-key

# Optional
PORT=3000
ELASTICSEARCH_URL=http://localhost:9200
```

## Testing

```bash
# Run test scripts
npm test

# Test specific integration
node test-scripts/test-integration.js
```

## Contributing

1. Follow existing code conventions
2. Add documentation for new features
3. Test thoroughly before committing

## License

[Add your license here]

## Support

For questions or issues:
- Check documentation in `docs/` folder
- Review API endpoints in `docs/API-ENDPOINTS.md`

---

**Last Updated**: 2025-11-26
**Version**: 1.0.0
