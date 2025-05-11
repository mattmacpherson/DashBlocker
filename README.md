# DeadDash

## Fight AI-generated spam: Hide word-bound em dashes from your timeline.

DeadDash is a browser extension designed to tidy up your X timeline by automatically hiding posts containing **word-bound em dashes** (e.g., word—word). This specific pattern is frequently found in AI-generated content.

* **Precise Filtering**: Only posts containing em dashes directly connecting words (word—word) will be hidden.
* **Avoid False Positives**: Posts with standalone em dashes, punctuation-bound em dashes, or stylistic uses are not affected.

Enjoy a cleaner timeline without sacrificing the genuine posts you love.

## Features

- **Automatic Filtering**: Detects and hides posts containing em-dashes between words
- **Counter**: Tracks how many posts have been filtered from your timeline
- **Toggle Control**: Easily enable or disable the extension with a single click
- **Real-time Detection**: Works on dynamically loaded content as you scroll

## Installation

### Chrome Web Store
1. Visit the [DeadDash extension page](https://chromewebstore.google.com/detail/deaddash/fnpkdioianapnpbhcchfodpknoedkenkK) on the Chrome Web Store
2. Click **"Add to Chrome"** to install it in your browser  

### Manual Installation
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the DeadDash directory
5. The extension should now be installed and active

## How It Works

DeadDash scans your X timeline for posts containing em-dashes (—) between words, which is a common pattern in AI-generated content. When it finds such posts, it automatically hides them from your view.

The extension uses a simple but effective pattern detection:
```javascript
// Regex: Looks for a word character (\w), followed by an em dash (—),
// followed by another word character (\w)
const wordBoundEmDashRegex = /\w—\w/;
```

## Usage

1. After installation, navigate to X.com or Twitter.com
2. The extension will automatically start filtering posts containing em-dashes
3. Click the DeadDash icon in your browser toolbar to:
   - See how many posts have been blocked
   - Enable or disable the extension

## Privacy

DeadDash operates entirely within your browser and does not:
- Collect any personal data
- Send any information to external servers
- Track your browsing history
- Modify any content other than hiding specific posts on X/Twitter

## Contributing

Contributions are welcome! If you'd like to improve DeadDash:

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature-name`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add some feature'`)
5. Push to the branch (`git push origin feature/your-feature-name`)
6. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

Created by [Matt MacPherson](https://x.com/itsMattMac)
