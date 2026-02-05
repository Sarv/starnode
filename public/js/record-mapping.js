/**
 * Record Mapping Page JavaScript
 * Handles template-based record mapping between integrations
 */

// State
let templates = [];
let integrations = [];
let selectedTemplate = null;
let selectedRecords = {
  A: [],  // Array for multi-select support
  B: [],
};

// NEW: Individual document model - each mapping is a separate document
let mappings = [];  // Array of mapping objects with their own IDs
let pendingPairs = [];  // Pairs waiting to be saved (not yet in Elasticsearch)
let existingSideConfig = null;  // { sideAIntegration, sideBIntegration } if mappings exist

const sideState = {
  A: {
    integrationId: null,
    connectionId: null,
    featureId: null,
    data: [],
    primaryKeyField: null,
    selectedVariables: [],
    availableVariables: [],
  },
  B: {
    integrationId: null,
    connectionId: null,
    featureId: null,
    data: [],
    primaryKeyField: null,
    selectedVariables: [],
    availableVariables: [],
  },
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadTemplates();
  await loadIntegrations();
  setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
  document
    .getElementById('templateSelect')
    .addEventListener('change', onTemplateChange);

  document
    .getElementById('integrationA')
    .addEventListener('change', () => onIntegrationChange('A'));
  document
    .getElementById('integrationB')
    .addEventListener('change', () => onIntegrationChange('B'));

  document
    .getElementById('connectionA')
    .addEventListener('change', () => onConnectionChange('A'));
  document
    .getElementById('connectionB')
    .addEventListener('change', () => onConnectionChange('B'));

  document
    .getElementById('featureA')
    .addEventListener('change', () => onFeatureChange('A'));
  document
    .getElementById('featureB')
    .addEventListener('change', () => onFeatureChange('B'));

  document
    .getElementById('loadDataA')
    .addEventListener('click', () => loadData('A'));
  document
    .getElementById('loadDataB')
    .addEventListener('click', () => loadData('B'));

  document
    .getElementById('saveMappingsBtn')
    .addEventListener('click', saveMappings);
}

// ===== Phase 2C: Template Selection =====

