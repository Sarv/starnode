/**
 * Canonical Mapping Page JavaScript
 * Manages mapping of canonical variables between integrations
 */

// State
let mappings = [];
let integrations = [];
let scopes = [];
let currentEditingId = null;

// Per-side state
const sideState = {
  A: {
    integrationId: null,
    connectionId: null,
    featureId: null,
    variables: [],
    selectedVariables: [],
    loadedData: [],
    canonicalMappings: {},
    selectedRecord: null,
    primaryKey: null,
  },
  B: {
    integrationId: null,
    connectionId: null,
    featureId: null,
    variables: [],
    selectedVariables: [],
    loadedData: [],
    canonicalMappings: {},
    selectedRecord: null,
    primaryKey: null,
  },
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadTemplates();
  await loadIntegrations();
  await loadScopes();

  document
    .getElementById('addMappingBtn')
    .addEventListener('click', openAddModal);
});

// Load all mappings
async function loadMappings() {
  try {
    const response = await fetch('/api/canonical-mappings');
    const data = await response.json();

    if (data.success) {
      mappings = data.mappings;
      renderMappingsTable();
    }
  } catch (error) {
    console.error('Error loading mappings:', error);
    showToast('Failed to load mappings', 'error');
  }
}

// Load integrations for dropdowns
async function loadIntegrations() {
  try {
    const response = await fetch('/api/integrations');
    const data = await response.json();
    integrations = data.integrations || [];
  } catch (error) {
    console.error('Error loading integrations:', error);
  }
}

// Load canonical scopes
async function loadScopes() {
  try {
    const response = await fetch('/api/canonical/scopes');
    const data = await response.json();
    scopes = data.scopes || [];
  } catch (error) {
    console.error('Error loading scopes:', error);
  }
}

