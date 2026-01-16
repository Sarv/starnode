// Modern API Configuration JavaScript - Postman-like Interface

// Global Variables
let currentIntegrationId = null;
let currentFeatureId = null;
let currentFieldId = null;
let currentFieldType = null;
let currentApiConfig = null;
let featureFields = [];
let currentFocusedInput = null;
let activeTab = 'params';
let currentBodyType = 'none';

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  // Get parameters from hidden inputs
  currentIntegrationId = document.getElementById('integrationId').value;
  currentFeatureId = document.getElementById('featureId').value;
  currentFieldId = document.getElementById('fieldId').value;
  currentFieldType = document.getElementById('fieldType').value;

  // Load initial data
  await loadFeatureFields();
  await loadApiConfig();

  // Setup event listeners
  setupEventListeners();

  // Update counts
  updateTabCounts();
});

// Setup Event Listeners
function setupEventListeners() {
  // Track focus for variable insertion
  document.addEventListener('click', e => {
    if (e.target.matches('input[type="text"], input[type="url"], textarea')) {
      currentFocusedInput = e.target;
    }
  });

  // Method selector color change
  const methodSelector = document.getElementById('httpMethod');
  if (methodSelector) {
    methodSelector.addEventListener('change', updateMethodColor);
    updateMethodColor();
  }

  // Handle Enter key in URL input to send request
  document.getElementById('apiUrl')?.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
      sendRequest();
    }
  });
}

// Tab Switching
function switchTab(tabName) {
  // Update active tab button
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');

  // Hide all tab panes
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.remove('active');
  });

  // Show selected tab
  const selectedTab = document.getElementById(`${tabName}-tab`);
  if (selectedTab) {
    selectedTab.classList.add('active');
  }

  activeTab = tabName;
}

// Body Type Selection
function selectBodyType(type) {
  // Update button states
  document.querySelectorAll('.body-type-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');

  // Hide all body editors
  document.querySelectorAll('.body-editor').forEach(editor => {
    editor.style.display = 'none';
  });

  // Show selected editor
  if (type !== 'none') {
    let editorId;
    switch (type) {
      case 'json':
        editorId = 'json-editor';
        break;
      case 'xml':
        editorId = 'xml-editor';
        break;
      case 'form-data':
        editorId = 'form-data-editor';
        break;
      case 'x-www-form-urlencoded':
        editorId = 'urlencoded-editor';
        break;
      case 'raw':
        editorId = 'raw-editor';
        break;
    }

    const editor = document.getElementById(editorId);
    if (editor) {
      editor.style.display = 'block';
    }
  }

  currentBodyType = type;
}

// Add Parameter
function addParam() {
  const paramsList = document.getElementById('paramsList');
  const row = createKeyValueRow(true);
  paramsList.appendChild(row);
  updateTabCounts();
}

// Add Header
function addHeader() {
  const headersList = document.getElementById('headersList');
  const row = createKeyValueRow(true);
  headersList.appendChild(row);
  updateTabCounts();
}

// Add Form Data
function addFormData() {
  const formDataList = document.getElementById('formDataList');
  const row = createKeyValueRow();
  formDataList.appendChild(row);
}

// Add URL Encoded
function addUrlEncoded() {
  const urlencodedList = document.getElementById('urlencodedList');
  const row = createKeyValueRow();
  urlencodedList.appendChild(row);
}

// Create Key-Value Row
function createKeyValueRow(
  withCheckbox = false,
  key = '',
  value = '',
  enabled = true,
) {
  const row = document.createElement('div');
  row.className = 'kv-row';

  let html = `
        <input type="text" class="kv-input key-input" placeholder="Key" value="${escapeHtml(
          key,
        )}">
        <input type="text" class="kv-input value-input" placeholder="Value" value="${escapeHtml(
          value,
        )}">
    `;

  if (withCheckbox) {
    html += `<input type="checkbox" class="kv-checkbox" ${
      enabled ? 'checked' : ''
    }>`;
  } else {
    html += `<span></span>`;
  }

  html += `
        <button class="kv-delete" onclick="removeRow(this)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
    `;

  row.innerHTML = html;
  return row;
}

// Remove Row
function removeRow(button) {
  button.closest('.kv-row').remove();
  updateTabCounts();
}

