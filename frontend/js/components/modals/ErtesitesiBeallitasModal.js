// frontend/js/components/modals/ErtesitesiBeallitasModal.js

// ===== IMPORTOK =====
import Modal from './Modal.js';
import { apiGet, apiPut, apiDelete } from '../../utils/apiHelper.js';
import { tokenLekerese } from '../../utils/authHelper.js';

// ===== ÉRTESÍTÉSI TÍPUSOK =====
// A felhasználó által választható eseménytípusok (felirat + magyarázat, egy helyen).
// Megjegyzés: KIMARAD a `szavazatErkezett` (a tulajdonos döntése alapján elhagyva;
// a backend enumban dormant módon megmarad). A `szavazasiHatarido` 2026-07-18 óta
// ÉLES (a cron küldi, ha egy aktív javaslat határideje közeleg).
const ERTESITES_TIPUSOK = [
  { ertek: 'ujJavaslat',        felirat: 'Új javaslat',        magyarazat: 'Ha új javaslat érkezik ebben az ágazatban.' },
  { ertek: 'javaslatElfogadas', felirat: 'Javaslat elfogadva', magyarazat: 'Ha egy javaslatból egyezmény lesz.' },
  { ertek: 'javaslatElvetve',   felirat: 'Javaslat elvetve',   magyarazat: 'Ha egy javaslat nem lép hatályba.' },
  { ertek: 'szavazasiHatarido', felirat: 'Szavazási határidő', magyarazat: 'Ha egy javaslat döntési ideje hamarosan lejár ebben az ágazatban.' },
  { ertek: 'tudatpontValtozas', felirat: 'Tudatpont-változás', magyarazat: 'Ha a tudatpont-eloszlás változik az entitáson.' },
  { ertek: 'ujGyerekEntitas',   felirat: 'Új gyerek entitás',  magyarazat: 'Ha új gondolat/entitás jön létre ez alatt.' },
  { ertek: 'kuszobValtozas',    felirat: 'Küszöbváltozás',     magyarazat: 'Ha az entitás érvényes küszöbértékei (mediánjai) változnak.' },
];

// A forrás (honnan jön az érvényes beállítás) → emberi magyarázat a felület tetejére
const FORRAS_SZOVEG = {
  sajat:    '🔒 Saját beállítás ezen a csomóponton – a felülről jövő későbbi változás nem hat rá.',
  orokolt:  '↳ A legközelebbi felmenő beállítását örökli. Mentéssel ide rögzíted ezt az ágat.',
  globalis: '🌐 A globális (fő menüs) alapbeállítást örökli. Mentéssel ide rögzíted ezt az ágat.',
  nincs:    'Nincs még beállítás sem itt, sem a felmenőkön. Pipáld ki, miről kérsz értesítést ebben az ágazatban.',
};

// ===== ÉRTESÍTÉSI BEÁLLÍTÁS MODAL OSZTÁLY =====
// Felelősség: egy entitáson (csomóponton) az e-ember beállítja, milyen eseményekről
//   kér értesítést ebben az ágazatban. A beállítás a szülőkön FELFELÉ öröklődik; a
//   legközelebbi csomópont beállítása nyer (teljes felülírás).
// Viselkedés:
//   - Megnyitáskor az ÉPP ÉRVÉNYES (örökölt vagy saját) állapotot tölti be és pipálja elő.
//   - „Mentés” MINDIG saját rekordot hoz létre ezen a csomóponton (fixálás), akkor is,
//      ha semmi nem változott az örököltekhez képest.
//   - „Vissza az örököltre” (csak ha van saját rekord) törli a saját rekordot → újra örököl.
// Használják: a kártyák hamburger menüjének „Értesítési beállítások” pontja.
class ErtesitesiBeallitasModal {

