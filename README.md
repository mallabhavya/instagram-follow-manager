# Instagram Unfollow Manager

A lightweight Chrome extension that analyzes Instagram data exports locally. It compares followers and following lists, summarizes recorded interactions, and provides filters and manual review tools for accounts you may want to revisit.

## The problem and an important limitation

Following lists grow over time, and people may want to review accounts that do not follow them back or have no recent recorded interaction. Instagram exports do not reveal whether someone has ever seen an account. This extension can only analyze interaction data included in the export; it cannot know what Instagram did not provide.

Use labels such as **No recorded interaction** and **No recent interaction found** as summaries of the available export, not claims about what you saw in Instagram.

## Features

- Import followers, following, and optional interaction JSON export files.
- Compare followers and following lists to identify accounts that do not follow back.
- Aggregate imported like, comment, story-like, and message-thread activity.
- Choose a 6, 12, or 24 month inactivity period.
- Search, filter, and sort analysis results.
- Protect accounts from review and mark accounts as reviewed.
- Save analysis, settings, protected accounts, and review status in Chrome local storage.
- Open a validated Instagram profile link for manual review.

The extension does not automatically unfollow accounts or interact with Instagram pages.

## Architecture

```text
Instagram export files
        ↓
Local JSON reader and parsers
        ↓
Pure TypeScript analysis
        ↓
React popup review UI
        ↓
chrome.storage.local
        ↓
Optional user-clicked profile link to Instagram
```

The domain parsers and analyzers are separate from React and Chrome APIs. The storage module is the only module that calls `chrome.storage`. There is no content script or Instagram DOM integration. More detail is in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Tech stack

- React and React DOM
- TypeScript
- Vite
- Chrome Extension Manifest V3
- Chrome Storage API
- Vitest

## Privacy

Instagram export data is read and processed locally in the extension and is not uploaded to a server. The code has no analytics, telemetry, or remote logging. Opening a profile is an explicit user action that navigates to Instagram; the extension does not scrape or alter the page.

The `storage` permission is used to resume saved analysis, settings, protected accounts, and reviewed status through `chrome.storage.local`. No `tabs`, `activeTab`, `scripting`, or host permissions are requested.

## Installation

1. Clone or download this project.
2. In the project directory, install dependencies:

   ```bash
   npm install
   ```

3. Build the extension:

   ```bash
   npm run build
   ```

4. In Chrome, open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the generated `dist` directory.

## Usage

1. Request and download your Instagram information export from Instagram. Choose JSON format and include followers/following and any interaction categories you want analyzed.
2. Open the extension popup and select the followers and following JSON files. Interaction files are optional and can be selected together.
3. Choose the inactivity period and select **Analyze accounts**.
4. Search, sort, or filter the results. Use **Keep** to protect an account from review, and **Mark reviewed** to track your manual review.
5. Optionally choose **Open profile** to visit the account on Instagram. Any follow or unfollow decision is made manually on Instagram.

The parser supports common Instagram export structures; export formats can change. If an export file is not recognized, verify that the selected file is the matching JSON category and try a fresh export.

## Development

```bash
npm install
npm test
npm run build
```

There is no separate lint or typecheck script. The build runs TypeScript project checks before Vite bundles the extension.

## Limitations

- Results reflect the export files selected and may be stale until a new export is analyzed.
- Interaction coverage depends on what Instagram included in the export.
- Message activity is summarized per participant username within an imported thread using that thread's latest usable message timestamp; the extension does not inspect message content.
- Instagram may change its export format or website behavior.
- Profile links are ordinary external links. There is no profile detection, DOM integration, or automatic unfollowing.
- A reviewed mark records your choice in this extension; it does not verify that you unfollowed or otherwise acted on an account.
- Saved app state is local browser extension storage and can be removed by clearing extension data.

## Project status

This is a portfolio and educational project. It is not affiliated with Instagram or Meta and should not be treated as a guarantee of Instagram export completeness.

## Demo preparation

Capture real screenshots using synthetic or appropriately redacted data:

1. Import screen
2. Analysis summary
3. Review screen with search and filters
4. Account row showing protected/reviewed actions
5. The user-clicked profile navigation flow

Suggested demo sequence: introduce the review problem; import synthetic JSON; show analysis and filters; mark an account reviewed; open its profile manually; explain local processing and limitations. Do not show personal exports or private account data.
