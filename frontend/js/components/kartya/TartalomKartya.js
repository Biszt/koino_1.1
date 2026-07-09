// frontend/js/components/kartya/TartalomKartya.js

// --- IMPORTOK ---
import Kartya from './Kartya.js';
import TartalomModal from '../modals/TartalomModal.js';
import JavaslatModal from '../modals/JavaslatModal.js';
import TudatpontModal from '../modals/TudatpontModal.js';
import ReszletekModal from '../modals/ReszletekModal.js';
import ErtekJavaslatModal from '../modals/ErtekJavaslatModal.js';
import SzovegMezoMegjelenito from '../szoveg/SzovegMezoMegjelenito.js';

// --- TARTALOM KÁRTYA OSZTÁLY ---
// Felelőssége:
// 1. Örökli a Kartya.js teljes váz logikáját
// 2. Feltölti a fejlécet: cím, ikonok, tudatpontok
// 3. Feltölti a body-t: rich text blokkok renderelése
// 4. Megadja a hamburger menü opcióit
class TartalomKartya extends Kartya {

  // ----- KONSTRUKTOR -----
  constructor(entitas, kivalasztott, onKivalasztas, token, modalKontenerAzon, onUjratoltes, onHamburgerMegnyitas) {
    console.log('TartalomKartya.constructor - KEZDÉS', {
      entitasId: entitas?.entitasId,
      cim:       entitas?.adatok?.cim,
      vanToken:  !!token,
      modalKontenerAzon
    });

    super(entitas, kivalasztott, onKivalasztas, (entitas) => this._hamburgerOpciok(entitas), onHamburgerMegnyitas);

    this.token             = token;
    this.modalKontenerAzon = modalKontenerAzon;
    this.onUjratoltes      = onUjratoltes;

    // SzovegMezoMegjelenito példány — a body feltöltésekor jön létre
    this.szovegMezoMegjelenito = null;

    console.log('TartalomKartya.constructor - VÉGE', { entitasId: entitas?.entitasId });
  }