async function loadTemplates() {
  try {
    const response = await fetch('/api/mapping-templates');
    const data = await response.json();
    templates = data.templates || [];

    const select = document.getElementById('templateSelect');
    select.innerHTML =
      '<option value="">Choose a template...</option>' +
      templates
        .map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`)
        .join('');
  } catch (error) {
    console.error('Error loading templates:', error);
    showToast('Failed to load templates', 'error');
  }
}

async function loadIntegrations() {
  try {
    const response = await fetch('/api/integrations');
    const data = await response.json();
    integrations = data.integrations || [];
  } catch (error) {
    console.error('Error loading integrations:', error);
  }
}

function onTemplateChange(e) {
  const templateId = e.target.value;

  if (!templateId) {
    document.getElementById('templateDetails').style.display = 'none';
    document.getElementById('mappingInterface').style.display = 'none';
    return;
  }

  selectedTemplate = templates.find(t => t.id === templateId);
  if (!selectedTemplate) return;

  // Display template details including relationship type
  const relType = selectedTemplate.relationshipType || 'one-to-one';
  const relTypeLabels = {
    'one-to-one': '1:1 (One to One)',
    'one-to-many': '1:N (One to Many - Side A has many Side B)',
    'many-to-one': 'N:1 (Many to One - Many Side A to one Side B)',
    'many-to-many': 'N:N (Many to Many)',
  };
  document.getElementById('templateRelationship').textContent = relTypeLabels[relType] || relType;
  document.getElementById(
    'templateSideA',
  ).textContent = `${selectedTemplate.sideA.scope} / ${selectedTemplate.sideA.operation}`;
  document.getElementById(
    'templateSideB',
  ).textContent = `${selectedTemplate.sideB.scope} / ${selectedTemplate.sideB.operation}`;
  document.getElementById('templateDetails').style.display = 'block';

  // Show mapping interface
  document.getElementById('mappingInterface').style.display = 'block';

  // Update scope info
  document.getElementById(
    'scopeInfoA',
  ).textContent = `${selectedTemplate.sideA.scope} / ${selectedTemplate.sideA.operation}`;
  document.getElementById(
    'scopeInfoB',
  ).textContent = `${selectedTemplate.sideB.scope} / ${selectedTemplate.sideB.operation}`;

  // Populate integration dropdowns
  populateIntegrationDropdowns();

  // Reset state
  resetSideState('A');
  resetSideState('B');
  mappings = [];
  pendingPairs = [];
  existingSideConfig = null;
  renderMappingsList();
}

function populateIntegrationDropdowns() {
  const optionsHTML =
    '<option value="">Select software...</option>' +
    integrations
      .map(
        i =>
          `<option value="${i.id}">${escapeHtml(
            i.displayName || i.name,
          )}</option>`,
      )
      .join('');

  document.getElementById('integrationA').innerHTML = optionsHTML;
  document.getElementById('integrationB').innerHTML = optionsHTML;
}

function resetSideState(side) {
  sideState[side] = {
    integrationId: null,
    connectionId: null,
    featureId: null,
    data: [],
    primaryKeyField: null,
    selectedVariables: [],
    availableVariables: [],
  };
  selectedRecords[side] = [];  // Reset to empty array for multi-select

  document.getElementById(`connection${side}`).disabled = true;
  document.getElementById(`connection${side}`).innerHTML =
    '<option value="">Select connection...</option>';
  document.getElementById(`feature${side}`).innerHTML =
    '<option value="">Waiting for software selection...</option>';
  document.getElementById(`loadData${side}`).disabled = true;
  document.getElementById(`dataTableContainer${side}`).style.display = 'none';
}

// ===== Phase 2D: Auto-Find Features =====

async function onIntegrationChange(side) {
  const integrationId = document.getElementById(`integration${side}`).value;

  if (!integrationId) {
    resetSideState(side);
    return;
  }

  sideState[side].integrationId = integrationId;

  // Load connections
  await loadConnections(side, integrationId);

  // Auto-find features matching template scope/operation
  await autoFindFeature(side, integrationId);

  // Check if both integrations are selected and load existing mappings
  await checkAndLoadExistingMappings();
}

/**
 * Load existing mappings for the current template + integration combination
 * NEW: Uses the v2 API which returns individual mapping documents
 * Also prevents side swapping - integrations must be selected in the same order as originally saved
 */
async function checkAndLoadExistingMappings() {
  const integrationA = sideState.A.integrationId;
  const integrationB = sideState.B.integrationId;

  if (!selectedTemplate || !integrationA || !integrationB) {
    return;
  }

  try {
    // Check if there are existing mappings and get the side configuration
    const response = await fetch(
      `/api/record-mappings/v2/check-config?templateId=${selectedTemplate.id}&integrationA=${integrationA}&integrationB=${integrationB}`
    );
    const data = await response.json();

    if (data.success && data.hasExistingMappings) {
      // Check if sides are swapped compared to the stored mapping
      const storedSideA = data.sideAIntegration;
      const storedSideB = data.sideBIntegration;

      if (storedSideA && storedSideB) {
        // Verify the sides match
        if (integrationA !== storedSideA || integrationB !== storedSideB) {
          // Sides are swapped! Prevent this.
          const relType = selectedTemplate.relationshipType || 'one-to-one';
          const relLabel = {
            'one-to-one': '1:1',
            'one-to-many': '1:N',
            'many-to-one': 'N:1',
            'many-to-many': 'N:N'
          }[relType] || relType;

          showToast(
            `Side mismatch! Existing ${relLabel} mappings have ${storedSideA} as Side A and ${storedSideB} as Side B. Please select integrations in the same order.`,
            'error'
          );

          // Reset side B since that's typically selected second
          document.getElementById('integrationB').value = '';
          sideState.B.integrationId = null;
          resetSideState('B');

          existingSideConfig = null;
          mappings = [];
          pendingPairs = [];
          renderMappingsList();
          return;
        }
      }

      // Sides match - store config and note that existing mappings exist
      existingSideConfig = {
        sideAIntegration: storedSideA,
        sideBIntegration: storedSideB,
      };

      showToast(`Found ${data.count} existing mapping(s) for this template`, 'info');
    } else {
      // No existing mappings - this will be a new mapping session
      existingSideConfig = null;
    }

    // Clear local state - mappings will be loaded after connection/feature selection
    mappings = [];
    pendingPairs = [];
    renderMappingsList();
  } catch (error) {
    console.error('Error checking existing mappings:', error);
    existingSideConfig = null;
    mappings = [];
    pendingPairs = [];
  }
}

/**
 * Load existing mappings for the current template + connection combination
 * Called after both connections are selected
 */
async function loadExistingMappingsForConnections() {
  const integrationA = sideState.A.integrationId;
  const integrationB = sideState.B.integrationId;
  const connectionA = sideState.A.connectionId;
  const connectionB = sideState.B.connectionId;

  if (!selectedTemplate || !integrationA || !integrationB || !connectionA || !connectionB) {
    return;
  }

  try {
    const connectionKeyA = `${integrationA}:${connectionA}`;
    const connectionKeyB = `${integrationB}:${connectionB}`;

    const response = await fetch(
      `/api/record-mappings/v2?templateId=${selectedTemplate.id}&connectionKeyA=${encodeURIComponent(connectionKeyA)}&connectionKeyB=${encodeURIComponent(connectionKeyB)}`
    );
    const data = await response.json();

    if (data.success && data.mappings && data.mappings.length > 0) {
      // Transform individual documents to display format
      mappings = data.mappings.map(doc => ({
        id: doc.id,
        sideARecordId: doc.integrations[integrationA]?.recordId,
        sideBRecordId: doc.integrations[integrationB]?.recordId,
        sideARecordData: doc.integrations[integrationA]?.recordData,
        sideBRecordData: doc.integrations[integrationB]?.recordData,
        createdAt: doc.createdAt,
      }));

      renderMappingsList();
      showToast(`Loaded ${mappings.length} existing mapping(s)`, 'info');
    } else {
      mappings = [];
      renderMappingsList();
    }
  } catch (error) {
    console.error('Error loading mappings for connections:', error);
    mappings = [];
  }
}

async function loadConnections(side, integrationId) {
  try {
    const response = await fetch(
      `/api/connections?integrationId=${integrationId}`,
    );
    const data = await response.json();
    const connections = data.connections || [];

    const select = document.getElementById(`connection${side}`);
    if (connections.length === 0) {
      select.innerHTML = '<option value="">No connections available</option>';
      select.disabled = true;
      return;
    }

    select.innerHTML =
      '<option value="">Select connection...</option>' +
      connections
        .map(
          c =>
            `<option value="${c.connectionId}">${escapeHtml(
              c.connectionName,
            )}</option>`,
        )
        .join('');
    select.disabled = false;
  } catch (error) {
    console.error('Error loading connections:', error);
    showToast('Failed to load connections', 'error');
  }
}

async function autoFindFeature(side, integrationId) {
  const templateSide =
    side === 'A' ? selectedTemplate.sideA : selectedTemplate.sideB;
  const scope = templateSide.scope;
  const operation = templateSide.operation;

  try {
    const response = await fetch(
      `/api/integrations/${integrationId}/apis-by-scope?scope=${scope}&operation=${operation}`,
    );
    const data = await response.json();
    const features = data.features || [];

    const select = document.getElementById(`feature${side}`);

    if (features.length === 0) {
      select.innerHTML = `<option value="">No matching features found for ${scope}/${operation}</option>`;
      select.disabled = true;
      sideState[side].featureId = null;
      showToast(
        `No features found for ${scope}/${operation} in selected integration`,
        'error',
      );
      return;
    }

    if (features.length === 1) {
      // Auto-select if only one feature
      const feature = features[0];
      sideState[side].featureId = feature.id;
      select.innerHTML = `<option value="${feature.id}" selected>${escapeHtml(
        feature.name,
      )}</option>`;
      select.disabled = true;
      showToast(`Auto-selected feature: ${feature.name}`, 'success');
      // Load variables for auto-selected feature
      await loadVariablesForFeature(side, feature.id);
    } else {
      // Show dropdown for multiple features
      select.innerHTML =
        '<option value="">Select feature...</option>' +
        features
          .map(f => `<option value="${f.id}">${escapeHtml(f.name)}</option>`)
          .join('');
      select.disabled = false;
      sideState[side].featureId = null;
      showToast(
        `Found ${features.length} matching features, please select one`,
        'info',
      );
    }
  } catch (error) {
    console.error('Error finding features:', error);
    showToast('Failed to find matching features', 'error');
  }
}

async function onConnectionChange(side) {
  const connectionId = document.getElementById(`connection${side}`).value;
  sideState[side].connectionId = connectionId;

  // Check if we can enable load button
  updateLoadButtonState(side);

  // Load existing mappings when both connections are selected
  if (sideState.A.connectionId && sideState.B.connectionId) {
    await loadExistingMappingsForConnections();
  }
}

async function onFeatureChange(side) {
  const featureId = document.getElementById(`feature${side}`).value;
  sideState[side].featureId = featureId;

  if (featureId) {
    // Load canonical variables for this feature
    await loadVariablesForFeature(side, featureId);
  } else {
    // Hide variables section
    document.getElementById(`variablesSection${side}`).style.display = 'none';
    sideState[side].selectedVariables = [];
    sideState[side].availableVariables = [];
  }

  // Check if we can enable load button
  updateLoadButtonState(side);
}

async function loadVariablesForFeature(side, featureId) {
  const integrationId = sideState[side].integrationId;

  try {
    // Fetch canonical variables from feature's response template (like canonical mapping modal)
    const response = await fetch(
      `/api/integrations/${integrationId}/features/${featureId}/canonical-variables`,
    );
    const data = await response.json();

    // Use response variables (these are the ones tagged in the response template)
    const variables = data.variables?.response || [];

    if (variables.length === 0) {
      document.getElementById(`variablesSection${side}`).style.display = 'none';
      sideState[side].availableVariables = [];
      sideState[side].selectedVariables = [];
      return;
    }

    // Store and render variables
    sideState[side].availableVariables = variables;
    renderVariablesCheckboxes(side, variables);
    document.getElementById(`variablesSection${side}`).style.display = 'block';
  } catch (error) {
    console.error('Error loading variables:', error);
    document.getElementById(`variablesSection${side}`).style.display = 'none';
  }
}

function renderVariablesCheckboxes(side, variables) {
  const container = document.getElementById(`variablesCheckboxes${side}`);

  if (variables.length === 0) {
    container.innerHTML =
      '<span class="no-vars">No canonical variables found</span>';
    return;
  }

  container.innerHTML = variables
    .map(
      (v, idx) => `
      <label class="variable-checkbox checked" for="var_${side}_${idx}">
        <input type="checkbox" id="var_${side}_${idx}" 
               data-variable="${escapeHtml(v.variable)}" 
               data-field="${escapeHtml(v.field)}"
               data-key="${escapeHtml(v.key || v.field)}"
               onchange="onVariableCheckboxChange('${side}')" checked />
        <span class="var-key">${escapeHtml(v.key || v.field)}</span>
      </label>
    `,
    )
    .join('');

  // Select all by default
  sideState[side].selectedVariables = [...variables];
}

function onVariableCheckboxChange(side) {
  const checkboxes = document.querySelectorAll(
    `#variablesCheckboxes${side} input[type="checkbox"]`,
  );
  const selected = [];

  checkboxes.forEach(cb => {
    if (cb.checked) {
      selected.push({
        variable: cb.dataset.variable,
        field: cb.dataset.field,
        key: cb.dataset.key,
      });
    }
    cb.closest('.variable-checkbox').classList.toggle('checked', cb.checked);
  });

  sideState[side].selectedVariables = selected;
  updateLoadButtonState(side);
}

