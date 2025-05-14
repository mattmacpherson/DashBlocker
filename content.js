console.log("DeadDash: Content script loaded and running on", window.location.href);

// --- Site Detection ---
const currentHostname = window.location.hostname;
const isOnTwitter = currentHostname.includes('x.com') || currentHostname.includes('twitter.com');
const isOnReddit = currentHostname.includes('reddit.com');
console.log(`DeadDash: Running on ${isOnTwitter ? 'Twitter/X' : isOnReddit ? 'Reddit' : 'unknown site'}`);

// Extension state
let isTwitterBlockingEnabled = true;
let isRedditBlockingEnabled = true;

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

// Selectors for Reddit DOM elements
// New Reddit (now uses light DOM for comment text)
const REDDIT_COMMENT_SELECTOR_NEW = 'shreddit-comment';
const REDDIT_COMMENT_TEXT_SELECTOR_NEW = 'div[slot="comment"]';
// Keep old shadow DOM selector for fallback
const REDDIT_COMMENT_TEXT_SELECTOR_SHADOW_FALLBACK = '[data-testid="comment"] [data-click-id="text"]';

// Old Reddit
const REDDIT_COMMENT_SELECTOR_OLD = 'div.comment';
const REDDIT_COMMENT_TEXT_SELECTOR_OLD = '.usertext-body .md';

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

// Hide an element (tweet or comment)
function hideItem(element, reason = 'em-dash') {
    // Skip if already hidden to avoid redundant operations
    if (hiddenTweets.has(element)) {
        return;
    }
    
    // Simple hiding by setting display style to none
    element.style.display = 'none';
    hiddenTweets.add(element);
    console.log(`DeadDash: Hiding content based on ${reason} filter.`);
    
    // Track total count using the new key name
    const keysToUpdate = ['blockedTotalCount'];
    
    // Increment and store the count
    chrome.storage.sync.get(keysToUpdate, function(result) {
        let dataToSave = {};
        let newTotalCount = (result.blockedTotalCount || 0) + 1;
        dataToSave.blockedTotalCount = newTotalCount;
        
        chrome.storage.sync.set(dataToSave, function() {
            if (chrome.runtime.lastError) {
                console.error("DeadDash: Error saving counts:", chrome.runtime.lastError);
            } else if (DEBUG_MODE) {
                debugLog(`Incremented count. New total: ${newTotalCount}`);
            }
        });
    });
}

// Legacy function for compatibility - just calls hideItem
function hideTweet(tweetElement, reason = 'em-dash') {
    hideItem(tweetElement, reason);
}

// Show a previously hidden element (tweets or comments)
function showItem(element) {
    element.style.display = '';
    hiddenTweets.delete(element);
    debugLog("Showing previously hidden item");
}

// Legacy function for compatibility - just calls showItem
function showTweet(tweetElement) {
    showItem(tweetElement);
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
        isTwitterBlockingEnabled
    });

    // Check only the em-dash rule using Twitter-specific toggle
    if (isTwitterBlockingEnabled && containsWordBoundEmDash(textContent)) {
        shouldHide = true;
    }

    if (shouldHide) {
        hideItem(tweetElement, hideReason);
    }
}

