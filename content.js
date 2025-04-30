console.log("DeadDash: Content script loaded and running on", window.location.href);

// Extension state
let isEmDashBlockingEnabled = true;
let isEmojiBlockingEnabled = false;
let isThreadEmojiBlockingEnabled = false;
let isPoliceEmojiBlockingEnabled = false;

// Debug mode - set to true to enable verbose logging
const DEBUG_MODE = true;

// Selectors for X/Twitter DOM elements
const TWEET_SELECTOR = 'article[data-testid="tweet"]';
const TWEET_TEXT_SELECTOR = 'div[data-testid="tweetText"]';

// Emoji definitions
const POINTING_DOWN_EMOJI = '👇';
const THREAD_EMOJI = '🧵';
const POLICE_LIGHT_EMOJI = '🚨';

// Emoji image filename patterns (Twemoji)
const POINTING_DOWN_FILENAMES = new Set([
  '1f447.svg', // Base emoji
  '1f447-1f3fb.svg', '1f447-1f3fc.svg', // Light and medium-light skin tones
  '1f447-1f3fd.svg', '1f447-1f3fe.svg', '1f447-1f3ff.svg' // Medium, medium-dark, and dark skin tones
]);
const THREAD_FILENAMES = new Set(['1f9f5.svg']); // Thread emoji
const POLICE_LIGHT_FILENAMES = new Set(['1f6a8.svg']); // Police light emoji

// Track processed emoji images to avoid re-processing
const processedImages = new WeakSet();
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

// Check if tweet contains the pointing down emoji
function containsPointingDownEmoji(tweetElement) {
    if (!tweetElement) {
        return false;
    }
    
    // Get all image elements in the tweet
    const allImages = tweetElement.querySelectorAll('img');
    
    // Check for pointing down emoji
    for (const img of allImages) {
        if (processedImages.has(img)) continue;
        
        const src = img.getAttribute('src') || '';
        const alt = img.getAttribute('alt') || '';
        
        // Only process emoji images
        if (src.includes('/emoji/')) {
            processedImages.add(img);
            
            const filename = src.split('/').pop() || '';
            
            if (POINTING_DOWN_FILENAMES.has(filename) || alt === POINTING_DOWN_EMOJI) {
                if (DEBUG_MODE) {
                    debugLog("Found pointing down emoji", {
                        src, alt, filename
                    });
                }
                return true;
            }
        }
    }
    return false;
}

// Check if tweet contains the thread emoji
function containsThreadEmoji(tweetElement) {
    if (!tweetElement) {
        return false;
    }
    
    // Look for all images in the tweet
    const allImages = tweetElement.querySelectorAll('img');
    for (const img of allImages) {
        if (processedImages.has(img)) continue;
        
        const src = img.getAttribute('src') || '';
        const alt = img.getAttribute('alt') || '';
        
        // Only process emoji images
        if (src.includes('/emoji/')) {
            processedImages.add(img);
            
            const filename = src.split('/').pop() || '';
            
            if (THREAD_FILENAMES.has(filename) || alt === THREAD_EMOJI) {
                if (DEBUG_MODE) {
                    debugLog("Found thread emoji", {
                        src, alt, filename
                    });
                }
                return true;
            }
        }
    }
    return false;
}

// Check if tweet contains the police car light emoji
function containsPoliceEmoji(tweetElement) {
    if (!tweetElement) {
        return false;
    }
    
    // Look for all images in the tweet
    const allImages = tweetElement.querySelectorAll('img');
    for (const img of allImages) {
        if (processedImages.has(img)) continue;
        
        const src = img.getAttribute('src') || '';
        const alt = img.getAttribute('alt') || '';
        
        // Only process emoji images
        if (src.includes('/emoji/')) {
            processedImages.add(img);
            
            const filename = src.split('/').pop() || '';
            
            if (POLICE_LIGHT_FILENAMES.has(filename) || alt === POLICE_LIGHT_EMOJI) {
                if (DEBUG_MODE) {
                    debugLog("Found police emoji", {
                        src, alt, filename
                    });
                }
                return true;
            }
        }
    }
    return false;
}

