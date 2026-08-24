// frontend/js/main.js

// ===== IMPORTOK =====
import BejelentkezesForm from './components/BejelentkezesForm.js';
import RegisztracioForm from './components/RegisztracioForm.js';
import MeghivoKodForm from './components/MeghivoKodForm.js';
import AdatvedelmiNyilatkozatModal from './components/modals/AdatvedelmiNyilatkozatModal.js';
import FoOldal from './components/foOldal.js';
import { tokenMentese, eemberMentese, tokenTorlese, beVanJelentkezve, tokenLekerese } from './utils/authHelper.js';
import { apiGet } from './utils/apiHelper.js';

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

// ===== REGISZTRÁCIÓ INDÍTÁSA (kétlépcsős, ha meghívásos) =====
// A „Regisztráció" gomb ezt hívja. Megkérdezi a backendtől, kell-e meghívó kód
// (GET /api/meghivo/kotelezo — env-kapcsoló ÉS van-e már e-ember):
//   - ha KELL → előbb a meghívó kód lépés,
//   - ha NEM (nyílt regisztráció vagy az első, alapító e-ember) → egyből az űrlap.
async function regisztracioIndito() {
  console.log('main.regisztracioIndito - KEZDÉS');

  try {
    const valasz = await apiGet('meghivo/kotelezo');
    if (valasz?.kotelezo) {
      console.log('main.regisztracioIndito - meghívásos → kód lépés');
      await meghivoKodLepesMegjelenites();
      return;
    }
  } catch (hiba) {
    // Ha a lekérés hibázik, essünk vissza a sima regisztrációra — a backend
    // a végső őr: kötelező módban a kód nélküli regisztrációt úgyis elutasítja.
    console.error('main.regisztracioIndito - kotelezo lekérés hiba, sima regisztráció', hiba.message);
  }

  await regisztracioMegjelenites();
  console.log('main.regisztracioIndito - VÉGE');
}

// ===== MEGHÍVÓ KÓD LÉPÉS MEGJELENÍTÉSE (regisztráció 1. lépése) =====
// A meghivoKodForm.html komponenst tölti be. Érvényes kód után a regisztrációs
// űrlapot nyitja meg a meghívott nevével előre kitöltve.
async function meghivoKodLepesMegjelenites() {
  console.log('main.meghivoKodLepesMegjelenites - KEZDÉS');

  try {
    const sikerult = await oldalBetoltese('./html/components/meghivoKodForm.html');
    if (!sikerult) return;

    // Érvényes kód esetén → regisztrációs űrlap a kóddal + a névvel előre kitöltve
    const meghivoKodForm = new MeghivoKodForm(({ kod, meghivottNev }) => {
      regisztracioMegjelenites({ meghivoKod: kod, eloreKitoltottNev: meghivottNev });
    });
    meghivoKodForm.init();

    // "Már van fiókod? Bejelentkezés" link figyelése
    const bejelentkezesLink = document.getElementById('meghivo-kod-bejelentkezes-link');
    if (bejelentkezesLink) {
      bejelentkezesLink.addEventListener('click', (e) => {
        e.preventDefault();
        alkalmazasInditasa();
      });
    }
  } catch (hiba) {
    console.error('main.meghivoKodLepesMegjelenites - HIBA', { hiba: hiba.message });
  }

  console.log('main.meghivoKodLepesMegjelenites - VÉGE');
}