function updateLoadButtonState(side) {
  const { connectionId, featureId, selectedVariables } = sideState[side];
  const loadBtn = document.getElementById(`loadData${side}`);
  // Require at least one variable selected
  loadBtn.disabled =
    !connectionId || !featureId || selectedVariables.length === 0;
}

// ===== Phase 2E: Data Loading =====

async function loadData(side) {
  const { integrationId, connectionId, featureId } = sideState[side];

  if (!integrationId || !connectionId || !featureId) {
    showToast('Please select all required fields', 'error');
    return;
  }

  const templateSide =
    side === 'A' ? selectedTemplate.sideA : selectedTemplate.sideB;
  const primaryKeyCanonical = templateSide.primaryKeyCanonical;

  try {
    showToast(`Loading data for Side ${side}...`, 'info');

    const response = await fetch('/api/canonical-mapping/execute-and-parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        integrationId,
        connectionId,
        featureId,
        selectedVariables: [], // Load all variables
      }),
    });

    const result = await response.json();

    if (!result.success) {
      showToast(result.error || 'Failed to load data', 'error');
      return;
    }

    const data = result.records || result.parsedData || [];
    sideState[side].data = data;

    // Find primary key field from selected variables
    // The canonical variable {{canonical.employee.unique_id}} maps to different field names
    // in different integrations (e.g., "unique_id" in Deepcall, "id" in Freshdesk)
    const primaryKeyField = findPrimaryKeyField(side, primaryKeyCanonical);
    sideState[side].primaryKeyField = primaryKeyField;

    renderDataTable(side, data, primaryKeyField);
    showToast(`Loaded ${data.length} records for Side ${side}`, 'success');
  } catch (error) {
    console.error('Error loading data:', error);
    showToast('Failed to load data', 'error');
  }
}

