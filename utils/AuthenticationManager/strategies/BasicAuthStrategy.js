/**
 * BasicAuthStrategy.js
 * Handles Basic Authentication and Basic Auth (API Key)
 */

const BaseStrategy = require('./BaseStrategy');

class BasicAuthStrategy extends BaseStrategy {
    /**
     * Build headers for Basic Authentication
     *
     * Purpose: Creates the Authorization header with Basic auth format (Base64 encoded username:password)
     * and merges with additional headers from additionalFields (e.g., User-Agent, Accept).
     * Supports flexible credential patterns via template variables.
     *
     * @param {Object} credentials - Contains username/password OR apiKey and any user-filled additional field values
     * @param {Object} config - Auth config with username/password templates and additionalFields
     * @param {Object} variables - Dynamic variables for template replacement
     * @returns {Promise<Object>} Complete headers object including auth and additional headers
     *
     * @example
     * // Traditional username/password
     * await buildHeaders(
     *   { username: "admin", password: "secret" },
     *   { username: "{{username}}", password: "{{password}}" },
     *   {}
     * );
     * // => { "Authorization": "Basic YWRtaW46c2VjcmV0" }
     *
     * @example
     * // API key pattern (Freshdesk)
     * await buildHeaders(
     *   { apiKey: "abc123" },
     *   { username: "{{apiKey}}", password: "X" },
     *   {}
     * );
     * // => { "Authorization": "Basic YWJjMTIzOlg=" }
     *
     * @example
     * // Complex pattern (Zendesk)
     * await buildHeaders(
     *   { email: "user@example.com", token: "token123", password: "pass" },
     *   { username: "{{email}}/{{token}}", password: "{{password}}" },
     *   {}
     * );
     * // => { "Authorization": "Basic dXNlckBleGFtcGxlLmNvbS90b2tlbjEyMzpwYXNz" }
     */
    async buildHeaders(credentials, config, variables) {
        // Get username and password from config (supports both static values and templates)
        // Examples:
        //   - Static: username="api", password="X"
        //   - Template: username="{{apiKey}}", password="X"
        //   - Complex: username="{{email}}/{{token}}", password="{{password}}"
        const usernameTemplate = config.username || '{{username}}';
        const passwordTemplate = config.password || '{{password}}';

        // Parse templates - replaces {{variable}} with actual credential values
        // If no template syntax, returns value as-is (backward compatible)
        const username = this.parseTemplateValue(usernameTemplate, credentials, variables);
        const password = this.parseTemplateValue(passwordTemplate, credentials, variables);

        // Encode credentials in Base64
        const authString = `${username}:${password}`;
        const base64Auth = Buffer.from(authString).toString('base64');

        // Build main authentication header
        const authHeaders = {
            'Authorization': `Basic ${base64Auth}`
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

module.exports = BasicAuthStrategy;