// Render mappings table
function renderMappingsTable() {
  const tbody = document.getElementById('mappingsTableBody');
  const emptyState = document.getElementById('emptyState');
  const table = document.getElementById('mappingsTable');

  if (mappings.length === 0) {
    table.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  table.style.display = 'table';
  emptyState.style.display = 'none';

  tbody.innerHTML = mappings
    .map(
      mapping => `
    <tr>
      <td><span class="mapping-name">${escapeHtml(mapping.name)}</span></td>
      <td>
        <span class="integration-badge">
          ${escapeHtml(mapping.integrationA?.integrationId || '-')}
          <span class="scope-tag">${escapeHtml(
            mapping.integrationA?.scope || '',
          )}</span>
        </span>
      </td>
      <td>
        <span class="integration-badge">
          ${escapeHtml(mapping.integrationB?.integrationId || '-')}
          <span class="scope-tag">${escapeHtml(
            mapping.integrationB?.scope || '',
          )}</span>
        </span>
      </td>
      <td><span class="variable-count">${
        mapping.variableMappings?.length || 0
      }</span></td>
      <td><span class="mapping-date">${formatDate(
        mapping.createdAt,
      )}</span></td>
      <td>
        <div class="mapping-actions">
          <button onclick="openEditModal('${mapping.id}')" title="Edit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="delete-btn" onclick="openDeleteModal('${
            mapping.id
          }')" title="Delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `,
    )
    .join('');
}

// Open add modal
function openAddModal() {
  currentEditingId = null;
  document.getElementById('modalTitle').textContent = 'Add New Mapping';
  document.getElementById('mappingName').value = '';

  resetSideState('A');
  resetSideState('B');

  populateIntegrationDropdowns();
  populateScopeDropdowns();

  document.getElementById('mappingModal').style.display = 'flex';
}

// Reset side state
function resetSideState(side) {
  sideState[side] = {
    integrationId: null,
    connectionId: null,
    featureId: null,
    variables: [],
    selectedVariables: [],
    loadedData: [],
    canonicalMappings: {},
    selectedRecord: null,
    primaryKey: null,
  };

  document.getElementById(`integration${side}`).value = '';
  document.getElementById(`connection${side}`).value = '';
  document.getElementById(`connection${side}`).disabled = true;
  document.getElementById(`scope${side}`).value = '';
  document.getElementById(`scope${side}`).disabled = true;
  document.getElementById(`operation${side}`).value = '';
  document.getElementById(`operation${side}`).disabled = true;
  document.getElementById(`feature${side}`).value = '';
  document.getElementById(`feature${side}`).disabled = true;
  document.getElementById(`loadBtn${side}`).disabled = true;

  document.getElementById(`variablesCheckboxes${side}`).innerHTML =
    '<span class="no-vars">Select a feature to see variables</span>';
  document.getElementById(`primaryKeySection${side}`).style.display = 'none';
  document.getElementById(`loadedDataSection${side}`).style.display = 'none';
  document.getElementById('mappingSummary').style.display = 'none';
}

// Populate integration dropdowns
function populateIntegrationDropdowns() {
  const options = integrations
    .map(
      i =>
        `<option value="${i.id}">${escapeHtml(i.displayName || i.id)}</option>`,
    )
    .join('');
  const defaultOption = '<option value="">Select integration...</option>';

  document.getElementById('integrationA').innerHTML = defaultOption + options;
  document.getElementById('integrationB').innerHTML = defaultOption + options;
}

// Populate scope dropdowns
function populateScopeDropdowns() {
  const options = scopes
    .map(s => `<option value="${s.id}">${escapeHtml(s.label || s.id)}</option>`)
    .join('');
  const defaultOption = '<option value="">Select scope...</option>';

  document.getElementById('scopeA').innerHTML = defaultOption + options;
  document.getElementById('scopeB').innerHTML = defaultOption + options;
}

// On integration change
async function onIntegrationChange(side) {
  const integrationId = document.getElementById(`integration${side}`).value;
  sideState[side].integrationId = integrationId;

  if (integrationId) {
    // Load connections for this integration
    await loadConnectionsForIntegration(side, integrationId);
    document.getElementById(`connection${side}`).disabled = false;
    document.getElementById(`scope${side}`).disabled = false;
  } else {
    resetSideState(side);
  }
}

// Load connections for integration
async function loadConnectionsForIntegration(side, integrationId) {
  try {
    const response = await fetch(
      `/api/connections?integrationId=${integrationId}`,
    );
    const data = await response.json();

    const connections = data.connections || [];
    const options = connections
      .map(
        c =>
          `<option value="${c.id}">${escapeHtml(
            c.connectionName || c.id,
          )}</option>`,
      )
      .join('');
    const defaultOption = '<option value="">Select connection...</option>';

    document.getElementById(`connection${side}`).innerHTML =
      defaultOption + options;
  } catch (error) {
    console.error('Error loading connections:', error);
    document.getElementById(`connection${side}`).innerHTML =
      '<option value="">No connections found</option>';
  }
}

// On scope change
async function onScopeChange(side) {
  const scope = document.getElementById(`scope${side}`).value;

  if (scope) {
    await populateOperationDropdown(side, scope);
    document.getElementById(`operation${side}`).disabled = false;
    document.getElementById(`feature${side}`).value = '';
    document.getElementById(`feature${side}`).disabled = true;
  } else {
    document.getElementById(`operation${side}`).value = '';
    document.getElementById(`operation${side}`).disabled = true;
    document.getElementById(`feature${side}`).value = '';
    document.getElementById(`feature${side}`).disabled = true;
  }
}

// Populate operation dropdown
async function populateOperationDropdown(side, scopeId) {
  const scope = scopes.find(s => s.id === scopeId);
  const operations = scope?.operations || [];

  const options = operations
    .map(
      op =>
        `<option value="${op.id}">${escapeHtml(op.label || op.id)}</option>`,
    )
    .join('');
  const defaultOption = '<option value="">Select operation...</option>';

  document.getElementById(`operation${side}`).innerHTML =
    defaultOption + options;
}

// On operation change
async function onOperationChange(side) {
  const integrationId = document.getElementById(`integration${side}`).value;
  const scope = document.getElementById(`scope${side}`).value;
  const operation = document.getElementById(`operation${side}`).value;

  if (operation) {
    await loadFeaturesForIntegration(side, integrationId, scope, operation);
    document.getElementById(`feature${side}`).disabled = false;
  } else {
    document.getElementById(`feature${side}`).value = '';
    document.getElementById(`feature${side}`).disabled = true;
  }
}

// Load features for integration
async function loadFeaturesForIntegration(
  side,
  integrationId,
  scope,
  operation,
) {
  try {
    const response = await fetch(
      `/api/integrations/${integrationId}/features-by-scope?scope=${scope}&operation=${operation}`,
    );
    const data = await response.json();

    const features = data.features || [];
    const options = features
      .map(
        f =>
          `<option value="${f.featureTemplateId}">${escapeHtml(
            f.featureTemplateName || f.featureTemplateId,
          )}</option>`,
      )
      .join('');
    const defaultOption = '<option value="">Select feature...</option>';

    document.getElementById(`feature${side}`).innerHTML =
      defaultOption + options;
  } catch (error) {
    console.error('Error loading features:', error);
    document.getElementById(`feature${side}`).innerHTML =
      '<option value="">No features found</option>';
  }
}

// On feature change
async function onFeatureChange(side) {
  const integrationId = document.getElementById(`integration${side}`).value;
  const featureId = document.getElementById(`feature${side}`).value;
  sideState[side].featureId = featureId;

  if (featureId) {
    await loadVariablesForFeature(side, integrationId, featureId);
    updateLoadButtonState(side);
  } else {
    document.getElementById(`variablesCheckboxes${side}`).innerHTML =
      '<span class="no-vars">Select a feature to see variables</span>';
    document.getElementById(`loadBtn${side}`).disabled = true;
  }
}

// Load variables for feature
async function loadVariablesForFeature(side, integrationId, featureId) {
  try {
    const response = await fetch(
      `/api/integrations/${integrationId}/features/${featureId}/canonical-variables`,
    );
    const data = await response.json();

    const variables = data.variables || { request: [], response: [] };
    // We only care about response variables for listing APIs
    sideState[side].variables = variables.response || [];
    sideState[side].canonicalMappings = data.canonicalMappings || {};

    renderVariablesCheckboxes(side);
  } catch (error) {
    console.error('Error loading variables:', error);
  }
}

// Render variables as checkboxes
function renderVariablesCheckboxes(side) {
  const container = document.getElementById(`variablesCheckboxes${side}`);
  const variables = sideState[side].variables;

  if (variables.length === 0) {
    container.innerHTML =
      '<span class="no-vars">No canonical variables found</span>';
    return;
  }

  container.innerHTML = variables
    .map(
      (v, idx) => `
    <label class="variable-checkbox" for="var_${side}_${idx}">
      <input type="checkbox" id="var_${side}_${idx}" 
             data-variable="${escapeHtml(v.variable)}" 
             data-field="${escapeHtml(v.field)}"
             data-key="${escapeHtml(v.key || v.field)}"
             onchange="onVariableCheckboxChange('${side}')" checked />
      <span class="var-key">${escapeHtml(v.key || v.field)}</span>
      <span class="var-canonical">${escapeHtml(v.variable)}</span>
    </label>
  `,
    )
    .join('');

  // Select all by default
  sideState[side].selectedVariables = [...variables];
}

// On variable checkbox change
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

// Update load button state
function updateLoadButtonState(side) {
  const connectionId = document.getElementById(`connection${side}`).value;
  const featureId = document.getElementById(`feature${side}`).value;
  const hasSelectedVars = sideState[side].selectedVariables.length > 0;

  document.getElementById(`loadBtn${side}`).disabled = !(
    connectionId &&
    featureId &&
    hasSelectedVars
  );
}

// Load API data
async function loadApiData(side) {
  const integrationId = document.getElementById(`integration${side}`).value;
  const connectionId = document.getElementById(`connection${side}`).value;
  const featureId = document.getElementById(`feature${side}`).value;

  sideState[side].connectionId = connectionId;

  const loadBtn = document.getElementById(`loadBtn${side}`);
  loadBtn.classList.add('loading');
  loadBtn.disabled = true;

  try {
    const response = await fetch('/api/canonical-mapping/execute-and-parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        integrationId,
        connectionId,
        featureId,
        selectedVariables: sideState[side].selectedVariables,
      }),
    });

    const data = await response.json();

    if (data.success) {
      sideState[side].loadedData = data.records || [];
      sideState[side].canonicalMappings = data.canonicalMappings || {};

      // If we have data, update selectedVariables to use actual record keys
      if (data.records && data.records.length > 0) {
        const actualKeys = Object.keys(data.records[0]);
        // Update variables to use actual keys from response
        sideState[side].selectedVariables = actualKeys.map(key => ({
          key: key,
          variable: data.canonicalMappings[key] || `{{${key}}}`,
          field: key,
        }));
      }

      renderLoadedData(side);
      renderPrimaryKeyDropdown(side);
      showToast(`Loaded ${data.records.length} records`, 'success');
    } else {
      showToast(data.error || 'Failed to load data', 'error');
    }
  } catch (error) {
    console.error('Error loading API data:', error);
    showToast('Failed to execute API', 'error');
  } finally {
    loadBtn.classList.remove('loading');
    updateLoadButtonState(side);
  }
}

