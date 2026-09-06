// frontend/js/components/szovegSzerkeszto/blokkok/FajlBlokk.js

// =============================================
// FÁJL BLOKK
// Felelősség:
// - Fájlblokk DOM elemének létrehozása
// - Üres állapot placeholder megjelenítése feltöltés előtt
// - Feltöltés után a letöltési link megjelenítése
// =============================================

class FajlBlokk {

    // =============================================
    // KONSTRUKTOR
    // =============================================
    // @param {Object} blokk - A blokk adatobjektum (BlokkListából)
    // @param {Object} callbacks - Esemény visszahívók
    // @param {Function} callbacks.onFokusz - Fókuszba kerüléskor (blokkId)
    // @param {Function} callbacks.onTorles - Törlésekor (blokkId)
    constructor(blokk, callbacks = {}) {
        console.log('FajlBlokk.constructor - KEZDÉS', { blokk });

        this.blokk = blokk;
        // Fókusz callback — a SzovegSzerkeszto _blokkFokuszba()-ját hívja
        this.onFokusz = callbacks.onFokusz || null;
        // Törlés callback — a SzovegSzerkeszto _blokkTorlese()-ét hívja
        this.onTorles = callbacks.onTorles || null;
        // Megjelenítő mód — a kártyákon true: a kattintás ténylegesen letölt,
        // szerkesztő módban false: a kattintás csak fókuszba helyezi a blokkot
        this.megjelenitesMod = callbacks.megjelenitesMod || false;

        // DOM elem referencia
        this.elem = null;

        console.log('FajlBlokk.constructor - VÉGE');
    }

