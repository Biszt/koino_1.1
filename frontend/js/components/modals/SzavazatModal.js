// frontend/js/components/modals/SzavazatModal.js

// ===== IMPORTOK =====
import Modal from './Modal.js';
import { apiGet, apiPost, apiDelete } from '../../utils/apiHelper.js';
import { tokenLekerese } from '../../utils/authHelper.js';

// A szavazat típusok emberi megjelenítése (a backend enum értékeihez).
// Egy helyen tartjuk, hogy a gombok és az üzenetek egységesek legyenek.
const SZAVAZAT_FELIRATOK = {
  Tamogat:     'Támogatom',
  Ellenez:     'Ellenzem',
  Tartozkodik: 'Tartózkodom'
};

// ===== SZAVAZAT MODAL OSZTÁLY =====
// Felelősség: egy javaslatra szavazás felülete.
//  1. Megnyitáskor lekéri az eember korábbi szavazatát és kiemeli.
//  2. A három gomb egyikére kattintva leadja / módosítja a szavazatot.
//  3. Ha van leadott szavazat, felajánlja a visszavonását.
// Használják: JavaslatKartya (hamburger menü „Szavazat leadása" pontja).
class SzavazatModal {

  // ===== KONSTRUKTOR =====
  // @param {string} kontenerAzonosito - a modal konténer div ID-ja
  // @param {Object} beallitasok
  // @param {Object} beallitasok.entitasAdatok - { entitasId, adatok } a javaslat kártyából
  // @param {Function} beallitasok.onSiker - a pakli újratöltésére hívjuk, ha változott a szavazat
  constructor(kontenerAzonosito, beallitasok = {}) {
    console.log('SzavazatModal.constructor - KEZDÉS', {
      kontenerAzonosito,
      javaslatId: beallitasok?.entitasAdatok?.entitasId
    });

    this.kontenerAzonosito = kontenerAzonosito;
    this.token             = tokenLekerese();
    this.entitasAdatok     = beallitasok.entitasAdatok ?? null;
    this.onSiker           = beallitasok.onSiker        ?? null;

    // A javaslat azonosítója, amire szavazunk
    this.javaslatId = this.entitasAdatok?.entitasId ?? null;

    // A eember jelenlegi szavazata ('Tamogat' | 'Ellenez' | 'Tartozkodik' | null)
    this.jelenlegiSzavazat = null;

    // Igaz, ha a modal élettartama alatt bármit szavaztunk vagy visszavontunk —
    // bezáráskor ez alapján töltjük-e újra a paklit
    this.valtozottE = false;

    this.modal = null;

    console.log('SzavazatModal.constructor - VÉGE', { javaslatId: this.javaslatId });
  }

  // ===== INICIALIZÁLÁS =====
  async init() {
    console.log('SzavazatModal.init - KEZDÉS');

    const tartalomHtml = await this._templateBetoltese();
    if (!tartalomHtml) return;

    this.modal = new Modal(this.kontenerAzonosito, {
      cim:      'Szavazat leadása',
      tartalom: tartalomHtml,
      meret:    'szuk',
      gombok:   [],
      onBezaras: () => {
        // Ha a modal alatt változott a szavazat, frissítsük a paklit,
        // hogy a kártya a helyes állapotot mutassa (az arányokat a cron frissíti).
        if (this.valtozottE && typeof this.onSiker === 'function') {
          this.onSiker();
        }
        console.log('SzavazatModal - modal bezárva', { valtozottE: this.valtozottE });
      }
    });

    await this.modal.init();

    // Eseménykezelők bekötése a body gombjaira
    this._szavazoGombokBekotese();
    this._visszavonasGombBekotese();

    console.log('SzavazatModal.init - VÉGE');
  }

  // ===== TEMPLATE BETÖLTÉSE =====
  async _templateBetoltese() {
    console.log('SzavazatModal._templateBetoltese - KEZDÉS');
    try {
      const valasz = await fetch('./html/components/modals/szavazatModal.html');
      if (!valasz.ok) {
        console.error('SzavazatModal._templateBetoltese - HIBA: template nem található', {
          statusz: valasz.status
        });
        return null;
      }
      const htmlSzoveg = await valasz.text();
      console.log('SzavazatModal._templateBetoltese - VÉGE: sikeres betöltés');
      return htmlSzoveg;
    } catch (hiba) {
      console.error('SzavazatModal._templateBetoltese - VÉGE: kivétel', hiba.message);
      return null;
    }
  }

