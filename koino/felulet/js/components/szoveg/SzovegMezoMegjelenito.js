// frontend/js/components/szoveg/SzovegMezoMegjelenito.js

import SzovegBlokk from '../szovegSzerkeszto/blokkok/SzovegBlokk.js';
import KepBlokk from '../szovegSzerkeszto/blokkok/KepBlokk.js';
import FajlBlokk from '../szovegSzerkeszto/blokkok/FajlBlokk.js';
import LinkBlokk from '../szovegSzerkeszto/blokkok/LinkBlokk.js';
import EntitasHivatkozasBlokk from '../szovegSzerkeszto/blokkok/EntitasHivatkozasBlokk.js';

// =============================================
// SZÖVEG MEZŐ MEGJELENÍTŐ
// Felelősség:
// - Blokk gondolat csak olvasható renderelése a kártyák body-jában
// - MINDHÁROM mentett formátum kezelése:
//   1. blokk tömb (egyszerű, navigáció nélküli gondolat)
//   2. { oldalNavigacio: { fulek }, aktivFulId, blokkok: { fulId: [...] } }
//      (több oldalas gondolat — csak olvasható fülsáv is renderelődik)
//   3. sima string (régi, migráció előtti rekordok)
// - Entitás hivatkozás koppintás kezelése a Pakli.js felé
// - A meglévő blokk osztályok letrehozasMegjelenitesMod() / letrehozas()
//   metódusait hívja – dupla logika nincs, az elmentett méreteket
//   (meretSzelesseg / meretMagassag / meretFontSize) a blokk osztályok
//   maguk állítják vissza
// =============================================

class SzovegMezoMegjelenito {

  // =============================================
  // KONSTRUKTOR
  // =============================================
  // @param {HTMLElement} kontener - A befogadó DOM elem (a kártya body-ban)
  // @param {Object} beallitasok
  // @param {Array|Object|string} beallitasok.blokkok - A blokk adat bármely
  //                                                    mentett formátumban
  // @param {Function} beallitasok.onEntitasKivalasztas - Entitás hivatkozás koppintásakor
  //                                                      hívódik (entitasId, entitasTipus)
  constructor(kontener, beallitasok = {}) {
    console.log('SzovegMezoMegjelenito.constructor - KEZDÉS', {
      bemenetTipus: Array.isArray(beallitasok.blokkok) ? 'tomb' : typeof beallitasok.blokkok
    });

    // Befogadó elem
    this.kontener = kontener;

    // A megjelenítő CSS osztály rákerül a konténerre — a kártyák saját
    // konténer-osztálya mellett ez aktiválja a szovegMezoMegjelenito.css szabályait
    this.kontener.classList.add('szoveg-mezo-megjelenito');

    // Bemeneti adat normalizálása egységes belső formátumra
    const normalizalt = this._adatNormalizalas(beallitasok.blokkok);

    // Fülek tömbje [{id, felirat}] — null, ha nincs oldal navigáció
    this.fulek = normalizalt.fulek;

    // Blokkok fülenként { fulId: [...] } — null, ha nincs navigáció
    this.blokkokFulenkent = normalizalt.blokkokFulenkent;

    // Az éppen megjelenített fül ID-ja — null, ha nincs navigáció
    this.aktivFulId = normalizalt.aktivFulId;

    // Az éppen megjelenített blokkok tömbje
    this.blokkok = normalizalt.blokkok;

    // Entitás hivatkozás koppintás callback
    this.onEntitasKivalasztas = beallitasok.onEntitasKivalasztas ?? null;

    // Renderelés azonnal
    this._render();

    console.log('SzovegMezoMegjelenito.constructor - VÉGE', {
      fulekSzama: this.fulek?.length ?? 0,
      blokkSzam:  this.blokkok.length
    });
  }

  // =============================================
  // PRIVÁT - BEMENETI ADAT NORMALIZÁLÁSA
  // =============================================
  // A háromféle mentett formátumot egységes belső alakra hozza.
  // @param {Array|Object|string|null} bemenet - A nyers mentett adat
  // @returns {Object} { fulek, blokkokFulenkent, aktivFulId, blokkok }
  _adatNormalizalas(bemenet) {
    console.log('SzovegMezoMegjelenito._adatNormalizalas - KEZDÉS');

    // Nincs adat — üres megjelenítő
    if (!bemenet) {
      return { fulek: null, blokkokFulenkent: null, aktivFulId: null, blokkok: [] };
    }

    // 1. formátum: blokk tömb (navigáció nélkül)
    if (Array.isArray(bemenet)) {
      return { fulek: null, blokkokFulenkent: null, aktivFulId: null, blokkok: bemenet };
    }

    // 3. formátum: sima string (régi, migráció előtti rekord) —
    // egyetlen szöveges blokkba csomagoljuk
    if (typeof bemenet === 'string') {
      const blokkok = bemenet.trim()
        ? [{
            id:       'legacy-blokk-1',
            tipus:    'szoveg',
            tartalom: bemenet,
            formatas: { felkover: false, dolt: false, meret: 'kozepes' }
          }]
        : [];
      return { fulek: null, blokkokFulenkent: null, aktivFulId: null, blokkok };
    }

    // 2. formátum: több oldalas navigációs objektum
    const fulek = bemenet.oldalNavigacio?.fulek;
    if (Array.isArray(fulek) && fulek.length > 0) {
      const blokkokFulenkent = bemenet.blokkok || {};

      // Megjelenítéskor mindig az ELSŐ oldallal indulunk — a mentett
      // aktivFulId csak a szerkesztő állapotát tükrözi (melyik fülön
      // állt a szerző mentéskor), az olvasónak nem releváns
      const aktivFulId = fulek[0].id;

      return {
        fulek,
        blokkokFulenkent,
        aktivFulId,
        blokkok: blokkokFulenkent[aktivFulId] || []
      };
    }

    // Ismeretlen objektum formátum — üres megjelenítő, warninggal
    console.warn('SzovegMezoMegjelenito._adatNormalizalas - ismeretlen formátum', { bemenet });
    return { fulek: null, blokkokFulenkent: null, aktivFulId: null, blokkok: [] };
  }

