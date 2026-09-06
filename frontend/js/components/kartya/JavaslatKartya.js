// frontend/js/components/kartya/JavaslatKartya.js

// --- IMPORTOK ---
import Kartya from './Kartya.js';
import TudatpontModal from '../modals/TudatpontModal.js';
import ReszletekModal from '../modals/ReszletekModal.js';
import GondolatModal from '../modals/GondolatModal.js';
import ErtesitesiBeallitasModal from '../modals/ErtesitesiBeallitasModal.js';
import { javaslatMegnevezes } from '../../utils/javaslatMegnevezes.js';
import { masodpercFelirat } from '../../utils/idoFormazo.js';

// =============================================
// ÚJ - SzovegMezoMegjelenito importja
// =============================================
import SzovegMezoMegjelenito from '../szoveg/SzovegMezoMegjelenito.js';

// =============================================
// ÚJ - KartyaFulsav (külső fül-réteg) + SzavazasFul (szavazás-fül) importja
// =============================================
import KartyaFulsav from './KartyaFulsav.js';
import SzavazasFul from './SzavazasFul.js';

// --- JAVASLAT KÁRTYA OSZTÁLY ---
// Felelőssége:
// 1. Örökli a Kartya.js teljes váz logikáját (hamburger, koppintás, állapot)
// 2. Feltölti a fejlécet: javaslatTípus, státusz, részvételi arány,
//    támogatottsági arány, ellenzői arány, bizonyossági mutató,
//    döntési idő, töredék jelzés (pl. "2 / 6") – ha töredék javaslat
// 3. Feltölti a body-t (csak kiválasztott kártyán): töredék részletek + külső fülsáv
//    (Módosításnál Indoklás / Módosított gondolat), egyébként csak indoklás
// 4. Megadja a hamburger menü opcióit
class JavaslatKartya extends Kartya {

  // ----- KONSTRUKTOR -----
  // MÓDOSÍTVA: a többi kártyával azonos paraméterezés,
  // hogy a szavazat modal innen is elérhető legyen (token + modal konténer)
  constructor(entitas, kivalasztott, onKivalasztas, token, modalKontenerAzon, onUjratoltes, onHamburgerMegnyitas) {
    console.log('JavaslatKartya.constructor - KEZDÉS', {
      entitasId:     entitas?.entitasId,
      javaslatTipus: entitas?.adatok?.javaslatTipus
    });

    super(entitas, kivalasztott, onKivalasztas, (entitas) => this._hamburgerOpciok(entitas), onHamburgerMegnyitas);

    // A szavazat modalhoz szükséges adatok
    this.token             = token;
    this.modalKontenerAzon = modalKontenerAzon;
    this.onUjratoltes      = onUjratoltes;

    // =============================================
    // ÚJ - Megjelenítő példányok + külső fülsáv referenciái
    // =============================================
    // A body-ban több SzovegMezoMegjelenito is lehet (indoklás + módosított
    // gondolat), ezért tömbben tartjuk őket a destroy()-hoz. A KartyaFulsav a
    // külső fül-réteg (Indoklás / Módosított gondolat).
    this.megjelenitok = [];
    this.kartyaFulsav = null;
    this.szavazasFul  = null;

    console.log('JavaslatKartya.constructor - VÉGE', { entitasId: entitas?.entitasId });
  }

