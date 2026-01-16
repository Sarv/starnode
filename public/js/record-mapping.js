/**
 * Record Mapping Page JavaScript
 * Handles template-based record mapping between integrations
 */

// State
let templates = [];
let integrations = [];
let selectedTemplate = null;
let selectedRecords = {
  A: null,
  B: null,
};
let mappings = [];

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

  // Display template details
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
  };
  selectedRecords[side] = null;

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

function onConnectionChange(side) {
  const connectionId = document.getElementById(`connection${side}`).value;
  sideState[side].connectionId = connectionId;

  // Check if we can enable load button
  updateLoadButtonState(side);
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

  // Render header
  thead.innerHTML = `<tr>${displayKeys
    .map(
      key =>
        `<th${
          key === primaryKeyField
            ? ' style="background: #ebf8ff; font-weight: 700;"'
            : ''
        }>${escapeHtml(key)}</th>`,
    )
    .join('')}</tr>`;

  // Render rows
  tbody.innerHTML = data
    .map(
      (row, index) => `
    <tr onclick="selectRecord('${side}', ${index})">
      ${displayKeys
        .map(key => `<td>${escapeHtml(row[key] || '')}</td>`)
        .join('')}
    </tr>
  `,
    )
    .join('');

  countSpan.textContent = `(${data.length})`;
  container.style.display = 'block';
}

// ===== Phase 2F: Record Mapping =====

function selectRecord(side, index) {
  const data = sideState[side].data;
  const record = data[index];
  const primaryKeyField = sideState[side].primaryKeyField;

  if (!primaryKeyField || !record[primaryKeyField]) {
    showToast('Cannot select record without primary key', 'error');
    return;
  }

  // Update selection
  selectedRecords[side] = {
    index,
    primaryKeyValue: record[primaryKeyField],
    record,
  };

  // Highlight selected row
  const tbody = document.getElementById(`tableBody${side}`);
  Array.from(tbody.rows).forEach((row, i) => {
    row.classList.toggle('selected', i === index);
  });

  // Check if both sides selected
  if (selectedRecords.A && selectedRecords.B) {
    createMapping();
  }
}

function createMapping() {
  const integrationA = sideState.A.integrationId;
  const integrationB = sideState.B.integrationId;
  const valueA = selectedRecords.A.primaryKeyValue;
  const valueB = selectedRecords.B.primaryKeyValue;

  // Check if mapping already exists
  const exists = mappings.some(
    m => m[integrationA] === valueA && m[integrationB] === valueB,
  );

  if (exists) {
    showToast('This mapping already exists', 'error');
    return;
  }

  // Create mapping
  const mapping = {
    [integrationA]: valueA,
    [integrationB]: valueB,
    createdAt: new Date().toISOString(),
  };

  mappings.push(mapping);
  renderMappingsList();

  // Clear selections
  selectedRecords.A = null;
  selectedRecords.B = null;

  // Remove highlights
  document.querySelectorAll('.record-table tbody tr.selected').forEach(row => {
    row.classList.remove('selected');
  });

  // Enable save button
  document.getElementById('saveMappingsBtn').disabled = mappings.length === 0;

  showToast('Mapping created', 'success');
}

function renderMappingsList() {
  const container = document.getElementById('mappingsList');

  if (mappings.length === 0) {
    container.innerHTML =
      '<div class="empty-mappings">Click records from both sides to create mappings</div>';
    document.getElementById('saveMappingsBtn').disabled = true;
    return;
  }

  const integrationA = sideState.A.integrationId;
  const integrationB = sideState.B.integrationId;

  container.innerHTML = mappings
    .map(
      (mapping, index) => `
    <div class="mapping-item">
      <div class="mapping-info">
        <div class="mapping-side">
          ${integrationA}: <code>${escapeHtml(mapping[integrationA])}</code>
        </div>
        <span class="mapping-arrow-small">↔</span>
        <div class="mapping-side">
          ${integrationB}: <code>${escapeHtml(mapping[integrationB])}</code>
        </div>
      </div>
      <button class="btn-remove" onclick="removeMapping(${index})" title="Remove">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  `,
    )
    .join('');

  document.getElementById('saveMappingsBtn').disabled = false;
}

function removeMapping(index) {
  mappings.splice(index, 1);
  renderMappingsList();
  showToast('Mapping removed', 'info');
}

// ===== Phase 2G: Save to Elasticsearch =====

async function saveMappings() {
  if (mappings.length === 0) {
    showToast('No mappings to save', 'error');
    return;
  }

  const integrationA = sideState.A.integrationId;
  const integrationB = sideState.B.integrationId;

  const payload = {
    templateId: selectedTemplate.id,
    integrations: {
      [integrationA]: {
        connectionId: sideState.A.connectionId,
        featureId: sideState.A.featureId,
        primaryKeyField: sideState.A.primaryKeyField,
        primaryKeyCanonical: selectedTemplate.sideA.primaryKeyCanonical,
      },
      [integrationB]: {
        connectionId: sideState.B.connectionId,
        featureId: sideState.B.featureId,
        primaryKeyField: sideState.B.primaryKeyField,
        primaryKeyCanonical: selectedTemplate.sideB.primaryKeyCanonical,
      },
    },
    mappings: mappings,
  };

  try {
    const response = await fetch('/api/record-mappings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (result.success) {
      showToast(`Successfully saved ${mappings.length} mappings!`, 'success');
      // Optionally reset the form or keep for editing
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
