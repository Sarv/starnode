# API Configuration Module

## Overview
Enable users to configure multiple API endpoints per feature with comprehensive request/response settings.

## Key Features
- **Multiple APIs per Feature**: Each feature can have multiple API configurations identified by fieldId
- **Direct Variable System**: Simple variable syntax like `{{email}}`, `{{auth_token}}`
- **Full HTTP Support**: Headers, query params, body types (JSON, XML, form-data, etc.)
- **Response Handling**: Define success/error paths and data formats

## File Structure
```
integrations/providers/{{provider}}/
└── api.schema.json       # Stores all API configurations
```

## API Schema Format
```json
{
  "apis": [
    {
      "id": "api_unique_id",
      "featureId": "create_contact",
      "fieldId": "api_endpoint_1",  // Identifies which field/API this is
      "name": "Create Contact API",
      "method": "POST",
      "url": "https://api.example.com/contacts",
      "headers": [
        { "key": "Authorization", "value": "Bearer {{auth_token}}" }
      ],
      "queryParams": [],
      "bodyType": "json",
      "body": {
        "json": {
          "email": "{{email}}",
          "name": "{{name}}"
        }
      },
      "response": {
        "successPath": "data.id",
        "errorPath": "error.message",
        "dataFormat": "json"
      }
    }
  ]
}
```

## Variable System
Direct variable names without category prefix:
- **Feature Fields**: `{{email}}`, `{{name}}`, `{{phone}}`
- **Auth Variables**: `{{auth_token}}`, `{{api_key}}`
- **Custom Fields**: `{{company_subdomain}}`, `{{webhook_url}}`
- **System Variables**: `{{timestamp}}`, `{{uuid}}`

## UI Components

### Main Page (`/api-configuration`)
1. **API List**: Shows all APIs for the selected feature
2. **Configuration Form**:
   - Method selector (GET, POST, PUT, DELETE, PATCH)
   - URL builder with variable support
   - Headers table (key-value pairs)
   - Query parameters table
   - Body type selector and editor
   - Response configuration

### Variable Panel (Right Sidebar)
- Organized sections for available variables
- Copy buttons for easy insertion
- Search/filter functionality

## User Flow
1. Navigate to: Integration Detail → Feature Mappings → Feature → Configure API
2. Add/Edit API configurations for the feature
3. Use variable panel to insert dynamic values
4. Save configuration to `api.schema.json`

## API Endpoints
- `GET /api/integrations/:id/features/:featureId/apis` - List all APIs
- `GET /api/integrations/:id/features/:featureId/fields/:fieldId/api-config` - Get specific API
- `POST /api/integrations/:id/features/:featureId/fields/:fieldId/api-config` - Save API
- `DELETE /api/integrations/:id/features/:featureId/fields/:fieldId/api-config` - Delete API
- `GET /api/integrations/:id/available-variables` - Get available variables

## Body Type Support
- **JSON**: JSON editor with syntax highlighting
- **Form Data**: Key-value table for multipart/form-data
- **URL Encoded**: Key-value table for x-www-form-urlencoded
- **Raw**: Plain text editor
- **XML**: XML editor with syntax highlighting

## Implementation Priority
1. Create page structure and routing
2. Implement basic API CRUD operations
3. Add variable system and insertion
4. Implement body type editors
5. Add response configuration
6. Testing and validation