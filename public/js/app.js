// API Base URL
const API_BASE = 'http://localhost:3000/api';

// Global state
let authTypesData = null;
let currentAuthType = null;
let formData = {};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadAuthTypes();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    document.getElementById('copyBtn').addEventListener('click', copyToClipboard);
    document.getElementById('downloadBtn').addEventListener('click', downloadJson);
    document.getElementById('saveTemplateBtn').addEventListener('click', openSaveModal);
    document.getElementById('closeModal').addEventListener('click', closeSaveModal);
    document.getElementById('cancelSave').addEventListener('click', closeSaveModal);
    document.getElementById('confirmSave').addEventListener('click', saveTemplate);

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('saveModal');
        if (e.target === modal) {
            closeSaveModal();
        }
    });
}

// Load auth types from API
async function loadAuthTypes() {
    try {
        const response = await fetch(`${API_BASE}/auth-types`);
        const data = await response.json();
        authTypesData = data;
        renderAuthTypeList();
    } catch (error) {
        console.error('Error loading auth types:', error);
        document.getElementById('authTypeList').innerHTML = `
            <div class="error">Failed to load auth types. Make sure the server is running.</div>
        `;
    }
}

// Render auth type list in sidebar
function renderAuthTypeList() {
    const listContainer = document.getElementById('authTypeList');
    listContainer.innerHTML = '';

    Object.keys(authTypesData.authTypes).forEach(key => {
        const authType = authTypesData.authTypes[key];
        const item = document.createElement('div');
        item.className = 'auth-type-item';
        item.dataset.authType = key;

        const categoryClass = `category-${authType.category || 'simple'}`;

        item.innerHTML = `
            <span class="category-badge ${categoryClass}">${authType.category || 'simple'}</span>
            <span class="label">${authType.label}</span>
            <span class="description">${authType.description}</span>
        `;

        item.addEventListener('click', () => selectAuthType(key, item));
        listContainer.appendChild(item);
    });
}

// Select auth type and generate form
function selectAuthType(authTypeKey, element) {
    currentAuthType = authTypeKey;
    formData = {};

    // Update active state
    document.querySelectorAll('.auth-type-item').forEach(item => {
        item.classList.remove('active');
    });
    element.classList.add('active');

    // Generate form
    const authType = authTypesData.authTypes[authTypeKey];
    generateForm(authType);

    // Show output section
    document.getElementById('outputSection').style.display = 'block';
    updateOutput();
}

// Generate form based on configOptions
function generateForm(authType) {
    const formContainer = document.getElementById('formContainer');
    formContainer.innerHTML = `
        <div class="form-section active">
            <h2 class="section-title">${authType.label}</h2>
            <p style="color: #666; margin-bottom: 30px;">${authType.description}</p>
            <div id="formFields"></div>
        </div>
    `;

    const fieldsContainer = document.getElementById('formFields');
    const configOptions = authType.configOptions;

    if (Object.keys(configOptions).length === 0) {
        fieldsContainer.innerHTML = '<p style="color: #999;">No configuration options for this auth type.</p>';
        return;
    }

    Object.keys(configOptions).forEach(fieldKey => {
        const field = configOptions[fieldKey];
        const fieldHtml = generateField(fieldKey, field);
        fieldsContainer.insertAdjacentHTML('beforeend', fieldHtml);
    });

    // Add event listeners
    attachEventListeners();
}