// Render primary key dropdown
function renderPrimaryKeyDropdown(side) {
  const section = document.getElementById(`primaryKeySection${side}`);
  const dropdown = document.getElementById(`primaryKey${side}`);
  const variables = sideState[side].selectedVariables;

  if (variables.length === 0) {
    section.style.display = 'none';
    return;
  }

  const options = variables
    .map(
      v =>
        `<option value="${escapeHtml(v.variable)}">${escapeHtml(
          v.key,
        )} (${escapeHtml(v.variable)})</option>`,
    )
    .join('');

  dropdown.innerHTML =
    '<option value="">Select primary key...</option>' + options;
  section.style.display = 'block';
}

// Render loaded data table
function renderLoadedData(side) {
  const section = document.getElementById(`loadedDataSection${side}`);
  const thead = document.getElementById(`dataTableHead${side}`);
  const tbody = document.getElementById(`dataTableBody${side}`);
  const data = sideState[side].loadedData;
  const variables = sideState[side].selectedVariables;

  if (data.length === 0) {
    section.style.display = 'none';
    return;
  }

  // Build header
  const headerCells = ['<th class="radio-cell"></th>'];
  variables.forEach(v => {
    headerCells.push(`
      <th>
        ${escapeHtml(v.key)}
        <span class="canonical-hint">${escapeHtml(v.variable)}</span>
      </th>
    `);
  });
  thead.innerHTML = `<tr>${headerCells.join('')}</tr>`;

  // Build body
  tbody.innerHTML = data
    .map(
      (record, idx) => `
    <tr onclick="selectRecord('${side}', ${idx})" data-index="${idx}">
      <td class="radio-cell">
        <input type="radio" name="record${side}" value="${idx}" />
      </td>
      ${variables
        .map(v => `<td>${escapeHtml(record[v.key] || '-')}</td>`)
        .join('')}
    </tr>
  `,
    )
    .join('');

  section.style.display = 'block';
}

