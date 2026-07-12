// frontend/js/components/EntitasKeresoMezo.js

// ===== IMPORTOK =====
import { entitasKereses, entitasEllenorzes, tipusFelirat, OBJECTID_MINTA } from '../utils/entitasKeresoHelper.js';

// =============================================
// ENTITÁS KERESŐ MEZŐ
// Felelősség:
// - Entitás kiválasztása CÍM alapján: a felhasználó a címet/nevet gépeli, a mező
//   élő találati listát mutat, és a listából lehet választani.
// - KIEGÉSZÍTŐ nyers ID út: ha a felhasználó 24 hexadecimális karakteres ObjectId-t
//   ír be, azt közvetlenül ellenőrzi (fallback a haladóknak).
// - A hívó bármikor lekérheti a kiválasztott, érvényes azonosítót/entitást.
//
// PUBLIKUS API: azonos a régi IdEllenorzoMezo-éval (drop-in csere) —
//   getId(), getEntitas(), isUres(), setErtek(id), destroy(), onValtozas callback.
// Plusz: cimkeFrissitese(szoveg) — a kötelező/opcionális felirat dinamikus váltásához.
//
// Használják: JavaslatModal (minden ID-mező). A szövegszerkesztő a közös keresőt a
// helperből használja (entitasKeresoHelper), nem ezt a komponenst.
// =============================================

class EntitasKeresoMezo {

  // =============================================
  // KONSTRUKTOR
  // =============================================
  // @param {HTMLElement} kontener - A befogadó DOM elem
  // @param {Object} beallitasok
  // @param {string}   beallitasok.cimke        - A mező felirata
  // @param {string}   beallitasok.placeholder  - Az input placeholder szövege
  // @param {Array}    beallitasok.tipusok      - Engedélyezett entitás típusok
  // @param {string}   beallitasok.token        - JWT token az API hívásokhoz
  // @param {Function} beallitasok.onValtozas   - Kiválasztás után hívódik (entitas|null)
  constructor(kontener, beallitasok = {}) {
    console.log('EntitasKeresoMezo.constructor - KEZDÉS', {
      cimke:   beallitasok.cimke,
      tipusok: beallitasok.tipusok
    });

    this.kontener    = kontener;
    this.cimke       = beallitasok.cimke       ?? 'Entitás';
    this.placeholder = beallitasok.placeholder ?? 'Keress cím alapján, vagy írj be ID-t';
    this.tipusok     = beallitasok.tipusok     ?? ['Tartalom', 'Kategoria', 'TartalomTipus'];
    this.token       = beallitasok.token       ?? null;
    this.onValtozas  = beallitasok.onValtozas  ?? null;

    // Az utoljára kiválasztott/ellenőrzött entitás: { entitasId, entitasTipus, cim }
    this.ervenyesEntitas = null;

    // Debounce időzítő az input eseményhez
    this._idozito = null;

    // Futó lekérés sorszáma — a megkésett válaszok eldobásához
    this._keresSorszam = 0;

    // Blur-időzítő a találati lista elrejtéséhez
    this._blurIdozito = null;

    this._render();

    console.log('EntitasKeresoMezo.constructor - VÉGE');
  }

  // =============================================
  // PUBLIKUS - ÉRVÉNYES ID LEKÉRÉSE
  // =============================================
  getId() {
    return this.ervenyesEntitas?.entitasId ?? null;
  }

  // =============================================
  // PUBLIKUS - ÉRVÉNYES ENTITÁS LEKÉRÉSE
  // =============================================
  getEntitas() {
    return this.ervenyesEntitas;
  }

  // =============================================
  // PUBLIKUS - ÜRES-E A MEZŐ
  // =============================================
  isUres() {
    return !this.inputElem?.value.trim();
  }

  // =============================================
  // PUBLIKUS - ÉRTÉK BEÁLLÍTÁSA KÍVÜLRŐL (előtöltés)
  // =============================================
  // A kártya saját entitásának előtöltéséhez: beírja az ID-t és azonnal
  // feloldja címre (raw ID út). Sikeres feloldás után a mező a CÍMET mutatja.
  // @param {string} id - A beállítandó entitás ID
  async setErtek(id) {
    console.log('EntitasKeresoMezo.setErtek - KEZDÉS', { id });
    if (!this.inputElem) return;

    clearTimeout(this._idozito);
    this._talalatokElrejtese();
    this.ervenyesEntitas = null;

    if (!id) {
      this.inputElem.value = '';
      this._ertesites(null);
      return;
    }

    this.inputElem.value = id;
    this._statuszBeallitasa('folyamatban', 'Betöltés...');

    // Sorszám a megkésett válasz eldobásához
    const sorszam = ++this._keresSorszam;
    const entitas = await entitasEllenorzes(id, this.tipusok, this.token);
    if (sorszam !== this._keresSorszam) return; // közben új keresés indult

    if (entitas) {
      this._kivalasztas(entitas);
    } else {
      this._statuszBeallitasa('hiba', '✗ Nem található entitás ezzel az azonosítóval.');
      this._ertesites(null);
    }

    console.log('EntitasKeresoMezo.setErtek - VÉGE');
  }

