# Canonical Record Mapping System

This document covers the complete flow for mapping records between two integrations using the canonical mapping system.

## Overview

The canonical record mapping system allows users to:

1. Create **mapping templates** that define the relationship between two scopes (e.g., Employee ↔ Contact)
2. Use templates to create **record mappings** that link specific records from two integrations
3. Support different **relationship types** (1:1, 1:N, N:1, N:N)

---

## Architecture

### Storage

| Data              | Storage Location                                  | Purpose                                    |
| ----------------- | ------------------------------------------------- | ------------------------------------------ |
| Mapping Templates | `canonical-mapping-templates.json` (file)         | Define scope relationships and cardinality |
| Record Mappings   | Elasticsearch (`canonical_record_mappings` index) | Store individual record-to-record mappings |

### Data Model

**Individual Document Model**: Each record mapping is stored as a separate Elasticsearch document with side-agnostic indexed fields for efficient querying.

---

## Part 1: Mapping Templates

### Template Structure

```json
{
  "id": "template_1770271636174_l06jzbxe3",
  "name": "Employee to Contact Mapping",
  "relationshipType": "one-to-one",
  "sideA": {
    "scope": "employee",
    "operation": "list",
    "primaryKeyCanonical": "{{canonical.employee.unique_id}}"
  },
  "sideB": {
    "scope": "contact",
    "operation": "list",
    "primaryKeyCanonical": "{{canonical.contact.id}}"
  },
  "createdAt": "2026-02-05T06:07:16.174Z",
  "updatedAt": "2026-02-05T06:07:16.174Z"
}
```

### Relationship Types

| Type         | Value          | Meaning                                               | Constraint             |
| ------------ | -------------- | ----------------------------------------------------- | ---------------------- |
| One to One   | `one-to-one`   | Each A maps to exactly one B and vice versa           | Both sides constrained |
| One to Many  | `one-to-many`  | One A can map to multiple B, but each B maps to one A | Side B constrained     |
| Many to One  | `many-to-one`  | Each A maps to one B, but one B can have multiple A   | Side A constrained     |
| Many to Many | `many-to-many` | No restrictions                                       | No constraints         |

### Template API Endpoints

#### Get All Templates

```
GET /api/mapping-templates
```

**Response:**

