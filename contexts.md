# Contexts

## Files

- src/contexts/WorkspaceContext.jsx
- src/contexts/SynthesisContext.jsx
- src/contexts/SnackbarContext.jsx
- src/contexts/SelectedEntityContext.jsx
- src/contexts/MethodsContext.jsx
- src/contexts/ForecastsContext.jsx
- src/contexts/ForecastValuesContext.jsx
- src/contexts/ForecastSessionContext.jsx
- src/contexts/EntitiesContext.jsx
- src/contexts/ConfigContext.jsx

---

## Modules

<dl>
<dt><a href="#module_contexts/WorkspaceContext">contexts/WorkspaceContext</a></dt>
<dd><p>React context for managing workspace (region) selection and associated forecast data.
Handles workspace selection, URL synchronization, and workspace-specific data loading.</p>
</dd>
<dt><a href="#module_contexts/SynthesisContext">contexts/SynthesisContext</a></dt>
<dd><p>Provides lead time arrays (daily &amp; sub-daily), target date selection and per-method synthesis data.
Parses total synthesis responses to derive lead resolution structure.</p>
</dd>
<dt><a href="#module_contexts/SnackbarContext">contexts/SnackbarContext</a></dt>
<dd><p>React context for managing application-wide notification snackbars.
Provides a queue-based system for displaying temporary messages to users.</p>
</dd>
<dt><a href="#module_contexts/SelectedEntityContext">contexts/SelectedEntityContext</a></dt>
<dd><p>React context for managing the currently selected forecast entity (station/point).
Automatically resets selection when workspace changes.</p>
</dd>
<dt><a href="#module_contexts/MethodsContext">contexts/MethodsContext</a></dt>
<dd><p>React context for managing forecast methods and configurations.
Fetches available methods, manages selection, and provides normalized method tree.</p>
</dd>
<dt><a href="#module_contexts/ForecastsContext">contexts/ForecastsContext</a></dt>
<dd><p>Composite provider combining all forecast-related contexts.
Re-exports convenient hooks for accessing forecast functionality.</p>
</dd>
<dt><a href="#module_contexts/ForecastValuesContext">contexts/ForecastValuesContext</a></dt>
<dd><p>Fetches and exposes forecast values (normalized + raw) for entities based on current selection.
Handles lead time resolution, availability detection, and percentile/normalization parameters.</p>
</dd>
<dt><a href="#module_contexts/ForecastSessionContext">contexts/ForecastSessionContext</a></dt>
<dd><p>Manages the active forecast date, base date, percentile/normalization parameters and shifting logic.
Provides helper functions to restore last available forecast and shift base date by hour increments.</p>
</dd>
<dt><a href="#module_contexts/EntitiesContext">contexts/EntitiesContext</a></dt>
<dd><p>Manages fetching and caching of forecast entities (stations/points) and relevant subsets.
Handles automatic clearing on workspace or configuration changes and derives cache keys.</p>
</dd>
<dt><a href="#module_contexts/ConfigContext">contexts/ConfigContext</a></dt>
<dd><p>React context for managing runtime configuration.</p>
<p>This context fetches <code>/config.json</code> at startup and makes configuration
values available throughout the application via the useConfig hook.</p>
</dd>
</dl>

<a name="module_contexts/WorkspaceContext"></a>

## contexts/WorkspaceContext
React context for managing workspace (region) selection and associated forecast data.
Handles workspace selection, URL synchronization, and workspace-specific data loading.


