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
        const today = new Date().toLocaleDateString();
        const all   = JSON.parse(localStorage.getItem('foodEntries')||'{}');

        all[today] = all[today] || [];
        all[today].push(entry);

        localStorage.setItem('foodEntries', JSON.stringify(all));
    }

    function loadEntries(){
        const today = new Date().toLocaleDateString();
        const all   = JSON.parse(localStorage.getItem('foodEntries')||'{}');

        if(all[today]) all[today].forEach(addLine);
    }

    /* === LOCAL STORAGE: daily totals === */
    function saveToLocalTotals(c,ca,pr,f){
        const today = new Date().toLocaleDateString();
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
        const today = new Date().toLocaleDateString();
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
            saveFrequent(
                nameInp.value,
                parseFloat(calInp.value),
                parseFloat(carbInp.value),
                parseFloat(protInp.value),
                parseFloat(fatInp.value)
            );

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

        targetTotals.calories = tc;
        targetTotals.carbs    = (tc*0.4)/4;
        targetTotals.proteins = (tc*0.3)/4;
        targetTotals.fats     = (tc*0.3)/9;

        tgtCal.textContent = targetTotals.calories;
        tgtCar.textContent = targetTotals.carbs.toFixed(1);
        tgtPro.textContent = targetTotals.proteins.toFixed(1);
        tgtFat.textContent = targetTotals.fats.toFixed(1);

        updateLeft();
    });

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

        delete hist[new Date().toLocaleDateString()];

        localStorage.setItem(
            'foodHistory',
            JSON.stringify(hist)
        );

        foodList.innerHTML = '';

        const all = JSON.parse(
            localStorage.getItem('foodEntries')||'{}'
        );

        delete all[new Date().toLocaleDateString()];

        localStorage.setItem(
            'foodEntries',
            JSON.stringify(all)
        );

        updateLeft();
    });

    /* =========================================================
       CSV BUTTON HANDLER — totals + entries (NO meal column)
       ========================================================= */

    csvBtn.addEventListener('click', ()=>{
        const today = new Date().toLocaleDateString();

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

    /* === INITIAL LOAD === */

    loadFrequent();
    loadTotals();
    loadEntries();
});

/* === PWA: service worker === */
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}

/* === Ask the browser not to auto-clear localStorage === */
if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist();
}
