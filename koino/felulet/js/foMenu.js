// koino/felulet/js/foMenu.js

// Felelősség: A FŐ MENÜ (D101, M6) — a prototípus `foOldal.js` menüje: ugyanazok a pontok, ugyanabban a rendben és
// csoportban, ugyanazokkal a modál-hívásokkal. A nyolc modál ág NÉLKÜLI változata innen nyílik (a kártyák menüje az
// ág-szűrtet nyitja), és innen az „Új kategória / gondolattípus” is.
//
// ===== ⭐ MIÉRT NEM A `foOldal.js` MAGA =====
//
// A prototípus főoldala a menün kívül a bejelentkezést, az alsó statisztika-sávot (a platform-szintű számokkal: hány
// e-ember, hány gondolat — a P2P-ben ilyen szám nincs, 9. szabály), a vissza/előre történetet és a pakli indítását is
// viszi. Abból itt csak a MENÜ kell (M6); a többi vagy nem létezik a koinóban (a bejelentkezés — D15), vagy a lapé
// (`index.html`, `koinoPakli.js`). ⭐ Ezért a menü-definíció és a menüpontok műveletei jönnek át — szó szerint, a
// prototípus `_hamburgerOpciokEpitese` és `_…Megnyitasa` metódusai szerint —, a `HamburgerMenu` komponens pedig
// változatlanul (a kártyák is azt használják).
//
// ===== ⚠️ AMI A P2P-BEN MÁS ÚT =====
//
//   · **Meghívóim** — a prototípusban kód, itt aláírt esemény (a meghívott horgonyára — Szakasz 4, szakasz5_terv 6.);
//   · **eember beállítások** — a prototípusban fiók-adat és jelszó, itt a Profil (D93/5) és a kulcs mentése (D15);
//   ezek a prototípus saját „fejlesztésre vár” jelzését kapják a saját átvizsgálásukig. A **Kijelentkezés** kimarad:
//   a koinóban nincs bejelentkezés (D15).
//
// Használja: `index.html`.

import HamburgerMenu from './components/HamburgerMenu.js';
import fejlesztesreVarMegjelenitese from './components/FejlesztesreVar.js';
import GondolatModal from './components/modals/GondolatModal.js';
import KategoriaModal from './components/modals/KategoriaModal.js';
import GondolatTipusModal from './components/modals/GondolatTipusModal.js';
import KeresesModal from './components/modals/KeresesModal.js';
import RendezesModal from './components/modals/RendezesModal.js';
import StrukturaModal from './components/modals/StrukturaModal.js';
import SikidomModal from './components/modals/SikidomModal.js';
import TudatpontokModal from './components/modals/TudatpontokModal.js';
import ErtesitesekModal from './components/modals/ErtesitesekModal.js';
import ErtesitesiBeallitasModal from './components/modals/ErtesitesiBeallitasModal.js';
import { aktivEntitasLekerese, aktivEntitasMentese, tokenLekerese } from './utils/authHelper.js';

const MODAL_KONTENER = 'modal-kontener';

export class FoMenu {

  /**
   * @param {string} kontenerAzon - a menü konténere (a prototípusé: `hamburger-menu-kontener`)
   * @param {Object} pakli - a lap paklija (`KoinoPakli`) — a navigálás és a rendezés ezen fut
   */
  constructor(kontenerAzon, pakli) {
    console.log('FoMenu.constructor - KEZDÉS', { kontenerAzon });
    this.kontenerAzon = kontenerAzon;
    this.pakli = pakli;
    this.token = tokenLekerese();
    this.hamburgerMenu = null;
    console.log('FoMenu.constructor - VÉGE');
  }

  async init() {
    console.log('FoMenu.init - KEZDÉS');
    this.hamburgerMenu = new HamburgerMenu(this.kontenerAzon, this._hamburgerOpciokEpitese());
    await this.hamburgerMenu.init();
    // ⏸️ Az értesítések számlálója (a prototípus `_ertesitesBadgeFrissitese`-je) az értesítés-réteggel jön (D101 ⑥).
    this.hamburgerMenu.badgeFrissitese(0);
    console.log('FoMenu.init - VÉGE');
  }

