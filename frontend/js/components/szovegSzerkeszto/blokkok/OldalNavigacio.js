// frontend/js/components/szovegSzerkeszto/OldalNavigacio.js

class OldalNavigacio {

  // =============================================
  // KONSTRUKTOR
  // =============================================
  // @param {Object} opciak - Beállítások
  // @param {Array}  opciak.fulek - Fülek tömbje [{ id, felirat }]
  // @param {Function} opciak.onFulValtas - Fülváltáskor hívódik (fulId)
  // @param {Function} opciak.onUjFul - Új fül véglegesítésekor hívódik (fulId, felirat)
  //                                    A SzovegSzerkeszto csak az eredményt kapja meg,
  //                                    a beviteli felület logikája itt, belül marad
  constructor(opciak = {}) {
    console.log('OldalNavigacio.constructor - KEZDÉS', { opciak });

    // Fülek tömbje — ha nem adtak meg, üres
    this.fulek = opciak.fulek || [];

    // Fülváltás callback — a SzovegSzerkeszto kezeli
    this.onFulValtas = opciak.onFulValtas || null;

    // Új fül callback — a SzovegSzerkeszto csak az eredményt kapja:
    // fulId és felirat, hogy létrehozhassa a BlokkLista példányt
    this.onUjFul = opciak.onUjFul || null;

    // Az éppen aktív fül ID-ja — alapból az első fül
    this.aktivFulId = this.fulek.length > 0 ? this.fulek[0].id : null;

    // DOM elem referencia (letrehozas() után lesz feltöltve)
    this.elem = null;

    // + gomb referencia — kellenek a beviteli felület pozicionálásához
    this.pluszGomb = null;

    // Beviteli felület referencia — megnyitás/zárás kezeléséhez
    this.bevitelPanel = null;

    // Jelzi, hogy a beviteli felület éppen nyitva van-e
    this.bevitelNyitva = false;

    console.log('OldalNavigacio.constructor - VÉGE', { aktivFulId: this.aktivFulId });
  }

  // =============================================
  // DOM ELEM LÉTREHOZÁSA
  // =============================================
  // Létrehozza a fülsáv DOM elemét a + gombbal együtt
  // @returns {HTMLElement} A fülsáv wrapper eleme
  letrehozas() {
    console.log('OldalNavigacio.letrehozas - KEZDÉS');

    // Fő wrapper elem
    const wrapper = document.createElement('div');
    wrapper.className = 'oldal-navigacio';

    // Fülek renderelése — ha vannak már kezdő fülek (betöltés esetén)
    this.fulek.forEach(ful => {
      wrapper.appendChild(this._fulElemLetrehozasa(ful));
    });

    // + gomb — mindig látható, a fülek után
    this.pluszGomb = this._pluszGombLetrehozasa();
    wrapper.appendChild(this.pluszGomb);

    this.elem = wrapper;

    console.log('OldalNavigacio.letrehozas - VÉGE', { fulekSzama: this.fulek.length });
    return wrapper;
  }

  // =============================================
  // PUBLIKUS - AKTÍV FÜL BEÁLLÍTÁSA
  // =============================================
  // Vizuálisan aktívvá teszi a megadott fület
  // @param {string} fulId - Az aktívvá teendő fül ID-ja
  setAktivFul(fulId) {
    console.log('OldalNavigacio.setAktivFul - KEZDÉS', { fulId });

    this.aktivFulId = fulId;

    if (this.elem) {
      this.elem.querySelectorAll('.oldal-navigacio__ful').forEach(fulElem => {
        fulElem.classList.toggle(
          'oldal-navigacio__ful--aktiv',
          fulElem.dataset.fulId === fulId
        );
      });
    }

    console.log('OldalNavigacio.setAktivFul - VÉGE', { fulId });
  }

  // =============================================
  // PUBLIKUS - FÜLEK ADATAINAK LEKÉRÉSE (exportáláshoz)
  // =============================================
  // @returns {Array} A fülek aktuális tömbje [{ id, felirat }]
  getFulek() {
    console.log('OldalNavigacio.getFulek - KEZDÉS');
    console.log('OldalNavigacio.getFulek - VÉGE', { fulek: this.fulek });
    return this.fulek;
  }