  // =============================================
  // RENDERELÉS
  // =============================================
  // Ha van oldal navigáció: fülsáv + az aktív fül blokkjai.
  // Ha nincs: csak a blokkok.
  _render() {
    console.log('SzovegMezoMegjelenito._render - KEZDÉS', {
      blokkSzam:  this.blokkok.length,
      aktivFulId: this.aktivFulId
    });

    // Konténer ürítése (újra-renderelés esetére)
    this.kontener.innerHTML = '';

    // Fülsáv — csak több oldalas gondolatnál
    if (this.fulek && this.fulek.length > 0) {
      this.kontener.appendChild(this._fulsavLetrehozasa());
    }

    this.blokkok.forEach((blokk) => {
      const domElem = this._blokkRenderelese(blokk);
      if (domElem) {
        this.kontener.appendChild(domElem);
      }
    });

    console.log('SzovegMezoMegjelenito._render - VÉGE');
  }

  // =============================================
  // PRIVÁT - FÜLSÁV LÉTREHOZÁSA (csak olvasható)
  // =============================================
  // A szerkesztő fülsávjának egyszerűsített, csak olvasható párja:
  // nincs + gomb, nincs átnevezés — csak oldalak közti váltás.
  // @returns {HTMLElement} A fülsáv elem
  _fulsavLetrehozasa() {
    console.log('SzovegMezoMegjelenito._fulsavLetrehozasa - KEZDÉS', {
      fulekSzama: this.fulek.length
    });

    const fulsav = document.createElement('div');
    fulsav.className = 'szoveg-mezo-megjelenito__fulsav';

    this.fulek.forEach(ful => {
      const fulGomb = document.createElement('button');
      fulGomb.type = 'button';
      fulGomb.className = 'szoveg-mezo-megjelenito__ful';
      fulGomb.textContent = ful.felirat;
      fulGomb.dataset.fulId = ful.id;

      if (ful.id === this.aktivFulId) {
        fulGomb.classList.add('szoveg-mezo-megjelenito__ful--aktiv');
      }

      fulGomb.addEventListener('click', (e) => {
        // Ne buborékoljon a kártyáig — a fülváltás nem kártya-kiválasztás
        e.stopPropagation();
        this._fulValtas(ful.id);
      });

      fulsav.appendChild(fulGomb);
    });

    console.log('SzovegMezoMegjelenito._fulsavLetrehozasa - VÉGE');
    return fulsav;
  }

  // =============================================
  // PRIVÁT - FÜLVÁLTÁS
  // =============================================
  // Az aktív fül átállítása és a teljes gondolat újrarenderelése.
  // @param {string} fulId - Az új aktív fül ID-ja
  _fulValtas(fulId) {
    console.log('SzovegMezoMegjelenito._fulValtas - KEZDÉS', { fulId });

    if (fulId === this.aktivFulId) return;

    this.aktivFulId = fulId;
    this.blokkok = this.blokkokFulenkent?.[fulId] || [];
    this._render();

    console.log('SzovegMezoMegjelenito._fulValtas - VÉGE', { fulId });
  }

