# Integration Platform - Server Setup

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Server
```bash
npm start
```

Or with auto-reload during development:
```bash
npm run dev
```

### 3. Open Browser
Navigate to: **http://localhost:3000**

---

## 📁 Project Structure

```
integrations/
├── server.js                              # Node.js Express server
├── package.json                           # Dependencies
├── auth-types-definition.json             # Master auth types schema
├── example-software-template-*.json       # Software templates
│
├── public/                                # Frontend files
│   ├── index.html                         # Main HTML page
│   ├── css/
│   │   └── styles.css                     # All styles
│   └── js/
│       └── app.js                         # Vanilla JavaScript logic
│
└── README-SERVER.md                       # This file
```

---

## 🔌 API Endpoints

### Auth Types

#### Get All Auth Types
```
GET /api/auth-types
```
Returns all authentication types from `auth-types-definition.json`

#### Get Specific Auth Type
```
GET /api/auth-types/:authTypeKey
```
Example: `/api/auth-types/oauth2_authorization_code`

---

### Software Templates

#### Get All Templates
```
GET /api/software-templates
```
Returns all software templates

#### Get Specific Template
```
GET /api/software-templates/:softwareId
```
Example: `/api/software-templates/salesforce`

#### Create Template
```
POST /api/software-templates
Content-Type: application/json

{
  "softwareId": "my-software",
  "softwareName": "My Software",
  "version": "1.0.0",
  "baseUrl": "https://api.example.com",
  "authMethods": [...]
}
```

#### Update Template
```
PUT /api/software-templates/:softwareId
Content-Type: application/json

{
  "softwareId": "my-software",
  ...
}
```

#### Delete Template
```
DELETE /api/software-templates/:softwareId
```

---

### Integrations

#### Get All Integrations
```
GET /api/integrations
```
Returns all integrations from registry

**Query Parameters:**
- `category` (optional): Filter by category (e.g., `crm`, `payment`)
- `status` (optional): Filter by status (`active`, `inactive`)

#### Get Integration Details
```
GET /api/integrations/:id
```
Example: `/api/integrations/salesforce`

#### Get Integration Auth Schema
```
GET /api/integrations/:id/auth-schema
```
Returns merged auth schema (global auth types + integration-specific)

#### Create Integration
```
POST /api/integrations
Content-Type: application/json

{
  "basicInfo": {
    "id": "salesforce",
    "displayName": "Salesforce",
    "category": "crm",
    "description": "CRM platform"
  },
  "authSettings": {
    "authMethods": [...]
  }
}
```

#### Update Integration
```
PUT /api/integrations/:id
```

#### Delete Integration
```
DELETE /api/integrations/:id
```

---

### User Management

#### Get All Users
```
GET /api/users
```
Returns all active users

**Query Parameters:**
- `status` (optional): Filter by status (`active`, `inactive`)

#### Get User by ID
```
GET /api/users/:userId
```
Example: `/api/users/user_123`

**Response:**
```json
{
  "success": true,
  "user": {
    "userId": "user_123",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "status": "active"
  }
}
```

#### Create User
```
POST /api/users
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john.doe@example.com"
}
```

#### Update User
```
PUT /api/users/:userId
```

#### Delete User (Soft Delete)
```
DELETE /api/users/:userId
```
Sets user status to `inactive` instead of permanently deleting

---

### Connection Management

#### Create Connection
```
POST /api/user-integrations/connect
Content-Type: application/json

{
  "userId": "user_123",
  "integrationId": "salesforce",
  "authMethodId": "oauth2",
  "connectionName": "Salesforce Production",
  "configuredVariables": {
    "instance_url": "https://mycompany.salesforce.com"
  },
  "credentials": {
    "clientId": "abc123",
    "clientSecret": "secret123"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Connection created successfully",
  "connectionId": "conn_abc123xyz"
}
```

#### Get User Connections
```
GET /api/user-integrations/my-connections?userId=user_123
```

**Query Parameters:**
- `userId` (required): User ID
- `status` (optional): Filter by status (`active`, `inactive`)
- `integrationId` (optional): Filter by integration

**Response:**
```json
{
  "success": true,
  "connections": [...],
  "stats": {
    "active": 3,
    "total": 5,
    "recent": 1
  }
}
```

#### Get Connection by ID
```
GET /api/user-integrations/:connectionId
```
Example: `/api/user-integrations/conn_abc123xyz`

#### Update Connection
```
PUT /api/user-integrations/:connectionId
Content-Type: application/json

{
  "connectionName": "Salesforce Production v2",
  "configuredVariables": {...},
  "credentials": {...}
}
```

#### Delete Connection (Soft Delete)
```
DELETE /api/user-integrations/:connectionId
```
Sets connection status to `inactive` and `isActive` to `false`

#### Test Connection
```
POST /api/user-integrations/:connectionId/test
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Connection test successful",
  "testResult": {
    "status": "success",
    "statusCode": 200,
    "responseTime": 245
  }
}
```

