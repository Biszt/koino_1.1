// frontend/js/components/kartya/GondolatTipusKartya.js

// --- IMPORTOK ---
import Kartya from './Kartya.js';
import JavaslatModal from '../modals/JavaslatModal.js';
import TudatpontModal from '../modals/TudatpontModal.js';
import ReszletekModal from '../modals/ReszletekModal.js';
import GondolatModal from '../modals/GondolatModal.js';
import ErtekJavaslatModal from '../modals/ErtekJavaslatModal.js';
import ErtesitesiBeallitasModal from '../modals/ErtesitesiBeallitasModal.js';

// =============================================
// ÚJ - SzovegMezoMegjelenito importja
// =============================================
import SzovegMezoMegjelenito from '../szoveg/SzovegMezoMegjelenito.js';

// --- GONDOLAT TÍPUS KÁRTYA OSZTÁLY ---
// Felelőssége:
// 1. Örökli a Kartya.js teljes váz logikáját (hamburger, koppintás, állapot)
// 2. Feltölti a fejlécet: ikon, név, saját tudatpont, hierarchikus tudatpont
// 3. Feltölti a body-t (csak kiválasztott kártyán): leírás blokkok megjelenítése
// 4. Megadja a hamburger menü opcióit
class GondolatTipusKartya extends Kartya {

