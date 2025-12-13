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

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Extract parameters from URL
    const urlParams = new URLSearchParams(window.location.search);
    currentIntegrationId = urlParams.get('integrationId');
    currentFeatureId = urlParams.get('featureId');
    currentFieldId = urlParams.get('fieldId');
    currentFieldType = urlParams.get('fieldType') || 'template';
    const featureName = urlParams.get('featureName');

    if (!currentIntegrationId || !currentFeatureId || !currentFieldId) {
        showToast('Missing required parameters. Please navigate from Integration Detail page.', 'error');
        // Show helpful instruction
        document.querySelector('.api-form-panel').innerHTML = `
            <div class="empty-state" style="padding: 48px; text-align: center;">
                <h3 style="color: #374151; margin-bottom: 16px;">Missing Required Parameters</h3>
                <p style="color: #6b7280; margin-bottom: 24px;">
                    This page requires proper navigation from the Integration Detail page.
                </p>
                <p style="color: #9ca3af; font-size: 14px;">
                    Please follow these steps:<br>
                    1. Go to <a href="/integrations">Integrations</a><br>
                    2. Select an integration<br>
                    3. Choose a feature mapping<br>
                    4. Click "API Settings" → "Configure API"
                </p>
            </div>
        `;
        return;
    }

    // Update UI with feature and field info
    document.getElementById('featureDisplayName').textContent = `${featureName || 'Feature'} / ${currentFieldId}`;
    document.getElementById('featureName').textContent = featureName || 'API Configuration';

    // Update integration link
    document.getElementById('integrationLink').href = `/integration-detail?id=${currentIntegrationId}`;

    // Load data
    await loadFeatureFields();
    await loadFieldApiConfig();
    await loadAvailableVariables();

    // Set up event listeners
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Initialize tab functionality
    initializeTabs();

    // Form submission
    document.getElementById('apiConfigForm').addEventListener('submit', handleFormSubmit);

    // Variable search
    document.getElementById('variableSearch').addEventListener('input', filterVariables);

    // Track focused input for variable insertion
    document.querySelectorAll('input[type="text"], textarea').forEach(input => {
        input.addEventListener('focus', () => {
            currentFocusedInput = input;
        });
    });

    // Body type selector
    const bodyTypeSelect = document.getElementById('bodyType');
    if (bodyTypeSelect) {
        bodyTypeSelect.addEventListener('change', (e) => switchBodyType(e.target.value));
    }

    // Button event listeners are handled via onclick in the EJS template
}

