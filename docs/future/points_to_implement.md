# Future Implementation Points - Canonical Record Mapping

This document tracks planned features and improvements for the canonical record mapping system.

---

## 1. Template Relationship Type Changes

### 1.1 Allowed Upgrades (Loosening Constraints)

Upgrades that loosen constraints are always safe and should be allowed without validation.

| From | To | Reason |
|------|-----|--------|
| `one-to-one` | `one-to-many` | Removes constraint on Side A |
| `one-to-one` | `many-to-one` | Removes constraint on Side B |
| `one-to-one` | `many-to-many` | Removes all constraints |
| `one-to-many` | `many-to-many` | Removes constraint on Side B |
| `many-to-one` | `many-to-many` | Removes constraint on Side A |

**Implementation:**
- No validation required
- Update template's `relationshipType` field
- Existing mappings remain valid

### 1.2 Blocked Downgrades (Tightening Constraints)

Downgrades that tighten constraints must be blocked if existing mappings would violate the new constraints.

| From | To | Risk |
|------|-----|------|
| `many-to-many` | `one-to-one` | Mappings may violate both side constraints |
| `many-to-many` | `one-to-many` | Mappings may violate Side B constraint |
| `many-to-many` | `many-to-one` | Mappings may violate Side A constraint |
| `one-to-many` | `one-to-one` | Side A records may have multiple B mappings |
| `one-to-many` | `many-to-one` | Both constraints may be violated |
| `many-to-one` | `one-to-one` | Side B records may have multiple A mappings |
| `many-to-one` | `one-to-many` | Both constraints may be violated |

**Implementation:**

1. Query existing mappings for the template
2. Check for constraint violations against proposed relationship type
3. If violations exist:
   - Block the downgrade
   - Show warning with violation details

**API Response Example:**
```json
{
  "success": false,
  "error": "Cannot downgrade relationship type",
  "violations": {
    "type": "downgrade_blocked",
    "from": "one-to-many",
    "to": "one-to-one",
    "sideAViolations": 5,
    "message": "5 Side A records have multiple Side B mappings"
  }
}
```

**UI Warning Example:**
```
Cannot change from 1:N to 1:1

5 Side A records currently have multiple Side B mappings:
- Employee #7 → Contact #101, #102, #103
- Employee #12 → Contact #201, #202

To downgrade, first remove the extra mappings.
```

### 1.3 Validation Logic

```javascript
function canChangeRelationshipType(from, to) {
  const upgradeMap = {
    'one-to-one': ['one-to-many', 'many-to-one', 'many-to-many'],
    'one-to-many': ['many-to-many'],
    'many-to-one': ['many-to-many'],
    'many-to-many': []
  };

  return upgradeMap[from]?.includes(to) || false;
}

// If not an upgrade, check for violations before allowing
async function checkDowngradeViolations(templateId, from, to) {
  // Query mappings and check constraints
  // Return { canDowngrade: false, violations: [...] }
}
```

---

## 2. Template Deletion Protection

### 2.1 Requirement

Templates cannot be deleted if record mappings exist for that template.

### 2.2 Implementation

**Before deletion, check for existing mappings:**

```javascript
// In DELETE /api/mapping-templates/:id
const mappings = await elasticsearch.getRecordMappings({ templateId: id });

if (mappings.length > 0) {
  return res.status(400).json({
    success: false,
    error: 'Cannot delete template with existing mappings',
    mappingCount: mappings.length,
    message: `This template has ${mappings.length} record mapping(s). Delete all mappings first.`
  });
}
```

**UI Flow:**

1. User clicks "Delete Template"
2. System checks for existing mappings
3. If mappings exist:
   - Show warning: "This template has X mapping(s). Delete all mappings before deleting the template."
   - Optionally provide link to Record Mapping page filtered by this template
4. If no mappings:
   - Show confirmation dialog
   - Proceed with deletion

---

## 3. Strict Mapping Mode

### 3.1 Overview

A template-level setting that controls how users create mappings. In strict mode, users must map one pair at a time for more controlled mapping.

### 3.2 Template Storage

```json
{
  "id": "template_xxx",
  "name": "Agent Mapping",
  "relationshipType": "one-to-many",
  "mappingMode": "strict",
  "sideA": { ... },
  "sideB": { ... }
}
```

| Field | Type | Values | Default |
|-------|------|--------|---------|
| `mappingMode` | string | `"flexible"`, `"strict"` | `"flexible"` |

### 3.3 Mode Comparison

| Aspect | Flexible Mode | Strict Mode |
|--------|---------------|-------------|
| Selection type | Based on relationship type (radio/checkbox) | Always radio buttons (single-select) |
| Multi-select | Allowed based on relationship | Never allowed |
| Pair creation | Cartesian product of selections | One pair at a time |
| Workflow | Select many → Create Mapping → Save | Select one each → Confirm Pair → Repeat → Create Mapping |

### 3.4 Flexible Mode (Current Behavior)