  // ----- FEJLÉC FELTÖLTÉSE -----
  // Változatlan – cím, típus ikon, kategória ikonok, tudatpontok
  _fejlecFeltoltese(fejlecTartalom) {
    console.log('TartalomKartya._fejlecFeltoltese - KEZDÉS', {
      entitasId: this.entitas?.entitasId
    });

    const adatok = this.entitas.adatok ?? {};

    // --- CÍM ---
    const cimElem = document.createElement('span');
    cimElem.className   = 'tartalom-kartya__cim';
    cimElem.textContent = adatok.cim ?? '(cím nélkül)';
    fejlecTartalom.appendChild(cimElem);

    // --- TARTALOM TÍPUS IKON ---
    if (adatok.tartalomTipus?.ikon) {
      const ikonErtek = adatok.tartalomTipus.ikon;

      if (ikonErtek.startsWith('http://') || ikonErtek.startsWith('https://')) {
        const tipusIkonKep = document.createElement('img');
        tipusIkonKep.className = 'tartalom-kartya__tipus-ikon-kep';
        tipusIkonKep.src       = ikonErtek;
        tipusIkonKep.alt       = adatok.tartalomTipus.nev ?? '';
        tipusIkonKep.setAttribute('aria-hidden', 'true');
        tipusIkonKep.width  = 24;
        tipusIkonKep.height = 24;
        fejlecTartalom.appendChild(tipusIkonKep);
      } else {
        const tipusIkon = document.createElement('span');
        tipusIkon.className   = 'tartalom-kartya__tipus-ikon';
        tipusIkon.textContent = ikonErtek;
        tipusIkon.setAttribute('aria-label', adatok.tartalomTipus.nev ?? 'tartalom típus');
        tipusIkon.title = adatok.tartalomTipus.nev ?? '';
        fejlecTartalom.appendChild(tipusIkon);
      }
    }

    // --- KATEGÓRIA IKONOK ---
    if (adatok.kategoriak?.length > 0) {
      const kategoriaKontener = document.createElement('div');
      kategoriaKontener.className = 'tartalom-kartya__kategoriak';

      adatok.kategoriak.forEach((kategoria) => {
        if (kategoria?.ikon) {
          if (kategoria.ikon.startsWith('http://') || kategoria.ikon.startsWith('https://')) {
            const ikonKep = document.createElement('img');
            ikonKep.className = 'tartalom-kartya__kategoria-ikon-kep';
            ikonKep.src       = kategoria.ikon;
            ikonKep.alt       = kategoria.nev ?? '';
            ikonKep.setAttribute('aria-hidden', 'true');
            ikonKep.width  = 24;
            ikonKep.height = 24;
            kategoriaKontener.appendChild(ikonKep);
          } else {
            const kategoriaIkon = document.createElement('span');
            kategoriaIkon.className   = 'tartalom-kartya__kategoria-ikon';
            kategoriaIkon.textContent = kategoria.ikon;
            kategoriaIkon.setAttribute('aria-label', kategoria.nev ?? 'kategória');
            kategoriaIkon.title = kategoria.nev ?? '';
            kategoriaKontener.appendChild(kategoriaIkon);
          }
        }
      });

      fejlecTartalom.appendChild(kategoriaKontener);
    }

    // --- TUDATPONT SOR ---
    const tudatpontSor = document.createElement('div');
    tudatpontSor.className = 'tartalom-kartya__tudatpont-sor';

    const sajatTudatpontElem = document.createElement('span');
    sajatTudatpontElem.className = 'tartalom-kartya__tudatpont tartalom-kartya__tudatpont--sajat';
    sajatTudatpontElem.setAttribute('aria-label', 'Saját tudatpont');
    sajatTudatpontElem.textContent = `🌿🌟: ${(this.entitas.sajatTudatpont ?? 0).toLocaleString()}`;
    tudatpontSor.appendChild(sajatTudatpontElem);

    const hierarchikusTudatpontElem = document.createElement('span');
    hierarchikusTudatpontElem.className = 'tartalom-kartya__tudatpont tartalom-kartya__tudatpont--hierarchikus';
    hierarchikusTudatpontElem.setAttribute('aria-label', 'Hierarchikus tudatpont');
    hierarchikusTudatpontElem.textContent = `🌲🌟: ${(this.entitas.hierarchikusOsszesPont ?? 0).toLocaleString()}`;
    tudatpontSor.appendChild(hierarchikusTudatpontElem);

    fejlecTartalom.appendChild(tudatpontSor);

    console.log('TartalomKartya._fejlecFeltoltese - VÉGE', {
      entitasId: this.entitas?.entitasId,
      cim:       adatok.cim
    });
  }

  // ----- BODY FELTÖLTÉSE -----
  // =============================================
  // MÓDOSÍTVA - a közös SzovegMezoMegjelenito végzi a renderelést
  // =============================================
  // A SzovegMezoMegjelenito minden mentett formátumot kezel:
  // blokk tömb, több oldalas (fülekkel) tartalom és régi string is.
  // Az elmentett blokk-méreteket a blokk osztályok állítják vissza.
  // @param {HTMLElement} body - A .pakli-kartya__body elem
  _bodyFeltoltese(body) {
    console.log('TartalomKartya._bodyFeltoltese - KEZDÉS', {
      entitasId: this.entitas?.entitasId
    });

    const adatok = this.entitas.adatok ?? {};

    const szoveg = adatok.szoveg ?? adatok.szovegMezo ?? null;

    // Ha nincs szöveg adat, üres body marad
    if (!szoveg) {
      console.log('TartalomKartya._bodyFeltoltese - VÉGE (nincs szöveg)');
      return;
    }

    // SzovegMezoMegjelenito konténere
    const szovegKontener = document.createElement('div');
    szovegKontener.className = 'tartalom-kartya__szoveg-kontener';
    body.appendChild(szovegKontener);

    // Megjelenítő példányosítása — a formátum felismerését és a blokkok
    // renderelését (méretekkel, fülekkel együtt) a megjelenítő végzi
    this.szovegMezoMegjelenito = new SzovegMezoMegjelenito(szovegKontener, {
      blokkok: szoveg,
      onEntitasKivalasztas: (entitasId, entitasTipus) => {
        console.log('TartalomKartya - entitás hivatkozás koppintva', {
          entitasId,
          entitasTipus
        });
        // A Pakli.js window.aktivPakli-ban tárolja magát
        if (window.aktivPakli) {
          window.aktivPakli.entitasKivalasztasa(entitasId, entitasTipus);
        }
      }
    });

    console.log('TartalomKartya._bodyFeltoltese - VÉGE', {
      entitasId: this.entitas?.entitasId
    });
  }