// Update Tab Counts
function updateTabCounts() {
  // Count params
  const params = document.querySelectorAll('#paramsList .kv-row').length;
  document.getElementById('paramsCount').textContent = params || '0';

  // Count headers
  const headers = document.querySelectorAll('#headersList .kv-row').length;
  document.getElementById('headersCount').textContent = headers || '0';
}

// Update Method Color
function updateMethodColor() {
  const methodSelector = document.getElementById('httpMethod');
  const method = methodSelector.value;
  methodSelector.className = `method-selector method-${method}`;
}

// Load Feature Fields
async function loadFeatureFields() {
  try {
    const response = await fetch(
      `/api/integrations/${currentIntegrationId}/feature-mappings`,
    );
    const result = await response.json();
    const mappings = result.featureMappings || result.mappings || [];
    const currentMapping = mappings.find(
      m => m.featureTemplateId === currentFeatureId,
    );

    if (currentMapping) {
      featureFields = [];

      // Add template fields
      if (currentMapping.fieldMappings) {
        Object.keys(currentMapping.fieldMappings).forEach(fieldKey => {
          featureFields.push({
            id: fieldKey,
            type: 'template',
            name: fieldKey,
            configured: false,
          });
        });
      }

      // Add extra fields
      if (currentMapping.extraFields) {
        currentMapping.extraFields.forEach(field => {
          featureFields.push({
            id: field.fieldKey,
            type: 'extra',
            name: field.label || field.fieldKey,
            configured: false,
          });
        });
      }
    }

    renderFieldsList();
  } catch (error) {
    console.error('Error loading feature fields:', error);
    showToast('Failed to load feature fields', 'error');
  }
}

// Render Fields List
function renderFieldsList() {
  const container = document.getElementById('fieldsList');
  if (!container) return;

  if (featureFields.length === 0) {
    container.innerHTML =
      '<div class="empty-state"><p>No fields found</p></div>';
    return;
  }

  let html = '';
  featureFields.forEach(field => {
    const isActive = field.id === currentFieldId;
    html += `
            <div class="field-item ${
              isActive ? 'active' : ''
            }" onclick="selectField('${field.id}', '${field.type}')">
                <div class="field-header">
                    <span class="field-name">${field.name}</span>
                    <span class="field-status ${
                      field.configured ? 'configured' : 'not-configured'
                    }">
                        ${field.configured ? 'API' : 'NO API'}
                    </span>
                </div>
                <div class="field-type">${
                  field.type === 'template' ? 'Template Field' : 'Extra Field'
                }</div>
            </div>
        `;
  });

  container.innerHTML = html;
}

// Select Field
function selectField(fieldId, fieldType) {
  const params = new URLSearchParams(window.location.search);
  params.set('fieldId', fieldId);
  params.set('fieldType', fieldType);
  window.location.search = params.toString();
}

// Load API Configuration
async function loadApiConfig() {
  try {
    const response = await fetch(
      `/api/integrations/${currentIntegrationId}/features/${currentFeatureId}/fields/${currentFieldId}/api-config`,
    );

    if (response.ok) {
      currentApiConfig = await response.json();
      populateForm(currentApiConfig);
    } else {
      console.log('No existing API configuration');
      showEmptyForm();
    }
  } catch (error) {
    console.error('Error loading API configuration:', error);
    showEmptyForm();
  }
}

