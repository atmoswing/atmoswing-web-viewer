# Map Utils

## Files

- src/components/map/utils/olStyleUtils.js
- src/components/map/utils/olProjectionUtils.js
- src/components/map/utils/loadWmtsCapabilities.js
- src/components/map/utils/buildLegendStops.js

---

## Modules

<dl>
<dt><a href="#module_components/map/utils/olStyleUtils">components/map/utils/olStyleUtils</a></dt>
<dd><p>Utilities for OpenLayers style creation and color parsing.
Supports hex, rgb, rgba, QGIS-style colors, and style configuration objects.</p>
</dd>
<dt><a href="#module_components/map/utils/olProjectionUtils">components/map/utils/olProjectionUtils</a></dt>
<dd><p>Centralized projection utilities for OpenLayers with proj4 integration.</p>
</dd>
<dt><a href="#module_components/map/utils/loadWmtsCapabilities">components/map/utils/loadWmtsCapabilities</a></dt>
<dd><p>Utilities for loading WMTS (Web Map Tile Service) capabilities and creating tile layers.
Handles fetching capabilities XML, parsing layer options, and caching for reuse.</p>
</dd>
<dt><a href="#module_components/map/utils/buildLegendStops">components/map/utils/buildLegendStops</a></dt>
<dd><p>Generates legend gradient stops for map visualization.</p>
</dd>
</dl>

<a name="module_components/map/utils/olStyleUtils"></a>

## components/map/utils/olStyleUtils
Utilities for OpenLayers style creation and color parsing.
Supports hex, rgb, rgba, QGIS-style colors, and style configuration objects.


