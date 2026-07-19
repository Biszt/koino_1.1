// frontend/js/components/foOldal.js

// ===================================
// IMPORTOK
// ===================================
import { apiGet } from '../utils/apiHelper.js';

import {
  tokenLekerese,
  tokenTorlese,
  aktivEntitasLekerese,
  aktivEntitasMentese    // ← ÚJ: érvénytelen entitás törléséhez
} from '../utils/authHelper.js';

import HamburgerMenu from './HamburgerMenu.js';
import Modal from './modals/Modal.js';
import fejlesztesreVarMegjelenitese from './FejlesztesreVar.js';
import TartalomModal from './modals/TartalomModal.js';
import KategoriaModal from './modals/KategoriaModal.js';
import TartalomTipusModal from './modals/TartalomTipusModal.js';
import ErtesitesiBeallitasModal from './modals/ErtesitesiBeallitasModal.js';
import ErtesitesekModal from './modals/ErtesitesekModal.js';
import MeghivoModal from './modals/MeghivoModal.js';
import TudatpontokModal from './modals/TudatpontokModal.js';
import KeresesModal from './modals/KeresesModal.js';
import EemberBeallitasokModal from './modals/EemberBeallitasokModal.js';
import Pakli from './Pakli.js';


class FoOldal {

  constructor(token) {
    console.log('FoOldal.constructor - KEZDÉS', { tokenAtadvaE: !!token });
    this.token          = token || tokenLekerese();
    this.hamburgerMenu  = null;
    this.modal          = null;
    this.pakli          = null;
    this.eemberNev      = '...';
    this.tudatpontok    = '...';
    this.eemberekSzama  = '...';
    this.tartalmakSzama = '...';
    console.log('FoOldal.constructor - VÉGE', {
      tokenForrasa: token ? 'parameter' : 'authHelper',
      vanToken: !!this.token
    });
  }


  // =====================================
// INICIALIZÁLÁS
// =====================================
init() {
  console.log('FoOldal.init - KEZDÉS');

  this.hamburgerMenu = new HamburgerMenu(
    'hamburger-menu-kontener',
    this._hamburgerOpciokEpitese()
  );
  // A menü init aszinkron (template-fetch) – a badge-et csak a DOM elkészülte
  // UTÁN tudjuk feltölteni, ezért a then()-ben frissítjük először.
  this.hamburgerMenu.init().then(() => this._ertesitesBadgeFrissitese());

  // A KÁRTYÁK ág-szűrt postafiókjából érkező jelzés: ha ott olvasottnak jelölés
  // történt, az app-szintű badge-et is frissíteni kell. A kártya nem éri el a
  // FoOldal-t közvetlenül, ezért DOM-eseményen keresztül szól (Kartya.js küldi).
  document.addEventListener('koino:ertesitesValtozas', () => this._ertesitesBadgeFrissitese());

  // A KÁRTYÁK ág-szűrt Tudatpontok nézetéből érkező jelzés: pont-módosítás után
  // az alsó statisztika-sáv (szabad tudatpont) frissítése (Kartya.js küldi).
  document.addEventListener('koino:tudatpontValtozas', () => this.adatokBetoltese());

  this.modal = new Modal('modal-kontener', {
    cim:      '',
    tartalom: '',
    onBezaras: () => {
      console.log('FoOldal - általános modal bezárva');
    }
  });
  this.modal.init();

  const { entitasId, entitasTipus } = aktivEntitasLekerese();
  console.log('FoOldal.init - mentett entitás', { entitasId, entitasTipus });

  // VÁLTOZÁS: callback átadása – a Pakli ezt hívja kártyaváltáskor,
  // a localStorage mentés felelőssége ide kerül át a Pakli.js-ből
  this.pakli = new Pakli(
    this.token,
    'fooldal-tartalom',
    'modal-kontener',
    (ujEntitasId, ujEntitasTipus) => {
      console.log('FoOldal - kiválasztott entitás váltás', { ujEntitasId, ujEntitasTipus });
      aktivEntitasMentese(ujEntitasId, ujEntitasTipus);
    }
  );
  window._debug_pakli = this.pakli;

  // _pakliInditasa kezeli az érvénytelen mentett entitást
  this._pakliInditasa(entitasId, entitasTipus);

  this.adatokBetoltese();

  console.log('FoOldal.init - VÉGE');
}


