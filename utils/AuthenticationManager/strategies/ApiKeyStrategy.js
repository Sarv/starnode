/**
 * ApiKeyStrategy.js
 * Handles API Key authentication (Header and Query parameter)
 */

const BaseStrategy = require('./BaseStrategy');

class ApiKeyStrategy extends BaseStrategy {
    /**
     * Build headers for API Key authentication
     *
     * Purpose: Creates headers for API key authentication (both header-based and query parameter-based)
     * and merges with additional headers from additionalFields (e.g., User-Agent, Accept).
     *
     * Note: For query parameter authentication, the API key is stored in temporary headers
     * (_apiKeyParamName, _apiKeyValue) and will be converted to URL query parameters
     * in the testConnection method.
     *
     * @param {Object} credentials - Contains apiKey and any user-filled additional field values
     * @param {Object} config - Contains headerName/paramName, prefix, apiKeyValue, and additionalFields
     * @param {Object} variables - Dynamic variables for template replacement
     * @returns {Promise<Object>} Headers object including auth headers and additional headers
     *
     * @example
     * // Header-based API key
     * await buildHeaders(
     *   { apiKey: "abc123" },
     *   { headerName: "X-API-Key", apiKeyValue: "{{apiKey}}" },
     *   {}
     * );
     * // => { "X-API-Key": "abc123" }
     *
     * @example
     * // Query parameter API key (stored temporarily in headers)
     * await buildHeaders(
     *   { apiKey: "abc123" },
     *   { paramName: "api_key", apiKeyValue: "{{apiKey}}" },
     *   {}
     * );
     * // => { "_apiKeyParamName": "api_key", "_apiKeyValue": "abc123" }
     * // (Later converted to URL: ?api_key=abc123)
     */
    async buildHeaders(credentials, config, variables) {
        const headers = {};

        // API Key in header
        if (config.headerName) {
            // Parse header name (usually static, but could be template)
            const headerName = this.parseTemplateValue(config.headerName, credentials, variables);

            // Parse prefix (could be static like "Bearer " or template)
            const prefix = config.prefix ? this.parseTemplateValue(config.prefix, credentials, variables) : '';

            // Parse API key value (supports templates like {{apiKey}} or {{key1}}-{{key2}})
            const apiKeyTemplate = config.apiKeyValue || '{{apiKey}}';
            const apiKey = this.parseTemplateValue(apiKeyTemplate, credentials, variables);

            headers[headerName] = prefix + apiKey;
        }

        // Store param name for query param auth (will be handled in testConnection)
        if (config.paramName) {
            // Parse param name (usually static, but could be template)
            const paramName = this.parseTemplateValue(config.paramName, credentials, variables);

            // Parse API key value
            const apiKeyTemplate = config.apiKeyValue || '{{apiKey}}';
            const apiKey = this.parseTemplateValue(apiKeyTemplate, credentials, variables);

            headers['_apiKeyParamName'] = paramName;
            headers['_apiKeyValue'] = apiKey;
        }

        // Build additional headers from additionalFields (e.g., User-Agent, Accept)
        const additionalHeaders = this.buildAdditionalHeaders(
            config.additionalFields || [],
            credentials,
            variables
        );

        // Merge and return all headers
        return {
            ...headers,
            ...additionalHeaders
        };
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
