/**
 * CustomHeadersStrategy.js
 * Handles Custom Headers authentication
 */

const BaseStrategy = require('./BaseStrategy');

class CustomHeadersStrategy extends BaseStrategy {
    /**
     * Build custom headers for authentication
     * @param {Object} credentials - Dynamic credentials based on headers config
     * @param {Object} config - Contains headers array defining which headers to use
     * @param {Object} variables - Dynamic variables
     * @returns {Promise<Object>} Headers object
     */
    async buildHeaders(credentials, config, variables) {
        const headers = {};

        if (!config.headers || !Array.isArray(config.headers)) {
            throw new Error('Custom headers config must include headers array');
        }

        // Build each custom header
        for (const headerConfig of config.headers) {
            const headerName = headerConfig.headerName;
            const credentialKey = headerConfig.credentialKey;
            const prefix = headerConfig.prefix || '';

            if (!credentials[credentialKey]) {
                console.warn(`Missing credential for custom header: ${credentialKey}`);
                continue;
            }

            const credentialValue = this.decryptCredential(credentials[credentialKey]);
            headers[headerName] = prefix + credentialValue;
        }

        return headers;
    }
}

module.exports = CustomHeadersStrategy;
