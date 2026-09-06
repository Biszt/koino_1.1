// frontend/js/components/modals/ErtekEloszlasModal.js

// ===== IMPORTOK =====
import Modal from './Modal.js';
import { apiGet } from '../../utils/apiHelper.js';
import { tokenLekerese } from '../../utils/authHelper.js';
import { masodpercFelirat } from '../../utils/idoFormazo.js';

// A beágyazott (második szintű) modal saját konténere – ugyanaz, mint a
// HozzajarulokModal-é. Ez rendben van: a Részletek modalból egyszerre csak
// EGY al-modal van nyitva, ezért nem ütköznek.
const ALMODAL_KONTENER_ID = 'almodal-kontener';

// ===== ÉRTÉK-ELOSZLÁS MODAL OSZTÁLY =====
// Felelősség: egy gondolat EGY küszöbének érték-javaslat eloszlását mutatja
// (melyik értékből hány javaslat van), vízszintes sávokkal.
// Használják: a ReszletekModal küszöbérték-sorainak „részletek" gombjai.
class ErtekEloszlasModal {

  // ===== KONSTRUKTOR =====
  // @param {Object} beallitasok
  // @param {string} beallitasok.entitasId    - az entitás azonosítója
  // @param {string} beallitasok.entitasTipus - 'Gondolat' | 'Kategoria' | 'GondolatTipus'
  // @param {string} beallitasok.mezo         - melyik küszöb (pl. 'minimumDontesiIdo')
  // @param {string} beallitasok.cimke        - emberi felirat (pl. 'Min. döntési idő')
  // @param {string} beallitasok.formatum     - 'ido' | 'szazalek' | 'szam' (érték-formázás)
  // @param {string} beallitasok.token        - JWT token (opcionális)
  constructor(beallitasok = {}) {
    console.log('ErtekEloszlasModal.constructor - KEZDÉS', {
      entitasId: beallitasok?.entitasId, entitasTipus: beallitasok?.entitasTipus, mezo: beallitasok?.mezo
    });

    this.entitasId    = beallitasok.entitasId    ?? null;
    this.entitasTipus = beallitasok.entitasTipus ?? 'Gondolat';
    this.mezo       = beallitasok.mezo       ?? null;
    this.cimke      = beallitasok.cimke      ?? 'Eloszlás';
    this.formatum   = beallitasok.formatum   ?? 'szam';
    this.token      = beallitasok.token      ?? tokenLekerese();

    this.modal = null;

    console.log('ErtekEloszlasModal.constructor - VÉGE');
  }

  // ===== INICIALIZÁLÁS =====
  async init() {
    console.log('ErtekEloszlasModal.init - KEZDÉS');

    this._kontenerBiztositasa();

    const tartalomHtml = await this._templateBetoltese();
    if (!tartalomHtml) return;

    this.modal = new Modal(ALMODAL_KONTENER_ID, {
      cim:      `Eloszlás – ${this.cimke}`,
      tartalom: tartalomHtml,
      meret:    'alap',
      gombok: [
        {
          felirat:   'Bezárás',
          tipus:     'masodlagos',
          azonosito: 'ertek-eloszlas-bezar-gomb',
          akcio:     () => this.modal.bezaras()
        }
      ],
      onBezaras: () => {
        const kont = document.getElementById(ALMODAL_KONTENER_ID);
        if (kont) kont.innerHTML = '';
        console.log('ErtekEloszlasModal - modal bezárva');
      }
    });

    await this.modal.init();

    console.log('ErtekEloszlasModal.init - VÉGE');
  }

  // ===== BEÁGYAZOTT KONTÉNER BIZTOSÍTÁSA =====
  _kontenerBiztositasa() {
    let kont = document.getElementById(ALMODAL_KONTENER_ID);
    if (!kont) {
      kont = document.createElement('div');
      kont.id = ALMODAL_KONTENER_ID;
      document.body.appendChild(kont);
    }
  }

