# Map Hooks

## Files

- src/components/map/hooks/useProjectionRegistration.js
- src/components/map/hooks/useOverlayGlobalLayers.js
- src/components/map/hooks/useOverlayConfigLayers.js
- src/components/map/hooks/useMapInteractions.js
- src/components/map/hooks/useMapInit.js
- src/components/map/hooks/useForecastPoints.js
- src/components/map/hooks/useDarkMode.js

---

## Modules

<dl>
<dt><a href="#module_components/map/hooks/useProjectionRegistration">components/map/hooks/useProjectionRegistration</a></dt>
<dd><p>React hook for registering custom map projections with OpenLayers.</p>
</dd>
<dt><a href="#module_components/map/hooks/useOverlayGlobalLayers">components/map/hooks/useOverlayGlobalLayers</a></dt>
<dd><p>Hook for loading and managing global (non-workspace-specific) overlay layers.
Supports WMTS and GeoJSON sources with optional periodic refresh.</p>
</dd>
<dt><a href="#module_components/map/hooks/useOverlayConfigLayers">components/map/hooks/useOverlayConfigLayers</a></dt>
<dd><p>Hook for loading and managing workspace-specific overlay layers (shapefiles).
Dynamically adds/removes overlay layers based on workspace configuration.</p>
</dd>
<dt><a href="#module_components/map/hooks/useMapInteractions">components/map/hooks/useMapInteractions</a></dt>
<dd><p>Hook for handling map click and pointer interactions with forecast points.
Manages entity selection on click and tooltip display on hover.</p>
</dd>
<dt><a href="#module_components/map/hooks/useMapInit">components/map/hooks/useMapInit</a></dt>
<dd><p>React hook for initializing OpenLayers map with configured layers and controls.</p>
</dd>
<dt><a href="#module_components/map/hooks/useForecastPoints">components/map/hooks/useForecastPoints</a></dt>
<dd><p>Hook for rendering forecast points on the map with color-coded values.
Handles entity visualization, relevance highlighting, legend updates, and map extent fitting.</p>
</dd>
<dt><a href="#module_components/map/hooks/useDarkMode">components/map/hooks/useDarkMode</a></dt>
<dd><p>React hook for detecting system dark mode preference.</p>
</dd>
</dl>

<a name="module_components/map/hooks/useProjectionRegistration"></a>

## components/map/hooks/useProjectionRegistration
React hook for registering custom map projections with OpenLayers.


