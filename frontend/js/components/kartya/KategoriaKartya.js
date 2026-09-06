// frontend/js/components/kartya/KategoriaKartya.js

// --- IMPORTOK ---
import Kartya from './Kartya.js';
import { API_ALAP_URL } from '../../utils/apiHelper.js';
import JavaslatModal from '../modals/JavaslatModal.js';
import TudatpontModal from '../modals/TudatpontModal.js';
import ReszletekModal from '../modals/ReszletekModal.js';
import GondolatModal from '../modals/GondolatModal.js';
import KategoriaModal from '../modals/KategoriaModal.js';
import ErtekJavaslatModal from '../modals/ErtekJavaslatModal.js';
import ErtesitesiBeallitasModal from '../modals/ErtesitesiBeallitasModal.js';

// =============================================
// ÚJ - SzovegMezoMegjelenito importja
// =============================================
// A blokk alapú szöveg gondolat renderelésért felelős segédosztály
import SzovegMezoMegjelenito from '../szoveg/SzovegMezoMegjelenito.js';

// --- KATEGÓRIA KÁRTYA OSZTÁLY ---
// Felelőssége:
// 1. Örökli a Kartya.js teljes váz logikáját (hamburger, koppintás, állapot)
// 2. Feltölti a fejlécet: ikon, név, saját tudatpont, hierarchikus tudatpont
// 3. Feltölti a body-t (csak kiválasztott kártyán): leírás blokkok megjelenítése
// 4. Megadja a hamburger menü opcióit
class KategoriaKartya extends Kartya {

  // ----- KONSTRUKTOR -----
  // MÓDOSÍTVA: a GondolatKartya-val azonos paraméterezés,
  // hogy a javaslat modal innen is elérhető legyen
  // @param {Object}   entitas           - A pakli kategória eleme a backend válaszából
  // @param {boolean}  kivalasztott      - Igaz, ha ez a kiválasztott kártya
  // @param {Function} onKivalasztas     - Koppintás callback a Pakli.js-ből
  // @param {string}   token             - JWT token az API hívásokhoz
  // @param {string}   modalKontenerAzon - A modal konténer elem ID-ja
  // @param {Function} onUjratoltes      - Pakli újratöltés callback
  // @param {Function} onHamburgerMegnyitas - Hamburger megnyitás callback
  constructor(entitas, kivalasztott, onKivalasztas, token, modalKontenerAzon, onUjratoltes, onHamburgerMegnyitas) {
    console.log('KategoriaKartya.constructor - KEZDÉS', {
      entitasId: entitas?.entitasId,
      nev:       entitas?.adatok?.nev
    });

    super(entitas, kivalasztott, onKivalasztas, (entitas) => this._hamburgerOpciok(entitas), onHamburgerMegnyitas);

    this.token             = token;
    this.modalKontenerAzon = modalKontenerAzon;
    this.onUjratoltes      = onUjratoltes;

    // =============================================
    // ÚJ - Megjelenítő példány referencia
    // =============================================
    // A _bodyFeltoltese() hozza létre, a kartya megsemmisítésekor kell felszabadítani
    this.szovegMezoMegjelenito = null;

    console.log('KategoriaKartya.constructor - VÉGE', { entitasId: entitas?.entitasId });
  }

  // ----- IKON MEGJELENÍTÉS -----
  // Változatlan
  _ikonMegjelenites(kontener, ikonErtek, cssAlapOsztaly) {
    console.log('KategoriaKartya._ikonMegjelenites - KEZDÉS', { ikonErtek });

    if (!ikonErtek) {
      console.log('KategoriaKartya._ikonMegjelenites - VÉGE: nincs ikon érték');
      return;
    }

    if (ikonErtek.startsWith('http://') || ikonErtek.startsWith('https://')) {
      const ikonKep = document.createElement('img');
      ikonKep.className = `${cssAlapOsztaly}__ikon-kep`;
      ikonKep.src       = ikonErtek;
      ikonKep.alt       = '';
      ikonKep.setAttribute('aria-hidden', 'true');
      ikonKep.width  = 32;
      ikonKep.height = 32;
      kontener.appendChild(ikonKep);
    } else {
      const ikonElem = document.createElement('span');
      ikonElem.className   = `${cssAlapOsztaly}__ikon`;
      ikonElem.textContent = ikonErtek;
      ikonElem.setAttribute('aria-hidden', 'true');
      kontener.appendChild(ikonElem);
    }

    console.log('KategoriaKartya._ikonMegjelenites - VÉGE', { ikonErtek });
  }

