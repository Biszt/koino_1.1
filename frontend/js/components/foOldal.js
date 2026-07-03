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
import TartalomModal from './modals/TartalomModal.js';
import KategoriaModal from './modals/KategoriaModal.js';
import TartalomTipusModal from './modals/TartalomTipusModal.js';
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
  this.hamburgerMenu.init();

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

    const opciok = [
      {
        ikon:    '🔔',
        felirat: 'Értesítések',
        akcio:   () => this._modalMegnyitasa('Értesítések', '\n\nÉrtesítések hamarosan...\n\n')
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
        ikon:       '⚙️',
        felirat:    'eember beállítások',
        elvalaszto: true,
        akcio:      () => this._modalMegnyitasa('eember beállítások', '\nBeállítások hamarosan...\n\n')
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