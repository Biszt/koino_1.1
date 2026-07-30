// frontend/js/components/MeghivoKodForm.js

// ── IMPORTOK ──
import { apiGet } from '../utils/apiHelper.js';  // Kód-ellenőrzéshez

// ── MEGHÍVÓ KÓD FORM OSZTÁLY ──
// Felelőssége: a regisztráció 1. LÉPÉSE — a meghívó kód bekérése és ellenőrzése.
//   1. Eseménykezelő rákötése a már DOM-ban lévő űrlapra
//   2. A beírt kód ellenőrzése a backenden (GET /api/meghivo/ellenorzes/:kod)
//   3. Érvényes kód esetén sikerCallback({ kod, meghivottNev }) — a main.js
//      ezután a regisztrációs űrlapot nyitja meg a névvel előre kitöltve.
//   4. Érvénytelen kód esetén hibaüzenet.
// A RegisztracioForm/BejelentkezesForm mintáját követi (validáció, töltés, hibák).
class MeghivoKodForm {

  // ── KONSTRUKTOR ──
  // param Function sikerCallback - érvényes kód után hívódik, megkapja: { kod, meghivottNev }
  constructor(sikerCallback) {
    console.log('MeghivoKodForm.constructor - KEZDÉS', { vanSikerCallback: typeof sikerCallback === 'function' });

    // Érvényes kód után ezt hívjuk meg — main.js adja át
    this.sikerCallback = sikerCallback;

    // Töltés közbeni állapot — megakadályozza a dupla küldést
    this.toltesBan = false;

    console.log('MeghivoKodForm.constructor - VÉGE');
  }

  // ── INIT ──
  // Eseménykezelő rákötése a DOM-ban lévő űrlapra.
  init() {
    console.log('MeghivoKodForm.init - KEZDÉS');

    const form = document.getElementById('meghivo-kod-form');
    if (form) {
      form.addEventListener('submit', (esemeny) => this._submitKezeles(esemeny));
    }

    console.log('MeghivoKodForm.init - VÉGE', { formTalalt: !!form });
  }

  // ── SUBMIT KEZELÉS ──
  // param Event esemeny
  async _submitKezeles(esemeny) {
    console.log('MeghivoKodForm._submitKezeles - KEZDÉS');

    // Megakadályozzuk az oldal újratöltését
    esemeny.preventDefault();

    // Ha már folyamatban van egy kérés, megállunk
    if (this.toltesBan) {
      console.log('MeghivoKodForm._submitKezeles - VÉGE (már töltés alatt)');
      return;
    }

    // A kód kiolvasása, egységesen nagybetűsre (a backend úgyis nagybetűvel tárol)
    const kod = document.getElementById('meghivo-kod-bemenet')?.value?.trim()?.toUpperCase() || '';

    // Előző hibaüzenetek törlése
    this._hibakTorlese();

    // Kliens oldali validáció — üres kódnál nem küldünk kérést
    if (!kod) {
      this._mezohibaBeallitasa('mezo-meghivo-kod', true);
      console.log('MeghivoKodForm._submitKezeles - VÉGE (üres kód)');
      return;
    }

    // Töltési állapot bekapcsolása — gomb letiltva
    this._toltesBaAllitas(true);

    try {
      // ── KÓD ELLENŐRZÉSE ──
      // GET /api/meghivo/ellenorzes/:kod — nyilvános végpont, nem kell token
      const valasz = await apiGet(`meghivo/ellenorzes/${encodeURIComponent(kod)}`);

      if (valasz?.ervenyes) {
        // Érvényes kód — továbbadjuk a kódot és a meghívott nevét a main.js-nek
        console.log('MeghivoKodForm._submitKezeles - VÉGE (érvényes kód)');
        if (typeof this.sikerCallback === 'function') {
          this.sikerCallback({ kod, meghivottNev: valasz.meghivottNev });
        }
      } else {
        // Érvénytelen / felhasznált / visszavont kód
        this._mezohibaBeallitasa('mezo-meghivo-kod', true);
        this._altalanosHibaMutatasa('Ez a meghívó kód érvénytelen, vagy már felhasználták.');
        console.log('MeghivoKodForm._submitKezeles - VÉGE (érvénytelen kód)');
      }
    } catch (hiba) {
      // Hálózati vagy szerverhiba
      this._altalanosHibaMutatasa(hiba.message);
      console.log('MeghivoKodForm._submitKezeles - VÉGE (API hiba)', { hiba: hiba.message });
    } finally {
      // Töltési állapot kikapcsolása — siker és hiba esetén egyaránt
      this._toltesBaAllitas(false);
    }
  }

  // ── MEZŐHIBA BEÁLLÍTÁSA ──
  // param string mezoId - A .form-mezo div ID-ja
  // param boolean hibas
  _mezohibaBeallitasa(mezoId, hibas) {
    const mezo = document.getElementById(mezoId);
    if (mezo) {
      mezo.classList.toggle('form-mezo--hiba', hibas);
    }
  }

  // ── ÁLTALÁNOS HIBAZENET ──
  // param string uzenet
  _altalanosHibaMutatasa(uzenet) {
    const hibaElem = document.getElementById('meghivo-kod-altalanos-hiba');
    if (hibaElem) {
      hibaElem.textContent = uzenet;
    }
  }

  // ── HIBÁK TÖRLÉSE ──
  _hibakTorlese() {
    const altalanosHiba = document.getElementById('meghivo-kod-altalanos-hiba');
    if (altalanosHiba) altalanosHiba.textContent = '';
    this._mezohibaBeallitasa('mezo-meghivo-kod', false);
  }

  // ── TÖLTÉSI ÁLLAPOT ──
  // param boolean toltes
  _toltesBaAllitas(toltes) {
    console.log('MeghivoKodForm._toltesBaAllitas - KEZDÉS/VÉGE', { toltes });

    this.toltesBan = toltes;

    const gomb = document.getElementById('btn-meghivo-kod-tovabb');
    if (gomb) {
      gomb.disabled = toltes;
      gomb.classList.toggle('btn--toltes', toltes);
      gomb.textContent = toltes ? 'Ellenőrzés...' : 'Tovább';
    }
  }
}

// ── EXPORTÁLÁS ──
export default MeghivoKodForm;
