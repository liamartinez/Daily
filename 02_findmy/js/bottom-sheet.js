let sheetEl = null;
let contentEl = null;
let currentDetent = 'half';
let isDragging = false;
let startY = 0;
let startTranslate = 0;

function getSheetHeight() {
  return sheetEl.offsetHeight;
}

// translateY: 0 = fully open, higher = more hidden
function getDetentTranslateY(detent) {
  const h = getSheetHeight();
  switch (detent) {
    case 'peek': return h - 160;
    case 'half': return h - 400;
    case 'full': return 0;
    default: return h - 340;
  }
}

export function initSheet() {
  sheetEl = document.getElementById('bottom-sheet');
  contentEl = sheetEl.querySelector('.sheet-content');

  setDetent('half');

  const handleArea = sheetEl.querySelector('.sheet-handle-area');

  handleArea.addEventListener('pointerdown', onDragStart, { passive: true });
  document.addEventListener('pointermove', onDragMove, { passive: false });
  document.addEventListener('pointerup', onDragEnd, { passive: true });

  sheetEl.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.sheet-handle-area')) return;
    if (contentEl.scrollTop <= 0 && currentDetent !== 'full') {
      onDragStart(e);
    }
  }, { passive: true });

  window.addEventListener('resize', () => {
    setDetent(currentDetent);
  });
}

function getTranslateY() {
  const transform = getComputedStyle(sheetEl).transform;
  if (transform === 'none') return 0;
  const matrix = new DOMMatrix(transform);
  return matrix.m42;
}

function onDragStart(e) {
  isDragging = true;
  startY = e.clientY;
  startTranslate = getTranslateY();
  sheetEl.classList.add('dragging');
}

function onDragMove(e) {
  if (!isDragging) return;
  e.preventDefault();

  const deltaY = e.clientY - startY;
  let newTranslate = startTranslate + deltaY;

  const minTranslate = 0;
  const maxTranslate = getDetentTranslateY('peek') + 30;

  newTranslate = Math.max(minTranslate, Math.min(maxTranslate, newTranslate));
  sheetEl.style.transform = `translateY(${newTranslate}px)`;
}

function onDragEnd() {
  if (!isDragging) return;
  isDragging = false;
  sheetEl.classList.remove('dragging');

  const currentY = getTranslateY();
  const velocity = currentY - startTranslate;

  let bestDetent = 'half';
  let bestDist = Infinity;

  for (const name of ['peek', 'half', 'full']) {
    const detentY = getDetentTranslateY(name);
    let dist = Math.abs(currentY - detentY);

    if (velocity > 30 && name === 'peek') dist -= 80;
    if (velocity > 80 && name === 'peek') dist -= 80;
    if (velocity < -30 && name === 'full') dist -= 80;
    if (velocity < -80 && name === 'full') dist -= 80;

    if (dist < bestDist) {
      bestDist = dist;
      bestDetent = name;
    }
  }

  setDetent(bestDetent);
}

export function setDetent(detent) {
  currentDetent = detent;
  const translateY = getDetentTranslateY(detent);
  sheetEl.style.transform = `translateY(${translateY}px)`;

  if (detent === 'full') {
    contentEl.style.overflowY = 'auto';
  } else {
    contentEl.style.overflowY = 'hidden';
    contentEl.scrollTop = 0;
  }
}

export function getDetent() {
  return currentDetent;
}
