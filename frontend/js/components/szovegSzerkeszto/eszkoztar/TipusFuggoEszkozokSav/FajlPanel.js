// frontend/js/components/szovegSzerkeszto/eszkoztar/TipusFuggoEszkozokSav/FajlPanel.js

class FajlPanel {

  // =============================================
  // KONSTRUKTOR
  // =============================================
  // @param {Object}   callbacks                    - Esemény visszahívók
  // @param {Function} callbacks.onFajlFeltoltes    - Fájl feltöltés indítása
  // @param {Function} callbacks.onBetumeretValtozas - Betűméret változásakor (meret: szám px-ben)
  // @param {Object}   segedek                      - Közös segédmetódusok a TipusFuggoEszkozokSav-tól
  constructor(callbacks, segedek) {
    console.log('FajlPanel.constructor - KEZDÉS', callbacks);

    // Visszahívók eltárolása
    this.callbacks = callbacks;

    // Közös segédmetódusok eltárolása
    this.segedek = segedek;

    // DOM elem referencia (letrehozas() után töltődik fel)
    this.elem = null;

    // Eszköz referenciák az állapotfrissítéshez
    // Formátum: { eszkozNev: domElem }
    this.eszkozReferenciák = {};

    console.log('FajlPanel.constructor - VÉGE');
  }

  // =============================================
  // DOM ELEM LÉTREHOZÁSA
  // =============================================
  // Felépíti a fájl panel DOM struktúráját:
  // Feltöltés gomb + elválasztó + betűméret gombok
  // @returns {HTMLElement} A kész panel div eleme
  letrehozas() {
    console.log('FajlPanel.letrehozas - KEZDÉS');

    // Alap panel konténer létrehozása a közös segéddel
    const panel = this.segedek.panelAlapLetrehozasa('fajl');

    // Feltöltés gomb
    const feltoltesGomb = this._feltoltesGombLetrehozasa();
    panel.appendChild(feltoltesGomb);

    // Elválasztó — feltöltés gomb és betűméret sor között
    panel.appendChild(this.segedek.elvalasztoLetrehozasa());

    // Betűméret gombok sora
    const betumeretSor = this._betumeretSorLetrehozasa();
    panel.appendChild(betumeretSor);

    // Elem referencia eltárolása
    this.elem = panel;

    console.log('FajlPanel.letrehozas - VÉGE');
    return panel;
  }

  // =============================================
  // ÁLLAPOT FRISSÍTÉSE
  // =============================================
  // A TipusFuggoEszkozokSav hívja, amikor az aktív blokk megváltozik.
  // Frissíti a betűméret gombok aktív állapotát a blokk meretFontSize értéke alapján.
  // @param {Object} blokk - Az aktív blokk adatobjektuma
  allapotFrissitese(blokk) {
    console.log('FajlPanel.allapotFrissitese - KEZDÉS', { blokkId: blokk?.id, meretFontSize: blokk?.meretFontSize });

    // Betűméret gombok aktív állapotának frissítése
    this._betumeretGombokatFrissit(blokk?.meretFontSize ?? null);

    console.log('FajlPanel.allapotFrissitese - VÉGE', { blokkId: blokk?.id });
  }

  // =============================================
  // PRIVÁT - FELTÖLTÉS GOMB LÉTREHOZÁSA
  // =============================================
  // @returns {HTMLElement} A kész gomb elem
  _feltoltesGombLetrehozasa() {
    console.log('FajlPanel._feltoltesGombLetrehozasa - KEZDÉS');

    const gomb = document.createElement('button');
    gomb.type = 'button';
    gomb.className = 'eszkoztar-gomb';
    gomb.textContent = '📎 Fájl feltöltése';
    gomb.setAttribute('aria-label', 'Fájl feltöltése');

    // Fókuszvesztés megakadályozása — ne veszítse el a blokk a fókuszt
    gomb.addEventListener('mousedown', (e) => e.preventDefault());

    // Kattintáskor callback hívás
    gomb.addEventListener('click', () => {
      console.log('FajlPanel._feltoltesGombLetrehozasa - kattintás');
      if (this.callbacks.onFajlFeltoltes) {
        this.callbacks.onFajlFeltoltes();
      }
    });

    console.log('FajlPanel._feltoltesGombLetrehozasa - VÉGE');
    return gomb;
  }

