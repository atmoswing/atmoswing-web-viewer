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
npm run docs         # Generate JSDoc markdown into docs/ (fails if any section errors)
npm run docs:jsdoc   # Generate the raw jsdoc HTML site into docs-jsdoc/
```

Use the `@` import alias for `src/` (configured in `vite.config.js` and `vitest.config.js`), e.g. `import config from '@/config.js'`.

## Architecture

### Runtime configuration (no rebuild needed)
All runtime settings come from `public/config.json`, fetched once at startup — **not** from build-time env vars. `src/config.js` holds a mutable singleton `config` object that `ConfigContext` populates via `updateConfig()` after fetching and normalizing. Anything outside React (e.g. `services/api.js`) reads this singleton directly. The file defines `API_BASE_URL`, map providers/layers, and `workspaces`. See `CONFIGURATION.md` for the full schema. In production it is served with `Cache-Control: no-store` (`nginx.conf`).

### Context provider stack
`Providers.jsx` nests contexts in a deliberate order (outer → inner): `ConfigProvider` → `SnackbarProvider` → `WorkspaceProvider` → `ForecastsProvider`. `ForecastsContext` is itself a composite (`ForecastsProvider`) wrapping six sub-contexts in order: `ForecastSession` → `Synthesis` → `Methods` → `Entities` → `SelectedEntity` → `ForecastValues`. **Order matters** — inner contexts consume outer ones via hooks. The seven forecast files live in `contexts/forecast/`; `ConfigContext`, `SnackbarContext` and `WorkspaceContext` stay at the top of `contexts/`. `forecast/ForecastsContext.jsx` re-exports the consumer hooks (`useMethods`, `useEntities`, `useSynthesis`, `useForecastSession`, `useSelectedEntity`, `useForecastValues`, `useForecastParameters`); import those rather than the sub-context files directly.

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
`hooks/useCachedRequest.js` is the standard data-fetching hook: `useCachedRequest(key, fetchFn, options)`, backed by a module-level `GLOBAL_CACHE` Map shared across all hook instances, with TTL support and request-cancellation via incrementing request IDs. **The `key` is the single source of truth for refetching** — it must encode every value `fetchFn` reads, since there is no dependency array. A null key (or `enabled: false`) resets the hook to `initialData`, so a cleared selection never leaves the previous selection's data on screen. Use TTL presets from `utils/cacheTTLs.js` (`SHORT_TTL` 2 min, `DEFAULT_TTL` 5 min, `LONG_TTL` 15 min). `clearCachedRequests(prefix?)` and `invalidateCachedKey(key)` clear entries (workspace switches call `clearCachedRequests()`).

Because the cache is keyed by string, two callers share an entry only when they build the *identical* key. Resources fetched from more than one place therefore get their canonical key and hook in `hooks/forecastQueries.js` — `useMethodsAndConfigs`, `useEntitiesList`, `useReferenceValues` — rather than composing a key locally. These take the selection as arguments instead of reading context, so `WorkspaceContext` (which sits outside the forecast providers) can use them too; its methods prefetch and `MethodsContext` now hit one entry. **Never namespace a key by its consumer** (`dist_`, `modal_`): that stores one immutable response under several keys and re-fetches it per consumer. Name keys after the resource.

### Map
`components/map/MapViewer.jsx` orchestrates OpenLayers via focused hooks in `components/map/hooks/` (`useMapInit`, `useForecastPoints`, `useMapInteractions`, `useOverlayConfigLayers`, `useOverlayGlobalLayers`, `useProjectionRegistration`, `useDarkMode`). Pure OL helpers (styles, projections, WMTS capabilities, legend stops) live in `components/map/utils/`. Non-WGS84 entity coordinates are reprojected with proj4 — `ENTITIES_SOURCE_EPSG` in config declares the source CRS.

### Data hooks vs. views
Components do not call `services/api.js` directly — nothing under `components/**/*.jsx` imports it, and that invariant is worth keeping. Fetching, cache-key construction and normalization live in custom hooks next to their consumer: `components/modals/hooks/`, `components/panels/hooks/`, `components/map/hooks/`. The component keeps UI state and JSX. Pure drawing/geometry helpers sit beside them in `components/modals/charts/draw/` and `components/map/utils/`, which makes them testable without rendering.

### UI structure
`App.jsx` = sidebar + toolbar + map + snackbars, all under an `ErrorBoundary`. All three modals are lazy-loaded (`TimeSeriesModal` from `App.jsx`, the other two from `ToolBar.jsx`) so their D3/chart code stays out of the initial bundle — import them by path, never through a barrel, or the code splitting silently breaks. Sidebar panels live in `components/panels/`, modals in `components/modals/`; export-to-PDF via jsPDF/svg2pdf, loaded on demand inside `common/exportUtils.js`. The exporters **reject rather than log**: `ExportMenu` awaits them and raises an error snackbar, so a failed export is visible instead of a menu that just closes. MUI v7 + Emotion for UI; i18n via i18next (`src/i18n.js`, **default language French**, fallback English); translation strings live in `src/locales/en.json` and `fr.json`, one file per language, and a test asserts the two files define identical key sets.

## Testing

Vitest + Testing Library + jsdom. Tests live in `src/__tests__/` mirroring the `src/` tree. `src/__tests__/setup.js` polyfills `matchMedia` and suppresses expected `act()` warnings. Coverage thresholds are enforced in `vitest.config.js` under `coverage.thresholds` (lines/functions/statements 80%, branches 75%) — they must be nested there, since Vitest 2 silently ignores them if set directly on `coverage`. No source file is excluded from coverage: the modals' logic lives in hooks that are tested directly, so the components themselves are thin enough to measure. Add tests alongside new utilities/hooks/components following the existing mirrored structure.

## Conventions

- All public functions, components, and hooks get JSDoc comments (the docs site is generated from them — see `DOCUMENTATION.md`). Start each file with a `@module` block. The comment must sit **above** the declaration: one placed inside the function body documents nothing and the component silently vanishes from the docs. Types go through catharsis, which rejects tuples (`{[Date, Date]}`) and inline optional properties (`{{a?: boolean}}`) — use `Array<T>` and a `@typedef` instead. `npm run docs` exits non-zero when a section fails, so CI catches both.
- Prettier: 2-space indent, no tabs. ESLint allows unused vars matching `^[A-Z_]` (used to silence intentionally-unused capitalized refs).
- Styling is MUI `sx` props for component-level work; the global stylesheets in `src/styles/` cover layout and
  a few MUI overrides. Each stylesheet is imported by the component that owns it (`toolbar.css` from `ToolBar.jsx`,
  `sidebar.css` from `SideBar.jsx`, `panel.css` from `Panel.jsx`, `map.css` from `MapViewer.jsx`); `index.css` is the
  global base and `App.css` holds only the top-level layout.
- `config.json` and `CONFIGURATION.md` are the source of truth for runtime behavior — prefer adding a config field over hardcoding.