  // ----- FEJLÉC FELTÖLTÉSE -----
  // Változatlan
  _fejlecFeltoltese(cimSav, masodikSor) {
    console.log('KategoriaKartya._fejlecFeltoltese - KEZDÉS', {
      entitasId: this.entitas?.entitasId
    });

    const adatok = this.entitas.adatok ?? {};
    // A második sorba (típus-specifikus) kerül az ikon (F4-ben: „hány gondolat használja").
    // A közös tudatpont-sort (1. sor) a Kartya alaposztály már megépítette.
    const fejlecTartalom = masodikSor;

    // --- NÉV (a felső sávba) ---
    const nevElem = document.createElement('span');
    nevElem.className   = 'kategoria-kartya__nev';
    nevElem.textContent = adatok.nev ?? '(név nélkül)';
    cimSav.appendChild(nevElem);

    // A kategória saját ikonja 🏷️ típus-előtaggal (a 2. sorban)
    const ikonCsoport = document.createElement('span');
    ikonCsoport.className = 'pakli-kartya__tipus-ikon-csoport';
    ikonCsoport.appendChild(this._tipusElotag('🏷️', 'Kategória'));
    this._ikonMegjelenites(ikonCsoport, adatok.ikon, 'kategoria-kartya');
    fejlecTartalom.appendChild(ikonCsoport);

    // Hány gondolat használja ezt a kategóriát (2. sor)
    fejlecTartalom.appendChild(
      this._ikonElem('📄', adatok.hasznaloGondolatokSzama, 'Ezt a kategóriát használó gondolatok száma')
    );

    // --- DÁTUM (létrehozás / utolsó módosítás, szín-jelzéssel) — a 2. sor végén ---
    const datumElem = this._datumFejlecElem(adatok);
    if (datumElem) fejlecTartalom.appendChild(datumElem);

    console.log('KategoriaKartya._fejlecFeltoltese - VÉGE', {
      entitasId: this.entitas?.entitasId,
      nev:       adatok.nev
    });
  }

  // ----- BODY FELTÖLTÉSE -----
  // =============================================
  // MÓDOSÍTVA - blokk alapú szöveg renderelés
  // =============================================
  // A szovegMezo mostantól blokkok tömbje (JSON), nem sima szöveg.
  // A SzovegMezoMegjelenito kezeli a renderelést és az entitás hivatkozások
  // koppintás eseményét.
  // @param {HTMLElement} body - A .pakli-kartya__body elem
  _bodyFeltoltese(body) {
    console.log('KategoriaKartya._bodyFeltoltese - KEZDÉS', {
      entitasId: this.entitas?.entitasId
    });

    const adatok = this.entitas.adatok ?? {};

    // --- LEÍRÁS ---
    if (adatok.szovegMezo) {
      // A formátum felismerését (blokk tömb, több oldalas objektum vagy
      // legacy string) a SzovegMezoMegjelenito végzi — nyersen adjuk át
      const blokkok = adatok.szovegMezo;

      // SzovegMezoMegjelenito konténere
      const szovegKontener = document.createElement('div');
      szovegKontener.className = 'kategoria-kartya__szoveg-kontener';
      body.appendChild(szovegKontener);

      // Megjelenítő példányosítása
      // onEntitasKivalasztas: az entitás hivatkozás blokkon való koppintáskor
      // a Pakli.js onKivalasztas callbackjét hívjuk meg
      this.szovegMezoMegjelenito = new SzovegMezoMegjelenito(szovegKontener, {
        blokkok,
        onEntitasKivalasztas: (entitasId, entitasTipus) => {
          console.log('KategoriaKartya - entitás hivatkozás koppintva', {
            entitasId,
            entitasTipus
          });
          // A Pakli.js onKivalasztas callbackjét hívjuk az új entitással
          if (typeof this.onKivalasztas === 'function') {
            this.onKivalasztas(entitasId, entitasTipus);
          }
        }
      });
    }

    console.log('KategoriaKartya._bodyFeltoltese - VÉGE', {
      entitasId:  this.entitas?.entitasId,
      vanSzoveg:  !!adatok.szovegMezo
    });
  }