  // =============================================
// PRIVÁT - BETŰMÉRET LEGÖRDÜLŐ LÉTREHOZÁSA
// =============================================
// Legördülő <select> a 8 előre definiált mérettel: 8 / 10 / 12 / 14 / 16 / 20 / 24 px.
// Változáskor azonnal meghívja az onBetumeretValtozas callbacket.
// A select referenciáját eltárolja az eszkozReferenciák-ban,
// hogy az allapotFrissitese() tudja frissíteni az aktív értéket.
// @returns {HTMLElement} A kész wrapper elem
_betumeretSorLetrehozasa() {
  console.log('FajlPanel._betumeretSorLetrehozasa - KEZDÉS');

  // Wrapper — az eszkoztar-select-wrapper stílust kapja
  const wrapper = document.createElement('div');
  wrapper.className = 'eszkoztar-select-wrapper';

  // A legördülő mező
  const select = document.createElement('select');
  select.className = 'eszkoztar-select';
  select.setAttribute('aria-label', 'Betűméret');

  // Előre definiált méretek px-ben — 8-tól 24-ig
  const meretek = [8, 10, 12, 14, 16, 20, 24];

  // Üres alapértelmezett opció — ha nincs még méret beállítva
  const alapOption = document.createElement('option');
  alapOption.value = '';
  alapOption.textContent = 'Méret';
  alapOption.disabled = true;
  alapOption.selected = true;
  select.appendChild(alapOption);

  // Méret opciók hozzáadása
  meretek.forEach((meret) => {
    const option = document.createElement('option');
    option.value = meret;
    option.textContent = `${meret}px`;
    select.appendChild(option);
  });

  // Fókuszvesztés megakadályozása mousedown-on
  select.addEventListener('mousedown', (e) => e.stopPropagation());

  // Változáskor azonnal alkalmazza a méretet
  select.addEventListener('change', () => {
    const kivalasztottMeret = parseInt(select.value);
    console.log('FajlPanel._betumeretSorLetrehozasa - változás', kivalasztottMeret);
    if (this.callbacks.onBetumeretValtozas) {
      this.callbacks.onBetumeretValtozas(kivalasztottMeret);
    }
  });

  // Referencia eltárolása az állapotfrissítéshez
  this.eszkozReferenciák['betumeretSelect'] = select;

  wrapper.appendChild(select);

  console.log('FajlPanel._betumeretSorLetrehozasa - VÉGE');
  return wrapper;
}

  // =============================================
// PRIVÁT - BETŰMÉRET SELECT AKTÍV ÉRTÉKÉNEK FRISSÍTÉSE
// =============================================
// Az aktuális meretFontSize értékre állítja a legördülőt.
// Ha nincs meretFontSize, az üres "Méret" alapopció látszik.
// @param {number|null} aktivMeret - Az aktuálisan alkalmazott betűméret px-ben
_betumeretGombokatFrissit(aktivMeret) {
  console.log('FajlPanel._betumeretGombokatFrissit - KEZDÉS', aktivMeret);

  const select = this.eszkozReferenciák['betumeretSelect'];
  if (!select) return;

  // Ha van aktív méret és szerepel az opciók között, kiválasztjuk
  if (aktivMeret !== null && aktivMeret !== undefined) {
    select.value = aktivMeret;
  } else {
    // Nincs méret — visszaállítjuk az üres alapopciót
    select.value = '';
  }

  console.log('FajlPanel._betumeretGombokatFrissit - VÉGE', aktivMeret);
}

}

// =============================================
// EXPORTÁLÁS
// =============================================
export default FajlPanel;