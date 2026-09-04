/**
 * @module utils/normalize/methods
 * @description Method and configuration responses.
 *
 * Normalizers turn the API's varying response shapes into one predictable structure, so
 * nothing downstream has to branch on which form arrived.
 */

/**
 * Normalizes methods and configurations response into a tree structure.
 * Each method contains nested configuration objects.
 *
 * @param {Object} resp - Raw API response with methods array
 * @returns {Array<Object>} Array of method objects with nested children configs
 * @example
 * normalizeMethodsAndConfigs({
 *   methods: [{id: 1, name: "Method A", configs: [{id: 10, name: "Config 1"}]}]
 * })
 * // Returns: [{id: 1, name: "Method A", children: [{id: 10, name: "Config 1"}]}]
 */
export function normalizeMethodsAndConfigs(resp) {
  const methods = Array.isArray(resp?.methods) ? resp.methods : [];
  return methods.map(m => ({
    id: m.id,
    name: m.name,
    children: Array.isArray(m.configurations) ? m.configurations.map(c => ({id: c.id, name: c.name})) : []
  }));
}
