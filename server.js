const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const elasticsearch = require('./services/elasticsearch');
const encryption = require('./services/encryption');
const dynamicVariables = require('./utils/dynamicVariables');
const { ConnectionTester } = require('./utils/AuthenticationManager');
const HttpClient = require('./utils/AuthenticationManager/httpClient');

const app = express();
const PORT = 3000;

// In-memory store for OAuth state (use Redis in production)
const oauthStateStore = new Map();

// Base URL for OAuth callbacks (will be configured based on ngrok or production URL)
const getBaseUrl = (req) => {
    // Check if X-Forwarded-Host header exists (from ngrok or reverse proxy)
    const forwardedHost = req.get('X-Forwarded-Host');
    const forwardedProto = req.get('X-Forwarded-Proto') || 'https';

    if (forwardedHost) {
        return `${forwardedProto}://${forwardedHost}`;
    }

    // Fallback to local development
    return `http://localhost:${PORT}`;
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Serve static files from public directory
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));

// Configure EJS as view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Initialize Elasticsearch on startup
elasticsearch.initializeIndexes()
    .then(() => console.log('✅ Elasticsearch indexes ready'))
    .catch(err => console.error('❌ Elasticsearch initialization failed:', err));

// API Routes

// ==============================================
// Integration Management APIs
// ==============================================

// Get all integrations from registry
app.get('/api/integrations', (req, res) => {
    try {
        const registryPath = path.join(__dirname, 'integrations', 'registry.json');
        const data = fs.readFileSync(registryPath, 'utf8');
        const registry = JSON.parse(data);
        res.json(registry);
    } catch (error) {
        console.error('Error reading registry:', error);
        res.status(500).json({ error: 'Failed to load integrations' });
    }
});

// Get specific integration
app.get('/api/integrations/:id', (req, res) => {
    try {
        const registryPath = path.join(__dirname, 'integrations', 'registry.json');
        const data = fs.readFileSync(registryPath, 'utf8');
        const registry = JSON.parse(data);

        const integration = registry.integrations.find(i => i.id === req.params.id);

        if (integration) {
            // Also load auth schema if exists
            const authSchemaPath = path.join(__dirname, 'integrations', 'providers', req.params.id, 'auth.schema.json');
            let authSchema = null;
            if (fs.existsSync(authSchemaPath)) {
                authSchema = JSON.parse(fs.readFileSync(authSchemaPath, 'utf8'));
            }

            res.json({ ...integration, authSchema });
        } else {
            res.status(404).json({ error: 'Integration not found' });
        }
    } catch (error) {
        console.error('Error reading integration:', error);
        res.status(500).json({ error: 'Failed to load integration' });
    }
});

// Create new integration
app.post('/api/integrations', async (req, res) => {
    try {
        const { basicInfo, authSettings, rateLimits } = req.body;

        // Validate required fields
        if (!basicInfo || !basicInfo.id || !basicInfo.displayName) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Validate dynamic variables in auth settings
        if (authSettings && authSettings.authMethods) {
            const authSchema = {
                version: '1.0.0',
                authMethods: authSettings.authMethods
            };

            const validation = dynamicVariables.validateAuthSchema(authSchema);

            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid dynamic variables in authentication configuration',
                    validationErrors: validation.errors
                });
            }
        }

        // Create provider folder
        const providerPath = path.join(__dirname, 'integrations', 'providers', basicInfo.id);
        if (!fs.existsSync(providerPath)) {
            fs.mkdirSync(providerPath, { recursive: true });
            fs.mkdirSync(path.join(providerPath, 'scripts'), { recursive: true });
        }

        // Save auth.schema.json
        if (authSettings) {
            const authSchemaPath = path.join(providerPath, 'auth.schema.json');
            fs.writeFileSync(authSchemaPath, JSON.stringify({
                version: '1.0.0',
                authMethods: authSettings.authMethods || []
            }, null, 2));
        }

        // Initialize features.schema.json (for feature mappings only)
        const featuresSchemaPath = path.join(providerPath, 'features.schema.json');
        if (!fs.existsSync(featuresSchemaPath)) {
            fs.writeFileSync(featuresSchemaPath, JSON.stringify({
                version: '1.0.0',
                featureMappings: []
            }, null, 2));
        }

        // Save ratelimits.json
        if (rateLimits) {
            const rateLimitsPath = path.join(providerPath, 'ratelimits.json');
            fs.writeFileSync(rateLimitsPath, JSON.stringify(rateLimits, null, 2));
        }

        // Save endpoints.json (placeholder)
        const endpointsPath = path.join(providerPath, 'endpoints.json');
        fs.writeFileSync(endpointsPath, JSON.stringify({
            version: '1.0.0',
            endpoints: []
        }, null, 2));

        // Update registry.json
        const registryPath = path.join(__dirname, 'integrations', 'registry.json');
        const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

        // Check for duplicate ID in registry
        const existingIndex = registry.integrations.findIndex(i => i.id === basicInfo.id);
        if (existingIndex !== -1) {
            return res.status(409).json({
                success: false,
                error: 'Integration with this ID already exists in the registry. Please use a different ID or update the existing integration.'
            });
        }

        const newIntegration = {
            id: basicInfo.id,
            displayName: basicInfo.displayName,
            description: basicInfo.description || '',
            category: basicInfo.category || 'other',
            iconUrl: basicInfo.iconUrl || '',
            version: basicInfo.version || '1.0.0',
            docsUrl: basicInfo.docsUrl || '',
            status: basicInfo.status || 'enabled',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        registry.integrations.push(newIntegration);
        registry.lastUpdated = new Date().toISOString();

        fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));

        // Index in Elasticsearch
        await elasticsearch.indexIntegration(newIntegration);

        res.json({
            success: true,
            message: 'Integration created successfully',
            integration: newIntegration
        });
    } catch (error) {
        console.error('Error creating integration:', error);
        res.status(500).json({ error: 'Failed to create integration' });
    }
});