  // ----- FEJLÉC FELTÖLTÉSE -----
  // Változatlan
  _fejlecFeltoltese(cimSav, masodikSor) {
    console.log('JavaslatKartya._fejlecFeltoltese - KEZDÉS', {
      entitasId: this.entitas?.entitasId
    });

    const adatok = this.entitas.adatok ?? {};
    // A második sorba (típus-specifikus) kerül a státusz badge, a töredék jelzés és a
    // mutatók sora. A közös tudatpont-sort (1. sor) a Kartya alaposztály már megépítette.
    const fejlecTartalom = masodikSor;

    // --- MEGNEVEZÉS (a felső sávba) – pl. „Módosítási javaslat", csomagnál „Javaslat csomag" ---
    const tipusElem = document.createElement('span');
    tipusElem.className   = 'javaslat-kartya__tipus';
    tipusElem.textContent = javaslatMegnevezes(adatok.javaslatTipus, 'javaslat');
    cimSav.appendChild(tipusElem);

    // --- STÁTUSZ + TÖREDÉK (a CÍM-sorba, jobbra igazítva) ---
    // A cím-sáv jobb szélére kerülnek, hogy ne foglaljanak helyet az ikon-területen.
    if (adatok.statusz || adatok.toredekAdatok) {
      const statuszKontener = document.createElement('div');
      statuszKontener.className = 'pakli-kartya__cim-statusz';

      if (adatok.statusz) {
        const statuszElem     = document.createElement('span');
        const statuszModifier = adatok.statusz.toLowerCase().replace(/\s+/g, '-');
        statuszElem.className  = `javaslat-kartya__statusz javaslat-kartya__statusz--${statuszModifier}`;
        statuszElem.textContent = adatok.statusz;
        statuszElem.setAttribute('aria-label', `Státusz: ${adatok.statusz}`);
        statuszKontener.appendChild(statuszElem);
      }

      if (adatok.toredekAdatok) {
        const { toredekSorszam, toredekDarab } = adatok.toredekAdatok;
        const toredekElem = document.createElement('span');
        toredekElem.className   = 'javaslat-kartya__toredek';
        toredekElem.textContent = `${toredekSorszam ?? '?'} / ${toredekDarab ?? '?'}`;
        toredekElem.setAttribute('aria-label',
          `Töredék javaslat: ${toredekSorszam}. rész, összesen ${toredekDarab}`
        );
        statuszKontener.appendChild(toredekElem);
      }

      cimSav.appendChild(statuszKontener);
    }

    // --- MUTATÓK SOR ---
    const mutatokSor = document.createElement('div');
    mutatokSor.className = 'javaslat-kartya__mutatok-sor';

    // A négy szavazati arány (Modell A – együtt 100%) + a döntési idő.
    // A bizonyossági mutató szándékosan NEM a fejlécen jelenik meg (a Részletek modálban igen).
    this._mutatoElemLetrehozasa(mutatokSor, '👥', adatok.reszveteliArany,    '%', 'Részvételi arány',      'javaslat-kartya__mutato--reszveteli');
    this._mutatoElemLetrehozasa(mutatokSor, '✔️', adatok.tamogatotsagiArany, '%', 'Támogatottsági arány',  'javaslat-kartya__mutato--tamogatottsagi');
    this._mutatoElemLetrehozasa(mutatokSor, '❌', adatok.ellenzoiArany,      '%', 'Ellenzői arány',        'javaslat-kartya__mutato--ellenzoi');
    this._mutatoElemLetrehozasa(mutatokSor, '➖', adatok.tartozkodoiArany,   '%', 'Tartózkodói arány',     'javaslat-kartya__mutato--tartozkodoi');

    if (adatok.dontesiIdo !== null && adatok.dontesiIdo !== undefined) {
      const idoElem = document.createElement('span');
      idoElem.className = 'javaslat-kartya__mutato javaslat-kartya__mutato--dontesi-ido';
      idoElem.setAttribute('aria-label', `Döntési idő: ${masodpercFelirat(adatok.dontesiIdo)}`);
      idoElem.textContent = `⏱ ${masodpercFelirat(adatok.dontesiIdo)}`;
      mutatokSor.appendChild(idoElem);
    }

    fejlecTartalom.appendChild(mutatokSor);

    console.log('JavaslatKartya._fejlecFeltoltese - VÉGE', {
      entitasId:     this.entitas?.entitasId,
      javaslatTipus: adatok.javaslatTipus
    });
  }

