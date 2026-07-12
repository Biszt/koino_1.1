// frontend/js/components/szovegSzerkeszto/eszkoztar/tipusFuggoEszkozokSav/EntitasHivatkozasPanel.js

// ===== IMPORTOK =====
// Közös cím-alapú kereső (ugyanaz, amit a JavaslatModal mezői is használnak)
import { entitasKereses, tipusFelirat } from '../../../../utils/entitasKeresoHelper.js';
import { tokenLekerese } from '../../../../utils/authHelper.js';

class EntitasHivatkozasPanel {

  // =============================================
  // KONSTRUKTOR
  // =============================================
  // @param {Object}   callbacks                      - Esemény visszahívók
  // @param {Function} callbacks.onEntitasBeallitasa  - Oké gombra kattintva (entitasId, entitasTipus)
  // @param {Function} callbacks.onBetumeretValtozas  - Betűméret változásakor (meret: szám px-ben)
  // @param {Object}   segedek                        - Közös segédmetódusok a TipusFuggoEszkozokSav-tól
  constructor(callbacks, segedek) {
    console.log('EntitasHivatkozasPanel.constructor - KEZDÉS', callbacks);

    // Visszahívók eltárolása
    this.callbacks = callbacks;

    // Közös segédmetódusok eltárolása
    this.segedek = segedek;

    // DOM elem referencia (letrehozas() után töltődik fel)
    this.elem = null;

    // Eszköz referenciák az állapotfrissítéshez
    // Formátum: { eszkozNev: domElem }
    this.eszkozReferenciák = {};

    // Kereső segéd-állapotok: debounce időzítő, lekérés sorszám (megkésett válasz eldobása),
    // és a blur-elrejtés időzítője
    this._keresIdozito = null;
    this._keresSorszam = 0;
    this._keresBlurIdozito = null;

    console.log('EntitasHivatkozasPanel.constructor - VÉGE');
  }

  // =============================================
  // DOM ELEM LÉTREHOZÁSA
  // =============================================
  // Felépíti az entitás hivatkozás panel teljes DOM struktúráját:
  // Típus legördülő + CÍM-KERESŐ + entitásId input + elválasztó + Oké gomb
  // + elválasztó + betűméret gombok
  // @returns {HTMLElement} A kész panel div eleme
  letrehozas() {
    console.log('EntitasHivatkozasPanel.letrehozas - KEZDÉS');

    // Alap panel konténer létrehozása a közös segéddel
    const panel = this.segedek.panelAlapLetrehozasa('entitasHivatkozas');

    // Típus legördülő létrehozása
    const tipusSelect = this._tipusSelectLetrehozasa();
    panel.appendChild(tipusSelect);

    // CÍM-KERESŐ (elsődleges): a felhasználó a címre keres, és a találatból választ.
    // A kiválasztás kitölti az ID inputot és a típus-selectet — az Oké gomb alkalmazza.
    // A nyers ID + Oké út alább KIEGÉSZÍTŐként megmarad (pl. Egyezmény/Javaslat típushoz).
    const kereso = this._keresoLetrehozasa();
    panel.appendChild(kereso);

    // EntitásId input a közös segéddel
    const idInput = this.segedek.szovegesInputLetrehozasa(
      this.eszkozReferenciák, 'entitasId',
      'Entitás ID...', 'Entitás azonosítója',
      null // nincs azonnali onChange — az Oké gomb kezeli
    );
    panel.appendChild(idInput);

    // Elválasztó — input és Oké gomb között
    panel.appendChild(this.segedek.elvalasztoLetrehozasa());

    // Oké gomb — erre kattintva kerül a hivatkozás a blokkba
    const okeGomb = this._okeGombLetrehozasa();
    panel.appendChild(okeGomb);

    // Elválasztó — Oké gomb és betűméret sor között
    panel.appendChild(this.segedek.elvalasztoLetrehozasa());

    // Betűméret gombok sora
    const betumeretSor = this._betumeretSorLetrehozasa();
    panel.appendChild(betumeretSor);

    // Elem referencia eltárolása
    this.elem = panel;

    console.log('EntitasHivatkozasPanel.letrehozas - VÉGE');
    return panel;
  }

