// frontend/js/components/kartya/EgyezmenyKartya.js

// --- IMPORTOK ---
import Kartya from './Kartya.js';
import JavaslatModal from '../modals/JavaslatModal.js';
import TudatpontModal from '../modals/TudatpontModal.js';
import ReszletekModal from '../modals/ReszletekModal.js';
import TartalomModal from '../modals/TartalomModal.js';
import ErtesitesiBeallitasModal from '../modals/ErtesitesiBeallitasModal.js';
import { javaslatMegnevezes } from '../../utils/javaslatMegnevezes.js';

// =============================================
// ÚJ - SzovegMezoMegjelenito + KartyaFulsav (külső fül-réteg) importja
// =============================================
import SzovegMezoMegjelenito from '../szoveg/SzovegMezoMegjelenito.js';
import KartyaFulsav from './KartyaFulsav.js';

// --- EGYEZMÉNY KÁRTYA OSZTÁLY ---
// Felelőssége:
// 1. Örökli a Kartya.js teljes váz logikáját (hamburger, koppintás, állapot)
// 2. Feltölti a fejlécet: javaslatTípus, támogatottsági arány, bizonyossági mutató
// 3. Feltölti a body-t (csak kiválasztott kártyán): külső fülsáv — Lecserélt
//    tartalom (Módosításnál) / Indoklás. (A részvételi arány sor kikerült: a fejléc mutatja.)
// 4. Megadja a hamburger menü opcióit
class EgyezmenyKartya extends Kartya {

  // ----- KONSTRUKTOR -----
  // MÓDOSÍTVA: a többi kártyával azonos paraméterezés,
  // hogy a tudatpont modal innen is elérhető legyen (token + modal konténer)
  constructor(entitas, kivalasztott, onKivalasztas, token, modalKontenerAzon, onUjratoltes, onHamburgerMegnyitas) {
    console.log('EgyezmenyKartya.constructor - KEZDÉS', {
      entitasId:     entitas?.entitasId,
      javaslatTipus: entitas?.adatok?.javaslatTipus
    });

    super(entitas, kivalasztott, onKivalasztas, (entitas) => this._hamburgerOpciok(entitas), onHamburgerMegnyitas);

    // A tudatpont modalhoz szükséges adatok
    this.token             = token;
    this.modalKontenerAzon = modalKontenerAzon;
    this.onUjratoltes      = onUjratoltes;

    // =============================================
    // ÚJ - Megjelenítő példányok + külső fülsáv referenciái
    // =============================================
    // A body-ban több SzovegMezoMegjelenito is lehet (lecserélt tartalom +
    // indoklás), ezért tömbben tartjuk őket a destroy()-hoz. A KartyaFulsav a
    // külső fül-réteg (Lecserélt tartalom / Indoklás).
    this.megjelenitok = [];
    this.kartyaFulsav = null;

    console.log('EgyezmenyKartya.constructor - VÉGE', { entitasId: entitas?.entitasId });
  }

