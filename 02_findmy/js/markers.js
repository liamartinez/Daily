const markers = new Map(); // id -> { marker, element }
let selectedId = null;

export function createMarkers(entities, activeCategory, map, onSelect) {
  // Clear existing
  markers.forEach(({ marker }) => marker.remove());
  markers.clear();

  entities.forEach(entity => {
    const el = createMarkerElement(entity);
    const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat(entity.position)
      .addTo(map);

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      onSelect(entity);
    });

    markers.set(entity.id, { marker, element: el, entity });

    // Hide markers not in active category
    if (activeCategory && entity.category !== activeCategory) {
      el.style.display = 'none';
    }
  });
}

export function updateMarkerPositions(entities, activeCategory) {
  entities.forEach(entity => {
    const entry = markers.get(entity.id);
    if (!entry) return;

    entry.marker.setLngLat(entity.position);
    entry.entity = entity;

    // Show/hide based on category
    if (activeCategory && entity.category !== activeCategory) {
      entry.element.style.display = 'none';
    } else {
      entry.element.style.display = '';
    }
  });
}

export function selectMarker(id) {
  // Deselect previous
  if (selectedId) {
    const prev = markers.get(selectedId);
    if (prev) prev.element.classList.remove('selected');
  }

  selectedId = id;

  if (id) {
    const entry = markers.get(id);
    if (entry) entry.element.classList.add('selected');
  }
}

export function clearSelection() {
  selectMarker(null);
}

let meMarker = null;

export function createMeMarker(config, map) {
  if (!config.me) return;

  const el = document.createElement('div');
  el.className = 'marker marker-me';
  el.innerHTML = `
    <div class="marker-ring"></div>
    <div class="marker-body"></div>
  `;

  meMarker = new maplibregl.Marker({ element: el, anchor: 'center' })
    .setLngLat(config.me.position)
    .addTo(map);
}

export function showMeMarker(visible) {
  if (!meMarker) return;
  meMarker.getElement().style.display = visible ? '' : 'none';
}

function createMarkerElement(entity) {
  const wrapper = document.createElement('div');
  wrapper.className = 'marker';
  wrapper.style.setProperty('--marker-color', entity.color);

  const content = entity.icon
    ? `<span class="marker-icon">${entity.icon}</span>`
    : `<span class="marker-label">${entity.initials || '?'}</span>`;

  wrapper.innerHTML = `
    <div class="marker-ring"></div>
    <div class="marker-body">
      ${content}
    </div>
  `;

  return wrapper;
}
