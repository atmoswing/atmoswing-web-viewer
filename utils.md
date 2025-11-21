# Utils

## Files

- src/utils/urlWorkspaceUtils.js
- src/utils/targetDateUtils.js
- src/utils/formattingUtils.js
- src/utils/forecastDateUtils.js
- src/utils/contextGuards.js
- src/utils/colorUtils.js
- src/utils/cacheTTLs.js
- src/utils/apiNormalization.js

---

## Modules

<dl>
<dt><a href="#module_utils/urlWorkspaceUtils">utils/urlWorkspaceUtils</a></dt>
<dd><p>Helpers for syncing workspace selection with URL query parameters.
Enables shareable URLs and browser back/forward navigation for workspace changes.</p>
</dd>
<dt><a href="#module_utils/targetDateUtils">utils/targetDateUtils</a></dt>
<dd><p>Utility helpers for lead time calculations and date comparisons.
Centralizes logic for working with forecast target dates and lead times.</p>
</dd>
<dt><a href="#module_utils/formattingUtils">utils/formattingUtils</a></dt>
<dd><p>Generic formatting utilities for dates, numbers, and entity names.
Provides consistent formatting across the application for display purposes.</p>
</dd>
<dt><a href="#module_utils/forecastDateUtils">utils/forecastDateUtils</a></dt>
<dd><p>Date parsing and formatting utilities for forecast dates.
Handles various date formats used by the API and provides consistent parsing/formatting.</p>
</dd>
<dt><a href="#module_utils/contextGuards">utils/contextGuards</a></dt>
<dd><p>Common guard and helper functions shared across context providers.
Reduces duplication and provides validation logic for method/workspace selections.</p>
</dd>
<dt><a href="#module_utils/colorUtils">utils/colorUtils</a></dt>
<dd><p>Color utilities for visualizing forecast values on maps and charts.
Provides a color gradient from white -&gt; cyan -&gt; green -&gt; yellow -&gt; red based on normalized values.</p>
</dd>
<dt><a href="#module_utils/cacheTTLs">utils/cacheTTLs</a></dt>
<dd><p>Central TTL (Time-To-Live) presets for cached API requests.
All values are in milliseconds. Adjust these if backend freshness requirements change.</p>
</dd>
<dt><a href="#module_utils/apiNormalization">utils/apiNormalization</a></dt>
<dd><p>Helpers to normalize varied API response shapes into predictable structures.
The API may return data in different formats depending on the endpoint or version.
These functions ensure consistent data structures for the UI layer.</p>
</dd>
</dl>

<a name="module_utils/urlWorkspaceUtils"></a>

## utils/urlWorkspaceUtils
Helpers for syncing workspace selection with URL query parameters.
Enables shareable URLs and browser back/forward navigation for workspace changes.


