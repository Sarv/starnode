# Requirement: Relationship Type for Canonical Mapping Templates

## Context

We have a **canonical mapping system** that allows users to create templates for mapping records between two integrations (e.g., Deepcall employees ↔ Freshdesk agents). Currently, templates assume a simple one-to-one relationship, but we need to support all cardinality types.

## Current Storage Format

### Template Structure (`canonical-mapping-templates.json`)

```json
{
  "id": "template_xxx",
  "name": "Agent Mapping template",
  "sideA": {
    "scope": "employee",
    "operation": "list",
    "primaryKeyCanonical": "{{canonical.employee.unique_id}}"
  },
  "sideB": {
    "scope": "employee",
    "operation": "list",
    "primaryKeyCanonical": "{{canonical.employee.unique_id}}"
  }
}
```

### Mapping Storage (Elasticsearch index: `canonical_record_mappings`)

```json
{
  "templateId": "template_xxx",
  "integrationIds": ["deepcall", "freshdesk"],
  "integrations": {
    "deepcall": {
      "connectionId": "conn_xxx",
      "featureId": "fetch_employees",
      "primaryKeyField": "unique_id",
      "primaryKeyCanonical": "{{canonical.employee.unique_id}}"
    },
    "freshdesk": {
      "connectionId": "conn_yyy",
      "featureId": "get_agents",
      "primaryKeyField": "id",
      "primaryKeyCanonical": "{{canonical.employee.unique_id}}"
    }
  },
  "mappings": [
    { "deepcall": 7, "freshdesk": 1120005327928 },
    { "deepcall": 10, "freshdesk": 1120005327927 },
    { "deepcall": 4, "freshdesk": 1120005327925 }
  ]
}
```

---

## Key Constraints

1. **Bidirectional Flow**: The mappings must remain **side-agnostic** - using integration IDs as dynamic keys, not fixed sideA/sideB references. This enables bidirectional sync.

2. **No Fixed Side References**: When storing actual record mappings, avoid structures like:
   ```json
   { "sideA": { "integration": "deepcall", "primaryKey": 7 } }
   ```
   Instead, use the integration ID directly as the key.

---

## Requirement

### Add Relationship Type to Templates

When creating a template, users should specify the relationship cardinality between the two scopes:

| Relationship           | Meaning                                                                 | Example                  |
| ---------------------- | ----------------------------------------------------------------------- | ------------------------ |
| **One to One (1:1)**   | One record on Integration A maps to exactly one record on Integration B | Employee ↔ Contact       |
| **One to Many (1:N)**  | One record on A maps to multiple records on B                           | Organization → Employees |
| **Many to One (N:1)**  | Multiple records on A map to one record on B                            | Contacts → Account       |
| **Many to Many (N:N)** | Multiple A can map to multiple B                                        | Projects ↔ Team Members  |

### What Needs to be Solved

1. **Template Storage**: How to store the relationship type in the template, making it clear which integration is the "one" side and which is the "many" side.

2. **Mapping Storage**: How to update the current side-agnostic mapping format to support all relationship types while maintaining bidirectional flow.

3. **UI Behavior**: How the Record Mapping page should adapt selection behavior based on relationship type (single vs multi-select).

4. **Backward Compatibility**: Existing one-to-one mappings should continue to work.

---

## Files Involved

| File                               | Purpose                  |
| ---------------------------------- | ------------------------ |
| `canonical-mapping-templates.json` | Template storage         |
| `views/canonical-mapping.ejs`      | Template creation modal  |
| `public/js/canonical-mapping.js`   | Template save/edit logic |
| `public/js/record-mapping.js`      | Record mapping UI        |
| `server.js`                        | Backend APIs             |

---

## Acceptance Criteria

1. ✅ Template modal allows selection of relationship type
2. ✅ Template stores relationship type with clear indication of which side is "one" vs "many"
3. ✅ Record mapping UI adapts selection behavior based on relationship type
4. ✅ Mappings storage supports all relationship types
5. ✅ Storage remains side-agnostic and bidirectional
6. ✅ Existing 1:1 mappings continue to work