// Generate individual field HTML
function generateField(fieldKey, field) {
    const required = field.required ? '<span class="required">*</span>' : '';
    const helpText = field.helpText ? `<div class="help-text">${field.helpText}</div>` : '';
    const examples = field.examples ? `<div class="examples">Examples: ${Array.isArray(field.examples) ? field.examples.join(', ') : field.examples}</div>` : '';

    // Initialize form data with default value
    if (field.default !== undefined) {
        formData[fieldKey] = field.default;
    }

    switch (field.type) {
        case 'string':
            if (field.options) {
                // Dropdown
                return `
                    <div class="form-group">
                        <label>${field.label}${required}</label>
                        <select id="${fieldKey}" data-field="${fieldKey}" ${field.required ? 'required' : ''} ${field.locked ? 'disabled' : ''}>
                            ${field.options.map(opt =>
                                `<option value="${opt}" ${opt === field.default ? 'selected' : ''}>${opt}</option>`
                            ).join('')}
                        </select>
                        ${helpText}
                        ${examples}
                    </div>
                `;
            } else {
                // Text input
                return `
                    <div class="form-group">
                        <label>${field.label}${required}</label>
                        <input type="text" id="${fieldKey}" data-field="${fieldKey}"
                            placeholder="${field.placeholder || ''}"
                            value="${field.default || ''}"
                            ${field.required ? 'required' : ''}
                            ${field.locked ? 'readonly' : ''}>
                        ${helpText}
                        ${examples}
                    </div>
                `;
            }

        case 'number':
            return `
                <div class="form-group">
                    <label>${field.label}${required}</label>
                    <input type="number" id="${fieldKey}" data-field="${fieldKey}"
                        value="${field.default !== undefined ? field.default : ''}"
                        ${field.required ? 'required' : ''}>
                    ${helpText}
                    ${examples}
                </div>
            `;

        case 'boolean':
            return `
                <div class="form-group">
                    <div class="checkbox-wrapper">
                        <input type="checkbox" id="${fieldKey}" data-field="${fieldKey}"
                            ${field.default ? 'checked' : ''}>
                        <label for="${fieldKey}">${field.label}</label>
                    </div>
                    ${helpText}
                </div>
            `;

        case 'array':
            formData[fieldKey] = [];
            if (field.itemSchema) {
                // Complex array with itemSchema
                return `
                    <div class="form-group">
                        <label>${field.label}${required}</label>
                        ${helpText}
                        <div class="array-container" id="array-${fieldKey}">
                            <div id="array-items-${fieldKey}"></div>
                            <button type="button" class="btn btn-primary btn-small add-item-btn"
                                data-add-array="${fieldKey}">+ Add Item</button>
                        </div>
                    </div>
                `;
            } else {
                // Simple array
                return `
                    <div class="form-group">
                        <label>${field.label}${required}</label>
                        ${helpText}
                        ${examples}
                        <div id="simple-array-${fieldKey}">
                            <div id="simple-array-items-${fieldKey}"></div>
                            <button type="button" class="btn btn-primary btn-small"
                                data-add-simple-array="${fieldKey}">+ Add ${field.label}</button>
                        </div>
                    </div>
                `;
            }

        case 'object':
            return `
                <div class="form-group">
                    <label>${field.label}${required}</label>
                    <textarea id="${fieldKey}" data-field="${fieldKey}"
                        placeholder='${field.examples ? field.examples[0] : '{}'}'
                        ${field.required ? 'required' : ''}></textarea>
                    ${helpText}
                    ${examples}
                </div>
            `;

        default:
            return '';
    }
}

// Attach event listeners to form fields
function attachEventListeners() {
    // Regular input fields
    document.querySelectorAll('input[data-field], select[data-field], textarea[data-field]').forEach(field => {
        const fieldKey = field.dataset.field;

        field.addEventListener('input', (e) => {
            if (field.type === 'checkbox') {
                formData[fieldKey] = field.checked;
            } else if (field.type === 'number') {
                formData[fieldKey] = parseFloat(field.value) || 0;
            } else {
                formData[fieldKey] = field.value;
            }
            updateOutput();
        });

        field.addEventListener('change', (e) => {
            if (field.type === 'checkbox') {
                formData[fieldKey] = field.checked;
            } else if (field.type === 'number') {
                formData[fieldKey] = parseFloat(field.value) || 0;
            } else {
                formData[fieldKey] = field.value;
            }
            updateOutput();
        });
    });

    // Array add buttons
    document.querySelectorAll('[data-add-array]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const fieldKey = e.target.dataset.addArray;
            addArrayItem(fieldKey);
        });
    });

    document.querySelectorAll('[data-add-simple-array]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const fieldKey = e.target.dataset.addSimpleArray;
            addSimpleArrayItem(fieldKey);
        });
    });
}

// Add simple array item
function addSimpleArrayItem(fieldKey) {
    if (!formData[fieldKey]) {
        formData[fieldKey] = [];
    }

    const itemIndex = formData[fieldKey].length;
    formData[fieldKey].push('');

    const itemsContainer = document.getElementById(`simple-array-items-${fieldKey}`);
    const itemDiv = document.createElement('div');
    itemDiv.className = 'simple-array-input';
    itemDiv.innerHTML = `
        <input type="text" placeholder="Enter value"
            data-simple-array="${fieldKey}"
            data-simple-index="${itemIndex}">
        <button type="button" class="btn btn-danger btn-small"
            data-remove-simple="${fieldKey}" data-remove-index="${itemIndex}">Remove</button>
    `;
    itemsContainer.appendChild(itemDiv);

    // Attach event listeners
    const input = itemDiv.querySelector('input');
    input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.simpleIndex);
        formData[fieldKey][idx] = e.target.value;
        updateOutput();
    });

    const removeBtn = itemDiv.querySelector('button');
    removeBtn.addEventListener('click', (e) => {
        const fKey = e.target.dataset.removeSimple;
        const idx = parseInt(e.target.dataset.removeIndex);
        removeSimpleArrayItem(fKey, idx);
    });

    updateOutput();
}

