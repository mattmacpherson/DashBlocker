console.log("DeadDash: Content script loaded and running on", window.location.href);

// Extension state
let isEmDashBlockingEnabled = true;
let isEmojiBlockingEnabled = false;
let isThreadEmojiBlockingEnabled = false;

// Selectors for X/Twitter DOM elements
const TWEET_SELECTOR = 'article[data-testid="tweet"]';
const TWEET_TEXT_SELECTOR = 'div[data-testid="tweetText"]';

// Emoji to detect
const POINTING_DOWN_EMOJI = '👇';
const THREAD_EMOJI = '🧵';

// Check if text contains an em dash between word characters
function containsWordBoundEmDash(text) {
    // Regex: Looks for a word character (\w), followed by an em dash (—),
    // followed by another word character (\w)
    const wordBoundEmDashRegex = /\w—\w/;
    return wordBoundEmDashRegex.test(text);
}

// Check if text contains the pointing down emoji
function containsPointingDownEmoji(text) {
    if (!text) {
        return false;
    }
    return text.includes(POINTING_DOWN_EMOJI);
}

// Check if text contains the thread emoji
function containsThreadEmoji(text) {
    if (!text) {
        return false;
    }
    return text.includes(THREAD_EMOJI);
}

// Hide a tweet element
function hideTweet(tweetElement, reason = 'filter') {
    // Simple hiding by setting display style to none
    tweetElement.style.display = 'none';
    // Add a marker attribute to know it's been processed/hidden by this extension
    tweetElement.setAttribute('data-dead-dash-hidden', 'true');
    console.log(`DeadDash: Hiding tweet based on ${reason} filter.`);
    
    // Increment and store the blocked tweet count
    chrome.storage.sync.get(['blockedTweetCount'], function(result) {
        let currentCount = result.blockedTweetCount || 0; // Default to 0 if not set
        let newCount = currentCount + 1;
        
        chrome.storage.sync.set({ blockedTweetCount: newCount }, function() {
            if (chrome.runtime.lastError) {
                console.error("DeadDash: Error saving count:", chrome.runtime.lastError);
            }
        });
    });
}

// Show a previously hidden tweet
function showTweet(tweetElement) {
    if (tweetElement.getAttribute('data-dead-dash-hidden') === 'true') {
        tweetElement.style.display = '';
        console.log("DeadDash: Showing previously hidden tweet.");
    }
}

// Process a single tweet element
function processTweet(tweetElement) {
    const textContent = extractTweetText(tweetElement);
    let shouldHide = false;
    let hideReason = null;

    if (textContent) {
        // Check each rule IF its corresponding toggle is enabled
        if (isEmDashBlockingEnabled && containsWordBoundEmDash(textContent)) {
            shouldHide = true;
            hideReason = 'em-dash';
        } else if (isEmojiBlockingEnabled && containsPointingDownEmoji(textContent)) {
            shouldHide = true;
            hideReason = 'pointing-down-emoji';
        } else if (isThreadEmojiBlockingEnabled && containsThreadEmoji(textContent)) {
            shouldHide = true;
            hideReason = 'thread-emoji';
        }
    }

    // Get current visibility state
    const isCurrentlyHidden = tweetElement.style.display === 'none';

    if (shouldHide) {
        if (!isCurrentlyHidden) {
            // Hide it (pass reason for logging)
            hideTweet(tweetElement, hideReason);
        }
        // If it should be hidden and already is, do nothing.
    } else {
        // Should NOT be hidden
        if (isCurrentlyHidden) {
            // Show it
            showTweet(tweetElement);
        }
        // If it shouldn't be hidden and isn't, do nothing.
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
    // Use requestAnimationFrame to batch processing and avoid layout thrashing
    window.requestAnimationFrame(() => {
        let foundNewTweets = false;
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    // Check if the added node itself is a tweet or contains tweets
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.matches && node.matches(TWEET_SELECTOR)) {
                            // The added node is a tweet element
                            processTweet(node);
                            foundNewTweets = true;
                        } else {
                            // Check if the added node contains tweet elements
                            // (e.g., a container div was added)
                            const newTweetsInside = node.querySelectorAll ? node.querySelectorAll(TWEET_SELECTOR) : [];
                            if (newTweetsInside.length > 0) {
                                newTweetsInside.forEach(tweetElement => processTweet(tweetElement));
                                foundNewTweets = true;
                            }
                        }
                    }
                });
            }
        }
        if (foundNewTweets) {
            console.log("DeadDash: Processed dynamically added tweets.");
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
    sendResponse({ success: true });
    return true;
});

// Initialize the extension
function initializeDeadDash() {
    console.log("DeadDash: Initializing...");
    
    // Load enabled state from storage
    chrome.storage.sync.get(['emDashBlockingEnabled', 'emojiBlockingEnabled', 'threadEmojiBlockingEnabled'], function(result) {
        // Default em-dash blocking to enabled if not set
        isEmDashBlockingEnabled = result.emDashBlockingEnabled !== false;
        // Default to disabled for emoji blocking
        isEmojiBlockingEnabled = result.emojiBlockingEnabled === true;
        // Default to disabled for thread emoji blocking
        isThreadEmojiBlockingEnabled = result.threadEmojiBlockingEnabled === true;
        
        console.log(`DeadDash: Em Dash blocking ${isEmDashBlockingEnabled ? 'enabled' : 'disabled'}`);
        console.log(`DeadDash: Emoji blocking ${isEmojiBlockingEnabled ? 'enabled' : 'disabled'}`);
        console.log(`DeadDash: Thread emoji blocking ${isThreadEmojiBlockingEnabled ? 'enabled' : 'disabled'}`);
        
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
