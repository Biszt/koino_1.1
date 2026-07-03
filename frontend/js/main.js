// frontend/js/main.js

// ===== IMPORTOK =====
import BejelentkezesForm from './components/BejelentkezesForm.js';
import RegisztracioForm from './components/RegisztracioForm.js';
import FoOldal from './components/foOldal.js';
import { tokenMentese, eemberMentese, tokenTorlese, beVanJelentkezve, tokenLekerese } from './utils/authHelper.js';

// Token tárolása memóriában
let aktvToken = null;

// ===== OLDAL BETÖLTÉSE =====
// Egy HTML komponens fájlt tölt be közvetlenül az #app div-be.
// A pages/ réteg megszűnt – a komponens HTML megy egyenesen az #app-ba.
// @param {string} utvonal – pl. './html/components/bejelentkezesForm.html'
// @returns {Promise<boolean>} – true: sikeres | false: hiba
async function oldalBetoltese(utvonal) {
  console.log('main.oldalBetoltese - KEZDÉS', { utvonal });

  // Az #app div megkeresése – ez az egyetlen fix pont az index.html-ben
  const appDiv = document.getElementById('app');
  if (!appDiv) {
    console.error('main.oldalBetoltese - HIBA: #app div nem található');
    return false;
  }

  try {
    // HTML fájl letöltése a szerverről
    const valasz = await fetch(utvonal);

    if (!valasz.ok) {
      throw new Error(`Nem sikerült betölteni: ${utvonal} (${valasz.status})`);
    }

    // A letöltött HTML beillesztése közvetlenül az #app-ba
    const htmlSzoveg = await valasz.text();
    appDiv.innerHTML = htmlSzoveg;

    console.log('main.oldalBetoltese - VÉGE', { utvonal, sikeres: true });
    return true;

  } catch (hiba) {
    console.error('main.oldalBetoltese - VÉGE (hiba)', { hiba: hiba.message });
    return false;
  }
}

// ===== FŐOLDAL MEGJELENÍTÉSE =====
// A foOldalForm.html komponenst tölti be az #app-ba, majd inicializálja a JS osztályt.
// @param {string} token  – JWT token az API hívásokhoz
// @param {Object} eember – bejelentkezett eember adatai
async function foOldalMegjelenites(token, eember) {
  console.log('main.foOldalMegjelenites - KEZDÉS', { eemberNev: eember?.eemberNev });

  try {
    // 1 lépés: a komponens HTML betöltése közvetlenül az #app-ba
    const sikerult = await oldalBetoltese('./html/components/foOldalForm.html');
    if (!sikerult) return;

    // 2. FoOldal JS osztály inicializálása
    const foOldal = new FoOldal(token);
    foOldal.init();

  } catch (hiba) {
    console.error('main.foOldalMegjelenites - HIBA', { hiba: hiba.message });
  }

  console.log('main.foOldalMegjelenites - VÉGE', { eemberNev: eember?.eemberNev });
}

// ===== SIKERES BEJELENTKEZÉS =====
// A bejelentkezés vagy regisztráció után hívódik meg.
// Elmenti a tokent és az eembert, majd betölti a főoldalt.
function sikeresBejelentkezes(token, eember) {
  console.log('main.sikeresBejelentkezes - KEZDÉS', { eemberNev: eember?.eemberNev });

  // Token és eember adatok mentése memóriába
  aktvToken = token;
  tokenMentese(token);
  eemberMentese(eember);

  // Főoldal megjelenítése
  foOldalMegjelenites(token, eember);

  console.log('main.sikeresBejelentkezes - VÉGE', { eemberNev: eember?.eemberNev });
}

// ===== REGISZTRÁCIÓS OLDAL MEGJELENÍTÉSE =====
// A regisztracioForm.html komponenst tölti be az #app-ba.
async function regisztracioMegjelenites() {
  console.log('main.regisztracioMegjelenites - KEZDÉS');

  try {
    // 1 lépés: a komponens HTML betöltése közvetlenül az #app-ba
    const sikerult = await oldalBetoltese('./html/components/regisztracioForm.html');
    if (!sikerult) return;

    // 2. RegisztracioForm JS osztály inicializálása
    const regisztracioForm = new RegisztracioForm(sikeresBejelentkezes);
    regisztracioForm.init();

    // 3. "Már van fiókod? Bejelentkezés" link figyelése
    const bejelentkezesLink = document.getElementById('bejelentkezes-link');
    if (bejelentkezesLink) {
      bejelentkezesLink.addEventListener('click', (e) => {
        e.preventDefault();
        alkalmazasInditasa();
      });
    }

  } catch (hiba) {
    console.error('main.regisztracioMegjelenites - HIBA', { hiba: hiba.message });
  }

  console.log('main.regisztracioMegjelenites - VÉGE');
}

// ===== AZ ALKALMAZÁS INDÍTÁSA =====
// Belépési pont: megnézi, be van-e jelentkezve az eember.
// Ha igen → főoldal, ha nem → bejelentkezési form.
async function alkalmazasInditasa() {
  console.log('main.alkalmazasInditasa - KEZDÉS');

  // Ellenőrzés: van-e mentett token (memóriában vagy localStorage-ban)?
  if (beVanJelentkezve()) {
    // Van token – betöltjük a főoldalt bejelentkezés nélkül
    console.log('main.alkalmazasInditasa - token megtalálva, főoldal betöltése');
    const mentettToken = tokenLekerese();
    await foOldalMegjelenites(mentettToken, null);
    console.log('main.alkalmazasInditasa - VÉGE (főoldal)');
    return;
  }

  // Nincs token – megjelenítjük a bejelentkezési formot
  console.log('main.alkalmazasInditasa - nincs token, bejelentkezési form betöltése');
  aktvToken = null;
  tokenTorlese();

  try {
    // 1 lépés: a komponens HTML betöltése közvetlenül az #app-ba
    const sikerult = await oldalBetoltese('./html/components/bejelentkezesForm.html');
    if (!sikerult) return;

    // 2. BejelentkezesForm JS osztály inicializálása
    const bejelentkezesForm = new BejelentkezesForm(sikeresBejelentkezes);
    bejelentkezesForm.init();

    // 3. "Regisztráció" link figyelése
    const regisztracioLink = document.getElementById('regisztracio-link');
    if (regisztracioLink) {
      regisztracioLink.addEventListener('click', (e) => {
        e.preventDefault();
        regisztracioMegjelenites();
      });
    }

  } catch (hiba) {
    console.error('main.alkalmazasInditasa - HIBA', { hiba: hiba.message });
  }

  console.log('main.alkalmazasInditasa - VÉGE (bejelentkezés)');
}

// ===== INDÍTÁS =====
// DOM betöltése után indul az alkalmazás
document.addEventListener('DOMContentLoaded', alkalmazasInditasa);