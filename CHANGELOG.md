# Changelog

All notable changes to the AtmoSwing Web Viewer are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows
[semantic versioning](https://semver.org/spec/v2.0.0.html).

A French version for forecasters and for the DREAL is kept alongside, in
[CHANGELOG.fr.md](CHANGELOG.fr.md).

## [Unreleased]

### Added

- **Clicking a lead square selects the method behind its colour** (*Évolution ①*). A square's
  colour is the most severe forecast among all methods at that lead; clicking it, or one of its
  sub-daily segments, now also selects the method giving that value, so the map, the synthesis
  panel and the method label switch to it. Daily squares compare daily methods, sub-daily segments
  6-hourly ones. On a tie the current method is kept, otherwise the first in the synthesis panel's
  order is taken. When the dominant method is already selected, its configuration is kept; when no
  method has a value at the lead, only the lead changes. The square's tooltip names that method,
  for the day and for each sub-daily segment. No API change: the per-method synthesis the panel
  already loads carries the values.
- **Forecast details window** (*Évolution ②*): one window with three tabs — Distribution, Criteria
  and Analogs — replacing the separate distribution and analog-details windows. It opens from the
  toolbar on the current selection, or from the time series on a given forecast.
- **Navigation between the time series and the forecast details.** Hovering the time series marks
  the nearest forecast date; clicking it opens the details on that lead, for the same station and
  method. A title-bar button does the same for the date shown on the map, so the feature is
  reachable without a mouse. The details window has a button back to the time series of its station,
  which brings the app's method and configuration along when the series would otherwise show
  another forecast. One window is open at a time.
- **Automatic choice of the relevant configuration.** The details window opens on the configuration
  that covers the selected station, rather than the first in the list, and follows the station when
  it changes. A configuration picked by hand is kept. With a configuration already chosen, the
  default station is one that configuration covers.
- **CSV export of the analogs table**, written to be opened by double-clicking it in a spreadsheet
  set to French: semicolons, comma decimals, a UTF-8 byte-order mark, translated column headers, and
  dates a spreadsheet reads as dates (`2007-08-04`, or `2006-11-10 18:00:00` for sub-daily methods).
- **The map opens on the workspace's area.** Each workspace in `config.json` can declare an optional
  `extent` (`[minLon, minLat, maxLon, maxLat]`, WGS84), shown as soon as the workspace is selected,
  before its stations load. Without it, the map starts on a world view as before. See
  `CONFIGURATION.md`.
- **A layer that fails to load is reported** with a warning, translated, naming the layer and the
  reason: IGN layers, overlays such as Vigicrues, and workspace layers. An overlay refreshed
  periodically warns once per outage, not at every refresh.

### Changed

- The toolbar has a single button for the forecast details, in place of the two previous ones.
- Exports that have nothing to write are greyed out, instead of silently producing no file.
- The details window shows that it is still loading until its selection is settled, rather than
  briefly claiming there is no data, and it reopens on the Distribution tab.
- A lead that a station does not offer falls back to the nearest one it does.
- The window needs one `/analogs` request per selection instead of three, and both windows share one
  request for which entities each configuration covers, instead of probing configurations one by one.
- **The map no longer waits for the IGN layers.** It used to stay blank until IGN's capabilities
  document (2.9 MB) was downloaded and parsed, holding back the stations and every overlay. The map
  now shows at once, and the IGN layers appear when ready. The document is fetched once per page
  instead of twice, providers are fetched in parallel, and a provider that does not answer within
  15 s loses only its own layers, with a warning.
- **IGN layers appear at once on later visits.** The part of the capabilities document the
  configured layers need (about 16 KB) is kept in the browser and refreshed in the background once
  older than a day. A first visit, or a browser blocking storage, behaves as before.
- **Fewer failed tile requests.** A tile that fails transiently is retried twice; a tile IGN reports
  as having no data is shown empty without retrying; and a WMTS layer is hidden when zoomed out
  beyond its tile grid (Hydrographie starts at zoom 6), which removes the bursts of requests for
  areas it does not cover. Tiles still failing after their retries are logged with the layer name.

### Fixed

- The charts no longer redraw on every render; hovering a best-analog marker used to rebuild the
  whole chart, replacing the element under the pointer.
- Best-analog markers are reachable by the pointer again: the axes no longer intercept it, and the
  markers are drawn above the return-period and run-date lines, so a marker on the zero line can be
  hovered for its tooltip.
- `useCachedRequest` never returns the previous key's data on the render where the key changes, so a
  value is never validated against another selection's list.
- Showing a warning no longer rebuilds the map. Every snackbar used to reset the view and reload
  the overlays, and a failing IGN layer could loop: its warning rebuilt the map, which failed and
  warned again.

### Removed

- The distribution and analog-details windows, their data hooks, and the analogs toolbar icon.
- The unused `getAnalogValues` API function: `/analogs` carries the values, the dates, the criteria
  and the ranks in one response.

## [1.0.0]

First tagged version.