* [utils/urlWorkspaceUtils](#module_utils/urlWorkspaceUtils)
    * [.readWorkspaceFromUrl()](#module_utils/urlWorkspaceUtils.readWorkspaceFromUrl) ⇒ <code>string</code>
    * [.writeWorkspaceToUrl(next)](#module_utils/urlWorkspaceUtils.writeWorkspaceToUrl)
    * [.onWorkspacePopState(handler)](#module_utils/urlWorkspaceUtils.onWorkspacePopState) ⇒ <code>function</code>

<a name="module_utils/urlWorkspaceUtils.readWorkspaceFromUrl"></a>

### utils/urlWorkspaceUtils.readWorkspaceFromUrl() ⇒ <code>string</code>
Reads the workspace key from the current URL query parameters.

**Kind**: static method of [<code>utils/urlWorkspaceUtils</code>](#module_utils/urlWorkspaceUtils)  
**Returns**: <code>string</code> - Workspace key from URL, or empty string if not present  
**Example**  
```javascript
// URL: /?workspace=demo
readWorkspaceFromUrl() // Returns: "demo"
```
<a name="module_utils/urlWorkspaceUtils.writeWorkspaceToUrl"></a>

### utils/urlWorkspaceUtils.writeWorkspaceToUrl(next)
Updates the URL query parameter with the selected workspace key.
Uses pushState to update the URL without page reload.

**Kind**: static method of [<code>utils/urlWorkspaceUtils</code>](#module_utils/urlWorkspaceUtils)  

| Param | Type | Description |
| --- | --- | --- |
| next | <code>string</code> | Workspace key to set, or empty/null to remove parameter |

**Example**  
```javascript
writeWorkspaceToUrl('demo') // Updates URL to: /?workspace=demo
writeWorkspaceToUrl(null)   // Removes workspace parameter from URL
```
<a name="module_utils/urlWorkspaceUtils.onWorkspacePopState"></a>

### utils/urlWorkspaceUtils.onWorkspacePopState(handler) ⇒ <code>function</code>
Registers a handler for browser back/forward navigation to sync workspace changes.

**Kind**: static method of [<code>utils/urlWorkspaceUtils</code>](#module_utils/urlWorkspaceUtils)  
**Returns**: <code>function</code> - Cleanup function to remove the event listener  

| Param | Type | Description |
| --- | --- | --- |
| handler | <code>function</code> | Callback function that receives the workspace key from URL |

**Example**  
```javascript
const cleanup = onWorkspacePopState((workspaceKey) => {
  console.log('Workspace changed via navigation:', workspaceKey);
  setCurrentWorkspace(workspaceKey);
});

// Later, when component unmounts:
cleanup();
```
<a name="module_utils/targetDateUtils"></a>

## utils/targetDateUtils
Utility helpers for lead time calculations and date comparisons.
Centralizes logic for working with forecast target dates and lead times.


* [utils/targetDateUtils](#module_utils/targetDateUtils)
    * [.SUB_HOURS](#module_utils/targetDateUtils.SUB_HOURS) : <code>Array.&lt;number&gt;</code>
    * [.makeDayKey(date)](#module_utils/targetDateUtils.makeDayKey) ⇒ <code>string</code>
    * [.parseDayKey(key)](#module_utils/targetDateUtils.parseDayKey) ⇒ <code>Date</code>
    * [.computeLeadHours(forecastBaseDate, selectedTargetDate, leadResolution, selectedLead, dailyLeads, subDailyLeads)](#module_utils/targetDateUtils.computeLeadHours) ⇒ <code>number</code>
    * [.isSameDay()](#module_utils/targetDateUtils.isSameDay)
    * [.isSameInstant()](#module_utils/targetDateUtils.isSameInstant)
    * [.hasTargetDate()](#module_utils/targetDateUtils.hasTargetDate)

<a name="module_utils/targetDateUtils.SUB_HOURS"></a>

### utils/targetDateUtils.SUB\_HOURS : <code>Array.&lt;number&gt;</code>
Sub-daily hour intervals for forecast resolution.

**Kind**: static constant of [<code>utils/targetDateUtils</code>](#module_utils/targetDateUtils)  
<a name="module_utils/targetDateUtils.makeDayKey"></a>

### utils/targetDateUtils.makeDayKey(date) ⇒ <code>string</code>
Creates a stable YYYY-M-D key string for a date.
Note: Month is 0-based as per JavaScript Date API.

**Kind**: static method of [<code>utils/targetDateUtils</code>](#module_utils/targetDateUtils)  
**Returns**: <code>string</code> - Date key in format "YYYY-M-D", or empty string if invalid  

| Param | Type | Description |
| --- | --- | --- |
| date | <code>Date</code> | Date object to convert to key |

**Example**  
```javascript
makeDayKey(new Date(2025, 10, 5)) // Returns: "2025-10-5"
```
<a name="module_utils/targetDateUtils.parseDayKey"></a>

### utils/targetDateUtils.parseDayKey(key) ⇒ <code>Date</code>
Parses a YYYY-M-D key string back to a Date object.
Month is treated as 0-based (JavaScript Date convention).

**Kind**: static method of [<code>utils/targetDateUtils</code>](#module_utils/targetDateUtils)  
**Returns**: <code>Date</code> - Date object, or Invalid Date if parsing fails  

| Param | Type | Description |
| --- | --- | --- |
| key | <code>string</code> | Date key in format "YYYY-M-D" |

**Example**  
```javascript
parseDayKey("2025-10-5") // Returns: Date object for November 5, 2025
```
<a name="module_utils/targetDateUtils.computeLeadHours"></a>

### utils/targetDateUtils.computeLeadHours(forecastBaseDate, selectedTargetDate, leadResolution, selectedLead, dailyLeads, subDailyLeads) ⇒ <code>number</code>
Compute lead hours given either a base date + target date (preferred) or fallback indices.
Applies timezone offset adjustment when both dates are provided to keep consistent hour differences.

**Kind**: static method of [<code>utils/targetDateUtils</code>](#module_utils/targetDateUtils)  
**Returns**: <code>number</code> - non-negative integer lead hours  

| Param | Type |
| --- | --- |
| forecastBaseDate | <code>Date</code> \| <code>null</code> | 
| selectedTargetDate | <code>Date</code> \| <code>null</code> | 
| leadResolution | <code>&#x27;daily&#x27;</code> \| <code>&#x27;sub&#x27;</code> | 
| selectedLead | <code>number</code> | 
| dailyLeads | <code>Array.&lt;{time\_step:number, date:Date}&gt;</code> | 
| subDailyLeads | <code>Array.&lt;{time\_step:number, date:Date}&gt;</code> | 

<a name="module_utils/targetDateUtils.isSameDay"></a>

### utils/targetDateUtils.isSameDay()
Compare two dates on calendar day only.

**Kind**: static method of [<code>utils/targetDateUtils</code>](#module_utils/targetDateUtils)  
<a name="module_utils/targetDateUtils.isSameInstant"></a>

### utils/targetDateUtils.isSameInstant()
Strict timestamp equality (ms).

**Kind**: static method of [<code>utils/targetDateUtils</code>](#module_utils/targetDateUtils)  
<a name="module_utils/targetDateUtils.hasTargetDate"></a>

### utils/targetDateUtils.hasTargetDate()
Determine if target date is present among leads given resolution.

**Kind**: static method of [<code>utils/targetDateUtils</code>](#module_utils/targetDateUtils)  
<a name="module_utils/formattingUtils"></a>

## utils/formattingUtils
Generic formatting utilities for dates, numbers, and entity names.
Provides consistent formatting across the application for display purposes.


* [utils/formattingUtils](#module_utils/formattingUtils)
    * [.formatDateDDMMYYYY(dateLike)](#module_utils/formattingUtils.formatDateDDMMYYYY) ⇒ <code>string</code>
    * [.formatPrecipitation(value)](#module_utils/formattingUtils.formatPrecipitation) ⇒ <code>string</code>
    * [.formatCriteria(value)](#module_utils/formattingUtils.formatCriteria) ⇒ <code>string</code>
    * [.compareEntitiesByName(a, b)](#module_utils/formattingUtils.compareEntitiesByName) ⇒ <code>number</code>
    * [.formatDateLabel(date)](#module_utils/formattingUtils.formatDateLabel) ⇒ <code>string</code>

<a name="module_utils/formattingUtils.formatDateDDMMYYYY"></a>

### utils/formattingUtils.formatDateDDMMYYYY(dateLike) ⇒ <code>string</code>
Format a Date or date-like value to DD.MM.YYYY format (e.g., 05.11.2025).
Returns empty string on invalid input.

**Kind**: static method of [<code>utils/formattingUtils</code>](#module_utils/formattingUtils)  
**Returns**: <code>string</code> - Formatted date string or empty string if invalid  

| Param | Type | Description |
| --- | --- | --- |
| dateLike | <code>Date</code> \| <code>string</code> \| <code>number</code> | Date object, timestamp, or date string |

**Example**  
```javascript
formatDateDDMMYYYY(new Date('2025-11-05')) // Returns: "05.11.2025"
formatDateDDMMYYYY('2025-11-05') // Returns: "05.11.2025"
formatDateDDMMYYYY(null) // Returns: ""
```
<a name="module_utils/formattingUtils.formatPrecipitation"></a>

### utils/formattingUtils.formatPrecipitation(value) ⇒ <code>string</code>
Formats precipitation value to string with one decimal place.

**Kind**: static method of [<code>utils/formattingUtils</code>](#module_utils/formattingUtils)  
**Returns**: <code>string</code> - Formatted string: number with 1 decimal, '0' for zero, '-' for null/undefined  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>number</code> \| <code>string</code> \| <code>null</code> | Precipitation value to format |

**Example**  
```javascript
formatPrecipitation(25.67) // Returns: "25.7"
formatPrecipitation(0) // Returns: "0"
formatPrecipitation(null) // Returns: "-"
```
<a name="module_utils/formattingUtils.formatCriteria"></a>

### utils/formattingUtils.formatCriteria(value) ⇒ <code>string</code>
Formats a criteria/score value to string with two decimal places.

**Kind**: static method of [<code>utils/formattingUtils</code>](#module_utils/formattingUtils)  
**Returns**: <code>string</code> - Formatted string with 2 decimals, or '-' for null/undefined  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>number</code> \| <code>string</code> \| <code>null</code> | Criteria value to format |

**Example**  
```javascript
formatCriteria(0.12345) // Returns: "0.12"
formatCriteria(null) // Returns: "-"
```
<a name="module_utils/formattingUtils.compareEntitiesByName"></a>

### utils/formattingUtils.compareEntitiesByName(a, b) ⇒ <code>number</code>
Compares two entity objects by name for sorting, case-insensitive.
Falls back to comparing by id if name is not available.

**Kind**: static method of [<code>utils/formattingUtils</code>](#module_utils/formattingUtils)  
**Returns**: <code>number</code> - -1 if a < b, 1 if a > b, 0 if equal  

| Param | Type | Description |
| --- | --- | --- |
| a | <code>Object</code> | First entity with name and/or id |
| b | <code>Object</code> | Second entity with name and/or id |

**Example**  
```javascript
const entities = [{name: "Station B"}, {name: "Station A"}];
entities.sort(compareEntitiesByName);
// Results in: [{name: "Station A"}, {name: "Station B"}]
```
<a name="module_utils/formattingUtils.formatDateLabel"></a>

### utils/formattingUtils.formatDateLabel(date) ⇒ <code>string</code>
Formats a Date into a display label with optional time component.
Includes time (HH:MM) only if hours or minutes are non-zero.

**Kind**: static method of [<code>utils/formattingUtils</code>](#module_utils/formattingUtils)  
**Returns**: <code>string</code> - Formatted string "DD.MM.YYYY" or "DD.MM.YYYY HH:MM"  

| Param | Type | Description |
| --- | --- | --- |
| date | <code>Date</code> \| <code>string</code> \| <code>number</code> | Date object, timestamp, or date string |

**Example**  
```javascript
formatDateLabel(new Date('2025-11-05T00:00')) // Returns: "05.11.2025"
formatDateLabel(new Date('2025-11-05T14:30')) // Returns: "05.11.2025 14:30"
```
<a name="module_utils/forecastDateUtils"></a>

## utils/forecastDateUtils
Date parsing and formatting utilities for forecast dates.
Handles various date formats used by the API and provides consistent parsing/formatting.


* [utils/forecastDateUtils](#module_utils/forecastDateUtils)
    * [.parseForecastDate(str)](#module_utils/forecastDateUtils.parseForecastDate) ⇒ <code>Date</code> \| <code>null</code>
    * [.formatForecastDateForApi(dateObj, [reference])](#module_utils/forecastDateUtils.formatForecastDateForApi) ⇒ <code>string</code> \| <code>null</code>

<a name="module_utils/forecastDateUtils.parseForecastDate"></a>

### utils/forecastDateUtils.parseForecastDate(str) ⇒ <code>Date</code> \| <code>null</code>
Parses various forecast date string formats into a JavaScript Date object.

Supported formats:
- ISO 8601: "2023-01-15T12:00:00Z"
- Hour-only: "2023-01-15T12"
- Space/underscore: "2023-01-15 12:00", "2023-01-15_12:00"
- Compact: "2023011512" or "202301151200"

**Kind**: static method of [<code>utils/forecastDateUtils</code>](#module_utils/forecastDateUtils)  
**Returns**: <code>Date</code> \| <code>null</code> - Parsed Date object, or null if parsing fails  

| Param | Type | Description |
| --- | --- | --- |
| str | <code>string</code> | Date string to parse |

**Example**  
```javascript
parseForecastDate("2023-01-15T12") // Returns: Date object for Jan 15, 2023 12:00
parseForecastDate("2023011512") // Returns: Date object for Jan 15, 2023 12:00
parseForecastDate("invalid") // Returns: null
```
<a name="module_utils/forecastDateUtils.formatForecastDateForApi"></a>

### utils/forecastDateUtils.formatForecastDateForApi(dateObj, [reference]) ⇒ <code>string</code> \| <code>null</code>
Formats a Date object to a string format suitable for API requests.
The output format is determined by examining a reference string format.

Output formats based on reference:
- "YYYY-MM-DDThh" reference → "YYYY-MM-DDThh"
- "YYYY-MM-DD" reference → "YYYY-MM-DD hh:mm"
- No reference → "YYYY-MM-DD hh:mm"
- Other references → ISO 8601 string

**Kind**: static method of [<code>utils/forecastDateUtils</code>](#module_utils/forecastDateUtils)  
**Returns**: <code>string</code> \| <code>null</code> - Formatted date string, or null if invalid date  

| Param | Type | Description |
| --- | --- | --- |
| dateObj | <code>Date</code> | Date object to format |
| [reference] | <code>string</code> | Reference format string to match |

**Example**  
```javascript
formatForecastDateForApi(new Date('2023-01-15T12:00'), '2023-01-01T00')
// Returns: "2023-01-15T12"

formatForecastDateForApi(new Date('2023-01-15T12:00'), '2023-01-01')
// Returns: "2023-01-15 12:00"
```
<a name="module_utils/contextGuards"></a>

## utils/contextGuards
Common guard and helper functions shared across context providers.
Reduces duplication and provides validation logic for method/workspace selections.


* [utils/contextGuards](#module_utils/contextGuards)
    * [.isMethodSelectionValid(selectedMethodConfig, workspace)](#module_utils/contextGuards.isMethodSelectionValid) ⇒ <code>boolean</code>
    * [.methodExists(methodConfigTree, methodId)](#module_utils/contextGuards.methodExists) ⇒ <code>boolean</code>
    * [.deriveConfigId(selectedMethodConfig, methodConfigTree)](#module_utils/contextGuards.deriveConfigId) ⇒ <code>string</code> \| <code>number</code> \| <code>null</code>
    * [.keyForEntities(workspace, forecastDate, methodId, configId)](#module_utils/contextGuards.keyForEntities) ⇒ <code>string</code>
    * [.keyForRelevantEntities(workspace, forecastDate, methodId, configId)](#module_utils/contextGuards.keyForRelevantEntities) ⇒ <code>string</code>
    * [.keyForForecastValues(workspace, forecastDate, methodId, configId, leadHours, percentile, normalizationRef)](#module_utils/contextGuards.keyForForecastValues) ⇒ <code>string</code>

<a name="module_utils/contextGuards.isMethodSelectionValid"></a>

### utils/contextGuards.isMethodSelectionValid(selectedMethodConfig, workspace) ⇒ <code>boolean</code>
Validates that a selected method/config belongs to the current workspace.

**Kind**: static method of [<code>utils/contextGuards</code>](#module_utils/contextGuards)  
**Returns**: <code>boolean</code> - True if selection is valid for this workspace  

| Param | Type | Description |
| --- | --- | --- |
| selectedMethodConfig | <code>Object</code> | The selected method and config object |
| workspace | <code>string</code> | Current workspace key |

<a name="module_utils/contextGuards.methodExists"></a>

### utils/contextGuards.methodExists(methodConfigTree, methodId) ⇒ <code>boolean</code>
Checks if a method ID exists in the method configuration tree.

**Kind**: static method of [<code>utils/contextGuards</code>](#module_utils/contextGuards)  
**Returns**: <code>boolean</code> - True if method exists in tree  

| Param | Type | Description |
| --- | --- | --- |
| methodConfigTree | <code>Array</code> | Array of method objects with id property |
| methodId | <code>string</code> \| <code>number</code> | Method ID to search for |

<a name="module_utils/contextGuards.deriveConfigId"></a>

### utils/contextGuards.deriveConfigId(selectedMethodConfig, methodConfigTree) ⇒ <code>string</code> \| <code>number</code> \| <code>null</code>
Derives a configuration ID from selected method, falling back to first config.

**Kind**: static method of [<code>utils/contextGuards</code>](#module_utils/contextGuards)  
**Returns**: <code>string</code> \| <code>number</code> \| <code>null</code> - Configuration ID, or null if not found  

| Param | Type | Description |
| --- | --- | --- |
| selectedMethodConfig | <code>Object</code> | Selected method and config object |
| methodConfigTree | <code>Array</code> | Full method configuration tree |

<a name="module_utils/contextGuards.keyForEntities"></a>

### utils/contextGuards.keyForEntities(workspace, forecastDate, methodId, configId) ⇒ <code>string</code>
Composes a cache key for entities data.

**Kind**: static method of [<code>utils/contextGuards</code>](#module_utils/contextGuards)  
**Returns**: <code>string</code> - Composed cache key  

| Param | Type | Description |
| --- | --- | --- |
| workspace | <code>string</code> | Workspace key |
| forecastDate | <code>string</code> | Forecast date string |
| methodId | <code>string</code> \| <code>number</code> | Method ID |
| configId | <code>string</code> \| <code>number</code> | Configuration ID |

<a name="module_utils/contextGuards.keyForRelevantEntities"></a>

### utils/contextGuards.keyForRelevantEntities(workspace, forecastDate, methodId, configId) ⇒ <code>string</code>
Composes a cache key for relevant entities data.

**Kind**: static method of [<code>utils/contextGuards</code>](#module_utils/contextGuards)  
**Returns**: <code>string</code> - Composed cache key  

| Param | Type | Description |
| --- | --- | --- |
| workspace | <code>string</code> | Workspace key |
| forecastDate | <code>string</code> | Forecast date string |
| methodId | <code>string</code> \| <code>number</code> | Method ID |
| configId | <code>string</code> \| <code>number</code> | Configuration ID |

<a name="module_utils/contextGuards.keyForForecastValues"></a>

### utils/contextGuards.keyForForecastValues(workspace, forecastDate, methodId, configId, leadHours, percentile, normalizationRef) ⇒ <code>string</code>
Composes a cache key for forecast values data.

**Kind**: static method of [<code>utils/contextGuards</code>](#module_utils/contextGuards)  
**Returns**: <code>string</code> - Composed cache key  

| Param | Type | Description |
| --- | --- | --- |
| workspace | <code>string</code> | Workspace key |
| forecastDate | <code>string</code> | Forecast date string |
| methodId | <code>string</code> \| <code>number</code> | Method ID |
| configId | <code>string</code> \| <code>number</code> | Configuration ID (defaults to 'agg') |
| leadHours | <code>number</code> | Lead time in hours |
| percentile | <code>number</code> | Percentile value |
| normalizationRef | <code>string</code> | Normalization reference (defaults to 'raw') |

<a name="module_utils/colorUtils"></a>

## utils/colorUtils
Color utilities for visualizing forecast values on maps and charts.
Provides a color gradient from white -> cyan -> green -> yellow -> red based on normalized values.


* [utils/colorUtils](#module_utils/colorUtils)
    * [.valueToColor(value, maxValue)](#module_utils/colorUtils.valueToColor) ⇒ <code>Array.&lt;number&gt;</code>
    * [.valueToColorCSS(value, maxValue)](#module_utils/colorUtils.valueToColorCSS) ⇒ <code>string</code>

<a name="module_utils/colorUtils.valueToColor"></a>

### utils/colorUtils.valueToColor(value, maxValue) ⇒ <code>Array.&lt;number&gt;</code>
Converts a numeric value to an RGB color array based on a gradient scale.

Color scale:
- 0: White [255, 255, 255]
- 0-50%: White -> Cyan -> Green
- 50-100%: Green -> Yellow -> Red
- null/NaN: Gray [150, 150, 150]

**Kind**: static method of [<code>utils/colorUtils</code>](#module_utils/colorUtils)  
**Returns**: <code>Array.&lt;number&gt;</code> - RGB color array [r, g, b] with values 0-255  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>number</code> \| <code>null</code> | The value to convert to color |
| maxValue | <code>number</code> | The maximum value for normalization |

**Example**  
```javascript
valueToColor(50, 100) // Returns [255, 255, 0] (yellow)
valueToColor(0, 100)  // Returns [255, 255, 255] (white)
```
<a name="module_utils/colorUtils.valueToColorCSS"></a>

### utils/colorUtils.valueToColorCSS(value, maxValue) ⇒ <code>string</code>
Converts a numeric value to a CSS rgb() color string.
Convenience wrapper around valueToColor() that returns a CSS-ready string.

**Kind**: static method of [<code>utils/colorUtils</code>](#module_utils/colorUtils)  
**Returns**: <code>string</code> - CSS rgb() color string, e.g., "rgb(255,128,0)"  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>number</code> \| <code>null</code> | The value to convert to color |
| maxValue | <code>number</code> | The maximum value for normalization |

**Example**  
```javascript
valueToColorCSS(75, 100) // Returns "rgb(255,191,0)"
```
<a name="module_utils/cacheTTLs"></a>

## utils/cacheTTLs
Central TTL (Time-To-Live) presets for cached API requests.
All values are in milliseconds. Adjust these if backend freshness requirements change.


* [utils/cacheTTLs](#module_utils/cacheTTLs)
    * [.SHORT_TTL](#module_utils/cacheTTLs.SHORT_TTL) : <code>number</code>
    * [.DEFAULT_TTL](#module_utils/cacheTTLs.DEFAULT_TTL) : <code>number</code>
    * [.LONG_TTL](#module_utils/cacheTTLs.LONG_TTL) : <code>number</code>

<a name="module_utils/cacheTTLs.SHORT_TTL"></a>

### utils/cacheTTLs.SHORT\_TTL : <code>number</code>
Short TTL for frequently changing data (2 minutes).
Use for exploratory data with high churn rate like analog dates and lead times.

**Kind**: static constant of [<code>utils/cacheTTLs</code>](#module_utils/cacheTTLs)  
<a name="module_utils/cacheTTLs.DEFAULT_TTL"></a>

### utils/cacheTTLs.DEFAULT\_TTL : <code>number</code>
Default TTL for typical API data (5 minutes).
Use for methods, entities, and synthesis data that changes moderately.

**Kind**: static constant of [<code>utils/cacheTTLs</code>](#module_utils/cacheTTLs)  
<a name="module_utils/cacheTTLs.LONG_TTL"></a>

### utils/cacheTTLs.LONG\_TTL : <code>number</code>
Long TTL for very static data (15 minutes).
Use for configuration and rarely-changing reference data.

**Kind**: static constant of [<code>utils/cacheTTLs</code>](#module_utils/cacheTTLs)  
<a name="module_utils/apiNormalization"></a>

## utils/apiNormalization
Helpers to normalize varied API response shapes into predictable structures.
The API may return data in different formats depending on the endpoint or version.
These functions ensure consistent data structures for the UI layer.


* [utils/apiNormalization](#module_utils/apiNormalization)
    * [.normalizeEntitiesResponse(resp)](#module_utils/apiNormalization.normalizeEntitiesResponse) ⇒ <code>Array.&lt;Object&gt;</code>
    * [.normalizeRelevantEntityIds(resp)](#module_utils/apiNormalization.normalizeRelevantEntityIds) ⇒ <code>Set.&lt;(string\|number)&gt;</code>
    * [.normalizeAnalogsResponse(resp)](#module_utils/apiNormalization.normalizeAnalogsResponse) ⇒ <code>Array.&lt;Object&gt;</code>
    * [.extractTargetDatesArray(resp)](#module_utils/apiNormalization.extractTargetDatesArray) ⇒ <code>Array.&lt;string&gt;</code>
    * [.normalizeForecastValuesResponse(resp)](#module_utils/apiNormalization.normalizeForecastValuesResponse) ⇒ <code>Object</code> \| <code>Object</code> \| <code>Object</code> \| <code>boolean</code>
    * [.normalizeMethodsAndConfigs(resp)](#module_utils/apiNormalization.normalizeMethodsAndConfigs) ⇒ <code>Array.&lt;Object&gt;</code>

<a name="module_utils/apiNormalization.normalizeEntitiesResponse"></a>

### utils/apiNormalization.normalizeEntitiesResponse(resp) ⇒ <code>Array.&lt;Object&gt;</code>
Normalizes entities response to a consistent array format.

**Kind**: static method of [<code>utils/apiNormalization</code>](#module_utils/apiNormalization)  
**Returns**: <code>Array.&lt;Object&gt;</code> - Array of entity objects with {id, name?, x?, y?}  

| Param | Type | Description |
| --- | --- | --- |
| resp | <code>\*</code> | Raw API response (can be array, object with entities property, or null) |

**Example**  
```javascript
// Returns [{id: 1, name: "Station A"}]
normalizeEntitiesResponse({entities: [{id: 1, name: "Station A"}]})
```
<a name="module_utils/apiNormalization.normalizeRelevantEntityIds"></a>

### utils/apiNormalization.normalizeRelevantEntityIds(resp) ⇒ <code>Set.&lt;(string\|number)&gt;</code>
Extracts and normalizes relevant entity IDs from various response formats.

**Kind**: static method of [<code>utils/apiNormalization</code>](#module_utils/apiNormalization)  
**Returns**: <code>Set.&lt;(string\|number)&gt;</code> - Set of entity IDs  

| Param | Type | Description |
| --- | --- | --- |
| resp | <code>\*</code> | Raw API response |

**Example**  
```javascript
normalizeRelevantEntityIds({entity_ids: [1, 2, 3]}) // Returns Set(1, 2, 3)
```
<a name="module_utils/apiNormalization.normalizeAnalogsResponse"></a>

### utils/apiNormalization.normalizeAnalogsResponse(resp) ⇒ <code>Array.&lt;Object&gt;</code>
Normalizes analog data from various response formats.

**Kind**: static method of [<code>utils/apiNormalization</code>](#module_utils/apiNormalization)  
**Returns**: <code>Array.&lt;Object&gt;</code> - Array of analog objects with {rank, date, value, criteria}  

| Param | Type | Description |
| --- | --- | --- |
| resp | <code>\*</code> | Raw API response containing analog data |

**Example**  
```javascript
normalizeAnalogsResponse({analogs: [{rank: 1, date: "2020-01-15", value: 25.3}]})
```
<a name="module_utils/apiNormalization.extractTargetDatesArray"></a>

### utils/apiNormalization.extractTargetDatesArray(resp) ⇒ <code>Array.&lt;string&gt;</code>
Extracts target dates array from various API response formats.

**Kind**: static method of [<code>utils/apiNormalization</code>](#module_utils/apiNormalization)  
**Returns**: <code>Array.&lt;string&gt;</code> - Array of target date strings, or empty array if not found  

| Param | Type | Description |
| --- | --- | --- |
| resp | <code>\*</code> | Raw API response (can be object, array, or nested structure) |

**Example**  
```javascript
extractTargetDatesArray({series_values: {target_dates: ['2023-01-15', '2023-01-16']}})
// Returns: ['2023-01-15', '2023-01-16']
```
<a name="module_utils/apiNormalization.normalizeForecastValuesResponse"></a>

### utils/apiNormalization.normalizeForecastValuesResponse(resp) ⇒ <code>Object</code> \| <code>Object</code> \| <code>Object</code> \| <code>boolean</code>
Normalizes forecast values response into separate normalized and raw value maps.

**Kind**: static method of [<code>utils/apiNormalization</code>](#module_utils/apiNormalization)  
**Returns**: <code>Object</code> - Object with {norm: Object, raw: Object, unavailable: boolean}<code>Object</code> - returns.norm - Map of entity ID to normalized value<code>Object</code> - returns.raw - Map of entity ID to raw value<code>boolean</code> - returns.unavailable - True if data is missing or malformed  

| Param | Type | Description |
| --- | --- | --- |
| resp | <code>Object</code> | Raw API response with entity_ids, values_normalized, and values arrays |

**Example**  
```javascript
normalizeForecastValuesResponse({
  entity_ids: [1, 2],
  values_normalized: [0.5, 0.8],
  values: [25.5, 40.2]
})
// Returns: {
//   norm: {1: 0.5, 2: 0.8},
//   raw: {1: 25.5, 2: 40.2},
//   unavailable: false
// }
```
<a name="module_utils/apiNormalization.normalizeMethodsAndConfigs"></a>

### utils/apiNormalization.normalizeMethodsAndConfigs(resp) ⇒ <code>Array.&lt;Object&gt;</code>
Normalizes methods and configurations response into a tree structure.
Each method contains nested configuration objects.

**Kind**: static method of [<code>utils/apiNormalization</code>](#module_utils/apiNormalization)  
**Returns**: <code>Array.&lt;Object&gt;</code> - Array of method objects with nested children configs  

| Param | Type | Description |
| --- | --- | --- |
| resp | <code>Object</code> | Raw API response with methods array |

**Example**  
```javascript
normalizeMethodsAndConfigs({
  methods: [{id: 1, name: "Method A", configs: [{id: 10, name: "Config 1"}]}]
})
// Returns: [{id: 1, name: "Method A", children: [{id: 10, name: "Config 1"}]}]
```
