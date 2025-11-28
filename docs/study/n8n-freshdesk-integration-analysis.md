# n8n Freshdesk Integration - Complete Analysis

## 📊 Overview

This document provides a comprehensive analysis of how n8n implements the Freshdesk integration, including file structure, authentication methods, and implementation patterns.

---

## 🗂️ File Structure in n8n Repository

The Freshdesk integration files are located in the n8n repository at:

```
n8n/packages/nodes-base/
├── credentials/
│   └── FreshdeskApi.credentials.ts       ← Authentication configuration
│
└── nodes/Freshdesk/
    ├── Freshdesk.node.ts                 ← Main node file (operations)
    ├── Freshdesk.node.json               ← Node metadata
    ├── GenericFunctions.ts               ← API request implementation
    ├── ContactDescription.ts             ← Contact-related operations
    ├── ContactInterface.ts               ← TypeScript interfaces
    ├── freshdesk.svg                     ← Icon
    └── __schema__/v1.0.0/                ← Version schema
```

---

## 🔐 Freshdesk Authentication Method

**Authentication Type: API Key Authentication (HTTP Basic Auth format)**

### Required Fields

1. **API Key** - Password-protected string credential
2. **Domain** - Your Freshdesk subdomain
   - Example: "company" from "https://company.freshdesk.com"

### Authentication Format

Freshdesk uses HTTP Basic Authentication with a specific format:
- The API key is appended with `:X`
- This string is Base64 encoded
- Sent in the Authorization header

```
Format: Authorization: Base64(apiKey:X)
```

---

## 📝 File-wise Information Breakdown

### 1. FreshdeskApi.credentials.ts (Authentication Configuration)

**Location**: `packages/nodes-base/credentials/FreshdeskApi.credentials.ts`

**Purpose**: Defines the authentication fields required by users

**Content**:
```typescript
import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class FreshdeskApi implements ICredentialType {
  name = 'freshdeskApi';
  displayName = 'Freshdesk API';
  documentationUrl = 'freshdesk';

  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
    },
    {
      displayName: 'Domain',
      name: 'domain',
      type: 'string',
      placeholder: 'company',
      description: 'If the URL you get displayed on Freshdesk is "https://company.freshdesk.com" enter "company"',
      default: '',
    },
  ];
}
```

**Information Stored**:
- API Key field configuration
- Domain field configuration
- Field types and validation
- Help text and placeholders
- Documentation URL reference

---

### 2. Freshdesk.node.ts (Main Node File)

**Location**: `packages/nodes-base/nodes/Freshdesk/Freshdesk.node.ts`

**Purpose**: Main node implementation with operations and UI configuration

**Key Components**:

```typescript
credentials: [
  {
    name: 'freshdeskApi',
    required: true,
  },
],
```

**Information Stored**:
- Node display name and description
- Icon reference
- Version information
- Supported resources (Contact, Ticket)
- Operations (Create, Update, Delete, Get, GetAll)
- Input properties and field configurations
- Credential requirements
- Resource and operation mappings

**Operations Flow**:
- Delegates to resource-specific description files (ContactDescription.ts)
- Uses GenericFunctions for API calls
- Handles different resources (contacts, tickets, etc.)

---

### 3. GenericFunctions.ts (API Implementation)

**Location**: `packages/nodes-base/nodes/Freshdesk/GenericFunctions.ts`

**Purpose**: Core API request implementation and authentication handling

**Key Functions**:

#### `freshdeskApiRequest()`
Main function for making API requests:

```typescript
export async function freshdeskApiRequest(
  this: IExecuteFunctions | ILoadOptionsFunctions,
  method: string,
  resource: string,
  body: any = {},
  query: IDataObject = {},
): Promise<any> {
  // Retrieve credentials
  const credentials = await this.getCredentials('freshdeskApi');

  // Create API key in Basic Auth format
  const apiKey = `${credentials.apiKey}:X`;

  // Prepare request options
  const options: OptionsWithUri = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `${Buffer.from(apiKey).toString(BINARY_ENCODING)}`,
    },
    method,
    body,
    qs: query,
    uri: `https://${credentials.domain}.freshdesk.com/api/v2${resource}`,
    json: true,
  };

  // Make request
  return this.helpers.request(options);
}
```

#### `freshdeskApiRequestAllItems()`
Handles paginated API responses:

```typescript
export async function freshdeskApiRequestAllItems(
  this: IExecuteFunctions | ILoadOptionsFunctions,
  method: string,
  endpoint: string,
  body: any = {},
  query: IDataObject = {},
): Promise<any> {
  // Implements pagination using Link header
  // Recursively fetches all pages
  // Returns combined results
}
```

**Information Stored**:
- API authentication implementation
- HTTP request construction
- Error handling logic
- Pagination support
- Base URL construction
- Header configuration

---

### 4. ContactDescription.ts (Resource Configuration)

**Location**: `packages/nodes-base/nodes/Freshdesk/ContactDescription.ts`

**Purpose**: Defines all fields and operations for the Contact resource

**Information Stored**:
- Contact resource operations (Create, Update, Delete, Get, GetAll)
- Field definitions for each operation
- Required vs optional fields
- Field types and validation rules
- Default values
- Help text and descriptions
- Field dependencies and conditional display

---

### 5. ContactInterface.ts (Type Definitions)

**Location**: `packages/nodes-base/nodes/Freshdesk/ContactInterface.ts`

**Purpose**: TypeScript interfaces for type safety

**Information Stored**:
- TypeScript interface definitions
- Data structure contracts
- Type constraints

---

### 6. Freshdesk.node.json (Node Metadata)

**Location**: `packages/nodes-base/nodes/Freshdesk/Freshdesk.node.json`

**Purpose**: Node metadata and categorization

**Information Stored**:
- Node categories
- Keywords for search
- Classification information
- Integration metadata

---

## 🔧 Authentication Implementation Details

### Step 1: Credential Definition
In `FreshdeskApi.credentials.ts`:
- Defines two fields: `apiKey` and `domain`
- API key is marked as password type (hidden input)
- Domain has placeholder text and help description

### Step 2: Credential Retrieval
In `GenericFunctions.ts`:
```typescript
const credentials = await this.getCredentials('freshdeskApi');
```

### Step 3: Authentication Header Construction
```typescript
// Format: apiKey:X
const apiKey = `${credentials.apiKey}:X`;

