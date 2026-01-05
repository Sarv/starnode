// API Configuration Module - Field-Based Configuration
let currentIntegrationId = null;
let currentFeatureId = null;
let currentFieldId = null;
let currentFieldType = null;
let featureFields = [];
let availableVariables = {};
let currentFocusedInput = null;
let currentApiConfig = null;
let currentApiName = null; // Store API name since we removed the input field
let allApis = []; // Store all APIs for the integration
let multiApiMode = false; // Flag to track if we're in multi-API mode

// Initialize on page load
async function initializePage() {
  console.log('[API Config] Initializing page...');

  // Extract parameters from URL
  const urlParams = new URLSearchParams(window.location.search);
  currentIntegrationId = urlParams.get('integrationId');
  currentFeatureId = urlParams.get('featureId');
  currentFieldId = urlParams.get('fieldId');
  currentFieldType = urlParams.get('fieldType') || 'template';
  const featureName = urlParams.get('featureName');

  console.log('[API Config] URL Params:', {
    integrationId: currentIntegrationId,
    featureId: currentFeatureId,
    fieldId: currentFieldId,
    fieldType: currentFieldType,
  });

  console.log('[API Config] Loading canonical scopes...');
  await loadCanonicalScopes();

  // Check if we're in multi-API mode (only integrationId provided)
  if (currentIntegrationId && !currentFeatureId && !currentFieldId) {
    console.log('[API Config] Entering MULTI-API mode');
    multiApiMode = true;
    await initMultiApiMode();
    return;
  }

  // Single API mode - need all params
  if (!currentIntegrationId || !currentFeatureId || !currentFieldId) {
    console.log('[API Config] Missing required parameters');
    showToast(
      'Missing required parameters. Please navigate from Integration Detail page.',
      'error',
    );
    document.querySelector('.api-form-panel').innerHTML = `
            <div class="empty-state" style="padding: 48px; text-align: center;">
                <h3 style="color: #374151; margin-bottom: 16px;">Missing Required Parameters</h3>
                <p style="color: #6b7280; margin-bottom: 24px;">
                    This page requires proper navigation from the Integration Detail page.
                </p>
            </div>
        `;
    return;
  }

  console.log('[API Config] Entering SINGLE-API mode');

  // Update UI with feature and field info
  document.getElementById('featureDisplayName').textContent = `${
    featureName || 'Feature'
  } / ${currentFieldId}`;
  document.getElementById('featureName').textContent =
    featureName || 'API Configuration';

  // Update integration link
  document.getElementById(
    'integrationLink',
  ).href = `/integration-detail?id=${currentIntegrationId}`;

  // Load data
  console.log('[API Config] Loading feature fields...');
  await loadFeatureFields();
  console.log('[API Config] Loading field API config...');
  await loadFieldApiConfig();
  console.log('[API Config] Loading available variables...');
  await loadAvailableVariables();
  // console.log('[API Config] Loading canonical scopes...');
  // await loadCanonicalScopes();

  // Also load API tree for multi-API navigation
  console.log('[API Config] Loading API tree...');
  await loadApiTreeForSingleMode();

  // Set up event listeners
  console.log('[API Config] Setting up event listeners...');
  setupEventListeners();

  // Update test button state
  console.log('[API Config] Updating test button state...');
  updateTestButtonState();

  // Initialize variable highlighting
  console.log('[API Config] Initializing variable highlighting...');
  initializeVariableHighlighting();

  console.log('[API Config] Initialization complete!');
}

// Handle both cases: DOM already loaded or still loading
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePage);
} else {
  // DOM is already loaded, execute immediately
  initializePage();
}

// Track if event listeners have been set up
let eventListenersSetup = false;

// Setup event listeners
function setupEventListeners() {
  console.log(
    '[API Config] Setting up event listeners, already setup:',
    eventListenersSetup,
  );

  // Initialize tab functionality (always re-initialize for clean state)
  initializeTabs();

  // Only set up other listeners once
  if (eventListenersSetup) {
    console.log('[API Config] Event listeners already set up, skipping');
    return;
  }

  // Form submission
  const form = document.getElementById('apiConfigForm');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }

  // Variable search
  const variableSearch = document.getElementById('variableSearch');
  if (variableSearch) {
    variableSearch.addEventListener('input', filterVariables);
  }

  // Track focused input for variable insertion
  document.querySelectorAll('input[type="text"], textarea').forEach(input => {
    input.addEventListener('focus', () => {
      currentFocusedInput = input;
    });
  });

  // Body type selector
  const bodyTypeSelect = document.getElementById('bodyType');
  if (bodyTypeSelect) {
    bodyTypeSelect.addEventListener('change', e =>
      switchBodyType(e.target.value),
    );
  }

  eventListenersSetup = true;
  console.log('[API Config] Event listeners setup complete');

  // Button event listeners are handled via onclick in the EJS template
}

// Initialize tabs functionality
function initializeTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  console.log(
    '[API Config] Initializing tabs, found',
    tabButtons.length,
    'tab buttons',
  );

  // Remove existing listeners by cloning and replacing
  tabButtons.forEach(button => {
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
  });

  // Re-query after cloning
  const freshTabButtons = document.querySelectorAll('.tab-btn');
  const freshTabPanes = document.querySelectorAll('.tab-pane');

  freshTabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-tab');
      console.log('[API Config] Tab clicked:', targetTab);

      // Update active tab button
      freshTabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      // Show corresponding tab pane
      let foundPane = false;
      freshTabPanes.forEach(pane => {
        const paneId = pane.getAttribute('data-pane');
        if (paneId === targetTab) {
          pane.classList.add('active');
          pane.style.display = 'block';
          foundPane = true;
          console.log('[API Config] Showing pane:', paneId);
        } else {
          pane.classList.remove('active');
          pane.style.display = 'none';
        }
      });

      if (!foundPane) {
        console.warn('[API Config] No pane found for tab:', targetTab);
      }
    });
  });
}

// Load feature fields for the left panel
async function loadFeatureFields() {
  try {
    // First, load the features-definition.json to get field definitions
    const featuresDefResponse = await fetch('/features-definition.json');
    if (!featuresDefResponse.ok) {
      throw new Error('Failed to load features definition');
    }
    const featuresDefinition = await featuresDefResponse.json();

    // Fetch feature mapping to get all fields
    const response = await fetch(
      `/api/integrations/${currentIntegrationId}/feature-mappings`,
    );
    if (!response.ok) {
      throw new Error('Failed to load feature mappings');
    }

    const result = await response.json();
    // Handle both array and object responses - check for featureMappings property
    const mappings = Array.isArray(result)
      ? result
      : result.featureMappings || result.mappings || [];
    const currentMapping = mappings.find(
      m => m.featureTemplateId === currentFeatureId,
    );

    if (!currentMapping) {
      console.warn(
        `Feature mapping not found for featureId: ${currentFeatureId}`,
      );
      // Show a helpful message instead of throwing error
      showToast(
        `Feature mapping not found. Please ensure the feature "${currentFeatureId}" is properly mapped.`,
        'error',
      );

      // Still show the form but with a warning
      featureFields = [
        {
          id: currentFieldId,
          type: currentFieldType,
          name: currentFieldId,
          hasConfig: false,
        },
      ];

      renderFieldsList();
      return;
    }

    // Extract API-type fields
    featureFields = [];

    // Get feature definition for current feature
    const featureDefinition = featuresDefinition.features?.[currentFeatureId];

    // Check ALL fields in the feature definition for type="api" and fillBy="Admin"
    // Not just the ones in fieldMappings
    if (featureDefinition?.fields) {
      Object.entries(featureDefinition.fields).forEach(
        ([fieldKey, fieldDef]) => {
          // Check if field has type="api" and fillBy="Admin"
          if (
            fieldDef &&
            fieldDef.type === 'api' &&
            fieldDef.fillBy === 'Admin'
          ) {
            featureFields.push({
              id: fieldKey,
              type: 'api',
              name: fieldDef.label || fieldKey,
              hasConfig: false, // Will be updated after loading API configs
            });
          }
        },
      );
    }

    // Add extra fields that have type: "api" and fillBy: "Admin"
    if (currentMapping.extraFields && currentMapping.extraFields.length > 0) {
      currentMapping.extraFields.forEach(field => {
        // Only include fields with type: "api" and fillBy: "Admin"
        if (field.type === 'api' && field.fillBy === 'Admin') {
          featureFields.push({
            id: field.fieldKey,
            type: 'api',
            fieldType: field.type,
            name: field.label || field.fieldKey,
            hasConfig: false, // Will be updated after loading API configs
          });
        }
      });
    }

    // Check which fields have API configurations
    await checkFieldConfigurations();

    // Render the fields list
    renderFieldsList();
  } catch (error) {
    console.error('Error loading feature fields:', error);
    showToast('Failed to load feature fields', 'error');
  }
}

// Check which fields have API configurations
async function checkFieldConfigurations() {
  try {
    const response = await fetch(
      `/api/integrations/${currentIntegrationId}/features/${currentFeatureId}/apis`,
    );
    if (response.ok) {
      const apis = await response.json();
      apis.forEach(api => {
        const field = featureFields.find(f => f.id === api.fieldId);
        if (field) {
          field.hasConfig = true;
          field.apiId = api.id;
        }
      });
    }
  } catch (error) {
    console.error('Error checking field configurations:', error);
  }
}

