/**
 * CustomHeadersStrategy.js
 * Handles Custom Headers authentication
 */

const BaseStrategy = require('./BaseStrategy');

class CustomHeadersStrategy extends BaseStrategy {
    /**
     * Build custom headers for authentication
     *
     * Purpose: Creates multiple custom authentication headers based on config.headers array
     * and merges with additional headers from additionalFields (e.g., User-Agent, Accept).
     * Supports both legacy credentialKey approach and new value template approach.
     *
     * @param {Object} credentials - Dynamic credentials based on headers config and any user-filled additional field values
     * @param {Object} config - Contains headers array defining custom auth headers and additionalFields
     * @param {Object} variables - Dynamic variables for template replacement
     * @returns {Promise<Object>} Complete headers object including custom auth and additional headers
     *
     * @example
     * // Custom headers with direct values
     * await buildHeaders(
     *   { clientId: "123", apiSecret: "secret" },
     *   {
     *     headers: [
     *       { headerName: "X-Client-ID", value: "{{clientId}}" },
     *       { headerName: "X-API-Secret", value: "{{apiSecret}}" }
     *     ]
     *   },
     *   {}
     * );
     * // => { "X-Client-ID": "123", "X-API-Secret": "secret" }
     *
     * @example
     * // Legacy credentialKey approach
     * await buildHeaders(
     *   { authToken: "abc123", userId: "user456" },
     *   {
     *     headers: [
     *       { headerName: "X-Auth-Token", credentialKey: "authToken" },
     *       { headerName: "X-User-ID", credentialKey: "userId" }
     *     ]
     *   },
     *   {}
     * );
     * // => { "X-Auth-Token": "abc123", "X-User-ID": "user456" }
     */
    async buildHeaders(credentials, config, variables) {
        const headers = {};

        if (!config.headers || !Array.isArray(config.headers)) {
            throw new Error('Custom headers config must include headers array');
        }

        // Build each custom header
        for (const headerConfig of config.headers) {
            // Parse header name (supports templates like {{customHeaderName}})
            const headerNameTemplate = headerConfig.headerName;
            if (!headerNameTemplate) {
                console.warn('Custom header missing headerName');
                continue;
            }
            const headerName = this.parseTemplateValue(headerNameTemplate, credentials, variables);

            // Parse prefix (supports templates)
            const prefixTemplate = headerConfig.prefix || '';
            const prefix = this.parseTemplateValue(prefixTemplate, credentials, variables);

            // Parse header value - supports two approaches:
            // 1. credentialKey: points to a credential field (legacy approach)
            // 2. value: direct template value (new approach, more flexible)
            let headerValue = '';

            if (headerConfig.value) {
                // New approach: direct template value
                // Supports complex templates like "{{key1}}-{{key2}}" or "Bearer {{token}}"
                headerValue = this.parseTemplateValue(headerConfig.value, credentials, variables);
            } else if (headerConfig.credentialKey) {
                // Legacy approach: credentialKey points to a field
                const credentialKey = headerConfig.credentialKey;
                if (!credentials[credentialKey]) {
                    console.warn(`Missing credential for custom header: ${credentialKey}`);
                    continue;
                }
                // Build template from credentialKey
                headerValue = this.parseTemplateValue(`{{${credentialKey}}}`, credentials, variables);
            } else {
                console.warn('Custom header missing both value and credentialKey');
                continue;
            }

            headers[headerName] = prefix + headerValue;
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
}

module.exports = CustomHeadersStrategy;
