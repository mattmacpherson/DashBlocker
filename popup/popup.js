document.addEventListener('DOMContentLoaded', function() {
  const toggleTwitterSwitch = document.getElementById('toggleTwitterSwitch');
  const toggleRedditSwitch = document.getElementById('toggleRedditSwitch');
  const blockedCountSpan = document.getElementById('blockedCount');
  
  // Define the keys for fetching count data
  const countKeys = [
    'blockedTotalCount',  // New name for the count
    'blockedTweetCount'   // Old name for backward compatibility
  ];
  
  // Function to load and display counts
  function loadCounts() {
    // Fetch counts from storage
    chrome.storage.sync.get(countKeys, function(result) {
      // Update total count, checking both new and old keys
      let totalCount = result.blockedTotalCount || result.blockedTweetCount || 0; // Default to 0
      if (blockedCountSpan) {
        blockedCountSpan.textContent = totalCount;
      } else {
        console.error("DeadDash: Could not find blockedCount element in popup.");
      }
      
      if (chrome.runtime.lastError) {
        console.error("DeadDash: Error loading counts:", chrome.runtime.lastError);
      }
    });
  }
  
  // Load counts when popup opens
  loadCounts();
  
  // Load the current state from storage
  chrome.storage.sync.get(['twitterBlockingEnabled', 'redditBlockingEnabled', 'emDashBlockingEnabled'], function(result) {
    // Use old setting as default if new ones aren't set yet
    const oldSetting = result.emDashBlockingEnabled !== false;
    
    // Default both toggles to enabled if not set, or use the old setting for backward compatibility
    const isTwitterBlockingEnabled = result.twitterBlockingEnabled !== undefined ? result.twitterBlockingEnabled : oldSetting;
    const isRedditBlockingEnabled = result.redditBlockingEnabled !== undefined ? result.redditBlockingEnabled : oldSetting;
    
    toggleTwitterSwitch.checked = isTwitterBlockingEnabled;
    toggleRedditSwitch.checked = isRedditBlockingEnabled;
  });
  
  // Function to notify content scripts of settings change
  function notifyContentScripts() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'settingsChanged'
        });
      }
    });
  }
  
  // Save state when Twitter toggle changes
  toggleTwitterSwitch.addEventListener('change', function() {
    const isTwitterBlockingEnabled = toggleTwitterSwitch.checked;
    
    // Save to storage
    chrome.storage.sync.set({ twitterBlockingEnabled: isTwitterBlockingEnabled }, function() {
      console.log('DeadDash: Twitter Em Dash Blocking ' + (isTwitterBlockingEnabled ? 'enabled' : 'disabled'));
      notifyContentScripts();
    });
  });
  
  // Save state when Reddit toggle changes
  toggleRedditSwitch.addEventListener('change', function() {
    const isRedditBlockingEnabled = toggleRedditSwitch.checked;
    
    // Save to storage
    chrome.storage.sync.set({ redditBlockingEnabled: isRedditBlockingEnabled }, function() {
      console.log('DeadDash: Reddit Em Dash Blocking ' + (isRedditBlockingEnabled ? 'enabled' : 'disabled'));
      notifyContentScripts();
    });
  });
});
