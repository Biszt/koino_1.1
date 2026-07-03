// frontend/js/components/BejelentkezesForm.js

// =============================================
// KOINO – Bejelentkezési Form logika
// NEM tartalmaz HTML-t – azt a bejelentkezes.html adja.
// Felelőssége:
// 1. Eseménykezelők rákötése a már DOM-ban lévő elemekre
// 2. Kliens oldali validáció
// 3. API hívás (apiHelper segítségével)
// 4. Token + eember mentése (authHelper segítségével)
// 5. Hibaüzenetek kezelése
// 6. Sikeres bejelentkezés után callback hívása
// =============================================

import { apiPost } from '../utils/apiHelper.js';
import { tokenMentese, eemberMentese } from '../utils/authHelper.js';

class BejelentkezesForm {

  /**
   * @param {Function} sikerCallback - Sikeres bejelentkezés után hívódik meg,
   * megkapja az eember objektumot
   */
  constructor(sikerCallback) {
    // Metódus kezdő log
    console.log('BejelentkezesForm.constructor - KEZDÉS', {
      vanSikerCallback: typeof sikerCallback === 'function',
    });

    // Sikeres bejelentkezés után ezt hívjuk meg (main.js adja át)
    this.sikerCallback = sikerCallback;

    // Töltés közbeni állapot – megakadályozza a dupla küldést
    this.toltesBan = false;

    // Metódus vég log
    console.log('BejelentkezesForm.constructor - VÉGE');
  }

  /**
   * Eseménykezelők rákötése a DOM elemekre.
   * Ezt AKKOR hívjuk, amikor a bejelentkezes.html már az #app-ban van.
   */
  init() {
    // Metódus kezdő log
    console.log('BejelentkezesForm.init - KEZDÉS');

    // Form megkeresése és submit esemény rákötése
    const form = document.getElementById('bejelentkezes-form');
    if (form) {
      // Arrow function: a 'this' a BejelentkezesForm példányra mutat
      form.addEventListener('submit', (esemeny) => this._submitKezeles(esemeny));
    }

    // Metódus vég log
    console.log('BejelentkezesForm.init - VÉGE', { formTalalt: !!form });
  }

  /**
   * Form beküldés kezelése
   * @param {Event} esemeny
   * @private
   */
  async _submitKezeles(esemeny) {
    // Metódus kezdő log
    console.log('BejelentkezesForm._submitKezeles - KEZDÉS');

    // Megakadályozzuk az oldal újratöltését
    esemeny.preventDefault();

    // Ha már folyamatban van egy kérés, megállunk
    if (this.toltesBan) {
      console.log('BejelentkezesForm._submitKezeles - VÉGE (már töltés alatt)');
      return;
    }

    // azonosito: a HTML input id="azonosito" mezőből olvassuk ki
    // Lehet email cím VAGY eemberNev – a backend dönti el
    const azonosito = document.getElementById('azonosito')?.value?.trim() || '';
    const jelszo = document.getElementById('jelszo')?.value || '';

    // Előző hibaüzenetek törlése
    this._hibakTorlese();

    // Kliens oldali validáció – ha hibás, nem küldünk kérést
    if (!this._validacio(azonosito, jelszo)) {
      console.log('BejelentkezesForm._submitKezeles - VÉGE (validáció sikertelen)');
      return;
    }

    // Töltési állapot bekapcsolása (gomb letiltva)
    this._toltesBaAllitas(true);

    try {
      // API hívás: POST /api/eember/bejelentkezes
      // azonosito mezőt küldjük – a backend eldönti, email vagy eemberNev
      const valasz = await apiPost('/eember/bejelentkezes', { azonosito, jelszo });

      // Siker: token és eember adatok mentése memóriába
      tokenMentese(valasz.token);
      eemberMentese(valasz.eember);

      // Metódus vég log – siker
      console.log('BejelentkezesForm._submitKezeles - VÉGE (siker)', {
        eemberNev: valasz.eember?.eemberNev,
      });

      // Callback hívása – main.js kezeli a továbbiakat
        // token és eember együtt kerül átadásra, hogy a főoldal API hívásokhoz használhassa
        if (typeof this.sikerCallback === 'function') {
        this.sikerCallback(valasz.token, valasz.eember);
        }

    } catch (hiba) {
      // Hibaüzenet megjelenítése a form tetején
      this._altalanosHibaMutatasa(hiba.message);

      // Metódus vég log – hiba
      console.log('BejelentkezesForm._submitKezeles - VÉGE (API hiba)', {
        hiba: hiba.message,
      });

    } finally {
      // Töltési állapot kikapcsolása – siker és hiba esetén egyaránt
      this._toltesBaAllitas(false);
    }
  }

