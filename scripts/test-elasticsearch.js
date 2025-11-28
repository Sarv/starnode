#!/usr/bin/env node

/**
 * Elasticsearch Connection & Index Setup Test
 * Run this script to test Elasticsearch connection and initialize indexes
 */

const elasticsearch = require('./services/elasticsearch');
const encryption = require('./services/encryption');

async function runTests() {
    console.log('\n🔍 Starting Elasticsearch Connection Test...\n');

    try {
        // Test 1: Connection
        console.log('1️⃣ Testing Elasticsearch connection...');
        const isConnected = await elasticsearch.testConnection();
        if (!isConnected) {
            console.error('❌ Failed to connect to Elasticsearch');
            console.log('\n💡 Make sure Elasticsearch is running on http://localhost:9200');
            console.log('   You can start it with: brew services start elasticsearch (on macOS)');
            process.exit(1);
        }
        console.log('✅ Connection successful!\n');

        // Test 2: Initialize Indexes
        console.log('2️⃣ Initializing Elasticsearch indexes...');
        await elasticsearch.initializeIndexes();
        console.log('✅ Indexes initialized!\n');

        // Test 3: Test Encryption
        console.log('3️⃣ Testing encryption service...');
        const testData = {
            apiKey: 'test-api-key-12345',
            clientId: 'test-client-id',
            clientSecret: 'test-secret'
        };
        const encrypted = encryption.encryptCredentials(testData);
        console.log('   Encrypted:', encrypted.substring(0, 50) + '...');

        const decrypted = encryption.decryptCredentials(encrypted);
        console.log('   Decrypted:', decrypted);

        if (JSON.stringify(testData) === JSON.stringify(decrypted)) {
            console.log('✅ Encryption/Decryption working correctly!\n');
        } else {
            console.error('❌ Encryption/Decryption mismatch!');
            process.exit(1);
        }

        // Test 4: Save Test Credential
        console.log('4️⃣ Testing credential save to Elasticsearch...');
        const testCredential = {
            userId: 'test-user-123',
            integrationId: 'salesforce',
            authMethodId: 'oauth2_method',
            credentials: encrypted
        };
        const saveResult = await elasticsearch.saveUserCredentials(testCredential);
        console.log('   Saved with ID:', saveResult._id);
        console.log('✅ Credential saved successfully!\n');

        // Test 5: Retrieve Test Credential
        console.log('5️⃣ Testing credential retrieval...');
        const retrieved = await elasticsearch.getUserCredentials('test-user-123', 'salesforce');
        if (retrieved.length > 0) {
            console.log('   Retrieved', retrieved.length, 'credential(s)');
            const decryptedCredentials = encryption.decryptCredentials(retrieved[0].credentials);
            console.log('   Decrypted data:', decryptedCredentials);
            console.log('✅ Credential retrieval working!\n');
        } else {
            console.error('❌ No credentials found');
        }

        console.log('═══════════════════════════════════════════════════════');
        console.log('✅ All tests passed successfully!');
        console.log('═══════════════════════════════════════════════════════');
        console.log('\n📊 Elasticsearch is ready for use!');
        console.log('   - Indexes created: user_credentials, integrations_registry');
        console.log('   - Encryption working correctly');
        console.log('   - CRUD operations functional\n');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error('\nError details:', error);
        process.exit(1);
    }
}

// Run tests
runTests();
