document.addEventListener('DOMContentLoaded', () => {

    /* === ELEMENTS === */
    const form      = document.getElementById('food-form');
    const mealSel   = document.getElementById('meal');
    const nameInp   = document.getElementById('food-name');
    const calInp    = document.getElementById('calories');
    const carbInp   = document.getElementById('carbs');
    const protInp   = document.getElementById('proteins');
    const fatInp    = document.getElementById('fats');

    const saveFreqBtn = document.getElementById('save-frequent-food');
    const freqSelect  = document.getElementById('frequent-foods');

    const tgtCalInp = document.getElementById('target-calories');
    const setTgtBtn = document.getElementById('set-target');

    const totCal = document.getElementById('total-calories');
    const totCar = document.getElementById('total-carbs');
    const totPro = document.getElementById('total-proteins');
    const totFat = document.getElementById('total-fats');

    const tgtCal = document.getElementById('target-total-calories');
    const tgtCar = document.getElementById('target-total-carbs');
    const tgtPro = document.getElementById('target-total-proteins');
    const tgtFat = document.getElementById('target-total-fats');

    const leftCal = document.getElementById('left-calories');
    const leftCar = document.getElementById('left-carbs');
    const leftPro = document.getElementById('left-proteins');
    const leftFat = document.getElementById('left-fats');

    const resetBtn = document.getElementById('reset-totals');
    const csvBtn   = document.getElementById('save-csv');

    const foodList = document.getElementById('food-list');

    /* === STATE === */
    let dailyTotals  = { calories:0, carbs:0, proteins:0, fats:0 };
    let targetTotals = { calories:0, carbs:0, proteins:0, fats:0 };

    /* === UTILS === */
    // Round for display only (hides float noise like 0.30000000000000004)
    function fmt(n){ return Math.round(n*10)/10; }

    // Today's date as YYYY-MM-DD from the device's local clock (not UTC)
    function todayKey(){
        const d = new Date();
        return d.getFullYear() + '-' +
               String(d.getMonth()+1).padStart(2,'0') + '-' +
               String(d.getDate()).padStart(2,'0');
    }

    // Unique entry id: current time + random characters
    function newId(){
        return Date.now().toString(36) + Math.random().toString(36).slice(2,8);
    }

    function updateColor(el,val){
        val < 0 ? el.classList.add('negative')
                : el.classList.remove('negative');
    }

    function updateLeft(){
        const lC  = targetTotals.calories - dailyTotals.calories;
        const lCa = targetTotals.carbs    - dailyTotals.carbs;
        const lPr = targetTotals.proteins - dailyTotals.proteins;
        const lF  = targetTotals.fats     - dailyTotals.fats;

        leftCal.textContent = fmt(lC);
        leftCar.textContent = lCa.toFixed(1);
        leftPro.textContent = lPr.toFixed(1);
        leftFat.textContent = lF.toFixed(1);

        updateColor(leftCal,lC);
        updateColor(leftCar,lCa);
        updateColor(leftPro,lPr);
        updateColor(leftFat,lF);
    }

    function updateTotals(c,ca,pr,f){
        dailyTotals.calories += c;
        dailyTotals.carbs    += ca;
        dailyTotals.proteins += pr;
        dailyTotals.fats     += f;

        totCal.textContent = fmt(dailyTotals.calories);
        totCar.textContent = fmt(dailyTotals.carbs);
        totPro.textContent = fmt(dailyTotals.proteins);
        totFat.textContent = fmt(dailyTotals.fats);

        updateLeft();
    }

    /* === FOOD LINE BUILDER === */
    function addLine(entry){
        const p = document.createElement('p');
        p.className = 'food-line';

        p.innerHTML =
            `<span class="food-name">${entry.name}</span>`+
            ` • ${entry.calories} kcal | `+
            `${entry.carbs} g <span class="macro-label">C</span>, `+
            `${entry.proteins} g <span class="macro-label">P</span>, `+
            `${entry.fats} g <span class="macro-label">F</span>`;

        foodList.appendChild(p);
    }

    /* === LOCAL STORAGE: entries === */
    function saveEntry(entry){
        const today = todayKey();
        const all   = JSON.parse(localStorage.getItem('foodEntries')||'{}');

        all[today] = all[today] || [];
        all[today].push(entry);

        localStorage.setItem('foodEntries', JSON.stringify(all));
    }

    function loadEntries(){
        const today = todayKey();
        const all   = JSON.parse(localStorage.getItem('foodEntries')||'{}');

        if(all[today]) all[today].forEach(addLine);
    }

    /* === LOCAL STORAGE: daily totals === */
    function saveToLocalTotals(c,ca,pr,f){
        const today = todayKey();
        const hist  = JSON.parse(localStorage.getItem('foodHistory')||'{}');

        if(!hist[today]){
            hist[today] = {
                calories:0,
                carbs:0,
                proteins:0,
                fats:0
            };
        }

        hist[today].calories += c;
        hist[today].carbs    += ca;
        hist[today].proteins += pr;
        hist[today].fats     += f;

        localStorage.setItem('foodHistory', JSON.stringify(hist));
    }

    function loadTotals(){
        const today = todayKey();
        const hist  = JSON.parse(localStorage.getItem('foodHistory')||'{}');

        if(hist[today]){
            dailyTotals = hist[today];

            totCal.textContent = fmt(dailyTotals.calories);
            totCar.textContent = fmt(dailyTotals.carbs);
            totPro.textContent = fmt(dailyTotals.proteins);
            totFat.textContent = fmt(dailyTotals.fats);

            updateLeft();
        }
    }

    /* === LOCAL STORAGE: frequent foods === */
    function saveFrequent(name,c,ca,pr,f){
        const foods = JSON.parse(
            localStorage.getItem('frequentFoods')||'[]'
        );

        if(!foods.some(x=>x.name===name)){
            foods.push({
                name,
                c,
                c:ca,
                carbs:ca,
                proteins:pr,
                fats:f,
                calories:c
            });

            localStorage.setItem(
                'frequentFoods',
                JSON.stringify(foods)
            );
            return true;
        }
    }

    function loadFrequent(){
        const foods = JSON.parse(
            localStorage.getItem('frequentFoods')||'[]'
        );

        freqSelect.innerHTML =
            '<option value="">Select a frequent food</option>';

        foods.forEach(food=>{
            const opt = document.createElement('option');
            opt.value = food.name;
            opt.textContent = food.name;
            freqSelect.appendChild(opt);
        });
    }

    /* === EVENT HANDLERS === */

    form.addEventListener('submit', e=>{
        e.preventDefault();

        const entry = {
            id:       newId(),
            meal:     mealSel.value,
            name:     nameInp.value,
            calories: parseFloat(calInp.value),
            carbs:    parseFloat(carbInp.value),
            proteins: parseFloat(protInp.value),
            fats:     parseFloat(fatInp.value)
        };

        updateTotals(
            entry.calories,
            entry.carbs,
            entry.proteins,
            entry.fats
        );

        saveToLocalTotals(
            entry.calories,
            entry.carbs,
            entry.proteins,
            entry.fats
        );

        addLine(entry);
        saveEntry(entry);
        markDayPending(todayKey());

        form.reset();
        freqSelect.value = "";
    });

    saveFreqBtn.addEventListener('click', ()=>{
        if(
            nameInp.value &&
            calInp.value &&
            carbInp.value &&
            protInp.value &&
            fatInp.value
        ){
            const added = saveFrequent(
                nameInp.value,
                parseFloat(calInp.value),
                parseFloat(carbInp.value),
                parseFloat(protInp.value),
                parseFloat(fatInp.value)
            );
            if(added) markPresetPending(nameInp.value);

            loadFrequent();
        }
    });

    freqSelect.addEventListener('change', ()=>{
        const sel = freqSelect.value;

        if(!sel){
            form.reset();
            return;
        }

        const foods = JSON.parse(
            localStorage.getItem('frequentFoods')||'[]'
        );

        const f = foods.find(x=>x.name===sel);

        if(f){
            nameInp.value = f.name;
            calInp.value  = f.calories;
            carbInp.value = f.carbs;
            protInp.value = f.proteins;
            fatInp.value  = f.fats;
        }
    });

    setTgtBtn.addEventListener('click', ()=>{
        const tc = parseFloat(tgtCalInp.value);

        if(!tc) return;

        applyTarget(tc);
        localStorage.setItem('targetCalories', tc);
        markTargetPending();
    });

    // Target → 40/30/30 macro targets, shown on screen
    function applyTarget(tc){
        targetTotals.calories = tc;
        targetTotals.carbs    = (tc*0.4)/4;
        targetTotals.proteins = (tc*0.3)/4;
        targetTotals.fats     = (tc*0.3)/9;

        tgtCal.textContent = targetTotals.calories;
        tgtCar.textContent = targetTotals.carbs.toFixed(1);
        tgtPro.textContent = targetTotals.proteins.toFixed(1);
        tgtFat.textContent = targetTotals.fats.toFixed(1);

        updateLeft();
    }

    resetBtn.addEventListener('click', ()=>{
        dailyTotals = {
            calories:0,
            carbs:0,
            proteins:0,
            fats:0
        };

        totCal.textContent =
        totCar.textContent =
        totPro.textContent =
        totFat.textContent = 0;

        const hist = JSON.parse(
            localStorage.getItem('foodHistory')||'{}'
        );

        delete hist[todayKey()];

        localStorage.setItem(
            'foodHistory',
            JSON.stringify(hist)
        );

        foodList.innerHTML = '';

        const all = JSON.parse(
            localStorage.getItem('foodEntries')||'{}'
        );

        delete all[todayKey()];

        localStorage.setItem(
            'foodEntries',
            JSON.stringify(all)
        );

        updateLeft();
        markDayPending(todayKey());
    });

    /* =========================================================
       CSV BUTTON HANDLER — totals + entries (NO meal column)
       ========================================================= */

    csvBtn.addEventListener('click', ()=>{
        const today = todayKey();

        /* ---------- header + daily totals ---------- */
        const rows = [
            [
                'Date',
                'Calories',
                'Carbohydrates',
                'Proteins',
                'Fats'
            ],

            [
                today,
                dailyTotals.calories,
                dailyTotals.carbs,
                dailyTotals.proteins,
                dailyTotals.fats
            ],

            [],

            [
                'Date',
                'Food',
                'Calories',
                'Carbohydrates',
                'Proteins',
                'Fats'
            ]
        ];

        /* -------- append individual entries -------- */

        const all = JSON.parse(
            localStorage.getItem('foodEntries')||'{}'
        );

        const dayEntries = all[today] || [];

        dayEntries.forEach(en=>{
            rows.push([
                today,
                en.name.replace(/,/g,' '),
                en.calories,
                en.carbs,
                en.proteins,
                en.fats
            ]);
        });

        /* Convert to CSV text */

        const csvString =
            rows.map(r=>r.join(',')).join('\r\n');

        /* Save via Blob */

        const blob = new Blob(
            [csvString],
            { type:'text/csv;charset=utf-8' }
        );

        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');

        link.href = url;
        link.download =
            `food_log_${today.replace(/\//g,'-')}.csv`;

        document.body.appendChild(link);
        link.click();

        URL.revokeObjectURL(url);
        document.body.removeChild(link);
    });

    /* === SYNC SETTINGS === */

    const syncUrlInp   = document.getElementById('sync-url');
    const syncTokenInp = document.getElementById('sync-token');
    const saveSyncBtn  = document.getElementById('save-sync');
    const testSyncBtn  = document.getElementById('test-sync');
    const syncStatus   = document.getElementById('sync-status');

    syncUrlInp.value   = localStorage.getItem('syncUrl')   || '';
    syncTokenInp.value = localStorage.getItem('syncToken') || '';

    saveSyncBtn.addEventListener('click', ()=>{
        localStorage.setItem('syncUrl',   syncUrlInp.value.trim());
        localStorage.setItem('syncToken', syncTokenInp.value.trim());
        saveSyncBtn.textContent = 'Saved';
        setTimeout(()=>{ saveSyncBtn.textContent = 'Save'; }, 1500);
        runSync(true);
    });

    // Tests the values currently in the fields (saved or not)
    testSyncBtn.addEventListener('click', ()=>{
        syncStatus.textContent = 'Testing…';
        fetch(syncUrlInp.value.trim(), {
            method:'POST',
            headers:{'Content-Type':'text/plain'},
            body:JSON.stringify({
                token:  syncTokenInp.value.trim(),
                action: 'load',
                date:   new Date().toLocaleDateString('en-CA')   // YYYY-MM-DD, local
            })
        })
        .then(r=>r.json())
        .then(res=>{
            syncStatus.textContent = res.ok ? 'Connected ✓' : 'Error: ' + res.error;
        })
        .catch(()=>{
            syncStatus.textContent = 'Error: could not reach the script';
        });
    });

    /* === SYNC === */
    // localStorage stays the source of truth; the Sheet gets a copy.
    // Unsynced changes are listed in localStorage and retried until the Sheet confirms them.

    function readJSON(key, fallback){
        return JSON.parse(localStorage.getItem(key) || fallback);
    }

    function markDayPending(date){
        const days = readJSON('pendingDays','[]');
        if(!days.includes(date)) days.push(date);
        localStorage.setItem('pendingDays', JSON.stringify(days));
        scheduleSync();
    }

    function markPresetPending(name){
        const names = readJSON('pendingPresets','[]');
        if(!names.includes(name)) names.push(name);
        localStorage.setItem('pendingPresets', JSON.stringify(names));
        scheduleSync();
    }

    function markTargetPending(){
        localStorage.setItem('pendingTarget','1');
        scheduleSync();
    }

    // Wait 2s after the last change so a burst of edits becomes one sync
    let syncTimer = null;
    function scheduleSync(){
        clearTimeout(syncTimer);
        syncTimer = setTimeout(()=>runSync(false), 2000);
    }

    // One request to the Apps Script; throws on network error, timeout or {ok:false}
    function callSheet(body){
        const ctrl  = new AbortController();
        const timer = setTimeout(()=>ctrl.abort(), 15000);

        return fetch(localStorage.getItem('syncUrl'), {
            method:'POST',
            headers:{'Content-Type':'text/plain'},
            body:JSON.stringify(Object.assign({ token:localStorage.getItem('syncToken') }, body)),
            signal:ctrl.signal
        })
        .then(r=>r.json())
        .then(res=>{
            if(!res.ok) throw new Error(res.error);
            return res;
        })
        .finally(()=>clearTimeout(timer));
    }

    let syncing = false, syncAgain = false, pullAgain = false;

    // pull = also fetch presets + target from the Sheet
    async function runSync(pull){
        if(!localStorage.getItem('syncUrl') || !localStorage.getItem('syncToken')) return;
        if(syncing){ syncAgain = true; pullAgain = pullAgain || pull; return; }

        syncing = true;
        try{
            if(!localStorage.getItem('syncReady')) await restore();
            await pushPending();
            if(pull) await pullSettings();
        }catch(err){
            // Offline or error: pending items stay and are retried at the next trigger
            console.warn('Sync failed:', err.message);
        }finally{
            syncing = false;
            if(syncAgain){
                const p = pullAgain;
                syncAgain = pullAgain = false;
                runSync(p);
            }
        }
    }

    // Send every pending item; one failing item doesn't block the others
    async function pushPending(){
        // Days: the Sheet replaces that date's rows with this full list
        for(const date of readJSON('pendingDays','[]')){
            try{
                const sent = JSON.stringify(readJSON('foodEntries','{}')[date] || []);
                await callSheet({
                    action:  'saveDay',
                    date,
                    entries: JSON.parse(sent),
                    target:  parseFloat(localStorage.getItem('targetCalories')) || null
                });
                // Clear only if the day didn't change while the request was in flight
                if(JSON.stringify(readJSON('foodEntries','{}')[date] || []) === sent){
                    const days = readJSON('pendingDays','[]').filter(d=>d!==date);
                    localStorage.setItem('pendingDays', JSON.stringify(days));
                }
            }catch(err){ console.warn('Day sync failed:', date, err.message); }
        }

        if(localStorage.getItem('pendingTarget')){
            try{
                const target = localStorage.getItem('targetCalories');
                await callSheet({ action:'saveTarget', target:parseFloat(target) });
                if(localStorage.getItem('targetCalories') === target) localStorage.removeItem('pendingTarget');
            }catch(err){ console.warn('Target sync failed:', err.message); }
        }

        for(const name of readJSON('pendingPresets','[]')){
            try{
                const p = readJSON('frequentFoods','[]').find(x=>x.name===name);
                if(p) await callSheet({
                    action:'savePreset',
                    preset:{ name:p.name, calories:p.calories, carbs:p.carbs, proteins:p.proteins, fats:p.fats }
                });
                const names = readJSON('pendingPresets','[]').filter(n=>n!==name);
                localStorage.setItem('pendingPresets', JSON.stringify(names));
            }catch(err){ console.warn('Preset sync failed:', name, err.message); }
        }
    }

    // Presets + target from the Sheet, unless the phone has unsynced changes to them
    async function pullSettings(){
        const res = await callSheet({ action:'load', date:todayKey() });

        if(!readJSON('pendingPresets','[]').length){
            localStorage.setItem('frequentFoods', JSON.stringify(res.presets));
            loadFrequent();
        }
        if(!localStorage.getItem('pendingTarget') && res.target){
            localStorage.setItem('targetCalories', res.target);
            applyTarget(res.target);
        }
    }

    // First sync on this device (fresh install or cleared data): merge in what the Sheet has
    async function restore(){
        const date = todayKey();
        const res  = await callSheet({ action:'load', date });

        // Today's entries: keep the phone's, add the Sheet's that aren't here (matched by id)
        const all   = readJSON('foodEntries','{}');
        const local = all[date] || [];
        const added = res.entries
            .filter(e=>!local.some(l=>l.id===e.id))
            .map(({id,meal,name,calories,carbs,proteins,fats})=>({id,meal,name,calories,carbs,proteins,fats}));
        all[date] = local.concat(added);
        localStorage.setItem('foodEntries', JSON.stringify(all));
        if(local.some(l=>!res.entries.some(e=>e.id===l.id))) markDayPending(date);
        if(added.length) rebuildToday();

        // Presets: the Sheet's plus any only on the phone (those get uploaded)
        const localOnly = readJSON('frequentFoods','[]')
            .filter(p=>!res.presets.some(s=>s.name===p.name));
        localStorage.setItem('frequentFoods', JSON.stringify(res.presets.concat(localOnly)));
        localOnly.forEach(p=>markPresetPending(p.name));
        loadFrequent();

        // Target: keep the phone's if it has one
        if(!localStorage.getItem('targetCalories') && res.target){
            localStorage.setItem('targetCalories', res.target);
            applyTarget(res.target);
        }

        localStorage.setItem('syncReady','1');
        if(added.length) alert("Restored today's entries from Sheet");
    }

    // Recompute today's totals from its entries and redraw the list
    function rebuildToday(){
        const date    = todayKey();
        const entries = readJSON('foodEntries','{}')[date] || [];
        const hist    = readJSON('foodHistory','{}');

        hist[date] = { calories:0, carbs:0, proteins:0, fats:0 };
        entries.forEach(e=>{
            hist[date].calories += e.calories;
            hist[date].carbs    += e.carbs;
            hist[date].proteins += e.proteins;
            hist[date].fats     += e.fats;
        });
        localStorage.setItem('foodHistory', JSON.stringify(hist));

        foodList.innerHTML = '';
        loadTotals();
        loadEntries();
    }

    window.addEventListener('online', ()=>runSync(false));
    document.addEventListener('visibilitychange', ()=>{
        if(document.visibilityState === 'visible') runSync(true);
    });

    /* === INITIAL LOAD === */

    loadFrequent();
    loadTotals();
    loadEntries();

    const savedTarget = parseFloat(localStorage.getItem('targetCalories'));
    if(savedTarget) applyTarget(savedTarget);

    runSync(true);
});

/* === PWA: service worker === */
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}

/* === Ask the browser not to auto-clear localStorage === */
if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist();
}
