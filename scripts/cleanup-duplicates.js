#!/usr/bin/env node

/**
 * Cleanup Duplicates Script
 *
 * This script removes duplicate integration entries from registry.json
 * keeping only the most recent entry for each unique ID.
 */

const fs = require('fs');
const path = require('path');

const registryPath = path.join(__dirname, '..', 'integrations', 'registry.json');

console.log('🔍 Checking for duplicate entries in registry.json...\n');

try {
    // Read registry
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    const originalCount = registry.integrations.length;

    console.log(`Total entries: ${originalCount}`);

    // Track unique IDs and their latest entries
    const uniqueMap = new Map();
    const duplicates = [];

    registry.integrations.forEach((integration, index) => {
        const id = integration.id;

        if (uniqueMap.has(id)) {
            const existing = uniqueMap.get(id);

            // Compare timestamps to keep the most recent
            const existingTime = new Date(existing.updatedAt || existing.createdAt);
            const currentTime = new Date(integration.updatedAt || integration.createdAt);

            if (currentTime > existingTime) {
                // Current is newer, replace
                duplicates.push({ id, index: existing.index, reason: 'older' });
                uniqueMap.set(id, { ...integration, index });
            } else {
                // Existing is newer or same, discard current
                duplicates.push({ id, index, reason: 'older' });
            }
        } else {
            uniqueMap.set(id, { ...integration, index });
        }
    });

    if (duplicates.length === 0) {
        console.log('✅ No duplicates found! Registry is clean.\n');
        return;
    }

    console.log(`\n⚠️  Found ${duplicates.length} duplicate entries:\n`);

    // Group duplicates by ID
    const duplicatesByID = {};
    duplicates.forEach(dup => {
        if (!duplicatesByID[dup.id]) {
            duplicatesByID[dup.id] = [];
        }
        duplicatesByID[dup.id].push(dup);
    });

    Object.keys(duplicatesByID).forEach(id => {
        const count = duplicatesByID[id].length + 1; // +1 for the kept entry
        console.log(`   - ID: "${id}" has ${count} entries (removing ${duplicatesByID[id].length})`);
    });

    // Create cleaned array with only unique entries (most recent per ID)
    const cleanedIntegrations = Array.from(uniqueMap.values())
        .map(({ index, ...integration }) => integration)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); // Sort by creation date

    // Update registry
    registry.integrations = cleanedIntegrations;
    registry.lastUpdated = new Date().toISOString();

    // Create backup before writing
    const backupPath = registryPath + '.backup.' + Date.now();
    fs.copyFileSync(registryPath, backupPath);
    console.log(`\n💾 Backup created: ${path.basename(backupPath)}`);

    // Write cleaned registry
    fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));

    console.log(`\n✅ Cleanup complete!`);
    console.log(`   - Removed: ${duplicates.length} duplicate entries`);
    console.log(`   - Remaining: ${cleanedIntegrations.length} unique integrations`);
    console.log(`   - Backup: ${path.basename(backupPath)}\n`);

} catch (error) {
    console.error('❌ Error cleaning up duplicates:', error.message);
    process.exit(1);
}