  // =============================================
  // ÚJ - MEGSEMMISÍTÉS
  // =============================================
  // A Kartya.js destroy() metódusát bővíti – felszabadítja a megjelenítőt.
  // A Pakli.js hívja meg, amikor a kártyát eltávolítja a DOM-ból.
  destroy() {
    console.log('KategoriaKartya.destroy - KEZDÉS', {
      entitasId: this.entitas?.entitasId
    });

    if (this.szovegMezoMegjelenito) {
      this.szovegMezoMegjelenito.destroy();
      this.szovegMezoMegjelenito = null;
    }

    // Szülő destroy() meghívása (eseményfigyelők eltávolítása stb.)
    super.destroy?.();

    console.log('KategoriaKartya.destroy - VÉGE', {
      entitasId: this.entitas?.entitasId
    });
  }

  // ----- ÚJ GONDOLAT LÉTREHOZÁSA EBBŐL ÁGAZTATVA -----
  // A közös GondolatModal-t nyitja meg létrehozás módban, a kategóriát
  // szülőként átadva (szuloId + szuloTipus: 'Kategoria').
  async _ujGondolatLetrehozasa(entitas) {
    console.log('KategoriaKartya._ujGondolatLetrehozasa - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    const gondolatModal = new GondolatModal(this.modalKontenerAzon, {
      mod: 'letrehozas',
      szuloAdatok: {
        szuloId:    entitas.entitasId,
        szuloTipus: 'Kategoria'
      },
      onSiker: () => {
        if (typeof this.onUjratoltes === 'function') this.onUjratoltes();
      }
    });

    await gondolatModal.init();
    gondolatModal.megnyitas();

