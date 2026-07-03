// frontend/js/components/szovegSzerkeszto/eszkoztar/tipusFuggoEszkozokSav/TipusFuggoEszkozokSav.js

import SzovegPanel          from './SzovegPanel.js';
import KepPanel             from './KepPanel.js';
import FajlPanel            from './FajlPanel.js';
import LinkPanel            from './LinkPanel.js';
import EntitasHivatkozasPanel from './EntitasHivatkozasPanel.js';

class TipusFuggoEszkozokSav {

  // =============================================
  // KONSTRUKTOR
  // =============================================
  // @param {Object} callbacks - Esemény visszahívók típusonként csoportosítva
  // --- Szöveg panel ---
  // @param {Function} callbacks.onFelkover    - Félkövér toggle
  // @param {Function} callbacks.onDolt        - Dőlt toggle
  // @param {Function} callbacks.onAlahuzas    - Aláhúzás toggle
  // @param {Function} callbacks.onMeret       - Méretváltás (meret: szám, pl. 16)
  // @param {Function} callbacks.onSzin        - Szín alkalmazása (szin: string)
  // @param {Function} callbacks.onIgazitas    - Igazítás alkalmazása (bal/kozep/jobb)
  // --- Kép panel ---
  // @param {Function} callbacks.onKepFeltoltes           - Fájlválasztós képfeltöltés indítása
  // @param {Function} callbacks.onPrintScreenBeillesztes - Vágólapról kép beillesztése
  // --- Fájl panel ---
  // @param {Function} callbacks.onFajlFeltoltes          - Fájl feltöltés indítása
  // --- Link panel ---
  // @param {Function} callbacks.onLinkUrlSzerkesztes     - URL szerkesztés (ujUrl)
  // @param {Function} callbacks.onLinkFeliratSzerkesztes - Felirat szerkesztés (ujFelirat)
  // --- Fájl + Link + Entitás panel ---
  // @param {Function} callbacks.onBetumeretValtozas      - Betűméret változásakor (meret: szám px-ben)
  // --- Entitás panel ---
  // @param {Function} callbacks.onEntitasBeallitasa      - Entitás beállítása (entitasId, entitasTipus)
  constructor(callbacks) {
    console.log('TipusFuggoEszkozokSav.constructor - KEZDÉS', callbacks);

    // Az éppen látható panel típusa
    this.aktivTipus = null;

    // DOM elem referencia
    this.elem = null;

    // Közös segédmetódusok objektuma - bind(this) kell a saját kontextushoz
    const segedek = {
      panelAlapLetrehozasa:    this.panelAlapLetrehozasa.bind(this),
      elvalasztoLetrehozasa:   this.elvalasztoLetrehozasa.bind(this),
      szovegesInputLetrehozasa: this.szovegesInputLetrehozasa.bind(this),
      inputFrissitese:         this.inputFrissitese.bind(this),
    };

    // Panel példányok létrehozása
    this.panelek = {

      szoveg: new SzovegPanel(
        {
          onFelkover:  callbacks.onFelkover,
          onDolt:      callbacks.onDolt,
          onAlahuzas:  callbacks.onAlahuzas,
          onMeret:     callbacks.onMeret,
          onSzin:      callbacks.onSzin,
          onIgazitas:  callbacks.onIgazitas,
        },
        segedek
      ),

      kep: new KepPanel(
        {
          onKepFeltoltes:           callbacks.onKepFeltoltes,
          onPrintScreenBeillesztes: callbacks.onPrintScreenBeillesztes,
        },
        segedek
      ),

      // MÓDOSÍTÁS: onBetumeretValtozas callback átadva
      fajl: new FajlPanel(
        {
          onFajlFeltoltes:     callbacks.onFajlFeltoltes,
          onBetumeretValtozas: callbacks.onBetumeretValtozas,
        },
        segedek
      ),

      // MÓDOSÍTÁS: onBetumeretValtozas callback átadva
      link: new LinkPanel(
        {
          onLinkUrlSzerkesztes:     callbacks.onLinkUrlSzerkesztes,
          onLinkFeliratSzerkesztes: callbacks.onLinkFeliratSzerkesztes,
          onBetumeretValtozas:      callbacks.onBetumeretValtozas,
        },
        segedek
      ),

      // MÓDOSÍTÁS: onBetumeretValtozas callback átadva
      entitasHivatkozas: new EntitasHivatkozasPanel(
        {
          onEntitasBeallitasa: callbacks.onEntitasBeallitasa,
          onBetumeretValtozas: callbacks.onBetumeretValtozas,
        },
        segedek
      ),

    };

    console.log('TipusFuggoEszkozokSav.constructor - VÉGE');
  }

  // =============================================
  // DOM ELEM LÉTREHOZÁSA
  // =============================================
  // Felépíti a sáv konténert és minden panel DOM elemét beilleszti
  // @returns {HTMLElement} A kész sáv div eleme
  letrehozas() {
    console.log('TipusFuggoEszkozokSav.letrehozas - KEZDÉS');

    const sav = document.createElement('div');
    sav.className = 'eszkoztar-sav eszkoztar-sav--tipusfuggo';

    // Minden panel létrehozása és beillesztése - alapból mind rejtve
    Object.entries(this.panelek).forEach(([tipus, panel]) => {
      const panelElem = panel.letrehozas();
      panelElem.style.display = 'none';
      sav.appendChild(panelElem);
    });

    this.elem = sav;

    console.log('TipusFuggoEszkozokSav.letrehozas - VÉGE');
    return sav;
  }