// Populate Form
function populateForm(config) {
  // Set basic fields
  document.getElementById('apiName').value =
    config.name || `${currentFieldId} API`;
  document.getElementById('httpMethod').value = config.method || 'GET';
  document.getElementById('apiUrl').value = config.url || '';

  // Update method color
  updateMethodColor();

  // Populate headers
  if (config.headers && config.headers.length > 0) {
    const headersList = document.getElementById('headersList');
    headersList.innerHTML = '';
    config.headers.forEach(header => {
      const row = createKeyValueRow(
        true,
        header.key,
        header.value,
        header.enabled !== false,
      );
      headersList.appendChild(row);
    });
  }

  // Populate params
  if (config.queryParams && config.queryParams.length > 0) {
    const paramsList = document.getElementById('paramsList');
    paramsList.innerHTML = '';
    config.queryParams.forEach(param => {
      const row = createKeyValueRow(
        true,
        param.key,
        param.value,
        param.enabled !== false,
      );
      paramsList.appendChild(row);
    });
  }

  // Populate body
  if (config.bodyType) {
    currentBodyType = config.bodyType;
    // Trigger body type selection
    const bodyTypeBtn = document.querySelector(
      `.body-type-btn[onclick*="${config.bodyType}"]`,
    );
    if (bodyTypeBtn) {
      document
        .querySelectorAll('.body-type-btn')
        .forEach(btn => btn.classList.remove('active'));
      bodyTypeBtn.classList.add('active');
    }

    if (config.body) {
      if (config.bodyType === 'json' && config.body.json) {
        document.getElementById('jsonBody').value = JSON.stringify(
          config.body.json,
          null,
          2,
        );
        selectBodyType('json');
      } else if (config.bodyType === 'xml' && config.body.xml) {
        document.getElementById('xmlBody').value = config.body.xml;
        selectBodyType('xml');
      } else if (config.bodyType === 'raw' && config.body.raw) {
        document.getElementById('rawBody').value = config.body.raw;
        selectBodyType('raw');
      }
    }
  }

  // Populate settings
  if (config.response) {
    document.getElementById('successPath').value =
      config.response.successPath || '';
    document.getElementById('errorPath').value =
      config.response.errorPath || '';
  }

  updateTabCounts();
}

// Show Empty Form
function showEmptyForm() {
  document.getElementById('apiName').value = `${currentFieldId} API`;
  document.getElementById('httpMethod').value = 'GET';
  document.getElementById('apiUrl').value = '';
  updateMethodColor();
  updateTabCounts();
}

// Save API Configuration
async function saveApi() {
  const config = collectFormData();

  if (!config.name || !config.url) {
    showToast('Please provide API name and URL', 'error');
    return;
  }

  try {
    const method = currentApiConfig ? 'PUT' : 'POST';
    const response = await fetch(
      `/api/integrations/${currentIntegrationId}/features/${currentFeatureId}/fields/${currentFieldId}/api-config`,
      {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      },
    );

    if (response.ok) {
      showToast('API configuration saved successfully', 'success');
      currentApiConfig = config;

      // Update field status
      const field = featureFields.find(f => f.id === currentFieldId);
      if (field) {
        field.configured = true;
        renderFieldsList();
      }
    } else {
      throw new Error('Failed to save configuration');
    }
  } catch (error) {
    console.error('Error saving configuration:', error);
    showToast('Failed to save API configuration', 'error');
  }
}

// Collect Form Data
function collectFormData() {
  const config = {
    name: document.getElementById('apiName').value,
    method: document.getElementById('httpMethod').value,
    url: document.getElementById('apiUrl').value,
    headers: collectKeyValueData('headersList'),
    queryParams: collectKeyValueData('paramsList'),
    bodyType: currentBodyType,
    body: collectBodyData(),
    response: {
      successPath: document.getElementById('successPath')?.value || '',
      errorPath: document.getElementById('errorPath')?.value || '',
      // dataFormat: document.getElementById('responseFormat')?.value || 'json'
    },
  };

  return config;
}

// Collect Key-Value Data
function collectKeyValueData(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];

  const data = [];
  container.querySelectorAll('.kv-row').forEach(row => {
    const key = row.querySelector('.key-input')?.value;
    const value = row.querySelector('.value-input')?.value;
    const checkbox = row.querySelector('.kv-checkbox');

    if (key) {
      data.push({
        key,
        value,
        enabled: checkbox ? checkbox.checked : true,
      });
    }
  });

  return data;
}

// Collect Body Data
function collectBodyData() {
  const body = {};

  switch (currentBodyType) {
    case 'json':
      const jsonValue = document.getElementById('jsonBody')?.value;
      if (jsonValue) {
        try {
          body.json = JSON.parse(jsonValue);
        } catch (e) {
          body.json = jsonValue;
        }
      }
      break;
    case 'xml':
      body.xml = document.getElementById('xmlBody')?.value || '';
      break;
    case 'raw':
      body.raw = document.getElementById('rawBody')?.value || '';
      break;
    case 'form-data':
      body.formData = collectKeyValueData('formDataList');
      break;
    case 'x-www-form-urlencoded':
      body.urlencoded = collectKeyValueData('urlencodedList');
      break;
  }

  return body;
}

// Test API
async function testApi() {
  showToast('Testing API...', 'info');
  sendRequest();
}