  /**
   * Kliens oldali validáció
   * @param {string} azonosito - Email cím VAGY eemberNev
   * @param {string} jelszo
   * @returns {boolean} - true ha érvényes, false ha hibás
   * @private
   */
  _validacio(azonosito, jelszo) {
    // Metódus kezdő log
    console.log('BejelentkezesForm._validacio - KEZDÉS', {
      azonositoHossz: azonosito.length,
      jelszoHossz: jelszo.length,
    });

    let ervenyesE = true;

    // Azonosító (email vagy eemberNev) nem lehet üres
    if (!azonosito) {
      this._mezohibaBeallitasa('mezo-azonosito', true);
      ervenyesE = false;
    }

    // Jelszó nem lehet üres
    if (!jelszo) {
      this._mezohibaBeallitasa('mezo-jelszo', true);
      ervenyesE = false;
    }

    // Metódus vég log
    console.log('BejelentkezesForm._validacio - VÉGE', { ervenyesE });
    return ervenyesE;
  }

  /**
   * Egy mező hiba CSS osztályának be/kikapcsolása
   * @param {string} mezoId - A .form-mezo div ID-ja
   * @param {boolean} hibas - true = hibás, false = rendben
   * @private
   */
  _mezohibaBeallitasa(mezoId, hibas) {
    const mezo = document.getElementById(mezoId);
    if (mezo) {
      // CSS osztály togglelése – a CSS mutatja/rejti a hibaüzenetet
      mezo.classList.toggle('form-mezo--hiba', hibas);
    }
  }

  /**
   * Általános hibaüzenet megjelenítése (form tetején)
   * @param {string} uzenet
   * @private
   */
  _altalanosHibaMutatasa(uzenet) {
    const hibaElem = document.getElementById('bej-altalanos-hiba');
    if (hibaElem) {
      // A CSS :not(:empty) selector automatikusan megmutatja
      hibaElem.textContent = uzenet;
    }
  }

  /**
   * Összes hibaüzenet törlése (új próbálkozás előtt)
   * @private
   */
  _hibakTorlese() {
    // Általános hibaüzenet ürítése
    const altalanosHiba = document.getElementById('bej-altalanos-hiba');
    if (altalanosHiba) altalanosHiba.textContent = '';

    // Mező szintű hibák törlése – azonosito és jelszo mezőkhöz
    ['mezo-azonosito', 'mezo-jelszo'].forEach((id) => {
      this._mezohibaBeallitasa(id, false);
    });
  }

  /**
   * Töltési állapot – gomb letiltása/engedélyezése
   * @param {boolean} toltes
   * @private
   */
  _toltesBaAllitas(toltes) {
    // Metódus log
    console.log('BejelentkezesForm._toltesBaAllitas - KEZDÉS/VÉGE', { toltes });

    this.toltesBan = toltes;

    const gomb = document.getElementById('btn-bejelentkezes');
    if (gomb) {
      gomb.disabled = toltes;
      // CSS osztály – stílusbeli visszajelzés töltés közben
      gomb.classList.toggle('btn--toltes', toltes);
      gomb.textContent = toltes ? 'Bejelentkezés...' : 'Bejelentkezés';
    }
  }
}

export default BejelentkezesForm;