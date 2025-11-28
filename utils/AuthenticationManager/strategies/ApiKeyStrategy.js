/**
 * ApiKeyStrategy.js
 * Handles API Key authentication (Header and Query parameter)
 */

const BaseStrategy = require('./BaseStrategy');

class ApiKeyStrategy extends BaseStrategy {
    /**
     * Build headers for API Key authentication
     * @param {Object} credentials - Contains apiKey
     * @param {Object} config - Contains headerName, prefix, paramName
     * @param {Object} variables - Dynamic variables
     * @returns {Promise<Object>} Headers object
     */
    async buildHeaders(credentials, config, variables) {
        const apiKey = this.decryptCredential(credentials.apiKey);
        const headers = {};

        // API Key in header
        if (config.headerName) {
            const prefix = config.prefix || '';
            headers[config.headerName] = prefix + apiKey;
        }

        // Store param name for query param auth (will be handled in testConnection)
        if (config.paramName) {
            headers['_apiKeyParamName'] = config.paramName;
            headers['_apiKeyValue'] = apiKey;
        }

        return headers;
    }

    /**
     * Test connection - handle query param auth
     */
    async testConnection(testUrl, headers, testConfig) {
        // Check if this is query param auth
        if (headers['_apiKeyParamName']) {
            const paramName = headers['_apiKeyParamName'];
            const apiKey = headers['_apiKeyValue'];

            // Remove temporary headers
            delete headers['_apiKeyParamName'];
            delete headers['_apiKeyValue'];

            // Add API key to URL as query parameter
            const separator = testUrl.includes('?') ? '&' : '?';
            testUrl = `${testUrl}${separator}${paramName}=${encodeURIComponent(apiKey)}`;
        }

        return super.testConnection(testUrl, headers, testConfig);
    }
}

module.exports = ApiKeyStrategy;
