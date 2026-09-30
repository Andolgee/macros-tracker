# Food Tracker — Project Context for Claude Code

Personal macro-tracking PWA. Plain HTML/CSS/JS (`index.html`, `style.css`, `script.js`), no framework, no build step. Served by GitHub Pages from this public repo: https://andolgee.github.io/macros-tracker/. Personal use only.

## Status
- Done: tiiny.host → GitHub Pages; PWA (installable, offline); Google Sheet sync via Apps Script; decimals; edit/delete entries; UI overhaul.
- Real Sheet ("Food Tracker") is live on the phone. The dev Sheet ("Food Tracker (dev)") is for testing; the PC's Live Server points at it.
- Remaining, later: Wear OS Tile showing consumed vs target macros, reading the script's `load` action (GET is allowed for `load` only).

## Files
- `index.html`, `style.css`, `script.js`: the app.
- `sw.js`: service worker. Network-first with `cache:'no-cache'` (always revalidates when online), falls back to cache offline. Bump `CACHE` when the asset list changes.
- `manifest.json`, `icons/icon-192.png`, `icons/icon-512.png`: PWA (standalone, black theme, old APK's protein-tub icon, transparent).
- `apps-script/Code.gs`: backend source. Pasted into each Sheet's Apps Script editor by the user; the repo copy is for version history.
- `frequent_foods.csv`: original 14-preset seed (already imported into both Sheets).

## Architecture: local-first sync
- **localStorage is the source of truth.** The app shows today only (by date key) and never depends on the Sheet for display. A new day starts a fresh list.
- **The Sheet is the logbook.** ~2s after any change (debounced), the app sends that day's full entry list (`saveDay`); the script replaces that date's rows. Retries are always safe (full snapshot, last one wins).
- **Pending lists** in localStorage (`pendingDays`, `pendingPresets`, `pendingTarget`) hold unsynced work. An item clears only when the Sheet confirms it and it didn't change mid-request. One failing item doesn't block others.
- **Triggers:** change (+2s), app open, `online`, returning to the app (`visibilitychange`), Sync now, saving sync settings.
- **Pull:** on open / return / Sync now, presets and target come from the Sheet unless the phone has unsynced changes to them. So the user can edit presets and the target in the Sheet.
- **Restore:** if the `syncReady` marker is missing (fresh install or cleared data), the first sync loads today's entries, presets and target from the Sheet, merges entries by id, shows a one-time "Restored today's entries from Sheet" alert, and holds today's sync until the restore succeeds.
- **Dates come from the phone** (`todayKey()`: local `YYYY-MM-DD`, not UTC). The user travels; the script never decides "today". No timestamps are stored.
- The app edits **today only** (no backfill). Past days are safe to edit directly in the Sheet; today's rows are overwritten by the next in-app change.

## localStorage keys
- `foodEntries`: `{ 'YYYY-MM-DD': [{ id, meal, name, calories, carbs, proteins, fats }] }`
- `foodHistory`: per-date totals (kept in step with entries; `rebuildToday()` recomputes today's)
- `frequentFoods`: presets `[{ name, calories, carbs, proteins, fats }]` (name is the key)
- `targetCalories`: calorie target; macro targets use a fixed 40/30/30 C/P/F split
- `syncUrl`, `syncToken`: entered in ⚙ Sync settings; device-only
- `sheetUrl`: the Sheet's link, returned by `load`; used by Open sheet
- `pendingDays`, `pendingPresets`, `pendingTarget`, `syncReady`, `lastSync`: sync state

## Google Sheet layout (tab and header names must match exactly)
- `Entries`: id | date | meal | name | calories | carbs | proteins | fats (A–D plain text). Alternating-day shading via conditional formatting; no blank rows.
- `Frequent Foods`: name | calories | carbs | proteins | fats (A plain text)
- `Settings`: key | value; `target_calories` in B2
- `Daily Targets`: date | target_calories (written by `saveDay`; A plain text)
- `Daily Totals`: formula-only. QUERY in A1 (date, summed macros, entry count), ARRAYFORMULA in G1 (that day's target calories + 40/30/30 macro targets). Never type in it.

## Apps Script API (`apps-script/Code.gs`)
- POST, `Content-Type: text/plain`, JSON body (avoids CORS preflight). Every request carries `token`.
- `load {date}` → `{ target, presets, entries, url }`
- `saveDay {date, entries, target}`: validates everything, then deletes that date's rows, appends the snapshot, and upserts `Daily Targets` (removed when the day is empty)
- `saveTarget {target}`; `savePreset {preset}` (adds only if the name is new)
- Script lock around every action. Errors return `{ ok:false, error }`.

## Sheet / Apps Script rules
- Deploy as a Web app: "Execute as: Me, Access: Anyone". Token lives in Script Properties (`TOKEN`), never in code. Dev and real Sheets have different tokens and URLs.
- **Never commit the Apps Script URL, token or Sheet link** (public repo).
- After changing `Code.gs`, the user must paste it into each Sheet and use Deploy → Manage deployments → ✏️ → New version (keeps the URL). "New deployment" would change the URL.
- Test against the dev Sheet, never the real one.

## UI (refined terminal, decided through mockups)
- Order: header (`FOOD_TRACKER_` + date + sync badge) → ADD FOOD form → TOTALS → TODAY → TARGET → Reset day / Sync now → ⚙ Sync settings.
- Tokens: bg `#000`, text `#dedede`, muted `#8e8c87`, lines `#2a2927`, fields `#111`, orange `#e84f17`, red `#ff4b3a`. Macro colours: carbs `#e9b44c`, protein `#e84f17`, fats `#5fb3a3`; kcal white.
- Font: IBM Plex Mono from Google Fonts. The offline fallback (Courier New / phone monospace) is accepted; don't self-host.
- Form: preset select; meal + name; one row of four inputs `KCAL / CARBS g / PROT g / FATS g`; button row with `Save preset` on the left (narrow; shows "Preset exists" on a duplicate name) and `+ Add` on the right (wide). Adding food never checks presets.
- Totals: 2×2 tiles (KCAL, CARBS, PROT, FATS) whose background fills left to right in the macro colour; over target → red fill, red edge and a slight glow. The target field shows the current target.
- Today: two-line rows (name + kcal; meal · g C · g P · g F, with C/P/F letters in macro colours). Tapping a row opens the editor sheet.
- Editor: never auto-focus a field (no keyboard pop-up). Save, Cancel, Delete (two-tap). Star at the right end of the EDIT ENTRY heading: ☆ if no preset has the current name (tap saves the editor's values as a preset), ★ if one exists (tap does nothing).
- Reset day: two-tap confirm ("Confirm?"). Sync now: shows "last sync HH:MM" right-aligned underneath. Badge: `● synced` green / `● unsynced` orange / hidden if sync isn't set up.
- Sync settings: Apps Script URL, token, Save, Test, Open sheet ↗. CSV export was removed (the Sheet replaces it).

## Decided not to do
- Per-entry timestamps (only the date matters).
- Editing past days in the app.
- Blank separator rows in the Sheet (reliability).
- Fixing the "app left open across midnight" display edge case (never happened in 3 years).

## Known leftovers (flag, don't fix unasked)
- `saveFrequent()` builds its object with a duplicate `c` key (harmless).
- `foodHistory` duplicates what can be derived from `foodEntries`.

## Migration notes
- The old APK keeps 2+ years of history (it couldn't be extracted). Keep it installed.

## Working preferences (important)
- **Explain every change and get explicit confirmation before editing files, committing or pushing.** Approval for one step doesn't carry over to the next.
- Build on existing code; make the smallest targeted change per step. Preserve existing functionality, IDs and styling unless the change is the point.
- No silent cleanup or unrequested features. Flag issues instead of fixing them unasked.
- One logical change per commit, with a clear commit message. Push only when the user says so.
- UI changes: mockups first (private claude.ai artifact the user opens on PC and phone), then implement.
- The user tests in VS Code Live Server (dev Sheet) before a commit is pushed, then on the phone via the Pages URL.
- Explanations: concise, bullet points, direct. No filler.
- Update this file in one go at the end of a piece of work, not after every step.
