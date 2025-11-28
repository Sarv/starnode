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
     * @returns {Promise<Object>} Headers object
     */
    async buildAuthHeaders() {
        return await this.strategy.buildHeaders(
            this.connection.credentials,
            this.authMethodConfig.config || {},
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
}

module.exports = AuthenticationManager;
