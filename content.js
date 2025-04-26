console.log("Dash Nuke: Content script loaded and running on", window.location.href);

// Selectors for X/Twitter DOM elements
const TWEET_SELECTOR = 'article[data-testid="tweet"]';
const TWEET_TEXT_SELECTOR = 'div[data-testid="tweetText"]';

// Check if text contains an em dash
function containsEmDash(text) {
    // The em dash character (—), Unicode U+2014
    return text.includes('—');
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
    if (textContent && containsEmDash(textContent)) {
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

// Scan the page for tweets
function scanForTweets() {
    console.log("Dash Nuke: Scanning for tweets...");
    const tweetElements = document.querySelectorAll(TWEET_SELECTOR);
    console.log(`Dash Nuke: Found ${tweetElements.length} potential tweet elements.`);

    tweetElements.forEach(tweetElement => {
        processTweet(tweetElement);
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
