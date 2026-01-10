// Canonical Forms Page - Main JavaScript

// State
let scopes = [];
let selectedScope = null;
let selectedOperation = null;
let selectedVariable = null;
let activeTab = 'operations';
let editMode = null;
let isCreating = false;

// DOM Elements
const scopesList = document.getElementById('scopesList');
const operationsList = document.getElementById('operationsList');
const variablesList = document.getElementById('variablesList');
const noItemSelected = document.getElementById('noItemSelected');
const scopesCount = document.getElementById('scopesCount');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadScopes();
  initializeEventListeners();
  initializeTabs();
});

function initializeEventListeners() {
  // Add Scope button
  document.getElementById('addScopeBtn').addEventListener('click', () => {
    showScopeEditor(null);
  });

  // Add Operation button
  document.getElementById('addOperationBtn').addEventListener('click', () => {
    showOperationEditor(null);
  });

  // Add Variable button
  document.getElementById('addVariableBtn').addEventListener('click', () => {
    showVariableEditor(null);
  });

  // Scope editor buttons
  document.getElementById('saveScopeBtn').addEventListener('click', saveScope);
  document
    .getElementById('cancelScopeBtn')
    .addEventListener('click', hideAllEditors);
  document
    .getElementById('deleteScopeBtn')
    .addEventListener('click', deleteScope);

  // Operation editor buttons
  document
    .getElementById('saveOperationBtn')
    .addEventListener('click', saveOperation);
  document
    .getElementById('cancelOperationBtn')
    .addEventListener('click', hideAllEditors);
  document
    .getElementById('deleteOperationBtn')
    .addEventListener('click', deleteOperation);

  // Variable editor buttons
  document
    .getElementById('saveVariableBtn')
    .addEventListener('click', saveVariable);
  document
    .getElementById('cancelVariableBtn')
    .addEventListener('click', hideAllEditors);
  document
    .getElementById('deleteVariableBtn')
    .addEventListener('click', deleteVariable);
}

function initializeTabs() {
  // Tab switching (like API Configuration)
  document.querySelectorAll('.tab-btn').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;

      // Update active tab button
      document
        .querySelectorAll('.tab-btn')
        .forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Update active tab pane
      document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.dataset.pane === tabName);
      });

      activeTab = tabName;
      selectedOperation = null;
      selectedVariable = null;

      if (tabName === 'operations') {
        renderOperations();
      } else {
        renderVariables();
      }

      hideAllEditors();
    });
  });
}

// =====================================================
// API Functions
// =====================================================

async function loadScopes() {
  try {
    const response = await fetch('/api/canonical/scopes');
    const data = await response.json();
    scopes = data.scopes || [];
    scopesCount.textContent = scopes.length;
    renderScopes();
  } catch (error) {
    console.error('Error loading scopes:', error);
    showToast('Failed to load scopes', 'error');
  }
}

// =====================================================
// Rendering Functions
// =====================================================

function renderScopes() {
  if (scopes.length === 0) {
    scopesList.innerHTML =
      '<div class="empty-placeholder"><p>No scopes yet. Click "+ Add Scope" to create one.</p></div>';
    return;
  }

  scopesList.innerHTML = scopes
    .map(
      scope => `
    <div class="scope-item ${selectedScope?.id === scope.id ? 'active' : ''}" 
         data-scope-id="${scope.id}" 
         onclick="selectScope('${scope.id}')">
      <div class="scope-item-content">
        <div class="scope-item-label">${escapeHtml(scope.label)}</div>
        <div class="scope-item-description">${escapeHtml(
          scope.description || 'No description',
        )}</div>
      </div>
      <span class="scope-item-count">${
        (scope.operations?.length || 0) + (scope.variables?.length || 0)
      }</span>
    </div>
  `,
    )
    .join('');
}

function renderOperations() {
  const addBtn = document.getElementById('addOperationBtn');

  if (!selectedScope) {
    addBtn.style.display = 'none';
    operationsList.innerHTML =
      '<div class="empty-placeholder"><p>Select a scope to view operations</p></div>';
    return;
  }

  addBtn.style.display = 'flex';
  const operations = selectedScope.operations || [];

  if (operations.length === 0) {
    operationsList.innerHTML =
      '<div class="empty-placeholder"><p>No operations yet. Click "Add Operation" to create one.</p></div>';
    return;
  }

  operationsList.innerHTML = operations
    .map(
      op => `
    <div class="item-card ${selectedOperation?.id === op.id ? 'active' : ''}" 
         data-operation-id="${op.id}" 
         onclick="selectOperation('${op.id}')">
      <div class="item-card-content">
        <div class="item-card-label">${escapeHtml(op.label)}</div>
        <div class="item-card-description">${escapeHtml(
          op.description || 'No description',
        )}</div>
      </div>
    </div>
  `,
    )
    .join('');
}