  // =============================================
  // PRIVÁT - + GOMB LÉTREHOZÁSA
  // =============================================
  // Mindig látható gomb a fülsáv végén.
  // Kattintásra a beviteli felületet nyitja meg —
  // az első alkalommal 2 mezőt mutat, utána csak 1-et.
  // @returns {HTMLElement} A + gomb eleme
  _pluszGombLetrehozasa() {
    console.log('OldalNavigacio._pluszGombLetrehozasa - KEZDÉS');

    const gomb = document.createElement('button');
    gomb.type = 'button';
    gomb.className = 'oldal-navigacio__plusz-gomb';
    gomb.textContent = '+';
    gomb.setAttribute('aria-label', 'Új oldal hozzáadása');

    // mousedown: fókuszvesztés megakadályozása
    gomb.addEventListener('mousedown', (e) => {
      e.preventDefault();
    });

    // Kattintásra a beviteli felület megnyitása
    gomb.addEventListener('click', () => {
      console.log('OldalNavigacio._pluszGombLetrehozasa - + gomb kattintás');
      this._bevitelMegnyitasa();
    });

    console.log('OldalNavigacio._pluszGombLetrehozasa - VÉGE');
    return gomb;
  }

  // =============================================
  // PRIVÁT - BEVITELI FELÜLET MEGNYITÁSA
  // =============================================
  // Első alkalommal (még nincs egy fül sem) 2 mezőt mutat:
  //   - az első oldal neve
  //   - a második oldal neve
  // Minden további alkalommal csak 1 mezőt mutat:
  //   - az új oldal neve
  // A panel a + gomb után jelenik meg a sávban.
  _bevitelMegnyitasa() {
    console.log('OldalNavigacio._bevitelMegnyitasa - KEZDÉS', { fulekSzama: this.fulek.length });

    // Ha már nyitva van, bezárjuk
    if (this.bevitelNyitva) {
      this._bevitelBezarasa();
      return;
    }

    // Panel létrehozása a jelenlegi fülszám alapján
    const elsoAlkalom = this.fulek.length === 0;
    this.bevitelPanel = elsoAlkalom
      ? this._ketMezősPanelLetrehozasa()
      : this._egyMezősPanelLetrehozasa();

    // Panel a + gomb után, a wrapper végére kerül
    this.elem.appendChild(this.bevitelPanel);
    this.bevitelNyitva = true;

    // Az első input mezőre fókuszálunk automatikusan
    const elsoInput = this.bevitelPanel.querySelector('input');
    if (elsoInput) elsoInput.focus();

    console.log('OldalNavigacio._bevitelMegnyitasa - VÉGE', { elsoAlkalom });
  }

  // =============================================
  // PRIVÁT - BEVITELI FELÜLET BEZÁRÁSA
  // =============================================
  // Eltávolítja a beviteli panelt a DOM-ból
  _bevitelBezarasa() {
    console.log('OldalNavigacio._bevitelBezarasa - KEZDÉS');

    if (this.bevitelPanel) {
      this.bevitelPanel.remove();
      this.bevitelPanel = null;
    }
    this.bevitelNyitva = false;

    console.log('OldalNavigacio._bevitelBezarasa - VÉGE');
  }