// Send Request
async function sendRequest() {
  const config = collectFormData();

  if (!config.url) {
    showToast('Please enter a URL', 'error');
    return;
  }

  // Show response section
  const responseSection = document.getElementById('responseSection');
  responseSection.style.display = 'block';

  // Simulate API call
  document.getElementById('responseBody').value = 'Sending request...';

  // In a real implementation, make actual API call here
  setTimeout(() => {
    document.getElementById('responseBody').value = JSON.stringify(
      {
        success: true,
        message: 'Test response',
        data: {
          field: currentFieldId,
          timestamp: new Date().toISOString(),
        },
      },
      null,
      2,
    );
  }, 1000);
}

// Cancel Edit
function cancelEdit() {
  window.location.href = `/integration-detail?id=${currentIntegrationId}`;
}

// Toggle Variables Panel
function toggleVariables() {
  const panel = document.getElementById('variablesPanel');
  panel.classList.toggle('collapsed');
}

// Insert Variable
function insertVar(varName) {
  const variable = `{{${varName}}}`;

  if (currentFocusedInput) {
    const start = currentFocusedInput.selectionStart;
    const end = currentFocusedInput.selectionEnd;
    const value = currentFocusedInput.value;

    currentFocusedInput.value =
      value.slice(0, start) + variable + value.slice(end);
    currentFocusedInput.focus();
    currentFocusedInput.setSelectionRange(
      start + variable.length,
      start + variable.length,
    );

    showToast('Variable inserted', 'success');
  } else {
    navigator.clipboard.writeText(variable).then(() => {
      showToast('Variable copied to clipboard', 'success');
    });
  }
}

// JSON Functions
function beautifyJson() {
  const jsonBody = document.getElementById('jsonBody');
  if (!jsonBody) return;

  try {
    const json = JSON.parse(jsonBody.value);
    jsonBody.value = JSON.stringify(json, null, 2);
    showToast('JSON beautified', 'success');
  } catch (error) {
    showToast('Invalid JSON', 'error');
  }
}

function validateJson() {
  const jsonBody = document.getElementById('jsonBody');
  if (!jsonBody) return;

  try {
    JSON.parse(jsonBody.value);
    showToast('Valid JSON', 'success');
    jsonBody.style.borderColor = '#10B981';
    setTimeout(() => {
      jsonBody.style.borderColor = '';
    }, 2000);
  } catch (error) {
    showToast('Invalid JSON: ' + error.message, 'error');
    jsonBody.style.borderColor = '#EF4444';
  }
}

// XML Functions
function formatXml() {
  const xmlBody = document.getElementById('xmlBody');
  if (!xmlBody) return;

  // Simple XML formatting
  let xml = xmlBody.value;
  xml = xml.replace(/></g, '>\n<');
  xmlBody.value = xml;
  showToast('XML formatted', 'success');
}

function validateXml() {
  const xmlBody = document.getElementById('xmlBody');
  if (!xmlBody) return;

  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlBody.value, 'text/xml');

    if (xmlDoc.documentElement.nodeName === 'parsererror') {
      throw new Error('Invalid XML');
    }

    showToast('Valid XML', 'success');
    xmlBody.style.borderColor = '#10B981';
    setTimeout(() => {
      xmlBody.style.borderColor = '';
    }, 2000);
  } catch (error) {
    showToast('Invalid XML', 'error');
    xmlBody.style.borderColor = '#EF4444';
  }
}

// Auth Type Switch
function switchAuthType(type) {
  document.querySelectorAll('.auth-config').forEach(config => {
    config.style.display = 'none';
  });

  const authConfig = document.getElementById(`auth-${type}`);
  if (authConfig) {
    authConfig.style.display = 'block';
  }
}