  // =============================================
  // BLOKK RENDERELÉSE
  // =============================================
  // Típus alapján példányosítja a megfelelő blokk osztályt
  // és visszaadja a megjelenítő DOM elemet.
  // Az elmentett méreteket (meretSzelesseg stb.) a blokk osztályok
  // letrehozas() metódusai maguk állítják vissza.
  // @param {Object} blokk - A blokk adatobjektum
  // @returns {HTMLElement|null} A kész DOM elem, vagy null ismeretlen típusnál
  _blokkRenderelese(blokk) {
    console.log('SzovegMezoMegjelenito._blokkRenderelese - KEZDÉS', {
      blokkId:   blokk?.id,
      blokkTipus: blokk?.tipus
    });

    let domElem = null;

    switch (blokk.tipus) {

      // --- SZÖVEG BLOKK ---
      // A SzovegBlokk.letrehozas() egy contenteditable divet hoz létre.
      // Megjelenítő módban: contentEditable kikapcsolva, billentyű
      // és input eseményfigyelők nem szükségesek – a callbacks üres.
      case 'szoveg': {
        const szovegBlokk = new SzovegBlokk(blokk, {});
        domElem = szovegBlokk.letrehozas();
        // Csak olvasható: szerkesztés tiltása
        domElem.contentEditable = 'false';
        domElem.setAttribute('aria-readonly', 'true');
        break;
      }

      // --- KÉP BLOKK ---
      // A KepBlokk.letrehozas() wrapper + kép + méretválasztó sorral tér vissza.
      // Megjelenítő módban: a méretválasztó gombok és törlő gomb nem szükségesek.
      // A KepBlokk maga kezeli a megjelenítést, csak a törlő gomb szűrendő ki.
      case 'kep': {
        const kepBlokk = new KepBlokk(blokk, {});
        domElem = kepBlokk.letrehozas();
        // Törlő gomb eltávolítása (csak szerkesztő módban kell)
        const kepTorloGomb = domElem.querySelector('.blokk-torlo-gomb');
        if (kepTorloGomb) kepTorloGomb.remove();
        // Méretválasztó eltávolítása (csak szerkesztő módban kell)
        const meretValaszto = domElem.querySelector('.kep-blokk__meret-valaszto');
        if (meretValaszto) meretValaszto.remove();
        break;
      }

      // --- FÁJL BLOKK ---
      // A FajlBlokk.letrehozas() wrapper + letöltési link + törlő gombbal tér vissza.
      // Megjelenítő módban: törlő gomb eltávolítva.
      case 'fajl': {
        // megjelenitesMod: a kattintás ténylegesen letölti a fájlt
        const fajlBlokk = new FajlBlokk(blokk, { megjelenitesMod: true });
        domElem = fajlBlokk.letrehozas();
        // Törlő gomb eltávolítása
        const fajlTorloGomb = domElem.querySelector('.blokk-torlo-gomb');
        if (fajlTorloGomb) fajlTorloGomb.remove();
        break;
      }

      // --- LINK BLOKK ---
      // A LinkBlokk.letrehozas() wrapper + link + törlő gombbal tér vissza.
      // Megjelenítő módban: törlő gomb eltávolítva.
      case 'link': {
        // megjelenitesMod: a kattintás ténylegesen megnyitja a linket
        const linkBlokk = new LinkBlokk(blokk, { megjelenitesMod: true });
        domElem = linkBlokk.letrehozas();
        // Törlő gomb eltávolítása
        const linkTorloGomb = domElem.querySelector('.blokk-torlo-gomb');
        if (linkTorloGomb) linkTorloGomb.remove();
        break;
      }

      // --- ENTITÁS HIVATKOZÁS BLOKK ---
      // Az EntitasHivatkozasBlokk.letrehozasMegjelenitesMod() már pontosan
      // erre az esetre lett tervezve: csak a koppintható hivatkozást adja vissza,
      // törlő gomb és wrapper nélkül.
      case 'entitasHivatkozas': {
        const hivatkozasBlokk = new EntitasHivatkozasBlokk(blokk, {
          // onKoppintas: a SzovegMezoMegjelenito onEntitasKivalasztas
          // callbackjét hívja, ami a kártyákon keresztül a Pakli.js-be ér
          onKoppintas: (entitasId, entitasTipus) => {
            console.log('SzovegMezoMegjelenito - entitás hivatkozás koppintva', {
              entitasId,
              entitasTipus
            });
            if (typeof this.onEntitasKivalasztas === 'function') {
              this.onEntitasKivalasztas(entitasId, entitasTipus);
            }
          }
        });
        // Megjelenítő módhoz tervezett metódus – wrapper és törlő gomb nélkül
        domElem = hivatkozasBlokk.letrehozasMegjelenitesMod();
        break;
      }

      default:
        console.warn('SzovegMezoMegjelenito._blokkRenderelese - ismeretlen típus', {
          tipus: blokk.tipus
        });
    }

    console.log('SzovegMezoMegjelenito._blokkRenderelese - VÉGE', {
      blokkId:    blokk?.id,
      sikerult:   !!domElem
    });

    return domElem;
  }

  // =============================================
  // MEGSEMMISÍTÉS
  // =============================================
  // A kártyák destroy() metódusa hívja meg.
  // Üríti a konténert és elvágja a referenciákat.
  destroy() {
    console.log('SzovegMezoMegjelenito.destroy - KEZDÉS');

    // Konténer ürítése (DOM események automatikusan lekapcsolódnak)
    this.kontener.innerHTML = '';

    // Referenciák elengedése
    this.blokkok              = [];
    this.blokkokFulenkent     = null;
    this.fulek                = null;
    this.aktivFulId           = null;
    this.onEntitasKivalasztas = null;
    this.kontener             = null;

    console.log('SzovegMezoMegjelenito.destroy - VÉGE');
  }

}

// =============================================
// EXPORTÁLÁS
// =============================================
export default SzovegMezoMegjelenito;
