// frontend/js/components/modals/HozzajarulokModal.js

// ===== IMPORTOK =====
import Modal from './Modal.js';
import { apiGet } from '../../utils/apiHelper.js';
import { tokenLekerese } from '../../utils/authHelper.js';

// A beágyazott (második szintű) modal SAJÁT konténere. A Modal.js felülírja a
// konténer gondolatát, ezért a Hozzájárulók modal nem használhatja ugyanazt a
// 'modal-kontener'-t, mint a szülő Részletek modal – különben felülírná azt.
// Ehelyett a body-hoz fűzött külön konténerben nyílik meg, a szülő felett.
const ALMODAL_KONTENER_ID = 'almodal-kontener';

// A lapozás oldalméretei: először 10, majd 40, utána 50-esével.
const OLDAL_MERETEK  = [10, 40];
const TOVABBI_MERET  = 50;

// ===== HOZZÁJÁRULÓK MODAL OSZTÁLY =====
// Felelősség: egy entitás tudatpont-hozzájárulóinak listázása.
//  1. Megnyitáskor betölti az első 10 hozzájárulót (pont szerint csökkenő).
//  2. „Több betöltése" gombbal továbbiakat tölt (40, majd 50-esével).
//  3. Minden sor: eember neve + RÉSZVÉTELI SZEREP (passzív/aktív) + hozzárendelt tudatpont.
// Használják: a ReszletekModal „Hozzájárulók" sorának részletek gombja.
class HozzajarulokModal {

  // ===== KONSTRUKTOR =====
  // @param {Object} beallitasok
  // @param {Object} beallitasok.entitas - { entitasId, entitasTipus, ... }
  // @param {string} beallitasok.token   - JWT token (opcionális, különben a tárolt)
  constructor(beallitasok = {}) {
    console.log('HozzajarulokModal.constructor - KEZDÉS', {
      entitasId:    beallitasok?.entitas?.entitasId,
      entitasTipus: beallitasok?.entitas?.entitasTipus
    });

    this.entitas      = beallitasok.entitas ?? null;
    this.token        = beallitasok.token ?? tokenLekerese();
    this.entitasId    = this.entitas?.entitasId    ?? null;
    this.entitasTipus = this.entitas?.entitasTipus ?? null;

    this.modal = null;

    // Lapozás állapota
    this.betoltottSzam     = 0;     // eddig betöltött hozzájárulók (= skip a következő kéréshez)
    this.betoltesekSzama   = 0;     // hányadik betöltésnél tartunk (az oldalméret ebből jön)
    this.tobbVanE          = true;  // van-e még betöltendő
    this.betoltFolyamatban = false; // épp fut-e egy betöltés

    console.log('HozzajarulokModal.constructor - VÉGE', {
      entitasId: this.entitasId, entitasTipus: this.entitasTipus
    });
  }

  // ===== INICIALIZÁLÁS =====
  async init() {
    console.log('HozzajarulokModal.init - KEZDÉS');

    this._kontenerBiztositasa();

    const tartalomHtml = await this._templateBetoltese();
    if (!tartalomHtml) return;

    this.modal = new Modal(ALMODAL_KONTENER_ID, {
      cim:      'Hozzájárulók',
      tartalom: tartalomHtml,
      meret:    'alap',
      gombok: [
        {
          felirat:   'Bezárás',
          tipus:     'masodlagos',
          azonosito: 'hozzajarulok-modal-bezar-gomb',
          akcio:     () => this.modal.bezaras()
        }
      ],
      onBezaras: () => {
        // Takarítás: a beágyazott konténert kiürítjük, hogy ne maradjon
        // rejtett modal-DOM a body végén.
        const kont = document.getElementById(ALMODAL_KONTENER_ID);
        if (kont) kont.innerHTML = '';
        console.log('HozzajarulokModal - modal bezárva');
      }
    });

    await this.modal.init();
    this._tobbGombBekotese();

    console.log('HozzajarulokModal.init - VÉGE');
  }

