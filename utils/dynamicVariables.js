/**
 * Dynamic Variables Utility
 *
 * This utility provides functions to:
 * 1. Extract dynamic variables from strings (e.g., {{domain}}, {{region}})
 * 2. Validate that all variables exist in additionalFields
 * 3. Replace variables with actual values at runtime
 */

/**
 * Extract all dynamic variables from a string
 * @param {string} str - String containing dynamic variables (e.g., "https://{{domain}}/api")
 * @returns {string[]} - Array of variable names (e.g., ["domain"])
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
 * Extract all dynamic variables from an auth method configuration
 * @param {object} authMethod - Auth method object containing config
 * @returns {object} - Object with field names as keys and arrays of URLs where they're used as values
 */
function extractVariablesFromAuthMethod(authMethod) {
    if (!authMethod || !authMethod.config) {
        return {};
    }

    const variableUsage = {};
    const config = authMethod.config;

    // Fields that might contain dynamic variables
    const urlFields = [
        'authorizationUrl',
        'tokenUrl',
        'refreshTokenUrl',
        'baseUrl',
        'webhookUrl',
        'revokeUrl',
        'userInfoUrl',
        'jwksUrl'
    ];

    urlFields.forEach(field => {
        if (config[field]) {
            const variables = extractDynamicVariables(config[field]);
            variables.forEach(varName => {
                if (!variableUsage[varName]) {
                    variableUsage[varName] = [];
                }
                variableUsage[varName].push(field);
            });
        }
    });

    return variableUsage;
}

/**
 * Get all available field names from additionalFields
 * @param {array} additionalFields - Array of field definitions
 * @returns {string[]} - Array of field names
 */
function getAvailableFields(additionalFields) {
    if (!Array.isArray(additionalFields)) {
        return [];
    }

    return additionalFields
        .filter(field => field && field.name)
        .map(field => field.name);
}

/**
 * Find similar field names (for suggesting corrections in error messages)
 * @param {string} variable - The incorrect variable name
 * @param {string[]} availableFields - Array of available field names
 * @returns {string|null} - Suggested field name or null
 */
function findSimilarField(variable, availableFields) {
    if (!variable || !Array.isArray(availableFields) || availableFields.length === 0) {
        return null;
    }

    const lowerVar = variable.toLowerCase();

    // Check for exact match (case-insensitive)
    const exactMatch = availableFields.find(f => f.toLowerCase() === lowerVar);
    if (exactMatch && exactMatch !== variable) {
        return exactMatch;
    }

    // Check if variable is contained in any field name
    const containsMatch = availableFields.find(f => f.toLowerCase().includes(lowerVar));
    if (containsMatch) {
        return containsMatch;
    }

    // Check if any field name is contained in variable
    const containedMatch = availableFields.find(f => lowerVar.includes(f.toLowerCase()));
    if (containedMatch) {
        return containedMatch;
    }

    return null;
}

/**
 * Validate dynamic variables in an auth method
 * @param {object} authMethod - Auth method object to validate
 * @returns {object} - Validation result { valid: boolean, errors: array }
 */
function validateDynamicVariables(authMethod) {
    const result = {
        valid: true,
        errors: []
    };

    if (!authMethod || !authMethod.config) {
        return result;
    }

    const variableUsage = extractVariablesFromAuthMethod(authMethod);
    const availableFields = getAvailableFields(authMethod.additionalFields || []);
    const usedVariables = Object.keys(variableUsage);

    // Check each used variable
    usedVariables.forEach(variable => {
        if (!availableFields.includes(variable)) {
            const usedIn = variableUsage[variable].join(', ');
            const suggestion = findSimilarField(variable, availableFields);

            let errorMsg = `Invalid dynamic variable '{{${variable}}}' found in: ${usedIn}.`;

            if (availableFields.length === 0) {
                errorMsg += ' No fields are defined in additionalFields.';
            } else {
                errorMsg += ` Available fields: ${availableFields.join(', ')}`;
                if (suggestion) {
                    errorMsg += `. Did you mean '{{${suggestion}}}'?`;
                }
            }

            result.errors.push({
                variable,
                usedIn: variableUsage[variable],
                message: errorMsg
            });
            result.valid = false;
        }
    });

    return result;
}

/**
 * Validate all auth methods in an auth schema
 * @param {object} authSchema - Auth schema containing authMethods array
 * @returns {object} - Validation result { valid: boolean, errors: array }
 */
