// frontend/js/components/RegisztracioForm.js

// ── IMPORTOK ──
import { apiPost, apiGet } from '../utils/apiHelper.js';  // API híváshoz
import { tokenMentese, eemberMentese } from '../utils/authHelper.js'; // Token és eember tároláshoz
import { autocompleteRakotese } from '../utils/lokacioHelper.js';

// ── REGISZTRÁCIÓS FORM OSZTÁLY ──
// Felelőssége:
//   1. Eseménykezelők rákötése a már DOM-ban lévő elemekre
//   2. Kliens oldali validáció
//   3. API hívás apiHelper segítségével
//   4. Token és eember mentése authHelper segítségével
//   5. Hibaüzenetek kezelése
//   6. Sikeres regisztráció után callback hívása
class RegisztracioForm {

  // ── KONSTRUKTOR ──
  // param Function sikerCallback - Sikeres regisztráció után hívódik meg, megkapja az eember objektumot
  // param Object opciok - a kétlépcsős (meghívós) regisztrációból átadott adatok:
  //   { meghivoKod, eloreKitoltottNev } — a meghívó kód-lépésből érkeznek (opcionális)
  constructor(sikerCallback, opciok = {}) {
    // Metódus kezdő log
    console.log('RegisztracioForm.constructor - KEZDÉS', {
      vanSikerCallback: typeof sikerCallback === 'function',
      vanMeghivoKod: !!opciok.meghivoKod
    });

    // Sikeres regisztráció után ezt hívjuk meg — main.js adja át
    this.sikerCallback = sikerCallback;

    // Töltés közbeni állapot — megakadályozza a dupla küldést
    this.toltesBan = false;

    // Kötelező-e a meghívó kód — az init() kérdezi le a backendtől
    // (MEGHIVAS_KOTELEZO kapcsoló); false-nál a mező rejtve marad
    this.meghivoKotelezo = false;

    // ── A KÉTLÉPCSŐS REGISZTRÁCIÓBÓL ÁTADOTT ADATOK ──
    // Ha a meghívó kód-lépésből érkeztünk, a kódot már ellenőriztük, és a
    // meghívott előre megadott nevét is ismerjük — ezeket az init() tölti be.
    this.eloreKitoltottMeghivoKod = opciok.meghivoKod || null;
    this.eloreKitoltottNev        = opciok.eloreKitoltottNev || null;

    // Metódus vég log
    console.log('RegisztracioForm.constructor - VÉGE');
  }

  // ── INIT ──
  // Eseménykezelők rákötése a DOM elemekre.
 
    init() {
    // Metódus kezdő log
    console.log('RegisztracioForm.init - KEZDÉS');

    // Form submit esemény rákötése
    const form = document.getElementById('regisztracio-form');
    if (form) {
        form.addEventListener('submit', (esemeny) => this.submitKezeles(esemeny));
    }

    // ── LOKÁCIÓ AUTOCOMPLETE RÁKÖTÉSE ──
    // Minden lokációs input megkapja a javaslat funkciót
    autocompleteRakotese('orszag',    'lokacio/orszag');     // Ország mező
    autocompleteRakotese('regio',     'lokacio/regio');      // Régió mező
    autocompleteRakotese('telepules', 'lokacio/telepules');  // Település mező

    // ── KÉTLÉPCSŐS REGISZTRÁCIÓ: ELŐRE KITÖLTÖTT ADATOK ──
    // Ha a meghívó kód-lépésből érkeztünk:
    //   - a nevet ELŐRE KITÖLTJÜK (a meghívott javíthatja, ha elgépelés volt),
    //   - a kódot a rejtett mezőbe írjuk (nem kell újra beírni), a mező rejtve marad,
    //   - a validáció szempontjából a kód „kötelező" (értéke már megvan).
    if (this.eloreKitoltottMeghivoKod) {
      const nevMezo = document.getElementById('nev');
      if (nevMezo && this.eloreKitoltottNev) {
        nevMezo.value = this.eloreKitoltottNev;
      }
      const kodMezo = document.getElementById('meghivoKod');
      if (kodMezo) {
        kodMezo.value = this.eloreKitoltottMeghivoKod;
      }
      this.meghivoKotelezo = true;
      // A látható kód-mezőt NEM mutatjuk meg — a kódot már megadta az 1. lépésben.
      console.log('RegisztracioForm.init - előre kitöltött meghívó adatok betöltve');
    } else {
      // ── MEGHÍVÓ KÓD MEZŐ MEGJELENÍTÉSE (ha kötelező) ──
      // Nem várjuk meg (nem async az init) — amint megjön a válasz, megmutatjuk
      this._meghivoMezoBeallitasa();
    }

    // Metódus vég log
    console.log('RegisztracioForm.init - VÉGE', { formTalalt: !!form });
    }