```json
{
  "success": true,
  "templates": [
    {
      "id": "template_xxx",
      "name": "Agent Mapping",
      "relationshipType": "one-to-one",
      "sideA": {
        "scope": "employee",
        "operation": "list",
        "primaryKeyCanonical": "..."
      },
      "sideB": {
        "scope": "employee",
        "operation": "list",
        "primaryKeyCanonical": "..."
      },
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

#### Create Template

```
POST /api/mapping-templates
```

**Request Body:**

```json
{
  "name": "Agent Mapping",
  "relationshipType": "one-to-one",
  "sideA": {
    "scope": "employee",
    "operation": "list",
    "primaryKeyCanonical": "{{canonical.employee.unique_id}}"
  },
  "sideB": {
    "scope": "contact",
    "operation": "list",
    "primaryKeyCanonical": "{{canonical.contact.id}}"
  }
}
```

**Response:**

```json
{
  "success": true,
  "template": { "id": "template_xxx", ... }
}
```

#### Update Template

```
PUT /api/mapping-templates/:id
```

**Request Body:** Same as create

#### Delete Template

```
DELETE /api/mapping-templates/:id
```

---

## Part 2: Record Mappings

### Elasticsearch Document Structure

Each mapping is stored as an individual document:

```json
{
  "id": "mapping_1770272000000_abc123",
  "templateId": "template_xxx",
  "relationshipType": "one-to-one",

  "sideAIntegration": "deepcall",
  "sideBIntegration": "freshdesk",

  "integrationIds": ["deepcall", "freshdesk"],
  "connectionKeys": ["deepcall:conn_abc", "freshdesk:conn_xyz"],
  "recordKeys": ["deepcall:conn_abc:7", "freshdesk:conn_xyz:112000"],

  "integrations": {
    "deepcall": {
      "connectionId": "conn_abc",
      "recordId": 7,
      "recordData": { "name": "John Doe", "email": "john@example.com" },
      "featureId": "fetch_employees",
      "primaryKeyField": "unique_id",
      "primaryKeyCanonical": "{{canonical.employee.unique_id}}",
      "canonicalMappings": {}
    },
    "freshdesk": {
      "connectionId": "conn_xyz",
      "recordId": 112000,
      "recordData": { "name": "John Doe", "contact_id": 112000 },
      "featureId": "get_agents",
      "primaryKeyField": "id",
      "primaryKeyCanonical": "{{canonical.employee.unique_id}}",
      "canonicalMappings": {}
    }
  },

  "createdAt": "2026-02-05T06:10:00.000Z",
  "updatedAt": "2026-02-05T06:10:00.000Z"
}
```

### Indexed Fields (for efficient querying)

| Field            | Format                                                      | Purpose                        |
| ---------------- | ----------------------------------------------------------- | ------------------------------ |
| `integrationIds` | `["deepcall", "freshdesk"]` (sorted)                        | Query by integration pair      |
| `connectionKeys` | `["deepcall:conn_1", "freshdesk:conn_2"]` (sorted)          | Query by connection pair       |
| `recordKeys`     | `["deepcall:conn_1:7", "freshdesk:conn_2:112000"]` (sorted) | Constraint validation & lookup |

### Record Mapping API Endpoints

#### Save Record Mappings (with validation)

```
POST /api/record-mappings/v2
```

**Request Body:**

```json
{
  "templateId": "template_xxx",
  "relationshipType": "one-to-one",
  "sideAIntegration": "deepcall",
  "sideBIntegration": "freshdesk",
  "sideAConnectionId": "conn_abc",
  "sideBConnectionId": "conn_xyz",
  "featureAId": "fetch_employees",
  "featureBId": "get_agents",
  "sideAMetadata": {
    "primaryKeyField": "unique_id",
    "primaryKeyCanonical": "{{canonical.employee.unique_id}}",
    "canonicalMappings": {}
  },
  "sideBMetadata": {
    "primaryKeyField": "id",
    "primaryKeyCanonical": "{{canonical.employee.unique_id}}",
    "canonicalMappings": {}
  },
  "pairs": [
    {
      "sideARecordId": 7,
      "sideBRecordId": 112000,
      "sideARecordData": { "name": "John", "email": "john@example.com" },
      "sideBRecordData": { "name": "John", "contact_id": 112000 }
    },
    {
      "sideARecordId": 10,
      "sideBRecordId": 112001,
      "sideARecordData": { ... },
      "sideBRecordData": { ... }
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "saved": [
    /* saved mapping documents */
  ],
  "violations": [
    {
      "pair": { "sideARecordId": 7, "sideBRecordId": 112002 },
      "reason": "Side A record 7 already mapped to different Side B record",
      "existingMapping": "freshdesk:conn_xyz:112000"
    }
  ],
  "duplicates": [
    {
      "pair": { "sideARecordId": 7, "sideBRecordId": 112000 },
      "reason": "Mapping already exists"
    }
  ],
  "summary": {
    "requested": 3,
    "saved": 1,
    "violations": 1,
    "duplicates": 1
  }
}
```

#### Get Record Mappings

```
GET /api/record-mappings/v2?templateId=xxx&connectionKeyA=deepcall:conn_1&connectionKeyB=freshdesk:conn_2
```

**Query Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `templateId` | Yes | Filter by template |
| `connectionKeyA` | No | Filter by Side A connection (`integration:connectionId`) |
| `connectionKeyB` | No | Filter by Side B connection |
| `recordKey` | No | Find mappings containing specific record |

**Response:**

```json
{
  "success": true,
  "mappings": [
    /* array of mapping documents */
  ]
}
```

#### Check Existing Configuration

```
GET /api/record-mappings/v2/check-config?templateId=xxx&integrationA=deepcall&integrationB=freshdesk
```

**Purpose:** Check if mappings exist and get the stored side configuration (prevents side swapping).

**Response:**

```json
{
  "success": true,
  "hasExistingMappings": true,
  "sideAIntegration": "deepcall",
  "sideBIntegration": "freshdesk",
  "count": 15
}
```

#### Delete Single Mapping

```
DELETE /api/record-mappings/v2/:id
```

---

## Part 3: Complete User Flow

### Step 1: Create a Mapping Template

1. User navigates to `/canonical-mapping`
2. Clicks "Create Template"
3. Fills in:
   - **Template Name**: Descriptive name
   - **Relationship Type**: Configured via two questions:
     - "Side A → Side B": One or Many
     - "Side B → Side A": One or Many
   - **Side A Configuration**: Scope, Operation, Primary Key
   - **Side B Configuration**: Scope, Operation, Primary Key
4. System saves template to `canonical-mapping-templates.json`

### Step 2: Create Record Mappings

1. User navigates to `/record-mapping`
2. Selects a template from dropdown
3. For each side (A and B):
   - Selects integration
   - Selects connection (user's authenticated connection)
   - Selects feature (API that matches template's scope/operation)
   - Loads data (executes the API)
4. System checks for existing mappings:

   ```
   GET /api/record-mappings/v2/check-config
   ```

   - If mappings exist, validates side assignment matches
   - Prevents side swapping (e.g., if Deepcall was Side A before, it must remain Side A)

5. User selects records from both sides
6. **Frontend validation** runs against:
   - `mappings` (loaded from DB)
   - `pendingPairs` (unsaved pairs in current session)

7. User clicks "Create Mapping" → pairs added to `pendingPairs`
8. User clicks "Save Mappings":
   ```
   POST /api/record-mappings/v2
   ```
9. **Backend validation** runs:
   - Queries Elasticsearch for existing mappings
   - Validates each pair against relationship constraints
   - Returns saved, violations, and duplicates

### Step 3: View/Delete Existing Mappings

1. When both connections are selected, existing mappings load:
   ```
   GET /api/record-mappings/v2?templateId=xxx&connectionKeyA=...&connectionKeyB=...
   ```
2. Mappings displayed in a list
3. User can delete individual mappings:
   ```
   DELETE /api/record-mappings/v2/:id
   ```

---

## Part 4: Validation Logic

### Constraint Rules by Relationship Type

| Relationship   | Side A Constraint | Side B Constraint |
| -------------- | ----------------- | ----------------- |
| `one-to-one`   | Each A → max 1 B  | Each B → max 1 A  |
| `one-to-many`  | No constraint     | Each B → max 1 A  |
| `many-to-one`  | Each A → max 1 B  | No constraint     |
| `many-to-many` | No constraint     | No constraint     |

### Frontend Validation

Located in `public/js/record-mapping.js`:

```javascript
// Combine existing mappings + pending pairs for validation
const allMappings = [
  ...mappings.map(m => ({ sideA: m.sideARecordId, sideB: m.sideBRecordId })),
  ...pendingPairs.map(p => ({
    sideA: p.sideARecordId,
    sideB: p.sideBRecordId,
  })),
];

// Check constraints based on relationship type
if (relType === 'one-to-one' || relType === 'many-to-one') {
  // Check if A is already mapped to a different B
  const existingForA = allMappings.find(m => m.sideA === recA.primaryKeyValue);
  if (existingForA && existingForA.sideB !== recB.primaryKeyValue) {
    // Constraint violation
  }
}
```

**Runs at:**

- Record selection (`selectRecord`)
- Mapping creation (`createMappings`)

### Backend Validation

Located in `server.js` (`POST /api/record-mappings/v2`):

```javascript
// Query existing mappings
existingMappings = await elasticsearch.getValidationMappings(
  templateId,
  connectionKeyA,
  connectionKeyB,
  recordKeysToCheck,
);

// Build constraint map
const constraintMap = {
  sideA: {}, // sideARecordKey -> sideBRecordKey
  sideB: {}, // sideBRecordKey -> sideARecordKey
};

// Validate each pair
for (const pair of pairs) {
  // Check for duplicates
  if (constraintMap.sideA[sideAKey] === sideBKey) {
    duplicates.push({ pair, reason: 'Mapping already exists' });
    continue;
  }

  // Check Side B constraint (for 1:1 and 1:N)
  if (relType === 'one-to-one' || relType === 'one-to-many') {
    if (constraintMap.sideB[sideBKey] && constraintMap.sideB[sideBKey] !== sideAKey) {
      violations.push({ ... });
    }
  }

  // Check Side A constraint (for 1:1 and N:1)
  if (relType === 'one-to-one' || relType === 'many-to-one') {
    if (constraintMap.sideA[sideAKey] && constraintMap.sideA[sideAKey] !== sideBKey) {
      violations.push({ ... });
    }
  }
}
```

---

## Part 5: Key Design Decisions

### 1. Individual Document Model

**Why:** Each mapping is stored as a separate Elasticsearch document instead of all mappings in one document.

**Benefits:**

- Scalability: No single document grows unbounded
- Pagination: Load mappings in batches
- Efficient queries: Use indexed fields for lookups
- Concurrent edits: No conflicts when multiple users add mappings

### 2. Side-Agnostic Indexed Fields

**Why:** Fields like `integrationIds`, `connectionKeys`, `recordKeys` are sorted arrays.

**Benefits:**

- Bidirectional lookup: Query from either integration's perspective
- Order-independent: `["a", "b"]` and `["b", "a"]` both match the same query
- Efficient constraint validation: Query by `recordKeys` without loading full documents

### 3. Side Configuration Preservation

**Why:** Store `sideAIntegration` and `sideBIntegration` in each mapping.

**Benefits:**

- Enforces consistent side assignment across sessions
- Relationship semantics preserved (e.g., in 1:N, Side A is always the "one" side)
- Prevents accidental side swapping that would corrupt relationship constraints

### 4. Dual Validation

**Why:** Validate on both frontend and backend.

| Layer    | Purpose                               |
| -------- | ------------------------------------- |
| Frontend | Instant UX feedback using loaded data |
| Backend  | Data integrity (source of truth)      |

---

## Files Reference

| File                               | Purpose                                         |
| ---------------------------------- | ----------------------------------------------- |
| `server.js`                        | API endpoints for templates and record mappings |
| `services/elasticsearch.js`        | Elasticsearch operations for record mappings    |
| `canonical-mapping-templates.json` | Template storage (file-based)                   |
| `views/canonical-mapping.ejs`      | Template management UI                          |
| `views/record-mapping.ejs`         | Record mapping UI                               |
| `public/js/canonical-mapping.js`   | Template creation/editing logic                 |
| `public/js/record-mapping.js`      | Record mapping logic with validation            |
| `public/css/canonical-mapping.css` | Template UI styles                              |
| `public/css/record-mapping.css`    | Record mapping UI styles                        |

---

## Part 6: Lookup & Query Patterns

### Bidirectional Record Lookup

Given a record from one integration, find its mapped record(s) in another integration.

#### Using recordKey Query

```
GET /api/record-mappings/v2?templateId=template_xxx&recordKey=deepcall:conn_abc:7
```

This returns all mappings containing Deepcall employee with ID `7`.

**Response:**

```json
{
  "success": true,
  "mappings": [
    {
      "id": "mapping_xxx",
      "integrations": {
        "deepcall": { "recordId": 7, "recordData": {...} },
        "freshdesk": { "recordId": 112000, "recordData": {...} }
      }
    }
  ]
}
```

#### Extracting the Mapped Record

```javascript
// Given: Deepcall employee ID 7
// Find: Freshdesk agent ID

const sourceIntegration = 'deepcall';
const targetIntegration = 'freshdesk';
const sourceRecordId = 7;
const connectionId = 'conn_abc';

const recordKey = `${sourceIntegration}:${connectionId}:${sourceRecordId}`;
const response = await fetch(
  `/api/record-mappings/v2?templateId=${templateId}&recordKey=${recordKey}`,
);
const data = await response.json();

// Extract target record IDs
const targetRecordIds = data.mappings.map(
  m => m.integrations[targetIntegration]?.recordId,
);
// Result: [112000]
```

### Query by Connection Pair

Get all mappings between two specific connections:

```
GET /api/record-mappings/v2?templateId=xxx&connectionKeyA=deepcall:conn_abc&connectionKeyB=freshdesk:conn_xyz
```

### Elasticsearch Query Patterns

#### Find by Integration Pair (order-independent)

```javascript
// In elasticsearch.js - getRecordMappings()
const must = [];
for (const intId of ['deepcall', 'freshdesk']) {
  must.push({ term: { integrationIds: intId } });
}
// Matches documents with both integrations, regardless of order
```

#### Find by Record Key (constraint validation)

```javascript
// In elasticsearch.js - getValidationMappings()
const query = {
  bool: {
    must: [
      { term: { templateId } },
      { term: { connectionKeys: connectionKeyA } },
      { term: { connectionKeys: connectionKeyB } },
    ],
    filter: {
      terms: { recordKeys: recordKeysToCheck },
    },
  },
};
```

---

## Part 7: UI Component Details

### Relationship Type Selector (Template Creation)

The relationship type is configured using a **two-question approach** rather than a single dropdown, making it more intuitive for users.

#### UI Structure (`views/canonical-mapping.ejs`)

```html
<div class="relationship-config">
  <div class="relationship-questions">
    <!-- Question 1: A → B -->
    <div class="relationship-question">
      <label>Side A → Side B</label>
      <select id="aToBRelation" onchange="updateRelationshipDisplay()">
        <option value="1">One (each A maps to at most one B)</option>
        <option value="M">Many (each A can map to multiple B)</option>
      </select>
    </div>

    <!-- Question 2: B → A -->
    <div class="relationship-question">
      <label>Side B → Side A</label>
      <select id="bToARelation" onchange="updateRelationshipDisplay()">
        <option value="1">One (each B maps to at most one A)</option>
        <option value="M">Many (each B can map to multiple A)</option>
      </select>
    </div>
  </div>

  <!-- Visual Result -->
  <div class="relationship-result">
    <span class="relationship-badge">1:1</span>
    <span class="result-description"
      >Each record maps to exactly one record...</span
    >
  </div>
</div>
```

#### Derivation Logic (`public/js/canonical-mapping.js`)

```javascript
function updateRelationshipDisplay() {
  const aToB = document.getElementById('aToBRelation').value; // '1' or 'M'
  const bToA = document.getElementById('bToARelation').value; // '1' or 'M'

  // Derive relationship type from combination
  if (aToB === '1' && bToA === '1') {
    relationshipType = 'one-to-one'; // 1:1
  } else if (aToB === 'M' && bToA === '1') {
    relationshipType = 'one-to-many'; // 1:N
  } else if (aToB === '1' && bToA === 'M') {
    relationshipType = 'many-to-one'; // N:1
  } else {
    relationshipType = 'many-to-many'; // N:N
  }
}
```

#### Mapping Table

| A → B | B → A | Result         | Badge |
| ----- | ----- | -------------- | ----- |
| 1     | 1     | `one-to-one`   | 1:1   |
| M     | 1     | `one-to-many`  | 1:N   |
| 1     | M     | `many-to-one`  | N:1   |
| M     | M     | `many-to-many` | N:N   |

### Record Selection Behavior (Record Mapping Page)

The selection mode (single vs multi-select) adapts based on the relationship type.

#### Selection Mode Logic (`public/js/record-mapping.js`)

```javascript
function getSelectionMode(side) {
  const relType = selectedTemplate?.relationshipType || 'one-to-one';

  if (side === 'A') {
    // Side A: multi-select if A can have many (N:1 or N:N)
    return relType === 'many-to-one' || relType === 'many-to-many'
      ? 'multi'
      : 'single';
  }
  // Side B: multi-select if B can have many (1:N or N:N)
  return relType === 'one-to-many' || relType === 'many-to-many'
    ? 'multi'
    : 'single';
}
```

#### Selection Mode by Relationship Type

| Relationship   | Side A Mode      | Side B Mode      | Explanation                    |
| -------------- | ---------------- | ---------------- | ------------------------------ |
| `one-to-one`   | Single (radio)   | Single (radio)   | Each side selects exactly one  |
| `one-to-many`  | Single (radio)   | Multi (checkbox) | One A maps to many B           |
| `many-to-one`  | Multi (checkbox) | Single (radio)   | Many A map to one B            |
| `many-to-many` | Multi (checkbox) | Multi (checkbox) | Both sides can select multiple |

#### Constraint Check Logic

```javascript
function isConstrainedSide(side) {
  const relType = selectedTemplate?.relationshipType || 'one-to-one';

  if (relType === 'one-to-one') return true; // Both constrained
  if (relType === 'one-to-many') return side === 'B'; // B is the "many" side, constrained
  if (relType === 'many-to-one') return side === 'A'; // A is the "many" side, constrained
  return false; // N:N - no constraints
}
```

### UI State Flow

```
Template Selected
      ↓
┌─────────────────────────────────────────┐
│  Determine selection mode per side      │
│  - getSelectionMode('A') → single/multi │
│  - getSelectionMode('B') → single/multi │
└─────────────────────────────────────────┘
      ↓
Render tables with radio/checkbox inputs
      ↓
User selects records
      ↓
┌─────────────────────────────────────────┐
│  On selection: validateSelection()      │
│  - Check against existing mappings      │
│  - Check against pending pairs          │
│  - Show error toast if violation        │
└─────────────────────────────────────────┘
      ↓
User clicks "Create Mapping"
      ↓
┌─────────────────────────────────────────┐
│  createMapping()                        │
│  - Generate cartesian product of        │
│    selected records                     │
│  - Validate each pair                   │
│  - Add valid pairs to pendingPairs      │
└─────────────────────────────────────────┘
```

---

## Part 8: Sequence Diagrams

### Template Creation Flow

```
┌──────┐          ┌──────────┐          ┌──────────┐
│ User │          │ Frontend │          │  Server  │
└──┬───┘          └────┬─────┘          └────┬─────┘
   │                   │                     │
   │ Navigate to       │                     │
   │ /canonical-mapping│                     │
   │──────────────────>│                     │
   │                   │                     │
   │ Click "Create     │                     │
   │ Template"         │                     │
   │──────────────────>│                     │
   │                   │                     │
   │ Fill form:        │                     │
   │ - Name            │                     │
   │ - A→B (1/M)       │                     │
   │ - B→A (1/M)       │                     │
   │ - Side A config   │                     │
   │ - Side B config   │                     │
   │──────────────────>│                     │
   │                   │                     │
   │                   │ updateRelationship  │
   │                   │ Display()           │
   │                   │ (derive type)       │
   │                   │                     │
   │ Click "Save"      │                     │
   │──────────────────>│                     │
   │                   │                     │
   │                   │ POST /api/mapping-  │
   │                   │ templates           │
   │                   │────────────────────>│
   │                   │                     │
   │                   │                     │ Save to
   │                   │                     │ templates.json
   │                   │                     │
   │                   │     { success,      │
   │                   │       template }    │
   │                   │<────────────────────│
   │                   │                     │
   │   Show success    │                     │
   │<──────────────────│                     │
   │                   │                     │
```

### Record Mapping Flow

```
┌──────┐          ┌──────────┐          ┌──────────┐       ┌───────────────┐
│ User │          │ Frontend │          │  Server  │       │ Elasticsearch │
└──┬───┘          └────┬─────┘          └────┬─────┘       └───────┬───────┘
   │                   │                     │                     │
   │ Select template   │                     │                     │
   │──────────────────>│                     │                     │
   │                   │                     │                     │
   │ Select Integration│                     │                     │
   │ A & B             │                     │                     │
   │──────────────────>│                     │                     │
   │                   │                     │                     │
   │                   │ GET /check-config   │                     │
   │                   │────────────────────>│                     │
   │                   │                     │ Query existing      │
   │                   │                     │────────────────────>│
   │                   │                     │<────────────────────│
   │                   │ { hasExisting,      │                     │
   │                   │   sideAIntegration }│                     │
   │                   │<────────────────────│                     │
   │                   │                     │                     │
   │                   │ Validate side       │                     │
   │                   │ assignment          │                     │
   │                   │                     │                     │
   │ Select connections│                     │                     │
   │ & features        │                     │                     │
   │──────────────────>│                     │                     │
   │                   │                     │                     │
   │ Click "Load Data" │                     │                     │
   │──────────────────>│                     │                     │
   │                   │ Execute feature API │                     │
   │                   │────────────────────>│                     │
   │                   │<────────────────────│                     │
   │                   │                     │                     │
   │                   │ GET /record-mappings│                     │
   │                   │ /v2 (load existing) │                     │
   │                   │────────────────────>│                     │
   │                   │                     │────────────────────>│
   │                   │                     │<────────────────────│
   │                   │<────────────────────│                     │
   │                   │                     │                     │
   │ Render data tables│                     │                     │
   │ with selection    │                     │                     │
   │ mode (radio/      │                     │                     │
   │ checkbox)         │                     │                     │
   │<──────────────────│                     │                     │
   │                   │                     │                     │
   │ Select records    │                     │                     │
   │──────────────────>│                     │                     │
   │                   │ validateSelection() │                     │
   │                   │ (frontend check)    │                     │
   │                   │                     │                     │
   │ Click "Create     │                     │                     │
   │ Mapping"          │                     │                     │
   │──────────────────>│                     │                     │
   │                   │ Add to pendingPairs │                     │
   │                   │                     │                     │
   │ Click "Save       │                     │                     │
   │ Mappings"         │                     │                     │
   │──────────────────>│                     │                     │
   │                   │                     │                     │
   │                   │ POST /record-       │                     │
   │                   │ mappings/v2         │                     │
   │                   │────────────────────>│                     │
   │                   │                     │                     │
   │                   │                     │ getValidation       │
   │                   │                     │ Mappings()          │
   │                   │                     │────────────────────>│
   │                   │                     │<────────────────────│
   │                   │                     │                     │
   │                   │                     │ Validate pairs      │
   │                   │                     │ (backend check)     │
   │                   │                     │                     │
   │                   │                     │ bulkSaveIndividual  │
   │                   │                     │ Mappings()          │
   │                   │                     │────────────────────>│
   │                   │                     │<────────────────────│
   │                   │                     │                     │
   │                   │ { saved, violations,│                     │
   │                   │   duplicates }      │                     │
   │                   │<────────────────────│                     │
   │                   │                     │                     │
   │ Show results      │                     │                     │
   │ (success/errors)  │                     │                     │
   │<──────────────────│                     │                     │
   │                   │                     │                     │
```

### Validation Flow (Detail)

```
┌─────────────────────────────────────────────────────────────────┐
│                    VALIDATION FLOW                              │
└─────────────────────────────────────────────────────────────────┘

                    Incoming Pairs
                         │
                         ▼
         ┌───────────────────────────────┐
         │  Build recordKeys to check    │
         │  based on relationship type   │
         └───────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
    ┌─────────┐                    ┌─────────┐
    │   1:1   │                    │   N:N   │
    │ Check   │                    │ Skip    │
    │ both    │                    │ validation
    │ sides   │                    │         │
    └─────────┘                    └─────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Query Elasticsearch                    │
│  getValidationMappings(recordKeys)      │
│                                         │
│  Returns only: id, recordKeys,          │
│  sideAIntegration, sideBIntegration     │
│  (minimal data for performance)         │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Build Constraint Maps                  │
│                                         │
│  constraintMap.sideA[recKeyA] = recKeyB │
│  constraintMap.sideB[recKeyB] = recKeyA │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  For each incoming pair:                │
│                                         │
│  1. Check duplicate (exact match)       │
│     → Add to duplicates[]               │
│                                         │
│  2. Check Side B constraint (1:1, 1:N)  │
│     → Add to violations[] if fail       │
│                                         │
│  3. Check Side A constraint (1:1, N:1)  │
│     → Add to violations[] if fail       │
│                                         │
│  4. If valid, add to validPairs[]       │
│     Update constraintMap for batch      │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Bulk save validPairs to Elasticsearch  │
└─────────────────────────────────────────┘
         │
         ▼
    Return { saved, violations, duplicates }
```

canonical_record_mapping
