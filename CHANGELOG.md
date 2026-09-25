# Changelog

All notable changes to the AtmoSwing Web Viewer are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows
[semantic versioning](https://semver.org/spec/v2.0.0.html).

A French version for forecasters and for the DREAL is kept alongside, in
[CHANGELOG.fr.md](CHANGELOG.fr.md).

## [Unreleased]

### Added

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

### Changed

- The toolbar has a single button for the forecast details, in place of the two previous ones.
- Exports that have nothing to write are greyed out, instead of silently producing no file.
- The details window shows that it is still loading until its selection is settled, rather than
  briefly claiming there is no data, and it reopens on the Distribution tab.
- A lead that a station does not offer falls back to the nearest one it does.
- The window needs one `/analogs` request per selection instead of three, and both windows share one
  request for which entities each configuration covers, instead of probing configurations one by one.

### Fixed

- The charts no longer redraw on every render; hovering a best-analog marker used to rebuild the
  whole chart, replacing the element under the pointer.
- Best-analog markers are reachable by the pointer again: the axes no longer intercept it, and the
  markers are drawn above the return-period and run-date lines, so a marker on the zero line can be
  hovered for its tooltip.
- `useCachedRequest` never returns the previous key's data on the render where the key changes, so a
  value is never validated against another selection's list.

### Removed

- The distribution and analog-details windows, their data hooks, and the analogs toolbar icon.
- The unused `getAnalogValues` API function: `/analogs` carries the values, the dates, the criteria
  and the ranks in one response.

## [1.0.0]

First tagged version.