function findPrimaryKeyField(side, primaryKeyCanonical) {
  // Find the actual response field name that maps to the primary key canonical variable
  const variables = sideState[side].availableVariables;

  if (!variables || variables.length === 0) {
    // Fallback to extracting from canonical variable name
    return extractFieldFromCanonical(primaryKeyCanonical);
  }

  // Find the variable whose canonical matches the primary key canonical
  const primaryVar = variables.find(v => v.variable === primaryKeyCanonical);

  if (primaryVar) {
    // Return the actual field/key name from the response template
    return primaryVar.key || primaryVar.field;
  }

  // Fallback: extract field name from canonical
  return extractFieldFromCanonical(primaryKeyCanonical);
}

function extractFieldFromCanonical(canonical) {
  // Extract field name from {{canonical.scope.field}}
  const match = canonical.match(/\{\{canonical\.[^.]+\.([^}]+)\}\}/);
  return match ? match[1] : null;
}

function renderDataTable(side, data, primaryKeyField) {
  if (data.length === 0) {
    document.getElementById(`dataTableContainer${side}`).style.display = 'none';
    return;
  }

  const container = document.getElementById(`dataTableContainer${side}`);
  const thead = document.getElementById(`tableHead${side}`);
  const tbody = document.getElementById(`tableBody${side}`);
  const countSpan = document.getElementById(`recordCount${side}`);
  const mode = getSelectionMode(side);
  const inputType = mode === 'multi' ? 'checkbox' : 'radio';

  // Get selected variable keys
  const selectedVars = sideState[side].selectedVariables;
  let displayKeys;

  if (selectedVars && selectedVars.length > 0) {
    // Use only selected variable keys
    displayKeys = selectedVars.map(v => v.key || v.field);

    // Always include primary key if not already included
    if (primaryKeyField && !displayKeys.includes(primaryKeyField)) {
      displayKeys = [primaryKeyField, ...displayKeys];
    }
  } else {
    // Fallback: show all keys from data
    displayKeys = [...new Set(data.flatMap(Object.keys))];

    // Put primary key first
    if (primaryKeyField && displayKeys.includes(primaryKeyField)) {
      displayKeys = [
        primaryKeyField,
        ...displayKeys.filter(k => k !== primaryKeyField),
      ];
    }
  }

  // Render header with selection column
  thead.innerHTML = `<tr>
    <th class="select-col">${mode === 'multi' ? 'Select' : ''}</th>
    ${displayKeys
      .map(
        key =>
          `<th${
            key === primaryKeyField
              ? ' style="background: #ebf8ff; font-weight: 700;"'
              : ''
          }>${escapeHtml(key)}</th>`,
      )
      .join('')}
  </tr>`;

  // Render rows with selection inputs
  tbody.innerHTML = data
    .map(
      (row, index) => `
    <tr onclick="selectRecord('${side}', ${index})" data-index="${index}">
      <td class="select-col">
        <input type="${inputType}" name="select${side}" onclick="event.stopPropagation(); selectRecord('${side}', ${index})" />
      </td>
      ${displayKeys
        .map(key => `<td>${escapeHtml(row[key] || '')}</td>`)
        .join('')}
    </tr>
  `,
    )
    .join('');

  countSpan.textContent = `(${data.length})`;
  container.style.display = 'block';

  // Show selection mode info
  const modeLabel = mode === 'multi' ? '(Multi-select enabled)' : '(Single-select)';
  const infoEl = document.getElementById(`selectionInfo${side}`);
  if (infoEl) {
    infoEl.textContent = `No records selected ${modeLabel}`;
  }
}