// Update integration
app.put('/api/integrations/:id', async (req, res) => {
    try {
        const { basicInfo, authSettings, rateLimits } = req.body;

        // Validate dynamic variables in auth settings
        if (authSettings && authSettings.authMethods) {
            const authSchema = {
                version: '1.0.0',
                authMethods: authSettings.authMethods
            };

            const validation = dynamicVariables.validateAuthSchema(authSchema);

            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid dynamic variables in authentication configuration',
                    validationErrors: validation.errors
                });
            }
        }

        // Update files in provider folder
        const providerPath = path.join(__dirname, 'integrations', 'providers', req.params.id);

        if (!fs.existsSync(providerPath)) {
            return res.status(404).json({ error: 'Integration not found' });
        }

        // Update schema files if provided
        if (authSettings) {
            const authSchemaPath = path.join(providerPath, 'auth.schema.json');
            fs.writeFileSync(authSchemaPath, JSON.stringify({
                version: '1.0.0',
                authMethods: authSettings.authMethods || []
            }, null, 2));
        }

        // Note: features.schema.json is not modified during integration updates
        // It only contains featureMappings which are managed separately via feature-mappings endpoints

        if (rateLimits) {
            const rateLimitsPath = path.join(providerPath, 'ratelimits.json');
            fs.writeFileSync(rateLimitsPath, JSON.stringify(rateLimits, null, 2));
        }

        // Update registry.json
        const registryPath = path.join(__dirname, 'integrations', 'registry.json');
        const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

        const index = registry.integrations.findIndex(i => i.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ error: 'Integration not found in registry' });
        }

        if (basicInfo) {
            registry.integrations[index] = {
                ...registry.integrations[index],
                ...basicInfo,
                updatedAt: new Date().toISOString()
            };
        }

        registry.lastUpdated = new Date().toISOString();
        fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));

        // Update in Elasticsearch (optional - don't fail if ES is unavailable)
        try {
            await elasticsearch.indexIntegration(registry.integrations[index]);
        } catch (esError) {
            console.warn('⚠️  Elasticsearch indexing failed (integration still saved):', esError.message);
        }

        res.json({
            success: true,
            message: 'Integration updated successfully',
            integration: registry.integrations[index]
        });
    } catch (error) {
        console.error('Error updating integration:', error);
        res.status(500).json({ error: 'Failed to update integration' });
    }
});

// Delete integration
app.delete('/api/integrations/:id', (req, res) => {
    try {
        // Remove from registry
        const registryPath = path.join(__dirname, 'integrations', 'registry.json');
        const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

        const index = registry.integrations.findIndex(i => i.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ error: 'Integration not found' });
        }

        registry.integrations.splice(index, 1);
        registry.lastUpdated = new Date().toISOString();

        fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));

        // Note: We don't delete the provider folder to prevent accidental data loss
        // Admin can manually delete if needed

        res.json({
            success: true,
            message: 'Integration removed from registry successfully'
        });
    } catch (error) {
        console.error('Error deleting integration:', error);
        res.status(500).json({ error: 'Failed to delete integration' });
    }
});