    // =============================================
// DOM ELEM LÉTREHOZÁSA
// =============================================
// Blokkot hoz létre — url nélkül placeholder, url-lel letöltési link jelenik meg
// MÓDOSÍTÁS: ha van elmentett méret (meretSzelesseg, meretMagassag, meretFontSize),
// visszaállítja őket a DOM-ra, hogy újratöltés után is megmaradjon a méret.
// @returns {HTMLElement} A fájlblokk wrapper eleme
letrehozas() {
  console.log('FajlBlokk.letrehozas - KEZDÉS', { blokkId: this.blokk.id });

  // Wrapper elem
  const wrapper = document.createElement('div');
  wrapper.className = 'fajl-blokk-wrapper blokk-wrapper';
  wrapper.dataset.blokkId = this.blokk.id;
  wrapper.dataset.tipus = 'fajl';

  // Fókuszálhatóvá tesszük, hogy kattintásra aktív blokk legyen
  wrapper.tabIndex = 0;

  // Kattintáskor fókuszt kap → _blokkFokuszba() lefut a szülőben
  wrapper.addEventListener('click', () => {
    wrapper.focus();
  });

  // Fókuszkor jelezzük a szülőnek, hogy ez az aktív blokk
  wrapper.addEventListener('focus', () => {
    if (this.onFokusz) this.onFokusz(this.blokk.id);
  });

  // Ha már van url (pl. betöltött gondolat szerkesztés módban),
  // azonnal megjelenítjük a letöltési linket, egyébként placeholdert
  let belsoElem = null;
  if (this.blokk.url) {
    belsoElem = this._linkElemLetrehozasa();
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

  console.log('FajlBlokk.letrehozas - VÉGE', { blokkId: this.blokk.id });
  return wrapper;
}

    // =============================================
// PUBLIKUS - FÁJL MEGJELENÍTÉSE FELTÖLTÉS UTÁN
// =============================================
// A SzovegSzerkeszto hívja meg, miután a feltöltés sikerült.
// JAVÍTÁS: ha volt elmentett betűméret (meretFontSize), közvetlenül
// a belső tartalmi elemekre alkalmazzuk — nem a wrapper <a>-ra,
// mert a CSS osztály felülírja az örökített font-size-t.
// @param {string} url - A feltöltött fájl elérési útja
// @param {string} nev - A fájl neve
fajlBeallitasa(url, nev) {
  console.log('FajlBlokk.fajlBeallitasa - KEZDÉS', { url, nev });

  // Adatok frissítése a blokk objektumon
  this.blokk.url = url;
  this.blokk.nev = nev;

  if (this.elem) {
    this.elem.innerHTML = '';
    const linkElem = this._linkElemLetrehozasa();

    // JAVÍTÁS: ha volt elmentett méret, a belső elemekre alkalmazzuk
    if (this.blokk.meretFontSize) {
      const nevElem  = linkElem.querySelector('.fajl-blokk__nev');
      const ikonElem = linkElem.querySelector('.fajl-blokk__ikon');
      if (nevElem)  nevElem.style.fontSize  = `${this.blokk.meretFontSize}px`;
      if (ikonElem) ikonElem.style.fontSize = `${this.blokk.meretFontSize}px`;
    }

    this.elem.appendChild(linkElem);
  }

  console.log('FajlBlokk.fajlBeallitasa - VÉGE', { url, nev });
}

    // =============================================
    // PRIVÁT - ÜRES ÁLLAPOT PLACEHOLDER
    // =============================================
    // Feltöltés előtt jelenik meg a blokkban
    // @returns {HTMLElement} A placeholder elem
    _uresAllapotLetrehozasa() {
        console.log('FajlBlokk._uresAllapotLetrehozasa - KEZDÉS');

        // Placeholder konténer
        const placeholder = document.createElement('div');
        placeholder.className = 'fajl-blokk__placeholder';

        // Ikon
        const ikonElem = document.createElement('span');
        ikonElem.className = 'fajl-blokk__placeholder-ikon';
        ikonElem.textContent = '📎';
        ikonElem.setAttribute('aria-hidden', 'true');

        placeholder.appendChild(ikonElem);

        console.log('FajlBlokk._uresAllapotLetrehozasa - VÉGE');
        return placeholder;
    }

    // =============================================
    // PRIVÁT - LETÖLTÉSI LINK ELEM
    // =============================================
    // Feltöltés után jelenik meg a blokkban
    // Szerkesztő módban a kattintás le van tiltva — csak megjelenítési célú
    // @returns {HTMLElement} Az <a> elem
    _linkElemLetrehozasa() {
        console.log('FajlBlokk._linkElemLetrehozasa - KEZDÉS');

        const linkElem = document.createElement('a');
        linkElem.className = 'fajl-blokk';
        linkElem.href = this.blokk.url;

        // download attribútum: böngésző letöltésként kezeli, nem navigációként
        linkElem.download = this.blokk.nev;

        // Új fülön nyílik, ha a download nem támogatott
        linkElem.target = '_blank';
        linkElem.rel = 'noopener noreferrer';

        // Szerkesztő módban a kattintás NEM indít letöltést —
        // a blokk fókuszba helyezése a wrapper click eseménye kezeli.
        // Megjelenítő módban (kártyán) a kattintás ténylegesen letölt.
        if (!this.megjelenitesMod) {
            linkElem.addEventListener('click', (e) => {
                e.preventDefault();
            });
        }

        // Fájl ikon
        const ikonElem = document.createElement('span');
        ikonElem.className = 'fajl-blokk__ikon';
        ikonElem.textContent = this._ikonValasztas();
        ikonElem.setAttribute('aria-hidden', 'true');

        // Fájl neve
        const infoElem = document.createElement('div');
        infoElem.className = 'fajl-blokk__info';

        const nevElem = document.createElement('div');
        nevElem.className = 'fajl-blokk__nev';
        nevElem.textContent = this.blokk.nev;

        infoElem.appendChild(nevElem);
        linkElem.appendChild(ikonElem);
        linkElem.appendChild(infoElem);

        console.log('FajlBlokk._linkElemLetrehozasa - VÉGE');
        return linkElem;
    }

    // =============================================
    // PRIVÁT - IKON VÁLASZTÁS FÁJLTÍPUS ALAPJÁN
    // =============================================
    // @returns {string} Emoji karakter
    _ikonValasztas() {
        if (!this.blokk.nev) return '📎';

        const kiterjesztes = this.blokk.nev.split('.').pop().toLowerCase();

        const ikonTerkep = {
            jpg: '🖼', jpeg: '🖼', png: '🖼', gif: '🖼', webp: '🖼', svg: '🖼',
            pdf: '📄', doc: '📝', docx: '📝', txt: '📝', md: '📝',
            xls: '📊', xlsx: '📊', csv: '📊',
            ppt: '📑', pptx: '📑',
            zip: '🗜', rar: '🗜', tar: '🗜', gz: '🗜',
            mp3: '🎵', wav: '🎵', ogg: '🎵',
            mp4: '🎬', mov: '🎬', avi: '🎬', webm: '🎬',
        };

        return ikonTerkep[kiterjesztes] || '📎';
    }

}

// =============================================
// EXPORTÁLÁS
// =============================================
export default FajlBlokk;