  // ----- MEGSEMMISÍTÉS -----
  // A Kartya.js destroy() metódusát bővíti – felszabadítja a megjelenítőt.
  destroy() {
    console.log('TartalomKartya.destroy - KEZDÉS', {
      entitasId: this.entitas?.entitasId
    });

    if (this.szovegMezoMegjelenito) {
      this.szovegMezoMegjelenito.destroy();
      this.szovegMezoMegjelenito = null;
    }

    // Szülő destroy() meghívása (eseményfigyelők eltávolítása stb.)
    super.destroy?.();

    console.log('TartalomKartya.destroy - VÉGE');
  }

  // ----- RÉSZLETES ADATOK -----
  // Megnyitja a közös ReszletekModal-t erre a tartalomra.
  // A modal maga kéri le a /reszletek adatokat és jeleníti meg őket.
  async _reszletesAdatok(entitas) {
    console.log('TartalomKartya._reszletesAdatok - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    const reszletekModal = new ReszletekModal(this.modalKontenerAzon, {
      entitas,
      token: this.token,
      // Ha a szövegben entitás-hivatkozásra koppintanak, a paklit oda navigáljuk
      onEntitasKivalasztas: (entitasId, entitasTipus) => {
        if (typeof this.onKivalasztas === 'function') {
          this.onKivalasztas(entitasId, entitasTipus);
        }
      }
    });

    await reszletekModal.init();
    await reszletekModal.megnyitas();

