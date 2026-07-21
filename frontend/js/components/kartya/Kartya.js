// frontend/js/components/kartya/Kartya.js

// --- IMPORTOK ---
import HamburgerMenu from '../HamburgerMenu.js'; // Hamburger menü komponens
import { apiGet } from '../../utils/apiHelper.js';        // Backend GET – tudatpont-ellenőrzéshez
import { tokenLekerese, aktivEntitasMentese } from '../../utils/authHelper.js'; // Token + navigáláskor az aktív entitás mentése
import ErtesitesekModal from '../modals/ErtesitesekModal.js'; // Ág-szűrt postafiók a kártya menüjéből
import TudatpontokModal from '../modals/TudatpontokModal.js'; // Ág-szűrt Tudatpontok nézet a kártya menüjéből
import KeresesModal from '../modals/KeresesModal.js'; // Ág-szűrt keresés a kártya menüjéből
import TerkepModal from '../modals/TerkepModal.js'; // Ág-szűrt Térkép a kártya menüjéből
import RendezesModal from '../modals/RendezesModal.js'; // Ág-szűrt rendezés a kártya menüjéből (15. terv-pont)
import { dinamikusCimBetumeret } from '../../utils/cimBetumeret.js'; // Közös lépcsős cím-betűméret (a Térkép is ezt használja)

