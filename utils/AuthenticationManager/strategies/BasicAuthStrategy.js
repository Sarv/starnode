/**
 * BasicAuthStrategy.js
 * Handles Basic Authentication
 */

const BaseStrategy = require('./BaseStrategy');

class BasicAuthStrategy extends BaseStrategy {
    /**
     * Build headers for Basic Authentication
     * @param {Object} credentials - Contains username and password
     * @param {Object} config - Auth config
     * @param {Object} variables - Dynamic variables
     * @returns {Promise<Object>} Headers object
     */
    async buildHeaders(credentials, config, variables) {
        const username = credentials.username;
        const password = this.decryptCredential(credentials.password);

        // Encode credentials in Base64
        const authString = `${username}:${password}`;
        const base64Auth = Buffer.from(authString).toString('base64');

        return {
            'Authorization': `Basic ${base64Auth}`
        };
    }
}

module.exports = BasicAuthStrategy;