  // ----- FEJLÉC FELTÖLTÉSE -----
  // Változatlan
  _fejlecFeltoltese(cimSav, masodikSor) {
    console.log('EgyezmenyKartya._fejlecFeltoltese - KEZDÉS', {
      entitasId: this.entitas?.entitasId
    });

    const adatok = this.entitas.adatok ?? {};
    // A második sorba (típus-specifikus) kerül a mutatók sora.
    // A közös tudatpont-sort (1. sor) a Kartya alaposztály már megépítette.
    const fejlecTartalom = masodikSor;

    // --- JELZŐ + TÍPUS (a felső sávba) ---
    const jelzoElem = document.createElement('span');
    jelzoElem.className   = 'egyezmeny-kartya__jelzo';
    jelzoElem.textContent = '🤝';
    jelzoElem.setAttribute('aria-hidden', 'true');
    cimSav.appendChild(jelzoElem);

    // Megnevezés – pl. „Módosítási egyezmény", csomagnál „Egyezmény csomag"
    const tipusElem = document.createElement('span');
    tipusElem.className   = 'egyezmeny-kartya__tipus';
    tipusElem.textContent = javaslatMegnevezes(adatok.javaslatTipus, 'egyezmény');
    cimSav.appendChild(tipusElem);

    // --- MUTATÓK (2. sor): a négy szavazati arány (Modell A – együtt 100%) + a döntés dátuma ---
    const mutatokSor = document.createElement('div');
    mutatokSor.className = 'egyezmeny-kartya__mutatok-sor';

    mutatokSor.appendChild(this._szazalekElem('👥', adatok.reszveteliArany,    'Részvételi arány'));
    mutatokSor.appendChild(this._szazalekElem('✔️', adatok.tamogatotsagiArany, 'Támogatottsági arány'));
    mutatokSor.appendChild(this._szazalekElem('❌', adatok.ellenzoiArany,      'Ellenzői arány'));
    mutatokSor.appendChild(this._szazalekElem('➖', adatok.tartozkodoiArany,   'Tartózkodói arány'));

    // Döntés (végrehajtás) dátuma – csak ha van érvényes érték
    if (adatok.dontesDatum) {
      const datum = new Date(adatok.dontesDatum);
      if (!Number.isNaN(datum.getTime())) {
        const datumSzoveg = datum.toLocaleDateString('hu-HU');
        const datumElem = document.createElement('span');
        datumElem.className = 'pakli-kartya__ikon-elem';
        datumElem.setAttribute('aria-label', `Döntés dátuma: ${datumSzoveg}`);
        datumElem.title = 'Döntés dátuma';
        datumElem.textContent = `📅 ${datumSzoveg}`;
        mutatokSor.appendChild(datumElem);
      }
    }

    fejlecTartalom.appendChild(mutatokSor);

    console.log('EgyezmenyKartya._fejlecFeltoltese - VÉGE', {
      entitasId:     this.entitas?.entitasId,
      javaslatTipus: adatok.javaslatTipus
    });
  }