  // =============================================
  // PRIVÁT - KÉTMEZŐS PANEL LÉTREHOZÁSA (első alkalom)
  // =============================================
  // Két névmezőt tartalmaz: az első és a második oldal nevét.
  // Megerősítéskor mindkét fület egyszerre hozza létre.
  // @returns {HTMLElement} A kész panel elem
  _ketMezősPanelLetrehozasa() {
    console.log('OldalNavigacio._ketMezősPanelLetrehozasa - KEZDÉS');

    const panel = document.createElement('div');
    panel.className = 'oldal-navigacio__bevitel-panel';

    // Első oldal neve mező
    const elsoInput = document.createElement('input');
    elsoInput.type = 'text';
    elsoInput.className = 'oldal-navigacio__bevitel-input';
    elsoInput.placeholder = '1. oldal neve';
    elsoInput.value = '1. oldal'; // alapértelmezett név, felülírható

    // Második oldal neve mező
    const masodikInput = document.createElement('input');
    masodikInput.type = 'text';
    masodikInput.className = 'oldal-navigacio__bevitel-input';
    masodikInput.placeholder = '2. oldal neve';
    masodikInput.value = '2. oldal'; // alapértelmezett név, felülírható

    // Megerősítés gomb
    const okGomb = document.createElement('button');
    okGomb.type = 'button';
    okGomb.className = 'oldal-navigacio__bevitel-ok';
    okGomb.textContent = '✓';
    okGomb.setAttribute('aria-label', 'Oldalak létrehozása');

    // mousedown: fókuszvesztés megakadályozása
    okGomb.addEventListener('mousedown', (e) => e.preventDefault());

    panel.appendChild(elsoInput);
    panel.appendChild(masodikInput);
    panel.appendChild(okGomb);

    // Megerősítés logika — mindkét fület létrehozza
    const megerosites = () => {
      const elsoNev   = elsoInput.value.trim()   || '1. oldal';
      const masodikNev = masodikInput.value.trim() || '2. oldal';

      console.log('OldalNavigacio._ketMezősPanelLetrehozasa - megerősítés', { elsoNev, masodikNev });

      this._bevitelBezarasa();

      // Első fül létrehozása és értesítés
      const elsoFulId = this._ujFulIdGeneralasa();
      this._fulHozzaadasaBelul(elsoFulId, elsoNev);
      if (this.onUjFul) this.onUjFul(elsoFulId, elsoNev);

      // Második fül létrehozása és értesítés
      const masodikFulId = this._ujFulIdGeneralasa();
      this._fulHozzaadasaBelul(masodikFulId, masodikNev);
      if (this.onUjFul) this.onUjFul(masodikFulId, masodikNev);
    };

    // OK gomb kattintás
    okGomb.addEventListener('click', megerosites);

    // Enter bármelyik mezőben megerősít
    [elsoInput, masodikInput].forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          megerosites();
        }
        // Escape: panel bezárása mentés nélkül
        if (e.key === 'Escape') {
          this._bevitelBezarasa();
        }
      });
    });

    console.log('OldalNavigacio._ketMezősPanelLetrehozasa - VÉGE');
    return panel;
  }

  // =============================================
  // PRIVÁT - EGYMEZŐS PANEL LÉTREHOZÁSA (további oldalak)
  // =============================================
  // Egyetlen névmezőt tartalmaz az új oldal nevéhez.
  // @returns {HTMLElement} A kész panel elem
  _egyMezősPanelLetrehozasa() {
    console.log('OldalNavigacio._egyMezősPanelLetrehozasa - KEZDÉS');

    const panel = document.createElement('div');
    panel.className = 'oldal-navigacio__bevitel-panel';

    // Új oldal neve mező
    const ujInput = document.createElement('input');
    ujInput.type = 'text';
    ujInput.className = 'oldal-navigacio__bevitel-input';
    ujInput.placeholder = 'Oldal neve';

    // Alapértelmezett név a sorszám alapján
    ujInput.value = (this.fulek.length + 1) + '. oldal';

    // Megerősítés gomb
    const okGomb = document.createElement('button');
    okGomb.type = 'button';
    okGomb.className = 'oldal-navigacio__bevitel-ok';
    okGomb.textContent = '✓';
    okGomb.setAttribute('aria-label', 'Oldal létrehozása');

    // mousedown: fókuszvesztés megakadályozása
    okGomb.addEventListener('mousedown', (e) => e.preventDefault());

    panel.appendChild(ujInput);
    panel.appendChild(okGomb);

    // Megerősítés logika
    const megerosites = () => {
      const ujNev = ujInput.value.trim() || (this.fulek.length + 1) + '. oldal';

      console.log('OldalNavigacio._egyMezősPanelLetrehozasa - megerősítés', { ujNev });

      this._bevitelBezarasa();

      // Fül létrehozása és értesítés
      const ujFulId = this._ujFulIdGeneralasa();
      this._fulHozzaadasaBelul(ujFulId, ujNev);
      if (this.onUjFul) this.onUjFul(ujFulId, ujNev);
    };

    // OK gomb kattintás
    okGomb.addEventListener('click', megerosites);

    // Enter megerősít, Escape bezár
    ujInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        megerosites();
      }
      if (e.key === 'Escape') {
        this._bevitelBezarasa();
      }
    });

    console.log('OldalNavigacio._egyMezősPanelLetrehozasa - VÉGE');
    return panel;
  }

  // =============================================
  // PRIVÁT - FÜL BELSŐ HOZZÁADÁSA
  // =============================================
  // Felveszi a fület a belső tömbbe és rendereli a DOM-ban,
  // mindig a + gomb és a beviteli panel elé illesztve.
  // @param {string} fulId   - Az új fül egyedi azonosítója
  // @param {string} felirat - Az új fül neve
  _fulHozzaadasaBelul(fulId, felirat) {
    console.log('OldalNavigacio._fulHozzaadasaBelul - KEZDÉS', { fulId, felirat });

    const ujFul = { id: fulId, felirat };
    this.fulek.push(ujFul);

    const ujFulElem = this._fulElemLetrehozasa(ujFul);

    // A + gomb elé illesztjük, hogy az mindig a sor végén maradjon
    this.elem.insertBefore(ujFulElem, this.pluszGomb);

    console.log('OldalNavigacio._fulHozzaadasaBelul - VÉGE', { fulId, felirat, osszesFul: this.fulek.length });
  }

  // =============================================
  // PRIVÁT - ÚJ FÜL ID GENERÁLÁSA
  // =============================================
  // Egyedi azonosítót generál az új fülhöz
  // @returns {string} Egyedi fül ID
  _ujFulIdGeneralasa() {
    return 'ful-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  }

  // =============================================
  // PRIVÁT - FÜL ELEM LÉTREHOZÁSA
  // =============================================
  // Egyetlen fül DOM elemét hozza létre
  // @param {Object} ful - A fül adatobjektuma { id, felirat }
  // @returns {HTMLElement} A fül gomb eleme
  _fulElemLetrehozasa(ful) {
    console.log('OldalNavigacio._fulElemLetrehozasa - KEZDÉS', { ful });

    const fulElem = document.createElement('button');
    fulElem.className = 'oldal-navigacio__ful';
    fulElem.dataset.fulId = ful.id;
    fulElem.type = 'button';

    // Aktív állapot beállítása, ha ez az aktív fül
    if (ful.id === this.aktivFulId) {
      fulElem.classList.add('oldal-navigacio__ful--aktiv');
    }

    // Felirat elem — dupla kattintásra szerkeszthető
    const feliratElem = document.createElement('span');
    feliratElem.className = 'oldal-navigacio__felirat';
    feliratElem.textContent = ful.felirat;

    fulElem.appendChild(feliratElem);

    // Kattintásra fülváltás
    fulElem.addEventListener('click', () => {
      this._fulKattintas(ful.id);
    });

    // Dupla kattintásra felirat szerkesztése
    feliratElem.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      this._feliratSzerkesztese(ful, feliratElem);
    });

    console.log('OldalNavigacio._fulElemLetrehozasa - VÉGE', { fulId: ful.id });
    return fulElem;
  }

  // =============================================
  // PRIVÁT - FÜL KATTINTÁS KEZELÉSE
  // =============================================
  // @param {string} fulId - A kattintott fül ID-ja
  _fulKattintas(fulId) {
    console.log('OldalNavigacio._fulKattintas - KEZDÉS', { fulId });

    if (fulId === this.aktivFulId) {
      console.log('OldalNavigacio._fulKattintas - már aktív fül, nincs teendő');
      return;
    }

    this.setAktivFul(fulId);

    if (this.onFulValtas) {
      this.onFulValtas(fulId);
    }

    console.log('OldalNavigacio._fulKattintas - VÉGE', { fulId });
  }

  // =============================================
  // PRIVÁT - FELIRAT SZERKESZTÉSE
  // =============================================
  // Dupla kattintásra a felirat inline szerkeszthetővé válik.
  // Enter vagy fókuszvesztés menti, Escape elveti.
  // @param {Object} ful - A fül adatobjektuma
  // @param {HTMLElement} feliratElem - A felirat span eleme
  _feliratSzerkesztese(ful, feliratElem) {
    console.log('OldalNavigacio._feliratSzerkesztese - KEZDÉS', { fulId: ful.id });

    const inputElem = document.createElement('input');
    inputElem.type = 'text';
    inputElem.className = 'oldal-navigacio__felirat-input';
    inputElem.value = ful.felirat;

    feliratElem.replaceWith(inputElem);
    inputElem.focus();
    inputElem.select();

    const mentes = () => {
      const ujFelirat = inputElem.value.trim() || ful.felirat;
      ful.felirat = ujFelirat;

      const ujFeliratElem = document.createElement('span');
      ujFeliratElem.className = 'oldal-navigacio__felirat';
      ujFeliratElem.textContent = ujFelirat;

      ujFeliratElem.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        this._feliratSzerkesztese(ful, ujFeliratElem);
      });

      inputElem.replaceWith(ujFeliratElem);
    };

    inputElem.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); mentes(); }
      if (e.key === 'Escape') { inputElem.value = ful.felirat; mentes(); }
    });

    inputElem.addEventListener('blur', mentes);

    console.log('OldalNavigacio._feliratSzerkesztese - VÉGE', { fulId: ful.id });
  }

}

// =============================================
// EXPORTÁLÁS
// =============================================
export default OldalNavigacio;