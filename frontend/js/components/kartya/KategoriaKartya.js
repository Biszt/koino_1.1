// frontend/js/components/kartya/KategoriaKartya.js

// --- IMPORTOK ---
import Kartya from './Kartya.js';
import { API_ALAP_URL } from '../../utils/apiHelper.js';

// =============================================
// ÚJ - SzovegMezoMegjelenito importja
// =============================================
// A blokk alapú szöveg tartalom renderelésért felelős segédosztály
import SzovegMezoMegjelenito from '../szoveg/SzovegMezoMegjelenito.js';

// --- KATEGÓRIA KÁRTYA OSZTÁLY ---
// Felelőssége:
// 1. Örökli a Kartya.js teljes váz logikáját (hamburger, koppintás, állapot)
// 2. Feltölti a fejlécet: ikon, név, saját tudatpont, hierarchikus tudatpont
// 3. Feltölti a body-t (csak kiválasztott kártyán): leírás blokkok megjelenítése
// 4. Megadja a hamburger menü opcióit
class KategoriaKartya extends Kartya {

  // ----- KONSTRUKTOR -----
  // @param {Object}   entitas       - A pakli kategória eleme a backend válaszából
  // @param {boolean}  kivalasztott  - Igaz, ha ez a kiválasztott kártya
  // @param {Function} onKivalasztas - Koppintás callback a Pakli.js-ből
  constructor(entitas, kivalasztott, onKivalasztas) {
    console.log('KategoriaKartya.constructor - KEZDÉS', {
      entitasId: entitas?.entitasId,
      nev:       entitas?.adatok?.nev
    });

    super(entitas, kivalasztott, onKivalasztas, (entitas) => this._hamburgerOpciok(entitas));

    // =============================================
    // ÚJ - Megjelenítő példány referencia
    // =============================================
    // A _bodyFeltoltese() hozza létre, a kartya megsemmisítésekor kell felszabadítani
    this.szovegMezoMegjelenito = null;

    console.log('KategoriaKartya.constructor - VÉGE', { entitasId: entitas?.entitasId });
  }

  // ----- IKON MEGJELENÍTÉS -----
  // Változatlan
  _ikonMegjelenites(kontener, ikonErtek, cssAlapOsztaly) {
    console.log('KategoriaKartya._ikonMegjelenites - KEZDÉS', { ikonErtek });

    if (!ikonErtek) {
      console.log('KategoriaKartya._ikonMegjelenites - VÉGE: nincs ikon érték');
      return;
    }

    if (ikonErtek.startsWith('http://') || ikonErtek.startsWith('https://')) {
      const ikonKep = document.createElement('img');
      ikonKep.className = `${cssAlapOsztaly}__ikon-kep`;
      ikonKep.src       = ikonErtek;
      ikonKep.alt       = '';
      ikonKep.setAttribute('aria-hidden', 'true');
      ikonKep.width  = 32;
      ikonKep.height = 32;
      kontener.appendChild(ikonKep);
    } else {
      const ikonElem = document.createElement('span');
      ikonElem.className   = `${cssAlapOsztaly}__ikon`;
      ikonElem.textContent = ikonErtek;
      ikonElem.setAttribute('aria-hidden', 'true');
      kontener.appendChild(ikonElem);
    }

    console.log('KategoriaKartya._ikonMegjelenites - VÉGE', { ikonErtek });
  }

  // ----- FEJLÉC FELTÖLTÉSE -----
  // Változatlan
  _fejlecFeltoltese(fejlecTartalom) {
    console.log('KategoriaKartya._fejlecFeltoltese - KEZDÉS', {
      entitasId: this.entitas?.entitasId
    });

    const adatok = this.entitas.adatok ?? {};

    const nevElem = document.createElement('span');
    nevElem.className   = 'kategoria-kartya__nev';
    nevElem.textContent = adatok.nev ?? '(név nélkül)';
    fejlecTartalom.appendChild(nevElem);

    const tudatpontSor = document.createElement('div');
    tudatpontSor.className = 'kategoria-kartya__tudatpont-sor';

    const sajatTudatpontElem = document.createElement('span');
    sajatTudatpontElem.className = 'kategoria-kartya__tudatpont kategoria-kartya__tudatpont--sajat';
    sajatTudatpontElem.setAttribute('aria-label', 'Saját tudatpont');
    sajatTudatpontElem.textContent = `🌿 ${(this.entitas.sajatTudatpont ?? 0).toLocaleString()}`;
    tudatpontSor.appendChild(sajatTudatpontElem);

    const hierarchikusTudatpontElem = document.createElement('span');
    hierarchikusTudatpontElem.className = 'kategoria-kartya__tudatpont kategoria-kartya__tudatpont--hierarchikus';
    hierarchikusTudatpontElem.setAttribute('aria-label', 'Hierarchikus tudatpont');
    hierarchikusTudatpontElem.textContent = `🌲 ${(this.entitas.hierarchikusOsszesPont ?? 0).toLocaleString()}`;
    tudatpontSor.appendChild(hierarchikusTudatpontElem);

    fejlecTartalom.appendChild(tudatpontSor);

    this._ikonMegjelenites(fejlecTartalom, adatok.ikon, 'kategoria-kartya');

    console.log('KategoriaKartya._fejlecFeltoltese - VÉGE', {
      entitasId: this.entitas?.entitasId,
      nev:       adatok.nev
    });
  }

