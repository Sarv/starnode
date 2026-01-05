// Add Feature Wizard
// Manages 3-step wizard for creating features directly in integrations

// =====================================================
// STATE MANAGEMENT
// =====================================================

let wizardState = {
  currentStep: 1,
  totalSteps: 3,
  integrationId: null,
  integrationName: null,
  // Feature definition (Step 1)
  featureId: null,
  featureName: null,
  featureDescription: '',
  featureCategory: '',
  // Fields are stored in extraFields (Step 2)
  fieldMappings: {}, // kept for compatibility but will be empty for new features
  apiConfig: {
    apiConfigId: null,
    method: 'GET',
    endpoint: '',
  },
  extraFields: [], // This is now the primary field storage
  customHandlers_for_feature: null,
  isEditMode: false,
  editMappingId: null,
};

let customHandlersConfig = null;
let customHandlersConfig_for_feature = null;

// Auth data for template variable validation
let integrationAuthSchema = null;
let authTypesDefinition = null;
let validFieldNames = [];

// =====================================================
// INITIALIZATION
// =====================================================

document.addEventListener('DOMContentLoaded', async () => {
  // Get integration ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  wizardState.integrationId = urlParams.get('integrationId');
  wizardState.editMappingId = urlParams.get('mappingId');
  wizardState.isEditMode = !!wizardState.editMappingId;

  if (!wizardState.integrationId) {
    showToast('Integration ID is required', 'error');
    window.location.href = '/integrations';
    return;
  }

  // Load custom handlers config
  await loadCustomHandlers();

  // Load integration details
  await loadIntegrationDetails();

  // Load category scopes for the dropdown
  await loadCategoryScopes();

  // If edit mode, load existing feature
  if (wizardState.editMappingId) {
    await loadExistingFeature();
  }

  // Initialize event listeners
  initializeEventListeners();

  // Initialize collapsible sections
  initializeCollapsibles();

  // Initialize Step 2 with empty state
  renderFieldsList();
});

// =====================================================
// DATA LOADING
// =====================================================

async function loadCustomHandlers() {
  try {
    // Load field-level custom handlers
    const response = await fetch('/api/panel-config/custom-handlers');
    if (response.ok) {
      customHandlersConfig = await response.json();
    } else {
      console.error('Failed to load custom handlers config');
      customHandlersConfig = {}; // Fallback to empty object
    }

    // Load feature-level custom handlers
    const response2 = await fetch(
      '/api/panel-config/custom-handlers-for-feature',
    );
    if (response2.ok) {
      customHandlersConfig_for_feature = await response2.json();
    } else {
      console.warn('Failed to load feature-level handlers config');
      customHandlersConfig_for_feature = {}; // Fallback to empty object
    }
  } catch (error) {
    console.error('Error loading custom handlers:', error);
    customHandlersConfig = {}; // Fallback to empty object
    customHandlersConfig_for_feature = {}; // Fallback to empty object
  }
}

async function loadIntegrationDetails() {
  try {
    // Load integration details, auth schema, and auth types definition in parallel
    const [integrationResponse, authSchemaResponse, authTypesResponse] =
      await Promise.all([
        fetch(`/api/integrations/${wizardState.integrationId}`),
        fetch(`/api/integrations/${wizardState.integrationId}/auth-schema`),
        fetch(`/api/auth-types`),
      ]);

    const data = await integrationResponse.json();

    if (integrationResponse.ok && data) {
      wizardState.integrationName = data.displayName;
      document.getElementById(
        'wizardTitle',
      ).textContent = `Add Feature to ${data.displayName}`;
      document.getElementById('integrationNameLink').textContent =
        data.displayName;
      document.getElementById(
        'integrationNameLink',
      ).href = `/integration-detail/${wizardState.integrationId}`;
    }

    // Load auth schema for template variable validation
    if (authSchemaResponse.ok) {
      const authSchemaData = await authSchemaResponse.json();
      integrationAuthSchema = authSchemaData.authSchema;
    } else {
      console.warn('Failed to load auth schema');
    }

    // Load auth types definition for template variable validation
    if (authTypesResponse.ok) {
      authTypesDefinition = await authTypesResponse.json();
    } else {
      console.warn('Failed to load auth types definition');
    }
  } catch (error) {
    console.error('Error loading integration:', error);
    showToast('Failed to load integration details', 'error');
  }
}

async function loadFeatureTemplates() {
  try {
    const response = await fetch('/api/feature-templates');
    const data = await response.json();

    if (response.ok && data.success) {
      allFeatures = data.features || [];
      renderFeaturesList();
    } else {
      showToast('Failed to load feature templates', 'error');
    }
  } catch (error) {
    console.error('Error loading features:', error);
    showToast('Failed to load feature templates', 'error');
  }
}

async function loadCategoryScopes() {
  try {
    const response = await fetch('/api/canonical/scopes');
    const data = await response.json();

    if (response.ok && data.scopes) {
      const categorySelect = document.getElementById('featureCategory');
      if (categorySelect) {
        // Keep the default option
        categorySelect.innerHTML =
          '<option value="">Select category...</option>';

        // Add scopes as options
        data.scopes.forEach(scope => {
          const option = document.createElement('option');
          option.value = scope.id;
          option.textContent = scope.label;
          categorySelect.appendChild(option);
        });
      }
    }
  } catch (error) {
    console.error('Error loading category scopes:', error);
  }
}

async function loadExistingMapping() {
  try {
    const response = await fetch(
      `/api/integrations/${wizardState.integrationId}/feature-mappings/${wizardState.editMappingId}`,
    );
    const data = await response.json();

    if (response.ok && data.success) {
      const mapping = data.mapping;

      // Find the full feature template data
      const fullFeature = allFeatures.find(
        f => f.id === mapping.featureTemplateId,
      );

      // Populate wizard state with existing data
      wizardState.selectedFeature = fullFeature || {
        id: mapping.featureTemplateId,
        name: mapping.featureTemplateName,
        description: '',
        category: '',
        fields: {},
      };
      wizardState.fieldMappings = mapping.fieldMappings || {};
      wizardState.apiConfig = mapping.apiConfig || wizardState.apiConfig;
      wizardState.extraFields = mapping.extraFields || [];
      wizardState.customHandlers_for_feature =
        mapping.customHandlers_for_feature || null;

      // Update UI elements
      document.getElementById(
        'wizardTitle',
      ).textContent = `Edit Feature Mapping: ${mapping.featureTemplateName}`;

      // Update valid field names for template variable validation
      validFieldNames = collectAllValidFields();

      // Render all steps to show the loaded data
      renderFeaturesList(); // Step 1: Highlight selected feature
      renderTemplateFields(); // Step 2: Show template fields
      populateApiConfig(); // Step 3: Populate API config
      renderExtraFields(); // Step 4: Show extra fields
      renderReview(); // Step 5: Update review

      showToast('Loaded existing mapping for editing', 'success');
    }
  } catch (error) {
    console.error('Error loading existing mapping:', error);
    showToast('Failed to load existing mapping', 'error');
  }
}

// =====================================================
// EVENT LISTENERS
// =====================================================

function initializeEventListeners() {
  // Navigation buttons
  document.getElementById('prevBtn').addEventListener('click', previousStep);
  document.getElementById('nextBtn').addEventListener('click', nextStep);
  document.getElementById('saveBtn').addEventListener('click', saveFeature);
  document.getElementById('cancelBtn').addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    cancelWizard();
  });

  // Step 1: Feature definition - auto-generate ID from name
  const featureNameInput = document.getElementById('featureName');
  const featureIdInput = document.getElementById('featureId');
  if (featureNameInput && featureIdInput) {
    featureNameInput.addEventListener('input', e => {
      wizardState.featureName = e.target.value;
      // Auto-generate ID if not manually edited
      if (!featureIdInput.dataset.manuallyEdited) {
        const autoId = e.target.value
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, '_')
          .substring(0, 50);
        featureIdInput.value = autoId;
        wizardState.featureId = autoId;
      }
    });
    featureIdInput.addEventListener('input', e => {
      featureIdInput.dataset.manuallyEdited = 'true';
      wizardState.featureId = e.target.value;
    });
  }

  const featureDescInput = document.getElementById('featureDescription');
  if (featureDescInput) {
    featureDescInput.addEventListener('input', e => {
      wizardState.featureDescription = e.target.value;
    });
  }

  const featureCategoryInput = document.getElementById('featureCategory');
  if (featureCategoryInput) {
    featureCategoryInput.addEventListener('change', e => {
      wizardState.featureCategory = e.target.value;
    });
  }

  // Step 2: Add field button (reusing extra field modal)
  const addFieldBtn = document.getElementById('addExtraFieldBtn');
  if (addFieldBtn) {
    addFieldBtn.addEventListener('click', () => openExtraFieldModal());
  }

  // Extra field modal
  document
    .getElementById('saveExtraFieldBtn')
    .addEventListener('click', saveExtraField);
  document
    .getElementById('addPossibleValueBtn')
    .addEventListener('click', addPossibleValueRow);
  document
    .getElementById('extraFieldHtmlType')
    .addEventListener('change', togglePossibleValues);

  // Field config modal
  const saveFieldConfigBtn = document.getElementById('saveFieldConfigBtn');
  if (saveFieldConfigBtn) {
    saveFieldConfigBtn.addEventListener('click', saveFieldConfig);
  }
}