  // =============================================
  // ÁLLAPOT FRISSÍTÉSE
  // =============================================
  // A TipusFuggoEszkozokSav hívja, amikor az entitás panel aktív
  // és fókuszváltás történik.
  // @param {Object} blokk - Az aktív blokk adatobjektuma
  allapotFrissitese(blokk) {
    console.log('EntitasHivatkozasPanel.allapotFrissitese - KEZDÉS', { blokkId: blokk?.id, meretFontSize: blokk?.meretFontSize });

    // EntitásId input frissítése a blokk aktuális értékével
    this.segedek.inputFrissitese(
      this.eszkozReferenciák, 'entitasId', blokk?.entitasId ?? ''
    );

    // Típus legördülő frissítése — ha van eltárolt típus, azt választjuk ki
    const selectElem = this.eszkozReferenciák['entitasTipus'];
    if (selectElem && blokk?.entitasTipus) {
      selectElem.value = blokk.entitasTipus;
    }

    // Betűméret gombok aktív állapotának frissítése
    this._betumeretGombokatFrissit(blokk?.meretFontSize ?? null);

    console.log('EntitasHivatkozasPanel.allapotFrissitese - VÉGE', { blokkId: blokk?.id });
  }

  // =============================================
  // PRIVÁT - TÍPUS LEGÖRDÜLŐ LÉTREHOZÁSA
  // =============================================
  // <select> elem az összes entitástípussal
  // @returns {HTMLElement} A select wrapper eleme
  _tipusSelectLetrehozasa() {
    console.log('EntitasHivatkozasPanel._tipusSelectLetrehozasa - KEZDÉS');

    const wrapper = document.createElement('div');
    wrapper.className = 'eszkoztar-input-wrapper';

    const select = document.createElement('select');
    select.className = 'eszkoztar-input eszkoztar-input--select';
    select.setAttribute('aria-label', 'Entitás típusa');

    // Elérhető entitástípusok — ikonnal és névvel
    const tipusok = [
      { ertek: 'Tartalom',      felirat: '📄 Tartalom' },
      { ertek: 'Kategoria',     felirat: '📁 Kategória' },
      { ertek: 'TartalomTipus', felirat: '🏷️ Tartalom típus' },
      { ertek: 'Egyezmeny',     felirat: '🤝 Egyezmény' },
      { ertek: 'Javaslat',      felirat: '💡 Javaslat' },
    ];

    tipusok.forEach(tipus => {
      const option = document.createElement('option');
      option.value = tipus.ertek;
      option.textContent = tipus.felirat;
      select.appendChild(option);
    });

    // Fókuszvesztés megakadályozása mousedown-on
    select.addEventListener('mousedown', (e) => e.stopPropagation());

    wrapper.appendChild(select);

    // Referencia eltárolása az állapotfrissítéshez
    this.eszkozReferenciák['entitasTipus'] = select;

    console.log('EntitasHivatkozasPanel._tipusSelectLetrehozasa - VÉGE');
    return wrapper;
  }

