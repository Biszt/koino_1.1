// frontend/js/components/szovegSzerkeszto/blokkok/EntitasHivatkozasBlokk.js

// =============================================
// ENTITÁS HIVATKOZÁS BLOKK
// Felelősség:
// - Entitás hivatkozás DOM elemének létrehozása
// - Üres állapot placeholder megjelenítése ID megadása előtt
// - ID megadása után a koppintható hivatkozás megjelenítése
// - Koppintásra az adott entitás legyen az új kiválasztott
// - Fókuszkezelés — jelzi a szülőnek, melyik blokk aktív
// =============================================

class EntitasHivatkozasBlokk {

  // =============================================
  // KONSTRUKTOR
  // =============================================
  // @param {Object} blokk - A blokk adatobjektum (BlokkListából)
  //   blokk.entitasId     - A hivatkozott entitás ID-ja
  //   blokk.entitasTipus  - A hivatkozott entitás típusa
  //   blokk.felirat       - Megjelenített szöveg (opcionális)
  // @param {Object} callbacks - Esemény visszahívók
  // @param {Function} callbacks.onFokusz    - Fókuszba kerüléskor (blokkId)
  // @param {Function} callbacks.onKoppintas - Hivatkozásra koppintáskor (entitasId, entitasTipus)
  constructor(blokk, callbacks = {}) {
    console.log('EntitasHivatkozasBlokk.constructor - KEZDÉS', { blokk });

    this.blokk = blokk;
    this.onFokusz    = callbacks.onFokusz    || null;
    this.onKoppintas = callbacks.onKoppintas || null;

    // Megjelenítő mód — a kártyákon true: a koppintás entitást vált,
    // szerkesztő módban false: a kattintás csak fókuszba helyezi a blokkot
    // (a letrehozasMegjelenitesMod() automatikusan true-ra állítja)
    this.megjelenitesMod = callbacks.megjelenitesMod || false;

    // DOM elem referencia
    this.elem = null;

    console.log('EntitasHivatkozasBlokk.constructor - VÉGE');
  }

  // =============================================
// DOM ELEM LÉTREHOZÁSA
// =============================================
// Blokkot hoz létre — entitasId nélkül placeholder,
// entitasId-vel koppintható hivatkozás jelenik meg
// MÓDOSÍTÁS: ha van elmentett méret (meretSzelesseg, meretMagassag, meretFontSize),
// visszaállítja őket a DOM-ra, hogy újratöltés után is megmaradjon a méret.
// @returns {HTMLElement} A hivatkozás blokk wrapper eleme
letrehozas() {
  console.log('EntitasHivatkozasBlokk.letrehozas - KEZDÉS', { blokkId: this.blokk.id });

  // Wrapper elem
  const wrapper = document.createElement('div');
  wrapper.className = 'blokk-wrapper entitas-hivatkozas-blokk-wrapper';
  wrapper.dataset.blokkId = this.blokk.id;
  wrapper.dataset.tipus = 'entitasHivatkozas';

  // Fókuszálhatóvá tesszük, hogy kattintásra aktív blokk legyen
  wrapper.tabIndex = 0;

  // Kattintáskor fókuszt kap → _blokkFokuszba() lefut a szülőben
  wrapper.addEventListener('click', () => {
    wrapper.focus();
  });

  // Fókuszkor jelezzük a szülőnek, hogy ez az aktív blokk
  wrapper.addEventListener('focus', () => {
    if (this.onFokusz) this.onFokusz(this.blokk.id);
  }, true); // capture: true, hogy a belső elemek fókusza is elkapható legyen

  // Ha már van entitasId (pl. betöltött gondolat szerkesztés módban),
  // azonnal megjelenítjük a hivatkozást, egyébként placeholdert
  let belsoElem = null;
  if (this.blokk.entitasId) {
    belsoElem = this._hivatkozasElemLetrehozasa();
    wrapper.appendChild(belsoElem);
  } else {
    wrapper.appendChild(this._uresAllapotLetrehozasa());
  }

  // MÓDOSÍTÁS: elmentett méretek visszaállítása a wrapper és a belső elem DOM-jára
  // — így újratöltés után is ugyanolyan méretű a blokk, mint méretezés után volt
  if (this.blokk.meretSzelesseg) {
    wrapper.style.width = this.blokk.meretSzelesseg + 'px';
  }
  if (this.blokk.meretMagassag) {
    wrapper.style.height = this.blokk.meretMagassag + 'px';
  }
  if (this.blokk.meretFontSize && belsoElem) {
    belsoElem.style.fontSize = this.blokk.meretFontSize + 'px';
  }

  this.elem = wrapper;

  console.log('EntitasHivatkozasBlokk.letrehozas - VÉGE', { blokkId: this.blokk.id });
  return wrapper;
}

