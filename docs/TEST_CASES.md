# Integration Platform - Test Cases

## 1. User Management Tests

### 1.1 Create User
**Test Case ID**: TC-USER-001
**Priority**: High
**Prerequisites**: Access to Users page at `/users.html`

**Steps**:
1. Navigate to `/users.html`
2. Click "Add User" button
3. Enter Name: "Test User"
4. Enter Email: "testuser@example.com"
5. Select Status: "Active"
6. Click "Create User"

**Expected Result**:
- User is created successfully
- Success toast message appears
- User appears in the users table
- Modal closes automatically

**Test Data**:
```json
{
  "name": "Test User",
  "email": "testuser@example.com",
  "status": "active"
}
```

---

### 1.2 Create User with Duplicate Email
**Test Case ID**: TC-USER-002
**Priority**: High
**Prerequisites**: User with email "testuser@example.com" already exists

**Steps**:
1. Navigate to `/users.html`
2. Click "Add User" button
3. Enter Name: "Another User"
4. Enter Email: "testuser@example.com" (duplicate)
5. Select Status: "Active"
6. Click "Create User"

**Expected Result**:
- Error message: "A user with this email already exists"
- User is NOT created
- Modal remains open
- Existing user list unchanged

---

### 1.3 Create User with Invalid Email
**Test Case ID**: TC-USER-003
**Priority**: Medium

**Steps**:
1. Navigate to `/users.html`
2. Click "Add User" button
3. Enter Name: "Test User"
4. Enter Email: "invalid-email" (no @ symbol)
5. Click "Create User"

**Expected Result**:
- Error message: "Please enter a valid email address"
- User is NOT created
- Form validation highlights email field

---

### 1.4 Edit User
**Test Case ID**: TC-USER-004
**Priority**: High

**Steps**:
1. Navigate to `/users.html`
2. Click "Edit" button on any user
3. Modify Name to: "Updated User Name"
4. Click "Update User"

**Expected Result**:
- User details are updated in Elasticsearch
- Success message appears
- Table reflects updated name
- User email and creation date remain unchanged

---

### 1.5 Delete User
**Test Case ID**: TC-USER-005
**Priority**: High

**Steps**:
1. Navigate to `/users.html`
2. Click "Delete" button on a user
3. Confirm deletion in modal
4. Click "Delete User"

**Expected Result**:
- User status is set to "inactive" in Elasticsearch
- User disappears from the list
- Success message: "User deleted successfully"
- User is soft-deleted (data preserved with status='inactive')

---

### 1.6 View User Details
**Test Case ID**: TC-USER-006
**Priority**: Low

**Steps**:
1. Navigate to `/users.html`
2. Click "View" button on a user

**Expected Result**:
- Alert popup shows user details including:
  - Name
  - Email
  - Status
  - Created date
  - Updated date

---

## 2. Integration Marketplace Tests

### 2.1 View Available Integrations
**Test Case ID**: TC-MARKETPLACE-001
**Priority**: High
**Prerequisites**: At least one user exists

**Steps**:
1. Navigate to `/user-integrations.html`
2. Select a user from dropdown
3. Observe integration cards

**Expected Result**:
- All integrations from registry.json are displayed
- Each card shows:
  - Integration name
  - Description
  - Category badge
  - Connection status
  - Connect/View button

---

### 2.2 Filter by Category
**Test Case ID**: TC-MARKETPLACE-002
**Priority**: Medium

**Steps**:
1. Navigate to `/user-integrations.html`
2. Select a user
3. Click "CRM" category filter

**Expected Result**:
- Only CRM integrations are displayed
- Other categories are hidden
- Filter button shows active state
- Empty state appears if no CRM integrations exist

---

### 2.3 Search Integrations
**Test Case ID**: TC-MARKETPLACE-003
**Priority**: Medium

**Steps**:
1. Navigate to `/user-integrations.html`
2. Select a user
3. Type "Salesforce" in search box

**Expected Result**:
- Only integrations matching "Salesforce" are shown
- Search is case-insensitive
- Searches both name and description
- Empty state appears if no matches