* [contexts/WorkspaceContext](#module_contexts/WorkspaceContext)
    * [.WorkspaceProvider(props)](#module_contexts/WorkspaceContext.WorkspaceProvider) ⇒ <code>React.ReactElement</code>
    * [.useWorkspace()](#module_contexts/WorkspaceContext.useWorkspace) ⇒ <code>Object</code> \| <code>string</code> \| <code>function</code> \| <code>Object</code> \| <code>boolean</code> \| <code>Error</code> \| <code>string</code>

<a name="module_contexts/WorkspaceContext.WorkspaceProvider"></a>

### contexts/WorkspaceContext.WorkspaceProvider(props) ⇒ <code>React.ReactElement</code>
Provider component for workspace management.
Manages workspace selection, URL synchronization, and workspace-specific data loading.

**Kind**: static method of [<code>contexts/WorkspaceContext</code>](#module_contexts/WorkspaceContext)  

| Param | Type | Description |
| --- | --- | --- |
| props | <code>Object</code> | Component props |
| props.children | <code>React.ReactNode</code> | Child components |

<a name="module_contexts/WorkspaceContext.useWorkspace"></a>

### contexts/WorkspaceContext.useWorkspace() ⇒ <code>Object</code> \| <code>string</code> \| <code>function</code> \| <code>Object</code> \| <code>boolean</code> \| <code>Error</code> \| <code>string</code>
Hook to access workspace context.

**Kind**: static method of [<code>contexts/WorkspaceContext</code>](#module_contexts/WorkspaceContext)  
**Returns**: <code>Object</code> - Workspace context value<code>string</code> - returns.workspace - Current workspace key<code>function</code> - returns.setWorkspace - Function to change workspace<code>Object</code> - returns.workspaceData - Workspace data including last forecast date<code>boolean</code> - returns.loading - Loading state<code>Error</code> - returns.error - Error if loading failed<code>string</code> - returns.invalidWorkspaceKey - Invalid workspace key from URL (if any)  
**Example**  
```javascript
const { workspace, setWorkspace, workspaceData } = useWorkspace();
console.log('Current workspace:', workspace);
setWorkspace('newWorkspace');
```
<a name="module_contexts/SynthesisContext"></a>

## contexts/SynthesisContext
Provides lead time arrays (daily & sub-daily), target date selection and per-method synthesis data.
Parses total synthesis responses to derive lead resolution structure.

<a name="module_contexts/SynthesisContext.useSynthesis"></a>

### contexts/SynthesisContext.useSynthesis ⇒ <code>Object</code> \| <code>Array</code> \| <code>Array</code> \| <code>string</code> \| <code>number</code> \| <code>Date</code> \| <code>null</code> \| <code>function</code> \| <code>Array</code> \| <code>boolean</code> \| <code>Error</code> \| <code>null</code>
Hook to access synthesis context.

**Kind**: static constant of [<code>contexts/SynthesisContext</code>](#module_contexts/SynthesisContext)  
**Returns**: <code>Object</code> - Synthesis state and helpers<code>Array</code> - returns.dailyLeads - Array of daily lead records<code>Array</code> - returns.subDailyLeads - Array of sub-daily lead records<code>string</code> - returns.leadResolution - 'daily' or 'sub'<code>number</code> - returns.selectedLead - Selected lead index<code>Date</code> \| <code>null</code> - returns.selectedTargetDate - Selected target date object<code>function</code> - returns.selectTargetDate - Helper to select target date with preference<code>Array</code> - returns.perMethodSynthesis - Baseline per-method normalized synthesis values<code>boolean</code> - returns.perMethodSynthesisLoading - Loading state for per-method data<code>Error</code> \| <code>null</code> - returns.perMethodSynthesisError - Error for per-method data  
<a name="module_contexts/SnackbarContext"></a>

## contexts/SnackbarContext
React context for managing application-wide notification snackbars.
Provides a queue-based system for displaying temporary messages to users.


* [contexts/SnackbarContext](#module_contexts/SnackbarContext)
    * [.useSnackbar](#module_contexts/SnackbarContext.useSnackbar) ⇒ <code>Object</code> \| <code>function</code> \| <code>function</code> \| <code>function</code> \| <code>Array</code>
    * [.SnackbarProvider](#module_contexts/SnackbarContext.SnackbarProvider) ⇒ <code>React.ReactElement</code>

<a name="module_contexts/SnackbarContext.useSnackbar"></a>

### contexts/SnackbarContext.useSnackbar ⇒ <code>Object</code> \| <code>function</code> \| <code>function</code> \| <code>function</code> \| <code>Array</code>
Hook to access snackbar functionality.
Must be used within a SnackbarProvider.

**Kind**: static constant of [<code>contexts/SnackbarContext</code>](#module_contexts/SnackbarContext)  
**Returns**: <code>Object</code> - Snackbar context value<code>function</code> - returns.enqueueSnackbar - Add a new snackbar<code>function</code> - returns.closeSnackbar - Close a snackbar<code>function</code> - returns.removeSnackbar - Remove a snackbar<code>Array</code> - returns.snackbars - Array of active snackbars  
**Throws**:

- <code>Error</code> If used outside SnackbarProvider

**Example**  
```javascript
const { enqueueSnackbar } = useSnackbar();
enqueueSnackbar('Success!', { variant: 'success' });
```
<a name="module_contexts/SnackbarContext.SnackbarProvider"></a>

### contexts/SnackbarContext.SnackbarProvider ⇒ <code>React.ReactElement</code>
Provider component for snackbar notifications.
Manages a queue of snackbar messages and provides methods to add, close, and remove them.

**Kind**: static constant of [<code>contexts/SnackbarContext</code>](#module_contexts/SnackbarContext)  

| Param | Type | Description |
| --- | --- | --- |
| props | <code>Object</code> | Component props |
| props.children | <code>React.ReactNode</code> | Child components |

**Example**  
```javascript
<SnackbarProvider>
  <App />
</SnackbarProvider>
```
<a name="module_contexts/SelectedEntityContext"></a>

## contexts/SelectedEntityContext
React context for managing the currently selected forecast entity (station/point).
Automatically resets selection when workspace changes.


* [contexts/SelectedEntityContext](#module_contexts/SelectedEntityContext)
    * [.useSelectedEntity](#module_contexts/SelectedEntityContext.useSelectedEntity) ⇒ <code>Object</code> \| <code>string</code> \| <code>number</code> \| <code>null</code> \| <code>function</code>
    * [.SelectedEntityProvider(props)](#module_contexts/SelectedEntityContext.SelectedEntityProvider) ⇒ <code>React.ReactElement</code>

<a name="module_contexts/SelectedEntityContext.useSelectedEntity"></a>

### contexts/SelectedEntityContext.useSelectedEntity ⇒ <code>Object</code> \| <code>string</code> \| <code>number</code> \| <code>null</code> \| <code>function</code>
Hook to access the selected entity context.

**Kind**: static constant of [<code>contexts/SelectedEntityContext</code>](#module_contexts/SelectedEntityContext)  
**Returns**: <code>Object</code> - Selected entity context value<code>string</code> \| <code>number</code> \| <code>null</code> - returns.selectedEntityId - Currently selected entity ID, or null<code>function</code> - returns.setSelectedEntityId - Function to set the selected entity ID  
**Example**  
```javascript
const { selectedEntityId, setSelectedEntityId } = useSelectedEntity();
setSelectedEntityId(123); // Select entity with ID 123
console.log(selectedEntityId); // Logs: 123
```
<a name="module_contexts/SelectedEntityContext.SelectedEntityProvider"></a>

### contexts/SelectedEntityContext.SelectedEntityProvider(props) ⇒ <code>React.ReactElement</code>
Provider component for selected entity state management.
Tracks which forecast entity is currently selected and resets on workspace change.

**Kind**: static method of [<code>contexts/SelectedEntityContext</code>](#module_contexts/SelectedEntityContext)  

| Param | Type | Description |
| --- | --- | --- |
| props | <code>Object</code> | Component props |
| props.children | <code>React.ReactNode</code> | Child components |

<a name="module_contexts/MethodsContext"></a>

## contexts/MethodsContext
React context for managing forecast methods and configurations.
Fetches available methods, manages selection, and provides normalized method tree.


* [contexts/MethodsContext](#module_contexts/MethodsContext)
    * [.useMethods](#module_contexts/MethodsContext.useMethods) ⇒ <code>Object</code> \| <code>Array</code> \| <code>boolean</code> \| <code>Error</code> \| <code>Object</code> \| <code>function</code>
    * [.MethodsProvider(props)](#module_contexts/MethodsContext.MethodsProvider) ⇒ <code>React.ReactElement</code>

<a name="module_contexts/MethodsContext.useMethods"></a>

### contexts/MethodsContext.useMethods ⇒ <code>Object</code> \| <code>Array</code> \| <code>boolean</code> \| <code>Error</code> \| <code>Object</code> \| <code>function</code>
Hook to access methods context.

**Kind**: static constant of [<code>contexts/MethodsContext</code>](#module_contexts/MethodsContext)  
**Returns**: <code>Object</code> - Methods context value<code>Array</code> - returns.methodConfigTree - Normalized tree of methods with nested configs<code>boolean</code> - returns.methodsLoading - Loading state for methods fetch<code>Error</code> - returns.methodsError - Error if methods fetch failed<code>Object</code> - returns.selectedMethodConfig - Currently selected method and config<code>function</code> - returns.setSelectedMethodConfig - Function to set method/config selection  
**Example**  
```javascript
const { methodConfigTree, selectedMethodConfig, setSelectedMethodConfig } = useMethods();
// Select first method
setSelectedMethodConfig({ method: methodConfigTree[0], config: null });
```
<a name="module_contexts/MethodsContext.MethodsProvider"></a>

### contexts/MethodsContext.MethodsProvider(props) ⇒ <code>React.ReactElement</code>
Provider component for forecast methods and configurations.
Manages method selection with workspace scoping and auto-selection.

**Kind**: static method of [<code>contexts/MethodsContext</code>](#module_contexts/MethodsContext)  

| Param | Type | Description |
| --- | --- | --- |
| props | <code>Object</code> | Component props |
| props.children | <code>React.ReactNode</code> | Child components |

<a name="module_contexts/ForecastsContext"></a>

## contexts/ForecastsContext
Composite provider combining all forecast-related contexts.
Re-exports convenient hooks for accessing forecast functionality.


* [contexts/ForecastsContext](#module_contexts/ForecastsContext)
    * [.useMethods](#module_contexts/ForecastsContext.useMethods) ⇒ <code>Object</code>
    * [.useEntities](#module_contexts/ForecastsContext.useEntities) ⇒ <code>Object</code>
    * [.useSynthesis](#module_contexts/ForecastsContext.useSynthesis) ⇒ <code>Object</code>
    * [.useForecastValues](#module_contexts/ForecastsContext.useForecastValues) ⇒ <code>Object</code>
    * [.useForecastParameters](#module_contexts/ForecastsContext.useForecastParameters) ⇒ <code>Object</code> \| <code>number</code> \| <code>function</code> \| <code>string</code> \| <code>function</code>
    * [.useSelectedEntity](#module_contexts/ForecastsContext.useSelectedEntity) ⇒ <code>Object</code>
    * [.ForecastsProvider(props)](#module_contexts/ForecastsContext.ForecastsProvider) ⇒ <code>React.ReactElement</code>

<a name="module_contexts/ForecastsContext.useMethods"></a>

### contexts/ForecastsContext.useMethods ⇒ <code>Object</code>
Hook to access methods context. Re-export from MethodsContext.

**Kind**: static constant of [<code>contexts/ForecastsContext</code>](#module_contexts/ForecastsContext)  
**Returns**: <code>Object</code> - Methods context value  
<a name="module_contexts/ForecastsContext.useEntities"></a>

### contexts/ForecastsContext.useEntities ⇒ <code>Object</code>
Hook to access entities context. Re-export from EntitiesContext.

**Kind**: static constant of [<code>contexts/ForecastsContext</code>](#module_contexts/ForecastsContext)  
**Returns**: <code>Object</code> - Entities context value  
<a name="module_contexts/ForecastsContext.useSynthesis"></a>

### contexts/ForecastsContext.useSynthesis ⇒ <code>Object</code>
Hook to access synthesis context. Re-export from SynthesisContext.

**Kind**: static constant of [<code>contexts/ForecastsContext</code>](#module_contexts/ForecastsContext)  
**Returns**: <code>Object</code> - Synthesis context value  
<a name="module_contexts/ForecastsContext.useForecastValues"></a>

### contexts/ForecastsContext.useForecastValues ⇒ <code>Object</code>
Hook to access forecast values context. Re-export from ForecastValuesContext.

**Kind**: static constant of [<code>contexts/ForecastsContext</code>](#module_contexts/ForecastsContext)  
**Returns**: <code>Object</code> - Forecast values context value  
<a name="module_contexts/ForecastsContext.useForecastParameters"></a>

### contexts/ForecastsContext.useForecastParameters ⇒ <code>Object</code> \| <code>number</code> \| <code>function</code> \| <code>string</code> \| <code>function</code>
Hook to access forecast parameters (percentile and normalization).

**Kind**: static constant of [<code>contexts/ForecastsContext</code>](#module_contexts/ForecastsContext)  
**Returns**: <code>Object</code> - Forecast parameters<code>number</code> - returns.percentile - Current percentile value<code>function</code> - returns.setPercentile - Set percentile<code>string</code> - returns.normalizationRef - Normalization reference<code>function</code> - returns.setNormalizationRef - Set normalization reference  
<a name="module_contexts/ForecastsContext.useSelectedEntity"></a>

### contexts/ForecastsContext.useSelectedEntity ⇒ <code>Object</code>
Hook to access selected entity context. Re-export from SelectedEntityContext.

**Kind**: static constant of [<code>contexts/ForecastsContext</code>](#module_contexts/ForecastsContext)  
**Returns**: <code>Object</code> - Selected entity context value  
<a name="module_contexts/ForecastsContext.ForecastsProvider"></a>

### contexts/ForecastsContext.ForecastsProvider(props) ⇒ <code>React.ReactElement</code>
Composite provider wrapping all forecast-related contexts.

**Kind**: static method of [<code>contexts/ForecastsContext</code>](#module_contexts/ForecastsContext)  

| Param | Type |
| --- | --- |
| props | <code>Object</code> | 
| props.children | <code>React.ReactNode</code> | 

<a name="module_contexts/ForecastValuesContext"></a>

## contexts/ForecastValuesContext
Fetches and exposes forecast values (normalized + raw) for entities based on current selection.
Handles lead time resolution, availability detection, and percentile/normalization parameters.


* [contexts/ForecastValuesContext](#module_contexts/ForecastValuesContext)
    * [.useForecastValues](#module_contexts/ForecastValuesContext.useForecastValues) ⇒ <code>Object</code> \| <code>Object</code> \| <code>Object</code> \| <code>boolean</code> \| <code>Error</code> \| <code>null</code> \| <code>boolean</code>
    * [.ForecastValuesProvider(props)](#module_contexts/ForecastValuesContext.ForecastValuesProvider) ⇒ <code>React.ReactElement</code>

<a name="module_contexts/ForecastValuesContext.useForecastValues"></a>

### contexts/ForecastValuesContext.useForecastValues ⇒ <code>Object</code> \| <code>Object</code> \| <code>Object</code> \| <code>boolean</code> \| <code>Error</code> \| <code>null</code> \| <code>boolean</code>
Hook to access forecast values context.

**Kind**: static constant of [<code>contexts/ForecastValuesContext</code>](#module_contexts/ForecastValuesContext)  
**Returns**: <code>Object</code> - Forecast values state<code>Object</code> - returns.forecastValues - Map entityId -> raw forecast value<code>Object</code> - returns.forecastValuesNorm - Map entityId -> normalized forecast value<code>boolean</code> - returns.forecastLoading - Loading state<code>Error</code> \| <code>null</code> - returns.forecastError - Error during fetch<code>boolean</code> - returns.forecastUnavailable - Flag when data deemed unavailable (e.g., no leads)  
<a name="module_contexts/ForecastValuesContext.ForecastValuesProvider"></a>

### contexts/ForecastValuesContext.ForecastValuesProvider(props) ⇒ <code>React.ReactElement</code>
ForecastValuesProvider component.

**Kind**: static method of [<code>contexts/ForecastValuesContext</code>](#module_contexts/ForecastValuesContext)  

| Param | Type |
| --- | --- |
| props | <code>Object</code> | 
| props.children | <code>React.ReactNode</code> | 

<a name="module_contexts/ForecastSessionContext"></a>

## contexts/ForecastSessionContext
Manages the active forecast date, base date, percentile/normalization parameters and shifting logic.
Provides helper functions to restore last available forecast and shift base date by hour increments.


* [contexts/ForecastSessionContext](#module_contexts/ForecastSessionContext)
    * [.useForecastSession](#module_contexts/ForecastSessionContext.useForecastSession) ⇒ <code>Object</code> \| <code>string</code> \| <code>null</code> \| <code>Date</code> \| <code>null</code> \| <code>number</code> \| <code>function</code> \| <code>number</code> \| <code>string</code> \| <code>function</code> \| <code>function</code> \| <code>function</code> \| <code>boolean</code> \| <code>boolean</code> \| <code>number</code>
    * [.ForecastSessionProvider(props)](#module_contexts/ForecastSessionContext.ForecastSessionProvider) ⇒ <code>React.ReactElement</code>

<a name="module_contexts/ForecastSessionContext.useForecastSession"></a>

### contexts/ForecastSessionContext.useForecastSession ⇒ <code>Object</code> \| <code>string</code> \| <code>null</code> \| <code>Date</code> \| <code>null</code> \| <code>number</code> \| <code>function</code> \| <code>number</code> \| <code>string</code> \| <code>function</code> \| <code>function</code> \| <code>function</code> \| <code>boolean</code> \| <code>boolean</code> \| <code>number</code>
Hook to access forecast session context.

**Kind**: static constant of [<code>contexts/ForecastSessionContext</code>](#module_contexts/ForecastSessionContext)  
**Returns**: <code>Object</code> - Forecast session state and helpers<code>string</code> \| <code>null</code> - returns.activeForecastDate - Raw active forecast date string<code>Date</code> \| <code>null</code> - returns.forecastBaseDate - Parsed base date object<code>number</code> - returns.percentile - Selected percentile (e.g., 90)<code>function</code> - returns.setPercentile - Setter for percentile<code>number</code> \| <code>string</code> - returns.normalizationRef - Normalization reference value<code>function</code> - returns.setNormalizationRef - Setter for normalization reference<code>function</code> - returns.shiftForecastBaseDate - Shift search function for base date<code>function</code> - returns.restoreLastAvailableForecast - Restore last workspace forecast<code>boolean</code> - returns.baseDateSearchFailed - Flag when shift search fails<code>boolean</code> - returns.baseDateSearching - Whether shift search is in progress<code>number</code> - returns.resetVersion - Incrementing version to trigger dependent resets  
<a name="module_contexts/ForecastSessionContext.ForecastSessionProvider"></a>

### contexts/ForecastSessionContext.ForecastSessionProvider(props) ⇒ <code>React.ReactElement</code>
ForecastSessionProvider component.
Initializes forecast session state from workspace data and exposes shifting & restore helpers.

**Kind**: static method of [<code>contexts/ForecastSessionContext</code>](#module_contexts/ForecastSessionContext)  

| Param | Type |
| --- | --- |
| props | <code>Object</code> | 
| props.children | <code>React.ReactNode</code> | 

<a name="module_contexts/EntitiesContext"></a>

## contexts/EntitiesContext
Manages fetching and caching of forecast entities (stations/points) and relevant subsets.
Handles automatic clearing on workspace or configuration changes and derives cache keys.


* [contexts/EntitiesContext](#module_contexts/EntitiesContext)
    * [.useEntities](#module_contexts/EntitiesContext.useEntities) ⇒ <code>Object</code> \| <code>Array</code> \| <code>boolean</code> \| <code>Error</code> \| <code>null</code> \| <code>Set.&lt;(string\|number)&gt;</code> \| <code>null</code> \| <code>string</code> \| <code>string</code> \| <code>null</code>
    * [.EntitiesProvider(props)](#module_contexts/EntitiesContext.EntitiesProvider) ⇒ <code>React.ReactElement</code>

<a name="module_contexts/EntitiesContext.useEntities"></a>

### contexts/EntitiesContext.useEntities ⇒ <code>Object</code> \| <code>Array</code> \| <code>boolean</code> \| <code>Error</code> \| <code>null</code> \| <code>Set.&lt;(string\|number)&gt;</code> \| <code>null</code> \| <code>string</code> \| <code>string</code> \| <code>null</code>
Hook to access entities context.

**Kind**: static constant of [<code>contexts/EntitiesContext</code>](#module_contexts/EntitiesContext)  
**Returns**: <code>Object</code> - Entities context value<code>Array</code> - returns.entities - Array of entity objects<code>boolean</code> - returns.entitiesLoading - Loading state<code>Error</code> \| <code>null</code> - returns.entitiesError - Error during entity fetch<code>Set.&lt;(string\|number)&gt;</code> \| <code>null</code> - returns.relevantEntities - Set of relevant entity IDs or null<code>string</code> - returns.entitiesWorkspace - Workspace key used for entities<code>string</code> \| <code>null</code> - returns.entitiesKey - Cache key used for the request  
<a name="module_contexts/EntitiesContext.EntitiesProvider"></a>

### contexts/EntitiesContext.EntitiesProvider(props) ⇒ <code>React.ReactElement</code>
EntitiesProvider component.
Fetches entity list and relevant entity IDs for the selected method/config.

**Kind**: static method of [<code>contexts/EntitiesContext</code>](#module_contexts/EntitiesContext)  

| Param | Type |
| --- | --- |
| props | <code>Object</code> | 
| props.children | <code>React.ReactNode</code> | 

<a name="module_contexts/ConfigContext"></a>

## contexts/ConfigContext
React context for managing runtime configuration.

This context fetches `/config.json` at startup and makes configuration
values available throughout the application via the useConfig hook.


* [contexts/ConfigContext](#module_contexts/ConfigContext)
    * [.ConfigProvider(props)](#module_contexts/ConfigContext.ConfigProvider) ⇒ <code>React.ReactElement</code>
    * [.useConfig()](#module_contexts/ConfigContext.useConfig) ⇒ <code>Object</code>

<a name="module_contexts/ConfigContext.ConfigProvider"></a>

### contexts/ConfigContext.ConfigProvider(props) ⇒ <code>React.ReactElement</code>
Provider component that fetches and manages runtime configuration.

Fetches `/config.json` on mount with cache: no-store to ensure fresh config.
Merges normalized config into the shared config object and provides it via context.

**Kind**: static method of [<code>contexts/ConfigContext</code>](#module_contexts/ConfigContext)  

| Param | Type | Description |
| --- | --- | --- |
| props | <code>Object</code> |  |
| props.children | <code>React.ReactNode</code> | Child components |

<a name="module_contexts/ConfigContext.useConfig"></a>

### contexts/ConfigContext.useConfig() ⇒ <code>Object</code>
Hook to access runtime configuration.

**Kind**: static method of [<code>contexts/ConfigContext</code>](#module_contexts/ConfigContext)  
**Returns**: <code>Object</code> - Configuration object with __workspacesLoaded flag  
**Example**  
```javascript
const config = useConfig();
if (config.__workspacesLoaded) {
  console.log('Workspaces:', config.workspaces);
}
```