  // =====================================
  // PAKLI INDÍTÁSA – HIBAKEZELÉSSEL
  // =====================================
  // Ha a mentett entitás nem található a hierarchiában (Pakli.init false-t ad),
  // törli a mentett adatot és gyökértől indít újra.
  async _pakliInditasa(entitasId, entitasTipus) {
    console.log('FoOldal._pakliInditasa - KEZDÉS', { entitasId, entitasTipus });

    if (entitasId && entitasTipus) {
      // 1. kísérlet: mentett entitással
      const sikerult = await this.pakli.init(entitasId, entitasTipus);

      if (!sikerult) {
        // A mentett entitás érvénytelen (pl. törölték az adatbázisból)
        // Töröljük a localStorage-ból és próbáljuk a legerősebb gyökértől
        console.log('FoOldal._pakliInditasa - mentett entitás érvénytelen, törlés és újrapróbálás');
        aktivEntitasMentese(null, null);
        await this.pakli.init(null, null);
      }
    } else {
      // Nincs mentett entitás – gyökértől indulunk
      await this.pakli.init(null, null);
    }

    console.log('FoOldal._pakliInditasa - VÉGE');
  }


  // =====================================
  // HAMBURGER OPCIÓK ÉPÍTÉSE
  // =====================================
  _hamburgerOpciokEpitese() {
    console.log('FoOldal._hamburgerOpciokEpitese - KEZDÉS');

    // A 🚧 ikonú pontok a fejlesztési terv részei (docs/fejlesztesi_terv.md),
    // de még nem készültek el – kattintásra a közös FejlesztesreVar üzenet jelenik meg
    const opciok = [
      {
        ikon:    '🔍',
        felirat: 'Keresés',
        akcio:   () => this._keresesMegnyitasa()
      },
      {
        ikon:    '🔔',
        felirat: 'Értesítések',
        badge:   true, // A sor jobb szélén az olvasatlan értesítések piros számlálója
        akcio:   () => this._ertesitesekMegnyitasa()
      },
      {
        ikon:    '🔔',
        felirat: 'Értesítési beállítások',
        akcio:   () => this._ertesitesiBeallitasokGlobalis()
      },
      {
        ikon:    '✏️',
        felirat: 'Új tartalom létrehozása',
        akcio:   () => this._ujTartalomModalMegnyitasa()
      },
      {
        ikon:    '🏷️',
        felirat: 'Új kategória létrehozása',
        akcio:   () => this._ujKategoriaModalMegnyitasa()
      },
      {
        ikon:    '🧩',
        felirat: 'Új tartalom típus létrehozása',
        akcio:   () => this._ujTartalomTipusModalMegnyitasa()
      },
      {
        ikon:    '✉️',
        felirat: 'Meghívóim',
        akcio:   () => this._meghivoimMegnyitasa()
      },
      {
        ikon:       '🌟',
        felirat:    'Tudatpontok',
        elvalaszto: true,
        akcio:      () => this._tudatpontokMegnyitasa()
      },
      {
        ikon:    '⚙️',
        felirat: 'eember beállítások',
        akcio:   () => this._eemberBeallitasokMegnyitasa()
      },
      {
        ikon:    '🚪',
        felirat: 'Kijelentkezés',
        akcio:   () => this._kijelentkezes()
      }
    ];

    console.log('FoOldal._hamburgerOpciokEpitese - VÉGE', { opciokSzama: opciok.length });
    return opciok;
  }


  // =====================================
  // ÚJ TARTALOM MODAL MEGNYITÁSA
  // =====================================
  async _ujTartalomModalMegnyitasa() {
    console.log('FoOldal._ujTartalomModalMegnyitasa - KEZDÉS');

    this.hamburgerMenu?.bezaras();

    const tartalomModal = new TartalomModal('modal-kontener', {
      mod: 'letrehozas',
      onSiker: (ujTartalom) => {
        console.log('FoOldal._ujTartalomModalMegnyitasa - onSiker KEZDÉS', {
          tartalomId: ujTartalom?._id,
          cim:        ujTartalom?.cim
        });

        // VÁLTOZÁS: _pakliInditasa-t használjuk itt is a biztonságos újratöltéshez
        const { entitasId, entitasTipus } = aktivEntitasLekerese();
        this._pakliInditasa(entitasId, entitasTipus);

        this.adatokBetoltese();
        console.log('FoOldal._ujTartalomModalMegnyitasa - onSiker VÉGE');
      }
    });

    await tartalomModal.init();
    tartalomModal.megnyitas();

    console.log('FoOldal._ujTartalomModalMegnyitasa - VÉGE');
  }