---

### 2.4 Filter by Connection Status
**Test Case ID**: TC-MARKETPLACE-004
**Priority**: Medium

**Steps**:
1. Navigate to `/user-integrations.html`
2. Select a user who has connected integrations
3. Click "Connected Only" filter

**Expected Result**:
- Only connected integrations are displayed
- Cards have "✓ Connected" badge
- "View" button instead of "Connect"

---

### 2.5 No User Selected State
**Test Case ID**: TC-MARKETPLACE-005
**Priority**: High

**Steps**:
1. Navigate to `/user-integrations.html`
2. Don't select any user

**Expected Result**:
- Empty state message: "No User Selected"
- Message: "Please select a user from the dropdown above"
- No integration cards displayed

---

## 3. Connection Wizard Tests

### 3.1 Start Connection Flow
**Test Case ID**: TC-WIZARD-001
**Priority**: High
**Prerequisites**: User selected, integration not connected

**Steps**:
1. Navigate to `/user-integrations.html`
2. Select a user
3. Click "Connect" on Salesforce integration

**Expected Result**:
- Redirected to `/connect-integration.html?integrationId=salesforce&userId={userId}`
- Wizard shows Step 1: Select Auth Method
- Page title shows integration name
- Progress indicators show 4 steps with Step 1 active

---

### 3.2 Step 1 - Select OAuth2 Auth Method
**Test Case ID**: TC-WIZARD-002
**Priority**: High
**Prerequisites**: Wizard opened for Salesforce

**Steps**:
1. On Step 1, click "OAuth 2.0" auth method card
2. Click "Next" button

**Expected Result**:
- OAuth2 card highlights with blue border
- Card background changes to light blue
- Progress moves to Step 2
- Step 1 marked as completed (green checkmark)

---

### 3.3 Step 1 - No Auth Method Selected
**Test Case ID**: TC-WIZARD-003
**Priority**: High

**Steps**:
1. On Step 1, don't select any auth method
2. Click "Next" button

**Expected Result**:
- Error toast: "Please select an authentication method"
- Wizard remains on Step 1
- Progress indicator unchanged

---

### 3.4 Step 2 - Configure Dynamic Variables
**Test Case ID**: TC-WIZARD-004
**Priority**: High
**Prerequisites**: Auth method selected, integration has dynamic variables

**Test Data**:
```
Base URL: https://{{company}}.salesforce.com/services/oauth2
```

**Steps**:
1. Reach Step 2
2. Observe form fields
3. Enter "mycompany" in company field
4. Click "Next"

**Expected Result**:
- Form shows input field for "company" variable
- Help text explains: "This will replace {{company}} in API requests"
- Field is marked as required
- Validation passes
- Progress moves to Step 3

---

### 3.5 Step 2 - Empty Dynamic Variables
**Test Case ID**: TC-WIZARD-005
**Priority**: High

**Steps**:
1. Reach Step 2
2. Leave dynamic variable field empty
3. Click "Next"

**Expected Result**:
- Error toast: "Please fill all dynamic variables"
- Empty field highlighted in red
- Wizard remains on Step 2

---

### 3.6 Step 2 - No Dynamic Variables Required
**Test Case ID**: TC-WIZARD-006
**Priority**: Medium
**Prerequisites**: Integration with no dynamic variables (base URL has no {{variables}})

**Steps**:
1. Connect to integration with static base URL
2. Reach Step 2

**Expected Result**:
- Message: "No dynamic variables required for this integration"
- "Next" button proceeds to Step 3 immediately

---

### 3.7 Step 3 - Enter Credentials
**Test Case ID**: TC-WIZARD-007
**Priority**: High
**Prerequisites**: OAuth2 auth method selected

**Test Data**:
```json
{
  "client_id": "test_client_id_123",
  "client_secret": "test_secret_abc",
  "redirect_uri": "https://myapp.com/callback"
}
```

**Steps**:
1. Reach Step 3
2. Enter client_id
3. Enter client_secret (masked input)
4. Enter redirect_uri
5. Click "Next"