    console.log('TartalomKartya._reszletesAdatok - VÉGE', {
      entitasId: entitas?.entitasId
    });
  }

  // ----- KÜSZÖB ÉRTÉK JAVASLAT -----
  // Megnyitja a közös ErtekJavaslatModal-t erre a tartalomra. A modal maga
  // kéri le az aktuális + saját értékeket, és menti az érték javaslatot.
  async _kuszobErtekJavaslat(entitas) {
    console.log('TartalomKartya._kuszobErtekJavaslat - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    const ertekJavaslatModal = new ErtekJavaslatModal(this.modalKontenerAzon, {
      entitasId:    entitas.entitasId,
      entitasTipus: 'Tartalom',
      token:        this.token,
      onSiker: () => {
        // Az érték javaslat nem változtatja a kártya megjelenését, de ha a
        // pakli frissítést vár, jelezzük (konzisztens a többi menüponttal).
        if (typeof this.onUjratoltes === 'function') this.onUjratoltes();
      }
    });

    await ertekJavaslatModal.init();
    await ertekJavaslatModal.megnyitas();

    console.log('TartalomKartya._kuszobErtekJavaslat - VÉGE', {
      entitasId: entitas?.entitasId
    });
  }

  // ----- HAMBURGER MENÜ OPCIÓK -----
  // Változatlan
  _hamburgerOpciok(entitas) {
    console.log('TartalomKartya._hamburgerOpciok - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    // A Tartalom kártya menüpontjai mind élő funkcióhoz vezetnek (nincs 🚧).
    // A tudatpontFuggo pontok inaktívak, ha az e-embernek nincs pontja az entitáson.
    const opciok = [
      {
        ikon:           '✏️',
        felirat:        'Új tartalom létrehozása ebből',
        // Ágaztatás: az új tartalom ebből az entitásból jön létre → tudatpont kell rá
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
        // Csak akkor aktív, ha az e-embernek van tudatpontja az entitáson
        // (a backend is ezt követeli meg az érték javaslathoz).
        tudatpontFuggo: true,
        tiltvaIndok:    'Ehhez tudatpont kell ezen az entitáson. Előbb rendelj hozzá tudatpontot.',
        akcio:          () => this._kuszobErtekJavaslat(entitas)
      },
    ];

    console.log('TartalomKartya._hamburgerOpciok - VÉGE', {
      opciokSzama: opciok.length
    });

    return opciok;
  }

  // ----- ÚJ TARTALOM LÉTREHOZÁSA EBBŐL ÁGAZTATVA -----
  // Változatlan
  async _ujTartalomLetrehozasa(entitas) {
    console.log('TartalomKartya._ujTartalomLetrehozasa - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    const tartalomModal = new TartalomModal(this.modalKontenerAzon, {
      mod: 'letrehozas',
      szuloAdatok: {
        szuloId:    entitas.entitasId,
        szuloTipus: 'Tartalom'
      },
      onSiker: (ujTartalom) => {
        console.log('TartalomKartya._ujTartalomLetrehozasa - onSiker KEZDÉS', {
          ujTartalomId: ujTartalom?._id,
          cim:          ujTartalom?.cim
        });
        if (typeof this.onUjratoltes === 'function') this.onUjratoltes();
        console.log('TartalomKartya._ujTartalomLetrehozasa - onSiker VÉGE');
      }
    });

    await tartalomModal.init();
    tartalomModal.megnyitas();

    console.log('TartalomKartya._ujTartalomLetrehozasa - VÉGE', {
      entitasId: entitas?.entitasId
    });
  }

  // ----- JAVASLAT LÉTREHOZÁSA -----
  // Változatlan
  async _javaslatLetrehozasa(entitas) {
    console.log('TartalomKartya._javaslatLetrehozasa - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    const javaslatModal = new JavaslatModal(this.modalKontenerAzon, {
      entitasAdatok: {
        entitasId:    entitas.entitasId,
        entitasTipus: 'Tartalom',
        adatok:       entitas.adatok
      },
      szuloAdatok: {
        szuloId:    entitas.entitasId,
        szuloTipus: 'Tartalom'
      },
      onSiker: (ujJavaslat) => {
        console.log('TartalomKartya._javaslatLetrehozasa - onSiker KEZDÉS', {
          javaslatId: ujJavaslat?._id,
          tipus:      ujJavaslat?.javaslatTipus
        });
        if (typeof this.onUjratoltes === 'function') this.onUjratoltes();
        console.log('TartalomKartya._javaslatLetrehozasa - onSiker VÉGE');
      }
    });

    await javaslatModal.init();
    javaslatModal.megnyitas();

    console.log('TartalomKartya._javaslatLetrehozasa - VÉGE', {
      entitasId: entitas?.entitasId
    });
  }

  // ----- TUDATPONT MÓDOSÍTÁS -----
  // Megnyitja a TudatpontModal-t erre a tartalomra. A modal maga méri fel
  // a felmenőket és kezeli a hozzárendelést.
  async _tudatpontModositas(entitas) {
    console.log('TartalomKartya._tudatpontModositas - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    const tudatpontModal = new TudatpontModal(this.modalKontenerAzon, {
      entitasAdatok: {
        entitasId:    entitas.entitasId,
        entitasTipus: entitas.entitasTipus ?? 'Tartalom',
        adatok:       entitas.adatok
      },
      onSiker: () => {
        if (typeof this.onUjratoltes === 'function') this.onUjratoltes();
      }
    });

    await tudatpontModal.init();
    await tudatpontModal.megnyitas();

    console.log('TartalomKartya._tudatpontModositas - VÉGE', {
      entitasId: entitas?.entitasId
    });
  }

}

// --- EXPORTÁLÁS ---
export default TartalomKartya;