* [components/map/utils/olStyleUtils](#module_components/map/utils/olStyleUtils)
    * [.toRGBA(input, [alphaFallback])](#module_components/map/utils/olStyleUtils.toRGBA) ⇒ <code>string</code>
    * [.styleFromConfigObj([obj])](#module_components/map/utils/olStyleUtils.styleFromConfigObj) ⇒ <code>function</code>

<a name="module_components/map/utils/olStyleUtils.toRGBA"></a>

### components/map/utils/olStyleUtils.toRGBA(input, [alphaFallback]) ⇒ <code>string</code>
Converts various color formats to CSS rgba() string.
Supports hex, rgb/rgba strings, QGIS-style comma-separated values, and arrays.

**Kind**: static method of [<code>components/map/utils/olStyleUtils</code>](#module_components/map/utils/olStyleUtils)  
**Returns**: <code>string</code> - CSS rgba() color string  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| input | <code>string</code> \| <code>Array</code> |  | Color in various formats |
| [alphaFallback] | <code>number</code> | <code>1</code> | Default alpha value if not specified |

**Example**  
```javascript
toRGBA('#ff0000') // Returns: "rgba(255,0,0,1)"
toRGBA('255,0,0,128') // Returns: "rgba(255,0,0,0.5)"
```
<a name="module_components/map/utils/olStyleUtils.styleFromConfigObj"></a>

### components/map/utils/olStyleUtils.styleFromConfigObj([obj]) ⇒ <code>function</code>
Creates an OpenLayers style function from a configuration object.
Supports different styles for lines, polygons, and points.

**Kind**: static method of [<code>components/map/utils/olStyleUtils</code>](#module_components/map/utils/olStyleUtils)  
**Returns**: <code>function</code> - OpenLayers style function  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [obj] | <code>Object</code> | <code>{}</code> | Style configuration object |
| [obj.line] | <code>Object</code> |  | Line style configuration |
| [obj.polygon] | <code>Object</code> |  | Polygon style configuration |
| [obj.point] | <code>Object</code> |  | Point/circle style configuration |
| [obj.strokeColor] | <code>string</code> |  | Fallback stroke color |
| [obj.strokeWidth] | <code>number</code> |  | Fallback stroke width |
| [obj.fillColor] | <code>string</code> |  | Fallback fill color |

**Example**  
```javascript
const style = styleFromConfigObj({
  line: { stroke: { color: '#ff0000', width: 3 } },
  polygon: { fill: { color: 'rgba(255,0,0,0.2)' } }
});
```
<a name="module_components/map/utils/olProjectionUtils"></a>

## components/map/utils/olProjectionUtils
Centralized projection utilities for OpenLayers with proj4 integration.


* [components/map/utils/olProjectionUtils](#module_components/map/utils/olProjectionUtils)
    * _static_
        * [.ensureProjDefined(epsg)](#module_components/map/utils/olProjectionUtils.ensureProjDefined)
    * _inner_
        * [~PREDEFINED](#module_components/map/utils/olProjectionUtils..PREDEFINED) : <code>Object</code>

<a name="module_components/map/utils/olProjectionUtils.ensureProjDefined"></a>

### components/map/utils/olProjectionUtils.ensureProjDefined(epsg)
Ensures a projection is defined in proj4 and registered with OpenLayers.
Uses predefined definitions for known EPSG codes. Handles registration errors silently.

**Kind**: static method of [<code>components/map/utils/olProjectionUtils</code>](#module_components/map/utils/olProjectionUtils)  

| Param | Type | Description |
| --- | --- | --- |
| epsg | <code>string</code> | EPSG code (e.g., "EPSG:2154") |

**Example**  
```javascript
ensureProjDefined('EPSG:2154'); // Registers Lambert-93 for France
```
<a name="module_components/map/utils/olProjectionUtils..PREDEFINED"></a>

### components/map/utils/olProjectionUtils~PREDEFINED : <code>Object</code>
Predefined proj4 projection definitions for common EPSG codes.

**Kind**: inner constant of [<code>components/map/utils/olProjectionUtils</code>](#module_components/map/utils/olProjectionUtils)  
<a name="module_components/map/utils/loadWmtsCapabilities"></a>

## components/map/utils/loadWmtsCapabilities
Utilities for loading WMTS (Web Map Tile Service) capabilities and creating tile layers.
Handles fetching capabilities XML, parsing layer options, and caching for reuse.


* [components/map/utils/loadWmtsCapabilities](#module_components/map/utils/loadWmtsCapabilities)
    * [.loadWmtsCapabilities(runtimeConfig, [enqueueWarning], [preferStyleForItem])](#module_components/map/utils/loadWmtsCapabilities.loadWmtsCapabilities) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.createWmtsTileLayer(item, wmtsOptionsCache)](#module_components/map/utils/loadWmtsCapabilities.createWmtsTileLayer) ⇒ <code>WMTS</code> \| <code>null</code>

<a name="module_components/map/utils/loadWmtsCapabilities.loadWmtsCapabilities"></a>

### components/map/utils/loadWmtsCapabilities.loadWmtsCapabilities(runtimeConfig, [enqueueWarning], [preferStyleForItem]) ⇒ <code>Promise.&lt;Object&gt;</code>
Fetches WMTS capabilities from configured providers and builds options cache.
Processes base layers and overlay layers from runtime config, attempts to load
capabilities with preferred styles, and returns a cache of layer options.

**Kind**: static method of [<code>components/map/utils/loadWmtsCapabilities</code>](#module_components/map/utils/loadWmtsCapabilities)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - Cache object mapping wmtsLayer name to OpenLayers WMTS options  

| Param | Type | Description |
| --- | --- | --- |
| runtimeConfig | <code>Object</code> | Runtime configuration with providers and layers |
| [enqueueWarning] | <code>function</code> | Optional callback to display warning messages |
| [preferStyleForItem] | <code>function</code> | Optional function to determine preferred style for an item |

**Example**  
```javascript
const cache = await loadWmtsCapabilities(config, (msg) => console.warn(msg));
// Returns: { 'layerName': { ...wmtsOptions } }
```
<a name="module_components/map/utils/loadWmtsCapabilities.createWmtsTileLayer"></a>

### components/map/utils/loadWmtsCapabilities.createWmtsTileLayer(item, wmtsOptionsCache) ⇒ <code>WMTS</code> \| <code>null</code>
Creates an OpenLayers WMTS source from cached layer options.

**Kind**: static method of [<code>components/map/utils/loadWmtsCapabilities</code>](#module_components/map/utils/loadWmtsCapabilities)  
**Returns**: <code>WMTS</code> \| <code>null</code> - OpenLayers WMTS source instance, or null if not found in cache  

| Param | Type | Description |
| --- | --- | --- |
| item | <code>Object</code> | Layer configuration item with wmtsLayer property |
| wmtsOptionsCache | <code>Object</code> | Cache of WMTS options from loadWmtsCapabilities |

**Example**  
```javascript
const source = createWmtsTileLayer({ wmtsLayer: 'myLayer' }, cache);
if (source) {
  const layer = new TileLayer({ source });
}
```
<a name="module_components/map/utils/buildLegendStops"></a>

## components/map/utils/buildLegendStops
Generates legend gradient stops for map visualization.

<a name="module_components/map/utils/buildLegendStops.buildLegendStops"></a>

### components/map/utils/buildLegendStops.buildLegendStops([maxVal], [samples]) ⇒ <code>Array.&lt;Object&gt;</code>
Builds an array of color stops for a continuous legend gradient.
Each stop represents a point in the gradient from 0 to maxVal.

**Kind**: static method of [<code>components/map/utils/buildLegendStops</code>](#module_components/map/utils/buildLegendStops)  
**Returns**: <code>Array.&lt;Object&gt;</code> - Array of legend stops with {color: string, pct: number}  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [maxVal] | <code>number</code> | <code>1</code> | Maximum value for the legend scale |
| [samples] | <code>number</code> | <code>LEGEND_SAMPLES</code> | Number of gradient samples to generate |

**Example**  
```javascript
const stops = buildLegendStops(100, 10);
// Returns: [
//   {color: 'rgb(255,255,255)', pct: 0},
//   {color: 'rgb(200,255,200)', pct: 10},
//   ...
//   {color: 'rgb(255,0,0)', pct: 100}
// ]
```