  // ===== MEGNYITÁS =====
  // A modal megjelenítése, majd a korábbi szavazat lekérése és kiemelése.
  async megnyitas() {
    console.log('SzavazatModal.megnyitas - KEZDÉS');

    this.modal?.megnyitas();

    // A korábbi szavazatot a megnyitás után töltjük be, hogy a gombok
    // már a DOM-ban legyenek a kiemeléshez
    await this._sajatSzavazatBetoltese();

    console.log('SzavazatModal.megnyitas - VÉGE');
  }

  // ===== BEZÁRÁS =====
  bezaras() {
    console.log('SzavazatModal.bezaras - KEZDÉS');
    this.modal?.bezaras();
    console.log('SzavazatModal.bezaras - VÉGE');
  }

  // ===== SAJÁT SZAVAZAT BETÖLTÉSE =====
  // Lekéri a bejelentkezett eember korábbi szavazatát ezen a javaslaton,
  // és kiemeli a megfelelő gombot. Ha nincs, a gombok semleges állapotban maradnak.
  async _sajatSzavazatBetoltese() {
    console.log('SzavazatModal._sajatSzavazatBetoltese - KEZDÉS', { javaslatId: this.javaslatId });

    if (!this.javaslatId) {
      console.warn('SzavazatModal._sajatSzavazatBetoltese - nincs javaslatId');
      return;
    }

    try {
      const valasz = await apiGet(`javaslat/${this.javaslatId}/sajat-szavazat`, this.token);
      // A data null, ha még nem szavazott
      this.jelenlegiSzavazat = valasz?.data?.szavazatTipus ?? null;
      this._kivalasztottGombFrissitese();

      console.log('SzavazatModal._sajatSzavazatBetoltese - VÉGE', {
        jelenlegiSzavazat: this.jelenlegiSzavazat
      });
    } catch (hiba) {
      // A korábbi szavazat lekérése nem kritikus: a szavazás enélkül is működik,
      // csak a kiemelés marad el. Ezért csak jelezzük, nem szakítjuk meg.
      console.error('SzavazatModal._sajatSzavazatBetoltese - HIBA', hiba.message);
    }
  }

  // ===== SZAVAZÓ GOMBOK BEKÖTÉSE =====
  _szavazoGombokBekotese() {
    console.log('SzavazatModal._szavazoGombokBekotese - KEZDÉS');

    const kontener = document.getElementById(this.kontenerAzonosito);
    const gombok   = kontener?.querySelectorAll('.szavazat-modal__gomb');

    gombok?.forEach((gomb) => {
      gomb.addEventListener('click', () => {
        const tipus = gomb.dataset.szavazat;
        console.log('SzavazatModal - szavazó gomb kattintás', { tipus });
        this._szavazas(tipus);
      });
    });

    console.log('SzavazatModal._szavazoGombokBekotese - VÉGE', { gombokSzama: gombok?.length });
  }

  // ===== VISSZAVONÁS GOMB BEKÖTÉSE =====
  _visszavonasGombBekotese() {
    console.log('SzavazatModal._visszavonasGombBekotese - KEZDÉS');

    const kontener = document.getElementById(this.kontenerAzonosito);
    const gomb     = kontener?.querySelector('.szavazat-modal__visszavonas-gomb');

    gomb?.addEventListener('click', () => {
      console.log('SzavazatModal - visszavonás gomb kattintás');
      this._visszavonas();
    });

    console.log('SzavazatModal._visszavonasGombBekotese - VÉGE');
  }