  // =====================================
  // ÚJ KATEGÓRIA MODAL MEGNYITÁSA
  // =====================================
  async _ujKategoriaModalMegnyitasa() {
    console.log('FoOldal._ujKategoriaModalMegnyitasa - KEZDÉS');

    this.hamburgerMenu?.bezaras();

    const kategoriaModal = new KategoriaModal('modal-kontener', {
      mod: 'letrehozas',
      onSiker: (ujKategoria) => {
        console.log('FoOldal._ujKategoriaModalMegnyitasa - onSiker KEZDÉS', {
          kategoriaId:  ujKategoria?.id,
          kategoriaNev: ujKategoria?.nev
        });
        console.log('FoOldal._ujKategoriaModalMegnyitasa - onSiker VÉGE');
      }
    });

    await kategoriaModal.init();
    kategoriaModal.megnyitas();

    console.log('FoOldal._ujKategoriaModalMegnyitasa - VÉGE');
  }


  // =====================================
  // ÚJ TARTALOM TÍPUS MODAL MEGNYITÁSA
  // =====================================
  async _ujTartalomTipusModalMegnyitasa() {
    console.log('FoOldal._ujTartalomTipusModalMegnyitasa - KEZDÉS');

    this.hamburgerMenu?.bezaras();

    const tartalomTipusModal = new TartalomTipusModal('modal-kontener', {
      mod: 'letrehozas',
      onSiker: (ujTartalomTipus) => {
        console.log('FoOldal._ujTartalomTipusModalMegnyitasa - onSiker KEZDÉS', {
          tartalomTipusId:  ujTartalomTipus?.id,
          tartalomTipusNev: ujTartalomTipus?.nev
        });
        console.log('FoOldal._ujTartalomTipusModalMegnyitasa - onSiker VÉGE');
      }
    });

    await tartalomTipusModal.init();
    tartalomTipusModal.megnyitas();

    console.log('FoOldal._ujTartalomTipusModalMegnyitasa - VÉGE');
  }


  // =====================================
  // EEMBER BEÁLLÍTÁSOK MODAL MEGNYITÁSA
  // =====================================
  // A fő menüs „eember beállítások" – profil-adatok (név, lokáció) módosítása
  // és jelszóváltás. Sikeres mentés után a fejléc-adatok frissülnek.
  async _eemberBeallitasokMegnyitasa() {
    console.log('FoOldal._eemberBeallitasokMegnyitasa - KEZDÉS');

    this.hamburgerMenu?.bezaras();

    const beallitasokModal = new EemberBeallitasokModal('modal-kontener', {
      token: this.token,
      // Profil-mentés után a fejléc/statisztika adatok újratöltése
      onValtozas: () => this.adatokBetoltese()
    });

    await beallitasokModal.init();
    await beallitasokModal.megnyitas();

    console.log('FoOldal._eemberBeallitasokMegnyitasa - VÉGE');
  }


  // =====================================
  // KERESÉS MODAL MEGNYITÁSA
  // =====================================
  // A fő menüs „Keresés" – cím/név alapú entitás-keresés az egész platformon.
  // Találatra kattintva a pakli az entitásra navigál.
  async _keresesMegnyitasa() {
    console.log('FoOldal._keresesMegnyitasa - KEZDÉS');

    this.hamburgerMenu?.bezaras();

    const keresesModal = new KeresesModal('modal-kontener', {
      token: this.token,
      onEntitasKivalasztas: (entitasId, entitasTipus) => {
        console.log('FoOldal - kereső találatból navigálás', { entitasId, entitasTipus });
        aktivEntitasMentese(entitasId, entitasTipus);
        this._pakliInditasa(entitasId, entitasTipus);
      }
    });

    await keresesModal.init();
    keresesModal.megnyitas();

    console.log('FoOldal._keresesMegnyitasa - VÉGE');
  }


