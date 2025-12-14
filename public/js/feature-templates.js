// Global state
let allFeatures = [];
let allCategories = {};
let currentFilter = 'all';
let isEditMode = false;
let editingFeatureId = null;
let currentFields = {};
let editingFieldKey = null;
let featureToDelete = null;
let currentPossibleValues = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadFeatureTemplates();
});

// Load all feature templates
async function loadFeatureTemplates() {
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const tableWrapper = document.getElementById('tableWrapper');

    try {
        loadingState.style.display = 'flex';
        emptyState.style.display = 'none';
        if (tableWrapper) tableWrapper.style.display = 'none';

        const response = await fetch('/api/feature-templates');
        const data = await response.json();

        if (data.success) {
            allFeatures = data.features || [];
            allCategories = data.categories || {};

            renderCategoryFilters();
            updateStats();

            if (allFeatures.length === 0) {
                emptyState.style.display = 'flex';
            } else {
                if (tableWrapper) tableWrapper.style.display = 'block';
                renderFeatures();
            }
        } else {
            showToast('Failed to load feature templates', 'error');
        }
    } catch (error) {
        console.error('Error loading feature templates:', error);
        showToast('Failed to load feature templates', 'error');
    } finally {
        loadingState.style.display = 'none';
    }
}

// Render category filters
function renderCategoryFilters() {
    const filtersContainer = document.getElementById('categoryFilters');

    let html = '<button class="filter-chip active" data-category="all" onclick="filterByCategory(\'all\')">All</button>';

    Object.keys(allCategories).forEach(catKey => {
        const category = allCategories[catKey];
        html += `
            <button class="filter-chip" data-category="${catKey}" onclick="filterByCategory('${catKey}')">
                ${category.label}
            </button>
        `;
    });

    filtersContainer.innerHTML = html;
}