// Render fields list in the left panel
function renderFieldsList() {
  const listContainer = document.getElementById('fieldsList');
  const fieldsCount = document.getElementById('fieldsCount');

  if (!listContainer) return;

  fieldsCount.textContent = featureFields.length;

  if (featureFields.length === 0) {
    listContainer.innerHTML = `
            <div class="empty-state">
                <p>No fields found for this feature</p>
            </div>
        `;
    return;
  }

  let html = '';
  featureFields.forEach(field => {
    const isActive =
      field.id === currentFieldId && field.type === currentFieldType;
    html += `
            <div class="field-item ${
              isActive ? 'active' : ''
            }" onclick="selectField('${field.id}', '${field.type}')">
                <div class="field-item-header">
                    <span class="field-name">${field.name}</span>
                    ${
                      field.hasConfig
                        ? '<span class="field-status configured">Configured</span>'
                        : '<span class="field-status">Not Configured</span>'
                    }
                </div>
                <div class="field-item-type">API Field</div>
            </div>
        `;
  });

  listContainer.innerHTML = html;
}

// Select a field to configure
function selectField(fieldId, fieldType) {
  // Navigate to configure the selected field
  const params = new URLSearchParams(window.location.search);
  params.set('fieldId', fieldId);
  params.set('fieldType', fieldType);

  window.location.search = params.toString();
}

// Load API configuration for the current field
async function loadFieldApiConfig() {
  // Always clear canonical template before loading new config
  clearCanonicalTemplate();

  try {
    const response = await fetch(
      `/api/integrations/${currentIntegrationId}/features/${currentFeatureId}/fields/${currentFieldId}/api-config`,
    );

    if (response.ok) {
      currentApiConfig = await response.json();
      populateForm(currentApiConfig);
    } else if (response.status === 404) {
      // No configuration exists yet - show empty form
      console.log('No existing API configuration for this field');
      showEmptyForm();
    } else {
      throw new Error('Failed to load API configuration');
    }
  } catch (error) {
    console.error('Error loading API configuration:', error);
    showToast('Failed to load API configuration', 'error');
    showEmptyForm();
  }
}

// Show empty form for new configuration
function showEmptyForm() {
  // Set default API name
  currentApiName = `${currentFieldId} API`;
  if (document.getElementById('httpMethod')) {
    document.getElementById('httpMethod').value = 'GET';
  }
  if (document.getElementById('apiUrl')) {
    document.getElementById('apiUrl').value = '';
  }
  if (document.getElementById('bodyType')) {
    document.getElementById('bodyType').value = 'none';
  }

  // Clear headers and params
  if (document.getElementById('headersList')) {
    document.getElementById('headersList').innerHTML = '';
  }
  if (document.getElementById('queryParamsList')) {
    document.getElementById('queryParamsList').innerHTML = '';
  }

  // Hide body editors
  document.querySelectorAll('.body-editor').forEach(editor => {
    editor.style.display = 'none';
  });
}

// Populate form with existing API configuration
function populateForm(config) {
  // Store the API name in a variable for later use
  currentApiName = config.name || `${currentFieldId} API`;

  document.getElementById('httpMethod').value = config.method || 'GET';
  document.getElementById('apiUrl').value = config.url || '';

  // Populate headers
  if (config.headers && config.headers.length > 0) {
    const headersList = document.getElementById('headersList');
    if (headersList) {
      headersList.innerHTML = '';
      config.headers.forEach(header => {
        addKeyValueRow('headers', header.key, header.value);
      });
    }
  }

  // Populate query parameters
  if (config.queryParams && config.queryParams.length > 0) {
    const queryParamsList = document.getElementById('queryParamsList');
    if (queryParamsList) {
      queryParamsList.innerHTML = '';
      config.queryParams.forEach(param => {
        addKeyValueRow('params', param.key, param.value);
      });
    }
  }

  // Populate body
  const bodyType = config.bodyType || 'none';
  document.getElementById('bodyType').value = bodyType;
  switchBodyType(bodyType);

  if (config.body) {
    if (bodyType === 'json' && config.body.json) {
      // Check if config.body.json is already a string or an object
      let jsonValue = config.body.json;
      if (typeof jsonValue === 'string') {
        // If it's already a string, try to parse and re-stringify for formatting
        try {
          const parsed = JSON.parse(jsonValue);
          document.getElementById('jsonBody').value = JSON.stringify(
            parsed,
            null,
            2,
          );
        } catch (e) {
          // If parsing fails, use it as-is
          document.getElementById('jsonBody').value = jsonValue;
        }
      } else {
        // If it's an object, stringify it
        document.getElementById('jsonBody').value = JSON.stringify(
          jsonValue,
          null,
          2,
        );
      }
    } else if (bodyType === 'xml' && config.body.xml) {
      document.getElementById('xmlBody').value = config.body.xml;
    } else if (bodyType === 'form-data' && config.body.formData) {
      // Handle form-data
      const formDataTable = document.getElementById('formDataTable');
      formDataTable.innerHTML = '';
      config.body.formData.forEach(item => {
        addFormDataRow(item.key, item.value, item.type);
      });
    } else if (bodyType === 'x-www-form-urlencoded' && config.body.urlencoded) {
      // Handle urlencoded
      const urlencodedTable = document.getElementById('urlencodedTable');
      urlencodedTable.innerHTML = '';
      config.body.urlencoded.forEach(item => {
        addUrlencodedRow(item.key, item.value);
      });
    } else if (bodyType === 'raw' && config.body.raw) {
      document.getElementById('rawBody').value = config.body.raw;
    }
  }

  // Populate response configuration
  if (config.response) {
    document.getElementById('successPath').value =
      config.response.successPath || '';
    document.getElementById('errorPath').value =
      config.response.errorPath || '';

    // Populate dataFormat
    const dataFormatSelect = document.getElementById('dataFormat');
    if (dataFormatSelect && config.response.dataFormat) {
      dataFormatSelect.value = config.response.dataFormat;
    }

    // Populate canonical template if exists
    if (config.response.canonicalTemplate) {
      const ct = config.response.canonicalTemplate;
      const scopeSelect = document.getElementById('canonicalScope');
      const templateTextarea = document.getElementById('canonicalTemplate');

      if (scopeSelect && ct.scope) {
        scopeSelect.value = ct.scope;
        // Trigger change to load variables
        updateCanonicalPreview();
      }

      if (templateTextarea && ct.rawTemplate) {
        templateTextarea.value = ct.rawTemplate;
      }
    }
  }
}

// Clear canonical template fields - called before loading new config
function clearCanonicalTemplate() {
  const scopeSelect = document.getElementById('canonicalScope');
  const templateTextarea = document.getElementById('canonicalTemplate');

  if (scopeSelect) scopeSelect.value = '';
  if (templateTextarea) templateTextarea.value = '';
  updateCanonicalPreview();
}

// Handle form submission
async function handleFormSubmit(e) {
  e.preventDefault();

  const formData = collectFormData();

  if (!formData.name || !formData.url) {
    showToast('Please fill in required fields', 'error');
    return;
  }

  try {
    // Check if API is configured or not
    const isConfigured =
      currentApiConfig && currentApiConfig.configured !== false;
    const method = isConfigured ? 'PUT' : 'POST';

    console.log(
      '[API Config] Saving API:',
      method,
      isConfigured ? 'Update existing' : 'Create new',
    );

    const response = await fetch(
      `/api/integrations/${currentIntegrationId}/features/${currentFeatureId}/fields/${currentFieldId}/api-config`,
      {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      },
    );

    if (response.ok) {
      showToast('API configuration saved successfully', 'success');

      // Update currentApiConfig with saved data
      const savedApi = await response.json();
      currentApiConfig = { ...savedApi, configured: true };

      // Reload API tree in multi-API mode
      if (multiApiMode) {
        await initMultiApiMode();
      } else {
        // Reload in single-API mode
        await loadFeatureFields();
        await loadFieldApiConfig();
        if (allApis.length > 0 || document.getElementById('fieldsList')) {
          await loadApiTreeForSingleMode();
        }
      }

      // Update test button state
      updateTestButtonState();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save API configuration');
    }
  } catch (error) {
    console.error('Error saving API configuration:', error);
    showToast(error.message || 'Failed to save API configuration', 'error');
  }
}

// Collect form data
function collectFormData() {
  // Get canonical template data
  const canonicalData = getCanonicalTemplateData();

  const formData = {
    name: currentApiName || `${currentFieldId} API`,
    method: document.getElementById('httpMethod').value,
    url: document.getElementById('apiUrl').value,
    headers: collectKeyValueData('headersList'),
    queryParams: collectKeyValueData('queryParamsList'),
    bodyType: document.getElementById('bodyType').value,
    body: collectBodyData(),
    response: {
      successPath: document.getElementById('successPath').value,
      errorPath: document.getElementById('errorPath').value,
      dataFormat: document.getElementById('dataFormat')?.value || 'json',
      // Canonical template mapping
      canonicalTemplate: canonicalData
        ? {
            scope: canonicalData.scope,
            rawTemplate: canonicalData.rawTemplate,
            processedTemplate: canonicalData.processedTemplate,
            responseFormat: canonicalData.responseFormat,
          }
        : null,
    },
  };

  return formData;
}

// Collect key-value data from table
function collectKeyValueData(tableId) {
  const table = document.getElementById(tableId);
  const rows = table.querySelectorAll('.key-value-row');
  const data = [];

  rows.forEach(row => {
    const key = row.querySelector('.key-input').value;
    const value = row.querySelector('.value-input').value;
    if (key) {
      data.push({ key, value });
    }
  });

  return data;
}