  // =====================================
  // TUDATPONTOK MODAL MEGNYITÁSA
  // =====================================
  // A fő menüs „Tudatpontok" – a saját aktív tudatpont-hozzárendelések teljes
  // listája (terv 7. pont). Sorra kattintva a pakli az entitásra navigál;
  // pont-módosítás után az alsó statisztika-sáv és (bezáráskor) a pakli frissül.
  async _tudatpontokMegnyitasa() {
    console.log('FoOldal._tudatpontokMegnyitasa - KEZDÉS');

    this.hamburgerMenu?.bezaras();

    const tudatpontokModal = new TudatpontokModal('modal-kontener', {
      token: this.token,
      onEntitasKivalasztas: (entitasId, entitasTipus) => {
        console.log('FoOldal - tudatpontok listából navigálás', { entitasId, entitasTipus });
        aktivEntitasMentese(entitasId, entitasTipus);
        this._pakliInditasa(entitasId, entitasTipus);
      },
      // Pont-módosítás után az alsó sáv (szabad tudatpont) frissítése
      onValtozas: () => this.adatokBetoltese(),
      // Bezáráskor (ha volt módosítás, de nem navigáltunk) a pakli újratöltése,
      // hogy a kártyák hierarchikus pontjai friss értéket mutassanak
      onBezarasValtozassal: () => {
        const { entitasId, entitasTipus } = aktivEntitasLekerese();
        this._pakliInditasa(entitasId, entitasTipus);
      }
    });

    await tudatpontokModal.init();
    await tudatpontokModal.megnyitas();

    console.log('FoOldal._tudatpontokMegnyitasa - VÉGE');
  }


  // =====================================
  // MEGHÍVÓIM MODAL MEGNYITÁSA
  // =====================================
  // A fő menüs „Meghívóim" – új meghívó létrehozása (tanúsítással),
  // saját meghívók listája, visszavonás.
  async _meghivoimMegnyitasa() {
    console.log('FoOldal._meghivoimMegnyitasa - KEZDÉS');

    this.hamburgerMenu?.bezaras();

    const meghivoModal = new MeghivoModal('modal-kontener', {
      token: this.token
    });

    await meghivoModal.init();
    await meghivoModal.megnyitas();

    console.log('FoOldal._meghivoimMegnyitasa - VÉGE');
  }


  // =====================================
  // GLOBÁLIS ÉRTESÍTÉSI BEÁLLÍTÁSOK MEGNYITÁSA
  // =====================================
  // A fő menüs „Értesítési beállítások" – az e-ember GLOBÁLIS alapbeállítása
  // (a cascade legvégső visszaesése). A közös ErtesitesiBeallitasModal-t nyitja
  // globális módban (nincs entitás, nincs „vissza az örököltre").
  async _ertesitesiBeallitasokGlobalis() {
    console.log('FoOldal._ertesitesiBeallitasokGlobalis - KEZDÉS');

    this.hamburgerMenu?.bezaras();

    const ertesitesiBeallitasModal = new ErtesitesiBeallitasModal('modal-kontener', {
      globalis: true,
      token:    this.token
    });

    await ertesitesiBeallitasModal.init();
    await ertesitesiBeallitasModal.megnyitas();

    console.log('FoOldal._ertesitesiBeallitasokGlobalis - VÉGE');
  }


  // =====================================
  // ÉRTESÍTÉSEK (POSTAFIÓK) MEGNYITÁSA
  // =====================================
  // A fő menüs „Értesítések" – megnyitja a postafiók-modalt. Egy értesítésre
  // kattintva a paklit az érintett entitásra navigáljuk.
  async _ertesitesekMegnyitasa() {
    console.log('FoOldal._ertesitesekMegnyitasa - KEZDÉS');

    this.hamburgerMenu?.bezaras();

    const ertesitesekModal = new ErtesitesekModal('modal-kontener', {
      token: this.token,
      onEntitasKivalasztas: (entitasId, entitasTipus) => {
        console.log('FoOldal - értesítésből navigálás', { entitasId, entitasTipus });
        aktivEntitasMentese(entitasId, entitasTipus);
        this._pakliInditasa(entitasId, entitasTipus);
      },
      // Olvasottnak jelölés után (egy vagy mind) a badge-számláló frissítése
      onValtozas: () => this._ertesitesBadgeFrissitese()
    });

    await ertesitesekModal.init();
    await ertesitesekModal.megnyitas();

    console.log('FoOldal._ertesitesekMegnyitasa - VÉGE');
  }


  // =====================================
  // ÉRTESÍTÉS-BADGE FRISSÍTÉSE
  // =====================================
  // Lekéri az olvasatlan értesítések számát, és a HamburgerMenu badge-eire írja
  // (a gomb sarka + az „Értesítések" menüpont). Hívjuk: betöltéskor (init) és
  // a postafiókban történt olvasottnak jelölés után (ErtesitesekModal.onValtozas).
  // Hiba esetén csak logolunk – a badge nem kritikus, az oldal működjön tovább.
  async _ertesitesBadgeFrissitese() {
    console.log('FoOldal._ertesitesBadgeFrissitese - KEZDÉS');

    try {
      const valasz = await apiGet('ertesitesek/olvasatlan-szam', this.token);
      const olvasatlan = valasz?.adatok?.olvasatlan ?? 0;

      this.hamburgerMenu?.badgeFrissitese(olvasatlan);

      console.log('FoOldal._ertesitesBadgeFrissitese - VÉGE', { olvasatlan });
    } catch (hiba) {
      console.error('FoOldal._ertesitesBadgeFrissitese - HIBA', hiba.message);
    }
  }


