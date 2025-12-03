/**
 * templateParser.js
 * Utility for parsing template variables in authentication configs
 * Supports {{variableName}} syntax
 */

const CryptoJS = require('crypto-js');
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';

/**
 * Parse template string and replace variables with actual values
 * @param {string} template - Template string with {{variable}} placeholders
 * @param {Object} credentials - Credential values from user
 * @param {Object} variables - Additional variables (dynamic variables, config variables)
 * @param {boolean} decryptValues - Whether to decrypt encrypted values (default: true)
 * @returns {string} Parsed string with variables replaced
 */
function parseTemplate(template, credentials = {}, variables = {}, decryptValues = true) {
    // Return empty string for null/undefined
    if (template === null || template === undefined) {
        return '';
    }

    // Convert to string
    template = String(template);

    // If no template syntax found, return as-is (backward compatible!)
    if (!template.includes('{{')) {
        return template;
    }

    // Merge credentials and variables for lookup
    const allValues = { ...credentials, ...variables };

    // Replace {{variableName}} with actual values
    const result = template.replace(/\{\{([^}]+)\}\}/g, (match, fieldName) => {
        const trimmedFieldName = fieldName.trim();

        // Check if value exists
        if (!(trimmedFieldName in allValues)) {
            console.warn(`Template variable not found: ${trimmedFieldName}`);
            return match; // Return original if not found
        }

        let value = allValues[trimmedFieldName];

        // Decrypt if needed and value is encrypted
        if (decryptValues && value && typeof value === 'string' && isEncrypted(value)) {
            value = decryptValue(value);
        }

        return value || '';
    });

    return result;
}

/**
 * Check if a value is encrypted (basic heuristic)
 * @param {string} value - Value to check
 * @returns {boolean} True if appears to be encrypted
 */
function isEncrypted(value) {
    // Encrypted values are typically base64 strings of certain length
    // This is a simple heuristic - adjust based on your encryption method
    return typeof value === 'string' &&
           value.length > 20 &&
           /^[A-Za-z0-9+/=]+$/.test(value);
}

/**
 * Decrypt a credential value
 * @param {string} encryptedValue - Encrypted value
 * @returns {string} Decrypted value
 */
function decryptValue(encryptedValue) {
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedValue, ENCRYPTION_KEY);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        return decrypted || encryptedValue;
    } catch (error) {
        console.error('Decryption error:', error.message);
        return encryptedValue;
    }
}

/**
 * Extract variable names from template
 * Useful for determining what credential fields are needed
 * @param {string} template - Template string
 * @returns {Array<string>} Array of variable names
 */
function extractVariables(template) {
    if (!template || typeof template !== 'string') {
        return [];
    }

    const matches = template.matchAll(/\{\{([^}]+)\}\}/g);
    const variables = [];

    for (const match of matches) {
        const fieldName = match[1].trim();
        if (!variables.includes(fieldName)) {
            variables.push(fieldName);
        }
    }

    return variables;
}

/**
 * Check if a string contains template variables
 * @param {string} str - String to check
 * @returns {boolean} True if contains {{variable}} syntax
 */
function hasTemplateVariables(str) {
    return str && typeof str === 'string' && str.includes('{{');
}

module.exports = {
    parseTemplate,
    extractVariables,
    hasTemplateVariables,
    isEncrypted,
    decryptValue
};