// Utility Functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Toast Notifications
function showToast(message, type = 'info') {
  const toastContainer = document.getElementById('toastContainer');

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  // Add icon based on type
  let icon = '';
  switch (type) {
    case 'success':
      icon = '✓';
      break;
    case 'error':
      icon = '✕';
      break;
    case 'info':
      icon = 'ℹ';
      break;
  }

  toast.innerHTML = `<span>${icon}</span> ${message}`;
  toastContainer.appendChild(toast);

  // Auto remove after 3 seconds
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Add slide out animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        to {
            transform: translateX(120%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Test API Modal Functions
let currentApiConfig = null;
let userConnections = [];
let selectedConnection = null;

// Check if API is saved and update test button state
function updateTestButtonState() {
  const testButton = document.querySelector('.btn-test');
  if (!testButton) return;

  // Check if API config exists (meaning it's saved)
  const integrationId = document.getElementById('integrationId').value;
  const featureId = document.getElementById('featureId').value;
  const fieldId = document.getElementById('fieldId').value;

  fetch(
    `/api/integrations/${integrationId}/features/${featureId}/fields/${fieldId}/api-config`,
  )
    .then(response => {
      if (response.ok) {
        testButton.disabled = false;
        testButton.title = 'Test API Configuration';
      } else {
        testButton.disabled = true;
        testButton.title = 'Save API configuration before testing';
      }
    })
    .catch(() => {
      testButton.disabled = true;
      testButton.title = 'Save API configuration before testing';
    });
}

// Open test modal
async function testApi() {
  const integrationId = document.getElementById('integrationId').value;
  const featureId = document.getElementById('featureId').value;
  const fieldId = document.getElementById('fieldId').value;

  // First, check if API is saved
  try {
    const apiResponse = await fetch(
      `/api/integrations/${integrationId}/features/${featureId}/fields/${fieldId}/api-config`,
    );
    if (!apiResponse.ok) {
      showToast('Please save the API configuration first', 'error');
      return;
    }
    currentApiConfig = await apiResponse.json();
  } catch (error) {
    showToast('Failed to load API configuration', 'error');
    return;
  }

  // Show the modal
  document.getElementById('testApiModal').style.display = 'block';

  // Load user connections
  loadUserConnections();
}

// Load user connections for the dropdown
async function loadUserConnections() {
  const integrationId = document.getElementById('integrationId').value;
  const select = document.getElementById('userConnectionSelect');

  // For now, we'll use a hardcoded userId. In a real app, this would come from session/auth
  const userId = 'user123'; // This should be replaced with actual user ID from session

  try {
    const response = await fetch(
      `/api/integrations/${integrationId}/user-connections?userId=${userId}`,
    );
    if (!response.ok) throw new Error('Failed to fetch connections');

    const data = await response.json();
    userConnections = data.connections || [];

    // Populate the dropdown
    select.innerHTML = '<option value="">Select a connection...</option>';
    userConnections.forEach(conn => {
      const option = document.createElement('option');
      option.value = conn.id;
      option.textContent = `${conn.name} (${conn.authMethod})`;
      select.appendChild(option);
    });

    // Add change event listener
    select.onchange = onConnectionSelected;
  } catch (error) {
    console.error('Error loading connections:', error);
    select.innerHTML = '<option value="">No connections available</option>';
    showToast('Failed to load user connections', 'error');
  }
}

// Handle connection selection
function onConnectionSelected() {
  const select = document.getElementById('userConnectionSelect');
  const connectionId = select.value;

  if (!connectionId) {
    document.getElementById('connectionInfo').style.display = 'none';
    document.getElementById('executeTestBtn').disabled = true;
    selectedConnection = null;
    return;
  }

  selectedConnection = userConnections.find(c => c.id === connectionId);
  if (!selectedConnection) return;

  // Display connection info
  document.getElementById('authMethodDisplay').textContent =
    selectedConnection.authMethod;
  document.getElementById('connectionStatusDisplay').textContent =
    selectedConnection.status;
  document.getElementById('connectionInfo').style.display = 'block';

  // Check for variables in the API config and show input fields
  checkAndShowVariableInputs();

  // Enable execute button
  document.getElementById('executeTestBtn').disabled = false;
}

// Check for variables in API config and create input fields
function checkAndShowVariableInputs() {
  if (!currentApiConfig) return;

  const variablePattern = /\{\{([^}]+)\}\}/g;
  const variables = new Set();

  // Extract variables from URL
  if (currentApiConfig.url) {
    const matches = currentApiConfig.url.matchAll(variablePattern);
    for (const match of matches) {
      variables.add(match[1].trim());
    }
  }

  // Extract variables from headers
  if (currentApiConfig.headers) {
    Object.values(currentApiConfig.headers).forEach(value => {
      if (typeof value === 'string') {
        const matches = value.matchAll(variablePattern);
        for (const match of matches) {
          variables.add(match[1].trim());
        }
      }
    });
  }

  // Extract variables from body
  if (currentApiConfig.body && typeof currentApiConfig.body === 'string') {
    const matches = currentApiConfig.body.matchAll(variablePattern);
    for (const match of matches) {
      variables.add(match[1].trim());
    }
  }

  // Create input fields for variables
  const variableInputsDiv = document.getElementById('variableInputs');
  variableInputsDiv.innerHTML = '';

  if (variables.size > 0) {
    document.getElementById('variableValuesSection').style.display = 'block';

    variables.forEach(variable => {
      const inputGroup = document.createElement('div');
      inputGroup.className = 'variable-input-group';
      inputGroup.innerHTML = `
                <label for="var-${variable}">{{${variable}}}</label>
                <input type="text" id="var-${variable}" data-variable="${variable}" placeholder="Enter value for ${variable}">
            `;
      variableInputsDiv.appendChild(inputGroup);
    });
  } else {
    document.getElementById('variableValuesSection').style.display = 'none';
  }
}

// Execute API test
async function executeApiTest() {
  if (!selectedConnection || !currentApiConfig) {
    showToast('Please select a connection first', 'error');
    return;
  }

  const executeBtn = document.getElementById('executeTestBtn');
  executeBtn.disabled = true;
  executeBtn.textContent = 'Executing...';

  // Collect variable values
  const variableValues = {};
  const variableInputs = document.querySelectorAll('#variableInputs input');
  variableInputs.forEach(input => {
    const variable = input.dataset.variable;
    const value = input.value;
    if (variable) {
      variableValues[variable] = value;
    }
  });

  // Prepare test request
  const integrationId = document.getElementById('integrationId').value;
  const featureId = document.getElementById('featureId').value;
  const fieldId = document.getElementById('fieldId').value;

  try {
    const response = await fetch(
      `/api/integrations/${integrationId}/features/${featureId}/fields/${fieldId}/test-api`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'user123', // Replace with actual user ID
          connectionId: selectedConnection.id,
          variableValues: variableValues,
        }),
      },
    );

    const result = await response.json();

    // Display results
    displayTestResults(result);
  } catch (error) {
    console.error('Test execution error:', error);
    showToast('Failed to execute test: ' + error.message, 'error');
  } finally {
    executeBtn.disabled = false;
    executeBtn.textContent = 'Execute Test';
  }
}

