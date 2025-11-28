/**
 * OAuth2Strategy.js
 * Handles OAuth 2.0 authentication (all grant types)
 * Supports token refresh
 */

const BaseStrategy = require('./BaseStrategy');
const HttpClient = require('../httpClient');

class OAuth2Strategy extends BaseStrategy {
    constructor() {
        super();
        this.supportsTokenRefresh = true;
    }

    /**
     * Build headers for OAuth 2.0 authentication
     * Note: The actual token is added by AuthenticationManager from storedTokens
     * @param {Object} credentials - Contains clientId and clientSecret
     * @param {Object} config - OAuth config
     * @param {Object} variables - Dynamic variables
     * @param {Object} storedTokens - Stored OAuth tokens
     * @returns {Promise<Object>} Headers object
     */
    async buildHeaders(credentials, config, variables, storedTokens) {
        const headers = {};

        // Add access token from stored tokens
        if (storedTokens && storedTokens.accessToken) {
            const tokenType = storedTokens.tokenType || 'Bearer';
            headers['Authorization'] = `${tokenType} ${storedTokens.accessToken}`;
        }

        return headers;
    }

    /**
     * Refresh expired OAuth token
     * @param {Object} credentials - Contains clientId and clientSecret
     * @param {Object} storedTokens - Current stored tokens (including refreshToken)
     * @param {Object} config - OAuth config (tokenUrl, refreshTokenUrl)
     * @returns {Promise<Object>} New tokens object
     */
    async refreshToken(credentials, storedTokens, config) {
        try {
            if (!storedTokens || !storedTokens.refreshToken) {
                throw new Error('No refresh token available');
            }

            const tokenUrl = config.refreshTokenUrl || config.tokenUrl;
            if (!tokenUrl) {
                throw new Error('Token URL not configured');
            }

            // Prepare refresh request body
            const requestBody = {
                grant_type: 'refresh_token',
                refresh_token: storedTokens.refreshToken,
                client_id: credentials.clientId,
                client_secret: this.decryptCredential(credentials.clientSecret)
            };

            // Convert to URL-encoded format
            const bodyString = Object.entries(requestBody)
                .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
                .join('&');

            // Make token refresh request
            const response = await HttpClient.post(
                tokenUrl,
                bodyString,
                {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                15000 // 15 second timeout for token refresh
            );

            if (response.statusCode !== 200) {
                throw new Error(`Token refresh failed with status ${response.statusCode}: ${response.body}`);
            }

            const tokens = response.json;
            if (!tokens || !tokens.access_token) {
                throw new Error('Invalid token response - missing access_token');
            }

            // Calculate expiry timestamp
            const TokenValidator = require('../helpers/tokenValidator');
            const expiresAt = TokenValidator.calculateExpiryTimestamp(tokens.expires_in);

            // Return new token set
            return {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token || storedTokens.refreshToken, // Keep old if not provided
                tokenType: tokens.token_type || 'Bearer',
                expiresIn: tokens.expires_in,
                expiresAt: expiresAt,
                scope: tokens.scope || storedTokens.scope
            };

        } catch (error) {
            throw new Error(`Token refresh failed: ${error.message}`);
        }
    }
}

module.exports = OAuth2Strategy;