function initializeCollapsibles() {
  document.querySelectorAll('.collapsible-header').forEach(header => {
    header.addEventListener('click', () => {
      const parent = header.parentElement;
      parent.classList.toggle('open');
    });
  });
}

// =====================================================
// STEP NAVIGATION
// =====================================================

// Helper function to check if feature has API-type fields
function featureHasApiConfig() {
  // Check if any extra field has type "api"
  return wizardState.extraFields.some(field => field.type === 'api');
}

// =====================================================
// STEP 2: ADD FIELDS (using extraFields as primary storage)
// =====================================================

/**
 * Render the fields list for Step 2
 * Uses extraFields as the primary field storage
 */
function renderFieldsList() {
  const container = document.getElementById('templateFieldsList');
  if (!container) return;

  const fields = wizardState.extraFields || [];

  if (fields.length === 0) {
    container.innerHTML = `
            <div class="extra-fields-section">
                <div class="section-header">
                    <h3>Fields <span id="fieldsCount">(0)</span></h3>
                    <button class="btn-primary" id="addFieldBtnStep2" onclick="openExtraFieldModal()">+ Add Field</button>
                </div>
                <div class="empty-state">
                    <p>No fields added yet. Add fields to define the data this feature will collect or use.</p>
                </div>
            </div>
        `;
    return;
  }

  container.innerHTML = `
        ${renderFeatureHandlers()}
        <div class="extra-fields-section">
            <div class="section-header">
                <h3>Fields (${fields.length})</h3>
                <button class="btn-primary" id="addFieldBtnStep2" onclick="openExtraFieldModal()">+ Add Field</button>
            </div>
            <div class="fields-table-wrapper">
                <table class="modern-fields-table">
                    <thead>
                        <tr>
                            <th class="field-detail-col">FIELD DETAILS</th>
                            ${renderHandlerHeaders()}
                            <th class="value-col">VALUE</th>
                            <th class="action-col">ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${fields
                          .map((field, index) => {
                            const handlers = field.customHandlers || {};
                            const displayValue =
                              field.adminValue !== null &&
                              field.adminValue !== undefined
                                ? Array.isArray(field.adminValue)
                                  ? field.adminValue.join(', ')
                                  : field.adminValue
                                : '-';

                            return `
                                <tr>
                                    <td class="field-detail-cell">
                                        <div class="field-detail-content">
                                            <div class="field-name-row">
                                                <span class="field-name-text">${escapeHtml(
                                                  field.label || field.fieldKey,
                                                )}</span>
                                                ${
                                                  field.required
                                                    ? '<span class="field-req-badge">REQ</span>'
                                                    : ''
                                                }
                                            </div>
                                            <p class="field-description-text">${escapeHtml(
                                              field.description ||
                                                'No description',
                                            )}</p>
                                            <div class="field-meta-grid">
                                                <div class="field-meta-item">
                                                    <span class="field-meta-value">${
                                                      field.type || 'static'
                                                    }</span>
                                                </div>
                                                <div class="field-meta-item">
                                                    <span class="field-meta-value">${
                                                      field.fieldType ||
                                                      'string'
                                                    }</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    ${renderHandlerCells(handlers)}
                                    <td class="value-cell">
                                        ${
                                          field.fillBy === 'Admin'
                                            ? displayValue !== '-'
                                              ? `<span class="value-text">${displayValue}</span>`
                                              : '<span class="empty-cell">Not set</span>'
                                            : '<span class="empty-cell">User fills</span>'
                                        }
                                    </td>
                                    <td class="action-cell" style="text-align: center;">
                                        <button class="btn-icon" onclick="openExtraFieldModal(${index})" title="Edit field">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                            </svg>
                                        </button>
                                        <button class="btn-icon btn-danger" onclick="deleteExtraField(${index})" title="Delete field">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
                                                <polyline points="3 6 5 6 21 6"/>
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            `;
                          })
                          .join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// =====================================================
// LOAD EXISTING FEATURE (for edit mode)
// =====================================================

async function loadExistingFeature() {
  try {
    const response = await fetch(
      `/api/integrations/${wizardState.integrationId}/feature-mappings/${wizardState.editMappingId}`,
    );
    const data = await response.json();

    if (response.ok && data.success) {
      const mapping = data.mapping;

      // Populate wizard state with existing data
      wizardState.featureId = mapping.featureTemplateId;
      wizardState.featureName = mapping.featureTemplateName;
      wizardState.featureDescription = mapping.description || '';
      wizardState.featureCategory = mapping.category || '';
      wizardState.apiConfig = mapping.apiConfig || wizardState.apiConfig;
      wizardState.extraFields = mapping.extraFields || [];
      wizardState.customHandlers_for_feature =
        mapping.customHandlers_for_feature || null;

      // Populate form fields
      const nameInput = document.getElementById('featureName');
      const idInput = document.getElementById('featureId');
      const descInput = document.getElementById('featureDescription');
      const categoryInput = document.getElementById('featureCategory');

      if (nameInput) nameInput.value = wizardState.featureName;
      if (idInput) {
        idInput.value = wizardState.featureId;
        idInput.dataset.manuallyEdited = 'true'; // Prevent auto-generation
      }
      if (descInput) descInput.value = wizardState.featureDescription;
      if (categoryInput) categoryInput.value = wizardState.featureCategory;

      // Update UI elements
      document.getElementById(
        'wizardTitle',
      ).textContent = `Edit Feature: ${mapping.featureTemplateName}`;

      // Update valid field names for template variable validation
      validFieldNames = collectAllValidFields();

      // Render Step 2
      renderFieldsList();

      showToast('Loaded existing feature for editing', 'success');
    }
  } catch (error) {
    console.error('Error loading existing feature:', error);
    showToast('Failed to load existing feature', 'error');
  }
}

// =====================================================
// SAVE FEATURE
// =====================================================

async function saveFeature() {
  try {
    // Collect feature-level handlers
    let featureHandlers = null;
    try {
      featureHandlers = collectFeatureHandlers();
    } catch (handlerError) {
      showToast(handlerError.message, 'error');
      return;
    }

    // Build the feature data (using same format as featureMappings for compatibility)
    const featureData = {
      id: wizardState.isEditMode
        ? wizardState.editMappingId
        : `feature_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      featureTemplateId: wizardState.featureId,
      featureTemplateName: wizardState.featureName,
      description: wizardState.featureDescription,
      category: wizardState.featureCategory,
      fieldMappings: {}, // Empty for direct feature creation
      apiConfig: wizardState.apiConfig,
      extraFields: wizardState.extraFields,
      customHandlers: {},
      customHandlers_for_feature: featureHandlers,
      status: 'active',
      createdAt: wizardState.isEditMode ? undefined : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Determine API endpoint and method
    const url = wizardState.isEditMode
      ? `/api/integrations/${wizardState.integrationId}/feature-mappings/${wizardState.editMappingId}`
      : `/api/integrations/${wizardState.integrationId}/feature-mappings`;

    const method = wizardState.isEditMode ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(featureData),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      showToast(
        wizardState.isEditMode
          ? 'Feature updated successfully!'
          : 'Feature created successfully!',
        'success',
      );
      // Redirect back to integration detail page
      setTimeout(() => {
        window.location.href = `/integration-detail/${wizardState.integrationId}`;
      }, 1000);
    } else {
      throw new Error(result.message || 'Failed to save feature');
    }
  } catch (error) {
    console.error('Error saving feature:', error);
    showToast(error.message || 'Failed to save feature', 'error');
  }
}

function nextStep() {
  // Validate current step before proceeding
  if (!validateCurrentStep()) {
    return;
  }

  if (wizardState.currentStep < wizardState.totalSteps) {
    wizardState.currentStep++;
    updateWizardUI();

    // Load step-specific data
    if (wizardState.currentStep === 2) {
      renderFieldsList();
    } else if (wizardState.currentStep === 3) {
      renderReview();
    }
  }
}

function previousStep() {
  if (wizardState.currentStep > 1) {
    wizardState.currentStep--;
    updateWizardUI();

    // Re-render step if needed
    if (wizardState.currentStep === 2) {
      renderFieldsList();
    }
  }
}

function goToStep(stepNumber) {
  wizardState.currentStep = stepNumber;
  updateWizardUI();

  // Load step-specific data
  if (stepNumber === 2) {
    renderTemplateFields();
  } else if (stepNumber === 3) {
    populateApiConfig();
  } else if (stepNumber === 4) {
    renderExtraFields();
  } else if (stepNumber === 5) {
    populateSubmitHandler();
  } else if (stepNumber === 6) {
    renderReview();
  }
}

