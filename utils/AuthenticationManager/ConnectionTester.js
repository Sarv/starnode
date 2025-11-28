/**
 * ConnectionTester.js
 * Handles connection testing logic
 */

const fs = require('fs');
const path = require('path');
const AuthenticationManager = require('./AuthenticationManager');
const elasticsearch = require('../../services/elasticsearch');
const dynamicVariables = require('../dynamicVariables');
const configMerger = require('./helpers/configMerger');
const errorHandler = require('./helpers/errorHandler');

class ConnectionTester {
    /**
     * Test an existing connection
     * @param {string} connectionId - Connection ID from Elasticsearch
     * @returns {Promise<Object>} Test result
     */
    static async testExistingConnection(connectionId) {
        const startTime = Date.now();

        try {
            // 1. Load connection from Elasticsearch
            const connection = await elasticsearch.getConnectionById(connectionId);

            if (!connection) {
                throw new Error('Connection not found');
            }

            // 2. Load auth type definition
            const authTypesPath = path.join(__dirname, '../../auth-types-definition.json');
            const authTypesDef = JSON.parse(fs.readFileSync(authTypesPath, 'utf8'));

            // Get auth type from connection or look it up from auth schema
            let authType = connection.authType;

            if (!authType) {
                // Fallback: Load auth schema and find the authType from authMethodId
                const authSchemaPath = path.join(
                    __dirname,
                    '../../integrations/providers',
                    connection.integrationId,
                    'auth.schema.json'
                );

                if (fs.existsSync(authSchemaPath)) {
                    const authSchema = JSON.parse(fs.readFileSync(authSchemaPath, 'utf8'));
                    const authMethod = authSchema.authMethods.find(m => m.id === connection.authMethodId);
                    authType = authMethod?.authType;
                }
            }

            const authTypeDefinition = authTypesDef.authTypes[authType];

            if (!authTypeDefinition) {
                throw new Error(`Auth type definition not found: ${authType}`);
            }

            // 3. Load integration auth schema
            const authSchemaPath = path.join(
                __dirname,
                '../../integrations/providers',
                connection.integrationId,
                'auth.schema.json'
            );

            if (!fs.existsSync(authSchemaPath)) {
                throw new Error(`Auth schema not found for integration: ${connection.integrationId}`);
            }

            const authSchema = JSON.parse(fs.readFileSync(authSchemaPath, 'utf8'));
            const authMethod = authSchema.authMethods.find(m => m.id === connection.authMethodId);

            if (!authMethod) {
                throw new Error('Auth method not found in schema');
            }

            // 4. Merge test configs (defaults from auth-types-definition + overrides from auth.schema)
            const testConfig = configMerger.mergeTestConfig(
                authTypeDefinition.testConfig || {},
                authMethod.testConfig || {}
            );

            // 5. Get test URL from testConfig (should be full URL)
            let testUrl = testConfig.testUrl;

            if (!testUrl) {
                throw new Error('Test URL not configured for this integration');
            }

            // Replace dynamic variables in test URL if any
            testUrl = dynamicVariables.replaceDynamicVariables(
                testUrl,
                connection.configuredVariables || {}
            );

            // 6. Normalize credentials format
            // Credentials might be stored as { encrypted: "...", decrypted: {...} }
            // but AuthenticationManager expects just the decrypted object
            const credentials = connection.credentials?.decrypted || connection.credentials || {};

            // Create a normalized connection object
            const normalizedConnection = {
                ...connection,
                credentials
            };

            // 7. Create AuthenticationManager instance
            const authManager = new AuthenticationManager(
                normalizedConnection,
                authTypeDefinition,
                authMethod
            );

            // 7. Validate credentials
            authManager.validateCredentials();

            // 8. Test connection with full URL
            const result = await authManager.testConnection(testUrl, testConfig);

            const responseTime = Date.now() - startTime;
            result.responseTime = responseTime;

            // 9. Update connection in Elasticsearch with test result
            await elasticsearch.updateConnection(connectionId, {
                lastTestStatus: result.success ? 'success' : 'failed',
                lastTestMessage: result.message,
                lastTestDate: new Date().toISOString()
            });

            // 10. Return result
            return {
                ...result,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('Error testing connection:', error);
            const responseTime = Date.now() - startTime;

            // Update connection with failure
            try {
                await elasticsearch.updateConnection(connectionId, {
                    lastTestStatus: 'failed',
                    lastTestMessage: error.message,
                    lastTestDate: new Date().toISOString()
                });
            } catch (updateError) {
                console.error('Error updating test status:', updateError);
            }

            return errorHandler.formatError(error, responseTime);
        }
    }

    /**
     * Test connection before saving (wizard flow)
     * @param {string} integrationId - Integration ID
     * @param {string} authMethodId - Auth method ID
     * @param {Object} credentials - User credentials
     * @param {Object} configuredVariables - Dynamic variables
     * @returns {Promise<Object>} Test result
     */
    static async testConnectionBeforeSave(integrationId, authMethodId, credentials, configuredVariables) {
        const startTime = Date.now();

        try {
            // Load auth type definition
            const authTypesPath = path.join(__dirname, '../../auth-types-definition.json');
            const authTypesDef = JSON.parse(fs.readFileSync(authTypesPath, 'utf8'));

            // Load integration auth schema
            const authSchemaPath = path.join(
                __dirname,
                '../../integrations/providers',
                integrationId,
                'auth.schema.json'
            );

            if (!fs.existsSync(authSchemaPath)) {
                throw new Error(`Auth schema not found for integration: ${integrationId}`);
            }

            const authSchema = JSON.parse(fs.readFileSync(authSchemaPath, 'utf8'));
            const authMethod = authSchema.authMethods.find(m => m.id === authMethodId);

            if (!authMethod) {
                throw new Error('Auth method not found');
            }

            const authType = authMethod.authType;
            const authTypeDefinition = authTypesDef.authTypes[authType];

            if (!authTypeDefinition) {
                throw new Error(`Auth type definition not found: ${authType}`);
            }

            // Create temporary connection object
            const tempConnection = {
                integrationId,
                authMethodId,
                authType,
                credentials,
                configuredVariables: configuredVariables || {},
                storedTokens: {}
            };

            // Merge test configs
            const testConfig = configMerger.mergeTestConfig(
                authTypeDefinition.testConfig || {},
                authMethod.testConfig || {}
            );

            // Get test URL from testConfig (should be full URL)
            let testUrl = testConfig.testUrl;

            if (!testUrl) {
                throw new Error('Test URL not configured for this integration');
            }

            // Replace dynamic variables in test URL if any
            testUrl = dynamicVariables.replaceDynamicVariables(
                testUrl,
                configuredVariables || {}
            );

            // Create AuthenticationManager
            const authManager = new AuthenticationManager(
                tempConnection,
                authTypeDefinition,
                authMethod
            );

            // Validate and test
            authManager.validateCredentials();
            const result = await authManager.testConnection(testUrl, testConfig);

            const responseTime = Date.now() - startTime;

            return {
                ...result,
                responseTime,
                testUrl,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('Error testing connection before save:', error);
            const responseTime = Date.now() - startTime;
            return errorHandler.formatError(error, responseTime);
        }
    }
}

module.exports = ConnectionTester;