// --- ALAP KÁRTYA OSZTÁLY ---
// Felelőssége:
// 1. A kartya.html sablont betölti fetch-csel (egyszer, statikusan cache-elve)
// 2. Felépíti a kártya DOM elemét az entitás adataiból
// 3. Inicializálja a HamburgerMenu-t a kártya saját kontenerében
// 4. Kezeli a kiválasztott állapotot (fejléc + body láthatóság)
// 5. Koppintás eseményt delegál a Pakli.js-nek callback-en keresztül
// 6. Kezeli a body kibővítés / összezárás logikáját (... gomb)
// A típus-specifikus fejléc és body tartalmát a leszármazott osztályok töltik fel.
class Kartya {

// ----- KONSTRUKTOR -----
// @param {Object} entitas - A pakli egy eleme a backend válaszából
// @param {boolean} kivalasztott - Igaz, ha ez a kiválasztott kártya
// @param {Function} onKivalasztas - Callback: Pakli.js kartyaKivalasztasa(index)
// @param {Function} onHamburgerOpciok - Callback: visszaadja a kártya menü opcióit
// @param {Function} onHamburgerMegnyitas - Callback: hamburger megnyitásakor hívódik,
// csak CSS kiválasztott váltást végez, újrarender nélkül
constructor(entitas, kivalasztott, onKivalasztas, onHamburgerOpciok, onHamburgerMegnyitas) {
  console.log('Kartya.constructor - KEZDÉS', {
    entitasId: entitas?.entitasId,
    entitasTipus: entitas?.entitasTipus,
    kivalasztott
  });

  this.entitas = entitas;
  this.kivalasztott = kivalasztott;
  this.onKivalasztas = onKivalasztas;
  this.onHamburgerOpciok = onHamburgerOpciok;
  this.onHamburgerMegnyitas = onHamburgerMegnyitas;
  this.hamburgerMenu = null;
  this.domElem = null;
  // A cím-sáv (felső sáv) DOM elem referenciája – a betűméret utólagos
  // hozzáigazításához kell (a Pakli a DOM-ba illesztés után hívja)
  this.cimSavElem = null;
  // A body DOM elem referenciája – bodyFrissitese() és kibővítés használja
  this.bodyElem = null;
  // A kibővítő gomb DOM elem referenciája – állapotváltáshoz kell
  this.kibovitöGomb = null;
  // Nyomon követi, hogy a body ki van-e bővítve
  this.kibovitettE = false;

  console.log('Kartya.constructor - VÉGE', { entitasId: entitas?.entitasId });
}

// ----- INICIALIZÁLÁS -----
// Betölti a HTML sablont, felépíti a DOM-ot, bekötési eseményeket.
// @returns {Promise<HTMLElement|null>} A kész kártya DOM eleme, vagy null hiba esetén
async init() {
  console.log('Kartya.init - KEZDÉS', { entitasId: this.entitas?.entitasId });

  // 1. LÉPÉS – HTML sablon betöltése
  const sablon = await this._sablonBetoltese();
  if (!sablon) {
    console.error('Kartya.init - VÉGE hiba: sablon nem töltődött be');
    return null;
  }

  // 2. LÉPÉS – DOM elem kinyerése a sablonból
  this.domElem = sablon.firstElementChild;
  if (!this.domElem) {
    console.error('Kartya.init - VÉGE hiba: sablon üres vagy érvénytelen');
    return null;
  }

  // 3. LÉPÉS – Kiválasztott állapot beállítása
  this._kivalasztottAllapotBeallitasa();

  // 4. LÉPÉS – Egyedi ID beállítása a hamburger kontenernek
  const hamburgerKontener = this.domElem.querySelector('.pakli-kartya__hamburger-kontener');
  if (!hamburgerKontener) {
    console.error('Kartya.init - hamburger kontener nem található a sablonban');
    return null;
  }
  const egyediKontenerAzonosito = `kartya-hamburger-${this.entitas.entitasId}`;
  hamburgerKontener.id = egyediKontenerAzonosito;

  // 5. LÉPÉS – HamburgerMenu inicializálása
  const opciok = this.onHamburgerOpciok
    ? this.onHamburgerOpciok(this.entitas)
    : [];

  // KÖZÖS MENÜPONT MINDEN KÁRTYÁN: az entitás ÁGÁNAK értesítései (ág-szűrt postafiók).
  // A badge:true miatt a sor jobb szélén a részfa-olvasatlan számláló is megjelenik
  // (ugyanaz a szám, mint a gomb sarkán — a lenti badgeFrissitese tölti mindkettőt).
  // Csak akkor tesszük be, ha a kártya kapott modal-konténert (az ismeretlen típusú
  // alap-kártyának nincs, ott a menüpont sem értelmezhető).
  if (this.modalKontenerAzon) {
    opciok.push({
      ikon:    '🔔',
      felirat: 'Értesítések',
      badge:   true,
      akcio:   () => this._agErtesitesekMegnyitasa()
    });
    // KÖZÖS MENÜPONT MINDEN KÁRTYÁN: az entitás ÁGA alatti saját tudatpontok
    // (ág-szűrt Tudatpontok nézet) — Csaba kérése (2026-07-18): a fő menüs lista
    // a kártyákról ágazatra szűrve is elérhető legyen.
    opciok.push({
      ikon:    '🌟',
      felirat: 'Tudatpontok',
      akcio:   () => this._agTudatpontokMegnyitasa()
    });
    // KÖZÖS MENÜPONT MINDEN KÁRTYÁN: keresés az entitás ÁGA alatt (ág-szűrt
    // kereső) — Csaba kérése (2026-07-18): a kereső a kártyákról is elérhető.
    opciok.push({
      ikon:    '🔍',
      felirat: 'Keresés',
      akcio:   () => this._agKeresesMegnyitasa()
    });
    // KÖZÖS MENÜPONT MINDEN KÁRTYÁN: az entitás ÁGÁNAK térképe (ág-szűrt
    // Térkép) — terv 13/b: a fő menü a teljes fát, a kártya a saját részfáját nyitja.
    opciok.push({
      ikon:    '🗺️',
      felirat: 'Térkép',
      akcio:   () => this._agTerkepMegnyitasa()
    });
    // KÖZÖS MENÜPONT MINDEN KÁRTYÁN: rendezés az entitás ÁGÁN (részfáján) belül
    // (15. terv-pont) — a fő menü globálisan rendez, a kártya a saját részfáját.
    opciok.push({
      ikon:    '↕️',
      felirat: 'Rendezés',
      akcio:   () => this._agRendezesMegnyitasa()
    });
  }

  this.hamburgerMenu = new HamburgerMenu(hamburgerKontener, opciok);
  await this.hamburgerMenu.init();

  // RÉSZFA-BADGE: az entitás ága alatti olvasatlan értesítések száma a hamburger
  // gomb sarkán (a badge-span a közös template része, alapból rejtett). A számot a
  // backend küldi a pakli-elemen (olvasatlanErtesitesek, osLanc-alapú számlálás);
  // 0-nál a badge rejtve marad.
  this.hamburgerMenu.badgeFrissitese(this.entitas.olvasatlanErtesitesek ?? 0);

  // Jogosultság: a menü MINDEN megnyitásakor frissítjük a tudatpont-függő
  // menüpontokat (aktív/inaktív) a eember entitáson lévő pontja alapján.
  // A HamburgerMenu a megnyitas()-ban hívja ezt a callbacket – így az esemény-
  // sorrendtől függetlenül, megbízhatóan lefut (a gomb click-figyelője nem lenne az).
  this.hamburgerMenu.onMegnyitas = () => this._tudatpontFuggoMenuFrissitese();

  // 6. LÉPÉS – Hamburger gomb megnyitás esemény bekötése
  // A hamburger gomb megnyitásakor – mielőtt a panel megjelenik –
  // értesítjük a Pakli.js-t, hogy csak CSS szinten váltsa ki a kiválasztott állapotot,
  // újrarender és szövegbetöltés nélkül
  const hamburgerGomb = hamburgerKontener.querySelector('.hamburger-gomb');
  if (hamburgerGomb && typeof this.onHamburgerMegnyitas === 'function') {
    hamburgerGomb.addEventListener('click', () => {
      // Csak nyitáskor hívjuk – ha már nyitva van, bezárás következik, nem kell váltás
      if (!this.hamburgerMenu.nyitottE) {
        this.onHamburgerMegnyitas();
      }
    });
    // Megjegyzés: a HamburgerMenu.js saját click figyelője is fut ezután (megnyitas/bezaras),
    // az addEventListener sorrendje garantálja, hogy ez előbb fut – a kiválasztás megelőzi a nyitást
  }

  // 7. LÉPÉS – Fejléc feltöltése (leszármazott osztály felülírja)
  // A háromsávos fejléc két slotot kínál a leszármazottnak:
  //  - cimSav  = a felső sáv (cím / név / megnevezés)
  //  - ikonSav = a jobb oldali ikon-terület (ikon+szám blokkok)
  const cimSav  = this.domElem.querySelector('.pakli-kartya__fejlec-cim');
  const ikonSav = this.domElem.querySelector('.pakli-kartya__fejlec-ikonok');
  if (cimSav && ikonSav) {
    // Az ikon-terület két sorból áll:
    //  1. sor = közös tudatpont-sor (minden kártyán azonos) – a base építi
    this._kozosTudatpontSorFeltoltese(ikonSav);
    //  2. sor = típus-specifikus ikon+szám blokkok – a leszármazott tölti
    const masodikSor = document.createElement('div');
    masodikSor.className = 'pakli-kartya__ikon-sor pakli-kartya__ikon-sor--tipus';
    ikonSav.appendChild(masodikSor);
    this._fejlecFeltoltese(cimSav, masodikSor);
    // A cím-sáv referenciáját eltároljuk, hogy a Pakli a kártya DOM-ba illesztése
    // UTÁN pontosan a rendelkezésre álló szélességhez tudja igazítani a betűméretet.
    this.cimSavElem = cimSav;
    // Dinamikus címméret CSAK a Tartalom kártyán (lásd _cimDinamikusMeretu). A többi
    // kártyatípus címe FIX méretű (a CSS adja) – ott nem méretezünk.
    if (this._cimDinamikusMeretu()) {
      // Első, DURVA becslés a betűméretre: a kártya ekkor még NINCS a DOM-ban, így a
      // tényleges szélesség nem mérhető – a karakterszám adja az azonnali, villódzás-
      // mentes méretet. A pontos, mérésen alapuló hozzáigazítás a
      // cimBetumeretHozzaigazitasa()-ben történik, amit a Pakli hív a beillesztés után.
      this._cimBetumeretBecsles(cimSav);
    }
  }

  // 8. LÉPÉS – Body elem referenciájának eltárolása és feltöltése, ha kiválasztott
  // A body elem mindig jelen van a sablonban, hidden attribútummal.
  // Kiválasztott állapotban eltávolítjuk a hidden-t és feltöltjük a tartalmat,
  // majd ellenőrizzük, hogy kell-e kibővítő gomb.
  // Nem kiválasztott állapotban a hidden megmarad – nincs felesleges DOM tartalom.
  this.bodyElem = this.domElem.querySelector('.pakli-kartya__body');
  if (this.kivalasztott && this.bodyElem) {
    this.bodyElem.removeAttribute('hidden');
    this._bodyFeltoltese(this.bodyElem);
    // Kibővítő gomb hozzáadása a bodyhoz, ha a tartalom túlnyúlik
    this._kibovitöGombFrissitese();
  }

  // 9. LÉPÉS – Koppintás esemény bekötése
  // role és aria-label beállítása a kártyán az akadálymentességért
  // A hamburger gomb stopPropagation-nal kizárja magát (HamburgerMenu.js kezeli)
  this.domElem.setAttribute('role', 'article');
  this.domElem.setAttribute(
    'aria-label',
    `${this.entitas.entitasTipus ?? 'Entitás'} kártya`
  );
  this.domElem.addEventListener('click', () => {
    if (typeof this.onKivalasztas === 'function') {
      this.onKivalasztas();
    }
  });

  console.log('Kartya.init - VÉGE', { entitasId: this.entitas?.entitasId });
  return this.domElem;
}

// ----- TUDATPONT-FÜGGŐ MENÜPONTOK FRISSÍTÉSE (JOGOSULTSÁG) -----
// A hamburger menü megnyitásakor fut. Lekérdezi, van-e a bejelentkezett
// eembernek tudatpontja EZEN az entitáson, és a tudatpontFuggo menüpontokat
// aszerint teszi aktívvá / inaktívvá. Ha nincs ilyen menüpont, nem hív backendet.
// FONTOS: ez csak felületi jelzés – a tényleges védelmet a backend külön kikényszeríti.
async _tudatpontFuggoMenuFrissitese() {
  // Nincs jogosultsághoz kötött menüpont → nincs teendő, nincs felesleges hívás
  if (!this.hamburgerMenu || !this.hamburgerMenu.vanTudatpontFuggoPont()) {
    return;
  }

  const entitasTipus = this.entitas?.entitasTipus;
  const entitasId    = this.entitas?.entitasId;
  if (!entitasTipus || !entitasId) return;

  console.log('Kartya._tudatpontFuggoMenuFrissitese - KEZDÉS', { entitasTipus, entitasId });

  try {
    const token  = tokenLekerese();
    const valasz = await apiGet(`tudatpont/entitas/${entitasTipus}/${entitasId}`, token);

    // eemberHozzajarulas = a bejelentkezett eember SAJÁT pontja az entitáson
    // (a tudatponthozzarendeles.tudatPontok értéke), nem az entitás összpontja
    const sajatPont = valasz?.data?.eemberHozzajarulas ?? 0;

    // Nincs saját pont → a tudatpontFuggo menüpontok inaktívak
    this.hamburgerMenu.tudatpontFuggoTiltasBeallitasa(sajatPont <= 0);

    console.log('Kartya._tudatpontFuggoMenuFrissitese - VÉGE', { sajatPont });
  } catch (hiba) {
    // Hiba esetén NEM tiltunk (a backend úgyis véd) – a menü használható marad
    console.error('Kartya._tudatpontFuggoMenuFrissitese - HIBA', hiba.message);
  }
}

// ----- ÁG-SZŰRT ÉRTESÍTÉSEK MEGNYITÁSA -----
// A kártya-hamburger közös „Értesítések" menüpontja hívja. A közös ErtesitesekModal-t
// nyitja ÁG-SZŰRT módban: csak azok az értesítések látszanak, amik EZEN az entitáson
// vagy bármely leszármazottján történtek (a backend az osLanc alapján szűr).
// Értesítésre kattintva az érintett entitásra navigálunk (pakli-újratöltés); ha csak
// olvasottnak jelölés történt, a modal bezárásakor frissül a pakli (badge-fogyás).
async _agErtesitesekMegnyitasa() {
  console.log('Kartya._agErtesitesekMegnyitasa - KEZDÉS', {
    entitasId: this.entitas?.entitasId,
    entitasTipus: this.entitas?.entitasTipus
  });

  // A modal címébe az entitás címe/neve kerül, ha van (Javaslat/Egyezménynél nincs)
  const adatok = this.entitas?.adatok ?? {};
  const agCim  = adatok.cim ?? adatok.nev ?? null;

  const ertesitesekModal = new ErtesitesekModal(this.modalKontenerAzon, {
    token:       this.token ?? tokenLekerese(),
    agEntitasId: this.entitas.entitasId,
    cim:         agCim ? `Értesítések – ${agCim}` : 'Értesítések – ez az ág',

    // Értesítésre kattintás → az érintett entitásra navigálunk: elmentjük aktívnak,
    // majd a központi újratöltő callback a paklit arra az entitásra építi újra
    onEntitasKivalasztas: (entitasId, entitasTipus) => {
      aktivEntitasMentese(entitasId, entitasTipus);
      if (typeof this.onUjratoltes === 'function') this.onUjratoltes(entitasId, entitasTipus);
    },

    // Olvasottnak jelölés után az APP-SZINTŰ badge frissítése: a kártya nem éri el
    // közvetlenül a FoOldal-t, ezért eseményt küldünk, amire a FoOldal feliratkozott
    onValtozas: () => document.dispatchEvent(new CustomEvent('koino:ertesitesValtozas')),

    // A modal bezárásakor (ha volt jelölés, de nem navigáltunk) a pakli újratöltése,
    // hogy a kártya-badge-ek friss (csökkent) számokat mutassanak
    onBezarasValtozassal: () => {
      if (typeof this.onUjratoltes === 'function') this.onUjratoltes();
    }
  });

  await ertesitesekModal.init();
  await ertesitesekModal.megnyitas();

  console.log('Kartya._agErtesitesekMegnyitasa - VÉGE');
}

// ----- ÁG-SZŰRT TUDATPONTOK MEGNYITÁSA -----
// A kártya-hamburger közös „Tudatpontok" menüpontja hívja. A közös TudatpontokModal-t
// nyitja ÁG-SZŰRT módban: csak azok a saját hozzárendelések látszanak, amelyek EZEN
// az entitáson vagy bármely leszármazottján vannak (a backend az ős-lánc bejárásával
// szűr). Sorra kattintva az entitásra navigálunk; pont-módosítás után a modal
// bezárásakor frissül a pakli (hierarchikus pontok).
async _agTudatpontokMegnyitasa() {
  console.log('Kartya._agTudatpontokMegnyitasa - KEZDÉS', {
    entitasId: this.entitas?.entitasId,
    entitasTipus: this.entitas?.entitasTipus
  });

  // A modal címébe az entitás címe/neve kerül, ha van (Javaslat/Egyezménynél nincs)
  const adatok = this.entitas?.adatok ?? {};
  const agCim  = adatok.cim ?? adatok.nev ?? null;

  const tudatpontokModal = new TudatpontokModal(this.modalKontenerAzon, {
    token:       this.token ?? tokenLekerese(),
    agEntitasId: this.entitas.entitasId,
    cim:         agCim ? `Tudatpontok – ${agCim}` : 'Tudatpontok – ez az ág',

    // Sorra kattintás → az entitásra navigálunk: elmentjük aktívnak, majd a
    // központi újratöltő callback a paklit arra az entitásra építi újra
    onEntitasKivalasztas: (entitasId, entitasTipus) => {
      aktivEntitasMentese(entitasId, entitasTipus);
      if (typeof this.onUjratoltes === 'function') this.onUjratoltes(entitasId, entitasTipus);
    },

    // Pont-módosítás után az APP-SZINTŰ alsó sáv (szabad pont) frissítése — a kártya
    // nem éri el közvetlenül a FoOldal-t, ezért ugyanazt az eseményt küldjük, amit
    // az értesítés-változás is használ (a FoOldal adat-frissítést csinál rá)
    onValtozas: () => document.dispatchEvent(new CustomEvent('koino:tudatpontValtozas')),

    // A modal bezárásakor (ha volt módosítás, de nem navigáltunk) a pakli
    // újratöltése, hogy a kártyák friss (hierarchikus) pontokat mutassanak
    onBezarasValtozassal: () => {
      if (typeof this.onUjratoltes === 'function') this.onUjratoltes();
    }
  });

  await tudatpontokModal.init();
  await tudatpontokModal.megnyitas();

  console.log('Kartya._agTudatpontokMegnyitasa - VÉGE');
}

// ----- ÁG-SZŰRT KERESÉS MEGNYITÁSA -----
// A kártya-hamburger közös „Keresés" menüpontja hívja. A közös KeresesModal-t
// nyitja ÁG-SZŰRT módban: csak azok a találatok jönnek, amelyek EZEN az entitáson
// vagy bármely leszármazottján vannak (a backend az ős-lánc bejárásával szűr).
// Találatra kattintva az entitásra navigálunk.
async _agKeresesMegnyitasa() {
  console.log('Kartya._agKeresesMegnyitasa - KEZDÉS', {
    entitasId: this.entitas?.entitasId,
    entitasTipus: this.entitas?.entitasTipus
  });

  // A modal címébe az entitás címe/neve kerül, ha van (Javaslat/Egyezménynél nincs)
  const adatok = this.entitas?.adatok ?? {};
  const agCim  = adatok.cim ?? adatok.nev ?? null;

  const keresesModal = new KeresesModal(this.modalKontenerAzon, {
    token:       this.token ?? tokenLekerese(),
    agEntitasId: this.entitas.entitasId,
    cim:         agCim ? `Keresés – ${agCim}` : 'Keresés – ez az ág',

    // Találatra kattintás → az entitásra navigálunk: elmentjük aktívnak, majd a
    // központi újratöltő callback a paklit arra az entitásra építi újra
    onEntitasKivalasztas: (entitasId, entitasTipus) => {
      aktivEntitasMentese(entitasId, entitasTipus);
      if (typeof this.onUjratoltes === 'function') this.onUjratoltes(entitasId, entitasTipus);
    }
  });

  await keresesModal.init();
  keresesModal.megnyitas();

  console.log('Kartya._agKeresesMegnyitasa - VÉGE');
}

// ----- ÁG-SZŰRT TÉRKÉP MEGNYITÁSA -----
// KÖZÖS menüpont minden kártya-hamburgerben: az entitás ÁGÁNAK teljes képernyős
// térképe (terv 13/b). Az ág gyökere maga az entitás — a térképen kiemelve.
// Csomópontra kattintva a pakli a választott entitásra navigál.
async _agTerkepMegnyitasa() {
  console.log('Kartya._agTerkepMegnyitasa - KEZDÉS', {
    entitasId: this.entitas?.entitasId,
    entitasTipus: this.entitas?.entitasTipus
  });

  // A modal címébe az entitás címe/neve kerül, ha van (Javaslat/Egyezménynél nincs)
  const adatok = this.entitas?.adatok ?? {};
  const agCim  = adatok.cim ?? adatok.nev ?? null;

  const terkepModal = new TerkepModal(this.modalKontenerAzon, {
    token:             this.token ?? tokenLekerese(),
    agEntitasId:       this.entitas.entitasId,
    aktualisEntitasId: this.entitas.entitasId,
    cim:               agCim ? `Térkép – ${agCim}` : 'Térkép – ez az ág',

    // Csomópontra kattintás → az entitásra navigálunk: elmentjük aktívnak, majd a
    // központi újratöltő callback a paklit arra az entitásra építi újra
    onEntitasKivalasztas: (entitasId, entitasTipus) => {
      aktivEntitasMentese(entitasId, entitasTipus);
      if (typeof this.onUjratoltes === 'function') this.onUjratoltes(entitasId, entitasTipus);
    }
  });

  await terkepModal.init();
  terkepModal.megnyitas();

  console.log('Kartya._agTerkepMegnyitasa - VÉGE');
}

// ----- ÁG-SZŰRT RENDEZÉS MEGNYITÁSA -----
// KÖZÖS menüpont minden kártya-hamburgerben: rendezés az entitás ÁGÁN (részfáján)
// belül (15. terv-pont). A fő menü globálisan rendez; a kártya az adott entitást
// veszi ágazat-gyökérnek. A választást a Rendezés-modal gyűjti, az alkalmazást a
// jelenlegi pakli (window.aktivPakli) végzi. Hierarchikus módban az ágazatnak nincs
// értelme (a fa-szelet a mentett entitástól épül) → ott globálisra esik vissza.
async _agRendezesMegnyitasa() {
  console.log('Kartya._agRendezesMegnyitasa - KEZDÉS', {
    entitasId: this.entitas?.entitasId,
    entitasTipus: this.entitas?.entitasTipus
  });

  const adatok = this.entitas?.adatok ?? {};
  const agCim  = adatok.cim ?? adatok.nev ?? null;
  const pakli  = window.aktivPakli;

  const rendezesModal = new RendezesModal(this.modalKontenerAzon, {
    aktualisMod:   pakli?.rendezesMod   ?? 'hierarchikus',
    aktualisIrany: pakli?.rendezesIrany ?? 'csokkeno',
    agazatCim:     agCim,
    onAlkalmaz: (mod, irany) => {
      // Lapos módban az adott entitás az ágazat-gyökér; hierarchikusnál nincs ágazat.
      const agazatId = (mod === 'hierarchikus') ? null : this.entitas.entitasId.toString();
      console.log('Kartya - ág-szűrt rendezés alkalmazása', { mod, irany, agazatId });
      window.aktivPakli?.rendezesBeallitasa(mod, irany, agazatId);
    }
  });

  await rendezesModal.init();
  rendezesModal.megnyitas();

  console.log('Kartya._agRendezesMegnyitasa - VÉGE');
}

// ----- BODY FRISSÍTÉSE -----
// Pakli.js kartyaKivalasztasa() hívja kártyaváltáskor.
// DOM újraépítés nélkül megjeleníti a body-t és feltölti az új szöveggel.
// Leszármazott osztályok felülírhatják, ha speciális body logikájuk van.
// @param {string|null} szoveg - Az API-tól visszakapott szöveg, vagy null hiba esetén
bodyFrissitese(szoveg) {
  console.log('Kartya.bodyFrissitese - KEZDÉS', {
    entitasId: this.entitas?.entitasId,
    vanSzoveg: !!szoveg
  });

  if (!this.bodyElem) {
    console.warn('Kartya.bodyFrissitese - VÉGE: bodyElem nem elérhető');
    return;
  }

  // Kiválasztott CSS osztály és aria attribútum beállítása a domElemen
  // (kivalasztottCsakCssValt() már megtette, de itt is biztosítjuk a konzisztenciát)
  this.kivalasztott = true;
  this.domElem.classList.add('pakli-kartya--kivalasztott');
  this.domElem.setAttribute('aria-selected', 'true');
  this.domElem.style.cursor = 'default';

  // Az entitás adatok frissítése a tárolt szövegmezővel,
  // hogy _bodyFeltoltese() a legfrissebb adatot lássa
  if (!this.entitas.adatok) this.entitas.adatok = {};
  this.entitas.adatok.szovegMezo = szoveg ?? null;

  // Body megjelenítése és tartalmának feltöltése
  this.bodyElem.innerHTML = '';
  this.bodyElem.removeAttribute('hidden');

  // Kibővítés állapot visszaállítása – új tartalom mindig zárt állapotból indul
  this.kibovitettE = false;
  this.bodyElem.classList.remove('pakli-kartya__body--kibovitett');

  this._bodyFeltoltese(this.bodyElem);

  // Kibővítő gomb frissítése az új tartalomhoz
  this._kibovitöGombFrissitese();

  console.log('Kartya.bodyFrissitese - VÉGE', { entitasId: this.entitas?.entitasId });
}

// ----- SABLON BETÖLTÉSE -----
// A kartya.html-t tölti be fetch-csel.
// Statikus cache: az osztályon tárolja, hogy ne töltse le minden kártyánál újra.
// @returns {Promise<HTMLElement|null>}
async _sablonBetoltese() {
  console.log('Kartya._sablonBetoltese - KEZDÉS');

  if (Kartya._sablonCache) {
    console.log('Kartya._sablonBetoltese - VÉGE cache-ből');
    return Kartya._sablonCache.cloneNode(true);
  }

  try {
    const valasz = await fetch('./html/components/kartya/kartya.html');
    if (!valasz.ok) {
      throw new Error(`Sablon betöltési hiba: ${valasz.status}`);
    }
    const htmlSzoveg = await valasz.text();

    const ideiglenesDom = document.createElement('div');
    ideiglenesDom.innerHTML = htmlSzoveg.trim();

    Kartya._sablonCache = ideiglenesDom;

    console.log('Kartya._sablonBetoltese - VÉGE letöltve és cache-elve');
    return ideiglenesDom.cloneNode(true);
  } catch (hiba) {
    console.error('Kartya._sablonBetoltese - VÉGE hiba', { hiba: hiba.message });
    return null;
  }
}

// ----- KIVÁLASZTOTT ÁLLAPOT BEÁLLÍTÁSA -----
// CSS osztályt ad hozzá vagy vesz el a kiválasztott állapot alapján.
_kivalasztottAllapotBeallitasa() {
  console.log('Kartya._kivalasztottAllapotBeallitasa - KEZDÉS', {
    kivalasztott: this.kivalasztott
  });

  if (this.kivalasztott) {
    this.domElem.classList.add('pakli-kartya--kivalasztott');
    this.domElem.setAttribute('aria-selected', 'true');
  } else {
    this.domElem.classList.remove('pakli-kartya--kivalasztott');
    this.domElem.setAttribute('aria-selected', 'false');
  }

  console.log('Kartya._kivalasztottAllapotBeallitasa - VÉGE');
}

// ----- FEJLÉC FELTÖLTÉSE -----
// Alap implementáció: üres. Leszármazott osztályok felülírják.
// A cím-sávba a típus szerinti szöveg (cím/név/megnevezés), a második sorba a
// típus-specifikus ikon+szám blokkok kerülnek. Az 1. (közös tudatpont) sort a
// base már megépítette – a leszármazott CSAK a második sort tölti.
// @param {HTMLElement} cimSav     - A .pakli-kartya__fejlec-cim elem (felső sáv)
// @param {HTMLElement} masodikSor - Az ikon-terület 2. sora (típus-specifikus)
_fejlecFeltoltese(cimSav, masodikSor) {
  console.log('Kartya._fejlecFeltoltese - KEZDÉS alap (felülírás szükséges)');
  console.log('Kartya._fejlecFeltoltese - VÉGE');
}

// ----- KÖZÖS TUDATPONT-SOR (az ikon-terület 1. sora, minden kártyán azonos) -----
// Az entitás saját összpontja + a hierarchikus összpont + a hozzájárulók száma
// MINDIG megjelenik; a néző e-ember saját pontja CSAK akkor, ha van neki (>0).
// @param {HTMLElement} ikonSav - A .pakli-kartya__fejlec-ikonok elem
_kozosTudatpontSorFeltoltese(ikonSav) {
  const e = this.entitas ?? {};

  const sor = document.createElement('div');
  sor.className = 'pakli-kartya__ikon-sor pakli-kartya__ikon-sor--tudatpont';

  // A tudatpont MINDIG 🌟-gal jelenik meg; a fajtát egy elő-ikon különbözteti meg.
  // ELÖL a néző e-ember saját pontja az entitáson – 👤 (én/enyém) + 🌟 – CSAK ha van neki (>0)
  const sajat = e.eemberSajatTudatpontEntitason ?? 0;
  // Hozzájárulók száma (hány e-ember tett rá közvetlen pontot)
  sor.appendChild(this._ikonElem('👥', e.hozzajarulokSzama, 'Hozzájárulók száma'));
  if (sajat > 0) {
    sor.appendChild(this._ikonElem('👤🌟', sajat, 'A te tudatpontod ezen az entitáson', 'pakli-kartya__ikon-elem--sajat'));
  }
  // Entitás saját (közvetlen) tudatpontja – saját rajzolt levél-a-száron SVG-ikon + 🌟
  sor.appendChild(this._sajatTudatpontChip(e.entitasSajatTudatpont, 'Entitás saját tudatpontja'));
  // Ágazati (hierarchikus) tudatpont: az entitás saját + az összes leszármazottja – 🌿 + 🌟
  sor.appendChild(this._ikonElem('🌿🌟', e.hierarchikusOsszesPont, 'Ágazati tudatpont (az entitás és összes leszármazottja)'));

  ikonSav.appendChild(sor);
}

// ----- EGY IKON+SZÁM BLOKK -----
// Egységes ikon+szám elem az ikon-területhez (emoji + formázott érték).
// @param {string} emoji - a jelölő emoji
// @param {number} ertek - a megjelenítendő szám
// @param {string} cimke - aria-label és tooltip
// @param {string} extraOsztaly - opcionális kiegészítő CSS-osztály
// @returns {HTMLElement}
_ikonElem(emoji, ertek, cimke, extraOsztaly = '') {
  const el = document.createElement('span');
  el.className = `pakli-kartya__ikon-elem ${extraOsztaly}`.trim();
  el.setAttribute('aria-label', cimke);
  el.title = cimke;
  el.textContent = `${emoji} ${Number(ertek ?? 0).toLocaleString('hu-HU')}`;
  return el;
}

// ----- SAJÁT (RAJZOLT) LEVÉL-A-SZÁRON IKON -----
// Kis inline SVG: zöld levél egy barna száron (a fejlesztő rajza alapján). Azért SVG
// és nem emoji, mert a Unicode-ban nincs „egy levél egy száron" glyph. A méret 1em
// (a chip betűméretéhez igazodik). aria-hidden – a chip span aria-label-je viszi a jelentést.
// @returns {string} inline SVG markup
_levelIkonSvg() {
  return '<svg viewBox="0 0 24 24" width="1.05em" height="1.05em" aria-hidden="true" '
    + 'style="flex-shrink:0; vertical-align:-0.15em">'
    + '<path d="M15 22 L15 4" fill="none" stroke="#9c6633" stroke-width="2.2" stroke-linecap="round"/>'
    + '<path d="M15 13 C12 6 6 3 2.5 5 C3 9 7.5 13 15 13 Z" fill="#37a24d"/>'
    + '</svg>';
}

// ----- SAJÁT TUDATPONT CHIP (SVG-levél + 🌟 + érték) -----
// Az entitás saját (közvetlen) tudatpontját mutatja a fejléc tudatpont-sorában.
// Ugyanolyan chip, mint az _ikonElem, de emoji helyett a rajzolt levél-SVG-t használja.
// @param {number} ertek - a megjelenítendő szám
// @param {string} cimke - aria-label és tooltip
// @returns {HTMLElement}
_sajatTudatpontChip(ertek, cimke) {
  const el = document.createElement('span');
  el.className = 'pakli-kartya__ikon-elem';
  el.setAttribute('aria-label', cimke);
  el.title = cimke;
  const szam = Number(ertek ?? 0).toLocaleString('hu-HU');
  // levél-SVG + 🌟 tudatpont-jelző + érték (a szám sima szöveg, nem tartalmaz HTML-t)
  el.innerHTML = `${this._levelIkonSvg()} 🌟 ${szam}`;
  return el;
}

// ----- TÍPUS-ELŐTAG IKON (a 2. ikonsávban az egyedi ikon elé) -----
// Kis emoji-jelző, ami megmondja, MILYEN entitás egyedi ikonja következik:
// 🧩 kategória, 🏷️ tartalomtípus. A hívó egy szoros „csoport" konténerbe teszi az
// előtagot és az egyedi ikon(oka)t (pakli-kartya__tipus-ikon-csoport).
// @param {string} emoji - a típus-jelző emoji
// @param {string} cimke - a típus neve (aria-label + tooltip)
// @returns {HTMLElement}
_tipusElotag(emoji, cimke) {
  const el = document.createElement('span');
  el.className = 'pakli-kartya__tipus-elotag';
  el.textContent = emoji;
  el.setAttribute('aria-label', cimke);
  el.title = cimke;
  return el;
}

// ----- EGY SZÁZALÉK-BLOKK -----
// Ikon+százalék elem az ikon-területhez: a törtszázalékot EGÉSZRE KEREKÍTI és
// „%" jelet tesz utána. Hiányzó/érvénytelen értéknél „–".
// @param {string} emoji - a jelölő emoji
// @param {number} ertek - a százalék (0–100, lehet tört)
// @param {string} cimke - aria-label és tooltip
// @returns {HTMLElement}
_szazalekElem(emoji, ertek, cimke) {
  const van = (ertek !== null && ertek !== undefined && !Number.isNaN(Number(ertek)));
  const szoveg = van ? `${Math.round(Number(ertek))}%` : '–';

  const el = document.createElement('span');
  el.className = 'pakli-kartya__ikon-elem';
  el.setAttribute('aria-label', `${cimke}: ${szoveg}`);
  el.title = cimke;
  el.textContent = `${emoji} ${szoveg}`;
  return el;
}

// ----- DINAMIKUS CÍMMÉRET? (leszármazott felülírhatja) -----
// Alapból NEM: a legtöbb kártyatípus címe FIX méretű (a CSS adja). Csak a
// TartalomKartya írja felül igazra, mert a tartalom címe tetszőleges hosszú lehet,
// ezért ott a betűméretet a szöveg hosszához / a rendelkezésre álló helyhez igazítjuk.
// @returns {boolean}
_cimDinamikusMeretu() {
  return false;
}

// ----- CÍM BETŰMÉRET – ELSŐ BECSLÉS (KARAKTERSZÁM ALAPJÁN) -----
// A felső sáv (cím/név/megnevezés) betűméretének DURVA, azonnali becslése a szöveg
// HOSSZÁBÓL. Az init()-ben fut, amikor a kártya MÉG NINCS a DOM-ban, így a tényleges
// szélesség nem mérhető – ez adja a villódzásmentes kezdőméretet. A pontos, valódi
// szélességen alapuló beállítást a cimBetumeretHozzaigazitasa() végzi a beillesztés után.
// A karakterszám alapján lépcsőzetesen választ méretet (a kártyák szélessége azonos,
// ezért a hossz jó közelítés; a túl hosszút a CSS ellipszise vágja).
// Az inline betűméret felülírja a típus-specifikus cím-osztály méretét.
// @param {HTMLElement} cimSav - A .pakli-kartya__fejlec-cim elem
_cimBetumeretBecsles(cimSav) {
  if (!cimSav) return;

  // A státusz (ha van) NEM számít bele a hosszba és NEM méretezzük dinamikusan –
  // csak a cím/név/megnevezés szövege.
  const cimGyerekek = [...cimSav.children].filter(
    (el) => !el.classList.contains('pakli-kartya__cim-statusz')
  );

  const hossz = cimGyerekek.reduce((ossz, el) => ossz + (el.textContent ?? '').trim().length, 0);

  // Lépcsős betűméret a karakterszám függvényében (px), a KÖZÖS skálából (a
  // Térkép csomópont-címei is ezt használják). A maximum 24, mint eddig.
  const meret = dinamikusCimBetumeret(hossz);

  // Minden cím-gyerekre (pl. egyezménynél a 🤝 jelző + a szöveg is)
  for (const gyerek of cimGyerekek) {
    gyerek.style.fontSize = `${meret}px`;
  }

  console.log('Kartya._cimBetumeretBecsles - VÉGE', { hossz, meret });
}

// ----- CÍM BETŰMÉRET – PONTOS HOZZÁIGAZÍTÁS (VALÓDI SZÉLESSÉGHEZ, MAX. 3 SOR) -----
// A Pakli hívja, MIUTÁN a kártya bekerült a DOM-ba (requestAnimationFrame-ben).
// Ekkor már van valódi szélessége a cím-sávnak, ezért pontosan meg tudjuk mérni,
// elfér-e a szöveg, és a betűméretet a RENDELKEZÉSRE ÁLLÓ HELY függvényében állítjuk
// be – nem csak a karakterszám becsléséből (lásd _cimBetumeretBecsles).
//
// A cím a CSS-ben LEGFELJEBB 3 SORBA tördel (line-clamp: 3), ezért a betűméretet úgy
// választjuk, hogy a szöveg ~3 sorba elférjen: rövid cím nagy, hosszú cím kisebb, de
// nem egyetlen sorra zsugorítjuk (mint korábban), hanem a 3-soros helyet használjuk.
//
// Módszer (EGYETLEN méréssel, ciklus nélkül):
//  1. A cím-gyerekekre a MAX betűméretet állítjuk, és a MÉRÉS idejére IDEIGLENESEN
//     egy sorba kényszerítjük (white-space: nowrap), hogy a szöveg TERMÉSZETES,
//     tördeletlen szélességét kapjuk (a scrollWidth a teljes, nem vágott szélesség).
//  2. Természetes szélesség = a gyerekek scrollWidth-jeinek összege + a rések (gap).
//     A mérés után visszaengedjük a tördelést a megjelenítéshez.
//  3. Elérhető szélesség = a cím-sáv clientWidth-je, a jobbra kilógó státusz-badge
//     helyét és egy kis biztonsági rést levonva.
//  4. Egy sorba MAX méretnél az elérhető szélesség fér; MAX_SOR sorba nagyjából
//     MAX_SOR-szor annyi (a tördelés nem tökéletes, ezért egy kis tartalékkal). A
//     szövegszélesség ~lineárisan skálázódik a betűmérettel, ezért:
//       cél = MAX × (elérhető × MAX_SOR × kihasználtság) / természetes, [MIN, MAX] közé vágva.
//     A maradékot (ha MIN-en sem fér 3 sorba) a CSS line-clamp ellipszise vágja.
cimBetumeretHozzaigazitasa() {
  // Csak a dinamikus című kártyán (Tartalom) méretezünk; a többi FIX (CSS) → kilépünk.
  if (!this._cimDinamikusMeretu()) return;

  const cimSav = this.cimSavElem;
  if (!cimSav) return;

  // A cím/név/megnevezés szöveg(ek); a státusz-badge KIZÁRVA (abszolút pozicionált,
  // saját megjelenésű – nem méretezzük vele).
  const cimGyerekek = [...cimSav.children].filter(
    (el) => !el.classList.contains('pakli-kartya__cim-statusz')
  );
  if (cimGyerekek.length === 0) return;

  const MIN_MERET        = 8;   // px – ez alatt a CSS ellipszise vágja a maradékot
  const MAX_MERET        = 24;  // px – rövid cím maximális mérete
  const MAX_SOR          = 3;   // legfeljebb ennyi sorba tördelhet (CSS line-clamp)
  const SOR_KIHASZNALTSAG = 0.9; // a tördelés nem tökéletes (ragadt sorvégek) – kis tartalék

  // 1. LÉPÉS – MAX méret + ideiglenes egy-soros mérés (a természetes szélességhez).
  //    A megjelenítéskor a cím -webkit-box (line-clamp) – a méréshez viszont
  //    inline-block + nowrap kell, hogy a scrollWidth a tiszta szövegszélességet adja.
  for (const gyerek of cimGyerekek) {
    gyerek.style.fontSize   = `${MAX_MERET}px`;
    gyerek.style.display    = 'inline-block';
    gyerek.style.whiteSpace = 'nowrap';
  }

  // 2. LÉPÉS – természetes (tördeletlen) szövegszélesség, majd a mérési stílusok
  //    visszavonása (vissza a CSS szerinti -webkit-box tördelésre).
  const resPx = parseFloat(getComputedStyle(cimSav).columnGap) || 0;
  let termeszetesSzelesseg = 0;
  for (const gyerek of cimGyerekek) {
    termeszetesSzelesseg += gyerek.scrollWidth;
  }
  termeszetesSzelesseg += resPx * (cimGyerekek.length - 1);

  for (const gyerek of cimGyerekek) {
    gyerek.style.display    = '';
    gyerek.style.whiteSpace = '';
  }

  if (termeszetesSzelesseg <= 0) return; // üres cím – nincs mit méretezni

  // 3. LÉPÉS – elérhető szélesség (a státusz-badge helyét levonva)
  const statusz         = cimSav.querySelector('.pakli-kartya__cim-statusz');
  const statuszSzelesseg = statusz ? statusz.scrollWidth : 0;
  const BIZTONSAGI_RES  = 4; // px – ne érjen pontosan a szélhez
  const elerhetoSzelesseg = cimSav.clientWidth - statuszSzelesseg - BIZTONSAGI_RES;

  if (elerhetoSzelesseg <= 0) return; // nincs értelmezhető hely – marad a MAX

  // 4. LÉPÉS – cél betűméret: a szöveg ~MAX_SOR sorba tördelve is elférjen
  const soronkentiKapacitas = elerhetoSzelesseg * MAX_SOR * SOR_KIHASZNALTSAG;
  const arany  = soronkentiKapacitas / termeszetesSzelesseg;
  let celMeret = Math.floor(MAX_MERET * arany);
  celMeret     = Math.max(MIN_MERET, Math.min(MAX_MERET, celMeret));

  for (const gyerek of cimGyerekek) {
    gyerek.style.fontSize = `${celMeret}px`;
  }

  console.log('Kartya.cimBetumeretHozzaigazitasa - VÉGE', {
    termeszetesSzelesseg,
    elerhetoSzelesseg,
    arany: Number(arany.toFixed(2)),
    celMeret
  });
}

// ----- BODY FELTÖLTÉSE -----
// Alap implementáció: üres. Leszármazott osztályok felülírják.
// @param {HTMLElement} body - A .pakli-kartya__body elem
_bodyFeltoltese(body) {
  console.log('Kartya._bodyFeltoltese - KEZDÉS alap (felülírás szükséges)');
  console.log('Kartya._bodyFeltoltese - VÉGE');
}

// ----- BODY ELREJTÉSE -----
// Pakli.js kivalasztottCsakCssValt() hívja a korábban kiválasztott kártyán,
// amikor egy másik kártya veszi át a kiválasztott szerepet.
// Elrejti a body-t, törli a tartalmát, és visszaállítja a kibővítés állapotot.
bodyElrejtes() {
  console.log('Kartya.bodyElrejtes - KEZDÉS', { entitasId: this.entitas?.entitasId });

  this.kivalasztott = false;
  this.kibovitettE = false; // kibővítés állapot visszaállítása elrejtéskor

  if (this.bodyElem) {
    this.bodyElem.setAttribute('hidden', ''); // elrejti a body-t
    this.bodyElem.innerHTML = ''; // törli a tartalmat – nincs felesleges DOM
    this.bodyElem.classList.remove('pakli-kartya__body--kibovitett'); // CSS visszaállítás
  }

  // Kibővítő gomb referencia törlése – a body új tartalom esetén újra létrejön
  this.kibovitöGomb = null;

  console.log('Kartya.bodyElrejtes - VÉGE', { entitasId: this.entitas?.entitasId });
}

// ----- KIBŐVÍTŐ GOMB FRISSÍTÉSE -----
// A body feltöltése után ellenőrzi, hogy a tartalom túlnyúlik-e a fix magasságon.
// Ha igen, hozzáadja a kibővítő gombot a body aljára.
// Ha nem nyúlik túl, nem tesz semmit (nincs szükség gombra).
_kibovitöGombFrissitese() {
  console.log('Kartya._kibovitöGombFrissitese - KEZDÉS', {
    entitasId: this.entitas?.entitasId
  });

  if (!this.bodyElem) {
    console.log('Kartya._kibovitöGombFrissitese - VÉGE: nincs bodyElem');
    return;
  }

  // Régi gomb eltávolítása, ha létezik – tiszta újraépítés
  if (this.kibovitöGomb) {
    this.kibovitöGomb.remove();
    this.kibovitöGomb = null;
  }

  // Túlnyúlás ellenőrzése: scrollHeight > clientHeight azt jelenti, hogy a tartalom
  // nem fér el a látható területen, tehát szükség van a kibővítő gombra
  const tulnyulikE = this.bodyElem.scrollHeight > this.bodyElem.clientHeight;

  console.log('Kartya._kibovitöGombFrissitese - túlnyúlás ellenőrzés', {
    scrollHeight: this.bodyElem.scrollHeight,
    clientHeight: this.bodyElem.clientHeight,
    tulnyulikE
  });

  if (!tulnyulikE) {
    console.log('Kartya._kibovitöGombFrissitese - VÉGE: nincs túlnyúlás, gomb nem szükséges');
    return;
  }

  // Kibővítő gomb létrehozása
  const gomb = document.createElement('button');
  gomb.className = 'pakli-kartya__kibovito-gomb';
  gomb.setAttribute('aria-label', 'Teljes tartalom megjelenítése'); // akadálymentesség
  gomb.setAttribute('type', 'button'); // form submit elkerülése
  gomb.textContent = '...'; // alapállapot: csonkított

  // Koppintás esemény – kibővítés és visszazárás váltogatása
  gomb.addEventListener('click', (e) => {
    e.stopPropagation(); // megakadályozza, hogy a kártya koppintás eseménye is lefusson
    this._kibovitesValtasa();
  });

  // Gomb hozzáadása a bodyhoz és referencia eltárolása
  this.bodyElem.appendChild(gomb);
  this.kibovitöGomb = gomb;

  console.log('Kartya._kibovitöGombFrissitese - VÉGE: gomb hozzáadva');
}

// ----- KIBŐVÍTÉS VÁLTÁSA -----
// A kibővítő gomb koppintásakor váltja a body állapotát:
// zárt → kibővített, kibővített → zárt.
// Frissíti a gomb feliratát és a CSS osztályt.
_kibovitesValtasa() {
  console.log('Kartya._kibovitesValtasa - KEZDÉS', {
    entitasId: this.entitas?.entitasId,
    kibovitettE: this.kibovitettE
  });

  if (!this.bodyElem || !this.kibovitöGomb) {
    console.warn('Kartya._kibovitesValtasa - VÉGE: hiányzó elemek');
    return;
  }

  if (this.kibovitettE) {
    // --- VISSZAZÁRÁS ---
    // CSS modifier eltávolítása – overflow: hidden visszaáll, fix magasság érvényes
    this.bodyElem.classList.remove('pakli-kartya__body--kibovitett');
    // Gomb felirat visszaállítása „..."-ra
    this.kibovitöGomb.textContent = '...';
    this.kibovitöGomb.setAttribute('aria-label', 'Teljes tartalom megjelenítése');
    this.kibovitettE = false;
  } else {
    // --- KIBŐVÍTÉS ---
    // CSS modifier hozzáadása – overflow: visible, flex: none, tartalom szabja a magasságot
    this.bodyElem.classList.add('pakli-kartya__body--kibovitett');
    // Gomb felirat váltása összezárás jelre
    this.kibovitöGomb.textContent = '∧';
    this.kibovitöGomb.setAttribute('aria-label', 'Tartalom összecsukása');
    this.kibovitettE = true;
  }

  console.log('Kartya._kibovitesValtasa - VÉGE', {
    entitasId: this.entitas?.entitasId,
    kibovitettE: this.kibovitettE
  });
}

}

// --- STATIKUS SABLON CACHE ---
Kartya._sablonCache = null;

// --- EXPORTÁLÁS ---
export default Kartya;