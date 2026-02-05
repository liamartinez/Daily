let tabBar = null;
let onTabChange = null;

export function initTabs(categories, activeId, callback) {
  onTabChange = callback;
  tabBar = document.getElementById('tab-bar');
  tabBar.innerHTML = '';

  // Category tabs
  categories.forEach(cat => {
    const tab = document.createElement('button');
    tab.className = `tab-item${cat.id === activeId ? ' active' : ''}`;
    tab.dataset.id = cat.id;
    tab.innerHTML = `
      <span class="tab-icon">${cat.icon}</span>
      <span class="tab-label">${cat.label}</span>
    `;
    tab.addEventListener('click', () => selectTab(cat.id));
    tabBar.appendChild(tab);
  });

  // "Me" tab
  const meTab = document.createElement('button');
  meTab.className = 'tab-item';
  meTab.dataset.id = 'me';
  meTab.innerHTML = `
    <span class="tab-icon">📍</span>
    <span class="tab-label">Me</span>
  `;
  meTab.addEventListener('click', () => selectTab('me'));
  tabBar.appendChild(meTab);
}

function selectTab(id) {
  const tabs = tabBar.querySelectorAll('.tab-item');
  tabs.forEach(t => t.classList.toggle('active', t.dataset.id === id));

  if (onTabChange) {
    onTabChange(id === 'me' ? null : id);
  }
}