// Collect body data based on type
function collectBodyData() {
  const bodyType = document.getElementById('bodyType').value;
  const body = {};

  switch (bodyType) {
    case 'json':
      const jsonValue = document.getElementById('jsonBody').value;
      if (jsonValue) {
        try {
          body.json = JSON.parse(jsonValue);
        } catch (e) {
          body.json = jsonValue; // Store as string if invalid JSON
        }
      }
      break;
    case 'xml':
      body.xml = document.getElementById('xmlBody').value;
      break;
    case 'form-data':
      body.formData = collectFormDataBody();
      break;
    case 'x-www-form-urlencoded':
      body.urlencoded = collectUrlencodedBody();
      break;
    case 'raw':
      body.raw = document.getElementById('rawBody').value;
      break;
  }

  return body;
}

// Collect form-data body
function collectFormDataBody() {
  const formDataList = document.getElementById('formDataList');
  if (!formDataList) return [];

  const rows = formDataList.querySelectorAll('.key-value-row');
  const data = [];

  rows.forEach(row => {
    const key = row.querySelector('.key-input').value;
    const value = row.querySelector('.value-input').value;
    if (key) {
      data.push({ key, value, type: 'text' }); // Default to text type
    }
  });

  return data;
}

// Collect URL-encoded body
function collectUrlencodedBody() {
  const urlencodedList = document.getElementById('urlencodedList');
  if (!urlencodedList) return [];

  const rows = urlencodedList.querySelectorAll('.key-value-row');
  const data = [];

  rows.forEach(row => {
    const key = row.querySelector('.key-input').value;
    const value = row.querySelector('.value-input').value;
    if (key) {
      data.push({ key, value });
    }
  });

  return data;
}

// Global functions called from EJS template
function addHeader() {
  addKeyValueRow('headers');
}

function addQueryParam() {
  addKeyValueRow('params');
}

// JSON validation and formatting functions
function validateJson() {
  const jsonBody = document.getElementById('jsonBody');
  if (!jsonBody) return;

  try {
    const jsonValue = jsonBody.value.trim();
    if (jsonValue) {
      JSON.parse(jsonValue);
      showToast('Valid JSON', 'success');
      jsonBody.style.borderColor = '#10b981';
      setTimeout(() => {
        jsonBody.style.borderColor = '#d1d5db';
      }, 2000);
    }
  } catch (error) {
    showToast('Invalid JSON: ' + error.message, 'error');
    jsonBody.style.borderColor = '#ef4444';
  }
}

function formatJson() {
  const jsonBody = document.getElementById('jsonBody');
  if (!jsonBody) return;

  try {
    const jsonValue = jsonBody.value.trim();
    if (jsonValue) {
      const parsed = JSON.parse(jsonValue);
      jsonBody.value = JSON.stringify(parsed, null, 2);
      showToast('JSON formatted', 'success');
    }
  } catch (error) {
    showToast('Cannot format invalid JSON', 'error');
  }
}

// XML validation and formatting functions
function validateXml() {
  const xmlBody = document.getElementById('xmlBody');
  if (!xmlBody) return;

  try {
    const xmlValue = xmlBody.value.trim();
    if (xmlValue) {
      // Basic XML validation using DOMParser
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlValue, 'text/xml');

      if (xmlDoc.documentElement.nodeName === 'parsererror') {
        throw new Error('Invalid XML structure');
      }

      showToast('Valid XML', 'success');
      xmlBody.style.borderColor = '#10b981';
      setTimeout(() => {
        xmlBody.style.borderColor = '#d1d5db';
      }, 2000);
    }
  } catch (error) {
    showToast('Invalid XML: ' + error.message, 'error');
    xmlBody.style.borderColor = '#ef4444';
  }
}

function formatXml() {
  const xmlBody = document.getElementById('xmlBody');
  if (!xmlBody) return;

  try {
    const xmlValue = xmlBody.value.trim();
    if (xmlValue) {
      // Basic XML formatting
      const formatted = xmlValue
        .replace(/></g, '>\n<')
        .replace(/(<[^/>]+>)/g, '\n$1')
        .replace(/(<\/[^>]+>)/g, '$1\n')
        .split('\n')
        .filter(line => line.trim())
        .map((line, index, arr) => {
          let indent = 0;
          for (let i = 0; i < index; i++) {
            if (arr[i].match(/^<[^/>][^>]*[^/]>$/)) indent++;
            if (arr[i].match(/^<\/[^>]+>$/)) indent--;
          }
          if (line.match(/^<\/[^>]+>$/)) indent--;
          return '  '.repeat(Math.max(0, indent)) + line;
        })
        .join('\n');

      xmlBody.value = formatted;
      showToast('XML formatted', 'success');
    }
  } catch (error) {
    showToast('Cannot format invalid XML', 'error');
  }
}

// Form-data and URL-encoded functions
function addFormData() {
  const formDataList = document.getElementById('formDataList');
  if (!formDataList) return;

  const row = document.createElement('div');
  row.className = 'key-value-row';
  row.innerHTML = `
        <input type="text" class="key-input" placeholder="Key">
        <input type="text" class="value-input" placeholder="Value">
        <button type="button" class="btn-remove" onclick="removeRow(this)">×</button>
    `;

  formDataList.appendChild(row);

  // Add focus listener to new inputs
  row.querySelectorAll('input').forEach(input => {
    input.addEventListener('focus', () => {
      currentFocusedInput = input;
    });
  });
}

function addUrlEncoded() {
  const urlencodedList = document.getElementById('urlencodedList');
  if (!urlencodedList) return;

  const row = document.createElement('div');
  row.className = 'key-value-row';
  row.innerHTML = `
        <input type="text" class="key-input" placeholder="Key">
        <input type="text" class="value-input" placeholder="Value">
        <button type="button" class="btn-remove" onclick="removeRow(this)">×</button>
    `;

  urlencodedList.appendChild(row);

  // Add focus listener to new inputs
  row.querySelectorAll('input').forEach(input => {
    input.addEventListener('focus', () => {
      currentFocusedInput = input;
    });
  });
}

function insertVariable(inputId) {
  const input = document.getElementById(inputId);
  if (input) {
    currentFocusedInput = input;
    showToast('Click on a variable to insert it', 'info');
  }
}

function cancelApiEdit() {
  // Go back to the integration detail page
  window.location.href = `/integration-detail?id=${currentIntegrationId}`;
}

async function deleteCurrentApi() {
  if (!currentApiConfig) {
    showToast('No API configuration to delete', 'error');
    return;
  }

  if (confirm('Are you sure you want to delete this API configuration?')) {
    try {
      const response = await fetch(
        `/api/integrations/${currentIntegrationId}/features/${currentFeatureId}/fields/${currentFieldId}/api-config`,
        {
          method: 'DELETE',
        },
      );

      if (response.ok) {
        showToast('API configuration deleted successfully', 'success');
        setTimeout(() => {
          window.location.href = `/integration-detail?id=${currentIntegrationId}`;
        }, 1500);
      } else {
        throw new Error('Failed to delete API configuration');
      }
    } catch (error) {
      console.error('Error deleting API configuration:', error);
      showToast('Failed to delete API configuration', 'error');
    }
  }
}

// Add key-value row
function addKeyValueRow(type, key = '', value = '') {
  const tableId = type === 'headers' ? 'headersList' : 'queryParamsList';
  const table = document.getElementById(tableId);

  const row = document.createElement('div');
  row.className = 'key-value-row';
  row.innerHTML = `
        <input type="text" class="key-input" placeholder="Key" value="${escapeHtml(
          key,
        )}">
        <input type="text" class="value-input" placeholder="Value" value="${escapeHtml(
          value,
        )}">
        <button type="button" class="btn-remove" onclick="removeRow(this)">×</button>
    `;

  table.appendChild(row);

  // Add focus listener to new inputs
  row.querySelectorAll('input').forEach(input => {
    input.addEventListener('focus', () => {
      currentFocusedInput = input;
    });
  });
}

// Remove a row
function removeRow(button) {
  button.closest('.key-value-row').remove();
}

// Switch body type
function switchBodyType(type) {
  console.log('[API Config] Switching body type to:', type);

  // Remove any existing empty state message
  const existingEmptyState = document.getElementById('bodyEmptyState');
  if (existingEmptyState) {
    existingEmptyState.remove();
  }

  // Hide all body editors
  document.querySelectorAll('.body-editor').forEach(editor => {
    editor.style.display = 'none';
  });

  // Show selected editor based on type
  if (type === 'none') {
    // Create and show empty state message for "none" type
    const bodyPane = document.querySelector('[data-pane="body"]');
    if (bodyPane) {
      const emptyState = document.createElement('div');
      emptyState.id = 'bodyEmptyState';
      emptyState.style.cssText =
        'padding: 40px 20px; text-align: center; color: #9CA3AF; font-size: 14px;';
      emptyState.innerHTML =
        '<div>No request body required for this API.<br>Change "Body Type" above if you need to send data.</div>';

      // Insert after body type selector
      const bodyTypeSelector =
        bodyPane.querySelector('#bodyType')?.parentElement?.parentElement;
      if (bodyTypeSelector && bodyTypeSelector.nextSibling) {
        bodyTypeSelector.parentElement.insertBefore(
          emptyState,
          bodyTypeSelector.nextSibling,
        );
      } else if (bodyPane.querySelector('.body-editor')) {
        bodyPane.insertBefore(
          emptyState,
          bodyPane.querySelector('.body-editor'),
        );
      }
    }
  } else {
    let editorId;
    switch (type) {
      case 'json':
        editorId = 'jsonEditor';
        break;
      case 'xml':
        editorId = 'xmlEditor';
        break;
      case 'form-data':
        editorId = 'formDataEditor';
        break;
      case 'x-www-form-urlencoded':
        editorId = 'urlencodedEditor';
        break;
      case 'raw':
        editorId = 'rawEditor';
        break;
      default:
        return;
    }

    const editor = document.getElementById(editorId);
    if (editor) {
      editor.style.display = 'block';
      console.log('[API Config] Showing editor:', editorId);
    } else {
      console.warn('[API Config] Editor not found:', editorId);
    }
  }
}