  // =====================================
  // HAMBURGER OPCIÓK — a prototípus `_hamburgerOpciokEpitese`-je szerint
  // =====================================
  _hamburgerOpciokEpitese() {
    // A pontok logikai CSOPORTOKBA rendezve, a csoportok között elválasztó vonallal (a prototípusé):
    //   1) Nézetek/navigáció · 2) Értesítések · 3) Létrehozás · 4) Fiók  (· 5) Kilépés — a koinóban nincs, D15)
    return [
      // — 1) Nézetek / navigáció —
      { ikon: '🔍', felirat: 'Keresés', akcio: () => this._keresesMegnyitasa() },
      { ikon: '🗺️', felirat: 'Struktúra nézet', akcio: () => this._strukturaMegnyitasa() },
      // ÚJ, még fejlesztésre vár (a régi koino világtérkép újraépítése) — a prototípusban is
      { ikon: '🚧', felirat: 'Világtérkép', akcio: () => fejlesztesreVarMegjelenitese('Világtérkép', MODAL_KONTENER) },
      { ikon: '🔷', felirat: 'Síkidom nézet', akcio: () => this._sikidomMegnyitasa() },
      { ikon: '↕️', felirat: 'Rendezés', akcio: () => this._rendezesMegnyitasa() },
      // — 2) Értesítések —
      { ikon: '🔔', felirat: 'Értesítések', elvalaszto: true, badge: true, akcio: () => this._ertesitesekMegnyitasa() },
      { ikon: '🔔', felirat: 'Értesítési beállítások', akcio: () => this._ertesitesiBeallitasokGlobalis() },
      // — 3) Létrehozás —
      { ikon: '✏️', felirat: 'Új gondolat létrehozása', elvalaszto: true, akcio: () => this._ujGondolatModalMegnyitasa() },
      { ikon: '🏷️', felirat: 'Új kategória létrehozása', akcio: () => this._ujKategoriaModalMegnyitasa() },
      { ikon: '🧩', felirat: 'Új gondolat típus létrehozása', akcio: () => this._ujGondolatTipusModalMegnyitasa() },
      // — 4) Fiók — ⚠️ a Meghívóim és az eember beállítások a P2P-ben más út (lásd a fejlécet)
      { ikon: '✉️', felirat: 'Meghívóim', elvalaszto: true,
        akcio: () => fejlesztesreVarMegjelenitese('Meghívóim — a koinóban a meghívás aláírt esemény', MODAL_KONTENER) },
      { ikon: '🌟', felirat: 'Tudatpontok', akcio: () => this._tudatpontokMegnyitasa() },
      { ikon: '⚙️', felirat: 'eember beállítások',
        akcio: () => fejlesztesreVarMegjelenitese('eember beállítások — a koinóban a Profil és a kulcs mentése', MODAL_KONTENER) }
    ];
  }

  // =====================================
  // NAVIGÁLÁS — a prototípus `_navigalasEntitasra`-ja
  // =====================================
  async _navigalasEntitasra(entitasId, entitasTipus) {
    console.log('FoMenu._navigalasEntitasra', { entitasId, entitasTipus });
    aktivEntitasMentese(entitasId, entitasTipus);
    await this.pakli.init(entitasId, entitasTipus);
  }

  /** A pakli újratöltése a mentett kártyától (mint a prototípus `_pakliInditasa`-ja a modálok után). */
  async _pakliUjratoltese() {
    const { entitasId, entitasTipus } = aktivEntitasLekerese();
    await this.pakli.init(entitasId, entitasTipus);
  }

  // =====================================
  // A MENÜPONTOK — a prototípus metódusai szerint
  // =====================================

  async _ujGondolatModalMegnyitasa() {
    this.hamburgerMenu?.bezaras();
    const modal = new GondolatModal(MODAL_KONTENER, { mod: 'letrehozas', onSiker: () => this._pakliUjratoltese() });
    await modal.init();
    modal.megnyitas();
  }

  async _ujKategoriaModalMegnyitasa() {
    this.hamburgerMenu?.bezaras();
    const modal = new KategoriaModal(MODAL_KONTENER, { mod: 'letrehozas', onSiker: () => this._pakliUjratoltese() });
    await modal.init();
    modal.megnyitas();
  }

