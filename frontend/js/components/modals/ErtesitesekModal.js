// frontend/js/components/modals/ErtesitesekModal.js

// ===== IMPORTOK =====
import Modal from './Modal.js';
import { apiGet, apiPatch } from '../../utils/apiHelper.js';
import { tokenLekerese } from '../../utils/authHelper.js';

// ===== ESEMÉNYTÍPUS → EMBERI SZÖVEG =====
// (A szavazasiHatarido a cronnal jön később; a szavazatErkezett elhagyva – ezért nincsenek itt.)
const TIPUS_SZOVEG = {
  ujJavaslat:        'Új javaslat',
  javaslatElfogadas: 'Javaslat elfogadva',
  javaslatElvetve:   'Javaslat elvetve',
  tudatpontValtozas: 'Tudatpont-változás',
  ujGyerekEntitas:   'Új tartalom jött létre',
};

// Egy oldalon ennyi értesítést kérünk le
const LAP_MERET = 20;

// ===== POSTAFIÓK (ÉRTESÍTÉSEK) MODAL =====
// Felelősség: a bejelentkezett e-ember értesítéseinek listázása lapozva, olvasottnak
//   jelölés (egyenként vagy mind), és kattintásra navigálás az érintett entitásra.
// Használja: a fő menü „Értesítések" pontja (foOldal.js).
class ErtesitesekModal {

  // @param {string} kontenerAzonosito - a modal konténer div ID-ja
  // @param {Object} beallitasok
  // @param {string} beallitasok.token               - JWT token (opcionális)
  // @param {Function} beallitasok.onEntitasKivalasztas - (entitasId, entitasTipus) navigáláshoz
  // @param {Function} beallitasok.onValtozas        - olvasottnak jelölés után hívjuk
  //                                                   (a FoOldal a badge-et frissíti vele)
  constructor(kontenerAzonosito, beallitasok = {}) {
    console.log('ErtesitesekModal.constructor - KEZDÉS');

    this.kontenerAzonosito     = kontenerAzonosito;
    this.token                 = beallitasok.token ?? tokenLekerese();
    this.onEntitasKivalasztas  = beallitasok.onEntitasKivalasztas ?? null;
    this.onValtozas            = beallitasok.onValtozas ?? null;

    this.modal       = null;
    this.lap         = 1;
    this.lapokSzama  = 1;

    console.log('ErtesitesekModal.constructor - VÉGE');
  }

  // ===== INICIALIZÁLÁS =====
  async init() {
    console.log('ErtesitesekModal.init - KEZDÉS');

    const tartalomHtml = await this._templateBetoltese();
    if (!tartalomHtml) return;

    this.modal = new Modal(this.kontenerAzonosito, {
      cim:      'Értesítések',
      tartalom: tartalomHtml,
      meret:    'alap',
      gombok: [
        {
          felirat:   'Mind olvasottnak',
          tipus:     'masodlagos',
          azonosito: 'ertesitesek-mind-gomb',
          akcio:     () => this._mindOlvasottnak()
        },
        {
          felirat:   'Bezárás',
          tipus:     'masodlagos',
          azonosito: 'ertesitesek-bezar-gomb',
          akcio:     () => this.modal.bezaras()
        }
      ],
      onBezaras: () => console.log('ErtesitesekModal - modal bezárva')
    });

    await this.modal.init();

    // Esemény-delegálás: a listán belüli kattintás → az adott értesítés
    const lista = document.getElementById('ertesitesek-lista');
    if (lista) {
      lista.addEventListener('click', (esemeny) => {
        const elem = esemeny.target.closest('.ertesitesek-modal__elem');
        if (elem) {
          this._elemKattintas(elem.dataset.id, elem.dataset.entitasId, elem.dataset.entitasTipus);
        }
      });
    }

    // „Továbbiak" gomb – a következő oldal hozzáfűzése
    const tovabbiak = document.getElementById('ertesitesek-tovabbiak');
    if (tovabbiak) {
      tovabbiak.addEventListener('click', () => this._oldalBetoltese(this.lap + 1, true));
    }

    console.log('ErtesitesekModal.init - VÉGE');
  }

  // ===== TEMPLATE BETÖLTÉSE =====
  async _templateBetoltese() {
    try {
      const valasz = await fetch('./html/components/modals/ertesitesekModal.html');
      if (!valasz.ok) {
        console.error('ErtesitesekModal._templateBetoltese - HIBA', { statusz: valasz.status });
        return null;
      }
      return await valasz.text();
    } catch (hiba) {
      console.error('ErtesitesekModal._templateBetoltese - kivétel', hiba.message);
      return null;
    }
  }

  // ===== MEGNYITÁS =====
  async megnyitas() {
    this.modal?.megnyitas();
    await this._oldalBetoltese(1, false);
  }

  bezaras() {
    this.modal?.bezaras();
  }