// ===== Phase 2F: Record Mapping =====

// Determine selection mode based on relationship type
function getSelectionMode(side) {
  const relType = selectedTemplate?.relationshipType || 'one-to-one';

  // Side A selection mode
  if (side === 'A') {
    return (relType === 'many-to-one' || relType === 'many-to-many') ? 'multi' : 'single';
  }
  // Side B selection mode
  return (relType === 'one-to-many' || relType === 'many-to-many') ? 'multi' : 'single';
}

/**
 * Check if a record is constrained (can only map to one record on the other side)
 * For 1:N - Side B records are constrained (each B maps to only one A)
 * For N:1 - Side A records are constrained (each A maps to only one B)
 * For 1:1 - Both sides are constrained
 * For N:N - Neither side is constrained
 */
function isConstrainedSide(side) {
  const relType = selectedTemplate?.relationshipType || 'one-to-one';

  if (relType === 'one-to-one') {
    return true; // Both sides constrained
  }
  if (relType === 'one-to-many') {
    return side === 'B'; // Side B is constrained (many side can only map to one)
  }
  if (relType === 'many-to-one') {
    return side === 'A'; // Side A is constrained (many side can only map to one)
  }
  // many-to-many - no constraints
  return false;
}

/**
 * Validate if selecting records would violate relationship constraints
 * Returns { valid: boolean, error: string | null, conflictingRecords: array }
 */
function validateSelection(side, newRecords, otherSideRecords) {
  const relType = selectedTemplate?.relationshipType || 'one-to-one';

  // For N:N, no validation needed
  if (relType === 'many-to-many') {
    return { valid: true, error: null, conflictingRecords: [] };
  }

  // Combine existing mappings + pending pairs for constraint validation
  const allMappings = [
    ...mappings.map(m => ({ sideA: m.sideARecordId, sideB: m.sideBRecordId })),
    ...pendingPairs.map(p => ({ sideA: p.sideARecordId, sideB: p.sideBRecordId })),
  ];

  const conflictingRecords = [];

  // Check if the "constrained" side records are already mapped to different records
  if (side === 'A') {
    // Checking Side A selection
    // For 1:1 and N:1, Side A is constrained - each A can only map to one B
    if (relType === 'one-to-one' || relType === 'many-to-one') {
      for (const recA of newRecords) {
        // Check if this A record is already mapped to a DIFFERENT B
        const existingMapping = allMappings.find(m => m.sideA === recA.primaryKeyValue);
        if (existingMapping) {
          // Check if any of the selected B records match the existing mapping
          const existingB = existingMapping.sideB;
          const selectedBValues = otherSideRecords.map(r => r.primaryKeyValue);
          if (!selectedBValues.includes(existingB)) {
            conflictingRecords.push({
              record: recA,
              existingMappedTo: existingB,
              side: 'A'
            });
          }
        }
      }
    }
  } else {
    // Checking Side B selection
    // For 1:1 and 1:N, Side B is constrained - each B can only map to one A
    if (relType === 'one-to-one' || relType === 'one-to-many') {
      for (const recB of newRecords) {
        // Check if this B record is already mapped to a DIFFERENT A
        const existingMapping = allMappings.find(m => m.sideB === recB.primaryKeyValue);
        if (existingMapping) {
          // Check if any of the selected A records match the existing mapping
          const existingA = existingMapping.sideA;
          const selectedAValues = otherSideRecords.map(r => r.primaryKeyValue);
          if (!selectedAValues.includes(existingA)) {
            conflictingRecords.push({
              record: recB,
              existingMappedTo: existingA,
              side: 'B'
            });
          }
        }
      }
    }
  }

  if (conflictingRecords.length > 0) {
    const relLabel = relType === 'one-to-one' ? '1:1' : (relType === 'one-to-many' ? '1:N' : 'N:1');
    const constraintSide = side === 'A' ? 'Side A' : 'Side B';
    const otherSide = side === 'A' ? 'Side B' : 'Side A';

    const conflictIds = conflictingRecords.map(c => c.record.primaryKeyValue).join(', ');
    const error = `${relLabel} constraint violation: ${constraintSide} record(s) [${conflictIds}] already mapped to different ${otherSide} record(s). Each record on the constrained side can only map to one record.`;

    return { valid: false, error, conflictingRecords };
  }

  return { valid: true, error: null, conflictingRecords: [] };
}

