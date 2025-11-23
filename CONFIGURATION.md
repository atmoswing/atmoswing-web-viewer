# Configuration Guide

This document describes the structure and available fields for configuring the AtmoSwing Web Viewer through the `public/config.json` file.

## Overview

The AtmoSwing Web Viewer uses a single runtime configuration file (`public/config.json`) that controls all aspects of the application including:
- API connection settings
- Map providers and layers
- Workspace definitions with GIS layers

The configuration is loaded at application startup and can be modified without rebuilding the application. Changes take effect after a hard refresh (Ctrl+F5).

## Configuration File Structure

```json
{
  "API_BASE_URL": "https://api.example.com",
  "ENTITIES_SOURCE_EPSG": "EPSG:4326",
  "API_DEBUG": false,
  "providers": [],
  "baseLayers": [],
  "overlayLayers": [],
  "workspaces": []
}
```

## Top-Level Fields

### API_BASE_URL
- **Type:** `string`
- **Required:** Yes
- **Description:** Base URL for the AtmoSwing API. Trailing slashes are automatically removed.
- **Example:** `"https://atmoswing-api-fr.terranum.ch"`

### ENTITIES_SOURCE_EPSG
- **Type:** `string`
- **Default:** `"EPSG:4326"`
- **Description:** EPSG code defining the coordinate reference system for entity coordinates from the API.
- **Example:** `"EPSG:2154"` (Lambert 93 for France)

### API_DEBUG
- **Type:** `boolean`
- **Default:** `false`
- **Description:** Enable debug mode for additional console logging of API operations and map layer loading.
- **Accepted values:** `true`, `false`, `"true"`, `"false"`, `"1"`, `"0"`, `"yes"`, `"no"`, `"on"`, `"off"`

## Providers

The `providers` array defines external map service providers (typically WMTS services).

### Provider Object

```json
{
  "name": "IGN",
  "wmtsUrl": "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetCapabilities"
}
```

#### Fields
- **name** (string, required): Unique identifier for the provider, referenced by layer configurations
- **wmtsUrl** (string, required): URL to the WMTS GetCapabilities document

## Base Layers

The `baseLayers` array defines background map layers. Users can switch between these as the base map.

### Base Layer Object (WMTS)

```json
{
  "title": "Plan IGN",
  "provider": "IGN",
  "type": "base",
  "visible": true,
  "source": "wmts",
  "wmtsLayer": "GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2",
  "format": "image/png"
}
```