* [components/map/hooks/useProjectionRegistration](#module_components/map/hooks/useProjectionRegistration)
    * [module.exports(epsg)](#exp_module_components/map/hooks/useProjectionRegistration--module.exports) ⇒ <code>React.RefObject</code> ⏏
        * [~PREDEFINED](#module_components/map/hooks/useProjectionRegistration--module.exports..PREDEFINED) : <code>Object</code>

<a name="exp_module_components/map/hooks/useProjectionRegistration--module.exports"></a>

### module.exports(epsg) ⇒ <code>React.RefObject</code> ⏏
Hook that registers a projection with OpenLayers if not already registered.
Uses predefined proj4 definitions for known EPSG codes.

**Kind**: Exported function  
**Returns**: <code>React.RefObject</code> - Ref containing the last registered projection  

| Param | Type | Description |
| --- | --- | --- |
| epsg | <code>string</code> | EPSG code (e.g., "EPSG:2154") |

**Example**  
```javascript
useProjectionRegistration('EPSG:2154'); // Registers Lambert-93 for France
```
<a name="module_components/map/hooks/useProjectionRegistration--module.exports..PREDEFINED"></a>

#### module.exports~PREDEFINED : <code>Object</code>
Predefined projection definitions for common EPSG codes.

**Kind**: inner constant of [<code>module.exports</code>](#exp_module_components/map/hooks/useProjectionRegistration--module.exports)  
<a name="module_components/map/hooks/useOverlayGlobalLayers"></a>

## components/map/hooks/useOverlayGlobalLayers
Hook for loading and managing global (non-workspace-specific) overlay layers.
Supports WMTS and GeoJSON sources with optional periodic refresh.

<a name="exp_module_components/map/hooks/useOverlayGlobalLayers--module.exports"></a>

### module.exports(params) ⏏
Hook that loads global overlay layers defined in runtime configuration.
Handles WMTS capabilities adoption, dynamic GeoJSON fetching, refresh timers,
abort controllers, and layer switcher panel updates.

**Kind**: Exported function  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> | Hook parameters |
| params.mapReady | <code>boolean</code> | Whether map is initialized |
| params.runtimeConfig | <code>Object</code> | Runtime configuration object |
| params.overlayGroupRef | <code>React.RefObject</code> | Ref to overlay layer group |
| params.layerSwitcherRef | <code>React.RefObject</code> | Ref to layer switcher control |
| [params.enqueueSnackbar] | <code>function</code> | Optional notification callback |

**Example**  
```javascript
useOverlayGlobalLayers({
  mapReady: true,
  runtimeConfig,
  overlayGroupRef,
  layerSwitcherRef,
  enqueueSnackbar: (msg) => console.warn(msg)
});
```
<a name="module_components/map/hooks/useOverlayConfigLayers"></a>

## components/map/hooks/useOverlayConfigLayers
Hook for loading and managing workspace-specific overlay layers (shapefiles).
Dynamically adds/removes overlay layers based on workspace configuration.

<a name="exp_module_components/map/hooks/useOverlayConfigLayers--module.exports"></a>

### module.exports(params) ⏏
Hook that manages workspace-specific overlay layers on the map.
Loads shapefiles defined in workspace configuration and adds them as vector layers.
Automatically cleans up layers when workspace changes.

**Kind**: Exported function  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> | Hook parameters |
| params.mapReady | <code>boolean</code> | Whether map is initialized |
| params.runtimeConfig | <code>Object</code> | Runtime configuration with workspace definitions |
| params.workspace | <code>string</code> | Current workspace key |
| params.overlayGroupRef | <code>React.RefObject</code> | Ref to overlay layer group |
| params.layerSwitcherRef | <code>React.RefObject</code> | Ref to layer switcher control |

**Example**  
```javascript
useOverlayConfigLayers({
  mapReady: true,
  runtimeConfig: config,
  workspace: 'demo',
  overlayGroupRef,
  layerSwitcherRef
});
```
<a name="module_components/map/hooks/useMapInteractions"></a>

## components/map/hooks/useMapInteractions
Hook for handling map click and pointer interactions with forecast points.
Manages entity selection on click and tooltip display on hover.

<a name="exp_module_components/map/hooks/useMapInteractions--module.exports"></a>

### module.exports(params) ⏏
Hook that sets up map interaction handlers for forecast point selection and tooltips.
Handles single click for entity selection and pointer move/out for tooltip display.

**Kind**: Exported function  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> | Hook parameters |
| params.mapRef | <code>React.RefObject</code> | Ref to OpenLayers map instance |
| params.forecastLayerRef | <code>React.RefObject</code> | Ref to forecast vector layer |
| params.setSelectedEntityId | <code>function</code> | Function to set selected entity ID |
| params.setTooltip | <code>function</code> | Function to set tooltip state (x, y, name, valueRaw) |
| params.mapReady | <code>boolean</code> | Whether map is initialized |

**Example**  
```javascript
useMapInteractions({
  mapRef,
  forecastLayerRef,
  setSelectedEntityId: (id) => console.log('Selected:', id),
  setTooltip: (tooltip) => console.log('Tooltip:', tooltip),
  mapReady: true
});
```
<a name="module_components/map/hooks/useMapInit"></a>

## components/map/hooks/useMapInit
React hook for initializing OpenLayers map with configured layers and controls.

<a name="exp_module_components/map/hooks/useMapInit--module.exports"></a>

### module.exports(params) ⇒ <code>Object</code> ⏏
Hook that initializes an OpenLayers map with base layers, overlays, and controls.

**Kind**: Exported function  
**Returns**: <code>Object</code> - Map refs and ready state  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> | Hook parameters |
| params.t | <code>function</code> | Translation function |
| params.runtimeConfig | <code>Object</code> | Runtime config with layer definitions |
| params.enqueueSnackbar | <code>function</code> | Notification function |

**Example**  
```javascript
const { containerRef, mapRef, mapReady } = useMapInit({ t, runtimeConfig, enqueueSnackbar });
```
<a name="module_components/map/hooks/useForecastPoints"></a>

## components/map/hooks/useForecastPoints
Hook for rendering forecast points on the map with color-coded values.
Handles entity visualization, relevance highlighting, legend updates, and map extent fitting.

<a name="exp_module_components/map/hooks/useForecastPoints--module.exports"></a>

### module.exports(params) ⏏
Hook that renders forecast entities as colored points on the OpenLayers map.
Updates point colors based on forecast values, highlights relevant entities,
manages legend stops, and fits map extent to data.

**Kind**: Exported function  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> | Hook parameters |
| params.ENTITIES_SOURCE_EPSG | <code>string</code> | EPSG code for entity coordinates |
| params.mapReady | <code>boolean</code> | Whether map is initialized |
| params.entities | <code>Array</code> | Array of entity objects with coordinates |
| params.entitiesWorkspace | <code>string</code> | Workspace key for entities |
| params.entitiesKey | <code>string</code> | Cache key for current entities |
| params.relevantEntities | <code>Set</code> | Set of relevant entity IDs |
| params.workspace | <code>string</code> | Current workspace |
| params.forecastValuesNorm | <code>Object</code> | Normalized forecast values by entity ID |
| params.forecastValues | <code>Object</code> | Raw forecast values by entity ID |
| params.forecastUnavailable | <code>boolean</code> | Whether forecast data is unavailable |
| params.forecastLayerRef | <code>React.RefObject</code> | Ref to forecast vector layer |
| params.mapRef | <code>React.RefObject</code> | Ref to OpenLayers map instance |
| params.setLegendStops | <code>function</code> | Setter for legend gradient stops |
| params.setLegendMax | <code>function</code> | Setter for legend maximum value |

**Example**  
```javascript
useForecastPoints({
  ENTITIES_SOURCE_EPSG: 'EPSG:4326',
  mapReady: true,
  entities: [...],
  forecastValuesNorm: { 1: 0.5, 2: 0.8 },
  forecastLayerRef,
  mapRef,
  setLegendStops,
  setLegendMax
});
```
<a name="module_components/map/hooks/useDarkMode"></a>

## components/map/hooks/useDarkMode
React hook for detecting system dark mode preference.

<a name="exp_module_components/map/hooks/useDarkMode--module.exports"></a>

### module.exports() ⇒ <code>boolean</code> ⏏
Hook that detects and tracks the user's dark mode preference.
Listens to system preference changes via prefers-color-scheme media query.

**Kind**: Exported function  
**Returns**: <code>boolean</code> - True if dark mode is preferred, false otherwise  
**Example**  
```javascript
const isDarkMode = useDarkMode();
const tileLayer = isDarkMode ? 'dark-tiles' : 'light-tiles';
```