**Response (Failure):**
```json
{
  "success": false,
  "message": "Connection test failed",
  "testResult": {
    "status": "error",
    "errorMessage": "Invalid credentials"
  }
}
```

---

## 🎨 Frontend Architecture

### Pure JavaScript (No React!)

The frontend uses **vanilla JavaScript** with modern ES6+ features:

- **Fetch API** for HTTP requests
- **DOM Manipulation** for dynamic UI
- **Event Delegation** for efficient event handling
- **Async/Await** for async operations
- **Template Literals** for HTML generation

### Key Files

**public/index.html**
- Main HTML structure
- Modal for saving templates
- Toast notifications

**public/css/styles.css**
- Responsive design
- Modern UI with gradients
- Modal and toast styles
- Mobile-friendly

**public/js/app.js**
- Dynamic form generation
- API communication
- State management
- Event handling

---

## 🔧 Features

### ✅ Dynamic Form Generation
- Reads `auth-types-definition.json` via API
- Generates forms based on field types
- Supports: string, number, boolean, array, object

### ✅ Array Support
- **Simple arrays**: Like OAuth scopes (just strings)
- **Complex arrays**: Like custom headers (with itemSchema)

### ✅ Real-time Output
- Live JSON preview
- Copy to clipboard
- Download as file

### ✅ Template Management
- Save configuration as software template
- Templates stored as JSON files
- CRUD operations via API

---

## 🎯 How It Works

### Admin Flow:

1. **Open** http://localhost:3000
2. **Select** auth type from sidebar
3. **Configure** settings in dynamic form
4. **Preview** JSON output
5. **Save** as software template

### Behind the Scenes:

```
Browser                    Server                    Files
  │                         │                         │
  │──GET /api/auth-types──>│                         │
  │                         │──read──>auth-types-definition.json
  │<────JSON response───────│                         │
  │                         │                         │
  │──POST /api/software-templates──>│                │
  │  (with configuration)   │                         │
  │                         │──write──>example-software-template-xyz.json
  │<────Success────────────│                         │
```

---

## 🧪 Testing

### Test Auth Types Loading
```bash
curl http://localhost:3000/api/auth-types
```

### Test Template Creation
```bash
curl -X POST http://localhost:3000/api/software-templates \
  -H "Content-Type: application/json" \
  -d '{
    "softwareId": "test",
    "softwareName": "Test Software",
    "version": "1.0.0",
    "authMethods": []
  }'
```

### Test Template Retrieval
```bash
curl http://localhost:3000/api/software-templates/test
```

---

## 🛠️ Development

### File Watching (nodemon)
```bash
npm run dev
```
Server automatically restarts on file changes.

### Adding New Auth Type

1. Edit `auth-types-definition.json`
2. Add new auth type with `configOptions` and `credentialFields`
3. Restart server (or it auto-restarts with nodemon)
4. Refresh browser - new type appears automatically!

### Modifying Frontend

Edit files in `public/`:
- `public/index.html` - HTML structure
- `public/css/styles.css` - Styles
- `public/js/app.js` - JavaScript logic

No build step needed! Just refresh browser.

---

## 📦 Dependencies

### Production
- **express**: Web server framework
- **cors**: Enable CORS for API

### Development
- **nodemon**: Auto-restart server on changes

---

## 🌐 CORS Configuration

CORS is enabled for all origins in development. For production:

```javascript
// In server.js, replace:
app.use(cors());

// With:
app.use(cors({
  origin: 'https://your-production-domain.com'
}));
```

---

## 🚨 Troubleshooting

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Cannot Load Auth Types
- Check `auth-types-definition.json` exists
- Check JSON is valid
- Check server console for errors

### Template Not Saving
- Check file permissions
- Check `softwareId` is valid (lowercase, no spaces)
- Check server console for errors

---

## 🎨 Customization

### Change Port
Edit `server.js`:
```javascript
const PORT = 3000; // Change to your port
```

### Change API Base URL
Edit `public/js/app.js`:
```javascript
const API_BASE = 'http://localhost:3000/api'; // Update URL
```

### Add More API Endpoints
Edit `server.js`, add routes:
```javascript
app.get('/api/your-endpoint', (req, res) => {
    // Your logic
});
```

---

## 📝 Next Steps

1. ✅ Server setup complete
2. ✅ Frontend with vanilla JS
3. ⏳ Add user credential form generator
4. ⏳ Add database for storing user credentials
5. ⏳ Add authentication execution logic
6. ⏳ Add API request builder with auth injection

---

## 💡 Tips

- Keep `auth-types-definition.json` as single source of truth
- Template files are auto-generated from UI
- All frontend logic is in vanilla JS (no frameworks!)
- Server is stateless - all data in JSON files
- Easy to migrate to database later

---

**Happy Coding! 🚀**
