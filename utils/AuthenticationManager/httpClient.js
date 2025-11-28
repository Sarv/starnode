/**
 * httpClient.js
 * Wrapper around Node.js https/http module for making HTTP requests
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

class HttpClient {
    /**
     * Make HTTP request
     * @param {string} url - Full URL to request
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Response object with statusCode, headers, body, json
     */
    static async request(url, options = {}) {
        return new Promise((resolve, reject) => {
            try {
                const parsedUrl = new URL(url);
                const isHttps = parsedUrl.protocol === 'https:';
                const client = isHttps ? https : http;

                const requestOptions = {
                    hostname: parsedUrl.hostname,
                    port: parsedUrl.port || (isHttps ? 443 : 80),
                    path: parsedUrl.pathname + parsedUrl.search,
                    method: options.method || 'GET',
                    headers: options.headers || {},
                    timeout: options.timeout || 10000
                };

                const req = client.request(requestOptions, (res) => {
                    let data = '';

                    res.on('data', (chunk) => {
                        data += chunk;
                    });

                    res.on('end', () => {
                        const result = {
                            statusCode: res.statusCode,
                            statusMessage: res.statusMessage,
                            headers: res.headers,
                            body: data
                        };

                        // Try to parse JSON response
                        try {
                            result.json = JSON.parse(data);
                        } catch (e) {
                            result.json = null;
                        }

                        resolve(result);
                    });
                });

                req.on('error', (error) => {
                    reject(new Error(`Request failed: ${error.message}`));
                });

                req.on('timeout', () => {
                    req.destroy();
                    reject(new Error('Request timeout - Provider API did not respond in time'));
                });

                // Send body if provided
                if (options.body) {
                    const bodyData = typeof options.body === 'string'
                        ? options.body
                        : JSON.stringify(options.body);
                    req.write(bodyData);
                }

                req.end();
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Make GET request
     * @param {string} url - Full URL
     * @param {Object} headers - Request headers
     * @param {number} timeout - Timeout in ms
     * @returns {Promise<Object>} Response object
     */
    static async get(url, headers = {}, timeout = 10000) {
        return this.request(url, { method: 'GET', headers, timeout });
    }

    /**
     * Make POST request
     * @param {string} url - Full URL
     * @param {Object|string} body - Request body
     * @param {Object} headers - Request headers
     * @param {number} timeout - Timeout in ms
     * @returns {Promise<Object>} Response object
     */
    static async post(url, body = {}, headers = {}, timeout = 10000) {
        return this.request(url, { method: 'POST', body, headers, timeout });
    }

    /**
     * Make PUT request
     */
    static async put(url, body = {}, headers = {}, timeout = 10000) {
        return this.request(url, { method: 'PUT', body, headers, timeout });
    }

    /**
     * Make DELETE request
     */
    static async delete(url, headers = {}, timeout = 10000) {
        return this.request(url, { method: 'DELETE', headers, timeout });
    }
}

module.exports = HttpClient;