**Expected Result**:
- Form shows 3 fields based on OAuth2 requiredFields
- client_secret field is type="password" (masked)
- All fields marked as required
- Validation passes
- Progress moves to Step 4

---

### 3.8 Step 3 - Missing Credentials
**Test Case ID**: TC-WIZARD-008
**Priority**: High

**Steps**:
1. Reach Step 3
2. Leave client_secret field empty
3. Click "Next"

**Expected Result**:
- Error toast: "Please fill all credential fields"
- Empty fields highlighted in red
- Wizard remains on Step 3

---

### 3.9 Step 4 - Review Configuration
**Test Case ID**: TC-WIZARD-009
**Priority**: High

**Steps**:
1. Complete Steps 1-3
2. Reach Step 4
3. Observe review details

**Expected Result**:
- Shows integration name
- Shows selected auth method
- Shows number of dynamic variables configured
- Shows number of credential fields provided
- "Test Connection" button visible
- "Save Connection" button visible

---

### 3.10 Step 4 - Test Connection Success
**Test Case ID**: TC-WIZARD-010
**Priority**: High

**Steps**:
1. Reach Step 4
2. Click "Test Connection" button
3. Wait for response

**Expected Result**:
- Button shows "Testing..." state
- Test result appears with green background
- Message: "✓ Connection test successful! You can now save the connection."
- Button returns to normal state

**API Call**:
```
POST /api/user-integrations/test-connection
{
  "integrationId": "salesforce",
  "authMethodId": "oauth2_auth_code",
  "configuredVariables": { "company": "mycompany" },
  "credentials": { "client_id": "...", "client_secret": "...", "redirect_uri": "..." }
}
```

---

### 3.11 Step 4 - Save Connection
**Test Case ID**: TC-WIZARD-011
**Priority**: High

**Steps**:
1. Reach Step 4
2. Click "Save Connection" button

**Expected Result**:
- Button shows "Saving..." state
- Connection saved to Elasticsearch with:
  - Both encrypted and decrypted credentials
  - Configured variables
  - Status: 'active'
  - isActive: true
- Success toast appears
- Redirected back to `/user-integrations.html?userId={userId}`
- Integration now shows "✓ Connected" status

**Database Validation**:
```json
{
  "connectionId": "conn_...",
  "userId": "user_...",
  "integrationId": "salesforce",
  "integrationName": "Salesforce",
  "authMethodId": "oauth2_auth_code",
  "authMethodLabel": "OAuth 2.0 Authorization Code",
  "configuredVariables": { "company": "mycompany" },
  "credentials": {
    "encrypted": "U2FsdGVkX1...",
    "decrypted": { "client_id": "...", "client_secret": "...", "redirect_uri": "..." }
  },
  "status": "active",
  "isActive": true,
  "createdAt": "2025-01-23T10:30:00.000Z"
}
```

---

### 3.12 Wizard - Previous Button Navigation
**Test Case ID**: TC-WIZARD-012
**Priority**: Medium

**Steps**:
1. Complete Step 1 and 2
2. On Step 3, click "Previous" button
3. Verify Step 2 loads with previously entered data

**Expected Result**:
- Returns to Step 2
- Previously entered dynamic variables are preserved
- Can modify values
- Progress indicator updates correctly

---

### 3.13 Wizard - Cancel Button
**Test Case ID**: TC-WIZARD-013
**Priority**: Low

**Steps**:
1. On any wizard step, click "Cancel" button

**Expected Result**:
- Returns to previous page (user-integrations.html)
- No connection saved
- Browser back navigation works

---

### 3.14 Wizard - Missing URL Parameters
**Test Case ID**: TC-WIZARD-014
**Priority**: High

**Steps**:
1. Navigate directly to `/connect-integration.html` (no URL params)

**Expected Result**:
- Error toast: "Missing required parameters. Redirecting..."
- Redirects to `/user-integrations.html` after 2 seconds

---

## 4. Integration Schema Tests

