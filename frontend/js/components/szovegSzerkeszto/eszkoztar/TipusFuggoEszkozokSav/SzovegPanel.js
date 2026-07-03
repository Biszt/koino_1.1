// frontend/js/components/szovegSzerkeszto/eszkoztar/TipusFuggoEszkozokSav/SzovegPanel.js


class SzovegPanel {


// =============================================
// KONSTRUKTOR
// =============================================
// @param {Object} callbacks - Esemény visszahívók
// @param {Function} callbacks.onFelkover - Félkövér toggle
// @param {Function} callbacks.onDolt - Dőlt toggle
// @param {Function} callbacks.onAlahuzas - Aláhúzás toggle
// @param {Function} callbacks.onMeret - Méretváltás (px: szám)
// @param {Function} callbacks.onSzin - Szín alkalmazása (szin: string)
// @param {Function} callbacks.onIgazitas - Igazítás alkalmazása (igazitas: 'bal'|'kozep'|'jobb')
// @param {Object} segedek - Közös segédmetódusok a TipusFuggoEszkozokSav-tól
constructor(callbacks, segedek) {
    console.log('SzovegPanel.constructor - KEZDÉS');

    // Visszahívók eltárolása
    this.onFelkover = callbacks.onFelkover || null;
    this.onDolt     = callbacks.onDolt     || null;
    this.onAlahuzas = callbacks.onAlahuzas || null;
    this.onMeret    = callbacks.onMeret    || null;
    this.onSzin     = callbacks.onSzin     || null;
    this.onIgazitas = callbacks.onIgazitas || null;

    // Segédmetódusok eltárolása
    this.segedek = segedek;

    // DOM elem referenciák — letrehozas() után töltődnek fel
    this.elem = null;
    this.eszkozReferenciák = {};

    // A custom picker panel nyitva van-e éppen
    this._pickerNyitva = false;

    console.log('SzovegPanel.constructor - VÉGE');
}


// =============================================
// DOM ELEM LÉTREHOZÁSA
// =============================================
// Felépíti a szöveg panel összes eszközét
// @returns {HTMLElement} A kész panel div eleme
letrehozas() {
    console.log('SzovegPanel.letrehozas - KEZDÉS');

    // Alap panel konténer létrehozása a segéddel
    const panel = this.segedek.panelAlapLetrehozasa('szoveg');

    // --- FÉLKÖVÉR GOMB ---
    const felkoverGomb = this._toggleGombLetrehozasa(
        'felkover',
        `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>`,
        'Félkövér',
        () => { if (this.onFelkover) this.onFelkover(); }
    );
    panel.appendChild(felkoverGomb);

    // --- DŐLT GOMB ---
    const doltGomb = this._toggleGombLetrehozasa(
        'dolt',
        `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>`,
        'Dőlt',
        () => { if (this.onDolt) this.onDolt(); }
    );
    panel.appendChild(doltGomb);

    // --- ALÁHÚZÁS GOMB ---
    const alahuzasGomb = this._toggleGombLetrehozasa(
        'alahuzas',
        `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4v6a6 6 0 0 0 12 0V4"/><line x1="4" y1="20" x2="20" y2="20"/></svg>`,
        'Aláhúzott',
        () => { if (this.onAlahuzas) this.onAlahuzas(); }
    );
    panel.appendChild(alahuzasGomb);

    // --- ELVÁLASZTÓ ---
    panel.appendChild(this.segedek.elvalasztoLetrehozasa());

    // --- BETŰMÉRET LEGÖRDÜLŐ ---
    const betumeretWrapper = this._betumeretLegordulotrehozasa();
    panel.appendChild(betumeretWrapper);

    // --- ELVÁLASZTÓ ---
    panel.appendChild(this.segedek.elvalasztoLetrehozasa());

    // --- IGAZÍTÁS CSOPORT ---
    const igazitasCsoport = this._igazitasCsoportLetrehozasa();
    panel.appendChild(igazitasCsoport);

    // --- ELVÁLASZTÓ ---
    panel.appendChild(this.segedek.elvalasztoLetrehozasa());

    // --- SZÍN ESZKÖZ CSOPORT ---
    const szinCsoport = this._szinCsoportLetrehozasa();
    panel.appendChild(szinCsoport);

    // Elem referencia eltárolása
    this.elem = panel;

    console.log('SzovegPanel.letrehozas - VÉGE');
    return panel;
}


// =============================================
// ÁLLAPOT FRISSÍTÉSE
// =============================================
// A TipusFuggoEszkozokSav hívja, amikor az aktív blokk formázása megváltozik
// @param {Object|null} formatas - { felkover, dolt, alahuzas, meret, szin, igazitas }
allapotFrissitese(formatas) {
    console.log('SzovegPanel.allapotFrissitese - KEZDÉS', { formatas });

    if (!formatas) {
        this._toggleAllapotBeallitasa('felkover', false);
        this._toggleAllapotBeallitasa('dolt', false);
        this._toggleAllapotBeallitasa('alahuzas', false);
        this._legorduloBetumeretFrissitese(null);
        this._szinGombFrissitese(null);
        // Igazítás alapállapotba: 'bal'
        this._igazitasGombFrissitese('bal');
        console.log('SzovegPanel.allapotFrissitese - VÉGE (null formatas)');
        return;
    }

    this._toggleAllapotBeallitasa('felkover', formatas.felkover);
    this._toggleAllapotBeallitasa('dolt', formatas.dolt);
    this._toggleAllapotBeallitasa('alahuzas', formatas.alahuzas);
    this._legorduloBetumeretFrissitese(formatas.meret);
    this._szinGombFrissitese(formatas.szin);
    // Igazítás gombcsoport frissítése — alapértelmezett: 'bal'
    this._igazitasGombFrissitese(formatas.igazitas || 'bal');

    console.log('SzovegPanel.allapotFrissitese - VÉGE', { formatas });
}


// =============================================
// PRIVÁT - TOGGLE GOMB LÉTREHOZÁSA
// =============================================
// Félkövér és dőlt gombokhoz közös segéd
// @param {string} nev - Belső azonosítónév
// @param {string} ikonHtml - Az SVG ikon HTML stringként
// @param {string} ariaLabel - Képernyőolvasó felirat
// @param {Function} handler - Kattintáskor hívandó callback
// @returns {HTMLElement} A kész gomb elem
_toggleGombLetrehozasa(nev, ikonHtml, ariaLabel, handler) {
    const gomb = document.createElement('button');
    gomb.className = 'eszkoztar-gomb eszkoztar-gomb--toggle';
    gomb.setAttribute('aria-label', ariaLabel);
    gomb.setAttribute('type', 'button');
    gomb.innerHTML = ikonHtml;


    // Fókuszvesztés megakadályozása — mousedown-on dől el, click előtt
    gomb.addEventListener('mousedown', (e) => e.preventDefault());


    gomb.addEventListener('click', handler);


    // Referencia eltárolása az állapotfrissítéshez
    this.eszkozReferenciák[nev] = gomb;


    return gomb;
}


// =============================================
// PRIVÁT - BETŰMÉRET LEGÖRDÜLŐ LÉTREHOZÁSA
// =============================================
// @returns {HTMLElement} A wrapper elem a selecttel együtt
_betumeretLegordulotrehozasa() {
    const wrapper = document.createElement('div');
    wrapper.className = 'eszkoztar-select-wrapper';


    const select = document.createElement('select');
    select.className = 'eszkoztar-select';
    select.setAttribute('aria-label', 'Betűméret');


    // Elérhető betűméretek listája pixelben
    const meretek = [12, 14, 16, 18, 20, 24, 28, 32, 36, 48];
    meretek.forEach(px => {
        const option = document.createElement('option');
        option.value = px;
        option.textContent = px + ' px';
        select.appendChild(option);
    });


    // Alapértelmezett érték: 16px
    select.value = '16';


    // Változáskor alkalmazzuk a méretet, majd visszaadjuk a fókuszt az aktív blokknak.
    // A select természetéből adódóan elveszi a fókuszt — a callback végén
    // a SzovegSzerkeszto._meretValtas() gondoskodik a visszafókuszálásról.
    select.addEventListener('change', () => {
        if (this.onMeret) this.onMeret(parseInt(select.value));
    });


    wrapper.appendChild(select);


    // Referencia eltárolása
    this.eszkozReferenciák['betumeret'] = select;


    return wrapper;
}


// =============================================
// PRIVÁT - IGAZÍTÁS CSOPORT LÉTREHOZÁSA
// =============================================
// 3 egymást kizáró toggle gomb: bal, közép, jobb igazítás.
// Egyszerre csak egy lehet aktív — radio-gomb logika.
// @returns {HTMLElement} A csoport wrapper eleme
_igazitasCsoportLetrehozasa() {
    const csoport = document.createElement('div');
    csoport.className = 'eszkoztar-igazitas-csoport';


    // Igazítás gombok definíciói: belső név, aria felirat, SVG ikon
    const igazitasok = [
        {
            nev: 'igazitas-bal',
            ertek: 'bal',
            ariaLabel: 'Balra igazítás',
            // 4 vízszintes vonal: hosszú-rövid-hosszú-rövid, a rövid balra zárt
            ikon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="10" x2="14" y2="10"/><line x1="3" y1="14" x2="21" y2="14"/><line x1="3" y1="18" x2="14" y2="18"/></svg>`,
        },
        {
            nev: 'igazitas-kozep',
            ertek: 'kozep',
            ariaLabel: 'Középre igazítás',
            // 4 vízszintes vonal: hosszú-rövid-hosszú-rövid, a rövid középre zárt
            ikon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="10" x2="18" y2="10"/><line x1="3" y1="14" x2="21" y2="14"/><line x1="6" y1="18" x2="18" y2="18"/></svg>`,
        },
        {
            nev: 'igazitas-jobb',
            ertek: 'jobb',
            ariaLabel: 'Jobbra igazítás',
            // 4 vízszintes vonal: hosszú-rövid-hosszú-rövid, a rövid jobbra zárt
            ikon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="10" y1="10" x2="21" y2="10"/><line x1="3" y1="14" x2="21" y2="14"/><line x1="10" y1="18" x2="21" y2="18"/></svg>`,
        },
    ];


    igazitasok.forEach(({ nev, ertek, ariaLabel, ikon }) => {
        const gomb = document.createElement('button');
        gomb.className = 'eszkoztar-gomb eszkoztar-gomb--toggle';
        gomb.setAttribute('aria-label', ariaLabel);
        gomb.setAttribute('type', 'button');
        gomb.innerHTML = ikon;


        // Fókuszvesztés megakadályozása — mousedown-on dől el, click előtt
        gomb.addEventListener('mousedown', (e) => e.preventDefault());


        gomb.addEventListener('click', () => {
            console.log('SzovegPanel - igazítás választva:', ertek);
            // Aktív állapot azonnal frissítése a gombcsoporton
            this._igazitasGombFrissitese(ertek);
            // Callback hívása — ez alkalmazza az igazítást a blokkra
            if (this.onIgazitas) this.onIgazitas(ertek);
        });


        // Referencia eltárolása — a frissítőmetódus ezeken iterál
        this.eszkozReferenciák[nev] = gomb;


        csoport.appendChild(gomb);
    });


    return csoport;
}


// =============================================
// PRIVÁT - SZÍN CSOPORT LÉTREHOZÁSA
// =============================================
// Csak a szín gombot és a custom picker panelt tartalmazza.
// @returns {HTMLElement} A szín csoport wrapper eleme
_szinCsoportLetrehozasa() {
    const csoport = document.createElement('div');
    csoport.className = 'eszkoztar-szin-csoport';
    csoport.style.position = 'relative';

    // --- FŐ SZÍN GOMB ---
    const szinGomb = document.createElement('button');
    szinGomb.className = 'eszkoztar-gomb eszkoztar-gomb--szin';
    szinGomb.setAttribute('aria-label', 'Szöveg színe');
    szinGomb.setAttribute('type', 'button');

    // Belső wrapper div — ez kezeli a betű + csík függőleges elrendezését,
    // nem maga a gomb, így a gomb magassága természetesen 44px marad
    const szinBelso = document.createElement('div');
    szinBelso.className = 'eszkoztar-szin-gomb__belso';
    szinBelso.innerHTML = `
        <span class="eszkoztar-szin-gomb__betu" aria-hidden="true">A</span>
        <span class="eszkoztar-szin-gomb__csik" aria-hidden="true"></span>
    `;
    szinGomb.appendChild(szinBelso);

    szinGomb.addEventListener('mousedown', (e) => { e.preventDefault(); });

    szinGomb.addEventListener('click', () => {
        console.log('SzovegPanel - szinGomb click, pickerNyitva:', this._pickerNyitva);
        if (this._pickerNyitva) {
            this._pickerBezarasa();
        } else {
            this._pickerMegnyitasa();
        }
    });

    this.eszkozReferenciák['szinGomb'] = szinGomb;
    this.eszkozReferenciák['szinCsik'] = szinGomb.querySelector('.eszkoztar-szin-gomb__csik');

    csoport.appendChild(szinGomb);

    // --- CUSTOM PICKER PANEL ---
    const pickerPanel = this._pickerPanelLetrehozasa();
    csoport.appendChild(pickerPanel);
    this.eszkozReferenciák['pickerPanel'] = pickerPanel;

    return csoport;
}


// =============================================
// PRIVÁT - CUSTOM PICKER PANEL LÉTREHOZÁSA
// =============================================
// @returns {HTMLElement} A picker panel elem
_pickerPanelLetrehozasa() {
    const panel = document.createElement('div');
    panel.className = 'eszkoztar-szin-picker-panel';
    panel.style.display = 'none';


    panel.addEventListener('mousedown', (e) => {
        e.preventDefault();
    });


    // === 1. GYORS SZÍN GOMBOK ===
    const gyorsSzinekWrapper = document.createElement('div');
    gyorsSzinekWrapper.className = 'eszkoztar-szin-picker__gyors';


    const gyorsSzinek = [
        '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#ffffff',
        '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#9900ff',
        '#ff00ff', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#cfe2f3',
        '#d9d2e9', '#ead1dc', '#cc4125', '#e69138', '#f1c232', '#6aa84f', '#45818e',
        '#3d85c8', '#674ea7', '#a64d79',
    ];


    gyorsSzinek.forEach(szin => {
        const gomb = document.createElement('button');
        gomb.setAttribute('type', 'button');
        gomb.setAttribute('aria-label', szin);
        gomb.setAttribute('title', szin);
        gomb.className = 'eszkoztar-szin-picker__gyors-gomb';
        gomb.style.backgroundColor = szin;


        if (szin === '#ffffff') {
            gomb.style.border = '1px solid var(--color-border)';
        }


        gomb.addEventListener('mousedown', (e) => { e.preventDefault(); });


        gomb.addEventListener('click', () => {
            console.log('SzovegPanel - gyors szín választva:', szin);
            this._szinValasztva(szin);
        });


        gyorsSzinekWrapper.appendChild(gomb);
    });


    panel.appendChild(gyorsSzinekWrapper);


    // === 2. HUE CSÚSZKA ===
    const csuszkaWrapper = document.createElement('div');
    csuszkaWrapper.className = 'eszkoztar-szin-picker__csuszka-wrapper';


    const csuszka = document.createElement('input');
    csuszka.type = 'range';
    csuszka.min = '0';
    csuszka.max = '360';
    csuszka.value = '0';
    csuszka.className = 'eszkoztar-szin-picker__hue-csuszka';
    csuszka.setAttribute('aria-label', 'Szín árnyalata');


    csuszka.addEventListener('mousedown', (e) => { e.preventDefault(); });


    csuszka.addEventListener('input', () => {
        const hue = parseInt(csuszka.value);
        const hexErtek = this._hueToHex(hue);
        this.eszkozReferenciák['hexInput'].value = hexErtek;
        this._hexElonetFrissitese(hexErtek);
    });


    csuszka.addEventListener('change', () => {
        const hexErtek = this.eszkozReferenciák['hexInput'].value;
        this._szinValasztva(hexErtek);
    });


    csuszkaWrapper.appendChild(csuszka);
    this.eszkozReferenciák['hueCsuszka'] = csuszka;
    panel.appendChild(csuszkaWrapper);


    // === 3. HEX INPUT + ELŐNÉZET ===
    const hexSorWrapper = document.createElement('div');
    hexSorWrapper.className = 'eszkoztar-szin-picker__hex-sor';


    const elonet = document.createElement('span');
    elonet.className = 'eszkoztar-szin-picker__elonet';
    elonet.style.backgroundColor = '#000000';
    this.eszkozReferenciák['szinElonet'] = elonet;


    const hexInput = document.createElement('input');
    hexInput.type = 'text';
    hexInput.className = 'eszkoztar-szin-picker__hex-input eszkoztar-input';
    hexInput.placeholder = '#000000';
    hexInput.maxLength = 7;
    hexInput.setAttribute('aria-label', 'Hex szín érték');
    hexInput.value = '#000000';
    this.eszkozReferenciák['hexInput'] = hexInput;


    hexInput.addEventListener('input', () => {
        const ertek = hexInput.value;
        if (this._ervenyes_hex_e(ertek)) {
            this._hexElonetFrissitese(ertek);
        }
    });


    hexInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const ertek = hexInput.value;
            if (this._ervenyes_hex_e(ertek)) {
                this._szinValasztva(ertek);
            }
            e.preventDefault();
        }
    });


    const alkalmazGomb = document.createElement('button');
    alkalmazGomb.type = 'button';
    alkalmazGomb.className = 'eszkoztar-gomb eszkoztar-szin-picker__alkalmazas-gomb';
    alkalmazGomb.textContent = 'OK';
    alkalmazGomb.setAttribute('aria-label', 'Szín alkalmazása');


    alkalmazGomb.addEventListener('mousedown', (e) => { e.preventDefault(); });


    alkalmazGomb.addEventListener('click', () => {
        const ertek = hexInput.value;
        if (this._ervenyes_hex_e(ertek)) {
            this._szinValasztva(ertek);
        }
    });


    hexSorWrapper.appendChild(elonet);
    hexSorWrapper.appendChild(hexInput);
    hexSorWrapper.appendChild(alkalmazGomb);
    panel.appendChild(hexSorWrapper);


    return panel;
}


// =============================================
// PRIVÁT - PICKER MEGNYITÁSA
// =============================================
_pickerMegnyitasa() {
    console.log('SzovegPanel._pickerMegnyitasa - KEZDÉS');


    const panel   = this.eszkozReferenciák['pickerPanel'];
    const szinGomb = this.eszkozReferenciák['szinGomb'];


    if (!panel) return;


    panel.style.display = 'block';
    this._pickerNyitva = true;
    szinGomb.classList.add('eszkoztar-gomb--aktiv');


    setTimeout(() => {
        this._kivulreKattintasKezeloje = (e) => {
            const csoport = this.eszkozReferenciák['szinGomb']?.closest('.eszkoztar-szin-csoport');
            if (csoport && !csoport.contains(e.target)) {
                this._pickerBezarasa();
            }
        };
        document.addEventListener('mousedown', this._kivulreKattintasKezeloje);
    }, 0);


    console.log('SzovegPanel._pickerMegnyitasa - VÉGE');
}


// =============================================
// PRIVÁT - PICKER BEZÁRÁSA
// =============================================
_pickerBezarasa() {
    console.log('SzovegPanel._pickerBezarasa - KEZDÉS');


    const panel    = this.eszkozReferenciák['pickerPanel'];
    const szinGomb = this.eszkozReferenciák['szinGomb'];


    if (!panel) return;


    panel.style.display = 'none';
    this._pickerNyitva = false;
    szinGomb.classList.remove('eszkoztar-gomb--aktiv');


    if (this._kivulreKattintasKezeloje) {
        document.removeEventListener('mousedown', this._kivulreKattintasKezeloje);
        this._kivulreKattintasKezeloje = null;
    }


    console.log('SzovegPanel._pickerBezarasa - VÉGE');
}


// =============================================
// PRIVÁT - SZÍN KIVÁLASZTVA
// =============================================
// @param {string} hexSzin - A kiválasztott szín hex formátumban (#rrggbb)
_szinValasztva(hexSzin) {
    console.log('SzovegPanel._szinValasztva - KEZDÉS', { hexSzin });


    this._szinGombFrissitese(hexSzin);


    if (this.eszkozReferenciák['hexInput']) {
        this.eszkozReferenciák['hexInput'].value = hexSzin;
    }


    this._hexElonetFrissitese(hexSzin);


    if (this.onSzin) this.onSzin(hexSzin);


    this._pickerBezarasa();


    console.log('SzovegPanel._szinValasztva - VÉGE', { hexSzin });
}


// =============================================
// PRIVÁT - HEX ELŐNÉZET FRISSÍTÉSE
// =============================================
_hexElonetFrissitese(hexSzin) {
    const elonet = this.eszkozReferenciák['szinElonet'];
    if (elonet) {
        elonet.style.backgroundColor = hexSzin;
    }
}


// =============================================
// PRIVÁT - ÉRVÉNYES HEX-E?
// =============================================
_ervenyes_hex_e(ertek) {
    return /^#[0-9a-fA-F]{6}$/.test(ertek);
}


// =============================================
// PRIVÁT - HUE → HEX KONVERZIÓ
// =============================================
_hueToHex(hue) {
    const h = hue / 360;
    const s = 1;
    const l = 0.5;


    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;


    const r = Math.round(this._hueToRgbCsatorna(p, q, h + 1/3) * 255);
    const g = Math.round(this._hueToRgbCsatorna(p, q, h)       * 255);
    const b = Math.round(this._hueToRgbCsatorna(p, q, h - 1/3) * 255);


    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}


// =============================================
// PRIVÁT - HUE CSATORNA SEGÉD
// =============================================
_hueToRgbCsatorna(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
}


// =============================================
// PRIVÁT - TOGGLE ÁLLAPOT BEÁLLÍTÁSA
// =============================================
// @param {string} nev - Az eszköz belső neve
// @param {boolean} aktiv - Aktív-e a gomb
_toggleAllapotBeallitasa(nev, aktiv) {
    const gomb = this.eszkozReferenciák[nev];
    if (!gomb) return;


    gomb.classList.toggle('eszkoztar-gomb--aktiv', aktiv);
    gomb.setAttribute('aria-pressed', aktiv ? 'true' : 'false');
}


// =============================================
// PRIVÁT - BETŰMÉRET LEGÖRDÜLŐ FRISSÍTÉSE
// =============================================
// @param {number|null} aktivMeret - Az aktív betűméret pixelben, vagy null
_legorduloBetumeretFrissitese(aktivMeret) {
    console.log('SzovegPanel._legorduloBetumeretFrissitese - KEZDÉS', { aktivMeret });

    const select = this.eszkozReferenciák['betumeret'];
    if (!select) return;

    // Mindig frissítjük — a select.value programozott beállítása
    // nem indít change eseményt, tehát nincs végtelen ciklus veszélye
    select.value = aktivMeret ?? '16';

    console.log('SzovegPanel._legorduloBetumeretFrissitese - VÉGE', { aktivMeret });
}


// =============================================
// PRIVÁT - IGAZÍTÁS GOMB FRISSÍTÉSE
// =============================================
// A 3 igazítás gomb közül csak a kiválasztott kap aktív osztályt —
// a többi elveszíti. Radio-gomb logika.
// @param {string} aktivIgazitas - 'bal' | 'kozep' | 'jobb'
_igazitasGombFrissitese(aktivIgazitas) {
    // Belső nevek és értékek leképezése
    const igazitasMap = {
        bal:   'igazitas-bal',
        kozep: 'igazitas-kozep',
        jobb:  'igazitas-jobb',
    };


    // Végigmegyünk mindhárom gombon: az aktívnak adjuk az osztályt, a többitől vesszük
    Object.entries(igazitasMap).forEach(([ertek, nev]) => {
        const gomb = this.eszkozReferenciák[nev];
        if (!gomb) return;


        const aktiv = ertek === aktivIgazitas;
        gomb.classList.toggle('eszkoztar-gomb--aktiv', aktiv);
        gomb.setAttribute('aria-pressed', aktiv ? 'true' : 'false');
    });
}


// =============================================
// PRIVÁT - SZÍN GOMB FRISSÍTÉSE
// =============================================
// @param {string|null} szin - Az aktív szín CSS értéke, vagy null
_szinGombFrissitese(szin) {
    const csik     = this.eszkozReferenciák['szinCsik'];
    const szinGomb = this.eszkozReferenciák['szinGomb'];


    if (!csik || !szinGomb) return;


    if (szin) {
        csik.style.backgroundColor = szin;
    } else {
        csik.style.backgroundColor = '';
    }
}


}


// =============================================
// EXPORTÁLÁS
// =============================================
export default SzovegPanel;