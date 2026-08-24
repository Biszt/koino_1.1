// frontend/js/components/JelszoHelyreallitasForm.js

// ===== IMPORTOK =====
import { apiGet, apiPost } from '../utils/apiHelper.js';

// ===== JELSZÓ-HELYREÁLLÍTÁS ŰRLAP =====
// Felelősség: az „elfelejtett jelszó" folyamat KÉT képernyője, egy komponensben:
//   1. KÉRÉS mód   — a bejelentkezésről érkezve: azonosító megadása, levél kérése
//   2. ÚJ JELSZÓ mód — a levélben lévő hivatkozásról érkezve: új jelszó megadása
//
// Miért egy komponensben? A két képernyő ugyanannak a folyamatnak a két vége, közös
// sablonnal és stílussal. A módot a `mod` konstruktor-paraméter dönti el.
//
// Használja: main.js (a bejelentkezés „Elfelejtetted a jelszavad?" linkje, illetve az
// URL-kapu a `?jelszo-helyreallitas=TOKEN` paraméterre).
class JelszoHelyreallitasForm {

  // @param {Object} beallitasok
  // @param {string} beallitasok.mod   - 'keres' | 'ujJelszo'
  // @param {string} beallitasok.token - a hivatkozás tokenje ('ujJelszo' módban)
  // @param {Function} beallitasok.onVissza - a bejelentkezéshez visszatérés
  constructor(beallitasok = {}) {
    console.log('JelszoHelyreallitasForm.constructor - KEZDÉS', { mod: beallitasok.mod });

    this.mod      = beallitasok.mod ?? 'keres';
    this.token    = beallitasok.token ?? null;
    this.onVissza = beallitasok.onVissza ?? null;

    console.log('JelszoHelyreallitasForm.constructor - VÉGE');
  }

  // ===== INICIALIZÁLÁS =====
  // A sablon ekkor már az #app-ban van (a main.js töltötte be).
  async init() {
    console.log('JelszoHelyreallitasForm.init - KEZDÉS', { mod: this.mod });

    // A „Vissza a bejelentkezéshez" linkek (mindkét panelen)
    document.getElementById('helyreallitas-vissza-link')
      ?.addEventListener('click', (e) => { e.preventDefault(); this._vissza(); });
    document.getElementById('helyreallitas-bejelentkezes-link')
      ?.addEventListener('click', (e) => { e.preventDefault(); this._vissza(); });

    if (this.mod === 'ujJelszo') {
      await this._ujJelszoModInditasa();
    } else {
      this._keresModInditasa();
    }

    console.log('JelszoHelyreallitasForm.init - VÉGE');
  }

  // ===== 1. MÓD: HELYREÁLLÍTÁS KÉRÉSE =====
  _keresModInditasa() {
    console.log('JelszoHelyreallitasForm._keresModInditasa - KEZDÉS');

    this._panel('helyreallitas-keres-panel', true);

    document.getElementById('helyreallitas-keres-form')
      ?.addEventListener('submit', (e) => {
        e.preventDefault();
        this._helyreallitasKerese();
      });

    console.log('JelszoHelyreallitasForm._keresModInditasa - VÉGE');
  }

  // ----- A LEVÉL KÉRÉSE -----
  async _helyreallitasKerese() {
    console.log('JelszoHelyreallitasForm._helyreallitasKerese - KEZDÉS');

    const azonosito = document.getElementById('helyreallitas-azonosito')?.value?.trim();
    if (!azonosito) {
      this._uzenet('Add meg az e-embernevedet vagy az e-mail-címedet.', false);
      return;
    }

    const gomb = document.getElementById('helyreallitas-keres-gomb');
    if (gomb) { gomb.disabled = true; gomb.textContent = 'Küldés…'; }

    try {
      const valasz = await apiPost('eember/jelszo-helyreallitas-keres', { azonosito });

      // A válasz SZÁNDÉKOSAN ugyanaz, akár létezik a fiók, akár nem — így a felület
      // sem árulja el, ki tagja a koinónak. Ezért itt mindig „siker" jellegű üzenet jön.
      this._panel('helyreallitas-keres-panel', false);
      this._panel('helyreallitas-vege-panel', true);
      this._uzenet(valasz?.message ?? 'Elküldtük a hivatkozást, ha volt hova.', true);

      console.log('JelszoHelyreallitasForm._helyreallitasKerese - VÉGE (elküldve)');
    } catch (hiba) {
      console.error('JelszoHelyreallitasForm._helyreallitasKerese - HIBA', hiba.message);
      // Ide főleg a kérés-korlát (429) juthat el
      this._uzenet(hiba.message ?? 'A kérés nem sikerült. Próbáld újra később.', false);
      if (gomb) { gomb.disabled = false; gomb.textContent = 'Hivatkozás kérése'; }
    }
  }

