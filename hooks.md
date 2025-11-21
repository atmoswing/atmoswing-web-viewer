# Hooks

## Files

- src/hooks/useCachedRequest.js

---

<a name="module_hooks/useCachedRequest"></a>

## hooks/useCachedRequest
Generic cached request hook that provides shared in-memory caching across hook instances.


* [hooks/useCachedRequest](#module_hooks/useCachedRequest)
    * _static_
        * [.useCachedRequest(key, fetchFn, deps, options)](#module_hooks/useCachedRequest.useCachedRequest) ⇒ <code>Object</code> \| <code>\*</code> \| <code>boolean</code> \| <code>Error</code> \| <code>null</code> \| <code>function</code> \| <code>boolean</code>
    * _inner_
        * [~GLOBAL_CACHE](#module_hooks/useCachedRequest..GLOBAL_CACHE) : <code>Map.&lt;string, {timestamp: number, data: any}&gt;</code>

<a name="module_hooks/useCachedRequest.useCachedRequest"></a>

### hooks/useCachedRequest.useCachedRequest(key, fetchFn, deps, options) ⇒ <code>Object</code> \| <code>\*</code> \| <code>boolean</code> \| <code>Error</code> \| <code>null</code> \| <code>function</code> \| <code>boolean</code>
Custom hook for making cached API requests with automatic deduplication.

**Kind**: static method of [<code>hooks/useCachedRequest</code>](#module_hooks/useCachedRequest)  
**Returns**: <code>Object</code> - Request state object<code>\*</code> - returns.data - The fetched data<code>boolean</code> - returns.loading - Whether the request is in progress<code>Error</code> \| <code>null</code> - returns.error - Error object if request failed<code>function</code> - returns.refresh - Function to force refetch bypassing cache<code>boolean</code> - returns.fromCache - Whether data was served from cache  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| key | <code>string</code> \| <code>null</code> |  | Unique cache key. If null/undefined, fetch is skipped |
| fetchFn | <code>function</code> |  | Async function that returns the data |
| deps | <code>Array</code> |  | Dependency array for the effect |
| options | <code>Object</code> |  | Configuration options |
| [options.enabled] | <code>boolean</code> | <code>true</code> | Whether the request is enabled |
| [options.initialData] | <code>\*</code> | <code></code> | Initial data value |
| [options.ttlMs] | <code>number</code> \| <code>null</code> | <code></code> | Time-to-live in milliseconds. If provided and cache is stale, refetch occurs |

**Example**  
```javascript
const { data, loading, error, refresh } = useCachedRequest(
  'forecast-entities',
  () => getEntities(region, date, methodId, configId),
  [region, date, methodId, configId],
  { ttlMs: 60000 }
);
```
<a name="module_hooks/useCachedRequest..GLOBAL_CACHE"></a>

### hooks/useCachedRequest~GLOBAL\_CACHE : <code>Map.&lt;string, {timestamp: number, data: any}&gt;</code>
Global cache storage. Maps cache keys to objects containing timestamp and data.

**Kind**: inner constant of [<code>hooks/useCachedRequest</code>](#module_hooks/useCachedRequest)  
