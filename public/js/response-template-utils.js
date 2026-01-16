/**
 * Response Template Utilities
 *
 * Functions to parse JSON templates with type annotations into flattened path-type arrays,
 * and reconstruct templates from stored path-type arrays.
 *
 * Supported types: string, int, boolean
 */

// Valid type values
const VALID_TYPES = ['string', 'int', 'boolean'];

/**
 * Parse a JSON template string into a flattened array of path-type pairs.
 *
 * @param {string} templateString - JSON string with type annotations
 * @returns {Array<{path: string, type: string}>} - Flattened array of path-type pairs
 *
 * @example
 * // Object root
 * parseTemplateToPathArray('{ "name": "string", "items": [{ "id": "int" }] }')
 * // Returns: [{ path: "name", type: "string" }, { path: "items[0].id", type: "int" }]
 *
 * @example
 * // Array root
 * parseTemplateToPathArray('[{ "name": "string" }]')
 * // Returns: [{ path: "[0].name", type: "string" }]
 */
function parseTemplateToPathArray(templateString) {
  if (!templateString || !templateString.trim()) {
    return [];
  }

  let template;
  try {
    template = JSON.parse(templateString);
  } catch (error) {
    throw new Error(`Invalid JSON: ${error.message}`);
  }

  const result = [];

  /**
   * Recursively traverse the template and extract paths
   * @param {any} obj - Current object/value to process
   * @param {string} currentPath - Current path being built
   */
  function traverse(obj, currentPath = '') {
    if (obj === null || obj === undefined) {
      return;
    }

    // Check if it's a primitive type annotation (leaf node)
    if (typeof obj === 'string') {
      const normalizedType = obj.toLowerCase();
      if (VALID_TYPES.includes(normalizedType)) {
        result.push({
          path: currentPath,
          type: normalizedType,
        });
      } else {
        throw new Error(
          `Invalid type "${obj}" at path "${currentPath}". Valid types: ${VALID_TYPES.join(
            ', ',
          )}`,
        );
      }
      return;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      if (obj.length === 0) {
        return; // Empty array, nothing to process
      }
      // Only process the first element as template
      const arrayPath = currentPath ? `${currentPath}[0]` : '[0]';
      traverse(obj[0], arrayPath);
      return;
    }

    // Handle objects
    if (typeof obj === 'object') {
      for (const key of Object.keys(obj)) {
        const newPath = currentPath ? `${currentPath}.${key}` : key;
        traverse(obj[key], newPath);
      }
      return;
    }

    // Handle other primitives (numbers, booleans) - treat as invalid template values
    throw new Error(
      `Invalid template value "${obj}" at path "${currentPath}". Values must be type strings: ${VALID_TYPES.join(
        ', ',
      )}`,
    );
  }

  traverse(template);
  return result;
}

/**
 * Reconstruct a JSON template from a flattened array of path-type pairs.
 *
 * @param {Array<{path: string, type: string}>} pathArray - Array of path-type pairs
 * @returns {Object|Array} - Reconstructed template object or array
 *
 * @example
 * reconstructTemplateFromPathArray([
 *   { path: "name", type: "string" },
 *   { path: "items[0].id", type: "int" }
 * ])
 * // Returns: { "name": "string", "items": [{ "id": "int" }] }
 */
function reconstructTemplateFromPathArray(pathArray) {
  if (!pathArray || pathArray.length === 0) {
    return null;
  }

  // Determine if root is an array (paths start with [0])
  const isRootArray = pathArray.some(item => item.path.startsWith('['));

  let root = isRootArray ? [] : {};

  for (const { path, type } of pathArray) {
    setValueAtPath(root, path, type);
  }

  return root;
}

/**
 * Set a value at a specific path in an object, creating intermediate objects/arrays as needed.
 *
 * @param {Object|Array} obj - Root object to modify
 * @param {string} path - Dot/bracket notation path
 * @param {string} value - Value to set at the path
 */
function setValueAtPath(obj, path, value) {
  // Parse the path into segments
  const segments = parsePath(path);

  let current = obj;

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    const nextSegment = segments[i + 1];

    // Determine if next container should be array or object
    const nextIsArray = typeof nextSegment === 'number';

    if (typeof segment === 'number') {
      // Current segment is an array index
      if (current[segment] === undefined) {
        current[segment] = nextIsArray ? [] : {};
      }
      current = current[segment];
    } else {
      // Current segment is a key
      if (current[segment] === undefined) {
        current[segment] = nextIsArray ? [] : {};
      }
      current = current[segment];
    }
  }

  // Set the final value
  const lastSegment = segments[segments.length - 1];
  current[lastSegment] = value;
}