function selectRecord(side, index) {
  const data = sideState[side].data;
  const record = data[index];
  const primaryKeyField = sideState[side].primaryKeyField;
  const mode = getSelectionMode(side);

  if (!primaryKeyField || !record[primaryKeyField]) {
    showToast('Cannot select record without primary key', 'error');
    return;
  }

  const primaryKeyValue = record[primaryKeyField];
  const otherSide = side === 'A' ? 'B' : 'A';

  // Check if this is a deselection (toggle off)
  const existingIndex = selectedRecords[side].findIndex(r => r.index === index);
  const isDeselecting = existingIndex >= 0;

  if (isDeselecting) {
    // Deselection - always allowed
    selectedRecords[side].splice(existingIndex, 1);
    updateRowHighlights(side);
    return;
  }

  // For selection, validate against existing mappings and pending pairs
  const newRecord = { index, primaryKeyValue, record };
  const otherSideRecords = selectedRecords[otherSide] || [];

  // Only validate if there are existing mappings/pending pairs and other side has selections
  const totalMappings = mappings.length + pendingPairs.length;
  if (totalMappings > 0 && otherSideRecords.length > 0) {
    const validation = validateSelection(side, [newRecord], otherSideRecords);
    if (!validation.valid) {
      showToast(validation.error, 'error');
      return;
    }
  }

  if (mode === 'single') {
    // Single selection - replace current selection
    selectedRecords[side] = [newRecord];
  } else {
    // Multi-select - add to selection
    selectedRecords[side].push(newRecord);
  }

  // Update row highlighting
  updateRowHighlights(side);

  // Check if both sides have selections and trigger mapping creation
  if (selectedRecords.A.length > 0 && selectedRecords.B.length > 0) {
    createMapping();
  }
}

function updateRowHighlights(side) {
  const tbody = document.getElementById(`tableBody${side}`);
  const selectedIndices = selectedRecords[side].map(r => r.index);
  const mode = getSelectionMode(side);

  Array.from(tbody.rows).forEach((row, i) => {
    const isSelected = selectedIndices.includes(i);
    row.classList.toggle('selected', isSelected);

    // Update input state (checkbox or radio)
    const input = row.querySelector('input');
    if (input) {
      input.checked = isSelected;
    }
  });

  // Update selection count display
  updateSelectionInfo(side);
}

function updateSelectionInfo(side) {
  const count = selectedRecords[side].length;
  const mode = getSelectionMode(side);
  const infoEl = document.getElementById(`selectionInfo${side}`);

  if (infoEl) {
    if (count === 0) {
      infoEl.textContent = mode === 'multi' ? 'No records selected (multi-select enabled)' : 'No record selected';
    } else if (count === 1) {
      infoEl.textContent = `1 record selected`;
    } else {
      infoEl.textContent = `${count} records selected`;
    }
  }
}

