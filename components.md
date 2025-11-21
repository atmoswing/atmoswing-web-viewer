# Components

## Files

- src/components/ErrorBoundary.jsx
- src/components/toolbar/ToolbarSquares.jsx
- src/components/toolbar/ToolbarCenter.jsx
- src/components/toolbar/ToolBar.jsx
- src/components/snackbars/SnackbarItem.jsx
- src/components/snackbars/AppSnackbars.jsx
- src/components/sidebar/SidebarWorkspaceDropdown.jsx
- src/components/sidebar/SideBar.jsx
- src/components/panels/index.js
- src/components/panels/PanelSynthesis.jsx
- src/components/panels/PanelStatus.jsx
- src/components/panels/PanelStations.jsx
- src/components/panels/PanelForecasts.jsx
- src/components/panels/PanelDisplay.jsx
- src/components/panels/PanelAnalogDates.jsx
- src/components/panels/Panel.jsx
- src/components/modals/index.js
- src/components/modals/TimeSeriesModal.jsx
- src/components/modals/DistributionsModal.jsx
- src/components/modals/DetailsAnalogsModal.jsx
- src/components/modals/common/plotConstants.js
- src/components/modals/common/exportUtils.js
- src/components/modals/common/MethodConfigSelector.jsx
- src/components/modals/common/ExportMenu.jsx
- src/components/modals/charts/TimeSeriesChart.jsx
- src/components/modals/charts/PrecipitationDistributionChart.jsx
- src/components/modals/charts/CriteriaDistributionChart.jsx
- src/components/map/mapConstants.js
- src/components/map/MapViewer.jsx
- src/components/map/MapTooltip.jsx
- src/components/map/MapLegend.jsx
- src/components/map/utils/olStyleUtils.js
- src/components/map/utils/olProjectionUtils.js
- src/components/map/utils/loadWmtsCapabilities.js
- src/components/map/utils/buildLegendStops.js
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
<dt><a href="#module_components/ErrorBoundary">components/ErrorBoundary</a></dt>
<dd><p>React error boundary component that catches JavaScript errors in the component tree.</p>
</dd>
<dt><a href="#module_components/toolbar/ToolbarSquares">components/toolbar/ToolbarSquares</a></dt>
<dd><p>Visual summary of daily and sub-daily synthesis values allowing target date selection.</p>
</dd>
<dt><a href="#module_components/toolbar/ToolbarCenter">components/toolbar/ToolbarCenter</a></dt>
<dd><p>Central toolbar controls for forecast date navigation, manual date selection and restoration.</p>
</dd>
<dt><a href="#module_components/toolbar/ToolBar">components/toolbar/ToolBar</a></dt>
<dd><p>Main application toolbar providing access to distribution and analog details modals and central navigation controls.</p>
</dd>
<dt><a href="#module_components/snackbars/SnackbarItem">components/snackbars/SnackbarItem</a></dt>
<dd><p>Wrapper around MUI Snackbar with configurable origin and auto-hide.</p>
</dd>
<dt><a href="#module_components/snackbars/AppSnackbars">components/snackbars/AppSnackbars</a></dt>
<dd><p>Global snackbar manager component rendering queued snackbars and workspace validity alerts.</p>
</dd>
<dt><a href="#module_components/sidebar/SidebarWorkspaceDropdown">components/sidebar/SidebarWorkspaceDropdown</a></dt>
<dd><p>Dropdown selector for choosing active workspace region.</p>
</dd>
<dt><a href="#module_components/sidebar/SideBar">components/sidebar/SideBar</a></dt>
<dd><p>Application sidebar containing workspace selector and forecast-related panels.</p>
</dd>
<dt><a href="#module_components/panels/index">components/panels/index</a></dt>
<dd><p>Barrel file re-exporting panel components for convenient imports.</p>
</dd>
<dt><a href="#module_components/panels/PanelSynthesis">components/panels/PanelSynthesis</a></dt>
<dd><p>Panel rendering normalized synthesis values per method across daily and sub-daily lead times.
Allows selecting target date and method; supports sub-daily segmentation when available.</p>
</dd>
<dt><a href="#module_components/panels/PanelStatus">components/panels/PanelStatus</a></dt>
<dd><p>Standardized status text renderer inside a Panel for loading/error/empty states.</p>
</dd>
<dt><a href="#module_components/panels/PanelStations">components/panels/PanelStations</a></dt>
<dd><p>Panel for selecting a forecast station/entity from the available entities list.</p>
</dd>
<dt><a href="#module_components/panels/PanelForecasts">components/panels/PanelForecasts</a></dt>
<dd><p>Panel for selecting forecast method and configuration using a tree view.</p>
</dd>
<dt><a href="#module_components/panels/PanelDisplay">components/panels/PanelDisplay</a></dt>
<dd><p>Panel for adjusting display parameters (percentile &amp; normalization reference).</p>
</dd>
<dt><a href="#module_components/panels/PanelAnalogDates">components/panels/PanelAnalogDates</a></dt>
<dd><p>Panel displaying ranked analog dates with criteria values for the selected method/config and lead time.</p>
</dd>
<dt><a href="#module_components/panels/Panel">components/panels/Panel</a></dt>
<dd><p>Collapsible panel component for sidebar sections.</p>
</dd>
<dt><a href="#module_components/modals/index">components/modals/index</a></dt>
<dd><p>Barrel file re-exporting modal components for convenient imports.</p>
</dd>
<dt><a href="#module_components/modals/TimeSeriesModal">components/modals/TimeSeriesModal</a></dt>
<dd><p>Modal displaying time series percentiles, best analogs, reference return periods and previous forecast histories.
Supports exporting charts (SVG/PNG/PDF) and dynamic configuration resolution for selected entity.</p>
</dd>
<dt><a href="#module_components/modals/DistributionsModal">components/modals/DistributionsModal</a></dt>
<dd><p>Modal displaying precipitation and criteria distributions for a selected method/config/entity/lead.
Provides percentile markers, reference return periods, best analog overlays and export options.</p>
</dd>
<dt><a href="#module_components/modals/DetailsAnalogsModal">components/modals/DetailsAnalogsModal</a></dt>
<dd><p>Modal presenting a detailed list of analogs for a selected method/config/entity/lead with criteria and precipitation values.</p>
</dd>
<dt><a href="#module_components/modals/common/plotConstants">components/modals/common/plotConstants</a></dt>
<dd><p>Shared constants and color palettes used by modal charts (time series &amp; distributions).</p>
</dd>
<dt><a href="#module_components/modals/common/exportUtils">components/modals/common/exportUtils</a></dt>
<dd><p>Utility helpers for exporting charts: safe filename generation, SVG style inlining, dimension extraction and temporary DOM mounting.</p>
</dd>
<dt><a href="#module_components/modals/common/MethodConfigSelector">components/modals/common/MethodConfigSelector</a></dt>
<dd><p>Shared modal selection component to pick method, configuration, entity and lead time.
Handles chained data fetching, validity maintenance and relevance highlighting.</p>
</dd>
<dt><a href="#module_components/modals/common/ExportMenu">components/modals/common/ExportMenu</a></dt>
<dd><p>Small dropdown menu component offering export options (PNG, SVG, PDF).</p>
</dd>
<dt><a href="#module_components/modals/charts/TimeSeriesChart">components/modals/charts/TimeSeriesChart</a></dt>
<dd><p>D3-based time series chart rendering percentile envelopes, best analog markers, return periods and forecast history overlays.</p>
</dd>
<dt><a href="#module_components/modals/charts/PrecipitationDistributionChart">components/modals/charts/PrecipitationDistributionChart</a></dt>
<dd><p>D3-based empirical cumulative distribution chart for precipitation analog values with optional overlays.</p>
</dd>
<dt><a href="#module_components/modals/charts/CriteriaDistributionChart">components/modals/charts/CriteriaDistributionChart</a></dt>
<dd><p>D3-based ordered criteria distribution chart with optional analog criteria fallback.</p>
</dd>
<dt><a href="#module_components/map/mapConstants">components/map/mapConstants</a></dt>
<dd><p>Centralized map-related constants for OpenLayers configuration.
Avoids magic numbers scattered throughout map components.</p>
</dd>
<dt><a href="#module_components/map/MapViewer">components/map/MapViewer</a></dt>
<dd><p>Main map viewer component using OpenLayers for forecast visualization.
Displays forecast points, supports entity selection, and manages map layers.</p>
</dd>
<dt><a href="#module_components/map/MapTooltip">components/map/MapTooltip</a></dt>
<dd><p>Floating tooltip overlay displaying entity name and raw value at pointer position.</p>
</dd>
<dt><a href="#module_components/map/MapLegend">components/map/MapLegend</a></dt>
<dd><p>Legend component rendering a horizontal gradient scale for normalized forecast values.</p>
</dd>
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