  // ===== BEÁGYAZOTT KONTÉNER BIZTOSÍTÁSA =====
  // Ha még nincs, létrehozza a body-hoz fűzött almodal konténert.
  _kontenerBiztositasa() {
    let kont = document.getElementById(ALMODAL_KONTENER_ID);
    if (!kont) {
      kont = document.createElement('div');
      kont.id = ALMODAL_KONTENER_ID;
      document.body.appendChild(kont);
      console.log('HozzajarulokModal - almodal konténer létrehozva');
    }
  }

  // ===== TEMPLATE BETÖLTÉSE =====
  async _templateBetoltese() {
    console.log('HozzajarulokModal._templateBetoltese - KEZDÉS');
    try {
      const valasz = await fetch('./html/components/modals/hozzajarulokModal.html');
      if (!valasz.ok) {
        console.error('HozzajarulokModal._templateBetoltese - HIBA: template nem található', {
          statusz: valasz.status
        });
        return null;
      }
      const htmlSzoveg = await valasz.text();
      console.log('HozzajarulokModal._templateBetoltese - VÉGE: sikeres betöltés');
      return htmlSzoveg;
    } catch (hiba) {
      console.error('HozzajarulokModal._templateBetoltese - VÉGE: kivétel', hiba.message);
      return null;
    }
  }

  // ===== MEGNYITÁS =====
  // Megnyitja a modalt, majd betölti az első oldalt (10 hozzájáruló).
  async megnyitas() {
    console.log('HozzajarulokModal.megnyitas - KEZDÉS');
    this.modal?.megnyitas();
    await this._kovetkezoOldalBetoltese();
    console.log('HozzajarulokModal.megnyitas - VÉGE');
  }

  // ===== BEZÁRÁS =====
  bezaras() {
    this.modal?.bezaras();
  }

  // ===== „TÖBB BETÖLTÉSE" GOMB BEKÖTÉSE =====
  _tobbGombBekotese() {
    const gomb = document.getElementById('hozzajarulok-modal-tobb-gomb');
    gomb?.addEventListener('click', () => this._kovetkezoOldalBetoltese());
  }

  // ===== KÖVETKEZŐ OLDAL MÉRETE =====
  // Első betöltés: 10, második: 40, utána: 50.
  _kovetkezoOldalMeret() {
    return OLDAL_MERETEK[this.betoltesekSzama] ?? TOVABBI_MERET;
  }

  // ===== KÖVETKEZŐ OLDAL BETÖLTÉSE =====
  async _kovetkezoOldalBetoltese() {
    if (this.betoltFolyamatban || !this.tobbVanE) return;

    this.betoltFolyamatban = true;
    const limit = this._kovetkezoOldalMeret();

    console.log('HozzajarulokModal._kovetkezoOldalBetoltese - KEZDÉS', {
      limit, skip: this.betoltottSzam
    });

    // Vizuális jelzés a betöltésről
    this.modal.betoltesBeallitasa(true);
    this._tobbGombBetoltesAllapot();

    try {
      const valasz = await apiGet(
        `tudatpont/hozzajarulok/${this.entitasTipus}/${this.entitasId}?limit=${limit}&skip=${this.betoltottSzam}`,
        this.token
      );
      this.modal.betoltesBeallitasa(false);

      const lista = valasz?.data ?? [];
      this._sorokHozzafuzese(lista);

      this.betoltottSzam += lista.length;
      this.betoltesekSzama++;

      // Ha kevesebb jött, mint amennyit kértünk, nincs több betöltendő
      if (lista.length < limit) this.tobbVanE = false;

      // Üres állapot jelzése (csak ha egyáltalán nincs hozzájáruló)
      if (this.betoltottSzam === 0) {
        const ures = document.getElementById('hozzajarulok-modal-ures');
        if (ures) ures.hidden = false;
      }

      this._tobbGombFrissitese();

      console.log('HozzajarulokModal._kovetkezoOldalBetoltese - VÉGE', {
        kapott: lista.length, betoltottSzam: this.betoltottSzam, tobbVanE: this.tobbVanE
      });
    } catch (hiba) {
      console.error('HozzajarulokModal._kovetkezoOldalBetoltese - HIBA', hiba.message);
      this.modal.hibaBeallitasa(hiba.message ?? 'A hozzájárulók betöltése sikertelen.');
      this._tobbGombFrissitese();
    } finally {
      this.betoltFolyamatban = false;
    }
  }