  // ----- KONSTRUKTOR -----
  // MÓDOSÍTVA: a GondolatKartya-val azonos paraméterezés,
  // hogy a javaslat modal innen is elérhető legyen
  constructor(entitas, kivalasztott, onKivalasztas, token, modalKontenerAzon, onUjratoltes, onHamburgerMegnyitas) {
    console.log('GondolatTipusKartya.constructor - KEZDÉS', {
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
    this.szovegMezoMegjelenito = null;

    console.log('GondolatTipusKartya.constructor - VÉGE', { entitasId: entitas?.entitasId });
  }

  // ----- IKON MEGJELENÍTÉSE -----
  // Változatlan
  _ikonMegjelenites(kontener, ikonErtek, cssAlapOsztaly) {
    console.log('GondolatTipusKartya._ikonMegjelenites - KEZDÉS', { ikonErtek });

    if (!ikonErtek) {
      console.log('GondolatTipusKartya._ikonMegjelenites - VÉGE: nincs ikon érték');
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

    console.log('GondolatTipusKartya._ikonMegjelenites - VÉGE', { ikonErtek });
  }

  // ----- FEJLÉC FELTÖLTÉSE -----
  // Változatlan
  _fejlecFeltoltese(cimSav, masodikSor) {
    console.log('GondolatTipusKartya._fejlecFeltoltese - KEZDÉS', {
      entitasId: this.entitas?.entitasId
    });

    const adatok = this.entitas.adatok ?? {};
    // A második sorba (típus-specifikus) kerül az ikon (F4-ben: „hány gondolat használja").
    // A közös tudatpont-sort (1. sor) a Kartya alaposztály már megépítette.
    const fejlecTartalom = masodikSor;

    // --- NÉV (a felső sávba) ---
    const nevElem = document.createElement('span');
    nevElem.className   = 'gondolat-tipus-kartya__nev';
    nevElem.textContent = adatok.nev ?? '(név nélkül)';
    cimSav.appendChild(nevElem);

    // A gondolattípus saját ikonja 🧩 típus-előtaggal (a 2. sorban)
    const ikonCsoport = document.createElement('span');
    ikonCsoport.className = 'pakli-kartya__tipus-ikon-csoport';
    ikonCsoport.appendChild(this._tipusElotag('🧩', 'Gondolat típus'));
    this._ikonMegjelenites(ikonCsoport, adatok.ikon, 'gondolat-tipus-kartya');
    fejlecTartalom.appendChild(ikonCsoport);

    // Hány gondolat használja ezt a gondolattípust (2. sor)
    fejlecTartalom.appendChild(
      this._ikonElem('📄', adatok.hasznaloGondolatokSzama, 'Ezt a gondolattípust használó gondolatok száma')
    );

    // --- DÁTUM (létrehozás / utolsó módosítás, szín-jelzéssel) — a 2. sor végén ---
    const datumElem = this._datumFejlecElem(adatok);
    if (datumElem) fejlecTartalom.appendChild(datumElem);

    console.log('GondolatTipusKartya._fejlecFeltoltese - VÉGE', {
      entitasId: this.entitas?.entitasId,
      nev:       adatok.nev
    });
  }

  // ----- BODY FELTÖLTÉSE -----
  // =============================================
  // MÓDOSÍTVA - blokk alapú szöveg renderelés
  // =============================================
  _bodyFeltoltese(body) {
    console.log('GondolatTipusKartya._bodyFeltoltese - KEZDÉS', {
      entitasId: this.entitas?.entitasId
    });

    const adatok = this.entitas.adatok ?? {};

    if (adatok.szovegMezo) {
      // A formátum felismerését (blokk tömb, több oldalas objektum vagy
      // legacy string) a SzovegMezoMegjelenito végzi — nyersen adjuk át
      const blokkok = adatok.szovegMezo;

      const szovegKontener = document.createElement('div');
      szovegKontener.className = 'gondolat-tipus-kartya__szoveg-kontener';
      body.appendChild(szovegKontener);

      this.szovegMezoMegjelenito = new SzovegMezoMegjelenito(szovegKontener, {
        blokkok,
        onEntitasKivalasztas: (entitasId, entitasTipus) => {
          console.log('GondolatTipusKartya - entitás hivatkozás koppintva', {
            entitasId,
            entitasTipus
          });
          if (typeof this.onKivalasztas === 'function') {
            this.onKivalasztas(entitasId, entitasTipus);
          }
        }
      });
    }

    console.log('GondolatTipusKartya._bodyFeltoltese - VÉGE', {
      entitasId: this.entitas?.entitasId,
      vanSzoveg: !!adatok.szovegMezo
    });
  }

  // =============================================
  // ÚJ - MEGSEMMISÍTÉS
  // =============================================
  destroy() {
    console.log('GondolatTipusKartya.destroy - KEZDÉS', {
      entitasId: this.entitas?.entitasId
    });

    if (this.szovegMezoMegjelenito) {
      this.szovegMezoMegjelenito.destroy();
      this.szovegMezoMegjelenito = null;
    }

    super.destroy?.();

    console.log('GondolatTipusKartya.destroy - VÉGE', {
      entitasId: this.entitas?.entitasId
    });
  }

  // ----- HAMBURGER MENÜ OPCIÓK -----
  // ----- ÚJ GONDOLAT LÉTREHOZÁSA EBBŐL ÁGAZTATVA -----
  // A közös GondolatModal-t nyitja meg létrehozás módban, a gondolattípust
  // szülőként átadva (szuloId + szuloTipus: 'GondolatTipus').
  async _ujGondolatLetrehozasa(entitas) {
    console.log('GondolatTipusKartya._ujGondolatLetrehozasa - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    const gondolatModal = new GondolatModal(this.modalKontenerAzon, {
      mod: 'letrehozas',
      szuloAdatok: {
        szuloId:    entitas.entitasId,
        szuloTipus: 'GondolatTipus'
      },
      onSiker: () => {
        if (typeof this.onUjratoltes === 'function') this.onUjratoltes();
      }
    });

    await gondolatModal.init();
    gondolatModal.megnyitas();

    console.log('GondolatTipusKartya._ujGondolatLetrehozasa - VÉGE', {
      entitasId: entitas?.entitasId
    });
  }

  // ----- RÉSZLETES ADATOK -----
  // Megnyitja a közös ReszletekModal-t erre a gondolattípusra.
  // A modal maga kéri le a /reszletek adatokat és jeleníti meg őket.
  async _reszletesAdatok(entitas) {
    console.log('GondolatTipusKartya._reszletesAdatok - KEZDÉS', {
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

    console.log('GondolatTipusKartya._reszletesAdatok - VÉGE', {
      entitasId: entitas?.entitasId
    });
  }

  // ----- KÜSZÖB ÉRTÉK JAVASLAT -----
  // Megnyitja a közös ErtekJavaslatModal-t erre a gondolattípusra.
  async _kuszobErtekJavaslat(entitas) {
    console.log('GondolatTipusKartya._kuszobErtekJavaslat - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    const ertekJavaslatModal = new ErtekJavaslatModal(this.modalKontenerAzon, {
      entitasId:    entitas.entitasId,
      entitasTipus: 'GondolatTipus',
      token:        this.token,
      onSiker: () => {
        if (typeof this.onUjratoltes === 'function') this.onUjratoltes();
      }
    });

    await ertekJavaslatModal.init();
    await ertekJavaslatModal.megnyitas();

    console.log('GondolatTipusKartya._kuszobErtekJavaslat - VÉGE', {
      entitasId: entitas?.entitasId
    });
  }

  // ----- ÉRTESÍTÉSI BEÁLLÍTÁSOK -----
  // Megnyitja a közös ErtesitesiBeallitasModal-t erre a gondolattípusra. A modal maga
  // kéri le az érvényes (örökölt vagy saját) beállítást és menti a változást.
  async _ertesitesiBeallitasok(entitas) {
    console.log('GondolatTipusKartya._ertesitesiBeallitasok - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    const ertesitesiBeallitasModal = new ErtesitesiBeallitasModal(this.modalKontenerAzon, {
      entitasId:    entitas.entitasId,
      entitasTipus: 'GondolatTipus',
      entitasCim:   entitas.adatok?.nev ?? '',
      token:        this.token
    });

    await ertesitesiBeallitasModal.init();
    await ertesitesiBeallitasModal.megnyitas();

    console.log('GondolatTipusKartya._ertesitesiBeallitasok - VÉGE', {
      entitasId: entitas?.entitasId
    });
  }

  // Változatlan
  _hamburgerOpciok(entitas) {
    console.log('GondolatTipusKartya._hamburgerOpciok - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    // A Gondolattípus kártya menüpontjai élő funkcióhoz vezetnek (nincs 🚧).
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

    console.log('GondolatTipusKartya._hamburgerOpciok - VÉGE', {
      opciokSzama: opciok.length
    });

    return opciok;
  }

  // ----- JAVASLAT LÉTREHOZÁSA -----
  // A GondolatKartya mintájára: a JavaslatModal-t nyitja meg.
  // A javaslat szülő gondolata a gondolat típus szülője (a pakli
  // hierarchiában felette álló gondolat) — a backend ellenőrzi.
  async _javaslatLetrehozasa(entitas) {
    console.log('GondolatTipusKartya._javaslatLetrehozasa - KEZDÉS', {
      entitasId: entitas?.entitasId,
      szuloId:   entitas?.szuloId
    });

    const javaslatModal = new JavaslatModal(this.modalKontenerAzon, {
      entitasAdatok: {
        entitasId:    entitas.entitasId,
        entitasTipus: 'GondolatTipus',
        adatok:       entitas.adatok
      },
      szuloAdatok: {
        szuloId:    entitas.szuloId,
        szuloTipus: 'Gondolat'
      },
      onSiker: (ujJavaslat) => {
        console.log('GondolatTipusKartya._javaslatLetrehozasa - onSiker', {
          javaslatId: ujJavaslat?._id
        });
        if (typeof this.onUjratoltes === 'function') this.onUjratoltes();
      }
    });

    await javaslatModal.init();
    javaslatModal.megnyitas();

    console.log('GondolatTipusKartya._javaslatLetrehozasa - VÉGE', {
      entitasId: entitas?.entitasId
    });
  }

  // ----- TUDATPONT MÓDOSÍTÁS -----
  // Megnyitja a TudatpontModal-t erre a gondolattípusra.
  async _tudatpontModositas(entitas) {
    console.log('GondolatTipusKartya._tudatpontModositas - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    const tudatpontModal = new TudatpontModal(this.modalKontenerAzon, {
      entitasAdatok: {
        entitasId:    entitas.entitasId,
        entitasTipus: entitas.entitasTipus ?? 'GondolatTipus',
        adatok:       entitas.adatok
      },
      onSiker: () => {
        if (typeof this.onUjratoltes === 'function') this.onUjratoltes();
      }
    });

    await tudatpontModal.init();
    await tudatpontModal.megnyitas();

    console.log('GondolatTipusKartya._tudatpontModositas - VÉGE', {
      entitasId: entitas?.entitasId
    });
  }
}

// --- EXPORTÁLÁS ---
export default GondolatTipusKartya;