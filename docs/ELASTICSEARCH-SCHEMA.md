# Elasticsearch Schema Documentation

**Last Updated:** 2025-11-23

---

## 🎯 Overview

This document provides comprehensive documentation for all Elasticsearch indices used in the User Connection Management System. Each index includes field mappings, data types, relationships, and usage examples.

---

## 📋 Table of Contents

1. [Configuration](#configuration)
2. [Index Overview](#index-overview)
3. [Users Index](#users-index)
4. [User Credentials Index](#user-credentials-index)
5. [User Integration Connections Index](#user-integration-connections-index)
6. [Integrations Registry Index](#integrations-registry-index)
7. [Relationships](#relationships)
8. [Query Examples](#query-examples)
9. [Best Practices](#best-practices)

---

## ⚙️ Configuration

### Connection Settings

```javascript
const ES_CONFIG = {
    node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    auth: {
        username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
        password: process.env.ELASTICSEARCH_PASSWORD || ''
    }
};
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ELASTICSEARCH_URL` | Elasticsearch cluster URL | `http://localhost:9200` |
| `ELASTICSEARCH_USERNAME` | Authentication username | `elastic` |
| `ELASTICSEARCH_PASSWORD` | Authentication password | (empty) |

---

## 📊 Index Overview

### Index Names

```javascript
const INDEXES = {
    USERS: 'users',
    USER_CREDENTIALS: 'user_credentials',
    USER_CONNECTIONS: 'user_integration_connections',
    INTEGRATIONS: 'integrations_registry'
};
```

### Index Summary

| Index Name | Purpose | Document Count (typical) |
|------------|---------|--------------------------|
| `users` | Store user profiles | 10-1000 |
| `user_credentials` | Store encrypted credentials (deprecated) | 0-100 |
| `user_integration_connections` | Store connection configurations | 100-10000 |
| `integrations_registry` | Cache integration metadata | 50-500 |

**Note:** `user_credentials` index is deprecated. Credentials are now stored directly in `user_integration_connections` index.

---

## 👥 Users Index

### Index Name
```
users
```

### Purpose
Store user profiles and account information for users who can create integration connections.

### Schema Mapping

```json
{
  "mappings": {
    "properties": {
      "userId": { "type": "keyword" },
      "name": { "type": "text" },
      "email": { "type": "keyword" },
      "status": { "type": "keyword" },
      "createdAt": { "type": "date" },
      "updatedAt": { "type": "date" }
    }
  }
}
```

### Field Descriptions

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `userId` | keyword | Yes | Unique identifier for the user (also the document ID) | `user_1732377600000_abc123xyz` |
| `name` | text | Yes | User's full name (searchable) | `John Doe` |
| `email` | keyword | Yes | User's email address (exact match) | `john.doe@example.com` |
| `status` | keyword | Yes | Account status | `active`, `inactive` |
| `createdAt` | date | Yes | ISO 8601 timestamp when user was created | `2025-11-23T10:00:00.000Z` |
| `updatedAt` | date | Yes | ISO 8601 timestamp when user was last updated | `2025-11-23T15:30:00.000Z` |

### Document Example

```json
{
  "userId": "user_1732377600000_abc123xyz",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "status": "active",
  "createdAt": "2025-11-23T10:00:00.000Z",
  "updatedAt": "2025-11-23T15:30:00.000Z"
}
```

### ID Generation

User IDs are generated using the following pattern:
```javascript
const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
```

**Format:** `user_{timestamp}_{random_string}`

**Example:** `user_1732377600000_k4j2n8m5p`

### Status Values

| Status | Description | Usage |
|--------|-------------|-------|
| `active` | User account is active | Default for new users |
| `inactive` | User account is deactivated | Soft delete |

### Operations

#### Create User
```javascript
await createUser({
  name: "John Doe",
  email: "john.doe@example.com",
  status: "active"
});
```

#### Get User
```javascript
const user = await getUserById("user_1732377600000_abc123xyz");
```

#### Update User
```javascript
await updateUser("user_1732377600000_abc123xyz", {
  name: "John Smith"
});
```

#### Delete User (Soft Delete)
```javascript
await deleteUser("user_1732377600000_abc123xyz");
// Sets status to 'inactive'
```

### Search Considerations

- **name**: Uses `text` type for full-text search
- **email**: Uses `keyword` type for exact matching
- **userId**: Uses `keyword` type for exact matching and efficient filtering

---

## 🔐 User Credentials Index (Deprecated)

### Index Name
```
user_credentials
```

### Purpose
**DEPRECATED:** Previously used to store encrypted user credentials separately. Credentials are now stored in `user_integration_connections` index.

### Schema Mapping

```json
{
  "mappings": {
    "properties": {
      "userId": { "type": "keyword" },
      "integrationId": { "type": "keyword" },
      "authMethodId": { "type": "keyword" },
      "credentials": { "type": "object", "enabled": false },
      "createdAt": { "type": "date" },
      "updatedAt": { "type": "date" },
      "isActive": { "type": "boolean" }
    }
  }
}
```

### Migration Note

This index is maintained for backward compatibility but is no longer actively used. All new connections store credentials directly in the `user_integration_connections` index.

---

## 🔗 User Integration Connections Index

### Index Name
```
user_integration_connections
```

### Purpose
Store complete connection configurations including user, integration, authentication method, credentials, dynamic variables, and test status.

### Schema Mapping

```json
{
  "mappings": {
    "properties": {
      "connectionId": { "type": "keyword" },
      "userId": { "type": "keyword" },
      "integrationId": { "type": "keyword" },
      "integrationName": { "type": "text" },
      "connectionName": { "type": "text" },
      "authMethodId": { "type": "keyword" },
      "authMethodLabel": { "type": "text" },
      "configuredVariables": { "type": "object" },
      "credentials": {
        "properties": {
          "encrypted": { "type": "object", "enabled": false },
          "decrypted": { "type": "object", "enabled": false }
        }
      },
      "status": { "type": "keyword" },
      "isActive": { "type": "boolean" },
      "lastTestStatus": { "type": "keyword" },
      "lastTestMessage": { "type": "text" },
      "lastTestDate": { "type": "date" },
      "createdAt": { "type": "date" },
      "updatedAt": { "type": "date" }
    }
  }
}
```

### Field Descriptions

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `connectionId` | keyword | Yes | Unique identifier for the connection (also the document ID) | `conn_1732377600000_abc123xyz` |
| `userId` | keyword | Yes | ID of the user who owns this connection | `user_1732377600000_xyz789abc` |
| `integrationId` | keyword | Yes | ID of the integration | `salesforce` |
| `integrationName` | text | Yes | Display name of the integration | `Salesforce` |
| `connectionName` | text | No | Custom name for the connection | `Salesforce Production` |
| `authMethodId` | keyword | Yes | Authentication method identifier | `oauth2` |
| `authMethodLabel` | text | Yes | Human-readable auth method name | `OAuth 2.0` |
| `configuredVariables` | object | No | Dynamic variables from baseUrl | `{"instance_url": "https://..."}` |
| `credentials.encrypted` | object | Yes | Encrypted credentials (not indexed) | `"U2FsdGVkX1..."` |
| `credentials.decrypted` | object | Yes | Decrypted credentials (not indexed) | `{"clientId": "...", "clientSecret": "..."}` |
| `status` | keyword | Yes | Connection status | `active`, `inactive`, `deleted` |
| `isActive` | boolean | Yes | Whether connection is active | `true`, `false` |
| `lastTestStatus` | keyword | No | Result of last connection test | `success`, `error`, `null` |
| `lastTestMessage` | text | No | Message from last test | `Connection successful` |
| `lastTestDate` | date | No | Timestamp of last test | `2025-11-23T15:45:00.000Z` |
| `createdAt` | date | Yes | ISO 8601 timestamp when connection was created | `2025-11-23T10:00:00.000Z` |
| `updatedAt` | date | Yes | ISO 8601 timestamp when connection was last updated | `2025-11-23T15:30:00.000Z` |

### Document Example

```json
{
  "connectionId": "conn_1732377600000_abc123xyz",
  "userId": "user_1732377600000_xyz789abc",
  "integrationId": "salesforce",
  "integrationName": "Salesforce",
  "connectionName": "Salesforce Production",
  "authMethodId": "oauth2",
  "authMethodLabel": "OAuth 2.0",
  "configuredVariables": {
    "instance_url": "https://mycompany.salesforce.com"
  },
  "credentials": {
    "encrypted": "U2FsdGVkX1+1234567890abcdefghijklmnopqrstuvwxyz...",
    "decrypted": {
      "clientId": "3MVG9...",
      "clientSecret": "1234567890ABCDEF"
    }
  },
  "status": "active",
  "isActive": true,
  "lastTestStatus": "success",
  "lastTestMessage": "Connection successful",
  "lastTestDate": "2025-11-23T15:45:00.000Z",
  "createdAt": "2025-11-20T10:00:00.000Z",
  "updatedAt": "2025-11-23T15:45:00.000Z"
}
```

### ID Generation

Connection IDs are generated using the following pattern:
```javascript
const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
```

**Format:** `conn_{timestamp}_{random_string}`

**Example:** `conn_1732377600000_k4j2n8m5p`

### Status Values

| Status | Description | Usage |
|--------|-------------|-------|
| `active` | Connection is active and ready to use | Default for new connections |
| `inactive` | Connection is temporarily disabled | User deactivation |
| `deleted` | Connection is soft-deleted | Soft delete operation |

### Credential Storage

Credentials are stored in a nested object with two properties:

#### `credentials.encrypted`
- Contains encrypted credential string
- Encrypted using AES-256-CBC
- Not indexed by Elasticsearch (`enabled: false`)
- Never returned to frontend

#### `credentials.decrypted`
- Contains decrypted credential object
- Only available server-side
- Not indexed by Elasticsearch (`enabled: false`)
- Sensitive fields are masked when sent to frontend

**Example:**
```json
{
  "encrypted": "U2FsdGVkX1+1234567890abcdefghijklmnopqrstuvwxyz...",
  "decrypted": {
    "clientId": "3MVG9XXXXXXXXXXXXXXXXXXXXXXXXXX",
    "clientSecret": "1234567890ABCDEF",
    "refreshToken": "5Aep861XXXXXXXXXXXXXXXXX"
  }
}
```

### Configured Variables

Dynamic variables extracted from the integration's `baseUrl` (e.g., `{{instance_url}}`).

**Example baseUrl:**
```
https://{{instance_url}}.salesforce.com/services/data/v58.0
```

**Configured variables:**
```json
{
  "instance_url": "https://mycompany.salesforce.com"
}
```

### Test Status Tracking

| Field | Purpose | Example Values |
|-------|---------|----------------|
| `lastTestStatus` | Result of last test | `success`, `error`, `null` |
| `lastTestMessage` | Detailed message | `Connection successful`, `Invalid credentials` |
| `lastTestDate` | When test was performed | `2025-11-23T15:45:00.000Z` |

### Operations

#### Create Connection
```javascript
await saveUserConnection({
  userId: "user_123",
  integrationId: "salesforce",
  integrationName: "Salesforce",
  connectionName: "Salesforce Production",
  authMethodId: "oauth2",
  authMethodLabel: "OAuth 2.0",
  configuredVariables: { instance_url: "https://..." },
  credentials: { encrypted: "...", decrypted: {...} },
  status: "active"
});
```

#### Get User Connections
```javascript
const connections = await getUserConnections("user_123");
```

#### Get Connection by ID
```javascript
const connection = await getConnectionById("conn_123");
```

#### Update Connection
```javascript
await updateConnection("conn_123", {
  connectionName: "Salesforce Production v2",
  lastTestStatus: "success",
  lastTestMessage: "Connection successful",
  lastTestDate: new Date().toISOString()
});
```

#### Delete Connection (Soft Delete)
```javascript
await deleteConnection("conn_123");
// Sets isActive=false and status='deleted'
```

### Search Considerations

- **connectionId**, **userId**, **integrationId**, **authMethodId**: Use `keyword` type for exact matching
- **integrationName**, **connectionName**: Use `text` type for full-text search
- **credentials**: Not indexed (`enabled: false`) for security
- **configuredVariables**: Stored as dynamic object

---

## 🔌 Integrations Registry Index

### Index Name
```
integrations_registry
```

### Purpose
Cache integration metadata for fast searching and filtering. This is an optional index that mirrors data from the file-based integration registry.

### Schema Mapping

```json
{
  "mappings": {
    "properties": {
      "integrationId": { "type": "keyword" },
      "displayName": { "type": "text" },
      "description": { "type": "text" },
      "category": { "type": "keyword" },
      "status": { "type": "keyword" },
      "version": { "type": "keyword" },
      "createdAt": { "type": "date" },
      "updatedAt": { "type": "date" }
    }
  }
}
```

### Field Descriptions

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `integrationId` | keyword | Yes | Unique identifier (also the document ID) | `salesforce` |
| `displayName` | text | Yes | Display name (searchable) | `Salesforce` |
| `description` | text | Yes | Integration description (searchable) | `Customer Relationship Management platform` |
| `category` | keyword | Yes | Integration category | `crm`, `payment`, `database` |
| `status` | keyword | Yes | Integration availability | `active`, `inactive`, `coming-soon` |
| `version` | keyword | No | Integration version | `1.0.0` |
| `createdAt` | date | No | When integration was added | `2025-01-01T00:00:00.000Z` |
| `updatedAt` | date | No | Last update timestamp | `2025-11-23T10:00:00.000Z` |

### Document Example

```json
{
  "integrationId": "salesforce",
  "displayName": "Salesforce",
  "description": "Customer Relationship Management platform with sales automation",
  "category": "crm",
  "status": "active",
  "version": "1.0.0",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-11-23T10:00:00.000Z"
}
```

### Category Values

| Category | Description | Examples |
|----------|-------------|----------|
| `crm` | Customer Relationship Management | Salesforce, HubSpot |
| `payment` | Payment Processing | Stripe, PayPal |
| `database` | Database Systems | PostgreSQL, MongoDB |
| `communication` | Communication Tools | Slack, Twilio |
| `analytics` | Analytics Platforms | Google Analytics, Mixpanel |
| `storage` | Storage Services | AWS S3, Google Cloud Storage |
| `other` | Other integrations | Various |

### Status Values

| Status | Description | Usage |
|--------|-------------|-------|
| `active` | Integration is available | Ready for connections |
| `inactive` | Integration is disabled | Not shown to users |
| `coming-soon` | Planned integration | Display as coming soon |

### Operations

#### Index Integration
```javascript
await indexIntegration({
  id: "salesforce",
  displayName: "Salesforce",
  description: "CRM platform",
  category: "crm",
  status: "active",
  version: "1.0.0"
});
```

#### Search Integrations
```javascript
const results = await searchIntegrations("customer management");
// Searches across displayName, description, and category
```

### Search Considerations

- **displayName** and **description**: Use `text` type for full-text search
- **category** and **status**: Use `keyword` type for filtering
- **integrationId**: Uses document ID for efficient lookups

---

## 🔗 Relationships

### Entity Relationship Diagram

```
┌──────────────┐
│    users     │
│              │
│  - userId    │────┐
│  - name      │    │
│  - email     │    │
│  - status    │    │
└──────────────┘    │
                    │
                    │ 1:N (One user has many connections)
                    │
                    ▼
┌───────────────────────────────┐         ┌─────────────────────┐
│ user_integration_connections  │─────────│ integrations_registry│
│                               │   N:1   │                     │
│  - connectionId               │         │  - integrationId    │
│  - userId (FK)                │         │  - displayName      │
│  - integrationId (FK)         │────────▶│  - category         │
│  - connectionName             │         │  - status           │
│  - authMethodId               │         └─────────────────────┘
│  - credentials                │
│  - configuredVariables        │
│  - status                     │
│  - lastTestStatus             │
└───────────────────────────────┘
```

### Relationship Details

1. **User → Connections (1:N)**
   - One user can have multiple connections
   - Each connection belongs to exactly one user
   - Foreign key: `userId` in `user_integration_connections`

2. **Integration → Connections (1:N)**
   - One integration can have multiple connections (from different users)
   - Each connection is for exactly one integration
   - Foreign key: `integrationId` in `user_integration_connections`

3. **User + Integration → Connections (N:M)**
   - A user can have multiple connections to the same integration
   - Each connection has a unique `connectionName` for identification
   - Example: User has "Salesforce Production" and "Salesforce Sandbox"

---

## 🔍 Query Examples

### Get Active Connections for User

```javascript
const result = await client.search({
  index: 'user_integration_connections',
  body: {
    query: {
      bool: {
        must: [
          { term: { userId: 'user_123' } },
          { term: { isActive: true } }
        ]
      }
    },
    sort: [{ createdAt: { order: 'desc' } }]
  }
});
```

### Get Connections by Integration

```javascript
const result = await client.search({
  index: 'user_integration_connections',
  body: {
    query: {
      bool: {
        must: [
          { term: { integrationId: 'salesforce' } },
          { term: { isActive: true } }
        ]
      }
    }
  }
});
```

### Get Failed Connections

```javascript
const result = await client.search({
  index: 'user_integration_connections',
  body: {
    query: {
      bool: {
        must: [
          { term: { isActive: true } },
          { term: { lastTestStatus: 'error' } }
        ]
      }
    },
    sort: [{ lastTestDate: { order: 'desc' } }]
  }
});
```

### Search Connections by Name

```javascript
const result = await client.search({
  index: 'user_integration_connections',
  body: {
    query: {
      bool: {
        must: [
          { term: { userId: 'user_123' } },
          { term: { isActive: true } },
          {
            multi_match: {
              query: 'production',
              fields: ['connectionName', 'integrationName']
            }
          }
        ]
      }
    }
  }
});
```

### Get Recent Connections (Last 7 Days)

```javascript
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

const result = await client.search({
  index: 'user_integration_connections',
  body: {
    query: {
      bool: {
        must: [
          { term: { userId: 'user_123' } },
          { term: { isActive: true } },
          {
            range: {
              createdAt: {
                gte: sevenDaysAgo.toISOString()
              }
            }
          }
        ]
      }
    }
  }
});
```

### Count Connections by Status

```javascript
const result = await client.search({
  index: 'user_integration_connections',
  body: {
    query: {
      term: { userId: 'user_123' }
    },
    aggs: {
      by_status: {
        terms: {
          field: 'status'
        }
      }
    }
  }
});
```

### Search Integrations by Category

```javascript
const result = await client.search({
  index: 'integrations_registry',
  body: {
    query: {
      bool: {
        must: [
          { term: { category: 'crm' } },
          { term: { status: 'active' } }
        ]
      }
    },
    sort: [{ displayName: { order: 'asc' } }]
  }
});
```

---

## 📝 Best Practices

### 1. Index Design

**Use Appropriate Field Types:**
- `keyword`: For exact matching (IDs, status values, categories)
- `text`: For full-text search (names, descriptions)
- `date`: For timestamps (ISO 8601 format)
- `object`: For nested structures (credentials, variables)

**Disable Indexing for Sensitive Data:**
```json
{
  "credentials": {
    "type": "object",
    "enabled": false
  }
}
```

### 2. Document ID Strategy

**Use Custom IDs:**
- Generate predictable, unique IDs
- Include timestamp for chronological sorting
- Use prefix to identify document type

**Example:**
```javascript
const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
```

### 3. Soft Delete Pattern

**Never Hard Delete:**
- Set `isActive: false` and `status: 'deleted'`
- Preserves data for auditing
- Allows potential recovery

**Implementation:**
```javascript
await client.update({
  index: 'user_integration_connections',
  id: connectionId,
  body: {
    doc: {
      isActive: false,
      status: 'deleted',
      updatedAt: new Date().toISOString()
    }
  }
});
```

### 4. Query Performance

**Filter Before Search:**
- Use `term` queries for exact matches (faster)
- Use `bool` queries to combine filters
- Use `must` clauses for required conditions

**Limit Result Size:**
```javascript
{
  size: 100,  // Limit results
  from: 0     // Pagination offset
}
```

### 5. Date Handling

**Always Use ISO 8601 Format:**
```javascript
createdAt: new Date().toISOString()
// Output: "2025-11-23T15:45:00.000Z"
```

**Query Date Ranges:**
```javascript
{
  range: {
    createdAt: {
      gte: "2025-11-01T00:00:00.000Z",
      lte: "2025-11-30T23:59:59.999Z"
    }
  }
}
```

### 6. Credential Security

**Never Index Credentials:**
- Use `enabled: false` for credential fields
- Encrypt before storage
- Mask when returning to frontend

**Always Encrypt:**
```javascript
const encryptedCreds = encrypt(JSON.stringify(credentials));
```

### 7. Connection Testing

**Update Test Fields Together:**
```javascript
await updateConnection(connectionId, {
  lastTestStatus: 'success',
  lastTestMessage: 'Connection successful',
  lastTestDate: new Date().toISOString()
});
```

### 8. Error Handling

**Wrap All Operations in Try-Catch:**
```javascript
try {
  const result = await client.index({...});
  return result;
} catch (error) {
  console.error('❌ Error:', error);
  throw error;
}
```

### 9. Bulk Operations

**Use Bulk API for Multiple Docs:**
```javascript
const body = connections.flatMap(doc => [
  { index: { _index: 'user_integration_connections', _id: doc.connectionId } },
  doc
]);

await client.bulk({ refresh: true, body });
```

### 10. Index Maintenance

**Refresh After Important Operations:**
```javascript
await client.indices.refresh({ index: 'user_integration_connections' });
```

**Monitor Index Health:**
```javascript
const health = await client.cluster.health();
console.log('Cluster status:', health.status);
```

---

## 🔧 Maintenance

### Index Initialization

All indices are created automatically on server startup:

```javascript
await initializeIndexes();
```

### Reindexing

If schema changes are needed:

1. Create new index with updated mapping
2. Reindex data from old index to new index
3. Delete old index
4. Create alias pointing to new index

### Backup

Use Elasticsearch snapshot API:

```javascript
await client.snapshot.create({
  repository: 'backup_repo',
  snapshot: `snapshot_${Date.now()}`,
  body: {
    indices: Object.values(INDEXES).join(',')
  }
});
```

---

## 📚 Related Documentation

- [User Connection Management System](./USER-CONNECTION-MANAGEMENT.md)
- [API Endpoints Reference](./API-ENDPOINTS.md)
- [Connection Wizard Technical Guide](./CONNECTION-WIZARD.md)
- [My Connections Page Documentation](./MY-CONNECTIONS-PAGE.md)

---

## 🆘 Troubleshooting

### Connection Refused
**Issue:** Cannot connect to Elasticsearch
**Solution:** Verify `ELASTICSEARCH_URL` and ensure Elasticsearch is running

### Index Already Exists
**Issue:** Error creating index that already exists
**Solution:** Check index existence before creating

### Query Performance Issues
**Issue:** Slow queries
**Solution:** Add appropriate filters, limit result size, use `keyword` fields for filtering

### Mapping Conflicts
**Issue:** Cannot index document due to field type mismatch
**Solution:** Ensure data types match schema, consider reindexing with correct mapping
