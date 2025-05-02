console.log("DeadDash: Content script loaded and running on", window.location.href);

// Extension state
let isEmDashBlockingEnabled = true;

// Debug mode - set to true to enable verbose logging
const DEBUG_MODE = true;

// Enhanced debug function for this investigation
function debugInvestigation(area, message, data = null) {
    if (DEBUG_MODE) {
        console.log(`%c DeadDash INVESTIGATION [${area}]: ${message}`, "background: #FF5722; color: white; padding: 2px;", data || '');
    }
}

// Selectors for X/Twitter DOM elements
const TWEET_SELECTOR = 'article[data-testid="tweet"]';
const TWEET_TEXT_SELECTOR = 'div[data-testid="tweetText"]';

// Track hidden tweets to avoid redundant operations
const hiddenTweets = new WeakSet();

// Debug helper to log important messages
function debugLog(message, data = null) {
    if (DEBUG_MODE) {
        console.log("%c DeadDash: " + message, "background: #2196F3; color: white; padding: 2px;", data || '');
    }
}

// Check if text contains an em dash between word characters
function containsWordBoundEmDash(text) {
    // Regex: Looks for a word character (\w), followed by an em dash (—),
    // followed by another word character (\w)
    const wordBoundEmDashRegex = /\w—\w/;
    return wordBoundEmDashRegex.test(text);
}

// Hide a tweet element
function hideTweet(tweetElement, reason = 'em-dash') {
    // Skip if already hidden to avoid redundant operations
    if (hiddenTweets.has(tweetElement)) {
        return;
    }
    
    // Simple hiding by setting display style to none
    tweetElement.style.display = 'none';
    hiddenTweets.add(tweetElement);
    console.log(`DeadDash: Hiding tweet based on ${reason} filter.`);
    
    // Only track total and em-dash counts
    const keysToUpdate = ['blockedTweetCount'];
    if (reason === 'em-dash') {
        keysToUpdate.push('blocked_em_dash_count');
    }
    
    // Increment and store both the total and specific counts
    chrome.storage.sync.get(keysToUpdate, function(result) {
        let dataToSave = {};
        let newTotalCount = (result.blockedTweetCount || 0) + 1;
        dataToSave.blockedTweetCount = newTotalCount;
        
        let newEmDashCount = result.blocked_em_dash_count || 0;
        if (reason === 'em-dash') {
            newEmDashCount++;
            dataToSave.blocked_em_dash_count = newEmDashCount;
        }
        
        chrome.storage.sync.set(dataToSave, function() {
            if (chrome.runtime.lastError) {
                console.error("DeadDash: Error saving counts:", chrome.runtime.lastError);
            } else if (DEBUG_MODE) {
                debugLog(`Incremented counts. New em-dash count: ${newEmDashCount}. New total: ${newTotalCount}`);
            }
        });
    });
}

// Show a previously hidden tweet (only needed for manual toggling)
function showTweet(tweetElement) {
    tweetElement.style.display = '';
    hiddenTweets.delete(tweetElement);
    debugLog("Showing previously hidden tweet");
}

// Process a single tweet element
function processTweet(tweetElement) {
    // Skip already hidden tweets to avoid redundant operations
    if (hiddenTweets.has(tweetElement)) {
        return;
    }
    
    const textContent = extractTweetText(tweetElement);
    let shouldHide = false;
    let hideReason = 'em-dash'; // Default and only reason now

    // Log state before checking rules
    debugInvestigation('ProcessTweet', 'Checking tweet with current state:', {
        isEmDashBlockingEnabled
    });

    // Check only the em-dash rule
    if (isEmDashBlockingEnabled && containsWordBoundEmDash(textContent)) {
        shouldHide = true;
    }

    if (shouldHide) {
        hideTweet(tweetElement, hideReason);
    }
}

// Extract text from a tweet element
function extractTweetText(tweetElement) {
    const textElement = tweetElement.querySelector(TWEET_TEXT_SELECTOR);
    
    if (textElement) {
        return textElement.innerText;
    }
    
    return null;
}

