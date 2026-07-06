// frontend/js/components/kartya/JavaslatKartya.js

// --- IMPORTOK ---
import Kartya from './Kartya.js';
import fejlesztesreVarMegjelenitese from '../FejlesztesreVar.js';

// =============================================
// ÚJ - SzovegMezoMegjelenito importja
// =============================================
import SzovegMezoMegjelenito from '../szoveg/SzovegMezoMegjelenito.js';

// --- JAVASLAT KÁRTYA OSZTÁLY ---
// Felelőssége:
// 1. Örökli a Kartya.js teljes váz logikáját (hamburger, koppintás, állapot)
// 2. Feltölti a fejlécet: javaslatTípus, státusz, részvételi arány,
//    támogatottsági arány, ellenzői arány, bizonyossági mutató,
//    döntési idő, töredék jelzés (pl. "2 / 6") – ha töredék javaslat
// 3. Feltölti a body-t (csak kiválasztott kártyán): töredék részletek + indoklás blokkok
// 4. Megadja a hamburger menü opcióit
class JavaslatKartya extends Kartya {

  // ----- KONSTRUKTOR -----
  constructor(entitas, kivalasztott, onKivalasztas) {
    console.log('JavaslatKartya.constructor - KEZDÉS', {
      entitasId:     entitas?.entitasId,
      javaslatTipus: entitas?.adatok?.javaslatTipus
    });

    super(entitas, kivalasztott, onKivalasztas, (entitas) => this._hamburgerOpciok(entitas));

    // =============================================
    // ÚJ - Megjelenítő példány referencia
    // =============================================
    this.szovegMezoMegjelenito = null;

    console.log('JavaslatKartya.constructor - VÉGE', { entitasId: entitas?.entitasId });
  }

  // ----- FEJLÉC FELTÖLTÉSE -----
  // Változatlan
  _fejlecFeltoltese(fejlecTartalom) {
    console.log('JavaslatKartya._fejlecFeltoltese - KEZDÉS', {
      entitasId: this.entitas?.entitasId
    });

    const adatok = this.entitas.adatok ?? {};

    // --- JAVASLAT TÍPUS ---
    const tipusElem = document.createElement('span');
    tipusElem.className   = 'javaslat-kartya__tipus';
    tipusElem.textContent = adatok.javaslatTipus ?? '(típus nélkül)';
    fejlecTartalom.appendChild(tipusElem);

    // --- STÁTUSZ BADGE ---
    if (adatok.statusz) {
      const statuszElem    = document.createElement('span');
      const statuszModifier = adatok.statusz.toLowerCase().replace(/\s+/g, '-');
      statuszElem.className = `javaslat-kartya__statusz javaslat-kartya__statusz--${statuszModifier}`;
      statuszElem.textContent = adatok.statusz;
      statuszElem.setAttribute('aria-label', `Státusz: ${adatok.statusz}`);
      fejlecTartalom.appendChild(statuszElem);
    }

    // --- TÖREDÉK JELZÉS ---
    if (adatok.toredekAdatok) {
      const { toredekSorszam, toredekDarab } = adatok.toredekAdatok;
      const toredekElem = document.createElement('span');
      toredekElem.className   = 'javaslat-kartya__toredek';
      toredekElem.textContent = `${toredekSorszam ?? '?'} / ${toredekDarab ?? '?'}`;
      toredekElem.setAttribute('aria-label',
        `Töredék javaslat: ${toredekSorszam}. rész, összesen ${toredekDarab}`
      );
      fejlecTartalom.appendChild(toredekElem);
    }

    // --- MUTATÓK SOR ---
    const mutatokSor = document.createElement('div');
    mutatokSor.className = 'javaslat-kartya__mutatok-sor';

    this._mutatoElemLetrehozasa(mutatokSor, '👥', adatok.reszveteliArany,    '%', 'Részvételi arány',      'javaslat-kartya__mutato--reszveteli');
    this._mutatoElemLetrehozasa(mutatokSor, '✅', adatok.tamogatotsagiArany, '%', 'Támogatottsági arány',  'javaslat-kartya__mutato--tamogatottsagi');
    this._mutatoElemLetrehozasa(mutatokSor, '❌', adatok.ellenzoiArany,      '%', 'Ellenzői arány',        'javaslat-kartya__mutato--ellenzoi');
    this._mutatoElemLetrehozasa(mutatokSor, '🎯', adatok.bizonyossagiMutato, '',  'Bizonyossági mutató',   'javaslat-kartya__mutato--bizonyossagi');

    if (adatok.dontesiIdo !== null && adatok.dontesiIdo !== undefined) {
      const percElem = document.createElement('span');
      percElem.className = 'javaslat-kartya__mutato javaslat-kartya__mutato--dontesi-ido';
      percElem.setAttribute('aria-label', 'Döntési idő');
      percElem.textContent = adatok.dontesiIdo >= 60
        ? `⏱ ${Math.round(adatok.dontesiIdo / 60)} perc`
        : `⏱ ${adatok.dontesiIdo} mp`;
      mutatokSor.appendChild(percElem);
    }

    fejlecTartalom.appendChild(mutatokSor);

    console.log('JavaslatKartya._fejlecFeltoltese - VÉGE', {
      entitasId:     this.entitas?.entitasId,
      javaslatTipus: adatok.javaslatTipus
    });
  }