// Filter by category
function filterByCategory(category) {
    currentFilter = category;

    // Update active button
    const buttons = document.querySelectorAll('.filter-chip');
    buttons.forEach(btn => {
        if (btn.dataset.category === category) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    renderFeatures();
}

// Filter features by search
function filterFeatures() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput.value.toLowerCase();

    const filtered = allFeatures.filter(feature => {
        const matchesSearch = feature.name.toLowerCase().includes(searchTerm) ||
                            feature.description.toLowerCase().includes(searchTerm) ||
                            feature.id.toLowerCase().includes(searchTerm);
        const matchesCategory = currentFilter === 'all' || feature.category === currentFilter;
        return matchesSearch && matchesCategory;
    });

    renderFeatures(filtered);
}

// Render features table
function renderFeatures(featuresToRender = null) {
    const tableBody = document.getElementById('featuresTableBody');
    const features = featuresToRender || allFeatures.filter(f =>
        currentFilter === 'all' || f.category === currentFilter
    );

    if (!tableBody) return;

    // Sort by creation time (newest first)
    features.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA; // Descending order (newest first)
    });

    if (features.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 3rem; color: #6b7280;">No features found matching your criteria</td></tr>';
        return;
    }

    const html = features.map(feature => {
        const category = allCategories[feature.category] || {};
        const fieldCount = Object.keys(feature.fields || {}).length;
        const catClass = `cat-${feature.category}`;
        const lastUpdated = feature.updatedAt ? new Date(feature.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';

        return `
            <tr>
                <td>
                    <input type="checkbox" class="row-checkbox" data-id="${feature.id}">
                </td>
                <td>
                    <div class="table-feature-name">
                        <div class="feature-icon-small">${category.icon || '📦'}</div>
                        <div class="feature-name-text">
                            <strong>${escapeHtml(feature.name)}</strong>
                            <small>${escapeHtml(feature.id)}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="category-badge ${catClass}">
                        ${category.icon || ''} ${category.label || feature.category}
                    </span>
                </td>
                <td>
                    <strong>${fieldCount}</strong> field${fieldCount !== 1 ? 's' : ''}
                </td>
                <td>
                    <span class="status-badge status-active">
                        <span class="status-dot"></span>
                        Active
                    </span>
                </td>
                <td>${lastUpdated}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn-table-action" onclick="editFeature('${feature.id}')">Edit</button>
                        <button class="btn-table-action btn-delete" onclick="openDeleteModal('${feature.id}')">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    tableBody.innerHTML = html;
}

// Update stats
function updateStats() {
    // Total templates
    const totalCount = allFeatures.length;
    document.getElementById('totalCount').textContent = totalCount;

    // Categories
    const categoryCount = Object.keys(allCategories).length;
    document.getElementById('categoryCount').textContent = categoryCount;

    // Active features (assuming all are active for now)
    const activeCount = totalCount;
    const activeCountEl = document.getElementById('activeCount');
    if (activeCountEl) activeCountEl.textContent = activeCount;

    // Total fields across all features
    const totalFields = allFeatures.reduce((sum, feature) => {
        return sum + Object.keys(feature.fields || {}).length;
    }, 0);
    const fieldsCountEl = document.getElementById('fieldsCount');
    if (fieldsCountEl) fieldsCountEl.textContent = totalFields;
}

// Open add feature modal (now redirects to new page)
function openAddFeatureModal() {
    window.location.href = '/feature-templates/new';
}

// Add Feature Button Handler
document.getElementById('addFeatureBtn').addEventListener('click', openAddFeatureModal);

// Edit feature (now redirects to new page)
function editFeature(featureId) {
    window.location.href = `/feature-templates/${featureId}/edit`;
}

// Load categories dropdown
function loadCategoriesDropdown() {
    const categorySelect = document.getElementById('featureCategory');

    let html = '<option value="">Select a category...</option>';
    Object.keys(allCategories).forEach(catKey => {
        const category = allCategories[catKey];
        html += `<option value="${catKey}">${category.label}</option>`;
    });

    categorySelect.innerHTML = html;
}

// Render fields list
function renderFieldsList() {
    const fieldsList = document.getElementById('fieldsList');

    if (Object.keys(currentFields).length === 0) {
        fieldsList.innerHTML = '<div class="no-fields">No fields defined yet. Click "Add Field" to create one.</div>';
        return;
    }

    const html = Object.entries(currentFields).map(([fieldKey, field]) => {
        const typeColor = {
            'api': '#2196F3',
            'static': '#4CAF50',
            'dynamic': '#FF9800',
            'conditional': '#9C27B0'
        }[field.type] || '#666';

        // Build additional info sections
        let additionalInfo = '';

        if (field.htmlType) {
            additionalInfo += `<div class="field-default">HTML Type: <code>${escapeHtml(field.htmlType)}</code></div>`;
        }

        // Show conditional expression for conditional type
        if (field.type === 'conditional' && field.conditionalExpression) {
            additionalInfo += `<div class="field-default">Condition: <code>${escapeHtml(field.conditionalExpression)}</code></div>`;
        }

        if (field.possibleValues && field.possibleValues.length > 0) {
            const values = field.possibleValues.map(v => escapeHtml(v)).join(', ');
            additionalInfo += `<div class="field-default">Possible Values: <code>${values}</code></div>`;
        }

        if (field.multipleValueAllowed) {
            additionalInfo += `<div class="field-default">✓ Multiple values allowed</div>`;
        }

        if (field.default !== undefined) {
            additionalInfo += `<div class="field-default">Default: <code>${escapeHtml(String(field.default))}</code></div>`;
        }

        return `
            <div class="field-item">
                <div class="field-info">
                    <div class="field-header">
                        <strong>${escapeHtml(field.label || fieldKey)}</strong>
                        ${field.required ? '<span class="required-badge">Required</span>' : ''}
                    </div>
                    <div class="field-meta">
                        <span class="field-type-badge" style="background-color: ${typeColor}">
                            ${field.type}
                        </span>
                        ${field.fieldType ? `<span class="field-data-type">${field.fieldType}</span>` : ''}
                    </div>
                    ${field.description ? `<div class="field-description">${escapeHtml(field.description)}</div>` : ''}
                    ${additionalInfo}
                </div>
                <div class="field-actions">
                    <button type="button" class="btn-secondary btn-sm" onclick="editField('${fieldKey}')">Edit</button>
                    <button type="button" class="btn-danger btn-sm" onclick="removeField('${fieldKey}')">Remove</button>
                </div>
            </div>
        `;
    }).join('');

    fieldsList.innerHTML = html;
}

// Open add field modal
function openAddFieldModal() {
    editingFieldKey = null;
    currentPossibleValues = [];

    document.getElementById('fieldModalTitle').textContent = 'Add Field';
    document.getElementById('saveFieldButtonText').textContent = 'Add Field';
    document.getElementById('fieldForm').reset();
    document.getElementById('fieldKey').disabled = false;

    // Hide all conditional groups
    document.getElementById('dataTypeGroup').style.display = 'none';
    document.getElementById('defaultValueGroup').style.display = 'none';
    document.getElementById('htmlTypeGroup').style.display = 'none';
    document.getElementById('possibleValuesGroup').style.display = 'none';
    document.getElementById('multipleValueGroup').style.display = 'none';
    document.getElementById('conditionalExpressionGroup').style.display = 'none';
    document.getElementById('apiEndpointGroup').style.display = 'none';
    document.getElementById('apiMethodGroup').style.display = 'none';

    renderPossibleValues();

    document.getElementById('addFieldModal').classList.add('show');
}

// Edit field
function editField(fieldKey) {
    console.log('Editing field:', fieldKey);
    editingFieldKey = fieldKey;
    const field = currentFields[fieldKey];
    console.log('Field data:', field);

    document.getElementById('fieldModalTitle').textContent = 'Edit Field';
    document.getElementById('saveFieldButtonText').textContent = 'Update Field';

    // Clear and populate field values
    document.getElementById('fieldKey').value = fieldKey;
    document.getElementById('fieldKey').disabled = true;
    document.getElementById('fieldLabel').value = field.label || '';
    document.getElementById('fieldDescription').value = field.description || '';
    document.getElementById('fieldRequired').checked = field.required || false;
    document.getElementById('fieldDefault').value = field.default !== undefined ? field.default : '';

    // Set field type and trigger change
    document.getElementById('fieldType').value = field.type || '';
    document.getElementById('fieldDataType').value = field.fieldType || '';
    document.getElementById('fieldHtmlType').value = field.htmlType || '';

    // Set conditional expression
    document.getElementById('conditionalExpression').value = field.conditionalExpression || '';

    // Set checkbox states
    document.getElementById('fieldMultipleValue').checked = field.multipleValueAllowed || false;

    // Set possible values
    currentPossibleValues = field.possibleValues ? [...field.possibleValues] : [];
    renderPossibleValues();

    // Manually show/hide groups based on field type
    console.log('Field type:', field.type);
    console.log('HTML type:', field.htmlType);

    handleFieldTypeChange();
    handleHtmlTypeChange();

    // Open modal
    document.getElementById('addFieldModal').classList.add('show');
    console.log('Modal opened');
}

// Handle field type change
function handleFieldTypeChange() {
    const fieldType = document.getElementById('fieldType').value;
    const dataTypeGroup = document.getElementById('dataTypeGroup');
    const htmlTypeGroup = document.getElementById('htmlTypeGroup');
    const defaultValueGroup = document.getElementById('defaultValueGroup');
    const conditionalExpressionGroup = document.getElementById('conditionalExpressionGroup');
    const apiEndpointGroup = document.getElementById('apiEndpointGroup');
    const apiMethodGroup = document.getElementById('apiMethodGroup');
    const fieldTypeHelp = document.getElementById('fieldTypeHelp');

    // Hide all conditional groups first
    conditionalExpressionGroup.style.display = 'none';
    apiEndpointGroup.style.display = 'none';
    apiMethodGroup.style.display = 'none';

    if (fieldType === 'api') {
        // API type: Only show dataType and htmlType (API details will be configured during integration mapping)
        dataTypeGroup.style.display = 'block';
        htmlTypeGroup.style.display = 'block';
        defaultValueGroup.style.display = 'none';
        fieldTypeHelp.textContent = 'API Configuration - API details will be configured when mapping to integration';
    } else if (fieldType === 'static') {
        dataTypeGroup.style.display = 'block';
        htmlTypeGroup.style.display = 'block';
        defaultValueGroup.style.display = 'block';
        fieldTypeHelp.textContent = 'Value configured once during feature activation';
    } else if (fieldType === 'dynamic') {
        dataTypeGroup.style.display = 'block';
        htmlTypeGroup.style.display = 'block';
        defaultValueGroup.style.display = 'none';
        fieldTypeHelp.textContent = 'Value provided at runtime during workflow execution';
    } else if (fieldType === 'conditional') {
        // Conditional type: Show conditional expression builder
        dataTypeGroup.style.display = 'block';
        htmlTypeGroup.style.display = 'block';
        defaultValueGroup.style.display = 'none';
        conditionalExpressionGroup.style.display = 'block';
        fieldTypeHelp.textContent = 'Value depends on a conditional expression';
    } else {
        dataTypeGroup.style.display = 'none';
        htmlTypeGroup.style.display = 'none';
        defaultValueGroup.style.display = 'none';
        fieldTypeHelp.textContent = '';
    }
}

// Extract field names from conditional expression
function extractFieldNamesFromExpression(expression) {
    // Match all {{field_name}} patterns
    const regex = /\{\{([a-z0-9_]+)\}\}/gi;
    const matches = [];
    let match;

    while ((match = regex.exec(expression)) !== null) {
        // match[1] contains the field name without {{}}
        matches.push(match[1]);
    }

    // Return unique field names
    return [...new Set(matches)];
}

// Validate conditional expression field references
function validateConditionalExpression(expression, currentFieldKey) {
    // Extract all field names referenced in the expression
    const referencedFields = extractFieldNamesFromExpression(expression);

    if (referencedFields.length === 0) {
        return {
            valid: false,
            error: 'No fields referenced in expression. Use {{field_name}} syntax to reference fields.'
        };
    }

    // Check if each referenced field exists (excluding the current field being edited)
    const invalidFields = [];

    for (const fieldName of referencedFields) {
        // Skip if it's the current field (can't reference itself)
        if (fieldName === currentFieldKey) {
            invalidFields.push(fieldName);
            continue;
        }

        // Check if field exists in currentFields
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

// Save field
function saveField() {
    const fieldKey = document.getElementById('fieldKey').value.trim();
    const fieldLabel = document.getElementById('fieldLabel').value.trim();
    const fieldType = document.getElementById('fieldType').value;
    const fieldDataType = document.getElementById('fieldDataType').value;
    const fieldHtmlType = document.getElementById('fieldHtmlType').value;
    const fieldRequired = document.getElementById('fieldRequired').checked;
    const fieldMultipleValue = document.getElementById('fieldMultipleValue').checked;
    const fieldDefault = document.getElementById('fieldDefault').value.trim();
    const fieldDescription = document.getElementById('fieldDescription').value.trim();
    const conditionalExpression = document.getElementById('conditionalExpression').value.trim();

    // Validation
    if (!fieldKey || !fieldLabel || !fieldType) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    if (!/^[a-z0-9_]+$/.test(fieldKey)) {
        showToast('Field key must be lowercase letters, numbers, and underscores only', 'error');
        return;
    }

    // Validate dataType and htmlType (required for all types now)
    if (!fieldDataType) {
        showToast('Please select a data type', 'error');
        return;
    }

    if (!fieldHtmlType) {
        showToast('Please select an HTML input type', 'error');
        return;
    }

    // Validate conditional expression
    if (fieldType === 'conditional') {
        if (!conditionalExpression) {
            showToast('Please enter a conditional expression', 'error');
            return;
        }

        // Validate that all referenced fields exist
        const validation = validateConditionalExpression(conditionalExpression, fieldKey);
        if (!validation.valid) {
            showToast(validation.error, 'error');
            return;
        }
    }

    // Validate possible values for select/checkbox/radio
    if (fieldHtmlType && (fieldHtmlType === 'select' || fieldHtmlType === 'checkbox' || fieldHtmlType === 'radio')) {
        if (currentPossibleValues.length === 0) {
            showToast('Please add at least one possible value', 'error');
            return;
        }
    }

    // Check for duplicate key
    if (!editingFieldKey && currentFields[fieldKey]) {
        showToast('A field with this key already exists', 'error');
        return;
    }

    // If editing and key changed, delete old key
    if (editingFieldKey && editingFieldKey !== fieldKey) {
        delete currentFields[editingFieldKey];
    }

    // Build field object
    const fieldObj = {
        type: fieldType,
        label: fieldLabel,
        required: fieldRequired,
        description: fieldDescription,
        fieldType: fieldDataType,
        htmlType: fieldHtmlType
    };

    // Add conditional expression for conditional type
    if (fieldType === 'conditional') {
        fieldObj.conditionalExpression = conditionalExpression;
    }

    // Note: API configuration details (endpoint, method) will be provided during integration mapping
    // So we don't save them here for 'api' type

    // Add possible values if applicable
    if (fieldHtmlType === 'select' || fieldHtmlType === 'checkbox' || fieldHtmlType === 'radio') {
        fieldObj.possibleValues = [...currentPossibleValues];

        // Add multipleValueAllowed for select and checkbox
        if (fieldHtmlType === 'select' || fieldHtmlType === 'checkbox') {
            fieldObj.multipleValueAllowed = fieldMultipleValue;
        }
    }

    if (fieldType === 'static' && fieldDefault) {
        // Convert default value to appropriate type
        if (fieldDataType === 'number') {
            fieldObj.default = Number(fieldDefault);
        } else if (fieldDataType === 'boolean') {
            fieldObj.default = fieldDefault === 'true';
        } else {
            fieldObj.default = fieldDefault;
        }
    }

    currentFields[fieldKey] = fieldObj;

    renderFieldsList();
    closeAddFieldModal();
    showToast(`Field ${editingFieldKey ? 'updated' : 'added'} successfully`, 'success');
}

// Remove field
function removeField(fieldKey) {
    if (confirm(`Are you sure you want to remove the field "${fieldKey}"?`)) {
        delete currentFields[fieldKey];
        renderFieldsList();
        showToast('Field removed successfully', 'success');
    }
}

// Save feature
async function saveFeature() {
    const featureId = document.getElementById('featureId').value.trim();
    const featureName = document.getElementById('featureName').value.trim();
    const featureDescription = document.getElementById('featureDescription').value.trim();
    const featureCategory = document.getElementById('featureCategory').value;

    // Validation
    if (!featureId || !featureName || !featureCategory) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    if (!/^[a-z0-9_]+$/.test(featureId)) {
        showToast('Feature ID must be lowercase letters, numbers, and underscores only', 'error');
        return;
    }

    const saveBtn = document.getElementById('saveFeatureBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = isEditMode ? 'Updating...' : 'Saving...';

    try {
        const featureData = {
            id: featureId,
            name: featureName,
            description: featureDescription,
            category: featureCategory,
            fields: currentFields
        };

        const url = isEditMode ? `/api/feature-templates/${editingFeatureId}` : '/api/feature-templates';
        const method = isEditMode ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(featureData)
        });

        const data = await response.json();

        if (data.success) {
            showToast(isEditMode ? 'Feature template updated successfully' : 'Feature template created successfully', 'success');
            closeFeatureModal();
            loadFeatureTemplates();
        } else {
            showToast(data.error || 'Failed to save feature template', 'error');
        }
    } catch (error) {
        console.error('Error saving feature template:', error);
        showToast('Failed to save feature template', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = isEditMode ? 'Update Feature Template' : 'Save Feature Template';
    }
}

// Open delete modal
function openDeleteModal(featureId) {
    featureToDelete = featureId;
    document.getElementById('deleteModal').classList.add('show');
}

// Confirm delete
async function confirmDelete() {
    if (!featureToDelete) return;

    try {
        const response = await fetch(`/api/feature-templates/${featureToDelete}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            showToast('Feature template deleted successfully', 'success');
            closeDeleteModal();
            loadFeatureTemplates();
        } else {
            showToast(data.error || 'Failed to delete feature template', 'error');
        }
    } catch (error) {
        console.error('Error deleting feature template:', error);
        showToast('Failed to delete feature template', 'error');
    }
}