// Load available variables
async function loadAvailableVariables() {
  try {
    const response = await fetch(
      `/api/integrations/${currentIntegrationId}/available-variables?featureId=${currentFeatureId}`,
    );
    if (response.ok) {
      availableVariables = await response.json();
      renderVariables();
    }
  } catch (error) {
    console.error('Error loading variables:', error);
  }
}

// Render variables in the right panel
function renderVariables() {
  // Map API response keys to HTML element IDs
  const sectionMap = {
    featureFields: 'featureFields',
    authVariables: 'authVariables',
    additionalFields: 'additionalFields',
    extraFields: 'extraFields',
  };

  for (const [category, elementId] of Object.entries(sectionMap)) {
    const section = document.getElementById(elementId);
    if (section && availableVariables[category]) {
      section.innerHTML = renderVariableItems(availableVariables[category]);
    }
  }
}

// Render variable items
function renderVariableItems(variables) {
  if (!variables || variables.length === 0) {
    return '<div class="no-variables">No variables in this category</div>';
  }

  return variables
    .map(variable => {
      const varName =
        typeof variable === 'string' ? variable : variable._id || variable.name;
      const varDesc =
        typeof variable === 'object'
          ? variable.label || variable.description
          : '';

      return `
            <div class="variable-item" onclick="copyVariable('${varName}')">
                <span class="variable-name">{{${varName}}}</span>
                ${
                  varDesc ? `<span class="variable-desc">${varDesc}</span>` : ''
                }
                <button class="copy-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                </button>
            </div>
        `;
    })
    .join('');
}

// Toggle section visibility
function toggleSection(sectionId) {
  // If called with a string ID (from EJS onclick)
  if (typeof sectionId === 'string') {
    const content = document.getElementById(sectionId);
    const header = content?.previousElementSibling;
    const chevron = header?.querySelector('.chevron');

    if (content) {
      if (content.style.display === 'none' || !content.style.display) {
        content.style.display = 'block';
        if (chevron) chevron.style.transform = 'rotate(180deg)';
      } else {
        content.style.display = 'none';
        if (chevron) chevron.style.transform = 'rotate(0deg)';
      }
    }
  }
  // If called with an element (from renderVariables)
  else if (sectionId && sectionId.nodeType) {
    const header = sectionId;
    const content = header.nextElementSibling;
    const chevron = header.querySelector('.chevron');

    if (content.style.display === 'none') {
      content.style.display = 'block';
      chevron.style.transform = 'rotate(180deg)';
    } else {
      content.style.display = 'none';
      chevron.style.transform = 'rotate(0deg)';
    }
  }
}

// Copy variable to clipboard or insert into focused input
function copyVariable(varName) {
  const variable = `{{${varName}}}`;

  if (currentFocusedInput) {
    // Insert at cursor position
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
    // Copy to clipboard
    navigator.clipboard
      .writeText(variable)
      .then(() => {
        showToast('Variable copied to clipboard', 'success');
      })
      .catch(() => {
        showToast('Failed to copy variable', 'error');
      });
  }
}

// Filter variables based on search
function filterVariables() {
  const searchTerm = document
    .getElementById('variableSearch')
    .value.toLowerCase();
  const sections = document.querySelectorAll('.variable-section');

  sections.forEach(section => {
    const items = section.querySelectorAll('.variable-item');
    let hasVisibleItems = false;

    items.forEach(item => {
      const varName = item
        .querySelector('.variable-name')
        .textContent.toLowerCase();
      const varDesc =
        item.querySelector('.variable-desc')?.textContent.toLowerCase() || '';

      if (varName.includes(searchTerm) || varDesc.includes(searchTerm)) {
        item.style.display = 'flex';
        hasVisibleItems = true;
      } else {
        item.style.display = 'none';
      }
    });

    // Show/hide section based on whether it has visible items
    section.style.display = hasVisibleItems ? 'block' : 'none';

    // Expand section if searching and has matches
    if (searchTerm && hasVisibleItems) {
      const content = section.querySelector('.section-content');
      const chevron = section.querySelector('.chevron');
      content.style.display = 'block';
      chevron.style.transform = 'rotate(180deg)';
    }
  });
}

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getMethodColor(method) {
  const colors = {
    GET: '#10b981',
    POST: '#3b82f6',
    PUT: '#f59e0b',
    DELETE: '#ef4444',
    PATCH: '#8b5cf6',
  };
  return colors[method] || '#6b7280';
}

// Show toast message
function showToast(message, type = 'info') {
  const toastContainer =
    document.getElementById('toastContainer') || createToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toastContainer';
  container.className = 'toast-container';
  document.body.appendChild(container);
  return container;
}

// Test API Modal Functions
let users = [];
let selectedUserId = null;
let userConnections = [];
let selectedConnection = null;

// Check if API is saved and update test button state
function updateTestButtonState() {
  const testButton = document.getElementById('testApiBtn');
  if (!testButton) return;

  // Use global variables (works for both single and multi-API mode)
  const integrationId = currentIntegrationId;
  const featureId = currentFeatureId;
  const fieldId = currentFieldId;

  console.log(
    '[API Config] Checking test button state for:',
    integrationId,
    featureId,
    fieldId,
  );

  if (!integrationId || !featureId || !fieldId) {
    testButton.disabled = true;
    testButton.title = 'Save API configuration before testing';
    return;
  }

  fetch(
    `/api/integrations/${integrationId}/features/${featureId}/fields/${fieldId}/api-config`,
  )
    .then(response => {
      if (response.ok) {
        console.log('[API Config] Test button enabled - API is saved');
        testButton.disabled = false;
        testButton.title = 'Test API Configuration';
      } else {
        console.log('[API Config] Test button disabled - API not saved');
        testButton.disabled = true;
        testButton.title = 'Save API configuration before testing';
      }
    })
    .catch(() => {
      console.log('[API Config] Test button disabled - Error checking API');
      testButton.disabled = true;
      testButton.title = 'Save API configuration before testing';
    });
}

// Open test modal
async function testApi() {
  const urlParams = new URLSearchParams(window.location.search);
  const integrationId = urlParams.get('integrationId');
  const featureId = urlParams.get('featureId');
  const fieldId = urlParams.get('fieldId');

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

  // Load users first
  loadUsers();
}

// Load users for the dropdown
async function loadUsers() {
  const userSelect = document.getElementById('userSelect');
  const connectionSelect = document.getElementById('userConnectionSelect');

  try {
    const response = await fetch('/api/users');
    if (!response.ok) throw new Error('Failed to fetch users');

    const data = await response.json();
    console.log('API Response:', data); // Debug log
    users = data.users || [];
    console.log('Users array:', users); // Debug log

    // Populate the user dropdown
    userSelect.innerHTML = '<option value="">Select a user...</option>';
    users.forEach(user => {
      console.log('Processing user:', user); // Debug log
      const option = document.createElement('option');
      option.value = user.id;
      option.textContent = user.name || user.email || user.id;
      console.log(
        'Option value:',
        option.value,
        'Option text:',
        option.textContent,
      ); // Debug log
      userSelect.appendChild(option);
    });

    // Remove old event listener and add new one
    userSelect.removeEventListener('change', handleUserSelection);
    userSelect.addEventListener('change', handleUserSelection);

    // Reset connection dropdown
    connectionSelect.disabled = true;
    connectionSelect.innerHTML =
      '<option value="">Select a user first...</option>';
  } catch (error) {
    console.error('Error loading users:', error);
    userSelect.innerHTML = '<option value="">Error loading users</option>';
  }
}

// Handle user selection
async function handleUserSelection(event) {
  selectedUserId = event.target.value;
  console.log('User selected:', selectedUserId); // Debug log
  const connectionSelect = document.getElementById('userConnectionSelect');

  if (!selectedUserId) {
    // Reset connections if no user selected
    connectionSelect.disabled = true;
    connectionSelect.innerHTML =
      '<option value="">Select a user first...</option>';
    userConnections = [];
    selectedConnection = null;
    document.getElementById('connectionInfo').style.display = 'none';
    return;
  }

  // Enable and load connections for selected user
  connectionSelect.disabled = false;
  connectionSelect.innerHTML =
    '<option value="">Loading connections...</option>';
  loadUserConnections();
}

