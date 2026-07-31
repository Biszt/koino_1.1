// frontend/js/components/modals/ReszveteliBeallitasokModal.js

// ===== IMPORTOK =====
import Modal from './Modal.js';
import { SZEREP_LEIRAS_HTML } from './SzerepValasztoModal.js'; // közös passzív/aktív leírás
import { apiGet, apiPut } from '../../utils/apiHelper.js';
import { tokenLekerese } from '../../utils/authHelper.js';

// ===== RÉSZVÉTELI BEÁLLÍTÁSOK MODAL =====
// Felelősség: egy entitáson a bejelentkezett eember RÉSZVÉTELI SZEREPÉNEK utólagos
// módosítása (passzív ↔ aktív). A pontokhoz NEM nyúl — csak a szerepet állítja.
//  1. Megnyitáskor betölti a jelenlegi szerepet (a rádiót arra állítja).
//  2. Mentéskor a PUT /api/tudatpont/szerep/:tipus/:id végpontot hívja.
// Használják: a kártya-hamburger közös „Részvételi beállítások" menüpontja.
// A .szerepvalaszto CSS-osztályokat használja (szerepValasztoModal.css).
class ReszveteliBeallitasokModal {

  // ===== KONSTRUKTOR =====
  // @param {string} kontenerAzonosito - a modal konténer div ID-ja
  // @param {Object} beallitasok
  // @param {Object} beallitasok.entitasAdatok - { entitasId, entitasTipus, adatok }
  // @param {string} beallitasok.token
  // @param {Function} beallitasok.onSiker - sikeres mentés után (pl. pakli frissítés)
  constructor(kontenerAzonosito, beallitasok = {}) {
    console.log('ReszveteliBeallitasokModal.constructor - KEZDÉS', {
      kontenerAzonosito,
      entitasId:    beallitasok?.entitasAdatok?.entitasId,
      entitasTipus: beallitasok?.entitasAdatok?.entitasTipus
    });

    this.kontenerAzonosito = kontenerAzonosito;
    this.token             = beallitasok.token ?? tokenLekerese();
    this.entitasAdatok     = beallitasok.entitasAdatok ?? null;
    this.onSiker           = beallitasok.onSiker        ?? null;

    this.entitasId    = this.entitasAdatok?.entitasId    ?? null;
    this.entitasTipus = this.entitasAdatok?.entitasTipus ?? null;

    this.modal = null;

    console.log('ReszveteliBeallitasokModal.constructor - VÉGE');
  }

  // ===== SEGÉD: ENTITÁS NEVE =====
  _entitasNev() {
    return this.entitasAdatok?.adatok?.cim
      ?? this.entitasAdatok?.adatok?.nev
      ?? '(névtelen entitás)';
  }

  // ===== INICIALIZÁLÁS =====
  async init() {
    console.log('ReszveteliBeallitasokModal.init - KEZDÉS');

    const tartalom = `
      <div class="szerepvalaszto">
        <p class="szerepvalaszto__entitas" id="reszvetel-entitas-nev"></p>
        <p class="szerepvalaszto__kerdes">Milyen szerepben veszel részt ezen az entitáson?</p>

        <label class="szerepvalaszto__opcio">
          <input type="radio" name="reszvetel-szerep" value="passziv" />
          <span>Passzív (figyelő)</span>
        </label>

        <label class="szerepvalaszto__opcio">
          <input type="radio" name="reszvetel-szerep" value="aktiv" />
          <span>Aktív (résztvevő)</span>
        </label>

        ${SZEREP_LEIRAS_HTML}
      </div>
    `;

    this.modal = new Modal(this.kontenerAzonosito, {
      cim:      'Részvételi beállítások',
      tartalom: tartalom,
      meret:    'alap',
      gombok: [
        {
          felirat:   'Mentés',
          tipus:     'elsodleges',
          azonosito: 'reszvetel-mentes-gomb',
          akcio:     () => this._mentes()
        },
        {
          felirat:   'Mégse',
          tipus:     'masodlagos',
          azonosito: 'reszvetel-megse-gomb',
          akcio:     () => this.modal.bezaras()
        }
      ]
    });

    await this.modal.init();

    console.log('ReszveteliBeallitasokModal.init - VÉGE');
  }

  // ===== MEGNYITÁS =====
  async megnyitas() {
    console.log('ReszveteliBeallitasokModal.megnyitas - KEZDÉS');

    this.modal?.megnyitas();

    const nevElem = document.getElementById('reszvetel-entitas-nev');
    if (nevElem) nevElem.textContent = `Entitás: ${this._entitasNev()}`;

    await this._aktualisSzerepBetoltese();

    console.log('ReszveteliBeallitasokModal.megnyitas - VÉGE');
  }

  // ===== BEZÁRÁS =====
  bezaras() {
    this.modal?.bezaras();
  }

  // ===== JELENLEGI SZEREP BETÖLTÉSE =====
  // Lekéri az allokációt, és a rádiót a jelenlegi szerepre állítja.
  async _aktualisSzerepBetoltese() {
    console.log('ReszveteliBeallitasokModal._aktualisSzerepBetoltese - KEZDÉS');

    this.modal.betoltesBeallitasa(true);

    try {
      const valasz = await apiGet(
        `tudatpont/entitas/${this.entitasTipus}/${this.entitasId}`,
        this.token
      );
      this.modal.betoltesBeallitasa(false);

      // eemberSzerep: 'passziv' | 'aktiv' | null. Ha null (nincs itt pontja — ritka,
      // mert a menüpont tudatpont-függő), alapból passzívra állunk.
      const szerep = valasz?.data?.eemberSzerep;
      const ertek  = (szerep === 'aktiv') ? 'aktiv' : 'passziv';

      const radio = document.querySelector(`input[name="reszvetel-szerep"][value="${ertek}"]`);
      if (radio) radio.checked = true;

      console.log('ReszveteliBeallitasokModal._aktualisSzerepBetoltese - VÉGE', { szerep, ertek });

    } catch (hiba) {
      console.error('ReszveteliBeallitasokModal._aktualisSzerepBetoltese - HIBA', hiba.message);
      this.modal.hibaBeallitasa(hiba.message ?? 'A jelenlegi szerep betöltése sikertelen.');
    }
  }

  // ===== MENTÉS =====
  async _mentes() {
    console.log('ReszveteliBeallitasokModal._mentes - KEZDÉS');

    const valasztott = document.querySelector('input[name="reszvetel-szerep"]:checked')?.value ?? 'passziv';

    this.modal.hibaTisztitasa();
    this.modal.betoltesBeallitasa(true);

    try {
      const eredmeny = await apiPut(
        `tudatpont/szerep/${this.entitasTipus}/${this.entitasId}`,
        { szerep: valasztott },
        this.token
      );

      this.modal.betoltesBeallitasa(false);
      this.modal.bezaras();

      if (typeof this.onSiker === 'function') {
        this.onSiker(eredmeny?.data);
      }

      console.log('ReszveteliBeallitasokModal._mentes - VÉGE: sikeres', { szerep: valasztott });

    } catch (hiba) {
      console.error('ReszveteliBeallitasokModal._mentes - HIBA', hiba.message);
      this.modal.hibaBeallitasa(hiba.message ?? 'A mentés sikertelen, kérjük próbáld újra.');
    }
  }
}

// ===== EXPORTÁLÁS =====
export default ReszveteliBeallitasokModal;