  // ── SUBMIT KEZELÉS ──
  // Form beküldés kezelése
  // param Event esemeny
  async submitKezeles(esemeny) {
    // Metódus kezdő log
    console.log('RegisztracioForm.submitKezeles - KEZDÉS');

    // Megakadályozzuk az oldal újratöltését
    esemeny.preventDefault();

    // Ha már folyamatban van egy kérés, megállunk
    if (this.toltesBan) {
      console.log('RegisztracioForm.submitKezeles - VÉGE (már töltés alatt)');
      return;
    }

    // ── MEZŐK ÉRTÉKEINEK KIOLVASÁSA ──
    const eemberNev         = document.getElementById('eemberNev')?.value?.trim();
    const nev               = document.getElementById('nev')?.value?.trim();
    const email             = document.getElementById('email')?.value?.trim();
    const jelszo            = document.getElementById('jelszo')?.value;
    const jelszoMegerosites = document.getElementById('jelszoMegerosites')?.value;
    const orszag            = document.getElementById('orszag')?.value?.trim();
    const regio             = document.getElementById('regio')?.value?.trim();
    const telepules         = document.getElementById('telepules')?.value?.trim();
    const meghivoKod        = document.getElementById('meghivoKod')?.value?.trim();

    // Előző hibaüzenetek törlése
    this.hibakTorlese();

    // Kliens oldali validáció — ha hibás, nem küldünk kérést
    if (!this.validacio(eemberNev, nev, email, jelszo, jelszoMegerosites, orszag, regio, telepules, meghivoKod)) {
      console.log('RegisztracioForm.submitKezeles - VÉGE (validáció sikertelen)');
      return;
    }

    // Töltési állapot bekapcsolása — gomb letiltva
    this.toltesBaAllitas(true);

    try {
      // ── API HÍVÁS ──
      // POST /api/eember/regisztracio
      const valasz = await apiPost('eember/regisztracio', {
        eemberNev,
        nev,
        jelszo,
        lokacio: { orszag, regio, telepules },
        // Email — OPCIONÁLIS: csak akkor kerül a kérésbe, ha ki van töltve
        // (a backend e-mail nélkül is regisztrál, és nem tárol e-mailt)
        ...(email ? { email } : {}),
        // Meghívó kód — csak akkor kerül a kérésbe, ha ki van töltve
        // (a backend csak MEGHIVAS_KOTELEZO=true esetén ellenőrzi)
        ...(meghivoKod ? { meghivoKod } : {})
      });

      // Siker — token és eember adatok mentése memóriába
      tokenMentese(valasz.token);
      eemberMentese(valasz.eember);

      // Metódus vég log — siker
      console.log('RegisztracioForm.submitKezeles - VÉGE (siker)', { eemberNev: valasz.eember?.eemberNev });

      // Callback hívása — main.js kezeli a továbbiakat
        // token és eember együtt kerül átadásra, hogy a főoldal API hívásokhoz használhassa
        if (typeof this.sikerCallback === 'function') {
        this.sikerCallback(valasz.token, valasz.eember);
        }

    } catch (hiba) {
      // Hibazenet megjelenítése a form tetején
      this.altalanosHibaMutasa(hiba.message);

      // Metódus vég log — hiba
      console.log('RegisztracioForm.submitKezeles - VÉGE (API hiba)', { hiba: hiba.message });

    } finally {
      // Töltési állapot kikapcsolása — siker és hiba esetén egyaránt
      this.toltesBaAllitas(false);
    }
  }

  // ── VALIDÁCIÓ ──
  // Kliens oldali mezőellenőrzés
  // returns boolean - true ha érvényes, false ha hibás
  validacio(eemberNev, nev, email, jelszo, jelszoMegerosites, orszag, regio, telepules, meghivoKod) {
    // Metódus kezdő log
    console.log('RegisztracioForm.validacio - KEZDÉS', {
      eemberNevHossz: eemberNev?.length,
      emailHossz: email?.length,
      jelszoHossz: jelszo?.length
    });

    let ervenyesE = true;

    // Eembernév: kötelező, 3–30 karakter
    if (!eemberNev || eemberNev.length < 3 || eemberNev.length > 30) {
      this.mezohibaBeallitasa('mezo-eemberNev', true);
      ervenyesE = false;
    }

    // Valódi név: kötelező
    if (!nev) {
      this.mezohibaBeallitasa('mezo-nev', true);
      ervenyesE = false;
    }

    // Email: OPCIONÁLIS. Üresen hagyva rendben van; ha megadták, formátum-ellenőrzés.
    if (email) {
      const emailMinta = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailMinta.test(email)) {
        this.mezohibaBeallitasa('mezo-email', true);
        ervenyesE = false;
      }
    }

    // Jelszó: kötelező, min. 8 karakter, legalább egy betű ÉS egy szám
    // (ugyanaz a szabály, mint a backend jelszoHelper.validalJelszoErosseg-ben —
    //  itt csak azért ismételjük, hogy a felhasználó azonnal visszajelzést kapjon)
    const jelszoElegHosszu = !!jelszo && jelszo.length >= 8;
    const vanBetu = /\p{L}/u.test(jelszo || '');
    const vanSzam = /[0-9]/.test(jelszo || '');
    if (!jelszoElegHosszu || !vanBetu || !vanSzam) {
      this.mezohibaBeallitasa('mezo-jelszo', true);
      ervenyesE = false;
    }