function renderVariables() {
  const addBtn = document.getElementById('addVariableBtn');

  if (!selectedScope) {
    addBtn.style.display = 'none';
    variablesList.innerHTML =
      '<div class="empty-placeholder"><p>Select a scope to view variables</p></div>';
    return;
  }

  addBtn.style.display = 'flex';
  const variables = selectedScope.variables || [];

  if (variables.length === 0) {
    variablesList.innerHTML =
      '<div class="empty-placeholder"><p>No variables yet. Click "Add Variable" to create one.</p></div>';
    return;
  }

  variablesList.innerHTML = variables
    .map(
      v => `
    <div class="item-card ${selectedVariable?.id === v.id ? 'active' : ''}" 
         data-variable-id="${v.id}" 
         onclick="selectVariable('${v.id}')">
      <div class="item-card-content">
        <div class="item-card-label">${escapeHtml(v.label)}</div>
        <div class="item-card-description">{{canonical.${selectedScope.id}.${
        v.id
      }}}</div>
      </div>
      <span class="item-card-meta">${v.fieldType || 'string'}</span>
    </div>
  `,
    )
    .join('');
}

// =====================================================
// Selection Functions
// =====================================================

function selectScope(scopeId) {
  selectedScope = scopes.find(s => s.id === scopeId);
  selectedOperation = null;
  selectedVariable = null;

  renderScopes();

  if (activeTab === 'operations') {
    renderOperations();
  } else {
    renderVariables();
  }

  showScopeEditor(selectedScope);
}

function selectOperation(opId) {
  selectedOperation = selectedScope?.operations?.find(o => o.id === opId);
  selectedVariable = null;
  renderOperations();
  showOperationEditor(selectedOperation);
}

function selectVariable(varId) {
  selectedVariable = selectedScope?.variables?.find(v => v.id === varId);
  selectedOperation = null;
  renderVariables();
  showVariableEditor(selectedVariable);
}

// =====================================================
// Editor Functions
// =====================================================

function hideAllEditors() {
  document.getElementById('scopeEditor').style.display = 'none';
  document.getElementById('operationEditor').style.display = 'none';
  document.getElementById('variableEditor').style.display = 'none';
  noItemSelected.style.display = 'block';
  document.getElementById('editorTitle').textContent = 'Details';
  editMode = null;
  isCreating = false;
}

function showScopeEditor(scope) {
  hideAllEditors();
  isCreating = !scope;
  editMode = 'scope';

  document.getElementById('scopeId').value = scope?.id || '';
  document.getElementById('scopeId').disabled = !!scope;
  document.getElementById('scopeLabel').value = scope?.label || '';
  document.getElementById('scopeDescription').value = scope?.description || '';

  document.getElementById('deleteScopeZone').style.display = scope
    ? 'block'
    : 'none';
  document.getElementById('editorTitle').textContent = scope
    ? 'Edit Scope'
    : 'New Scope';

  noItemSelected.style.display = 'none';
  document.getElementById('scopeEditor').style.display = 'block';
}

function showOperationEditor(operation) {
  hideAllEditors();
  isCreating = !operation;
  editMode = 'operation';

  document.getElementById('operationId').value = operation?.id || '';
  document.getElementById('operationId').disabled = !!operation;
  document.getElementById('operationLabel').value = operation?.label || '';
  document.getElementById('operationDescription').value =
    operation?.description || '';

  document.getElementById('deleteOperationZone').style.display = operation
    ? 'block'
    : 'none';
  document.getElementById('editorTitle').textContent = operation
    ? 'Edit Operation'
    : 'New Operation';

  noItemSelected.style.display = 'none';
  document.getElementById('operationEditor').style.display = 'block';
}

function showVariableEditor(variable) {
  hideAllEditors();
  isCreating = !variable;
  editMode = 'variable';

  document.getElementById('variableId').value = variable?.id || '';
  document.getElementById('variableId').disabled = !!variable;
  document.getElementById('variableLabel').value = variable?.label || '';
  document.getElementById('variableDescription').value =
    variable?.description || '';
  document.getElementById('variableFieldType').value =
    variable?.fieldType || 'string';

  document.getElementById('deleteVariableZone').style.display = variable
    ? 'block'
    : 'none';
  document.getElementById('editorTitle').textContent = variable
    ? 'Edit Variable'
    : 'New Variable';

  noItemSelected.style.display = 'none';
  document.getElementById('variableEditor').style.display = 'block';
}

// =====================================================
// CRUD - Scope
// =====================================================

