/**
 * AuthenticationManager.js
 * Main class that orchestrates authentication for different auth types
 */

const ApiKeyStrategy = require('./strategies/ApiKeyStrategy');
const BasicAuthStrategy = require('./strategies/BasicAuthStrategy');
const BearerTokenStrategy = require('./strategies/BearerTokenStrategy');
const OAuth2Strategy = require('./strategies/OAuth2Strategy');
const CustomHeadersStrategy = require('./strategies/CustomHeadersStrategy');

class AuthenticationManager {
    constructor(connection, authTypeDefinition, authMethodConfig) {
        this.connection = connection;
        this.authTypeDefinition = authTypeDefinition;
        this.authMethodConfig = authMethodConfig;
        this.authType = authMethodConfig.authType;

        // Load appropriate strategy
        this.strategy = this.loadStrategy(this.authType);
    }

    /**
     * Load the appropriate strategy based on auth type
     * @param {string} authType - Auth type identifier
     * @returns {BaseStrategy} Strategy instance
     */
    loadStrategy(authType) {
        const strategies = {
            'api_key_header': new ApiKeyStrategy(),
            'api_key_query': new ApiKeyStrategy(),
            'bearer_token': new BearerTokenStrategy(),
            'basic_auth': new BasicAuthStrategy(),
            'basic_auth_api_key': new BasicAuthStrategy(),
            'custom_headers': new CustomHeadersStrategy(),
            'oauth2_authorization_code': new OAuth2Strategy(),
            'oauth2_client_credentials': new OAuth2Strategy(),
            'oauth2_service_account': new OAuth2Strategy()
        };

        const strategy = strategies[authType];
        if (!strategy) {
            throw new Error(`Unsupported auth type: ${authType}`);
        }

        return strategy;
    }

    /**
     * Build authentication headers/params
     *
     * Purpose: Builds complete authentication headers by calling the appropriate strategy
     * and passing credentials, config, variables, and tokens. Ensures additionalFields
     * from authMethodConfig are included in config for header generation.
     *
     * @returns {Promise<Object>} Complete headers object including auth and additional headers
     */
    async buildAuthHeaders() {
        // Merge config with additionalFields so strategies can access both
        // This allows strategies to build both auth headers and additional headers (User-Agent, Accept, etc.)
        const fullConfig = {
            ...(this.authMethodConfig.config || {}),
            additionalFields: this.authMethodConfig.additionalFields || []
        };

        return await this.strategy.buildHeaders(
            this.connection.credentials,
            fullConfig,
            this.connection.configuredVariables || {},
            this.connection.storedTokens || {}
        );
    }

    /**
     * Test connection to provider API
     * @param {string} testUrl - Full test URL
     * @param {Object} testConfig - Test configuration
     * @returns {Promise<Object>} Test result
     */
    async testConnection(testUrl, testConfig) {
        try {
            // Check token expiry for OAuth (if applicable)
            if (this.strategy.supportsTokenRefresh && testConfig.checkTokenExpiry) {
                const tokenStatus = await this.checkTokenExpiry();

                if (tokenStatus.expired && testConfig.autoRefreshToken) {
                    console.log('Token expired, refreshing...');
                    await this.refreshToken();
                } else if (tokenStatus.expired && !testConfig.autoRefreshToken) {
                    return {
                        success: false,
                        statusCode: null,
                        message: 'Access token expired',
                        details: { tokenStatus: 'expired' }
                    };
                }
            }

            // Build authentication headers
            const authHeaders = await this.buildAuthHeaders();

            // Make test request with full URL
            const result = await this.strategy.testConnection(
                testUrl,
                authHeaders,
                testConfig
            );

            return result;

        } catch (error) {
            const ErrorHandler = require('./helpers/errorHandler');
            return ErrorHandler.formatError(error);
        }
    }

    /**
     * Check if token is expired (OAuth only)
     * @returns {Promise<Object>} Expiry status
     */
    async checkTokenExpiry() {
        if (!this.strategy.supportsTokenRefresh) {
            return { expired: false };
        }

        const TokenValidator = require('./helpers/tokenValidator');
        return TokenValidator.checkExpiry(this.connection.storedTokens);
    }

    /**
     * Refresh expired token (OAuth only)
     * @returns {Promise<Object>} New tokens
     */
    async refreshToken() {
        if (!this.strategy.supportsTokenRefresh) {
            throw new Error('Token refresh not supported for this auth type');
        }

        const newTokens = await this.strategy.refreshToken(
            this.connection.credentials,
            this.connection.storedTokens,
            this.authMethodConfig.config
        );

        // Update connection with new tokens in database
        if (this.connection.connectionId) {
            const elasticsearch = require('../../services/elasticsearch');
            await elasticsearch.updateConnection(this.connection.connectionId, {
                storedTokens: newTokens
            });
        }

        // Update local instance
        this.connection.storedTokens = newTokens;

        return newTokens;
    }

    /**
     * Validate credentials (basic validation before making request)
     * @returns {boolean} True if valid
     */
    validateCredentials() {
        const authTypeFields = this.authTypeDefinition.credentialFields;
        const providedCreds = this.connection.credentials;

        if (!authTypeFields || !providedCreds) {
            throw new Error('Missing authentication configuration');
        }

        const missing = [];

        for (const [fieldKey, fieldDef] of Object.entries(authTypeFields)) {
            // Skip dynamic credential fields (for custom_headers)
            if (fieldKey === '_dynamic') continue;

            if (fieldDef.required && !providedCreds[fieldKey]) {
                missing.push(fieldKey);
            }
        }

        if (missing.length > 0) {
            throw new Error(`Missing required credentials: ${missing.join(', ')}`);
        }

        return true;
    }