// Toggle integration status
app.patch('/api/integrations/:id/status', (req, res) => {
    try {
        const { status } = req.body;

        // Align with panel-config.json status values
        if (!status || !['active', 'inactive', 'beta'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Must be one of: active, inactive, beta' });
        }

        const registryPath = path.join(__dirname, 'integrations', 'registry.json');
        const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

        const integration = registry.integrations.find(i => i.id === req.params.id);
        if (!integration) {
            return res.status(404).json({ error: 'Integration not found' });
        }

        integration.status = status;
        integration.updatedAt = new Date().toISOString();
        registry.lastUpdated = new Date().toISOString();

        fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));

        res.json({
            success: true,
            message: `Integration status changed to ${status} successfully`,
            integration
        });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

// Get auth schema
app.get('/api/integrations/:id/auth', (req, res) => {
    try {
        const authSchemaPath = path.join(__dirname, 'integrations', 'providers', req.params.id, 'auth.schema.json');

        if (fs.existsSync(authSchemaPath)) {
            const data = fs.readFileSync(authSchemaPath, 'utf8');
            res.json(JSON.parse(data));
        } else {
            res.status(404).json({ error: 'Auth schema not found' });
        }
    } catch (error) {
        console.error('Error reading auth schema:', error);
        res.status(500).json({ error: 'Failed to load auth schema' });
    }
});

// Get auth schema (alias for /auth endpoint) - merged with auth-types-definition
app.get('/api/integrations/:id/auth-schema', (req, res) => {
    try {
        const authSchemaPath = path.join(__dirname, 'integrations', 'providers', req.params.id, 'auth.schema.json');
        const authTypesDefPath = path.join(__dirname, 'auth-types-definition.json');

        if (!fs.existsSync(authSchemaPath)) {
            return res.status(404).json({ error: 'Auth schema not found' });
        }

        // Load integration auth schema
        const authSchema = JSON.parse(fs.readFileSync(authSchemaPath, 'utf8'));

        // Load auth types definition
        const authTypesDef = JSON.parse(fs.readFileSync(authTypesDefPath, 'utf8'));

        // Merge credential fields from auth-types-definition for each auth method
        if (authSchema.authMethods) {
            authSchema.authMethods = authSchema.authMethods.map(method => {
                const authType = method.authType;
                const authTypeDef = authTypesDef.authTypes[authType];

                if (authTypeDef) {
                    // Merge credential fields from auth-types-definition
                    // Integration-specific credentials take precedence
                    const mergedCredentials = {
                        ...(authTypeDef.credentialFields || {}),
                        ...(method.credentials || {})
                    };

                    // Convert credentialFields object to match wizard format
                    method.credentials = mergedCredentials;

                    // Also add additionalFields if not already present
                    if (!method.additionalFields) {
                        method.additionalFields = [];
                    }
                }

                return method;
            });
        }

        res.json({ authSchema });
    } catch (error) {
        console.error('Error reading auth schema:', error);
        res.status(500).json({ error: 'Failed to load auth schema' });
    }
});

// Get rate limits
app.get('/api/integrations/:id/ratelimits', (req, res) => {
    try {
        const rateLimitsPath = path.join(__dirname, 'integrations', 'providers', req.params.id, 'ratelimits.json');

        if (fs.existsSync(rateLimitsPath)) {
            const data = fs.readFileSync(rateLimitsPath, 'utf8');
            res.json(JSON.parse(data));
        } else {
            res.status(404).json({ error: 'Rate limits not found' });
        }
    } catch (error) {
        console.error('Error reading rate limits:', error);
        res.status(500).json({ error: 'Failed to load rate limits' });
    }
});

// ==============================================
// User Management APIs
// ==============================================

// Get all users
app.get('/api/users', async (req, res) => {
    try {
        const users = await elasticsearch.getAllUsers();
        res.json({ users });
    } catch (error) {
        console.warn('⚠️  Elasticsearch unavailable, returning mock users:', error.message);

        // Return mock users when Elasticsearch is not available
        const mockUsers = [
            {
                userId: 'user_001',
                name: 'Demo User 1',
                email: 'demo1@example.com',
                status: 'active',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                userId: 'user_002',
                name: 'Demo User 2',
                email: 'demo2@example.com',
                status: 'active',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                userId: 'user_003',
                name: 'Test User',
                email: 'test@example.com',
                status: 'active',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];

        res.json({ users: mockUsers });
    }
});

// Get user by ID
app.get('/api/users/:id', async (req, res) => {
    try {
        const user = await elasticsearch.getUserById(req.params.id);
        res.json({ user });
    } catch (error) {
        console.error('Error getting user:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

// Create new user
app.post('/api/users', async (req, res) => {
    try {
        const { name, email, status } = req.body;

        // Validation
        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }

        // Check for duplicate email
        const allUsers = await elasticsearch.getAllUsers();
        const existingUser = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: 'A user with this email already exists'
            });
        }

        const result = await elasticsearch.createUser({ name, email, status });

        res.json({
            success: true,
            message: 'User created successfully',
            userId: result._id
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// Update user
app.put('/api/users/:id', async (req, res) => {
    try {
        const { name, email, status } = req.body;

        // Check if user exists
        try {
            await elasticsearch.getUserById(req.params.id);
        } catch (error) {
            return res.status(404).json({ error: 'User not found' });
        }

        const updates = {};
        if (name) updates.name = name;
        if (email) updates.email = email;
        if (status) updates.status = status;

        await elasticsearch.updateUser(req.params.id, updates);

        res.json({
            success: true,
            message: 'User updated successfully'
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Delete user (soft delete)
app.delete('/api/users/:id', async (req, res) => {
    try {
        await elasticsearch.deleteUser(req.params.id);

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// ==============================================
// User Credentials APIs
// ==============================================

// Save user credentials
app.post('/api/user-credentials', async (req, res) => {
    try {
        const { userId, integrationId, authMethodId, credentials } = req.body;

        if (!userId || !integrationId || !authMethodId || !credentials) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Encrypt credentials
        const encryptedCredentials = encryption.encryptCredentials(credentials);

        // Save to Elasticsearch
        const result = await elasticsearch.saveUserCredentials({
            userId,
            integrationId,
            authMethodId,
            credentials: encryptedCredentials
        });

        res.json({
            success: true,
            message: 'Credentials saved successfully',
            id: result._id
        });
    } catch (error) {
        console.error('Error saving credentials:', error);
        res.status(500).json({ error: 'Failed to save credentials' });
    }
});

// Get user credentials
app.get('/api/user-credentials/:userId', async (req, res) => {
    try {
        const { integrationId } = req.query;

        const credentials = await elasticsearch.getUserCredentials(req.params.userId, integrationId);

        // Decrypt credentials before sending
        const decryptedCredentials = credentials.map(cred => ({
            ...cred,
            credentials: encryption.decryptCredentials(cred.credentials)
        }));

        res.json({ credentials: decryptedCredentials });
    } catch (error) {
        console.error('Error getting credentials:', error);
        res.status(500).json({ error: 'Failed to get credentials' });
    }
});

// Update user credentials
app.put('/api/user-credentials/:id', async (req, res) => {
    try {
        const { credentials } = req.body;

        if (!credentials) {
            return res.status(400).json({ error: 'Credentials are required' });
        }

        // Encrypt new credentials
        const encryptedCredentials = encryption.encryptCredentials(credentials);

        await elasticsearch.updateUserCredentials(req.params.id, {
            credentials: encryptedCredentials
        });

        res.json({
            success: true,
            message: 'Credentials updated successfully'
        });
    } catch (error) {
        console.error('Error updating credentials:', error);
        res.status(500).json({ error: 'Failed to update credentials' });
    }
});

// Delete user credentials
app.delete('/api/user-credentials/:id', async (req, res) => {
    try {
        await elasticsearch.deleteUserCredentials(req.params.id);

        res.json({
            success: true,
            message: 'Credentials deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting credentials:', error);
        res.status(500).json({ error: 'Failed to delete credentials' });
    }
});

// ==============================================
// User Integration Connection APIs
// ==============================================

// Get user's connected integrations
app.get('/api/user-integrations/my-connections', async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        const connections = await elasticsearch.getUserConnections(userId);
        res.json({ connections });
    } catch (error) {
        console.error('Error getting user connections:', error);
        res.status(500).json({ error: 'Failed to get connections' });
    }
});

// Connect integration (save connection)
app.post('/api/user-integrations/connect', async (req, res) => {
    try {
        const { userId, integrationId, authMethodId, connectionName, configuredVariables, credentials } = req.body;

        // Validation
        if (!userId || !integrationId || !authMethodId || !credentials) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Load integration details
        const registryPath = path.join(__dirname, 'integrations', 'registry.json');
        const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
        const integration = registry.integrations.find(i => i.id === integrationId);

        if (!integration) {
            return res.status(404).json({ error: 'Integration not found' });
        }

        // Load auth schema
        const authSchemaPath = path.join(__dirname, 'integrations', 'providers', integrationId, 'auth.schema.json');
        let authMethodLabel = '';
        let authType = '';

        if (fs.existsSync(authSchemaPath)) {
            const authSchema = JSON.parse(fs.readFileSync(authSchemaPath, 'utf8'));
            const authMethod = authSchema.authMethods?.find(m => m.id === authMethodId);
            authMethodLabel = authMethod?.label || authMethodId;
            authType = authMethod?.authType || '';

            // Validate dynamic variables
            if (authMethod && authMethod.config) {
                const validation = dynamicVariables.validateDynamicVariables(authMethod);
                if (!validation.valid) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid dynamic variables configuration',
                        validationErrors: validation.errors
                    });
                }
            }
        }

        // Encrypt credentials
        const encryptedCreds = encryption.encryptCredentials(credentials);

        // Use provided connection name or default to integration display name
        const finalConnectionName = connectionName || integration.displayName;

        // Save connection
        const result = await elasticsearch.saveUserConnection({
            userId,
            integrationId,
            integrationName: integration.displayName,
            connectionName: finalConnectionName,
            authMethodId,
            authMethodLabel,
            authType,
            configuredVariables: configuredVariables || {},
            credentials: {
                encrypted: encryptedCreds,
                decrypted: credentials
            },
            status: 'active'
        });

        res.json({
            success: true,
            message: 'Connection created successfully',
            connectionId: result._id
        });
    } catch (error) {
        console.error('Error creating connection:', error);
        res.status(500).json({ error: 'Failed to create connection' });
    }
});

// Get specific connection
app.get('/api/user-integrations/:connectionId', async (req, res) => {
    try {
        const connection = await elasticsearch.getConnectionById(req.params.connectionId);

        if (!connection) {
            return res.status(404).json({
                success: false,
                message: 'Connection not found'
            });
        }

        // Load integration details to include in response
        const integrationPath = path.join(__dirname, 'integrations', 'providers', connection.integrationId, 'auth.schema.json');
        let integration = null;

        if (fs.existsSync(integrationPath)) {
            const integrationData = JSON.parse(fs.readFileSync(integrationPath, 'utf8'));
            integration = {
                displayName: integrationData.displayName,
                category: integrationData.category,
                iconUrl: integrationData.iconUrl
            };
        }

        res.json({
            success: true,
            connection: {
                ...connection,
                integration
            }
        });
    } catch (error) {
        console.error('Error getting connection:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get connection'
        });
    }
});

// Update connection
app.put('/api/user-integrations/:connectionId', async (req, res) => {
    try {
        const { connectionName, authMethodId, authMethodLabel, configuredVariables, credentials } = req.body;

        const updates = {};

        if (connectionName !== undefined) {
            updates.connectionName = connectionName;
        }

        if (authMethodId !== undefined) {
            updates.authMethodId = authMethodId;
        }

        if (authMethodLabel !== undefined) {
            updates.authMethodLabel = authMethodLabel;
        }

        if (configuredVariables !== undefined) {
            updates.configuredVariables = configuredVariables;
        }

        if (credentials !== undefined) {
            const encryptedCreds = encryption.encryptCredentials(credentials);
            updates.credentials = {
                encrypted: encryptedCreds,
                decrypted: credentials
            };
        }

        await elasticsearch.updateConnection(req.params.connectionId, updates);

        res.json({
            success: true,
            message: 'Connection updated successfully'
        });
    } catch (error) {
        console.error('Error updating connection:', error);
        res.status(500).json({ error: 'Failed to update connection' });
    }
});

// Delete connection
app.delete('/api/user-integrations/:connectionId', async (req, res) => {
    try {
        await elasticsearch.deleteConnection(req.params.connectionId);

        res.json({
            success: true,
            message: 'Connection deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting connection:', error);
        res.status(500).json({ error: 'Failed to delete connection' });
    }
});

// Test connection
// Test connection before saving (used in wizard)
app.post('/api/user-integrations/test-connection', async (req, res) => {
    try {
        const { integrationId, authMethodId, configuredVariables, credentials } = req.body;

        if (!integrationId || !authMethodId || !credentials) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: integrationId, authMethodId, or credentials'
            });
        }

        const result = await ConnectionTester.testConnectionBeforeSave(
            integrationId,
            authMethodId,
            credentials,
            configuredVariables
        );

        const statusCode = result.success ? 200 : 400;
        res.status(statusCode).json(result);

    } catch (error) {
        console.error('Error testing connection:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Connection test failed',
            timestamp: new Date().toISOString()
        });
    }
});

// Test existing connection
app.post('/api/user-integrations/:connectionId/test', async (req, res) => {
    try {
        const result = await ConnectionTester.testExistingConnection(
            req.params.connectionId
        );

        const statusCode = result.success ? 200 : 400;
        res.status(statusCode).json(result);

    } catch (error) {
        console.error('Error testing connection:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Connection test failed',
            timestamp: new Date().toISOString()
        });
    }
});

// ==============================================
// OAuth Flow APIs
// ==============================================

// OAuth Initiation - Start OAuth flow
app.get('/oauth/:integrationId/:authMethodId/authorize', async (req, res) => {
    try {
        const { integrationId, authMethodId } = req.params;
        const { userId, connectionName } = req.query;

        if (!userId) {
            return res.status(400).send('Missing userId parameter');
        }

        // Load integration and auth schema
        const authSchemaPath = path.join(__dirname, 'integrations', 'providers', integrationId, 'auth.schema.json');

        if (!fs.existsSync(authSchemaPath)) {
            return res.status(404).send('Integration not found');
        }

        const authSchema = JSON.parse(fs.readFileSync(authSchemaPath, 'utf8'));
        const authMethod = authSchema.authMethods?.find(m => m.id === authMethodId);

        if (!authMethod || !authMethod.authType.includes('oauth')) {
            return res.status(400).send('Invalid OAuth configuration');
        }

        const config = authMethod.config;

        // Get credentials (clientId, clientSecret)
        const authTypesDefPath = path.join(__dirname, 'auth-types-definition.json');
        const authTypesDef = JSON.parse(fs.readFileSync(authTypesDefPath, 'utf8'));
        const authTypeDef = authTypesDef.authTypes[authMethod.authType];

        const credentialFields = {
            ...(authTypeDef?.credentialFields || {}),
            ...(authMethod.credentials || {})
        };

        // In real implementation, credentials should be stored separately
        // For now, we expect them in query params or config
        const clientId = req.query.clientId || config.clientId;
        const clientSecret = req.query.clientSecret || config.clientSecret;

        if (!clientId) {
            return res.status(400).send('Missing clientId');
        }

        // Generate state for CSRF protection
        const state = crypto.randomBytes(32).toString('hex');
        const baseUrl = getBaseUrl(req);
        const redirectUri = `${baseUrl}/oauth/callback`;

        // Store state with metadata
        oauthStateStore.set(state, {
            integrationId,
            authMethodId,
            userId,
            connectionName: connectionName || integrationId,
            clientId,
            clientSecret,
            redirectUri,
            tokenUrl: config.tokenUrl,
            refreshTokenUrl: config.refreshTokenUrl,
            createdAt: Date.now(),
            expiresAt: Date.now() + (10 * 60 * 1000) // 10 minutes
        });

        // Clean up expired states
        for (const [key, value] of oauthStateStore.entries()) {
            if (value.expiresAt < Date.now()) {
                oauthStateStore.delete(key);
            }
        }

        // Build authorization URL
        const authUrl = new URL(config.authorizationUrl);
        authUrl.searchParams.set('client_id', clientId);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('state', state);
        authUrl.searchParams.set('response_type', 'code');

        // Add scopes if configured
        if (config.scopes && config.scopes.length > 0) {
            const scopeSeparator = config.scopeSeparator || ' ';
            authUrl.searchParams.set('scope', config.scopes.join(scopeSeparator));
        }

        // Add additional auth params
        if (config.additionalAuthParams) {
            for (const [key, value] of Object.entries(config.additionalAuthParams)) {
                authUrl.searchParams.set(key, value);
            }
        }

        // PKCE support
        if (config.pkceEnabled) {
            const codeVerifier = crypto.randomBytes(32).toString('base64url');
            const codeChallenge = crypto
                .createHash('sha256')
                .update(codeVerifier)
                .digest('base64url');

            authUrl.searchParams.set('code_challenge', codeChallenge);
            authUrl.searchParams.set('code_challenge_method', 'S256');

            // Store code verifier with state
            const stateData = oauthStateStore.get(state);
            stateData.codeVerifier = codeVerifier;
            oauthStateStore.set(state, stateData);
        }

        console.log(`🔐 OAuth flow initiated for ${integrationId}`);
        console.log(`   Redirect URI: ${redirectUri}`);
        console.log(`   Authorization URL: ${authUrl.toString()}`);

        // Redirect user to OAuth provider
        res.redirect(authUrl.toString());

    } catch (error) {
        console.error('Error initiating OAuth flow:', error);
        res.status(500).send('Failed to initiate OAuth flow: ' + error.message);
    }
});

// OAuth Callback - Handle OAuth provider callback
app.get('/oauth/callback', async (req, res) => {
    try {
        const { code, state, error: oauthError, error_description } = req.query;

        // Check for OAuth errors
        if (oauthError) {
            console.error('OAuth Error:', oauthError, error_description);
            return res.redirect(`/my-connections?error=${encodeURIComponent(oauthError)}&error_description=${encodeURIComponent(error_description || '')}`);
        }

        // Validate state
        if (!state || !oauthStateStore.has(state)) {
            console.error('Invalid or expired OAuth state');
            return res.redirect('/my-connections?error=invalid_state');
        }

        const stateData = oauthStateStore.get(state);
        oauthStateStore.delete(state); // Use state only once

        // Check state expiration
        if (stateData.expiresAt < Date.now()) {
            console.error('OAuth state expired');
            return res.redirect('/my-connections?error=state_expired');
        }

        // Exchange authorization code for tokens
        const tokenRequestBody = {
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: stateData.redirectUri,
            client_id: stateData.clientId,
            client_secret: stateData.clientSecret
        };

        // Add PKCE code verifier if enabled
        if (stateData.codeVerifier) {
            tokenRequestBody.code_verifier = stateData.codeVerifier;
        }

        // Convert to URL-encoded format
        const bodyString = Object.entries(tokenRequestBody)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');

        console.log(`🔄 Exchanging authorization code for tokens...`);
        console.log(`   Token URL: ${stateData.tokenUrl}`);

        // Make token request
        const tokenResponse = await HttpClient.post(
            stateData.tokenUrl,
            bodyString,
            {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            15000 // 15 second timeout
        );

        if (tokenResponse.statusCode !== 200) {
            console.error('Token exchange failed:', tokenResponse.statusCode, tokenResponse.body);
            return res.redirect(`/my-connections?error=token_exchange_failed&status=${tokenResponse.statusCode}`);
        }

        const tokens = tokenResponse.json;

        if (!tokens || !tokens.access_token) {
            console.error('Invalid token response - missing access_token');
            return res.redirect('/my-connections?error=invalid_token_response');
        }

        console.log('✅ OAuth tokens received successfully');

        // Calculate expiry timestamp
        const expiresAt = tokens.expires_in
            ? Date.now() + (tokens.expires_in * 1000)
            : null;

        // Prepare credentials object
        const credentials = {
            clientId: stateData.clientId,
            clientSecret: stateData.clientSecret
        };

        // Prepare tokens object
        const tokenData = {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token || null,
            tokenType: tokens.token_type || 'Bearer',
            expiresIn: tokens.expires_in || null,
            expiresAt: expiresAt,
            scope: tokens.scope || null,
            // Store any additional token data
            ...Object.fromEntries(
                Object.entries(tokens).filter(([key]) =>
                    !['access_token', 'refresh_token', 'token_type', 'expires_in', 'scope'].includes(key)
                )
            )
        };

        // Encrypt credentials
        const encryptedCreds = encryption.encryptCredentials(credentials);

        // Load integration details
        const registryPath = path.join(__dirname, 'integrations', 'registry.json');
        const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
        const integration = registry.integrations.find(i => i.id === stateData.integrationId);

        // Load auth method details
        const authSchemaPath = path.join(__dirname, 'integrations', 'providers', stateData.integrationId, 'auth.schema.json');
        const authSchema = JSON.parse(fs.readFileSync(authSchemaPath, 'utf8'));
        const authMethod = authSchema.authMethods?.find(m => m.id === stateData.authMethodId);

        // Save connection to Elasticsearch
        const result = await elasticsearch.saveUserConnection({
            userId: stateData.userId,
            integrationId: stateData.integrationId,
            integrationName: integration?.displayName || stateData.integrationId,
            connectionName: stateData.connectionName,
            authMethodId: stateData.authMethodId,
            authMethodLabel: authMethod?.label || stateData.authMethodId,
            authType: authMethod?.authType || 'oauth2',
            configuredVariables: {},
            credentials: {
                encrypted: encryptedCreds,
                decrypted: credentials
            },
            tokens: tokenData, // Store OAuth tokens
            status: 'active'
        });

        console.log(`✅ Connection saved successfully: ${result._id}`);

        // Redirect back to connections page with success message
        res.redirect(`/my-connections?success=true&connectionId=${result._id}`);

    } catch (error) {
        console.error('Error in OAuth callback:', error);
        res.redirect(`/my-connections?error=callback_error&message=${encodeURIComponent(error.message)}`);
    }
});

// Get OAuth authorization URL (for frontend to initiate flow)
app.post('/api/oauth/get-auth-url', async (req, res) => {
    try {
        const { integrationId, authMethodId, userId, clientId, clientSecret, connectionName } = req.body;

        if (!integrationId || !authMethodId || !userId || !clientId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: integrationId, authMethodId, userId, clientId'
            });
        }

        const baseUrl = getBaseUrl(req);

        // Build OAuth initiation URL
        const authUrl = new URL(`${baseUrl}/oauth/${integrationId}/${authMethodId}/authorize`);
        authUrl.searchParams.set('userId', userId);
        authUrl.searchParams.set('clientId', clientId);

        if (clientSecret) {
            authUrl.searchParams.set('clientSecret', clientSecret);
        }

        if (connectionName) {
            authUrl.searchParams.set('connectionName', connectionName);
        }

        res.json({
            success: true,
            authUrl: authUrl.toString()
        });

    } catch (error) {
        console.error('Error generating OAuth URL:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate OAuth URL'
        });
    }
});

// ==============================================
// Feature Templates APIs
// ==============================================

// Get all feature templates
app.get('/api/feature-templates', (req, res) => {
    try {
        const data = fs.readFileSync(path.join(__dirname, 'features-definition.json'), 'utf8');
        const featuresDef = JSON.parse(data);

        // Convert features object to array for easier frontend consumption
        const featuresArray = Object.values(featuresDef.features);

        res.json({
            success: true,
            version: featuresDef.version,
            categories: featuresDef.categories,
            features: featuresArray,
            lastUpdated: featuresDef.lastUpdated
        });
    } catch (error) {
        console.error('Error reading feature templates:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load feature templates'
        });
    }
});

// Get categories only
app.get('/api/feature-templates/categories', (req, res) => {
    try {
        const data = fs.readFileSync(path.join(__dirname, 'features-definition.json'), 'utf8');
        const featuresDef = JSON.parse(data);

        res.json({
            success: true,
            categories: featuresDef.categories
        });
    } catch (error) {
        console.error('Error reading categories:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load categories'
        });
    }
});

// Get specific feature template
app.get('/api/feature-templates/:id', (req, res) => {
    try {
        const data = fs.readFileSync(path.join(__dirname, 'features-definition.json'), 'utf8');
        const featuresDef = JSON.parse(data);

        const feature = featuresDef.features[req.params.id];

        if (feature) {
            res.json({
                success: true,
                feature: feature
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Feature template not found'
            });
        }
    } catch (error) {
        console.error('Error reading feature template:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load feature template'
        });
    }
});

// Create new feature template
app.post('/api/feature-templates', (req, res) => {
    try {
        const { id, name, description, category, fields } = req.body;

        // Validation
        if (!id || !name || !category) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: id, name, category'
            });
        }

        // Validate ID format (lowercase, underscores only)
        if (!/^[a-z0-9_]+$/.test(id)) {
            return res.status(400).json({
                success: false,
                error: 'Feature ID must be lowercase letters, numbers, and underscores only'
            });
        }

        const filePath = path.join(__dirname, 'features-definition.json');
        const data = fs.readFileSync(filePath, 'utf8');
        const featuresDef = JSON.parse(data);

        // Check for duplicate ID
        if (featuresDef.features[id]) {
            return res.status(409).json({
                success: false,
                error: 'Feature template with this ID already exists'
            });
        }

        // Check if category exists
        if (!featuresDef.categories[category]) {
            return res.status(400).json({
                success: false,
                error: 'Invalid category. Category does not exist.'
            });
        }

        // Create new feature template
        const newFeature = {
            id,
            name,
            description: description || '',
            category,
            fields: fields || {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Add to features object
        featuresDef.features[id] = newFeature;
        featuresDef.lastUpdated = new Date().toISOString();

        // Save to file
        fs.writeFileSync(filePath, JSON.stringify(featuresDef, null, 2));

        res.json({
            success: true,
            message: 'Feature template created successfully',
            feature: newFeature
        });
    } catch (error) {
        console.error('Error creating feature template:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create feature template'
        });
    }
});