// Remove simple array item
function removeSimpleArrayItem(fieldKey, index) {
    formData[fieldKey].splice(index, 1);

    // Re-render
    const itemsContainer = document.getElementById(`simple-array-items-${fieldKey}`);
    itemsContainer.innerHTML = '';

    formData[fieldKey].forEach((value, idx) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'simple-array-input';
        itemDiv.innerHTML = `
            <input type="text" value="${value}"
                data-simple-array="${fieldKey}"
                data-simple-index="${idx}">
            <button type="button" class="btn btn-danger btn-small"
                data-remove-simple="${fieldKey}" data-remove-index="${idx}">Remove</button>
        `;
        itemsContainer.appendChild(itemDiv);

        const input = itemDiv.querySelector('input');
        input.addEventListener('input', (e) => {
            const i = parseInt(e.target.dataset.simpleIndex);
            formData[fieldKey][i] = e.target.value;
            updateOutput();
        });

        const removeBtn = itemDiv.querySelector('button');
        removeBtn.addEventListener('click', (e) => {
            const fKey = e.target.dataset.removeSimple;
            const i = parseInt(e.target.dataset.removeIndex);
            removeSimpleArrayItem(fKey, i);
        });
    });

    updateOutput();
}

// Add complex array item
function addArrayItem(fieldKey) {
    const authType = authTypesData.authTypes[currentAuthType];
    const field = authType.configOptions[fieldKey];
    const itemsContainer = document.getElementById(`array-items-${fieldKey}`);

    if (!formData[fieldKey]) {
        formData[fieldKey] = [];
    }

    const itemIndex = formData[fieldKey].length;
    formData[fieldKey].push({});

    const itemDiv = document.createElement('div');
    itemDiv.className = 'array-item';

    let itemHtml = `
        <div class="array-item-header">
            <span class="array-item-title">Item #${itemIndex + 1}</span>
            <button type="button" class="btn btn-danger btn-small"
                data-remove-array="${fieldKey}" data-remove-index="${itemIndex}">Remove</button>
        </div>
    `;

    // Generate fields for array item
    Object.keys(field.itemSchema).forEach(itemFieldKey => {
        const itemField = field.itemSchema[itemFieldKey];
        const itemRequired = itemField.required ? '<span class="required">*</span>' : '';
        const itemHelp = itemField.helpText ? `<div class="help-text">${itemField.helpText}</div>` : '';
        const itemExamples = itemField.examples ? `<div class="examples">Examples: ${itemField.examples.join(', ')}</div>` : '';

        itemHtml += `
            <div class="form-group">
                <label>${itemField.label}${itemRequired}</label>
                <input type="text"
                    data-array-field="${fieldKey}"
                    data-array-index="${itemIndex}"
                    data-item-field="${itemFieldKey}"
                    value="${itemField.default || ''}"
                    placeholder="${itemField.examples ? itemField.examples[0] : ''}">
                ${itemHelp}
                ${itemExamples}
            </div>
        `;
    });

    itemDiv.innerHTML = itemHtml;
    itemsContainer.appendChild(itemDiv);

    // Attach event listeners
    itemDiv.querySelectorAll('input[data-array-field]').forEach(input => {
        input.addEventListener('input', (e) => {
            const arrayField = e.target.dataset.arrayField;
            const arrayIndex = parseInt(e.target.dataset.arrayIndex);
            const itemField = e.target.dataset.itemField;

            if (!formData[arrayField][arrayIndex]) {
                formData[arrayField][arrayIndex] = {};
            }
            formData[arrayField][arrayIndex][itemField] = e.target.value;
            updateOutput();
        });
    });

    const removeBtn = itemDiv.querySelector('[data-remove-array]');
    removeBtn.addEventListener('click', (e) => {
        const fKey = e.target.dataset.removeArray;
        const idx = parseInt(e.target.dataset.removeIndex);
        removeArrayItem(fKey, idx);
    });

    updateOutput();
}