  // =============================================
  // PRIVÁT - OKÉ GOMB LÉTREHOZÁSA
  // =============================================
  // Kattintáskor validálja az entitásId-t,
  // majd meghívja a callbacket (entitasId, entitasTipus) paraméterekkel
  // @returns {HTMLElement} A kész gomb elem
  _okeGombLetrehozasa() {
    console.log('EntitasHivatkozasPanel._okeGombLetrehozasa - KEZDÉS');

    const gomb = document.createElement('button');
    gomb.type = 'button';
    gomb.className = 'eszkoztar-gomb eszkoztar-gomb--okegomb';
    gomb.textContent = 'Oké';
    gomb.setAttribute('aria-label', 'Entitás hivatkozás alkalmazása');

    // Fókuszvesztés megakadályozása
    gomb.addEventListener('mousedown', (e) => e.preventDefault());

    // Kattintáskor validáció és callback hívás
    gomb.addEventListener('click', () => {
      console.log('EntitasHivatkozasPanel._okeGombLetrehozasa - kattintás');

      const idInput     = this.eszkozReferenciák['entitasId'];
      const entitasId   = idInput ? idInput.value.trim() : '';
      const selectElem  = this.eszkozReferenciák['entitasTipus'];
      const entitasTipus = selectElem ? selectElem.value : 'Tartalom';

      // Validáció: az entitásId nem lehet üres
      if (!entitasId) {
        console.warn('EntitasHivatkozasPanel - üres entitásId, nem kerül alkalmazásra');
        idInput?.focus();
        return;
      }

      // Validáció: MongoDB ObjectId formátum — 24 karakteres hexadecimális string
      const mongoIdMinta = /^[a-f0-9]{24}$/i;
      if (!mongoIdMinta.test(entitasId)) {
        console.warn('EntitasHivatkozasPanel - érvénytelen ObjectId formátum:', entitasId);
        idInput?.focus();
        return;
      }

      if (this.callbacks.onEntitasBeallitasa) {
        this.callbacks.onEntitasBeallitasa(entitasId, entitasTipus);
      }

      console.log('EntitasHivatkozasPanel._okeGombLetrehozasa - callback meghívva', { entitasId, entitasTipus });
    });

    console.log('EntitasHivatkozasPanel._okeGombLetrehozasa - VÉGE');
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
  console.log('EntitasHivatkozasPanel._betumeretSorLetrehozasa - KEZDÉS');

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
    console.log('EntitasHivatkozasPanel._betumeretSorLetrehozasa - változás', kivalasztottMeret);
    if (this.callbacks.onBetumeretValtozas) {
      this.callbacks.onBetumeretValtozas(kivalasztottMeret);
    }
  });

  // Referencia eltárolása az állapotfrissítéshez
  this.eszkozReferenciák['betumeretSelect'] = select;

  wrapper.appendChild(select);

  console.log('EntitasHivatkozasPanel._betumeretSorLetrehozasa - VÉGE');
  return wrapper;
}

  // =============================================
