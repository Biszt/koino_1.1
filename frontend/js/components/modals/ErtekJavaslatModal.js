// frontend/js/components/modals/ErtekJavaslatModal.js

// ===== IMPORTOK =====
import Modal from './Modal.js';
import { apiGet, apiPost } from '../../utils/apiHelper.js';
import { tokenLekerese } from '../../utils/authHelper.js';
import { masodpercFelirat } from '../../utils/idoFormazo.js';
import {
  kuszobMezokHtml,
  kuszobMezokKitoltese,
  kuszobMezokOsszegyujtese,
  kuszobMezokValidalasa,
  KUSZOB_ALAPERTEKEK
} from './kuszobErtekMezok.js';

// A mezők egyedi id-előtagja ebben a modálban
const MEZO_PREFIX = 'ej';

// ===== KÜSZÖB ÉRTÉK JAVASLAT MODAL OSZTÁLY =====
// Felelősség: egy gondolat küszöbértékeire ad/módosít érték javaslatot az
//   e-ember. Megnyitáskor lekéri az aktuális (medián) értékeket és a saját
//   javaslatot, kitölti a mezőket, mentéskor POST-tal küldi a backendnek.
// A négy küszöb: támogatottsági %, részvételi arány %, min/max döntési idő.
// Használják: a Gondolat kártya „Küszöb érték javaslat” menüpontja.
// Megjegyzés: ma CSAK gondolatra működik (a backend érték-rendszer gondolat-
//   központú); a kategória/gondolattípus később, backend-bővítés után jön.
class ErtekJavaslatModal {

  // ===== KONSTRUKTOR =====
  // @param {string} kontenerAzonosito - a modal konténer div ID-ja
  // @param {Object} beallitasok
  // @param {string} beallitasok.entitasId    - az entitás azonosítója
  // @param {string} beallitasok.entitasTipus - 'Gondolat' | 'Kategoria' | 'GondolatTipus'
  // @param {string} beallitasok.token        - JWT token (opcionális)
  // @param {Function} beallitasok.onSiker    - sikeres mentés után hívódik meg
  constructor(kontenerAzonosito, beallitasok = {}) {
    console.log('ErtekJavaslatModal.constructor - KEZDÉS', {
      entitasId:    beallitasok?.entitasId,
      entitasTipus: beallitasok?.entitasTipus
    });

    this.kontenerAzonosito = kontenerAzonosito;
    this.entitasId         = beallitasok.entitasId ?? null;
    this.entitasTipus      = beallitasok.entitasTipus ?? 'Gondolat';
    this.token             = beallitasok.token ?? tokenLekerese();
    this.onSiker           = beallitasok.onSiker ?? null;

    this.modal = null;

    console.log('ErtekJavaslatModal.constructor - VÉGE', {
      entitasId: this.entitasId, entitasTipus: this.entitasTipus
    });
  }

  // ===== INICIALIZÁLÁS =====
  async init() {
    console.log('ErtekJavaslatModal.init - KEZDÉS');

    const tartalomHtml = await this._templateBetoltese();
    if (!tartalomHtml) return;

    this.modal = new Modal(this.kontenerAzonosito, {
      cim:      'Küszöb érték javaslat',
      tartalom: tartalomHtml,
      meret:    'alap',
      gombok: [
        {
          felirat:   'Mentés',
          tipus:     'elsodleges',
          azonosito: 'ertek-javaslat-mentes-gomb',
          akcio:     () => this._mentes()
        },
        {
          felirat:   'Mégse',
          tipus:     'masodlagos',
          azonosito: 'ertek-javaslat-megse-gomb',
          akcio:     () => this.modal.bezaras()
        }
      ],
      onBezaras: () => {
        console.log('ErtekJavaslatModal - modal bezárva');
      }
    });

    await this.modal.init();

    // A küszöbmezők beinjektálása a template konténerébe
    const mezokKontener = document.getElementById('ertek-javaslat-mezok-kontener');
    if (mezokKontener) {
      mezokKontener.innerHTML = kuszobMezokHtml(MEZO_PREFIX);
    }

    console.log('ErtekJavaslatModal.init - VÉGE');
  }

  // ===== TEMPLATE BETÖLTÉSE =====
  async _templateBetoltese() {
    console.log('ErtekJavaslatModal._templateBetoltese - KEZDÉS');
    try {
      const valasz = await fetch('./html/components/modals/ertekJavaslatModal.html');
      if (!valasz.ok) {
        console.error('ErtekJavaslatModal._templateBetoltese - HIBA', { statusz: valasz.status });
        return null;
      }
      return await valasz.text();
    } catch (hiba) {
      console.error('ErtekJavaslatModal._templateBetoltese - kivétel', hiba.message);
      return null;
    }
  }

  // ===== MEGNYITÁS =====
  // Megnyitja a modalt, majd betölti az aktuális + saját értékeket.
  async megnyitas() {
    console.log('ErtekJavaslatModal.megnyitas - KEZDÉS');

    this.modal?.megnyitas();
    await this._adatokBetoltese();

    console.log('ErtekJavaslatModal.megnyitas - VÉGE');
  }

  // ===== BEZÁRÁS =====
  bezaras() {
    this.modal?.bezaras();
  }