  // =============================================
  // PANEL VÁLTÁS
  // =============================================
  // Elrejti az összes panelt, majd megmutatja a kért típust
  // @param {string} ujTipus - A megjelenítendő típus neve
  panelValtas(ujTipus) {
    console.log('TipusFuggoEszkozokSav.panelValtas - KEZDÉS', ujTipus);

    if (!this.panelek[ujTipus]) {
      console.warn('TipusFuggoEszkozokSav.panelValtas - Ismeretlen típus', ujTipus);
      Object.values(this.panelek).forEach(p => p.elem.style.display = 'none');
      return;
    }

    // Minden panelt elrejtünk
    Object.values(this.panelek).forEach(panel => panel.elem.style.display = 'none');

    // Csak a kért típust mutatjuk meg
    this.panelek[ujTipus].elem.style.display = 'flex';
    this.aktivTipus = ujTipus;

    console.log('TipusFuggoEszkozokSav.panelValtas - VÉGE', 'aktivTipus:', this.aktivTipus);
  }

  // =============================================
  // ESZKÖZÖK FRISSÍTÉSE
  // =============================================
  // A SzovegSzerkeszto hívja fókuszváltáskor.
  // Delegál az aktív panel allapotFrissitese metódushoz.
  // @param {Object}      blokk            - Az aktív blokk adatobjektuma
  // @param {Object|null} aktualisFormatas - Csak szöveg típusnál: {felkover, dolt, meret, szin, igazitas}
  eszkozokFrissitese(blokk, aktualisFormatas = null) {
    console.log('TipusFuggoEszkozokSav.eszkozokFrissitese - KEZDÉS',
      'blokkId:', blokk?.id, 'tipus:', blokk?.tipus, aktualisFormatas);

    if (!blokk) return;

    const panel = this.panelek[blokk.tipus];
    if (!panel) return;

    // Szöveg típusnál az aktualisFormatas-t adjuk át,
    // minden más típusnál a blokk adatobjektumot
    if (blokk.tipus === 'szoveg') {
      panel.allapotFrissitese(aktualisFormatas);
    } else {
      panel.allapotFrissitese(blokk);
    }

    console.log('TipusFuggoEszkozokSav.eszkozokFrissitese - VÉGE', 'blokkId:', blokk?.id);
  }

  // =============================================
  // PRIVÁT - PANEL ALAP LÉTREHOZÁSA
  // =============================================
  // @param {string} tipus - A panel típusneve dataset-hez
  // @returns {HTMLElement} Az alap panel div
  panelAlapLetrehozasa(tipus) {
    const panel = document.createElement('div');
    panel.className = 'eszkoztar-panel';
    panel.dataset.panelTipus = tipus;
    return panel;
  }

  // =============================================
  // PRIVÁT - ELVÁLASZTÓ LÉTREHOZÁSA
  // =============================================
  // @returns {HTMLElement} Az elválasztó div elem
  elvalasztoLetrehozasa() {
    const elvalaszto = document.createElement('div');
    elvalaszto.className = 'eszkoztar-elvalaszto';
    elvalaszto.setAttribute('aria-hidden', 'true');
    return elvalaszto;
  }

  // =============================================
  // PRIVÁT - SZÖVEGES INPUT LÉTREHOZÁSA
  // =============================================
  // @param {Object}   eszkozReferencik - A hívó panel referencia objektuma
  // @param {string}   eszkozNev        - Belső azonosítónév
  // @param {string}   placeholder      - Placeholder szöveg
  // @param {string}   ariaLabel        - Képernyőolvasó felirat
  // @param {Function} handler          - Input változáskor hívandó callback (ujErtek)
  // @returns {HTMLElement} A kész input wrapper elem
  szovegesInputLetrehozasa(eszkozReferencik, eszkozNev, placeholder, ariaLabel, handler) {
    const wrapper = document.createElement('div');
    wrapper.className = 'eszkoztar-input-wrapper';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'eszkoztar-input';
    input.placeholder = placeholder;
    input.setAttribute('aria-label', ariaLabel);

    input.addEventListener('input', () => {
      if (handler) handler(input.value);
    });

    // Enter lenyomásakor fókuszt vesszük el az inputról
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        input.blur();
      }
    });

    wrapper.appendChild(input);

    // Referencia eltárolása a hívó panelben
    eszkozReferencik[eszkozNev] = input;

    return wrapper;
  }

  // =============================================
  // PRIVÁT - INPUT FRISSÍTÉSE
  // =============================================
  // @param {Object} eszkozReferencik - A hívó panel referencia objektuma
  // @param {string} eszkozNev        - Az eszköz belső neve
  // @param {string} ujErtek          - Az új érték
  inputFrissitese(eszkozReferencik, eszkozNev, ujErtek) {
    const input = eszkozReferencik[eszkozNev];
    if (!input) return;

    // Csak akkor frissítünk, ha az input nincs fókuszban
    if (document.activeElement !== input) {
      input.value = ujErtek;
    }
  }

}

// =============================================
// EXPORTÁLÁS
// =============================================
export default TipusFuggoEszkozokSav;