function createMapping() {
  const integrationA = sideState.A.integrationId;
  const integrationB = sideState.B.integrationId;
  const recordsA = selectedRecords.A || [];
  const recordsB = selectedRecords.B || [];
  const relType = selectedTemplate?.relationshipType || 'one-to-one';

  if (recordsA.length === 0 || recordsB.length === 0) {
    return;
  }

  // Combine existing mappings + pending pairs for constraint validation
  const allMappings = [
    ...mappings.map(m => ({ sideA: m.sideARecordId, sideB: m.sideBRecordId })),
    ...pendingPairs.map(p => ({ sideA: p.sideARecordId, sideB: p.sideBRecordId })),
  ];

  // Validate relationship constraints before creating mappings
  const constraintViolations = [];

  // Generate mappings for all combinations (user-provided pairs = cartesian product of selections)
  const newPairs = [];
  let duplicateCount = 0;

  for (const recA of recordsA) {
    for (const recB of recordsB) {
      // Check if mapping already exists (in saved mappings or pending pairs)
      const exists = allMappings.some(
        m => m.sideA === recA.primaryKeyValue && m.sideB === recB.primaryKeyValue,
      );

      if (exists) {
        duplicateCount++;
        continue;
      }

      // Check relationship constraints
      if (relType !== 'many-to-many') {
        // For 1:1 - check both sides
        // For 1:N - check if B is already mapped to a different A
        // For N:1 - check if A is already mapped to a different B

        if (relType === 'one-to-one' || relType === 'many-to-one') {
          // Check if A is already mapped to a different B
          const existingForA = allMappings.find(m => m.sideA === recA.primaryKeyValue);
          if (existingForA && existingForA.sideB !== recB.primaryKeyValue) {
            constraintViolations.push({
              type: 'A-constraint',
              recordA: recA.primaryKeyValue,
              existingB: existingForA.sideB,
              newB: recB.primaryKeyValue
            });
            continue;
          }
        }

        if (relType === 'one-to-one' || relType === 'one-to-many') {
          // Check if B is already mapped to a different A
          const existingForB = allMappings.find(m => m.sideB === recB.primaryKeyValue);
          if (existingForB && existingForB.sideA !== recA.primaryKeyValue) {
            constraintViolations.push({
              type: 'B-constraint',
              recordB: recB.primaryKeyValue,
              existingA: existingForB.sideA,
              newA: recA.primaryKeyValue
            });
            continue;
          }
        }
      }

      // Create pending pair with record data
      newPairs.push({
        sideARecordId: recA.primaryKeyValue,
        sideBRecordId: recB.primaryKeyValue,
        sideARecordData: getFilteredRecordData('A', recA.record),
        sideBRecordData: getFilteredRecordData('B', recB.record),
        createdAt: new Date().toISOString(),
      });

      // Add to allMappings for subsequent constraint checks within this batch
      allMappings.push({ sideA: recA.primaryKeyValue, sideB: recB.primaryKeyValue });
    }
  }

  // Show constraint violations if any
  if (constraintViolations.length > 0) {
    const relLabel = relType === 'one-to-one' ? '1:1' : (relType === 'one-to-many' ? '1:N' : 'N:1');

    // Group violations by type for clearer messaging
    const aViolations = constraintViolations.filter(v => v.type === 'A-constraint');
    const bViolations = constraintViolations.filter(v => v.type === 'B-constraint');

    let errorMsg = `${relLabel} constraint violation: `;
    if (bViolations.length > 0) {
      const bIds = [...new Set(bViolations.map(v => v.recordB))].join(', ');
      errorMsg += `Side B record(s) [${bIds}] already mapped to different Side A record(s). `;
    }
    if (aViolations.length > 0) {
      const aIds = [...new Set(aViolations.map(v => v.recordA))].join(', ');
      errorMsg += `Side A record(s) [${aIds}] already mapped to different Side B record(s).`;
    }

    showToast(errorMsg.trim(), 'error');

    // Don't clear selections on constraint violation - let user fix it
    if (newPairs.length === 0) {
      return;
    }
  }

  if (newPairs.length === 0) {
    if (duplicateCount > 0) {
      showToast(`All ${duplicateCount} mapping(s) already exist`, 'error');
    }
    return;
  }

  // Add to pending pairs (will be saved when user clicks Save)
  pendingPairs.push(...newPairs);
  renderMappingsList();

  // Clear selections
  selectedRecords.A = [];
  selectedRecords.B = [];

  // Remove highlights
  document.querySelectorAll('[id^="tableBody"] tr.selected').forEach(row => {
    row.classList.remove('selected');
  });
  document.querySelectorAll('[id^="tableBody"] input').forEach(input => {
    input.checked = false;
  });

  // Update selection info
  updateSelectionInfo('A');
  updateSelectionInfo('B');

  // Enable save button if there are pending pairs
  document.getElementById('saveMappingsBtn').disabled = pendingPairs.length === 0;

  const msg = newPairs.length === 1
    ? 'Mapping added (pending save)'
    : `${newPairs.length} mappings added (pending save)`;
  showToast(msg, 'success');
}

/**
 * Get filtered record data for saving (only selected canonical variable fields)
 */
function getFilteredRecordData(side, record) {
  const selectedVars = sideState[side].selectedVariables || [];
  const primaryKeyField = sideState[side].primaryKeyField;

  const selectedKeys = selectedVars.map(v => v.key || v.field);
  if (primaryKeyField && !selectedKeys.includes(primaryKeyField)) {
    selectedKeys.unshift(primaryKeyField);
  }

  const filtered = {};
  for (const key of selectedKeys) {
    if (record.hasOwnProperty(key)) {
      filtered[key] = record[key];
    }
  }
  return filtered;
}

function renderMappingsList() {
  const container = document.getElementById('mappingsList');

  const totalCount = mappings.length + pendingPairs.length;
  if (totalCount === 0) {
    container.innerHTML =
      '<div class="empty-mappings">Click records from both sides to create mappings</div>';
    document.getElementById('saveMappingsBtn').disabled = true;
    return;
  }

  const integrationA = sideState.A.integrationId;
  const integrationB = sideState.B.integrationId;

  let html = '';

  // Render existing (saved) mappings
  if (mappings.length > 0) {
    html += `<div class="mappings-section-header">Saved Mappings (${mappings.length})</div>`;
    html += mappings
      .map(
        (mapping, index) => `
      <div class="mapping-item mapping-saved">
        <div class="mapping-info">
          <div class="mapping-side">
            ${integrationA}: <code>${escapeHtml(mapping.sideARecordId)}</code>
          </div>
          <span class="mapping-arrow-small">↔</span>
          <div class="mapping-side">
            ${integrationB}: <code>${escapeHtml(mapping.sideBRecordId)}</code>
          </div>
        </div>
        <button class="btn-remove" onclick="deleteSavedMapping('${escapeHtml(mapping.id)}', ${index})" title="Delete">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `,
      )
      .join('');
  }

  // Render pending pairs (not yet saved)
  if (pendingPairs.length > 0) {
    html += `<div class="mappings-section-header pending">Pending Mappings (${pendingPairs.length}) - Click Save to commit</div>`;
    html += pendingPairs
      .map(
        (pair, index) => `
      <div class="mapping-item mapping-pending">
        <div class="mapping-info">
          <div class="mapping-side">
            ${integrationA}: <code>${escapeHtml(pair.sideARecordId)}</code>
          </div>
          <span class="mapping-arrow-small">↔</span>
          <div class="mapping-side">
            ${integrationB}: <code>${escapeHtml(pair.sideBRecordId)}</code>
          </div>
        </div>
        <button class="btn-remove" onclick="removePendingPair(${index})" title="Remove">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `,
      )
      .join('');
  }

  container.innerHTML = html;

  // Enable save button only if there are pending pairs
  document.getElementById('saveMappingsBtn').disabled = pendingPairs.length === 0;
}

