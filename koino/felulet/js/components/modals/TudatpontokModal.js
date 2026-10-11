// frontend/js/components/modals/TudatpontokModal.js

// ===== IMPORTOK =====
import Modal from './Modal.js';
import TudatpontModal from './TudatpontModal.js';
import { apiGet } from '../../utils/apiHelper.js';
import { tokenLekerese } from '../../utils/authHelper.js';

// ===== ENTITÁSTÍPUS → IKON + FELIRAT =====
// A lista soraiban jelöljük, milyen típusú entitáson van a tudatpont.
const TIPUS_MEGJELENES = {
  Gondolat:      { ikon: '📄', felirat: 'Gondolat' },
  Kategoria:     { ikon: '🏷️', felirat: 'Kategória' },
  GondolatTipus: { ikon: '🧩', felirat: 'Gondolattípus' },
  Javaslat:      { ikon: '✍️', felirat: 'Javaslat' },
  Egyezmeny:     { ikon: '🤝', felirat: 'Egyezmény' },
};

// Egyszerre ennyi hozzárendelést kérünk le (a saját aktív hozzárendelések a
// véges tudatpont-keret miatt korlátos mennyiség — lapozás v1-ben nincs)
const LISTA_LIMIT = 100;

// ===== TUDATPONTOK MODAL =====
// Felelősség: a bejelentkezett e-ember AKTÍV tudatpont-hozzárendeléseinek listázása
//   (terv 7. pont — Tudatpontok nézet):
//   1. fejlécben a szabad (szét nem osztott) tudatpont,
//   2. lista: entitás címe + típusa + a rátett pont,
//   3. sor-kattintás → navigálás az entitásra (pakli),
//   4. „Módosítás" gomb → a meglévő TudatpontModal al-modalként, siker után frissülő
//      listával.
//   ÁG-SZŰRT módban (agEntitasId megadva) csak az adott entitás ága alatti
//   hozzárendelések látszanak — a kártya-hamburgerek „Tudatpontok" pontja használja.
// Használja: a fő menü „Tudatpontok" pontja (foOldal.js — teljes lista) és a
//   kártya-hamburgerek „Tudatpontok" pontja (Kartya.js — ág-szűrve).
class TudatpontokModal {

  // @param {string} kontenerAzonosito - a modal konténer div ID-ja
  // @param {Object} beallitasok
  // @param {string} beallitasok.token                  - JWT token (opcionális)
  // @param {string} beallitasok.agEntitasId            - ÁG-SZŰRŐ (opcionális)
  // @param {string} beallitasok.cim                    - a modal címe (alapból „Tudatpontok")
  // @param {Function} beallitasok.onEntitasKivalasztas - (entitasId, entitasTipus) navigáláshoz
  // @param {Function} beallitasok.onValtozas           - sikeres pont-módosítás után hívjuk
  //                                                      (a FoOldal az alsó sávot frissíti vele)
  // @param {Function} beallitasok.onBezarasValtozassal - a modal BEZÁRÁSAKOR hívjuk, ha közben
  //                                                      volt pont-módosítás és NEM navigálunk el
  //                                                      (pakli-újratöltéshez)
  constructor(kontenerAzonosito, beallitasok = {}) {
    console.log('TudatpontokModal.constructor - KEZDÉS', { agEntitasId: beallitasok.agEntitasId });

    this.kontenerAzonosito    = kontenerAzonosito;
    this.token                = beallitasok.token ?? tokenLekerese();
    this.agEntitasId          = beallitasok.agEntitasId ?? null;
    this.cimFelirat           = beallitasok.cim ?? 'Tudatpontok';
    this.onEntitasKivalasztas = beallitasok.onEntitasKivalasztas ?? null;
    this.onValtozas           = beallitasok.onValtozas ?? null;
    this.onBezarasValtozassal = beallitasok.onBezarasValtozassal ?? null;

    this.modal = null;

    // Történt-e pont-módosítás a modal nyitva léte alatt (bezáráskor kell)
    this.valtozott = false;
    // Ha sorra kattintva navigálunk el, a bezárás-callback NEM fut (a navigálás
    // úgyis újratölti a paklit)
    this._navigalasFolyamatban = false;

    console.log('TudatpontokModal.constructor - VÉGE');
  }