### 4.1 Load Auth Schema
**Test Case ID**: TC-SCHEMA-001
**Priority**: High

**Steps**:
1. API Call: `GET /api/integrations/salesforce/auth-schema`

**Expected Result**:
```json
{
  "authSchema": {
    "baseUrl": "https://{{company}}.salesforce.com",
    "authMethods": [
      {
        "id": "oauth2_auth_code",
        "label": "OAuth 2.0 Authorization Code",
        "authType": "oauth2_authorization_code",
        "requiredFields": ["client_id", "client_secret", "redirect_uri"],
        "description": "Standard OAuth 2.0 flow"
      }
    ]
  }
}
```

---

### 4.2 Auth Schema Not Found
**Test Case ID**: TC-SCHEMA-002
**Priority**: Medium

**Steps**:
1. API Call: `GET /api/integrations/nonexistent/auth-schema`

**Expected Result**:
- Status: 404
- Response: `{ "error": "Auth schema not found" }`

---

## 5. API Endpoint Tests

### 5.1 Get All Users
**Test Case ID**: TC-API-001
**Priority**: High

**API Call**: `GET /api/users`

**Expected Result**:
- Status: 200
- Returns array of users with status != 'inactive'
- Soft-deleted users NOT included

**Sample Response**:
```json
{
  "users": [
    {
      "userId": "user_123",
      "name": "Test User",
      "email": "testuser@example.com",
      "status": "active",
      "createdAt": "2025-01-23T10:00:00.000Z",
      "updatedAt": "2025-01-23T10:00:00.000Z"
    }
  ]
}
```

---

### 5.2 Create User
**Test Case ID**: TC-API-002
**Priority**: High

**API Call**:
```
POST /api/users
Content-Type: application/json

{
  "name": "New User",
  "email": "newuser@example.com",
  "status": "active"
}
```

**Expected Result**:
- Status: 200
- Response: `{ "success": true, "userId": "user_..." }`
- User created in Elasticsearch 'users' index
- Unique userId generated

---

### 5.3 Create User - Duplicate Email
**Test Case ID**: TC-API-003
**Priority**: High

**API Call**:
```
POST /api/users
{
  "name": "Another User",
  "email": "testuser@example.com"  // Already exists
}
```

**Expected Result**:
- Status: 409 Conflict
- Response: `{ "error": "A user with this email already exists" }`

---

### 5.4 Update User
**Test Case ID**: TC-API-004
**Priority**: High

**API Call**:
```
PUT /api/users/user_123
{
  "name": "Updated Name",
  "email": "testuser@example.com",
  "status": "inactive"
}
```

**Expected Result**:
- Status: 200
- Response: `{ "success": true, "message": "User updated successfully" }`
- User document updated in Elasticsearch
- updatedAt timestamp updated

---

### 5.5 Delete User
**Test Case ID**: TC-API-005
**Priority**: High

**API Call**: `DELETE /api/users/user_123`

**Expected Result**:
- Status: 200
- Response: `{ "success": true, "message": "User deleted successfully" }`
- User status set to 'inactive' (soft delete)
- User no longer appears in GET /api/users

---

### 5.6 Get User Connections
**Test Case ID**: TC-API-006
**Priority**: High

**API Call**: `GET /api/user-integrations/my-connections?userId=user_123`

**Expected Result**:
- Status: 200
- Returns array of active connections for the user

**Sample Response**:
```json
{
  "connections": [
    {
      "connectionId": "conn_456",
      "userId": "user_123",
      "integrationId": "salesforce",
      "integrationName": "Salesforce",
      "authMethodId": "oauth2_auth_code",
      "authMethodLabel": "OAuth 2.0",
      "status": "active",
      "isActive": true,
      "lastTestStatus": null,
      "createdAt": "2025-01-23T11:00:00.000Z"
    }
  ]
}
```

---

### 5.7 Create Connection
**Test Case ID**: TC-API-007
**Priority**: High

