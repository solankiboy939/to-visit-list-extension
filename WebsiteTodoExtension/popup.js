document.addEventListener('DOMContentLoaded', function() {
  const saveButton = document.getElementById('save-current');
  const savedList = document.getElementById('saved-list');
  const emptyState = document.getElementById('empty-state');
  const searchInput = document.getElementById('search');
  const categoryFilter = document.getElementById('category-filter');
  const toggleDark = document.getElementById('toggle-dark');
  const exportBtn = document.getElementById('export-btn');
  const importBtn = document.getElementById('import-btn');
  const importFile = document.getElementById('import-file');

  const totalSavedEl = document.getElementById('total-saved');
  const totalVisitedEl = document.getElementById('total-visited');
  const weeklyCountEl = document.getElementById('weekly-count');

  // Initialize theme
  applyTheme();

  // Load saved sites
  loadSavedSites();

  // Save current tab
  saveButton.addEventListener('click', saveCurrentTab);

  // Search & filter
  searchInput.addEventListener('input', loadSavedSites);
  categoryFilter.addEventListener('change', loadSavedSites);

  // Toggle dark mode
  toggleDark.addEventListener('click', toggleDarkMode);

  // Export/Import
  exportBtn.addEventListener('click', exportData);
  importBtn.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', importData);

  // ========= FUNCTIONS =========

  function saveCurrentTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      const tab = tabs[0];
      if (!tab || !tab.url || !tab.title) return;

      chrome.storage.sync.get(['savedSites'], function(result) {
        let savedSites = result.savedSites || [];

        if (savedSites.some(site => site.url === tab.url)) {
          alert("Already saved!");
          return;
        }

        const newSite = {
          url: tab.url,
          title: tab.title,
          category: "general",
          addedAt: Date.now(),
          visitedCount: 0,
          lastVisited: null
        };

        savedSites.push(newSite);
        chrome.storage.sync.set({ savedSites }, function() {
          showNotification("✅ Saved!", tab.title);
          loadSavedSites();
        });
      });
    });
  }

  function loadSavedSites() {
    chrome.storage.sync.get(['savedSites'], function(result) {
      let savedSites = result.savedSites || [];
      const searchTerm = searchInput.value.toLowerCase();
      const category = categoryFilter.value;

      // Filter
      if (searchTerm) {
        savedSites = savedSites.filter(site =>
          site.title.toLowerCase().includes(searchTerm) ||
          site.url.toLowerCase().includes(searchTerm)
        );
      }
      if (category) {
        savedSites = savedSites.filter(site => site.category === category);
      }

      // Stats
      const now = new Date();
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      const weekly = savedSites.filter(site =>
        site.lastVisited && new Date(site.lastVisited) >= startOfWeek
      ).length;

      totalSavedEl.textContent = result.savedSites?.length || 0;
      totalVisitedEl.textContent = savedSites.reduce((sum, site) => sum + site.visitedCount, 0);
      weeklyCountEl.textContent = weekly;

      // Render
      savedList.innerHTML = '';
      if (savedSites.length === 0) {
        showRandomQuote();
        function showRandomQuote() {
  const quotes = [
    "Focus is your superpower. – You 😎",
    "Zero distractions = Infinite productivity. 🧘‍♂️",
    "You cleared your list. Now own your day. 🚀",
    "One tab at a time. That’s how legends focus. 🏆",
    "Your mind is calm. Your list is empty. Perfect. 🌿"
  ];
  const quoteEl = document.querySelector('.illustration');
  if (quoteEl) {
    quoteEl.textContent = quotes[Math.floor(Math.random() * quotes.length)];
  }
}
        emptyState.style.display = 'block';
      } else {
        emptyState.style.display = 'none';
        savedSites.forEach((site, index) => {
          const li = document.createElement('li');

          const siteInfo = document.createElement('div');
          siteInfo.className = 'site-info';

          const favicon = document.createElement('img');
          favicon.className = 'favicon';
          favicon.src = `https://www.google.com/s2/favicons?domain=${site.url}&sz=16`;
          favicon.alt = "";

          const link = document.createElement('a');
          link.href = site.url;
          link.className = 'site-title';
          link.textContent = site.title || site.url;
          link.target = '_blank';
          link.addEventListener('click', function(e) {
            markVisited(index);
          });

          siteInfo.appendChild(favicon);
          siteInfo.appendChild(link);
          li.appendChild(siteInfo);

          // Meta info
          const meta = document.createElement('div');
          meta.className = 'meta';
          const visits = site.visitedCount > 0 ? `Visited ${site.visitedCount}x` : "Not visited";
          const last = site.lastVisited ? ` · ${formatDate(site.lastVisited)}` : "";
          meta.textContent = `${visits}${last} · ${site.category}`;
          li.appendChild(meta);

          // Delete button
            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '✓';
            deleteBtn.title = "Mark as visited / Remove";
            deleteBtn.addEventListener('click', function() {
            if (confirm("✅ Mark as visited and remove from list?")) {
                deleteBtn.textContent = '🎉';
                setTimeout(() => {
                removeSite(index);
                }, 300);
            }
            });

          li.appendChild(deleteBtn);
          savedList.appendChild(li);
        });
      }
    });
  }

  function markVisited(index) {
    chrome.storage.sync.get(['savedSites'], function(result) {
      let savedSites = result.savedSites || [];
      if (index >= savedSites.length) return;

      savedSites[index].visitedCount++;
      savedSites[index].lastVisited = Date.now();

      chrome.storage.sync.set({ savedSites }, function() {
        loadSavedSites();
      });
    });
  }