  // ===== 2. MÓD: ÚJ JELSZÓ MEGADÁSA =====
  // Először MEGKÉRDEZZÜK a szervert, érvényes-e a hivatkozás. Így az e-ember nem tölt
  // ki fölöslegesen egy űrlapot, ha a hivatkozás közben lejárt vagy már felhasználta.
  async _ujJelszoModInditasa() {
    console.log('JelszoHelyreallitasForm._ujJelszoModInditasa - KEZDÉS');

    try {
      const valasz = await apiGet(`eember/jelszo-helyreallitas/${encodeURIComponent(this.token)}`);

      if (!valasz?.ervenyes) {
        // Lejárt / már felhasznált / hibás hivatkozás → nincs értelme űrlapot mutatni
        this._panel('helyreallitas-vege-panel', true);
        this._uzenet(valasz?.message ?? 'Ez a hivatkozás érvénytelen.', false);
        console.log('JelszoHelyreallitasForm._ujJelszoModInditasa - VÉGE (érvénytelen hivatkozás)');
        return;
      }

      // Érvényes → mutathatjuk az űrlapot
      this._panel('helyreallitas-ujjelszo-panel', true);

      const nevElem = document.getElementById('helyreallitas-eember-nev');
      if (nevElem && valasz.eemberNev) {
        nevElem.textContent = `Fiók: ${valasz.eemberNev}`;
      }

      document.getElementById('helyreallitas-ujjelszo-form')
        ?.addEventListener('submit', (e) => {
          e.preventDefault();
          this._ujJelszoMentese();
        });

      console.log('JelszoHelyreallitasForm._ujJelszoModInditasa - VÉGE (érvényes hivatkozás)');
    } catch (hiba) {
      console.error('JelszoHelyreallitasForm._ujJelszoModInditasa - HIBA', hiba.message);
      this._panel('helyreallitas-vege-panel', true);
      this._uzenet('A hivatkozás ellenőrzése nem sikerült. Próbáld újra később.', false);
    }
  }

  // ----- AZ ÚJ JELSZÓ MENTÉSE -----
  async _ujJelszoMentese() {
    console.log('JelszoHelyreallitasForm._ujJelszoMentese - KEZDÉS');

    const uj  = document.getElementById('helyreallitas-uj-jelszo')?.value;
    const uj2 = document.getElementById('helyreallitas-uj-jelszo2')?.value;

    if (!uj || !uj2) {
      this._uzenet('Töltsd ki mindkét jelszó-mezőt.', false);
      return;
    }
    if (uj !== uj2) {
      this._uzenet('A két jelszó nem egyezik.', false);
      return;
    }

    const gomb = document.getElementById('helyreallitas-ujjelszo-gomb');
    if (gomb) { gomb.disabled = true; gomb.textContent = 'Mentés…'; }

    try {
      const valasz = await apiPost('eember/jelszo-helyreallitas', {
        token:    this.token,
        ujJelszo: uj
      });

      if (valasz?.sikeres) {
        // Kész: az új jelszó él, a korábbi bejelentkezések mind megszűntek
        this._panel('helyreallitas-ujjelszo-panel', false);
        this._panel('helyreallitas-vege-panel', true);
        this._uzenet(valasz.message, true);
        console.log('JelszoHelyreallitasForm._ujJelszoMentese - VÉGE (siker)');
      } else {
        // Gyenge jelszó vagy időközben lejárt hivatkozás
        this._uzenet(valasz?.message ?? 'A mentés nem sikerült.', false);
        if (gomb) { gomb.disabled = false; gomb.textContent = 'Új jelszó mentése'; }
      }
    } catch (hiba) {
      console.error('JelszoHelyreallitasForm._ujJelszoMentese - HIBA', hiba.message);
      this._uzenet(hiba.message ?? 'A mentés nem sikerült. Próbáld újra később.', false);
      if (gomb) { gomb.disabled = false; gomb.textContent = 'Új jelszó mentése'; }
    }
  }

  // ===== SEGÉD: PANEL MUTATÁSA / REJTÉSE =====
  _panel(azonosito, latszik) {
    const elem = document.getElementById(azonosito);
    if (elem) elem.hidden = !latszik;
  }

  // ===== SEGÉD: ÜZENET =====
  // @param {string} szoveg - a megjelenítendő üzenet
  // @param {boolean} sikerE - true: semleges/siker jellegű, false: hiba
  _uzenet(szoveg, sikerE) {
    const elem = document.getElementById('helyreallitas-uzenet');
    if (!elem) return;
    elem.textContent = szoveg;
    elem.className = sikerE
      ? 'bejelentkezes-form__altalanos-hiba helyreallitas-uzenet--siker'
      : 'bejelentkezes-form__altalanos-hiba';
  }

  // ===== SEGÉD: VISSZA A BEJELENTKEZÉSHEZ =====
  _vissza() {
    console.log('JelszoHelyreallitasForm._vissza');
    if (typeof this.onVissza === 'function') this.onVissza();
  }
}

// ===== EXPORTÁLÁS =====
export default JelszoHelyreallitasForm;