  // ===== KONSTRUKTOR =====
  // @param {string} kontenerAzonosito - a modal konténer div ID-ja
  // @param {Object} beallitasok
  // @param {string} beallitasok.entitasId    - az entitás azonosítója
  // @param {string} beallitasok.entitasTipus - 'Gondolat' | 'Kategoria' | 'GondolatTipus' | 'Javaslat' | 'Egyezmeny'
  // @param {string} beallitasok.entitasCim   - az entitás címe/neve (a fejléc alatt jelenik meg, opcionális)
  // @param {string} beallitasok.token        - JWT token (opcionális)
  // @param {Function} beallitasok.onSiker    - sikeres mentés/visszaállítás után (opcionális)
  constructor(kontenerAzonosito, beallitasok = {}) {
    console.log('ErtesitesiBeallitasModal.constructor - KEZDÉS', {
      entitasId:    beallitasok?.entitasId,
      entitasTipus: beallitasok?.entitasTipus
    });

    this.kontenerAzonosito = kontenerAzonosito;
    this.entitasId         = beallitasok.entitasId ?? null;
    this.entitasTipus      = beallitasok.entitasTipus ?? null;
    this.entitasCim        = beallitasok.entitasCim ?? '';
    this.token             = beallitasok.token ?? tokenLekerese();
    this.onSiker           = beallitasok.onSiker ?? null;

    // GLOBÁLIS mód: a fő menüből nyílik, az e-ember alapbeállítását szerkeszti.
    // Ilyenkor nincs entitás, nincs „vissza az örököltre” (ez a lánc alja).
    this.globalis          = beallitasok.globalis === true;

    this.modal = null;
    // A saját rekord azonosítója (ha van) – a „vissza az örököltre” törléshez
    this.beallitasId = null;

    console.log('ErtesitesiBeallitasModal.constructor - VÉGE', {
      entitasId: this.entitasId, entitasTipus: this.entitasTipus
    });
  }

  // ===== INICIALIZÁLÁS =====
  async init() {
    console.log('ErtesitesiBeallitasModal.init - KEZDÉS');

    const tartalomHtml = await this._templateBetoltese();
    if (!tartalomHtml) return;

    // A gombok: a „Vissza az örököltre” CSAK csomóponti módban van (globálisan
    // nincs mit örökölni – ez a lánc alja).
    const gombok = [
      {
        felirat:   'Mentés',
        tipus:     'elsodleges',
        azonosito: 'ertesites-beallitas-mentes-gomb',
        akcio:     () => this._mentes()
      },
      ...(this.globalis ? [] : [{
        // Csak akkor látszik, ha van saját rekord ezen a csomóponton (megnyitáskor dől el)
        felirat:   'Vissza az örököltre',
        tipus:     'masodlagos',
        azonosito: 'ertesites-beallitas-orokolt-gomb',
        akcio:     () => this._visszaAzOrokoltre()
      }]),
      {
        felirat:   'Mégse',
        tipus:     'masodlagos',
        azonosito: 'ertesites-beallitas-megse-gomb',
        akcio:     () => this.modal.bezaras()
      }
    ];

    this.modal = new Modal(this.kontenerAzonosito, {
      cim:      this.globalis ? 'Globális értesítési beállítások' : 'Értesítési beállítások',
      tartalom: tartalomHtml,
      meret:    'alap',
      gombok,
      onBezaras: () => {
        console.log('ErtesitesiBeallitasModal - modal bezárva');
      }
    });

    await this.modal.init();

    // A címke-sáv (mely entitásé) feltöltése, ha kaptunk címet (globálisan üres marad)
    const cimkeElem = document.getElementById('ertesites-beallitas-entitas');
    if (cimkeElem && this.entitasCim) {
      cimkeElem.textContent = this.entitasCim;
    }

    // Globális módban a bevezető szöveg más (nincs „ágazat”, ez az alapbeállítás)
    if (this.globalis) {
      const bevezetoElem = document.getElementById('ertesites-beallitas-bevezeto');
      if (bevezetoElem) {
        bevezetoElem.textContent =
          'Válaszd ki, mely eseményekről kérj értesítést ALAPBÓL. Ez mindenre érvényes, amíg egy csomóponton felül nem írod.';
      }
    }

    // Az eseménytípus checkbox-sorainak (+ a tudatpont-küszöb panel) beinjektálása
    const mezokKontener = document.getElementById('ertesites-beallitas-mezok');
    if (mezokKontener) {
      mezokKontener.innerHTML = this._checkboxokHtml();
    }

    // E-mailes kézbesítés kapcsolója — CSAK globális módban (az egész fiókra vonatkozik,
    // nem egy ágra). Entitás-szintű beállításnál a szakasz rejtve marad.
    if (this.globalis) {
      const emailSzakasz = document.getElementById('ertesites-email-szakasz');
      if (emailSzakasz) emailSzakasz.hidden = false;
      this._utemVezerlokBekotese();
      await this._emailAllapotBetoltese();
    }

    // A „Tudatpont-változás” pipa be/ki kapcsolása engedélyezi/tiltja a küszöb-mezőket
    const tvCheckbox = this.modal.panel?.querySelector('input[value="tudatpontValtozas"]');
    if (tvCheckbox) {
      tvCheckbox.addEventListener('change', () => this._tudatpontPanelFrissitese());
    }
    this._tudatpontPanelFrissitese();

    console.log('ErtesitesiBeallitasModal.init - VÉGE');
  }

