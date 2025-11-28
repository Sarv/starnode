# Custom Handler Architecture
**[FUTURE IMPLEMENTATION]**

**Created**: 2025-11-24
**Status**: Design Phase
**Priority**: High
**Tags**: `architecture`, `handlers`, `custom-code`, `flexibility`

---

## Table of Contents
1. [The Foundation: Why Features Exist](#the-foundation-why-features-exist)
2. [Features: Declaration vs Definition](#features-declaration-vs-definition)
3. [When API Details Are Collected](#when-api-details-are-collected)
4. [Storage Architecture](#storage-architecture)
5. [Current State vs Future State](#current-state-vs-future-state)
6. [Problem Statement](#problem-statement)
7. [Current Challenges](#current-challenges)
8. [Proposed Solution: Hybrid Approach](#proposed-solution-hybrid-approach)
9. [Architecture Overview](#architecture-overview)
10. [Custom Handler Types](#custom-handler-types)
11. [Context Object Structure](#context-object-structure)
12. [Return Format Contracts](#return-format-contracts)
13. [Handler Organization](#handler-organization)
14. [Handler Discovery & Execution](#handler-discovery--execution)
15. [Dependency Handling (Cascading Fields)](#dependency-handling-cascading-fields)
16. [Error Handling Strategy](#error-handling-strategy)
17. [Complete Implementation Example: Google Sheets](#complete-implementation-example-google-sheets)
18. [Feature-Integration Mapping Flow](#feature-integration-mapping-flow)
19. [Database Schema Considerations](#database-schema-considerations)
20. [UI Requirements](#ui-requirements)
21. [Future Decision Points](#future-decision-points)
22. [Best Practices](#best-practices)
23. [References](#references)

---

## The Foundation: Why Features Exist

### The Integration Platform Vision

Our platform aims to integrate with **all types of third-party software systems** across various domains:

- **Email Sending Platforms**: SendGrid, Mailchimp, AWS SES, etc.
- **SMS / WhatsApp / Messaging**: Twilio, WhatsApp Business API, Telegram, etc.
- **CRM Software**: Salesforce, HubSpot, Zoho CRM, Pipedrive, etc.
- **HR / Employee Management**: Keka, BambooHR, Workday, etc.
- **Billing Management**: Stripe, Razorpay, PayPal, QuickBooks, etc.
- **Performance Tracking**: Mixpanel, Google Analytics, Amplitude, etc.
- **E-commerce Platforms**: Shopify, WooCommerce, Magento, etc.
- **Blog / Content Management**: WordPress, Ghost, Medium, etc.
- **Finance Platforms**: Xero, FreshBooks, Wave, etc.
- **And many more...**

### The Diversity Problem

Each category of software works differently, and even **software within the same category** often:
- Solves different use cases
- Offers different features
- Uses different APIs and protocols
- Has different data structures

**Examples of Feature Diversity**:

**Email Software** may support:
- Sending emails via API
- Sending emails via SMTP
- Template saving and syncing
- Contact list management
- Campaign management
- Analytics and reporting

**CRM Software** may allow:
- Creating, updating, deleting contacts
- Managing leads, deals, opportunities
- Ticket management
- Company/organization management
- Custom field mapping
- Workflow automation

**Employee Management Software** (e.g., Keka) may have:
- Employee listing and profiles
- Attendance tracking
- Leave management
- Payroll management
- Performance reviews
- Document management

**Integration Patterns Vary**:
- Some software provides **APIs for data fetching** (pull model)
- Others **push data to our platform** when events occur (webhook/push model)
- Some support both patterns

### The Impossibility of Manual Implementation

**Challenge**: It is **impossible and impractical** to:
- Manually implement all functionalities of all software inside our system
- Write custom code for each integration's every feature
- Maintain hundreds of different integration codebases
- Update code every time an external API changes

**Why Manual Approach Fails**:
1. **Scale**: Thousands of software × dozens of features = tens of thousands of implementations
2. **Maintenance**: API changes, deprecations, new features require constant updates
3. **Time**: Building one integration manually takes weeks/months
4. **Consistency**: Each developer might implement differently, leading to inconsistency
5. **Testing**: Testing each custom implementation is time-consuming and error-prone

### The Solution: Template-Based Feature System

We need a **generic, configuration-driven approach** where:
- ✅ Features are defined as **templates** (not hardcoded logic)
- ✅ Integrations **configure** features instead of coding them
- ✅ The system is **data-driven** and **dynamic**
- ✅ 80% of cases handled by templates, 20% by custom code (when absolutely needed)

This is why **Features** exist as a separate, foundational concept in our platform.

---

## Features: Declaration vs Definition

### Programming Analogy: Functions

In programming, we have:
- **Function Declaration** (signature): Defines WHAT the function does, what parameters it takes
- **Function Definition** (implementation): Defines HOW the function actually works

```javascript
// Declaration (signature)
function fetchContacts(limit, offset);

// Definition (implementation - can vary)
function fetchContacts(limit, offset) {
  // Implementation for Salesforce
  return salesforceAPI.get('/contacts', { limit, offset });
}

function fetchContacts(limit, offset) {
  // Implementation for HubSpot
  return hubspotAPI.get('/crm/v3/objects/contacts', { limit, offset });
}
```

### Features Work the Same Way

**Feature Template** = **Declaration**
- Defines WHAT the feature does
- Defines what **fields/parameters** are needed
- Generic and reusable across integrations

**Feature-Integration Mapping** = **Definition**
- Defines HOW to execute this feature for a specific software
- Provides software-specific API details
- Unique per integration

### Example: "Fetch Contacts" Feature

#### Feature Template (Declaration)
```json
{
  "id": "fetch_contacts",
  "name": "Fetch Contacts",
  "description": "Retrieve a list of contacts from the CRM",
  "category": "contacts",
  "fields": {
    "limit": {
      "type": "dynamic",
      "fieldType": "number",
      "label": "Number of contacts to fetch",
      "required": false,
      "default": 100
    },
    "offset": {
      "type": "dynamic",
      "fieldType": "number",
      "label": "Offset for pagination",
      "required": false,
      "default": 0
    },
    "api": {
      "type": "api",
      "label": "API Configuration",
      "required": true,
      "description": "API endpoint details for fetching contacts"
    }
  }
}
```

**Note**: The `"api"` field type is a **placeholder**. It says "this feature needs an API call, but the details will be provided later during mapping."

#### Feature-Integration Mapping (Definition for Salesforce)
```json
{
  "featureId": "fetch_contacts",
  "integrationId": "salesforce",
  "apiDetails": {
    "method": "GET",
    "endpoint": "/services/data/v54.0/query",
    "headers": {
      "Authorization": "Bearer {access_token}",
      "Content-Type": "application/json"
    },
    "queryParams": {
      "q": "SELECT Id, Name, Email FROM Contact LIMIT {limit} OFFSET {offset}"
    }
  }
}
```

#### Feature-Integration Mapping (Definition for HubSpot)
```json
{
  "featureId": "fetch_contacts",
  "integrationId": "hubspot",
  "apiDetails": {
    "method": "GET",
    "endpoint": "/crm/v3/objects/contacts",
    "headers": {
      "Authorization": "Bearer {access_token}",
      "Content-Type": "application/json"
    },
    "queryParams": {
      "limit": "{limit}",
      "offset": "{offset}"
    }
  }
}
```

### Key Insight

The **same feature template** ("Fetch Contacts") is **mapped to multiple integrations** (Salesforce, HubSpot, Zoho, etc.), but each mapping has **different API details** because each CRM has a different API.

This is why we:
- ✅ Create features **separately** as generic templates
- ✅ Map them to integrations **later** with specific API details
- ✅ Reuse the same feature across 10+ CRMs without duplicating the template

---

## When API Details Are Collected

### Two-Phase Approach

#### Phase 1: Feature Template Creation (Generic)
**When**: Admin creates a feature template in the Features section

**What is collected**:
- ✅ Feature name and description
- ✅ Feature category
- ✅ Field definitions (labels, types, validation)
- ✅ Field properties (static/dynamic, required, default values)
- ✅ Field type: `"api"` (placeholder indicating API call is needed)

**What is NOT collected**:
- ❌ API endpoint URL
- ❌ HTTP method (GET/POST/PUT/DELETE)
- ❌ Headers
- ❌ Request body structure
- ❌ Query parameters
- ❌ Authentication mapping

**Why NOT?**
Because these details are **software-specific**, and the feature template is **generic** and should work across multiple integrations.

#### Phase 2: Feature-Integration Mapping (Specific)
**When**: Admin maps an existing feature to a specific integration

**What is collected**:
- ✅ Select which feature to map
- ✅ Select which integration to map to
- ✅ **Now collect all API details**:
  - HTTP method (GET, POST, PUT, PATCH, DELETE)
  - Endpoint URL
  - Headers (including auth token mapping)
  - Request body structure
  - Query parameters
  - Response handling
  - Error mapping

**Why NOW?**
Because we're defining **how this specific software implements this feature**.

### The "API" Field Type

When a feature template has a field with `type: "api"`:

```json
{
  "api": {
    "type": "api",
    "required": true,
    "label": "API Configuration",
    "description": "HTTP API endpoint details for this feature"
  }
}
```

**This means**:
- This feature requires making an HTTP API call
- API details will be provided during Feature-Integration mapping
- A **wizard/form will open** during mapping to collect:
  - Method
  - URL
  - Headers
  - Body
  - Parameters

### Mapping Wizard Flow

```
Admin navigates to: Map Feature to Integration
    ↓
Select Feature: "Fetch Contacts"
    ↓
Select Integration: "Salesforce"
    ↓
System detects: Feature has field type "api"
    ↓
┌──────────────────────────────────────────────┐
│  API Configuration Wizard Opens              │
│                                               │
│  HTTP Method: [GET ▼]                        │
│  Endpoint URL: [/services/data/v54.0/query] │
│                                               │
│  Headers:                                     │
│  ┌─────────────────────────────────────────┐ │
│  │ Authorization: Bearer {access_token}    │ │
│  │ Content-Type: application/json          │ │
│  │ [+ Add Header]                           │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  Query Parameters:                            │
│  ┌─────────────────────────────────────────┐ │
│  │ q: SELECT Id, Name, Email FROM Contact │ │
│  │    LIMIT {limit} OFFSET {offset}        │ │
│  │ [+ Add Parameter]                        │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  Request Body: (empty for GET)               │
│                                               │
│  [Cancel]              [Save API Details]    │
└──────────────────────────────────────────────┘
    ↓
API details saved to Elasticsearch
    ↓
Index ID returned (e.g., "api_config_abc123")
    ↓
This ID is stored in the feature-integration mapping
    ↓
Mapping complete!
```

### Important Note

**During template creation**, when you see field type `"api"`:
- Do NOT ask for API details
- Do NOT show method/URL/headers fields
- Just save `fieldType: "api"` in the template
- API details will be collected **only during mapping**

This keeps templates clean, generic, and reusable.

---

## Storage Architecture

### Where Things Are Stored

#### 1. Feature Templates
**Location**: `features-definition.json`

**Content**: Generic feature definitions

```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-11-24T10:00:00Z",
  "features": {
    "fetch_contacts": {
      "id": "fetch_contacts",
      "name": "Fetch Contacts",
      "description": "Retrieve contacts from CRM",
      "category": "contacts",
      "fields": {
        "limit": { /* field definition */ },
        "api": {
          "type": "api",
          "required": true,
          "label": "API Configuration"
        }
      }
    }
    // ... more features
  }
}
```

#### 2. API Configuration Details
**Location**: **Separate Elasticsearch Index** (e.g., `api_configurations`)

**Why Elasticsearch?**
- Fast retrieval
- Flexible schema for different API structures
- Easy to query and filter
- Scalable for large number of configurations

**Structure**:
```json
{
  "_id": "api_config_abc123",
  "_index": "api_configurations",
  "_source": {
    "featureId": "fetch_contacts",
    "integrationId": "salesforce",
    "method": "GET",
    "endpoint": "/services/data/v54.0/query",
    "headers": {
      "Authorization": "Bearer {access_token}",
      "Content-Type": "application/json"
    },
    "queryParams": {
      "q": "SELECT Id, Name, Email FROM Contact LIMIT {limit} OFFSET {offset}"
    },
    "requestBody": null,
    "responseMapping": {
      "dataPath": "records",
      "idField": "Id",
      "nameField": "Name"
    },
    "createdAt": "2025-11-24T10:00:00Z",
    "createdBy": "admin_user_123"
  }
}
```

#### 3. Feature-Integration Mapping
**Location**: Database table `feature_integration_mappings` or similar

**Content**: Links features to integrations with reference to API config

```json
{
  "id": "mapping_xyz789",
  "featureId": "fetch_contacts",
  "integrationId": "salesforce",
  "apiConfigId": "api_config_abc123",  // ← Reference to Elasticsearch document
  "fieldMappings": {
    "limit": { "enabled": true },
    "offset": { "enabled": true }
  },
  "extraFields": [],
  "customHandlers": null,
  "createdAt": "2025-11-24T10:00:00Z"
}
```

#### 4. Integration File (Cached Copy)
**Location**: `integrations/salesforce/config.json`

**Content**: Feature details are **also saved here** for quick access without DB query

```json
{
  "id": "salesforce",
  "name": "Salesforce",
  "features": {
    "fetch_contacts": {
      "featureId": "fetch_contacts",
      "apiConfigId": "api_config_abc123",
      "apiDetails": {
        // Cached copy of API details for faster access
        "method": "GET",
        "endpoint": "/services/data/v54.0/query"
        // ...
      }
    }
  }
}
```

### Data Flow

```
┌─────────────────────────────────────────────────────┐
│  Admin creates Feature Template                     │
│  → Saved to: features-definition.json               │
└─────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────┐
│  Admin maps Feature to Integration                   │
│  → Opens API Configuration Wizard                    │
│  → Collects: method, URL, headers, etc.             │
└─────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────┐
│  API details saved to Elasticsearch                  │
│  → Index: api_configurations                         │
│  → Returns: api_config_abc123                        │
└─────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────┐
│  Mapping record created                              │
│  → Stores: featureId + integrationId + apiConfigId  │
│  → Database table: feature_integration_mappings      │
└─────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────┐
│  Integration file updated                            │
│  → Cached copy of API details                        │
│  → File: integrations/salesforce/config.json         │
└─────────────────────────────────────────────────────┘
              ↓
          Feature ready to use!
```

### Why This Architecture?

**Separation of Concerns**:
- **Feature templates** = Reusable definitions
- **API configurations** = Software-specific implementations
- **Mappings** = Links between templates and implementations
- **Integration files** = Quick-access cache

**Benefits**:
1. **One feature template → many integrations** (no duplication)
2. **API details in Elasticsearch** = fast, flexible, scalable
3. **Cached in integration files** = no DB query during execution
4. **Clear separation** = easy to understand and maintain

---

## Current State vs Future State

### Current State (As of Now)

**Location**: `http://localhost:3000/add-integration.html`

**How it works today**:
- Features are created **while creating an integration**
- Features and integrations are **mixed together**
- Feature definitions are stored directly **inside integration files**
- Each integration's features are independent

**Problems with current approach**:
1. **Feature duplication**: Same feature ("Fetch Contacts") defined separately for each CRM
2. **No reusability**: Can't reuse feature definitions across integrations
3. **Hard to maintain**: Changes to a feature concept require updating multiple places
4. **Mixed concerns**: Feature logic and integration config are intertwined

### Future State (After Implementation)

**Two separate workflows**:

#### Workflow 1: Create Feature Templates
- Navigate to: Features section
- Create generic feature templates
- Define fields, types, validations
- Save to `features-definition.json`
- **No API details** collected here

#### Workflow 2: Map Features to Integrations
- Navigate to: Integration Management
- Select: Existing integration (e.g., Salesforce)
- Click: "Add Feature Mapping"
- Select: Existing feature template (e.g., "Fetch Contacts")
- **Now provide API details** for this specific integration
- Save: API details → Elasticsearch, mapping → Database
- Feature now available for this integration!

**Benefits of future approach**:
1. ✅ **One feature template → reusable** across 10+ integrations
2. ✅ **Clear separation** between generic templates and specific implementations
3. ✅ **Easy maintenance**: Update feature template once, affects all mappings
4. ✅ **Scalability**: Add new integration = just map existing features
5. ✅ **Consistency**: All integrations use the same field definitions for the same feature

### Migration Path

**Existing integrations**:
- Currently have features defined inside integration files
- These are "legacy" definitions
- Will continue to work as-is
- Can be migrated to new system gradually

**New integrations**:
- Will use the new template + mapping approach
- Create once, reuse many times
- Follow the new architecture

### The Role of Custom Handlers

This entire foundation (feature templates + mapping) handles **80% of cases** where:
- Features are straightforward API calls
- Standard field types suffice
- No complex conditional logic needed

**But what about the remaining 20%?**
- Complex flows (cascading dropdowns)
- Dependent API calls
- Custom validation logic
- Data transformations

**This is where Custom Handlers come in** (covered in the following sections).

The foundation gives us templates and configuration.
Custom handlers give us the flexibility for complex cases.

Together, they create a powerful, flexible, maintainable integration platform.

---

## Problem Statement

### The Core Challenge
We're building a highly dynamic integration platform where:
- Features need to be reusable across multiple integrations
- Different software platforms have vastly different requirements
- We cannot predict all possible use cases upfront
- Some integrations require complex, multi-step flows (e.g., dependent API calls)

### The Balancing Act
We need a system that is:
- **Template-driven** (80%): Easy to configure, reusable, maintainable
- **Code-flexible** (20%): Handle complex edge cases without breaking the template pattern

### Real-World Example: Google Sheets Integration
**Requirement**: Fetch a row from Google Sheets

**Complexity**:
1. First, fetch list of available sheets → User selects one
2. Then, fetch subsheets of selected sheet → User selects one
3. Finally, fetch row from selected subsheet

**Challenge**: This cascading/dependent API flow cannot be easily represented in a simple template.

---

## Current Challenges

### 1. Over-Dynamic System
- Feature templates are highly flexible
- Fields can be configured with many properties
- **Problem**: Hard for developers to visualize and understand the complete flow

### 2. Template Limitations
- No matter how flexible templates are, they can't cover all edge cases
- Complex business logic, conditional flows, and dependent APIs need custom code

### 3. Custom Code Integration Gap
- If we add custom code using simple if/else, it breaks the template-driven approach
- Need a **structured way** for the generic engine to know when/how to call custom code

### 4. Cascading/Dependent Fields
- Many integrations need multi-step user input (dropdowns that depend on previous selections)
- Current template structure doesn't support this pattern well

---

## Proposed Solution: Hybrid Approach

### Core Concept: Templates + Custom Handlers

```
┌─────────────────────────────────────────────────────────────┐
│                    Feature Template                          │
│                   (Generic & Reusable)                       │
│                                                              │
│  - Basic field definitions                                  │
│  - Common properties (label, type, required, etc.)         │
│  - Works across multiple integrations                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    Feature is created
                            ↓
┌─────────────────────────────────────────────────────────────┐
│            Feature-Integration Mapping                       │
│           (Integration-Specific Customization)              │
│                                                              │
│  1. Use existing fields from Feature Template               │
│  2. Add EXTRA fields specific to this integration           │
│     (e.g., sheetId, subSheetId for Google Sheets)          │
│  3. Attach Custom Handler Functions to ANY field            │
│     - For Values (fetch dynamic options)                    │
│     - For Validation (custom validation logic)              │
│     - For Submit (custom submission logic)                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
                  Handlers stored in code
                  (NOT in database)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│         integrations/[integration-name]/handlers.js         │
│                                                              │
│  - All custom handler functions                             │
│  - Version controlled with code                             │
│  - Testable, maintainable                                   │
│  - Fixed return format contract                             │
└─────────────────────────────────────────────────────────────┘
```

### Key Principles
1. **Feature templates stay clean and generic** - No integration-specific complexity
2. **Extra fields added during mapping** - Integration-specific needs handled at mapping layer
3. **Handlers in code, not DB** - Better for version control, testing, and performance
4. **Fixed contracts** - Handlers must follow strict return format for engine compatibility
5. **Bypass mechanism** - Custom handlers override default engine behavior when needed

---

## Architecture Overview

### System Layers

```
┌──────────────────────────────────────────────────────────────┐
│                    Admin Panel UI Layer                       │
│  - Create Feature Templates                                  │
│  - Map Features to Integrations                              │
│  - Configure extra fields + attach handlers                  │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                   Template Storage Layer                      │
│  - features-definition.json (Feature templates)              │
│  - integration-mapping.json (Mapping configs)                │
│  - Extra fields configuration                                │
│  - Handler function references (names only)                  │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                   Execution Engine Layer                      │
│  - Reads feature + integration config                        │
│  - Renders fields dynamically                                │
│  - Calls handlers when specified                             │
│  - Executes default behavior when no handler                 │
│  - Handles errors and logging                                │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                   Custom Handler Layer                        │
│  integrations/[name]/handlers.js                             │
│  - valueHandler functions                                    │
│  - validationHandler functions                               │
│  - submitHandler functions                                   │
│  - Shared utility functions                                  │
└──────────────────────────────────────────────────────────────┘
```

---

## Custom Handler Types

### 1. Value Handler (`valueHandler`)

**Purpose**: Fetch or compute the value for a field dynamically

**Use Cases**:
- Fetch options for a dropdown from an API
- Compute a value based on other fields
- Fetch dependent data (cascading selects)
- Load data from external sources

**Example Scenarios**:
- Fetch list of Google Sheets for a user
- Get available subsheets based on selected sheet
- Fetch available tags from a CRM system
- Get list of email templates

**When Called**:
- When the field is rendered (for initial options)
- When a dependent field changes (for cascading selects)
- On-demand when user interacts with the field

---

### 2. Validation Handler (`validationHandler`)

**Purpose**: Custom validation logic beyond simple type checking

**Use Cases**:
- Check if a value already exists in external system
- Validate format against complex rules
- Cross-field validation
- API-based validation (e.g., check if email domain is valid)

**Example Scenarios**:
- Validate that sheet name doesn't already exist
- Check if email address is deliverable
- Verify that API key is valid by testing it
- Ensure phone number format matches integration requirements

**When Called**:
- On field blur (when user leaves the field)
- On form submit (before final submission)
- On-demand validation trigger

---

### 3. Submit Handler (`submitHandler`)

**Purpose**: Custom submission logic that overrides or extends default behavior

**Use Cases**:
- Transform data before sending to API
- Make multiple API calls in sequence
- Handle complex submission flows
- Custom error handling and retry logic

**Example Scenarios**:
- First create a sheet, then add rows to it
- Upload a file, then create a record with the file URL
- Transform data format to match integration API requirements
- Batch processing of multiple records

**When Called**:
- During final form submission
- As part of workflow execution
- When trigger fires (for automated workflows)

---

## Context Object Structure

### What Gets Passed to Handlers

Every handler receives a `context` object with complete information about the current state:

```javascript
{
  // Current field being processed
  field: {
    key: "subsheet_id",
    label: "Select Subsheet",
    type: "dynamic",
    fieldType: "string",
    htmlType: "select",
    required: true,
    description: "Choose the subsheet to work with"
  },

  // All form data filled so far
  formData: {
    sheet_id: "abc123",
    subsheet_id: null,  // Current field not filled yet
    row_number: 5,
    // ... other field values
  },

  // Integration configuration and credentials
  integration: {
    id: "google_sheets_client_1",
    name: "My Google Sheets Connection",
    type: "google-sheets",
    credentials: {
      // Sensitive data (API keys, tokens)
      // Should be masked/protected appropriately
      apiKey: "***masked***",
      accessToken: "***masked***"
    },
    baseUrl: "https://sheets.googleapis.com/v4",
    config: {
      // Any integration-specific configuration
    }
  },

  // Runtime context
  runtime: {
    userId: "user_123",
    workflowId: "workflow_456",
    executionId: "exec_789",
    timestamp: "2025-11-24T10:30:00Z",
    mode: "test" | "production"
  },

  // Results from previous handler calls
  previousStepResults: [
    {
      fieldKey: "sheet_id",
      handlerType: "valueHandler",
      result: {
        success: true,
        value: [
          { id: "sheet_abc", label: "Sales Data" },
          { id: "sheet_xyz", label: "Customer List" }
        ]
      }
    }
  ],

  // Utility functions provided by engine
  utils: {
    // HTTP client with auth already configured
    apiClient: {
      get: (path, options) => Promise,
      post: (path, data, options) => Promise,
      put: (path, data, options) => Promise,
      delete: (path, options) => Promise
    },
    // Logging
    logger: {
      info: (message, meta) => void,
      error: (message, meta) => void,
      warn: (message, meta) => void
    },
    // Data transformation helpers
    transform: {
      // Common transformation utilities
    }
  }
}
```

### Context Structure - Future Finalization

The exact structure will be finalized during implementation, but should include:
- ✅ Current field configuration
- ✅ All form data
- ✅ Integration credentials (securely handled)
- ✅ Previous API responses
- ✅ User session data
- ✅ Utility functions (API client, logger, etc.)

---

## Return Format Contracts

### Value Handler Return Format

```javascript
{
  success: boolean,           // Required: Whether operation succeeded

  value: Array<{              // Required: Array of options (even if single value)
    id: string | number,      // Unique identifier for this option
    label?: string,           // Display label (defaults to id if not provided)
    // Any other custom properties for this option
  }>,

  error?: string,             // Optional: Error message if success = false

  metadata?: {                // Optional: Additional information
    cached: boolean,          // Was this from cache?
    timestamp: string,        // When was this fetched?
    source: string,           // Where did this data come from?
    // ... any other metadata
  }
}
```

**Example - Success**:
```javascript
{
  success: true,
  value: [
    { id: "sheet_1", label: "Sales Data 2024" },
    { id: "sheet_2", label: "Customer List" },
    { id: "sheet_3", label: "Inventory" }
  ],
  metadata: {
    cached: false,
    timestamp: "2025-11-24T10:30:00Z",
    source: "google_sheets_api"
  }
}
```

**Example - Error**:
```javascript
{
  success: false,
  value: [],
  error: "Failed to fetch sheets: Invalid API credentials"
}
```

---

### Validation Handler Return Format

```javascript
{
  isValid: boolean,           // Required: Whether validation passed

  error?: string,             // Optional: Main error message

  warnings?: Array<string>    // Optional: Non-blocking warnings
}
```

**Example - Valid**:
```javascript
{
  isValid: true
}
```

**Example - Invalid with warning**:
```javascript
{
  isValid: false,
  error: "Sheet name must be between 3-50 characters",
  warnings: ["Sheet name contains special characters which may cause issues"]
}
```

---

### Submit Handler Return Format

```javascript
{
  success: boolean,                    // Required: Whether submission succeeded

  response: Array<{                    // Required: Array of result objects
    // Field mappings from the integration response
    // Structure depends on the integration
    field1: value1,
    field2: value2,
    // ...
  }>,

  error?: string,                      // Optional: Error message if failed

  shouldContinue: boolean,             // Required: Continue default flow or stop?

  metadata?: {                         // Optional: Additional info
    duration: number,                  // Execution time in ms
    apiCallsMade: number,              // How many API calls were made
    recordsProcessed: number,          // How many records were handled
    // ... any other metadata
  }
}
```

**Example - Success**:
```javascript
{
  success: true,
  response: [
    {
      id: "row_123",
      name: "John Doe",
      email: "john@example.com",
      createdAt: "2025-11-24T10:30:00Z"
    },
    {
      id: "row_124",
      name: "Jane Smith",
      email: "jane@example.com",
      createdAt: "2025-11-24T10:30:05Z"
    }
  ],
  shouldContinue: false,  // Custom handler fully handled submission
  metadata: {
    duration: 1250,
    apiCallsMade: 3,
    recordsProcessed: 2
  }
}
```

**Example - Partial Success**:
```javascript
{
  success: true,
  response: [
    {
      id: "sheet_xyz",
      url: "https://sheets.google.com/sheet_xyz"
    }
  ],
  shouldContinue: true,  // Let engine continue with additional default processing
  metadata: {
    duration: 850,
    apiCallsMade: 1
  }
}
```

**Example - Error**:
```javascript
{
  success: false,
  response: [],
  error: "Failed to create row: Quota exceeded for Google Sheets API",
  shouldContinue: false
}
```

---

## Handler Organization

### File Structure

```
integrations/
├── google-sheets/
│   ├── config.json              # Integration configuration
│   ├── handlers.js              # ⭐ All custom handlers
│   ├── utils.js                 # Shared utility functions
│   └── README.md                # Integration-specific docs
├── salesforce/
│   ├── config.json
│   ├── handlers.js
│   └── utils.js
├── hubspot/
│   ├── config.json
│   ├── handlers.js
│   └── utils.js
└── ...
```

### handlers.js Structure

**Approach**: Write functions directly, export only what's needed

```javascript
// integrations/google-sheets/handlers.js

const { apiClient, logger } = require('../../utils/engine-utils');
const { transformSheetData, validateSheetName } = require('./utils');

// ==========================================
// VALUE HANDLERS
// ==========================================

/**
 * Fetch list of available sheets for the connected account
 * @param {Object} context - Execution context from engine
 * @returns {Promise<Object>} Handler result with sheets list
 */
async function fetchSheets(context) {
  try {
    logger.info('Fetching Google Sheets list', { userId: context.runtime.userId });

    const response = await context.utils.apiClient.get('/spreadsheets', {
      headers: {
        'Authorization': `Bearer ${context.integration.credentials.accessToken}`
      }
    });

    const sheets = response.files.map(sheet => ({
      id: sheet.id,
      label: sheet.name,
      createdAt: sheet.createdTime
    }));

    return {
      success: true,
      value: sheets,
      metadata: {
        cached: false,
        timestamp: new Date().toISOString(),
        source: 'google_sheets_api',
        count: sheets.length
      }
    };

  } catch (error) {
    logger.error('Failed to fetch sheets', { error: error.message });

    return {
      success: false,
      value: [],
      error: `Failed to fetch sheets: ${error.message}`
    };
  }
}

/**
 * Fetch subsheets (tabs) for a specific sheet
 * Handler internally checks dependency on sheet_id
 */
async function fetchSubsheets(context) {
  // Dependency check: sheet_id must be selected first
  if (!context.formData.sheet_id) {
    return {
      success: false,
      value: [],
      error: 'Please select a sheet first'
    };
  }

  try {
    const sheetId = context.formData.sheet_id;

    logger.info('Fetching subsheets', { sheetId, userId: context.runtime.userId });

    const response = await context.utils.apiClient.get(
      `/spreadsheets/${sheetId}`,
      {
        headers: {
          'Authorization': `Bearer ${context.integration.credentials.accessToken}`
        },
        params: {
          fields: 'sheets.properties(sheetId,title)'
        }
      }
    );

    const subsheets = response.sheets.map(sheet => ({
      id: sheet.properties.sheetId,
      label: sheet.properties.title
    }));

    return {
      success: true,
      value: subsheets,
      metadata: {
        cached: false,
        timestamp: new Date().toISOString(),
        source: 'google_sheets_api',
        parentSheetId: sheetId
      }
    };

  } catch (error) {
    logger.error('Failed to fetch subsheets', { error: error.message });

    return {
      success: false,
      value: [],
      error: `Failed to fetch subsheets: ${error.message}`
    };
  }
}

// ==========================================
// VALIDATION HANDLERS
// ==========================================

/**
 * Validate sheet name before creation
 */
async function validateSheetName(context) {
  const sheetName = context.formData.sheet_name;

  // Basic validation
  if (!sheetName || sheetName.length < 3) {
    return {
      isValid: false,
      error: 'Sheet name must be at least 3 characters long'
    };
  }

  if (sheetName.length > 50) {
    return {
      isValid: false,
      error: 'Sheet name must not exceed 50 characters'
    };
  }

  // Check for special characters
  const hasSpecialChars = /[^a-zA-Z0-9\s\-_]/.test(sheetName);
  const warnings = [];

  if (hasSpecialChars) {
    warnings.push('Sheet name contains special characters which may cause issues');
  }

  // Check if sheet name already exists (API call)
  try {
    const existingSheets = await context.utils.apiClient.get('/spreadsheets', {
      headers: {
        'Authorization': `Bearer ${context.integration.credentials.accessToken}`
      },
      params: {
        q: `name='${sheetName}'`
      }
    });

    if (existingSheets.files && existingSheets.files.length > 0) {
      return {
        isValid: false,
        error: `A sheet named "${sheetName}" already exists`,
        warnings
      };
    }

  } catch (error) {
    logger.warn('Could not check for duplicate sheet name', { error: error.message });
    warnings.push('Could not verify if sheet name is unique');
  }

  return {
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

// ==========================================
// SUBMIT HANDLERS
// ==========================================

/**
 * Custom submission handler for creating sheet and adding initial data
 * This handler performs multiple operations in sequence
 */
async function createSheetWithData(context) {
  try {
    const { sheet_name, initial_data } = context.formData;

    logger.info('Creating sheet with initial data', {
      sheetName: sheet_name,
      userId: context.runtime.userId
    });

    // Step 1: Create the sheet
    const createResponse = await context.utils.apiClient.post(
      '/spreadsheets',
      {
        properties: {
          title: sheet_name
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${context.integration.credentials.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const sheetId = createResponse.spreadsheetId;
    logger.info('Sheet created successfully', { sheetId });

    // Step 2: Add initial data if provided
    if (initial_data && initial_data.length > 0) {
      await context.utils.apiClient.post(
        `/spreadsheets/${sheetId}/values/A1:append`,
        {
          values: initial_data
        },
        {
          headers: {
            'Authorization': `Bearer ${context.integration.credentials.accessToken}`,
            'Content-Type': 'application/json'
          },
          params: {
            valueInputOption: 'USER_ENTERED'
          }
        }
      );

      logger.info('Initial data added successfully', { sheetId, rowCount: initial_data.length });
    }

    return {
      success: true,
      response: [
        {
          id: sheetId,
          name: sheet_name,
          url: createResponse.spreadsheetUrl,
          createdAt: new Date().toISOString(),
          rowsAdded: initial_data ? initial_data.length : 0
        }
      ],
      shouldContinue: false,  // We fully handled the submission
      metadata: {
        duration: Date.now() - context.runtime.startTime,
        apiCallsMade: initial_data ? 2 : 1,
        recordsProcessed: 1
      }
    };

  } catch (error) {
    logger.error('Failed to create sheet', { error: error.message });

    return {
      success: false,
      response: [],
      error: `Failed to create sheet: ${error.message}`,
      shouldContinue: false
    };
  }
}

// ==========================================
// SHARED UTILITY FUNCTIONS (Not exported)
// ==========================================

function normalizeSheetData(rawData) {
  // Internal helper function
  // Not exported as it's only used internally
  return rawData.map(item => ({
    // ... transformation logic
  }));
}

// ==========================================
// EXPORTS
// ==========================================
// Only export functions that are referenced in feature-integration mapping

module.exports = {
  // Value Handlers
  fetchSheets,
  fetchSubsheets,

  // Validation Handlers
  validateSheetName,

  // Submit Handlers
  createSheetWithData
};
```

### Key Points:
1. **Direct function definitions** - No complex nesting
2. **Export only what's needed** - Internal helpers stay private
3. **Reusable functions** - Same function can be used in multiple handler mappings
4. **Clear separation** - Organized by handler type with comments
5. **Comprehensive error handling** - Try-catch with proper error returns
6. **Logging** - Track operations for debugging
7. **JSDoc comments** - Document each handler's purpose and signature

---

## Handler Discovery & Execution

### How Engine Resolves Handlers

**During Feature-Integration Mapping**, admin configures:

```json
{
  "featureId": "fetch_sheet_row",
  "integrationId": "google-sheets",
  "fieldMappings": {
    "sheet_id": {
      "customHandlers": {
        "valueHandler": "fetchSheets"  // ← Function name as string
      }
    },
    "subsheet_id": {
      "customHandlers": {
        "valueHandler": "fetchSubsheets"  // ← Function name as string
      }
    }
  }
}
```

**At Runtime**, engine resolves and calls handlers:

```javascript
// engine/handler-executor.js

class HandlerExecutor {

  /**
   * Execute a custom handler for a field
   */
  async executeHandler(fieldConfig, handlerType, context) {
    try {
      // 1. Get handler function name from field config
      const handlerName = fieldConfig.customHandlers?.[handlerType];

      if (!handlerName) {
        // No custom handler, use default behavior
        return this.executeDefaultBehavior(fieldConfig, handlerType, context);
      }

      // 2. Resolve the handler function
      const integrationId = context.integration.type;  // e.g., "google-sheets"
      const handlersModule = require(`../../integrations/${integrationId}/handlers.js`);

      // 3. Get the specific handler function
      const handlerFunction = handlersModule[handlerName];

      if (!handlerFunction) {
        throw new Error(`Handler function '${handlerName}' not found in ${integrationId}/handlers.js`);
      }

      // 4. Execute the handler with context
      const result = await handlerFunction(context);

      // 5. Validate return format
      this.validateHandlerResult(result, handlerType);

      // 6. Log execution for monitoring
      this.logHandlerExecution(handlerName, handlerType, result, context);

      return result;

    } catch (error) {
      // Handle and log errors
      return this.handleExecutionError(error, fieldConfig, handlerType, context);
    }
  }

  /**
   * Validate that handler returned correct format
   */
  validateHandlerResult(result, handlerType) {
    switch (handlerType) {
      case 'valueHandler':
        if (!result.hasOwnProperty('success') || !Array.isArray(result.value)) {
          throw new Error('valueHandler must return { success, value: Array }');
        }
        break;

      case 'validationHandler':
        if (!result.hasOwnProperty('isValid')) {
          throw new Error('validationHandler must return { isValid }');
        }
        break;

      case 'submitHandler':
        if (!result.hasOwnProperty('success') || !result.hasOwnProperty('shouldContinue')) {
          throw new Error('submitHandler must return { success, shouldContinue }');
        }
        break;
    }
  }

  /**
   * Execute default engine behavior when no custom handler
   */
  executeDefaultBehavior(fieldConfig, handlerType, context) {
    // Default implementation based on field type
    // ...
  }

  /**
   * Log handler execution for monitoring and debugging
   */
  logHandlerExecution(handlerName, handlerType, result, context) {
    logger.info('Handler executed', {
      handler: handlerName,
      type: handlerType,
      success: result.success || result.isValid,
      integrationId: context.integration.id,
      userId: context.runtime.userId,
      executionTime: Date.now() - context.runtime.startTime
    });
  }

  /**
   * Handle execution errors gracefully
   */
  handleExecutionError(error, fieldConfig, handlerType, context) {
    logger.error('Handler execution failed', {
      error: error.message,
      stack: error.stack,
      field: fieldConfig.key,
      handlerType,
      integrationId: context.integration.id
    });

    // Return error in appropriate format
    switch (handlerType) {
      case 'valueHandler':
        return {
          success: false,
          value: [],
          error: `Handler failed: ${error.message}`
        };

      case 'validationHandler':
        return {
          isValid: false,
          error: `Validation failed: ${error.message}`
        };

      case 'submitHandler':
        return {
          success: false,
          response: [],
          error: `Submission failed: ${error.message}`,
          shouldContinue: false
        };
    }
  }
}

module.exports = HandlerExecutor;
```

### Execution Flow Diagram

```
User fills form field → Engine detects field has custom handler
                             ↓
              Engine reads handler name from config
                             ↓
              require('integrations/[type]/handlers.js')
                             ↓
              Get handler function by name
                             ↓
              Build context object with all needed data
                             ↓
              Execute: await handlerFunction(context)
                             ↓
              Validate return format matches contract
                             ↓
              ┌─────────────────────────────────┐
              │  success = true?                │
              └─────────────────────────────────┘
                    │ Yes              │ No
                    ↓                  ↓
              Use returned       Show error to user
              value/result       + Log to reports
                    ↓                  ↓
              Continue flow      Stop/Retry based
                                on error type
```

---

## Dependency Handling (Cascading Fields)

### Approach: Handler Handles Dependencies Internally

We chose **Option B** from the design discussion: Dependencies are managed within the handler logic itself, not through explicit declaration in templates.

### Why This Approach?

**Pros**:
- Simpler template structure
- More flexible - handler has full control
- Easier to implement complex conditional dependencies
- No need for engine to understand dependency graphs

**Cons**:
- Dependency logic scattered in handlers
- Need to ensure consistent patterns across handlers

### Implementation Pattern

```javascript
// Pattern for dependent field handler

async function fetchDependentData(context) {
  // 1. CHECK DEPENDENCIES FIRST
  const requiredField = context.formData.parent_field;

  if (!requiredField) {
    return {
      success: false,
      value: [],
      error: 'Please select [Parent Field Name] first'
    };
  }

  // 2. VALIDATE DEPENDENCY VALUE
  if (!isValidParentValue(requiredField)) {
    return {
      success: false,
      value: [],
      error: 'Invalid selection for [Parent Field Name]'
    };
  }

  // 3. FETCH DEPENDENT DATA
  try {
    const data = await fetchFromAPI(requiredField);

    return {
      success: true,
      value: data,
      metadata: {
        dependsOn: 'parent_field',
        parentValue: requiredField
      }
    };
  } catch (error) {
    return {
      success: false,
      value: [],
      error: error.message
    };
  }
}
```

### UI Behavior for Cascading Fields

```javascript
// Frontend behavior

// When parent field changes:
document.getElementById('sheet_id').addEventListener('change', async (e) => {
  const sheetId = e.target.value;

  // 1. Clear dependent field
  document.getElementById('subsheet_id').value = '';
  document.getElementById('subsheet_id').disabled = true;

  if (!sheetId) {
    return;  // No selection, keep disabled
  }

  // 2. Show loading state
  showLoadingSpinner('subsheet_id');

  // 3. Call handler to fetch dependent options
  try {
    const result = await engine.executeFieldHandler('subsheet_id', 'valueHandler');

    if (result.success) {
      // 4. Populate dependent field
      populateSelectOptions('subsheet_id', result.value);
      document.getElementById('subsheet_id').disabled = false;
    } else {
      // 5. Show error
      showFieldError('subsheet_id', result.error);
    }
  } catch (error) {
    showFieldError('subsheet_id', 'Failed to load options');
  } finally {
    hideLoadingSpinner('subsheet_id');
  }
});
```

### Example: Google Sheets Cascading Flow

```
User Action: Opens form to fetch sheet row

Step 1: sheet_id field
  ↓
  valueHandler: fetchSheets() called
  ↓
  Returns: [Sheet1, Sheet2, Sheet3]
  ↓
  User selects: Sheet2
  ↓
  onChange event fired

Step 2: subsheet_id field
  ↓
  UI: Clear and disable subsheet_id field
  ↓
  valueHandler: fetchSubsheets(context) called
  ↓
  Handler checks: context.formData.sheet_id exists? YES
  ↓
  Handler makes API call with sheet_id = Sheet2
  ↓
  Returns: [SubsheetA, SubsheetB, SubsheetC]
  ↓
  UI: Populate and enable subsheet_id field
  ↓
  User selects: SubsheetA

Step 3: Form submission
  ↓
  submitHandler receives both sheet_id and subsheet_id
  ↓
  Fetches row from Sheet2 > SubsheetA
```

---

## Error Handling Strategy

### Principles
1. **User-Friendly Messages** - Show clear, actionable errors to users
2. **Comprehensive Logging** - Log all errors with context for debugging
3. **Graceful Degradation** - System should handle handler failures without crashing
4. **Report Generation** - Save errors to reports for admin review

### Error Types and Handling

#### 1. Handler Execution Errors

```javascript
// Handler crashes or throws exception

try {
  const result = await handlerFunction(context);
} catch (error) {
  // Log with full context
  logger.error('Handler execution failed', {
    handlerName,
    error: error.message,
    stack: error.stack,
    context: {
      fieldKey: context.field.key,
      integrationId: context.integration.id,
      userId: context.runtime.userId
    }
  });

  // Save to error reports
  await saveErrorReport({
    type: 'handler_execution_error',
    handler: handlerName,
    error: error.message,
    context: sanitizeContext(context),  // Remove sensitive data
    timestamp: new Date().toISOString()
  });

  // Return user-friendly error
  return {
    success: false,
    value: [],
    error: 'An error occurred while processing this field. Please try again or contact support.'
  };
}
```

#### 2. API Errors

```javascript
// External API call fails

async function fetchSheets(context) {
  try {
    const response = await context.utils.apiClient.get('/spreadsheets');
    // ... success handling
  } catch (apiError) {

    // Categorize API errors
    if (apiError.status === 401) {
      return {
        success: false,
        value: [],
        error: 'Authentication failed. Please reconnect your Google Sheets account.'
      };
    }

    if (apiError.status === 429) {
      return {
        success: false,
        value: [],
        error: 'Rate limit exceeded. Please try again in a few minutes.'
      };
    }

    if (apiError.status >= 500) {
      return {
        success: false,
        value: [],
        error: 'Google Sheets service is temporarily unavailable. Please try again later.'
      };
    }

    // Generic API error
    return {
      success: false,
      value: [],
      error: `Failed to fetch sheets: ${apiError.message}`
    };
  }
}
```

#### 3. Validation Errors

```javascript
// Data validation fails

async function validateSheetName(context) {
  const sheetName = context.formData.sheet_name;

  if (!sheetName) {
    return {
      isValid: false,
      error: 'Sheet name is required'
    };
  }

  if (sheetName.length < 3) {
    return {
      isValid: false,
      error: 'Sheet name must be at least 3 characters'
    };
  }

  // Complex validation might fail
  try {
    const isDuplicate = await checkDuplicateSheetName(sheetName);
    if (isDuplicate) {
      return {
        isValid: false,
        error: 'A sheet with this name already exists'
      };
    }
  } catch (error) {
    // Log but don't fail validation
    logger.warn('Could not check duplicate sheet name', { error: error.message });
    return {
      isValid: true,
      warnings: ['Could not verify if sheet name is unique']
    };
  }

  return { isValid: true };
}
```

#### 4. Return Format Validation Errors

```javascript
// Handler returns incorrect format

function validateHandlerResult(result, handlerType) {
  try {
    switch (handlerType) {
      case 'valueHandler':
        if (!result.hasOwnProperty('success')) {
          throw new Error('Missing required field: success');
        }
        if (!Array.isArray(result.value)) {
          throw new Error('Field "value" must be an array');
        }
        break;
      // ... other types
    }
  } catch (validationError) {
    logger.error('Handler returned invalid format', {
      handlerType,
      expectedFormat: getExpectedFormat(handlerType),
      actualResult: result,
      error: validationError.message
    });

    throw new Error(`Handler returned invalid format: ${validationError.message}`);
  }
}
```

### Error Reporting System

```javascript
// errors/reporter.js

class ErrorReporter {

  async saveErrorReport(errorData) {
    const report = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      type: errorData.type,
      severity: this.determineSeverity(errorData),
      context: {
        integration: errorData.context?.integration?.id,
        user: errorData.context?.runtime?.userId,
        workflow: errorData.context?.runtime?.workflowId
      },
      error: {
        message: errorData.error,
        stack: errorData.stack,
        handler: errorData.handler
      },
      metadata: errorData.metadata
    };

    // Save to database
    await db.collection('error_reports').insert(report);

    // For critical errors, notify admin
    if (report.severity === 'critical') {
      await this.notifyAdmin(report);
    }

    return report.id;
  }

  determineSeverity(errorData) {
    // Authentication failures = critical
    if (errorData.error?.includes('Authentication failed')) {
      return 'critical';
    }

    // API errors = high
    if (errorData.type === 'api_error') {
      return 'high';
    }

    // Validation errors = medium
    if (errorData.type === 'validation_error') {
      return 'medium';
    }

    return 'low';
  }
}
```

---

## Complete Implementation Example: Google Sheets

### Scenario
Feature: **Fetch Row from Google Sheet**

Complexity: Requires cascading selects (Sheet → Subsheet → Row)

### Step 1: Feature Template Definition

```json
{
  "id": "fetch_sheet_row",
  "name": "Fetch Sheet Row",
  "description": "Fetch a specific row from Google Sheets",
  "category": "data_fetch",
  "fields": {
    "row_number": {
      "type": "dynamic",
      "label": "Row Number",
      "required": true,
      "fieldType": "number",
      "htmlType": "number",
      "description": "The row number to fetch (1-based index)"
    },
    "include_headers": {
      "type": "static",
      "label": "Include Headers",
      "required": false,
      "fieldType": "boolean",
      "htmlType": "checkbox",
      "default": true,
      "description": "Include column headers in response"
    }
  }
}
```

### Step 2: Feature-Integration Mapping

When admin maps this feature to Google Sheets integration:

```json
{
  "featureId": "fetch_sheet_row",
  "integrationId": "google-sheets",
  "integrationName": "Google Sheets - Main Account",

  "fieldMappings": {
    // Existing fields from template (no handlers needed)
    "row_number": {
      "enabled": true
    },
    "include_headers": {
      "enabled": true
    }
  },

  "extraFields": [
    // Extra field 1: Sheet selection
    {
      "field_key": "sheet_id",
      "label": "Select Sheet",
      "type": "dynamic",
      "fieldType": "string",
      "htmlType": "select",
      "required": true,
      "description": "Choose the Google Sheet to fetch from",
      "customHandlers": {
        "valueHandler": "fetchSheets"
      }
    },

    // Extra field 2: Subsheet selection (depends on sheet_id)
    {
      "field_key": "subsheet_id",
      "label": "Select Tab/Subsheet",
      "type": "dynamic",
      "fieldType": "string",
      "htmlType": "select",
      "required": true,
      "description": "Choose the specific tab within the sheet",
      "customHandlers": {
        "valueHandler": "fetchSubsheets"
      }
    }
  ],

  "submitHandler": "fetchSheetRow"
}
```

### Step 3: Handler Implementation

```javascript
// integrations/google-sheets/handlers.js

const { apiClient, logger } = require('../../utils/engine-utils');

// VALUE HANDLER: Fetch list of sheets
async function fetchSheets(context) {
  try {
    const response = await context.utils.apiClient.get(
      'https://www.googleapis.com/drive/v3/files',
      {
        headers: {
          'Authorization': `Bearer ${context.integration.credentials.accessToken}`
        },
        params: {
          q: "mimeType='application/vnd.google-apps.spreadsheet'",
          fields: 'files(id, name, createdTime)',
          orderBy: 'modifiedTime desc'
        }
      }
    );

    const sheets = response.files.map(file => ({
      id: file.id,
      label: file.name,
      createdAt: file.createdTime
    }));

    return {
      success: true,
      value: sheets,
      metadata: {
        count: sheets.length,
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    logger.error('Failed to fetch sheets', { error: error.message });
    return {
      success: false,
      value: [],
      error: 'Failed to load sheets. Please check your connection.'
    };
  }
}

// VALUE HANDLER: Fetch subsheets for selected sheet
async function fetchSubsheets(context) {
  // Check dependency
  if (!context.formData.sheet_id) {
    return {
      success: false,
      value: [],
      error: 'Please select a sheet first'
    };
  }

  try {
    const sheetId = context.formData.sheet_id;

    const response = await context.utils.apiClient.get(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`,
      {
        headers: {
          'Authorization': `Bearer ${context.integration.credentials.accessToken}`
        },
        params: {
          fields: 'sheets.properties(sheetId,title,index)'
        }
      }
    );

    const subsheets = response.sheets.map(sheet => ({
      id: sheet.properties.sheetId.toString(),
      label: sheet.properties.title,
      index: sheet.properties.index
    }));

    return {
      success: true,
      value: subsheets,
      metadata: {
        parentSheetId: sheetId,
        count: subsheets.length
      }
    };

  } catch (error) {
    logger.error('Failed to fetch subsheets', { error: error.message });
    return {
      success: false,
      value: [],
      error: 'Failed to load tabs. Please try again.'
    };
  }
}

// SUBMIT HANDLER: Fetch the actual row
async function fetchSheetRow(context) {
  try {
    const { sheet_id, subsheet_id, row_number, include_headers } = context.formData;

    // Validation
    if (!sheet_id || !subsheet_id || !row_number) {
      return {
        success: false,
        response: [],
        error: 'Missing required fields',
        shouldContinue: false
      };
    }

    // Get subsheet name for API call
    const subsheetName = await getSubsheetName(sheet_id, subsheet_id, context);

    // Fetch the row
    const range = include_headers
      ? `${subsheetName}!A1:Z${row_number}`  // Include headers
      : `${subsheetName}!A${row_number}:Z${row_number}`;  // Just the row

    const response = await context.utils.apiClient.get(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheet_id}/values/${range}`,
      {
        headers: {
          'Authorization': `Bearer ${context.integration.credentials.accessToken}`
        }
      }
    );

    // Transform response
    const values = response.values || [];
    let result = [];

    if (include_headers && values.length >= 2) {
      const headers = values[0];
      const rowData = values[values.length - 1];

      result = headers.map((header, index) => ({
        column: header,
        value: rowData[index] || ''
      }));
    } else {
      const rowData = values[0] || [];
      result = rowData.map((value, index) => ({
        column: String.fromCharCode(65 + index),  // A, B, C, ...
        value: value
      }));
    }

    return {
      success: true,
      response: result,
      shouldContinue: false,
      metadata: {
        sheetId: sheet_id,
        subsheetId: subsheet_id,
        rowNumber: row_number,
        columnsFound: result.length
      }
    };

  } catch (error) {
    logger.error('Failed to fetch row', { error: error.message });
    return {
      success: false,
      response: [],
      error: `Failed to fetch row: ${error.message}`,
      shouldContinue: false
    };
  }
}

// Helper function
async function getSubsheetName(sheetId, subsheetId, context) {
  const response = await context.utils.apiClient.get(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`,
    {
      headers: {
        'Authorization': `Bearer ${context.integration.credentials.accessToken}`
      },
      params: {
        fields: 'sheets.properties(sheetId,title)'
      }
    }
  );

  const subsheet = response.sheets.find(
    s => s.properties.sheetId.toString() === subsheetId
  );

  return subsheet?.properties.title || 'Sheet1';
}

module.exports = {
  fetchSheets,
  fetchSubsheets,
  fetchSheetRow
};
```

### Step 4: UI Flow

```html
<!-- Form rendered by engine -->
<form id="fetch-row-form">

  <!-- Extra field 1: Sheet selector -->
  <div class="form-group">
    <label for="sheet_id">Select Sheet *</label>
    <select id="sheet_id" required>
      <option value="">Loading...</option>
    </select>
  </div>

  <!-- Extra field 2: Subsheet selector (disabled until sheet selected) -->
  <div class="form-group">
    <label for="subsheet_id">Select Tab/Subsheet *</label>
    <select id="subsheet_id" required disabled>
      <option value="">Select sheet first</option>
    </select>
  </div>

  <!-- Original field from template -->
  <div class="form-group">
    <label for="row_number">Row Number *</label>
    <input type="number" id="row_number" min="1" required>
  </div>

  <!-- Original field from template -->
  <div class="form-group">
    <label>
      <input type="checkbox" id="include_headers" checked>
      Include Headers
    </label>
  </div>

  <button type="submit">Fetch Row</button>
</form>

<script>
// Page load: Fetch sheets
document.addEventListener('DOMContentLoaded', async () => {
  const result = await engine.executeFieldHandler('sheet_id', 'valueHandler');

  if (result.success) {
    populateSelect('sheet_id', result.value);
  } else {
    showError(result.error);
  }
});

// Sheet selection: Fetch subsheets
document.getElementById('sheet_id').addEventListener('change', async (e) => {
  const subsheetSelect = document.getElementById('subsheet_id');
  subsheetSelect.innerHTML = '<option value="">Loading...</option>';
  subsheetSelect.disabled = true;

  if (!e.target.value) return;

  const result = await engine.executeFieldHandler('subsheet_id', 'valueHandler');

  if (result.success) {
    populateSelect('subsheet_id', result.value);
    subsheetSelect.disabled = false;
  } else {
    subsheetSelect.innerHTML = `<option value="">${result.error}</option>`;
  }
});

// Form submission
document.getElementById('fetch-row-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  showLoading();

  const result = await engine.executeSubmitHandler('fetchSheetRow');

  hideLoading();

  if (result.success) {
    displayResults(result.response);
  } else {
    showError(result.error);
  }
});
</script>
```

### Step 5: Result

User experience:
1. Page loads → Sees list of their Google Sheets
2. Selects "Sales Data 2024" → Subsheet dropdown populates with tabs
3. Selects "Q4 Results" tab → Can now enter row number
4. Enters row 5, checks "Include Headers" → Clicks "Fetch Row"
5. System fetches row 5 with headers → Displays formatted data

Behind the scenes:
- 3 API calls made (sheets list, subsheets list, fetch row)
- All handled by custom handlers
- Errors caught and displayed user-friendly
- All operations logged for debugging
- Generic engine orchestrates without knowing Google Sheets specifics

---

## Feature-Integration Mapping Flow

### Admin Workflow

```
Admin Dashboard
    ↓
Select "Map Feature to Integration"
    ↓
┌────────────────────────────────────┐
│  Step 1: Choose Feature            │
│  - Dropdown of all feature         │
│    templates                       │
│  - Select: "Fetch Sheet Row"       │
└────────────────────────────────────┘
    ↓
┌────────────────────────────────────┐
│  Step 2: Choose Integration        │
│  - Dropdown of configured          │
│    integrations                    │
│  - Select: "Google Sheets - Main"  │
└────────────────────────────────────┘
    ↓
┌────────────────────────────────────┐
│  Step 3: Configure Fields          │
│                                    │
│  Existing Fields (from template):  │
│  ✓ row_number (enabled)            │
│  ✓ include_headers (enabled)       │
│                                    │
│  [+ Add Extra Field]               │
└────────────────────────────────────┘
    ↓
Click "+ Add Extra Field"
    ↓
┌────────────────────────────────────┐
│  Extra Field Configuration Modal   │
│                                    │
│  Field Key: [sheet_id]             │
│  Label: [Select Sheet]             │
│  Type: [Dynamic ▼]                 │
│  Data Type: [String ▼]             │
│  HTML Type: [Select ▼]             │
│  Required: [✓]                     │
│  Description: [...]                │
│                                    │
│  Custom Handlers:                  │
│  ┌──────────────────────────────┐ │
│  │ Value Handler:                │ │
│  │ [fetchSheets           ▼]    │ │
│  │                               │ │
│  │ Validation Handler:           │ │
│  │ [None                  ▼]    │ │
│  │                               │ │
│  │ Submit Handler:               │ │
│  │ [None                  ▼]    │ │
│  └──────────────────────────────┘ │
│                                    │
│  [Cancel]  [Add Field]             │
└────────────────────────────────────┘
    ↓
Repeat for subsheet_id
    ↓
┌────────────────────────────────────┐
│  Step 4: Configure Submit Handler  │
│                                    │
│  Custom Submit Handler (optional): │
│  [fetchSheetRow           ▼]      │
│                                    │
│  If not specified, default engine  │
│  behavior will be used.            │
└────────────────────────────────────┘
    ↓
[Save Mapping]
    ↓
Mapping saved to database
    ↓
Feature now available in workflows!
```

### Mapping Configuration Storage

```json
{
  "id": "mapping_123",
  "featureId": "fetch_sheet_row",
  "integrationId": "google-sheets",
  "createdAt": "2025-11-24T10:00:00Z",
  "createdBy": "admin_user_456",

  "fieldMappings": {
    "row_number": {
      "enabled": true,
      "customHandlers": null
    },
    "include_headers": {
      "enabled": true,
      "customHandlers": null
    }
  },

  "extraFields": [
    {
      "field_key": "sheet_id",
      "label": "Select Sheet",
      "type": "dynamic",
      "fieldType": "string",
      "htmlType": "select",
      "required": true,
      "description": "Choose the Google Sheet to fetch from",
      "customHandlers": {
        "valueHandler": "fetchSheets",
        "validationHandler": null,
        "submitHandler": null
      },
      "order": 1
    },
    {
      "field_key": "subsheet_id",
      "label": "Select Tab/Subsheet",
      "type": "dynamic",
      "fieldType": "string",
      "htmlType": "select",
      "required": true,
      "description": "Choose the specific tab within the sheet",
      "customHandlers": {
        "valueHandler": "fetchSubsheets",
        "validationHandler": null,
        "submitHandler": null
      },
      "order": 2
    }
  ],

  "submitHandler": "fetchSheetRow",

  "metadata": {
    "version": "1.0",
    "lastModified": "2025-11-24T10:00:00Z",
    "modifiedBy": "admin_user_456"
  }
}
```

---

## Database Schema Considerations

### Tables/Collections Needed

#### 1. feature_integration_mappings
Stores mapping between features and integrations

```sql
CREATE TABLE feature_integration_mappings (
  id VARCHAR(50) PRIMARY KEY,
  feature_id VARCHAR(50) NOT NULL,
  integration_id VARCHAR(50) NOT NULL,

  -- JSON fields
  field_mappings JSON,          -- Which template fields are enabled
  extra_fields JSON,             -- Integration-specific extra fields
  submit_handler VARCHAR(100),   -- Global submit handler for this mapping

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(50),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by VARCHAR(50),
  version VARCHAR(20) DEFAULT '1.0',
  is_active BOOLEAN DEFAULT TRUE,

  -- Indexes
  INDEX idx_feature (feature_id),
  INDEX idx_integration (integration_id),
  INDEX idx_active (is_active),

  -- Constraints
  UNIQUE KEY unique_mapping (feature_id, integration_id),
  FOREIGN KEY (feature_id) REFERENCES features(id),
  FOREIGN KEY (integration_id) REFERENCES integrations(id)
);
```

#### 2. execution_logs
Track handler executions for monitoring and debugging

```sql
CREATE TABLE execution_logs (
  id VARCHAR(50) PRIMARY KEY,
  mapping_id VARCHAR(50),
  handler_name VARCHAR(100),
  handler_type ENUM('valueHandler', 'validationHandler', 'submitHandler'),

  -- Execution details
  status ENUM('success', 'error'),
  execution_time_ms INT,
  error_message TEXT,

  -- Context
  user_id VARCHAR(50),
  workflow_id VARCHAR(50),
  execution_id VARCHAR(50),

  -- Metadata
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_mapping (mapping_id),
  INDEX idx_handler (handler_name),
  INDEX idx_status (status),
  INDEX idx_timestamp (timestamp),
  INDEX idx_user (user_id)
);
```

#### 3. error_reports
Store detailed error information

```sql
CREATE TABLE error_reports (
  id VARCHAR(50) PRIMARY KEY,
  type ENUM('handler_execution_error', 'api_error', 'validation_error', 'system_error'),
  severity ENUM('low', 'medium', 'high', 'critical'),

  -- Error details
  error_message TEXT,
  error_stack TEXT,
  handler_name VARCHAR(100),

  -- Context
  integration_id VARCHAR(50),
  user_id VARCHAR(50),
  workflow_id VARCHAR(50),
  context_data JSON,

  -- Resolution
  status ENUM('open', 'investigating', 'resolved') DEFAULT 'open',
  resolved_at TIMESTAMP NULL,
  resolved_by VARCHAR(50),
  resolution_notes TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_type (type),
  INDEX idx_severity (severity),
  INDEX idx_status (status),
  INDEX idx_integration (integration_id),
  INDEX idx_created (created_at)
);
```

### MongoDB Alternative (if using NoSQL)

```javascript
// feature_integration_mappings collection
{
  _id: "mapping_123",
  featureId: "fetch_sheet_row",
  integrationId: "google-sheets",

  fieldMappings: {
    row_number: { enabled: true, customHandlers: null },
    include_headers: { enabled: true, customHandlers: null }
  },

  extraFields: [
    {
      field_key: "sheet_id",
      label: "Select Sheet",
      type: "dynamic",
      fieldType: "string",
      htmlType: "select",
      required: true,
      description: "Choose the Google Sheet",
      customHandlers: {
        valueHandler: "fetchSheets",
        validationHandler: null,
        submitHandler: null
      },
      order: 1
    }
    // ... more fields
  ],

  submitHandler: "fetchSheetRow",

  metadata: {
    version: "1.0",
    createdAt: new Date("2025-11-24T10:00:00Z"),
    createdBy: "admin_user_456",
    updatedAt: new Date("2025-11-24T10:00:00Z"),
    updatedBy: "admin_user_456",
    isActive: true
  }
}
```

---

## UI Requirements

### 1. Feature-Integration Mapping Page

**Components Needed**:
- Feature selector dropdown
- Integration selector dropdown
- Field configuration panel
- Extra field addition form
- Handler selector dropdowns
- Save/Cancel buttons

**Wireframe**:
```
┌─────────────────────────────────────────────────────┐
│  Map Feature to Integration                         │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Feature: [Fetch Sheet Row                    ▼]    │
│  Integration: [Google Sheets - Main           ▼]    │
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │ Existing Fields (from template)             │   │
│  │                                              │   │
│  │ ☑ row_number                                │   │
│  │   Type: Dynamic | Data: Number              │   │
│  │   [Configure Handlers]                      │   │
│  │                                              │   │
│  │ ☑ include_headers                           │   │
│  │   Type: Static | Data: Boolean              │   │
│  │   [Configure Handlers]                      │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │ Extra Fields (integration-specific)         │   │
│  │                                              │   │
│  │ 1. sheet_id                                 │   │
│  │    Label: Select Sheet                      │   │
│  │    Type: Dynamic | HTML: Select             │   │
│  │    Value Handler: fetchSheets               │   │
│  │    [Edit] [Remove]                          │   │
│  │                                              │   │
│  │ 2. subsheet_id                              │   │
│  │    Label: Select Tab/Subsheet               │   │
│  │    Type: Dynamic | HTML: Select             │   │
│  │    Value Handler: fetchSubsheets            │   │
│  │    [Edit] [Remove]                          │   │
│  │                                              │   │
│  │ [+ Add Extra Field]                         │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
│  Submit Handler (optional):                         │
│  [fetchSheetRow                               ▼]    │
│                                                      │
│  [Cancel]                        [Save Mapping]     │
└─────────────────────────────────────────────────────┘
```

### 2. Extra Field Configuration Modal

```
┌──────────────────────────────────────────────────┐
│  Add Extra Field                            [×]  │
├──────────────────────────────────────────────────┤
│                                                   │
│  Field Key: [sheet_id_________________]          │
│  Label: [Select Sheet_________________]          │
│                                                   │
│  Type: [Dynamic                          ▼]      │
│  Data Type: [String                      ▼]      │
│  HTML Type: [Select                      ▼]      │
│                                                   │
│  ☑ Required                                       │
│                                                   │
│  Description:                                     │
│  [Choose the Google Sheet to work with]          │
│  [______________________________________]         │
│                                                   │
│  ┌────────────────────────────────────────────┐  │
│  │  Custom Handlers                           │  │
│  │                                             │  │
│  │  Value Handler:                             │  │
│  │  [fetchSheets                          ▼]  │  │
│  │  Fetch dynamic options for this field      │  │
│  │                                             │  │
│  │  Validation Handler:                        │  │
│  │  [None                                 ▼]  │  │
│  │  Custom validation logic                    │  │
│  │                                             │  │
│  │  Submit Handler:                            │  │
│  │  [None                                 ▼]  │  │
│  │  Override default submit behavior          │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
│  [Cancel]                          [Add Field]   │
└──────────────────────────────────────────────────┘
```

### 3. Handler Selector Dropdown

Handler dropdown should show available handlers from the integration's `handlers.js`:

```
[Select Handler                               ▼]

Dropdown options:
────────────────────────────
Value Handlers:
  fetchSheets
  fetchSubsheets
  fetchUsers
  fetchTemplates
────────────────────────────
Validation Handlers:
  validateSheetName
  validateEmail
────────────────────────────
Submit Handlers:
  createSheetWithData
  fetchSheetRow
  updateMultipleRows
────────────────────────────
[None]
```

**Implementation**: Read available handlers from `integrations/[type]/handlers.js` exports and populate dropdown dynamically.

### 4. Error Display Component

When handler errors occur:

```
┌──────────────────────────────────────────────────┐
│  ⚠ Error                                         │
│                                                   │
│  Failed to load options for "Select Sheet"       │
│                                                   │
│  Details: Authentication failed. Please          │
│  reconnect your Google Sheets account.           │
│                                                   │
│  [Retry]  [Reconnect Integration]  [Contact]    │
└──────────────────────────────────────────────────┘
```

### 5. Loading States

While handlers execute:

```
┌──────────────────────────────────────────────────┐
│  Select Sheet:                                    │
│  [🔄 Loading sheets...                      ]    │
│                                                   │
│  Select Tab/Subsheet:                            │
│  [ Select sheet first                       ]    │
│  (disabled)                                       │
└──────────────────────────────────────────────────┘
```

---

## Future Decision Points

### Items to Finalize During Implementation

#### 1. Context Object Structure
- [ ] Decide exact properties and nesting
- [ ] Determine how to securely pass credentials
- [ ] Define utility function interfaces
- [ ] Specify data transformation helpers

#### 2. Handler Execution Timing
- [ ] When exactly does valueHandler get called?
  - On page load?
  - On field focus?
  - On-demand button click?
- [ ] When does validationHandler run?
  - On blur (field loses focus)?
  - On submit?
  - Real-time as user types?
- [ ] Debouncing/throttling for frequent calls?

#### 3. Caching Strategy
- [ ] Do we need caching for handler results?
- [ ] If yes, where to cache?
  - Browser (localStorage/sessionStorage)?
  - Server-side cache (Redis)?
- [ ] Cache invalidation strategy?
- [ ] Cache duration/TTL?

#### 4. Security
- [ ] How to protect handler code from tampering?
- [ ] Sandboxing for handler execution?
- [ ] Rate limiting for handler calls?
- [ ] Input sanitization for context data?

#### 5. Testing Framework
- [ ] Create testing utilities for handlers
- [ ] Mock context generation
- [ ] Assertion helpers
- [ ] Integration test setup

#### 6. Documentation
- [ ] Write comprehensive handler development guide
- [ ] Create example templates for common patterns
- [ ] Document best practices
- [ ] API reference for context and utilities

#### 7. Monitoring & Observability
- [ ] What metrics to track?
  - Handler execution times?
  - Success/failure rates?
  - Error types distribution?
- [ ] Alerting for critical errors?
- [ ] Dashboard for handler performance?

#### 8. Versioning
- [ ] How to handle handler code changes?
- [ ] Backward compatibility strategy?
- [ ] Migration path for breaking changes?
- [ ] Rollback mechanism?

#### 9. Performance
- [ ] Async/parallel handler execution?
- [ ] Timeout limits for handlers?
- [ ] Resource limits (memory, CPU)?
- [ ] Retry mechanisms for transient failures?

#### 10. Developer Experience
- [ ] IDE support (autocomplete, type checking)?
- [ ] Local development setup?
- [ ] Hot reload for handler changes?
- [ ] Debugging tools?

---

## Best Practices

### For Writing Handlers

#### 1. Always Validate Dependencies First

```javascript
// ✅ Good
async function fetchSubsheets(context) {
  if (!context.formData.sheet_id) {
    return { success: false, value: [], error: 'Please select a sheet first' };
  }
  // ... proceed with fetching
}

// ❌ Bad
async function fetchSubsheets(context) {
  // Directly uses context.formData.sheet_id without checking
  const response = await api.get(`/sheets/${context.formData.sheet_id}/subsheets`);
  // Will fail if sheet_id is undefined
}
```

#### 2. Comprehensive Error Handling

```javascript
// ✅ Good
async function fetchData(context) {
  try {
    const response = await api.get('/data');
    return { success: true, value: response.data };
  } catch (error) {
    logger.error('Failed to fetch data', { error: error.message });

    // User-friendly error message
    let errorMessage = 'Failed to load data. Please try again.';
    if (error.status === 401) {
      errorMessage = 'Authentication failed. Please reconnect your account.';
    }

    return { success: false, value: [], error: errorMessage };
  }
}

// ❌ Bad
async function fetchData(context) {
  const response = await api.get('/data');  // No try-catch
  return { success: true, value: response.data };
  // Will crash if API call fails
}
```

#### 3. Return Proper Format

```javascript
// ✅ Good
async function fetchOptions(context) {
  const data = await fetchFromAPI();
  return {
    success: true,
    value: data.map(item => ({ id: item.id, label: item.name })),
    metadata: { count: data.length }
  };
}

// ❌ Bad
async function fetchOptions(context) {
  return await fetchFromAPI();  // Returns raw API response, not contract format
}
```

#### 4. Meaningful Logging

```javascript
// ✅ Good
async function createRecord(context) {
  logger.info('Creating record', {
    userId: context.runtime.userId,
    integrationId: context.integration.id
  });

  try {
    const result = await api.post('/records', context.formData);
    logger.info('Record created successfully', { recordId: result.id });
    return { success: true, response: [result] };
  } catch (error) {
    logger.error('Failed to create record', {
      error: error.message,
      formData: sanitize(context.formData)  // Remove sensitive data
    });
    return { success: false, error: error.message };
  }
}
```

#### 5. Reuse Common Patterns

```javascript
// Create shared utilities
function handleAPIError(error) {
  if (error.status === 401) return 'Please reconnect your account.';
  if (error.status === 429) return 'Rate limit exceeded. Try again later.';
  if (error.status >= 500) return 'Service temporarily unavailable.';
  return `Request failed: ${error.message}`;
}

// Use in handlers
async function fetchSheets(context) {
  try {
    return await apiCall(context);
  } catch (error) {
    return {
      success: false,
      value: [],
      error: handleAPIError(error)
    };
  }
}
```

### For Organizing Code

#### 1. Group Related Handlers

```javascript
// ✅ Good organization
// integrations/google-sheets/handlers.js

// ========== SHEET OPERATIONS ==========
async function fetchSheets(context) { }
async function createSheet(context) { }
async function deleteSheet(context) { }

// ========== SUBSHEET OPERATIONS ==========
async function fetchSubsheets(context) { }
async function createSubsheet(context) { }

// ========== ROW OPERATIONS ==========
async function fetchRow(context) { }
async function createRow(context) { }
async function updateRow(context) { }
```

#### 2. Extract Shared Logic

```javascript
// ✅ Good - DRY
function getAuthHeaders(context) {
  return {
    'Authorization': `Bearer ${context.integration.credentials.accessToken}`
  };
}

async function fetchSheets(context) {
  return await api.get('/sheets', { headers: getAuthHeaders(context) });
}

async function fetchSubsheets(context) {
  return await api.get('/subsheets', { headers: getAuthHeaders(context) });
}
```

#### 3. Use Descriptive Names

```javascript
// ✅ Good
async function fetchAvailableSheetsForUser(context) { }
async function validateSheetNameUniqueness(context) { }
async function createSheetAndPopulateInitialData(context) { }

// ❌ Bad
async function handler1(context) { }
async function doStuff(context) { }
async function process(context) { }
```

---

## References

### Related Documentation
- [Feature Templates Documentation](../FEATURE-TEMPLATES.md)
- [Integration Configuration Guide](../INTEGRATION-CONFIG.md)
- [API Endpoints Reference](../API-ENDPOINTS.md)
- [Error Handling Guide](../ERROR-HANDLING.md)

### Implementation Files (Future)
- `/engine/handler-executor.js` - Handler execution engine
- `/engine/context-builder.js` - Context object builder
- `/integrations/[type]/handlers.js` - Integration-specific handlers
- `/api/routes/feature-mapping.js` - Mapping API endpoints
- `/ui/pages/feature-mapping.html` - Mapping configuration UI

### External Resources
- Google Sheets API Documentation
- Salesforce API Documentation
- HubSpot API Documentation

---

## Revision History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-11-24 | Initial documentation | System |

---

**Status**: This is a design document for future implementation. No code has been written yet based on this architecture.

**Next Steps**:
1. Complete pending work on current Feature Templates system
2. Review and finalize Context Object structure
3. Implement handler execution engine
4. Build Feature-Integration mapping UI
5. Create first integration with custom handlers (Google Sheets)
6. Write comprehensive testing suite
7. Document lessons learned and refine approach

---

**Tags**: `#future`, `#architecture`, `#handlers`, `#custom-code`, `#flexibility`, `#integration-platform`