// Base64 encode
const authHeader = Buffer.from(apiKey).toString('base64');

// Add to headers
headers: {
  'Content-Type': 'application/json',
  'Authorization': authHeader
}
```

### Step 4: Base URL Construction
```typescript
uri: `https://${credentials.domain}.freshdesk.com/api/v2${endpoint}`
```

### Step 5: Request Execution
The request is made using n8n's helper functions with all authentication headers included.

---

## 📊 Information Distribution Summary

| File | Information Type | Purpose |
|------|-----------------|---------|
| **FreshdeskApi.credentials.ts** | Authentication fields | User credential configuration |
| **Freshdesk.node.ts** | Operations & resources | Main node logic and UI |
| **GenericFunctions.ts** | API implementation | HTTP requests & auth handling |
| **ContactDescription.ts** | Field definitions | Resource-specific config |
| **ContactInterface.ts** | Type definitions | TypeScript type safety |
| **Freshdesk.node.json** | Metadata | Node categorization |

---

## 🎯 Key Patterns for Integration Platform

### Pattern 1: Separation of Concerns
- **Credentials** in separate file
- **Operations** in main node file
- **API logic** in generic functions
- **Resource definitions** in description files

### Pattern 2: Authentication Flow
```
User Input (UI)
  → Credential Storage
    → Credential Retrieval
      → Header Construction
        → API Request
```

### Pattern 3: Modular Structure
- Each resource (Contact, Ticket) has its own description file
- Generic functions are reusable across resources
- Interfaces provide type safety

---

## 🔄 Comparison with Our Implementation

### Similarities
Both use file-based configuration:
- **n8n**: Separate TypeScript files
- **Our Platform**: JSON schema files

Both separate concerns:
- **n8n**: credentials.ts, node.ts, GenericFunctions.ts
- **Our Platform**: auth.schema.json, features.schema.json, ratelimits.json

### Differences

| Aspect | n8n | Our Platform |
|--------|-----|--------------|
| File Format | TypeScript (.ts) | JSON (.json) |
| Credential Storage | In-memory/database | Elasticsearch (encrypted) |
| Configuration | Code-based | Configuration-based |
| Authentication Logic | In GenericFunctions.ts | In backend API routes |
| Extensibility | Requires code changes | JSON configuration changes |

---

## 💡 Implementation Insights

### 1. Freshdesk API Key Usage
- API key is treated as username in Basic Auth
- Password is always "X"
- Format: `Authorization: Base64(apiKey:X)`

### 2. Base URL Construction
- Domain is customizable per user
- Format: `https://{domain}.freshdesk.com/api/v2`
- Endpoint paths are appended to base URL

### 3. Error Handling
- Uses n8n's `NodeApiError` for consistent error reporting
- Wraps underlying HTTP errors with context

### 4. Pagination Support
- Uses HTTP Link headers for pagination
- Recursively fetches all pages
- Combines results into single array

---

## 📖 References

- **n8n Repository**: https://github.com/n8n-io/n8n
- **Freshdesk Node Location**: `packages/nodes-base/nodes/Freshdesk/`
- **Credentials Location**: `packages/nodes-base/credentials/FreshdeskApi.credentials.ts`
- **Freshdesk API Documentation**: https://developers.freshdesk.com/api/

---

## 📅 Document Information

- **Created**: November 21, 2025
- **Analysis Source**: n8n GitHub Repository (master branch)
- **Version Analyzed**: Latest as of analysis date
- **Purpose**: Reference for building integration platform

---

## 🔑 Key Takeaways

1. **Authentication**: Freshdesk uses API Key with HTTP Basic Auth format
2. **File Structure**: Modular design with separation of concerns
3. **Implementation**: Generic functions handle all API requests
4. **Pattern**: Credential → Retrieval → Header → Request flow
5. **Extensibility**: Resource-specific files for easy additions

This analysis provides insights for implementing similar patterns in our integration platform while maintaining flexibility and security.