function updateWizardUI() {
  // Update step visibility
  document.querySelectorAll('.wizard-step').forEach((step, index) => {
    step.classList.toggle('active', index + 1 === wizardState.currentStep);
  });

  // Update progress bar
  document.querySelectorAll('.progress-step').forEach((step, index) => {
    const stepNum = index + 1;

    // Check if Step 3 (API Config) should be skipped
    const isStep3Skipped = stepNum === 3 && !featureHasApiConfig();

    if (isStep3Skipped) {
      // Mark Step 3 as skipped (greyed out)
      step.classList.add('skipped');
      step.classList.remove('active', 'completed');
    } else if (stepNum < wizardState.currentStep) {
      step.classList.add('completed');
      step.classList.remove('active', 'skipped');
    } else if (stepNum === wizardState.currentStep) {
      step.classList.add('active');
      step.classList.remove('completed', 'skipped');
    } else {
      step.classList.remove('active', 'completed', 'skipped');
    }
  });

  // Update navigation buttons
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const saveBtn = document.getElementById('saveBtn');

  prevBtn.style.display = wizardState.currentStep > 1 ? 'block' : 'none';

  if (wizardState.currentStep === wizardState.totalSteps) {
    nextBtn.style.display = 'none';
    saveBtn.style.display = 'block';
  } else {
    nextBtn.style.display = 'block';
    saveBtn.style.display = 'none';

    // Update next button text
    const nextStepLabels = ['Next: Add Fields', 'Next: Review & Save'];
    nextBtn.textContent = nextStepLabels[wizardState.currentStep - 1] || 'Next';
  }

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validateCurrentStep() {
  switch (wizardState.currentStep) {
    case 1:
      // Validate feature name and ID
      const featureName = document.getElementById('featureName')?.value?.trim();
      const featureId = document.getElementById('featureId')?.value?.trim();

      if (!featureName) {
        showToast('Please enter a feature name', 'error');
        return false;
      }
      if (!featureId) {
        showToast('Please enter a feature ID', 'error');
        return false;
      }
      // Validate ID format
      if (!/^[a-z0-9_]+$/.test(featureId)) {
        showToast(
          'Feature ID can only contain lowercase letters, numbers, and underscores',
          'error',
        );
        return false;
      }
      // Store in state
      wizardState.featureName = featureName;
      wizardState.featureId = featureId;
      wizardState.featureDescription =
        document.getElementById('featureDescription')?.value || '';
      wizardState.featureCategory =
        document.getElementById('featureCategory')?.value || '';
      break;
    case 3:
      // API config validation (optional)
      break;
  }
  return true;
}

// =====================================================
// STEP 1: FEATURE SELECTION
// =====================================================

function renderFeaturesList() {
  const container = document.getElementById('featuresList');

  if (allFeatures.length === 0) {
    container.innerHTML =
      '<div class="empty-state">No feature templates available</div>';
    return;
  }

  const filteredFeatures = filterFeaturesBySearch();

  if (filteredFeatures.length === 0) {
    container.innerHTML =
      '<div class="empty-state">No features match your search</div>';
    return;
  }

  container.innerHTML = filteredFeatures
    .map(
      feature => `
        <div class="feature-card ${
          wizardState.selectedFeature?.id === feature.id ? 'selected' : ''
        }"
             onclick="selectFeature('${feature.id}')">
            <div class="feature-radio">
                <input type="radio" name="feature" value="${feature.id}"
                       ${
                         wizardState.selectedFeature?.id === feature.id
                           ? 'checked'
                           : ''
                       }>
            </div>
            <div class="feature-content">
                <h4>${escapeHtml(feature.name)}</h4>
                <p class="feature-meta">ID: ${feature.id} • Category: ${
        feature.category || 'Uncategorized'
      }</p>
                <p class="feature-description">${escapeHtml(
                  feature.description || '',
                )}</p>
                <p class="feature-stats">Fields: ${
                  Object.keys(feature.fields || {}).length
                }</p>
            </div>
        </div>
    `,
    )
    .join('');
}

function selectFeature(featureId) {
  const feature = allFeatures.find(f => f.id === featureId);
  if (feature) {
    wizardState.selectedFeature = {
      id: feature.id,
      name: feature.name,
      description: feature.description,
      category: feature.category,
      fields: feature.fields,
    };

    // Initialize field mappings
    wizardState.fieldMappings = {};
    Object.keys(feature.fields || {}).forEach(fieldKey => {
      wizardState.fieldMappings[fieldKey] = {
        enabled: true,
        customHandlers: null,
      };
    });

    // Update valid field names for template variable validation
    validFieldNames = collectAllValidFields();

    renderFeaturesList();
  }
}

function filterFeatures() {
  renderFeaturesList();
}

function filterFeaturesBySearch() {
  const searchTerm = document
    .getElementById('featureSearch')
    .value.toLowerCase();

  return allFeatures.filter(feature => {
    const matchesCategory =
      currentCategory === 'all' || feature.category === currentCategory;
    const matchesSearch =
      !searchTerm ||
      feature.name.toLowerCase().includes(searchTerm) ||
      feature.description?.toLowerCase().includes(searchTerm) ||
      feature.id.toLowerCase().includes(searchTerm);

    return matchesCategory && matchesSearch;
  });
}

// =====================================================
// STEP 2: CONFIGURE TEMPLATE FIELDS
// =====================================================

/**
 * Render feature-level custom handlers (e.g., submitHandler)
 * These handlers apply to the entire feature, not individual fields
 */
function renderFeatureHandlers() {
  console.log('renderFeatureHandlers called');
  console.log(
    'customHandlersConfig_for_feature:',
    customHandlersConfig_for_feature,
  );

  if (!customHandlersConfig_for_feature) {
    console.warn('customHandlersConfig_for_feature is null/undefined');
    return '';
  }

  // Sort handlers by order
  const sortedHandlers = Object.entries(customHandlersConfig_for_feature).sort(
    ([, a], [, b]) => a.order - b.order,
  );

  console.log('sortedHandlers:', sortedHandlers);

  let html =
    '<div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin-bottom: 24px;">';
  html +=
    '<h3 style="margin: 0 0 8px 0; color: #212529; font-size: 16px; font-weight: 600;">Feature-Level Custom Handlers</h3>';
  html +=
    '<p style="margin: 0 0 16px 0; color: #6c757d; font-size: 14px;">These handlers process the entire feature data before submission. Function names should match your custom handler implementations.</p>';
  html += '<div style="display: grid; gap: 16px;">';

  sortedHandlers.forEach(([key, config]) => {
    const value = wizardState.customHandlers_for_feature?.[key] || '';
    const inputId = `featureHandler_${key}`;

    html += `
            <div style="margin-bottom: 16px;">
                <label for="${inputId}" style="display: block; margin-bottom: 8px; color: #495057; font-size: 14px; font-weight: 500;">
                    ${
                      config.icon
                        ? `<span style="margin-right: 6px;">${config.icon}</span>`
                        : ''
                    }
                    ${config.label}
                </label>
                <input type="text"
                       id="${inputId}"
                       style="width: 100%; padding: 8px 12px; border: 1px solid #ced4da; border-radius: 4px; font-size: 14px;"
                       value="${escapeHtml(value)}"
                       placeholder="${config.placeholder || ''}">
                ${
                  config.helpText
                    ? `<small style="display: block; margin-top: 4px; color: #6c757d; font-size: 12px;">${config.helpText}</small>`
                    : ''
                }
            </div>
        `;
  });

  html += '</div></div>';
  return html;
}

/**
 * Collect feature-level custom handler values from inputs
 * Called before saving the mapping
 * @returns {object|null} Handler object or null if no handlers set
 */
function collectFeatureHandlers() {
  if (!customHandlersConfig_for_feature) {
    return null;
  }

  const handlers = {};
  const handlerRegex = /^[a-zA-Z0-9_]+$/;

  for (const [key, config] of Object.entries(
    customHandlersConfig_for_feature,
  )) {
    const inputId = `featureHandler_${key}`;
    const input = document.getElementById(inputId);

    if (input) {
      const value = input.value.trim();
      if (value) {
        // Validate handler function name
        if (!handlerRegex.test(value)) {
          throw new Error(
            `${config.label}: Only alphanumeric characters and underscores allowed`,
          );
        }
        handlers[key] = value;
      }
    }
  }

  // Return null if no handlers were set (to avoid empty object in DB)
  return Object.keys(handlers).length > 0 ? handlers : null;
}

function renderTemplateFields() {
  const container = document.getElementById('templateFieldsList');

  if (!wizardState.selectedFeature || !wizardState.selectedFeature.fields) {
    container.innerHTML =
      '<div class="empty-state">No template fields available</div>';
    return;
  }

  const fields = wizardState.selectedFeature.fields;
  const fieldKeys = Object.keys(fields);

  if (fieldKeys.length === 0) {
    container.innerHTML =
      '<div class="empty-state">No fields in this template</div>';
    return;
  }

  container.innerHTML = `
        ${renderFeatureHandlers()}
        <div class="section-header">
            <h3>Template Fields (${fieldKeys.length})</h3>
        </div>
        <div class="fields-table-wrapper">
            <table class="modern-fields-table">
                <thead>
                    <tr>
                        <th class="enable-col">ENABLE</th>
                        <th class="field-detail-col">FIELD DETAILS</th>
                        ${renderHandlerHeaders()}
                        <th class="value-col">VALUE</th>
                        <th class="action-col">ACTIONS</th>
                    </tr>
                </thead>
                <tbody>
                    ${fieldKeys
                      .map(fieldKey => {
                        const field = fields[fieldKey];

                        // Initialize field mapping if it doesn't exist
                        // In edit mode, if field is not in saved mapping, it means it was disabled
                        if (!wizardState.fieldMappings[fieldKey]) {
                          wizardState.fieldMappings[fieldKey] = {
                            enabled: wizardState.isEditMode ? false : true,
                            customHandlers: null,
                          };
                        }

                        const mapping = wizardState.fieldMappings[fieldKey];
                        const handlers = mapping.customHandlers || {};
                        const displayValue =
                          mapping.adminValue !== null &&
                          mapping.adminValue !== undefined
                            ? Array.isArray(mapping.adminValue)
                              ? mapping.adminValue.join(', ')
                              : mapping.adminValue
                            : '-';

                        return `
                            <tr class="${
                              !mapping.enabled ? 'field-disabled' : ''
                            }">
                                <td class="enable-cell" style="text-align: center;">
                                    <input type="checkbox" id="field_${fieldKey}"
                                           ${mapping.enabled ? 'checked' : ''}
                                           onchange="toggleFieldEnabled('${fieldKey}')"
                                           style="width: 18px; height: 18px; cursor: pointer;">
                                </td>
                                <td class="field-detail-cell">
                                    <div class="field-detail-content">
                                        <div class="field-name-row">
                                            <span class="field-name-text">${escapeHtml(
                                              field.label || fieldKey,
                                            )}</span>
                                            ${
                                              field.required
                                                ? '<span class="field-req-badge">REQ</span>'
                                                : ''
                                            }
                                        </div>
                                        <p class="field-description-text">${escapeHtml(
                                          field.description || 'No description',
                                        )}</p>
                                        <div class="field-meta-grid">
                                            <div class="field-meta-item">
                                                <span class="field-meta-value">${
                                                  field.type || 'static'
                                                }</span>
                                            </div>
                                            <div class="field-meta-item">
                                                <span class="field-meta-value">${
                                                  field.fieldType || 'string'
                                                }</span>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                ${renderHandlerCells(handlers)}
                                <td class="value-cell">
                                    ${
                                      field.fillBy === 'Admin'
                                        ? displayValue !== '-'
                                          ? `<span class="value-text">${displayValue}</span>`
                                          : '<span class="empty-cell">Not set</span>'
                                        : '<span class="empty-cell">To be filled by user</span>'
                                    }
                                </td>
                                <td class="action-cell" style="text-align: center;">
                                    <button class="btn-icon" onclick="openFieldConfigModal('${fieldKey}')" title="Configure field">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
                                            <circle cx="12" cy="12" r="3"/>
                                            <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"/>
                                        </svg>
                                    </button>
                                </td>
                            </tr>
                        `;
                      })
                      .join('')}
                </tbody>
            </table>
        </div>
    `;
}