  // ----- BODY FELTÖLTÉSE -----
  // =============================================
  // MÓDOSÍTVA - külső fülsáv (Indoklás / Módosított gondolat / Szavazás)
  // =============================================
  // A body-t egységesen egy KÜLSŐ fülsáv (KartyaFulsav) tölti fel, a lehetséges
  // fülek listájából:
  //   1. Indoklás           — ha van szöveg (adatok.szovegMezo)
  //   2. Módosított gondolat — Módosítás-javaslatnál (adatok.modositottGondolat):
  //      a gondolat címe a két fülsáv közé, alatta a gondolat SAJÁT belső fülsávja
  //   3. Szavazás           — AKTÍV javaslatnál (adatok.statusz === 'Aktiv')
  // Egyetlen fülnél a KartyaFulsav nem rajzol fülsávot, csak a gondolatot mutatja
  // (pl. lezárt, nem módosítási javaslat: csak az indoklás).
  // @param {HTMLElement} body - A .pakli-kartya__body elem
  _bodyFeltoltese(body) {
    console.log('JavaslatKartya._bodyFeltoltese - KEZDÉS', {
      entitasId: this.entitas?.entitasId
    });

    const adatok = this.entitas.adatok ?? {};

    // Tiszta kiindulás (újra-feltöltés esetére)
    this.megjelenitok = [];

    const fulek = [];

    // --- 1. fül — INDOKLÁS ---
    // FONTOS: a megjelenítő NEM közvetlenül a fül-panelre kerül, hanem egy saját
    // gyerek-konténerre. Különben a panel megkapná a `szoveg-mezo-megjelenito`
    // (display:flex) osztályt, ami felülírná a fülváltás rejtő `display:none`-ját →
    // a rejtett panel is látszana.
    if (adatok.szovegMezo) {
      const indoklasElem = document.createElement('div');
      indoklasElem.className = 'javaslat-kartya__indoklas-kontener';
      const indoklasMegj = document.createElement('div');
      indoklasElem.appendChild(indoklasMegj);
      this.megjelenitok.push(new SzovegMezoMegjelenito(indoklasMegj, {
        blokkok:              adatok.szovegMezo,
        onEntitasKivalasztas: this._entitasHivatkozasKezelo()
      }));
      fulek.push({ id: 'indoklas', felirat: 'Indoklás', tartalomElem: indoklasElem });
    }

    // --- 2. fül — MÓDOSÍTOTT GONDOLAT (Módosítás-javaslatnál) ---
    // A gondolat leképezése a címével együtt (cím a két fülsáv közé, alatta a body).
    // A body akkor is megjelenik, ha csak a cím változott (a backend a jelenlegi
    // gondolattal olvassa össze); ha a gondolat body-ja eleve üres, itt is üres.
    const modositottGondolat = adatok.modositottGondolat;
    if (modositottGondolat) {
      const modElem = document.createElement('div');
      modElem.className = 'javaslat-kartya__modositott-kontener';

      if (modositottGondolat.cim) {
        const cimElem = document.createElement('span');
        cimElem.className   = 'kartya-fulsav__cim';
        cimElem.textContent = modositottGondolat.cim;
        modElem.appendChild(cimElem);
      }

      const szovegKontener = document.createElement('div');
      modElem.appendChild(szovegKontener);
      this.megjelenitok.push(new SzovegMezoMegjelenito(szovegKontener, {
        blokkok:              modositottGondolat.szoveg,
        onEntitasKivalasztas: this._entitasHivatkozasKezelo()
      }));

      fulek.push({ id: 'modositas', felirat: 'Módosított gondolat', tartalomElem: modElem });
    }

    // --- 3. fül — SZAVAZÁS (csak AKTÍV javaslatnál) ---
    // A szavazás korábban a hamburger menüben volt; onnan kikerült, ide költözött.
    // A jogosultságot a backend számolja (adatok.szavazhat); ha nincs, a gombok
    // tiltva, indokkal. A saját korábbi szavazatot a fül maga tölti be.
    if (adatok.statusz === 'Aktiv') {
      const szavazasElem = document.createElement('div');
      this.szavazasFul = new SzavazasFul(szavazasElem, {
        javaslatId:  this.entitas.entitasId,
        token:       this.token,
        szavazhat:   adatok.szavazhat === true,
        tiltvaIndok: 'Ehhez az érintett gondolaton kell tudatpont (a javaslaton magán nem szükséges).'
      });
      // A saját szavazat lekérése + kiemelés (async, nem blokkoló)
      this.szavazasFul.betoltes();
      fulek.push({ id: 'szavazas', felirat: 'Szavazás', tartalomElem: szavazasElem });
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

    console.log('JavaslatKartya._bodyFeltoltese - VÉGE', {
      entitasId:  this.entitas?.entitasId,
      fulekSzama: fulek.length
    });
  }

  // ----- ENTITÁS HIVATKOZÁS KOPPINTÁS KEZELŐ -----
  // Közös callback a SzovegMezoMegjelenito példányoknak: a szövegben lévő
  // entitás-hivatkozásra koppintva a paklit oda navigálja.
  // @returns {Function} (entitasId, entitasTipus) => void
  _entitasHivatkozasKezelo() {
    return (entitasId, entitasTipus) => {
      console.log('JavaslatKartya - entitás hivatkozás koppintva', {
        entitasId,
        entitasTipus
      });
      if (typeof this.onKivalasztas === 'function') {
        this.onKivalasztas(entitasId, entitasTipus);
      }
    };
  }

  // ----- MUTATÓ ELEM LÉTREHOZÁSA -----
  // Változatlan
  _mutatoElemLetrehozasa(kontener, ikon, ertek, egyseg, ariaLabel, modifierCss) {
    console.log('JavaslatKartya._mutatoElemLetrehozasa - KEZDÉS', { ariaLabel, ertek });

    if (ertek === null || ertek === undefined) {
      console.log('JavaslatKartya._mutatoElemLetrehozasa - VÉGE: nincs érték, kihagyva');
      return;
    }

    // A törtszázalékokat egészre kerekítjük a megjelenítéshez (a szám maradhat tört a modellben)
    const megjelenitett = (typeof ertek === 'number') ? Math.round(ertek) : ertek;

    const mutatoElem = document.createElement('span');
    mutatoElem.className = `javaslat-kartya__mutato ${modifierCss}`;
    mutatoElem.setAttribute('aria-label', `${ariaLabel}: ${megjelenitett}${egyseg}`);
    mutatoElem.textContent = `${ikon} ${megjelenitett}${egyseg}`;
    kontener.appendChild(mutatoElem);

    console.log('JavaslatKartya._mutatoElemLetrehozasa - VÉGE', { ariaLabel, ertek });
  }

  // =============================================
  // ÚJ - MEGSEMMISÍTÉS
  // =============================================
  destroy() {
    console.log('JavaslatKartya.destroy - KEZDÉS', {
      entitasId: this.entitas?.entitasId
    });

    // A külső fülsáv előbb (csak a DOM-ot üríti, a megjelenítőket nem bántja)
    if (this.kartyaFulsav) {
      this.kartyaFulsav.destroy();
      this.kartyaFulsav = null;
    }

    // Minden SzovegMezoMegjelenito (indoklás + módosított gondolat) felszabadítása
    if (Array.isArray(this.megjelenitok)) {
      this.megjelenitok.forEach((m) => m?.destroy?.());
      this.megjelenitok = [];
    }

    // A szavazás-fül felszabadítása
    if (this.szavazasFul) {
      this.szavazasFul.destroy();
      this.szavazasFul = null;
    }

    super.destroy?.();

    console.log('JavaslatKartya.destroy - VÉGE', {
      entitasId: this.entitas?.entitasId
    });
  }

  // A szavazás korábban itt egy külön modált nyitott (_szavazatLeadasa); azt a
  // funkciót a body „Szavazás" füle (SzavazasFul) váltotta le. Lásd _bodyFeltoltese.

  // =============================================
  // ÚJ - TUDATPONT MÓDOSÍTÁS
  // =============================================
  // Megnyitja a TudatpontModal-t erre a javaslatra.
  async _tudatpontModositas(entitas) {
    console.log('JavaslatKartya._tudatpontModositas - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    const tudatpontModal = new TudatpontModal(this.modalKontenerAzon, {
      entitasAdatok: {
        entitasId:    entitas.entitasId,
        entitasTipus: entitas.entitasTipus ?? 'Javaslat',
        adatok:       entitas.adatok
      },
      onSiker: () => {
        if (typeof this.onUjratoltes === 'function') this.onUjratoltes();
      }
    });

    await tudatpontModal.init();
    await tudatpontModal.megnyitas();

    console.log('JavaslatKartya._tudatpontModositas - VÉGE', {
      entitasId: entitas?.entitasId
    });
  }

