# Food Tracker — Project Context for Claude Code

Personal macro-tracking web app. Plain HTML/CSS/JS (`index.html`, `style.css`, `script.js`), no framework, no build step. Personal use only; nothing gets published to an app store.

## Status
- Migrated from tiiny.host to this GitHub repo, served by GitHub Pages (public repo).
- Commit 1 done: `Add project context and frequent foods seed` (the original app code, unchanged, plus CLAUDE.md and frequent_foods.csv).
- **Next: commit 2**: delete the tiiny.host analytics and ad scripts from `index.html` (the `<!-- tracking scripts -->` block, 3 script lines). Nothing else changes.
- **Then: commit 3 (PWA)**: `manifest.json`, `sw.js`, 192/512 icons, `<head>` links, SW registration in `script.js`. Open question: reuse the old APK's protein-tub icon, or make an orange-on-black one?

## Approved changes (build list)
1. Host on GitHub Pages instead of tiiny.host
2. Convert the APK to a PWA (installable, full-screen, offline-capable)
3. Google Sheet as the data store instead of localStorage (Apps Script latency is acceptable)
4. Edit and delete single food entries
5. Timestamp each entry logged to the Sheet (the Sheet doubles as a logbook for tracking progress)
6. Decimal input (`parseFloat` instead of `parseInt`)
7. UI overhaul, with live preview during development (mockups first, then implement)

Secondary, later: Wear OS Tile showing consumed/target macros, reading from the same Apps Script `doGet`.

## Build order
1. ~~Baseline commit~~ → remove tiiny scripts → PWA
2. Sheet backend: Apps Script web app (`doPost`: add/edit/delete/reset/save-preset/backfill; `doGet`: today's totals + targets + presets). Entry IDs, ISO dates (`YYYY-MM-DD`) and timestamps for Sheet rows, decimals, target persisted in the Sheet, local cache + offline retry queue.
3. Import `frequent_foods.csv` into the Sheet's Frequent Foods tab (one-time migration).
4. UI overhaul + edit/delete together (so the controls are designed in, not bolted on).
5. Wear OS (later).

## Sheet/Apps Script rules
- Apps Script deployed as "Execute as: Me, Access: Anyone"; require a secret token on every request.
- **Never commit the Apps Script URL or token** (public repo). The user enters them once in an in-app settings field; stored in localStorage on the phone only.
- POST as `Content-Type: text/plain` with a JSON string body to avoid CORS preflight.
- Set the script timezone so "today" matches the user's.
- Use a separate dev Sheet during development so test entries stay out of the real logbook.

## Current data model (old app)
- localStorage `foodEntries`: `{ [dateKey]: [{meal, name, calories, carbs, proteins, fats}] }`
- localStorage `foodHistory`: per-date totals
- localStorage `frequentFoods`: presets
- `dateKey` = `new Date().toLocaleDateString()` (locale-dependent; keep for legacy, use ISO for the Sheet)
- Macro targets from the calorie target via a fixed 40/30/30 C/P/F split. The target is not persisted (resets on refresh).
- Known issues: duplicate `c` key in `saveFrequent()`; `parseInt` truncates decimals; commas stripped from names in the CSV export.

## Migration notes
- Old app is an APK with the files bundled inside it; USB/WebView debugging could not be established, so the 2+ years of history stay in the old APK. Keep the old APK installed.
- Frequent foods were recovered from screenshots into `frequent_foods.csv` (14 items). Seed list only; after import, presets live in the Sheet.

## Working preferences (important)
- Build on existing code; make the smallest targeted change per step.
- Preserve existing functionality, IDs, and styling unless the change is the point.
- No silent cleanup or unrequested features. Flag issues instead of fixing them unasked.
- One logical change per commit, with a clear commit message.
- Explanations: concise, bullet points, direct. No filler.
- User previews in VS Code Live Server and on the phone via the Pages URL.

## Current design (not locked in; the UI overhaul may change it)
- Terminal-like: black background `#000`; container `#020202`, max-width 600px, 20px padding, 8px radius, 1px `#c6c5c2` outline.
- Orange `#e84f17` headings, buttons, labels; gray inputs `#c6c5c2`; text `#dedede`; over-target values red.
- Reset/CSV buttons `#dc3545` (hover `#c82333`); button hover `#218838`.
- Body font Courier New monospace; headings Roboto; numeric inputs 120px wide.
- Food list is sentence-style: `Chicken • 400 kcal | 20 g C, 50 g P, 10 g F`, with the name and macro letters in orange.
