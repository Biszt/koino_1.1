// frontend/js/components/modals/ErtesitesekModal.js

// ===== IMPORTOK =====
import Modal from './Modal.js';
import { apiGet, apiPatch } from '../../utils/apiHelper.js';
import { tokenLekerese } from '../../utils/authHelper.js';
import { masodpercFelirat } from '../../utils/idoFormazo.js';

// ===== ESEMÉNYTÍPUS → EMBERI SZÖVEG =====
// (A szavazasiHatarido a cronnal jön később; a szavazatErkezett elhagyva – ezért nincsenek itt.)
const TIPUS_SZOVEG = {
  ujJavaslat:        'Új javaslat',
  javaslatElfogadas: 'Javaslat elfogadva',
  javaslatElvetve:   'Javaslat elvetve',
  tudatpontValtozas: 'Tudatpont-változás',
  ujGyerekEntitas:   'Új tartalom jött létre',
  kuszobValtozas:    'Küszöbváltozás',
};

// ===== KÜSZÖB-MEZŐ → EMBERI FELIRAT + FORMÁZÁS =====
// A kuszobValtozas értesítés adatok.valtozasok elemeihez: melyik küszöb változott,
// és hogyan írjuk ki az értékét (% vagy emberi időformátum).
const KUSZOB_MEZO_FELIRAT = {
  javaslatElfogadasiKuszob: { felirat: 'elfogadási küszöb',  formaz: (e) => `${e}%` },
  reszveteliAranyKuszob:    { felirat: 'részvételi küszöb',  formaz: (e) => `${e}%` },
  minimumDontesiIdo:        { felirat: 'min. döntési idő',   formaz: (e) => masodpercFelirat(e) },
  maximumDontesiIdo:        { felirat: 'max. döntési idő',   formaz: (e) => masodpercFelirat(e) },
};

// Egy oldalon ennyi értesítést kérünk le
const LAP_MERET = 20;

// ===== POSTAFIÓK (ÉRTESÍTÉSEK) MODAL =====
// Felelősség: a bejelentkezett e-ember értesítéseinek listázása lapozva, olvasottnak
//   jelölés (egyenként vagy mind), és kattintásra navigálás az érintett entitásra.
//   ÁG-SZŰRT módban (agEntitasId megadva) csak az adott entitás ága alatti értesítések
//   látszanak, és a „Mind olvasottnak" is csak azokat jelöli.
// Használja: a fő menü „Értesítések" pontja (foOldal.js — teljes postafiók) és a
//   kártya-hamburgerek „Értesítések" pontja (Kartya.js — ág-szűrve).
class ErtesitesekModal {

  // @param {string} kontenerAzonosito - a modal konténer div ID-ja
  // @param {Object} beallitasok
  // @param {string} beallitasok.token               - JWT token (opcionális)
  // @param {Function} beallitasok.onEntitasKivalasztas - (entitasId, entitasTipus) navigáláshoz
  // @param {Function} beallitasok.onValtozas        - olvasottnak jelölés után hívjuk
  //                                                   (a FoOldal a badge-et frissíti vele)
  // @param {string} beallitasok.agEntitasId         - ÁG-SZŰRŐ (opcionális): csak ennek az
  //                                                   entitásnak az ága alatti értesítések
  // @param {string} beallitasok.cim                 - a modal címe (alapból „Értesítések")
  // @param {Function} beallitasok.onBezarasValtozassal - a modal BEZÁRÁSAKOR hívjuk, ha
  //                                                   közben volt olvasottnak jelölés és NEM
  //                                                   navigálunk el (a kártya a paklit
  //                                                   frissíti vele, hogy a badge-ek fogyjanak)
  constructor(kontenerAzonosito, beallitasok = {}) {
    console.log('ErtesitesekModal.constructor - KEZDÉS');

    this.kontenerAzonosito     = kontenerAzonosito;
    this.token                 = beallitasok.token ?? tokenLekerese();
    this.onEntitasKivalasztas  = beallitasok.onEntitasKivalasztas ?? null;
    this.onValtozas            = beallitasok.onValtozas ?? null;
    this.agEntitasId           = beallitasok.agEntitasId ?? null;
    this.cimFelirat            = beallitasok.cim ?? 'Értesítések';
    this.onBezarasValtozassal  = beallitasok.onBezarasValtozassal ?? null;

    this.modal       = null;
    this.lap         = 1;
    this.lapokSzama  = 1;

    // Történt-e olvasottnak jelölés a modal nyitva léte alatt (bezáráskor kell)
    this.valtozott = false;
    // Ha értesítésre kattintva navigálunk el, a bezárás-callback NEM fut (a navigálás
    // úgyis újratölti a paklit — nem kell dupla újratöltés)
    this._navigalasFolyamatban = false;

    console.log('ErtesitesekModal.constructor - VÉGE');
  }

