document.addEventListener('DOMContentLoaded', function() {
  const toggleEmDashSwitch = document.getElementById('toggleEmDashSwitch');
  const toggleEmojiSwitch = document.getElementById('toggleEmojiSwitch');
  const toggleThreadEmojiSwitch = document.getElementById('toggleThreadEmojiSwitch');
  const togglePoliceEmojiSwitch = document.getElementById('togglePoliceEmojiSwitch');
  const blockedCountSpan = document.getElementById('blockedCount');
  const resetButton = document.getElementById('resetButton');
  
  // Get references to the count elements
  const emDashCountElement = document.getElementById('emDashCount');
  const pointingDownEmojiCountElement = document.getElementById('pointingDownEmojiCount');
  const threadEmojiCountElement = document.getElementById('threadEmojiCount');
  const policeEmojiCountElement = document.getElementById('policeEmojiCount');
  const unknownCountElement = document.getElementById('unknownCount');
  
  // Define the keys for fetching count data
  const countKeys = [
    'blockedTweetCount',
    'blocked_em_dash_count',
    'blocked_pointing_down_emoji_count',
    'blocked_thread_emoji_count',
    'blocked_police_emoji_count',
    'blocked_unknown_count'
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
      
      // Update detailed counts
      if (emDashCountElement) {
        emDashCountElement.textContent = result.blocked_em_dash_count || 0;
      }
      
      if (pointingDownEmojiCountElement) {
        pointingDownEmojiCountElement.textContent = result.blocked_pointing_down_emoji_count || 0;
      }
      
      if (threadEmojiCountElement) {
        threadEmojiCountElement.textContent = result.blocked_thread_emoji_count || 0;
      }
      
      if (policeEmojiCountElement) {
        policeEmojiCountElement.textContent = result.blocked_police_emoji_count || 0;
      }
      
      if (unknownCountElement) {
        unknownCountElement.textContent = result.blocked_unknown_count || 0;
      }
      
      if (chrome.runtime.lastError) {
        console.error("DeadDash: Error loading counts:", chrome.runtime.lastError);
      }
    });
  }
  
  // Load counts when popup opens
  loadCounts();
  
  // Implement reset functionality
  if (resetButton) {
    resetButton.addEventListener('click', function() {
      if (confirm('Are you sure you want to reset all block counts to zero?')) {
        // Create an object with all count keys set to 0
        const resetData = {};
        countKeys.forEach(key => resetData[key] = 0);
        
        // Update storage with reset values
        chrome.storage.sync.set(resetData, function() {
          if (chrome.runtime.lastError) {
            console.error("DeadDash: Error resetting counts:", chrome.runtime.lastError);
          } else {
            // Reload counts to display zeros
            loadCounts();
          }
        });
      }
    });
  }
  
  // Load the current state from storage
  chrome.storage.sync.get(['emDashBlockingEnabled', 'emojiBlockingEnabled', 'threadEmojiBlockingEnabled', 'policeEmojiBlockingEnabled'], function(result) {
    // Default em-dash blocking to enabled if not set
    const isEmDashBlockingEnabled = result.emDashBlockingEnabled !== false;
    toggleEmDashSwitch.checked = isEmDashBlockingEnabled;
    
    // Default to disabled for emoji blocking
    const isEmojiBlockingEnabled = result.emojiBlockingEnabled === true;
    toggleEmojiSwitch.checked = isEmojiBlockingEnabled;
    
    // Default to disabled for thread emoji blocking
    const isThreadEmojiBlockingEnabled = result.threadEmojiBlockingEnabled === true;
    toggleThreadEmojiSwitch.checked = isThreadEmojiBlockingEnabled;
    
    // Default to disabled for police car light emoji blocking
    const isPoliceEmojiBlockingEnabled = result.policeEmojiBlockingEnabled === true;
    togglePoliceEmojiSwitch.checked = isPoliceEmojiBlockingEnabled;
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
  
  // Save state when emoji toggle changes
  toggleEmojiSwitch.addEventListener('change', function() {
    const isEmojiBlockingEnabled = toggleEmojiSwitch.checked;
    
    // Save to storage
    chrome.storage.sync.set({ emojiBlockingEnabled: isEmojiBlockingEnabled }, function() {
      console.log('DeadDash: Emoji Blocking ' + (isEmojiBlockingEnabled ? 'enabled' : 'disabled'));
      
      // Send message to content script
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs[0] && tabs[0].url && (tabs[0].url.includes('x.com') || tabs[0].url.includes('twitter.com'))) {
          chrome.tabs.sendMessage(tabs[0].id, { 
            action: 'toggleEmojiState', 
            emojiBlockingEnabled: isEmojiBlockingEnabled 
          });
        }
      });
    });
  });
  
  // Save state when thread emoji toggle changes
  toggleThreadEmojiSwitch.addEventListener('change', function() {
    const isThreadEmojiBlockingEnabled = toggleThreadEmojiSwitch.checked;
    
    // Save to storage
    chrome.storage.sync.set({ threadEmojiBlockingEnabled: isThreadEmojiBlockingEnabled }, function() {
      console.log('DeadDash: Thread Emoji Blocking ' + (isThreadEmojiBlockingEnabled ? 'enabled' : 'disabled'));
      
      // Send message to content script
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs[0] && tabs[0].url && (tabs[0].url.includes('x.com') || tabs[0].url.includes('twitter.com'))) {
          chrome.tabs.sendMessage(tabs[0].id, { 
            action: 'toggleThreadEmojiState', 
            threadEmojiBlockingEnabled: isThreadEmojiBlockingEnabled 
          });
        }
      });
    });
  });
  
  // Save state when police emoji toggle changes
  togglePoliceEmojiSwitch.addEventListener('change', function() {
    const isPoliceEmojiBlockingEnabled = togglePoliceEmojiSwitch.checked;
    
    // Save to storage
    chrome.storage.sync.set({ policeEmojiBlockingEnabled: isPoliceEmojiBlockingEnabled }, function() {
      console.log('DeadDash: Police Emoji Blocking ' + (isPoliceEmojiBlockingEnabled ? 'enabled' : 'disabled'));
      
      // Send message to content script
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs[0] && tabs[0].url && (tabs[0].url.includes('x.com') || tabs[0].url.includes('twitter.com'))) {
          chrome.tabs.sendMessage(tabs[0].id, { 
            action: 'togglePoliceEmojiState', 
            policeEmojiBlockingEnabled: isPoliceEmojiBlockingEnabled 
          });
        }
      });
    });
  });
});
