// frontend/js/components/modals/SzerepValasztoModal.js

// ===== IMPORTOK =====
import Modal from './Modal.js';

// ===== BEÁGYAZOTT KONTÉNER ID =====
// Külön konténer (nem a 'modal-kontener'), hogy a szerep-választó a TudatpontModal
// FÖLÖTT nyílhasson meg anélkül, hogy felülírná azt (a Modal innerHTML-t cserél).
// Ugyanaz a minta, mint a HozzajarulokModal 'almodal-kontener'-e.
const SZEREP_KONTENER_ID = 'szerepvalaszto-kontener';

// ===== A PASSZÍV/AKTÍV SZEREP LEÍRÁSA (KÖZÖS SZÖVEG) =====
// Egy helyen tartjuk, hogy mindenhol ugyanazt a magyarázatot lássa a eember.
export const SZEREP_LEIRAS_HTML = `
  <ul class="szerepvalaszto__leiras">
    <li><strong>Passzív (figyelő):</strong> csak figyeled az entitást és prioritást
      jelzel a tudatpontoddal. <em>Nem</em> számítasz a szavazások részvételi arányába,
      így a passzív figyelők nem lassítják és nem akadályozzák a döntéseket.</li>
    <li><strong>Aktív (résztvevő):</strong> részt veszel a döntéshozatalban —
      beleszámítasz a részvételi arányba. (Ha szavazol, érték javaslatot adsz vagy
      javaslatot teszel, amúgy is automatikusan aktívvá válsz.)</li>
  </ul>
  <p class="szerepvalaszto__megjegyzes">
    Ezt bármikor módosíthatod később a kártya menüjében a „Részvételi beállítások" pontnál.
  </p>
`;

// ===== SZEREP VÁLASZTÓ MODAL OSZTÁLY =====
// Felelősség: egyetlen entitásra bekéri a részvételi szerepet (passzív/aktív).
//  - Alapból 'passziv' van kiválasztva (a tulajdonos döntése: passzív az alapértelmezett).
//  - A valaszt() egy Promise-t ad vissza: 'passziv' | 'aktiv' | null (ha megszakították).
// Használják: TudatpontModal — az ELSŐ allokáláskor a fő entitásra, és a felmenők
// opcionális kitöltésekor felmenőnként (a tulajdonos döntése: „annyiszor nyíljon fel a
// modal, ahány entitásra kerül allokáció").
class SzerepValasztoModal {

  // ===== KONSTRUKTOR =====
  // @param {string} entitasNev - a megjelenítendő entitás neve (a fejlécben/szövegben)
  constructor(entitasNev = '') {
    console.log('SzerepValasztoModal.constructor - KEZDÉS', { entitasNev });
    this.entitasNev = entitasNev;
    this.modal = null;
    console.log('SzerepValasztoModal.constructor - VÉGE');
  }

  // ===== BEÁGYAZOTT KONTÉNER BIZTOSÍTÁSA =====
  // Ha még nincs, létrehozza a body-hoz fűzött szerep-választó konténert.
  _kontenerBiztositasa() {
    let kont = document.getElementById(SZEREP_KONTENER_ID);
    if (!kont) {
      kont = document.createElement('div');
      kont.id = SZEREP_KONTENER_ID;
      document.body.appendChild(kont);
      console.log('SzerepValasztoModal - szerep-választó konténer létrehozva');
    }
  }

  // ===== VÁLASZTÁS (megnyitás + Promise) =====
  // Megnyitja a szerep-választót, és a eember döntésével oldódik fel.
  // @returns {Promise<'passziv'|'aktiv'|null>} a választott szerep, vagy null ha megszakították
  async valaszt() {
    console.log('SzerepValasztoModal.valaszt - KEZDÉS', { entitasNev: this.entitasNev });

    this._kontenerBiztositasa();

    // A modal törzse: entitás megnevezése + rádiógombok (passzív előre kiválasztva) + leírás
    const tartalom = `
      <div class="szerepvalaszto">
        <p class="szerepvalaszto__entitas" id="szerepvalaszto-entitas-nev"></p>
        <p class="szerepvalaszto__kerdes">Milyen szerepben szeretnél részt venni ezen az entitáson?</p>

        <label class="szerepvalaszto__opcio">
          <input type="radio" name="szerep-valasztas" value="passziv" checked />
          <span>Passzív (figyelő) — alapértelmezett</span>
        </label>

        <label class="szerepvalaszto__opcio">
          <input type="radio" name="szerep-valasztas" value="aktiv" />
          <span>Aktív (résztvevő)</span>
        </label>

        ${SZEREP_LEIRAS_HTML}
      </div>
    `;

    return new Promise(async (resolve) => {
      // Csak egyszer oldjuk fel: a gombok és az onBezaras (ESC/overlay) is ugyanezt hívja.
      let feloldva = false;
      const feloldas = (ertek) => {
        if (feloldva) return;
        feloldva = true;
        resolve(ertek);
      };

      this.modal = new Modal(SZEREP_KONTENER_ID, {
        cim:      'Részvételi szerep',
        tartalom: tartalom,
        meret:    'alap',
        gombok: [
          {
            felirat:   'Rendben',
            tipus:     'elsodleges',
            azonosito: 'szerepvalaszto-ok-gomb',
            akcio: () => {
              const valasztott = document.querySelector('input[name="szerep-valasztas"]:checked')?.value ?? 'passziv';
              // FONTOS: ELŐBB feloldjuk a választott értékkel, CSAK UTÁNA zárunk.
              // A bezaras() az onBezaras-on át feloldas(null)-t hívna — ha az futna
              // előbb, a Promise null-lal (mégse) oldódna fel, és a mentés kimaradna.
              feloldas(valasztott);
              this.modal.bezaras();
            }
          },
          {
            felirat:   'Mégse',
            tipus:     'masodlagos',
            azonosito: 'szerepvalaszto-megse-gomb',
            akcio: () => {
              feloldas(null);
              this.modal.bezaras();
            }
          }
        ],
        // ESC-pel vagy overlay-re koppintva a választás megszakad (= null)
        onBezaras: () => feloldas(null)
      });

      await this.modal.init();

      // Entitás nevének beírása (ha van)
      const nevElem = document.getElementById('szerepvalaszto-entitas-nev');
      if (nevElem) {
        nevElem.textContent = this.entitasNev
          ? `Entitás: ${this.entitasNev}`
          : '';
      }

      this.modal.megnyitas();
      console.log('SzerepValasztoModal.valaszt - modal megnyitva');
    });
  }
}

// ===== EXPORTÁLÁS =====
export default SzerepValasztoModal;