  // ===== TEMPLATE BETÖLTÉSE =====
  async _templateBetoltese() {
    console.log('ErtesitesiBeallitasModal._templateBetoltese - KEZDÉS');
    try {
      const valasz = await fetch('./html/components/modals/ertesitesiBeallitasModal.html');
      if (!valasz.ok) {
        console.error('ErtesitesiBeallitasModal._templateBetoltese - HIBA', { statusz: valasz.status });
        return null;
      }
      return await valasz.text();
    } catch (hiba) {
      console.error('ErtesitesiBeallitasModal._templateBetoltese - kivétel', hiba.message);
      return null;
    }
  }

  // ===== CHECKBOX-SOROK HTML =====
  // Az eseménytípusokból épít egy-egy pipálható sort (felirat + magyarázat).
  // A `tudatpontValtozas` sora ALÁ beszúrja a 4 küszöb-mezőt (bázis × mérték).
  _checkboxokHtml() {
    return ERTESITES_TIPUSOK.map((tipus) => {
      const sor = `
      <label class="ertesitesi-beallitas-modal__sor">
        <input type="checkbox" name="ertesites-tipus" value="${tipus.ertek}" class="ertesitesi-beallitas-modal__pipa">
        <span class="ertesitesi-beallitas-modal__szoveg">
          <span class="ertesitesi-beallitas-modal__felirat">${tipus.felirat}</span>
          <span class="ertesitesi-beallitas-modal__magyarazat">${tipus.magyarazat}</span>
        </span>
      </label>`;
      // A tudatpont-változás alá kerülnek a küszöb-mezők
      return tipus.ertek === 'tudatpontValtozas' ? sor + this._tudatpontKuszobokHtml() : sor;
    }).join('');
  }

  // ===== TUDATPONT-KÜSZÖB MEZŐK HTML =====
  // Négy független küszöb: BÁZIS (saját / összes hierarchikus) × MÉRTÉK (direkt pont / %).
  // "VAGY" logika: bármelyik kitöltött feltétel aktiválja az értesítést; üres = figyelmen kívül.
  // A panel csak akkor aktív, ha a „Tudatpont-változás” be van pipálva.
  _tudatpontKuszobokHtml() {
    return `
      <div class="ertesitesi-beallitas-modal__kuszobok" id="ertesites-tudatpont-kuszobok">
        <p class="ertesitesi-beallitas-modal__kuszob-cim">
          Csak ekkora változástól értesíts (üres mező = minden változásnál; bármelyik kitöltött feltétel aktivál):
        </p>
        <div class="ertesitesi-beallitas-modal__kuszob-sor">
          <span class="ertesitesi-beallitas-modal__kuszob-bazis">Saját tudatpont</span>
          <label class="ertesitesi-beallitas-modal__kuszob-mezo">≥
            <input type="number" min="1" id="tk-sajat-direkt" class="ertesitesi-beallitas-modal__kuszob-input"> pont
          </label>
          <span class="ertesitesi-beallitas-modal__kuszob-vagy">vagy</span>
          <label class="ertesitesi-beallitas-modal__kuszob-mezo">≥
            <input type="number" min="1" max="100" id="tk-sajat-szazalek" class="ertesitesi-beallitas-modal__kuszob-input"> %
          </label>
        </div>
        <div class="ertesitesi-beallitas-modal__kuszob-sor">
          <span class="ertesitesi-beallitas-modal__kuszob-bazis">Összes (hierarchikus)</span>
          <label class="ertesitesi-beallitas-modal__kuszob-mezo">≥
            <input type="number" min="1" id="tk-ossz-direkt" class="ertesitesi-beallitas-modal__kuszob-input"> pont
          </label>
          <span class="ertesitesi-beallitas-modal__kuszob-vagy">vagy</span>
          <label class="ertesitesi-beallitas-modal__kuszob-mezo">≥
            <input type="number" min="1" max="100" id="tk-ossz-szazalek" class="ertesitesi-beallitas-modal__kuszob-input"> %
          </label>
        </div>
      </div>`;
  }