  // =============================================
  // PUBLIKUS - CÍMKE FRISSÍTÉSE
  // =============================================
  // A kötelező/opcionális felirat dinamikus váltásához (pl. Csomagnál kötelező).
  // @param {string} szoveg - Az új felirat
  cimkeFrissitese(szoveg) {
    this.cimke = szoveg;
    if (this.cimkeElem) this.cimkeElem.textContent = szoveg;
  }

  // =============================================
  // PUBLIKUS - MEGSEMMISÍTÉS
  // =============================================
  destroy() {
    console.log('EntitasKeresoMezo.destroy - KEZDÉS');
    clearTimeout(this._idozito);
    clearTimeout(this._blurIdozito);
    if (this.kontener) this.kontener.innerHTML = '';
    this.ervenyesEntitas = null;
    this.onValtozas      = null;
    this.kontener        = null;
    this.inputElem       = null;
    this.statuszElem     = null;
    this.talalatokElem   = null;
    this.cimkeElem       = null;
    console.log('EntitasKeresoMezo.destroy - VÉGE');
  }

  // =============================================
  // PRIVÁT - RENDERELÉS
  // =============================================
  _render() {
    console.log('EntitasKeresoMezo._render - KEZDÉS');

    const csoport = document.createElement('div');
    csoport.className = 'entitas-kereso-mezo';

    // Címke
    this.cimkeElem = document.createElement('label');
    this.cimkeElem.className   = 'entitas-kereso-mezo__cimke';
    this.cimkeElem.textContent = this.cimke;

    // Input + találati lista közös burkolója (a lista abszolút pozicionált benne)
    const inputBurok = document.createElement('div');
    inputBurok.className = 'entitas-kereso-mezo__input-burok';

    this.inputElem = document.createElement('input');
    this.inputElem.type        = 'text';
    this.inputElem.className   = 'entitas-kereso-mezo__input';
    this.inputElem.placeholder = this.placeholder;
    this.inputElem.spellcheck  = false;
    this.inputElem.autocomplete = 'off';

    // Találati lista (kezdetben rejtett)
    this.talalatokElem = document.createElement('ul');
    this.talalatokElem.className = 'entitas-kereso-mezo__talalatok entitas-kereso-mezo__talalatok--rejtett';

    // Állapot sor: keresés folyamatban / kiválasztva / hiba
    this.statuszElem = document.createElement('div');
    this.statuszElem.className = 'entitas-kereso-mezo__statusz';

    // Gépelésre: debounce, majd keresés vagy nyers ID ellenőrzés
    this.inputElem.addEventListener('input', () => {
      clearTimeout(this._idozito);
      this.ervenyesEntitas = null;         // gépelés közben nincs érvényes választás
      this._statuszBeallitasa('', '');
      this._idozito = setTimeout(() => this._keresesInditasa(), 350);
    });

    // Fókuszvesztéskor a találati listát kis késleltetéssel elrejtjük
    // (hogy a listaelemre kattintás még lefusson)
    this.inputElem.addEventListener('blur', () => {
      this._blurIdozito = setTimeout(() => this._talalatokElrejtese(), 200);
    });

    inputBurok.appendChild(this.inputElem);
    inputBurok.appendChild(this.talalatokElem);

    csoport.appendChild(this.cimkeElem);
    csoport.appendChild(inputBurok);
    csoport.appendChild(this.statuszElem);
    this.kontener.appendChild(csoport);

    console.log('EntitasKeresoMezo._render - VÉGE');
  }

