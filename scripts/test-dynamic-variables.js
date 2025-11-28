/**
 * Test script for dynamic variables validation
 */

const dynamicVariables = require('./utils/dynamicVariables');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Dynamic Variables Utility\n');
console.log('='.repeat(60));

// Test 1: Load HubSpot config and validate
console.log('\n📋 Test 1: Validate HubSpot Configuration');
console.log('-'.repeat(60));

const hubspotPath = path.join(__dirname, 'integrations/providers/hubspot/auth.schema.json');
const hubspotAuth = JSON.parse(fs.readFileSync(hubspotPath, 'utf8'));

console.log('\nHubSpot Auth Config:');
console.log(JSON.stringify(hubspotAuth, null, 2));

const validation = dynamicVariables.validateAuthSchema(hubspotAuth);

console.log('\n✅ Validation Result:');
console.log('Valid:', validation.valid);

if (!validation.valid) {
    console.log('\n❌ Validation Errors:');
    validation.errors.forEach((error, index) => {
        console.log(`\n  Error ${index + 1}:`);
        console.log(`  - Auth Method: ${error.authMethodLabel}`);
        console.log(`  - Variable: ${error.variable}`);
        console.log(`  - Used In: ${error.usedIn.join(', ')}`);
        console.log(`  - Message: ${error.message}`);
    });
} else {
    console.log('✅ No validation errors found!');
}

// Test 2: Get summary of variables
console.log('\n\n📊 Test 2: Variables Summary');
console.log('-'.repeat(60));

hubspotAuth.authMethods.forEach((method, index) => {
    console.log(`\nAuth Method ${index + 1}: ${method.label}`);
    const summary = dynamicVariables.getVariablesSummary(method);

    console.log(`  Total Variables Used: ${summary.totalVariablesUsed}`);
    console.log(`  Total Fields Defined: ${summary.totalFieldsDefined}`);

    if (summary.variables.length > 0) {
        console.log('\n  Variables:');
        summary.variables.forEach(v => {
            const status = v.isDefined ? '✅' : '❌';
            console.log(`    ${status} {{${v.name}}} - Used in: ${v.usedIn.join(', ')}`);
        });
    }

    if (summary.unusedFields.length > 0) {
        console.log('\n  ⚠️  Unused Fields:', summary.unusedFields.join(', '));
    }

    if (summary.undefinedVariables.length > 0) {
        console.log('\n  ❌ Undefined Variables:', summary.undefinedVariables.join(', '));
    }
});

// Test 3: Test variable replacement
console.log('\n\n🔄 Test 3: Variable Replacement');
console.log('-'.repeat(60));

const testUrl = 'https://{{company}}.hubspot.com/oauth/token';
const testValues = { company: 'acme-corp' };

console.log(`\nOriginal URL: ${testUrl}`);
console.log(`Values: ${JSON.stringify(testValues)}`);

const replacedUrl = dynamicVariables.replaceDynamicVariables(testUrl, testValues);
console.log(`Replaced URL: ${replacedUrl}`);

// Test 4: Test with missing value (non-strict)
console.log('\n\n🔄 Test 4: Variable Replacement with Missing Value (Non-strict)');
console.log('-'.repeat(60));

const testUrl2 = 'https://{{domain}}/api/{{workspace}}/v1';
const testValues2 = { domain: 'api.example.com' }; // workspace is missing

console.log(`\nOriginal URL: ${testUrl2}`);
console.log(`Values: ${JSON.stringify(testValues2)}`);

const replacedUrl2 = dynamicVariables.replaceDynamicVariables(testUrl2, testValues2, false);
console.log(`Replaced URL (non-strict): ${replacedUrl2}`);

// Test 5: Test extract variables
console.log('\n\n🔍 Test 5: Extract Variables from String');
console.log('-'.repeat(60));

const testStrings = [
    'https://{{domain}}/api',
    'https://api.{{region}}.service.com/oauth/{{version}}/token',
    'https://example.com/api',
    '{{subdomain}}.{{service}}.{{tld}}'
];

testStrings.forEach(str => {
    const vars = dynamicVariables.extractDynamicVariables(str);
    console.log(`\n  String: ${str}`);
    console.log(`  Variables: ${vars.length > 0 ? vars.map(v => `{{${v}}}`).join(', ') : 'None'}`);
});

// Test 6: Test with corrected HubSpot config
console.log('\n\n✨ Test 6: Validate Freshdesk Configuration');
console.log('-'.repeat(60));

const freshdeskPath = path.join(__dirname, 'integrations/providers/freshdesk/auth.schema.json');
const freshdeskAuth = JSON.parse(fs.readFileSync(freshdeskPath, 'utf8'));

const freshdeskValidation = dynamicVariables.validateAuthSchema(freshdeskAuth);

console.log('\nFreshdesk Validation:');
console.log('Valid:', freshdeskValidation.valid);

if (!freshdeskValidation.valid) {
    console.log('\n❌ Errors found:');
    freshdeskValidation.errors.forEach(err => {
        console.log(`  - ${err.message}`);
    });
} else {
    console.log('✅ Freshdesk configuration is valid!');
}

console.log('\n' + '='.repeat(60));
console.log('✅ All tests completed!\n');
