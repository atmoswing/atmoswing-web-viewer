/**
 * @module utils/normalize/entities
 * @description Entity list responses.
 *
 * Normalizers turn the API's varying response shapes into one predictable structure, so
 * nothing downstream has to branch on which form arrived.
 */

/**
 * Normalizes entities response to a consistent array format.
 * @param {*} resp - Raw API response (can be array, object with entities property, or null)
 * @returns {Array<Object>} Array of entity objects with {id, name?, x?, y?}
 * @example
 * // Returns [{id: 1, name: "Station A"}]
 * normalizeEntitiesResponse({entities: [{id: 1, name: "Station A"}]})
 */
export function normalizeEntitiesResponse(resp) {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp.entities)) return resp.entities;
  return [];
}

/**
 * Extracts and normalizes relevant entity IDs from various response formats.
 * @param {*} resp - Raw API response
 * @returns {Set<string|number>} Set of entity IDs
 * @example
 * normalizeRelevantEntityIds({entity_ids: [1, 2, 3]}) // Returns Set(1, 2, 3)
 */
export function normalizeRelevantEntityIds(resp) {
  let ids = [];
  if (!resp) return new Set();
  if (Array.isArray(resp)) {
    if (resp.length && typeof resp[0] === 'object') {
      ids = resp.map(r => r?.id ?? r?.entity_id).filter(v => v != null);
    } else {
      ids = resp;
    }
  } else if (typeof resp === 'object') {
    ids = resp.entity_ids || resp.entities_ids || resp.ids || (Array.isArray(resp.entities) ? resp.entities.map(e => e.id) : []);
  }
  return new Set(ids);
}
