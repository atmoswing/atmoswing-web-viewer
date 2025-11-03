# AtmoSwing web viewer

## Development

Run the local server for development:

```bash
npm run dev
```

## Runtime Configuration (Unified)

All runtime (mutable) settings now live in a single JSON file served at `/config.json` (located at `public/config.json` in the source tree). This file is fetched at startup (with `cache: no-store`) and can be changed without rebuilding the application. It contains both API settings and workspace definitions, for example:

```json
{
  "API_BASE_URL": "https://api.example.com",
  "ENTITIES_SOURCE_EPSG": "EPSG:4326",
  "API_DEBUG": false,
  "workspaces": [
    { "key": "demo", "name": "Demo", "shapefiles": [] }
  ]
}
```

### What Gets Normalized
- `API_BASE_URL`: trailing slashes removed.
- `API_DEBUG`: coerced from string/number to boolean (`true, 1, yes, on`).
- `ENTITIES_SOURCE_EPSG`: falls back to `EPSG:4326`.
- `workspaces`: defaults to an empty array.

### Order of Initialization
1. App mounts with default empty config (no API base / no workspaces) to avoid blocking initial render.
2. `/config.json` fetched; when it resolves, values are merged into a shared mutable config object used by services (e.g. `src/services/api.js`).
3. Components re-render via React context with `__workspacesLoaded = true` so UI can distinguish between “not loaded yet” and “loaded but empty”.

### Editing Configuration At Runtime
You can change `/config.json` directly on the server (or via a mounted volume) and force clients to pick it up with a hard refresh (Ctrl+F5). Because `Cache-Control: no-store` is sent for `config.json` (see `nginx.conf`), normal reloads already fetch the latest file.

## Workspaces
Workspace definitions are part of the same `config.json` under the `workspaces` key. The UI will automatically pick up new keys if referenced in components.

### Selecting a workspace via URL
You can preselect a workspace by adding a query parameter to the URL: `?workspace=<key>`.

If the key is invalid or missing, the app will fall back to the first workspace from `config.json`.

Examples:
- `/` → selects the first workspace
- `/?workspace=zap_v13` → selects the `zap_v13` workspace

Browser navigation (back/forward) stays in sync with the selected workspace, and changing the workspace from the dropdown updates the URL so links are shareable.

## License
See `LICENSE`.