    // Jelszó megerősítés: egyeznie kell a jelszóval
    if (!jelszoMegerosites || jelszo !== jelszoMegerosites) {
      this.mezohibaBeallitasa('mezo-jelszoMegerosites', true);
      ervenyesE = false;
    }

    // Ország: kötelező
    if (!orszag) {
      this.mezohibaBeallitasa('mezo-orszag', true);
      ervenyesE = false;
    }

    // Régió: kötelező
    if (!regio) {
      this.mezohibaBeallitasa('mezo-regio', true);
      ervenyesE = false;
    }

    // Település: kötelező
    if (!telepules) {
      this.mezohibaBeallitasa('mezo-telepules', true);
      ervenyesE = false;
    }

    // Meghívó kód: csak akkor kötelező, ha a meghívásos regisztráció be van kapcsolva
    if (this.meghivoKotelezo && !meghivoKod) {
      this.mezohibaBeallitasa('mezo-meghivoKod', true);
      ervenyesE = false;
    }

    // Metódus vég log
    console.log('RegisztracioForm.validacio - VÉGE', { ervenyesE });
    return ervenyesE;
  }

  // ── MEGHÍVÓ KÓD MEZŐ BEÁLLÍTÁSA ──
  // Lekérdezi a backendtől, kötelező-e a meghívó kód a regisztrációhoz
  // (MEGHIVAS_KOTELEZO kapcsoló), és ha igen, megmutatja a mezőt.
  async _meghivoMezoBeallitasa() {
    console.log('RegisztracioForm._meghivoMezoBeallitasa - KEZDÉS');

    try {
      // GET /api/meghivo/kotelezo — nyilvános végpont, nem kell token
      const valasz = await apiGet('meghivo/kotelezo');
      this.meghivoKotelezo = valasz?.kotelezo === true;

      // A mező csak kötelező módban látszik (rejtve indul a HTML-ben)
      const mezo = document.getElementById('mezo-meghivoKod');
      if (mezo && this.meghivoKotelezo) {
        mezo.style.display = '';
      }

      console.log('RegisztracioForm._meghivoMezoBeallitasa - VÉGE', { meghivoKotelezo: this.meghivoKotelezo });
    } catch (hiba) {
      // Ha a lekérés hibázik, a mező rejtve marad — a backend a végső őr:
      // kötelező módban a kód nélküli regisztrációt úgyis elutasítja
      console.error('RegisztracioForm._meghivoMezoBeallitasa - HIBA', hiba.message);
    }
  }

  // ── MEZŐHIBA BEÁLLÍTÁSA ──
  // Egy mező hiba CSS osztályának be/kikapcsolása
  // param string mezoId - A .form-mezo div ID-ja
  // param boolean hibas  - true: hibás, false: rendben
  mezohibaBeallitasa(mezoId, hibas) {
    const mezo = document.getElementById(mezoId);
    if (mezo) {
      // CSS osztály toggle — a CSS mutatja/rejti a hibaüzenetet
      mezo.classList.toggle('form-mezo--hiba', hibas);
    }
  }

  // ── ÁLTALÁNOS HIBAZENET MEGJELENÍTÉSE ──
  // A form tetején jelenik meg, pl. szerver hiba esetén
  // param string uzenet
  altalanosHibaMutasa(uzenet) {
    const hibaElem = document.getElementById('reg-altalanos-hiba');
    if (hibaElem) {
      // A CSS :not(:empty) selector automatikusan megmutatja
      hibaElem.textContent = uzenet;
    }
  }

  // ── HIBÁK TÖRLÉSE ──
  // Összes hibaüzenet törlése — új próbálkozás előtt
  hibakTorlese() {
    // Általános hibazenet ürítése
    const altalanosHiba = document.getElementById('reg-altalanos-hiba');
    if (altalanosHiba) altalanosHiba.textContent = '';

    // Mezőszintű hibák törlése
    [
      'mezo-meghivoKod',
      'mezo-eemberNev',
      'mezo-nev',
      'mezo-email',
      'mezo-jelszo',
      'mezo-jelszoMegerosites',
      'mezo-orszag',
      'mezo-regio',
      'mezo-telepules'
    ].forEach(id => this.mezohibaBeallitasa(id, false));
  }

  // ── TÖLTÉSI ÁLLAPOT ──
  // Gomb letiltása/engedélyezése töltés közben
  // param boolean toltes
  toltesBaAllitas(toltes) {
    // Metódus log
    console.log('RegisztracioForm.toltesBaAllitas - KEZDÉS/VÉGE', { toltes });

    this.toltesBan = toltes;

    const gomb = document.getElementById('btn-regisztracio');
    if (gomb) {
      gomb.disabled = toltes;
      // CSS osztály — stílusbeli visszajelzés töltés közben
      gomb.classList.toggle('btn--toltes', toltes);
      gomb.textContent = toltes ? 'Regisztráció...' : 'Regisztráció';
    }
  }
}

// ── EXPORTÁLÁS ──
export default RegisztracioForm;