  // ===== SZAVAZÁS =====
  // Leadja vagy módosítja a szavazatot a kiválasztott típussal.
  // @param {string} tipus - 'Tamogat' | 'Ellenez' | 'Tartozkodik'
  async _szavazas(tipus) {
    console.log('SzavazatModal._szavazas - KEZDÉS', { tipus, javaslatId: this.javaslatId });

    this.modal.hibaTisztitasa();
    this.modal.betoltesBeallitasa(true);

    try {
      const eredmeny = await apiPost('javaslat/szavazat', {
        javaslatId:   this.javaslatId,
        szavazatTipus: tipus
      }, this.token);

      this.modal.betoltesBeallitasa(false);

      // Állapot frissítése és a felület igazítása
      this.jelenlegiSzavazat = tipus;
      this.valtozottE        = true;
      this._kivalasztottGombFrissitese();

      // A backend részletes üzenete (benne az „1 percen belül frissül" jelzés,
      // töredékjavaslatnál a hány töredékre ment el a szavazat)
      const uzenet = eredmeny?.data?.uzenet ?? 'Szavazat sikeresen leadva.';
      this._uzenetMegjelenitese(uzenet);

      console.log('SzavazatModal._szavazas - VÉGE: sikeres', { tipus });

    } catch (hiba) {
      console.error('SzavazatModal._szavazas - HIBA', hiba.message);
      this.modal.hibaBeallitasa(hiba.message ?? 'A szavazat leadása sikertelen.');
    }
  }

  // ===== VISSZAVONÁS =====
  // Visszavonja az eember szavazatát erről a javaslatról.
  async _visszavonas() {
    console.log('SzavazatModal._visszavonas - KEZDÉS', { javaslatId: this.javaslatId });

    this.modal.hibaTisztitasa();
    this.modal.betoltesBeallitasa(true);

    try {
      const eredmeny = await apiDelete('javaslat/szavazat', {
        javaslatId: this.javaslatId
      }, this.token);

      this.modal.betoltesBeallitasa(false);

      // Állapot frissítése: nincs többé leadott szavazat
      this.jelenlegiSzavazat = null;
      this.valtozottE        = true;
      this._kivalasztottGombFrissitese();

      const uzenet = eredmeny?.message ?? 'Szavazat sikeresen visszavonva.';
      this._uzenetMegjelenitese(uzenet);

      console.log('SzavazatModal._visszavonas - VÉGE: sikeres');

    } catch (hiba) {
      console.error('SzavazatModal._visszavonas - HIBA', hiba.message);
      this.modal.hibaBeallitasa(hiba.message ?? 'A szavazat visszavonása sikertelen.');
    }
  }

  // ===== KIVÁLASZTOTT GOMB FRISSÍTÉSE =====
  // A jelenlegi szavazat alapján kiemeli a megfelelő gombot, és
  // megmutatja / elrejti a visszavonás gombot.
  _kivalasztottGombFrissitese() {
    console.log('SzavazatModal._kivalasztottGombFrissitese - KEZDÉS', {
      jelenlegiSzavazat: this.jelenlegiSzavazat
    });

    const kontener = document.getElementById(this.kontenerAzonosito);
    if (!kontener) return;

    // Minden gombról levesszük a kiemelést, majd a jelenlegire visszatesszük
    const gombok = kontener.querySelectorAll('.szavazat-modal__gomb');
    gombok.forEach((gomb) => {
      const kivalasztott = gomb.dataset.szavazat === this.jelenlegiSzavazat;
      gomb.classList.toggle('szavazat-modal__gomb--kivalasztott', kivalasztott);
      gomb.setAttribute('aria-pressed', kivalasztott ? 'true' : 'false');
    });

    // Visszavonás gomb csak akkor látszik, ha van leadott szavazat
    const visszavonasGomb = kontener.querySelector('.szavazat-modal__visszavonas-gomb');
    if (visszavonasGomb) {
      visszavonasGomb.hidden = !this.jelenlegiSzavazat;
    }

    console.log('SzavazatModal._kivalasztottGombFrissitese - VÉGE');
  }

  // ===== ÜZENET MEGJELENÍTÉSE =====
  // Zöld sikerüzenetet mutat a gombok alatt (nem hiba — a Modal hiba sávjától külön).
  // @param {string} szoveg
  _uzenetMegjelenitese(szoveg) {
    console.log('SzavazatModal._uzenetMegjelenitese - KEZDÉS', { szoveg });

    const kontener  = document.getElementById(this.kontenerAzonosito);
    const uzenetElem = kontener?.querySelector('.szavazat-modal__uzenet');
    if (!uzenetElem) return;

    uzenetElem.textContent = szoveg;
    uzenetElem.hidden = false;

    console.log('SzavazatModal._uzenetMegjelenitese - VÉGE');
  }
}

// ===== EXPORTÁLÁS =====
export default SzavazatModal;
