# AtmoSwing web viewer

## Configuration

All runtime settings live in a single JSON file served at `/config.json` (located at `public/config.json` in the source tree). This file is fetched at startup and can be changed without rebuilding the application. It contains API settings, map providers, base layers, overlay layers, and workspace definitions.

For detailed documentation on all available configuration options and fields, see **[CONFIGURATION.md](CONFIGURATION.md)**.

### Quick Example

```json
{
  "API_BASE_URL": "https://api.example.com",
  "ENTITIES_SOURCE_EPSG": "EPSG:4326",
  "API_DEBUG": false,
  "providers": [...],
  "baseLayers": [...],
  "overlayLayers": [...],
  "workspaces": [
    { "key": "demo", "name": "Demo", "shapefiles": [...] }
  ]
}
```

### Editing Configuration At Runtime
You can change `/config.json` directly on the server (or via a mounted volume) and force clients to pick it up with a hard refresh (Ctrl+F5).

## Workspaces
Workspace definitions are part of the same `config.json` under the `workspaces` key. Each workspace can define its own set of GIS layers (shapefiles, GeoJSON) with custom styling. The UI will automatically pick up new workspaces from the configuration.

For complete workspace configuration options including shapefile layers and styling, see **[CONFIGURATION.md](CONFIGURATION.md)**.

### Selecting a workspace via URL
You can preselect a workspace by adding a query parameter to the URL: `?workspace=<key>`.

If the key is invalid or missing, the app will fall back to the first workspace from `config.json`.

Examples:
- `/` → selects the first workspace
- `/?workspace=zap_v13` → selects the `zap_v13` workspace

Browser navigation (back/forward) stays in sync with the selected workspace, and changing the workspace from the dropdown updates the URL so links are shareable.


## Development

Run the local server for development:

```bash
npm run dev
```

## Running Tests

To run the tests, use the following commands:
```bash
# Run all tests
npm test

# Generate coverage report
npm test -- --coverage
# or
npx vitest run --coverage
```

## Documentation

The API documentation is available under http://atmoswing.org/atmoswing-web-viewer

### Generating Documentation

The project includes comprehensive JSDoc API documentation. To generate and view it:

```bash
# Generate documentation (generated docs will be in the docs/ directory)
npm run docs
```

The documentation is also automatically generated and deployed to GitHub Pages on every push to the main branch.

### Contributing to Documentation

When adding or modifying code, please include JSDoc comments for all public APIs. See [DOCUMENTATION.md](DOCUMENTATION.md) for detailed guidelines on writing documentation.

Example:

```javascript
/**
 * Brief description of the function.
 *
 * @param {string} param - Parameter description
 * @returns {Promise<Object>} Return value description
 */
export async function myFunction(param) {
  // implementation
}
```

## License
See `LICENSE`.