  // ===== MEGNYITÁS =====
  async megnyitas() {
    console.log('ErtesitesiBeallitasModal.megnyitas - KEZDÉS');

    this.modal?.megnyitas();
    await this._adatokBetoltese();

    console.log('ErtesitesiBeallitasModal.megnyitas - VÉGE');
  }

  // ===== BEZÁRÁS =====
  bezaras() {
    this.modal?.bezaras();
  }

  // ===== ADATOK BETÖLTÉSE =====
  // Lekéri az ÉPP ÉRVÉNYES (örökölt vagy saját) beállítást, és eszerint tölti fel:
  //   - a checkboxokat (ertesitesTipusok szerint bepipálva),
  //   - a forrás-magyarázatot,
  //   - a „vissza az örököltre” gomb láthatóságát (csak ha van saját rekord).
  async _adatokBetoltese() {
    console.log('ErtesitesiBeallitasModal._adatokBetoltese - KEZDÉS', {
      globalis: this.globalis, entitasId: this.entitasId, entitasTipus: this.entitasTipus
    });

    // Csomóponti módban kötelező az entitás; globálisban nincs entitás
    if (!this.globalis && (!this.entitasId || !this.entitasTipus)) {
      this.modal.hibaBeallitasa('Hiányzó entitásadat – a beállítások nem tölthetők be.');
      return;
    }

    this.modal.betoltesBeallitasa(true);

    try {
      // --- GLOBÁLIS MÓD: az e-ember alapbeállítása ---
      if (this.globalis) {
        const valasz = await apiGet('ertesitesi-beallitasok/globalis', this.token);
        this.modal.betoltesBeallitasa(false);

        const adatok = valasz?.adatok ?? {};
        this._checkboxokBeallitasa(adatok.ertesitesTipusok ?? []);
        this._tudatpontKuszobokBeallitasa(adatok.tudatpontKuszobok);
        this._tudatpontSzuroBeallitasa(adatok.tudatpontSzuro);
        this._emailKapcsoloBeallitasa(adatok.emailErtesites);
        this._utemBeallitasa(adatok.emailMod, adatok.emailOrakoz);
        this._tudatpontPanelFrissitese();

        const infoElem = document.getElementById('ertesites-beallitas-info');
        if (infoElem) {
          infoElem.textContent = 'Ez az alapbeállítás – mindenre érvényes, amíg egy csomóponton felül nem írod.';
          infoElem.dataset.forras = 'globalis';
        }

        console.log('ErtesitesiBeallitasModal._adatokBetoltese - VÉGE (globális)', {
          bekapcsoltDarab: (adatok.ertesitesTipusok ?? []).length
        });
        return;
      }

      // --- CSOMÓPONTI MÓD: az érvényes (örökölt vagy saját) beállítás ---
      const valasz = await apiGet(
        `ertesitesi-beallitasok/ervenyes/${this.entitasTipus}/${this.entitasId}`,
        this.token
      );
      this.modal.betoltesBeallitasa(false);

      const adatok = valasz?.adatok ?? {};
      const bekapcsolt = adatok.ertesitesTipusok ?? [];
      this.beallitasId = adatok.beallitasId ?? null;

      // Checkboxok + tudatpont-küszöbök + tudatpont-szűrő előtöltése az érvényes állapot szerint
      this._checkboxokBeallitasa(bekapcsolt);
      this._tudatpontKuszobokBeallitasa(adatok.tudatpontKuszobok);
      this._tudatpontSzuroBeallitasa(adatok.tudatpontSzuro);
      this._tudatpontPanelFrissitese();

      // Forrás-magyarázat kiírása
      const infoElem = document.getElementById('ertesites-beallitas-info');
      if (infoElem) {
        infoElem.textContent = FORRAS_SZOVEG[adatok.forras] ?? '';
        infoElem.dataset.forras = adatok.forras ?? '';
      }

      // A „vissza az örököltre” gomb csak akkor látszik, ha van saját rekord itt
      this._orokoltGombLathatosaga(!!adatok.vanSajat);

      console.log('ErtesitesiBeallitasModal._adatokBetoltese - VÉGE', {
        forras: adatok.forras, vanSajat: adatok.vanSajat, bekapcsoltDarab: bekapcsolt.length
      });
    } catch (hiba) {
      console.error('ErtesitesiBeallitasModal._adatokBetoltese - HIBA', hiba.message);
      this.modal.betoltesBeallitasa(false);
      this.modal.hibaBeallitasa(hiba.message ?? 'A beállítások betöltése sikertelen.');
    }
  }

