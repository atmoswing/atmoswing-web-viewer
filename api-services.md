# API Services

## Files

- src/services/apiHelpers.js
- src/services/api.js

---

## Modules

<dl>
<dt><a href="#module_services/apiHelpers">services/apiHelpers</a></dt>
<dd><p>Utility helpers for building API query strings and composing endpoint paths.
Provides functions to construct URL query parameters and cache keys.</p>
</dd>
</dl>

## Constants

<dl>
<dt><a href="#getAnalogDates">getAnalogDates</a> ⇒ <code>Promise.&lt;Array&gt;</code></dt>
<dd><p>Gets analog dates for a specific forecast lead time.</p>
</dd>
<dt><a href="#getAnalogyCriteria">getAnalogyCriteria</a> ⇒ <code>Promise.&lt;Array&gt;</code></dt>
<dd><p>Retrieves analogy criteria values for a forecast lead time.</p>
</dd>
<dt><a href="#getEntitiesValuesPercentile">getEntitiesValuesPercentile</a> ⇒ <code>Promise.&lt;Object&gt;</code></dt>
<dd><p>Gets forecast values at a specific percentile for all entities.</p>
</dd>
<dt><a href="#getReferenceValues">getReferenceValues</a> ⇒ <code>Promise.&lt;Array&gt;</code></dt>
<dd><p>Fetches reference (climatology) values for an entity.</p>
</dd>
<dt><a href="#getSeriesBestAnalogs">getSeriesBestAnalogs</a> ⇒ <code>Promise.&lt;Object&gt;</code></dt>
<dd><p>Gets time series values for the best analog dates.</p>
</dd>
<dt><a href="#getSeriesValuesPercentiles">getSeriesValuesPercentiles</a> ⇒ <code>Promise.&lt;Object&gt;</code></dt>
<dd><p>Retrieves time series values at specified percentiles.</p>
</dd>
<dt><a href="#getSeriesValuesPercentilesHistory">getSeriesValuesPercentilesHistory</a> ⇒ <code>Promise.&lt;Object&gt;</code></dt>
<dd><p>Gets historical time series percentile values.</p>
</dd>
<dt><a href="#getAnalogs">getAnalogs</a> ⇒ <code>Promise.&lt;Array&gt;</code></dt>
<dd><p>Fetches analog information for a specific entity and lead time.</p>
</dd>
<dt><a href="#getAnalogValues">getAnalogValues</a> ⇒ <code>Promise.&lt;Array&gt;</code></dt>
<dd><p>Gets precipitation values for analog dates.</p>
</dd>
<dt><a href="#getAnalogValuesPercentiles">getAnalogValuesPercentiles</a> ⇒ <code>Promise.&lt;Object&gt;</code></dt>
<dd><p>Retrieves analog values at specified percentiles.</p>
</dd>
</dl>

<a name="module_services/apiHelpers"></a>

## services/apiHelpers
Utility helpers for building API query strings and composing endpoint paths.
Provides functions to construct URL query parameters and cache keys.