let toastTimeout;

function removeSite(index) {
  chrome.storage.sync.get(['savedSites'], function(result) {
    let savedSites = result.savedSites || [];
    if (index >= savedSites.length) return;

    const deletedItem = { ...savedSites[index] }; // backup for undo
    savedSites.splice(index, 1);

    chrome.storage.sync.set({ savedSites }, function() {
      loadSavedSites();
      showUndoToast(deletedItem, index);
    });
  });
}

function showUndoToast(item, originalIndex) {
  // पुराना toast हटाएं (अगर हो)
  const existingToast = document.getElementById('undo-toast');
  if (existingToast) existingToast.remove();
  if (toastTimeout) clearTimeout(toastTimeout);

  // नया toast बनाएं
  const toast = document.createElement('div');
  toast.id = 'undo-toast';
  toast.innerHTML = `
    <span>Removed “${item.title}”</span>
    <button id="undo-btn">Undo</button>
  `;
  toast.style.cssText = `
    position: fixed;
    bottom: 15px;
    left: 50%;
    transform: translateX(-50%);
    background: #333;
    color: white;
    padding: 12px 20px;
    border-radius: 20px;
    box-shadow: 0 3px 10px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    z-index: 9999;
  `;

  document.body.appendChild(toast);

  // Undo button
  document.getElementById('undo-btn').addEventListener('click', function() {
    undoDelete(item, originalIndex);
    toast.remove();
  });

  // Auto-hide after 5s
  toastTimeout = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.5s';
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 500);
  }, 5000);
}

function undoDelete(item, index) {
  chrome.storage.sync.get(['savedSites'], function(result) {
    let savedSites = result.savedSites || [];
    savedSites.splice(index, 0, item); // वापस insert करें
    chrome.storage.sync.set({ savedSites }, loadSavedSites);
  });
}

  function formatDate(timestamp) {
    const date = new Date(timestamp);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return "Today";
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function toggleDarkMode() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    document.body.setAttribute('data-theme', isDark ? 'light' : 'dark');
    chrome.storage.local.set({ darkMode: !isDark });
  }

  function applyTheme() {
    chrome.storage.local.get(['darkMode'], function(result) {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const darkMode = result.darkMode !== undefined ? result.darkMode : prefersDark;
      document.body.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    });
  }

  function exportData() {
    chrome.storage.sync.get(['savedSites'], function(result) {
      const dataStr = "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result.savedSites, null, 2));
      const dlAnchorElem = document.createElement('a');
      dlAnchorElem.setAttribute("href", dataStr);
      dlAnchorElem.setAttribute("download", "to-visit-list.json");
      dlAnchorElem.click();
    });
  }

  function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const sites = JSON.parse(e.target.result);
        if (!Array.isArray(sites)) throw new Error("Invalid format");
        chrome.storage.sync.set({ savedSites: sites }, function() {
          showNotification("✅ Imported!", `${sites.length} sites`);
          loadSavedSites();
        });
      } catch (err) {
        alert("Invalid file format. Please import a valid JSON.");
      }
    };
    reader.readAsText(file);
    importFile.value = ""; // reset
  }

  function showNotification(title, message) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: title,
      message: message,
      priority: 0
    });
  }
});