// Select record
function selectRecord(side, index) {
  const tbody = document.getElementById(`dataTableBody${side}`);
  const rows = tbody.querySelectorAll('tr');
  const record = sideState[side].loadedData[index];
  const primaryKey = document.getElementById(`primaryKey${side}`).value;

  // Update row selection
  rows.forEach((row, i) => {
    row.classList.toggle('selected', i === index);
    row.querySelector('input[type="radio"]').checked = i === index;
  });

  sideState[side].selectedRecord = record;

  // Update selected record display
  const selectedDiv = document.getElementById(`selectedRecord${side}`);
  if (primaryKey && record[primaryKey]) {
    selectedDiv.innerHTML = `
      <div class="selection-info">
        <span class="selection-key">${escapeHtml(primaryKey)}:</span>
        <span class="selection-value">${escapeHtml(record[primaryKey])}</span>
      </div>
    `;
  } else {
    selectedDiv.innerHTML = `<div class="selection-info"><span>Record ${
      index + 1
    } selected</span></div>`;
  }

  updateMappingSummary();
}

// On primary key change
function onPrimaryKeyChange(side) {
  sideState[side].primaryKey = document.getElementById(
    `primaryKey${side}`,
  ).value;

  // Re-render selected record display if one is selected
  if (sideState[side].selectedRecord) {
    const index = sideState[side].loadedData.indexOf(
      sideState[side].selectedRecord,
    );
    if (index >= 0) {
      selectRecord(side, index);
    }
  }

  // Update save template button visibility
  updateSaveTemplateButtonState();
}