async function saveScope() {
  const id = document.getElementById('scopeId').value.trim();
  const label = document.getElementById('scopeLabel').value.trim();
  const description = document.getElementById('scopeDescription').value.trim();

  if (!id || !label) {
    showToast('ID and Label are required', 'error');
    return;
  }

  if (!/^[a-z0-9_]+$/.test(id)) {
    showToast('ID must be lowercase with underscores only', 'error');
    return;
  }

  try {
    if (isCreating) {
      const response = await fetch('/api/canonical/scopes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, label, description }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      showToast('Scope created successfully', 'success');
    } else {
      const response = await fetch(`/api/canonical/scopes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, description }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      showToast('Scope updated successfully', 'success');
    }

    await loadScopes();

    if (id) {
      selectedScope = scopes.find(s => s.id === id);
      renderScopes();
      showScopeEditor(selectedScope);
    }
  } catch (error) {
    showToast(error.message || 'Failed to save scope', 'error');
  }
}

async function deleteScope() {
  if (!selectedScope) return;

  if (
    !confirm(
      `Are you sure you want to delete "${selectedScope.label}"? This will also delete all operations and variables.`,
    )
  ) {
    return;
  }

  try {
    const response = await fetch(`/api/canonical/scopes/${selectedScope.id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    showToast('Scope deleted successfully', 'success');
    selectedScope = null;
    await loadScopes();
    hideAllEditors();
    renderOperations();
    renderVariables();
  } catch (error) {
    showToast(error.message || 'Failed to delete scope', 'error');
  }
}

// =====================================================
// CRUD - Operation
// =====================================================

async function saveOperation() {
  if (!selectedScope) {
    showToast('Please select a scope first', 'error');
    return;
  }

  const id = document.getElementById('operationId').value.trim();
  const label = document.getElementById('operationLabel').value.trim();
  const description = document
    .getElementById('operationDescription')
    .value.trim();

  if (!id || !label) {
    showToast('ID and Label are required', 'error');
    return;
  }

  if (!/^[a-z0-9_]+$/.test(id)) {
    showToast('ID must be lowercase with underscores only', 'error');
    return;
  }

  try {
    if (isCreating) {
      const response = await fetch(
        `/api/canonical/scopes/${selectedScope.id}/operations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, label, description }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      showToast('Operation created successfully', 'success');
    } else {
      const response = await fetch(
        `/api/canonical/scopes/${selectedScope.id}/operations/${id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label, description }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      showToast('Operation updated successfully', 'success');
    }

    await loadScopes();
    selectedScope = scopes.find(s => s.id === selectedScope.id);
    renderOperations();
    renderScopes();

    if (id) {
      selectedOperation = selectedScope?.operations?.find(o => o.id === id);
      renderOperations();
      showOperationEditor(selectedOperation);
    }
  } catch (error) {
    showToast(error.message || 'Failed to save operation', 'error');
  }
}

async function deleteOperation() {
  if (!selectedScope || !selectedOperation) return;

  if (
    !confirm(`Are you sure you want to delete "${selectedOperation.label}"?`)
  ) {
    return;
  }

  try {
    const response = await fetch(
      `/api/canonical/scopes/${selectedScope.id}/operations/${selectedOperation.id}`,
      {
        method: 'DELETE',
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    showToast('Operation deleted successfully', 'success');
    selectedOperation = null;
    await loadScopes();
    selectedScope = scopes.find(s => s.id === selectedScope.id);
    renderOperations();
    renderScopes();
    hideAllEditors();
  } catch (error) {
    showToast(error.message || 'Failed to delete operation', 'error');
  }
}

// =====================================================
// CRUD - Variable
// =====================================================

async function saveVariable() {
  if (!selectedScope) {
    showToast('Please select a scope first', 'error');
    return;
  }

  const id = document.getElementById('variableId').value.trim();
  const label = document.getElementById('variableLabel').value.trim();
  const description = document
    .getElementById('variableDescription')
    .value.trim();
  const fieldType = document.getElementById('variableFieldType').value;

  if (!id || !label) {
    showToast('ID and Label are required', 'error');
    return;
  }

  if (!/^[a-z0-9_]+$/.test(id)) {
    showToast('ID must be lowercase with underscores only', 'error');
    return;
  }

  try {
    if (isCreating) {
      const response = await fetch(
        `/api/canonical/scopes/${selectedScope.id}/variables`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, label, description, fieldType }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      showToast('Variable created successfully', 'success');
    } else {
      const response = await fetch(
        `/api/canonical/scopes/${selectedScope.id}/variables/${id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label, description, fieldType }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      showToast('Variable updated successfully', 'success');
    }

    await loadScopes();
    selectedScope = scopes.find(s => s.id === selectedScope.id);
    renderVariables();
    renderScopes();

    if (id) {
      selectedVariable = selectedScope?.variables?.find(v => v.id === id);
      renderVariables();
      showVariableEditor(selectedVariable);
    }
  } catch (error) {
    showToast(error.message || 'Failed to save variable', 'error');
  }
}

async function deleteVariable() {
  if (!selectedScope || !selectedVariable) return;

  if (
    !confirm(`Are you sure you want to delete "${selectedVariable.label}"?`)
  ) {
    return;
  }

  try {
    const response = await fetch(
      `/api/canonical/scopes/${selectedScope.id}/variables/${selectedVariable.id}`,
      {
        method: 'DELETE',
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    showToast('Variable deleted successfully', 'success');
    selectedVariable = null;
    await loadScopes();
    selectedScope = scopes.find(s => s.id === selectedScope.id);
    renderVariables();
    renderScopes();
    hideAllEditors();
  } catch (error) {
    showToast(error.message || 'Failed to delete variable', 'error');
  }
}

// =====================================================
// Utility Functions
// =====================================================

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type = 'success') {
  // Use toast-container like API Configuration
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  // Trigger animation
  setTimeout(() => toast.classList.add('show'), 10);

  // Remove after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