function toggleFieldEnabled(fieldKey) {
  const checkbox = document.getElementById(`field_${fieldKey}`);
  wizardState.fieldMappings[fieldKey].enabled = checkbox.checked;
}

// Generate admin value input based on field htmlType
function generateValueInput(field, fieldKey, currentValue = '') {
  const htmlType = field.htmlType;
  const fieldType = field.fieldType;
  // Normalize possibleValues - handle both string arrays and object arrays
  let possibleValues = field.possibleValues || [];
  if (possibleValues.length > 0 && typeof possibleValues[0] === 'string') {
    // Convert string array to object array
    possibleValues = possibleValues.map(val => ({
      id: val,
      label: val.charAt(0).toUpperCase() + val.slice(1), // Capitalize first letter
    }));
  }
  const inputId = `adminValue_${fieldKey}`;

  let html = `<label for="${inputId}">${escapeHtml(field.label)}</label>`;

  switch (htmlType) {
    case 'text':
    case 'password':
    case 'tel':
      html += `<input type="${htmlType}" id="${inputId}" class="form-input"
                     value="${escapeHtml(currentValue)}"
                     placeholder="Enter ${field.label.toLowerCase()}">`;
      break;

    case 'number':
      html += `<input type="number" id="${inputId}" class="form-input"
                     value="${escapeHtml(currentValue)}"
                     placeholder="Enter ${field.label.toLowerCase()}">`;
      break;

    case 'email':
      html += `<input type="email" id="${inputId}" class="form-input"
                     value="${escapeHtml(currentValue)}"
                     placeholder="Enter email address">`;
      break;

    case 'url':
      html += `<input type="url" id="${inputId}" class="form-input"
                     value="${escapeHtml(currentValue)}"
                     placeholder="https://example.com">`;
      break;

    case 'date':
      html += `<input type="date" id="${inputId}" class="form-input"
                     value="${escapeHtml(currentValue)}">`;
      break;

    case 'time':
      html += `<input type="time" id="${inputId}" class="form-input"
                     value="${escapeHtml(currentValue)}">`;
      break;

    case 'datetime-local':
      html += `<input type="datetime-local" id="${inputId}" class="form-input"
                     value="${escapeHtml(currentValue)}">`;
      break;

    case 'month':
      html += `<input type="month" id="${inputId}" class="form-input"
                     value="${escapeHtml(currentValue)}">`;
      break;

    case 'week':
      html += `<input type="week" id="${inputId}" class="form-input"
                     value="${escapeHtml(currentValue)}">`;
      break;

    case 'color':
      html += `<input type="color" id="${inputId}" class="form-input"
                     value="${currentValue || '#000000'}"
                     style="height: 40px; padding: 4px;">`;
      break;

    case 'range':
      const min = field.min || 0;
      const max = field.max || 100;
      const step = field.step || 1;
      html += `<div class="range-input-group">
                <input type="range" id="${inputId}" class="form-range"
                       value="${escapeHtml(currentValue) || min}"
                       min="${min}" max="${max}" step="${step}"
                       oninput="document.getElementById('${inputId}_display').value = this.value">
                <input type="number" id="${inputId}_display" class="form-input"
                       value="${escapeHtml(currentValue) || min}"
                       min="${min}" max="${max}" step="${step}"
                       style="width: 80px; margin-left: 10px;"
                       oninput="document.getElementById('${inputId}').value = this.value">
            </div>`;
      break;

    case 'file':
      html += `<input type="file" id="${inputId}" class="form-input"
                     accept="${field.accept || '*/*'}">`;
      if (currentValue) {
        html += `<small class="help-text">Current file: ${escapeHtml(
          currentValue,
        )}</small>`;
      }
      break;

    case 'hidden':
      html += `<input type="hidden" id="${inputId}" value="${escapeHtml(
        currentValue,
      )}">
                     <input type="text" class="form-input" value="${escapeHtml(
                       currentValue,
                     )}" readonly
                     placeholder="Hidden field value">
                     <small class="help-text">This value will be hidden from users</small>`;
      break;

    case 'textarea':
      html += `<textarea id="${inputId}" class="form-textarea" rows="3"
                     placeholder="Enter ${field.label.toLowerCase()}">${escapeHtml(
        currentValue,
      )}</textarea>`;
      break;

    case 'select':
      html += `<select id="${inputId}" class="form-select">
                <option value="">Select ${field.label.toLowerCase()}</option>`;
      possibleValues.forEach(option => {
        const selected = currentValue === option.id ? 'selected' : '';
        html += `<option value="${escapeHtml(
          option.id,
        )}" ${selected}>${escapeHtml(option.label)}</option>`;
      });
      html += `</select>`;
      break;

    case 'checkbox':
      if (possibleValues.length > 0) {
        const selectedValues = Array.isArray(currentValue)
          ? currentValue
          : currentValue
          ? currentValue.split(',')
          : [];
        html += `<div class="checkbox-group">`;
        possibleValues.forEach((option, idx) => {
          const checked = selectedValues.includes(option.id) ? 'checked' : '';
          html += `<label class="checkbox-label">
                        <input type="checkbox" name="${inputId}" value="${escapeHtml(
            option.id,
          )}" ${checked}>
                        <span>${escapeHtml(option.label)}</span>
                    </label>`;
        });
        html += `</div>`;
      } else {
        html += `<label class="checkbox-label">
                    <input type="checkbox" id="${inputId}" ${
          currentValue ? 'checked' : ''
        }>
                    <span>${escapeHtml(field.label)}</span>
                </label>`;
      }
      break;

    case 'radio':
      if (possibleValues.length > 0) {
        html += `<div class="radio-group">`;
        possibleValues.forEach((option, idx) => {
          const checked = currentValue === option.id ? 'checked' : '';
          html += `<label class="radio-label">
                        <input type="radio" name="${inputId}" value="${escapeHtml(
            option.id,
          )}" ${checked}>
                        <span>${escapeHtml(option.label)}</span>
                    </label>`;
        });
        html += `</div>`;
      }
      break;

    default:
      html += `<input type="text" id="${inputId}" class="form-input"
                     value="${escapeHtml(currentValue)}"
                     placeholder="Enter value">`;
  }

  if (field.description) {
    html += `<small class="help-text">${escapeHtml(field.description)}</small>`;
  }

  return html;
}

