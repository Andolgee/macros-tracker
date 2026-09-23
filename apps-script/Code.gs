/**
 * Food Tracker — Apps Script backend
 *
 * Deploy as web app: Execute as "Me", Access "Anyone".
 * Secret token lives in Project Settings → Script properties, key TOKEN (never in this file).
 *
 * App calls: POST, Content-Type text/plain, body = JSON string:
 *   { token, action: 'load',       date: 'YYYY-MM-DD' }
 *   { token, action: 'saveDay',    date, entries: [{id, meal, name, calories, carbs, proteins, fats}], target }
 *   { token, action: 'saveTarget', target }
 *   { token, action: 'savePreset', preset: {name, calories, carbs, proteins, fats} }
 * GET (read-only, for testing / Wear OS): ?token=…&action=load&date=YYYY-MM-DD
 * Every response: { ok: true, … } or { ok: false, error }
 */

const TAB = {
    entries:  'Entries',
    presets:  'Frequent Foods',
    settings: 'Settings',
    targets:  'Daily Targets'
};
const ENTRY_WIDTH  = 8;   // id | date | meal | name | calories | carbs | proteins | fats
const PRESET_WIDTH = 5;   // name | calories | carbs | proteins | fats
const MACROS = ['calories', 'carbs', 'proteins', 'fats'];

/* === ENTRY POINTS === */

function doPost(e) {
    let req;
    try {
        req = JSON.parse(e.postData.contents);
    } catch (err) {
        return reply({ ok: false, error: 'bad_json' });
    }
    return handle(req);
}

function doGet(e) {
    const req = e.parameter || {};
    if (req.action !== 'load') return reply({ ok: false, error: 'get_is_read_only' });
    return handle(req);
}

function handle(req) {
    const token = PropertiesService.getScriptProperties().getProperty('TOKEN');
    if (!token || req.token !== token) return reply({ ok: false, error: 'unauthorized' });

    const lock = LockService.getScriptLock();
    if (!lock.tryLock(20000)) return reply({ ok: false, error: 'busy' });
    try {
        const ss = SpreadsheetApp.getActive();
        switch (req.action) {
            case 'load':       return reply(load(ss, req));
            case 'saveDay':    return reply(saveDay(ss, req));
            case 'saveTarget': return reply(saveTarget(ss, req));
            case 'savePreset': return reply(savePreset(ss, req));
            default:           return reply({ ok: false, error: 'unknown_action' });
        }
    } catch (err) {
        return reply({ ok: false, error: err.message });
    } finally {
        lock.releaseLock();
    }
}

/* === ACTIONS === */

// Target, presets, and one date's entries
function load(ss, req) {
    const date = checkDate(req.date);
    const tz = ss.getSpreadsheetTimeZone();

    const entries = readRows(tab(ss, TAB.entries), ENTRY_WIDTH)
        .filter(r => toDate(r[1], tz) === date)
        .map(r => ({
            id: String(r[0]), date, meal: String(r[2]), name: String(r[3]),
            calories: Number(r[4]), carbs: Number(r[5]), proteins: Number(r[6]), fats: Number(r[7])
        }));

    const presets = readRows(tab(ss, TAB.presets), PRESET_WIDTH)
        .filter(r => String(r[0]) !== '')
        .map(r => ({
            name: String(r[0]),
            calories: Number(r[1]), carbs: Number(r[2]), proteins: Number(r[3]), fats: Number(r[4])
        }));

    return { ok: true, target: getTarget(ss), presets, entries };
}

// Replace all rows for one date with the app's snapshot; record that day's target
function saveDay(ss, req) {
    const date = checkDate(req.date);
    if (!Array.isArray(req.entries)) throw new Error('entries must be an array');
    const tz = ss.getSpreadsheetTimeZone();

    // Validate everything before touching the sheet
    const rows = req.entries.map(en => {
        if (!en.id) throw new Error('entry without id');
        return [String(en.id), date, String(en.meal || ''), String(en.name || '')]
            .concat(MACROS.map(k => toNum(en[k], k)));
    });
    const hasTarget = rows.length && req.target !== undefined && req.target !== null && req.target !== '';
    const target = hasTarget ? toNum(req.target, 'target') : null;

    const sh = tab(ss, TAB.entries);
    deleteRowsWhere(sh, ENTRY_WIDTH, r => toDate(r[1], tz) === date);
    appendRows(sh, rows, 4);

    const tsh = tab(ss, TAB.targets);
    deleteRowsWhere(tsh, 2, r => toDate(r[0], tz) === date);
    if (target !== null) appendRows(tsh, [[date, target]], 1);

    return { ok: true, date, count: rows.length };
}

