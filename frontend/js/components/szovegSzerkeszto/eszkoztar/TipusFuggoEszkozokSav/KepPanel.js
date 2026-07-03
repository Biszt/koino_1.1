// frontend/js/components/szovegSzerkeszto/eszkoztar/tipusFuggoEszkozokSav/KepPanel.js

class KepPanel {

    // KONSTRUKTOR
    // param Object callbacks - Esemény visszahívók
    // param Function callbacks.onKepFeltoltes - Fájlválasztós feltöltés indítása
    // param Function callbacks.onPrintScreenBeillesztes - Vágólapról beillesztés indítása
    // param Object segedek - Közös segédmetódusok a TipusFuggoEszkozokSav-tól
    constructor(callbacks, segedek) {
        console.log('KepPanel.constructor - KEZDÉS', callbacks);

        // Visszahívók eltárolása
        this.onKepFeltoltes = callbacks.onKepFeltoltes ?? null;
        this.onPrintScreenBeillesztes = callbacks.onPrintScreenBeillesztes ?? null;

        // Közös segédmetódusok eltárolása
        this.segedek = segedek;

        // DOM elem referencia - letrehozas() után töltődik fel
        this.elem = null;

        console.log('KepPanel.constructor - VÉGE');
    }

    // DOM ELEM LÉTREHOZÁSA
    // Felépíti a kép panel teljes DOM struktúráját
    // returns HTMLElement A kész panel div eleme
    letrehozas() {
        console.log('KepPanel.letrehozas - KEZDÉS');

        // Alap panel konténer létrehozása a közös segéddel
        const panel = this.segedek.panelAlapLetrehozasa('kep');

        // --- 1. GOMB: KÉP FELTÖLTÉSE ---
        const kepFeltoltesGomb = this._gombLetrehozasa(
            // Kamera ikon SVG
            `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
            </svg>`,
            'Kép feltöltése',
            // Kattintáskor fájlválasztó dialóg megnyitása
            () => {
                console.log('KepPanel - kepFeltoltes gomb kattintva');
                if (this.onKepFeltoltes) this.onKepFeltoltes();
            }
        );
        panel.appendChild(kepFeltoltesGomb);

        // --- ELVÁLASZTÓ ---
        panel.appendChild(this.segedek.elvalasztoLetrehozasa());

        // --- 2. GOMB: PRINT SCREEN BEILLESZTÉSE ---
        const printScreenGomb = this._gombLetrehozasa(
            // Vágólap ikon SVG
            `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
            </svg>`,
            'Print screen beillesztése',
            // Kattintáskor vágólap olvasása
            () => {
                console.log('KepPanel - printScreen gomb kattintva');
                if (this.onPrintScreenBeillesztes) this.onPrintScreenBeillesztes();
            }
        );
        panel.appendChild(printScreenGomb);

        // Elem referencia eltárolása
        this.elem = panel;

        console.log('KepPanel.letrehozas - VÉGE');
        return panel;
    }

    // ÁLLAPOT FRISSÍTÉSE
    // A TipusFuggoEszkozokSav hívja, amikor a kép panel aktív és fókuszváltás történik
    // param Object blokk - Az aktív blokk adatobjektuma
    allapotFrissitese(blokk) {
        console.log('KepPanel.allapotFrissitese - KEZDÉS', 'blokkId:', blokk?.id);
        // Ennek a panelnek nincs dinamikusan frissítendő állapota
        console.log('KepPanel.allapotFrissitese - VÉGE', 'blokkId:', blokk?.id);
    }

    // PRIVÁT - GOMB LÉTREHOZÁSA
    // Közös segédmetódus a két gomb létrehozásához
    // param string ikonHtml - Az SVG ikon HTML stringként
    // param string ariaLabel - Képernyőolvasó felirat
    // param Function handler - Kattintáskor hívandó callback
    // returns HTMLElement A kész gomb elem
    _gombLetrehozasa(ikonHtml, ariaLabel, handler) {
        const gomb = document.createElement('button');
        gomb.type = 'button';

        // Eszköztár gomb stílus - ugyanaz mint a többi panel gombja
        gomb.className = 'eszkoztar-gomb';
        gomb.setAttribute('aria-label', ariaLabel);
        gomb.innerHTML = ikonHtml;

        // Fókuszvesztés megakadályozása mousedown-on - ne veszítse el a szerkesztő a fókuszt
        gomb.addEventListener('mousedown', (e) => e.preventDefault());
        gomb.addEventListener('click', handler);

        return gomb;
    }
}

// EXPORTÁLÁS
export default KepPanel;