  // ----- BODY FELTÖLTÉSE -----
  // =============================================
  // MÓDOSÍTVA - külső fülsáv (Lecserélt tartalom / Indoklás)
  // =============================================
  // A body-t egy KÜLSŐ fülsáv (KartyaFulsav) tölti fel:
  //   1. Lecserélt tartalom — Módosítás-egyezménynél (adatok.lecsereltTartalom):
  //      a régi tartalom címe a két fülsáv közé, alatta a régi body
  //   2. Indoklás           — a lezárt javaslat szövegmezőjének pillanatképe
  // A korábbi „Részvételi arány" body-sor KIKERÜLT: a fejléc már mutatja (👥 %),
  // ott duplikáció volt. Egyetlen fülnél a KartyaFulsav nem rajzol sávot (pl. régi
  // vagy nem-módosítási egyezménynél nincs lecserélt tartalom → csak az indoklás).
  // @param {HTMLElement} body - A .pakli-kartya__body elem
  _bodyFeltoltese(body) {
    console.log('EgyezmenyKartya._bodyFeltoltese - KEZDÉS', {
      entitasId: this.entitas?.entitasId
    });

    const adatok = this.entitas.adatok ?? {};

    // Tiszta kiindulás (újra-feltöltés esetére)
    this.megjelenitok = [];

    const fulek = [];

    // --- 1. fül — LECSERÉLT TARTALOM (Módosítás-egyezménynél) ---
    // A régi tartalom leképezése a címével együtt (cím a két fülsáv közé, alatta a
    // régi body). Csak akkor jelenik meg, ha a régi állapotot elmentettük a
    // végrehajtáskor (régi vagy nem-módosítási egyezménynél nincs → nem lesz fül).
    const lecsereltTartalom = adatok.lecsereltTartalom;
    if (lecsereltTartalom) {
      const lecsereltElem = document.createElement('div');
      lecsereltElem.className = 'egyezmeny-kartya__lecserelt-kontener';

      if (lecsereltTartalom.cim) {
        const cimElem = document.createElement('span');
        cimElem.className   = 'kartya-fulsav__cim';
        cimElem.textContent = lecsereltTartalom.cim;
        lecsereltElem.appendChild(cimElem);
      }

      const szovegKontener = document.createElement('div');
      lecsereltElem.appendChild(szovegKontener);
      this.megjelenitok.push(new SzovegMezoMegjelenito(szovegKontener, {
        blokkok:              lecsereltTartalom.szoveg,
        onEntitasKivalasztas: this._entitasHivatkozasKezelo()
      }));

      fulek.push({ id: 'lecserelt', felirat: 'Lecserélt tartalom', tartalomElem: lecsereltElem });
    }

    // --- 2. fül — INDOKLÁS ---
    // Az egyezmény indoklása a lezárt javaslat szövegmezőjének pillanatképe.
    // FONTOS: a megjelenítő saját gyerek-konténerre kerül (nem közvetlenül a
    // panelra), különben a panel `szoveg-mezo-megjelenito` (display:flex) osztálya
    // felülírná a fülváltás rejtő `display:none`-ját.
    if (adatok.szovegMezo) {
      const indoklasElem = document.createElement('div');
      indoklasElem.className = 'egyezmeny-kartya__indoklas-kontener';
      const indoklasMegj = document.createElement('div');
      indoklasElem.appendChild(indoklasMegj);
      this.megjelenitok.push(new SzovegMezoMegjelenito(indoklasMegj, {
        blokkok:              adatok.szovegMezo,
        onEntitasKivalasztas: this._entitasHivatkozasKezelo()
      }));
      fulek.push({ id: 'indoklas', felirat: 'Indoklás', tartalomElem: indoklasElem });
    }

    // --- A külső fülsáv felépítése (egyetlen fülnél nem rajzol sávot) ---
    const fulsavKontener = document.createElement('div');
    body.appendChild(fulsavKontener);
    this.kartyaFulsav = new KartyaFulsav(fulsavKontener, {
      fulek,
      // Fülváltáskor a kártya újramérje a túlnyúlást az új aktív fülre — így a „..."
      // gomb és a dupla-koppintásos kinyitás fülenként helyesen működik.
      onFulValtas: () => this._kibovitesUjraertekeles()
    });

    console.log('EgyezmenyKartya._bodyFeltoltese - VÉGE', {
      entitasId:      this.entitas?.entitasId,
      vanLecserelt:   !!lecsereltTartalom,
      vanSzoveg:      !!adatok.szovegMezo,
      fulekSzama:     fulek.length
    });
  }

  // ----- ENTITÁS HIVATKOZÁS KOPPINTÁS KEZELŐ -----
  // Közös callback a SzovegMezoMegjelenito példányoknak: a szövegben lévő
  // entitás-hivatkozásra koppintva a paklit oda navigálja.
  // @returns {Function} (entitasId, entitasTipus) => void
  _entitasHivatkozasKezelo() {
    return (entitasId, entitasTipus) => {
      console.log('EgyezmenyKartya - entitás hivatkozás koppintva', {
        entitasId,
        entitasTipus
      });
      if (typeof this.onKivalasztas === 'function') {
        this.onKivalasztas(entitasId, entitasTipus);
      }
    };
  }

