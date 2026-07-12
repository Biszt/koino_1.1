// frontend/js/components/szovegSzerkeszto/eszkoztar/KozosEszkozokSav/KozosEszkozokSav.js

// A KozosEszkozokSav osztály felelőssége:
// - A középső sáv DOM elemének létrehozása
// - Minden blokk típusnál elérhető eszköz gombok megjelenítése
// - Három csoport: szerkesztés, blokk kezelés, pozicionálás + méretezés
// - Gombok engedélyezett/tiltott állapotának kezelése

class KozosEszkozokSav {

// =============================================
// KONSTRUKTOR
// =============================================
// @param {Object} callbacks - Esemény visszahívók
// @param {Function} callbacks.onVisszavon   - Visszavonás gombra kattintáskor
// @param {Function} callbacks.onIsmet       - Ismét gombra kattintáskor
// @param {Function} callbacks.onUjBlokk     - Új blokk gombra kattintáskor
// @param {Function} callbacks.onTorles      - Blokk törlése gombra kattintáskor
// @param {Function} callbacks.onFel         - Blokk felfelé mozgatáskor
// @param {Function} callbacks.onLe          - Blokk lefelé mozgatáskor
// @param {Function} callbacks.onMeretez     - Méretezés gombra kattintáskor
constructor(callbacks) {
    console.log('KozosEszkozokSav.constructor - KEZDÉS', callbacks);

    // Callbackek eltárolása
    this.onVisszavon = callbacks.onVisszavon ?? null;
    this.onIsmet     = callbacks.onIsmet     ?? null;
    this.onUjBlokk   = callbacks.onUjBlokk   ?? null;
    this.onTorles    = callbacks.onTorles    ?? null;
    this.onFel       = callbacks.onFel       ?? null;
    this.onLe        = callbacks.onLe        ?? null;
    this.onMeretez   = callbacks.onMeretez   ?? null;

    // DOM elem referencia — létrehozás után töltődik fel
    this.elem = null;

    // Gomb referenciák az állapotfrissítéshez
    // Formátum: { gombNev: gombElem }
    this.gombReferenciák = {};

    console.log('KozosEszkozokSav.constructor - VÉGE');
}

// =============================================
// DOM ELEM LÉTREHOZÁSA
// =============================================
// Felépíti a középső sáv teljes struktúráját három csoporttal
// @returns {HTMLElement} A kész sáv div eleme
letrehozas() {
    console.log('KozosEszkozokSav.letrehozas - KEZDÉS');

    // A sáv konténer eleme
    const sav = document.createElement('div');
    sav.className = 'eszkoztar-sav eszkoztar-sav--kozos';

    // --- 1. CSOPORT: Szerkesztés (history) ---
    sav.appendChild(this._gombLetrehozasa('visszavon', '↩', 'Visszavonás',  this.onVisszavon));
    sav.appendChild(this._gombLetrehozasa('ismet',     '↪', 'Ismét',        this.onIsmet));

    // Elválasztó az 1. és 2. csoport között
    sav.appendChild(this._elvalasztoLetrehozasa());

    // --- 2. CSOPORT: Blokk kezelés ---
    sav.appendChild(this._gombLetrehozasa('ujBlokk', '+',  'Új blokk hozzáadása', this.onUjBlokk));
    sav.appendChild(this._gombLetrehozasa('torles',  '🗑️', 'Blokk törlése',        this.onTorles));

    // Elválasztó a 2. és 3. csoport között
    sav.appendChild(this._elvalasztoLetrehozasa());

    // --- 3. CSOPORT: Pozicionálás és méretezés ---
    sav.appendChild(this._gombLetrehozasa('fel',     '↑',  'Blokk mozgatása felfelé', this.onFel));
    sav.appendChild(this._gombLetrehozasa('le',      '↓',  'Blokk mozgatása lefelé',  this.onLe));

    // A méretezés gomb toggle viselkedésű —
    // aktív állapotát az allapotFrissites() kezeli, nem a kattintás maga
    sav.appendChild(this._gombLetrehozasa('meretez', '⤢',  'Méretezés', this.onMeretez));

    // Elem referencia eltárolása
    this.elem = sav;

    console.log('KozosEszkozokSav.letrehozas - VÉGE');
    return sav;
}

// =============================================
// GOMBOK ÁLLAPOTÁNAK FRISSÍTÉSE KÍVÜLRŐL
// =============================================
// A SzovegSzerkeszto hívja meg, amikor az aktív blokk
// vagy a history állapota változik.
// @param {Object}  allapot                       - A frissítendő állapotok
// @param {boolean} allapot.visszavonLehetseges   - Van-e visszavonható lépés
// @param {boolean} allapot.ismetLehetseges       - Van-e megismételhető lépés
// @param {boolean} allapot.felLehetseges         - Van-e blokk az aktív felett
// @param {boolean} allapot.leLehetseges          - Van-e blokk az aktív alatt
// @param {boolean} allapot.torlesLehetseges      - Törölhető-e az aktív blokk
// @param {boolean} allapot.meretezesiModAktiv    - Méretezési mód be van-e kapcsolva
allapotFrissites(allapot) {
    console.log('KozosEszkozokSav.allapotFrissites - KEZDÉS', allapot);

    // Visszavonás és ismét gombok engedélyezés/tiltás
    this._gombTiltasBeallitasa('visszavon', !allapot.visszavonLehetseges);
    this._gombTiltasBeallitasa('ismet',     !allapot.ismetLehetseges);

    // Mozgatás gombok engedélyezés/tiltás
    this._gombTiltasBeallitasa('fel', !allapot.felLehetseges);
    this._gombTiltasBeallitasa('le',  !allapot.leLehetseges);

    // Törlés gomb engedélyezés/tiltás
    this._gombTiltasBeallitasa('torles', !allapot.torlesLehetseges);

    // Méretezés gomb toggle — aktív állapot vizuálisan jelzett,
    // de NEM tiltható, mindig kattintható (ha van aktív blokk)
    this._gombAktivBeallitasa('meretez', !!allapot.meretezesiModAktiv);

    console.log('KozosEszkozokSav.allapotFrissites - VÉGE', allapot);
}

// =============================================
// PRIVÁT - GOMB LÉTREHOZÁSA
// =============================================
// Egy általános eszköz gombot hoz létre és bekötni a kattintás eseményt.
// mousedown-on megakadályozzuk a fókuszvesztést —
// így az aktív blokk fókusza megmarad, amikor a gombra koppintanak.
// @param {string}   nev       - A gomb belső neve (referenciához)
// @param {string}   felirat   - A gombon megjelenő szöveg / ikon
// @param {string}   ariaLabel - Képernyőolvasó felirat
// @param {Function} handler   - Kattintáskor hívandó callback
// @returns {HTMLElement} A kész gomb elem
_gombLetrehozasa(nev, felirat, ariaLabel, handler) {
    const gomb = document.createElement('button');
    gomb.type = 'button';                              // form submit megakadályozása
    gomb.className = 'eszkoztar-gomb eszkoztar-gomb--kozos';
    gomb.textContent = felirat;
    gomb.setAttribute('aria-label', ariaLabel);
    gomb.dataset.eszkoz = nev;                         // CSS selectorhoz is hasznos

    // Fókuszvesztés megakadályozása — az aktív blokk megtartja a fókuszt
    gomb.addEventListener('mousedown', (e) => {
        e.preventDefault();
    });

    // Kattintás esemény bekötése, ha van callback
    gomb.addEventListener('click', () => {
        if (handler) handler();
    });

    // Referencia eltárolása az állapotfrissítéshez
    this.gombReferenciák[nev] = gomb;

    return gomb;
}

// =============================================
// PRIVÁT - ELVÁLASZTÓ LÉTREHOZÁSA
// =============================================
// Vizuális elválasztót hoz létre a csoportok között
// @returns {HTMLElement} Az elválasztó div elem
_elvalasztoLetrehozasa() {
    const elvalaszto = document.createElement('div');
    elvalaszto.className = 'eszkoztar-elvalaszto';
    elvalaszto.setAttribute('aria-hidden', 'true'); // képernyőolvasó kihagyja
    return elvalaszto;
}

// =============================================
// PRIVÁT - GOMB TILTÁS BEÁLLÍTÁSA
// =============================================
// Egy adott gomb disabled állapotát állítja be
// @param {string}  gombNev - A gomb belső neve
// @param {boolean} tiltott - Tiltott legyen-e a gomb
_gombTiltasBeallitasa(gombNev, tiltott) {
    const gomb = this.gombReferenciák[gombNev];
    if (!gomb) return;

    // disabled attribútum beállítása
    gomb.disabled = tiltott;

    // Vizuális visszajelzés CSS osztállyal is
    gomb.classList.toggle('eszkoztar-gomb--tiltott', tiltott);
}

// =============================================
// PRIVÁT - GOMB AKTÍV ÁLLAPOT BEÁLLÍTÁSA
// =============================================
// Toggle típusú gomboknál (pl. méretezés) be/ki kapcsolt állapotot jelez.
// NEM tiltja a gombot, csak vizuálisan jelzi az aktív állapotot.
// @param {string}  gombNev - A gomb belső neve
// @param {boolean} aktiv   - Aktív (bekapcsolt) legyen-e a gomb
_gombAktivBeallitasa(gombNev, aktiv) {
    const gomb = this.gombReferenciák[gombNev];
    if (!gomb) return;

    // CSS osztály toggle — az eszkoztar-gomb--aktiv stílust alkalmazza/veszi le
    gomb.classList.toggle('eszkoztar-gomb--aktiv', aktiv);

    // Képernyőolvasó számára is jelzett az állapot
    gomb.setAttribute('aria-pressed', aktiv ? 'true' : 'false');
}

}

// =============================================
// EXPORTÁLÁS
// =============================================
export default KozosEszkozokSav;