// =====================================================
// TEMPLATE VARIABLE VALIDATION HELPERS
// =====================================================

/**
 * Extract all dynamic variables from a string
 * Format: {{variableName}}
 * @param {string} str - String containing dynamic variables
 * @returns {string[]} - Array of variable names
 */
function extractDynamicVariables(str) {
  if (!str || typeof str !== 'string') {
    return [];
  }

  const regex = /\{\{([^}]+)\}\}/g;
  const variables = [];
  let match;

  while ((match = regex.exec(str)) !== null) {
    const variableName = match[1].trim();
    if (variableName && !variables.includes(variableName)) {
      variables.push(variableName);
    }
  }

  return variables;
}

/**
 * Collect all valid field names from all sources:
 * - All auth methods' configOptions (from auth-types-definition)
 * - All auth methods' credentialFields (from auth-types-definition)
 * - All auth methods' additionalFields (from integration's auth schema)
 * - Feature template fields
 * - Extra fields created during mapping
 * @returns {string[]} - Array of valid field names
 */
function collectAllValidFields() {
  const fields = [];

  // 1. Collect from ALL auth methods in integration
  if (
    integrationAuthSchema &&
    integrationAuthSchema.authMethods &&
    authTypesDefinition
  ) {
    integrationAuthSchema.authMethods.forEach(authMethod => {
      const authType = authMethod.authType;
      const authTypeDef = authTypesDefinition.authTypes?.[authType];

      if (authTypeDef) {
        // Get configOptions field names
        if (authTypeDef.configOptions) {
          Object.keys(authTypeDef.configOptions).forEach(key => {
            if (!fields.includes(key)) {
              fields.push(key);
            }
          });
        }

        // Get credentialFields names
        if (authTypeDef.credentialFields) {
          Object.keys(authTypeDef.credentialFields).forEach(key => {
            if (!fields.includes(key)) {
              fields.push(key);
            }
          });
        }
      }

      // Get additionalFields names from auth method
      if (
        authMethod.additionalFields &&
        Array.isArray(authMethod.additionalFields)
      ) {
        authMethod.additionalFields.forEach(field => {
          if (field.name && !fields.includes(field.name)) {
            fields.push(field.name);
          }
        });
      }
    });
  }

  // 2. Collect from feature template fields
  if (wizardState.selectedFeature && wizardState.selectedFeature.fields) {
    Object.keys(wizardState.selectedFeature.fields).forEach(key => {
      if (!fields.includes(key)) {
        fields.push(key);
      }
    });
  }

  // 3. Collect from extra fields
  if (wizardState.extraFields && Array.isArray(wizardState.extraFields)) {
    wizardState.extraFields.forEach(field => {
      if (field.fieldKey && !fields.includes(field.fieldKey)) {
        fields.push(field.fieldKey);
      }
    });
  }

  return fields;
}

/**
 * Validate admin-entered value based on fieldType
 * @param {*} value - The value to validate
 * @param {string} fieldType - The field's data type (string, number, email, url, boolean, date, array, object)
 * @returns {{valid: boolean, error: string}} - Validation result
 */
function validateFieldValue(value, fieldType) {
  // Empty value is valid (required validation happens separately)
  if (value === '' || value === null || value === undefined) {
    return { valid: true, error: '' };
  }

  // Check if value contains template variables
  const variables = extractDynamicVariables(value);
  if (variables.length > 0) {
    // Collect all valid field names
    validFieldNames = collectAllValidFields();

    // Validate each variable against available fields
    const invalidVars = variables.filter(v => !validFieldNames.includes(v));
    if (invalidVars.length > 0) {
      return {
        valid: false,
        error: `Invalid variable(s): {{${invalidVars.join('}}, {{')}}}`,
      };
    }
    // All variables are valid, skip literal validation
    return { valid: true, error: '' };
  }

  // No template variables, proceed with literal validation
  switch (fieldType) {
    case 'string':
    case 'text':
    case 'html':
    case 'json':
      // String types are always valid
      return { valid: true, error: '' };

    case 'number':
      if (isNaN(value) || value.trim() === '') {
        return { valid: false, error: 'Please enter a valid number' };
      }
      return { valid: true, error: '' };

    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return { valid: false, error: 'Please enter a valid email address' };
      }
      return { valid: true, error: '' };

    case 'url':
      const urlRegex = /^https?:\/\/.+/;
      if (!urlRegex.test(value)) {
        return {
          valid: false,
          error:
            'Please enter a valid URL (must start with http:// or https://)',
        };
      }
      return { valid: true, error: '' };

    case 'boolean':
      const booleanValues = [
        'true',
        'false',
        'yes',
        'no',
        '1',
        '0',
        'on',
        'off',
      ];
      if (!booleanValues.includes(value.toString().toLowerCase())) {
        return {
          valid: false,
          error: 'Please enter a valid boolean value (true/false, yes/no, 1/0)',
        };
      }
      return { valid: true, error: '' };

    case 'date':
      const dateValue = new Date(value);
      if (isNaN(dateValue.getTime())) {
        return { valid: false, error: 'Please enter a valid date' };
      }
      return { valid: true, error: '' };

    case 'array':
      // For array type, we expect comma-separated values or actual array
      if (Array.isArray(value)) {
        return { valid: true, error: '' };
      }
      // Accept comma-separated string as valid array representation
      if (typeof value === 'string') {
        return { valid: true, error: '' };
      }
      return {
        valid: false,
        error: 'Please enter a valid array (comma-separated values)',
      };

    case 'object':
      // For object type, we expect valid JSON
      if (typeof value === 'object' && value !== null) {
        return { valid: true, error: '' };
      }
      // Try parsing as JSON if it's a string
      if (typeof value === 'string') {
        try {
          JSON.parse(value);
          return { valid: true, error: '' };
        } catch (e) {
          return { valid: false, error: 'Please enter a valid JSON object' };
        }
      }
      return { valid: false, error: 'Please enter a valid JSON object' };

    default:
      // Unknown field type - allow it
      return { valid: true, error: '' };
  }
}

/**
 * Render handler inputs dynamically from custom handlers config
 * @param {string} containerId - ID of container element to render into
 * @param {object} currentValues - Current handler values (optional)
 * @param {string} prefix - Prefix for input IDs (e.g., 'config' or 'extraField')
 */
function renderHandlerInputs(
  containerId,
  currentValues = {},
  prefix = 'config',
) {
  const container = document.getElementById(containerId);
  if (!container || !customHandlersConfig) {
    console.error('Container or customHandlersConfig not found');
    return;
  }

  // Sort handlers by order
  const sortedHandlers = Object.entries(customHandlersConfig).sort(
    ([, a], [, b]) => a.order - b.order,
  );

  let html = '';
  sortedHandlers.forEach(([key, config]) => {
    const value = currentValues[key] || '';
    const inputId = `${prefix}${key.charAt(0).toUpperCase() + key.slice(1)}`;

    html += `
            <div class="form-group">
                <label for="${inputId}">
                    ${
                      config.icon
                        ? `<span class="handler-icon">${config.icon}</span> `
                        : ''
                    }
                    ${config.label}
                </label>
                <input type="text"
                       id="${inputId}"
                       class="form-input"
                       value="${escapeHtml(value)}"
                       placeholder="${config.placeholder || ''}">
                ${
                  config.helpText
                    ? `<small class="help-text">${config.helpText}</small>`
                    : ''
                }
            </div>
        `;
  });

  container.innerHTML = html;
}

/**
 * Render handler table headers dynamically
 * @returns {string} HTML string for handler header cells
 */
function renderHandlerHeaders() {
  if (!customHandlersConfig) {
    return '';
  }

  // Sort handlers by order
  const sortedHandlers = Object.entries(customHandlersConfig).sort(
    ([, a], [, b]) => a.order - b.order,
  );

  let headers = '';
  sortedHandlers.forEach(([key, config]) => {
    headers += `<th class="handler-col">${config.label.toUpperCase()}</th>`;
  });

  return headers;
}

/**
 * Render handler cells for table display
 * @param {object} handlers - Handler object with handler values
 * @returns {string} HTML string for handler cells
 */
function renderHandlerCells(handlers) {
  if (!handlers || !customHandlersConfig) {
    return '';
  }

  // Sort handlers by order
  const sortedHandlers = Object.entries(customHandlersConfig).sort(
    ([, a], [, b]) => a.order - b.order,
  );

  let cells = '';
  sortedHandlers.forEach(([key, config]) => {
    const handlerValue = handlers[key];
    cells += `
            <td class="handler-cell">
                ${
                  handlerValue
                    ? `
                    <div class="handler-item">
                        <span class="handler-icon" title="${
                          config.description
                        }">${config.icon}</span>
                        <span class="handler-name">${escapeHtml(
                          handlerValue,
                        )}</span>
                    </div>
                `
                    : '<span class="empty-cell">-</span>'
                }
            </td>
        `;
  });

  return cells;
}

