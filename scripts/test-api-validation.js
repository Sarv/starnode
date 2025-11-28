/**
 * Test API validation for dynamic variables
 */

const http = require('http');

function makeRequest(method, path, data) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data ? Buffer.byteLength(JSON.stringify(data)) : 0
            }
        };

        const req = http.request(options, (res) => {
            let body = '';

            res.on('data', (chunk) => {
                body += chunk;
            });

            res.on('end', () => {
                try {
                    resolve({
                        statusCode: res.statusCode,
                        body: JSON.parse(body)
                    });
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        body: body
                    });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

async function runTests() {
    console.log('🧪 Testing API Validation for Dynamic Variables\n');
    console.log('='.repeat(60));

    // Test 1: Create integration with INVALID dynamic variables
    console.log('\n📋 Test 1: Create Integration with INVALID dynamic variables');
    console.log('-'.repeat(60));

    const invalidIntegration = {
        basicInfo: {
            id: 'test_invalid_vars',
            displayName: 'Test Invalid Variables',
            description: 'Testing invalid dynamic variables',
            category: 'test',
            status: 'inactive'
        },
        authSettings: {
            authMethods: [
                {
                    id: 'oauth_test_1',
                    authType: 'oauth2_authorization_code',
                    label: 'OAuth 2.0',
                    config: {
                        authorizationUrl: 'https://{{invalid_field}}/oauth/authorize',
                        tokenUrl: 'https://api.{{another_invalid}}/token',
                        refreshTokenUrl: '{{domain}}/refresh'  // This one is valid
                    },
                    additionalFields: [
                        {
                            name: 'domain',
                            label: 'Domain',
                            type: 'url',
                            required: true
                        }
                    ]
                }
            ]
        }
    };

    try {
        const response = await makeRequest('POST', '/api/integrations', invalidIntegration);

        console.log('\nStatus Code:', response.statusCode);
        console.log('Response:', JSON.stringify(response.body, null, 2));

        if (response.statusCode === 400) {
            console.log('\n✅ Validation correctly rejected invalid variables!');
        } else {
            console.log('\n❌ Validation did not reject invalid variables!');
        }
    } catch (error) {
        console.error('Error:', error.message);
    }

    // Test 2: Create integration with VALID dynamic variables
    console.log('\n\n📋 Test 2: Create Integration with VALID dynamic variables');
    console.log('-'.repeat(60));

    const validIntegration = {
        basicInfo: {
            id: 'test_valid_vars',
            displayName: 'Test Valid Variables',
            description: 'Testing valid dynamic variables',
            category: 'test',
            status: 'inactive'
        },
        authSettings: {
            authMethods: [
                {
                    id: 'oauth_test_2',
                    authType: 'oauth2_authorization_code',
                    label: 'OAuth 2.0',
                    config: {
                        authorizationUrl: 'https://{{domain}}/oauth/authorize',
                        tokenUrl: 'https://api.{{region}}.example.com/token',
                        refreshTokenUrl: '{{domain}}/refresh'
                    },
                    additionalFields: [
                        {
                            name: 'domain',
                            label: 'Domain',
                            type: 'url',
                            required: true
                        },
                        {
                            name: 'region',
                            label: 'Region',
                            type: 'string',
                            required: true
                        }
                    ]
                }
            ]
        }
    };

    try {
        const response = await makeRequest('POST', '/api/integrations', validIntegration);

        console.log('\nStatus Code:', response.statusCode);
        console.log('Response:', JSON.stringify(response.body, null, 2));

        if (response.statusCode === 200) {
            console.log('\n✅ Valid configuration accepted successfully!');
        } else {
            console.log('\n❌ Valid configuration was rejected!');
        }
    } catch (error) {
        console.error('Error:', error.message);
    }

    // Test 3: Update HubSpot with invalid variable (typo)
    console.log('\n\n📋 Test 3: Update Integration with typo in variable name');
    console.log('-'.repeat(60));

    const updateWithTypo = {
        authSettings: {
            authMethods: [
                {
                    id: 'oauth_hubspot',
                    authType: 'oauth2_authorization_code',
                    label: 'OAuth 2.0',
                    config: {
                        authorizationUrl: 'https://google.com',
                        tokenUrl: 'https://{{companyyyy}}/token',  // Typo!
                        refreshTokenUrl: '{{domain}}/refresh'
                    },
                    additionalFields: [
                        {
                            name: 'company',  // Correct name
                            label: 'Company Name',
                            type: 'string',
                            required: true
                        },
                        {
                            name: 'domain',
                            label: 'Domain URL',
                            type: 'url',
                            required: true
                        }
                    ]
                }
            ]
        }
    };

    try {
        const response = await makeRequest('PUT', '/api/integrations/hubspot', updateWithTypo);

        console.log('\nStatus Code:', response.statusCode);
        console.log('Response:', JSON.stringify(response.body, null, 2));

        if (response.statusCode === 400) {
            console.log('\n✅ Validation correctly detected typo and suggested correction!');
        } else {
            console.log('\n❌ Validation did not detect typo!');
        }
    } catch (error) {
        console.error('Error:', error.message);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ All API validation tests completed!\n');
}

// Run tests
runTests().catch(console.error);
