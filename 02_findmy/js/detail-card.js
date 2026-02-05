let cardEl = null;
let listEl = null;
let onBackCallback = null;
let onDirectionsCallback = null;

export function initDetailCard(onBack, onDirections) {
  cardEl = document.getElementById('detail-card');
  listEl = document.getElementById('entity-list');
  onBackCallback = onBack;
  onDirectionsCallback = onDirections;
}

export function showDetail(entity) {
  if (!cardEl) {
    cardEl = document.getElementById('detail-card');
    listEl = document.getElementById('entity-list');
  }

  const avatarContent = entity.icon
    ? `<span class="detail-avatar-icon">${entity.icon}</span>`
    : `<span class="detail-avatar-label">${entity.initials || '?'}</span>`;

  const time = getDetailTime(entity.lastUpdated);
  const coords = `${entity.position[1].toFixed(4)}, ${entity.position[0].toFixed(4)}`;

  cardEl.innerHTML = `
    <button class="detail-back" id="detail-back-btn">
      <svg class="detail-back-chevron" width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M7 1L1 7l6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Back
    </button>
    <div class="detail-header">
      <div class="detail-avatar" style="background: ${entity.color}">
        ${avatarContent}
      </div>
      <div class="detail-info">
        <div class="detail-name">${entity.name}</div>
        <div class="detail-subtitle">${entity.subtitle || ''}</div>
        <div class="detail-time">${time}</div>
      </div>
    </div>
    <div class="detail-actions">
      <button class="detail-action-btn" id="directions-btn">
        <span class="detail-action-icon">🧭</span>
        <span class="detail-action-label">Directions</span>
      </button>
      <button class="detail-action-btn">
        <span class="detail-action-icon">🔔</span>
        <span class="detail-action-label">Notify</span>
      </button>
      <button class="detail-action-btn">
        <span class="detail-action-icon">🔊</span>
        <span class="detail-action-label">Play Sound</span>
      </button>
    </div>
    <div class="detail-coords">
      <div class="detail-coords-label">Location</div>
      <div class="detail-coords-value">${coords}</div>
    </div>
  `;

  cardEl.classList.add('visible');
  listEl.style.display = 'none';

  // Back button
  document.getElementById('detail-back-btn').addEventListener('click', () => {
    hideDetail();
    if (onBackCallback) onBackCallback();
  });

  // Directions button
  const directionsBtn = document.getElementById('directions-btn');
  if (directionsBtn && onDirectionsCallback) {
    directionsBtn.addEventListener('click', () => {
      onDirectionsCallback(entity);
    });
  }
}

export function hideDetail() {
  if (!cardEl) {
    cardEl = document.getElementById('detail-card');
    listEl = document.getElementById('entity-list');
  }
  cardEl.classList.remove('visible');
  cardEl.innerHTML = '';
  listEl.style.display = '';
}

function getDetailTime(timestamp) {
  if (!timestamp) return '';
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 10) return 'Location updated just now';
  if (seconds < 60) return `Location updated ${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Location updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `Location updated ${hours}h ago`;
}
