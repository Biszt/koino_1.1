// frontend/js/components/szovegSzerkeszto/blokkok/LinkBlokk.js

// =============================================
// LINK BLOKK
// Felelősség:
// - Linkblokk DOM elemének létrehozása
// - Üres állapot placeholder megjelenítése URL megadása előtt
// - URL megadása után a koppintható link megjelenítése
// - Fókuszkezelés — jelzi a szülőnek, melyik blokk aktív
// =============================================

class LinkBlokk {

  // =============================================
  // KONSTRUKTOR
  // =============================================
  // @param {Object} blokk - A blokk adatobjektum (BlokkListából)
  // @param {Object} callbacks - Esemény visszahívók
  // @param {Function} callbacks.onFokusz - Fókuszba kerüléskor (blokkId)
  // @param {Function} callbacks.onTorles - Törlésekor (blokkId)
  constructor(blokk, callbacks = {}) {
    console.log('LinkBlokk.constructor - KEZDÉS', { blokk });

    this.blokk = blokk;

    // Fókusz callback — a SzovegSzerkeszto _blokkFokuszba()-ját hívja
    this.onFokusz = callbacks.onFokusz || null;

    // Törlés callback — a SzovegSzerkeszto _blokkTorlese()-ét hívja
    this.onTorles = callbacks.onTorles || null;

    // DOM elem referencia
    this.elem = null;

    console.log('LinkBlokk.constructor - VÉGE');
  }

  // =============================================
// DOM ELEM LÉTREHOZÁSA
// =============================================
// Blokkot hoz létre — url nélkül placeholder, url-lel koppintható link jelenik meg
// MÓDOSÍTÁS: ha van elmentett méret (meretSzelesseg, meretMagassag, meretFontSize),
// visszaállítja őket a DOM-ra, hogy újratöltés után is megmaradjon a méret.
// @returns {HTMLElement} A linkblokk wrapper eleme
letrehozas() {
  console.log('LinkBlokk.letrehozas - KEZDÉS', { blokkId: this.blokk.id });

  // Wrapper elem
  const wrapper = document.createElement('div');
  wrapper.className = 'link-blokk-wrapper blokk-wrapper';
  wrapper.dataset.blokkId = this.blokk.id;
  wrapper.dataset.tipus = 'link';

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

  // Ha már van url (pl. betöltött tartalom szerkesztés módban),
  // azonnal megjelenítjük a linket, egyébként placeholdert
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

  console.log('LinkBlokk.letrehozas - VÉGE', { blokkId: this.blokk.id });
  return wrapper;
}

  // =============================================
  // PUBLIKUS - LINK BEÁLLÍTÁSA URL MEGADÁSA UTÁN
  // =============================================
  // A SzovegSzerkeszto hívja meg, miután a LinkPanel-ben URL lett megadva
  // @param {string} url      - A link URL-je
  // @param {string} felirat  - A link megjelenített felirata (lehet üres)
  linkBeallitasa(url, felirat) {
    console.log('LinkBlokk.linkBeallitasa - KEZDÉS', { url, felirat });

    // Adatok frissítése a blokk objektumon
    this.blokk.url = url;
    this.blokk.felirat = felirat;

    // Placeholder eltávolítása, koppintható link beillesztése
    if (this.elem) {
      this.elem.innerHTML = '';
      this.elem.appendChild(this._linkElemLetrehozasa());
    }

    console.log('LinkBlokk.linkBeallitasa - VÉGE', { url, felirat });
  }

  // =============================================
  // PRIVÁT - ÜRES ÁLLAPOT PLACEHOLDER
  // =============================================
  // URL megadása előtt jelenik meg a blokkban
  // @returns {HTMLElement} A placeholder elem
  _uresAllapotLetrehozasa() {
    console.log('LinkBlokk._uresAllapotLetrehozasa - KEZDÉS');

    // Placeholder konténer
    const placeholder = document.createElement('div');
    placeholder.className = 'link-blokk__placeholder';

    // Ikon
    const ikonElem = document.createElement('span');
    ikonElem.className = 'link-blokk__placeholder-ikon';
    ikonElem.textContent = '🔗';
    ikonElem.setAttribute('aria-hidden', 'true');

    placeholder.appendChild(ikonElem);

    console.log('LinkBlokk._uresAllapotLetrehozasa - VÉGE');
    return placeholder;
  }

  // =============================================
  // PRIVÁT - LINK ELEM
  // =============================================
  // Létrehozza a koppintható külső linket
  // Szerkesztő módban a kattintás le van tiltva — csak megjelenítési célú
  // @returns {HTMLElement} Az <a> elem
  _linkElemLetrehozasa() {
    console.log('LinkBlokk._linkElemLetrehozasa - KEZDÉS');

    const linkElem = document.createElement('a');
    linkElem.className = 'link-blokk';
    linkElem.href = this.blokk.url;

    // Mobilon és asztali gépen egyaránt új fülön nyílik
    linkElem.target = '_blank';
    linkElem.rel = 'noopener noreferrer';

    // Szerkesztő módban a kattintás NEM navigál —
    // a blokk fókuszba helyezése a wrapper click eseménye kezeli
    linkElem.addEventListener('click', (e) => {
      e.preventDefault();
    });

    // Lánc ikon
    const ikonElem = document.createElement('span');
    ikonElem.className = 'link-blokk__ikon';
    ikonElem.textContent = '🔗';
    ikonElem.setAttribute('aria-hidden', 'true');

    // Felirat: ha van megadott felirat, azt mutatjuk,
    // ha nincs, a rövidített URL-t
    const feliratElem = document.createElement('span');
    feliratElem.className = 'link-blokk__felirat';
    feliratElem.textContent = this.blokk.felirat || this._urlRovidites(this.blokk.url);

    linkElem.appendChild(ikonElem);
    linkElem.appendChild(feliratElem);

    console.log('LinkBlokk._linkElemLetrehozasa - VÉGE');
    return linkElem;
  }

  // =============================================
  // PRIVÁT - URL RÖVIDÍTÉS
  // =============================================
  // Ha nincs felirat megadva, az URL-ből csinál
  // olvasható rövid szöveget
  // pl. "https://www.example.com/hosszu/ut" → "example.com"
  // @param {string} url - A teljes URL
  // @returns {string} A rövidített, olvasható URL
  _urlRovidites(url) {
    console.log('LinkBlokk._urlRovidites - KEZDÉS', { url });

    try {
      // URL objektummal kinyerjük a domaint
      const urlObj = new URL(url);
      // www. előtag eltávolítása
      const eredmeny = urlObj.hostname.replace(/^www\./, '');
      console.log('LinkBlokk._urlRovidites - VÉGE', { eredmeny });
      return eredmeny;
    } catch (e) {
      // Ha az URL nem valid, visszaadjuk az eredeti stringet
      console.log('LinkBlokk._urlRovidites - VÉGE (nem valid URL)', { url });
      return url;
    }
  }

}

// =============================================
// EXPORTÁLÁS
// =============================================
export default LinkBlokk;