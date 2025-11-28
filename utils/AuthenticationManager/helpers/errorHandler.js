/**
 * errorHandler.js
 * Formats errors for consistent response
 */

class ErrorHandler {
    /**
     * Format error into standardized response
     * @param {Error} error - The error object
     * @param {Number} responseTime - Response time in ms
     * @returns {Object} Formatted error response
     */
    static formatError(error, responseTime = null) {
        let statusCode = null;
        let message = error.message || 'Unknown error';
        let errorType = 'unknown';

        // Categorize errors based on message content
        if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
            errorType = 'timeout';
            message = 'Connection timeout - Provider API did not respond in time';
        } else if (message.includes('ENOTFOUND')) {
            errorType = 'dns_error';
            message = 'DNS resolution failed - Cannot find provider domain';
        } else if (message.includes('ECONNREFUSED')) {
            errorType = 'connection_refused';
            message = 'Connection refused - Provider API is not reachable';
        } else if (message.includes('ECONNRESET')) {
            errorType = 'connection_reset';
            message = 'Connection reset - Provider closed the connection';
        } else if (message.includes('401') || statusCode === 401) {
            errorType = 'authentication';
            statusCode = 401;
            message = 'Authentication failed - Invalid credentials';
        } else if (message.includes('403') || statusCode === 403) {
            errorType = 'authorization';
            statusCode = 403;
            message = 'Authorization failed - Insufficient permissions';
        } else if (message.includes('404') || statusCode === 404) {
            errorType = 'not_found';
            statusCode = 404;
            message = 'Endpoint not found - Check test endpoint URL';
        } else if (message.includes('500') || statusCode === 500) {
            errorType = 'server_error';
            statusCode = 500;
            message = 'Provider server error - Try again later';
        } else if (message.includes('Missing required')) {
            errorType = 'validation';
            message = message; // Keep original validation message
        }

        return {
            success: false,
            statusCode,
            responseTime,
            message,
            error: {
                type: errorType,
                details: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Format HTTP error response
     */
    static formatHttpError(statusCode, responseBody) {
        let errorType = 'http_error';
        let message = `HTTP ${statusCode} error`;

        if (statusCode === 401) {
            errorType = 'authentication';
            message = 'Authentication failed - Invalid credentials';
        } else if (statusCode === 403) {
            errorType = 'authorization';
            message = 'Authorization failed - Insufficient permissions or invalid scopes';
        } else if (statusCode === 404) {
            errorType = 'not_found';
            message = 'Endpoint not found - Check test endpoint configuration';
        } else if (statusCode >= 500) {
            errorType = 'server_error';
            message = 'Provider server error - The provider API is experiencing issues';
        }

        return {
            success: false,
            statusCode,
            message,
            error: {
                type: errorType,
                responseBody: responseBody ? responseBody.substring(0, 500) : null
            },
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = ErrorHandler;
