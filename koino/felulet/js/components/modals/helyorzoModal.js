// koino/felulet/js/components/modals/helyorzoModal.js

// Felelősség: HELYETTESÍTENI a prototípus modáljait, amíg át nem jönnek (Szakasz 5.5).
//
// ===== ⭐ MIÉRT VAN SZÜKSÉG RÁ, ÉS MIÉRT ÍGY =====
//
// A kártya-osztályok mélyen összefonódnak a modálokkal: a `Kartya.js` **hét** modált
// importál, a `GondolatKartya` hatot, az `EgyezmenyKartya` ötöt, a `JavaslatKartya` négyet.
// Vagyis a „kártyák (5.3) → modálok (5.5)" sorrend a valóságban nem választható szét.
//
// ⭐ A megoldás: a kártyák **változatlanul** jönnek át a prototípusból — az import-soraik
// bájtra ugyanazok —, és a modal-fájlok helyén EGYELŐRE ez a helyőrző áll. Így:
//
//   · a kártya **pontosan úgy néz ki**, ahogy Csaba kérte („pontosan azt a felületet
//     szeretném látni, mint a koino_1.1-ben");
//   · a menüpontok nem omlanak össze, hanem **megmondják, hogy még nem készültek el**;
//   · és amikor egy valódi modal átjön, **csak a fájlját kell kicserélni** — a kártyákhoz
//     nem kell hozzányúlni.
//
// ⚠️ EZ NEM „RÖGTÖNZÖTT FRONTEND". A minta a prototípusból való: a `FejlesztesreVar.js`
// pontosan ezt csinálja azoknál a menüpontoknál, amik a tervben szerepelnek, de még nem
// készültek el. Itt ugyanaz a fogás, csak modal-osztály alakban.
//
// Használják: a `modals/` mappa 13 név-fájlja (`GondolatModal.js`, `TudatpontModal.js`, …).

import Modal from './Modal.js';

/**
 * Egy modal, ami annyit mond: „ez még nem készült el".
 *
 * ⭐ A HÍVÁSI ALAKJA UGYANAZ, mint a valódi modáloké — a kártyák mind így használják:
 *
 *     const m = new XModal(this.modalKontenerAzon, { … });
 *     await m.init();
 *     m.megnyitas();
 *
 * Ezért fogadunk el bármilyen beállítást, és ezért van `init()` és `megnyitas()`.
 */
export class HelyorzoModal {

  /**
   * @param {string} kontenerAzonosito - a kártya saját modal-konténere
   * @param {Object} [beallitasok] - a valódi modal beállításai; itt csak a nevéhez kell
   */
  constructor(kontenerAzonosito = 'modal-kontener', beallitasok = {}) {
    console.log('HelyorzoModal.constructor - KEZDÉS', { nev: beallitasok?.helyorzoNev });

    this.kontenerAzonosito = kontenerAzonosito;
    this.nev = beallitasok?.helyorzoNev ?? 'Ez a nézet';
    this.modal = null;

    console.log('HelyorzoModal.constructor - VÉGE', { nev: this.nev });
  }

  /** A valódi modálok is aszinkron `init()`-tel indulnak — ezért van. */
  async init() {
    console.log('HelyorzoModal.init - KEZDÉS', { nev: this.nev });

    this.modal = new Modal(this.kontenerAzonosito, {
      cim: '🚧 Még nem készült el',
      meret: 'szuk',
      tartalom: `
        <div class="fejlesztesre-var">
          <p class="fejlesztesre-var__funkcio">${this.nev}</p>
          <p class="fejlesztesre-var__szoveg">
            Ez a nézet a Szakasz 5.5-ben jön át a prototípusból.
            A kártya és a menü már a helyén van.
          </p>
        </div>
      `,
      gombok: [{
        felirat: 'Rendben',
        tipus: 'elsodleges',
        azonosito: 'helyorzo-rendben-gomb',
        akcio: () => this.modal.bezaras()
      }]
    });

    await this.modal.init();
    console.log('HelyorzoModal.init - VÉGE', { nev: this.nev });
    return this;
  }

  /** Megnyitás — ha az `init()` elmaradt volna, itt pótoljuk. */
  async megnyitas() {
    console.log('HelyorzoModal.megnyitas - KEZDÉS', { nev: this.nev });
    if (!this.modal) await this.init();
    this.modal.megnyitas();
    console.log('HelyorzoModal.megnyitas - VÉGE', { nev: this.nev });
  }

  /** Hogy a hívó `bezaras()`-a se szálljon el. */
  bezaras() {
    if (this.modal) this.modal.bezaras();
  }
}

/**
 * Egy NEVESÍTETT helyőrző-osztályt gyárt.
 *
 * ⭐ Ettől tudja minden modal-fájl a saját nevét megmondani, miközben egyetlen
 * megvalósítás van mögötte.
 *
 * @param {string} nev - ami a felhasználónak megjelenik
 */
export function helyorzoModal(nev) {
  return class extends HelyorzoModal {
    constructor(kontenerAzonosito, beallitasok = {}) {
      super(kontenerAzonosito, { ...beallitasok, helyorzoNev: nev });
    }
  };
}

export default HelyorzoModal;
