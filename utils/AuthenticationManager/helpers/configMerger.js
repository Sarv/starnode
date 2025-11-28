/**
 * configMerger.js
 * Merges default testConfig with integration overrides
 */

class ConfigMerger {
    /**
     * Merge test config from master definition and integration override
     * @param {Object} masterTestConfig - Field definitions from auth-types-definition.json
     * @param {Object} integrationTestConfig - Values from integration auth.schema.json
     * @returns {Object} Merged configuration with values
     */
    static mergeTestConfig(masterTestConfig, integrationTestConfig) {
        // Extract default values from master definition
        const defaults = {};

        if (masterTestConfig) {
            for (const [key, fieldDef] of Object.entries(masterTestConfig)) {
                if (fieldDef.default !== undefined) {
                    defaults[key] = fieldDef.default;
                }
            }
        }

        // Merge with integration overrides (integration values take precedence)
        return {
            ...defaults,
            ...(integrationTestConfig || {})
        };
    }

    /**
     * Merge auth config (similar pattern for config options)
     */
    static mergeAuthConfig(masterConfig, instanceConfig) {
        const defaults = {};

        if (masterConfig) {
            for (const [key, fieldDef] of Object.entries(masterConfig)) {
                if (fieldDef.default !== undefined) {
                    defaults[key] = fieldDef.default;
                }
            }
        }

        return {
            ...defaults,
            ...(instanceConfig || {})
        };
    }
}

module.exports = ConfigMerger;
