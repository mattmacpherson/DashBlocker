console.log("Dash Nuke: Content script loaded and running on", window.location.href);

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
    console.log("Dash Nuke: Hiding tweet containing em dash.");
}

// Process a single tweet element
function processTweet(tweetElement) {
    // Avoid processing if already hidden by us
    if (tweetElement.getAttribute('data-dash-nuke-hidden') === 'true') {
        return;
    }

    const textContent = extractTweetText(tweetElement);
    if (textContent && containsWordBoundEmDash(textContent)) {
        hideTweet(tweetElement);
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
            console.log("Dash Nuke: Processed dynamically added tweets.");
        }
    });
}

// Scan the page for tweets
function scanForTweets() {
    console.log("Dash Nuke: Scanning for tweets...");
    const tweetElements = document.querySelectorAll(TWEET_SELECTOR);
    console.log(`Dash Nuke: Found ${tweetElements.length} potential tweet elements.`);

    tweetElements.forEach(tweetElement => {
        processTweet(tweetElement);
    });
}

// Initialize the extension
function initializeDashNuke() {
    console.log("Dash Nuke: Initializing...");
    
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
        console.log("Dash Nuke: MutationObserver started.");
    } else {
        console.error("Dash Nuke: Could not find target node for MutationObserver.");
    }
}

// Run initialization logic
initializeDashNuke();