function validateAuthSchema(authSchema) {
    const result = {
        valid: true,
        errors: []
    };

    if (!authSchema || !Array.isArray(authSchema.authMethods)) {
        result.errors.push({
            message: 'Invalid auth schema: authMethods array is missing'
        });
        result.valid = false;
        return result;
    }

    authSchema.authMethods.forEach((authMethod, index) => {
        const validation = validateDynamicVariables(authMethod);

        if (!validation.valid) {
            validation.errors.forEach(error => {
                result.errors.push({
                    authMethodIndex: index,
                    authMethodLabel: authMethod.label || authMethod.authType,
                    ...error
                });
            });
            result.valid = false;
        }
    });

    return result;
}

/**
 * Replace dynamic variables in a string with actual values
 * @param {string} str - String containing dynamic variables
 * @param {object} values - Object with variable values { fieldName: value }
 * @param {boolean} strict - If true, throw error for missing values. If false, keep unreplaced
 * @returns {string} - String with variables replaced
 */
function replaceDynamicVariables(str, values, strict = false) {
    if (!str || typeof str !== 'string') {
        return str;
    }

    if (!values || typeof values !== 'object') {
        if (strict) {
            throw new Error('Values object is required for variable replacement');
        }
        return str;
    }

    let result = str;
    const regex = /\{\{([^}]+)\}\}/g;
    const missingVariables = [];

    // Replace all variables
    result = result.replace(regex, (match, variableName) => {
        const trimmedVar = variableName.trim();

        if (values.hasOwnProperty(trimmedVar)) {
            const value = values[trimmedVar];

            // Convert value to string if it's not already
            if (value === null || value === undefined) {
                if (strict) {
                    missingVariables.push(trimmedVar);
                    return match; // Keep original if strict
                }
                return ''; // Replace with empty string if not strict
            }

            return String(value);
        } else {
            missingVariables.push(trimmedVar);
            return strict ? match : ''; // Keep original if strict, remove if not
        }
    });

    // Throw error if strict mode and variables are missing
    if (strict && missingVariables.length > 0) {
        throw new Error(
            `Missing values for dynamic variables: ${missingVariables.join(', ')}`
        );
    }

    return result;
}

/**
 * Replace dynamic variables in an entire auth method config
 * @param {object} authMethod - Auth method object
 * @param {object} values - Object with variable values
 * @param {boolean} strict - If true, throw error for missing values
 * @returns {object} - Auth method with replaced variables
 */
function replaceVariablesInAuthMethod(authMethod, values, strict = false) {
    if (!authMethod || !authMethod.config) {
        return authMethod;
    }

    const result = JSON.parse(JSON.stringify(authMethod)); // Deep clone

    // Fields that might contain dynamic variables
    const urlFields = [
        'authorizationUrl',
        'tokenUrl',
        'refreshTokenUrl',
        'baseUrl',
        'webhookUrl',
        'revokeUrl',
        'userInfoUrl',
        'jwksUrl'
    ];

    urlFields.forEach(field => {
        if (result.config[field]) {
            result.config[field] = replaceDynamicVariables(
                result.config[field],
                values,
                strict
            );
        }
    });

    return result;
}

/**
 * Get a summary of dynamic variables usage in an auth method
 * @param {object} authMethod - Auth method object
 * @returns {object} - Summary object with statistics
 */
function getVariablesSummary(authMethod) {
    const variableUsage = extractVariablesFromAuthMethod(authMethod);
    const availableFields = getAvailableFields(authMethod.additionalFields || []);
    const usedVariables = Object.keys(variableUsage);

    const summary = {
        totalVariablesUsed: usedVariables.length,
        totalFieldsDefined: availableFields.length,
        variables: usedVariables.map(varName => ({
            name: varName,
            usedIn: variableUsage[varName],
            isDefined: availableFields.includes(varName)
        })),
        unusedFields: availableFields.filter(f => !usedVariables.includes(f)),
        undefinedVariables: usedVariables.filter(v => !availableFields.includes(v))
    };

    return summary;
}

module.exports = {
    extractDynamicVariables,
    extractVariablesFromAuthMethod,
    getAvailableFields,
    findSimilarField,
    validateDynamicVariables,
    validateAuthSchema,
    replaceDynamicVariables,
    replaceVariablesInAuthMethod,
    getVariablesSummary
};
