// frontend/js/components/kartya/TartalomTipusKartya.js

// --- IMPORTOK ---
import Kartya from './Kartya.js';

// =============================================
// ÚJ - SzovegMezoMegjelenito importja
// =============================================
import SzovegMezoMegjelenito from '../szoveg/SzovegMezoMegjelenito.js';

// --- TARTALOM TÍPUS KÁRTYA OSZTÁLY ---
// Felelőssége:
// 1. Örökli a Kartya.js teljes váz logikáját (hamburger, koppintás, állapot)
// 2. Feltölti a fejlécet: ikon, név, saját tudatpont, hierarchikus tudatpont
// 3. Feltölti a body-t (csak kiválasztott kártyán): leírás blokkok megjelenítése
// 4. Megadja a hamburger menü opcióit
class TartalomTipusKartya extends Kartya {

  // ----- KONSTRUKTOR -----
  constructor(entitas, kivalasztott, onKivalasztas) {
    console.log('TartalomTipusKartya.constructor - KEZDÉS', {
      entitasId: entitas?.entitasId,
      nev:       entitas?.adatok?.nev
    });

    super(entitas, kivalasztott, onKivalasztas, (entitas) => this._hamburgerOpciok(entitas));

    // =============================================
    // ÚJ - Megjelenítő példány referencia
    // =============================================
    this.szovegMezoMegjelenito = null;

    console.log('TartalomTipusKartya.constructor - VÉGE', { entitasId: entitas?.entitasId });
  }

  // ----- IKON MEGJELENÍTÉSE -----
  // Változatlan
  _ikonMegjelenites(kontener, ikonErtek, cssAlapOsztaly) {
    console.log('TartalomTipusKartya._ikonMegjelenites - KEZDÉS', { ikonErtek });

    if (!ikonErtek) {
      console.log('TartalomTipusKartya._ikonMegjelenites - VÉGE: nincs ikon érték');
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

    console.log('TartalomTipusKartya._ikonMegjelenites - VÉGE', { ikonErtek });
  }

  // ----- FEJLÉC FELTÖLTÉSE -----
  // Változatlan
  _fejlecFeltoltese(fejlecTartalom) {
    console.log('TartalomTipusKartya._fejlecFeltoltese - KEZDÉS', {
      entitasId: this.entitas?.entitasId
    });

    const adatok = this.entitas.adatok ?? {};

    const nevElem = document.createElement('span');
    nevElem.className   = 'tartalom-tipus-kartya__nev';
    nevElem.textContent = adatok.nev ?? '(név nélkül)';
    fejlecTartalom.appendChild(nevElem);

    const tudatpontSor = document.createElement('div');
    tudatpontSor.className = 'tartalom-tipus-kartya__tudatpont-sor';

    const sajatTudatpontElem = document.createElement('span');
    sajatTudatpontElem.className = 'tartalom-tipus-kartya__tudatpont tartalom-tipus-kartya__tudatpont--sajat';
    sajatTudatpontElem.setAttribute('aria-label', 'Saját tudatpont');
    sajatTudatpontElem.textContent = `🌿 ${(this.entitas.sajatTudatpont ?? 0).toLocaleString()}`;
    tudatpontSor.appendChild(sajatTudatpontElem);

    const hierarchikusTudatpontElem = document.createElement('span');
    hierarchikusTudatpontElem.className = 'tartalom-tipus-kartya__tudatpont tartalom-tipus-kartya__tudatpont--hierarchikus';
    hierarchikusTudatpontElem.setAttribute('aria-label', 'Hierarchikus tudatpont');
    hierarchikusTudatpontElem.textContent = `🌲 ${(this.entitas.hierarchikusOsszesPont ?? 0).toLocaleString()}`;
    tudatpontSor.appendChild(hierarchikusTudatpontElem);

    fejlecTartalom.appendChild(tudatpontSor);

    this._ikonMegjelenites(fejlecTartalom, adatok.ikon, 'tartalom-tipus-kartya');

    console.log('TartalomTipusKartya._fejlecFeltoltese - VÉGE', {
      entitasId: this.entitas?.entitasId,
      nev:       adatok.nev
    });
  }

  // ----- BODY FELTÖLTÉSE -----
  // =============================================
  // MÓDOSÍTVA - blokk alapú szöveg renderelés
  // =============================================
  _bodyFeltoltese(body) {
    console.log('TartalomTipusKartya._bodyFeltoltese - KEZDÉS', {
      entitasId: this.entitas?.entitasId
    });

    const adatok = this.entitas.adatok ?? {};

    if (adatok.szovegMezo) {
      // Legacy string → blokk tömb automatikus becsomagolás
      const blokkok = Array.isArray(adatok.szovegMezo)
        ? adatok.szovegMezo
        : [{
            id:       'legacy-blokk-1',
            tipus:    'szoveg',
            tartalom: adatok.szovegMezo,
            formatas: { felkover: false, dolt: false, meret: 'kozepes' }
          }];

      const szovegKontener = document.createElement('div');
      szovegKontener.className = 'tartalom-tipus-kartya__szoveg-kontener';
      body.appendChild(szovegKontener);

      this.szovegMezoMegjelenito = new SzovegMezoMegjelenito(szovegKontener, {
        blokkok,
        onEntitasKivalasztas: (entitasId, entitasTipus) => {
          console.log('TartalomTipusKartya - entitás hivatkozás koppintva', {
            entitasId,
            entitasTipus
          });
          if (typeof this.onKivalasztas === 'function') {
            this.onKivalasztas(entitasId, entitasTipus);
          }
        }
      });
    }

    console.log('TartalomTipusKartya._bodyFeltoltese - VÉGE', {
      entitasId: this.entitas?.entitasId,
      vanSzoveg: !!adatok.szovegMezo
    });
  }

  // =============================================
  // ÚJ - MEGSEMMISÍTÉS
  // =============================================
  destroy() {
    console.log('TartalomTipusKartya.destroy - KEZDÉS', {
      entitasId: this.entitas?.entitasId
    });

    if (this.szovegMezoMegjelenito) {
      this.szovegMezoMegjelenito.destroy();
      this.szovegMezoMegjelenito = null;
    }

    super.destroy?.();

    console.log('TartalomTipusKartya.destroy - VÉGE', {
      entitasId: this.entitas?.entitasId
    });
  }

  // ----- HAMBURGER MENÜ OPCIÓK -----
  // Változatlan
  _hamburgerOpciok(entitas) {
    console.log('TartalomTipusKartya._hamburgerOpciok - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    const opciok = [
      {
        ikon:    '✏️',
        felirat: 'Szerkesztés',
        akcio: () => {
          console.log('TartalomTipusKartya - szerkesztés', { entitasId: entitas?.entitasId });
        }
      },
      {
        ikon:    '🌿',
        felirat: 'Gyerek tartalom típus hozzáadása',
        akcio: () => {
          console.log('TartalomTipusKartya - gyerek hozzáadása', { entitasId: entitas?.entitasId });
        }
      },
      {
        ikon:       '🗑️',
        felirat:    'Törlés',
        elvalaszto: true,
        akcio: () => {
          console.log('TartalomTipusKartya - törlés', { entitasId: entitas?.entitasId });
        }
      }
    ];

    console.log('TartalomTipusKartya._hamburgerOpciok - VÉGE', {
      opciokSzama: opciok.length
    });

    return opciok;
  }
}

// --- EXPORTÁLÁS ---
export default TartalomTipusKartya;