// Update feature template
app.put('/api/feature-templates/:id', (req, res) => {
    try {
        const { name, description, category, fields } = req.body;

        const filePath = path.join(__dirname, 'features-definition.json');
        const data = fs.readFileSync(filePath, 'utf8');
        const featuresDef = JSON.parse(data);

        // Check if feature exists
        if (!featuresDef.features[req.params.id]) {
            return res.status(404).json({
                success: false,
                error: 'Feature template not found'
            });
        }

        // Check if category exists (if provided)
        if (category && !featuresDef.categories[category]) {
            return res.status(400).json({
                success: false,
                error: 'Invalid category. Category does not exist.'
            });
        }

        // Update feature
        const existingFeature = featuresDef.features[req.params.id];
        featuresDef.features[req.params.id] = {
            ...existingFeature,
            name: name !== undefined ? name : existingFeature.name,
            description: description !== undefined ? description : existingFeature.description,
            category: category !== undefined ? category : existingFeature.category,
            fields: fields !== undefined ? fields : existingFeature.fields,
            updatedAt: new Date().toISOString()
        };

        featuresDef.lastUpdated = new Date().toISOString();

        // Save to file
        fs.writeFileSync(filePath, JSON.stringify(featuresDef, null, 2));

        res.json({
            success: true,
            message: 'Feature template updated successfully',
            feature: featuresDef.features[req.params.id]
        });
    } catch (error) {
        console.error('Error updating feature template:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update feature template'
        });
    }
});

