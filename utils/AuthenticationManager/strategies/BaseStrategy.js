/**
 * BaseStrategy.js
 * Abstract base class for all authentication strategies
 */

const HttpClient = require('../httpClient');
const CryptoJS = require('crypto-js');

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

            if (success) {
                return {
                    success: true,
                    statusCode: response.statusCode,
                    responseTime,
                    message: 'Connection successful',
                    details: {
                        testUrl,
                        method,
                        responseTime
                    }
                };
            } else {
                const ErrorHandler = require('../helpers/errorHandler');
                return ErrorHandler.formatHttpError(response.statusCode, response.body);
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
