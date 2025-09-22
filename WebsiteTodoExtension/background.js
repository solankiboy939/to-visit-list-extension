// Handle keyboard shortcut
chrome.commands.onCommand.addListener((command) => {
  if (command === "save-current-tab") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab || !tab.url || !tab.title) return;

      chrome.storage.sync.get(['savedSites', 'settings'], (result) => {
        let savedSites = result.savedSites || [];
        let settings = result.settings || { darkMode: false, autoRemove: false };

        // Avoid duplicates
        if (savedSites.some(site => site.url === tab.url)) return;

        savedSites.push({
          url: tab.url,
          title: tab.title,
          category: "general",
          addedAt: Date.now(),
          visitedCount: 0,
          lastVisited: null
        });

        chrome.storage.sync.set({ savedSites }, () => {
          // Show notification
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon.png',
            title: '✅ Saved!',
            message: tab.title,
            priority: 0
          });
        });
      });
    });
  }
});