// Delete feature template
app.delete('/api/feature-templates/:id', (req, res) => {
    try {
        const filePath = path.join(__dirname, 'features-definition.json');
        const data = fs.readFileSync(filePath, 'utf8');
        const featuresDef = JSON.parse(data);

        // Check if feature exists
        if (!featuresDef.features[req.params.id]) {
            return res.status(404).json({
                success: false,
                error: 'Feature template not found'
            });
        }

        // Delete feature
        delete featuresDef.features[req.params.id];
        featuresDef.lastUpdated = new Date().toISOString();

        // Save to file
        fs.writeFileSync(filePath, JSON.stringify(featuresDef, null, 2));

        res.json({
            success: true,
            message: 'Feature template deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting feature template:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete feature template'
        });
    }
});

// ==============================================
// Feature Mapping APIs
// ==============================================

// Get all feature mappings for an integration
app.get('/api/integrations/:id/feature-mappings', (req, res) => {
    try {
        const featuresSchemaPath = path.join(__dirname, 'integrations', 'providers', req.params.id, 'features.schema.json');

        if (!fs.existsSync(featuresSchemaPath)) {
            // Return empty array if file doesn't exist
            return res.json({
                success: true,
                featureMappings: []
            });
        }

        const data = fs.readFileSync(featuresSchemaPath, 'utf8');
        const schema = JSON.parse(data);

        res.json({
            success: true,
            featureMappings: schema.featureMappings || []
        });
    } catch (error) {
        console.error('Error reading feature mappings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load feature mappings'
        });
    }
});