  // ===== INICIALIZÁLÁS =====
  async init() {
    console.log('TudatpontokModal.init - KEZDÉS');

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
          azonosito: 'tudatpontok-bezar-gomb',
          akcio:     () => this.modal.bezaras()
        }
      ],
      onBezaras: () => {
        console.log('TudatpontokModal - modal bezárva', {
          valtozott: this.valtozott,
          navigalas: this._navigalasFolyamatban
        });
        // Ha volt pont-módosítás és NEM navigálunk el, szólunk a hívónak
        // (pakli-újratöltés, hogy a hierarchikus pontok frissüljenek)
        if (this.valtozott && !this._navigalasFolyamatban &&
            typeof this.onBezarasValtozassal === 'function') {
          this.onBezarasValtozassal();
        }
      }
    });

    await this.modal.init();

    // Esemény-delegálás a listán: Módosítás gomb VAGY sor-kattintás (navigálás)
    const lista = document.getElementById('tudatpontok-lista');
    if (lista) {
      lista.addEventListener('click', (esemeny) => {
        const modositGomb = esemeny.target.closest('.tudatpontok-modal__modosit');
        if (modositGomb) {
          this._modositasMegnyitasa(
            modositGomb.dataset.entitasId,
            modositGomb.dataset.entitasTipus
          );
          return;
        }
        const sor = esemeny.target.closest('.tudatpontok-modal__elem');
        if (sor) {
          this._sorKattintas(sor.dataset.entitasId, sor.dataset.entitasTipus);
        }
      });
    }

    console.log('TudatpontokModal.init - VÉGE');
  }

  // ===== TEMPLATE BETÖLTÉSE =====
  async _templateBetoltese() {
    try {
      const valasz = await fetch('./html/components/modals/tudatpontokModal.html');
      if (!valasz.ok) {
        console.error('TudatpontokModal._templateBetoltese - HIBA', { statusz: valasz.status });
        return null;
      }
      return await valasz.text();
    } catch (hiba) {
      console.error('TudatpontokModal._templateBetoltese - kivétel', hiba.message);
      return null;
    }
  }

  // ===== MEGNYITÁS =====
  async megnyitas() {
    this.modal?.megnyitas();
    await this._adatokBetoltese();
  }

  bezaras() {
    this.modal?.bezaras();
  }

  // ===== ADATOK BETÖLTÉSE (fejléc + lista együtt) =====
  async _adatokBetoltese() {
    console.log('TudatpontokModal._adatokBetoltese - KEZDÉS');

    this.modal.betoltesBeallitasa(true);
    try {
      // A szabad pont és a hozzárendelés-lista párhuzamosan kérhető le
      const agResz = this.agEntitasId ? `&agEntitasId=${this.agEntitasId}` : '';
      const [sajatAdatok, hozzarendelesek] = await Promise.all([
        apiGet('eember/sajat-adatok', this.token),
        apiGet(`tudatpont/aktiv-hozzarendelesek?limit=${LISTA_LIMIT}${agResz}`, this.token),
      ]);
      this.modal.betoltesBeallitasa(false);

      // Fejléc: szabad tudatpont
      const szabadElem = document.getElementById('tudatpontok-szabad');
      if (szabadElem) {
        szabadElem.textContent = `Szabad tudatpontod: ${sajatAdatok?.tudatpontok ?? '—'} 🌟`;
      }

      this._listaRenderelese(hozzarendelesek?.data ?? []);

      console.log('TudatpontokModal._adatokBetoltese - VÉGE', {
        darab: (hozzarendelesek?.data ?? []).length
      });
    } catch (hiba) {
      console.error('TudatpontokModal._adatokBetoltese - HIBA', hiba.message);
      this.modal.betoltesBeallitasa(false);
      this.modal.hibaBeallitasa(hiba.message ?? 'A tudatpontok betöltése sikertelen.');
    }
  }

  // ===== LISTA RENDERELÉSE =====
  _listaRenderelese(hozzarendelesek) {
    const lista = document.getElementById('tudatpontok-lista');
    if (!lista) return;

    if (hozzarendelesek.length === 0) {
      lista.innerHTML = this.agEntitasId
        ? '<p class="tudatpontok-modal__ures">Ebben az ágazatban nincs tudatpontod.</p>'
        : '<p class="tudatpontok-modal__ures">Még nem rendeltél tudatpontot egyetlen entitáshoz sem.</p>';
      return;
    }

    lista.innerHTML = hozzarendelesek.map((h) => this._elemHtml(h)).join('');
  }

  // ===== EGY HOZZÁRENDELÉS-SOR HTML =====
  _elemHtml(hozzarendeles) {
    const megjelenes = TIPUS_MEGJELENES[hozzarendeles.entitasTipus]
      ?? { ikon: '❔', felirat: hozzarendeles.entitasTipus };

    // Cím-viselő entitásnál a cím/név; Javaslat/Egyezménynél nincs cím → a típus-felirat
    const cim = hozzarendeles.entitasCim
      ? this._escape(hozzarendeles.entitasCim)
      : `(${megjelenes.felirat.toLowerCase()})`;

    return `
      <div class="tudatpontok-modal__elem"
        data-entitas-id="${hozzarendeles.entitasId}"
        data-entitas-tipus="${hozzarendeles.entitasTipus}"
        role="button" tabindex="0"
        title="Kattints a navigáláshoz">
        <span class="tudatpontok-modal__tipus" title="${megjelenes.felirat}">${megjelenes.ikon}</span>
        <span class="tudatpontok-modal__cim">${cim}</span>
        <span class="tudatpontok-modal__pont">${hozzarendeles.tudatPontok} 🌟</span>
        <button type="button" class="tudatpontok-modal__modosit"
          data-entitas-id="${hozzarendeles.entitasId}"
          data-entitas-tipus="${hozzarendeles.entitasTipus}"
          title="Tudatpont módosítás">✏️</button>
      </div>`;
  }

  // ===== SOR-KATTINTÁS: NAVIGÁLÁS AZ ENTITÁSRA =====
  _sorKattintas(entitasId, entitasTipus) {
    console.log('TudatpontokModal._sorKattintas - KEZDÉS', { entitasId, entitasTipus });

    // Navigálás következik → a bezárás-callback (pakli-újratöltés) kimarad,
    // mert a navigáció maga is újratölti a paklit
    this._navigalasFolyamatban = true;
    this.modal.bezaras();

    if (typeof this.onEntitasKivalasztas === 'function' && entitasId && entitasTipus) {
      this.onEntitasKivalasztas(entitasId, entitasTipus);
    }
  }

  // ===== MÓDOSÍTÁS: TUDATPONT MODAL AL-MODALKÉNT =====
  // A meglévő TudatpontModal-t nyitjuk a dinamikusan biztosított almodal-konténerben
  // (a HozzajarulokModal mintája), így nem írja felül a Tudatpontok listát.
  async _modositasMegnyitasa(entitasId, entitasTipus) {
    console.log('TudatpontokModal._modositasMegnyitasa - KEZDÉS', { entitasId, entitasTipus });

    const tudatpontModal = new TudatpontModal(this._alKontenerBiztositasa(), {
      entitasAdatok: { entitasId, entitasTipus, adatok: {} },
      onSiker: async () => {
        console.log('TudatpontokModal - módosítás sikeres, lista frissítése');
        this.valtozott = true;
        // A lista + a szabad pont fejléc frissítése
        await this._adatokBetoltese();
        // A hívó (FoOldal) az alsó statisztika-sávot frissíti vele
        if (typeof this.onValtozas === 'function') this.onValtozas();
      }
    });

    await tudatpontModal.init();
    tudatpontModal.megnyitas();
  }

  // ===== SEGÉD: AL-MODAL KONTÉNER BIZTOSÍTÁSA =====
  _alKontenerBiztositasa() {
    const azonosito = 'almodal-kontener';
    let kontener = document.getElementById(azonosito);
    if (!kontener) {
      kontener = document.createElement('div');
      kontener.id = azonosito;
      document.body.appendChild(kontener);
    }
    return azonosito;
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
export default TudatpontokModal;
