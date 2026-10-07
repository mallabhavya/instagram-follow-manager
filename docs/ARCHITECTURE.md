# Architecture

## Data flow

```text
User-selected JSON files
        ↓
File reader and export parsers (src/popup, src/domain/parsers)
        ↓
Pure analysis functions (src/domain/analyzers)
        ↓
Popup review UI (src/popup)
        ↓
Versioned state via chrome.storage.local (src/storage)
        ↓
Optional validated profile link opened by the user
```

## Boundaries

- **Domain:** typed account and interaction models, normalization, parsers, and analysis. The analysis functions do not depend on React, Chrome APIs, or Instagram's DOM.
- **Popup:** file selection and user interface. It passes parsed values into the analysis layer and displays results without making Instagram page changes.
- **Storage:** `src/storage/storage.ts` validates, migrates, saves, restores, and clears one versioned application record. This keeps Chrome-specific storage calls out of domain logic.
- **Instagram navigation:** `src/domain/utils/profileUrl.ts` validates imported profile URLs and builds a safe canonical URL from a username. `AccountRow` exposes the result as a user-clicked external link. No content script or page messaging exists.

## Local processing and permissions

Files are read with the browser File API and processed in the popup. Persisted state is stored with `chrome.storage.local`. The manifest requests only the `storage` permission; it has no host permissions, active tab access, scripting permission, or content scripts.
