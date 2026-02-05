let intervalId = null;
const entityState = new Map(); // internal movement state per entity

export function startSimulation(entities, bounds, onUpdate) {
  // Initialize internal state for each entity
  entities.forEach(entity => {
    entityState.set(entity.id, {
      heading: entity.movement?.heading || Math.random() * 360,
      paused: false,
      waypointIndex: 0,
      centerLng: entity.position[0],
      centerLat: entity.position[1],
      angle: 0,
    });
  });

  intervalId = setInterval(() => {
    entities.forEach(entity => {
      const movement = entity.movement;
      if (!movement || movement.pattern === 'stationary') return;

      const state = entityState.get(entity.id);
      if (!state || state.paused) return;

      switch (movement.pattern) {
        case 'random-walk':
          updateRandomWalk(entity, state, movement, bounds);
          break;
        case 'linear':
          updateLinear(entity, state, movement, bounds);
          break;
        case 'circular':
          updateCircular(entity, state, movement);
          break;
        case 'waypoints':
          updateWaypoints(entity, state, movement);
          break;
      }

      entity.lastUpdated = Date.now();
    });

    onUpdate(entities);
  }, 1000);
}

export function stopSimulation() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function updateRandomWalk(entity, state, movement, bounds) {
  // Occasionally change heading
  if (Math.random() < 0.05) {
    state.heading += (Math.random() - 0.5) * 120;
  }

  // Occasionally pause
  if (Math.random() < 0.008) {
    state.paused = true;
    setTimeout(() => { state.paused = false; }, 3000 + Math.random() * 7000);
    return;
  }

  const speed = movement.speed;
  const rad = (state.heading * Math.PI) / 180;

  entity.position[0] += Math.cos(rad) * speed;
  entity.position[1] += Math.sin(rad) * speed;

  clampToBounds(entity, bounds, state);
}

function updateLinear(entity, state, movement, bounds) {
  const speed = movement.speed;
  const rad = (state.heading * Math.PI) / 180;

  entity.position[0] += Math.cos(rad) * speed;
  entity.position[1] += Math.sin(rad) * speed;

  // Bounce off bounds
  if (bounds) {
    if (entity.position[0] < bounds.west || entity.position[0] > bounds.east) {
      state.heading = 180 - state.heading;
    }
    if (entity.position[1] < bounds.south || entity.position[1] > bounds.north) {
      state.heading = -state.heading;
    }
  }

  clampToBounds(entity, bounds, state);
}

function updateCircular(entity, state, movement) {
  const radius = movement.radius || 0.002;
  const speed = movement.speed || 0.00005;

  state.angle += speed * 10;

  entity.position[0] = state.centerLng + Math.cos(state.angle) * radius;
  entity.position[1] = state.centerLat + Math.sin(state.angle) * radius;
}

function updateWaypoints(entity, state, movement) {
  const waypoints = movement.waypoints;
  if (!waypoints || !waypoints.length) return;

  const target = waypoints[state.waypointIndex];
  const dx = target[0] - entity.position[0];
  const dy = target[1] - entity.position[1];
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < movement.speed * 2) {
    // Reached waypoint, move to next
    state.waypointIndex = (state.waypointIndex + 1) % waypoints.length;
    return;
  }

  // Move toward target
  const speed = movement.speed;
  entity.position[0] += (dx / dist) * speed;
  entity.position[1] += (dy / dist) * speed;
}

function clampToBounds(entity, bounds, state) {
  if (!bounds) return;

  let bounced = false;

  if (entity.position[0] < bounds.west) {
    entity.position[0] = bounds.west;
    bounced = true;
  }
  if (entity.position[0] > bounds.east) {
    entity.position[0] = bounds.east;
    bounced = true;
  }
  if (entity.position[1] < bounds.south) {
    entity.position[1] = bounds.south;
    bounced = true;
  }
  if (entity.position[1] > bounds.north) {
    entity.position[1] = bounds.north;
    bounced = true;
  }

  // Reverse heading when hitting bounds
  if (bounced && state) {
    state.heading += 90 + Math.random() * 90;
  }
}
