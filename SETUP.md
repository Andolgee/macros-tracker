# Setting up your own Food Tracker

This guide gets you your own copy of the app: a macro tracker you install on your phone, which logs every day to your own Google Sheet. It takes about 30 minutes. You need a GitHub account, a Google account, and an Android phone with Chrome.

Nothing here costs money, and your data stays in your own Google account.

## How it fits together

- **The app** is a web page hosted free on GitHub Pages. You install it on your phone like an app, and it works offline.
- **Your phone is the source of truth.** Today's food and totals are stored on the phone, so the app never waits on the internet.
- **Your Google Sheet is the logbook.** A few seconds after every change, the app sends that day's list to the Sheet through a small Google Apps Script. If you're offline, it retries later.

## 1. Copy the app to your GitHub account

1. Sign in to GitHub and open https://github.com/Andolgee/macros-tracker.
2. Click **Fork**, then **Create fork**. You now have your own copy of the code.
3. In your fork, go to **Settings → Pages**.
4. Under **Build and deployment**, set **Source** to **Deploy from a branch**, the branch to **main**, and the folder to **/ (root)**. Click **Save**.
5. After a minute or two, the page shows your app's address: `https://YOUR-GITHUB-NAME.github.io/macros-tracker/`. Keep it for step 4.

Your fork is public, like the original. That's fine: it contains no personal data. **Never add your script URL or token to the repo** (see step 3).

## 2. Create the Google Sheet