// Load user connections for the dropdown
async function loadUserConnections() {
  const urlParams = new URLSearchParams(window.location.search);
  const integrationId = urlParams.get('integrationId');
  const select = document.getElementById('userConnectionSelect');

  if (!selectedUserId) {
    console.error('No user selected');
    return;
  }

  try {
    const response = await fetch(
      `/api/integrations/${integrationId}/user-connections?userId=${selectedUserId}`,
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
  if (currentApiConfig.body) {
    if (typeof currentApiConfig.body === 'string') {
      const matches = currentApiConfig.body.matchAll(variablePattern);
      for (const match of matches) {
        variables.add(match[1].trim());
      }
    } else if (currentApiConfig.body.json) {
      // Extract from JSON body object
      const bodyStr = JSON.stringify(currentApiConfig.body.json);
      const matches = bodyStr.matchAll(variablePattern);
      for (const match of matches) {
        variables.add(match[1].trim());
      }
    }
  }

  // Also include all configured variables from the connection
  if (selectedConnection && selectedConnection.configuredVariables) {
    Object.keys(selectedConnection.configuredVariables).forEach(varName => {
      variables.add(varName);
    });
  }

  // Create input fields for variables
  const variableInputsDiv = document.getElementById('variableInputs');
  variableInputsDiv.innerHTML = '';

  if (variables.size > 0) {
    document.getElementById('variableValuesSection').style.display = 'block';

    variables.forEach(variable => {
      const inputGroup = document.createElement('div');
      inputGroup.className = 'variable-input-group';

      // Get the pre-configured value from the selected connection
      const configuredValue =
        selectedConnection?.configuredVariables?.[variable] || '';

      // Check if this is an auth-related variable
      const isAuthVariable = isAuthRelatedVariable(variable);

      if (isAuthVariable) {
        // Auth variable: read-only with lock icon
        inputGroup.innerHTML = `
                    <label for="var-${variable}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="12" height="12" style="margin-right: 4px; vertical-align: middle;">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                        {{${variable}}} <small style="color: #6b7280;">(from connection)</small>
                    </label>
                    <input type="text" id="var-${variable}" data-variable="${variable}" value="${configuredValue}" class="form-control" readonly style="background-color: #f3f4f6; cursor: not-allowed;">
                `;
      } else {
        // Feature variable: editable with appropriate input type
        const fieldInfo = getFieldInfo(variable);
        const inputType = fieldInfo?.htmlType || 'text';
        const fieldLabel = fieldInfo?.label || variable;

        // Build validation attributes
        let validationAttrs = '';
        if (fieldInfo?.required) {
          validationAttrs += ' required';
        }
        if (inputType === 'number') {
          validationAttrs += ' step="any"';
        }

        inputGroup.innerHTML = `
                    <label for="var-${variable}">{{${variable}}} ${
          fieldInfo?.fieldType
            ? `<small style="color: #6b7280;">(${fieldInfo.fieldType})</small>`
            : ''
        }</label>
                    <input type="${inputType}" id="var-${variable}" data-variable="${variable}" value="${configuredValue}" placeholder="Enter ${fieldLabel}" class="form-control"${validationAttrs}>
                `;
      }
      variableInputsDiv.appendChild(inputGroup);
    });
  } else {
    document.getElementById('variableValuesSection').style.display = 'none';
  }
}

// Helper function to check if variable is auth-related
function isAuthRelatedVariable(varName) {
  if (!availableVariables) return false;

  // Check authVariables
  if (availableVariables.authVariables) {
    const authVarNames = availableVariables.authVariables.map(v =>
      typeof v === 'string' ? v : v._id || v.name || v.key,
    );
    if (authVarNames.includes(varName)) return true;
  }

  // Check additionalFields (these come from auth schema)
  if (availableVariables.additionalFields) {
    const additionalVarNames = availableVariables.additionalFields.map(v =>
      typeof v === 'string' ? v : v._id || v.name || v.key,
    );
    if (additionalVarNames.includes(varName)) return true;
  }

  return false;
}

// Helper function to get field info (htmlType, fieldType, label, etc.)
function getFieldInfo(varName) {
  if (!availableVariables) return null;

  // Check extraFields first (most common for feature-specific variables)
  if (availableVariables.extraFields) {
    for (const field of availableVariables.extraFields) {
      const fieldKey =
        typeof field === 'string'
          ? field
          : field._id || field.name || field.key || field.fieldKey;
      if (fieldKey === varName) {
        return {
          htmlType: field.htmlType || 'text',
          fieldType: field.fieldType || field.type || 'string',
          label: field.label || varName,
          required: field.required || false,
          description: field.description || '',
        };
      }
    }
  }

  // Check featureFields
  if (availableVariables.featureFields) {
    for (const field of availableVariables.featureFields) {
      const fieldKey =
        typeof field === 'string'
          ? field
          : field._id || field.name || field.key || field.fieldKey;
      if (fieldKey === varName) {
        return {
          htmlType: field.htmlType || 'text',
          fieldType: field.fieldType || field.type || 'string',
          label: field.label || varName,
          required: field.required || false,
          description: field.description || '',
        };
      }
    }
  }

  return null;
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
  const urlParams = new URLSearchParams(window.location.search);
  const integrationId = urlParams.get('integrationId');
  const featureId = urlParams.get('featureId');
  const fieldId = urlParams.get('fieldId');

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
  // Results panel is always visible in split-pane layout

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
  document.getElementById('variableValuesSection').style.display = 'none';
  document.getElementById('connectionInfo').style.display = 'none';
  document.getElementById('userConnectionSelect').value = '';
  document.getElementById('responseBodyContent').textContent =
    'Execute a test to see the response...';
  document.getElementById('responseStatus').textContent = '';
  document.getElementById('responseTime').textContent = '';
  document.getElementById('responseSize').textContent = '';
  selectedConnection = null;
}

// ============================================
// Multi-API Mode Functions
// ============================================

// Load API tree for single-API mode (to show navigation)
async function loadApiTreeForSingleMode() {
  try {
    const response = await fetch(
      `/api/integrations/${currentIntegrationId}/all-apis`,
    );
    const data = await response.json();
    allApis = data.apis || [];
    renderApiTree();
  } catch (error) {
    console.error('Error loading API tree:', error);
  }
}

// Initialize multi-API mode
async function initMultiApiMode() {
  try {
    console.log('[API Config] Loading all APIs...');

    // Load all APIs for this integration
    const response = await fetch(
      `/api/integrations/${currentIntegrationId}/all-apis`,
    );
    const data = await response.json();
    allApis = data.apis || [];

    console.log('[API Config] Loaded', allApis.length, 'APIs');

    // Update integration link
    document.getElementById(
      'integrationLink',
    ).href = `/integration-detail/${currentIntegrationId}`;

    // Render API tree in left panel
    renderApiTree();

    // Set up event listeners for tabs and other interactions
    console.log('[API Config] Setting up event listeners...');
    setupEventListeners();

    // If we have APIs and one is specified in URL, select it
    const urlParams = new URLSearchParams(window.location.search);
    const selectedFeature = urlParams.get('featureId');
    const selectedField = urlParams.get('fieldId');

    if (selectedFeature && selectedField && allApis.length > 0) {
      const api = allApis.find(
        a => a.featureId === selectedFeature && a.fieldId === selectedField,
      );
      if (api) {
        console.log(
          '[API Config] Selecting API from URL:',
          selectedFeature,
          selectedField,
        );
        await selectApi(api);
      } else if (allApis.length > 0) {
        // Select first API
        console.log('[API Config] API not found, selecting first API');
        await selectApi(allApis[0]);
      }
    } else if (allApis.length > 0) {
      // Select first API by default
      console.log('[API Config] Selecting first API by default');
      await selectApi(allApis[0]);
    } else {
      showToast('No APIs configured for this integration', 'info');
    }

    // Initialize variable highlighting
    console.log('[API Config] Initializing variable highlighting...');
    initializeVariableHighlighting();

    console.log('[API Config] Multi-API mode initialization complete!');
  } catch (error) {
    console.error('Error initializing multi-API mode:', error);
    showToast('Failed to load APIs', 'error');
  }
}

// Render API tree in left panel
function renderApiTree() {
  const container = document.getElementById('fieldsList');
  if (!container) {
    console.error('fieldsList container not found');
    return;
  }

  // Also update the count
  const countEl = document.getElementById('fieldsCount');
  if (countEl) countEl.textContent = allApis.length;

  if (allApis.length === 0) {
    container.innerHTML =
      '<div style="padding: 20px; color: #6b7280; text-align: center;">No APIs configured</div>';
    return;
  }

  // Group APIs by feature
  const featureGroups = {};
  allApis.forEach(api => {
    if (!featureGroups[api.featureId]) {
      featureGroups[api.featureId] = {
        featureName: api.featureName,
        apis: [],
      };
    }
    featureGroups[api.featureId].apis.push(api);
  });

  // Build tree HTML
  let html = '';
  Object.entries(featureGroups).forEach(([featureId, group]) => {
    html += `
            <div class="feature-group" style="margin-bottom: 16px;">
                <div style="font-weight: 600; color: #374151; margin-bottom: 8px; font-size: 13px;">
                    ${group.featureName}
                </div>
                ${group.apis
                  .map((api, idx) => {
                    const apiIndex = allApis.findIndex(
                      a =>
                        a.featureId === api.featureId &&
                        a.fieldId === api.fieldId,
                    );
                    const isActive =
                      currentFeatureId === api.featureId &&
                      currentFieldId === api.fieldId;
                    const isConfigured = api.configured !== false;
                    const urlDisplay = api.url
                      ? `${api.method} ${api.url.substring(0, 40)}...`
                      : 'Not configured yet';
                    const statusBadge = !isConfigured
                      ? '<span style="font-size: 10px; padding: 2px 6px; background: #FEF3C7; color: #92400E; border-radius: 4px; margin-left: 6px;">NEW</span>'
                      : '';
                    const fieldDisplayName = api.fieldLabel
                      ? `${api.fieldLabel} (${api.fieldId})`
                      : api.fieldId;
                    return `
                    <div class="api-item ${isActive ? 'active' : ''}"
                         data-api-index="${apiIndex}"
                         style="padding: 8px 12px; cursor: pointer; border-radius: 4px; margin-bottom: 4px; background: ${
                           isActive ? '#EEF2FF' : 'transparent'
                         };">
                        <div style="font-size: 13px; color: #111827; display: flex; align-items: center;">
                            ${fieldDisplayName}
                            ${statusBadge}
                        </div>
                        <div style="font-size: 11px; color: ${
                          isConfigured ? '#6b7280' : '#9CA3AF'
                        };">${urlDisplay}</div>
                    </div>
                `;
                  })
                  .join('')}
            </div>
        `;
  });

  container.innerHTML = html;

  // Add click listeners
  container.querySelectorAll('.api-item').forEach(item => {
    item.addEventListener('click', () => {
      const index = parseInt(item.getAttribute('data-api-index'));
      selectApiByIndex(index);
    });
  });
}

