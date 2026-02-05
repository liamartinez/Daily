import { APP_CONFIG, ENTITIES } from './config.js';
import { initMap, flyTo, fitAllMarkers, onMapClick, drawRoute, clearRoute, fitRoute } from './map.js';
import { initSheet, setDetent } from './bottom-sheet.js';
import { initTabs } from './tabs.js';
import { renderEntityList, updateEntityList } from './entity-list.js';
import { createMarkers, updateMarkerPositions, selectMarker, clearSelection, createMeMarker, showMeMarker } from './markers.js';
import { initDetailCard, showDetail, hideDetail } from './detail-card.js';
import { initDirections, showDirections, hideDirections, isDirectionsVisible } from './directions.js';
import { startSimulation } from './simulation.js';

// App state
const state = {
  activeCategory: APP_CONFIG.categories[0]?.id || null,
  selectedEntity: null,
  entities: ENTITIES.map(e => ({ ...e, position: [...e.position], lastUpdated: Date.now() })),
};

async function init() {
  // Set page title
  document.title = APP_CONFIG.title;

  // Init map
  const map = await initMap('map', APP_CONFIG);

  // Init bottom sheet
  initSheet();

  // Init tabs
  initTabs(APP_CONFIG.categories, state.activeCategory, (categoryId) => {
    // Clear directions if active
    if (isDirectionsVisible()) {
      hideDirections();
      clearRoute();
    }

    state.activeCategory = categoryId;
    state.selectedEntity = null;
    hideDetail();
    clearSelection();

    if (categoryId === null) {
      // "Me" tab — show user location, hide entity markers
      updateMarkerPositions(state.entities, '__none__');
      showMeMarker(true);
      renderEntityList([], onEntitySelect, APP_CONFIG.me.name);
      flyTo(APP_CONFIG.me.position, 15);
      return;
    }

    showMeMarker(false);
    const filtered = getFilteredEntities();
    renderEntityList(filtered, onEntitySelect, getActiveCategoryLabel());
    updateMarkerPositions(state.entities, state.activeCategory);
    if (filtered.length) fitAllMarkers(filtered);
  });

  // Init detail card with back and directions handlers
  initDetailCard(
    () => {
      state.selectedEntity = null;
      clearSelection();
    },
    (entity) => {
      onDirections(entity);
    }
  );

  // Init directions with close handler
  initDirections(() => {
    // Back from directions → return to detail card
    clearRoute();
    if (state.selectedEntity) {
      showDetail(state.selectedEntity);
      flyTo(state.selectedEntity.position, 15);
    }
  });

  // Render initial entity list
  const filtered = getFilteredEntities();
  renderEntityList(filtered, onEntitySelect, getActiveCategoryLabel());

  // Create map markers
  createMarkers(state.entities, state.activeCategory, map, onEntitySelect);

  // Create "Me" marker (always present, initially hidden)
  createMeMarker(APP_CONFIG, map);
  showMeMarker(false);

  // Clicking the map deselects
  onMapClick(() => {
    if (isDirectionsVisible()) {
      hideDirections();
      clearRoute();
    }
    if (state.selectedEntity) {
      state.selectedEntity = null;
      hideDetail();
      clearSelection();
    }
  });

  // Start simulation
  startSimulation(state.entities, APP_CONFIG.bounds, (updatedEntities) => {
    state.entities = updatedEntities;
    // Don't update entity list/markers when "Me" tab is active
    if (state.activeCategory === null) return;
    const filtered = getFilteredEntities();
    updateEntityList(filtered, onEntitySelect);
    updateMarkerPositions(state.entities, state.activeCategory);
  });

  // Fit map to show all initial entities
  if (filtered.length) fitAllMarkers(filtered);
}

function getFilteredEntities() {
  if (!state.activeCategory) return state.entities;
  return state.entities.filter(e => e.category === state.activeCategory);
}

function getActiveCategoryLabel() {
  const cat = APP_CONFIG.categories.find(c => c.id === state.activeCategory);
  return cat ? cat.label : APP_CONFIG.title;
}

function onDirections(entity) {
  const mePosition = APP_CONFIG.me.position;
  const routeCoords = showDirections(entity, mePosition);
  drawRoute(routeCoords);
  fitRoute(routeCoords);
  setDetent('half');
}

function onEntitySelect(entity) {
  state.selectedEntity = entity;
  selectMarker(entity.id);
  showDetail(entity);
  flyTo(entity.position, 15);
  setDetent('half');
}

init();