function saveTarget(ss, req) {
    const target = toNum(req.target, 'target');
    if (target <= 0) throw new Error('target must be positive');
    const sh = tab(ss, TAB.settings);
    sh.getRange(settingRow(sh, 'target_calories', true), 2).setValue(target);
    return { ok: true, target };
}

// Adds the preset only if no preset has that exact name (same rule as the app)
function savePreset(ss, req) {
    const p = req.preset || {};
    const name = String(p.name || '');
    if (!name.trim()) throw new Error('preset needs a name');
    const row = [name].concat(MACROS.map(k => toNum(p[k], k)));

    const sh = tab(ss, TAB.presets);
    const exists = readRows(sh, PRESET_WIDTH).some(r => String(r[0]) === name);
    if (!exists) appendRows(sh, [row], 1);
    return { ok: true, added: !exists };
}

/* === HELPERS === */

function tab(ss, name) {
    const sh = ss.getSheetByName(name);
    if (!sh) throw new Error('missing tab: ' + name);
    return sh;
}

// All rows below the header, first `width` columns
function readRows(sh, width) {
    const n = sh.getLastRow() - 1;
    return n > 0 ? sh.getRange(2, 1, n, width).getValues() : [];
}

// Delete matching rows bottom-up, one call per block of adjacent rows
function deleteRowsWhere(sh, width, test) {
    const data = readRows(sh, width);
    if (sh.getMaxRows() === sh.getLastRow()) sh.insertRowsAfter(sh.getMaxRows(), 1); // Sheets refuses to delete every row
    for (let i = data.length - 1; i >= 0; i--) {
        if (!test(data[i])) continue;
        let start = i;
        while (start > 0 && test(data[start - 1])) start--;
        sh.deleteRows(start + 2, i - start + 1);
        i = start;
    }
}

// Append below the last row; the first `textCols` columns are stored as plain text
function appendRows(sh, rows, textCols) {
    if (!rows.length) return;
    const start = sh.getLastRow() + 1;
    const extra = start + rows.length - 1 - sh.getMaxRows();
    if (extra > 0) sh.insertRowsAfter(sh.getMaxRows(), extra);
    sh.getRange(start, 1, rows.length, textCols).setNumberFormat('@');
    sh.getRange(start, 1, rows.length, rows[0].length).setValues(rows);
}

function settingRow(sh, key, create) {
    const keys = readRows(sh, 1).map(r => String(r[0]));
    const i = keys.indexOf(key);
    if (i >= 0) return i + 2;
    if (!create) return 0;
    sh.appendRow([key, '']);
    return sh.getLastRow();
}

function getTarget(ss) {
    const sh = tab(ss, TAB.settings);
    const row = settingRow(sh, 'target_calories', false);
    if (!row) return null;
    const v = sh.getRange(row, 2).getValue();
    return v === '' ? null : Number(v);
}

function checkDate(d) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d))) throw new Error('date must be YYYY-MM-DD');
    return String(d);
}

// Sheet cell → 'YYYY-MM-DD', including cells Sheets auto-converted into real dates
function toDate(v, tz) {
    return v instanceof Date ? Utilities.formatDate(v, tz, 'yyyy-MM-dd') : String(v).trim();
}

function toNum(v, field) {
    const n = Number(v);
    if (v === '' || v === null || v === undefined || !isFinite(n)) throw new Error('bad number for ' + field);
    return n;
}

function reply(obj) {
    return ContentService.createTextOutput(JSON.stringify(obj))
        .setMimeType(ContentService.MimeType.JSON);
}