**API Call**:
```
POST /api/user-integrations/connect
{
  "userId": "user_123",
  "integrationId": "salesforce",
  "authMethodId": "oauth2_auth_code",
  "configuredVariables": { "company": "mycompany" },
  "credentials": {
    "client_id": "test_id",
    "client_secret": "test_secret",
    "redirect_uri": "https://app.com/callback"
  }
}
```

**Expected Result**:
- Status: 200
- Response: `{ "success": true, "connectionId": "conn_..." }`
- Connection saved with:
  - Encrypted credentials (using CryptoJS)
  - Decrypted credentials (for easy access)
  - Both stored in 'user_integration_connections' index

---

### 5.8 Test Connection (Before Save)
**Test Case ID**: TC-API-008
**Priority**: High

**API Call**:
```
POST /api/user-integrations/test-connection
{
  "integrationId": "salesforce",
  "authMethodId": "oauth2_auth_code",
  "configuredVariables": { "company": "mycompany" },
  "credentials": { "client_id": "...", "client_secret": "..." }
}
```

**Expected Result**:
- Status: 200
- Response:
```json
{
  "success": true,
  "message": "Connection configuration is valid",
  "baseUrl": "https://mycompany.salesforce.com"
}
```
- Dynamic variables replaced in baseUrl
- Validation performed

---

### 5.9 Delete Connection
**Test Case ID**: TC-API-009
**Priority**: High

**API Call**: `DELETE /api/user-integrations/conn_456`

**Expected Result**:
- Status: 200
- Response: `{ "success": true, "message": "Connection deleted successfully" }`
- Connection marked as inactive or deleted from Elasticsearch

---

## 6. Edge Cases and Error Handling

### 6.1 Network Timeout
**Test Case ID**: TC-ERROR-001
**Priority**: Medium

**Steps**:
1. Simulate slow network
2. Attempt to save connection
3. Wait for timeout

**Expected Result**:
- Loading state shows
- After timeout, error message appears
- User can retry
- No partial data saved

---

### 6.2 Elasticsearch Connection Failure
**Test Case ID**: TC-ERROR-002
**Priority**: High

**Steps**:
1. Stop Elasticsearch service
2. Attempt to create user

**Expected Result**:
- Error toast: "Failed to save user"
- Console logs error details
- User sees friendly error message
- Application doesn't crash

---

### 6.3 Invalid JSON in Auth Schema
**Test Case ID**: TC-ERROR-003
**Priority**: Medium

**Steps**:
1. Corrupt auth.schema.json for an integration
2. Attempt to load wizard

**Expected Result**:
- Error caught and logged
- User sees: "Failed to load authentication methods"
- Wizard doesn't crash

---

### 6.4 XSS Prevention
**Test Case ID**: TC-SECURITY-001
**Priority**: High

**Steps**:
1. Create user with name: `<script>alert('XSS')</script>`
2. View user in table

**Expected Result**:
- Script not executed
- HTML escaped: `&lt;script&gt;alert('XSS')&lt;/script&gt;`
- Uses `escapeHtml()` function

---

### 6.5 Large Dataset Performance
**Test Case ID**: TC-PERF-001
**Priority**: Low

**Steps**:
1. Create 1000+ users
2. Load users page
3. Measure load time

**Expected Result**:
- Page loads in < 3 seconds
- Pagination or virtual scrolling implemented if needed
- No browser freezing

---

## 7. UI/UX Tests

### 7.1 Responsive Design - Mobile
**Test Case ID**: TC-UI-001
**Priority**: Medium

**Steps**:
1. Open any page on mobile viewport (375px width)
2. Test all interactions

**Expected Result**:
- Sidebar collapses or becomes hamburger menu
- Tables scroll horizontally
- Buttons remain accessible
- Forms are usable
- Wizard steps may hide labels on mobile

---

### 7.2 Dark Sidebar Theme
**Test Case ID**: TC-UI-002
**Priority**: High

**Steps**:
1. Navigate to any page
2. Observe sidebar styling

