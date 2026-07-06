// frontend/js/components/kartya/EgyezmenyKartya.js

// --- IMPORTOK ---
import Kartya from './Kartya.js';

// =============================================
// ÚJ - SzovegMezoMegjelenito importja
// =============================================
import SzovegMezoMegjelenito from '../szoveg/SzovegMezoMegjelenito.js';

// --- EGYEZMÉNY KÁRTYA OSZTÁLY ---
// Felelőssége:
// 1. Örökli a Kartya.js teljes váz logikáját (hamburger, koppintás, állapot)
// 2. Feltölti a fejlécet: javaslatTípus, támogatottsági arány, bizonyossági mutató
// 3. Feltölti a body-t (csak kiválasztott kártyán): részvételi arány + indoklás blokkok
// 4. Megadja a hamburger menü opcióit
class EgyezmenyKartya extends Kartya {

  // ----- KONSTRUKTOR -----
  constructor(entitas, kivalasztott, onKivalasztas) {
    console.log('EgyezmenyKartya.constructor - KEZDÉS', {
      entitasId:     entitas?.entitasId,
      javaslatTipus: entitas?.adatok?.javaslatTipus
    });

    super(entitas, kivalasztott, onKivalasztas, (entitas) => this._hamburgerOpciok(entitas));

    // =============================================
    // ÚJ - Megjelenítő példány referencia
    // =============================================
    this.szovegMezoMegjelenito = null;

    console.log('EgyezmenyKartya.constructor - VÉGE', { entitasId: entitas?.entitasId });
  }

  // ----- FEJLÉC FELTÖLTÉSE -----
  // Változatlan
  _fejlecFeltoltese(fejlecTartalom) {
    console.log('EgyezmenyKartya._fejlecFeltoltese - KEZDÉS', {
      entitasId: this.entitas?.entitasId
    });

    const adatok = this.entitas.adatok ?? {};

    const jelzoElem = document.createElement('span');
    jelzoElem.className   = 'egyezmeny-kartya__jelzo';
    jelzoElem.textContent = '🤝';
    jelzoElem.setAttribute('aria-hidden', 'true');
    fejlecTartalom.appendChild(jelzoElem);

    const tipusElem = document.createElement('span');
    tipusElem.className   = 'egyezmeny-kartya__tipus';
    tipusElem.textContent = adatok.javaslatTipus ?? '(típus nélkül)';
    fejlecTartalom.appendChild(tipusElem);

    const mutatokSor = document.createElement('div');
    mutatokSor.className = 'egyezmeny-kartya__mutatok-sor';

    if (adatok.tamogatotsagiArany !== null && adatok.tamogatotsagiArany !== undefined) {
      const taElem = document.createElement('span');
      taElem.className = 'egyezmeny-kartya__mutato egyezmeny-kartya__mutato--tamogatottsagi';
      taElem.setAttribute('aria-label', `Támogatottsági arány: ${adatok.tamogatotsagiArany}%`);
      taElem.textContent = `✅ ${adatok.tamogatotsagiArany}%`;
      mutatokSor.appendChild(taElem);
    }

    if (adatok.bizonyossagiMutato !== null && adatok.bizonyossagiMutato !== undefined) {
      const bmElem = document.createElement('span');
      bmElem.className = 'egyezmeny-kartya__mutato egyezmeny-kartya__mutato--bizonyossagi';
      bmElem.setAttribute('aria-label', `Bizonyossági mutató: ${adatok.bizonyossagiMutato}`);
      bmElem.textContent = `🎯 ${adatok.bizonyossagiMutato}`;
      mutatokSor.appendChild(bmElem);
    }

    fejlecTartalom.appendChild(mutatokSor);

    console.log('EgyezmenyKartya._fejlecFeltoltese - VÉGE', {
      entitasId:     this.entitas?.entitasId,
      javaslatTipus: adatok.javaslatTipus
    });
  }