function openFieldConfigModal(fieldKey) {
  const field = wizardState.selectedFeature.fields[fieldKey];
  const mapping = wizardState.fieldMappings[fieldKey];

  // Populate modal
  document.getElementById(
    'fieldConfigModalTitle',
  ).textContent = `Configure Field: ${fieldKey}`;
  document.getElementById('configFieldKey').value = fieldKey;

  // Render custom handlers dynamically
  renderHandlerInputs(
    'customHandlersContainer',
    mapping.customHandlers || {},
    'config',
  );

  // Show/hide admin value section based on fillBy
  const adminValueSection = document.getElementById('adminValueSection');
  const adminValueInputContainer = document.getElementById('adminValueInput');

  if (field.fillBy === 'Admin') {
    // Check if field is conditional
    let shouldShowInput = true;
    if (field.type === 'conditional' && field.conditionalExpression) {
      // For conditional fields, we could evaluate the expression
      // For now, we'll show the input and let the admin decide
      // In a real implementation, you might want to evaluate the expression
      shouldShowInput = true;
    }

    if (shouldShowInput) {
      // Generate the appropriate input based on htmlType
      const currentValue = mapping.adminValue || '';
      adminValueInputContainer.innerHTML = generateValueInput(
        field,
        fieldKey,
        currentValue,
      );
      adminValueSection.style.display = 'block';
    } else {
      adminValueSection.style.display = 'none';
    }
  } else {
    // fillBy is User, don't show admin value input
    adminValueSection.style.display = 'none';
  }

  // Show modal
  document.getElementById('fieldConfigModal').classList.add('show');
}

function closeFieldConfigModal() {
  document.getElementById('fieldConfigModal').classList.remove('show');
}

function saveFieldConfig() {
  const fieldKey = document.getElementById('configFieldKey').value;
  const field = wizardState.selectedFeature.fields[fieldKey];
  const mapping = wizardState.fieldMappings[fieldKey];

  // Get handler values dynamically from custom handlers config
  const customHandlers = {};
  const handlerRegex = /^[a-zA-Z0-9_]+$/;

  if (customHandlersConfig) {
    for (const [key, config] of Object.entries(customHandlersConfig)) {
      const inputId = `config${key.charAt(0).toUpperCase() + key.slice(1)}`;
      const input = document.getElementById(inputId);

      if (input) {
        const value = input.value.trim();
        if (value) {
          // Validate handler function name
          if (!handlerRegex.test(value)) {
            showToast(
              `${config.label}: Only alphanumeric characters and underscores allowed`,
              'error',
            );
            return;
          }
          customHandlers[key] = value;
        }
      }
    }
  }

  // Capture and validate admin value if fillBy=Admin
  if (field.fillBy === 'Admin') {
    const inputId = `adminValue_${fieldKey}`;
    let adminValue = null;

    // Get value based on htmlType
    switch (field.htmlType) {
      case 'checkbox':
        // For checkbox, get all checked values
        const checkboxes = document.querySelectorAll(
          `input[name="${inputId}"]:checked`,
        );
        if (checkboxes.length > 0) {
          adminValue = Array.from(checkboxes).map(cb => cb.value);
        }
        break;

      case 'radio':
        // For radio, get the selected value
        const selectedRadio = document.querySelector(
          `input[name="${inputId}"]:checked`,
        );
        if (selectedRadio) {
          adminValue = selectedRadio.value;
        }
        break;

      default:
        // For text, textarea, select, number, email, url, date, etc.
        const input = document.getElementById(inputId);
        if (input) {
          adminValue = input.value.trim();
        }
        break;
    }

    // Validate the admin value if provided
    if (
      adminValue !== null &&
      adminValue !== '' &&
      !(Array.isArray(adminValue) && adminValue.length === 0)
    ) {
      // For array (checkbox), convert to comma-separated string for validation
      const valueToValidate = Array.isArray(adminValue)
        ? adminValue.join(',')
        : adminValue;
      const validation = validateFieldValue(valueToValidate, field.fieldType);

      if (!validation.valid) {
        showToast(validation.error, 'error');
        return;
      }
    }

    // Save admin value to mapping
    mapping.adminValue = adminValue;
  }

  // Save handlers
  if (Object.keys(customHandlers).length > 0) {
    mapping.customHandlers = customHandlers;
  } else {
    mapping.customHandlers = null;
  }

  closeFieldConfigModal();
  showToast('Field configuration saved', 'success');
}

// =====================================================
// STEP 3: API CONFIGURATION
// =====================================================

function populateApiConfig() {
  document.getElementById('apiConfigId').value =
    wizardState.apiConfig.apiConfigId || '';
  document.getElementById('apiMethod').value =
    wizardState.apiConfig.method || 'GET';
  document.getElementById('apiEndpoint').value =
    wizardState.apiConfig.endpoint || '';
}

// =====================================================
// STEP 4: EXTRA FIELDS
// =====================================================