  // ===== TEMPLATE BETÖLTÉSE =====
  async _templateBetoltese() {
    try {
      const valasz = await fetch('./html/components/modals/ertekEloszlasModal.html');
      if (!valasz.ok) {
        console.error('ErtekEloszlasModal._templateBetoltese - HIBA', { statusz: valasz.status });
        return null;
      }
      return await valasz.text();
    } catch (hiba) {
      console.error('ErtekEloszlasModal._templateBetoltese - kivétel', hiba.message);
      return null;
    }
  }

  // ===== MEGNYITÁS =====
  async megnyitas() {
    this.modal?.megnyitas();
    await this._adatokBetoltese();
  }

  // ===== BEZÁRÁS =====
  bezaras() {
    this.modal?.bezaras();
  }

  // ===== ADATOK BETÖLTÉSE =====
  async _adatokBetoltese() {
    console.log('ErtekEloszlasModal._adatokBetoltese - KEZDÉS', {
      entitasId: this.entitasId, entitasTipus: this.entitasTipus, mezo: this.mezo
    });

    this.modal.betoltesBeallitasa(true);
    try {
      const valasz = await apiGet(`ertekJavaslat/eloszlas/${this.entitasTipus}/${this.entitasId}`, this.token);
      this.modal.betoltesBeallitasa(false);

      const eloszlas = valasz?.eloszlasok?.[this.mezo] ?? [];
      const osszes   = valasz?.osszesJavaslat ?? 0;
      this._render(eloszlas, osszes);

      console.log('ErtekEloszlasModal._adatokBetoltese - VÉGE', { sorok: eloszlas.length });
    } catch (hiba) {
      console.error('ErtekEloszlasModal._adatokBetoltese - HIBA', hiba.message);
      this.modal.hibaBeallitasa(hiba.message ?? 'Az eloszlás betöltése sikertelen.');
    }
  }

  // ===== RENDERELÉS =====
  _render(eloszlas, osszes) {
    const osszegzes = document.getElementById('ertek-eloszlas-osszegzes');
    if (osszegzes) osszegzes.textContent = `Összesen ${osszes} érték javaslat`;

    const lista = document.getElementById('ertek-eloszlas-lista');
    const ures  = document.getElementById('ertek-eloszlas-ures');
    if (!lista) return;
    lista.innerHTML = '';

    if (!eloszlas || eloszlas.length === 0) {
      if (ures) ures.hidden = false;
      return;
    }

    // A sávok arányosítása a legnagyobb darabszámhoz
    const maxDarab = Math.max(...eloszlas.map(e => e.darab), 1);

    eloszlas.forEach(({ ertek, darab }) => {
      const li = document.createElement('li');
      li.className = 'ertek-eloszlas-modal__elem';

      const ertekElem = document.createElement('span');
      ertekElem.className   = 'ertek-eloszlas-modal__ertek';
      ertekElem.textContent = this._ertekFelirat(ertek);

      const sav = document.createElement('span');
      sav.className = 'ertek-eloszlas-modal__sav';
      const kitolt = document.createElement('span');
      kitolt.className   = 'ertek-eloszlas-modal__sav-kitolt';
      kitolt.style.width = `${Math.round((darab / maxDarab) * 100)}%`;
      sav.appendChild(kitolt);

      const darabElem = document.createElement('span');
      darabElem.className   = 'ertek-eloszlas-modal__darab';
      darabElem.textContent = `${darab} db`;

      li.appendChild(ertekElem);
      li.appendChild(sav);
      li.appendChild(darabElem);
      lista.appendChild(li);
    });
  }

  // ===== ÉRTÉK FELIRAT (a formátum szerint) =====
  _ertekFelirat(ertek) {
    if (this.formatum === 'ido')      return masodpercFelirat(ertek);
    if (this.formatum === 'szazalek') return `${ertek}%`;
    return `${ertek}`;
  }
}

// ===== EXPORTÁLÁS =====
export default ErtekEloszlasModal;
