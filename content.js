console.log("Dash Nuke: Content script loaded and running on", window.location.href);

// Selectors for X/Twitter DOM elements
const TWEET_SELECTOR = 'article[data-testid="tweet"]';
const TWEET_TEXT_SELECTOR = 'div[data-testid="tweetText"]';

// Extract text from a tweet element
function extractTweetText(tweetElement) {
    const textElement = tweetElement.querySelector(TWEET_TEXT_SELECTOR);
    if (textElement) {
        return textElement.innerText;
    }
    return null;
}

// Scan the page for tweets
function scanForTweets() {
    console.log("Dash Nuke: Scanning for tweets...");
    const tweetElements = document.querySelectorAll(TWEET_SELECTOR);
    console.log(`Dash Nuke: Found ${tweetElements.length} potential tweet elements.`);

    tweetElements.forEach(tweetElement => {
        const textContent = extractTweetText(tweetElement);
        if (textContent) {
            console.log("Dash Nuke: Extracted text:", textContent.substring(0, 100) + "...");
            // Hiding logic will go here in Phase 3
        }
    });
}

// Placeholder for future logic
function initializeDashNuke() {
    console.log("Dash Nuke: Initializing...");
    scanForTweets(); // Perform initial scan on load
    // MutationObserver setup will go here in Phase 4
}

// Run initialization logic
initializeDashNuke();
