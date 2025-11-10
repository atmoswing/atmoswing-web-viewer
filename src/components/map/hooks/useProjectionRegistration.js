import {useEffect, useRef} from 'react';
import proj4 from 'proj4';
import {register} from 'ol/proj/proj4';

const PREDEFINED = {
  'EPSG:2154': '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
  'EPSG:2056': '+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs +type=crs'
};

export default function useProjectionRegistration(epsg) {
  const lastRegisteredProjRef = useRef(null);
  useEffect(() => {
    if (!epsg || !String(epsg).startsWith('EPSG:')) return;
    if (lastRegisteredProjRef.current === epsg) return;
    if (!proj4.defs[epsg] && PREDEFINED[epsg]) proj4.defs(epsg, PREDEFINED[epsg]);
    try {
      register(proj4);
    } catch {
    }
    lastRegisteredProjRef.current = epsg;
  }, [epsg]);
  return lastRegisteredProjRef;
}