// Hide a tweet element
function hideTweet(tweetElement, reason = 'filter') {
    // Skip if already hidden to avoid redundant operations
    if (hiddenTweets.has(tweetElement)) {
        return;
    }
    
    // Simple hiding by setting display style to none
    tweetElement.style.display = 'none';
    hiddenTweets.add(tweetElement);
    console.log(`DeadDash: Hiding tweet based on ${reason} filter.`);
    
    // Define keys for individual counts
    const countKeys = {
        'em-dash': 'blocked_em_dash_count',
        'pointing-down-emoji': 'blocked_pointing_down_emoji_count',
        'thread-emoji': 'blocked_thread_emoji_count',
        'police-emoji': 'blocked_police_emoji_count',
        'filter': 'blocked_unknown_count' // Fallback if reason is generic
    };
    const specificCountKey = countKeys[reason] || countKeys['filter'];
    
    // Increment and store both the total and specific counts
    chrome.storage.sync.get(['blockedTweetCount', specificCountKey], function(result) {
        let currentCount = result.blockedTweetCount || 0; // Default to 0 if not set
        let currentSpecificCount = result[specificCountKey] || 0; // Default to 0 if not set
        
        let newCount = currentCount + 1;
        let newSpecificCount = currentSpecificCount + 1;
        
        // Prepare data to save
        let dataToSave = {
            blockedTweetCount: newCount
        };
        dataToSave[specificCountKey] = newSpecificCount;
        
        chrome.storage.sync.set(dataToSave, function() {
            if (chrome.runtime.lastError) {
                console.error("DeadDash: Error saving counts:", chrome.runtime.lastError);
            } else if (DEBUG_MODE) {
                debugLog(`Incremented count for ${reason}. New specific count: ${newSpecificCount}. New total: ${newCount}`);
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
    let hideReason = null;

    // Check each rule IF its corresponding toggle is enabled
    if (isEmDashBlockingEnabled && containsWordBoundEmDash(textContent)) {
        shouldHide = true;
        hideReason = 'em-dash';
    } else if (isEmojiBlockingEnabled && containsPointingDownEmoji(tweetElement)) {
        shouldHide = true;
        hideReason = 'pointing-down-emoji';
        debugLog("Hiding tweet with pointing down emoji");
    } else if (isThreadEmojiBlockingEnabled && containsThreadEmoji(tweetElement)) {
        shouldHide = true;
        hideReason = 'thread-emoji';
        debugLog("Hiding tweet with thread emoji");
    } else if (isPoliceEmojiBlockingEnabled && containsPoliceEmoji(tweetElement)) {
        shouldHide = true;
        hideReason = 'police-emoji';
        debugLog("Hiding tweet with police emoji");
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
        emDash: isEmDashBlockingEnabled,
        pointingDown: isEmojiBlockingEnabled,
        thread: isThreadEmojiBlockingEnabled,
        police: isPoliceEmojiBlockingEnabled
    });
    
    allTweets.forEach(tweet => processTweet(tweet));
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === 'toggleEmDashState') {
        isEmDashBlockingEnabled = message.emDashBlockingEnabled;
        console.log(`DeadDash: Em Dash blocking ${isEmDashBlockingEnabled ? 'enabled' : 'disabled'}`);
        updateAllTweets();
    }
    else if (message.action === 'toggleEmojiState') {
        isEmojiBlockingEnabled = message.emojiBlockingEnabled;
        console.log(`DeadDash: Emoji blocking ${isEmojiBlockingEnabled ? 'enabled' : 'disabled'}`);
        updateAllTweets();
    }
    else if (message.action === 'toggleThreadEmojiState') {
        isThreadEmojiBlockingEnabled = message.threadEmojiBlockingEnabled;
        console.log(`DeadDash: Thread emoji blocking ${isThreadEmojiBlockingEnabled ? 'enabled' : 'disabled'}`);
        updateAllTweets();
    }
    else if (message.action === 'togglePoliceEmojiState') {
        isPoliceEmojiBlockingEnabled = message.policeEmojiBlockingEnabled;
        console.log(`DeadDash: Police emoji blocking ${isPoliceEmojiBlockingEnabled ? 'enabled' : 'disabled'}`);
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
    chrome.storage.sync.get(['emDashBlockingEnabled', 'emojiBlockingEnabled', 'threadEmojiBlockingEnabled', 'policeEmojiBlockingEnabled'], function(result) {
        // Default em-dash blocking to enabled if not set
        isEmDashBlockingEnabled = result.emDashBlockingEnabled !== false;
        // Default to disabled for emoji blocking
        isEmojiBlockingEnabled = result.emojiBlockingEnabled === true;
        // Default to disabled for thread emoji blocking
        isThreadEmojiBlockingEnabled = result.threadEmojiBlockingEnabled === true;
        // Default to disabled for police emoji blocking
        isPoliceEmojiBlockingEnabled = result.policeEmojiBlockingEnabled === true;
        
        console.log(`DeadDash: Em Dash blocking ${isEmDashBlockingEnabled ? 'enabled' : 'disabled'}`);
        console.log(`DeadDash: Emoji blocking ${isEmojiBlockingEnabled ? 'enabled' : 'disabled'}`);
        console.log(`DeadDash: Thread emoji blocking ${isThreadEmojiBlockingEnabled ? 'enabled' : 'disabled'}`);
        console.log(`DeadDash: Police emoji blocking ${isPoliceEmojiBlockingEnabled ? 'enabled' : 'disabled'}`);
        
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