  async _ujGondolatTipusModalMegnyitasa() {
    this.hamburgerMenu?.bezaras();
    const modal = new GondolatTipusModal(MODAL_KONTENER, { mod: 'letrehozas', onSiker: () => this._pakliUjratoltese() });
    await modal.init();
    modal.megnyitas();
  }

  // A fő menüs „Keresés” — az egész koinóban (ág nélkül). Találatra a pakli az entitásra navigál.
  async _keresesMegnyitasa() {
    this.hamburgerMenu?.bezaras();
    const modal = new KeresesModal(MODAL_KONTENER, {
      token: this.token,
      onEntitasKivalasztas: (entitasId, entitasTipus) => this._navigalasEntitasra(entitasId, entitasTipus)
    });
    await modal.init();
    modal.megnyitas();
  }

  // A fő menüs „Rendezés” — globális (nincs ágazat-szűrő); a kártya-menük az ág-szűrtet nyitják.
  async _rendezesMegnyitasa() {
    this.hamburgerMenu?.bezaras();
    const modal = new RendezesModal(MODAL_KONTENER, {
      aktualisMod: this.pakli?.rendezesMod ?? 'hierarchikus',
      aktualisIrany: this.pakli?.rendezesIrany ?? 'csokkeno',
      agazatCim: null,
      onAlkalmaz: (mod, irany) => {
        // (A `Pakli.rendezesBeallitasa` maga jelez — `koino:rendezesValtozas` —, a fejléc választója abból igazodik.)
        this.pakli.rendezesBeallitasa(mod, irany, null);
      }
    });
    await modal.init();
    modal.megnyitas();
  }

  // A fő menüs „Struktúra nézet” — az egész koinó (ág nélkül).
  async _strukturaMegnyitasa() {
    this.hamburgerMenu?.bezaras();
    const { entitasId: aktualisEntitasId } = aktivEntitasLekerese();
    const modal = new StrukturaModal(MODAL_KONTENER, {
      token: this.token,
      aktualisEntitasId,
      onEntitasKivalasztas: (entitasId, entitasTipus) => this._navigalasEntitasra(entitasId, entitasTipus)
    });
    await modal.init();
    modal.megnyitas();
  }

  // A fő menüs „Síkidom nézet” — a VILÁG-tól (horgony nélkül).
  async _sikidomMegnyitasa() {
    this.hamburgerMenu?.bezaras();
    const { entitasId: aktualisEntitasId } = aktivEntitasLekerese();
    const modal = new SikidomModal(MODAL_KONTENER, {
      token: this.token,
      aktualisEntitasId,
      onEntitasKivalasztas: (entitasId, entitasTipus) => this._navigalasEntitasra(entitasId, entitasTipus)
    });
    await modal.init();
    await modal.megnyitas();
  }

  // A fő menüs „Tudatpontok” — a saját aktív hozzárendelések teljes listája (ág nélkül).
  async _tudatpontokMegnyitasa() {
    this.hamburgerMenu?.bezaras();
    const modal = new TudatpontokModal(MODAL_KONTENER, {
      token: this.token,
      onEntitasKivalasztas: (entitasId, entitasTipus) => this._navigalasEntitasra(entitasId, entitasTipus),
      // Bezáráskor (ha volt módosítás, de nem navigáltunk) a pakli újratöltése
      onBezarasValtozassal: () => this._pakliUjratoltese()
    });
    await modal.init();
    await modal.megnyitas();
  }

  // A fő menüs „Értesítések” — a postafiók (az értesítés-réteggel jön, D101 ⑥).
  async _ertesitesekMegnyitasa() {
    this.hamburgerMenu?.bezaras();
    const modal = new ErtesitesekModal(MODAL_KONTENER, {
      token: this.token,
      onEntitasKivalasztas: (entitasId, entitasTipus) => this._navigalasEntitasra(entitasId, entitasTipus)
    });
    await modal.init();
    await modal.megnyitas();
  }

  // A fő menüs „Értesítési beállítások” — a GLOBÁLIS alapbeállítás.
  async _ertesitesiBeallitasokGlobalis() {
    this.hamburgerMenu?.bezaras();
    const modal = new ErtesitesiBeallitasModal(MODAL_KONTENER, { globalis: true, token: this.token });
    await modal.init();
    await modal.megnyitas();
  }
}

export default FoMenu;
