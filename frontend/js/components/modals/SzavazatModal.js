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
//  2. A három gomb egyike CSAK helyben kiválaszt (nem küld a szervernek);
//     a „Visszavonás" gomb helyben törli a kiválasztást.
//  3. A tényleges szerverhívás (leadás / módosítás / visszavonás) csak a
//     „Rendben" gombra történik meg, a kiválasztás alapján; sikeres mentés
//     után a modal bezárul. Bezárás mentés nélkül (X / ESC) = nincs változás.
//  4. Támogatom / Ellenzem mellett megjelenik a KÜLÖNVÁLÁSI kérdés is: kér-e
//     külön ágat, ha a döntés nem az ő álláspontját követi. Ez is csak helyben
//     áll be; a „Rendben" küldi a szavazattal együtt (kulonvalasIgeny).
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

    // A eember SZERVEREN tárolt (eredeti) szavazata a megnyitáskor
    // ('Tamogat' | 'Ellenez' | 'Tartozkodik' | null)
    this.jelenlegiSzavazat = null;

    // A felületen éppen KIVÁLASZTOTT (még nem véglegesített) szavazat.
    // A típus-gombok ezt állítják; a „Rendben" ezt küldi majd a szervernek.
    // null = nincs kiválasztva / visszavonás szándéka.
    this.kivalasztottTipus = null;

    // KÜLÖNVÁLÁSI SZÁNDÉK — ugyanaz a kettősség, mint a szavazatnál:
    // ami a szerveren van, és ami a felületen éppen ki van pipálva.
    // Tartózkodásnál mindig hamis (a tartózkodó a főágon marad).
    this.jelenlegiKulonvalas   = false;
    this.kivalasztottKulonvalas = false;

    // Igaz, ha a modal élettartama alatt ténylegesen mentettünk (szerverhívás
    // sikeres volt) — bezáráskor ez alapján töltjük-e újra a paklit
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
      // A típus-gombok csak helyben választanak; a tényleges szerverhívás a
      // „Rendben"-re történik (_megerosites), és sikeres mentés után zár.
      gombok: [
        {
          felirat:   'Rendben',
          tipus:     'elsodleges',
          azonosito: 'szavazat-modal-rendben-gomb',
          akcio:     () => this._megerosites()
        }
      ],
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
    this._kulonvalasJeloloBekotese();

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
      // A korábban jelölt különválási szándék (régi szavazatoknál nincs ilyen mező → hamis)
      this.jelenlegiKulonvalas = !!valasz?.data?.kulonvalasIgeny;
      // A kiválasztás az eredeti szavazatról indul (ezt emeljük ki), így a
      // „Rendben" változatlan állapotnál nem küld feleslegesen a szervernek.
      this.kivalasztottTipus      = this.jelenlegiSzavazat;
      this.kivalasztottKulonvalas = this.jelenlegiKulonvalas;
      this._kivalasztottGombFrissitese();

      console.log('SzavazatModal._sajatSzavazatBetoltese - VÉGE', {
        jelenlegiSzavazat: this.jelenlegiSzavazat,
        jelenlegiKulonvalas: this.jelenlegiKulonvalas
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
        console.log('SzavazatModal - szavazó gomb kattintás (helyi kiválasztás)', { tipus });
        // CSAK helyben választunk – a szerverhívás a „Rendben"-re történik
        this.kivalasztottTipus = tipus;
        // Tartózkodásra váltva a különválási szándék elesik: aki nem foglal állást,
        // a főágon marad. (Ugyanezt a szabályt a backend is kikényszeríti.)
        if (tipus === 'Tartozkodik') {
          this.kivalasztottKulonvalas = false;
        }
        this.modal.hibaTisztitasa();
        this._kivalasztottGombFrissitese();
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
      console.log('SzavazatModal - visszavonás gomb kattintás (helyi törlés)');
      // CSAK helyben töröljük a kiválasztást (nincs szerverhívás). Ha volt
      // eredeti szavazat, a „Rendben" ebből fog visszavonást (DELETE) csinálni.
      this.kivalasztottTipus      = null;
      this.kivalasztottKulonvalas = false;  // szavazat nélkül nincs különválási szándék
      this.modal.hibaTisztitasa();
      this._kivalasztottGombFrissitese();
    });

    console.log('SzavazatModal._visszavonasGombBekotese - VÉGE');
  }

  // ===== KÜLÖNVÁLÁSI JELÖLŐNÉGYZET BEKÖTÉSE =====
  // A pipa CSAK helyben állítja a szándékot; a szerverhívás a „Rendben"-re történik.
  _kulonvalasJeloloBekotese() {
    console.log('SzavazatModal._kulonvalasJeloloBekotese - KEZDÉS');

    const kontener = document.getElementById(this.kontenerAzonosito);
    const jelolo   = kontener?.querySelector('.szavazat-modal__kulonvalas-jelolo');

    jelolo?.addEventListener('change', () => {
      this.kivalasztottKulonvalas = jelolo.checked;
      console.log('SzavazatModal - különválási szándék jelölve (helyi)', {
        kivalasztottKulonvalas: this.kivalasztottKulonvalas
      });
      this.modal.hibaTisztitasa();
    });

    console.log('SzavazatModal._kulonvalasJeloloBekotese - VÉGE', { vanJelolo: !!jelolo });
  }

  // ===== MEGERŐSÍTÉS (Rendben) =====
  // A „Rendben" gombra fut. A kiválasztást (kivalasztottTipus) összeveti a
  // szerveren tárolt eredeti szavazattal (jelenlegiSzavazat), és ez alapján:
  //   - nincs változás  → nem hív szervert, csak zár,
  //   - van kiválasztás → szavazat leadása / módosítása (POST),
  //   - kiválasztás törölve, de volt eredeti → visszavonás (DELETE).
  // Sikeres mentés után a modal bezárul (bezáráskor frissül a pakli).
  async _megerosites() {
    const pending = this.kivalasztottTipus;   // amit a felületen kiválasztott
    const eredeti = this.jelenlegiSzavazat;   // amit a szerver tárol
    // A különválási szándék ugyanígy: kiválasztott ↔ szerveren tárolt
    const pendingKulonvalas = this.kivalasztottKulonvalas;
    const eredetiKulonvalas = this.jelenlegiKulonvalas;
    console.log('SzavazatModal._megerosites - KEZDÉS', {
      javaslatId: this.javaslatId, pending, eredeti, pendingKulonvalas, eredetiKulonvalas
    });

    // Nincs változás → felesleges szerverhívás nélkül zárunk.
    // FIGYELEM: a szavazat típusa ÉS a különválási szándék is számít — ha csak a
    // pipa változott (ugyanaz a szavazat), azt is menteni kell.
    const nincsValtozas = (pending === eredeti) &&
                          (pending === null || pendingKulonvalas === eredetiKulonvalas);

    if (nincsValtozas) {
      console.log('SzavazatModal._megerosites - nincs változás, csak zárás');
      this.modal.bezaras();
      return;
    }

    this.modal.hibaTisztitasa();
    this.modal.betoltesBeallitasa(true);

    try {
      if (pending) {
        // Szavazat leadása vagy módosítása a kiválasztott típussal
        await apiPost('javaslat/szavazat', {
          javaslatId:      this.javaslatId,
          szavazatTipus:   pending,
          kulonvalasIgeny: pendingKulonvalas
        }, this.token);
      } else {
        // pending null, de volt eredeti szavazat → visszavonás
        await apiDelete('javaslat/szavazat', {
          javaslatId: this.javaslatId
        }, this.token);
      }

      // Sikeres mentés: állapot frissítése és zárás
      this.jelenlegiSzavazat   = pending;
      this.jelenlegiKulonvalas = pending ? pendingKulonvalas : false;
      this.valtozottE          = true;
      this.modal.betoltesBeallitasa(false);

      console.log('SzavazatModal._megerosites - VÉGE: sikeres', { pending, pendingKulonvalas });
      this.modal.bezaras();

    } catch (hiba) {
      console.error('SzavazatModal._megerosites - HIBA', hiba.message);
      // A modal nyitva marad, hogy a felhasználó lássa a hibát és javíthasson
      this.modal.hibaBeallitasa(hiba.message ?? 'A szavazat mentése sikertelen.');
    }
  }

  // ===== KIVÁLASZTOTT GOMB FRISSÍTÉSE =====
  // A jelenlegi szavazat alapján kiemeli a megfelelő gombot, és
  // megmutatja / elrejti a visszavonás gombot.
  _kivalasztottGombFrissitese() {
    console.log('SzavazatModal._kivalasztottGombFrissitese - KEZDÉS', {
      kivalasztottTipus: this.kivalasztottTipus,
      jelenlegiSzavazat: this.jelenlegiSzavazat
    });

    const kontener = document.getElementById(this.kontenerAzonosito);
    if (!kontener) return;

    // A kiemelés a HELYI kiválasztást (kivalasztottTipus) tükrözi, nem a
    // szerveren tároltat – így a felhasználó látja, mit fog a „Rendben" menteni
    const gombok = kontener.querySelectorAll('.szavazat-modal__gomb');
    gombok.forEach((gomb) => {
      const kivalasztott = gomb.dataset.szavazat === this.kivalasztottTipus;
      gomb.classList.toggle('szavazat-modal__gomb--kivalasztott', kivalasztott);
      gomb.setAttribute('aria-pressed', kivalasztott ? 'true' : 'false');
    });

    // Visszavonás gomb csak akkor látszik, ha van SZERVEREN tárolt szavazat,
    // amit vissza lehet vonni (a gomb helyben törli a kiválasztást, a tényleges
    // visszavonás a „Rendben"-re történik)
    const visszavonasGomb = kontener.querySelector('.szavazat-modal__visszavonas-gomb');
    if (visszavonasGomb) {
      visszavonasGomb.hidden = !this.jelenlegiSzavazat;
    }

    // A különválási kérdés CSAK állásfoglalásnál értelmes: Támogatom vagy Ellenzem.
    // Tartózkodásnál és kiválasztás nélkül elrejtjük (a tartózkodó a főágon marad).
    const kulonvalasBlokk = kontener.querySelector('.szavazat-modal__kulonvalas');
    const kulonvalasJelolo = kontener.querySelector('.szavazat-modal__kulonvalas-jelolo');
    const kerdesLathato = this.kivalasztottTipus === 'Tamogat' ||
                          this.kivalasztottTipus === 'Ellenez';

    if (kulonvalasBlokk) {
      kulonvalasBlokk.hidden = !kerdesLathato;
    }
    if (kulonvalasJelolo) {
      kulonvalasJelolo.checked = this.kivalasztottKulonvalas;
    }

    console.log('SzavazatModal._kivalasztottGombFrissitese - VÉGE', {
      kerdesLathato,
      kivalasztottKulonvalas: this.kivalasztottKulonvalas
    });
  }
}

// ===== EXPORTÁLÁS =====
export default SzavazatModal;