// Select API by index (helper for click handlers)
function selectApiByIndex(index) {
  if (index >= 0 && index < allApis.length) {
    selectApi(allApis[index]);
  }
}

// Select an API from the tree
async function selectApi(api) {
  console.log('[API Config] Selecting API:', api.featureId, api.fieldId);

  // Update current selection
  currentFeatureId = api.featureId;
  currentFieldId = api.fieldId;
  currentApiConfig = api;

  // Update URL without reload
  const url = new URL(window.location);
  url.searchParams.set('featureId', api.featureId);
  url.searchParams.set('fieldId', api.fieldId);
  window.history.pushState({}, '', url);

  // Update UI
  document.getElementById(
    'featureDisplayName',
  ).textContent = `${api.featureName} / ${api.fieldId}`;
  document.getElementById('featureName').textContent = api.featureName;

  // Load API configuration into form
  await loadApiConfigurationIntoForm(api);

  // Load available variables for this feature
  console.log(
    '[API Config] Loading available variables for feature:',
    currentFeatureId,
  );
  await loadAvailableVariables();

  // Re-render tree to update active state
  renderApiTree();

  // Check for variables in the current config
  checkAndShowVariableInputs();

  // Update test button state (check if this API is already saved)
  updateTestButtonState();

  console.log('[API Config] API selection complete');
}

// Load API configuration into form
async function loadApiConfigurationIntoForm(config) {
  // Clear canonical template FIRST before loading new config
  clearCanonicalTemplate();

  console.log(
    '[API Config] Loading API configuration into form:',
    config.featureId,
    config.fieldId,
  );
  console.log(
    '[API Config] Config details - Method:',
    config.method,
    'Body Type:',
    config.bodyType,
    'URL:',
    config.url?.substring(0, 50),
  );

  // Populate form fields with null checks
  const methodEl = document.getElementById('httpMethod');
  const urlEl = document.getElementById('apiUrl');

  if (methodEl) {
    methodEl.value = config.method || 'GET';
    console.log('[API Config] Set method to:', methodEl.value);
  }
  if (urlEl) {
    urlEl.value = config.url || '';
    console.log('[API Config] Set URL to:', urlEl.value?.substring(0, 50));
  }

  // Clear and load headers
  const headersList = document.getElementById('headersList');
  if (headersList) {
    headersList.innerHTML = '';
    console.log(
      '[API Config] Loading headers, count:',
      config.headers?.length || 0,
    );
    if (config.headers && config.headers.length > 0) {
      config.headers.forEach(header => {
        console.log(
          '[API Config] Adding header:',
          header.key,
          '=',
          header.value,
        );
        addKeyValueRow('headers', header.key, header.value);
      });
    } else {
      console.log('[API Config] No headers to load');
      // Show empty state message
      headersList.innerHTML =
        '<div style="padding: 20px; text-align: center; color: #9CA3AF; font-size: 14px;">No headers configured. Click "Add Header" to add one.</div>';
    }
  } else {
    console.warn('[API Config] headersList element not found!');
  }

  // Clear and load query params
  const queryParamsList = document.getElementById('queryParamsList');
  if (queryParamsList) {
    queryParamsList.innerHTML = '';
    console.log(
      '[API Config] Loading query params, count:',
      config.queryParams?.length || 0,
    );
    if (config.queryParams && config.queryParams.length > 0) {
      config.queryParams.forEach(param => {
        console.log('[API Config] Adding param:', param.key, '=', param.value);
        addKeyValueRow('params', param.key, param.value);
      });
    } else {
      console.log('[API Config] No query params to load');
      // Show empty state message
      queryParamsList.innerHTML =
        '<div style="padding: 20px; text-align: center; color: #9CA3AF; font-size: 14px;">No query parameters configured. Click "Add Parameter" to add one.</div>';
    }
  } else {
    console.warn('[API Config] queryParamsList element not found!');
  }

  // Clear all body sections first
  const jsonBodyEl = document.getElementById('jsonBody');
  const xmlBodyEl = document.getElementById('xmlBody');
  const rawBodyEl = document.getElementById('rawBody');
  const formDataTable = document.getElementById('formDataTable');
  const urlencodedTable = document.getElementById('urlencodedTable');

  if (jsonBodyEl) jsonBodyEl.value = '';
  if (xmlBodyEl) xmlBodyEl.value = '';
  if (rawBodyEl) rawBodyEl.value = '';
  if (formDataTable) formDataTable.innerHTML = '';
  if (urlencodedTable) urlencodedTable.innerHTML = '';

  // Load body type and content
  const bodyType = config.bodyType || 'none';
  console.log('[API Config] Body type:', bodyType);

  const bodyTypeEl = document.getElementById('bodyType');
  if (bodyTypeEl) {
    bodyTypeEl.value = bodyType;
    // Trigger switchBodyType to show/hide appropriate body section
    switchBodyType(bodyType);
  }

  // Load body content based on type
  if (config.body) {
    if (bodyType === 'json' && config.body.json) {
      const jsonBodyEl = document.getElementById('jsonBody');
      if (jsonBodyEl) {
        // Check if config.body.json is already a string or an object
        let jsonValue = config.body.json;
        if (typeof jsonValue === 'string') {
          try {
            const parsed = JSON.parse(jsonValue);
            jsonBodyEl.value = JSON.stringify(parsed, null, 2);
          } catch (e) {
            jsonBodyEl.value = jsonValue;
          }
        } else {
          jsonBodyEl.value = JSON.stringify(jsonValue, null, 2);
        }
      }
    } else if (bodyType === 'xml' && config.body.xml) {
      const xmlBodyEl = document.getElementById('xmlBody');
      if (xmlBodyEl) xmlBodyEl.value = config.body.xml;
    } else if (bodyType === 'form-data' && config.body.formData) {
      const formDataTable = document.getElementById('formDataTable');
      if (formDataTable) {
        formDataTable.innerHTML = '';
        config.body.formData.forEach(item => {
          addFormDataRow(item.key, item.value, item.type);
        });
      }
    } else if (bodyType === 'x-www-form-urlencoded' && config.body.urlencoded) {
      const urlencodedTable = document.getElementById('urlencodedTable');
      if (urlencodedTable) {
        urlencodedTable.innerHTML = '';
        config.body.urlencoded.forEach(item => {
          addUrlencodedRow(item.key, item.value);
        });
      }
    } else if (bodyType === 'raw' && config.body.raw) {
      const rawBodyEl = document.getElementById('rawBody');
      if (rawBodyEl) rawBodyEl.value = config.body.raw;
    }
  }

  // Load response configuration
  if (config.response) {
    const successPathEl = document.getElementById('successPath');
    const errorPathEl = document.getElementById('errorPath');
    const dataFormatEl = document.getElementById('dataFormat');

    if (successPathEl) successPathEl.value = config.response.successPath || '';
    if (errorPathEl) errorPathEl.value = config.response.errorPath || '';
    if (dataFormatEl && config.response.dataFormat) {
      dataFormatEl.value = config.response.dataFormat;
    }

    // Load canonical template if exists
    if (config.response.canonicalTemplate) {
      const ct = config.response.canonicalTemplate;
      const scopeSelect = document.getElementById('canonicalScope');
      const templateTextarea = document.getElementById('canonicalTemplate');

      if (scopeSelect && ct.scope) {
        scopeSelect.value = ct.scope;
        updateCanonicalPreview();
      }

      if (templateTextarea && ct.rawTemplate) {
        templateTextarea.value = ct.rawTemplate;
      }
    }
  }

  // Re-initialize variable highlighting for newly populated fields
  // Wait a bit for DOM to update
  setTimeout(() => {
    // Initialize highlighting for any new fields
    initializeVariableHighlighting();
    // Refresh existing overlays with new values
    refreshAllHighlightOverlays();
  }, 100);
}

// Format bytes to human readable
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Note: updateTestButtonState is now called in initializePage and selectApi functions
// Also update test button state after saving API
const originalHandleFormSubmit = window.handleFormSubmit;
if (originalHandleFormSubmit) {
  window.handleFormSubmit = async function (e) {
    const result = await originalHandleFormSubmit.call(this, e);
    updateTestButtonState();
    return result;
  };
}

