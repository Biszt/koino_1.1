// frontend/js/components/kartya/TartalomTipusKartya.js

// --- IMPORTOK ---
import Kartya from './Kartya.js';
import JavaslatModal from '../modals/JavaslatModal.js';
import TudatpontModal from '../modals/TudatpontModal.js';
import ReszletekModal from '../modals/ReszletekModal.js';
import TartalomModal from '../modals/TartalomModal.js';
import ErtekJavaslatModal from '../modals/ErtekJavaslatModal.js';

// =============================================
// ÚJ - SzovegMezoMegjelenito importja
// =============================================
import SzovegMezoMegjelenito from '../szoveg/SzovegMezoMegjelenito.js';

// --- TARTALOM TÍPUS KÁRTYA OSZTÁLY ---
// Felelőssége:
// 1. Örökli a Kartya.js teljes váz logikáját (hamburger, koppintás, állapot)
// 2. Feltölti a fejlécet: ikon, név, saját tudatpont, hierarchikus tudatpont
// 3. Feltölti a body-t (csak kiválasztott kártyán): leírás blokkok megjelenítése
// 4. Megadja a hamburger menü opcióit
class TartalomTipusKartya extends Kartya {

  // ----- KONSTRUKTOR -----
  // MÓDOSÍTVA: a TartalomKartya-val azonos paraméterezés,
  // hogy a javaslat modal innen is elérhető legyen
  constructor(entitas, kivalasztott, onKivalasztas, token, modalKontenerAzon, onUjratoltes, onHamburgerMegnyitas) {
    console.log('TartalomTipusKartya.constructor - KEZDÉS', {
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

    console.log('TartalomTipusKartya.constructor - VÉGE', { entitasId: entitas?.entitasId });
  }

  // ----- IKON MEGJELENÍTÉSE -----
  // Változatlan
  _ikonMegjelenites(kontener, ikonErtek, cssAlapOsztaly) {
    console.log('TartalomTipusKartya._ikonMegjelenites - KEZDÉS', { ikonErtek });

    if (!ikonErtek) {
      console.log('TartalomTipusKartya._ikonMegjelenites - VÉGE: nincs ikon érték');
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

    console.log('TartalomTipusKartya._ikonMegjelenites - VÉGE', { ikonErtek });
  }

  // ----- FEJLÉC FELTÖLTÉSE -----
  // Változatlan
  _fejlecFeltoltese(fejlecTartalom) {
    console.log('TartalomTipusKartya._fejlecFeltoltese - KEZDÉS', {
      entitasId: this.entitas?.entitasId
    });

    const adatok = this.entitas.adatok ?? {};

    const nevElem = document.createElement('span');
    nevElem.className   = 'tartalom-tipus-kartya__nev';
    nevElem.textContent = adatok.nev ?? '(név nélkül)';
    fejlecTartalom.appendChild(nevElem);

    const tudatpontSor = document.createElement('div');
    tudatpontSor.className = 'tartalom-tipus-kartya__tudatpont-sor';

    const sajatTudatpontElem = document.createElement('span');
    sajatTudatpontElem.className = 'tartalom-tipus-kartya__tudatpont tartalom-tipus-kartya__tudatpont--sajat';
    sajatTudatpontElem.setAttribute('aria-label', 'Saját tudatpont');
    sajatTudatpontElem.textContent = `🌿 ${(this.entitas.sajatTudatpont ?? 0).toLocaleString()}`;
    tudatpontSor.appendChild(sajatTudatpontElem);

    const hierarchikusTudatpontElem = document.createElement('span');
    hierarchikusTudatpontElem.className = 'tartalom-tipus-kartya__tudatpont tartalom-tipus-kartya__tudatpont--hierarchikus';
    hierarchikusTudatpontElem.setAttribute('aria-label', 'Hierarchikus tudatpont');
    hierarchikusTudatpontElem.textContent = `🌲 ${(this.entitas.hierarchikusOsszesPont ?? 0).toLocaleString()}`;
    tudatpontSor.appendChild(hierarchikusTudatpontElem);

    fejlecTartalom.appendChild(tudatpontSor);

    this._ikonMegjelenites(fejlecTartalom, adatok.ikon, 'tartalom-tipus-kartya');

    console.log('TartalomTipusKartya._fejlecFeltoltese - VÉGE', {
      entitasId: this.entitas?.entitasId,
      nev:       adatok.nev
    });
  }

  // ----- BODY FELTÖLTÉSE -----
  // =============================================
  // MÓDOSÍTVA - blokk alapú szöveg renderelés
  // =============================================
  _bodyFeltoltese(body) {
    console.log('TartalomTipusKartya._bodyFeltoltese - KEZDÉS', {
      entitasId: this.entitas?.entitasId
    });

    const adatok = this.entitas.adatok ?? {};

    if (adatok.szovegMezo) {
      // A formátum felismerését (blokk tömb, több oldalas objektum vagy
      // legacy string) a SzovegMezoMegjelenito végzi — nyersen adjuk át
      const blokkok = adatok.szovegMezo;

      const szovegKontener = document.createElement('div');
      szovegKontener.className = 'tartalom-tipus-kartya__szoveg-kontener';
      body.appendChild(szovegKontener);

      this.szovegMezoMegjelenito = new SzovegMezoMegjelenito(szovegKontener, {
        blokkok,
        onEntitasKivalasztas: (entitasId, entitasTipus) => {
          console.log('TartalomTipusKartya - entitás hivatkozás koppintva', {
            entitasId,
            entitasTipus
          });
          if (typeof this.onKivalasztas === 'function') {
            this.onKivalasztas(entitasId, entitasTipus);
          }
        }
      });
    }

    console.log('TartalomTipusKartya._bodyFeltoltese - VÉGE', {
      entitasId: this.entitas?.entitasId,
      vanSzoveg: !!adatok.szovegMezo
    });
  }

  // =============================================
  // ÚJ - MEGSEMMISÍTÉS
  // =============================================
  destroy() {
    console.log('TartalomTipusKartya.destroy - KEZDÉS', {
      entitasId: this.entitas?.entitasId
    });

    if (this.szovegMezoMegjelenito) {
      this.szovegMezoMegjelenito.destroy();
      this.szovegMezoMegjelenito = null;
    }

    super.destroy?.();

    console.log('TartalomTipusKartya.destroy - VÉGE', {
      entitasId: this.entitas?.entitasId
    });
  }

  // ----- HAMBURGER MENÜ OPCIÓK -----
  // ----- ÚJ TARTALOM LÉTREHOZÁSA EBBŐL ÁGAZTATVA -----
  // A közös TartalomModal-t nyitja meg létrehozás módban, a tartalomtípust
  // szülőként átadva (szuloId + szuloTipus: 'TartalomTipus').
  async _ujTartalomLetrehozasa(entitas) {
    console.log('TartalomTipusKartya._ujTartalomLetrehozasa - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    const tartalomModal = new TartalomModal(this.modalKontenerAzon, {
      mod: 'letrehozas',
      szuloAdatok: {
        szuloId:    entitas.entitasId,
        szuloTipus: 'TartalomTipus'
      },
      onSiker: () => {
        if (typeof this.onUjratoltes === 'function') this.onUjratoltes();
      }
    });

    await tartalomModal.init();
    tartalomModal.megnyitas();

    console.log('TartalomTipusKartya._ujTartalomLetrehozasa - VÉGE', {
      entitasId: entitas?.entitasId
    });
  }

  // ----- RÉSZLETES ADATOK -----
  // Megnyitja a közös ReszletekModal-t erre a tartalomtípusra.
  // A modal maga kéri le a /reszletek adatokat és jeleníti meg őket.
  async _reszletesAdatok(entitas) {
    console.log('TartalomTipusKartya._reszletesAdatok - KEZDÉS', {
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

    console.log('TartalomTipusKartya._reszletesAdatok - VÉGE', {
      entitasId: entitas?.entitasId
    });
  }

  // ----- KÜSZÖB ÉRTÉK JAVASLAT -----
  // Megnyitja a közös ErtekJavaslatModal-t erre a tartalomtípusra.
  async _kuszobErtekJavaslat(entitas) {
    console.log('TartalomTipusKartya._kuszobErtekJavaslat - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    const ertekJavaslatModal = new ErtekJavaslatModal(this.modalKontenerAzon, {
      entitasId:    entitas.entitasId,
      entitasTipus: 'TartalomTipus',
      token:        this.token,
      onSiker: () => {
        if (typeof this.onUjratoltes === 'function') this.onUjratoltes();
      }
    });

    await ertekJavaslatModal.init();
    await ertekJavaslatModal.megnyitas();

    console.log('TartalomTipusKartya._kuszobErtekJavaslat - VÉGE', {
      entitasId: entitas?.entitasId
    });
  }

  // Változatlan
  _hamburgerOpciok(entitas) {
    console.log('TartalomTipusKartya._hamburgerOpciok - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    // A Tartalomtípus kártya menüpontjai élő funkcióhoz vezetnek (nincs 🚧).
    const opciok = [
      {
        ikon:           '✏️',
        felirat:        'Új tartalom létrehozása ebből',
        // Ágaztatás ebből az entitásból → tudatpont kell rá
        tudatpontFuggo: true,
        tiltvaIndok:    'Ehhez tudatpont kell ezen az entitáson. Előbb rendelj hozzá tudatpontot.',
        akcio:          () => this._ujTartalomLetrehozasa(entitas)
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
        ikon:       '📄',
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
      }
    ];

    console.log('TartalomTipusKartya._hamburgerOpciok - VÉGE', {
      opciokSzama: opciok.length
    });

    return opciok;
  }

  // ----- JAVASLAT LÉTREHOZÁSA -----
  // A TartalomKartya mintájára: a JavaslatModal-t nyitja meg.
  // A javaslat szülő tartalma a tartalom típus szülője (a pakli
  // hierarchiában felette álló tartalom) — a backend ellenőrzi.
  async _javaslatLetrehozasa(entitas) {
    console.log('TartalomTipusKartya._javaslatLetrehozasa - KEZDÉS', {
      entitasId: entitas?.entitasId,
      szuloId:   entitas?.szuloId
    });

    const javaslatModal = new JavaslatModal(this.modalKontenerAzon, {
      entitasAdatok: {
        entitasId:    entitas.entitasId,
        entitasTipus: 'TartalomTipus',
        adatok:       entitas.adatok
      },
      szuloAdatok: {
        szuloId:    entitas.szuloId,
        szuloTipus: 'Tartalom'
      },
      onSiker: (ujJavaslat) => {
        console.log('TartalomTipusKartya._javaslatLetrehozasa - onSiker', {
          javaslatId: ujJavaslat?._id
        });
        if (typeof this.onUjratoltes === 'function') this.onUjratoltes();
      }
    });

    await javaslatModal.init();
    javaslatModal.megnyitas();

    console.log('TartalomTipusKartya._javaslatLetrehozasa - VÉGE', {
      entitasId: entitas?.entitasId
    });
  }

  // ----- TUDATPONT MÓDOSÍTÁS -----
  // Megnyitja a TudatpontModal-t erre a tartalomtípusra.
  async _tudatpontModositas(entitas) {
    console.log('TartalomTipusKartya._tudatpontModositas - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    const tudatpontModal = new TudatpontModal(this.modalKontenerAzon, {
      entitasAdatok: {
        entitasId:    entitas.entitasId,
        entitasTipus: entitas.entitasTipus ?? 'TartalomTipus',
        adatok:       entitas.adatok
      },
      onSiker: () => {
        if (typeof this.onUjratoltes === 'function') this.onUjratoltes();
      }
    });

    await tudatpontModal.init();
    await tudatpontModal.megnyitas();

    console.log('TartalomTipusKartya._tudatpontModositas - VÉGE', {
      entitasId: entitas?.entitasId
    });
  }
}

// --- EXPORTÁLÁS ---
export default TartalomTipusKartya;