// Process a single Reddit comment element
function processRedditComment(commentElement) {
    // Skip already hidden comments to avoid redundant operations
    if (hiddenTweets.has(commentElement)) {
        return;
    }
    
    let textNode = null;
    let textContent = '';
    
    // Check if it's a new Reddit comment element
    if (commentElement.tagName.toLowerCase() === REDDIT_COMMENT_SELECTOR_NEW.toLowerCase()) {
        // 1. First try finding text in the light DOM (current structure)
        textNode = commentElement.querySelector(REDDIT_COMMENT_TEXT_SELECTOR_NEW);
        
        // 2. Fallback: If not found in light DOM, check the shadowRoot (older structure)
        if (!textNode) {
            const shadowRoot = commentElement.shadowRoot;
            if (shadowRoot) {
                textNode = shadowRoot.querySelector(REDDIT_COMMENT_TEXT_SELECTOR_SHADOW_FALLBACK);
            }
        }
        
        // Debug logging if we couldn't find text node in either location
        if (!textNode) {
            debugLog("Could not find text node for shreddit-comment in light or shadow DOM", commentElement);
        }
    }
    // Check if it's an old Reddit comment element
    else if (commentElement.matches(REDDIT_COMMENT_SELECTOR_OLD)) {
        // Query within the regular DOM
        textNode = commentElement.querySelector(REDDIT_COMMENT_TEXT_SELECTOR_OLD);
    }
    
    if (textNode) {
        textContent = textNode.innerText || ''; // Get text content
    } else {
        // Could not find text node for this comment type
        debugLog("Could not find text node within comment element", commentElement);
        return;
    }
    
    // Check if it should be hidden based on em-dash rule using Reddit-specific toggle
    const shouldHide = isRedditBlockingEnabled && containsWordBoundEmDash(textContent);
    
    if (shouldHide) {
        hideItem(commentElement, 'em-dash');
    } else if (hiddenTweets.has(commentElement)) {
        showItem(commentElement);
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

// Handle DOM mutations to detect new tweets and comments
function handleMutations(mutationsList, observer) {
    // Debounce processing with requestAnimationFrame to avoid layout thrashing
    window.requestAnimationFrame(() => {
        let newContentFound = false;
        
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    // Check if the added node itself is a content element or contains content elements
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Only check for tweet elements on Twitter/X
                        if (isOnTwitter) {
                            if (node.matches && node.matches(TWEET_SELECTOR)) {
                                processTweet(node);
                                newContentFound = true;
                            } else {
                                const newTweetsInside = node.querySelectorAll ? node.querySelectorAll(TWEET_SELECTOR) : [];
                                if (newTweetsInside.length > 0) {
                                    newTweetsInside.forEach(processTweet);
                                    newContentFound = true;
                                }
                            }
                        }
                        
                        // Only check for Reddit elements on Reddit
                        if (isOnReddit) {
                            // Check for new Reddit comment host element
                            if (node.matches && node.matches(REDDIT_COMMENT_SELECTOR_NEW)) {
                                processRedditComment(node);
                                newContentFound = true;
                            } else {
                                const newRedditCommentsInside = node.querySelectorAll ? node.querySelectorAll(REDDIT_COMMENT_SELECTOR_NEW) : [];
                                if (newRedditCommentsInside.length > 0) {
                                    newRedditCommentsInside.forEach(processRedditComment);
                                    newContentFound = true;
                                }
                            }
                            
                            // Check for old Reddit comment element
                            if (node.matches && node.matches(REDDIT_COMMENT_SELECTOR_OLD)) {
                                processRedditComment(node);
                                newContentFound = true;
                            } else {
                                const oldRedditCommentsInside = node.querySelectorAll ? node.querySelectorAll(REDDIT_COMMENT_SELECTOR_OLD) : [];
                                if (oldRedditCommentsInside.length > 0) {
                                    oldRedditCommentsInside.forEach(processRedditComment);
                                    newContentFound = true;
                                }
                            }
                        }
                    }
                });
            }
        }
        
        if (newContentFound && DEBUG_MODE) {
            debugLog("Processed new content (Tweets or Comments)");
        }
    });
}

// Scan the page for tweets and comments
function scanInitialContent() {
    console.log("DeadDash: Scanning for initial content...");
    
    if (isOnTwitter) {
        // Only scan for Tweets on Twitter/X
        const tweetElements = document.querySelectorAll(TWEET_SELECTOR);
        console.log(`DeadDash: Found ${tweetElements.length} potential tweet elements on Twitter/X.`);
        tweetElements.forEach(processTweet);
    } else if (isOnReddit) {
        // Only scan for Reddit Comments on Reddit
        const redditNewElements = document.querySelectorAll(REDDIT_COMMENT_SELECTOR_NEW);
        console.log(`DeadDash: Found ${redditNewElements.length} potential new Reddit comment elements.`);
        redditNewElements.forEach(processRedditComment);
        
        const redditOldElements = document.querySelectorAll(REDDIT_COMMENT_SELECTOR_OLD);
        console.log(`DeadDash: Found ${redditOldElements.length} potential old Reddit comment elements.`);
        redditOldElements.forEach(processRedditComment);
    }
}