  // =============================================
  // CSAK MEGJELENÍTŐ MÓD
  // =============================================
  // A kártyán való megjelenítéshez — wrapper nélkül
  // @returns {HTMLElement} Csak a hivatkozás elem
  letrehozasMegjelenitesMod() {
    console.log('EntitasHivatkozasBlokk.letrehozasMegjelenitesMod - KEZDÉS', { blokkId: this.blokk.id });

    // Ez a metódus kizárólag a kártya-megjelenítéshez készül —
    // a koppintás itt mindig aktív (entitást vált)
    this.megjelenitesMod = true;

    const hivatkozasElem = this._hivatkozasElemLetrehozasa();

    // Elmentett méretek visszaállítása — megjelenítő módban nincs wrapper,
    // ezért közvetlenül a hivatkozás elemre kerülnek (mint a letrehozas()-ban)
    if (this.blokk.meretSzelesseg) {
      hivatkozasElem.style.width = this.blokk.meretSzelesseg + 'px';
    }
    if (this.blokk.meretMagassag) {
      hivatkozasElem.style.height = this.blokk.meretMagassag + 'px';
    }
    if (this.blokk.meretFontSize) {
      hivatkozasElem.style.fontSize = this.blokk.meretFontSize + 'px';
    }

    console.log('EntitasHivatkozasBlokk.letrehozasMegjelenitesMod - VÉGE');
    return hivatkozasElem;
  }

  // =============================================
  // PUBLIKUS - ENTITÁS BEÁLLÍTÁSA ID MEGADÁSA UTÁN
  // =============================================
  // A SzovegSzerkeszto hívja meg, miután a panel Oké gombjára kattintottak
  // @param {string} entitasId    - A hivatkozott entitás ID-ja
  // @param {string} entitasTipus - A hivatkozott entitás típusa
  entitasBeallitasa(entitasId, entitasTipus) {
    console.log('EntitasHivatkozasBlokk.entitasBeallitasa - KEZDÉS', { entitasId, entitasTipus });

    // Adatok frissítése a blokk objektumon
    this.blokk.entitasId    = entitasId;
    this.blokk.entitasTipus = entitasTipus;

    // Placeholder eltávolítása, koppintható hivatkozás beillesztése
    if (this.elem) {
      this.elem.innerHTML = '';
      this.elem.appendChild(this._hivatkozasElemLetrehozasa());
    }

    console.log('EntitasHivatkozasBlokk.entitasBeallitasa - VÉGE', { entitasId, entitasTipus });
  }

  // =============================================
  // PRIVÁT - ÜRES ÁLLAPOT PLACEHOLDER
  // =============================================
  // EntitasId megadása előtt jelenik meg a blokkban
  // @returns {HTMLElement} A placeholder elem
  _uresAllapotLetrehozasa() {
    console.log('EntitasHivatkozasBlokk._uresAllapotLetrehozasa - KEZDÉS');

    // Placeholder konténer
    const placeholder = document.createElement('div');
    placeholder.className = 'entitas-hivatkozas-blokk__placeholder';

    // Ikon
    const ikonElem = document.createElement('span');
    ikonElem.className = 'entitas-hivatkozas-blokk__placeholder-ikon';
    ikonElem.textContent = '⬡';
    ikonElem.setAttribute('aria-hidden', 'true');

    placeholder.appendChild(ikonElem);

    console.log('EntitasHivatkozasBlokk._uresAllapotLetrehozasa - VÉGE');
    return placeholder;
  }