1. Go to [sheets.new](https://sheets.new) and name the sheet, for example **Food Tracker**.
2. Create these five tabs. The **tab names and header rows must match exactly**, including capitals and spaces, because the script looks them up by name.

   To fill a header row, click cell A1 of the tab and paste the line. If it all lands in one cell, use **Data → Split text to columns** with **Tab** as the separator.

   **`Entries`** (rename the first tab):
   ```
   id	date	meal	name	calories	carbs	proteins	fats
   ```

   **`Frequent Foods`**:
   ```
   name	calories	carbs	proteins	fats
   ```

   **`Settings`**: type `key` in A1, `value` in B1, `target_calories` in A2, and your daily calorie target as a plain number in B2 (for example `2200`).

   **`Daily Targets`**:
   ```
   date	target_calories
   ```

   **`Daily Totals`**: leave the headers to the formulas below.

3. **Set text columns to Plain text**, so Sheets doesn't turn dates or food names like `1/2 banana` into something else. Select the columns, then **Format → Number → Plain text**:
   - `Entries`: columns **A, B, C and D**
   - `Frequent Foods`: column **A**
   - `Daily Targets`: column **A**

4. **Add the Daily Totals formulas.** In the `Daily Totals` tab:

   Cell **A1** (one row per day: date, summed macros, number of entries):
   ```
   =QUERY(Entries!A:H, "select B, sum(E), sum(F), sum(G), sum(H), count(D) where B is not null group by B order by B desc label B 'date', sum(E) 'calories', sum(F) 'carbs', sum(G) 'proteins', sum(H) 'fats', count(D) 'entries'", 1)
   ```

   Cell **G1** (that day's targets, using the app's 40/30/30 carbs/protein/fat split):
   ```
   =ARRAYFORMULA({"target_calories","target_carbs","target_proteins","target_fats"; IFERROR(ROUND(VLOOKUP(A2:A,'Daily Targets'!A:B,2,FALSE)*{1,0.1,0.075,0.3/9},1),"")})
   ```

   Until your first food is logged, A1 shows an error mentioning `AVG_SUM_ONLY_NUMERIC`. That's expected, and it clears on its own. Never type anything else in this tab.

5. **Optional: shade alternate days** in `Entries`, so each day reads as a block. Select columns A–H, then **Format → Conditional formatting**. Set **Apply to range** to `A2:H`, choose **Custom formula is**, paste the formula below, and pick a light fill colour:
   ```
   =AND($B2<>"", ISEVEN(COUNTUNIQUE($B$2:$B2)))
   ```

6. **Optional: add your usual foods** to `Frequent Foods` (name, calories, carbs, protein, fat). They appear in the app's preset list. You can also save presets from the app later.

You can colour, bold or resize anything for readability. Just don't rename tabs, change headers, reorder columns, merge cells, or type outside the tables.

## 3. Connect the Sheet with Apps Script

1. In the Sheet, open **Extensions → Apps Script**.
2. In your fork on GitHub, open `apps-script/Code.gs`, copy all of it, and paste it over everything in the editor's `Code.gs`. Press **Ctrl+S** to save.
3. **Choose a token.** This is a password only your app will know.
   - Use something long and random, with only letters, numbers, `-` and `_`. For example, open your browser's console (F12 → Console), run `crypto.randomUUID()`, and copy the result.
   - In the editor, click **⚙ Project Settings**, scroll to **Script properties**, and click **Add script property**. Set **Property** to `TOKEN` and **Value** to your token, then click **Save script properties**.
   - Keep a copy of the token somewhere private, like a password manager.
4. **Deploy:**
   - Click **Deploy → New deployment**, click the **⚙** next to "Select type", and choose **Web app**.
   - Set **Execute as** to **Me** and **Who has access** to **Anyone**. Click **Deploy**.
   - Click **Authorize access** and choose your account. Google warns that it "hasn't verified this app". That's normal for a script you run yourself: click **Advanced**, then **Go to … (unsafe)**, then **Allow**.
5. Copy the **Web app URL** (it ends in `/exec`). If a Library URL is also shown, ignore it.
6. **Test it.** Open this in your browser, with your own URL, token and today's date:
   ```
   YOUR_WEB_APP_URL?token=YOUR_TOKEN&action=load&date=2026-01-31
   ```
   You should see something like `{"ok":true,"target":2200,"presets":[…],"entries":[],"url":"…"}`. With a wrong token, you get `{"ok":false,"error":"unauthorized"}`.

**Why "Anyone" is safe:** the URL alone does nothing. Every request must include your token, or the script refuses it. The script runs as you, but it can only do its four actions on this one Sheet. If your token ever leaks, change the `TOKEN` property and enter the new one in the app; the old one stops working immediately.

## 4. Install the app on your phone

1. On your Android phone, open your app's address (from step 1) in **Chrome**.
2. Tap **⋮ → Install app** (or **Add to home screen → Install**). The app appears on your home screen.
3. Open it from the home screen, scroll to the bottom, and open **⚙ Sync settings**.
4. Paste your **Web app URL** and **token**, tap **Test** (it should say Connected ✓), then tap **Save**.
5. Within a few seconds, your target and presets load from the Sheet, and the header shows **● synced**.
6. Log a test food. It should appear in the Sheet's `Entries` tab about 2 seconds later. Tap it in the app and delete it (two taps) to clear it.

## Using it

- **Add food:** pick a preset or type it in, then tap **+ Add**. Tap **Save preset** to keep it for next time.
- **Edit or delete:** tap any food under TODAY. Tap the ☆ in the editor to save that food as a preset.
- **Totals:** each tile fills as you approach its target, and glows red when you go over.
- **Target:** set it under TARGET. It's saved and synced.
- **Reset day:** clears today (two taps), in the app and the Sheet.
- **Sync now:** sends any waiting changes. The time of the last sync shows underneath.
- **Open sheet ↗** (in settings): opens your logbook.
- **The app only edits today.** To fix a past day, edit it in the Sheet. Don't edit today's rows in the Sheet: the app's next change replaces them.
- **Log on one device per day.** Each device sends its own full copy of the day, so logging on two devices on the same day overwrites entries.

## Updating the script later

If `apps-script/Code.gs` changes, paste the new version into the editor and save. Then go to **Deploy → Manage deployments**, click **✏️**, set **Version** to **New version**, and click **Deploy**. This keeps the same URL. Choosing "New deployment" instead creates a new URL, which you'd then have to re-enter in the app.

## Optional: a test Sheet

If you plan to change the code, make a second Sheet (**File → Make a copy**, then clear its test rows) with its own token and deployment. Point your computer's copy of the app at the test Sheet, and your phone at the real one, so testing never touches your real log.

## Troubleshooting

| What you see | What to do |
|---|---|
| Test says `Error: unauthorized` | The token in the app doesn't match the `TOKEN` script property. Check for typos or stray spaces. |
| Test says `could not reach the script` | Check the URL ends in `/exec` and that you deployed as a **Web app** with access **Anyone**. |
| Badge shows **● unsynced** for a long time | You're probably offline. It syncs on its own once you're back online, or tap **Sync now**. |
| Error mentioning `missing tab` | A tab name doesn't match exactly. Compare it with step 2. |
| **Open sheet** says "Sync first" | Tap **Sync now** once. If it still says that, the deployed script is older than the one in the repo: update it (see above). |
| The app still looks old after an update | Fully close the app and reopen it. Do it twice if needed. |
| `Daily Totals` shows an error | Normal while `Entries` is empty. |
