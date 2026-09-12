// frontend/js/components/szovegSzerkeszto/eszkoztar/TipusFuggoEszkozokSav/LinkPanel.js

class LinkPanel {

  // =============================================
  // KONSTRUKTOR
  // =============================================
  // @param {Object}   callbacks                     - Esemény visszahívók
  // @param {Function} callbacks.onLinkUrlSzerkesztes    - Oké gombra kattintva (ujUrl)
  // @param {Function} callbacks.onLinkFeliratSzerkesztes - Felirat szerkesztés (ujFelirat)
  // @param {Function} callbacks.onBetumeretValtozas  - Betűméret változásakor (meret: szám px-ben)
  // @param {Object}   segedek                        - Közös segédmetódusok a TipusFuggoEszkozokSav-tól
  constructor(callbacks, segedek) {
    console.log('LinkPanel.constructor - KEZDÉS', callbacks);

    // Visszahívók eltárolása
    this.callbacks = callbacks;

    // Közös segédmetódusok eltárolása
    this.segedek = segedek;

    // DOM elem referencia (letrehozas() után töltődik fel)
    this.elem = null;

    // Eszköz referenciák az állapotfrissítéshez
    // Formátum: { eszkozNev: domElem }
    this.eszkozReferenciák = {};

    console.log('LinkPanel.constructor - VÉGE');
  }

  // =============================================
  // DOM ELEM LÉTREHOZÁSA
  // =============================================
  // Felépíti a link panel DOM struktúráját:
  // URL input + Oké gomb + elválasztó + betűméret gombok
  // @returns {HTMLElement} A kész panel div eleme
  letrehozas() {
    console.log('LinkPanel.letrehozas - KEZDÉS');

    // Alap panel konténer létrehozása a közös segéddel
    const panel = this.segedek.panelAlapLetrehozasa('link');

    // URL input a közös segéddel
    const urlInput = this.segedek.szovegesInputLetrehozasa(
      this.eszkozReferenciák, 'url',
      'https://...', 'Link URL-je',
      null // nincs azonnali onChange — az Oké gomb kezeli
    );
    panel.appendChild(urlInput);

    // Elválasztó — URL input és Oké gomb között
    panel.appendChild(this.segedek.elvalasztoLetrehozasa());

    // Oké gomb — erre kattintva kerül a link a blokkra
    const okeGomb = this._okeGombLetrehozasa();
    panel.appendChild(okeGomb);

    // Elválasztó — Oké gomb és betűméret sor között
    panel.appendChild(this.segedek.elvalasztoLetrehozasa());

    // Betűméret gombok sora
    const betumeretSor = this._betumeretSorLetrehozasa();
    panel.appendChild(betumeretSor);

    // Elem referencia eltárolása
    this.elem = panel;

    console.log('LinkPanel.letrehozas - VÉGE');
    return panel;
  }

  // =============================================
  // ÁLLAPOT FRISSÍTÉSE
  // =============================================
  // A TipusFuggoEszkozokSav hívja, amikor az aktív blokk megváltozik.
  // Frissíti az URL inputot és a betűméret gombok aktív állapotát.
  // @param {Object} blokk - Az aktív blokk adatobjektuma
  allapotFrissitese(blokk) {
    console.log('LinkPanel.allapotFrissitese - KEZDÉS', { blokkId: blokk?.id, meretFontSize: blokk?.meretFontSize });

    // URL input frissítése a blokk aktuális URL-jével
    this.segedek.inputFrissitese(this.eszkozReferenciák, 'url', blokk?.url ?? '');

    // Betűméret gombok aktív állapotának frissítése
    this._betumeretGombokatFrissit(blokk?.meretFontSize ?? null);

    console.log('LinkPanel.allapotFrissitese - VÉGE', { blokkId: blokk?.id });
  }

  // =============================================
  // PRIVÁT - OKÉ GOMB LÉTREHOZÁSA
  // =============================================
  // Kattintáskor validálja az URL-t, majd meghívja a callbacket
  // @returns {HTMLElement} A kész gomb elem
  _okeGombLetrehozasa() {
    console.log('LinkPanel._okeGombLetrehozasa - KEZDÉS');

    const gomb = document.createElement('button');
    gomb.type = 'button';
    gomb.className = 'eszkoztar-gomb eszkoztar-gomb--okegomb';
    gomb.textContent = 'Oké';
    gomb.setAttribute('aria-label', 'Link alkalmazása');

    // Fókuszvesztés megakadályozása — ne veszítse el a blokk a fókuszt
    gomb.addEventListener('mousedown', (e) => e.preventDefault());

    // Kattintáskor URL validáció és callback hívás
    gomb.addEventListener('click', () => {
      console.log('LinkPanel._okeGombLetrehozasa - kattintás');

      const inputElem = this.eszkozReferenciák['url'];
      const url = inputElem ? inputElem.value.trim() : '';

      // Validáció: csak http:// vagy https:// kezdetű URL fogadható el
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        console.warn('LinkPanel - érvénytelen URL, nem kerül alkalmazásra:', url);
        inputElem?.focus();
        return;
      }

      if (this.callbacks.onLinkUrlSzerkesztes) {
        this.callbacks.onLinkUrlSzerkesztes(url);
      }

      console.log('LinkPanel._okeGombLetrehozasa - callback meghívva', { url });
    });

    console.log('LinkPanel._okeGombLetrehozasa - VÉGE');
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
  console.log('LinkPanel._betumeretSorLetrehozasa - KEZDÉS');

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
    console.log('LinkPanel._betumeretSorLetrehozasa - változás', kivalasztottMeret);
    if (this.callbacks.onBetumeretValtozas) {
      this.callbacks.onBetumeretValtozas(kivalasztottMeret);
    }
  });

  // Referencia eltárolása az állapotfrissítéshez
  this.eszkozReferenciák['betumeretSelect'] = select;

  wrapper.appendChild(select);

  console.log('LinkPanel._betumeretSorLetrehozasa - VÉGE');
  return wrapper;
}

  // =============================================
// PRIVÁT - BETŰMÉRET SELECT AKTÍV ÉRTÉKÉNEK FRISSÍTÉSE
// =============================================
// Az aktuális meretFontSize értékre állítja a legördülőt.
// Ha nincs meretFontSize, az üres "Méret" alapopció látszik.
// @param {number|null} aktivMeret - Az aktuálisan alkalmazott betűméret px-ben
_betumeretGombokatFrissit(aktivMeret) {
  console.log('LinkPanel._betumeretGombokatFrissit - KEZDÉS', aktivMeret);

  const select = this.eszkozReferenciák['betumeretSelect'];
  if (!select) return;

  // Ha van aktív méret és szerepel az opciók között, kiválasztjuk
  if (aktivMeret !== null && aktivMeret !== undefined) {
    select.value = aktivMeret;
  } else {
    // Nincs méret — visszaállítjuk az üres alapopciót
    select.value = '';
  }

  console.log('LinkPanel._betumeretGombokatFrissit - VÉGE', aktivMeret);
}

}

// =============================================
// EXPORTÁLÁS
// =============================================
export default LinkPanel;