// Remove array item
function removeArrayItem(fieldKey, index) {
    formData[fieldKey].splice(index, 1);

    // Re-render
    const itemsContainer = document.getElementById(`array-items-${fieldKey}`);
    itemsContainer.innerHTML = '';

    const authType = authTypesData.authTypes[currentAuthType];
    const field = authType.configOptions[fieldKey];

    formData[fieldKey].forEach((item, idx) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'array-item';

        let itemHtml = `
            <div class="array-item-header">
                <span class="array-item-title">Item #${idx + 1}</span>
                <button type="button" class="btn btn-danger btn-small"
                    data-remove-array="${fieldKey}" data-remove-index="${idx}">Remove</button>
            </div>
        `;

        Object.keys(field.itemSchema).forEach(itemFieldKey => {
            const itemField = field.itemSchema[itemFieldKey];
            const itemRequired = itemField.required ? '<span class="required">*</span>' : '';

            itemHtml += `
                <div class="form-group">
                    <label>${itemField.label}${itemRequired}</label>
                    <input type="text"
                        data-array-field="${fieldKey}"
                        data-array-index="${idx}"
                        data-item-field="${itemFieldKey}"
                        value="${item[itemFieldKey] || ''}">
                </div>
            `;
        });

        itemDiv.innerHTML = itemHtml;
        itemsContainer.appendChild(itemDiv);

        itemDiv.querySelectorAll('input[data-array-field]').forEach(input => {
            input.addEventListener('input', (e) => {
                const arrayField = e.target.dataset.arrayField;
                const arrayIndex = parseInt(e.target.dataset.arrayIndex);
                const itemField = e.target.dataset.itemField;

                formData[arrayField][arrayIndex][itemField] = e.target.value;
                updateOutput();
            });
        });

        const removeBtn = itemDiv.querySelector('[data-remove-array]');
        removeBtn.addEventListener('click', (e) => {
            const fKey = e.target.dataset.removeArray;
            const i = parseInt(e.target.dataset.removeIndex);
            removeArrayItem(fKey, i);
        });
    });

    updateOutput();
}

// Update output JSON
function updateOutput() {
    const output = {
        authType: currentAuthType,
        config: { ...formData }
    };

    // Clean up empty values
    Object.keys(output.config).forEach(key => {
        if (output.config[key] === '' || output.config[key] === null || output.config[key] === undefined) {
            delete output.config[key];
        }
        if (Array.isArray(output.config[key]) && output.config[key].length === 0) {
            delete output.config[key];
        }
    });

    document.getElementById('outputJson').textContent = JSON.stringify(output, null, 2);
}

// Copy to clipboard
function copyToClipboard() {
    const text = document.getElementById('outputJson').textContent;
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard!', 'success');
    }).catch(err => {
        showToast('Failed to copy', 'error');
    });
}

// Download JSON
function downloadJson() {
    const text = document.getElementById('outputJson').textContent;
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentAuthType}-config.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded successfully!', 'success');
}

// Open save modal
function openSaveModal() {
    document.getElementById('saveModal').classList.add('show');
}

// Close save modal
function closeSaveModal() {
    document.getElementById('saveModal').classList.remove('show');
    document.getElementById('softwareId').value = '';
    document.getElementById('softwareName').value = '';
    document.getElementById('baseUrl').value = '';
}

// Save template
async function saveTemplate() {
    const softwareId = document.getElementById('softwareId').value.trim();
    const softwareName = document.getElementById('softwareName').value.trim();
    const baseUrl = document.getElementById('baseUrl').value.trim();

    if (!softwareId || !softwareName) {
        showToast('Please fill in required fields', 'error');
        return;
    }

    // Validate softwareId (lowercase, no spaces)
    if (!/^[a-z0-9_-]+$/.test(softwareId)) {
        showToast('Software ID must be lowercase with no spaces', 'error');
        return;
    }

    const template = {
        softwareId: softwareId,
        softwareName: softwareName,
        version: '1.0.0',
        baseUrl: baseUrl || undefined,
        authMethods: [
            {
                id: `${softwareId}_${currentAuthType}`,
                authType: currentAuthType,
                label: authTypesData.authTypes[currentAuthType].label,
                isDefault: true,
                priority: 1,
                config: { ...formData }
            }
        ]
    };

    try {
        const response = await fetch(`${API_BASE}/software-templates`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(template)
        });

        const result = await response.json();

        if (response.ok) {
            showToast('Template saved successfully!', 'success');
            closeSaveModal();
        } else {
            showToast(result.error || 'Failed to save template', 'error');
        }
    } catch (error) {
        console.error('Error saving template:', error);
        showToast('Failed to save template', 'error');
    }
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 100);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
