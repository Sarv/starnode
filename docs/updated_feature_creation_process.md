# Feature Architecture Simplification - Documentation

---

## Overview

This document summarizes the changes made to simplify the feature creation workflow by removing the intermediate "feature template" layer and enabling direct feature creation within integrations.

---

## 1. Feature Creation Workflow Simplification

### Goal

Replace the complex 5-step "Feature Mapping" wizard with a streamlined 3-step "Add Feature" wizard, removing the dependency on pre-existing feature templates.

### Changes Made

#### UI Label Updates (`views/integration-detail.ejs`)

| Before                                | After                        |
| ------------------------------------- | ---------------------------- |
| Tab: "Feature Mappings"               | Tab: "Features"              |
| Button: "Map New Feature"             | Button: "Add Feature"        |
| Empty state: "map a feature template" | Empty state: "add a feature" |

#### Navigation Link Fix

- Fixed "Add Feature" button href to dynamically include `integrationId` query parameter
- Wrapped script in `DOMContentLoaded` to ensure button exists before setting href

#### Wizard Steps Reduction

**Before (5 steps):**

1. Select Feature Template
2. Configure Fields
3. API Configuration
4. Extra Fields
5. Review & Save

**After (3 steps):**

1. Define Feature (name, ID, description, category)
2. Add Fields (modal-based field creation)
3. Review & Save

---

## 2. Files Modified

### Frontend Views

| File                           | Changes                                                                                                   |
| ------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `views/integration-detail.ejs` | Updated tab label, button text, empty state, and dynamic href setting                                     |
| `views/add-feature.ejs`        | Reduced progress bar to 3 steps, removed API Config and Extra Fields step content, simplified Review step |
| `views/partials/sidebar.ejs`   | Removed "Feature Templates" navigation link                                                               |

### Frontend JavaScript

| File                              | Changes                                                                                                                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public/js/add-feature.js`        | Updated `totalSteps` from 5 to 3, simplified `nextStep()`/`previousStep()` functions, updated button labels, simplified `renderReview()`, removed outdated API config event listeners |
| `public/js/integration-detail.js` | Updated `editSelectedMapping()` to use `/add-feature` URL                                                                                                                             |
| `public/js/api-configuration.js`  | Added `isAuthRelatedVariable()` helper, modified `checkAndShowVariableInputs()` to make auth variables read-only                                                                      |

### Backend

| File        | Changes                                                                                              |
| ----------- | ---------------------------------------------------------------------------------------------------- |
| `server.js` | Added `/add-feature` route, added 301 redirect from `/feature-integration-mapping` to `/add-feature` |

---

## 3. New Files Created

| File                         | Purpose                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------- |
| `views/add-feature.ejs`      | New wizard template (copied from `feature-integration-mapping.ejs` and modified) |
| `public/js/add-feature.js`   | New wizard logic (copied from `feature-integration-mapping.js` and modified)     |
| `public/css/add-feature.css` | Wizard styling (copied from `feature-integration-mapping.css`)                   |

---

## 4. Test API Modal Enhancement

### Feature

Auth-related variables are now read-only in the Test API modal.

### Behavior

| Variable Type                                        | Display                                                  | Editable |
| ---------------------------------------------------- | -------------------------------------------------------- | -------- |
| Auth variables (`api_sub_domain`, `userid`, `token`) | 🔒 Lock icon, gray background, "(from connection)" label | ❌ No    |
| Feature variables (`employee_id`)                    | Normal input with placeholder                            | ✅ Yes   |

### Implementation

- Added `isAuthRelatedVariable(varName)` helper function in `api-configuration.js`
- Checks if variable exists in `availableVariables.authVariables` or `availableVariables.additionalFields`
- Auth variables get `readonly` attribute and visual styling

---

## 5. Deferred Items

| Item                                             | Reason                                                                                    |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Rename `featureMappings` → `features` in schemas | Affects ~30 references in backend/frontend, breaking change, scheduled for future cleanup |
| Remove Feature Templates API endpoints           | Kept for backward compatibility                                                           |

---

## 6. Testing Performed

- ✅ Add Feature button navigation from integration detail page
- ✅ 3-step wizard flow (Define → Add Fields → Review)
- ✅ Field creation via modal
- ✅ Auth variables read-only in Test API modal
- ✅ Feature variables remain editable

---

## 7. How to Use

### Adding a New Feature

1. Go to Integration Detail page (e.g., `/integration-detail/freshdesk`)
2. Click "Features" tab
3. Click "Add Feature" button
4. **Step 1:** Enter feature name (ID auto-generates), description, category
5. **Step 2:** Add fields using "+ Add Field" button
6. **Step 3:** Review and save

### Testing an API

1. Go to API Configuration page
2. Click "Test API" button
3. Select User and Connection
4. Auth variables (from connection) are pre-filled and locked
5. Enter values for feature-specific variables
6. Click "Execute Test"

---

## 9. Field Type Validation in Test API Modal

### Feature

Variable inputs in the Test API modal now respect field type definitions from features.schema.json.

### Example

For a field defined as:

```json
{
  "fieldKey": "employee_id",
  "fieldType": "number",
  "htmlType": "number"
}
```

The input will:

- Use `type="number"` (only numbers allowed)
- Show `(number)` indicator next to the label
- Include `required` attribute if field is required

### Changes

| File                   | Change                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `server.js`            | Added `htmlType`, `fieldType`, `required` to available-variables API response for extraFields                             |
| `api-configuration.js` | Added `getFieldInfo()` helper to look up field metadata, updated `checkAndShowVariableInputs()` to use correct input type |

---

## 10. API List Panel Bug Fix

### Issue

Features created with the new 3-step wizard were not appearing in the API list panel on the API Configuration page. The user had 3 features but only 2 were showing.

### Root Cause

The `/api/integrations/:id/all-apis` endpoint only checked `fieldMappings` for API-type fields. Features created with the new wizard store API fields in `extraFields` (with `type: 'api'`), which was not being checked.

### Fix (`server.js`)

Added logic to also scan `extraFields` for API-type fields:

```javascript
// Also check extraFields for api-type fields (created via new wizard)
const extraApiFields = (mapping.extraFields || []).filter(
  field => field.type === 'api' || field.fieldKey?.includes('api'),
);
```

---

## 10. Technical Notes

### Wizard State Structure

```javascript
wizardState = {
  currentStep: 1,
  totalSteps: 3,
  integrationId: null,
  integrationName: null,
  featureId: null, // User-entered or auto-generated
  featureName: null, // User-entered
  featureDescription: '',
  featureCategory: '',
  extraFields: [], // Primary field storage
  fieldMappings: {}, // Kept for compatibility
  isEditMode: false,
  editMappingId: null,
};
```

### Auth Variable Detection

```javascript
function isAuthRelatedVariable(varName) {
  // Checks availableVariables.authVariables
  // Checks availableVariables.additionalFields
  // Returns true if variable is auth-related
}
```