  // ===== CHECKBOXOK BEÁLLÍTÁSA =====
  // A megadott (bekapcsolt) típusokat bepipálja, a többit kiveszi.
  _checkboxokBeallitasa(bekapcsoltTombje) {
    const pipak = this.modal.panel?.querySelectorAll('input[name="ertesites-tipus"]') ?? [];
    pipak.forEach((pipa) => {
      pipa.checked = bekapcsoltTombje.includes(pipa.value);
    });
  }

  // ===== A BEPIPÁLT TÍPUSOK ÖSSZEGYŰJTÉSE =====
  _bepipaltTipusok() {
    const kivalasztott = this.modal.panel?.querySelectorAll('input[name="ertesites-tipus"]:checked') ?? [];
    return Array.from(kivalasztott).map((pipa) => pipa.value);
  }

  // ===== „VISSZA AZ ÖRÖKÖLTRE” GOMB LÁTHATÓSÁGA =====
  _orokoltGombLathatosaga(lathato) {
    const gomb = document.getElementById('ertesites-beallitas-orokolt-gomb');
    if (gomb) gomb.style.display = lathato ? '' : 'none';
  }

  // ===== E-MAILES KÉZBESÍTÉS: ÁLLAPOT BETÖLTÉSE =====
  // Megnézi, van-e MEGERŐSÍTETT e-mail cím. Ha nincs, a kapcsolót letiltjuk és
  // megmondjuk, miért — enélkül az e-ember bekapcsolná, aztán értetlenül várná a
  // leveleket, amik sosem jönnének meg (a levél-kapu megerősítetlen címre nem küld).
  async _emailAllapotBetoltese() {
    console.log('ErtesitesiBeallitasModal._emailAllapotBetoltese - KEZDÉS');

    const kapcsolo      = document.getElementById('ertesites-email-kapcsolo');
    const figyelmeztetes = document.getElementById('ertesites-email-figyelmeztetes');
    if (!kapcsolo) return;

    try {
      const adatok = await apiGet('eember/sajat-adatok', this.token);

      const vanCim      = !!adatok?.email;
      const megerositve = adatok?.emailMegerositve === true;

      if (!vanCim) {
        kapcsolo.disabled = true;
        kapcsolo.checked  = false;
        if (figyelmeztetes) {
          figyelmeztetes.hidden = false;
          figyelmeztetes.textContent =
            'Ehhez előbb meg kell adnod egy e-mail címet a fő menü → eember beállítások alatt.';
        }
      } else if (!megerositve) {
        kapcsolo.disabled = true;
        kapcsolo.checked  = false;
        if (figyelmeztetes) {
          figyelmeztetes.hidden = false;
          figyelmeztetes.textContent =
            'Az e-mail címed még nincs megerősítve. Erősítsd meg a fő menü → eember '
            + 'beállítások alatt, utána kapcsolható be.';
        }
      } else {
        kapcsolo.disabled = false;
        if (figyelmeztetes) figyelmeztetes.hidden = true;
      }

      console.log('ErtesitesiBeallitasModal._emailAllapotBetoltese - VÉGE', { vanCim, megerositve });
    } catch (hiba) {
      console.error('ErtesitesiBeallitasModal._emailAllapotBetoltese - HIBA', hiba.message);
      kapcsolo.disabled = true;
    }
  }

