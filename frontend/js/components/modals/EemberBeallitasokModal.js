// frontend/js/components/modals/EemberBeallitasokModal.js

// ===== IMPORTOK =====
import Modal from './Modal.js';
import { apiGet, apiPut, apiPost, apiDelete } from '../../utils/apiHelper.js';
import { tokenLekerese, eemberMentese, tokenTorlese } from '../../utils/authHelper.js';
import { autocompleteRakotese } from '../../utils/lokacioHelper.js';

// ===== EEMBER BEÁLLÍTÁSOK MODAL =====
// Felelősség: a bejelentkezett e-ember saját beállításai (terv 8. pont):
//   1. azonosítók megjelenítése (e-embernév, e-mail — v1-ben nem módosíthatók),
//   2. profil-adatok módosítása (valódi név + lokáció, autocomplete-tel),
//   3. jelszóváltás (jelenlegi jelszó igazolásával, megerősítéssel).
// A két szakasz KÜLÖN gombbal ment (PUT /api/eember/adatok, POST /api/eember/jelszovaltas).
// Használja: a fő menü „eember beállítások" pontja (foOldal.js).
class EemberBeallitasokModal {

  // @param {string} kontenerAzonosito - a modal konténer div ID-ja
  // @param {Object} beallitasok
  // @param {string} beallitasok.token       - JWT token (opcionális)
  // @param {Function} beallitasok.onValtozas - sikeres profil-mentés után hívjuk
  //                                            (a FoOldal a fejléc-adatait frissíti vele)
  constructor(kontenerAzonosito, beallitasok = {}) {
    console.log('EemberBeallitasokModal.constructor - KEZDÉS');

    this.kontenerAzonosito = kontenerAzonosito;
    this.token             = beallitasok.token ?? tokenLekerese();
    this.onValtozas        = beallitasok.onValtozas ?? null;

    this.modal = null;

    console.log('EemberBeallitasokModal.constructor - VÉGE');
  }

  // ===== INICIALIZÁLÁS =====
  async init() {
    console.log('EemberBeallitasokModal.init - KEZDÉS');

    const tartalomHtml = await this._templateBetoltese();
    if (!tartalomHtml) return;

    this.modal = new Modal(this.kontenerAzonosito, {
      cim:      'eember beállítások',
      tartalom: tartalomHtml,
      meret:    'alap',
      gombok: [
        {
          felirat:   'Bezárás',
          tipus:     'masodlagos',
          azonosito: 'beallitasok-bezar-gomb',
          akcio:     () => this.modal.bezaras()
        }
      ]
    });

    await this.modal.init();

    // Mentés gombok bekötése
    document.getElementById('beallitasok-profil-mentes')
      ?.addEventListener('click', () => this._profilMentese());
    document.getElementById('beallitasok-jelszo-mentes')
      ?.addEventListener('click', () => this._jelszoMentese());
    document.getElementById('beallitasok-fiok-torles')
      ?.addEventListener('click', () => this._fiokTorles());

    // Lokáció autocomplete — ugyanaz a segéd, mint a regisztrációs űrlapon
    autocompleteRakotese('beallitasok-orszag',    'lokacio/orszag');
    autocompleteRakotese('beallitasok-regio',     'lokacio/regio');
    autocompleteRakotese('beallitasok-telepules', 'lokacio/telepules');

    console.log('EemberBeallitasokModal.init - VÉGE');
  }