// ===== REGISZTRÁCIÓS OLDAL MEGJELENÍTÉSE =====
// A regisztracioForm.html komponenst tölti be az #app-ba.
// @param {Object} opciok - a meghívó kód-lépésből átadott adatok (opcionális):
//   { meghivoKod, eloreKitoltottNev } — a névvel előre kitöltve nyílik meg
async function regisztracioMegjelenites(opciok = {}) {
  console.log('main.regisztracioMegjelenites - KEZDÉS', { vanMeghivoKod: !!opciok.meghivoKod });

  try {
    // 1 lépés: a komponens HTML betöltése közvetlenül az #app-ba
    const sikerult = await oldalBetoltese('./html/components/regisztracioForm.html');
    if (!sikerult) return;

    // 2. RegisztracioForm JS osztály inicializálása (előre kitöltött adatokkal, ha van)
    const regisztracioForm = new RegisztracioForm(sikeresBejelentkezes, opciok);
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

// ===== URL-KAPU: A LEVÉLBŐL ÉRKEZŐ HIVATKOZÁSOK =====
// A koino leveleiben lévő hivatkozások a főoldalra mutatnak, egy URL-paraméterrel:
//   https://koino.hu/?email-megerosites=TOKEN
//
// MIÉRT KELL EZ: az alkalmazás indításkor eddig CSAK azt nézte, van-e mentett token,
// és ha volt, egyből a főoldalra ment. Az URL-paraméter így soha nem jutott szóhoz —
// a levélben lévő hivatkozás hatástalan maradt volna.
//
// Ezért ez a kapu a token-ellenőrzés ELŐTT fut le. Ha talál feldolgozandó
// paramétert, elvégzi a műveletet, megmutatja az eredményt, és `true`-val tér vissza
// (az indítás ilyenkor NEM megy tovább — a képernyőn lévő gomb viszi tovább).
//
// A 3. lépésben ide kerül majd a `?jelszo-helyreallitas=TOKEN` ág is.
// @returns {Promise<boolean>} true, ha kezeltünk egy hivatkozást
async function urlKapu() {
  console.log('main.urlKapu - KEZDÉS');

  const parameterek = new URLSearchParams(window.location.search);
  const megerositoToken = parameterek.get('email-megerosites');

  if (!megerositoToken) {
    console.log('main.urlKapu - VÉGE: nincs feldolgozandó paraméter');
    return false;
  }

  // A paraméter eltávolítása a címsorból — hogy egy oldal-frissítés NE próbálja
  // újra beváltani ugyanazt a (már felhasznált) hivatkozást, és hogy a token ne
  // maradjon ott a címsorban.
  window.history.replaceState({}, document.title, window.location.pathname);

  let uzenet;
  let sikeres = false;
  try {
    // NYILVÁNOS végpont — nem kell hozzá bejelentkezés (a levelet más gépen is
    // megnyithatja az e-ember).
    const valasz = await apiGet(`eember/email-megerosites/${encodeURIComponent(megerositoToken)}`);
    sikeres = valasz?.sikeres === true;
    uzenet  = valasz?.message ?? 'Ismeretlen válasz a szervertől.';
  } catch (hiba) {
    console.error('main.urlKapu - HIBA', hiba.message);
    uzenet = 'A megerősítés nem sikerült. Próbáld újra később.';
  }

  _uzenetKepernyo({
    cim:     sikeres ? 'E-mail-cím megerősítve' : 'A megerősítés nem sikerült',
    szoveg:  uzenet,
    sikeres
  });

  console.log('main.urlKapu - VÉGE', { sikeres });
  return true;
}

// ===== EGYSZERŰ ÜZENET-KÉPERNYŐ =====
// A levélből érkező műveletek eredményét mutatja, egy „Tovább a koinóra" gombbal.
// Szándékosan JS-ből épül (nincs hozzá külön HTML-sablon): egyetlen helyen használjuk,
// és a bejelentkezési űrlap stílusaira támaszkodik.
// @param {Object} adatok - { cim, szoveg, sikeres }
function _uzenetKepernyo({ cim, szoveg, sikeres }) {
  const appDiv = document.getElementById('app');
  if (!appDiv) return;

  appDiv.innerHTML = '';

  const doboz = document.createElement('div');
  doboz.className = 'uzenet-kepernyo';

  const cimElem = document.createElement('h1');
  cimElem.className   = 'uzenet-kepernyo__cim';
  cimElem.textContent = `${sikeres ? '✅' : '⚠️'} ${cim}`;

  const szovegElem = document.createElement('p');
  szovegElem.className   = 'uzenet-kepernyo__szoveg';
  szovegElem.textContent = szoveg;

  const gomb = document.createElement('button');
  gomb.type        = 'button';
  gomb.className   = 'uzenet-kepernyo__gomb';
  gomb.textContent = 'Tovább a koinóra';
  gomb.addEventListener('click', () => alkalmazasInditasa());

  doboz.appendChild(cimElem);
  doboz.appendChild(szovegElem);
  doboz.appendChild(gomb);
  appDiv.appendChild(doboz);
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

    // 3. "Regisztráció" link figyelése — kétlépcsős indító (meghívásos esetén kód előbb)
    const regisztracioLink = document.getElementById('regisztracio-link');
    if (regisztracioLink) {
      regisztracioLink.addEventListener('click', (e) => {
        e.preventDefault();
        regisztracioIndito();
      });
    }

    // 4. "Adatvédelmi nyilatkozat" link figyelése — felugró ablakban nyílik meg
    const adatvedelmiLink = document.getElementById('adatvedelmi-link');
    if (adatvedelmiLink) {
      adatvedelmiLink.addEventListener('click', (e) => {
        e.preventDefault();
        new AdatvedelmiNyilatkozatModal().megnyitas();
      });
    }

  } catch (hiba) {
    console.error('main.alkalmazasInditasa - HIBA', { hiba: hiba.message });
  }

  console.log('main.alkalmazasInditasa - VÉGE (bejelentkezés)');
}

// ===== SZÁM MEZŐK GÖRGETÉS ELLENI VÉDELME =====
// A type="number" mezőkön a böngésző fókuszált állapotban az egérgörgővel
// módosítja az értéket – ez gyakori véletlen elírás forrása volt (pl. a
// tudatpont mennyiség). Globálisan kikapcsoljuk: ha egy FÓKUSZÁLT szám-mezőn
// görgetnek, a görgetést nem engedjük az input értékére hatni (preventDefault).
// A { passive: false } azért kell, hogy a preventDefault() érvényesüljön.
document.addEventListener('wheel', (esemeny) => {
  const elem = esemeny.target;
  if (elem?.matches?.('input[type="number"]') && elem === document.activeElement) {
    esemeny.preventDefault();
  }
}, { passive: false });

// ===== INDÍTÁS =====
// DOM betöltése után indul az alkalmazás.
// ELŐBB az URL-kapu fut (levélből érkező hivatkozások), és CSAK ha az nem kezelt
// semmit, indul a szokásos folyamat (főoldal vagy bejelentkezés).
document.addEventListener('DOMContentLoaded', async () => {
  const kezelve = await urlKapu();
  if (!kezelve) await alkalmazasInditasa();
});