// Close modals
function closeFeatureModal() {
    document.getElementById('featureModal').classList.remove('show');
}

function closeAddFieldModal() {
    document.getElementById('addFieldModal').classList.remove('show');
}

function closeDeleteModal() {
    featureToDelete = null;
    document.getElementById('deleteModal').classList.remove('show');
}

// Close modal on outside click
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('show');
    }
});

// Toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast toast-${type} show`;
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Toggle sidebar (for mobile)
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('show');
    }
}

// Handle HTML type change
function handleHtmlTypeChange() {
    const htmlType = document.getElementById('fieldHtmlType').value;
    const possibleValuesGroup = document.getElementById('possibleValuesGroup');
    const multipleValueGroup = document.getElementById('multipleValueGroup');

    // Show possible values for select, checkbox, radio
    if (htmlType === 'select' || htmlType === 'checkbox' || htmlType === 'radio') {
        possibleValuesGroup.style.display = 'block';
    } else {
        possibleValuesGroup.style.display = 'none';
        currentPossibleValues = [];
        renderPossibleValues();
    }

    // Show multiple value option for select and checkbox
    if (htmlType === 'select' || htmlType === 'checkbox') {
        multipleValueGroup.style.display = 'block';
    } else {
        multipleValueGroup.style.display = 'none';
    }
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
        showToast('This value already exists', 'error');
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

// Render possible values list
function renderPossibleValues() {
    const list = document.getElementById('possibleValuesList');

    if (currentPossibleValues.length === 0) {
        list.innerHTML = '';
        return;
    }

    const html = currentPossibleValues.map((value, index) => `
        <div class="value-item">
            <span class="value-item-text">${escapeHtml(value)}</span>
            <button type="button" class="value-item-remove" onclick="removePossibleValue(${index})">Remove</button>
        </div>
    `).join('');

    list.innerHTML = html;
}

// Allow Enter key to add possible value
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('possibleValuesInput');
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addPossibleValue();
            }
        });
    }
});
