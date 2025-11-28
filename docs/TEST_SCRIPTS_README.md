# Test Scripts for Dynamic Variables

This document describes the test scripts available for testing dynamic variables functionality.

## Available Test Scripts

### 1. test-dynamic-variables.js

**Purpose**: Tests all utility functions for dynamic variables.

**Run**:
```bash
node test-dynamic-variables.js
```

**What it tests**:
- ✅ HubSpot configuration validation
- ✅ Variables summary and statistics
- ✅ Variable replacement with values
- ✅ Variable replacement with missing values
- ✅ Variable extraction from strings
- ✅ Freshdesk configuration validation

**Output**:
- Validation results for each integration
- Summary of used and unused variables
- Examples of variable replacement
- List of extracted variables from URLs

**Example Output**:
```
🧪 Testing Dynamic Variables Utility
============================================================

📋 Test 1: Validate HubSpot Configuration
------------------------------------------------------------
✅ Validation Result: Valid: true
✅ No validation errors found!

📊 Test 2: Variables Summary
------------------------------------------------------------
Auth Method 1: OAuth 2.0 - Authorization Code
  Total Variables Used: 2
  Total Fields Defined: 2

  Variables:
    ✅ {{company}} - Used in: tokenUrl
    ✅ {{domain}} - Used in: refreshTokenUrl
```

---

### 2. test-api-validation.js

**Purpose**: Tests API endpoint validation for dynamic variables.

**Prerequisites**: Server must be running on port 3000.

**Run**:
```bash
# Start server first (in another terminal)
npm start

# Then run test
node test-api-validation.js
```

**What it tests**:
- ❌ Creating integration with invalid dynamic variables
- ✅ Creating integration with valid dynamic variables
- ❌ Updating integration with typo in variable name

**Output**:
- HTTP status codes
- Full API responses
- Validation error details
- Success confirmations

**Example Output**:
```
🧪 Testing API Validation for Dynamic Variables
============================================================

📋 Test 1: Create Integration with INVALID dynamic variables
------------------------------------------------------------
Status Code: 400
Response: {
  "success": false,
  "error": "Invalid dynamic variables in authentication configuration",
  "validationErrors": [
    {
      "authMethodIndex": 0,
      "authMethodLabel": "OAuth 2.0",
      "variable": "invalid_field",
      "usedIn": ["authorizationUrl"],
      "message": "Invalid dynamic variable '{{invalid_field}}' found in: authorizationUrl. Available fields: domain"
    }
  ]
}
✅ Validation correctly rejected invalid variables!
```

---

## Running All Tests

To run all tests in sequence:

```bash
# Terminal 1: Start server
npm start

# Terminal 2: Run tests
node test-dynamic-variables.js && node test-api-validation.js
```

## Test Coverage

### Utility Functions (test-dynamic-variables.js)

| Function | Tested | Status |
|----------|--------|--------|
| `extractDynamicVariables()` | ✅ | Pass |
| `extractVariablesFromAuthMethod()` | ✅ | Pass |
| `getAvailableFields()` | ✅ | Pass |
| `validateDynamicVariables()` | ✅ | Pass |
| `validateAuthSchema()` | ✅ | Pass |
| `replaceDynamicVariables()` | ✅ | Pass |
| `getVariablesSummary()` | ✅ | Pass |
| `findSimilarField()` | ✅ | Pass (via typo detection) |

### API Endpoints (test-api-validation.js)

| Endpoint | Method | Scenario | Status |
|----------|--------|----------|--------|
| `/api/integrations` | POST | Invalid variables | ✅ Returns 400 |
| `/api/integrations` | POST | Valid variables | ✅ Returns 200 |
| `/api/integrations/:id` | PUT | Typo in variable | ✅ Returns 400 with suggestion |

## Creating New Tests

### Adding Tests to test-dynamic-variables.js

```javascript
// Add at the end before final console.log
console.log('\n\n📋 Test X: Your Test Name');
console.log('-'.repeat(60));

// Your test code here
const result = dynamicVariables.yourFunction(testData);

console.log('\nResult:', result);

if (/* success condition */) {
    console.log('✅ Test passed!');
} else {
    console.log('❌ Test failed!');
}
```

### Adding Tests to test-api-validation.js

```javascript
// Add before runTests() closing brace
console.log('\n\n📋 Test X: Your Test Name');
console.log('-'.repeat(60));

const testData = {
    // Your test data
};

try {
    const response = await makeRequest('POST', '/api/integrations', testData);

    console.log('\nStatus Code:', response.statusCode);
    console.log('Response:', JSON.stringify(response.body, null, 2));

    if (response.statusCode === 200) {
        console.log('\n✅ Test passed!');
    } else {
        console.log('\n❌ Test failed!');
    }
} catch (error) {
    console.error('Error:', error.message);
}
```

## Test Data Locations

Test data comes from:
- `integrations/providers/hubspot/auth.schema.json`
- `integrations/providers/freshdesk/auth.schema.json`
- Inline test data in test scripts

## Troubleshooting Tests

### Test Script Won't Run

**Problem**: `Cannot find module './utils/dynamicVariables'`

**Solution**:
```bash
# Make sure you're in the project root
cd /path/to/integrations
node test-dynamic-variables.js
```

### API Tests Failing

**Problem**: `ECONNREFUSED` error

**Solution**:
```bash
# Start the server first
npm start

# Wait for "Server running on: http://localhost:3000"
# Then run tests in another terminal
node test-api-validation.js
```

### Server Port Already in Use

**Problem**: Port 3000 is already in use

**Solution**:
```bash
# Kill existing process
lsof -ti:3000 | xargs kill -9

# Start server again
npm start
```

## Continuous Integration

To integrate these tests in CI/CD:

```yaml
# .github/workflows/test.yml
name: Test Dynamic Variables

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm start & # Start server in background
      - run: sleep 5 # Wait for server
      - run: node test-dynamic-variables.js
      - run: node test-api-validation.js
```

## Additional Resources

- [DYNAMIC_VARIABLES.md](./DYNAMIC_VARIABLES.md) - Complete documentation
- [utils/dynamicVariables.js](./utils/dynamicVariables.js) - Utility functions
- [server.js](./server.js) - API validation implementation