// Get specific feature mapping
app.get('/api/integrations/:id/feature-mappings/:mappingId', (req, res) => {
    try {
        const featuresSchemaPath = path.join(__dirname, 'integrations', 'providers', req.params.id, 'features.schema.json');

        if (!fs.existsSync(featuresSchemaPath)) {
            return res.status(404).json({
                success: false,
                error: 'Features schema not found'
            });
        }

        const data = fs.readFileSync(featuresSchemaPath, 'utf8');
        const schema = JSON.parse(data);
        const mappings = schema.featureMappings || [];

        const mapping = mappings.find(m => m.id === req.params.mappingId);

        if (mapping) {
            res.json({
                success: true,
                mapping
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Feature mapping not found'
            });
        }
    } catch (error) {
        console.error('Error reading feature mapping:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load feature mapping'
        });
    }
});

// Create new feature mapping
app.post('/api/integrations/:id/feature-mappings', (req, res) => {
    try {
        const { featureTemplateId, featureTemplateName, fieldMappings, apiConfig, extraFields, customHandlers, customHandlers_for_feature, status } = req.body;

        // Validation
        if (!featureTemplateId || !featureTemplateName) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: featureTemplateId, featureTemplateName'
            });
        }

        const featuresSchemaPath = path.join(__dirname, 'integrations', 'providers', req.params.id, 'features.schema.json');

        // Initialize schema if doesn't exist
        let schema = {
            version: '1.0.0',
            featureMappings: []
        };

        if (fs.existsSync(featuresSchemaPath)) {
            const data = fs.readFileSync(featuresSchemaPath, 'utf8');
            schema = JSON.parse(data);
            if (!schema.featureMappings) {
                schema.featureMappings = [];
            }
        }

        // Generate unique ID
        const mappingId = `mapping_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Create new mapping
        const newMapping = {
            id: mappingId,
            featureTemplateId,
            featureTemplateName,
            fieldMappings: fieldMappings || {},
            apiConfig: apiConfig || { method: 'GET', endpoint: '' },
            extraFields: extraFields || [],
            customHandlers: customHandlers || {},
            customHandlers_for_feature: customHandlers_for_feature || null,
            status: status || 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Add to mappings array
        schema.featureMappings.push(newMapping);
        schema.lastUpdated = new Date().toISOString();

        // Save to file
        fs.writeFileSync(featuresSchemaPath, JSON.stringify(schema, null, 2));

        res.json({
            success: true,
            message: 'Feature mapping created successfully',
            mapping: newMapping
        });
    } catch (error) {
        console.error('Error creating feature mapping:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create feature mapping'
        });
    }
});

// Update feature mapping
app.put('/api/integrations/:id/feature-mappings/:mappingId', (req, res) => {
    try {
        const { featureTemplateName, fieldMappings, apiConfig, extraFields, customHandlers, customHandlers_for_feature, status } = req.body;

        const featuresSchemaPath = path.join(__dirname, 'integrations', 'providers', req.params.id, 'features.schema.json');

        if (!fs.existsSync(featuresSchemaPath)) {
            return res.status(404).json({
                success: false,
                error: 'Features schema not found'
            });
        }

        const data = fs.readFileSync(featuresSchemaPath, 'utf8');
        const schema = JSON.parse(data);

        if (!schema.featureMappings) {
            return res.status(404).json({
                success: false,
                error: 'No feature mappings found'
            });
        }

        const mappingIndex = schema.featureMappings.findIndex(m => m.id === req.params.mappingId);

        if (mappingIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Feature mapping not found'
            });
        }

        // Update mapping
        const existingMapping = schema.featureMappings[mappingIndex];
        schema.featureMappings[mappingIndex] = {
            ...existingMapping,
            featureTemplateName: featureTemplateName !== undefined ? featureTemplateName : existingMapping.featureTemplateName,
            fieldMappings: fieldMappings !== undefined ? fieldMappings : existingMapping.fieldMappings,
            apiConfig: apiConfig !== undefined ? apiConfig : existingMapping.apiConfig,
            extraFields: extraFields !== undefined ? extraFields : existingMapping.extraFields,
            customHandlers: customHandlers !== undefined ? customHandlers : existingMapping.customHandlers,
            customHandlers_for_feature: customHandlers_for_feature !== undefined ? customHandlers_for_feature : existingMapping.customHandlers_for_feature,
            status: status !== undefined ? status : existingMapping.status,
            updatedAt: new Date().toISOString()
        };

        schema.lastUpdated = new Date().toISOString();

        // Save to file
        fs.writeFileSync(featuresSchemaPath, JSON.stringify(schema, null, 2));

        res.json({
            success: true,
            message: 'Feature mapping updated successfully',
            mapping: schema.featureMappings[mappingIndex]
        });
    } catch (error) {
        console.error('Error updating feature mapping:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update feature mapping'
        });
    }
});

// Delete feature mapping
app.delete('/api/integrations/:id/feature-mappings/:mappingId', (req, res) => {
    try {
        const featuresSchemaPath = path.join(__dirname, 'integrations', 'providers', req.params.id, 'features.schema.json');

        if (!fs.existsSync(featuresSchemaPath)) {
            return res.status(404).json({
                success: false,
                error: 'Features schema not found'
            });
        }

        const data = fs.readFileSync(featuresSchemaPath, 'utf8');
        const schema = JSON.parse(data);

        if (!schema.featureMappings) {
            return res.status(404).json({
                success: false,
                error: 'No feature mappings found'
            });
        }

        const mappingIndex = schema.featureMappings.findIndex(m => m.id === req.params.mappingId);

        if (mappingIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Feature mapping not found'
            });
        }

        // Remove mapping
        schema.featureMappings.splice(mappingIndex, 1);
        schema.lastUpdated = new Date().toISOString();

        // Save to file
        fs.writeFileSync(featuresSchemaPath, JSON.stringify(schema, null, 2));

        res.json({
            success: true,
            message: 'Feature mapping deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting feature mapping:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete feature mapping'
        });
    }
});

// ==============================================
// Auth Types APIs (Existing)
// ==============================================

// Get panel configuration
app.get('/api/panel-config', (req, res) => {
    try {
        const data = fs.readFileSync(path.join(__dirname, 'panel-config.json'), 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error('Error reading panel config:', error);
        res.status(500).json({ error: 'Failed to load panel configuration' });
    }
});

// Get custom handlers configuration
app.get('/api/panel-config/custom-handlers', (req, res) => {
    try {
        const data = fs.readFileSync(path.join(__dirname, 'panel-config.json'), 'utf8');
        const config = JSON.parse(data);
        res.json(config.customHandlers || {});
    } catch (error) {
        console.error('Error reading custom handlers config:', error);
        res.status(500).json({ error: 'Failed to load custom handlers configuration' });
    }
});

// Get feature-level custom handlers configuration
app.get('/api/panel-config/custom-handlers-for-feature', (req, res) => {
    try {
        const data = fs.readFileSync(path.join(__dirname, 'panel-config.json'), 'utf8');
        const config = JSON.parse(data);
        res.json(config.customHandlers_for_feature || {});
    } catch (error) {
        console.error('Error reading feature handlers config:', error);
        res.status(500).json({ error: 'Failed to load feature handlers configuration' });
    }
});

// Get all auth types
app.get('/api/auth-types', (req, res) => {
    try {
        const data = fs.readFileSync(path.join(__dirname, 'auth-types-definition.json'), 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error('Error reading auth types:', error);
        res.status(500).json({ error: 'Failed to load auth types' });
    }
});

// Get specific auth type
app.get('/api/auth-types/:authTypeKey', (req, res) => {
    try {
        const data = fs.readFileSync(path.join(__dirname, 'auth-types-definition.json'), 'utf8');
        const authTypes = JSON.parse(data);
        const authType = authTypes.authTypes[req.params.authTypeKey];

        if (authType) {
            res.json({ key: req.params.authTypeKey, ...authType });
        } else {
            res.status(404).json({ error: 'Auth type not found' });
        }
    } catch (error) {
        console.error('Error reading auth type:', error);
        res.status(500).json({ error: 'Failed to load auth type' });
    }
});

// Serve panel-config.json from root directory
app.get('/panel-config.json', (req, res) => {
    try {
        res.sendFile(path.join(__dirname, 'panel-config.json'));
    } catch (error) {
        console.error('Error serving panel-config:', error);
        res.status(500).json({ error: 'Failed to load panel configuration' });
    }
});

// Get all software templates
app.get('/api/software-templates', (req, res) => {
    try {
        const docsDir = path.join(__dirname, 'docs');
        const files = fs.readdirSync(docsDir);
        const templateFiles = files.filter(f => f.startsWith('example-software-template-') && f.endsWith('.json'));

        const templates = templateFiles.map(file => {
            const data = fs.readFileSync(path.join(docsDir, file), 'utf8');
            return JSON.parse(data);
        });

        res.json({ templates });
    } catch (error) {
        console.error('Error reading templates:', error);
        res.status(500).json({ error: 'Failed to load templates' });
    }
});

// Get specific software template
app.get('/api/software-templates/:softwareId', (req, res) => {
    try {
        const file = `example-software-template-${req.params.softwareId}.json`;
        const filePath = path.join(__dirname, 'docs', file);

        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            res.json(JSON.parse(data));
        } else {
            res.status(404).json({ error: 'Software template not found' });
        }
    } catch (error) {
        console.error('Error reading template:', error);
        res.status(500).json({ error: 'Failed to load template' });
    }
});

// Save software template
app.post('/api/software-templates', (req, res) => {
    try {
        const template = req.body;
        const fileName = `example-software-template-${template.softwareId}.json`;
        const filePath = path.join(__dirname, 'docs', fileName);

        fs.writeFileSync(filePath, JSON.stringify(template, null, 2), 'utf8');

        res.json({
            success: true,
            message: 'Template saved successfully',
            file: fileName
        });
    } catch (error) {
        console.error('Error saving template:', error);
        res.status(500).json({ error: 'Failed to save template' });
    }
});

// Update software template
app.put('/api/software-templates/:softwareId', (req, res) => {
    try {
        const template = req.body;
        const fileName = `example-software-template-${req.params.softwareId}.json`;
        const filePath = path.join(__dirname, 'docs', fileName);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Template not found' });
        }

        fs.writeFileSync(filePath, JSON.stringify(template, null, 2), 'utf8');

        res.json({
            success: true,
            message: 'Template updated successfully'
        });
    } catch (error) {
        console.error('Error updating template:', error);
        res.status(500).json({ error: 'Failed to update template' });
    }
});

// Delete software template
app.delete('/api/software-templates/:softwareId', (req, res) => {
    try {
        const fileName = `example-software-template-${req.params.softwareId}.json`;
        const filePath = path.join(__dirname, 'docs', fileName);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Template not found' });
        }

        fs.unlinkSync(filePath);

        res.json({
            success: true,
            message: 'Template deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting template:', error);
        res.status(500).json({ error: 'Failed to delete template' });
    }
});

// ==============================================
// Page Routes (EJS Templates)
// ==============================================

// Dashboard (home page)
app.get('/', (req, res) => {
    res.render('dashboard', {
        pageTitle: 'Admin Dashboard',
        activePage: 'dashboard',
        extraCSS: [],
        showMobileMenu: true,
        showSearch: true,
        searchPlaceholder: 'Search integrations, users, settings...',
        showUserProfile: true,
        topbarActions: ''
    });
});

// Auth Config
app.get('/auth-config', (req, res) => {
    res.render('index', {
        pageTitle: 'Auth Config',
        activePage: 'auth-config',
        extraCSS: ['/css/auth-config.css'],
        showMobileMenu: true,
        showSearch: false,
        showUserProfile: true,
        topbarActions: ''
    });
});

// Integrations
app.get('/integrations', (req, res) => {
    res.render('integrations', {
        pageTitle: 'Integrations',
        activePage: 'integrations',
        extraCSS: ['/css/integrations.css'],
        showMobileMenu: true,
        showSearch: false,
        showUserProfile: true,
        topbarActions: ''
    });
});

// Users
app.get('/users', (req, res) => {
    res.render('users', {
        pageTitle: 'Users Management',
        activePage: 'users',
        extraCSS: ['/css/dashboard.css', '/css/users.css'],
        showMobileMenu: false,
        showSearch: false,
        showUserProfile: false,
        topbarActions: ''
    });
});

// User Integrations (Available Integrations)
app.get('/user-integrations', (req, res) => {
    res.render('user-integrations', {
        pageTitle: 'Available Integrations',
        activePage: 'user-integrations',
        extraCSS: ['/css/dashboard.css', '/css/user-integrations.css'],
        showMobileMenu: true,
        showSearch: true,
        searchPlaceholder: 'Search integrations...',
        showUserProfile: true,
        topbarActions: ''
    });
});

// My Connections
app.get('/my-connections', (req, res) => {
    res.render('my-connections', {
        pageTitle: 'My Connections',
        activePage: 'my-connections',
        extraCSS: ['/css/my-connections.css'],
        showMobileMenu: true,
        showSearch: false,
        showUserProfile: true,
        topbarActions: ''
    });
});

// Feature Templates
app.get('/feature-templates', (req, res) => {
    res.render('feature-templates', {
        pageTitle: 'Feature Templates',
        activePage: 'feature-templates',
        extraCSS: ['/css/feature-templates.css'],
        showMobileMenu: false,
        showSearch: false,
        showUserProfile: false,
        breadcrumb: ['Home', 'Feature Templates'],
        topbarActions: '<button class="btn btn-primary" onclick="openAddFeatureModal()"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add Feature</button>'
    });
});

// Edit Feature Template (New)
app.get('/feature-templates/new', (req, res) => {
    res.render('edit-feature-template', {
        pageTitle: 'New Feature Template',
        activePage: 'feature-templates',
        extraCSS: ['/css/edit-feature-template.css'],
        showMobileMenu: false,
        showSearch: false,
        showUserProfile: false,
        backButton: {
            text: 'Back to Features',
            action: 'goBack()'
        },
        topbarTitle: 'New Feature Template',
        topbarActions: '<button class="btn-secondary" onclick="cancelFeature()">Cancel</button><button class="btn-primary" onclick="saveFeature()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>Save Feature</button>'
    });
});

// Edit Feature Template (Edit existing)
app.get('/feature-templates/:id/edit', (req, res) => {
    res.render('edit-feature-template', {
        pageTitle: 'Edit Feature Template',
        activePage: 'feature-templates',
        extraCSS: ['/css/edit-feature-template.css'],
        showMobileMenu: false,
        showSearch: false,
        showUserProfile: false,
        backButton: {
            text: 'Back to Features',
            action: 'goBack()'
        },
        topbarTitle: 'Edit Feature Template',
        topbarActions: '<button class="btn-secondary" onclick="cancelFeature()">Cancel</button><button class="btn-primary" onclick="saveFeature()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>Save Feature</button>'
    });
});

// Add Integration
app.get('/add-integration', (req, res) => {
    res.render('add-integration', {
        pageTitle: 'Add Integration',
        activePage: 'integrations',
        extraCSS: ['/css/add-integration.css'],
        showMobileMenu: true,
        showSearch: false,
        showUserProfile: true,
        topbarActions: ''
    });
});

// Integration Detail
app.get('/integration-detail/:id', (req, res) => {
    res.render('integration-detail', {
        pageTitle: 'Integration Detail',
        activePage: 'integrations',
        extraCSS: ['/css/integration-detail.css'],
        showMobileMenu: true,
        showSearch: false,
        showUserProfile: true,
        topbarActions: ''
    });
});

// Connect Integration
app.get('/connect-integration', (req, res) => {
    res.render('connect-integration', {
        pageTitle: 'Connect Integration',
        activePage: 'user-integrations',
        extraCSS: ['/css/connect-integration.css'],
        showMobileMenu: true,
        showSearch: false,
        showUserProfile: true,
        topbarActions: ''
    });
});

// Feature Integration Mapping
app.get('/feature-integration-mapping', (req, res) => {
    res.render('feature-integration-mapping', {
        pageTitle: 'Map Feature to Integration',
        activePage: 'integrations',
        extraCSS: ['/css/feature-integration-mapping.css'],
        showMobileMenu: true,
        showSearch: false,
        showUserProfile: true,
        topbarActions: ''
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════╗
║  🚀 Integration Platform Server Started                ║
║                                                        ║
║  🌐 Server running on: http://localhost:${PORT}        ║
║  📁 Serving files from: public/                        ║
║  📊 API available at: http://localhost:${PORT}/api     ║
╚════════════════════════════════════════════════════════╝
    `);
});