// ============================================================================
// Variable Highlighting System
// ============================================================================

/**
 * Parse text and highlight variables in {{...}} format
 * @param {string} text - The text to parse
 * @returns {string} - HTML string with highlighted variables
 */
function highlightVariables(text) {
  if (!text) return '';

  // Regex to match {{variableName}} patterns
  const variableRegex = /\{\{([^}]+)\}\}/g;

  // Replace variables with highlighted spans
  const highlighted = text.replace(variableRegex, (match, variableName) => {
    return `<span class="variable-token">${match}</span>`;
  });

  return highlighted;
}

/**
 * Create or update highlight overlay for an input/textarea element
 * @param {HTMLElement} element - The input or textarea element
 */
function createHighlightOverlay(element) {
  if (!element) return;

  const isTextarea = element.tagName === 'TEXTAREA';
  const value = element.value || '';

  // Find or create wrapper
  let wrapper = element.parentElement;
  if (!wrapper.classList.contains('variable-highlight-wrapper')) {
    wrapper = document.createElement('div');
    wrapper.className = isTextarea
      ? 'textarea-highlight-wrapper variable-highlight-wrapper'
      : 'input-highlight-wrapper variable-highlight-wrapper';
    element.parentNode.insertBefore(wrapper, element);
    wrapper.appendChild(element);
  }

  // Find or create overlay
  let overlay = wrapper.querySelector('.variable-highlight-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'variable-highlight-overlay';
    wrapper.insertBefore(overlay, element);
  }

  // Copy computed styles from element to overlay for perfect alignment
  const computedStyle = window.getComputedStyle(element);
  const stylesToCopy = [
    'font-family',
    'font-size',
    'font-weight',
    'font-style',
    'line-height',
    'letter-spacing',
    'word-spacing',
    'text-align',
    'text-indent',
    'text-transform',
    'white-space',
    'word-wrap',
    'word-break',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'border-top-width',
    'border-right-width',
    'border-bottom-width',
    'border-left-width',
  ];

  stylesToCopy.forEach(style => {
    overlay.style[style] = computedStyle[style];
  });

  // Set overlay color to match the original element's color (before we made it transparent)
  // Get the color from parent or use default
  const parentColor = window.getComputedStyle(element.parentElement).color;
  overlay.style.color = parentColor || '#111827';

  // Add class to element to mark it as having highlight
  element.classList.add('has-highlight');

  // Sync scroll position for textareas
  if (isTextarea && !element.dataset.scrollSyncSetup) {
    element.dataset.scrollSyncSetup = 'true';
    element.addEventListener('scroll', () => {
      if (overlay) {
        overlay.scrollTop = element.scrollTop;
        overlay.scrollLeft = element.scrollLeft;
      }
    });
  }

  return overlay;
}

/**
 * Update highlight overlay when element value changes
 * @param {HTMLElement} element - The input or textarea element
 */
function updateHighlightOverlay(element) {
  const wrapper = element.closest('.variable-highlight-wrapper');
  if (!wrapper) {
    createHighlightOverlay(element);
    return;
  }

  const overlay = wrapper.querySelector('.variable-highlight-overlay');
  if (!overlay) {
    createHighlightOverlay(element);
    return;
  }

  const value = element.value || '';

  // Create highlighted content
  const parts = [];
  let lastIndex = 0;
  const variableRegex = /\{\{([^}]+)\}\}/g;
  let match;

  while ((match = variableRegex.exec(value)) !== null) {
    // Add text before variable (normal color)
    if (match.index > lastIndex) {
      const beforeText = value.substring(lastIndex, match.index);
      parts.push(escapeHtml(beforeText));
    }

    // Add variable (highlighted)
    parts.push(`<span class="variable-token">${escapeHtml(match[0])}</span>`);

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text (normal color)
  if (lastIndex < value.length) {
    const remainingText = value.substring(lastIndex);
    parts.push(escapeHtml(remainingText));
  }

  overlay.innerHTML = parts.join('');

  // Sync scroll position
  if (element.tagName === 'TEXTAREA') {
    overlay.scrollTop = element.scrollTop;
    overlay.scrollLeft = element.scrollLeft;
  }

  // Show overlay when not focused
  if (document.activeElement !== element) {
    overlay.classList.add('active');
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Setup variable highlighting for an input or textarea element
 * @param {HTMLElement} element - The input or textarea element
 */
function setupVariableHighlighting(element) {
  if (!element || element.dataset.highlightingSetup === 'true') return;

  // Mark as setup to avoid duplicate listeners
  element.dataset.highlightingSetup = 'true';

  // Create initial overlay
  createHighlightOverlay(element);

  // Show overlay on blur (when user leaves field)
  element.addEventListener('blur', () => {
    updateHighlightOverlay(element);
    const wrapper = element.closest('.variable-highlight-wrapper');
    if (wrapper) {
      const overlay = wrapper.querySelector('.variable-highlight-overlay');
      if (overlay) {
        overlay.classList.add('active');
      }
    }
  });

  // Hide overlay on focus (when user enters field)
  element.addEventListener('focus', () => {
    const wrapper = element.closest('.variable-highlight-wrapper');
    if (wrapper) {
      const overlay = wrapper.querySelector('.variable-highlight-overlay');
      if (overlay) {
        overlay.classList.remove('active');
      }
    }
  });

  // Update overlay as user types (but don't show it while focused)
  element.addEventListener('input', () => {
    updateHighlightOverlay(element);
  });

  // Initial update
  updateHighlightOverlay(element);
}

/**
 * Refresh all existing highlight overlays with current values
 * This is useful when values change programmatically (e.g., when switching APIs)
 */
function refreshAllHighlightOverlays() {
  console.log('[Variable Highlighting] Refreshing all overlays...');

  // Find all elements that have highlighting setup
  const highlightedElements = document.querySelectorAll('.has-highlight');

  console.log(
    '[Variable Highlighting] Found',
    highlightedElements.length,
    'highlighted elements',
  );

  highlightedElements.forEach(element => {
    updateHighlightOverlay(element);
  });

  console.log('[Variable Highlighting] Refresh complete');
}

/**
 * Initialize variable highlighting for all relevant fields on the page
 */
function initializeVariableHighlighting() {
  console.log('[Variable Highlighting] Initializing...');

  // Input fields
  const apiUrlInput = document.getElementById('apiUrl');
  const successPathInput = document.getElementById('successPath');
  const errorPathInput = document.getElementById('errorPath');

  if (apiUrlInput) setupVariableHighlighting(apiUrlInput);
  if (successPathInput) setupVariableHighlighting(successPathInput);
  if (errorPathInput) setupVariableHighlighting(errorPathInput);

  // Textarea fields
  const jsonBodyTextarea = document.getElementById('jsonBody');
  const xmlBodyTextarea = document.getElementById('xmlBody');
  const rawBodyTextarea = document.getElementById('rawBody');

  if (jsonBodyTextarea) setupVariableHighlighting(jsonBodyTextarea);
  if (xmlBodyTextarea) setupVariableHighlighting(xmlBodyTextarea);
  if (rawBodyTextarea) setupVariableHighlighting(rawBodyTextarea);

  // Setup for dynamically added fields (headers, params, form data, etc.)
  setupDynamicFieldHighlighting();

  console.log('[Variable Highlighting] Initialization complete');
}

/**
 * Setup highlighting for dynamically added key-value fields
 */
function setupDynamicFieldHighlighting() {
  // Monitor for new fields being added
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) {
          // Element node
          // Find input fields in the added node
          const inputs = node.querySelectorAll
            ? node.querySelectorAll('input[type="text"], textarea')
            : [];
          inputs.forEach(input => {
            if (!input.dataset.highlightingSetup) {
              setupVariableHighlighting(input);
            }
          });

          // Check if the node itself is an input
          if (
            (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') &&
            !node.dataset.highlightingSetup
          ) {
            setupVariableHighlighting(node);
          }
        }
      });
    });
  });

  // Observe the containers where dynamic fields are added
  const containers = [
    document.getElementById('headersList'),
    document.getElementById('queryParamsList'),
    document.getElementById('formDataList'),
    document.getElementById('urlencodedList'),
  ];

  containers.forEach(container => {
    if (container) {
      observer.observe(container, {
        childList: true,
        subtree: true,
      });
    }
  });
}

// =====================================================
// CANONICAL TEMPLATE FUNCTIONS
// =====================================================

// Store loaded scopes
let canonicalScopes = [];

// Load canonical scopes for the dropdown
async function loadCanonicalScopes() {
  try {
    console.log('loadCanonicalScopes called');
    const response = await fetch('/api/canonical/scopes');
    const data = await response.json();

    if (response.ok && data.scopes) {
      canonicalScopes = data.scopes;
      const scopeSelect = document.getElementById('canonicalScope');
      if (scopeSelect) {
        scopeSelect.innerHTML = '<option value="">Select a scope...</option>';
        data.scopes.forEach(scope => {
          const option = document.createElement('option');
          option.value = scope.id;
          option.textContent = scope.label;
          scopeSelect.appendChild(option);
        });
      }
    }
  } catch (error) {
    console.error('Error loading canonical scopes:', error);
  }
}

