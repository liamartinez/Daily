import { haversineDistance, formatDistance, formatWalkingTime } from './utils.js';

let cardEl = null;
let detailEl = null;
let listEl = null;
let onCloseCallback = null;

const WALK_SPEED_KMH = 5;
const STREET_FACTOR = 1.3;

export function initDirections(onClose) {
  cardEl = document.getElementById('directions-card');
  detailEl = document.getElementById('detail-card');
  listEl = document.getElementById('entity-list');
  onCloseCallback = onClose;
}

/**
 * Show the directions card for an entity.
 * Returns the route coordinates array for drawing on the map.
 */
export function showDirections(entity, mePosition) {
  if (!cardEl) {
    cardEl = document.getElementById('directions-card');
    detailEl = document.getElementById('detail-card');
    listEl = document.getElementById('entity-list');
  }

  // Calculate distance and time
  const straightLineKm = haversineDistance(mePosition, entity.position);
  const walkingDistanceKm = straightLineKm * STREET_FACTOR;
  const walkingTimeMinutes = (walkingDistanceKm / WALK_SPEED_KMH) * 60;
  const distance = formatDistance(walkingDistanceKm);
  const time = formatWalkingTime(walkingTimeMinutes);

  // Generate simulated route
  const routeCoords = generateSimulatedRoute(mePosition, entity.position);

  // Render
  cardEl.innerHTML = `
    <button class="directions-close" id="directions-close-btn">
      <svg class="directions-close-chevron" width="8" height="14" viewBox="0 0 8 14" fill="none">
        <path d="M7 1L1 7l6 6" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Back
    </button>

    <div class="directions-modes">
      <button class="directions-mode-btn" data-mode="drive">
        <div>🚗</div>
        <div>Drive</div>
      </button>
      <button class="directions-mode-btn active" data-mode="walk">
        <div>🚶</div>
        <div>Walk</div>
      </button>
      <button class="directions-mode-btn" data-mode="transit">
        <div>🚌</div>
        <div>Transit</div>
      </button>
      <button class="directions-mode-btn" data-mode="cycle">
        <div>🚲</div>
        <div>Cycle</div>
      </button>
    </div>

    <div class="directions-summary">
      <div class="directions-time">
        ${time.value} <span class="directions-time-unit">${time.unit}</span>
      </div>
      <div class="directions-distance">${distance}</div>
    </div>

    <button class="directions-go-btn">Go</button>

    <div class="directions-endpoints">
      <div class="directions-endpoint">
        <div class="directions-endpoint-dot origin"></div>
        <div class="directions-endpoint-label">My Location</div>
      </div>
      <div class="directions-endpoint">
        <div class="directions-endpoint-dot destination"></div>
        <div class="directions-endpoint-label">${entity.name}</div>
      </div>
    </div>
  `;

  // Show directions, hide detail and list
  cardEl.classList.add('visible');
  detailEl.classList.remove('visible');
  detailEl.innerHTML = '';
  listEl.style.display = 'none';

  // Wire close button
  document.getElementById('directions-close-btn').addEventListener('click', () => {
    hideDirections();
    if (onCloseCallback) onCloseCallback();
  });

  // Wire mode buttons (visual toggle only)
  const modeButtons = cardEl.querySelectorAll('.directions-mode-btn');
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      modeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  return routeCoords;
}

export function hideDirections() {
  if (!cardEl) {
    cardEl = document.getElementById('directions-card');
    detailEl = document.getElementById('detail-card');
    listEl = document.getElementById('entity-list');
  }
  cardEl.classList.remove('visible');
  cardEl.innerHTML = '';
}

export function isDirectionsVisible() {
  if (!cardEl) cardEl = document.getElementById('directions-card');
  return cardEl.classList.contains('visible');
}

/**
 * Generate a simulated street-grid route between two points.
 * Alternates horizontal and vertical segments to mimic city blocks.
 */
function generateSimulatedRoute(origin, destination) {
  const coords = [origin];
  const segments = 6;

  for (let i = 1; i <= segments; i++) {
    const t = i / (segments + 1);
    const baseLng = origin[0] + (destination[0] - origin[0]) * t;
    const baseLat = origin[1] + (destination[1] - origin[1]) * t;

    if (i % 2 === 1) {
      // Horizontal: use interpolated lng, keep previous lat
      coords.push([baseLng, coords[coords.length - 1][1]]);
    } else {
      // Vertical: keep previous lng, use interpolated lat
      coords.push([coords[coords.length - 1][0], baseLat]);
    }
  }

  coords.push(destination);
  return coords;
}