// PRIVÁT - BETŰMÉRET SELECT AKTÍV ÉRTÉKÉNEK FRISSÍTÉSE
// =============================================
// Az aktuális meretFontSize értékre állítja a legördülőt.
// Ha nincs meretFontSize, az üres "Méret" alapopció látszik.
// @param {number|null} aktivMeret - Az aktuálisan alkalmazott betűméret px-ben
_betumeretGombokatFrissit(aktivMeret) {
  console.log('EntitasHivatkozasPanel._betumeretGombokatFrissit - KEZDÉS', aktivMeret);

  const select = this.eszkozReferenciák['betumeretSelect'];
  if (!select) return;

  // Ha van aktív méret és szerepel az opciók között, kiválasztjuk
  if (aktivMeret !== null && aktivMeret !== undefined) {
    select.value = aktivMeret;
  } else {
    // Nincs méret — visszaállítjuk az üres alapopciót
    select.value = '';
  }

  console.log('EntitasHivatkozasPanel._betumeretGombokatFrissit - VÉGE', aktivMeret);
}

  // =============================================
  // PRIVÁT - CÍM-KERESŐ LÉTREHOZÁSA
  // =============================================
  // Kereső input + legördülő találati lista. A találat kiválasztása kitölti az
  // entitásId inputot és a típus-selectet; az alkalmazás a meglévő Oké gombbal történik.
  // @returns {HTMLElement} A kereső wrapper eleme
  _keresoLetrehozasa() {
    console.log('EntitasHivatkozasPanel._keresoLetrehozasa - KEZDÉS');

    const wrapper = document.createElement('div');
    wrapper.className = 'eszkoztar-input-wrapper eszkoztar-kereso-wrapper';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'eszkoztar-input';
    input.placeholder = 'Keresés cím alapján...';
    input.setAttribute('aria-label', 'Entitás keresése cím alapján');
    input.autocomplete = 'off';

    // Találati lista (kezdetben rejtett)
    const talalatok = document.createElement('ul');
    talalatok.className = 'eszkoztar-kereso-talalatok eszkoztar-kereso-talalatok--rejtett';

    // Gépelésre: debounce, majd keresés
    input.addEventListener('input', () => {
      clearTimeout(this._keresIdozito);
      this._keresIdozito = setTimeout(() => this._keresesFuttatasa(input.value), 350);
    });

    // A toolbar ne lopja el a fókuszt az inputról
    input.addEventListener('mousedown', (e) => e.stopPropagation());

    // Fókuszvesztéskor a listát kis késleltetéssel elrejtjük (hogy a kattintás lefusson)
    input.addEventListener('blur', () => {
      this._keresBlurIdozito = setTimeout(() => this._talalatokElrejtese(), 200);
    });

    wrapper.appendChild(input);
    wrapper.appendChild(talalatok);

    // Referenciák eltárolása
    this.eszkozReferenciák['keresoInput']    = input;
    this.eszkozReferenciák['keresoTalalatok'] = talalatok;

    console.log('EntitasHivatkozasPanel._keresoLetrehozasa - VÉGE');
    return wrapper;
  }

  // =============================================
  // PRIVÁT - KERESÉS FUTTATÁSA
  // =============================================
  // A három cím-viselő típuson keres (Tartalom/Kategória/Tartalomtípus); a kiválasztás
  // állítja a típus-selectet. Az Egyezmény/Javaslat típus a nyers ID úttal érhető el.
  // @param {string} szoveg - A keresőmező tartalma
  async _keresesFuttatasa(szoveg) {
    const tisztitott = (szoveg ?? '').trim();
    console.log('EntitasHivatkozasPanel._keresesFuttatasa - KEZDÉS', { tisztitott });

    const talalatokElem = this.eszkozReferenciák['keresoTalalatok'];
    if (!talalatokElem) return;

    if (!tisztitott) {
      this._talalatokElrejtese();
      return;
    }

    // Sorszám a megkésett válasz eldobásához
    const sorszam = ++this._keresSorszam;
    const token = tokenLekerese();

    const talalatok = await entitasKereses(
      tisztitott,
      ['Tartalom', 'Kategoria', 'TartalomTipus'],
      token
    );
    if (sorszam !== this._keresSorszam) return; // közben új keresés indult

    talalatokElem.innerHTML = '';

    if (talalatok.length === 0) {
      const ures = document.createElement('li');
      ures.className = 'eszkoztar-kereso-talalat eszkoztar-kereso-talalat--ures';
      ures.textContent = 'Nincs találat';
      talalatokElem.appendChild(ures);
    } else {
      talalatok.forEach((talalat) => {
        const li = document.createElement('li');
        li.className = 'eszkoztar-kereso-talalat';
        li.textContent = `${talalat.cim} · ${tipusFelirat(talalat.entitasTipus)}`;
        // mousedown: a blur ELŐTT fut, így a kiválasztás biztosan megtörténik
        li.addEventListener('mousedown', (e) => {
          e.preventDefault();
          this._talalatKivalasztasa(talalat);
        });
        talalatokElem.appendChild(li);
      });
    }

    talalatokElem.classList.remove('eszkoztar-kereso-talalatok--rejtett');
    console.log('EntitasHivatkozasPanel._keresesFuttatasa - VÉGE', { talalatok: talalatok.length });
  }

  // =============================================
  // PRIVÁT - TALÁLAT KIVÁLASZTÁSA
  // =============================================
  // Kitölti az entitásId inputot és a típus-selectet a találat alapján, majd
  // elrejti a listát. Az alkalmazás az Oké gombbal történik (meglévő folyamat).
  // @param {Object} talalat - { entitasId, entitasTipus, cim }
  _talalatKivalasztasa(talalat) {
    console.log('EntitasHivatkozasPanel._talalatKivalasztasa', talalat);

    const idInput = this.eszkozReferenciák['entitasId'];
    if (idInput) idInput.value = talalat.entitasId;

    const selectElem = this.eszkozReferenciák['entitasTipus'];
    if (selectElem) selectElem.value = talalat.entitasTipus;

    // A kereső mezőbe a címet írjuk vissza (visszajelzés a választásról)
    const keresoInput = this.eszkozReferenciák['keresoInput'];
    if (keresoInput) keresoInput.value = talalat.cim;

    this._talalatokElrejtese();
  }

  // =============================================
  // PRIVÁT - TALÁLATI LISTA ELREJTÉSE
  // =============================================
  _talalatokElrejtese() {
    const talalatokElem = this.eszkozReferenciák['keresoTalalatok'];
    if (!talalatokElem) return;
    talalatokElem.classList.add('eszkoztar-kereso-talalatok--rejtett');
    talalatokElem.innerHTML = '';
  }

}

// =============================================
// EXPORTÁLÁS
// =============================================
export default EntitasHivatkozasPanel;