  // =============================================
  // PRIVÁT - KERESÉS INDÍTÁSA
  // =============================================
  // Eldönti, hogy nyers ID-t kaptunk (fallback), vagy cím-részletet (keresés).
  async _keresesInditasa() {
    const szoveg = this.inputElem.value.trim();
    console.log('EntitasKeresoMezo._keresesInditasa - KEZDÉS', { szoveg });

    // Üres mező: nincs mit keresni (a mező opcionális használatához)
    if (!szoveg) {
      this._talalatokElrejtese();
      this._ertesites(null);
      return;
    }

    // Sorszám a megkésett válaszok kiszűréséhez
    const sorszam = ++this._keresSorszam;

    // NYERS ID ÚT: ha pontosan 24-hex ObjectId, közvetlen ellenőrzés
    if (OBJECTID_MINTA.test(szoveg)) {
      this._talalatokElrejtese();
      this._statuszBeallitasa('folyamatban', 'Ellenőrzés...');

      const entitas = await entitasEllenorzes(szoveg, this.tipusok, this.token);
      if (sorszam !== this._keresSorszam) return;

      if (entitas) {
        this._kivalasztas(entitas, { inputMegtartasa: true });
      } else {
        this._statuszBeallitasa('hiba', '✗ Nem található entitás ezzel az azonosítóval.');
        this._ertesites(null);
      }
      return;
    }

    // CÍM-KERESÉS ÚT
    this._statuszBeallitasa('folyamatban', 'Keresés...');
    const talalatok = await entitasKereses(szoveg, this.tipusok, this.token);
    if (sorszam !== this._keresSorszam) return;

    if (talalatok.length === 0) {
      this._talalatokElrejtese();
      this._statuszBeallitasa('hiba', 'Nincs találat erre a keresésre.');
      return;
    }

    this._statuszBeallitasa('', '');
    this._talalatokMegjelenitese(talalatok);

    console.log('EntitasKeresoMezo._keresesInditasa - VÉGE', { talalatok: talalatok.length });
  }

  // =============================================
  // PRIVÁT - TALÁLATI LISTA MEGJELENÍTÉSE
  // =============================================
  // @param {Array} talalatok - [{ entitasId, entitasTipus, cim }]
  _talalatokMegjelenitese(talalatok) {
    this.talalatokElem.innerHTML = '';

    talalatok.forEach((talalat) => {
      const elem = document.createElement('li');
      elem.className = 'entitas-kereso-mezo__talalat';

      const cimSpan = document.createElement('span');
      cimSpan.className   = 'entitas-kereso-mezo__talalat-cim';
      cimSpan.textContent = talalat.cim;

      const tipusSpan = document.createElement('span');
      tipusSpan.className   = 'entitas-kereso-mezo__talalat-tipus';
      tipusSpan.textContent = tipusFelirat(talalat.entitasTipus);

      elem.appendChild(cimSpan);
      elem.appendChild(tipusSpan);

      // mousedown (nem click): a blur ELŐTT lefut, így a kiválasztás biztosan megtörténik
      elem.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this._kivalasztas(talalat);
        this._talalatokElrejtese();
      });

      this.talalatokElem.appendChild(elem);
    });

    this.talalatokElem.classList.remove('entitas-kereso-mezo__talalatok--rejtett');
  }

  // =============================================
  // PRIVÁT - TALÁLATI LISTA ELREJTÉSE
  // =============================================
  _talalatokElrejtese() {
    if (!this.talalatokElem) return;
    this.talalatokElem.classList.add('entitas-kereso-mezo__talalatok--rejtett');
    this.talalatokElem.innerHTML = '';
  }

  // =============================================
  // PRIVÁT - KIVÁLASZTÁS RÖGZÍTÉSE
  // =============================================
  // @param {Object} entitas - { entitasId, entitasTipus, cim }
  // @param {Object} opciok - { inputMegtartasa } — ha true, az inputot NEM írjuk felül
  //                          (nyers ID útnál a beírt ID marad a mezőben)
  _kivalasztas(entitas, opciok = {}) {
    console.log('EntitasKeresoMezo._kivalasztas', entitas);
    this.ervenyesEntitas = entitas;

    // Cím-kiválasztásnál a mezőbe a CÍMET írjuk (a felhasználó lássa a választását)
    if (!opciok.inputMegtartasa && this.inputElem) {
      this.inputElem.value = entitas.cim;
    }

    this._statuszBeallitasa('talalat', `✓ ${tipusFelirat(entitas.entitasTipus)}: „${entitas.cim}"`);
    this._ertesites(entitas);
  }

  // =============================================
  // PRIVÁT - STÁTUSZ SOR BEÁLLÍTÁSA
  // =============================================
  // @param {string} allapot - '', 'folyamatban', 'talalat', 'hiba'
  // @param {string} szoveg  - A megjelenítendő szöveg
  _statuszBeallitasa(allapot, szoveg) {
    if (!this.statuszElem) return;
    this.statuszElem.textContent = szoveg;
    this.statuszElem.className = 'entitas-kereso-mezo__statusz'
      + (allapot ? ` entitas-kereso-mezo__statusz--${allapot}` : '');
  }

  // =============================================
  // PRIVÁT - VÁLTOZÁS JELZÉSE A HÍVÓNAK
  // =============================================
  // @param {Object|null} entitas - Az érvényes entitás vagy null
  _ertesites(entitas) {
    if (typeof this.onValtozas === 'function') {
      this.onValtozas(entitas);
    }
  }

}

// =============================================
// EXPORTÁLÁS
// =============================================
export default EntitasKeresoMezo;