  // ----- BODY FELTÖLTÉSE -----
  // =============================================
  // MÓDOSÍTVA - indoklás blokk alapú renderelés
  // =============================================
  _bodyFeltoltese(body) {
    console.log('EgyezmenyKartya._bodyFeltoltese - KEZDÉS', {
      entitasId: this.entitas?.entitasId
    });

    const adatok = this.entitas.adatok ?? {};

    // --- RÉSZVÉTELI ARÁNY ---
    // Változatlan
    if (adatok.reszveteliArany !== null && adatok.reszveteliArany !== undefined) {
      const raKontener = document.createElement('div');
      raKontener.className = 'egyezmeny-kartya__reszletek-sor';

      const raCimke = document.createElement('span');
      raCimke.className   = 'egyezmeny-kartya__reszlet-cimke';
      raCimke.textContent = 'Részvételi arány:';

      const raErtek = document.createElement('span');
      raErtek.className   = 'egyezmeny-kartya__reszlet-ertek';
      raErtek.textContent = `👥 ${adatok.reszveteliArany}%`;

      raKontener.appendChild(raCimke);
      raKontener.appendChild(raErtek);
      body.appendChild(raKontener);
    }

    // --- INDOKLÁS ---
    // =============================================
    // ÚJ - textContent helyett SzovegMezoMegjelenito
    // =============================================
    // Az egyezmény indoklása a lezárt javaslat szövegmezőjének pillanatképe,
    // ezért ugyanolyan blokk alapú renderelés kell, mint a JavaslatKártyánál.
    if (adatok.szovegMezo) {
      // A formátum felismerését (blokk tömb, több oldalas objektum vagy
      // legacy string) a SzovegMezoMegjelenito végzi — nyersen adjuk át
      const blokkok = adatok.szovegMezo;

      const indoklasKontener = document.createElement('div');
      indoklasKontener.className = 'egyezmeny-kartya__indoklas-kontener';
      body.appendChild(indoklasKontener);

      this.szovegMezoMegjelenito = new SzovegMezoMegjelenito(indoklasKontener, {
        blokkok,
        onEntitasKivalasztas: (entitasId, entitasTipus) => {
          console.log('EgyezmenyKartya - entitás hivatkozás koppintva', {
            entitasId,
            entitasTipus
          });
          if (typeof this.onKivalasztas === 'function') {
            this.onKivalasztas(entitasId, entitasTipus);
          }
        }
      });
    }

    console.log('EgyezmenyKartya._bodyFeltoltese - VÉGE', {
      entitasId:          this.entitas?.entitasId,
      vanReszveteliArany: adatok.reszveteliArany !== null && adatok.reszveteliArany !== undefined,
      vanSzoveg:          !!adatok.szovegMezo
    });
  }

  // =============================================
  // ÚJ - MEGSEMMISÍTÉS
  // =============================================
  destroy() {
    console.log('EgyezmenyKartya.destroy - KEZDÉS', {
      entitasId: this.entitas?.entitasId
    });

    if (this.szovegMezoMegjelenito) {
      this.szovegMezoMegjelenito.destroy();
      this.szovegMezoMegjelenito = null;
    }

    super.destroy?.();

    console.log('EgyezmenyKartya.destroy - VÉGE', {
      entitasId: this.entitas?.entitasId
    });
  }

  // ----- HAMBURGER MENÜ OPCIÓK -----
  // Változatlan
  _hamburgerOpciok(entitas) {
    console.log('EgyezmenyKartya._hamburgerOpciok - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    const opciok = [
      {
        ikon:    '👁️',
        felirat: 'Részletek megtekintése',
        akcio: () => {
          console.log('EgyezmenyKartya - részletek', { entitasId: entitas?.entitasId });
        }
      },
      {
        ikon:    '📜',
        felirat: 'Előzmény megtekintése',
        akcio: () => {
          console.log('EgyezmenyKartya - előzmény', { entitasId: entitas?.entitasId });
        }
      }
    ];

    console.log('EgyezmenyKartya._hamburgerOpciok - VÉGE', {
      opciokSzama: opciok.length
    });

    return opciok;
  }
}

// --- EXPORTÁLÁS ---
export default EgyezmenyKartya;