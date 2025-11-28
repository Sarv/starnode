/**
 * tokenValidator.js
 * Validates OAuth token expiry
 */

class TokenValidator {
    /**
     * Check if token is expired
     */
    static checkExpiry(storedTokens) {
        if (!storedTokens || !storedTokens.expiresAt) {
            return {
                expired: false,
                message: 'No expiry info available',
                expiresAt: null,
                remainingTime: null
            };
        }

        const now = Date.now();
        const expiresAt = storedTokens.expiresAt;
        const bufferTime = 60000; // 1 minute buffer

        const expired = now >= (expiresAt - bufferTime);

        return {
            expired,
            expiresAt,
            remainingTime: expiresAt - now,
            message: expired ? 'Token expired' : 'Token valid'
        };
    }

    /**
     * Calculate expiry timestamp from expiresIn seconds
     */
    static calculateExpiryTimestamp(expiresIn) {
        if (!expiresIn) {
            return null;
        }
        return Date.now() + (expiresIn * 1000);
    }
}

module.exports = TokenValidator;