  // ===== INICIALIZÁLÁS =====
  async init() {
    console.log('ErtesitesekModal.init - KEZDÉS');

    const tartalomHtml = await this._templateBetoltese();
    if (!tartalomHtml) return;

    this.modal = new Modal(this.kontenerAzonosito, {
      cim:      this.cimFelirat,
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
      onBezaras: () => {
        console.log('ErtesitesekModal - modal bezárva', {
          valtozott: this.valtozott,
          navigalas: this._navigalasFolyamatban
        });
        // Ha volt olvasottnak jelölés és NEM navigálunk el, szólunk a hívónak
        // (a kártya ezzel frissíti a paklit, hogy a badge-számok fogyjanak)
        if (this.valtozott && !this._navigalasFolyamatban &&
            typeof this.onBezarasValtozassal === 'function') {
          this.onBezarasValtozassal();
        }
      }
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
      // Ág-szűrt módban az agEntitasId query-paramétert is küldjük — a backend az
      // értesítések ős-lánca (osLanc) alapján csak az ág alattiakat adja vissza
      const agResz = this.agEntitasId ? `&agEntitasId=${this.agEntitasId}` : '';
      const valasz = await apiGet(`ertesitesek?lap=${lap}&lapMeret=${LAP_MERET}${agResz}`, this.token);
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

    // Küszöbváltozásnál kiírjuk, MELYIK küszöb változott és hogyan (régi → új)
    const reszletResz = this._kuszobValtozasReszlet(ertesites);

    return `
      <button type="button"
        class="ertesitesek-modal__elem${olvasatlanOsztaly}"
        data-id="${ertesites._id}"
        data-entitas-id="${ertesites.entitasId}"
        data-entitas-tipus="${ertesites.entitasTipus}">
        <span class="ertesitesek-modal__pont" aria-hidden="true"></span>
        <span class="ertesitesek-modal__szoveg">
          <span class="ertesitesek-modal__cim">${cimSzoveg}${entitasResz}</span>
          ${reszletResz}
          <span class="ertesitesek-modal__ido">${this._idoSzoveg(ertesites.createdAt)}</span>
        </span>
      </button>`;
  }

  // ===== KÜSZÖBVÁLTOZÁS RÉSZLET-SOR =====
  // A kuszobValtozas értesítés adatok.valtozasok tömbjéből emberi szöveg:
  // pl. „elfogadási küszöb: 51% → 60% · min. döntési idő: 3 perc → 5 perc".
  // Más típusnál (vagy hiányzó adatoknál) üres string.
  _kuszobValtozasReszlet(ertesites) {
    if (ertesites.tipus !== 'kuszobValtozas') return '';

    const valtozasok = ertesites.adatok?.valtozasok;
    if (!Array.isArray(valtozasok) || valtozasok.length === 0) return '';

    const darabok = valtozasok
      .filter((v) => KUSZOB_MEZO_FELIRAT[v.mezo])
      .map((v) => {
        const def = KUSZOB_MEZO_FELIRAT[v.mezo];
        return `${def.felirat}: ${def.formaz(v.regi)} → ${def.formaz(v.uj)}`;
      });
    if (darabok.length === 0) return '';

    return `<span class="ertesitesek-modal__reszlet">${this._escape(darabok.join(' · '))}</span>`;
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

      // Sikeres jelölés → megjegyezzük és szólunk a hívónak (badge-frissítéshez)
      this.valtozott = true;
      if (typeof this.onValtozas === 'function') this.onValtozas();
    } catch (hiba) {
      console.error('ErtesitesekModal._elemKattintas - olvasott jelölés hiba', hiba.message);
    }

    // Navigálás következik → a bezárás-callback (pakli-újratöltés) kimarad,
    // mert a navigáció maga is újratölti a paklit
    this._navigalasFolyamatban = true;
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
      // Ág-szűrt módban csak az ág alatti olvasatlanokat jelöljük — a query-paramétert
      // a backend a megjelolMindetOlvasottnak szűrőjébe teszi (osLanc-alapú)
      const agResz = this.agEntitasId ? `?agEntitasId=${this.agEntitasId}` : '';
      await apiPatch(`ertesitesek/mind-olvasott${agResz}`, {}, this.token);
      this.modal.betoltesBeallitasa(false);

      // Sikeres jelölés → megjegyezzük és szólunk a hívónak (badge-frissítéshez)
      this.valtozott = true;
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
