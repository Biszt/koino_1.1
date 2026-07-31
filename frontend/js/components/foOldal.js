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
import TerkepModal from './modals/TerkepModal.js';
import RendezesModal from './modals/RendezesModal.js'; // Pakli rendezés-választó (15. terv-pont)
import SikidomModal from './modals/SikidomModal.js';
import EemberBeallitasokModal from './modals/EemberBeallitasokModal.js';
import Pakli from './Pakli.js';
import FoOldalTortenetKezelo from './FoOldalTortenetKezelo.js';


class FoOldal {

  constructor(token) {
    console.log('FoOldal.constructor - KEZDÉS', { tokenAtadvaE: !!token });
    this.token          = token || tokenLekerese();
    this.hamburgerMenu  = null;
    this.modal          = null;
    this.pakli          = null;

    // A főoldali vissza/előre navigáció történet-kezelője (2. lépés).
    // Az init()-ben jön létre; itt csak a mezőket foglaljuk le.
    this.tortenet = null;

    // Jelző: éppen a vissza/előre gomb JÁTSSZA VISSZA egy korábbi állapotot?
    // Ilyenkor a navigációt NEM szabad új történet-lépésként rögzíteni.
    this._navigalasVisszajatszas = false;
    this.eemberNev      = '...';
    this.tudatpontok    = '...';
    this.eemberekSzama        = '...';
    this.tartalmakSzama       = '...';
    this.kategoriakSzama      = '...';
    this.tartalomTipusokSzama = '...';
    this.javaslatokSzama      = '...';
    this.egyezmenyekSzama     = '...';
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

  // A vissza/előre történet-kezelő. A változás-callback a ◀ / ▶ gombok
  // tiltott állapotát frissíti (a gombok maga a 3. lépésben kerülnek a DOM-ba;
  // a frissítő addig is hibátlanul lefut, ha még nincsenek elemek).
  this.tortenet = new FoOldalTortenetKezelo({
    onValtozas: (allapot) => this._tortenetGombokFrissitese(allapot)
  });
  // Böngészős teszteléshez elérhetővé tesszük a konzolon (a gombok a 3. lépésben
  // jönnek; addig is hívható: _debug_foOldal.tortenetVissza() / .tortenetElore())
  window._debug_tortenet = this.tortenet;
  window._debug_foOldal  = this;

  // A ◀ / ▶ gombok és az Alt+←/→ billentyűk bekötése (a HTML már betöltött)
  this._tortenetGombokBekotese();

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

  // ===== KÖZÖS NAVIGÁCIÓS JELZÉS → VISSZA/ELŐRE TÖRTÉNET =====
  // Minden entitás-váltás átfut az aktivEntitasMentese()-n, ami elküldi ezt az
  // eseményt. Így EGY helyen rögzítjük a történetbe az összes navigációt – legyen
  // az kártya-koppintás, testvér-ugrás, vagy fő-/kártya-menüs térkép/kereső ugrás.
  document.addEventListener('koino:aktivEntitasValtozas', (esemeny) => {
    this._aktivEntitasValtozott(esemeny.detail);
  });

  // A RENDEZÉS is nézet-állapot: a pakli rendezés-váltásakor (fő menü VAGY kártya
  // menü) ide jelez, és külön vissza/előre lépésként rögzül.
  document.addEventListener('koino:rendezesValtozas', (esemeny) => {
    this._rendezesValtozott(esemeny.detail);
  });

  // A TÉRKÉP megnyitása is nézet-állapot (fő menü VAGY kártya menü): a TerkepModal
  // jelez ide megnyitáskor, és külön vissza/előre lépésként rögzül.
  document.addEventListener('koino:nezetNyitas', (esemeny) => {
    this._nezetNyitott(esemeny.detail);
  });

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
      // A pakli MÁR odalépett (kártya-koppintás). Csak mentünk – a mentés elküldi
      // a koino:aktivEntitasValtozas eseményt, ami a történetbe is rögzíti.
      aktivEntitasMentese(ujEntitasId, ujEntitasTipus);
    }
  );
  window._debug_pakli = this.pakli;

  // _pakliInditasa kezeli az érvénytelen mentett entitást.
  // A betöltés UTÁN beültetjük a kezdő állapotot a történetbe (ez lesz az első,
  // amire majd nincs hova visszalépni). A valós betöltött entitástól kérjük le,
  // mert a mentett entitás érvénytelensége esetén a pakli gyökérről indul.
  this._pakliInditasa(entitasId, entitasTipus).then(() => {
    const kezdo = this.pakli?.aktualisEntitas?.();
    // Közvetlenül a történetbe ültetjük (nem eseményen át) – ez a kiinduló állapot,
    // amire nincs hova visszalépni. A localStorage-ban már benne van.
    if (kezdo) {
      this.tortenet.rogzit({
        tipus: 'entitas',
        entitasId: kezdo.entitasId,
        entitasTipus: kezdo.entitasTipus
      });
    }
  });

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
  // AKTÍV ENTITÁS VÁLTOZOTT → TÖRTÉNETBE
  // =====================================
  // A koino:aktivEntitasValtozas eseményre fut (amit az aktivEntitasMentese küld).
  // Ez az EGYETLEN hely, ahol entitás-váltás a történetbe kerül – így minden
  // navigációs útvonal (kártya, testvér, fő-/kártya-menüs térkép/kereső) automatikusan
  // bekerül. Vissza/előre visszajátszás közben NEM rögzítünk (nehogy hurkot képezzen).
  // @param {{entitasId:string, entitasTipus:string}} reszletek
  _aktivEntitasValtozott(reszletek) {
    if (this._navigalasVisszajatszas) {
      console.log('FoOldal._aktivEntitasValtozott - KIHAGYVA (visszajátszás)');
      return;
    }
    if (!reszletek?.entitasId || !reszletek?.entitasTipus) return;

    console.log('FoOldal._aktivEntitasValtozott - rögzítés', reszletek);
    this.tortenet?.rogzit({
      tipus: 'entitas',
      entitasId: reszletek.entitasId,
      entitasTipus: reszletek.entitasTipus
    });
  }


  // =====================================
  // RENDEZÉS VÁLTOZOTT → TÖRTÉNETBE
  // =====================================
  // A koino:rendezesValtozas eseményre fut (amit a Pakli.rendezesBeallitasa küld).
  // Rendezett (lapos) módnál 'rendezes' állapotot rögzít; hierarchikusra visszatéréskor
  // az aktuális entitást (entitás-állapot). Visszajátszás közben nem rögzít.
  // @param {{mod:string, irany:string, agazatId:string|null}} reszletek
  _rendezesValtozott(reszletek) {
    if (this._navigalasVisszajatszas) {
      console.log('FoOldal._rendezesValtozott - KIHAGYVA (visszajátszás)');
      return;
    }

    if (reszletek.mod === 'hierarchikus') {
      // Vissza a fa-nézetre → entitás-állapotként rögzül (ha van aktuális entitás)
      const ent = this.pakli?.aktualisEntitas?.();
      if (ent) {
        this.tortenet?.rogzit({ tipus: 'entitas', entitasId: ent.entitasId, entitasTipus: ent.entitasTipus });
      }
      return;
    }

    console.log('FoOldal._rendezesValtozott - rögzítés', reszletek);
    this.tortenet?.rogzit({
      tipus: 'rendezes',
      mod: reszletek.mod,
      irany: reszletek.irany,
      agazatId: reszletek.agazatId ?? null
    });
  }


  // =====================================
  // NÉZET-MODÁL MEGNYÍLT → TÖRTÉNETBE
  // =====================================
  // A koino:nezetNyitas eseményre fut (a TerkepModal küldi megnyitáskor). A térkép
  // megnyitása külön 'nezet' állapotként rögzül: a Vissza bezárja, az Előre újranyitja.
  // Az entitasId/entitasTipus az a pakli-entitás, ami fölött a nézet megnyílt (kontextus).
  // @param {{nezet:string, agEntitasId:string|null, cim:string}} reszletek
  _nezetNyitott(reszletek) {
    if (this._navigalasVisszajatszas) {
      console.log('FoOldal._nezetNyitott - KIHAGYVA (visszajátszás)');
      return;
    }

    const ent = this.pakli?.aktualisEntitas?.() ?? {};
    console.log('FoOldal._nezetNyitott - rögzítés', reszletek);
    this.tortenet?.rogzit({
      tipus: 'nezet',
      nezet: reszletek.nezet,
      agEntitasId: reszletek.agEntitasId ?? null,
      cim: reszletek.cim ?? null,
      entitasId: ent.entitasId ?? null,
      entitasTipus: ent.entitasTipus ?? null
    });
  }


  // =====================================
  // NAVIGÁLÁS EGY ENTITÁSRA (KÖZÖS KAPU)
  // =====================================
  // A fő-menüs modál-vezérelt ugrások (kereső, térkép, síkidom, tudatpontok,
  // értesítések) közös belépője: ment (ez küldi a történet-rögzítő eseményt), majd
  // betölti a paklit az adott entitásra.
  // @param {string} entitasId
  // @param {string} entitasTipus
  async _navigalasEntitasra(entitasId, entitasTipus) {
    console.log('FoOldal._navigalasEntitasra - KEZDÉS', { entitasId, entitasTipus });
    aktivEntitasMentese(entitasId, entitasTipus);
    await this._pakliInditasa(entitasId, entitasTipus);
    console.log('FoOldal._navigalasEntitasra - VÉGE');
  }


  // =====================================
  // TÖRTÉNET: VISSZA / ELŐRE (PUBLIKUS)
  // =====================================
  // A 3. lépésben a ◀ / ▶ gombok és az Alt+←/→ billentyűk hívják majd.
  // A történet-kezelő visszaadja a célállapotot, ezt itt JÁTSSZUK VISSZA.
  async tortenetVissza() {
    console.log('FoOldal.tortenetVissza - KEZDÉS');

    // Ha nyitott modál van, ami NEM a történet része (módosító modál), a Vissza
    // csak becsukja azt (mint az Esc). Ha viszont a jelenlegi állapot egy NÉZET
    // (pl. nyitott térkép), akkor a rendes történet-vissza fut – ami az apply során
    // úgyis bezárja a nézet-modált, és visszalép az előző állapotra.
    if (Modal.vanNyitottModal() && this.tortenet?.jelenlegiAllapot()?.tipus !== 'nezet') {
      Modal.legfelsoModalBezarasa();
      console.log('FoOldal.tortenetVissza - VÉGE (nyitott módosító modál bezárva)');
      return;
    }

    const cel = this.tortenet?.vissza();
    if (cel) await this._allapotAlkalmazasa(cel);
    console.log('FoOldal.tortenetVissza - VÉGE', { voltCel: !!cel });
  }

  async tortenetElore() {
    console.log('FoOldal.tortenetElore - KEZDÉS');

    // Nyitott MÓDOSÍTÓ modál mellett az Előre nem lép (nem navigálunk alatta). De ha
    // a jelenlegi állapot egy NÉZET (nyitott térkép), az Előre léphet – az apply a
    // térképet becsukja, és a következő állapotra vált.
    if (Modal.vanNyitottModal() && this.tortenet?.jelenlegiAllapot()?.tipus !== 'nezet') {
      console.log('FoOldal.tortenetElore - VÉGE (nyitott módosító modál, nincs lépés)');
      return;
    }

    const cel = this.tortenet?.elore();
    if (cel) await this._allapotAlkalmazasa(cel);
    console.log('FoOldal.tortenetElore - VÉGE', { voltCel: !!cel });
  }


  // =====================================
  // EGY KORÁBBI ÁLLAPOT VISSZAJÁTSZÁSA
  // =====================================
  // A vissza/előre célállapotát valósítja meg. A visszajátszás alatt a
  // _navigalasVisszajatszas jelző biztosítja, hogy a betöltés ne rögzüljön újra.
  // Kétféle rögzített állapot van: 'entitas' (pakli-entitás) és 'rendezes' (lapos
  //   rendezett nézet). A térkép nézet-állapotként a következő lépésben kerül ide.
  // @param {{tipus:string, entitasId?:string, entitasTipus?:string, mod?:string, irany?:string, agazatId?:string|null}} allapot
  async _allapotAlkalmazasa(allapot) {
    console.log('FoOldal._allapotAlkalmazasa - KEZDÉS', { allapot });

    this._navigalasVisszajatszas = true;
    try {
      // Bármi nyitott nézet-modált bezárunk – a cél állapot majd újranyitja, ha kell
      // (pl. entitásra visszalépéskor a nyitott térkép becsukódik).
      if (Modal.vanNyitottModal()) Modal.legfelsoModalBezarasa();

      if (allapot.tipus === 'nezet') {
        // NÉZET (térkép) újranyitása a mentett paraméterekkel
        await this._nezetModalNyitasa(allapot);
      } else if (allapot.tipus === 'rendezes') {
        // RENDEZETT (lapos) nézet visszaállítása a mentett rendezés-paraméterekkel
        await this.pakli.rendezesBeallitasa(allapot.mod, allapot.irany, allapot.agazatId);
      } else {
        // ENTITÁS-nézet: mentés + hierarchikus fa-nézet a cél entitáson.
        // A rendezesBeallitasa('hierarchikus') a most elmentett aktív entitástól indul,
        // így egyúttal kilép egy esetleges rendezett (lapos) módból is.
        aktivEntitasMentese(allapot.entitasId, allapot.entitasTipus);
        await this.pakli.rendezesBeallitasa('hierarchikus', this.pakli?.rendezesIrany ?? 'csokkeno', null);
      }
    } finally {
      this._navigalasVisszajatszas = false;
    }

    console.log('FoOldal._allapotAlkalmazasa - VÉGE');
  }


  // =====================================
  // TÖRTÉNET-GOMBOK ÁLLAPOT-FRISSÍTÉSE
  // =====================================
  // A ◀ / ▶ gombok tiltott állapotát állítja a történet aktuális helyzete szerint.
  // Védetten fut: ha a gombok még nincsenek a DOM-ban (3. lépés előtt), nem hibázik.
  // @param {{visszaLehetseges:boolean, eloreLehetseges:boolean}} [allapot]
  _tortenetGombokFrissitese(allapot) {
    const { visszaLehetseges, eloreLehetseges } =
      allapot ?? this.tortenet?.allapotLekeres() ?? { visszaLehetseges: false, eloreLehetseges: false };

    const visszaGomb = document.getElementById('tortenet-vissza-gomb');
    const eloreGomb  = document.getElementById('tortenet-elore-gomb');
    if (visszaGomb) visszaGomb.disabled = !visszaLehetseges;
    if (eloreGomb)  eloreGomb.disabled  = !eloreLehetseges;
  }


  // =====================================
  // TÖRTÉNET-GOMBOK BEKÖTÉSE
  // =====================================
  // A ◀ / ▶ gombok kattintás-figyelője, és az Alt+←/→ billentyűparancsok.
  // Az init() hívja, miután a HTML (benne a gombok) már a DOM-ban van.
  _tortenetGombokBekotese() {
    console.log('FoOldal._tortenetGombokBekotese - KEZDÉS');

    const visszaGomb = document.getElementById('tortenet-vissza-gomb');
    const eloreGomb  = document.getElementById('tortenet-elore-gomb');

    if (visszaGomb) visszaGomb.addEventListener('click', () => this.tortenetVissza());
    if (eloreGomb)  eloreGomb.addEventListener('click', () => this.tortenetElore());

    // Billentyűparancsok: Alt+← = vissza, Alt+→ = előre.
    // A böngésző saját Alt+nyíl lépését felülírjuk (preventDefault).
    document.addEventListener('keydown', (esemeny) => {
      if (!esemeny.altKey) return;

      if (esemeny.key === 'ArrowLeft') {
        esemeny.preventDefault();
        this.tortenetVissza();
      } else if (esemeny.key === 'ArrowRight') {
        esemeny.preventDefault();
        this.tortenetElore();
      }
    });

    // Kezdő állapot beállítása (mindkét gomb tiltott, amíg nincs történet)
    this._tortenetGombokFrissitese();

    console.log('FoOldal._tortenetGombokBekotese - VÉGE');
  }


  // =====================================
  // HAMBURGER OPCIÓK ÉPÍTÉSE
  // =====================================
  _hamburgerOpciokEpitese() {
    console.log('FoOldal._hamburgerOpciokEpitese - KEZDÉS');

    // A 🚧 ikonú pontok a fejlesztési terv részei (docs/fejlesztesi_terv.md),
    // de még nem készültek el – kattintásra a közös FejlesztesreVar üzenet jelenik meg
    // A pontok logikai CSOPORTOKBA rendezve, a csoportok között elválasztó vonallal
    // (`elvalaszto: true` az adott csoport ELSŐ elemén). Csoportok:
    //   1) Nézetek/navigáció · 2) Értesítések · 3) Létrehozás · 4) Fiók · 5) Kilépés
    const opciok = [
      // — 1) Nézetek / navigáció —
      {
        ikon:    '🔍',
        felirat: 'Keresés',
        akcio:   () => this._keresesMegnyitasa()
      },
      {
        ikon:    '🗺️',
        felirat: 'Térkép',
        akcio:   () => this._terkepMegnyitasa()
      },
      {
        // ÚJ, még fejlesztésre vár (a régi koino világtérkép újraépítése)
        ikon:    '🚧',
        felirat: 'Világtérkép',
        akcio:   () => fejlesztesreVarMegjelenitese('Világtérkép')
      },
      {
        // Fejlesztésre vár állapotban (a nézet kódja megmarad, de egyelőre nem nyílik)
        ikon:    '🚧',
        felirat: 'Síkidom nézet',
        akcio:   () => fejlesztesreVarMegjelenitese('Síkidom nézet')
      },
      {
        ikon:    '↕️',
        felirat: 'Rendezés',
        akcio:   () => this._rendezesMegnyitasa()
      },
      // — 2) Értesítések —
      {
        ikon:       '🔔',
        felirat:    'Értesítések',
        elvalaszto: true,
        badge:      true, // A sor jobb szélén az olvasatlan értesítések piros számlálója
        akcio:      () => this._ertesitesekMegnyitasa()
      },
      {
        ikon:    '🔔',
        felirat: 'Értesítési beállítások',
        akcio:   () => this._ertesitesiBeallitasokGlobalis()
      },
      // — 3) Létrehozás —
      {
        ikon:       '✏️',
        felirat:    'Új tartalom létrehozása',
        elvalaszto: true,
        akcio:      () => this._ujTartalomModalMegnyitasa()
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
      // — 4) Fiók —
      {
        ikon:       '✉️',
        felirat:    'Meghívóim',
        elvalaszto: true,
        akcio:      () => this._meghivoimMegnyitasa()
      },
      {
        ikon:    '🌟',
        felirat: 'Tudatpontok',
        akcio:   () => this._tudatpontokMegnyitasa()
      },
      {
        ikon:    '⚙️',
        felirat: 'eember beállítások',
        akcio:   () => this._eemberBeallitasokMegnyitasa()
      },
      // — 5) Kilépés —
      {
        ikon:       '🚪',
        felirat:    'Kijelentkezés',
        elvalaszto: true,
        akcio:      () => this._kijelentkezes()
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
        this._navigalasEntitasra(entitasId, entitasTipus);
      }
    });

    await keresesModal.init();
    keresesModal.megnyitas();

    console.log('FoOldal._keresesMegnyitasa - VÉGE');
  }

  // =====================================
  // RENDEZÉS MODAL MEGNYITÁSA (fő menü — GLOBÁLIS)
  // =====================================
  // A fő menüs „Rendezés" (15. terv-pont): a pakli nézet rendezés-választója.
  // Globális hatókör (nincs ágazat-szűrő). A kártya-menük ág-szűrt módban nyitják
  // ugyanezt a modalt (az adott kártya lesz az ágazat-gyökér — 6. lépés).
  async _rendezesMegnyitasa() {
    console.log('FoOldal._rendezesMegnyitasa - KEZDÉS');

    this.hamburgerMenu?.bezaras();

    const rendezesModal = new RendezesModal('modal-kontener', {
      aktualisMod:   this.pakli?.rendezesMod   ?? 'hierarchikus',
      aktualisIrany: this.pakli?.rendezesIrany ?? 'csokkeno',
      agazatCim:     null, // fő menüből → globális
      onAlkalmaz: (mod, irany) => {
        console.log('FoOldal - rendezés alkalmazása (globális)', { mod, irany });
        this.pakli.rendezesBeallitasa(mod, irany, null);
      }
    });

    await rendezesModal.init();
    rendezesModal.megnyitas();

    console.log('FoOldal._rendezesMegnyitasa - VÉGE');
  }


  // =====================================
  // TÉRKÉP MODAL MEGNYITÁSA
  // =====================================
  // A fő menüs „Térkép" – a TELJES entitás-fa teljes képernyős, interaktív
  // nézete (terv 13/b pont). Megnyitáskor előbb darabszám-kijelzés, az építés
  // folyamatjelzővel és Megszakítás gombbal fut; csomópontra kattintva a
  // pakli az entitásra navigál. Az aktuális entitás a térképen kiemelve.
  async _terkepMegnyitasa() {
    console.log('FoOldal._terkepMegnyitasa - KEZDÉS');
    this.hamburgerMenu?.bezaras();
    // Fő menüs Térkép = TELJES fa (nincs ág-szűrő → agEntitasId null)
    await this._terkepModalLetrehozasa(null, null);
    console.log('FoOldal._terkepMegnyitasa - VÉGE');
  }


  // =====================================
  // TÉRKÉP MODAL LÉTREHOZÁSA (KÖZÖS)
  // =====================================
  // Egy helyen hozza létre és nyitja a Térkép modált – ezt használja a fő menüs
  // megnyitás ÉS a vissza/előre visszajátszás (a történetből újranyitáskor) is.
  // @param {string|null} agEntitasId - null: teljes fa (fő menü); id: ág-szűrt (kártya)
  // @param {string|null} cim - opcionális modal-cím (ág-szűrt térképnél az ág neve)
  async _terkepModalLetrehozasa(agEntitasId = null, cim = null) {
    console.log('FoOldal._terkepModalLetrehozasa - KEZDÉS', { agEntitasId, cim });

    // Az éppen aktív entitás — a térképen kiemelve jelenik meg
    const { entitasId: aktualisEntitasId } = aktivEntitasLekerese();

    const konfig = {
      token: this.token,
      aktualisEntitasId,
      onEntitasKivalasztas: (entitasId, entitasTipus) => {
        console.log('FoOldal - térkép csomópontból navigálás', { entitasId, entitasTipus });
        this._navigalasEntitasra(entitasId, entitasTipus);
      }
    };
    if (agEntitasId) konfig.agEntitasId = agEntitasId;
    if (cim)         konfig.cim         = cim;

    const terkepModal = new TerkepModal('modal-kontener', konfig);
    await terkepModal.init();
    terkepModal.megnyitas();

    console.log('FoOldal._terkepModalLetrehozasa - VÉGE');
  }


  // =====================================
  // NÉZET-MODÁL ÚJRANYITÁSA (VISSZA/ELŐRE)
  // =====================================
  // Egy 'nezet' állapotot valósít meg: a mentett paraméterek szerint újranyitja
  // a nézet-modált. Jelenleg a Térkép; a Síkidom/Világtérkép később bővíthető.
  // @param {{nezet:string, agEntitasId:string|null, cim:string|null}} allapot
  async _nezetModalNyitasa(allapot) {
    console.log('FoOldal._nezetModalNyitasa - KEZDÉS', { allapot });
    if (allapot.nezet === 'terkep') {
      await this._terkepModalLetrehozasa(allapot.agEntitasId, allapot.cim);
    } else {
      console.warn('FoOldal._nezetModalNyitasa - ismeretlen nézet', { nezet: allapot.nezet });
    }
    console.log('FoOldal._nezetModalNyitasa - VÉGE');
  }


  // =====================================
  // SÍKIDOM NÉZET MODAL MEGNYITÁSA
  // =====================================
  // A fő menüs „Síkidom nézet" – a koino_1.0 fraktál kör-pakolásának újraépítése
  // (terv 14. pont, 1. lépés: statikus ablak). A globális nézet a legerősebb
  // gyökértől indul; síkidomra koppintva a pakli az entitásra navigál.
  async _sikidomMegnyitasa() {
    console.log('FoOldal._sikidomMegnyitasa - KEZDÉS');

    this.hamburgerMenu?.bezaras();

    // Az éppen aktív entitás — a síkidom nézetben kiemelve jelenik meg (ha látszik)
    const { entitasId: aktualisEntitasId } = aktivEntitasLekerese();

    const sikidomModal = new SikidomModal('modal-kontener', {
      token: this.token,
      aktualisEntitasId,
      onEntitasKivalasztas: (entitasId, entitasTipus) => {
        console.log('FoOldal - síkidomból navigálás', { entitasId, entitasTipus });
        this._navigalasEntitasra(entitasId, entitasTipus);
      }
    });

    await sikidomModal.init();
    await sikidomModal.megnyitas();

    console.log('FoOldal._sikidomMegnyitasa - VÉGE');
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
        this._navigalasEntitasra(entitasId, entitasTipus);
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
        this._navigalasEntitasra(entitasId, entitasTipus);
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
      this.eemberekSzama        = platformStatisztika.eemberekSzama.toLocaleString();
      this.tartalmakSzama       = platformStatisztika.tartalmakSzama.toLocaleString();
      this.kategoriakSzama      = (platformStatisztika.kategoriakSzama ?? 0).toLocaleString();
      this.tartalomTipusokSzama = (platformStatisztika.tartalomTipusokSzama ?? 0).toLocaleString();
      this.javaslatokSzama      = (platformStatisztika.javaslatokSzama ?? 0).toLocaleString();
      this.egyezmenyekSzama     = (platformStatisztika.egyezmenyekSzama ?? 0).toLocaleString();

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
      'info-eemberek-szama':       `🧑‍🤝‍🧑 ${this.eemberekSzama}`,
      // Az entitás-ikonok a platform egységes készletét követik (mint a Térképen):
      // Tartalom 📄 · Kategória 🏷️ · Tartalomtípus 🧩 · Javaslat 📋 · Egyezmény 🤝
      'info-tartalmak-szama':      `📄 ${this.tartalmakSzama}`,
      'info-kategoriak-szama':     `🏷️ ${this.kategoriakSzama}`,
      'info-tartalomtipusok-szama':`🧩 ${this.tartalomTipusokSzama}`,
      'info-javaslatok-szama':     `📋 ${this.javaslatokSzama}`,
      'info-egyezmenyek-szama':    `🤝 ${this.egyezmenyekSzama}`
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
      'info-tartalmak-szama',
      'info-kategoriak-szama',
      'info-tartalomtipusok-szama',
      'info-javaslatok-szama',
      'info-egyezmenyek-szama'
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