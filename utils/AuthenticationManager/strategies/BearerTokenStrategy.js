/**
 * BearerTokenStrategy.js
 * Handles Bearer Token authentication
 */

const BaseStrategy = require('./BaseStrategy');

class BearerTokenStrategy extends BaseStrategy {
    /**
     * Build headers for Bearer Token authentication
     * @param {Object} credentials - Contains token
     * @param {Object} config - Contains headerName and prefix
     * @param {Object} variables - Dynamic variables
     * @returns {Promise<Object>} Headers object
     */
    async buildHeaders(credentials, config, variables) {
        const token = this.decryptCredential(credentials.token);
        const headerName = config.headerName || 'Authorization';
        const prefix = config.prefix !== undefined ? config.prefix : 'Bearer ';

        return {
            [headerName]: prefix + token
        };
    }
}

module.exports = BearerTokenStrategy;
