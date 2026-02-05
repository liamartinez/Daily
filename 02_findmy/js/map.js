let map = null;

export function initMap(container, config) {
  map = new maplibregl.Map({
    container,
    style: config.map.style,
    center: config.map.center,
    zoom: config.map.zoom,
    attributionControl: true,
    pitchWithRotate: false,
    dragRotate: false,
  });

  // No zoom controls — matches real Find My app

  return new Promise((resolve) => {
    map.on('load', () => resolve(map));
  });
}

export function getMap() {
  return map;
}

export function flyTo(lngLat, zoom) {
  if (!map) return;
  map.flyTo({
    center: lngLat,
    zoom: zoom || 15,
    duration: 800,
    essential: true,
  });
}

export function fitAllMarkers(entities) {
  if (!map || !entities.length) return;

  const bounds = new maplibregl.LngLatBounds();
  entities.forEach(e => bounds.extend(e.position));

  map.fitBounds(bounds, {
    padding: { top: 70, bottom: 400, left: 30, right: 30 },
    maxZoom: 15,
    duration: 800,
  });
}

export function drawRoute(coordinates) {
  if (!map) return;

  const geojson = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates,
    },
  };

  const source = map.getSource('route');
  if (source) {
    source.setData(geojson);
  } else {
    map.addSource('route', { type: 'geojson', data: geojson });
    map.addLayer({
      id: 'route-line',
      type: 'line',
      source: 'route',
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#007AFF',
        'line-width': 5,
        'line-opacity': 0.8,
      },
    });
  }
}

export function clearRoute() {
  if (!map) return;
  if (map.getLayer('route-line')) map.removeLayer('route-line');
  if (map.getSource('route')) map.removeSource('route');
}

export function fitRoute(coordinates) {
  if (!map || !coordinates.length) return;
  const bounds = new maplibregl.LngLatBounds();
  coordinates.forEach(coord => bounds.extend(coord));
  map.fitBounds(bounds, {
    padding: { top: 80, bottom: 340, left: 50, right: 50 },
    maxZoom: 15,
    duration: 800,
  });
}

export function onMapClick(callback) {
  if (!map) return;
  map.on('click', (e) => {
    // Only fire if the click was on the map itself, not a marker
    if (e.originalEvent.target === map.getCanvas()) {
      callback(e);
    }
  });
}