```
┌─────────────────────────────────────────────────────────────────┐
│  FLEXIBLE MODE                                                  │
└─────────────────────────────────────────────────────────────────┘

Selection type: Based on relationship type
- 1:1  → Side A: radio,    Side B: radio
- 1:N  → Side A: radio,    Side B: checkbox
- N:1  → Side A: checkbox, Side B: radio
- N:N  → Side A: checkbox, Side B: checkbox

Workflow:
1. Select record(s) on Side A
2. Select record(s) on Side B
3. Click "Create Mapping" → Cartesian product added to pendingPairs
4. Repeat for more mappings
5. Click "Save Mappings" → API call to save all pending pairs

Example (1:N):
- Select: Side A [1]  |  Side B [2, 3, 4, 5]
- Click "Create Mapping"
- Result: 4 pairs added → (1,2), (1,3), (1,4), (1,5)
```

### 3.5 Strict Mode (New)

```
┌─────────────────────────────────────────────────────────────────┐
│  STRICT MODE                                                    │
└─────────────────────────────────────────────────────────────────┘

Selection type: Always single-select (radio buttons)
- All relationship types → Side A: radio, Side B: radio

Workflow:
1. Select ONE record on Side A
2. Select ONE record on Side B
3. Click "Confirm Pair" → Single pair added to pendingPairs (in memory)
4. Selections cleared, repeat for more mappings
5. Click "Create Mapping" → API call to save all pending pairs

Example (1:N):
- Select: Side A [1]  |  Side B [2]
- Click "Confirm Pair" → (1,2) added to pending
- Select: Side A [1]  |  Side B [3]
- Click "Confirm Pair" → (1,3) added to pending
- Select: Side A [1]  |  Side B [4]
- Click "Confirm Pair" → (1,4) added to pending
- Click "Create Mapping" → API call saves all 3 pairs
```

### 3.6 UI Changes for Strict Mode

**Selection Inputs:**
```html
<!-- Always radio buttons in strict mode -->
<input type="radio" name="selectA" />  <!-- Side A -->
<input type="radio" name="selectB" />  <!-- Side B -->
```

**Buttons:**
```html
<!-- Strict mode buttons -->
<button id="confirmPairBtn">Confirm Pair</button>
<button id="createMappingBtn">Create Mapping</button>

<!-- Flexible mode buttons (current) -->
<button id="createMappingBtn">Create Mapping</button>
<button id="saveMappingsBtn">Save Mappings</button>
```

**Pending Pairs List:**
```html
<div class="pending-pairs-list">
  <h4>Pending Pairs (3)</h4>
  <ul>
    <li>
      Employee #1 ↔ Contact #2
      <button onclick="removePendingPair(0)">✕</button>
    </li>
    <li>
      Employee #1 ↔ Contact #3
      <button onclick="removePendingPair(1)">✕</button>
    </li>
    <li>
      Employee #1 ↔ Contact #4
      <button onclick="removePendingPair(2)">✕</button>
    </li>
  </ul>
</div>
```

### 3.7 Mode Change Rules

- Mode can be changed at any time (no restrictions)
- Changing mode does not affect existing mappings
- Only affects how new mappings are created in the UI

### 3.8 Implementation Checklist

**Template API:**
- [ ] Add `mappingMode` field to template schema
- [ ] Update `POST /api/mapping-templates` to accept `mappingMode`
- [ ] Update `PUT /api/mapping-templates/:id` to accept `mappingMode`
- [ ] Default to `"flexible"` if not provided

**Template UI (`canonical-mapping.ejs`, `canonical-mapping.js`):**
- [ ] Add mapping mode selector in template creation modal
- [ ] Add mapping mode selector in template edit modal
- [ ] Default selection to "Flexible"

**Record Mapping UI (`record-mapping.ejs`, `record-mapping.js`):**
- [ ] Read `mappingMode` from selected template
- [ ] If strict mode:
  - [ ] Force radio buttons on both sides regardless of relationship type
  - [ ] Show "Confirm Pair" button instead of multi-select workflow
  - [ ] Clear selections after confirming a pair
  - [ ] Show pending pairs list with remove option
  - [ ] "Create Mapping" button triggers API save
- [ ] If flexible mode:
  - [ ] Keep current behavior

---

## 4. Implementation Priority

| Priority | Feature | Complexity | Dependencies |
|----------|---------|------------|--------------|
| High | Template deletion protection | Low | None |
| High | Template relationship upgrades | Medium | Validation queries |
| Medium | Strict mapping mode | Medium | Template schema update |

---

## 5. Files to Modify

| File | Changes |
|------|---------|
| `server.js` | Template upgrade/downgrade validation, deletion protection |
| `services/elasticsearch.js` | Violation check queries |
| `canonical-mapping-templates.json` | Add `mappingMode` field |
| `views/canonical-mapping.ejs` | Mapping mode selector |
| `public/js/canonical-mapping.js` | Mode selection logic |
| `views/record-mapping.ejs` | Strict mode UI elements |
| `public/js/record-mapping.js` | Strict mode workflow logic |
| `public/css/record-mapping.css` | Pending pairs list styles |