  // =============================================
  // ÚJ - MEGSEMMISÍTÉS
  // =============================================
  destroy() {
    console.log('EgyezmenyKartya.destroy - KEZDÉS', {
      entitasId: this.entitas?.entitasId
    });

    // A külső fülsáv előbb (csak a DOM-ot üríti, a megjelenítőket nem bántja)
    if (this.kartyaFulsav) {
      this.kartyaFulsav.destroy();
      this.kartyaFulsav = null;
    }

    // Minden SzovegMezoMegjelenito (lecserélt tartalom + indoklás) felszabadítása
    if (Array.isArray(this.megjelenitok)) {
      this.megjelenitok.forEach((m) => m?.destroy?.());
      this.megjelenitok = [];
    }

    super.destroy?.();

    console.log('EgyezmenyKartya.destroy - VÉGE', {
      entitasId: this.entitas?.entitasId
    });
  }

  // ----- ÚJ TARTALOM LÉTREHOZÁSA EBBŐL ÁGAZTATVA -----
  // A közös TartalomModal-t nyitja meg létrehozás módban, az egyezményt
  // szülőként átadva (szuloId + szuloTipus: 'Egyezmeny').
  async _ujTartalomLetrehozasa(entitas) {
    console.log('EgyezmenyKartya._ujTartalomLetrehozasa - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    const tartalomModal = new TartalomModal(this.modalKontenerAzon, {
      mod: 'letrehozas',
      szuloAdatok: {
        szuloId:    entitas.entitasId,
        szuloTipus: 'Egyezmeny'
      },
      onSiker: () => {
        if (typeof this.onUjratoltes === 'function') this.onUjratoltes();
      }
    });

    await tartalomModal.init();
    tartalomModal.megnyitas();

