// frontend/js/components/kartya/Kartya.js

// --- IMPORTOK ---
import HamburgerMenu from '../HamburgerMenu.js'; // Hamburger menü komponens
import { apiGet } from '../../utils/apiHelper.js';        // Backend GET – tudatpont-ellenőrzéshez
import { tokenLekerese } from '../../utils/authHelper.js'; // A bejelentkezett eember tokenje

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
  this.hamburgerMenu = new HamburgerMenu(hamburgerKontener, opciok);
  await this.hamburgerMenu.init();

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

  // 7. LÉPÉS – Fejléc tartalom feltöltése (leszármazott osztály felülírja)
  const fejlecTartalom = this.domElem.querySelector('.pakli-kartya__fejlec-tartalom');
  if (fejlecTartalom) {
    this._fejlecFeltoltese(fejlecTartalom);
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
// @param {HTMLElement} fejlecTartalom - A .pakli-kartya__fejlec-tartalom elem
_fejlecFeltoltese(fejlecTartalom) {
  console.log('Kartya._fejlecFeltoltese - KEZDÉS alap (felülírás szükséges)');
  console.log('Kartya._fejlecFeltoltese - VÉGE');
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