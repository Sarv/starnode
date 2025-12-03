/**
 * BearerTokenStrategy.js
 * Handles Bearer Token authentication
 */

const BaseStrategy = require('./BaseStrategy');

class BearerTokenStrategy extends BaseStrategy {
    /**
     * Build headers for Bearer Token authentication
     *
     * Purpose: Creates the Authorization header with Bearer token format and merges with
     * any additional headers defined in additionalFields (e.g., User-Agent, Accept).
     *
     * @param {Object} credentials - Contains token and any user-filled additional field values
     * @param {Object} config - Contains headerName, prefix, tokenValue, and additionalFields
     * @param {Object} variables - Dynamic variables for template replacement
     * @returns {Promise<Object>} Complete headers object including auth and additional headers
     *
     * @example
     * // Basic usage
     * await buildHeaders(
     *   { token: "abc123" },
     *   { headerName: "Authorization", prefix: "Bearer ", tokenValue: "{{token}}" },
     *   {}
     * );
     * // => { "Authorization": "Bearer abc123" }
     *
     * @example
     * // With additional headers
     * await buildHeaders(
     *   { token: "abc123" },
     *   {
     *     headerName: "Authorization",
     *     prefix: "Bearer ",
     *     tokenValue: "{{token}}",
     *     additionalFields: [{
     *       name: "userAgent",
     *       useAs: "header",
     *       fillBy: "admin",
     *       headerName: "User-Agent",
     *       defaultValue: "MyApp/1.0"
     *     }]
     *   },
     *   {}
     * );
     * // => { "Authorization": "Bearer abc123", "User-Agent": "MyApp/1.0" }
     */
    async buildHeaders(credentials, config, variables) {
        // Parse header name (usually static "Authorization", but could be template)
        const headerNameTemplate = config.headerName || 'Authorization';
        const headerName = this.parseTemplateValue(headerNameTemplate, credentials, variables);

        // Parse prefix (usually "Bearer ", but could be template or static like "Token ")
        const prefixTemplate = config.prefix !== undefined ? config.prefix : 'Bearer ';
        const prefix = this.parseTemplateValue(prefixTemplate, credentials, variables);

        // Parse token value (supports templates like {{token}}, {{accessToken}}, or {{key1}}-{{key2}})
        const tokenTemplate = config.tokenValue || '{{token}}';
        const token = this.parseTemplateValue(tokenTemplate, credentials, variables);

        // Build main authentication header
        const authHeaders = {
            [headerName]: prefix + token
        };

        // Build additional headers from additionalFields (e.g., User-Agent, Accept)
        const additionalHeaders = this.buildAdditionalHeaders(
            config.additionalFields || [],
            credentials,
            variables
        );

        // Merge and return all headers
        return {
            ...authHeaders,
            ...additionalHeaders
        };
    }
}

module.exports = BearerTokenStrategy;
