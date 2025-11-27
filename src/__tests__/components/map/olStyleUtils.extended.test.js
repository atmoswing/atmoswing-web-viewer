import { describe, it, expect, vi } from 'vitest';
import { styleFromConfigObj, candidateStyleUrlsForDataUrl, tryLoadQmlStyle, resolveOverlayStyle } from '@/components/map/utils/olStyleUtils.js';

// Mock OpenLayers modules
vi.mock('ol/style', () => ({
  Style: vi.fn((config) => ({ __style: true, ...config })),
  Fill: vi.fn((config) => ({ __fill: true, ...config })),
  Stroke: vi.fn((config) => ({ __stroke: true, ...config })),
  Circle: vi.fn((config) => ({ __circle: true, ...config }))
}));

describe('olStyleUtils - styleFromConfigObj', () => {
  it('returns a function that creates styles based on geometry type', () => {
    const styleFn = styleFromConfigObj({
      line: { stroke: { color: '#ff0000', width: 3 } },
      polygon: { fill: { color: 'rgba(0,255,0,0.3)' } },
      point: { circle: { radius: 8 } }
    });

    expect(typeof styleFn).toBe('function');

    // Mock features with different geometry types
    const polygonFeature = {
      getGeometry: () => ({ getType: () => 'Polygon' })
    };
    const lineFeature = {
      getGeometry: () => ({ getType: () => 'LineString' })
    };
    const pointFeature = {
      getGeometry: () => ({ getType: () => 'Point' })
    };

    const polyStyle = styleFn(polygonFeature);
    const lineStyle = styleFn(lineFeature);
    const pointStyle = styleFn(pointFeature);

    expect(polyStyle).toBeDefined();
    expect(lineStyle).toBeDefined();
    expect(pointStyle).toBeDefined();
  });

  it('handles MultiPolygon and MultiLineString geometries', () => {
    const styleFn = styleFromConfigObj({});

    const multiPolygon = {
      getGeometry: () => ({ getType: () => 'MultiPolygon' })
    };
    const multiLine = {
      getGeometry: () => ({ getType: () => 'MultiLineString' })
    };

    const polyStyle = styleFn(multiPolygon);
    const lineStyle = styleFn(multiLine);

    expect(polyStyle).toBeDefined();
    expect(lineStyle).toBeDefined();
  });

  it('uses fallback defaults when config is empty', () => {
    const styleFn = styleFromConfigObj({});
    const feature = {
      getGeometry: () => ({ getType: () => 'Point' })
    };

    const style = styleFn(feature);
    expect(style).toBeDefined();
  });

  it('handles missing geometry gracefully', () => {
    const styleFn = styleFromConfigObj({});
    const feature = {
      getGeometry: () => null
    };

    const style = styleFn(feature);
    expect(style).toBeDefined(); // Should return point style as default
  });

  it('accepts legacy point.circle structure', () => {
    const styleFn = styleFromConfigObj({
      point: {
        circle: {
          radius: 10,
          stroke: { color: '#000', width: 2 },
          fill: { color: '#fff' }
        }
      }
    });

    expect(typeof styleFn).toBe('function');
  });

  it('accepts direct point structure', () => {
    const styleFn = styleFromConfigObj({
      circle: {
        radius: 10,
        stroke: { color: '#000', width: 2 }
      }
    });

    expect(typeof styleFn).toBe('function');
  });
});

describe('olStyleUtils - candidateStyleUrlsForDataUrl', () => {
  it('generates .qml and .qmd candidates for .zip file', () => {
    const candidates = candidateStyleUrlsForDataUrl('https://example.com/data/layer.zip');
    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toBe('https://example.com/data/layer.qml');
    expect(candidates[1]).toBe('https://example.com/data/layer.qmd');
  });

  it('generates candidates for .shp file', () => {
    const candidates = candidateStyleUrlsForDataUrl('https://example.com/layer.shp');
    expect(candidates[0]).toBe('https://example.com/layer.qml');
  });

  it('generates candidates for .geojson file', () => {
    const candidates = candidateStyleUrlsForDataUrl('https://example.com/layer.geojson');
    expect(candidates[0]).toBe('https://example.com/layer.qml');
  });

  it('handles relative paths', () => {
    const candidates = candidateStyleUrlsForDataUrl('/data/layer.json');
    expect(candidates[0]).toContain('layer.qml');
  });

  it('handles invalid URLs gracefully', () => {
    const candidates = candidateStyleUrlsForDataUrl('not a url.zip');
    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toContain('.qml');
  });

  it('handles empty input', () => {
    const candidates = candidateStyleUrlsForDataUrl('');
    expect(candidates).toHaveLength(2);
  });
});

describe('olStyleUtils - tryLoadQmlStyle', () => {
  it('returns null when fetch fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const result = await tryLoadQmlStyle('https://example.com/style.qml');
    expect(result).toBeNull();
  });

  it('returns null when response is not ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404
    });
    const result = await tryLoadQmlStyle('https://example.com/style.qml');
    expect(result).toBeNull();
  });

  it('parses QML XML and returns style function', async () => {
    const qmlXml = `<?xml version="1.0"?>
      <qgis>
        <renderer-v2>
          <symbol>
            <layer>
              <prop k="line_color" v="255,0,0,255"/>
              <prop k="line_width" v="2"/>
              <prop k="fill_color" v="0,255,0,128"/>
            </layer>
          </symbol>
        </renderer-v2>
      </qgis>`;

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => qmlXml
    });

    const result = await tryLoadQmlStyle('https://example.com/style.qml');
    expect(result).not.toBeNull();
    expect(typeof result).toBe('function');
  });

  it('handles XML without expected properties', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '<qgis><empty/></qgis>'
    });

    const result = await tryLoadQmlStyle('https://example.com/style.qml');
    expect(typeof result).toBe('function'); // Returns default style function
  });
});

describe('olStyleUtils - resolveOverlayStyle', () => {
  it('uses item.style if provided', async () => {
    const item = {
      style: {
        line: { stroke: { color: '#ff0000' } }
      }
    };

    const result = await resolveOverlayStyle(item, () => 'default');
    expect(typeof result).toBe('function');
  });

  it('tries to load QML style from URL', async () => {
    const item = {
      url: 'https://example.com/layer.geojson'
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '<qgis><renderer-v2><symbol><layer><prop k="line_color" v="255,0,0,255"/></layer></symbol></renderer-v2></qgis>'
    });

    const result = await resolveOverlayStyle(item, () => 'default');
    expect(result).not.toBe('default');
  });

  it('returns defaultsStyleFn when no style found', async () => {
    const item = {
      url: 'https://example.com/layer.geojson'
    };

    global.fetch = vi.fn().mockRejectedValue(new Error('Not found'));

    const defaultFn = () => 'default-style';
    const result = await resolveOverlayStyle(item, defaultFn);
    expect(result).toBe(defaultFn);
  });

  it('handles item without style or url', async () => {
    const defaultFn = () => 'default-style';
    const result = await resolveOverlayStyle({}, defaultFn);
    expect(result).toBe(defaultFn);
  });
});

