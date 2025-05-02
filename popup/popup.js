document.addEventListener('DOMContentLoaded', function() {
  const toggleEmDashSwitch = document.getElementById('toggleEmDashSwitch');
  const blockedCountSpan = document.getElementById('blockedCount');
  
  // Define the keys for fetching count data
  const countKeys = [
    'blockedTweetCount'
  ];
  
  // Function to load and display counts
  function loadCounts() {
    // Fetch counts from storage
    chrome.storage.sync.get(countKeys, function(result) {
      // Update total count
      let totalCount = result.blockedTweetCount || 0; // Default to 0
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
  chrome.storage.sync.get(['emDashBlockingEnabled'], function(result) {
    // Default em-dash blocking to enabled if not set
    const isEmDashBlockingEnabled = result.emDashBlockingEnabled !== false;
    toggleEmDashSwitch.checked = isEmDashBlockingEnabled;
  });
  
  // Save state when em-dash toggle changes
  toggleEmDashSwitch.addEventListener('change', function() {
    const isEmDashBlockingEnabled = toggleEmDashSwitch.checked;
    
    // Save to storage
    chrome.storage.sync.set({ emDashBlockingEnabled: isEmDashBlockingEnabled }, function() {
      console.log('DeadDash: Em Dash Blocking ' + (isEmDashBlockingEnabled ? 'enabled' : 'disabled'));
      
      // Send message to content script
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs[0] && tabs[0].url && (tabs[0].url.includes('x.com') || tabs[0].url.includes('twitter.com'))) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'toggleEmDashState',
            emDashBlockingEnabled: isEmDashBlockingEnabled
          });
        }
      });
    });
  });
});
