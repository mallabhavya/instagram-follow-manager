# Interview notes

## Why React?

The popup has a small set of interactive states: imported files, analysis settings, review filters, protected accounts, and reviewed accounts. React provides a direct component model for those stateful controls without introducing a larger application framework.

## Why TypeScript?

The parsers accept untrusted JSON, while the domain operates on explicit account and interaction records. TypeScript makes those boundaries visible and helps keep analysis, UI, and persisted state aligned. Runtime validation is still needed for imported JSON and saved browser storage.

## Why Manifest V3?

The deliverable is a Chrome extension popup, and Manifest V3 is the extension format used by the project. The manifest declares the popup and the one permission needed for local state.

## Why local processing?

Follower lists and interaction exports can be sensitive. The popup reads selected files locally, and the project has no upload endpoint or analytics code. Saved app state uses Chrome local storage.

## How does follow-back detection work?

The analyzer normalizes follower usernames into a `Set`, then checks each following username against that set. Accounts absent from the follower set do not follow the user back in the analyzed export. This gives linear set membership work rather than comparing every account pair.

## How is dormancy calculated?

The analyzer finds the latest imported interaction timestamp for each normalized username. It subtracts the selected 6, 12, or 24 calendar months from the analysis time and compares the latest timestamp to that cutoff. No recorded interaction is treated as dormant; an interaction exactly at the cutoff is not older than the cutoff.

## Why is storage separate from domain logic?

The domain layer can be tested with ordinary TypeScript data. `src/storage/storage.ts` owns Chrome API calls, schema validation, version migration, and error translation, so domain analysis does not depend on the browser extension runtime.

## Why isn't unfollowing automated?

The extension is a review aid. It does not operate Instagram controls, scrape the page, or perform bulk account actions. The user opens a profile and decides what to do manually.

## What are the limitations?

Analysis can only reflect the exported data and supported JSON structures. It cannot know whether the user has seen an account, and a reviewed mark does not confirm that an action was taken. Results may become stale after the export was created.

## What if Instagram changes its DOM?

The current project does not inspect Instagram's DOM or use a content script, so a DOM change does not affect its analysis. A change to profile URL behavior or export formats could still require updating URL validation or parsers.

## How are malformed exports handled?

The file reader reports unreadable files and invalid JSON with user-facing errors. Parsers validate expected containers and skip unusable individual records; they raise a `ParseError` when the overall structure is unsupported or contains no usable records where records were expected.

## What would you improve for production?

First, verify behavior against current exports using only synthetic or redacted fixtures, improve automated coverage around evolving export shapes, and perform manual Chrome accessibility and persistence checks. Any broader integration should remain user-driven and be reviewed against platform rules and browser permission requirements.
