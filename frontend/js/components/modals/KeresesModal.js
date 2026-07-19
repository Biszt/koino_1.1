// frontend/js/components/modals/KeresesModal.js

// ===== IMPORTOK =====
import Modal from './Modal.js';
import { apiGet } from '../../utils/apiHelper.js';
import { tokenLekerese } from '../../utils/authHelper.js';

// ===== ENTITÁSTÍPUS → IKON =====
// A találat-sorokban jelöljük, milyen típusú entitás a találat.
const TIPUS_IKON = {
  Tartalom:      '📄',
  Kategoria:     '📁',
  TartalomTipus: '🏷️',
};

// Gépelés közbeni késleltetés (ms): csak akkor kérdezzük a backendet, ha a
// felhasználó ennyi ideig nem ütött újabb billentyűt
const DEBOUNCE_MS = 300;

// Típusonkénti maximum találat
const TALALAT_LIMIT = 20;

// ===== KERESÉS MODAL =====
// Felelősség: cím/név alapú entitás-keresés és navigálás a találatra.
//   1. keresőmező — gépelés közben (debounce-szal) frissülő találati lista,
//   2. típus-szűrő pipák (Tartalom / Kategória / Tartalomtípus),
//   3. találatra kattintva a modal bezárul és a pakli az entitásra navigál.
//   ÁG-SZŰRT módban (agEntitasId megadva) csak az adott entitás ága alatti
//   találatok jönnek — a kártya-hamburgerek „Keresés" pontja használja.
// A backend a meglévő GET /api/kereses végpont (agEntitasId paraméterrel bővítve).
// Használja: a fő menü „Keresés" pontja (foOldal.js — teljes keresés) és a
//   kártya-hamburgerek „Keresés" pontja (Kartya.js — ág-szűrve).
class KeresesModal {

  // @param {string} kontenerAzonosito - a modal konténer div ID-ja
  // @param {Object} beallitasok
  // @param {string} beallitasok.token                  - JWT token (opcionális)
  // @param {string} beallitasok.agEntitasId            - ÁG-SZŰRŐ (opcionális)
  // @param {string} beallitasok.cim                    - a modal címe (alapból „Keresés")
  // @param {Function} beallitasok.onEntitasKivalasztas - (entitasId, entitasTipus) navigáláshoz
  constructor(kontenerAzonosito, beallitasok = {}) {
    console.log('KeresesModal.constructor - KEZDÉS', { agEntitasId: beallitasok.agEntitasId });

    this.kontenerAzonosito    = kontenerAzonosito;
    this.token                = beallitasok.token ?? tokenLekerese();
    this.agEntitasId          = beallitasok.agEntitasId ?? null;
    this.cimFelirat           = beallitasok.cim ?? 'Keresés';
    this.onEntitasKivalasztas = beallitasok.onEntitasKivalasztas ?? null;

    this.modal = null;

    // A debounce időzítő azonosítója (clearTimeout-hoz)
    this._debounceIdozito = null;
    // Futó keresések sorszáma — a megkésett (régebbi) válaszok eldobásához
    this._keresesSorszam = 0;

    console.log('KeresesModal.constructor - VÉGE');
  }

  // ===== INICIALIZÁLÁS =====
  async init() {
    console.log('KeresesModal.init - KEZDÉS');

    const tartalomHtml = await this._templateBetoltese();
    if (!tartalomHtml) return;

    this.modal = new Modal(this.kontenerAzonosito, {
      cim:      this.cimFelirat,
      tartalom: tartalomHtml,
      meret:    'alap',
      gombok: [
        {
          felirat:   'Bezárás',
          tipus:     'masodlagos',
          azonosito: 'kereses-bezar-gomb',
          akcio:     () => this.modal.bezaras()
        }
      ]
    });

    await this.modal.init();

    // Keresőmező: gépelésre debounce-olt keresés
    const mezo = document.getElementById('kereses-mezo');
    if (mezo) {
      mezo.addEventListener('input', () => this._debounceKereses());
    }

    // Típus-pipák: változásra azonnali új keresés (a mezőben lévő szöveggel)
    for (const azonosito of ['kereses-tipus-tartalom', 'kereses-tipus-kategoria', 'kereses-tipus-tartalomtipus']) {
      const pipa = document.getElementById(azonosito);
      if (pipa) pipa.addEventListener('change', () => this._kereses());
    }

    // Esemény-delegálás a listán: találatra kattintás → navigálás
    const lista = document.getElementById('kereses-lista');
    if (lista) {
      lista.addEventListener('click', (esemeny) => {
        const sor = esemeny.target.closest('.kereses-modal__elem');
        if (sor) {
          this._talalatKattintas(sor.dataset.entitasId, sor.dataset.entitasTipus);
        }
      });
    }

    console.log('KeresesModal.init - VÉGE');
  }

  // ===== TEMPLATE BETÖLTÉSE =====
  async _templateBetoltese() {
    try {
      const valasz = await fetch('./html/components/modals/keresesModal.html');
      if (!valasz.ok) {
        console.error('KeresesModal._templateBetoltese - HIBA', { statusz: valasz.status });
        return null;
      }
      return await valasz.text();
    } catch (hiba) {
      console.error('KeresesModal._templateBetoltese - kivétel', hiba.message);
      return null;
    }
  }

