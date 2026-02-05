let listContainer = null;

export function renderEntityList(entities, onSelect, title) {
  listContainer = document.getElementById('entity-list');
  listContainer.innerHTML = '';

  if (title) {
    const header = document.createElement('div');
    header.className = 'entity-list-header';
    header.textContent = title;
    listContainer.appendChild(header);
  }

  if (!entities.length) {
    listContainer.innerHTML += '<div class="entity-list-empty">No items to show</div>';
    return;
  }

  entities.forEach(entity => {
    const row = createEntityRow(entity, onSelect);
    listContainer.appendChild(row);
  });
}

export function updateEntityList(entities, onSelect) {
  if (!listContainer) return;

  // Update existing rows in-place, or re-render if count changed
  const rows = listContainer.querySelectorAll('.entity-row');
  if (rows.length !== entities.length) {
    renderEntityList(entities, onSelect);
    return;
  }

  rows.forEach((row, i) => {
    const entity = entities[i];
    if (!entity) return;

    // Update time
    const timeEl = row.querySelector('.entity-time');
    if (timeEl) {
      timeEl.textContent = getRelativeTime(entity.lastUpdated);
    }

    // Update subtitle if needed
    const subtitleEl = row.querySelector('.entity-subtitle');
    if (subtitleEl && entity.subtitle) {
      subtitleEl.textContent = entity.subtitle;
    }
  });
}

function createEntityRow(entity, onSelect) {
  const row = document.createElement('div');
  row.className = 'entity-row';
  row.dataset.id = entity.id;

  const avatarContent = entity.icon
    ? `<span class="entity-avatar-icon">${entity.icon}</span>`
    : `<span class="entity-avatar-label">${entity.initials || '?'}</span>`;

  row.innerHTML = `
    <div class="entity-avatar" style="--entity-color: ${entity.color}">
      ${avatarContent}
    </div>
    <div class="entity-info">
      <div class="entity-name">${entity.name}</div>
      <div class="entity-subtitle">${entity.subtitle || ''}</div>
    </div>
    <div class="entity-meta">
      <div class="entity-time">${getRelativeTime(entity.lastUpdated)}</div>
      <svg class="entity-chevron" width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1l5 5-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
  `;

  row.addEventListener('click', () => onSelect(entity));
  return row;
}

function getRelativeTime(timestamp) {
  if (!timestamp) return '';
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 10) return 'Now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}
