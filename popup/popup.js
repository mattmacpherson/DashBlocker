document.addEventListener('DOMContentLoaded', function() {
  const toggleSwitch = document.getElementById('toggleSwitch');
  const toggleEmojiSwitch = document.getElementById('toggleEmojiSwitch');
  const toggleThreadEmojiSwitch = document.getElementById('toggleThreadEmojiSwitch');
  const blockedCountSpan = document.getElementById('blockedCount');
  
  // Load the blocked count from storage
  chrome.storage.sync.get(['blockedTweetCount'], function(result) {
    let count = result.blockedTweetCount || 0; // Default to 0
    if (blockedCountSpan) {
      blockedCountSpan.textContent = count;
    } else {
      console.error("DeadDash: Could not find blockedCount element in popup.");
    }
    if (chrome.runtime.lastError) {
      console.error("DeadDash: Error loading count:", chrome.runtime.lastError);
    }
  });
  
  // Load the current state from storage
  chrome.storage.sync.get(['enabled', 'emojiBlockingEnabled', 'threadEmojiBlockingEnabled'], function(result) {
    // Default to enabled if not set
    const isEnabled = result.enabled !== false;
    toggleSwitch.checked = isEnabled;
    
    // Default to disabled for emoji blocking
    const isEmojiBlockingEnabled = result.emojiBlockingEnabled === true;
    toggleEmojiSwitch.checked = isEmojiBlockingEnabled;
    
    // Default to disabled for thread emoji blocking
    const isThreadEmojiBlockingEnabled = result.threadEmojiBlockingEnabled === true;
    toggleThreadEmojiSwitch.checked = isThreadEmojiBlockingEnabled;
  });
  
  // Save state when main toggle changes
  toggleSwitch.addEventListener('change', function() {
    const isEnabled = toggleSwitch.checked;
    
    // Save to storage
    chrome.storage.sync.set({ enabled: isEnabled }, function() {
      console.log('DeadDash: Extension ' + (isEnabled ? 'enabled' : 'disabled'));
      
      // Send message to content script
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs[0] && tabs[0].url.includes('x.com')) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleState', enabled: isEnabled });
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
        if (tabs[0] && tabs[0].url.includes('x.com')) {
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
        if (tabs[0] && tabs[0].url.includes('x.com')) {
          chrome.tabs.sendMessage(tabs[0].id, { 
            action: 'toggleThreadEmojiState', 
            threadEmojiBlockingEnabled: isThreadEmojiBlockingEnabled 
          });
        }
      });
    });
  });
});