  // ----- BODY FELTÖLTÉSE -----
  // =============================================
  // MÓDOSÍTVA - blokk alapú szöveg renderelés
  // =============================================
  // A szovegMezo mostantól blokkok tömbje (JSON), nem sima szöveg.
  // A SzovegMezoMegjelenito kezeli a renderelést és az entitás hivatkozások
  // koppintás eseményét.
  // @param {HTMLElement} body - A .pakli-kartya__body elem
  _bodyFeltoltese(body) {
    console.log('KategoriaKartya._bodyFeltoltese - KEZDÉS', {
      entitasId: this.entitas?.entitasId
    });

    const adatok = this.entitas.adatok ?? {};

    // --- LEÍRÁS ---
    if (adatok.szovegMezo) {
      // =============================================
      // ÚJ - Blokk tömb vagy legacy string kezelése
      // =============================================
      // Ha a szovegMezo már blokk tömb (array), azt adjuk a megjelenítőnek.
      // Ha még régi sima string (migrált adat), automatikusan becsomagolja.
      const blokkok = Array.isArray(adatok.szovegMezo)
        ? adatok.szovegMezo
        : [{
            id:       'legacy-blokk-1',
            tipus:    'szoveg',
            tartalom: adatok.szovegMezo,
            formatas: { felkover: false, dolt: false, meret: 'kozepes' }
          }];

      // SzovegMezoMegjelenito konténere
      const szovegKontener = document.createElement('div');
      szovegKontener.className = 'kategoria-kartya__szoveg-kontener';
      body.appendChild(szovegKontener);

      // Megjelenítő példányosítása
      // onEntitasKivalasztas: az entitás hivatkozás blokkon való koppintáskor
      // a Pakli.js onKivalasztas callbackjét hívjuk meg
      this.szovegMezoMegjelenito = new SzovegMezoMegjelenito(szovegKontener, {
        blokkok,
        onEntitasKivalasztas: (entitasId, entitasTipus) => {
          console.log('KategoriaKartya - entitás hivatkozás koppintva', {
            entitasId,
            entitasTipus
          });
          // A Pakli.js onKivalasztas callbackjét hívjuk az új entitással
          if (typeof this.onKivalasztas === 'function') {
            this.onKivalasztas(entitasId, entitasTipus);
          }
        }
      });
    }

    console.log('KategoriaKartya._bodyFeltoltese - VÉGE', {
      entitasId:  this.entitas?.entitasId,
      vanSzoveg:  !!adatok.szovegMezo
    });
  }

  // =============================================
  // ÚJ - MEGSEMMISÍTÉS
  // =============================================
  // A Kartya.js destroy() metódusát bővíti – felszabadítja a megjelenítőt.
  // A Pakli.js hívja meg, amikor a kártyát eltávolítja a DOM-ból.
  destroy() {
    console.log('KategoriaKartya.destroy - KEZDÉS', {
      entitasId: this.entitas?.entitasId
    });

    if (this.szovegMezoMegjelenito) {
      this.szovegMezoMegjelenito.destroy();
      this.szovegMezoMegjelenito = null;
    }

    // Szülő destroy() meghívása (eseményfigyelők eltávolítása stb.)
    super.destroy?.();

    console.log('KategoriaKartya.destroy - VÉGE', {
      entitasId: this.entitas?.entitasId
    });
  }

  // ----- HAMBURGER MENÜ OPCIÓK -----
  // Változatlan
  _hamburgerOpciok(entitas) {
    console.log('KategoriaKartya._hamburgerOpciok - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    const opciok = [
      {
        ikon:    '✏️',
        felirat: 'Szerkesztés',
        akcio: () => {
          console.log('KategoriaKartya - szerkesztés', { entitasId: entitas?.entitasId });
        }
      },
      {
        ikon:    '🌿',
        felirat: 'Gyerek kategória hozzáadása',
        akcio: () => {
          console.log('KategoriaKartya - gyerek hozzáadása', { entitasId: entitas?.entitasId });
        }
      },
      {
        ikon:      '🗑️',
        felirat:   'Törlés',
        elvalaszto: true,
        akcio: () => {
          console.log('KategoriaKartya - törlés', { entitasId: entitas?.entitasId });
        }
      }
    ];

    console.log('KategoriaKartya._hamburgerOpciok - VÉGE', {
      opciokSzama: opciok.length
    });

    return opciok;
  }
}

// --- EXPORTÁLÁS ---
export default KategoriaKartya;