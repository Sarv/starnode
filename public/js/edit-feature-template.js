// Global state
let allCategories = {};
let currentFields = {};
let selectedFieldKey = null;
let isEditMode = false;
let editingFeatureId = null;
let currentPossibleValues = [];
let hasUnsavedChanges = false;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Check URL path for edit mode: /feature-templates/:id/edit
    const pathParts = window.location.pathname.split('/');
    let featureId = null;

    // Check if URL matches pattern: /feature-templates/{id}/edit
    if (pathParts.length >= 4 && pathParts[1] === 'feature-templates' && pathParts[3] === 'edit') {
        featureId = pathParts[2];
    }
    // Fallback: check query parameter for backward compatibility
    if (!featureId) {
        const urlParams = new URLSearchParams(window.location.search);
        featureId = urlParams.get('id');
    }

    // Load categories first
    await loadCategories();

    if (featureId) {
        isEditMode = true;
        editingFeatureId = featureId;
        document.getElementById('pageTitle').textContent = 'Edit Feature Template';
        document.getElementById('featureId').disabled = true;
        await loadFeature(featureId);
    } else {
        document.getElementById('pageTitle').textContent = 'New Feature Template';
    }

    setupEventListeners();
});

// Load categories
async function loadCategories() {
    try {
        const response = await fetch('/api/feature-templates');
        const data = await response.json();

        if (data.success) {
            allCategories = data.categories || {};
            renderCategoryOptions();
        }
    } catch (error) {
        console.error('Error loading categories:', error);
        showToast('Failed to load categories', 'error');
    }
}

// Render category options
function renderCategoryOptions() {
    const select = document.getElementById('featureCategory');
    let html = '<option value="">Select category...</option>';

    Object.keys(allCategories).forEach(catKey => {
        const category = allCategories[catKey];
        html += `<option value="${catKey}">${category.icon} ${category.label}</option>`;
    });

    select.innerHTML = html;
}