function renderExtraFields() {
  const container = document.getElementById('extraFieldsList');
  const count = document.getElementById('extraFieldsCount');

  count.textContent = `(${wizardState.extraFields.length})`;

  if (wizardState.extraFields.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                <p>No extra fields added. Extra fields are integration-specific and can be used with custom handlers.</p>
            </div>
        `;
    return;
  }

  container.innerHTML = `
        <div class="fields-table-wrapper">
            <table class="modern-fields-table">
                <thead>
                    <tr>
                        <th class="field-detail-col">FIELD DETAILS</th>
                        ${renderHandlerHeaders()}
                        <th class="value-col">VALUE</th>
                        <th class="action-col">ACTIONS</th>
                    </tr>
                </thead>
                <tbody>
                    ${wizardState.extraFields
                      .map((field, index) => {
                        const handlers = field.customHandlers || {};
                        const displayValue =
                          field.adminValue !== null &&
                          field.adminValue !== undefined
                            ? Array.isArray(field.adminValue)
                              ? field.adminValue.join(', ')
                              : field.adminValue
                            : '-';

                        return `
                            <tr>
                                <td class="field-detail-cell">
                                    <div class="field-detail-content">
                                        <div class="field-name-row">
                                            <span class="field-name-text">${escapeHtml(
                                              field.label,
                                            )}</span>
                                            ${
                                              field.required
                                                ? '<span class="field-req-badge">REQ</span>'
                                                : ''
                                            }
                                        </div>
                                        <p class="field-description-text">${escapeHtml(
                                          field.description || 'No description',
                                        )}</p>
                                        <div class="field-meta-grid">
                                            <div class="field-meta-item">
                                                <span class="field-meta-value">${
                                                  field.type || 'static'
                                                }</span>
                                            </div>
                                            <div class="field-meta-item">
                                                <span class="field-meta-value">${
                                                  field.fieldType || 'string'
                                                }</span>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                ${renderHandlerCells(handlers)}
                                <td class="value-cell">
                                    ${
                                      field.fillBy === 'Admin'
                                        ? displayValue !== '-'
                                          ? `<span class="value-text">${displayValue}</span>`
                                          : '<span class="empty-cell">Not set</span>'
                                        : '<span class="empty-cell">To be filled by user</span>'
                                    }
                                </td>
                                <td class="action-cell" style="text-align: center;">
                                    <button class="btn-icon" onclick="editExtraField(${index})" title="Edit field" style="margin-right: 8px;">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                        </svg>
                                    </button>
                                    <button class="btn-icon btn-icon-danger" onclick="deleteExtraField(${index})" title="Delete field">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
                                            <polyline points="3 6 5 6 21 6"/>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                        </svg>
                                    </button>
                                </td>
                            </tr>
                        `;
                      })
                      .join('')}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * Update the admin value input in the Extra Field modal based on fillBy and htmlType
 */
function updateExtraFieldValueInput() {
  const fillBy = document.getElementById('extraFieldFillBy').value;
  const htmlType = document.getElementById('extraFieldHtmlType').value;
  const dataType = document.getElementById('extraFieldDataType').value;
  const fieldKey =
    document.getElementById('extraFieldKey').value || 'extraField';
  const label = document.getElementById('extraFieldLabel').value || 'Value';
  const description = document.getElementById('extraFieldDescription').value;

  const adminValueSection = document.getElementById(
    'extraFieldAdminValueSection',
  );
  const adminValueInputContainer = document.getElementById(
    'extraFieldAdminValueInput',
  );

  // Only show admin value input if fillBy is Admin AND htmlType is selected
  if (fillBy === 'Admin' && htmlType && dataType) {
    // Get possible values from the possible values list
    const possibleValueRows = document.querySelectorAll(
      '#possibleValuesList .possible-value-row',
    );
    const possibleValues = Array.from(possibleValueRows).map(row => ({
      id: row.querySelector('.pv-id').value,
      label: row.querySelector('.pv-label').value,
    }));

    // Create a temporary field object for generateValueInput
    const tempField = {
      label: label,
      htmlType: htmlType,
      fieldType: dataType,
      possibleValues: possibleValues,
      description: description,
    };

    // Get current admin value if editing
    const index = document.getElementById('extraFieldIndex').value;
    let currentValue = '';
    if (index !== '') {
      const field = wizardState.extraFields[index];
      currentValue = field.adminValue || '';
    }

    // Generate and display the input
    adminValueInputContainer.innerHTML = generateValueInput(
      tempField,
      fieldKey,
      currentValue,
    );
    adminValueSection.style.display = 'block';
  } else {
    // Hide admin value section
    adminValueSection.style.display = 'none';
  }
}

function openExtraFieldModal(index = null) {
  // Reset or populate form
  if (index === null) {
    document.getElementById('extraFieldModalTitle').textContent =
      'Add Extra Field';
    document.getElementById('extraFieldIndex').value = '';
    document.getElementById('extraFieldKey').value = '';
    document.getElementById('extraFieldLabel').value = '';
    document.getElementById('extraFieldDescription').value = '';
    document.getElementById('extraFieldType').value = '';
    document.getElementById('extraFieldDataType').value = '';
    document.getElementById('extraFieldHtmlType').value = '';
    document.getElementById('extraFieldRequired').checked = false;
    document.getElementById('extraFieldFillBy').value = '';
    document.getElementById('extraFieldDefault').value = '';
    document.getElementById('extraFieldOrder').value =
      wizardState.extraFields.length + 1;
    document.getElementById('possibleValuesList').innerHTML = '';
    document.getElementById('saveExtraFieldBtn').textContent = 'Add Field';

    // Render handlers dynamically
    renderHandlerInputs('extraFieldCustomHandlersContainer', {}, 'extraField');
  } else {
    const field = wizardState.extraFields[index];
    document.getElementById('extraFieldModalTitle').textContent =
      'Edit Extra Field';
    document.getElementById('extraFieldIndex').value = index;
    document.getElementById('extraFieldKey').value = field.fieldKey;
    document.getElementById('extraFieldLabel').value = field.label;
    document.getElementById('extraFieldDescription').value =
      field.description || '';
    document.getElementById('extraFieldType').value = field.type;
    document.getElementById('extraFieldDataType').value = field.fieldType;
    document.getElementById('extraFieldHtmlType').value = field.htmlType;
    document.getElementById('extraFieldRequired').checked = field.required;
    document.getElementById('extraFieldFillBy').value = field.fillBy || '';
    document.getElementById('extraFieldDefault').value = field.default || '';
    document.getElementById('extraFieldOrder').value = field.order;

    // Render handlers dynamically
    renderHandlerInputs(
      'extraFieldCustomHandlersContainer',
      field.customHandlers || {},
      'extraField',
    );

    // Populate possible values
    if (field.possibleValues && field.possibleValues.length > 0) {
      document.getElementById('possibleValuesList').innerHTML =
        field.possibleValues
          .map((val, i) => createPossibleValueRow(val.id, val.label, i))
          .join('');
    }

    document.getElementById('saveExtraFieldBtn').textContent = 'Save Field';
  }

  togglePossibleValues();

  // Add event listeners for fillBy, htmlType, and dataType changes
  // Remove existing listeners to avoid duplicates
  const fillBySelect = document.getElementById('extraFieldFillBy');
  const htmlTypeSelect = document.getElementById('extraFieldHtmlType');
  const dataTypeSelect = document.getElementById('extraFieldDataType');

  // Save current values before cloning
  const savedFillBy = fillBySelect.value;
  const savedHtmlType = htmlTypeSelect.value;
  const savedDataType = dataTypeSelect.value;

  // Clone and replace to remove all existing listeners
  const newFillBySelect = fillBySelect.cloneNode(true);
  const newHtmlTypeSelect = htmlTypeSelect.cloneNode(true);
  const newDataTypeSelect = dataTypeSelect.cloneNode(true);

  // Restore values after cloning
  newFillBySelect.value = savedFillBy;
  newHtmlTypeSelect.value = savedHtmlType;
  newDataTypeSelect.value = savedDataType;

  fillBySelect.parentNode.replaceChild(newFillBySelect, fillBySelect);
  htmlTypeSelect.parentNode.replaceChild(newHtmlTypeSelect, htmlTypeSelect);
  dataTypeSelect.parentNode.replaceChild(newDataTypeSelect, dataTypeSelect);

  // Add new event listeners
  document
    .getElementById('extraFieldFillBy')
    .addEventListener('change', updateExtraFieldValueInput);
  document
    .getElementById('extraFieldHtmlType')
    .addEventListener('change', updateExtraFieldValueInput);
  document
    .getElementById('extraFieldDataType')
    .addEventListener('change', updateExtraFieldValueInput);

  // Initial update of admin value section
  updateExtraFieldValueInput();

  document.getElementById('extraFieldModal').classList.add('show');
}

function closeExtraFieldModal() {
  document.getElementById('extraFieldModal').classList.remove('show');
}

/**
 * Validate compatibility between data type and HTML type
 * Returns error message if incompatible, null if compatible
 */
function validateFieldTypeCompatibility(dataType, htmlType) {
  // Define valid combinations
  const compatibilityMatrix = {
    string: ['text', 'textarea', 'password', 'select', 'radio', 'hidden'],
    text: ['text', 'textarea', 'hidden'],
    number: ['number', 'range', 'select', 'radio'],
    boolean: ['checkbox', 'radio', 'select', 'hidden'],
    email: ['email', 'text', 'hidden'],
    url: ['url', 'text', 'hidden'],
    html: ['textarea', 'hidden'],
    date: ['date', 'datetime-local', 'month', 'week', 'text', 'hidden'],
    array: ['checkbox', 'select', 'hidden'],
    object: ['textarea', 'hidden'],
    json: ['textarea', 'hidden'],
  };

  // Special cases for HTML types that work with specific data types
  const htmlTypeRequirements = {
    time: ['string', 'date'],
    'datetime-local': ['string', 'date'],
    month: ['string', 'date'],
    week: ['string', 'date'],
    tel: ['string', 'number'],
    color: ['string'],
    file: ['string', 'url', 'array'],
  };

  // Check if HTML type has special requirements
  if (htmlTypeRequirements[htmlType]) {
    if (!htmlTypeRequirements[htmlType].includes(dataType)) {
      return (
        `HTML type "${htmlType}" is not compatible with data type "${dataType}". ` +
        `Compatible data types: ${htmlTypeRequirements[htmlType].join(', ')}`
      );
    }
    return null; // Compatible
  }

  // Check standard compatibility matrix
  if (compatibilityMatrix[dataType]) {
    if (!compatibilityMatrix[dataType].includes(htmlType)) {
      return (
        `Data type "${dataType}" is not compatible with HTML type "${htmlType}". ` +
        `Compatible HTML types: ${compatibilityMatrix[dataType].join(', ')}`
      );
    }
  }

  return null; // Compatible or unknown combination (allow it)
}

function saveExtraField() {
  // Validate
  const fieldKey = document.getElementById('extraFieldKey').value.trim();
  const label = document.getElementById('extraFieldLabel').value.trim();
  const type = document.getElementById('extraFieldType').value;
  const dataType = document.getElementById('extraFieldDataType').value;
  const htmlType = document.getElementById('extraFieldHtmlType').value;
  const fillBy = document.getElementById('extraFieldFillBy').value;

  if (!fieldKey || !label || !type || !dataType || !htmlType || !fillBy) {
    showToast('Please fill in all required fields', 'error');
    return;
  }

  // Validate field key format
  if (!/^[a-z0-9_]+$/.test(fieldKey)) {
    showToast(
      'Field key must be snake_case (letters, numbers, underscores only)',
      'error',
    );
    return;
  }

  const index = document.getElementById('extraFieldIndex').value;
  const isEdit = index !== '';

  // Check for duplicate field key (only if adding new or changing key)
  if (!isEdit || wizardState.extraFields[index].fieldKey !== fieldKey) {
    if (wizardState.extraFields.some(f => f.fieldKey === fieldKey)) {
      showToast('Field key already exists', 'error');
      return;
    }
  }

  // Get handler values dynamically from custom handlers config
  const customHandlers = {};
  const handlerRegex = /^[a-zA-Z0-9_]+$/;

  if (customHandlersConfig) {
    for (const [key, config] of Object.entries(customHandlersConfig)) {
      const inputId = `extraField${key.charAt(0).toUpperCase() + key.slice(1)}`;
      const input = document.getElementById(inputId);

      if (input) {
        const value = input.value.trim();
        if (value) {
          // Validate handler function name
          if (!handlerRegex.test(value)) {
            showToast(
              `${config.label}: Only alphanumeric characters and underscores allowed`,
              'error',
            );
            return;
          }
          customHandlers[key] = value;
        }
      }
    }
  }

  // Validate data type and HTML type compatibility
  const compatibilityError = validateFieldTypeCompatibility(dataType, htmlType);
  if (compatibilityError) {
    showToast(compatibilityError, 'error');
    return;
  }

  // Collect possible values if applicable
  let possibleValues = [];
  if (['select', 'checkbox', 'radio'].includes(htmlType)) {
    const valueRows = document.querySelectorAll(
      '#possibleValuesList .possible-value-row',
    );
    possibleValues = Array.from(valueRows)
      .map(row => ({
        id: row.querySelector('.pv-id').value.trim(),
        label: row.querySelector('.pv-label').value.trim(),
      }))
      .filter(v => v.id && v.label);
  }

  // Capture and validate admin value if fillBy=Admin
  let adminValue = null;
  if (fillBy === 'Admin') {
    const inputId = `adminValue_${fieldKey}`;

    // Get value based on htmlType
    switch (htmlType) {
      case 'checkbox':
        // For checkbox, get all checked values
        const checkboxes = document.querySelectorAll(
          `input[name="${inputId}"]:checked`,
        );
        if (checkboxes.length > 0) {
          adminValue = Array.from(checkboxes).map(cb => cb.value);
        }
        break;

      case 'radio':
        // For radio, get the selected value
        const selectedRadio = document.querySelector(
          `input[name="${inputId}"]:checked`,
        );
        if (selectedRadio) {
          adminValue = selectedRadio.value;
        }
        break;

      default:
        // For text, textarea, select, number, email, url, date, etc.
        const input = document.getElementById(inputId);
        if (input) {
          adminValue = input.value.trim();
        }
        break;
    }

    // Validate the admin value if provided
    if (
      adminValue !== null &&
      adminValue !== '' &&
      !(Array.isArray(adminValue) && adminValue.length === 0)
    ) {
      // For array (checkbox), convert to comma-separated string for validation
      const valueToValidate = Array.isArray(adminValue)
        ? adminValue.join(',')
        : adminValue;
      const validation = validateFieldValue(valueToValidate, dataType);

      if (!validation.valid) {
        showToast(validation.error, 'error');
        return;
      }
    }
  }

  // Build field object
  const field = {
    fieldKey,
    label,
    description: document.getElementById('extraFieldDescription').value.trim(),
    type,
    fieldType: dataType,
    htmlType,
    fillBy,
    adminValue: adminValue,
    required: document.getElementById('extraFieldRequired').checked,
    default: document.getElementById('extraFieldDefault').value.trim() || null,
    possibleValues,
    customHandlers:
      Object.keys(customHandlers).length > 0 ? customHandlers : null,
    order: parseInt(document.getElementById('extraFieldOrder').value) || 1,
  };

  // Save
  if (isEdit) {
    wizardState.extraFields[index] = field;
    showToast('Extra field updated', 'success');
  } else {
    wizardState.extraFields.push(field);
    showToast('Extra field added', 'success');
  }

  // Update valid field names for template variable validation
  validFieldNames = collectAllValidFields();

  closeExtraFieldModal();
  renderFieldsList();
}

function editExtraField(index) {
  openExtraFieldModal(index);
}

function deleteExtraField(index) {
  if (confirm('Are you sure you want to delete this extra field?')) {
    wizardState.extraFields.splice(index, 1);

    // Update valid field names for template variable validation
    validFieldNames = collectAllValidFields();

    renderFieldsList();
    showToast('Extra field deleted', 'success');
  }
}

function togglePossibleValues() {
  const htmlType = document.getElementById('extraFieldHtmlType').value;
  const section = document.getElementById('possibleValuesSection');
  section.style.display = ['select', 'checkbox', 'radio'].includes(htmlType)
    ? 'block'
    : 'none';
}

function addPossibleValueRow() {
  const container = document.getElementById('possibleValuesList');
  const index = container.children.length;
  container.insertAdjacentHTML(
    'beforeend',
    createPossibleValueRow('', '', index),
  );
}

function createPossibleValueRow(id, label, index) {
  return `
        <div class="possible-value-row">
            <input type="text" class="pv-id" placeholder="ID" value="${escapeHtml(
              id,
            )}">
            <input type="text" class="pv-label" placeholder="Label" value="${escapeHtml(
              label,
            )}">
            <button type="button" class="btn-danger btn-sm" onclick="removePossibleValue(${index})">×</button>
        </div>
    `;
}

function removePossibleValue(index) {
  const rows = document.querySelectorAll(
    '#possibleValuesList .possible-value-row',
  );
  if (rows[index]) {
    rows[index].remove();
  }
}

// =====================================================
// STEP 5: REVIEW & SAVE
// =====================================================

function renderReview() {
  // Feature summary
  document.getElementById('reviewFeatureName').textContent =
    wizardState.featureName || '-';
  document.getElementById('reviewFeatureId').textContent =
    wizardState.featureId || '-';
  document.getElementById(
    'reviewIntegrationName',
  ).textContent = `${wizardState.integrationName} (${wizardState.integrationId})`;
  document.getElementById('reviewFeatureCategory').textContent =
    wizardState.featureCategory || 'Not specified';

  // Fields count
  const fieldsCount = wizardState.extraFields.length;
  document.getElementById('reviewFieldsCount').textContent = `(${fieldsCount})`;

  const reviewFieldsContainer = document.getElementById('reviewFields');
  if (fieldsCount > 0) {
    reviewFieldsContainer.innerHTML = wizardState.extraFields
      .map(
        field => `
        <li>
          <strong>${field.label || field.fieldKey}</strong> 
          (${field.type || 'static'}, ${field.fieldType || 'string'})
          ${
            field.required
              ? '<span class="badge badge-warning">Required</span>'
              : ''
          }
        </li>
      `,
      )
      .join('');
  } else {
    reviewFieldsContainer.innerHTML = '<li>No fields added</li>';
  }

  // Save location
  document.getElementById(
    'reviewSaveLocation',
  ).textContent = `integrations/providers/${wizardState.integrationId}/features.schema.json`;
}

// =====================================================
// SAVE MAPPING
// =====================================================

async function saveMapping() {
  try {
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    // Collect and validate feature-level custom handlers
    let featureHandlers = null;
    try {
      featureHandlers = collectFeatureHandlers();
    } catch (error) {
      showToast(error.message, 'error');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Feature Mapping';
      return;
    }

    // Filter out disabled fields from fieldMappings
    const enabledFieldMappings = {};
    Object.keys(wizardState.fieldMappings).forEach(key => {
      if (wizardState.fieldMappings[key].enabled !== false) {
        enabledFieldMappings[key] = wizardState.fieldMappings[key];
      }
    });

    const mappingData = {
      featureTemplateId: wizardState.selectedFeature.id,
      featureTemplateName: wizardState.selectedFeature.name,
      fieldMappings: enabledFieldMappings,
      apiConfig: wizardState.apiConfig,
      extraFields: wizardState.extraFields,
      customHandlers_for_feature: featureHandlers,
      status: 'active',
    };

    const url = wizardState.isEditMode
      ? `/api/integrations/${wizardState.integrationId}/feature-mappings/${wizardState.editMappingId}`
      : `/api/integrations/${wizardState.integrationId}/feature-mappings`;

    const method = wizardState.isEditMode ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mappingData),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      showToast(
        wizardState.isEditMode
          ? 'Feature mapping updated successfully!'
          : 'Feature mapping created successfully!',
        'success',
      );

      // Redirect to integration detail page
      setTimeout(() => {
        window.location.href = `/integration-detail/${wizardState.integrationId}#feature-mappings`;
      }, 1500);
    } else {
      throw new Error(data.error || 'Failed to save mapping');
    }
  } catch (error) {
    console.error('Error saving mapping:', error);
    showToast(error.message || 'Failed to save feature mapping', 'error');

    const saveBtn = document.getElementById('saveBtn');
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Feature Mapping';
  }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

function cancelWizard() {
  // Show custom confirmation modal instead of native confirm
  const modal = document.getElementById('cancelConfirmModal');
  modal.style.display = 'flex';
}

function closeCancelConfirmModal() {
  const modal = document.getElementById('cancelConfirmModal');
  modal.style.display = 'none';
}

function confirmCancel() {
  closeCancelConfirmModal();
  window.location.href = `/integration-detail/${wizardState.integrationId}`;
}

// Add event listeners for cancel confirmation modal
document.addEventListener('DOMContentLoaded', () => {
  const cancelConfirmNo = document.getElementById('cancelConfirmNo');
  const cancelConfirmYes = document.getElementById('cancelConfirmYes');

  if (cancelConfirmNo) {
    cancelConfirmNo.addEventListener('click', closeCancelConfirmModal);
  }
  if (cancelConfirmYes) {
    cancelConfirmYes.addEventListener('click', confirmCancel);
  }

  // Close modal when clicking outside
  const cancelModal = document.getElementById('cancelConfirmModal');
  if (cancelModal) {
    cancelModal.addEventListener('click', e => {
      if (e.target === cancelModal) {
        closeCancelConfirmModal();
      }
    });
  }
});

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