/**
 * Remove a pending pair (not yet saved to Elasticsearch)
 */
function removePendingPair(index) {
  pendingPairs.splice(index, 1);
  renderMappingsList();
  showToast('Pending mapping removed', 'info');
}

/**
 * Delete a saved mapping from Elasticsearch
 */
async function deleteSavedMapping(mappingId, index) {
  try {
    const response = await fetch(`/api/record-mappings/v2/${mappingId}`, {
      method: 'DELETE',
    });
    const result = await response.json();

    if (result.success) {
      mappings.splice(index, 1);
      renderMappingsList();
      showToast('Mapping deleted', 'success');
    } else {
      showToast(result.error || 'Failed to delete mapping', 'error');
    }
  } catch (error) {
    console.error('Error deleting mapping:', error);
    showToast('Failed to delete mapping', 'error');
  }
}

// Legacy function for backwards compatibility
function removeMapping(index) {
  removePendingPair(index);
}

// ===== Phase 2G: Save to Elasticsearch =====

async function saveMappings() {
  if (pendingPairs.length === 0) {
    showToast('No pending mappings to save', 'error');
    return;
  }

  const integrationA = sideState.A.integrationId;
  const integrationB = sideState.B.integrationId;

  // Build canonical variable mappings (field -> canonical variable)
  const canonicalMappingsA = {};
  (sideState.A.selectedVariables || []).forEach(v => {
    const key = v.key || v.field;
    canonicalMappingsA[key] = v.variable;
  });

  const canonicalMappingsB = {};
  (sideState.B.selectedVariables || []).forEach(v => {
    const key = v.key || v.field;
    canonicalMappingsB[key] = v.variable;
  });

  const payload = {
    templateId: selectedTemplate.id,
    relationshipType: selectedTemplate.relationshipType || 'one-to-one',
    sideAIntegration: integrationA,
    sideBIntegration: integrationB,
    sideAConnectionId: sideState.A.connectionId,
    sideBConnectionId: sideState.B.connectionId,
    featureAId: sideState.A.featureId,
    featureBId: sideState.B.featureId,
    sideAMetadata: {
      primaryKeyField: sideState.A.primaryKeyField,
      primaryKeyCanonical: selectedTemplate.sideA.primaryKeyCanonical,
      canonicalMappings: canonicalMappingsA,
    },
    sideBMetadata: {
      primaryKeyField: sideState.B.primaryKeyField,
      primaryKeyCanonical: selectedTemplate.sideB.primaryKeyCanonical,
      canonicalMappings: canonicalMappingsB,
    },
    pairs: pendingPairs,
  };

  try {
    showToast('Saving mappings...', 'info');

    const response = await fetch('/api/record-mappings/v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (result.success) {
      // Move saved pairs to mappings list
      const savedCount = result.summary.saved;
      const violationCount = result.summary.violations;
      const duplicateCount = result.summary.duplicates;

      // Add saved mappings to the local mappings array
      result.saved.forEach(doc => {
        mappings.push({
          id: doc.id,
          sideARecordId: doc.integrations[integrationA]?.recordId,
          sideBRecordId: doc.integrations[integrationB]?.recordId,
          sideARecordData: doc.integrations[integrationA]?.recordData,
          sideBRecordData: doc.integrations[integrationB]?.recordData,
          createdAt: doc.createdAt,
        });
      });

      // Clear pending pairs that were saved
      if (violationCount === 0 && duplicateCount === 0) {
        pendingPairs = [];
      } else {
        // Keep only the pairs that had violations
        const violatedPairKeys = new Set(
          result.violations.map(v => `${v.pair.sideARecordId}:${v.pair.sideBRecordId}`)
        );
        pendingPairs = pendingPairs.filter(p =>
          violatedPairKeys.has(`${p.sideARecordId}:${p.sideBRecordId}`)
        );
      }

      // Update side config for future sessions
      if (!existingSideConfig) {
        existingSideConfig = {
          sideAIntegration: integrationA,
          sideBIntegration: integrationB,
        };
      }

      renderMappingsList();

      // Build result message
      let msg = `Saved ${savedCount} mapping(s)`;
      if (violationCount > 0) {
        msg += `, ${violationCount} constraint violation(s)`;
      }
      if (duplicateCount > 0) {
        msg += `, ${duplicateCount} duplicate(s) skipped`;
      }

      showToast(msg, violationCount > 0 ? 'error' : 'success');

      // Show detailed violations if any
      if (result.violations && result.violations.length > 0) {
        console.log('Constraint violations:', result.violations);
      }
    } else {
      showToast(result.error || 'Failed to save mappings', 'error');
    }
  } catch (error) {
    console.error('Error saving mappings:', error);
    showToast('Failed to save mappings', 'error');
  }
}

// ===== Utility Functions =====

function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-hide');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