  // ===== TEMPLATE BETÖLTÉSE =====
  async _templateBetoltese() {
    try {
      const valasz = await fetch('./html/components/modals/eemberBeallitasokModal.html');
      if (!valasz.ok) {
        console.error('EemberBeallitasokModal._templateBetoltese - HIBA', { statusz: valasz.status });
        return null;
      }
      return await valasz.text();
    } catch (hiba) {
      console.error('EemberBeallitasokModal._templateBetoltese - kivétel', hiba.message);
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

  // ===== SAJÁT ADATOK BETÖLTÉSE ÉS KITÖLTÉSE =====
  async _adatokBetoltese() {
    console.log('EemberBeallitasokModal._adatokBetoltese - KEZDÉS');

    this.modal.betoltesBeallitasa(true);
    try {
      const adatok = await apiGet('eember/sajat-adatok', this.token);
      this.modal.betoltesBeallitasa(false);

      // Azonosító (csak megjelenítés) — az e-embernév nem módosítható
      const nevElem = document.getElementById('beallitasok-eembernev');
      if (nevElem) nevElem.textContent = adatok?.eemberNev ?? '—';

      // Szerkeszthető mezők előtöltése (az e-mail is szerkeszthető input már;
      // üres, ha az e-ember nem adott meg e-mailt)
      this._eredetiEmail = adatok?.email ?? '';   // referencia a „változott-e?" ellenőrzéshez
      this._mezoErtek('beallitasok-email',     adatok?.email ?? '');
      this._mezoErtek('beallitasok-nev',       adatok?.nev ?? '');
      this._mezoErtek('beallitasok-orszag',    adatok?.lokacio?.orszag ?? '');
      this._mezoErtek('beallitasok-regio',     adatok?.lokacio?.regio ?? '');
      this._mezoErtek('beallitasok-telepules', adatok?.lokacio?.telepules ?? '');

      console.log('EemberBeallitasokModal._adatokBetoltese - VÉGE');
    } catch (hiba) {
      console.error('EemberBeallitasokModal._adatokBetoltese - HIBA', hiba.message);
      this.modal.betoltesBeallitasa(false);
      this.modal.hibaBeallitasa(hiba.message ?? 'Az adatok betöltése sikertelen.');
    }
  }

  // ===== PROFIL MENTÉSE =====
  async _profilMentese() {
    console.log('EemberBeallitasokModal._profilMentese - KEZDÉS');

    this.modal.hibaTisztitasa();
    this._sikerUzenet('beallitasok-profil-siker', '');

    const nev       = document.getElementById('beallitasok-nev')?.value?.trim();
    const email     = document.getElementById('beallitasok-email')?.value?.trim();
    const orszag    = document.getElementById('beallitasok-orszag')?.value?.trim();
    const regio     = document.getElementById('beallitasok-regio')?.value?.trim();
    const telepules = document.getElementById('beallitasok-telepules')?.value?.trim();

    // Kliens oldali gyors ellenőrzés — a backend a végső őr
    if (!nev || !orszag || !regio || !telepules) {
      this.modal.hibaBeallitasa('A név, ország, régió és település megadása kötelező.');
      return;
    }

    // E-mail OPCIONÁLIS: üresen hagyva a backend törli. Ha van érték, gyors formátum-
    // ellenőrzés az azonnali visszajelzésért (a backend a végső őr, az egyediséggel együtt).
    if (email) {
      const emailMinta = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailMinta.test(email)) {
        this.modal.hibaBeallitasa('Ha megadsz e-mail címet, annak érvényesnek kell lennie.');
        return;
      }
    }

    // Az e-mailt CSAK akkor küldjük el, ha VÁLTOZOTT az eredetihez képest. Így ha az
    // e-ember hozzá sem nyúlt (pl. nincs is e-mailje), a mentés nem futtat felesleges
    // törlést a backend oldalán. (üres string elküldve = törlés)
    const kuldendoAdatok = { nev, lokacio: { orszag, regio, telepules } };
    if (email !== (this._eredetiEmail ?? '')) {
      kuldendoAdatok.email = email;
    }

    this.modal.betoltesBeallitasa(true);
    try {
      const valasz = await apiPut('eember/adatok', kuldendoAdatok, this.token);
      this.modal.betoltesBeallitasa(false);

      // A memóriában tárolt eember-adatok frissítése (a fejléc ebből dolgozik)
      if (valasz?.eember) eemberMentese(valasz.eember);

      // A mostani e-mail lesz az új „eredeti" — így egy azonnali második mentés
      // már nem küldi el újra fölöslegesen ugyanazt.
      this._eredetiEmail = email;

      this._sikerUzenet('beallitasok-profil-siker', '✅ Mentve');
      if (typeof this.onValtozas === 'function') this.onValtozas();

      console.log('EemberBeallitasokModal._profilMentese - VÉGE (siker)');
    } catch (hiba) {
      console.error('EemberBeallitasokModal._profilMentese - HIBA', hiba.message);
      this.modal.betoltesBeallitasa(false);
      this.modal.hibaBeallitasa(hiba.message ?? 'A mentés sikertelen.');
    }
  }

  // ===== JELSZÓ MENTÉSE =====
  async _jelszoMentese() {
    console.log('EemberBeallitasokModal._jelszoMentese - KEZDÉS');

    this.modal.hibaTisztitasa();
    this._sikerUzenet('beallitasok-jelszo-siker', '');

    const regiJelszo = document.getElementById('beallitasok-regi-jelszo')?.value;
    const ujJelszo   = document.getElementById('beallitasok-uj-jelszo')?.value;
    const ujJelszo2  = document.getElementById('beallitasok-uj-jelszo2')?.value;

    if (!regiJelszo || !ujJelszo || !ujJelszo2) {
      this.modal.hibaBeallitasa('A jelszóváltáshoz mindhárom jelszó-mező kitöltése kötelező.');
      return;
    }
    if (ujJelszo !== ujJelszo2) {
      this.modal.hibaBeallitasa('Az új jelszó és a megerősítése nem egyezik.');
      return;
    }

    this.modal.betoltesBeallitasa(true);
    try {
      await apiPost('eember/jelszovaltas', { regiJelszo, ujJelszo }, this.token);
      this.modal.betoltesBeallitasa(false);

      // A jelszó-mezők ürítése sikeres váltás után
      this._mezoErtek('beallitasok-regi-jelszo', '');
      this._mezoErtek('beallitasok-uj-jelszo', '');
      this._mezoErtek('beallitasok-uj-jelszo2', '');

      this._sikerUzenet('beallitasok-jelszo-siker', '✅ Jelszó módosítva');

      console.log('EemberBeallitasokModal._jelszoMentese - VÉGE (siker)');
    } catch (hiba) {
      console.error('EemberBeallitasokModal._jelszoMentese - HIBA', hiba.message);
      this.modal.betoltesBeallitasa(false);
      this.modal.hibaBeallitasa(hiba.message ?? 'A jelszóváltás sikertelen.');
    }
  }

  // ===== FIÓK TÖRLÉSE =====
  // Végleges, visszafordíthatatlan törlés a jelszóval igazolva. Két lépcső:
  // (1) a jelszó-mező kitöltése kötelező, (2) egy megerősítő párbeszéd. Siker után
  // kijelentkeztetünk (token törlése + újratöltés → bejelentkező képernyő).
  async _fiokTorles() {
    console.log('EemberBeallitasokModal._fiokTorles - KEZDÉS');

    this.modal.hibaTisztitasa();
    this._sikerUzenet('beallitasok-torles-siker', '');

    const jelszo = document.getElementById('beallitasok-torles-jelszo')?.value;
    if (!jelszo) {
      this.modal.hibaBeallitasa('A fiók törléséhez add meg a jelszavad.');
      return;
    }

    // Megerősítő párbeszéd — a művelet visszafordíthatatlan
    const megerosites = window.confirm(
      'Biztosan véglegesen törlöd a fiókod? Ez a művelet NEM vonható vissza.'
    );
    if (!megerosites) {
      console.log('EemberBeallitasokModal._fiokTorles - a felhasználó megszakította');
      return;
    }

    this.modal.betoltesBeallitasa(true);
    try {
      await apiDelete('eember', { jelszo }, this.token);
      // Sikeres törlés → kijelentkeztetés és vissza a bejelentkező képernyőre
      tokenTorlese();
      window.location.reload();
      console.log('EemberBeallitasokModal._fiokTorles - VÉGE (siker)');
    } catch (hiba) {
      console.error('EemberBeallitasokModal._fiokTorles - HIBA', hiba.message);
      this.modal.betoltesBeallitasa(false);
      this.modal.hibaBeallitasa(hiba.message ?? 'A fiók törlése sikertelen.');
    }
  }

  // ===== SEGÉD: MEZŐ ÉRTÉKÉNEK BEÁLLÍTÁSA =====
  _mezoErtek(azonosito, ertek) {
    const mezo = document.getElementById(azonosito);
    if (mezo) mezo.value = ertek;
  }

  // ===== SEGÉD: SIKER-ÜZENET =====
  _sikerUzenet(azonosito, szoveg) {
    const elem = document.getElementById(azonosito);
    if (elem) elem.textContent = szoveg;
  }
}

// ===== EXPORTÁLÁS =====
export default EemberBeallitasokModal;