  // ----- BODY FELTÖLTÉSE -----
  // =============================================
  // MÓDOSÍTVA - indoklás blokk alapú renderelés
  // =============================================
  // A szovegMezo az indoklás tartalma, blokkok tömbjeként tárolva.
  // @param {HTMLElement} body - A .pakli-kartya__body elem
  _bodyFeltoltese(body) {
    console.log('JavaslatKartya._bodyFeltoltese - KEZDÉS', {
      entitasId: this.entitas?.entitasId
    });

    const adatok = this.entitas.adatok ?? {};

    // --- TÖREDÉK RÉSZLETEK ---
    // Változatlan
    if (adatok.toredekAdatok) {
      const toredekReszletek = document.createElement('div');
      toredekReszletek.className = 'javaslat-kartya__toredek-reszletek';

      const csoportCimke = document.createElement('span');
      csoportCimke.className   = 'javaslat-kartya__toredek-cimke';
      csoportCimke.textContent = 'Töredék csoport azonosító:';

      const csoportId = document.createElement('span');
      csoportId.className   = 'javaslat-kartya__toredek-csoport-id';
      csoportId.textContent = adatok.toredekAdatok.toredekCsoportId ?? '—';

      toredekReszletek.appendChild(csoportCimke);
      toredekReszletek.appendChild(csoportId);
      body.appendChild(toredekReszletek);
    }

    // --- INDOKLÁS ---
    // =============================================
    // ÚJ - textContent helyett SzovegMezoMegjelenito
    // =============================================
    // Az indoklás blokk tömb (kép, link, entitás hivatkozás is lehet benne),
    // ezért ugyanolyan renderelés kell, mint a többi kártya szöveg mezőjénél.
    if (adatok.szovegMezo) {
      // A formátum felismerését (blokk tömb, több oldalas objektum vagy
      // legacy string) a SzovegMezoMegjelenito végzi — nyersen adjuk át
      const blokkok = adatok.szovegMezo;

      const indoklasKontener = document.createElement('div');
      indoklasKontener.className = 'javaslat-kartya__indoklas-kontener';
      body.appendChild(indoklasKontener);

      this.szovegMezoMegjelenito = new SzovegMezoMegjelenito(indoklasKontener, {
        blokkok,
        onEntitasKivalasztas: (entitasId, entitasTipus) => {
          console.log('JavaslatKartya - entitás hivatkozás koppintva', {
            entitasId,
            entitasTipus
          });
          if (typeof this.onKivalasztas === 'function') {
            this.onKivalasztas(entitasId, entitasTipus);
          }
        }
      });
    }

    console.log('JavaslatKartya._bodyFeltoltese - VÉGE', {
      entitasId:  this.entitas?.entitasId,
      vanToredek: !!adatok.toredekAdatok,
      vanSzoveg:  !!adatok.szovegMezo
    });
  }

  // ----- MUTATÓ ELEM LÉTREHOZÁSA -----
  // Változatlan
  _mutatoElemLetrehozasa(kontener, ikon, ertek, egyseg, ariaLabel, modifierCss) {
    console.log('JavaslatKartya._mutatoElemLetrehozasa - KEZDÉS', { ariaLabel, ertek });

    if (ertek === null || ertek === undefined) {
      console.log('JavaslatKartya._mutatoElemLetrehozasa - VÉGE: nincs érték, kihagyva');
      return;
    }

    const mutatoElem = document.createElement('span');
    mutatoElem.className = `javaslat-kartya__mutato ${modifierCss}`;
    mutatoElem.setAttribute('aria-label', `${ariaLabel}: ${ertek}${egyseg}`);
    mutatoElem.textContent = `${ikon} ${ertek}${egyseg}`;
    kontener.appendChild(mutatoElem);

    console.log('JavaslatKartya._mutatoElemLetrehozasa - VÉGE', { ariaLabel, ertek });
  }

  // =============================================
  // ÚJ - MEGSEMMISÍTÉS
  // =============================================
  destroy() {
    console.log('JavaslatKartya.destroy - KEZDÉS', {
      entitasId: this.entitas?.entitasId
    });

    if (this.szovegMezoMegjelenito) {
      this.szovegMezoMegjelenito.destroy();
      this.szovegMezoMegjelenito = null;
    }

    super.destroy?.();

    console.log('JavaslatKartya.destroy - VÉGE', {
      entitasId: this.entitas?.entitasId
    });
  }

  // ----- HAMBURGER MENÜ OPCIÓK -----
  // Változatlan
  _hamburgerOpciok(entitas) {
    console.log('JavaslatKartya._hamburgerOpciok - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    // A 🚧 ikonú pontok a fejlesztési terv részei (docs/fejlesztesi_terv.md),
    // de még nem készültek el – kattintásra a közös FejlesztesreVar üzenet jelenik meg.
    // A korábbi „Törlés" pont a terv szerint törölve (a törlés javaslat útján történik).
    const opciok = [
      {
        ikon:    '🚧',
        felirat: 'Szavazat leadása',
        akcio:   () => fejlesztesreVarMegjelenitese('Szavazat leadása')
      },
      {
        ikon:    '🚧',
        felirat: 'Új tartalom létrehozása ebből',
        akcio:   () => fejlesztesreVarMegjelenitese('Új tartalom létrehozása ebből')
      },
      {
        ikon:       '🚧',
        felirat:    'Tudatpont módosítás',
        elvalaszto: true,
        akcio:      () => fejlesztesreVarMegjelenitese('Tudatpont módosítás')
      },
      {
        ikon:       '🚧',
        felirat:    'Részletes adatok',
        elvalaszto: true,
        akcio:      () => fejlesztesreVarMegjelenitese('Részletes adatok')
      }
    ];

    console.log('JavaslatKartya._hamburgerOpciok - VÉGE', {
      opciokSzama: opciok.length
    });

    return opciok;
  }
}

// --- EXPORTÁLÁS ---
export default JavaslatKartya;