/**
 * Calculate distance between two [lng, lat] points in kilometers.
 */
export function haversineDistance(pos1, pos2) {
  const R = 6371; // Earth radius in km
  const dLat = toRad(pos2[1] - pos1[1]);
  const dLng = toRad(pos2[0] - pos1[0]);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(pos1[1])) * Math.cos(toRad(pos2[1])) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate bearing from pos1 to pos2 in degrees.
 */
export function bearing(pos1, pos2) {
  const dLng = toRad(pos2[0] - pos1[0]);
  const lat1 = toRad(pos1[1]);
  const lat2 = toRad(pos2[1]);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) -
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Format a distance in km to a human-readable string.
 */
export function formatDistance(km) {
  if (km < 0.1) return `${Math.round(km * 1000)} m`;
  if (km < 1) return `${Math.round(km * 100) / 100} km`;
  return `${Math.round(km * 10) / 10} km`;
}

/**
 * Format walking time in minutes to { value, unit } for display.
 */
export function formatWalkingTime(minutes) {
  const rounded = Math.max(1, Math.round(minutes));
  if (rounded < 60) {
    return { value: rounded, unit: 'min' };
  }
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  if (mins === 0) {
    return { value: hours, unit: 'hr' };
  }
  return { value: `${hours} hr ${mins}`, unit: 'min' };
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

function toDeg(rad) {
  return rad * (180 / Math.PI);
}