  // ===== E-MAILES KÉZBESÍTÉS: PIPA KITÖLTÉSE / KIOLVASÁSA =====
  _emailKapcsoloBeallitasa(ertek) {
    const kapcsolo = document.getElementById('ertesites-email-kapcsolo');
    // A `disabled` állapotot NEM írjuk felül: azt a cím-ellenőrzés döntötte el.
    if (kapcsolo && !kapcsolo.disabled) kapcsolo.checked = ertek === true;
  }

  _emailKapcsoloErteke() {
    const kapcsolo = document.getElementById('ertesites-email-kapcsolo');
    return kapcsolo?.checked === true;
  }

  // ===== A KÉZBESÍTÉS ÜTEME (5. lépés) =====
  // Az ütem-panel csak akkor látszik, ha az e-mailes értesítés BE van kapcsolva —
  // kikapcsolt állapotban nincs mit ütemezni. Az időköz-mező pedig csak
  // ÖSSZEFOGLALÓ módban él (azonnali módban nincs értelme).
  _utemPanelFrissitese() {
    const bekapcsolva = this._emailKapcsoloErteke();
    const utemPanel   = document.getElementById('ertesites-email-utem');
    if (utemPanel) utemPanel.hidden = !bekapcsolva;

    const osszefoglaloE = document.getElementById('ertesites-email-mod-osszefoglalo')?.checked === true;
    const orakozSor = document.getElementById('ertesites-email-orakoz-sor');
    if (orakozSor) {
      // Nem elrejtjük, csak halványítjuk és tiltjuk: így látszik, MI az, amit
      // az azonnali mód választásával épp kikapcsolt.
      orakozSor.classList.toggle('ertesitesi-beallitas-modal__orakoz--tiltva', !osszefoglaloE);
      orakozSor.querySelectorAll('input, button').forEach((el) => { el.disabled = !osszefoglaloE; });
    }
  }

  // ----- Az ütem-vezérlők bekötése (egyszer, az init-ben) -----
  _utemVezerlokBekotese() {
    document.getElementById('ertesites-email-kapcsolo')
      ?.addEventListener('change', () => this._utemPanelFrissitese());

    document.getElementsByName('ertesites-email-mod')
      .forEach?.((r) => r.addEventListener('change', () => this._utemPanelFrissitese()));
    // A NodeList-nek van forEach-e, de a régi getElementsByName HTMLCollection-t ad —
    // ezért biztosra megyünk:
    [...document.querySelectorAll('input[name="ertesites-email-mod"]')]
      .forEach((r) => r.addEventListener('change', () => this._utemPanelFrissitese()));

    // Gyorsválasztó gombok: beírják az óraszámot a mezőbe
    document.querySelectorAll('.ertesitesi-beallitas-modal__gyorsvalaszto button')
      .forEach((gomb) => {
        gomb.addEventListener('click', () => {
          const mezo = document.getElementById('ertesites-email-orakoz');
          if (mezo) mezo.value = gomb.dataset.orakoz;
        });
      });
  }

  // ----- Az ütem-beállítás kitöltése a betöltött adatokból -----
  _utemBeallitasa(mod, orakoz) {
    const modErtek = (mod === 'azonnal') ? 'azonnal' : 'osszefoglalo';
    const radio = document.getElementById(`ertesites-email-mod-${modErtek}`);
    if (radio) radio.checked = true;

    const mezo = document.getElementById('ertesites-email-orakoz');
    if (mezo) mezo.value = orakoz ?? 24;

    this._utemPanelFrissitese();
  }

  // ----- Az ütem-beállítás kiolvasása mentéshez -----
  _utemErteke() {
    const azonnalE = document.getElementById('ertesites-email-mod-azonnal')?.checked === true;
    const mezoErtek = Number(document.getElementById('ertesites-email-orakoz')?.value);

    return {
      emailMod: azonnalE ? 'azonnal' : 'osszefoglalo',
      // Épeszű határok: a backend is szorítja, de itt sem küldünk értelmetlen számot
      emailOrakoz: Number.isFinite(mezoErtek) && mezoErtek >= 1
        ? Math.min(168, Math.round(mezoErtek))
        : 24
    };
  }