#### Fields
- **title** (string, required): Display name shown in the layer switcher
- **provider** (string, required for WMTS): Name of the provider (must match a provider's `name` field)
- **type** (string): Layer type, typically `"base"` for base layers
- **visible** (boolean, default: false): Whether the layer is initially visible
- **source** (string, required): Source type, must be `"wmts"` for base layers
- **wmtsLayer** (string, required): Name of the WMTS layer from the provider's capabilities
- **format** (string, required): Image format (e.g., `"image/png"`, `"image/jpeg"`)

**Note:** The application also includes default base layers (ESRI World Imagery and OpenStreetMap) that are always available.

## Overlay Layers

The `overlayLayers` array defines global overlay layers visible across all workspaces. Supports WMTS and GeoJSON sources.

### WMTS Overlay Layer

```json
{
  "title": "Hydrographie (IGN)",
  "provider": "IGN",
  "visible": false,
  "source": "wmts",
  "wmtsLayer": "HYDROGRAPHY.HYDROGRAPHY",
  "format": "image/png",
  "style": "nolegend"
}
```

#### Fields
- **title** (string, required): Display name in the layer switcher
- **provider** (string, required): Provider name
- **visible** (boolean, default: false): Initial visibility
- **source** (string, required): Must be `"wmts"`
- **wmtsLayer** (string, required): WMTS layer name
- **format** (string, required): Image format
- **style** (string, optional): WMTS style name (e.g., `"nolegend"`)

### GeoJSON Overlay Layer

```json
{
  "title": "Vigilance Vigicrues",
  "source": "geojson",
  "url": "https://www.vigicrues.gouv.fr/services/InfoVigiCru.geojson",
  "visible": true,
  "valueAttr": "NivInfViCr",
  "lineWidth": 3,
  "refreshMinutes": 60,
  "colors": {
    "0": "#0077cc",
    "1": "#2ecc40",
    "2": "#fcf619",
    "3": "#ff851b",
    "4": "#ff4136"
  }
}
```

#### Fields
- **title** (string, required): Display name
- **source** (string, required): Must be `"geojson"`
- **url** (string, required): URL to the GeoJSON file
- **visible** (boolean, default: false): Initial visibility
- **valueAttr** (string, optional): Feature property name used for styling
- **lineWidth** (number, default: 2): Line width for line features
- **refreshMinutes** (number, optional): Auto-refresh interval in minutes
- **colors** (object, optional): Map of attribute values to colors for categorical styling
  - Keys are the values from `valueAttr`
  - Values are CSS color strings

## Workspaces

The `workspaces` array defines different geographic areas or projects, each with its own set of GIS layers.

### Workspace Object

```json
{
  "key": "zap_v13",
  "name": "ZAP (v13)",
  "shapefiles": []
}
```

#### Fields
- **key** (string, required): Unique identifier used in URLs (`?workspace=<key>`)
- **name** (string, required): Display name shown in the workspace selector
- **shapefiles** (array, required): Array of shapefile/GeoJSON layer definitions

### Workspace Layers (Shapefiles)

Each workspace can define multiple vector layers from shapefiles or GeoJSON files.

#### Shapefile/GeoJSON Layer Object

```json
{
  "name": "Terr. Compétence Crues",
  "url": "https://atmoswing-fr.terranum.ch/gis-layers/zap_v13/TCC.zip",
  "epsg": "EPSG:4326",
  "display": true,
  "style": {
    "polygon": {
      "stroke": {
        "color": "rgba(0, 0, 0, 0.8)",
        "width": 2
      },
      "fill": {
        "color": "rgba(0, 0, 0, 0.05)"
      }
    }
  }
}
```

#### Fields
- **name** (string, required): Display name in the layer switcher
- **url** (string, required): URL to the layer file
  - Supported formats: `.zip` (shapefile), `.shp`, `.geojson`, `.json`
- **epsg** or **projection** (string, default: `"EPSG:4326"`): Coordinate reference system of the source data
- **display** (boolean, default: false): Initial visibility

#### Style Configuration

The `style` object defines how features are rendered. Styles can be defined for different geometry types:

##### Polygon Style
```json
"style": {
  "polygon": {
    "stroke": {
      "color": "rgba(196, 60, 57, 0.6)",
      "width": 1.5
    },
    "fill": {
      "color": "rgba(196, 60, 57, 0.1)"
    }
  }
}
```

##### Line Style
```json
"style": {
  "line": {
    "stroke": {
      "color": "#0077cc",
      "width": 2
    }
  }
}
```

##### Point Style
```json
"style": {
  "point": {
    "circle": {
      "radius": 5,
      "stroke": {
        "color": "#003b8e",
        "width": 1.5
      },
      "fill": {
        "color": "rgba(0, 102, 255, 0.7)"
      }
    }
  }
}
```

#### Style Fields
- **stroke.color** (string): CSS color for lines and outlines
- **stroke.width** (number): Line width in pixels
- **fill.color** (string): CSS color for filled areas
- **circle.radius** (number): Radius in pixels for point features

**Note:** Colors can be specified in any CSS format:
- Named colors: `"blue"`
- Hex: `"#0077cc"`
- RGB: `"rgb(0, 119, 204)"`
- RGBA: `"rgba(0, 119, 204, 0.5)"`

## Complete Example

```json
{
  "API_BASE_URL": "https://atmoswing-api-fr.terranum.ch",
  "ENTITIES_SOURCE_EPSG": "EPSG:2154",
  "API_DEBUG": false,
  "providers": [
    {
      "name": "IGN",
      "wmtsUrl": "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetCapabilities"
    }
  ],
  "baseLayers": [
    {
      "title": "Plan IGN",
      "provider": "IGN",
      "type": "base",
      "visible": true,
      "source": "wmts",
      "wmtsLayer": "GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2",
      "format": "image/png"
    }
  ],
  "overlayLayers": [
    {
      "title": "Hydrographie (IGN)",
      "provider": "IGN",
      "visible": false,
      "source": "wmts",
      "wmtsLayer": "HYDROGRAPHY.HYDROGRAPHY",
      "format": "image/png",
      "style": "nolegend"
    },
    {
      "title": "Vigilance Vigicrues",
      "source": "geojson",
      "url": "https://www.vigicrues.gouv.fr/services/InfoVigiCru.geojson",
      "visible": true,
      "valueAttr": "NivInfViCr",
      "lineWidth": 3,
      "refreshMinutes": 60,
      "colors": {
        "0": "#0077cc",
        "1": "#2ecc40",
        "2": "#fcf619",
        "3": "#ff851b",
        "4": "#ff4136"
      }
    }
  ],
  "workspaces": [
    {
      "key": "demo",
      "name": "Demo Workspace",
      "shapefiles": [
        {
          "name": "Bassins",
          "url": "https://example.com/gis-layers/basins.zip",
          "epsg": "EPSG:2154",
          "display": true,
          "style": {
            "polygon": {
              "stroke": {
                "color": "rgba(255, 0, 255, 0.4)",
                "width": 1.5
              },
              "fill": {
                "color": "rgba(255, 0, 255, 0.1)"
              }
            }
          }
        },
        {
          "name": "Cours d'eau",
          "url": "https://example.com/gis-layers/rivers.zip",
          "epsg": "EPSG:2154",
          "display": false,
          "style": {
            "line": {
              "stroke": {
                "color": "#0077cc",
                "width": 2
              }
            }
          }
        }
      ]
    }
  ]
}
```

## URL Parameters

### Workspace Selection

You can preselect a workspace by adding a query parameter to the URL:

```
https://your-domain.com/?workspace=demo
```

- If the workspace key is invalid or missing, the first workspace from the configuration is used
- The workspace parameter is kept in sync with the UI, so workspace changes update the URL
- This makes workspace-specific URLs shareable

## Cache Control

The `config.json` file is fetched with `Cache-Control: no-store` (configured in `nginx.conf`), ensuring that clients always fetch the latest configuration. A hard refresh (Ctrl+F5) is recommended after configuration changes to clear any browser caching.

## Troubleshooting

### Layers Not Appearing
1. Check browser console for errors (enable `API_DEBUG: true`)
2. Verify WMTS capabilities URL is accessible
3. Ensure WMTS layer names match exactly (case-sensitive)
4. Verify shapefile URLs are publicly accessible
5. Check EPSG codes are valid and supported

### Workspace Not Found
1. Verify the workspace `key` in the URL matches the configuration
2. Check the configuration file is valid JSON
3. Ensure at least one workspace is defined

### Style Not Applied
1. Verify color format is valid CSS
2. Check geometry type matches the style type (polygon/line/point)
3. Ensure numeric values (width, radius) are positive numbers