// Display test results
function displayTestResults(result) {
  const resultsDiv = document.getElementById('testResults');
  resultsDiv.style.display = 'block';

  // Update status
  const statusSpan = document.getElementById('responseStatus');
  if (result.success) {
    statusSpan.className = 'response-status success';
    statusSpan.textContent = `${result.response.status} ${result.response.statusText}`;
  } else {
    statusSpan.className = 'response-status error';
    statusSpan.textContent = result.response
      ? `${result.response.status} ${result.response.statusText}`
      : 'Error';
  }

  // Update timing
  document.getElementById('responseTime').textContent = `Time: ${
    result.response?.responseTime || 0
  }ms`;

  // Update size
  const responseSize = JSON.stringify(result.response?.data || '').length;
  document.getElementById('responseSize').textContent = `Size: ${formatBytes(
    responseSize,
  )}`;

  // Display response body
  document.getElementById('responseBodyContent').textContent = JSON.stringify(
    result.response?.data || result.error || 'No response',
    null,
    2,
  );

  // Display headers
  document.getElementById('responseHeadersContent').textContent =
    JSON.stringify(result.response?.headers || {}, null, 2);

  // Display request details
  document.getElementById('requestDetailsContent').textContent = JSON.stringify(
    result.request || {},
    null,
    2,
  );
}

// Switch result tabs
function switchResultTab(tab) {
  // Update tab buttons
  document.querySelectorAll('.result-tab').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');

  // Update tab panes
  document.querySelectorAll('.result-pane').forEach(pane => {
    pane.style.display = 'none';
  });
  document.getElementById(`result-${tab}`).style.display = 'block';
}

// Close test modal
function closeTestModal() {
  document.getElementById('testApiModal').style.display = 'none';
  // Reset the modal state
  document.getElementById('testResults').style.display = 'none';
  document.getElementById('variableValuesSection').style.display = 'none';
  document.getElementById('connectionInfo').style.display = 'none';
  document.getElementById('userConnectionSelect').value = '';
  selectedConnection = null;
}

// Format bytes to human readable
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Initialize test button state on page load
document.addEventListener('DOMContentLoaded', updateTestButtonState);
