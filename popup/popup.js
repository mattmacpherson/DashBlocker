document.addEventListener('DOMContentLoaded', function() {
  const toggleSwitch = document.getElementById('toggleSwitch');
  const blockedCountSpan = document.getElementById('blockedCount');
  
  // Load the blocked count from storage
  chrome.storage.sync.get(['blockedTweetCount'], function(result) {
    let count = result.blockedTweetCount || 0; // Default to 0
    if (blockedCountSpan) {
      blockedCountSpan.textContent = count;
    } else {
      console.error("DashBlocker: Could not find blockedCount element in popup.");
    }
    if (chrome.runtime.lastError) {
      console.error("DashBlocker: Error loading count:", chrome.runtime.lastError);
    }
  });
  
  // Load the current state from storage
  chrome.storage.sync.get(['enabled'], function(result) {
    // Default to enabled if not set
    const isEnabled = result.enabled !== false;
    toggleSwitch.checked = isEnabled;
  });
  
  // Save state when toggle changes
  toggleSwitch.addEventListener('change', function() {
    const isEnabled = toggleSwitch.checked;
    
    // Save to storage
    chrome.storage.sync.set({ enabled: isEnabled }, function() {
      console.log('DashBlocker: Extension ' + (isEnabled ? 'enabled' : 'disabled'));
      
      // Send message to content script
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs[0] && tabs[0].url.includes('x.com')) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleState', enabled: isEnabled });
        }
      });
    });
  });
});