    /**
     * Execute an API request with authentication and variable replacement
     * @param {Object} apiConfig - API configuration object
     * @param {string} apiConfig.url - Request URL (may contain {{variables}})
     * @param {string} apiConfig.method - HTTP method
     * @param {Object} apiConfig.headers - Request headers (may contain {{variables}})
     * @param {Object|string} apiConfig.body - Request body (may contain {{variables}})
     * @param {Object} apiConfig.params - Query parameters (may contain {{variables}})
     * @param {Object} variableValues - Values to replace {{variables}} with
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} API response with detailed information
     */
    async executeApiRequest(apiConfig, variableValues = {}, options = {}) {
        try {
            const HttpClient = require('./httpClient');
            const { replaceDynamicVariables } = require('../dynamicVariables');

            console.log('[AuthManager] Received variableValues:', variableValues);
            console.log('[AuthManager] Original URL:', apiConfig.url);

            // Build authentication headers
            const authHeaders = await this.buildAuthHeaders();

            // Replace variables in URL
            let processedUrl = replaceDynamicVariables(apiConfig.url, variableValues);

            // Ensure URL has protocol
            if (!processedUrl.startsWith('http://') && !processedUrl.startsWith('https://')) {
                processedUrl = 'https://' + processedUrl;
            }

            console.log('[AuthManager] Processed URL after replacement:', processedUrl);

            // Replace variables in headers and merge with auth headers
            let processedHeaders = { ...authHeaders };
            console.log('[AuthManager] Auth headers:', authHeaders);
            console.log('[AuthManager] API config headers:', apiConfig.headers);

            if (apiConfig.headers) {
                // Handle both array format [{ key, value }] and object format
                if (Array.isArray(apiConfig.headers)) {
                    apiConfig.headers.forEach(header => {
                        if (header.key && header.value) {
                            const value = typeof header.value === 'string'
                                ? replaceDynamicVariables(header.value, variableValues)
                                : header.value;
                            processedHeaders[header.key] = value;
                        }
                    });
                } else {
                    Object.entries(apiConfig.headers).forEach(([key, value]) => {
                        if (typeof value === 'string') {
                            processedHeaders[key] = replaceDynamicVariables(value, variableValues);
                        } else {
                            processedHeaders[key] = value;
                        }
                    });
                }
            }
            console.log('[AuthManager] Processed headers:', processedHeaders);

            // Replace variables in body
            let processedBody = null;
            if (apiConfig.body) {
                let bodyToProcess = apiConfig.body;

                // Unwrap if body has a 'json' key wrapper
                if (bodyToProcess.json) {
                    bodyToProcess = bodyToProcess.json;
                }

                if (typeof bodyToProcess === 'string') {
                    processedBody = replaceDynamicVariables(bodyToProcess, variableValues);
                    // Try to parse as JSON if it looks like JSON
                    if (processedBody.trim().startsWith('{') || processedBody.trim().startsWith('[')) {
                        try {
                            processedBody = JSON.parse(processedBody);
                        } catch (e) {
                            // Keep as string if not valid JSON
                        }
                    }
                } else if (typeof bodyToProcess === 'object') {
                    // Deep replace in object
                    processedBody = JSON.parse(
                        replaceDynamicVariables(JSON.stringify(bodyToProcess), variableValues)
                    );
                }
            }

            // Replace variables in query params and add to URL
            let processedParams = {};
            if (apiConfig.params) {
                Object.entries(apiConfig.params).forEach(([key, value]) => {
                    if (typeof value === 'string') {
                        processedParams[key] = replaceDynamicVariables(value, variableValues);
                    } else {
                        processedParams[key] = value;
                    }
                });
            }

            // Add query params to URL if present
            if (Object.keys(processedParams).length > 0) {
                const urlObj = new URL(processedUrl.startsWith('http') ? processedUrl : 'https://' + processedUrl);
                Object.entries(processedParams).forEach(([key, value]) => {
                    urlObj.searchParams.append(key, value);
                });
                processedUrl = urlObj.toString();
            }

            // Make the request using HttpClient
            const startTime = Date.now();
            const response = await HttpClient.request(processedUrl, {
                method: apiConfig.method || 'GET',
                headers: processedHeaders,
                body: processedBody,
                timeout: options.timeout || 30000
            });
            const responseTime = Date.now() - startTime;

            // Format the response
            return {
                success: response.statusCode >= 200 && response.statusCode < 300,
                status: response.statusCode,
                statusText: response.statusMessage,
                headers: response.headers,
                data: response.json || response.body,
                responseTime: responseTime,
                request: {
                    url: processedUrl,
                    method: apiConfig.method || 'GET',
                    headers: processedHeaders,
                    params: processedParams,
                    body: processedBody
                }
            };

        } catch (error) {
            const ErrorHandler = require('./helpers/errorHandler');

            // Return error information
            return {
                success: false,
                error: ErrorHandler.formatError(error).message,
                request: {
                    url: apiConfig.url,
                    method: apiConfig.method,
                    headers: apiConfig.headers,
                    params: apiConfig.params || {},
                    body: apiConfig.body
                }
            };
        }
    }
}

module.exports = AuthenticationManager;
