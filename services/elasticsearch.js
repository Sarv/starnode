const { Client } = require('@elastic/elasticsearch');

// Elasticsearch configuration
const ES_CONFIG = {
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  auth: {
    username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
    password: process.env.ELASTICSEARCH_PASSWORD || '',
  },
};

// Create Elasticsearch client
const client = new Client(ES_CONFIG);

// Index names
const INDEXES = {
  USERS: 'users',
  USER_CREDENTIALS: 'user_credentials',
  USER_CONNECTIONS: 'user_integration_connections',
  INTEGRATIONS: 'integrations_registry',
  FEATURE_CONFIGS: 'integration_feature_configs',
  RECORD_MAPPINGS: 'canonical_record_mappings',
};

/**
 * Initialize Elasticsearch indexes
 */
async function initializeIndexes() {
  try {
    // Create users index
    const usersExists = await client.indices.exists({ index: INDEXES.USERS });
    if (!usersExists) {
      await client.indices.create({
        index: INDEXES.USERS,
        body: {
          mappings: {
            properties: {
              userId: { type: 'keyword' },
              name: { type: 'text' },
              email: { type: 'keyword' },
              status: { type: 'keyword' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' },
            },
          },
        },
      });
      console.log('✅ Created users index');
    }

    // Create user_credentials index
    const credentialsExists = await client.indices.exists({
      index: INDEXES.USER_CREDENTIALS,
    });
    if (!credentialsExists) {
      await client.indices.create({
        index: INDEXES.USER_CREDENTIALS,
        body: {
          mappings: {
            properties: {
              userId: { type: 'keyword' },
              integrationId: { type: 'keyword' },
              authMethodId: { type: 'keyword' },
              credentials: { type: 'object', enabled: false }, // Encrypted data
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' },
              isActive: { type: 'boolean' },
            },
          },
        },
      });
      console.log('✅ Created user_credentials index');
    }

    // Create user_integration_connections index
    const connectionsExists = await client.indices.exists({
      index: INDEXES.USER_CONNECTIONS,
    });
    if (!connectionsExists) {
      await client.indices.create({
        index: INDEXES.USER_CONNECTIONS,
        body: {
          mappings: {
            properties: {
              connectionId: { type: 'keyword' },
              userId: { type: 'keyword' },
              integrationId: { type: 'keyword' },
              integrationName: { type: 'text' },
              connectionName: { type: 'text' },
              authMethodId: { type: 'keyword' },
              authMethodLabel: { type: 'text' },
              configuredVariables: { type: 'object' },
              credentials: {
                properties: {
                  encrypted: { type: 'object', enabled: false },
                  decrypted: { type: 'object', enabled: false },
                },
              },
              status: { type: 'keyword' },
              isActive: { type: 'boolean' },
              lastTestStatus: { type: 'keyword' },
              lastTestMessage: { type: 'text' },
              lastTestDate: { type: 'date' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' },
            },
          },
        },
      });
      console.log('✅ Created user_integration_connections index');
    }

    // Create integrations_registry index (optional, for searching)
    const integrationsExists = await client.indices.exists({
      index: INDEXES.INTEGRATIONS,
    });
    if (!integrationsExists) {
      await client.indices.create({
        index: INDEXES.INTEGRATIONS,
        body: {
          mappings: {
            properties: {
              integrationId: { type: 'keyword' },
              displayName: { type: 'text' },
              description: { type: 'text' },
              category: { type: 'keyword' },
              status: { type: 'keyword' },
              version: { type: 'keyword' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' },
            },
          },
        },
      });
      console.log('✅ Created integrations_registry index');
    }

    // Create integration_feature_configs index (for Phase 2: feature API configurations)
    const featureConfigsExists = await client.indices.exists({
      index: INDEXES.FEATURE_CONFIGS,
    });
    if (!featureConfigsExists) {
      await client.indices.create({
        index: INDEXES.FEATURE_CONFIGS,
        body: {
          mappings: {
            properties: {
              configId: { type: 'keyword' },
              integrationId: { type: 'keyword' },
              featureId: { type: 'keyword' },
              featureName: { type: 'text' },
              apiConfig: {
                properties: {
                  method: { type: 'keyword' },
                  url: { type: 'text' },
                  headers: { type: 'object', enabled: false },
                  bodyType: { type: 'keyword' },
                  body: { type: 'object', enabled: false },
                  authMethodRef: { type: 'keyword' },
                  queryParams: { type: 'object', enabled: false },
                  responseMapping: { type: 'object', enabled: false },
                },
              },
              staticFieldValues: { type: 'object', enabled: false },
              enabled: { type: 'boolean' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' },
            },
          },
        },
      });
      console.log('✅ Created integration_feature_configs index');
    }

    return true;
  } catch (error) {
    console.error('❌ Error initializing Elasticsearch indexes:', error);
    throw error;
  }
}

/**
 * Save user credentials
 */
async function saveUserCredentials(data) {
  try {
    const result = await client.index({
      index: INDEXES.USER_CREDENTIALS,
      body: {
        userId: data.userId,
        integrationId: data.integrationId,
        authMethodId: data.authMethodId,
        credentials: data.credentials, // Should be encrypted before passing
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      },
    });
    return result;
  } catch (error) {
    console.error('❌ Error saving user credentials:', error);
    throw error;
  }
}

/**
 * Get user credentials
 */
async function getUserCredentials(userId, integrationId) {
  try {
    const result = await client.search({
      index: INDEXES.USER_CREDENTIALS,
      body: {
        query: {
          bool: {
            must: [
              { term: { userId: userId } },
              { term: { integrationId: integrationId } },
              { term: { isActive: true } },
            ],
          },
        },
      },
    });
    return result.hits.hits.map(hit => ({ id: hit._id, ...hit._source }));
  } catch (error) {
    console.error('❌ Error getting user credentials:', error);
    throw error;
  }
}

/**
 * Update user credentials
 */
async function updateUserCredentials(id, data) {
  try {
    const result = await client.update({
      index: INDEXES.USER_CREDENTIALS,
      id: id,
      body: {
        doc: {
          ...data,
          updatedAt: new Date().toISOString(),
        },
      },
    });
    return result;
  } catch (error) {
    console.error('❌ Error updating user credentials:', error);
    throw error;
  }
}

/**
 * Delete user credentials
 */
async function deleteUserCredentials(id) {
  try {
    const result = await client.update({
      index: INDEXES.USER_CREDENTIALS,
      id: id,
      body: {
        doc: {
          isActive: false,
          updatedAt: new Date().toISOString(),
        },
      },
    });
    return result;
  } catch (error) {
    console.error('❌ Error deleting user credentials:', error);
    throw error;
  }
}

/**
 * Index integration in Elasticsearch (for search)
 */
async function indexIntegration(integration) {
  try {
    const result = await client.index({
      index: INDEXES.INTEGRATIONS,
      id: integration.id,
      body: {
        integrationId: integration.id,
        displayName: integration.displayName,
        description: integration.description,
        category: integration.category,
        status: integration.status,
        version: integration.version,
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt,
      },
    });
    return result;
  } catch (error) {
    console.error('❌ Error indexing integration:', error);
    throw error;
  }
}

/**
 * Search integrations
 */
async function searchIntegrations(query) {
  try {
    const result = await client.search({
      index: INDEXES.INTEGRATIONS,
      body: {
        query: {
          multi_match: {
            query: query,
            fields: ['displayName', 'description', 'category'],
          },
        },
      },
    });
    return result.hits.hits.map(hit => hit._source);
  } catch (error) {
    console.error('❌ Error searching integrations:', error);
    throw error;
  }
}

/**
 * Test Elasticsearch connection
 */
async function testConnection() {
  try {
    const health = await client.cluster.health();
    console.log('✅ Elasticsearch connection successful:', health);
    return true;
  } catch (error) {
    console.error('❌ Elasticsearch connection failed:', error);
    return false;
  }
}

/**
 * User Management Functions
 */

/**
 * Create new user
 */
async function createUser(userData) {
  try {
    const userId = `user_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const result = await client.index({
      index: INDEXES.USERS,
      id: userId,
      body: {
        userId: userId,
        name: userData.name,
        email: userData.email,
        status: userData.status || 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
    return { _id: userId, ...result };
  } catch (error) {
    console.error('❌ Error creating user:', error);
    throw error;
  }
}

/**
 * Get all users
 */
async function getAllUsers() {
  try {
    const result = await client.search({
      index: INDEXES.USERS,
      body: {
        query: {
          bool: {
            must_not: [{ term: { status: 'inactive' } }],
          },
        },
        sort: [{ createdAt: { order: 'desc' } }],
        size: 1000,
      },
    });
    return result.hits.hits.map(hit => hit._source);
  } catch (error) {
    console.error('❌ Error getting users:', error);
    throw error;
  }
}

/**
 * Get user by ID
 */
async function getUserById(userId) {
  try {
    const result = await client.get({
      index: INDEXES.USERS,
      id: userId,
    });
    return result._source;
  } catch (error) {
    console.error('❌ Error getting user:', error);
    throw error;
  }
}

/**
 * Update user
 */
async function updateUser(userId, updates) {
  try {
    const result = await client.update({
      index: INDEXES.USERS,
      id: userId,
      body: {
        doc: {
          ...updates,
          updatedAt: new Date().toISOString(),
        },
      },
    });
    return result;
  } catch (error) {
    console.error('❌ Error updating user:', error);
    throw error;
  }
}

/**
 * Delete user (soft delete by setting status to inactive)
 */
async function deleteUser(userId) {
  try {
    const result = await client.update({
      index: INDEXES.USERS,
      id: userId,
      body: {
        doc: {
          status: 'inactive',
          updatedAt: new Date().toISOString(),
        },
      },
    });
    return result;
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    throw error;
  }
}

/**
 * User Connection Management Functions
 */

/**
 * Save user integration connection
 */
async function saveUserConnection(connectionData) {
  try {
    const connectionId =
      connectionData.connectionId ||
      `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const result = await client.index({
      index: INDEXES.USER_CONNECTIONS,
      id: connectionId,
      body: {
        connectionId: connectionId,
        userId: connectionData.userId,
        integrationId: connectionData.integrationId,
        integrationName: connectionData.integrationName,
        connectionName:
          connectionData.connectionName || connectionData.integrationName,
        authMethodId: connectionData.authMethodId,
        authMethodLabel: connectionData.authMethodLabel,
        configuredVariables: connectionData.configuredVariables || {},
        credentials: connectionData.credentials, // { encrypted, decrypted }
        status: connectionData.status || 'active',
        isActive: true,
        lastTestStatus: connectionData.lastTestStatus || null,
        lastTestMessage: connectionData.lastTestMessage || null,
        lastTestDate: connectionData.lastTestDate || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
    return { _id: connectionId, ...result };
  } catch (error) {
    console.error('❌ Error saving user connection:', error);
    throw error;
  }
}

/**
 * Get user connections
 */
async function getUserConnections(userId) {
  try {
    const result = await client.search({
      index: INDEXES.USER_CONNECTIONS,
      body: {
        query: {
          bool: {
            must: [{ term: { userId: userId } }, { term: { isActive: true } }],
          },
        },
        sort: [{ createdAt: { order: 'desc' } }],
        size: 1000,
      },
    });
    return result.hits.hits.map(hit => ({ id: hit._id, ...hit._source }));
  } catch (error) {
    console.error('❌ Error getting user connections:', error);
    throw error;
  }
}

/**
 * Get all connections (for admin use)
 */
async function getAllConnections() {
  try {
    const result = await client.search({
      index: INDEXES.USER_CONNECTIONS,
      body: {
        query: {
          term: { isActive: true },
        },
        sort: [{ createdAt: { order: 'desc' } }],
        size: 1000,
      },
    });
    return result.hits.hits.map(hit => ({ id: hit._id, ...hit._source }));
  } catch (error) {
    console.error('❌ Error getting all connections:', error);
    throw error;
  }
}

/**
 * Get connection by ID
 */
async function getConnectionById(connectionId) {
  try {
    const result = await client.get({
      index: INDEXES.USER_CONNECTIONS,
      id: connectionId,
    });
    return result._source;
  } catch (error) {
    console.error('❌ Error getting connection:', error);
    throw error;
  }
}

/**
 * Update connection
 */
async function updateConnection(connectionId, updates) {
  try {
    const result = await client.update({
      index: INDEXES.USER_CONNECTIONS,
      id: connectionId,
      body: {
        doc: {
          ...updates,
          updatedAt: new Date().toISOString(),
        },
      },
    });
    return result;
  } catch (error) {
    console.error('❌ Error updating connection:', error);
    throw error;
  }
}

/**
 * Delete connection (soft delete)
 */
async function deleteConnection(connectionId) {
  try {
    const result = await client.update({
      index: INDEXES.USER_CONNECTIONS,
      id: connectionId,
      body: {
        doc: {
          isActive: false,
          status: 'deleted',
          updatedAt: new Date().toISOString(),
        },
      },
    });
    return result;
  } catch (error) {
    console.error('❌ Error deleting connection:', error);
    throw error;
  }
}

// ===== Record Mappings Functions =====

/**
 * Create record mappings index if it doesn't exist
 */
async function createRecordMappingsIndex() {
  try {
    const exists = await client.indices.exists({
      index: INDEXES.RECORD_MAPPINGS,
    });
    if (!exists) {
      await client.indices.create({
        index: INDEXES.RECORD_MAPPINGS,
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              templateId: { type: 'keyword' },
              integrationIds: { type: 'keyword' }, // Array for order-independent lookup
              integrations: {
                type: 'object',
                enabled: true,
              },
              mappings: {
                type: 'nested', // For efficient querying of individual mappings
              },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' },
            },
          },
        },
      });
      console.log('✅ Created canonical_record_mappings index');
    }
  } catch (error) {
    console.error('Error creating record mappings index:', error);
    throw error;
  }
}

/**
 * Save or update record mapping
 */
async function saveRecordMapping(mapping) {
  try {
    await createRecordMappingsIndex();

    const document = {
      ...mapping,
      updatedAt: new Date().toISOString(),
    };

    if (!mapping.id) {
      document.id = `mapping_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      document.createdAt = document.updatedAt;
    }

    await client.index({
      index: INDEXES.RECORD_MAPPINGS,
      id: document.id,
      body: document,
      refresh: true,
    });

    return document;
  } catch (error) {
    console.error('Error saving record mapping:', error);
    throw error;
  }
}

/**
 * Get record mappings
 * @param {Object} query - Query parameters
 * @param {string} query.templateId - Filter by template ID
 * @param {Array<string>} query.integrationIds - Filter by integration IDs (order-independent)
 * @param {string} query.recordId - Find mapping for specific record (with integration ID)
 * @param {string} query.integrationId - Integration ID for recordId lookup
 */
async function getRecordMappings(query = {}) {
  try {
    await createRecordMappingsIndex();

    const must = [];

    if (query.templateId) {
      must.push({ term: { templateId: query.templateId } });
    }

    if (query.integrationIds && query.integrationIds.length > 0) {
      // Order-independent lookup using terms query
      must.push({ terms: { integrationIds: query.integrationIds } });
    }

    if (query.recordId && query.integrationId) {
      // Find mapping containing specific record
      must.push({
        nested: {
          path: 'mappings',
          query: {
            term: { [`mappings.${query.integrationId}`]: query.recordId },
          },
        },
      });
    }

    const searchQuery = {
      index: INDEXES.RECORD_MAPPINGS,
      body: {
        query: must.length > 0 ? { bool: { must } } : { match_all: {} },
        sort: [{ createdAt: 'desc' }],
      },
    };

    const result = await client.search(searchQuery);
    return result.hits.hits.map(hit => hit._source);
  } catch (error) {
    if (
      error.meta &&
      error.meta.body &&
      error.meta.body.error.type === 'index_not_found_exception'
    ) {
      return [];
    }
    console.error('Error getting record mappings:', error);
    throw error;
  }
}

/**
 * Get mapped record IDs bidirectionally
 * Given a source record, find all target records it's mapped to
 * @param {string} templateId - The mapping template ID
 * @param {string} sourceIntegration - The source integration ID
 * @param {any} sourceRecordId - The source record's primary key value
 * @param {string} targetIntegration - The target integration ID
 * @returns {Promise<Array>} Array of target record IDs
 */
async function getMappedRecordIds(templateId, sourceIntegration, sourceRecordId, targetIntegration) {
  try {
    const results = await getRecordMappings({
      templateId,
      integrationId: sourceIntegration,
      recordId: sourceRecordId,
    });

    if (results.length === 0) return [];

    // Extract target IDs from mappings where source matches
    const targetIds = [];
    for (const doc of results) {
      for (const mapping of doc.mappings || []) {
        if (mapping[sourceIntegration] === sourceRecordId && mapping[targetIntegration] !== undefined) {
          targetIds.push(mapping[targetIntegration]);
        }
      }
    }

    // Return unique IDs
    return [...new Set(targetIds)];
  } catch (error) {
    console.error('Error getting mapped record IDs:', error);
    throw error;
  }
}

/**
 * Get mapped record with full data bidirectionally
 * Given a source record, find all target records with their stored data
 * @param {string} templateId - The mapping template ID
 * @param {string} sourceIntegration - The source integration ID
 * @param {any} sourceRecordId - The source record's primary key value
 * @param {string} targetIntegration - The target integration ID
 * @returns {Promise<Array>} Array of target records with their data
 */
async function getMappedRecordsWithData(templateId, sourceIntegration, sourceRecordId, targetIntegration) {
  try {
    const results = await getRecordMappings({
      templateId,
      integrationId: sourceIntegration,
      recordId: sourceRecordId,
    });

    if (results.length === 0) return [];

    const targetRecords = [];
    for (const doc of results) {
      const targetRecordStore = doc.integrations?.[targetIntegration]?.records || {};

      for (const mapping of doc.mappings || []) {
        if (mapping[sourceIntegration] === sourceRecordId && mapping[targetIntegration] !== undefined) {
          const targetId = mapping[targetIntegration];
          const recordData = targetRecordStore[targetId] || null;

          targetRecords.push({
            id: targetId,
            data: recordData,
            mappingCreatedAt: mapping.createdAt,
          });
        }
      }
    }

    return targetRecords;
  } catch (error) {
    console.error('Error getting mapped records with data:', error);
    throw error;
  }
}

module.exports = {
  client,
  INDEXES,
  initializeIndexes,
  saveUserCredentials,
  getUserCredentials,
  updateUserCredentials,
  deleteUserCredentials,
  indexIntegration,
  searchIntegrations,
  testConnection,
  // User functions
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  // Connection functions
  saveUserConnection,
  getUserConnections,
  getAllConnections,
  getConnectionById,
  updateConnection,
  deleteConnection,
  // Record mapping functions
  saveRecordMapping,
  getRecordMappings,
  getMappedRecordIds,
  getMappedRecordsWithData,
};