**Expected Result**:
- Sidebar background: #1a1d29 (dark)
- Logo text: white
- Nav items: gray (#6b7280) by default
- Active nav item: white text, blue left border, gradient background
- Hover: slightly lighter gray

---

### 7.3 Button Consistency
**Test Case ID**: TC-UI-003
**Priority**: Medium

**Steps**:
1. Check all "Add"/"Connect" buttons across pages

**Expected Result**:
- All primary buttons use same style
- Blue background (#2563eb)
- SVG "+" icon (18x18px)
- White text
- Consistent padding (10px 20px)

---

### 7.4 Toast Notifications
**Test Case ID**: TC-UI-004
**Priority**: Medium

**Steps**:
1. Trigger various actions (success, error)
2. Observe toast messages

**Expected Result**:
- Success: Green background
- Error: Red background
- Auto-dismiss after 3 seconds
- Clear, actionable messages
- Appears at consistent position

---

## 8. Data Validation Tests

### 8.1 Email Format Validation
**Test Cases**:
- `valid@email.com` ✓ Valid
- `test.user+tag@example.co.uk` ✓ Valid
- `invalid.email` ✗ Invalid
- `@example.com` ✗ Invalid
- `user@` ✗ Invalid
- `user @example.com` ✗ Invalid (space)

---

### 8.2 Dynamic Variable Replacement
**Test Case ID**: TC-DATA-001
**Priority**: High

**Input**:
```
Base URL: https://{{company}}.{{environment}}.example.com/api/v{{version}}
Variables: { company: "acme", environment: "prod", version: "2" }
```

**Expected Output**:
```
https://acme.prod.example.com/api/v2
```

---

### 8.3 Credential Encryption
**Test Case ID**: TC-SECURITY-002
**Priority**: Critical

**Steps**:
1. Save connection with credentials
2. Query Elasticsearch directly
3. Check credentials.encrypted field

**Expected Result**:
- Encrypted field contains AES-encrypted string starting with "U2FsdGVk"
- Decrypted field contains plain credentials
- Cannot reverse encrypted string without secret key

---

## 9. Regression Test Suite

Run after any major changes:

1. ✅ Create, edit, delete user
2. ✅ View integrations marketplace
3. ✅ Complete full connection wizard
4. ✅ Test connection
5. ✅ View saved connections
6. ✅ Delete connection
7. ✅ Filter and search integrations
8. ✅ Check all navigation links
9. ✅ Verify sidebar styling on all pages
10. ✅ Test form validations

---

## 10. Test Data Setup

### Sample Users
```json
[
  { "name": "John Doe", "email": "john@example.com", "status": "active" },
  { "name": "Jane Smith", "email": "jane@example.com", "status": "active" },
  { "name": "Test Admin", "email": "admin@test.com", "status": "active" }
]
```

### Sample Integrations (from registry.json)
- Salesforce (CRM)
- Stripe (Payment)
- HubSpot (CRM)
- Freshdesk (Communication)

### Sample Connection
```json
{
  "userId": "user_123",
  "integrationId": "salesforce",
  "authMethodId": "oauth2_auth_code",
  "configuredVariables": { "company": "testcompany" },
  "credentials": {
    "client_id": "test_client_123",
    "client_secret": "test_secret_abc",
    "redirect_uri": "https://app.com/callback"
  }
}
```

---

## Test Execution Notes

### Priority Levels
- **Critical**: Must pass before release
- **High**: Should pass before release
- **Medium**: Can be addressed in next iteration
- **Low**: Nice to have

### Test Environment
- Node.js version: 14+
- Elasticsearch version: 7.x or 8.x
- Browser: Chrome 90+, Firefox 88+, Safari 14+
- Screen resolutions: 1920x1080 (desktop), 375x667 (mobile)

### How to Execute
1. Start Elasticsearch: `docker-compose up -d`
2. Start server: `node server.js`
3. Open browser: `http://localhost:3000`
4. Follow test case steps
5. Document results in test report

### Automated Testing (Future)
Consider implementing:
- Jest for unit tests
- Cypress for E2E tests
- Postman collections for API tests