  // ===== SOROK HOZZÁFŰZÉSE A LISTÁHOZ =====
  // Egy sor felépítése:  [név] [szerep-jelvény] ............ [tudatpont 🌟]
  // A név és a jelvény közös csoportba kerül, így a pont marad a sor jobb szélén.
  _sorokHozzafuzese(lista) {
    const listaElem = document.getElementById('hozzajarulok-modal-lista');
    if (!listaElem) return;

    lista.forEach((hozzarendeles) => {
      const li = document.createElement('li');
      li.className = 'hozzajarulok-modal__elem';

      // --- Bal oldal: név + részvételi szerep jelvénye ---
      const nevCsoport = document.createElement('span');
      nevCsoport.className = 'hozzajarulok-modal__nev-csoport';

      const nevElem = document.createElement('span');
      nevElem.className   = 'hozzajarulok-modal__nev';
      nevElem.textContent = hozzarendeles?.eemberId?.eemberNev ?? '(névtelen)';

      nevCsoport.appendChild(nevElem);
      nevCsoport.appendChild(this._szerepJelveny(hozzarendeles?.szerep));

      // --- Jobb oldal: a hozzárendelt tudatpont ---
      const pontElem = document.createElement('span');
      pontElem.className   = 'hozzajarulok-modal__pont';
      pontElem.textContent = `${(hozzarendeles?.tudatPontok ?? 0).toLocaleString('hu-HU')} 🌟`;

      li.appendChild(nevCsoport);
      li.appendChild(pontElem);
      listaElem.appendChild(li);
    });
  }

  // ===== SZEREP-JELVÉNY LÉTREHOZÁSA (PASSZÍV / AKTÍV) =====
  // A hozzárendelés `szerep` mezőjéből épít egy kis jelvényt a név mellé.
  //  - 'aktiv'  → „aktív" (résztvevő): BELESZÁMÍT a szavazások részvételi arányába.
  //  - minden más ('passziv', null, hiányzó mező) → „passzív" (figyelő).
  // A hiányzó érték szándékosan passzívnak számít: a domain alapértelmezése is ez
  // (lásd a tudatpontHozzarendeles séma `szerep` mezőjét), így a régi, még szerep
  // nélküli hozzárendelések sem jelennek meg tévesen aktívként.
  // @param {string|undefined} szerep - a hozzárendelés szerep mezője
  // @returns {HTMLElement} a kész jelvény-elem
  _szerepJelveny(szerep) {
    const aktivE = (szerep === 'aktiv');

    const elem = document.createElement('span');
    elem.className = aktivE
      ? 'hozzajarulok-modal__szerep hozzajarulok-modal__szerep--aktiv'
      : 'hozzajarulok-modal__szerep hozzajarulok-modal__szerep--passziv';
    elem.textContent = aktivE ? 'aktív' : 'passzív';

    // Egérrel fölé állva a jelentés is előjön (a jelmagyarázat rövidített párja)
    elem.title = aktivE
      ? 'Aktív (résztvevő): beleszámít a szavazások részvételi arányába.'
      : 'Passzív (figyelő): csak figyel és prioritást jelez, nem számít a részvételi arányba.';

    return elem;
  }

  // ===== „TÖBB" GOMB – BETÖLTÉS ALATTI ÁLLAPOT =====
  _tobbGombBetoltesAllapot() {
    const gomb = document.getElementById('hozzajarulok-modal-tobb-gomb');
    if (!gomb) return;
    gomb.disabled    = true;
    gomb.textContent = 'Betöltés…';
  }

  // ===== „TÖBB" GOMB FRISSÍTÉSE A LAPOZÁS ÁLLAPOTA ALAPJÁN =====
  _tobbGombFrissitese() {
    const gomb = document.getElementById('hozzajarulok-modal-tobb-gomb');
    if (!gomb) return;

    if (!this.tobbVanE) {
      gomb.hidden = true;
      return;
    }

    gomb.hidden      = false;
    gomb.disabled    = false;
    gomb.textContent = `Még ${this._kovetkezoOldalMeret()} betöltése`;
  }
}

// ===== EXPORTÁLÁS =====
export default HozzajarulokModal;