    console.log('EgyezmenyKartya._ujTartalomLetrehozasa - VÉGE', {
      entitasId: entitas?.entitasId
    });
  }

  // ----- RÉSZLETES ADATOK -----
  // Megnyitja a közös ReszletekModal-t erre az egyezményre.
  // A modal maga kéri le a /reszletek adatokat és jeleníti meg őket.
  async _reszletesAdatok(entitas) {
    console.log('EgyezmenyKartya._reszletesAdatok - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    const reszletekModal = new ReszletekModal(this.modalKontenerAzon, {
      entitas,
      token: this.token,
      // Ha az indoklásban entitás-hivatkozásra koppintanak, a paklit oda navigáljuk
      onEntitasKivalasztas: (entitasId, entitasTipus) => {
        if (typeof this.onKivalasztas === 'function') {
          this.onKivalasztas(entitasId, entitasTipus);
        }
      }
    });

    await reszletekModal.init();
    await reszletekModal.megnyitas();

    console.log('EgyezmenyKartya._reszletesAdatok - VÉGE', {
      entitasId: entitas?.entitasId
    });
  }

  // ----- HAMBURGER MENÜ OPCIÓK -----
  // Változatlan
  _hamburgerOpciok(entitas) {
    console.log('EgyezmenyKartya._hamburgerOpciok - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    // A 🚧 ikonú pontok a fejlesztési terv részei (docs/fejlesztesi_terv.md),
    // de még nem készültek el – kattintásra a közös FejlesztesreVar üzenet jelenik meg.
    // A korábbi „Előzmény megtekintése" pont a terv szerint törölve.
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
        // Egyezményre a domain szerint KIZÁRÓLAG áthelyezési javaslat indítható —
        // a JavaslatModal a típusgombokat entitástípus szerint szűri (a backend is).
        // Tudatpont-függő, mint a többi kártyán.
        tudatpontFuggo: true,
        tiltvaIndok:    'Ehhez tudatpont kell ezen az entitáson. Előbb rendelj hozzá tudatpontot.',
        akcio:          () => this._javaslatLetrehozasa(entitas)
      },
      {
        ikon:       '🌟',
        felirat:    'Tudatpont módosítás',
        elvalaszto: true,
        akcio:      () => this._tudatpontModositas(entitas)
      },
      {
        ikon:       'ℹ️',
        felirat:    'Részletes adatok',
        elvalaszto: true,
        akcio:      () => this._reszletesAdatok(entitas)
      },
      {
        ikon:       '🔔',
        felirat:    'Értesítési beállítások',
        elvalaszto: true,
        // NEM tudatpontFuggo: bárki beállíthatja a SAJÁT értesítéseit ezen az ágon.
        akcio:      () => this._ertesitesiBeallitasok(entitas)
      }
    ];

    console.log('EgyezmenyKartya._hamburgerOpciok - VÉGE', {
      opciokSzama: opciok.length
    });

    return opciok;
  }

  // ----- JAVASLAT LÉTREHOZÁSA -----
  // Megnyitja a közös JavaslatModal-t erre az egyezményre. A domain-szabály szerint
  // egyezményre KIZÁRÓLAG áthelyezési javaslat indítható — a modal a típusgombokat
  // az entitástípus (Egyezmeny) alapján szűri, a backend pedig külön kikényszeríti.
  // A szülőt (egyezmény-tárhely) itt NEM adjuk át: az áthelyezésből létrejövő egyezmény
  // tárhelye opcionális (a felhasználó a modalban állíthatja, egyébként null/gyökér).
  async _javaslatLetrehozasa(entitas) {
    console.log('EgyezmenyKartya._javaslatLetrehozasa - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    const javaslatModal = new JavaslatModal(this.modalKontenerAzon, {
      entitasAdatok: {
        entitasId:    entitas.entitasId,
        entitasTipus: 'Egyezmeny',
        adatok:       entitas.adatok
      },
      szuloAdatok: null,
      onSiker: (ujJavaslat) => {
        console.log('EgyezmenyKartya._javaslatLetrehozasa - onSiker', {
          javaslatId: ujJavaslat?._id
        });
        if (typeof this.onUjratoltes === 'function') this.onUjratoltes();
      }
    });

    await javaslatModal.init();
    javaslatModal.megnyitas();

    console.log('EgyezmenyKartya._javaslatLetrehozasa - VÉGE', {
      entitasId: entitas?.entitasId
    });
  }

  // ----- ÉRTESÍTÉSI BEÁLLÍTÁSOK -----
  // Megnyitja a közös ErtesitesiBeallitasModal-t erre az egyezményre. A modal maga
  // kéri le az érvényes (örökölt vagy saját) beállítást és menti a változást.
  async _ertesitesiBeallitasok(entitas) {
    console.log('EgyezmenyKartya._ertesitesiBeallitasok - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    const ertesitesiBeallitasModal = new ErtesitesiBeallitasModal(this.modalKontenerAzon, {
      entitasId:    entitas.entitasId,
      entitasTipus: 'Egyezmeny',
      entitasCim:   javaslatMegnevezes(entitas.adatok?.javaslatTipus, 'egyezmény'),
      token:        this.token
    });

    await ertesitesiBeallitasModal.init();
    await ertesitesiBeallitasModal.megnyitas();

    console.log('EgyezmenyKartya._ertesitesiBeallitasok - VÉGE', {
      entitasId: entitas?.entitasId
    });
  }

  // ----- TUDATPONT MÓDOSÍTÁS -----
  // Megnyitja a TudatpontModal-t erre az egyezményre.
  async _tudatpontModositas(entitas) {
    console.log('EgyezmenyKartya._tudatpontModositas - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    const tudatpontModal = new TudatpontModal(this.modalKontenerAzon, {
      entitasAdatok: {
        entitasId:    entitas.entitasId,
        entitasTipus: entitas.entitasTipus ?? 'Egyezmeny',
        adatok:       entitas.adatok
      },
      onSiker: () => {
        if (typeof this.onUjratoltes === 'function') this.onUjratoltes();
      }
    });

    await tudatpontModal.init();
    await tudatpontModal.megnyitas();

    console.log('EgyezmenyKartya._tudatpontModositas - VÉGE', {
      entitasId: entitas?.entitasId
    });
  }
}

// --- EXPORTÁLÁS ---
export default EgyezmenyKartya;