  // =====================================
  // ÁLTALÁNOS MODAL MEGNYITÁSA
  // =====================================
  _modalMegnyitasa(cim, tartalom) {
    console.log('FoOldal._modalMegnyitasa - KEZDÉS', { cim });
    this.modal.cimBeallitasa(cim);
    this.modal.tartalomBeallitasa(tartalom);
    this.modal.megnyitas();
    console.log('FoOldal._modalMegnyitasa - VÉGE', { cim });
  }


  // =====================================
  // KIJELENTKEZÉS
  // =====================================
  _kijelentkezes() {
    console.log('FoOldal._kijelentkezes - KEZDÉS');
    tokenTorlese();
    window.location.reload();
    console.log('FoOldal._kijelentkezes - VÉGE');
  }


  // =====================================
  // ADATOK BETÖLTÉSE
  // =====================================
  async adatokBetoltese() {
    console.log('FoOldal.adatokBetoltese - KEZDÉS');

    try {
      const [sajatAdatok, platformStatisztika] = await Promise.all([
        apiGet('eember/sajat-adatok',   this.token),
        apiGet('platform/statisztika', this.token)
      ]);

      this.eemberNev      = sajatAdatok.eemberNev;
      this.tudatpontok    = sajatAdatok.tudatpontok.toLocaleString();
      this.eemberekSzama  = platformStatisztika.eemberekSzama.toLocaleString();
      this.tartalmakSzama = platformStatisztika.tartalmakSzama.toLocaleString();

      this.alsoSavFrissitese();

      console.log('FoOldal.adatokBetoltese - VÉGE', {
        eemberNev:      this.eemberNev,
        tudatpontok:    this.tudatpontok,
        eemberekSzama:  this.eemberekSzama,
        tartalmakSzama: this.tartalmakSzama
      });

    } catch (hiba) {
      console.error('FoOldal.adatokBetoltese - VÉGE (hiba)', { hiba: hiba.message });

      const kijelentkeztetendoHibak = [
        'eEmber nem található',
        'nem található',
        'Bejelentkezés szükséges',
        'érvénytelen token',
        'lejárt token'
      ];

      const kijelentkeztetendo = kijelentkeztetendoHibak.some(
        (szoveg) => hiba.message?.toLowerCase().includes(szoveg.toLowerCase())
      );

      if (kijelentkeztetendo) {
        console.warn('FoOldal.adatokBetoltese - eember nem azonosítható, kijelentkeztetés indul');
        tokenTorlese();
        window.location.reload();
        return;
      }

      this.alsoSavHibaJelzes();
    }
  }


  // =====================================
  // ALSÓ SÁV FRISSÍTÉSE
  // =====================================
  alsoSavFrissitese() {
    console.log('FoOldal.alsoSavFrissitese - KEZDÉS');

    const elemek = {
      'info-eembernev':       this.eemberNev,
      'info-tudatpont':       `🌟 ${this.tudatpontok}`,
      'info-eemberek-szama':  `🧑‍🤝‍🧑 ${this.eemberekSzama}`,
      'info-tartalmak-szama': `📄 ${this.tartalmakSzama}`
    };

    Object.entries(elemek).forEach(([id, szoveg]) => {
      const elem = document.getElementById(id);
      if (elem) {
        elem.classList.remove('also-sav__info-elem--betoltes');
        elem.textContent = szoveg;
      } else {
        console.warn(`FoOldal.alsoSavFrissitese - FIGYELEM: #${id} nem található`);
      }
    });

    console.log('FoOldal.alsoSavFrissitese - VÉGE');
  }


  // =====================================
  // ALSÓ SÁV HIBAJELZÉS
  // =====================================
  alsoSavHibaJelzes() {
    console.log('FoOldal.alsoSavHibaJelzes - KEZDÉS');

    const elemIds = [
      'info-eembernev',
      'info-tudatpont',
      'info-eemberek-szama',
      'info-tartalmak-szama'
    ];

    elemIds.forEach(id => {
      const elem = document.getElementById(id);
      if (elem) {
        elem.textContent = '–';
        elem.classList.add('also-sav__info-elem--betoltes');
      }
    });

    console.log('FoOldal.alsoSavHibaJelzes - VÉGE');
  }
}


export default FoOldal;