    console.log('KategoriaKartya._ujGondolatLetrehozasa - VÉGE', {
      entitasId: entitas?.entitasId
    });
  }

  // ----- ÚJ KATEGÓRIA (ALKATEGÓRIA) LÉTREHOZÁSA EBBŐL -----
  // A közös KategoriaModal-t nyitja meg létrehozás módban, ezt a kategóriát
  // szülőként átadva (szuloId + szuloTipus: 'Kategoria'). Az így létrejövő
  // kategória ennek a kategóriának az ALKATEGÓRIÁJA lesz. A backend (kategoriaService)
  // már kezeli a szülőt — a hierarchia beállítása ott történik.
  async _ujKategoriaLetrehozasa(entitas) {
    console.log('KategoriaKartya._ujKategoriaLetrehozasa - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    const kategoriaModal = new KategoriaModal(this.modalKontenerAzon, {
      mod: 'letrehozas',
      szuloAdatok: {
        szuloId:    entitas.entitasId,
        szuloTipus: 'Kategoria'
      },
      onSiker: () => {
        if (typeof this.onUjratoltes === 'function') this.onUjratoltes();
      }
    });

    await kategoriaModal.init();
    kategoriaModal.megnyitas();

    console.log('KategoriaKartya._ujKategoriaLetrehozasa - VÉGE', {
      entitasId: entitas?.entitasId
    });
  }

  // ----- RÉSZLETES ADATOK -----
  // Megnyitja a közös ReszletekModal-t erre a kategóriára.
  // A modal maga kéri le a /reszletek adatokat és jeleníti meg őket.
  async _reszletesAdatok(entitas) {
    console.log('KategoriaKartya._reszletesAdatok - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    const reszletekModal = new ReszletekModal(this.modalKontenerAzon, {
      entitas,
      token: this.token,
      // Ha a leírásban entitás-hivatkozásra koppintanak, a paklit oda navigáljuk
      onEntitasKivalasztas: (entitasId, entitasTipus) => {
        if (typeof this.onKivalasztas === 'function') {
          this.onKivalasztas(entitasId, entitasTipus);
        }
      }
    });

    await reszletekModal.init();
    await reszletekModal.megnyitas();

    console.log('KategoriaKartya._reszletesAdatok - VÉGE', {
      entitasId: entitas?.entitasId
    });
  }

  // ----- KÜSZÖB ÉRTÉK JAVASLAT -----
  // Megnyitja a közös ErtekJavaslatModal-t erre a kategóriára.
  async _kuszobErtekJavaslat(entitas) {
    console.log('KategoriaKartya._kuszobErtekJavaslat - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    const ertekJavaslatModal = new ErtekJavaslatModal(this.modalKontenerAzon, {
      entitasId:    entitas.entitasId,
      entitasTipus: 'Kategoria',
      token:        this.token,
      onSiker: () => {
        if (typeof this.onUjratoltes === 'function') this.onUjratoltes();
      }
    });

    await ertekJavaslatModal.init();
    await ertekJavaslatModal.megnyitas();

    console.log('KategoriaKartya._kuszobErtekJavaslat - VÉGE', {
      entitasId: entitas?.entitasId
    });
  }

  // ----- ÉRTESÍTÉSI BEÁLLÍTÁSOK -----
  // Megnyitja a közös ErtesitesiBeallitasModal-t erre a kategóriára. A modal maga
  // kéri le az érvényes (örökölt vagy saját) beállítást és menti a változást.
  async _ertesitesiBeallitasok(entitas) {
    console.log('KategoriaKartya._ertesitesiBeallitasok - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    const ertesitesiBeallitasModal = new ErtesitesiBeallitasModal(this.modalKontenerAzon, {
      entitasId:    entitas.entitasId,
      entitasTipus: 'Kategoria',
      entitasCim:   entitas.adatok?.nev ?? '',
      token:        this.token
    });

    await ertesitesiBeallitasModal.init();
    await ertesitesiBeallitasModal.megnyitas();

    console.log('KategoriaKartya._ertesitesiBeallitasok - VÉGE', {
      entitasId: entitas?.entitasId
    });
  }

  // ----- HAMBURGER MENÜ OPCIÓK -----
  // Változatlan
  _hamburgerOpciok(entitas) {
    console.log('KategoriaKartya._hamburgerOpciok - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    // A 🚧 ikonú pontok a fejlesztési terv részei (docs/fejlesztesi_terv.md),
    // de még nem készültek el – kattintásra a közös FejlesztesreVar üzenet jelenik meg
    const opciok = [
      {
        ikon:           '✏️',
        felirat:        'Új gondolat létrehozása ebből',
        // Ágaztatás ebből az entitásból → tudatpont kell rá
        tudatpontFuggo: true,
        tiltvaIndok:    'Ehhez tudatpont kell ezen az entitáson. Előbb rendelj hozzá tudatpontot.',
        akcio:          () => this._ujGondolatLetrehozasa(entitas)
      },
      {
        // Ugyanaz az ikon (🏷️), mint a fő menü „Új kategória létrehozása" pontja,
        // de itt a felirat egyértelműsíti, hogy ALKATEGÓRIA jön létre.
        ikon:           '🏷️',
        felirat:        'Új alkategória létrehozása',
        // Alkategória ebből a kategóriából → tudatpont kell rá
        tudatpontFuggo: true,
        tiltvaIndok:    'Ehhez tudatpont kell ezen az entitáson. Előbb rendelj hozzá tudatpontot.',
        akcio:          () => this._ujKategoriaLetrehozasa(entitas)
      },
      {
        ikon:           '🌿',
        felirat:        'Javaslat létrehozása',
        // Csak akkor aktív, ha az eembernek van tudatpontja az entitáson.
        // A menü megnyitásakor ellenőrzi a Kartya alaposztály (backend hívás).
        tudatpontFuggo: true,
        tiltvaIndok:    'Ehhez tudatpont kell ezen az entitáson. Előbb rendelj hozzá tudatpontot.',
        akcio:          () => this._javaslatLetrehozasa(entitas)
      },
      {
        ikon:      '🌟',
        felirat:   'Tudatpont módosítás',
        elvalaszto: true,
        akcio:     () => this._tudatpontModositas(entitas)
      },
      {
        ikon:       'ℹ️',
        felirat:    'Részletes adatok',
        elvalaszto: true,
        akcio:      () => this._reszletesAdatok(entitas)
      },
      {
        ikon:           '⚖️',
        felirat:        'Küszöb érték javaslat',
        // Csak akkor aktív, ha az e-embernek van tudatpontja az entitáson.
        tudatpontFuggo: true,
        tiltvaIndok:    'Ehhez tudatpont kell ezen az entitáson. Előbb rendelj hozzá tudatpontot.',
        akcio:          () => this._kuszobErtekJavaslat(entitas)
      },
      {
        ikon:       '🔔',
        felirat:    'Értesítési beállítások',
        elvalaszto: true,
        // NEM tudatpontFuggo: bárki beállíthatja a SAJÁT értesítéseit ezen az ágon.
        akcio:      () => this._ertesitesiBeallitasok(entitas)
      }
    ];

    console.log('KategoriaKartya._hamburgerOpciok - VÉGE', {
      opciokSzama: opciok.length
    });

    return opciok;
  }

  // ----- JAVASLAT LÉTREHOZÁSA -----
  // A GondolatKartya mintájára: a JavaslatModal-t nyitja meg.
  // A javaslat szülő gondolata a kategória szülője (a pakli hierarchiában
  // felette álló gondolat) — a backend ellenőrzi, hogy létező gondolat-e.
  async _javaslatLetrehozasa(entitas) {
    console.log('KategoriaKartya._javaslatLetrehozasa - KEZDÉS', {
      entitasId: entitas?.entitasId,
      szuloId:   entitas?.szuloId
    });

    const javaslatModal = new JavaslatModal(this.modalKontenerAzon, {
      entitasAdatok: {
        entitasId:    entitas.entitasId,
        entitasTipus: 'Kategoria',
        adatok:       entitas.adatok
      },
      szuloAdatok: {
        szuloId:    entitas.szuloId,
        szuloTipus: 'Gondolat'
      },
      onSiker: (ujJavaslat) => {
        console.log('KategoriaKartya._javaslatLetrehozasa - onSiker', {
          javaslatId: ujJavaslat?._id
        });
        if (typeof this.onUjratoltes === 'function') this.onUjratoltes();
      }
    });

    await javaslatModal.init();
    javaslatModal.megnyitas();

    console.log('KategoriaKartya._javaslatLetrehozasa - VÉGE', {
      entitasId: entitas?.entitasId
    });
  }

  // ----- TUDATPONT MÓDOSÍTÁS -----
  // Megnyitja a TudatpontModal-t erre a kategóriára.
  async _tudatpontModositas(entitas) {
    console.log('KategoriaKartya._tudatpontModositas - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    const tudatpontModal = new TudatpontModal(this.modalKontenerAzon, {
      entitasAdatok: {
        entitasId:    entitas.entitasId,
        entitasTipus: entitas.entitasTipus ?? 'Kategoria',
        adatok:       entitas.adatok
      },
      onSiker: () => {
        if (typeof this.onUjratoltes === 'function') this.onUjratoltes();
      }
    });

    await tudatpontModal.init();
    await tudatpontModal.megnyitas();

    console.log('KategoriaKartya._tudatpontModositas - VÉGE', {
      entitasId: entitas?.entitasId
    });
  }
}

// --- EXPORTÁLÁS ---
export default KategoriaKartya;