// Load feature for editing
async function loadFeature(featureId) {
    try {
        const response = await fetch(`/api/feature-templates/${featureId}`);
        const data = await response.json();

        if (data.success && data.feature) {
            const feature = data.feature;

            // Populate form
            document.getElementById('featureId').value = feature.id;
            document.getElementById('featureName').value = feature.name;
            document.getElementById('featureCategory').value = feature.category;
            document.getElementById('featureDescription').value = feature.description || '';

            // Load fields
            currentFields = feature.fields || {};
            renderFieldsList();
        } else {
            showToast('Failed to load feature', 'error');
            setTimeout(() => goBack(), 2000);
        }
    } catch (error) {
        console.error('Error loading feature:', error);
        showToast('Failed to load feature', 'error');
        setTimeout(() => goBack(), 2000);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Field type change
    document.getElementById('fieldType').addEventListener('change', handleFieldTypeChange);
    document.getElementById('fieldHtmlType').addEventListener('change', handleHtmlTypeChange);

    // Track changes
    const formElements = document.querySelectorAll('#featureForm input, #featureForm select, #featureForm textarea');
    formElements.forEach(element => {
        element.addEventListener('change', () => {
            hasUnsavedChanges = true;
        });
    });

    // Warn before leaving
    window.addEventListener('beforeunload', (e) => {
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
}

// Render fields list
function renderFieldsList() {
    const fieldKeys = Object.keys(currentFields);
    const fieldsListEmpty = document.getElementById('fieldsListEmpty');
    const fieldsList = document.getElementById('fieldsList');

    if (fieldKeys.length === 0) {
        fieldsListEmpty.style.display = 'flex';
        fieldsList.style.display = 'none';
        return;
    }

    fieldsListEmpty.style.display = 'none';
    fieldsList.style.display = 'block';

    let html = '';
    fieldKeys.forEach(key => {
        const field = currentFields[key];
        const isActive = selectedFieldKey === key;

        html += `
            <div class="field-item ${isActive ? 'active' : ''}" onclick="selectField('${key}')">
                <div class="field-item-header">
                    <span class="field-item-name">${key}</span>
                    <span class="field-item-type">${field.type}</span>
                </div>
                <div class="field-item-label">${field.label}</div>
                ${field.required ? '<div class="field-item-meta">Required</div>' : ''}
            </div>
        `;
    });

    fieldsList.innerHTML = html;
}

// Create new field
function createNewField() {
    selectedFieldKey = null;
    clearFieldForm();
    showFieldForm();

    // Auto-focus on field key
    document.getElementById('fieldKey').focus();
}

// Select field
function selectField(fieldKey) {
    selectedFieldKey = fieldKey;
    const field = currentFields[fieldKey];

    if (!field) return;

    // Show field form
    showFieldForm();

    // Populate form
    document.getElementById('fieldKey').value = fieldKey;
    document.getElementById('fieldKey').disabled = true; // Can't change key when editing
    document.getElementById('fieldLabel').value = field.label || '';
    document.getElementById('fieldType').value = field.type || '';
    document.getElementById('fieldDataType').value = field.fieldType || '';
    document.getElementById('fieldHtmlType').value = field.htmlType || '';
    document.getElementById('fieldFillBy').value = field.fillBy || '';
    document.getElementById('fieldRequired').checked = field.required || false;
    document.getElementById('fieldDefault').value = field.default || '';
    document.getElementById('fieldDescription').value = field.description || '';

    // Handle field type specific fields
    handleFieldTypeChange();

    // Conditional expression
    if (field.type === 'conditional' && field.conditionalExpression) {
        document.getElementById('conditionalExpression').value = field.conditionalExpression;
    }

    // Possible values
    if (field.possibleValues) {
        currentPossibleValues = [...field.possibleValues];
        renderPossibleValues();
    }

    // Multiple values
    if (field.multipleValueAllowed !== undefined) {
        document.getElementById('fieldMultipleValue').checked = field.multipleValueAllowed;
    }

    // Handle HTML type
    handleHtmlTypeChange();

    // Render updated list
    renderFieldsList();
}

// Show field form
function showFieldForm() {
    document.getElementById('fieldFormEmpty').style.display = 'none';
    document.getElementById('fieldForm').style.display = 'block';
    document.getElementById('fieldActions').style.display = 'flex';
}

// Clear field form
function clearFieldForm() {
    document.getElementById('fieldKey').value = '';
    document.getElementById('fieldKey').disabled = false;
    document.getElementById('fieldLabel').value = '';
    document.getElementById('fieldType').value = '';
    document.getElementById('fieldDataType').value = '';
    document.getElementById('fieldHtmlType').value = '';
    document.getElementById('fieldFillBy').value = '';
    document.getElementById('fieldRequired').checked = false;
    document.getElementById('fieldDefault').value = '';
    document.getElementById('fieldDescription').value = '';
    document.getElementById('conditionalExpression').value = '';
    document.getElementById('apiEndpoint').value = '';
    document.getElementById('apiMethod').value = '';
    currentPossibleValues = [];
    renderPossibleValues();

    // Hide conditional groups
    hideAllConditionalGroups();
}

// Handle field type change
function handleFieldTypeChange() {
    const fieldType = document.getElementById('fieldType').value;
    const helpText = document.getElementById('fieldTypeHelp');

    // Hide all conditional groups first
    hideAllConditionalGroups();

    // Show/hide based on type
    if (fieldType === 'api') {
        document.getElementById('dataTypeGroup').style.display = 'block';
        document.getElementById('htmlTypeGroup').style.display = 'block';
        helpText.textContent = 'API configuration field (endpoint details will be defined during mapping)';
    } else if (fieldType === 'conditional') {
        document.getElementById('conditionalExpressionGroup').style.display = 'block';
        document.getElementById('dataTypeGroup').style.display = 'block';
        document.getElementById('htmlTypeGroup').style.display = 'block';
        helpText.textContent = 'Field shown based on conditions';
    } else {
        document.getElementById('dataTypeGroup').style.display = 'block';
        document.getElementById('htmlTypeGroup').style.display = 'block';
        if (fieldType === 'static') {
            helpText.textContent = 'Configured once during setup';
        } else if (fieldType === 'dynamic') {
            helpText.textContent = 'Runtime value from workflow data';
        }
    }
}

// Handle HTML type change
function handleHtmlTypeChange() {
    const htmlType = document.getElementById('fieldHtmlType').value;

    // Hide possible values group by default
    document.getElementById('possibleValuesGroup').style.display = 'none';
    document.getElementById('multipleValueGroup').style.display = 'none';

    // Show for select, checkbox, radio
    if (htmlType === 'select' || htmlType === 'checkbox' || htmlType === 'radio') {
        document.getElementById('possibleValuesGroup').style.display = 'block';

        // Show multiple value option only for checkbox
        if (htmlType === 'checkbox') {
            document.getElementById('multipleValueGroup').style.display = 'block';
        }
    }
}

// Hide all conditional groups
function hideAllConditionalGroups() {
    document.getElementById('dataTypeGroup').style.display = 'none';
    document.getElementById('htmlTypeGroup').style.display = 'none';
    document.getElementById('apiEndpointGroup').style.display = 'none';
    document.getElementById('apiMethodGroup').style.display = 'none';
    document.getElementById('conditionalExpressionGroup').style.display = 'none';
    document.getElementById('possibleValuesGroup').style.display = 'none';
    document.getElementById('multipleValueGroup').style.display = 'none';
}

// Add possible value
function addPossibleValue() {
    const input = document.getElementById('possibleValuesInput');
    const value = input.value.trim();

    if (!value) {
        showToast('Please enter a value', 'error');
        return;
    }

    if (currentPossibleValues.includes(value)) {
        showToast('Value already exists', 'error');
        return;
    }

    currentPossibleValues.push(value);
    input.value = '';
    renderPossibleValues();
}

// Remove possible value
function removePossibleValue(index) {
    currentPossibleValues.splice(index, 1);
    renderPossibleValues();
}

// Render possible values
function renderPossibleValues() {
    const container = document.getElementById('possibleValuesList');

    if (currentPossibleValues.length === 0) {
        container.innerHTML = '';
        return;
    }

    let html = '';
    currentPossibleValues.forEach((value, index) => {
        html += `
            <div class="value-item">
                <span class="value-item-text">${value}</span>
                <button type="button" class="value-item-remove" onclick="removePossibleValue(${index})">Remove</button>
            </div>
        `;
    });

    container.innerHTML = html;
}

/**
 * Validate compatibility between data type and HTML type
 * Returns error message if incompatible, null if compatible
 */
function validateFieldTypeCompatibility(dataType, htmlType) {
    // Define valid combinations
    const compatibilityMatrix = {
        'string': ['text', 'textarea', 'password', 'select', 'radio', 'hidden'],
        'text': ['text', 'textarea', 'hidden'],
        'number': ['number', 'range', 'select', 'radio'],
        'boolean': ['checkbox', 'radio', 'select', 'hidden'],
        'email': ['email', 'text', 'hidden'],
        'url': ['url', 'text', 'hidden'],
        'html': ['textarea', 'hidden'],
        'date': ['date', 'datetime-local', 'month', 'week', 'text', 'hidden'],
        'array': ['checkbox', 'select', 'hidden'],
        'object': ['textarea', 'hidden'],
        'json': ['textarea', 'hidden']
    };

    // Special cases for HTML types that work with specific data types
    const htmlTypeRequirements = {
        'time': ['string', 'date'],
        'datetime-local': ['string', 'date'],
        'month': ['string', 'date'],
        'week': ['string', 'date'],
        'tel': ['string', 'number'],
        'color': ['string'],
        'file': ['string', 'url', 'array']
    };

    // Check if HTML type has special requirements
    if (htmlTypeRequirements[htmlType]) {
        if (!htmlTypeRequirements[htmlType].includes(dataType)) {
            return `HTML type "${htmlType}" is not compatible with data type "${dataType}". ` +
                   `Compatible data types: ${htmlTypeRequirements[htmlType].join(', ')}`;
        }
        return null;
    }

    // Check standard compatibility matrix
    if (compatibilityMatrix[dataType]) {
        if (!compatibilityMatrix[dataType].includes(htmlType)) {
            return `Data type "${dataType}" is not compatible with HTML type "${htmlType}". ` +
                   `Compatible HTML types: ${compatibilityMatrix[dataType].join(', ')}`;
        }
    }

    return null; // Compatible or unknown combination
}

// Save current field
function saveCurrentField() {
    const fieldKey = document.getElementById('fieldKey').value.trim();
    const fieldLabel = document.getElementById('fieldLabel').value.trim();
    const fieldType = document.getElementById('fieldType').value;

    if (!fieldKey || !fieldLabel || !fieldType) {
        showToast('Please fill all required fields', 'error');
        return false;
    }

    // Validate field key format
    if (!/^[a-z0-9_]+$/.test(fieldKey)) {
        showToast('Field key must contain only lowercase letters, numbers, and underscores', 'error');
        return false;
    }

    // Build field object
    const field = {
        type: fieldType,
        label: fieldLabel,
        required: document.getElementById('fieldRequired').checked,
        description: document.getElementById('fieldDescription').value.trim()
    };

    // Add data type and HTML type for all field types (including API)
    field.fieldType = document.getElementById('fieldDataType').value;
    field.htmlType = document.getElementById('fieldHtmlType').value;
    field.fillBy = document.getElementById('fieldFillBy').value;

    if (!field.fieldType || !field.htmlType) {
        showToast('Please select data type and HTML type', 'error');
        return false;
    }

    // Validate data type and HTML type compatibility
    const compatibilityError = validateFieldTypeCompatibility(field.fieldType, field.htmlType);
    if (compatibilityError) {
        showToast(compatibilityError, 'error');
        return false;
    }

    if (!field.fillBy) {
        showToast('Please select who fills this field', 'error');
        return false;
    }

    if (fieldType === 'conditional') {
        const expression = document.getElementById('conditionalExpression').value.trim();

        if (!expression) {
            showToast('Please provide conditional expression', 'error');
            return false;
        }

        // Validate expression
        const validation = validateConditionalExpression(expression, fieldKey);
        if (!validation.valid) {
            showToast(validation.error, 'error');
            return false;
        }

        field.conditionalExpression = expression;
    }

    // Possible values
    const htmlType = document.getElementById('fieldHtmlType').value;
    if (htmlType === 'select' || htmlType === 'checkbox' || htmlType === 'radio') {
        if (currentPossibleValues.length === 0) {
            showToast('Please add at least one possible value', 'error');
            return false;
        }
        field.possibleValues = [...currentPossibleValues];

        if (htmlType === 'checkbox') {
            field.multipleValueAllowed = document.getElementById('fieldMultipleValue').checked;
        }
    }

    // Default value
    const defaultValue = document.getElementById('fieldDefault').value.trim();
    if (defaultValue) {
        field.default = defaultValue;
    }

    // Add to currentFields
    currentFields[fieldKey] = field;
    hasUnsavedChanges = true;

    // Update the selected field key if it was a new field
    selectedFieldKey = fieldKey;

    showToast('Field saved successfully', 'success');
    renderFieldsList();

    return true;
}

// Cancel field edit
function cancelFieldEdit() {
    if (selectedFieldKey) {
        // If editing existing field, reload it
        selectField(selectedFieldKey);
    } else {
        // If creating new field, clear form and hide it
        selectedFieldKey = null;
        clearFieldForm();
        document.getElementById('fieldFormEmpty').style.display = 'flex';
        document.getElementById('fieldForm').style.display = 'none';
        document.getElementById('fieldActions').style.display = 'none';
    }
}

// Delete current field
function deleteCurrentField() {
    if (!selectedFieldKey) return;

    if (!confirm(`Are you sure you want to delete the field "${selectedFieldKey}"?`)) {
        return;
    }

    delete currentFields[selectedFieldKey];
    hasUnsavedChanges = true;

    // Clear and hide form
    selectedFieldKey = null;
    clearFieldForm();
    document.getElementById('fieldFormEmpty').style.display = 'flex';
    document.getElementById('fieldForm').style.display = 'none';
    document.getElementById('fieldActions').style.display = 'none';

    renderFieldsList();
    showToast('Field deleted', 'success');
}

// Validate conditional expression
function validateConditionalExpression(expression, currentFieldKey) {
    const regex = /\{\{([a-z0-9_]+)\}\}/gi;
    const matches = [];
    let match;

    while ((match = regex.exec(expression)) !== null) {
        matches.push(match[1]);
    }

    if (matches.length === 0) {
        return {
            valid: false,
            error: 'No fields referenced. Use {{field_name}} syntax'
        };
    }

    const invalidFields = [];
    for (const fieldName of matches) {
        if (fieldName === currentFieldKey) {
            invalidFields.push(fieldName);
            continue;
        }

        if (!currentFields[fieldName]) {
            invalidFields.push(fieldName);
        }
    }

    if (invalidFields.length > 0) {
        return {
            valid: false,
            error: `Referenced field(s) do not exist: ${invalidFields.map(f => '{{' + f + '}}').join(', ')}`
        };
    }

    return { valid: true };
}

// Save feature
async function saveFeature() {
    // Save current field first if in edit mode
    if (selectedFieldKey) {
        if (!saveCurrentField()) {
            return;
        }
    }

    // Validate feature form
    const featureId = document.getElementById('featureId').value.trim();
    const featureName = document.getElementById('featureName').value.trim();
    const featureCategory = document.getElementById('featureCategory').value;

    if (!featureId || !featureName || !featureCategory) {
        showToast('Please fill all required fields', 'error');
        return;
    }

    if (!/^[a-z0-9_]+$/.test(featureId)) {
        showToast('Feature ID must contain only lowercase letters, numbers, and underscores', 'error');
        return;
    }

    // Build feature object
    const feature = {
        id: featureId,
        name: featureName,
        category: featureCategory,
        description: document.getElementById('featureDescription').value.trim(),
        fields: currentFields
    };

    // Save to API
    try {
        const url = isEditMode ? `/api/feature-templates/${editingFeatureId}` : '/api/feature-templates';
        const method = isEditMode ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(feature)
        });

        const data = await response.json();

        if (data.success) {
            hasUnsavedChanges = false;
            showToast('Feature saved successfully', 'success');
            setTimeout(() => {
                window.location.href = '/feature-templates';
            }, 1000);
        } else {
            showToast(data.error || 'Failed to save feature', 'error');
        }
    } catch (error) {
        console.error('Error saving feature:', error);
        showToast('Failed to save feature', 'error');
    }
}

// Cancel feature
function cancelFeature() {
    if (hasUnsavedChanges) {
        if (!confirm('You have unsaved changes. Are you sure you want to leave?')) {
            return;
        }
    }

    goBack();
}

// Go back
function goBack() {
    window.location.href = '/feature-templates';
}

// Show toast
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast show';

    if (type === 'error') {
        toast.classList.add('error');
    } else if (type === 'success') {
        toast.classList.add('success');
    }

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