// Update all content based on current enabled state
function updateAllContent() {
    debugLog(`Updating all content on ${isOnTwitter ? 'Twitter/X' : isOnReddit ? 'Reddit' : 'Unknown'} with filters:`, {
        twitterEnabled: isTwitterBlockingEnabled,
        redditEnabled: isRedditBlockingEnabled
    });
    
    if (isOnTwitter) {
        // Only process Tweets on Twitter/X
        const allTweets = document.querySelectorAll(TWEET_SELECTOR);
        debugLog(`Updating ${allTweets.length} tweets`);
        allTweets.forEach(tweet => {
            // Check if it should be hidden based only on em-dash rule
            const textContent = extractTweetText(tweet);
            const shouldBeHidden = isTwitterBlockingEnabled && containsWordBoundEmDash(textContent || '');

            if (shouldBeHidden) {
                hideItem(tweet, 'em-dash');
            } else if (hiddenTweets.has(tweet)) {
                showItem(tweet);
            }
        });
    } else if (isOnReddit) {
        // Only process Reddit Comments on Reddit
        const allNewRedditComments = document.querySelectorAll(REDDIT_COMMENT_SELECTOR_NEW);
        debugLog(`Updating ${allNewRedditComments.length} new Reddit comments`);
        allNewRedditComments.forEach(processRedditComment);
        
        const allOldRedditComments = document.querySelectorAll(REDDIT_COMMENT_SELECTOR_OLD);
        debugLog(`Updating ${allOldRedditComments.length} old Reddit comments`);
        allOldRedditComments.forEach(processRedditComment);
    }
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === 'settingsChanged') {
        // Fetch current settings from storage
        chrome.storage.sync.get(['twitterBlockingEnabled', 'redditBlockingEnabled'], function(result) {
            // Update local state variables with the latest settings
            isTwitterBlockingEnabled = result.twitterBlockingEnabled !== false;
            isRedditBlockingEnabled = result.redditBlockingEnabled !== false;
            
            console.log(`DeadDash: Updated settings - Twitter: ${isTwitterBlockingEnabled ? 'enabled' : 'disabled'}, Reddit: ${isRedditBlockingEnabled ? 'enabled' : 'disabled'}`);
            updateAllContent();
        });
    } else if (message.action === 'toggleEmDashState') {
        // For backward compatibility
        isTwitterBlockingEnabled = message.emDashBlockingEnabled;
        isRedditBlockingEnabled = message.emDashBlockingEnabled;
        console.log(`DeadDash: Em Dash blocking ${message.emDashBlockingEnabled ? 'enabled' : 'disabled'} (legacy message)`);
        updateAllContent();
    }
    sendResponse({ success: true });
    return true;
});

// Force scan all content - can be called from console for debugging
window.deadDashForceScan = function() {
    debugLog("Forcing scan of all content");
    updateAllContent();
    return "Scan complete";
};

// For debugging - show current state
window.deadDashShowState = function() {
    return {
        site: isOnTwitter ? 'Twitter/X' : isOnReddit ? 'Reddit' : 'Unknown site',
        twitterBlockingEnabled: isTwitterBlockingEnabled,
        redditBlockingEnabled: isRedditBlockingEnabled
    };
};

// Initialize the extension
function initializeDeadDash() {
    console.log("DeadDash: Initializing...");
    
    // Load enabled states from storage
    chrome.storage.sync.get(['twitterBlockingEnabled', 'redditBlockingEnabled', 'emDashBlockingEnabled'], function(result) {
        // If new settings exist, use them; otherwise fall back to the old setting or default to true
        const oldSetting = result.emDashBlockingEnabled !== false;
        isTwitterBlockingEnabled = result.twitterBlockingEnabled !== undefined ? result.twitterBlockingEnabled : oldSetting;
        isRedditBlockingEnabled = result.redditBlockingEnabled !== undefined ? result.redditBlockingEnabled : oldSetting;
        
        console.log(`DeadDash: Twitter blocking ${isTwitterBlockingEnabled ? 'enabled' : 'disabled'}, Reddit blocking ${isRedditBlockingEnabled ? 'enabled' : 'disabled'}`);
        
        // Initial scan for content already present
        scanInitialContent();
        
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