// Update mapping summary
function updateMappingSummary() {
  const summaryDiv = document.getElementById('mappingSummary');
  const recordA = sideState.A.selectedRecord;
  const recordB = sideState.B.selectedRecord;
  const keyA = sideState.A.primaryKey;
  const keyB = sideState.B.primaryKey;

  if (recordA && recordB && keyA && keyB) {
    document.getElementById('summaryValueA').textContent = `${keyA}: ${
      recordA[keyA] || 'N/A'
    }`;
    document.getElementById('summaryValueB').textContent = `${keyB}: ${
      recordB[keyB] || 'N/A'
    }`;
    summaryDiv.style.display = 'block';
  } else {
    summaryDiv.style.display = 'none';
  }
}

// Close modal
function closeModal() {
  document.getElementById('mappingModal').style.display = 'none';
  currentEditingId = null;
}

// Open edit modal (placeholder)
async function openEditModal(id) {
  showToast('Edit functionality coming soon', 'info');
}

// Delete modal
let deleteId = null;

function openDeleteModal(id) {
  deleteId = id;
  const mapping = mappings.find(m => m.id === id);

  document.getElementById('deleteMappingName').textContent =
    mapping?.name || 'Unknown';
  document.getElementById('deleteModal').style.display = 'flex';
}

function closeDeleteModal() {
  document.getElementById('deleteModal').style.display = 'none';
  deleteId = null;
}

async function confirmDelete() {
  if (!deleteId) return;

  try {
    const response = await fetch(`/api/canonical-mappings/${deleteId}`, {
      method: 'DELETE',
    });

    const data = await response.json();

    if (data.success) {
      showToast('Mapping deleted successfully', 'success');
      closeDeleteModal();
      await loadMappings();
    } else {
      showToast(data.error || 'Failed to delete mapping', 'error');
    }
  } catch (error) {
    console.error('Error deleting mapping:', error);
    showToast('Failed to delete mapping', 'error');
  }
}

// Helper functions
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
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

// ===== Template Management Functions =====

// Update visibility of Save Template button
function updateSaveTemplateButtonState() {
  const nameField = document.getElementById('mappingName');
  const primaryKeyA = document.getElementById('primaryKeyA');
  const primaryKeyB = document.getElementById('primaryKeyB');
  const saveBtn = document.getElementById('saveTemplateBtn');

  // Show Save Template button if name and both primary keys are selected
  if (
    nameField &&
    nameField.value &&
    primaryKeyA &&
    primaryKeyA.value &&
    primaryKeyB &&
    primaryKeyB.value
  ) {
    saveBtn.style.display = 'inline-block';
  } else {
    saveBtn.style.display = 'none';
  }
}

