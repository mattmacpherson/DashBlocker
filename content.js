console.log("DashBlocker: Content script loaded and running on", window.location.href);

// Extension state
let isEnabled = true;

// Selectors for X/Twitter DOM elements
const TWEET_SELECTOR = 'article[data-testid="tweet"]';
const TWEET_TEXT_SELECTOR = 'div[data-testid="tweetText"]';

// Check if text contains an em dash between word characters
function containsWordBoundEmDash(text) {
    // Regex: Looks for a word character (\w), followed by an em dash (—),
    // followed by another word character (\w)
    const wordBoundEmDashRegex = /\w—\w/;
    return wordBoundEmDashRegex.test(text);
}

// Hide a tweet element
function hideTweet(tweetElement) {
    // Simple hiding by setting display style to none
    tweetElement.style.display = 'none';
    // Add a marker attribute to know it's been processed/hidden by this extension
    tweetElement.setAttribute('data-dash-nuke-hidden', 'true');
    console.log("DashBlocker: Hiding tweet containing em dash.");
    
    // Increment and store the blocked tweet count
    chrome.storage.sync.get(['blockedTweetCount'], function(result) {
        let currentCount = result.blockedTweetCount || 0; // Default to 0 if not set
        let newCount = currentCount + 1;
        
        chrome.storage.sync.set({ blockedTweetCount: newCount }, function() {
            if (chrome.runtime.lastError) {
                console.error("DashBlocker: Error saving count:", chrome.runtime.lastError);
            }
        });
    });
}

// Show a previously hidden tweet
function showTweet(tweetElement) {
    if (tweetElement.getAttribute('data-dash-nuke-hidden') === 'true') {
        tweetElement.style.display = '';
        console.log("DashBlocker: Showing previously hidden tweet.");
    }
}

// Process a single tweet element
function processTweet(tweetElement) {
    // Avoid processing if already hidden by us
    if (tweetElement.getAttribute('data-dash-nuke-hidden') === 'true') {
        // If extension is disabled, show the tweet
        if (!isEnabled) {
            showTweet(tweetElement);
        }
        return;
    }

    // Only hide tweets if extension is enabled
    if (isEnabled) {
        const textContent = extractTweetText(tweetElement);
        if (textContent && containsWordBoundEmDash(textContent)) {
            hideTweet(tweetElement);
        }
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
            console.log("DashBlocker: Processed dynamically added tweets.");
        }
    });
}

// Scan the page for tweets
function scanForTweets() {
    console.log("DashBlocker: Scanning for tweets...");
    const tweetElements = document.querySelectorAll(TWEET_SELECTOR);
    console.log(`DashBlocker: Found ${tweetElements.length} potential tweet elements.`);

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
    if (message.action === 'toggleState') {
        isEnabled = message.enabled;
        console.log(`DashBlocker: Extension ${isEnabled ? 'enabled' : 'disabled'}`);
        updateAllTweets();
    }
    sendResponse({ success: true });
    return true;
});

// Initialize the extension
function initializeDashBlocker() {
    console.log("DashBlocker: Initializing...");
    
    // Load enabled state from storage
    chrome.storage.sync.get(['enabled'], function(result) {
        // Default to enabled if not set
        isEnabled = result.enabled !== false;
        console.log(`DashBlocker: Extension ${isEnabled ? 'enabled' : 'disabled'}`);
        
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
            console.log("DashBlocker: MutationObserver started.");
        } else {
            console.error("DashBlocker: Could not find target node for MutationObserver.");
        }
    });
}

// Run initialization logic
initializeDashBlocker();
