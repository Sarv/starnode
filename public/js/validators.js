/**
 * Validators - Reusable Validation Functions
 *
 * Provides validation functions for different data types and field configurations.
 * Can be used across the entire application for consistent validation.
 */

const Validators = {
    /**
     * Check if value is not empty
     */
    isRequired(value) {
        if (value === null || value === undefined) return false;
        if (typeof value === 'string') return value.trim() !== '';
        if (typeof value === 'number') return true;
        if (typeof value === 'boolean') return true;
        return false;
    },

    /**
     * Check if value is a valid string
     */
    isString(value) {
        return typeof value === 'string';
    },

    /**
     * Check if value matches a regex pattern
     */
    matchesPattern(value, pattern) {
        if (!value) return false;
        const regex = new RegExp(pattern);
        return regex.test(value);
    },

    /**
     * Check if value is a valid number
     */
    isNumber(value) {
        if (value === '' || value === null || value === undefined) return false;
        return !isNaN(parseFloat(value)) && isFinite(value);
    },

    /**
     * Check if number is within range
     */
    isInRange(value, min, max) {
        const num = parseFloat(value);
        if (isNaN(num)) return false;
        if (min !== undefined && num < min) return false;
        if (max !== undefined && num > max) return false;
        return true;
    },

    /**
     * Check if value is a valid URL
     */
    isUrl(value) {
        try {
            new URL(value);
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Check if value is a valid email
     */
    isEmail(value) {
        const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return pattern.test(value);
    },

    /**
     * Check if value is a valid boolean
     */
    isBoolean(value) {
        return typeof value === 'boolean';
    },

    /**
     * Validate a field based on its configuration
     *
     * @param {*} value - The value to validate
     * @param {Object} fieldConfig - Field configuration from panel-config.json
     * @param {string} fieldName - Name of the field (for error messages)
     * @returns {Array} - Array of error messages (empty if valid)
     */
    validateField(value, fieldConfig, fieldName = 'Field') {
        const errors = [];
        const label = fieldConfig.label || fieldName;

        // Required check
        if (fieldConfig.required && !this.isRequired(value)) {
            errors.push(`${label} is required`);
            return errors; // No need to check further if required and empty
        }

        // Skip other validations if not required and empty
        if (!fieldConfig.required && !this.isRequired(value)) {
            return errors;
        }

        // DataType validations
        switch (fieldConfig.dataType) {
            case 'string':
                if (!this.isString(value)) {
                    errors.push(`${label} must be a string`);
                    break;
                }
                // Pattern validation
                if (fieldConfig.pattern && !this.matchesPattern(value, fieldConfig.pattern)) {
                    errors.push(`${label} format is invalid. ${fieldConfig.description || ''}`);
                }
                // Min length
                if (fieldConfig.minLength && value.length < fieldConfig.minLength) {
                    errors.push(`${label} must be at least ${fieldConfig.minLength} characters`);
                }
                // Max length
                if (fieldConfig.maxLength && value.length > fieldConfig.maxLength) {
                    errors.push(`${label} must be at most ${fieldConfig.maxLength} characters`);
                }
                break;

            case 'number':
                if (!this.isNumber(value)) {
                    errors.push(`${label} must be a valid number`);
                    break;
                }
                const numValue = parseFloat(value);
                // Min value
                if (fieldConfig.min !== undefined && numValue < fieldConfig.min) {
                    errors.push(`${label} must be at least ${fieldConfig.min}`);
                }
                // Max value
                if (fieldConfig.max !== undefined && numValue > fieldConfig.max) {
                    errors.push(`${label} must be at most ${fieldConfig.max}`);
                }
                break;

            case 'url':
                if (!this.isUrl(value)) {
                    errors.push(`${label} must be a valid URL (e.g., https://example.com)`);
                }
                break;

            case 'email':
                if (!this.isEmail(value)) {
                    errors.push(`${label} must be a valid email address`);
                }
                break;

            case 'boolean':
                if (!this.isBoolean(value)) {
                    errors.push(`${label} must be true or false`);
                }
                break;

            default:
                // If dataType is not recognized, just check if it's not empty when required
                break;
        }

        return errors;
    },

    /**
     * Validate multiple fields based on config
     *
     * @param {Object} data - Object with field values
     * @param {Object} config - Configuration object with field definitions
     * @returns {Object} - { valid: boolean, errors: { fieldName: [errors] } }
     */
    validateFields(data, config) {
        const allErrors = {};
        let isValid = true;

        Object.keys(config).forEach(fieldName => {
            const fieldConfig = config[fieldName];
            const value = data[fieldName];
            const errors = this.validateField(value, fieldConfig, fieldName);

            if (errors.length > 0) {
                allErrors[fieldName] = errors;
                isValid = false;
            }
        });

        return {
            valid: isValid,
            errors: allErrors
        };
    },

    /**
     * Get first error message from validation result
     */
    getFirstError(validationResult) {
        if (validationResult.valid) return null;

        const firstFieldWithError = Object.keys(validationResult.errors)[0];
        return validationResult.errors[firstFieldWithError][0];
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Validators;
}
