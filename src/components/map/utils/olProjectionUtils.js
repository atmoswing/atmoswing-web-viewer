/**
 * @module components/map/utils/olProjectionUtils
 * @description Centralized projection utilities for OpenLayers with proj4 integration.
 */

import proj4 from 'proj4';
import {register} from 'ol/proj/proj4';

/**
 * Predefined proj4 projection definitions for common EPSG codes.
 * @constant {Object}
 */
const PREDEFINED = {
  'EPSG:2154': '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
  'EPSG:2056': '+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs +type=crs'
};

/**
 * Ensures a projection is defined in proj4 and registered with OpenLayers.
 * Uses predefined definitions for known EPSG codes. Handles registration errors silently.
 *
 * @param {string} epsg - EPSG code (e.g., "EPSG:2154")
 * @example
 * ensureProjDefined('EPSG:2154'); // Registers Lambert-93 for France
 */
export function ensureProjDefined(epsg) {
  if (!epsg || !String(epsg).startsWith('EPSG:')) return;
  if (proj4.defs[epsg]) return;
  if (PREDEFINED[epsg]) {
    proj4.defs(epsg, PREDEFINED[epsg]);
  }
  try {
    register(proj4);
  } catch (e) {
    void e;
  }
}
