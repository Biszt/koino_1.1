// frontend/js/components/szovegSzerkeszto/eszkoztar/BlokktipusSav.js

class BlokktipusSav {

// =============================================
// KONSTRUKTOR
// =============================================
// @param {Object} callbacks - Esemény visszahívók
// @param {Function} callbacks.onTipusValtas - Típusváltáskor hívódik, átadja az új típust
// @param {string} alapertelmezettTipus - Indulásnál aktívvá teendő típus (alapból: 'szoveg')
// MÓDOSÍTVA: onOldalNavigacioHozzaadasa callback eltávolítva —
// a + gomb mostantól az OldalNavigacio saját része
constructor(callbacks, alapertelmezettTipus = 'szoveg') {
    console.log('BlokktipusSav.constructor - KEZDÉS', { alapertelmezettTipus });

    // Típusváltás callback eltárolása
    this.onTipusValtas = callbacks.onTipusValtas ?? null;

    // Az éppen aktív blokk típus neve
    this.aktivTipus = alapertelmezettTipus;

    // DOM elem referencia — létrehozás után töltődik fel
    this.elem = null;

    // Gomb referenciák — az aktív állapot frissítéséhez kellenek
    // Formátum: { tipusNev: gombElem }
    this.gombReferenciák = {};

    console.log('BlokktipusSav.constructor - VÉGE');
}

// =============================================
// DOM ELEM LÉTREHOZÁSA
// =============================================
// Felépíti a felső sáv teljes struktúráját
// @returns {HTMLElement} A kész sáv div eleme
letrehozas() {
    console.log('BlokktipusSav.letrehozas - KEZDÉS');

    // A sáv konténer eleme
    const sav = document.createElement('div');
    sav.className = 'eszkoztar-sav eszkoztar-sav--tipusok';

    // Az összes elérhető blokk típus definíciója
    // ertek: a BlokkLista által ismert típusnév
    // felirat: a gombon megjelenő szöveg
    // ariaLabel: képernyőolvasónak
    const tipusok = [
        { ertek: 'szoveg',            felirat: '¶ Szöveg',  ariaLabel: 'Szöveg blokk típus' },
        { ertek: 'kep',               felirat: '🖼 Kép',     ariaLabel: 'Kép blokk típus' },
        { ertek: 'fajl',              felirat: '📎 Fájl',    ariaLabel: 'Fájl blokk típus' },
        { ertek: 'link',              felirat: '🔗 Link',    ariaLabel: 'Link blokk típus' },
        { ertek: 'entitasHivatkozas', felirat: '⬡ Entitás', ariaLabel: 'Entitás hivatkozás blokk típus' },
    ];

    // Minden típushoz létrehozunk egy gombot
    tipusok.forEach(({ ertek, felirat, ariaLabel }) => {
        const gomb = this._gombLetrehozasa(ertek, felirat, ariaLabel);
        sav.appendChild(gomb);

        // Referencia eltárolása a frissítéshez
        this.gombReferenciák[ertek] = gomb;
    });

    // Az alapértelmezett típus gombját aktívvá tesszük
    this._aktivAllapotBeallitasa(this.aktivTipus);

    // Elem referencia eltárolása
    this.elem = sav;

    console.log('BlokktipusSav.letrehozas - VÉGE');
    return sav;
}

// =============================================
// PUBLIKUS - AKTÍV TÍPUS FRISSÍTÉSE KÍVÜLRŐL
// =============================================
// A SzovegSzerkeszto hívja meg, ha a fókuszban lévő blokk típusa megváltozik
// @param {string} ujTipus - Az új aktív típus neve
tipusFrissitese(ujTipus) {
    console.log('BlokktipusSav.tipusFrissitese - KEZDÉS', { ujTipus });

    // Ha ismeretlen típus érkezik (pl. nincs ilyen gomb), nem csinálunk semmit
    if (!this.gombReferenciák[ujTipus]) {
        console.warn('BlokktipusSav.tipusFrissitese - Ismeretlen típus', ujTipus);
        return;
    }

    this.aktivTipus = ujTipus;
    this._aktivAllapotBeallitasa(ujTipus);

    console.log('BlokktipusSav.tipusFrissitese - VÉGE', { aktivTipus: this.aktivTipus });
}

// =============================================
// PRIVÁT - TÍPUSGOMB LÉTREHOZÁSA
// =============================================
// Egy típusválasztó gombot hoz létre és bekötni a kattintás eseményt
// @param {string} tipusErtek - A blokk típus neve
// @param {string} felirat - A gombon megjelenő szöveg
// @param {string} ariaLabel - Képernyőolvasó felirat
// @returns {HTMLElement} A kész gomb elem
_gombLetrehozasa(tipusErtek, felirat, ariaLabel) {
    console.log('BlokktipusSav._gombLetrehozasa - KEZDÉS', { tipusErtek });

    const gomb = document.createElement('button');
    gomb.type = 'button'; // form submit megakadályozása
    gomb.className = 'eszkoztar-gomb eszkoztar-gomb--tipus';
    gomb.textContent = felirat;
    gomb.setAttribute('aria-label', ariaLabel);
    gomb.dataset.tipus = tipusErtek; // CSS selectorhoz is hasznos

    // mousedown-on megakadályozzuk a fókuszvesztést —
    // így az aktív blokk fókusza megmarad, amikor a gombra koppintanak
    gomb.addEventListener('mousedown', (e) => {
        e.preventDefault();
    });

    // Kattintáskor az aktív állapot frissítése, majd callback hívása
    gomb.addEventListener('click', () => {
        this.aktivTipus = tipusErtek;
        this._aktivAllapotBeallitasa(tipusErtek);

        // Szülő értesítése a típusváltásról
        if (this.onTipusValtas) {
            this.onTipusValtas(tipusErtek);
        }
    });

    console.log('BlokktipusSav._gombLetrehozasa - VÉGE', { tipusErtek });
    return gomb;
}

// =============================================
// PRIVÁT - AKTÍV ÁLLAPOT BEÁLLÍTÁSA
// =============================================
// Leveszi az aktív CSS osztályt az összes gombról,
// majd rárakja az aktuálisan aktívra
// @param {string} aktivTipus - Az aktívvá teendő típus neve
_aktivAllapotBeallitasa(aktivTipus) {
    console.log('BlokktipusSav._aktivAllapotBeallitasa - KEZDÉS', { aktivTipus });

    // Minden gombról levesszük az aktív osztályt
    Object.values(this.gombReferenciák).forEach(gomb => {
        gomb.classList.remove('eszkoztar-gomb--aktiv');
        gomb.setAttribute('aria-pressed', 'false');
    });

    // Csak az aktív gombra rakjuk rá
    const aktivGomb = this.gombReferenciák[aktivTipus];
    if (aktivGomb) {
        aktivGomb.classList.add('eszkoztar-gomb--aktiv');
        aktivGomb.setAttribute('aria-pressed', 'true');
    }

    console.log('BlokktipusSav._aktivAllapotBeallitasa - VÉGE', { aktivTipus });
}

}

export default BlokktipusSav;