  // =============================================
  // PRIVÁT - HIVATKOZÁS ELEM
  // =============================================
  // Létrehozza a koppintható entitás hivatkozást
  // Szerkesztő módban a koppintás az entitást választja ki
  // @returns {HTMLElement} A hivatkozás span eleme
  _hivatkozasElemLetrehozasa() {
    console.log('EntitasHivatkozasBlokk._hivatkozasElemLetrehozasa - KEZDÉS');

    const hivatkozasElem = document.createElement('span');
    hivatkozasElem.className = 'entitas-hivatkozas-blokk';

    // Interaktív (gomb) szerep csak megjelenítő módban —
    // szerkesztő módban a wrapper kezeli a fókuszt, a hivatkozás passzív
    if (this.megjelenitesMod) {
      hivatkozasElem.setAttribute('role', 'button');
      hivatkozasElem.setAttribute('tabindex', '0');
      hivatkozasElem.setAttribute(
        'aria-label',
        `Ugrás ide: ${this.blokk.felirat || this.blokk.entitasId}`
      );
    }

    // Entitás típus ikon
    const ikonElem = document.createElement('span');
    ikonElem.className = 'entitas-hivatkozas-blokk__ikon';
    ikonElem.textContent = this._tipusIkon();
    ikonElem.setAttribute('aria-hidden', 'true');

    // Felirat — ha van megadott felirat, azt mutatjuk, egyébként #id
    const feliratElem = document.createElement('span');
    feliratElem.className = 'entitas-hivatkozas-blokk__felirat';
    feliratElem.textContent = this.blokk.felirat || `#${this.blokk.entitasId}`;

    hivatkozasElem.appendChild(ikonElem);
    hivatkozasElem.appendChild(feliratElem);

    // Aktiválás (entitásváltás) csak megjelenítő módban —
    // szerkesztő módban a kattintás a wrapperig buborékol,
    // ami csak fókuszba helyezi (kijelöli) a blokkot
    if (this.megjelenitesMod) {
      // Koppintás / kattintás esemény
      hivatkozasElem.addEventListener('click', (e) => {
        e.stopPropagation(); // ne aktiválja a wrapper click → focus láncot
        this._koppintasKezeles();
      });

      // Billentyűzetes aktiválás (Enter és Space)
      hivatkozasElem.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this._koppintasKezeles();
        }
      });

      // Mobilos aktív vizuális visszajelzés
      hivatkozasElem.addEventListener('touchstart', () => {
        hivatkozasElem.classList.add('entitas-hivatkozas-blokk--tapintva');
      }, { passive: true });

      hivatkozasElem.addEventListener('touchend', () => {
        hivatkozasElem.classList.remove('entitas-hivatkozas-blokk--tapintva');
      }, { passive: true });
    }

    console.log('EntitasHivatkozasBlokk._hivatkozasElemLetrehozasa - VÉGE');
    return hivatkozasElem;
  }

  // =============================================
  // PRIVÁT - KOPPINTÁS KEZELÉSE
  // =============================================
  _koppintasKezeles() {
    console.log('EntitasHivatkozasBlokk._koppintasKezeles - KEZDÉS', {
      entitasId: this.blokk.entitasId,
      entitasTipus: this.blokk.entitasTipus
    });

    if (this.onKoppintas) {
      this.onKoppintas(this.blokk.entitasId, this.blokk.entitasTipus);
    }

    console.log('EntitasHivatkozasBlokk._koppintasKezeles - VÉGE');
  }

  // =============================================
// PRIVÁT - TÍPUS IKON VÁLASZTÁS
// =============================================
// @returns {string} Emoji karakter
_tipusIkon() {
  const ikonTerkep = {
    'Gondolat':      '📄',
    'Kategoria':     '🏷️',
    'GondolatTipus': '🧩',
    'Egyezmeny':     '🤝',
    'Javaslat':      '💡',
  };
  return ikonTerkep[this.blokk.entitasTipus] || '⬡';
}

}

// =============================================
// EXPORTÁLÁS
// =============================================
export default EntitasHivatkozasBlokk;