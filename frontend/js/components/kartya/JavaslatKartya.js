// frontend/js/components/kartya/JavaslatKartya.js

// --- IMPORTOK ---
import Kartya from './Kartya.js';
import SzavazatModal from '../modals/SzavazatModal.js';
import TudatpontModal from '../modals/TudatpontModal.js';
import ReszletekModal from '../modals/ReszletekModal.js';
import TartalomModal from '../modals/TartalomModal.js';

// =============================================
// ÚJ - SzovegMezoMegjelenito importja
// =============================================
import SzovegMezoMegjelenito from '../szoveg/SzovegMezoMegjelenito.js';

// --- JAVASLAT KÁRTYA OSZTÁLY ---
// Felelőssége:
// 1. Örökli a Kartya.js teljes váz logikáját (hamburger, koppintás, állapot)
// 2. Feltölti a fejlécet: javaslatTípus, státusz, részvételi arány,
//    támogatottsági arány, ellenzői arány, bizonyossági mutató,
//    döntési idő, töredék jelzés (pl. "2 / 6") – ha töredék javaslat
// 3. Feltölti a body-t (csak kiválasztott kártyán): töredék részletek + indoklás blokkok
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
    // ÚJ - Megjelenítő példány referencia
    // =============================================
    this.szovegMezoMegjelenito = null;

    console.log('JavaslatKartya.constructor - VÉGE', { entitasId: entitas?.entitasId });
  }

  // ----- FEJLÉC FELTÖLTÉSE -----
  // Változatlan
  _fejlecFeltoltese(fejlecTartalom) {
    console.log('JavaslatKartya._fejlecFeltoltese - KEZDÉS', {
      entitasId: this.entitas?.entitasId
    });

    const adatok = this.entitas.adatok ?? {};

    // --- JAVASLAT TÍPUS ---
    const tipusElem = document.createElement('span');
    tipusElem.className   = 'javaslat-kartya__tipus';
    tipusElem.textContent = adatok.javaslatTipus ?? '(típus nélkül)';
    fejlecTartalom.appendChild(tipusElem);

    // --- STÁTUSZ BADGE ---
    if (adatok.statusz) {
      const statuszElem    = document.createElement('span');
      const statuszModifier = adatok.statusz.toLowerCase().replace(/\s+/g, '-');
      statuszElem.className = `javaslat-kartya__statusz javaslat-kartya__statusz--${statuszModifier}`;
      statuszElem.textContent = adatok.statusz;
      statuszElem.setAttribute('aria-label', `Státusz: ${adatok.statusz}`);
      fejlecTartalom.appendChild(statuszElem);
    }

    // --- TÖREDÉK JELZÉS ---
    if (adatok.toredekAdatok) {
      const { toredekSorszam, toredekDarab } = adatok.toredekAdatok;
      const toredekElem = document.createElement('span');
      toredekElem.className   = 'javaslat-kartya__toredek';
      toredekElem.textContent = `${toredekSorszam ?? '?'} / ${toredekDarab ?? '?'}`;
      toredekElem.setAttribute('aria-label',
        `Töredék javaslat: ${toredekSorszam}. rész, összesen ${toredekDarab}`
      );
      fejlecTartalom.appendChild(toredekElem);
    }

    // --- MUTATÓK SOR ---
    const mutatokSor = document.createElement('div');
    mutatokSor.className = 'javaslat-kartya__mutatok-sor';

    this._mutatoElemLetrehozasa(mutatokSor, '👥', adatok.reszveteliArany,    '%', 'Részvételi arány',      'javaslat-kartya__mutato--reszveteli');
    this._mutatoElemLetrehozasa(mutatokSor, '✅', adatok.tamogatotsagiArany, '%', 'Támogatottsági arány',  'javaslat-kartya__mutato--tamogatottsagi');
    this._mutatoElemLetrehozasa(mutatokSor, '❌', adatok.ellenzoiArany,      '%', 'Ellenzői arány',        'javaslat-kartya__mutato--ellenzoi');
    this._mutatoElemLetrehozasa(mutatokSor, '🎯', adatok.bizonyossagiMutato, '',  'Bizonyossági mutató',   'javaslat-kartya__mutato--bizonyossagi');

    if (adatok.dontesiIdo !== null && adatok.dontesiIdo !== undefined) {
      const percElem = document.createElement('span');
      percElem.className = 'javaslat-kartya__mutato javaslat-kartya__mutato--dontesi-ido';
      percElem.setAttribute('aria-label', 'Döntési idő');
      percElem.textContent = adatok.dontesiIdo >= 60
        ? `⏱ ${Math.round(adatok.dontesiIdo / 60)} perc`
        : `⏱ ${adatok.dontesiIdo} mp`;
      mutatokSor.appendChild(percElem);
    }

    fejlecTartalom.appendChild(mutatokSor);

    console.log('JavaslatKartya._fejlecFeltoltese - VÉGE', {
      entitasId:     this.entitas?.entitasId,
      javaslatTipus: adatok.javaslatTipus
    });
  }

  // ----- BODY FELTÖLTÉSE -----
  // =============================================
  // MÓDOSÍTVA - indoklás blokk alapú renderelés
  // =============================================
  // A szovegMezo az indoklás tartalma, blokkok tömbjeként tárolva.
  // @param {HTMLElement} body - A .pakli-kartya__body elem
  _bodyFeltoltese(body) {
    console.log('JavaslatKartya._bodyFeltoltese - KEZDÉS', {
      entitasId: this.entitas?.entitasId
    });

    const adatok = this.entitas.adatok ?? {};

    // --- TÖREDÉK RÉSZLETEK ---
    // Változatlan
    if (adatok.toredekAdatok) {
      const toredekReszletek = document.createElement('div');
      toredekReszletek.className = 'javaslat-kartya__toredek-reszletek';

      const csoportCimke = document.createElement('span');
      csoportCimke.className   = 'javaslat-kartya__toredek-cimke';
      csoportCimke.textContent = 'Töredék csoport azonosító:';

      const csoportId = document.createElement('span');
      csoportId.className   = 'javaslat-kartya__toredek-csoport-id';
      csoportId.textContent = adatok.toredekAdatok.toredekCsoportId ?? '—';

      toredekReszletek.appendChild(csoportCimke);
      toredekReszletek.appendChild(csoportId);
      body.appendChild(toredekReszletek);
    }

    // --- INDOKLÁS ---
    // =============================================
    // ÚJ - textContent helyett SzovegMezoMegjelenito
    // =============================================
    // Az indoklás blokk tömb (kép, link, entitás hivatkozás is lehet benne),
    // ezért ugyanolyan renderelés kell, mint a többi kártya szöveg mezőjénél.
    if (adatok.szovegMezo) {
      // A formátum felismerését (blokk tömb, több oldalas objektum vagy
      // legacy string) a SzovegMezoMegjelenito végzi — nyersen adjuk át
      const blokkok = adatok.szovegMezo;

      const indoklasKontener = document.createElement('div');
      indoklasKontener.className = 'javaslat-kartya__indoklas-kontener';
      body.appendChild(indoklasKontener);

      this.szovegMezoMegjelenito = new SzovegMezoMegjelenito(indoklasKontener, {
        blokkok,
        onEntitasKivalasztas: (entitasId, entitasTipus) => {
          console.log('JavaslatKartya - entitás hivatkozás koppintva', {
            entitasId,
            entitasTipus
          });
          if (typeof this.onKivalasztas === 'function') {
            this.onKivalasztas(entitasId, entitasTipus);
          }
        }
      });
    }

    console.log('JavaslatKartya._bodyFeltoltese - VÉGE', {
      entitasId:  this.entitas?.entitasId,
      vanToredek: !!adatok.toredekAdatok,
      vanSzoveg:  !!adatok.szovegMezo
    });
  }

  // ----- MUTATÓ ELEM LÉTREHOZÁSA -----
  // Változatlan
  _mutatoElemLetrehozasa(kontener, ikon, ertek, egyseg, ariaLabel, modifierCss) {
    console.log('JavaslatKartya._mutatoElemLetrehozasa - KEZDÉS', { ariaLabel, ertek });

    if (ertek === null || ertek === undefined) {
      console.log('JavaslatKartya._mutatoElemLetrehozasa - VÉGE: nincs érték, kihagyva');
      return;
    }

    const mutatoElem = document.createElement('span');
    mutatoElem.className = `javaslat-kartya__mutato ${modifierCss}`;
    mutatoElem.setAttribute('aria-label', `${ariaLabel}: ${ertek}${egyseg}`);
    mutatoElem.textContent = `${ikon} ${ertek}${egyseg}`;
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

    if (this.szovegMezoMegjelenito) {
      this.szovegMezoMegjelenito.destroy();
      this.szovegMezoMegjelenito = null;
    }

    super.destroy?.();

    console.log('JavaslatKartya.destroy - VÉGE', {
      entitasId: this.entitas?.entitasId
    });
  }

  // =============================================
  // ÚJ - SZAVAZAT LEADÁSA
  // =============================================
  // Megnyitja a szavazat modalt erre a javaslatra. A modal maga kéri le
  // a eember korábbi szavazatát, és kezeli a szavazás / visszavonás hívásokat.
  // @param {Object} entitas - A javaslat entitása (entitasId-t innen vesszük)
  async _szavazatLeadasa(entitas) {
    console.log('JavaslatKartya._szavazatLeadasa - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    const szavazatModal = new SzavazatModal(this.modalKontenerAzon, {
      entitasAdatok: {
        entitasId: entitas.entitasId,
        adatok:    entitas.adatok
      },
      // Szavazás után frissítjük a paklit, hogy a kártya a helyes állapotot mutassa
      // (az arányokat a cron frissíti kb. 1 percen belül)
      onSiker: () => {
        console.log('JavaslatKartya._szavazatLeadasa - onSiker: pakli újratöltése');
        if (typeof this.onUjratoltes === 'function') this.onUjratoltes();
      }
    });

    await szavazatModal.init();
    await szavazatModal.megnyitas();

    console.log('JavaslatKartya._szavazatLeadasa - VÉGE', {
      entitasId: entitas?.entitasId
    });
  }

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
  // ÚJ - ÚJ TARTALOM LÉTREHOZÁSA EBBŐL ÁGAZTATVA
  // =============================================
  // A közös TartalomModal-t nyitja meg létrehozás módban, a javaslatot
  // szülőként átadva (szuloId + szuloTipus: 'Javaslat').
  async _ujTartalomLetrehozasa(entitas) {
    console.log('JavaslatKartya._ujTartalomLetrehozasa - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    const tartalomModal = new TartalomModal(this.modalKontenerAzon, {
      mod: 'letrehozas',
      szuloAdatok: {
        szuloId:    entitas.entitasId,
        szuloTipus: 'Javaslat'
      },
      onSiker: () => {
        if (typeof this.onUjratoltes === 'function') this.onUjratoltes();
      }
    });

    await tartalomModal.init();
    tartalomModal.megnyitas();

    console.log('JavaslatKartya._ujTartalomLetrehozasa - VÉGE', {
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

  // ----- HAMBURGER MENÜ OPCIÓK -----
  // A „Szavazat leadása" pont már működik (SzavazatModal), a többi 🚧 még fejlesztésre vár.
  _hamburgerOpciok(entitas) {
    console.log('JavaslatKartya._hamburgerOpciok - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    // A 🚧 ikonú pontok a fejlesztési terv részei (docs/fejlesztesi_terv.md),
    // de még nem készültek el – kattintásra a közös FejlesztesreVar üzenet jelenik meg.
    // A korábbi „Törlés" pont a terv szerint törölve (a törlés javaslat útján történik).

    // A szavazati jogosultságot a backend szabálya dönti el: az e-embernek az
    // ÉRINTETT entitás(ok)on kell tudatpont – a javaslaton magán NEM. Ezt a pakli
    // előre kiszámolja és `adatok.szavazhat`-ként küldi (lásd pakliService).
    const adatok    = entitas.adatok ?? {};
    const szavazhat = adatok.szavazhat === true;

    // Csak AKTÍV javaslatra lehet szavazni – nem aktív státusznál
    // (pl. Elfogadva/Elvetve) a szavazás opció teljesen kimarad a menüből
    // (a backend úgyis elutasítaná). A státusz a kártya adataiból jön.
    const aktivJavaslat = adatok.statusz === 'Aktiv';

    const opciok = [
      // --- SZAVAZAT LEADÁSA (csak aktív javaslatnál kerül a menübe) ---
      // FONTOS: NEM tudatpontFuggo – nem a javaslat entitásán ellenőrzünk,
      // hanem a backend által számolt szavazhat jelzésen. Így a menüpont
      // pontosan akkor aktív, amikor a szavazatService is engedné.
      ...(aktivJavaslat ? [{
        ikon:        '🗳️',
        felirat:     'Szavazat leadása',
        tiltva:      !szavazhat,
        tiltvaIndok: 'Ehhez az érintett tartalmon kell tudatpont (a javaslaton magán nem szükséges).',
        akcio:       () => this._szavazatLeadasa(entitas)
      }] : []),
      {
        ikon:           '✏️',
        felirat:        'Új tartalom létrehozása ebből',
        // Ágaztatás ebből az entitásból → tudatpont kell rá
        tudatpontFuggo: true,
        tiltvaIndok:    'Ehhez tudatpont kell ezen az entitáson. Előbb rendelj hozzá tudatpontot.',
        akcio:          () => this._ujTartalomLetrehozasa(entitas)
      },
      {
        ikon:       '🌟',
        felirat:    'Tudatpont módosítás',
        elvalaszto: true,
        akcio:      () => this._tudatpontModositas(entitas)
      },
      {
        ikon:       '📄',
        felirat:    'Részletes adatok',
        elvalaszto: true,
        akcio:      () => this._reszletesAdatok(entitas)
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