  // ===== TUDATPONT-SZŰRŐ PIPA: KITÖLTÉS =====
  // A „Csak ahol tudatpontom van" pipa beállítása a betöltött (érvényes) állapotból.
  _tudatpontSzuroBeallitasa(ertek) {
    const pipa = document.getElementById('ertesites-tudatpont-szuro');
    if (pipa) pipa.checked = ertek === true;
  }

  // ===== TUDATPONT-SZŰRŐ PIPA: KIOLVASÁS =====
  _tudatpontSzuroErteke() {
    const pipa = document.getElementById('ertesites-tudatpont-szuro');
    return pipa?.checked === true;
  }

  // ===== TUDATPONT-KÜSZÖBÖK: MEZŐK KITÖLTÉSE =====
  // A négy input értékét állítja be a kapott küszöb-objektumból (null → üres mező).
  _tudatpontKuszobokBeallitasa(kuszobok) {
    const beallit = (id, ertek) => {
      const el = document.getElementById(id);
      if (el) el.value = (ertek === null || ertek === undefined) ? '' : ertek;
    };
    beallit('tk-sajat-direkt',   kuszobok?.sajatDirekt);
    beallit('tk-sajat-szazalek', kuszobok?.sajatSzazalek);
    beallit('tk-ossz-direkt',    kuszobok?.osszDirekt);
    beallit('tk-ossz-szazalek',  kuszobok?.osszSzazalek);
  }

  // ===== TUDATPONT-KÜSZÖBÖK: MEZŐK ÖSSZEGYŰJTÉSE =====
  // A négy inputból objektumot épít; üres mező → null (azaz „ne figyeld ezt a feltételt”).
  _tudatpontKuszobokOsszegyujtese() {
    const szam = (id) => {
      const el = document.getElementById(id);
      const nyers = el ? el.value.trim() : '';
      if (nyers === '') return null;
      const n = parseInt(nyers, 10);
      return Number.isNaN(n) ? null : n;
    };
    return {
      sajatDirekt:   szam('tk-sajat-direkt'),
      sajatSzazalek: szam('tk-sajat-szazalek'),
      osszDirekt:    szam('tk-ossz-direkt'),
      osszSzazalek:  szam('tk-ossz-szazalek'),
    };
  }

  // ===== TUDATPONT-KÜSZÖBÖK: HELYI VALIDÁLÁS =====
  // A pont-mezők ≥ 1 egészek, a %-mezők 1–100 közötti egészek lehetnek (vagy üresek).
  // Hibaüzenetet ad vissza, vagy null-t ha rendben.
  _tudatpontKuszobokValidalas(kuszobok) {
    const pontOk = (v) => v === null || (Number.isInteger(v) && v >= 1);
    const szazalekOk = (v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 100);

    if (!pontOk(kuszobok.sajatDirekt) || !pontOk(kuszobok.osszDirekt)) {
      return 'A tudatpont-küszöb (pont) csak 1 vagy nagyobb egész szám lehet.';
    }
    if (!szazalekOk(kuszobok.sajatSzazalek) || !szazalekOk(kuszobok.osszSzazalek)) {
      return 'A tudatpont-küszöb (%) csak 1 és 100 közötti egész szám lehet.';
    }
    return null;
  }