  // =============================================
  // ÚJ - ÚJ GONDOLAT LÉTREHOZÁSA EBBŐL ÁGAZTATVA
  // =============================================
  // A közös GondolatModal-t nyitja meg létrehozás módban, a javaslatot
  // szülőként átadva (szuloId + szuloTipus: 'Javaslat').
  async _ujGondolatLetrehozasa(entitas) {
    console.log('JavaslatKartya._ujGondolatLetrehozasa - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    const gondolatModal = new GondolatModal(this.modalKontenerAzon, {
      mod: 'letrehozas',
      szuloAdatok: {
        szuloId:    entitas.entitasId,
        szuloTipus: 'Javaslat'
      },
      onSiker: () => {
        if (typeof this.onUjratoltes === 'function') this.onUjratoltes();
      }
    });

    await gondolatModal.init();
    gondolatModal.megnyitas();

    console.log('JavaslatKartya._ujGondolatLetrehozasa - VÉGE', {
      entitasId: entitas?.entitasId
    });
  }

  // =============================================
  // ÚJ - RÉSZLETES ADATOK
  // =============================================
  // Megnyitja a közös ReszletekModal-t erre a javaslatra.
  // A modal maga kéri le a /reszletek adatokat és jeleníti meg őket.
  async _reszletesAdatok(entitas) {
    console.log('JavaslatKartya._reszletesAdatok - KEZDÉS', {
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

    console.log('JavaslatKartya._reszletesAdatok - VÉGE', {
      entitasId: entitas?.entitasId
    });
  }

  // ----- ÉRTESÍTÉSI BEÁLLÍTÁSOK -----
  // Megnyitja a közös ErtesitesiBeallitasModal-t erre a javaslatra. A modal maga
  // kéri le az érvényes (örökölt vagy saját) beállítást és menti a változást.
  async _ertesitesiBeallitasok(entitas) {
    console.log('JavaslatKartya._ertesitesiBeallitasok - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    const ertesitesiBeallitasModal = new ErtesitesiBeallitasModal(this.modalKontenerAzon, {
      entitasId:    entitas.entitasId,
      entitasTipus: 'Javaslat',
      entitasCim:   javaslatMegnevezes(entitas.adatok?.javaslatTipus, 'javaslat'),
      token:        this.token
    });

    await ertesitesiBeallitasModal.init();
    await ertesitesiBeallitasModal.megnyitas();

    console.log('JavaslatKartya._ertesitesiBeallitasok - VÉGE', {
      entitasId: entitas?.entitasId
    });
  }

  // ----- HAMBURGER MENÜ OPCIÓK -----
  // A szavazás a body „Szavazás" fülébe költözött (lásd _bodyFeltoltese +
  // SzavazasFul), ezért a menüből kikerült. A többi 🚧 még fejlesztésre vár.
  _hamburgerOpciok(entitas) {
    console.log('JavaslatKartya._hamburgerOpciok - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    // A 🚧 ikonú pontok a fejlesztési terv részei (docs/fejlesztesi_terv.md),
    // de még nem készültek el – kattintásra a közös FejlesztesreVar üzenet jelenik meg.
    // A korábbi „Törlés" pont a terv szerint törölve (a törlés javaslat útján történik).

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

    console.log('JavaslatKartya._hamburgerOpciok - VÉGE', {
      opciokSzama: opciok.length
    });

    return opciok;
  }
}

// --- EXPORTÁLÁS ---
export default JavaslatKartya;