  // ===== MEGNYITÁS =====
  megnyitas() {
    this.modal?.megnyitas();

    // Kezdő állapot: útmutató szöveg + fókusz a keresőmezőre
    this._uzenetMegjelenitese('Kezdj el gépelni a kereséshez...');
    document.getElementById('kereses-mezo')?.focus();
  }

  bezaras() {
    this.modal?.bezaras();
  }

  // ===== DEBOUNCE-OLT KERESÉS =====
  // Minden billentyűleütésnél újraindítjuk az időzítőt — a keresés csak akkor
  // fut le, ha DEBOUNCE_MS ideig nem jött újabb leütés (kíméli a backendet).
  _debounceKereses() {
    if (this._debounceIdozito) clearTimeout(this._debounceIdozito);
    this._debounceIdozito = setTimeout(() => this._kereses(), DEBOUNCE_MS);
  }

  // ===== KERESÉS FUTTATÁSA =====
  async _kereses() {
    const kifejezes = document.getElementById('kereses-mezo')?.value?.trim() ?? '';

    // Üres mezőnél nem kérdezünk — útmutató szöveg
    if (!kifejezes) {
      this._uzenetMegjelenitese('Kezdj el gépelni a kereséshez...');
      return;
    }

    // A bepipált típusok összegyűjtése
    const tipusok = [];
    if (document.getElementById('kereses-tipus-tartalom')?.checked)      tipusok.push('Tartalom');
    if (document.getElementById('kereses-tipus-kategoria')?.checked)     tipusok.push('Kategoria');
    if (document.getElementById('kereses-tipus-tartalomtipus')?.checked) tipusok.push('TartalomTipus');

    if (tipusok.length === 0) {
      this._uzenetMegjelenitese('Pipálj be legalább egy típust.');
      return;
    }

    console.log('KeresesModal._kereses - KEZDÉS', { kifejezes, tipusok });

    // Sorszámozás: ha közben újabb keresés indult, a régebbi válasz kimarad
    const sorszam = ++this._keresesSorszam;

    try {
      const agResz = this.agEntitasId ? `&agEntitasId=${this.agEntitasId}` : '';
      const valasz = await apiGet(
        `kereses?q=${encodeURIComponent(kifejezes)}&tipusok=${tipusok.join(',')}&limit=${TALALAT_LIMIT}${agResz}`,
        this.token
      );

      // Megkésett válasz (közben új keresés indult) → eldobjuk
      if (sorszam !== this._keresesSorszam) {
        console.log('KeresesModal._kereses - megkésett válasz eldobva', { sorszam });
        return;
      }

      this._listaRenderelese(valasz?.talalatok ?? []);

      console.log('KeresesModal._kereses - VÉGE', { talalatok: (valasz?.talalatok ?? []).length });
    } catch (hiba) {
      console.error('KeresesModal._kereses - HIBA', hiba.message);
      if (sorszam === this._keresesSorszam) {
        this.modal.hibaBeallitasa(hiba.message ?? 'A keresés sikertelen.');
      }
    }
  }

  // ===== LISTA RENDERELÉSE =====
  _listaRenderelese(talalatok) {
    const lista = document.getElementById('kereses-lista');
    if (!lista) return;

    // Új eredmény érkezett — az esetleges korábbi hibaüzenetet töröljük
    this.modal.hibaTisztitasa();

    if (talalatok.length === 0) {
      this._uzenetMegjelenitese(this.agEntitasId
        ? 'Nincs találat ebben az ágazatban.'
        : 'Nincs találat.');
      return;
    }

    lista.innerHTML = talalatok.map((t) => this._elemHtml(t)).join('');
  }

  // ===== EGY TALÁLAT-SOR HTML =====
  _elemHtml(talalat) {
    const ikon = TIPUS_IKON[talalat.entitasTipus] ?? '❔';

    return `
      <div class="kereses-modal__elem"
        data-entitas-id="${talalat.entitasId}"
        data-entitas-tipus="${talalat.entitasTipus}"
        role="button" tabindex="0"
        title="Kattints a navigáláshoz">
        <span class="kereses-modal__tipus">${ikon}</span>
        <span class="kereses-modal__cim">${this._escape(talalat.cim)}</span>
      </div>`;
  }

  // ===== ÚTMUTATÓ / ÜRES ÁLLAPOT SZÖVEG =====
  _uzenetMegjelenitese(szoveg) {
    const lista = document.getElementById('kereses-lista');
    if (lista) {
      lista.innerHTML = `<p class="kereses-modal__ures">${szoveg}</p>`;
    }
  }

  // ===== TALÁLATRA KATTINTÁS: NAVIGÁLÁS =====
  _talalatKattintas(entitasId, entitasTipus) {
    console.log('KeresesModal._talalatKattintas - KEZDÉS', { entitasId, entitasTipus });

    this.modal.bezaras();

    if (typeof this.onEntitasKivalasztas === 'function' && entitasId && entitasTipus) {
      this.onEntitasKivalasztas(entitasId, entitasTipus);
    }
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
export default KeresesModal;