  // ===== ADATOK BETÖLTÉSE =====
  // Lekéri a /reszletek végpontról az aktuális (medián) értékeket és a saját
  // javaslatot. A mezőket a saját javaslattal töltjük ki, ha van; különben az
  // aktuális mediánnal, végső esetben az alapértékekkel.
  async _adatokBetoltese() {
    console.log('ErtekJavaslatModal._adatokBetoltese - KEZDÉS', {
      gondolatId: this.gondolatId
    });

    if (!this.entitasId) {
      this.modal.hibaBeallitasa('Hiányzó entitásazonosító – a küszöbértékek nem tölthetők be.');
      return;
    }

    this.modal.betoltesBeallitasa(true);

    try {
      const valasz = await apiGet(`ertekJavaslat/reszletek/${this.entitasTipus}/${this.entitasId}`, this.token);
      this.modal.betoltesBeallitasa(false);

      const aktualis = valasz?.aktualisErtekek ?? null;
      const sajat    = valasz?.eemberJavaslat  ?? null;

      // Aktuális (medián) összegzés kiírása
      this._aktualisKiirasa(aktualis);

      // A mezők kezdőértéke: saját javaslat → aktuális medián → alapérték
      const kezdoErtekek = sajat
        ? {
            javaslatElfogadasiKuszob: sajat.javaslatElfogadasiKuszob,
            reszveteliAranyKuszob:    sajat.reszveteliAranyKuszob,
            minimumDontesiIdo:        sajat.minimumDontesiIdo,
            maximumDontesiIdo:        sajat.maximumDontesiIdo
          }
        : aktualis
          ? {
              javaslatElfogadasiKuszob: aktualis.javaslatElfogadasiKuszob,
              reszveteliAranyKuszob:    aktualis.reszveteliAranyKuszob,
              minimumDontesiIdo:        aktualis.aktualMinimumDontesiIdo,
              maximumDontesiIdo:        aktualis.aktualMaximumDontesiIdo
            }
          : { ...KUSZOB_ALAPERTEKEK };

      kuszobMezokKitoltese(MEZO_PREFIX, kezdoErtekek);

      console.log('ErtekJavaslatModal._adatokBetoltese - VÉGE', {
        vanSajat: !!sajat
      });
    } catch (hiba) {
      console.error('ErtekJavaslatModal._adatokBetoltese - HIBA', hiba.message);
      this.modal.betoltesBeallitasa(false);
      // Ha nem sikerült a betöltés, legalább az alapértékekkel kitöltjük
      kuszobMezokKitoltese(MEZO_PREFIX, { ...KUSZOB_ALAPERTEKEK });
    }
  }

  // ===== AKTUÁLIS (MEDIÁN) ÉRTÉKEK KIÍRÁSA =====
  _aktualisKiirasa(aktualis) {
    const doboz = document.getElementById('ertek-javaslat-aktualis');
    if (!doboz) return;

    if (!aktualis) {
      doboz.textContent = 'Erről a gondolatról még nincs érték javaslat.';
      return;
    }

    doboz.innerHTML = `
      <span class="ertek-javaslat-modal__aktualis-cim">Jelenlegi közös érték (medián):</span>
      <ul class="ertek-javaslat-modal__aktualis-lista">
        <li>Támogatottsági küszöb: <strong>${aktualis.javaslatElfogadasiKuszob}%</strong></li>
        <li>Részvételi arány küszöb: <strong>${aktualis.reszveteliAranyKuszob}%</strong></li>
        <li>Min. döntési idő: <strong>${masodpercFelirat(aktualis.aktualMinimumDontesiIdo)}</strong></li>
        <li>Max. döntési idő: <strong>${masodpercFelirat(aktualis.aktualMaximumDontesiIdo)}</strong></li>
      </ul>
      <span class="ertek-javaslat-modal__aktualis-darab">${this._osszesDarab(aktualis)} érték javaslat alapján</span>
    `;
  }

  // ===== SEGÉD: ÖSSZES ÉRTÉK JAVASLAT SZÁMA =====
  // A backend kétféle mezőnéven adhatja (osszesJavaslat / osszesErtekJavaslat),
  // ezért mindkettőt kezeljük, hogy sose jelenjen meg „undefined”.
  _osszesDarab(aktualis) {
    return aktualis.osszesJavaslat ?? aktualis.osszesErtekJavaslat ?? 0;
  }

  // ===== MENTÉS =====
  async _mentes() {
    console.log('ErtekJavaslatModal._mentes - KEZDÉS', {
      entitasId: this.entitasId, entitasTipus: this.entitasTipus
    });

    // 1. Mezők visszaolvasása
    const ertekek = kuszobMezokOsszegyujtese(MEZO_PREFIX);

    // 2. Helyi validálás (a backend szabályaival azonos)
    const hibaUzenet = kuszobMezokValidalasa(ertekek);
    if (hibaUzenet) {
      this.modal.hibaBeallitasa(hibaUzenet);
      return;
    }

    this.modal.hibaTisztitasa();
    this.modal.betoltesBeallitasa(true);

    try {
      // 3. Küldés a backendnek
      await apiPost('ertekJavaslat', {
        entitasId:    this.entitasId,
        entitasTipus: this.entitasTipus,
        ...ertekek
      }, this.token);

      this.modal.betoltesBeallitasa(false);
      this.modal.bezaras();

      if (typeof this.onSiker === 'function') {
        this.onSiker();
      }

      console.log('ErtekJavaslatModal._mentes - VÉGE (sikeres)');
    } catch (hiba) {
      console.error('ErtekJavaslatModal._mentes - HIBA', hiba.message);
      this.modal.betoltesBeallitasa(false);
      this.modal.hibaBeallitasa(hiba.message ?? 'A küszöb érték javaslat mentése sikertelen.');
    }
  }
}

// ===== EXPORTÁLÁS =====
export default ErtekJavaslatModal;