* [services/apiHelpers](#module_services/apiHelpers)
    * [.buildRepeatedParamQuery(key, values)](#module_services/apiHelpers.buildRepeatedParamQuery) ⇒ <code>string</code>
    * [.buildPercentilesQuery(percentiles)](#module_services/apiHelpers.buildPercentilesQuery) ⇒ <code>string</code>
    * [.buildNormalizeQuery(normalize)](#module_services/apiHelpers.buildNormalizeQuery) ⇒ <code>string</code>
    * [.appendQuery(path, query)](#module_services/apiHelpers.appendQuery) ⇒ <code>string</code>
    * [.composeKey(...parts)](#module_services/apiHelpers.composeKey) ⇒ <code>string</code>

<a name="module_services/apiHelpers.buildRepeatedParamQuery"></a>

### services/apiHelpers.buildRepeatedParamQuery(key, values) ⇒ <code>string</code>
Builds a query string with repeated parameters for the same key.
Useful for APIs that accept multiple values like: ?key=val1&key=val2&key=val3

**Kind**: static method of [<code>services/apiHelpers</code>](#module_services/apiHelpers)  
**Returns**: <code>string</code> - Query string with leading '?', or empty string if no values  

| Param | Type | Description |
| --- | --- | --- |
| key | <code>string</code> | The query parameter key |
| values | <code>Array.&lt;\*&gt;</code> | Array of values to include |

**Example**  
```javascript
buildRepeatedParamQuery('percentiles', [10, 50, 90])
// Returns: "?percentiles=10&percentiles=50&percentiles=90"
```
<a name="module_services/apiHelpers.buildPercentilesQuery"></a>

### services/apiHelpers.buildPercentilesQuery(percentiles) ⇒ <code>string</code>
Builds a query string for percentile values.
Convenience wrapper around buildRepeatedParamQuery for percentiles.

**Kind**: static method of [<code>services/apiHelpers</code>](#module_services/apiHelpers)  
**Returns**: <code>string</code> - Query string like "?percentiles=10&percentiles=50&percentiles=90"  

| Param | Type | Description |
| --- | --- | --- |
| percentiles | <code>Array.&lt;number&gt;</code> | Array of percentile values (e.g., [10, 50, 90]) |

**Example**  
```javascript
buildPercentilesQuery([10, 50, 90])
// Returns: "?percentiles=10&percentiles=50&percentiles=90"
```
<a name="module_services/apiHelpers.buildNormalizeQuery"></a>

### services/apiHelpers.buildNormalizeQuery(normalize) ⇒ <code>string</code>
Builds a query string for the normalize parameter.

**Kind**: static method of [<code>services/apiHelpers</code>](#module_services/apiHelpers)  
**Returns**: <code>string</code> - Query string like "?normalize=true", or empty string  

| Param | Type | Description |
| --- | --- | --- |
| normalize | <code>boolean</code> \| <code>string</code> \| <code>null</code> | Normalize flag value |

**Example**  
```javascript
buildNormalizeQuery(true) // Returns: "?normalize=true"
buildNormalizeQuery(null) // Returns: ""
```
<a name="module_services/apiHelpers.appendQuery"></a>

### services/apiHelpers.appendQuery(path, query) ⇒ <code>string</code>
Appends a query string fragment to a path that may already contain a query.
Intelligently handles existing query parameters by using '&' instead of '?'.

**Kind**: static method of [<code>services/apiHelpers</code>](#module_services/apiHelpers)  
**Returns**: <code>string</code> - Combined path with query parameters  

| Param | Type | Description |
| --- | --- | --- |
| path | <code>string</code> | The base URL path |
| query | <code>string</code> | Query string to append (with or without leading '?') |

**Example**  
```javascript
appendQuery('/api/data', 'sort=asc') // Returns: "/api/data?sort=asc"
appendQuery('/api/data?page=1', 'sort=asc') // Returns: "/api/data?page=1&sort=asc"
appendQuery('/api/data', '?sort=asc') // Returns: "/api/data?sort=asc"
```
<a name="module_services/apiHelpers.composeKey"></a>

### services/apiHelpers.composeKey(...parts) ⇒ <code>string</code>
Composes a cache key from multiple parts by joining with '|' separator.
Handles null/undefined values by converting to empty strings.

**Kind**: static method of [<code>services/apiHelpers</code>](#module_services/apiHelpers)  
**Returns**: <code>string</code> - Composed cache key  

| Param | Type | Description |
| --- | --- | --- |
| ...parts | <code>\*</code> | Variable number of key parts to combine |

**Example**  
```javascript
composeKey('region', 'date', 123) // Returns: "region|date|123"
composeKey('user', null, 'action') // Returns: "user||action"
```
<a name="getAnalogDates"></a>

## getAnalogDates ⇒ <code>Promise.&lt;Array&gt;</code>
Gets analog dates for a specific forecast lead time.

**Kind**: global constant  
**Returns**: <code>Promise.&lt;Array&gt;</code> - Array of analog date strings  

| Param | Type | Description |
| --- | --- | --- |
| region | <code>string</code> | The region/workspace identifier |
| date | <code>string</code> | ISO date string |
| methodId | <code>string</code> \| <code>number</code> | Method identifier |
| configId | <code>string</code> \| <code>number</code> | Configuration identifier |
| lead | <code>number</code> | Lead time index |

<a name="getAnalogyCriteria"></a>

## getAnalogyCriteria ⇒ <code>Promise.&lt;Array&gt;</code>
Retrieves analogy criteria values for a forecast lead time.

**Kind**: global constant  
**Returns**: <code>Promise.&lt;Array&gt;</code> - Array of criteria values  

| Param | Type | Description |
| --- | --- | --- |
| region | <code>string</code> | The region/workspace identifier |
| date | <code>string</code> | ISO date string |
| methodId | <code>string</code> \| <code>number</code> | Method identifier |
| configId | <code>string</code> \| <code>number</code> | Configuration identifier |
| lead | <code>number</code> | Lead time index |

<a name="getEntitiesValuesPercentile"></a>

## getEntitiesValuesPercentile ⇒ <code>Promise.&lt;Object&gt;</code>
Gets forecast values at a specific percentile for all entities.

**Kind**: global constant  
**Returns**: <code>Promise.&lt;Object&gt;</code> - Object mapping entity IDs to values  

| Param | Type | Description |
| --- | --- | --- |
| region | <code>string</code> | The region/workspace identifier |
| date | <code>string</code> | ISO date string |
| methodId | <code>string</code> \| <code>number</code> | Method identifier |
| configId | <code>string</code> \| <code>number</code> | Configuration identifier |
| lead | <code>number</code> | Lead time index |
| perc | <code>number</code> | Percentile value (0-100) |
| normalize | <code>boolean</code> | Whether to normalize values |

<a name="getReferenceValues"></a>

## getReferenceValues ⇒ <code>Promise.&lt;Array&gt;</code>
Fetches reference (climatology) values for an entity.

**Kind**: global constant  
**Returns**: <code>Promise.&lt;Array&gt;</code> - Array of reference values  

| Param | Type | Description |
| --- | --- | --- |
| region | <code>string</code> | The region/workspace identifier |
| date | <code>string</code> | ISO date string |
| methodId | <code>string</code> \| <code>number</code> | Method identifier |
| configId | <code>string</code> \| <code>number</code> | Configuration identifier |
| entity | <code>string</code> \| <code>number</code> | Entity identifier |

<a name="getSeriesBestAnalogs"></a>

## getSeriesBestAnalogs ⇒ <code>Promise.&lt;Object&gt;</code>
Gets time series values for the best analog dates.

**Kind**: global constant  
**Returns**: <code>Promise.&lt;Object&gt;</code> - Time series data for best analogs  

| Param | Type | Description |
| --- | --- | --- |
| region | <code>string</code> | The region/workspace identifier |
| date | <code>string</code> | ISO date string |
| methodId | <code>string</code> \| <code>number</code> | Method identifier |
| configId | <code>string</code> \| <code>number</code> | Configuration identifier |
| entity | <code>string</code> \| <code>number</code> | Entity identifier |

<a name="getSeriesValuesPercentiles"></a>

## getSeriesValuesPercentiles ⇒ <code>Promise.&lt;Object&gt;</code>
Retrieves time series values at specified percentiles.

**Kind**: global constant  
**Returns**: <code>Promise.&lt;Object&gt;</code> - Time series percentile data  

| Param | Type | Description |
| --- | --- | --- |
| region | <code>string</code> | The region/workspace identifier |
| date | <code>string</code> | ISO date string |
| methodId | <code>string</code> \| <code>number</code> | Method identifier |
| configId | <code>string</code> \| <code>number</code> | Configuration identifier |
| entity | <code>string</code> \| <code>number</code> | Entity identifier |
| percentiles | <code>Array.&lt;number&gt;</code> | Array of percentile values |

<a name="getSeriesValuesPercentilesHistory"></a>

## getSeriesValuesPercentilesHistory ⇒ <code>Promise.&lt;Object&gt;</code>
Gets historical time series percentile values.

**Kind**: global constant  
**Returns**: <code>Promise.&lt;Object&gt;</code> - Historical time series data  

| Param | Type | Description |
| --- | --- | --- |
| region | <code>string</code> | The region/workspace identifier |
| date | <code>string</code> | ISO date string |
| methodId | <code>string</code> \| <code>number</code> | Method identifier |
| configId | <code>string</code> \| <code>number</code> | Configuration identifier |
| entity | <code>string</code> \| <code>number</code> | Entity identifier |
| number | <code>number</code> | Number of historical forecasts to retrieve (default: 3) |

<a name="getAnalogs"></a>

## getAnalogs ⇒ <code>Promise.&lt;Array&gt;</code>
Fetches analog information for a specific entity and lead time.

**Kind**: global constant  
**Returns**: <code>Promise.&lt;Array&gt;</code> - Array of analog objects  

| Param | Type | Description |
| --- | --- | --- |
| region | <code>string</code> | The region/workspace identifier |
| date | <code>string</code> | ISO date string |
| methodId | <code>string</code> \| <code>number</code> | Method identifier |
| configId | <code>string</code> \| <code>number</code> | Configuration identifier |
| entity | <code>string</code> \| <code>number</code> | Entity identifier |
| lead | <code>number</code> | Lead time index |

<a name="getAnalogValues"></a>

## getAnalogValues ⇒ <code>Promise.&lt;Array&gt;</code>
Gets precipitation values for analog dates.

**Kind**: global constant  
**Returns**: <code>Promise.&lt;Array&gt;</code> - Array of analog precipitation values  

| Param | Type | Description |
| --- | --- | --- |
| region | <code>string</code> | The region/workspace identifier |
| date | <code>string</code> | ISO date string |
| methodId | <code>string</code> \| <code>number</code> | Method identifier |
| configId | <code>string</code> \| <code>number</code> | Configuration identifier |
| entity | <code>string</code> \| <code>number</code> | Entity identifier |
| lead | <code>number</code> | Lead time index |

<a name="getAnalogValuesPercentiles"></a>

## getAnalogValuesPercentiles ⇒ <code>Promise.&lt;Object&gt;</code>
Retrieves analog values at specified percentiles.

**Kind**: global constant  
**Returns**: <code>Promise.&lt;Object&gt;</code> - Analog values at percentiles  

| Param | Type | Description |
| --- | --- | --- |
| region | <code>string</code> | The region/workspace identifier |
| date | <code>string</code> | ISO date string |
| methodId | <code>string</code> \| <code>number</code> | Method identifier |
| configId | <code>string</code> \| <code>number</code> | Configuration identifier |
| entity | <code>string</code> \| <code>number</code> | Entity identifier |
| lead | <code>number</code> | Lead time index |
| percentiles | <code>Array.&lt;number&gt;</code> | Array of percentile values |