  // ===== TUDATPONT-KÜSZÖB PANEL BE/KI =====
  // A küszöb-mezők csak akkor aktívak, ha a „Tudatpont-változás” be van pipálva.
  _tudatpontPanelFrissitese() {
    const tv = this.modal.panel?.querySelector('input[value="tudatpontValtozas"]');
    const aktiv = !!tv?.checked;

    const panel = document.getElementById('ertesites-tudatpont-kuszobok');
    if (panel) panel.classList.toggle('ertesitesi-beallitas-modal__kuszobok--tiltva', !aktiv);

    ['tk-sajat-direkt', 'tk-sajat-szazalek', 'tk-ossz-direkt', 'tk-ossz-szazalek'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.disabled = !aktiv;
    });
  }

  // ===== MENTÉS =====
  // Mindig saját rekordot hoz létre/frissít ezen a csomóponton (fixálás).
  async _mentes() {
    console.log('ErtesitesiBeallitasModal._mentes - KEZDÉS', {
      entitasId: this.entitasId, entitasTipus: this.entitasTipus
    });

    const ertesitesTipusok = this._bepipaltTipusok();
    const tudatpontKuszobok = this._tudatpontKuszobokOsszegyujtese();
    const tudatpontSzuro = this._tudatpontSzuroErteke();

    // A tudatpont-küszöbök helyi ellenőrzése (a backend séma is validál, de így barátságosabb)
    const kuszobHiba = this._tudatpontKuszobokValidalas(tudatpontKuszobok);
    if (kuszobHiba) {
      this.modal.hibaBeallitasa(kuszobHiba);
      return;
    }

    this.modal.hibaTisztitasa();
    this.modal.betoltesBeallitasa(true);

    try {
      if (this.globalis) {
        // Globális alapbeállítás mentése (fő menü)
        await apiPut('ertesitesi-beallitasok/globalis',
          {
            ertesitesTipusok,
            tudatpontKuszobok,
            tudatpontSzuro,
            // E-mailes kézbesítés (4. lépés). FONTOS: a mentés a teljes alapbeállítást
            // lecseréli, ezért ezt is minden mentéskor küldeni kell.
            emailErtesites: this._emailKapcsoloErteke(),
            // A kézbesítés üteme (5. lépés): mód + az összefoglaló időköze
            ...this._utemErteke()
          }, this.token);
      } else {
        // Csomóponti beállítás mentése (mindig saját rekord → fixálás)
        await apiPut('ertesitesi-beallitasok', {
          entitasId:    this.entitasId,
          entitasTipus: this.entitasTipus,
          ertesitesTipusok,
          tudatpontKuszobok,
          tudatpontSzuro
        }, this.token);
      }

      this.modal.betoltesBeallitasa(false);
      this.modal.bezaras();

      if (typeof this.onSiker === 'function') this.onSiker();

      console.log('ErtesitesiBeallitasModal._mentes - VÉGE (sikeres)', { ertesitesTipusok });
    } catch (hiba) {
      console.error('ErtesitesiBeallitasModal._mentes - HIBA', hiba.message);
      this.modal.betoltesBeallitasa(false);
      this.modal.hibaBeallitasa(hiba.message ?? 'A beállítás mentése sikertelen.');
    }
  }

  // ===== VISSZA AZ ÖRÖKÖLTRE =====
  // Törli a saját rekordot ezen a csomóponton → újra a felmenőt örökli.
  // Sikeres törlés után a modalt a friss (örökölt) állapotra frissítjük, nyitva hagyva.
  async _visszaAzOrokoltre() {
    console.log('ErtesitesiBeallitasModal._visszaAzOrokoltre - KEZDÉS', {
      beallitasId: this.beallitasId
    });

    if (!this.beallitasId) {
      // Nincs saját rekord – elvileg a gomb ilyenkor rejtve van, de biztos ami biztos
      console.warn('ErtesitesiBeallitasModal._visszaAzOrokoltre - nincs saját rekord, kihagyva');
      return;
    }

    this.modal.hibaTisztitasa();
    this.modal.betoltesBeallitasa(true);

    try {
      await apiDelete(`ertesitesi-beallitasok/${this.beallitasId}`, {}, this.token);
      this.modal.betoltesBeallitasa(false);

      // A modal nyitva marad, és a friss (most már örökölt) állapotot mutatja
      await this._adatokBetoltese();

      if (typeof this.onSiker === 'function') this.onSiker();

      console.log('ErtesitesiBeallitasModal._visszaAzOrokoltre - VÉGE (sikeres)');
    } catch (hiba) {
      console.error('ErtesitesiBeallitasModal._visszaAzOrokoltre - HIBA', hiba.message);
      this.modal.betoltesBeallitasa(false);
      this.modal.hibaBeallitasa(hiba.message ?? 'A visszaállítás sikertelen.');
    }
  }
}

// ===== EXPORTÁLÁS =====
export default ErtesitesiBeallitasModal;