// Save template
async function saveTemplate() {
  const name = document.getElementById('mappingName').value;
  const scopeA = document.getElementById('scopeA').value;
  const operationA = document.getElementById('operationA').value;
  const primaryKeyA = document.getElementById('primaryKeyA').value;

  const scopeB = document.getElementById('scopeB').value;
  const operationB = document.getElementById('operationB').value;
  const primaryKeyB = document.getElementById('primaryKeyB').value;

  if (
    !name ||
    !scopeA ||
    !operationA ||
    !primaryKeyA ||
    !scopeB ||
    !operationB ||
    !primaryKeyB
  ) {
    showToast('Please fill in all required fields', 'error');
    return;
  }

  try {
    const response = await fetch('/api/mapping-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        sideA: {
          scope: scopeA,
          operation: operationA,
          primaryKeyCanonical: primaryKeyA,
        },
        sideB: {
          scope: scopeB,
          operation: operationB,
          primaryKeyCanonical: primaryKeyB,
        },
      }),
    });

    const data = await response.json();

    if (data.success) {
      showToast('Template saved successfully', 'success');
      closeModal();
      // Reload templates list (you'll need to add this function)
      await loadTemplates();
    } else {
      showToast(data.error || 'Failed to save template', 'error');
    }
  } catch (error) {
    console.error('Error saving template:', error);
    showToast('Failed to save template', 'error');
  }
}

// Load templates
async function loadTemplates() {
  try {
    const response = await fetch('/api/mapping-templates');
    const data = await response.json();

    const templates = data.templates || [];
    renderTemplatesTable(templates);
  } catch (error) {
    console.error('Error loading templates:', error);
    showToast('Failed to load templates', 'error');
  }
}

// Render templates table
function renderTemplatesTable(templates) {
  const tbody = document.getElementById('mappingsTableBody');
  const emptyState = document.getElementById('emptyState');
  const table = document.getElementById('mappingsTable');

  if (templates.length === 0) {
    table.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  table.style.display = 'table';
  emptyState.style.display = 'none';

  tbody.innerHTML = templates
    .map(
      template => `
        <tr>
          <td><strong>${escapeHtml(template.name)}</strong></td>
          <td>
            <span class="scope-badge">${escapeHtml(
              template.sideA.scope,
            )}</span> / 
            <span class="operation-badge">${escapeHtml(
              template.sideA.operation,
            )}</span>
          </td>
          <td>
            <span class="scope-badge">${escapeHtml(
              template.sideB.scope,
            )}</span> / 
            <span class="operation-badge">${escapeHtml(
              template.sideB.operation,
            )}</span>
          </td>
          <td>
            <code>${escapeHtml(template.sideA.primaryKeyCanonical)}</code> ↔ 
            <code>${escapeHtml(template.sideB.primaryKeyCanonical)}</code>
          </td>
          <td>${formatDate(template.createdAt)}</td>
          <td>
            <button class="btn-icon" onclick="deleteTemplate('${escapeHtml(
              template.id,
            )}')" title="Delete">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
              </svg>
            </button>
          </td>
        </tr>
      `,
    )
    .join('');
}

// Delete template
async function deleteTemplate(templateId) {
  if (!confirm('Are you sure you want to delete this template?')) {
    return;
  }

  try {
    const response = await fetch(`/api/mapping-templates/${templateId}`, {
      method: 'DELETE',
    });

    const data = await response.json();

    if (data.success) {
      showToast('Template deleted successfully', 'success');
      await loadTemplates();
    } else {
      showToast(data.error || 'Failed to delete template', 'error');
    }
  } catch (error) {
    console.error('Error deleting template:', error);
    showToast('Failed to delete template', 'error');
  }
}