// Handle DOM mutations to detect new tweets
function handleMutations(mutationsList, observer) {
    // Debounce processing with requestAnimationFrame to avoid layout thrashing
    window.requestAnimationFrame(() => {
        let newTweetsFound = false;
        
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    // Check if the added node itself is a tweet or contains tweets
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.matches && node.matches(TWEET_SELECTOR)) {
                            // The added node is a tweet element
                            processTweet(node);
                            newTweetsFound = true;
                        } else {
                            // Check if the added node contains tweet elements
                            // (e.g., a container div was added)
                            const newTweetsInside = node.querySelectorAll ? node.querySelectorAll(TWEET_SELECTOR) : [];
                            if (newTweetsInside.length > 0) {
                                newTweetsInside.forEach(tweetElement => processTweet(tweetElement));
                                newTweetsFound = true;
                            }
                        }
                    }
                });
            }
        }
        
        if (newTweetsFound && DEBUG_MODE) {
            debugLog("Processed new tweets");
        }
    });
}

// Scan the page for tweets
function scanForTweets() {
    console.log("DeadDash: Scanning for tweets...");
    const tweetElements = document.querySelectorAll(TWEET_SELECTOR);
    console.log(`DeadDash: Found ${tweetElements.length} potential tweet elements.`);

    tweetElements.forEach(tweetElement => {
        processTweet(tweetElement);
    });
}

// Update all tweets based on current enabled state
function updateAllTweets() {
    const allTweets = document.querySelectorAll(TWEET_SELECTOR);
    debugLog(`Updating ${allTweets.length} tweets with filters:`, {
        emDash: isEmDashBlockingEnabled
    });
    
    allTweets.forEach(tweet => {
        // Check if it should be hidden based only on em-dash rule
        const textContent = extractTweetText(tweet);
        const shouldBeHidden = isEmDashBlockingEnabled && containsWordBoundEmDash(textContent);

        if (shouldBeHidden) {
            // Hide it (hideTweet handles already hidden ones)
            hideTweet(tweet, 'em-dash');
        } else {
            // If it's currently hidden, un-hide it
            if (hiddenTweets.has(tweet)) {
                showTweet(tweet);
            }
            // If it's not hidden and shouldn't be, do nothing.
        }
    });
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === 'toggleEmDashState') {
        isEmDashBlockingEnabled = message.emDashBlockingEnabled;
        console.log(`DeadDash: Em Dash blocking ${isEmDashBlockingEnabled ? 'enabled' : 'disabled'}`);
        updateAllTweets();
    }
    sendResponse({ success: true });
    return true;
});

// Force scan all tweets - can be called from console for debugging
window.deadDashForceScan = function() {
    debugLog("Forcing scan of all tweets");
    updateAllTweets();
    return "Scan complete";
};

// Initialize the extension
function initializeDeadDash() {
    console.log("DeadDash: Initializing...");
    
    // Load enabled state from storage
    chrome.storage.sync.get(['emDashBlockingEnabled'], function(result) {
        // Default em-dash blocking to enabled if not set
        isEmDashBlockingEnabled = result.emDashBlockingEnabled !== false;
        
        console.log(`DeadDash: Em Dash blocking ${isEmDashBlockingEnabled ? 'enabled' : 'disabled'}`);
        
        // Initial scan for tweets already present
        scanForTweets();
        
        // Set up MutationObserver to watch for new tweets
        const observer = new MutationObserver(handleMutations);
        
        // Configuration for the observer:
        // Observe additions/removals of child nodes in the subtree
        const config = { childList: true, subtree: true };
        
        // Start observing the document body
        const targetNode = document.body;
        if (targetNode) {
            observer.observe(targetNode, config);
            console.log("DeadDash: MutationObserver started.");
        } else {
            console.error("DeadDash: Could not find target node for MutationObserver.");
        }
    });
}

// Run initialization logic
initializeDeadDash();