// Update the available variables preview when scope changes
function updateCanonicalPreview() {
  console.log('updateCanonicalPreview called');
  const scopeSelect = document.getElementById('canonicalScope');
  const variablesList = document.getElementById('canonicalVariablesList');

  if (!scopeSelect || !variablesList) return;

  const selectedScopeId = scopeSelect.value;

  if (!selectedScopeId) {
    variablesList.innerHTML =
      '<p class="help-text">Select a scope to see available variables</p>';
    return;
  }

  const scope = canonicalScopes.find(s => s.id === selectedScopeId);
  if (!scope || !scope.variables || scope.variables.length === 0) {
    variablesList.innerHTML =
      '<p class="help-text">No variables defined for this scope</p>';
    return;
  }

  // Display variables as clickable chips
  variablesList.innerHTML = scope.variables
    .map(
      v => `
    <span class="canonical-variable-chip" 
          onclick="insertVariableAtCursor('{{canonical.${scope.id}.${v.id}}}')"
          title="${v.description || v.label}">
      {{canonical.${scope.id}.${v.id}}}
    </span>
  `,
    )
    .join('');
}

// Insert variable at cursor position in textarea
function insertVariableAtCursor(variable) {
  const textarea = document.getElementById('canonicalTemplate');
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;

  textarea.value = text.substring(0, start) + variable + text.substring(end);
  textarea.focus();
  textarea.selectionStart = textarea.selectionEnd = start + variable.length;
}

// Show modal to select and insert canonical variable
function insertCanonicalVariable() {
  const scopeSelect = document.getElementById('canonicalScope');
  if (!scopeSelect || !scopeSelect.value) {
    showToast('Please select a scope first', 'error');
    return;
  }

  const scope = canonicalScopes.find(s => s.id === scopeSelect.value);
  if (!scope || !scope.variables || scope.variables.length === 0) {
    showToast('No variables available for this scope', 'error');
    return;
  }

  // Create a simple dropdown for variable selection
  const variable = prompt(
    `Available variables for ${scope.label}:\n\n` +
      scope.variables.map(v => `• ${v.id} (${v.label})`).join('\n') +
      '\n\nEnter variable ID to insert:',
  );

  if (variable) {
    const foundVar = scope.variables.find(v => v.id === variable.trim());
    if (foundVar) {
      insertVariableAtCursor(`{{canonical.${scope.id}.${foundVar.id}}}`);
    } else {
      showToast('Variable not found', 'error');
    }
  }
}

// Format the canonical template JSON
function formatCanonicalTemplate() {
  const textarea = document.getElementById('canonicalTemplate');
  if (!textarea) return;

  try {
    const value = textarea.value.trim();
    if (value) {
      // Replace canonical variables with placeholders for JSON parsing
      const placeholders = {};
      let counter = 0;
      const withPlaceholders = value.replace(
        /\{\{canonical\.[^}]+\}\}/g,
        match => {
          const placeholder = `"__CANONICAL_PLACEHOLDER_${counter}__"`;
          placeholders[placeholder] = match;
          counter++;
          return placeholder;
        },
      );

      // Parse and format
      const parsed = JSON.parse(withPlaceholders);
      let formatted = JSON.stringify(parsed, null, 2);

      // Replace placeholders back with canonical variables
      Object.entries(placeholders).forEach(([placeholder, original]) => {
        formatted = formatted.replace(placeholder, original);
      });

      textarea.value = formatted;
      showToast('Template formatted', 'success');
    }
  } catch (error) {
    showToast('Cannot format: ' + error.message, 'error');
  }
}

// Validate the canonical template
function validateCanonicalTemplate() {
  const textarea = document.getElementById('canonicalTemplate');
  if (!textarea) return;

  const value = textarea.value.trim();
  if (!value) {
    showToast('Template is empty', 'error');
    return;
  }

  // Check for canonical variable syntax
  const canonicalVars =
    value.match(/\{\{canonical\.([^.]+)\.([^}]+)\}\}/g) || [];

  if (canonicalVars.length === 0) {
    showToast('No canonical variables found in template', 'warning');
    return;
  }

  // Validate each variable against its OWN scope (from the variable, not dropdown)
  let invalidVars = [];
  canonicalVars.forEach(v => {
    const match = v.match(/\{\{canonical\.([^.]+)\.([^}]+)\}\}/);
    if (match) {
      const [, scopeId, varId] = match;

      // Find the scope that matches the scopeId in the variable
      const variableScope = canonicalScopes.find(s => s.id === scopeId);

      if (!variableScope) {
        // Scope doesn't exist
        invalidVars.push(`${v} (scope "${scopeId}" not found)`);
      } else if (!variableScope.variables.find(sv => sv.id === varId)) {
        // Variable doesn't exist in that scope
        invalidVars.push(
          `${v} (variable "${varId}" not found in "${scopeId}")`,
        );
      }
    }
  });

  if (invalidVars.length > 0) {
    showToast(`Invalid variables: ${invalidVars.join(', ')}`, 'error');
    textarea.style.borderColor = '#ef4444';
  } else {
    showToast(
      `Valid template with ${canonicalVars.length} canonical variables`,
      'success',
    );
    textarea.style.borderColor = '#10b981';
    setTimeout(() => {
      textarea.style.borderColor = '#d1d5db';
    }, 2000);
  }
}

// Flatten nested JSON to dot notation for storage
function flattenCanonicalTemplate(template) {
  try {
    // Replace canonical variables with placeholders for JSON parsing
    // The placeholder replaces the entire template variable including quotes
    const placeholders = {};
    let counter = 0;
    const withPlaceholders = template.replace(
      /\{\{canonical\.[^}]+\}\}/g,
      match => {
        const placeholder = `__CANONICAL_${counter}__`;
        placeholders[placeholder] = match;
        counter++;
        return placeholder;
      },
    );

    const parsed = JSON.parse(withPlaceholders);
    const flattened = {};

    function flatten(obj, prefix = '') {
      for (const [key, value] of Object.entries(obj)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        if (
          typeof value === 'object' &&
          value !== null &&
          !Array.isArray(value)
        ) {
          flatten(value, newKey);
        } else {
          // Replace placeholder back with canonical variable
          if (typeof value === 'string' && value.includes('__CANONICAL_')) {
            flattened[newKey] = placeholders[value] || value;
          } else {
            flattened[newKey] = value;
          }
        }
      }
    }

    flatten(parsed);
    return flattened;
  } catch (error) {
    console.error('Error flattening template:', error);
    return null;
  }
}

// Get canonical template data for saving
function getCanonicalTemplateData() {
  const scopeSelect = document.getElementById('canonicalScope');
  const templateTextarea = document.getElementById('canonicalTemplate');
  const dataFormatSelect = document.getElementById('dataFormat');

  if (!templateTextarea || !templateTextarea.value.trim()) {
    return null;
  }

  const responseFormat = dataFormatSelect?.value || 'json';
  const rawTemplate = templateTextarea.value.trim();

  // Process template based on response format
  let processedTemplate = rawTemplate;

  if (responseFormat === 'json') {
    // Flatten JSON to dot notation
    const flattened = flattenCanonicalTemplate(rawTemplate);
    if (flattened) {
      processedTemplate = flattened;
    }
  } else if (responseFormat === 'xml') {
    // Process XML to XPath notation
    const xpathMappings = processXmlTemplate(rawTemplate);
    if (xpathMappings) {
      processedTemplate = xpathMappings;
    }
  }
  // For Text/HTML, store rawTemplate as-is

  return {
    scope: scopeSelect?.value || '',
    rawTemplate: rawTemplate,
    processedTemplate: processedTemplate,
    responseFormat: responseFormat,
  };
}

// Process XML template to XPath mappings
function processXmlTemplate(template) {
  try {
    // Extract all canonical variables and their XPath positions
    const mappings = {};
    const canonicalPattern = /\{\{canonical\.[^}]+\}\}/g;

    // Parse XML to DOM
    const parser = new DOMParser();
    // Replace canonical vars with placeholders to make valid XML
    let counter = 0;
    const placeholders = {};
    const xmlWithPlaceholders = template.replace(canonicalPattern, match => {
      const placeholder = `__CANONICAL_${counter}__`;
      placeholders[placeholder] = match;
      counter++;
      return placeholder;
    });

    const xmlDoc = parser.parseFromString(xmlWithPlaceholders, 'text/xml');

    // Check for parse errors
    if (xmlDoc.documentElement.nodeName === 'parsererror') {
      console.error('XML parse error');
      return null;
    }

    // Traverse XML and build XPath mappings
    function traverse(node, path) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const nodePath = path
          ? `${path}/${node.nodeName}`
          : `/${node.nodeName}`;

        // Check attributes for placeholders
        if (node.attributes) {
          for (let i = 0; i < node.attributes.length; i++) {
            const attr = node.attributes[i];
            if (attr.value.includes('__CANONICAL_')) {
              const xpath = `${nodePath}/@${attr.name}`;
              mappings[xpath] = placeholders[attr.value] || attr.value;
            }
          }
        }

        // Check text content (direct child text nodes only)
        for (let child of node.childNodes) {
          if (child.nodeType === Node.TEXT_NODE) {
            const text = child.textContent.trim();
            if (text.includes('__CANONICAL_')) {
              mappings[nodePath] = placeholders[text] || text;
            }
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            traverse(child, nodePath);
          }
        }
      }
    }

    traverse(xmlDoc.documentElement, '');

    return Object.keys(mappings).length > 0 ? mappings : null;
  } catch (error) {
    console.error('Error processing XML template:', error);
    return null;
  }
}