  // ===== EGY OLDAL BETÖLTÉSE =====
  // @param {number} lap    - hányadik oldal
  // @param {boolean} append - true: hozzáfűz (Továbbiak); false: elölről tölt
  async _oldalBetoltese(lap, append) {
    console.log('ErtesitesekModal._oldalBetoltese - KEZDÉS', { lap, append });

    this.modal.betoltesBeallitasa(true);
    try {
      const valasz = await apiGet(`ertesitesek?lap=${lap}&lapMeret=${LAP_MERET}`, this.token);
      this.modal.betoltesBeallitasa(false);

      const adatok = valasz?.adatok ?? {};
      this.lap        = lap;
      this.lapokSzama = adatok.lapokSzama ?? 1;

      this._listaRenderelese(adatok.ertesitesek ?? [], append);
      this._tovabbiakGombFrissitese();

      console.log('ErtesitesekModal._oldalBetoltese - VÉGE', {
        darab: (adatok.ertesitesek ?? []).length, lap: this.lap, lapokSzama: this.lapokSzama
      });
    } catch (hiba) {
      console.error('ErtesitesekModal._oldalBetoltese - HIBA', hiba.message);
      this.modal.betoltesBeallitasa(false);
      this.modal.hibaBeallitasa(hiba.message ?? 'Az értesítések betöltése sikertelen.');
    }
  }

  // ===== LISTA RENDERELÉSE =====
  _listaRenderelese(ertesitesek, append) {
    const lista = document.getElementById('ertesitesek-lista');
    if (!lista) return;

    // Üres állapot (csak az első oldalon, ha nincs semmi)
    if (!append && ertesitesek.length === 0) {
      lista.innerHTML = '<p class="ertesitesek-modal__ures">Nincs értesítésed.</p>';
      return;
    }

    const html = ertesitesek.map((e) => this._elemHtml(e)).join('');
    if (append) {
      lista.insertAdjacentHTML('beforeend', html);
    } else {
      lista.innerHTML = html;
    }
  }

  // ===== EGY ÉRTESÍTÉS-SOR HTML =====
  _elemHtml(ertesites) {
    const cimSzoveg = TIPUS_SZOVEG[ertesites.tipus] ?? 'Értesítés';
    const entitasResz = ertesites.entitasCim ? ` – ${this._escape(ertesites.entitasCim)}` : '';
    const olvasatlanOsztaly = ertesites.olvasva ? '' : ' ertesitesek-modal__elem--olvasatlan';

    return `
      <button type="button"
        class="ertesitesek-modal__elem${olvasatlanOsztaly}"
        data-id="${ertesites._id}"
        data-entitas-id="${ertesites.entitasId}"
        data-entitas-tipus="${ertesites.entitasTipus}">
        <span class="ertesitesek-modal__pont" aria-hidden="true"></span>
        <span class="ertesitesek-modal__szoveg">
          <span class="ertesitesek-modal__cim">${cimSzoveg}${entitasResz}</span>
          <span class="ertesitesek-modal__ido">${this._idoSzoveg(ertesites.createdAt)}</span>
        </span>
      </button>`;
  }

  // ===== „TOVÁBBIAK" GOMB FRISSÍTÉSE =====
  _tovabbiakGombFrissitese() {
    const gomb = document.getElementById('ertesitesek-tovabbiak');
    if (gomb) gomb.style.display = this.lap < this.lapokSzama ? '' : 'none';
  }

  // ===== EGY ÉRTESÍTÉSRE KATTINTÁS =====
  // Olvasottnak jelöli, bezár, és az érintett entitásra navigál.
  async _elemKattintas(ertesitesId, entitasId, entitasTipus) {
    console.log('ErtesitesekModal._elemKattintas - KEZDÉS', { ertesitesId, entitasId, entitasTipus });

    // Olvasottnak jelölés (best-effort – ha hibázik, a navigáció akkor is menjen)
    try {
      await apiPatch(`ertesitesek/${ertesitesId}/olvasott`, {}, this.token);

      // Sikeres jelölés → szólunk a hívónak (a FoOldal a badge-et frissíti)
      if (typeof this.onValtozas === 'function') this.onValtozas();
    } catch (hiba) {
      console.error('ErtesitesekModal._elemKattintas - olvasott jelölés hiba', hiba.message);
    }

    this.modal.bezaras();

    if (typeof this.onEntitasKivalasztas === 'function' && entitasId && entitasTipus) {
      this.onEntitasKivalasztas(entitasId, entitasTipus);
    }
  }

  // ===== MIND OLVASOTTNAK =====
  async _mindOlvasottnak() {
    console.log('ErtesitesekModal._mindOlvasottnak - KEZDÉS');
    this.modal.betoltesBeallitasa(true);
    try {
      await apiPatch('ertesitesek/mind-olvasott', {}, this.token);
      this.modal.betoltesBeallitasa(false);

      // Sikeres jelölés → szólunk a hívónak (a FoOldal a badge-et frissíti)
      if (typeof this.onValtozas === 'function') this.onValtozas();

      // Újratöltjük az első oldalt, hogy eltűnjenek az olvasatlan-jelzők
      await this._oldalBetoltese(1, false);
    } catch (hiba) {
      console.error('ErtesitesekModal._mindOlvasottnak - HIBA', hiba.message);
      this.modal.betoltesBeallitasa(false);
      this.modal.hibaBeallitasa(hiba.message ?? 'A művelet sikertelen.');
    }
  }

  // ===== SEGÉD: IDŐ SZÖVEG =====
  _idoSzoveg(idopont) {
    if (!idopont) return '';
    const d = new Date(idopont);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('hu-HU');
  }

  // ===== SEGÉD: HTML-ESCAPE (a cím felhasználói adat) =====
  _escape(szoveg) {
    return String(szoveg)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

// ===== EXPORTÁLÁS =====
export default ErtesitesekModal;