// Initialize tabs functionality
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');

            // Update active tab button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Show corresponding tab pane
            tabPanes.forEach(pane => {
                if (pane.getAttribute('data-pane') === targetTab) {
                    pane.classList.add('active');
                } else {
                    pane.classList.remove('active');
                }
            });
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
        const response = await fetch(`/api/integrations/${currentIntegrationId}/feature-mappings`);
        if (!response.ok) {
            throw new Error('Failed to load feature mappings');
        }

        const result = await response.json();
        // Handle both array and object responses - check for featureMappings property
        const mappings = Array.isArray(result) ? result : (result.featureMappings || result.mappings || []);
        const currentMapping = mappings.find(m => m.featureTemplateId === currentFeatureId);

        if (!currentMapping) {
            console.warn(`Feature mapping not found for featureId: ${currentFeatureId}`);
            // Show a helpful message instead of throwing error
            showToast(`Feature mapping not found. Please ensure the feature "${currentFeatureId}" is properly mapped.`, 'error');

            // Still show the form but with a warning
            featureFields = [{
                id: currentFieldId,
                type: currentFieldType,
                name: currentFieldId,
                hasConfig: false
            }];

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
            Object.entries(featureDefinition.fields).forEach(([fieldKey, fieldDef]) => {
                // Check if field has type="api" and fillBy="Admin"
                if (fieldDef && fieldDef.type === 'api' && fieldDef.fillBy === 'Admin') {
                    featureFields.push({
                        id: fieldKey,
                        type: 'api',
                        name: fieldDef.label || fieldKey,
                        hasConfig: false // Will be updated after loading API configs
                    });
                }
            });
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
                        hasConfig: false // Will be updated after loading API configs
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
        const response = await fetch(`/api/integrations/${currentIntegrationId}/features/${currentFeatureId}/apis`);
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
        const isActive = field.id === currentFieldId && field.type === currentFieldType;
        html += `
            <div class="field-item ${isActive ? 'active' : ''}" onclick="selectField('${field.id}', '${field.type}')">
                <div class="field-item-header">
                    <span class="field-name">${field.name}</span>
                    ${field.hasConfig ? '<span class="field-status configured">Configured</span>' : '<span class="field-status">Not Configured</span>'}
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
    try {
        const response = await fetch(`/api/integrations/${currentIntegrationId}/features/${currentFeatureId}/fields/${currentFieldId}/api-config`);

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
                    document.getElementById('jsonBody').value = JSON.stringify(parsed, null, 2);
                } catch (e) {
                    // If parsing fails, use it as-is
                    document.getElementById('jsonBody').value = jsonValue;
                }
            } else {
                // If it's an object, stringify it
                document.getElementById('jsonBody').value = JSON.stringify(jsonValue, null, 2);
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
        document.getElementById('successPath').value = config.response.successPath || '';
        document.getElementById('errorPath').value = config.response.errorPath || '';
    }
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
        const method = currentApiConfig ? 'PUT' : 'POST';
        const response = await fetch(`/api/integrations/${currentIntegrationId}/features/${currentFeatureId}/fields/${currentFieldId}/api-config`, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            showToast('API configuration saved successfully', 'success');
            // Reload to show updated configuration
            await loadFeatureFields();
            await loadFieldApiConfig();
        } else {
            throw new Error('Failed to save API configuration');
        }
    } catch (error) {
        console.error('Error saving API configuration:', error);
        showToast('Failed to save API configuration', 'error');
    }
}

// Collect form data
function collectFormData() {
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
            dataFormat: 'json'
        }
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
            const response = await fetch(`/api/integrations/${currentIntegrationId}/features/${currentFeatureId}/fields/${currentFieldId}/api-config`, {
                method: 'DELETE'
            });

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
        <input type="text" class="key-input" placeholder="Key" value="${escapeHtml(key)}">
        <input type="text" class="value-input" placeholder="Value" value="${escapeHtml(value)}">
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
    // Hide all body editors
    document.querySelectorAll('.body-editor').forEach(editor => {
        editor.style.display = 'none';
    });

    // Show selected editor based on type
    if (type !== 'none') {
        let editorId;
        switch(type) {
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
        }
    }
}

// Load available variables
async function loadAvailableVariables() {
    try {
        const response = await fetch(`/api/integrations/${currentIntegrationId}/available-variables?featureId=${currentFeatureId}`);
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
        'featureFields': 'featureFields',
        'authVariables': 'authVariables',
        'additionalFields': 'additionalFields',
        'extraFields': 'extraFields'
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

    return variables.map(variable => {
        const varName = typeof variable === 'string' ? variable : (variable._id || variable.name);
        const varDesc = typeof variable === 'object' ? (variable.label || variable.description) : '';

        return `
            <div class="variable-item" onclick="copyVariable('${varName}')">
                <span class="variable-name">{{${varName}}}</span>
                ${varDesc ? `<span class="variable-desc">${varDesc}</span>` : ''}
                <button class="copy-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                </button>
            </div>
        `;
    }).join('');
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

        currentFocusedInput.value = value.slice(0, start) + variable + value.slice(end);
        currentFocusedInput.focus();
        currentFocusedInput.setSelectionRange(start + variable.length, start + variable.length);

        showToast('Variable inserted', 'success');
    } else {
        // Copy to clipboard
        navigator.clipboard.writeText(variable).then(() => {
            showToast('Variable copied to clipboard', 'success');
        }).catch(() => {
            showToast('Failed to copy variable', 'error');
        });
    }
}

// Filter variables based on search
function filterVariables() {
    const searchTerm = document.getElementById('variableSearch').value.toLowerCase();
    const sections = document.querySelectorAll('.variable-section');

    sections.forEach(section => {
        const items = section.querySelectorAll('.variable-item');
        let hasVisibleItems = false;

        items.forEach(item => {
            const varName = item.querySelector('.variable-name').textContent.toLowerCase();
            const varDesc = item.querySelector('.variable-desc')?.textContent.toLowerCase() || '';

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
        PATCH: '#8b5cf6'
    };
    return colors[method] || '#6b7280';
}

// Show toast message
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer') || createToastContainer();

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

    // Check if API config exists (meaning it's saved)
    const urlParams = new URLSearchParams(window.location.search);
    const integrationId = urlParams.get('integrationId');
    const featureId = urlParams.get('featureId');
    const fieldId = urlParams.get('fieldId');

    if (!integrationId || !featureId || !fieldId) {
        testButton.disabled = true;
        testButton.title = 'Save API configuration before testing';
        return;
    }

    fetch(`/api/integrations/${integrationId}/features/${featureId}/fields/${fieldId}/api-config`)
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
    const urlParams = new URLSearchParams(window.location.search);
    const integrationId = urlParams.get('integrationId');
    const featureId = urlParams.get('featureId');
    const fieldId = urlParams.get('fieldId');

    // First, check if API is saved
    try {
        const apiResponse = await fetch(`/api/integrations/${integrationId}/features/${featureId}/fields/${fieldId}/api-config`);
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
            console.log('Option value:', option.value, 'Option text:', option.textContent); // Debug log
            userSelect.appendChild(option);
        });

        // Remove old event listener and add new one
        userSelect.removeEventListener('change', handleUserSelection);
        userSelect.addEventListener('change', handleUserSelection);

        // Reset connection dropdown
        connectionSelect.disabled = true;
        connectionSelect.innerHTML = '<option value="">Select a user first...</option>';
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
        connectionSelect.innerHTML = '<option value="">Select a user first...</option>';
        userConnections = [];
        selectedConnection = null;
        document.getElementById('connectionInfo').style.display = 'none';
        return;
    }

    // Enable and load connections for selected user
    connectionSelect.disabled = false;
    connectionSelect.innerHTML = '<option value="">Loading connections...</option>';
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
        const response = await fetch(`/api/integrations/${integrationId}/user-connections?userId=${selectedUserId}`);
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
    document.getElementById('authMethodDisplay').textContent = selectedConnection.authMethod;
    document.getElementById('connectionStatusDisplay').textContent = selectedConnection.status;
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
            const configuredValue = selectedConnection?.configuredVariables?.[variable] || '';

            inputGroup.innerHTML = `
                <label for="var-${variable}">{{${variable}}}</label>
                <input type="text" id="var-${variable}" data-variable="${variable}" value="${configuredValue}" placeholder="Enter value for ${variable}" class="form-control">
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
    const urlParams = new URLSearchParams(window.location.search);
    const integrationId = urlParams.get('integrationId');
    const featureId = urlParams.get('featureId');
    const fieldId = urlParams.get('fieldId');

    try {
        const response = await fetch(`/api/integrations/${integrationId}/features/${featureId}/fields/${fieldId}/test-api`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: 'user123', // Replace with actual user ID
                connectionId: selectedConnection.id,
                variableValues: variableValues
            })
        });

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
        statusSpan.textContent = result.response ? `${result.response.status} ${result.response.statusText}` : 'Error';
    }

    // Update timing
    document.getElementById('responseTime').textContent = `Time: ${result.response?.responseTime || 0}ms`;

    // Update size
    const responseSize = JSON.stringify(result.response?.data || '').length;
    document.getElementById('responseSize').textContent = `Size: ${formatBytes(responseSize)}`;

    // Display response body
    document.getElementById('responseBodyContent').textContent = JSON.stringify(result.response?.data || result.error || 'No response', null, 2);

    // Display headers
    document.getElementById('responseHeadersContent').textContent = JSON.stringify(result.response?.headers || {}, null, 2);

    // Display request details
    document.getElementById('requestDetailsContent').textContent = JSON.stringify(result.request || {}, null, 2);
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
    document.getElementById('responseBodyContent').textContent = 'Execute a test to see the response...';
    document.getElementById('responseStatus').textContent = '';
    document.getElementById('responseTime').textContent = '';
    document.getElementById('responseSize').textContent = '';
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

// Initialize test button state on page load and after save
document.addEventListener('DOMContentLoaded', updateTestButtonState);

// Also update test button state after saving API
const originalHandleFormSubmit = window.handleFormSubmit;
window.handleFormSubmit = async function(e) {
    const result = await originalHandleFormSubmit.call(this, e);
    updateTestButtonState();
    return result;
};