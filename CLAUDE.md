# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

AtmoSwing Web Viewer is a React 19 + Vite single-page app that visualizes analog-method precipitation forecasts. It is a **read-only client** for a separate AtmoSwing REST API: it fetches forecast data, renders entities (stations/points) on an OpenLayers map colored by forecast value, and opens modal charts (time series, distributions, analog details). There is no backend in this repo — it builds to static assets served by Nginx.

## Commands

```bash
npm run dev          # Vite dev server
npm run build        # Production build to dist/
npm run lint         # ESLint over the repo
npm run format       # Prettier write over src/**/*.{js,jsx}
npm test             # Run all tests once (vitest run)
npm run test:watch   # Vitest watch mode
npx vitest run path/to/file.test.js          # Run a single test file
npx vitest run -t "name of test"             # Run tests matching a name
npm test -- --coverage                       # Coverage report
npm run docs         # Generate JSDoc markdown into docs/
```

Use the `@` import alias for `src/` (configured in `vite.config.js` and `vitest.config.js`), e.g. `import config from '@/config.js'`.

## Architecture

### Runtime configuration (no rebuild needed)
All runtime settings come from `public/config.json`, fetched once at startup — **not** from build-time env vars. `src/config.js` holds a mutable singleton `config` object that `ConfigContext` populates via `updateConfig()` after fetching and normalizing. Anything outside React (e.g. `services/api.js`) reads this singleton directly. The file defines `API_BASE_URL`, map providers/layers, and `workspaces`. See `CONFIGURATION.md` for the full schema. In production it is served with `Cache-Control: no-store` (`nginx.conf`).

### Context provider stack
`Providers.jsx` nests contexts in a deliberate order (outer → inner): `ConfigProvider` → `SnackbarProvider` → `WorkspaceProvider` → `ForecastsProvider`. `ForecastsContext` is itself a composite (`ForecastsProvider`) wrapping six sub-contexts in order: `ForecastSession` → `Synthesis` → `Methods` → `Entities` → `SelectedEntity` → `ForecastValues`. **Order matters** — inner contexts consume outer ones via hooks. `ForecastsContext.jsx` re-exports the consumer hooks (`useMethods`, `useEntities`, `useSynthesis`, `useForecastSession`, `useSelectedEntity`, `useForecastValues`, `useForecastParameters`); import those rather than the sub-context files directly.

### Forecast data flow (the core domain model)
A forecast is addressed by a tuple that cascades through the contexts:

- **Workspace** (`WorkspaceContext`) ≈ a region. Selecting one clears all caches and loads its `last_forecast_date`. Synced to the URL `?workspace=<key>`; invalid/missing keys fall back to the first configured workspace.
- **Forecast date** (`ForecastSessionContext`) — the active base date plus `percentile`/`normalizationRef` parameters. `shiftForecastBaseDate()` searches forward/back in time for an existing forecast; `restoreLastAvailableForecast()` resets to the latest.
- **Method + config** (`MethodsContext`) — the analog method and its configuration, selected within the date.
- **Lead time / target date** (`SynthesisContext`) — derives daily vs. sub-daily lead arrays from the "total synthesis" response.
- **Entities** (`EntitiesContext`) — stations/points for the selected method+config; `relevantEntities` is the subset with data.
- **Selected entity** (`SelectedEntityContext`) — the clicked point, which drives the modals.

Most state changes (workspace switch, date shift) cascade by bumping `resetVersion` and clearing caches, so downstream contexts re-fetch. Changing workspace eagerly nulls `activeForecastDate` to prevent cross-workspace fetches with stale keys.

### API layer
`services/api.js` exposes one thin function per endpoint, grouped as Metadata / Forecast Data / Aggregations. All go through a private `request()` that:
- de-duplicates concurrent identical requests (in-flight `Map` keyed by endpoint),
- retries network errors and 5xx with exponential backoff (up to 3 retries),
- logs verbosely when `config.API_DEBUG` is on.

API responses are inconsistent in shape, so **always normalize** through `utils/apiNormalization.js` (e.g. `normalizeEntitiesResponse`, `normalizeMethodsAndConfigs`, `normalizeSynthesisHasLeads`) before using data. Cache-key construction and selection-validity guards live in `utils/contextGuards.js`.

### Caching
`hooks/useCachedRequest.js` is the standard data-fetching hook: a module-level `GLOBAL_CACHE` Map shared across all hook instances, keyed by a string `key`, with TTL support and request-cancellation via incrementing request IDs. Use TTL presets from `utils/cacheTTLs.js` (`SHORT_TTL` 2 min, `DEFAULT_TTL` 5 min, `LONG_TTL` 15 min). `clearCachedRequests(prefix?)` and `invalidateCachedKey(key)` clear entries (workspace switches call `clearCachedRequests()`).

### Map
`components/map/MapViewer.jsx` orchestrates OpenLayers via focused hooks in `components/map/hooks/` (`useMapInit`, `useForecastPoints`, `useMapInteractions`, `useOverlayConfigLayers`, `useOverlayGlobalLayers`, `useProjectionRegistration`, `useDarkMode`). Pure OL helpers (styles, projections, WMTS capabilities, legend stops) live in `components/map/utils/`. Non-WGS84 entity coordinates are reprojected with proj4 — `ENTITIES_SOURCE_EPSG` in config declares the source CRS.

### UI structure
`App.jsx` = sidebar + toolbar + map + lazy-loaded modals + snackbars, all under an `ErrorBoundary`. Sidebar panels live in `components/panels/`, modals in `components/modals/` (charts use D3; export-to-PDF via jsPDF/svg2pdf). MUI v7 + Emotion for UI; i18n via i18next (`src/i18n.js`, **default language French**, fallback English — translations are inline in that file, not separate JSON).

## Testing

Vitest + Testing Library + jsdom. Tests live in `src/__tests__/` mirroring the `src/` tree. `src/__tests__/setup.js` polyfills `matchMedia` and suppresses expected `act()` warnings. Coverage thresholds are enforced in `vitest.config.js` (lines/functions/statements 80%, branches 75%); the three heavy chart modals are excluded from coverage. Add tests alongside new utilities/hooks/components following the existing mirrored structure.

## Conventions

- All public functions, components, and hooks get JSDoc comments (the docs site is generated from them — see `DOCUMENTATION.md`). Start each file with a `@module` block.
- Prettier: 2-space indent, no tabs. ESLint allows unused vars matching `^[A-Z_]` (used to silence intentionally-unused capitalized refs).
- `config.json` and `CONFIGURATION.md` are the source of truth for runtime behavior — prefer adding a config field over hardcoding.