<a name="module_components/ErrorBoundary"></a>

## components/ErrorBoundary
React error boundary component that catches JavaScript errors in the component tree.


* [components/ErrorBoundary](#module_components/ErrorBoundary)
    * [.ErrorBoundary](#module_components/ErrorBoundary.ErrorBoundary) ⇐ <code>React.Component</code>
        * [new exports.ErrorBoundary(props)](#new_module_components/ErrorBoundary.ErrorBoundary_new)
        * _instance_
            * [.componentDidCatch(error, info)](#module_components/ErrorBoundary.ErrorBoundary+componentDidCatch)
        * _static_
            * [.getDerivedStateFromError(error)](#module_components/ErrorBoundary.ErrorBoundary.getDerivedStateFromError) ⇒ <code>Object</code>

<a name="module_components/ErrorBoundary.ErrorBoundary"></a>

### components/ErrorBoundary.ErrorBoundary ⇐ <code>React.Component</code>
Error boundary component that catches and handles React component errors.
Displays fallback UI and provides retry functionality.

**Kind**: static class of [<code>components/ErrorBoundary</code>](#module_components/ErrorBoundary)  
**Extends**: <code>React.Component</code>  

* [.ErrorBoundary](#module_components/ErrorBoundary.ErrorBoundary) ⇐ <code>React.Component</code>
    * [new exports.ErrorBoundary(props)](#new_module_components/ErrorBoundary.ErrorBoundary_new)
    * _instance_
        * [.componentDidCatch(error, info)](#module_components/ErrorBoundary.ErrorBoundary+componentDidCatch)
    * _static_
        * [.getDerivedStateFromError(error)](#module_components/ErrorBoundary.ErrorBoundary.getDerivedStateFromError) ⇒ <code>Object</code>

<a name="new_module_components/ErrorBoundary.ErrorBoundary_new"></a>

#### new exports.ErrorBoundary(props)

| Param | Type | Description |
| --- | --- | --- |
| props | <code>Object</code> | Component props |
| props.children | <code>React.ReactNode</code> | Child components to protect |
| [props.onError] | <code>function</code> | Optional error handler callback |
| [props.fallback] | <code>React.ReactNode</code> | Optional custom fallback UI |

**Example**  
```javascript
<ErrorBoundary>
  <MyComponent />
</ErrorBoundary>
```
<a name="module_components/ErrorBoundary.ErrorBoundary+componentDidCatch"></a>

#### errorBoundary.componentDidCatch(error, info)
Lifecycle method called after an error is caught.
Logs the error and calls the optional onError callback.

**Kind**: instance method of [<code>ErrorBoundary</code>](#module_components/ErrorBoundary.ErrorBoundary)  

| Param | Type | Description |
| --- | --- | --- |
| error | <code>Error</code> | The error that was thrown |
| info | <code>Object</code> | Error info with componentStack |

<a name="module_components/ErrorBoundary.ErrorBoundary.getDerivedStateFromError"></a>

#### ErrorBoundary.getDerivedStateFromError(error) ⇒ <code>Object</code>
Updates state when an error is caught.

**Kind**: static method of [<code>ErrorBoundary</code>](#module_components/ErrorBoundary.ErrorBoundary)  
**Returns**: <code>Object</code> - New state object  

| Param | Type | Description |
| --- | --- | --- |
| error | <code>Error</code> | The error that was thrown |

<a name="module_components/toolbar/ToolbarSquares"></a>

## components/toolbar/ToolbarSquares
Visual summary of daily and sub-daily synthesis values allowing target date selection.

<a name="module_components/toolbar/ToolbarCenter"></a>

## components/toolbar/ToolbarCenter
Central toolbar controls for forecast date navigation, manual date selection and restoration.

<a name="module_components/toolbar/ToolBar"></a>

## components/toolbar/ToolBar
Main application toolbar providing access to distribution and analog details modals and central navigation controls.

<a name="module_components/snackbars/SnackbarItem"></a>

## components/snackbars/SnackbarItem
Wrapper around MUI Snackbar with configurable origin and auto-hide.

<a name="module_components/snackbars/AppSnackbars"></a>

## components/snackbars/AppSnackbars
Global snackbar manager component rendering queued snackbars and workspace validity alerts.

<a name="module_components/sidebar/SidebarWorkspaceDropdown"></a>

## components/sidebar/SidebarWorkspaceDropdown
Dropdown selector for choosing active workspace region.

<a name="module_components/sidebar/SideBar"></a>

## components/sidebar/SideBar
Application sidebar containing workspace selector and forecast-related panels.

<a name="module_components/panels/index"></a>

## components/panels/index
Barrel file re-exporting panel components for convenient imports.

<a name="module_components/panels/PanelSynthesis"></a>

## components/panels/PanelSynthesis
Panel rendering normalized synthesis values per method across daily and sub-daily lead times.
Allows selecting target date and method; supports sub-daily segmentation when available.

<a name="module_components/panels/PanelStatus"></a>

## components/panels/PanelStatus
Standardized status text renderer inside a Panel for loading/error/empty states.

<a name="exp_module_components/panels/PanelStatus--module.exports"></a>

### module.exports(props) ⇒ <code>React.ReactElement</code> \| <code>null</code> ⏏
Renders a small status line based on loading/error/empty flags.
Priority order: loading > error > empty.
Returns null if none are true.

**Kind**: Exported function  
**Returns**: <code>React.ReactElement</code> \| <code>null</code> - Span element or null if no status  

| Param | Type | Description |
| --- | --- | --- |
| props | <code>Object</code> |  |
| [props.loading] | <code>boolean</code> | Whether the panel content is loading |
| [props.error] | <code>boolean</code> | Whether an error occurred |
| [props.empty] | <code>boolean</code> | Whether there is no data to show |
| [props.messages] | <code>Object</code> | Optional custom messages |
| [props.messages.loading] | <code>string</code> | Loading message override |
| [props.messages.error] | <code>string</code> | Error message override |
| [props.messages.empty] | <code>string</code> | Empty message override |

<a name="module_components/panels/PanelStations"></a>

## components/panels/PanelStations
Panel for selecting a forecast station/entity from the available entities list.

<a name="exp_module_components/panels/PanelStations--module.exports"></a>

### module.exports(props) ⇒ <code>React.ReactElement</code> ⏏
PanelStations component rendering a dropdown of entities with loading/error/empty states.

**Kind**: Exported function  

| Param | Type | Description |
| --- | --- | --- |
| props | <code>Object</code> |  |
| [props.defaultOpen] | <code>boolean</code> | Initial open state of panel |

<a name="module_components/panels/PanelForecasts"></a>

## components/panels/PanelForecasts
Panel for selecting forecast method and configuration using a tree view.

<a name="exp_module_components/panels/PanelForecasts--module.exports"></a>

### module.exports(props) ⇒ <code>React.ReactElement</code> ⏏
PanelForecasts component wrapping the method/config tree inside a collapsible panel.

**Kind**: Exported function  

| Param | Type | Description |
| --- | --- | --- |
| props | <code>Object</code> |  |
| [props.defaultOpen] | <code>boolean</code> | Initial open state for panel |

<a name="module_components/panels/PanelDisplay"></a>

## components/panels/PanelDisplay
Panel for adjusting display parameters (percentile & normalization reference).

<a name="exp_module_components/panels/PanelDisplay--module.exports"></a>

### module.exports(props) ⇒ <code>React.ReactElement</code> ⏏
PanelDisplay component rendering controls for percentile and normalization reference selection.

**Kind**: Exported function  

| Param | Type | Description |
| --- | --- | --- |
| props | <code>Object</code> |  |
| [props.defaultOpen] | <code>boolean</code> | Initial open state |

<a name="module_components/panels/PanelAnalogDates"></a>

## components/panels/PanelAnalogDates
Panel displaying ranked analog dates with criteria values for the selected method/config and lead time.

<a name="module_components/panels/Panel"></a>

## components/panels/Panel
Collapsible panel component for sidebar sections.

<a name="exp_module_components/panels/Panel--module.exports"></a>

### module.exports(props) ⇒ <code>React.ReactElement</code> ⏏
Collapsible panel with toggle header.

**Kind**: Exported function  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| props | <code>Object</code> |  |  |
| props.title | <code>string</code> |  | Panel title |
| props.children | <code>React.ReactNode</code> |  | Panel content |
| [props.defaultOpen] | <code>boolean</code> | <code>false</code> | Initial open state |

<a name="module_components/modals/index"></a>

## components/modals/index
Barrel file re-exporting modal components for convenient imports.

<a name="module_components/modals/TimeSeriesModal"></a>

## components/modals/TimeSeriesModal
Modal displaying time series percentiles, best analogs, reference return periods and previous forecast histories.
Supports exporting charts (SVG/PNG/PDF) and dynamic configuration resolution for selected entity.

<a name="module_components/modals/DistributionsModal"></a>

## components/modals/DistributionsModal
Modal displaying precipitation and criteria distributions for a selected method/config/entity/lead.
Provides percentile markers, reference return periods, best analog overlays and export options.

<a name="module_components/modals/DetailsAnalogsModal"></a>

## components/modals/DetailsAnalogsModal
Modal presenting a detailed list of analogs for a selected method/config/entity/lead with criteria and precipitation values.

<a name="module_components/modals/common/plotConstants"></a>

## components/modals/common/plotConstants
Shared constants and color palettes used by modal charts (time series & distributions).


* [components/modals/common/plotConstants](#module_components/modals/common/plotConstants)
    * [.DEFAULT_PCTS](#module_components/modals/common/plotConstants.DEFAULT_PCTS)
    * [.FULL_PCTS](#module_components/modals/common/plotConstants.FULL_PCTS)
    * [.SELECTED_RPS](#module_components/modals/common/plotConstants.SELECTED_RPS)
    * [.QUANTILE_COLORS](#module_components/modals/common/plotConstants.QUANTILE_COLORS)
    * [.TEN_YEAR_COLOR](#module_components/modals/common/plotConstants.TEN_YEAR_COLOR)
    * [.ANALOG_MARKER_COLOR](#module_components/modals/common/plotConstants.ANALOG_MARKER_COLOR)

<a name="module_components/modals/common/plotConstants.DEFAULT_PCTS"></a>

### components/modals/common/plotConstants.DEFAULT\_PCTS
Default percentile set (main quantiles).

**Kind**: static constant of [<code>components/modals/common/plotConstants</code>](#module_components/modals/common/plotConstants)  
<a name="module_components/modals/common/plotConstants.FULL_PCTS"></a>

### components/modals/common/plotConstants.FULL\_PCTS
Full percentile set for detailed view.

**Kind**: static constant of [<code>components/modals/common/plotConstants</code>](#module_components/modals/common/plotConstants)  
<a name="module_components/modals/common/plotConstants.SELECTED_RPS"></a>

### components/modals/common/plotConstants.SELECTED\_RPS
Selected return periods displayed when overlays enabled.

**Kind**: static constant of [<code>components/modals/common/plotConstants</code>](#module_components/modals/common/plotConstants)  
<a name="module_components/modals/common/plotConstants.QUANTILE_COLORS"></a>

### components/modals/common/plotConstants.QUANTILE\_COLORS
Quantile line colors mapping.

**Kind**: static constant of [<code>components/modals/common/plotConstants</code>](#module_components/modals/common/plotConstants)  
<a name="module_components/modals/common/plotConstants.TEN_YEAR_COLOR"></a>

### components/modals/common/plotConstants.TEN\_YEAR\_COLOR
Stroke color for ten-year return period overlay.

**Kind**: static constant of [<code>components/modals/common/plotConstants</code>](#module_components/modals/common/plotConstants)  
<a name="module_components/modals/common/plotConstants.ANALOG_MARKER_COLOR"></a>

### components/modals/common/plotConstants.ANALOG\_MARKER\_COLOR
Marker stroke color for best analog points.

**Kind**: static constant of [<code>components/modals/common/plotConstants</code>](#module_components/modals/common/plotConstants)  
<a name="module_components/modals/common/exportUtils"></a>

## components/modals/common/exportUtils
Utility helpers for exporting charts: safe filename generation, SVG style inlining, dimension extraction and temporary DOM mounting.


* [components/modals/common/exportUtils](#module_components/modals/common/exportUtils)
    * [.safeForFilename(s)](#module_components/modals/common/exportUtils.safeForFilename) ⇒ <code>string</code>
    * [.downloadBlob(blob, filename)](#module_components/modals/common/exportUtils.downloadBlob) ⇒ <code>void</code>
    * [.inlineAllStyles(svg)](#module_components/modals/common/exportUtils.inlineAllStyles) ⇒ <code>void</code>
    * [.getSVGSize(svg)](#module_components/modals/common/exportUtils.getSVGSize) ⇒ <code>Object</code>
    * [.withTemporaryContainer(node, cb)](#module_components/modals/common/exportUtils.withTemporaryContainer) ⇒ <code>\*</code>

<a name="module_components/modals/common/exportUtils.safeForFilename"></a>

### components/modals/common/exportUtils.safeForFilename(s) ⇒ <code>string</code>
Sanitize a string for safe use as a filename (drops/normalizes problematic characters)

**Kind**: static method of [<code>components/modals/common/exportUtils</code>](#module_components/modals/common/exportUtils)  
**Returns**: <code>string</code> - Sanitized filename-friendly string  

| Param | Type | Description |
| --- | --- | --- |
| s | <code>string</code> | Input string |

<a name="module_components/modals/common/exportUtils.downloadBlob"></a>

### components/modals/common/exportUtils.downloadBlob(blob, filename) ⇒ <code>void</code>
Trigger a download of a Blob with the given filename

**Kind**: static method of [<code>components/modals/common/exportUtils</code>](#module_components/modals/common/exportUtils)  

| Param | Type | Description |
| --- | --- | --- |
| blob | <code>Blob</code> | Data blob |
| filename | <code>string</code> | Filename to save |

<a name="module_components/modals/common/exportUtils.inlineAllStyles"></a>

### components/modals/common/exportUtils.inlineAllStyles(svg) ⇒ <code>void</code>
Inline computed style properties into all nodes of a given SVG element.
Helpful to preserve appearance when exporting SVG/PNG/PDF without external CSS.

**Kind**: static method of [<code>components/modals/common/exportUtils</code>](#module_components/modals/common/exportUtils)  

| Param | Type | Description |
| --- | --- | --- |
| svg | <code>SVGElement</code> | Root SVG element to inline styles into |

<a name="module_components/modals/common/exportUtils.getSVGSize"></a>

### components/modals/common/exportUtils.getSVGSize(svg) ⇒ <code>Object</code>
Determine pixel size of an SVG element using width/height or viewBox fallback.

**Kind**: static method of [<code>components/modals/common/exportUtils</code>](#module_components/modals/common/exportUtils)  
**Returns**: <code>Object</code> - Dimensions object  

| Param | Type | Description |
| --- | --- | --- |
| svg | <code>SVGElement</code> | SVG element |

<a name="module_components/modals/common/exportUtils.withTemporaryContainer"></a>

### components/modals/common/exportUtils.withTemporaryContainer(node, cb) ⇒ <code>\*</code>
Temporarily mount a node (e.g., cloned SVG) in a hidden container in the DOM
to allow layout/style computations, then run a callback and cleanup.

**Kind**: static method of [<code>components/modals/common/exportUtils</code>](#module_components/modals/common/exportUtils)  
**Returns**: <code>\*</code> - Return value of callback  

| Param | Type | Description |
| --- | --- | --- |
| node | <code>Node</code> | DOM node to mount temporarily |
| cb | <code>function</code> | Callback executed while node is mounted |

<a name="module_components/modals/common/MethodConfigSelector"></a>

## components/modals/common/MethodConfigSelector
Shared modal selection component to pick method, configuration, entity and lead time.
Handles chained data fetching, validity maintenance and relevance highlighting.


* [components/modals/common/MethodConfigSelector](#module_components/modals/common/MethodConfigSelector)
    * [module.exports(props)](#exp_module_components/modals/common/MethodConfigSelector--module.exports) ⇒ <code>React.ReactElement</code> ⏏
        * [.useModalSelectionData(cachePrefix, open, selection)](#module_components/modals/common/MethodConfigSelector--module.exports.useModalSelectionData) ⇒ <code>Object</code>

<a name="exp_module_components/modals/common/MethodConfigSelector--module.exports"></a>

### module.exports(props) ⇒ <code>React.ReactElement</code> ⏏
MethodConfigSelector component.

**Kind**: Exported function  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| props | <code>Object</code> |  |  |
| [props.cachePrefix] | <code>string</code> | <code>&quot;&#x27;modal_&#x27;&quot;</code> | Prefix for cache keys to avoid collisions across modals |
| props.open | <code>boolean</code> |  | Whether the parent modal is open (controls fetching enablement) |
| props.value | <code>Object</code> |  | Current selection state { methodId, configId, entityId, lead } |
| props.onChange | <code>function</code> |  | Callback receiving updated selection object |
| [props.children] | <code>React.ReactNode</code> |  | Optional extra controls rendered beneath standard selectors |

<a name="module_components/modals/common/MethodConfigSelector--module.exports.useModalSelectionData"></a>

#### module.exports.useModalSelectionData(cachePrefix, open, selection) ⇒ <code>Object</code>
Hook returning resolved selection data (with fallback config if none explicitly chosen).

**Kind**: static method of [<code>module.exports</code>](#exp_module_components/modals/common/MethodConfigSelector--module.exports)  
**Returns**: <code>Object</code> - Object with resolvedMethodId, resolvedConfigId, resolvedEntityId  

| Param | Type | Description |
| --- | --- | --- |
| cachePrefix | <code>string</code> | Cache key namespace prefix |
| open | <code>boolean</code> | Whether owning modal is open |
| selection | <code>Object</code> | Raw selection { methodId, configId, entityId } |

**Example**  
```javascript
const { resolvedMethodId, resolvedConfigId } = useModalSelectionData('dist_', open, selection);
```
<a name="module_components/modals/common/ExportMenu"></a>

## components/modals/common/ExportMenu
Small dropdown menu component offering export options (PNG, SVG, PDF).

<a name="module_components/modals/charts/TimeSeriesChart"></a>

## components/modals/charts/TimeSeriesChart
D3-based time series chart rendering percentile envelopes, best analog markers, return periods and forecast history overlays.

<a name="module_components/modals/charts/PrecipitationDistributionChart"></a>

## components/modals/charts/PrecipitationDistributionChart
D3-based empirical cumulative distribution chart for precipitation analog values with optional overlays.

<a name="module_components/modals/charts/CriteriaDistributionChart"></a>

## components/modals/charts/CriteriaDistributionChart
D3-based ordered criteria distribution chart with optional analog criteria fallback.

<a name="module_components/map/mapConstants"></a>

## components/map/mapConstants
Centralized map-related constants for OpenLayers configuration.
Avoids magic numbers scattered throughout map components.


* [components/map/mapConstants](#module_components/map/mapConstants)
    * [.DEFAULT_PROJECTION](#module_components/map/mapConstants.DEFAULT_PROJECTION)
    * [.WMTS_MATRIX_SET_DEFAULT](#module_components/map/mapConstants.WMTS_MATRIX_SET_DEFAULT)
    * [.FIT_PADDING](#module_components/map/mapConstants.FIT_PADDING)
    * [.LEGEND_SAMPLES](#module_components/map/mapConstants.LEGEND_SAMPLES)
    * [.FORECAST_POINT_RADIUS_RELEVANT](#module_components/map/mapConstants.FORECAST_POINT_RADIUS_RELEVANT)
    * [.FORECAST_POINT_RADIUS_NORMAL](#module_components/map/mapConstants.FORECAST_POINT_RADIUS_NORMAL)
    * [.FORECAST_POINT_STROKE_WIDTH](#module_components/map/mapConstants.FORECAST_POINT_STROKE_WIDTH)
    * [.FORECAST_POINT_STROKE_COLOR_RELEVANT](#module_components/map/mapConstants.FORECAST_POINT_STROKE_COLOR_RELEVANT)
    * [.FORECAST_POINT_STROKE_COLOR_DIM](#module_components/map/mapConstants.FORECAST_POINT_STROKE_COLOR_DIM)
    * [.FORECAST_POINT_OPACITY_RELEVANT](#module_components/map/mapConstants.FORECAST_POINT_OPACITY_RELEVANT)
    * [.FORECAST_POINT_OPACITY_DIM](#module_components/map/mapConstants.FORECAST_POINT_OPACITY_DIM)
    * [.OVERLAY_LINE_COLOR](#module_components/map/mapConstants.OVERLAY_LINE_COLOR)
    * [.OVERLAY_STROKE_WIDTH](#module_components/map/mapConstants.OVERLAY_STROKE_WIDTH)
    * [.OVERLAY_POLYGON_FILL](#module_components/map/mapConstants.OVERLAY_POLYGON_FILL)
    * [.OVERLAY_POINT_RADIUS](#module_components/map/mapConstants.OVERLAY_POINT_RADIUS)
    * [.OVERLAY_POINT_STROKE_COLOR](#module_components/map/mapConstants.OVERLAY_POINT_STROKE_COLOR)
    * [.OVERLAY_POINT_STROKE_WIDTH](#module_components/map/mapConstants.OVERLAY_POINT_STROKE_WIDTH)
    * [.OVERLAY_POINT_FILL](#module_components/map/mapConstants.OVERLAY_POINT_FILL)

<a name="module_components/map/mapConstants.DEFAULT_PROJECTION"></a>

### components/map/mapConstants.DEFAULT\_PROJECTION
Default map projection (Web Mercator). @constant {string}

**Kind**: static constant of [<code>components/map/mapConstants</code>](#module_components/map/mapConstants)  
<a name="module_components/map/mapConstants.WMTS_MATRIX_SET_DEFAULT"></a>

### components/map/mapConstants.WMTS\_MATRIX\_SET\_DEFAULT
Default WMTS matrix set identifier. @constant {string}

**Kind**: static constant of [<code>components/map/mapConstants</code>](#module_components/map/mapConstants)  
<a name="module_components/map/mapConstants.FIT_PADDING"></a>

### components/map/mapConstants.FIT\_PADDING
Padding for map extent fitting [top, right, bottom, left] in pixels. @constant {Array<number>}

**Kind**: static constant of [<code>components/map/mapConstants</code>](#module_components/map/mapConstants)  
<a name="module_components/map/mapConstants.LEGEND_SAMPLES"></a>

### components/map/mapConstants.LEGEND\_SAMPLES
Number of color gradient samples for legend generation. @constant {number}

**Kind**: static constant of [<code>components/map/mapConstants</code>](#module_components/map/mapConstants)  
<a name="module_components/map/mapConstants.FORECAST_POINT_RADIUS_RELEVANT"></a>

### components/map/mapConstants.FORECAST\_POINT\_RADIUS\_RELEVANT
Radius for relevant/highlighted forecast points (pixels). @constant {number}

**Kind**: static constant of [<code>components/map/mapConstants</code>](#module_components/map/mapConstants)  
<a name="module_components/map/mapConstants.FORECAST_POINT_RADIUS_NORMAL"></a>

### components/map/mapConstants.FORECAST\_POINT\_RADIUS\_NORMAL
Radius for normal forecast points (pixels). @constant {number}

**Kind**: static constant of [<code>components/map/mapConstants</code>](#module_components/map/mapConstants)  
<a name="module_components/map/mapConstants.FORECAST_POINT_STROKE_WIDTH"></a>

### components/map/mapConstants.FORECAST\_POINT\_STROKE\_WIDTH
Stroke width for forecast point borders (pixels). @constant {number}

**Kind**: static constant of [<code>components/map/mapConstants</code>](#module_components/map/mapConstants)  
<a name="module_components/map/mapConstants.FORECAST_POINT_STROKE_COLOR_RELEVANT"></a>

### components/map/mapConstants.FORECAST\_POINT\_STROKE\_COLOR\_RELEVANT
Stroke color for relevant forecast points. @constant {string}

**Kind**: static constant of [<code>components/map/mapConstants</code>](#module_components/map/mapConstants)  
<a name="module_components/map/mapConstants.FORECAST_POINT_STROKE_COLOR_DIM"></a>

### components/map/mapConstants.FORECAST\_POINT\_STROKE\_COLOR\_DIM
Stroke color for dimmed forecast points. @constant {string}

**Kind**: static constant of [<code>components/map/mapConstants</code>](#module_components/map/mapConstants)  
<a name="module_components/map/mapConstants.FORECAST_POINT_OPACITY_RELEVANT"></a>

### components/map/mapConstants.FORECAST\_POINT\_OPACITY\_RELEVANT
Opacity for relevant forecast points. @constant {number}

**Kind**: static constant of [<code>components/map/mapConstants</code>](#module_components/map/mapConstants)  
<a name="module_components/map/mapConstants.FORECAST_POINT_OPACITY_DIM"></a>

### components/map/mapConstants.FORECAST\_POINT\_OPACITY\_DIM
Opacity for dimmed forecast points. @constant {number}

**Kind**: static constant of [<code>components/map/mapConstants</code>](#module_components/map/mapConstants)  
<a name="module_components/map/mapConstants.OVERLAY_LINE_COLOR"></a>

### components/map/mapConstants.OVERLAY\_LINE\_COLOR
Default line color for overlay layers. @constant {string}

**Kind**: static constant of [<code>components/map/mapConstants</code>](#module_components/map/mapConstants)  
<a name="module_components/map/mapConstants.OVERLAY_STROKE_WIDTH"></a>

### components/map/mapConstants.OVERLAY\_STROKE\_WIDTH
Default stroke width for overlay features (pixels). @constant {number}

**Kind**: static constant of [<code>components/map/mapConstants</code>](#module_components/map/mapConstants)  
<a name="module_components/map/mapConstants.OVERLAY_POLYGON_FILL"></a>

### components/map/mapConstants.OVERLAY\_POLYGON\_FILL
Default fill color for overlay polygons. @constant {string}

**Kind**: static constant of [<code>components/map/mapConstants</code>](#module_components/map/mapConstants)  
<a name="module_components/map/mapConstants.OVERLAY_POINT_RADIUS"></a>

### components/map/mapConstants.OVERLAY\_POINT\_RADIUS
Default radius for overlay points (pixels). @constant {number}

**Kind**: static constant of [<code>components/map/mapConstants</code>](#module_components/map/mapConstants)  
<a name="module_components/map/mapConstants.OVERLAY_POINT_STROKE_COLOR"></a>

### components/map/mapConstants.OVERLAY\_POINT\_STROKE\_COLOR
Default stroke color for overlay points. @constant {string}

**Kind**: static constant of [<code>components/map/mapConstants</code>](#module_components/map/mapConstants)  
<a name="module_components/map/mapConstants.OVERLAY_POINT_STROKE_WIDTH"></a>

### components/map/mapConstants.OVERLAY\_POINT\_STROKE\_WIDTH
Default stroke width for overlay points (pixels). @constant {number}

**Kind**: static constant of [<code>components/map/mapConstants</code>](#module_components/map/mapConstants)  
<a name="module_components/map/mapConstants.OVERLAY_POINT_FILL"></a>

### components/map/mapConstants.OVERLAY\_POINT\_FILL
Default fill color for overlay points. @constant {string}

**Kind**: static constant of [<code>components/map/mapConstants</code>](#module_components/map/mapConstants)  
<a name="module_components/map/MapViewer"></a>

## components/map/MapViewer
Main map viewer component using OpenLayers for forecast visualization.
Displays forecast points, supports entity selection, and manages map layers.

<a name="module_components/map/MapTooltip"></a>

## components/map/MapTooltip
Floating tooltip overlay displaying entity name and raw value at pointer position.

<a name="module_components/map/MapLegend"></a>

## components/map/MapLegend
Legend component rendering a horizontal gradient scale for normalized forecast values.

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