/**
 * Parse a path string into an array of segments (strings for keys, numbers for indices).
 *
 * @param {string} path - Path string like "response[0].name" or "[0].items[0].id"
 * @returns {Array<string|number>} - Array of path segments
 *
 * @example
 * parsePath("response[0].name") // Returns: ["response", 0, "name"]
 * parsePath("[0].items[0].id")  // Returns: [0, "items", 0, "id"]
 */
function parsePath(path) {
  const segments = [];
  const regex = /\[(\d+)\]|\.?([^.\[\]]+)/g;
  let match;

  while ((match = regex.exec(path)) !== null) {
    if (match[1] !== undefined) {
      // Array index
      segments.push(parseInt(match[1], 10));
    } else if (match[2] !== undefined) {
      // Object key
      segments.push(match[2]);
    }
  }

  return segments;
}

/**
 * Parse a canonical template JSON string into a flattened array of path-var pairs.
 * This is used for canonical templates where values are canonical variables like {{canonical.employee.name}}.
 *
 * @param {string} templateString - JSON string with canonical variable values
 * @returns {Array<{path: string, var: string}>} - Flattened array of path-var pairs
 *
 * @example
 * parseCanonicalTemplateToPathArray('[{ "name": "{{canonical.employee.name}}", "id": "{{canonical.employee.unique_id}}" }]')
 * // Returns: [{ path: "[0].name", var: "{{canonical.employee.name}}" }, { path: "[0].id", var: "{{canonical.employee.unique_id}}" }]
 */
function parseCanonicalTemplateToPathArray(templateString) {
  if (!templateString || !templateString.trim()) {
    return [];
  }

  let template;
  try {
    template = JSON.parse(templateString);
  } catch (error) {
    throw new Error(`Invalid JSON: ${error.message}`);
  }

  const result = [];

  /**
   * Recursively traverse the template and extract paths
   * @param {any} obj - Current object/value to process
   * @param {string} currentPath - Current path being built
   */
  function traverse(obj, currentPath = '') {
    if (obj === null || obj === undefined) {
      return;
    }

    // Check if it's a string value (canonical variable)
    if (typeof obj === 'string') {
      result.push({
        path: currentPath,
        var: obj,
      });
      return;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      if (obj.length === 0) {
        return; // Empty array, nothing to process
      }
      // Only process the first element as template
      const arrayPath = currentPath ? `${currentPath}[0]` : '[0]';
      traverse(obj[0], arrayPath);
      return;
    }

    // Handle objects
    if (typeof obj === 'object') {
      for (const key of Object.keys(obj)) {
        const newPath = currentPath ? `${currentPath}.${key}` : key;
        traverse(obj[key], newPath);
      }
      return;
    }

    // Handle other primitives (numbers, booleans) - convert to string
    result.push({
      path: currentPath,
      var: String(obj),
    });
  }

  traverse(template);
  return result;
}

/**
 * Reconstruct a JSON template from a flattened array of path-value pairs.
 * Works for both type arrays ({path, type}) and var arrays ({path, var}).
 *
 * @param {Array<{path: string, type?: string, var?: string}>} pathArray - Array of path-value pairs
 * @returns {Object|Array} - Reconstructed template object or array
 */
function reconstructFromPathArray(pathArray) {
  if (!pathArray || pathArray.length === 0) {
    return null;
  }

  // Determine if root is an array (paths start with [0])
  const isRootArray = pathArray.some(item => item.path.startsWith('['));

  let root = isRootArray ? [] : {};

  for (const item of pathArray) {
    // Support both {path, type} and {path, var} formats
    const value = item.type || item.var;
    setValueAtPath(root, item.path, value);
  }

  return root;
}

// Export functions for use in browser (global scope)
if (typeof window !== 'undefined') {
  window.parseTemplateToPathArray = parseTemplateToPathArray;
  window.reconstructTemplateFromPathArray = reconstructTemplateFromPathArray;
  window.parseCanonicalTemplateToPathArray = parseCanonicalTemplateToPathArray;
  window.reconstructFromPathArray = reconstructFromPathArray;
}

// Export for Node.js (if used in tests)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseTemplateToPathArray,
    reconstructTemplateFromPathArray,
    parseCanonicalTemplateToPathArray,
    reconstructFromPathArray,
    parsePath,
    VALID_TYPES,
  };
}
