/**
 * BaseStrategy.js
 * Abstract base class for all authentication strategies
 */

const HttpClient = require('../httpClient');
const CryptoJS = require('crypto-js');
const { parseTemplate, hasTemplateVariables } = require('../helpers/templateParser');

class BaseStrategy {
    constructor() {
        this.supportsTokenRefresh = false;
    }

    /**
     * Build authentication headers (must be implemented by subclass)
     * @param {Object} credentials - User credentials
     * @param {Object} config - Auth method config
     * @param {Object} variables - Dynamic variables
     * @returns {Promise<Object>} Headers object
     */
    async buildHeaders(credentials, config, variables) {
        throw new Error('buildHeaders must be implemented by subclass');
    }

    /**
     * Test connection (common implementation for HTTP-based auth)
     * @param {string} testUrl - Full test URL
     * @param {Object} headers - Authentication headers
     * @param {Object} testConfig - Test configuration
     * @returns {Promise<Object>} Test result
     */
    async testConnection(testUrl, headers, testConfig) {
        try {
            const method = testConfig.method || 'GET';
            const timeout = testConfig.timeout || 10000;

            const startTime = Date.now();
            const response = await HttpClient.request(testUrl, {
                method,
                headers,
                timeout
            });
            const responseTime = Date.now() - startTime;

            const expectedCodes = testConfig.expectedStatusCodes || [200, 201];
            const success = expectedCodes.includes(response.statusCode);

            // Sanitize headers for display (hide sensitive data)
            const sanitizedHeaders = {};
            for (const [key, value] of Object.entries(headers)) {
                if (key.toLowerCase().includes('authorization') ||
                    key.toLowerCase().includes('api-key') ||
                    key.toLowerCase().includes('token')) {
                    // Show only first 10 chars for sensitive headers
                    sanitizedHeaders[key] = value.substring(0, 10) + '...[REDACTED]';
                } else {
                    sanitizedHeaders[key] = value;
                }
            }

            if (success) {
                return {
                    success: true,
                    statusCode: response.statusCode,
                    responseTime,
                    message: 'Connection successful',
                    responseBody: response.json || response.body,
                    responseHeaders: response.headers,
                    request: {
                        url: testUrl,
                        method,
                        headers: sanitizedHeaders
                    },
                    details: {
                        testUrl,
                        method,
                        responseTime
                    }
                };
            } else {
                const ErrorHandler = require('../helpers/errorHandler');
                const error = ErrorHandler.formatHttpError(response.statusCode, response.body);
                // Add request details to error response
                error.request = {
                    url: testUrl,
                    method,
                    headers: sanitizedHeaders
                };
                error.responseHeaders = response.headers;
                return error;
            }

        } catch (error) {
            return {
                success: false,
                statusCode: null,
                message: error.message,
                details: {
                    testUrl,
                    error: error.message
                }
            };
        }
    }

    /**
     * Decrypt credential (common utility)
     * @param {string} encryptedValue - Encrypted credential value
     * @returns {string} Decrypted value
     */
    decryptCredential(encryptedValue) {
        try {
            const SECRET_KEY = process.env.ENCRYPTION_KEY || 'default-secret-key-change-in-production';
            const decrypted = CryptoJS.AES.decrypt(encryptedValue, SECRET_KEY);
            const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);

            // If decryption fails, it might be plain text (for development/testing)
            if (!decryptedString) {
                console.warn('Decryption failed, using value as-is. Ensure credentials are encrypted in production.');
                return encryptedValue;
            }

            return decryptedString;
        } catch (error) {
            console.error('Error decrypting credential:', error);
            // Fallback to plain text for development
            return encryptedValue;
        }
    }

    /**
     * Parse template string and replace with credential values
     * @param {string} template - Template string with {{variable}} syntax
     * @param {Object} credentials - User credentials
     * @param {Object} variables - Additional variables
     * @returns {string} Parsed value
     */
    parseTemplateValue(template, credentials = {}, variables = {}) {
        return parseTemplate(template, credentials, variables, true);
    }

    /**
     * Build HTTP headers from additionalFields configuration
     *
     * Purpose: Extracts fields marked with useAs="header" from additionalFields and creates HTTP headers.
     * Supports both admin-filled (fillBy="admin") and user-filled (fillBy="user") header values.
     * Template variables like {{variable}} are automatically parsed and replaced with actual values.
     *
     * Use Cases:
     * - Adding required headers like User-Agent, Accept, X-API-Version
     * - Supporting APIs that need custom headers for authentication
     * - Combining static (admin-set) and dynamic (user-provided) header values
     *
     * @param {Array} additionalFields - Array of field definitions from auth schema
     * @param {Object} credentials - User-provided credential values (for fillBy="user")
     * @param {Object} variables - Dynamic variables for URL/template replacement
     * @returns {Object} Object with HTTP header names as keys and header values
     *
     * @example
     * // Admin-filled header (set during integration creation)
     * const fields = [{
     *   name: "userAgent",
     *   useAs: "header",
     *   fillBy: "admin",
     *   headerName: "User-Agent",
     *   defaultValue: "MyApp/1.0"
     * }];
     * buildAdditionalHeaders(fields, {}, {});
     * // => { "User-Agent": "MyApp/1.0" }
     *
     * @example
     * // User-filled header (provided during connection)
     * const fields = [{
     *   name: "customToken",
     *   useAs: "header",
     *   fillBy: "user",
     *   headerName: "X-Custom-Token"
     * }];
     * buildAdditionalHeaders(fields, { customToken: "abc123" }, {});
     * // => { "X-Custom-Token": "abc123" }
     *
     * @example
     * // Template variable in header value
     * const fields = [{
     *   name: "authHeader",
     *   useAs: "header",
     *   fillBy: "admin",
     *   headerName: "X-Auth",
     *   defaultValue: "Bearer {{token}}"
     * }];
     * buildAdditionalHeaders(fields, { token: "xyz" }, {});
     * // => { "X-Auth": "Bearer xyz" }
     */
    buildAdditionalHeaders(additionalFields, credentials, variables) {
        const headers = {};

        // Return empty if no additionalFields provided
        if (!Array.isArray(additionalFields)) {
            return headers;
        }

        // Process only fields marked as headers
        additionalFields
            .filter(field => field.useAs === 'header')
            .forEach(field => {
                // Use headerName if specified, otherwise fall back to field name
                const headerName = field.headerName || field.name;
                let headerValue;

                if (field.fillBy === 'admin') {
                    // Admin-filled: use defaultValue (set during integration creation)
                    headerValue = field.defaultValue || '';
                } else {
                    // User-filled: get from credentials or variables
                    // Priority: credentials > variables > defaultValue
                    headerValue = credentials[field.name] ||
                                 variables[field.name] ||
                                 field.defaultValue || '';
                }

                // Parse template variables if present (e.g., {{token}}, {{apiKey}})
                if (headerValue) {
                    headerValue = this.parseTemplateValue(
                        String(headerValue),
                        credentials,
                        variables
                    );
                }

                // Only add header if value is not empty
                if (headerValue) {
                    headers[headerName] = headerValue;
                }
            });

        return headers;
    }

    /**
     * Refresh token (override if auth type supports refresh)
     * @param {Object} credentials - User credentials
     * @param {Object} storedTokens - Currently stored tokens
     * @param {Object} config - Auth method config
     * @returns {Promise<Object>} New tokens
     */
    async refreshToken(credentials, storedTokens, config) {
        throw new Error('Token refresh not supported for this auth type');
    }
}

module.exports = BaseStrategy;
