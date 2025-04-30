// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get references to the display elements
    const emDashCountElement = document.getElementById('emDashCount');
    const pointingDownEmojiCountElement = document.getElementById('pointingDownEmojiCount');
    const threadEmojiCountElement = document.getElementById('threadEmojiCount');
    const policeEmojiCountElement = document.getElementById('policeEmojiCount');
    const unknownCountElement = document.getElementById('unknownCount');
    const totalCountElement = document.getElementById('totalCount');
    const resetButton = document.getElementById('resetButton');

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
            if (chrome.runtime.lastError) {
                console.error("DeadDash Analytics: Error loading counts:", chrome.runtime.lastError);
                return;
            }

            // Update the count displays with the fetched values, defaulting to 0 if not found
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
            
            if (totalCountElement) {
                totalCountElement.textContent = result.blockedTweetCount || 0;
            }
        });
    }

    // Load counts when page loads
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
                        console.error("DeadDash Analytics: Error resetting counts:", chrome.runtime.lastError);
                        alert('Failed to reset counts. Please try again.');
                    } else {
                        // Reload counts to display zeros
                        loadCounts();
                        alert('All counts have been reset to zero.');
                    }
                });
            }
        });
    }

    // Implement the close button functionality
    const closeButton = document.getElementById('closeButton');
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            window.close(); // Close the current window/tab
        });
    }
});
