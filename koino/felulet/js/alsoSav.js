// koino/felulet/js/alsoSav.js

// Felelősség: AZ ALSÓ SÁV (Csaba, 2026-10-15) — a prototípus `foOldal.js`-ének az a része, ami az alsó sávot hajtja:
//   · a VISSZA / ELŐRE történet (a `FoOldalTortenetKezelo` — bájtra a prototípusé —, a gombok és az Alt+←/→);
//   · az INFÓK (a név, a szabad tudatpont, és a számok — `adatokBetoltese`, `alsoSavFrissitese`, `alsoSavHibaJelzes`).
// A metódusok a prototípus nevein és lépésein mennek; a menü a `foMenu.js`-é, a pakli a `koinoPakli.js`-é.
//
// ===== ⭐ A KOINÓS TÖBBLET: A CSERE =====
//
// A cserét nem a lap végzi, hanem az őrjárat (egy másik folyamat). A program egy helyi feljegyzésből mondja meg
// (`/api/csere-allapot` — `csereAllapot.js`), mikor cserélt utoljára a készülék, hozott-e újat, és mikor jön a következő
// kör. A lap ezt az alsó sáv végén kiírja (a visszaszámlálás itt, másodpercenként — a program csak az időpontot adja),
// és ⭐ ha egy csere új eseményt hozott, csendben frissül: a pakli a kiválasztás helyén (`KoinoPakli.kulsoValtozas`),
// az infók és a menü értesítés-számlálója. Nyitott modál alatt nem rajzolunk újra (a néző épp ír vagy olvas): a
// frissítés megvárja, amíg bezárul. A feliratra kattintva azonnal frissül.
//
// ⚠️ A lap itt sem számol a koinóról: minden szám a programtól jön; ez a fájl kiírja, és időzít.
//
// Használja: `index.html`.

import FoOldalTortenetKezelo from './components/FoOldalTortenetKezelo.js';
import Modal from './components/modals/Modal.js';
import { apiGet } from './utils/apiHelper.js';
import { aktivEntitasMentese } from './utils/authHelper.js';

/** Ilyen sűrűn kérdezzük a csere állapotát (egy kis fájl olvasása a programban — a koinó méretétől független). */
const CSERE_KERDEZES = 10 * 1000;

/** Az infók azonosítói — a prototípus `foOldalForm.html`-jéé. */
const INFO_AZONOSITOK = [
  'info-eembernev',
  'info-tudatpont',
  'info-eemberek-szama',
  'info-gondolatok-szama',
  'info-kategoriak-szama',
  'info-gondolattipusok-szama',
  'info-javaslatok-szama',
  'info-egyezmenyek-szama',
  // ⭐ A koinós többlet (2026-10-23): amit a készülék még nem ismer (a tartó szerint)
  'info-ismeretlen'
];

/** „2 perce”, „3 órája” — a csere ideje emberi nyelven. */
function mennyiIdeje(ms) {
  const mp = Math.max(0, Math.round(ms / 1000));
  if (mp < 60) return 'most';
  const perc = Math.floor(mp / 60);
  if (perc < 60) return perc + ' perce';
  const ora = Math.floor(perc / 60);
  if (ora < 24) return ora + ' órája';
  return Math.floor(ora / 24) + ' napja';
}

/** „0:42”, „4:05” — a visszaszámlálás. */
function visszaszamlalo(ms) {
  const mp = Math.max(0, Math.ceil(ms / 1000));
  return Math.floor(mp / 60) + ':' + String(mp % 60).padStart(2, '0');
}

const oraPerc = (t) => new Date(t).toLocaleTimeString('hu-HU');

export class AlsoSav {

  /**
   * @param {Object} pakli - a lap paklija (`KoinoPakli`)
   * @param {Object} foMenu - a fő menü (`FoMenu`) — a nézet-modálok újranyitása és az értesítés-számláló az övé
   * @param {Object} [opciok] - { pakliLathato: () => boolean } — a tér nyitva van-e (akkor a paklit nem rajzoljuk)
   */
  constructor(pakli, foMenu, opciok = {}) {
    console.log('AlsoSav.constructor - KEZDÉS');
    this.pakli = pakli;
    this.foMenu = foMenu;
    this.pakliLathato = opciok.pakliLathato ?? (() => true);
    this.tortenet = null;
    // Jelző: éppen a vissza/előre gomb JÁTSSZA VISSZA egy korábbi állapotot? Ilyenkor a navigációt NEM szabad új
    // történet-lépésként rögzíteni (a prototípusé).
    this._navigalasVisszajatszas = false;
    this.eemberNev = '...';
    this.tudatpontok = '...';
    this.eemberekSzama = '...';
    this.gondolatokSzama = '...';
    this.kategoriakSzama = '...';
    this.gondolatTipusokSzama = '...';
    this.javaslatokSzama = '...';
    this.egyezmenyekSzama = '...';
    // A csere: a program legutóbbi válasza, és melyik „új eseményes” cserét láttuk már (az első kérdés az alapvonal).
    this.csere = null;
    this.csereKerdezveEkkor = 0;
    this.latottUj = undefined;
    this.frissitesFugg = false;
    this.csereIdozito = null;
    this.ketyego = null;
    console.log('AlsoSav.constructor - VÉGE');
  }

  // =====================================
  // INICIALIZÁLÁS — a prototípus `FoOldal.init`-jének alsó sáv része
  // =====================================
  init() {
    console.log('AlsoSav.init - KEZDÉS');
    this._magassagFigyelese();
    this.tortenet = new FoOldalTortenetKezelo({
      onValtozas: (allapot) => this._tortenetGombokFrissitese(allapot)
    });
    this._tortenetGombokBekotese();

    // A KÁRTYÁK (és a fő menü Tudatpontok modálja) jelzése: pont-módosítás után az infók (szabad tudatpont) frissítése.
    document.addEventListener('koino:tudatpontValtozas', () => this.adatokBetoltese());

    // ===== KÖZÖS NAVIGÁCIÓS JELZÉS → VISSZA/ELŐRE TÖRTÉNET =====
    // Minden entitás-váltás átfut az aktivEntitasMentese()-n, ami elküldi ezt az eseményt (a prototípusé).
    document.addEventListener('koino:aktivEntitasValtozas', (esemeny) => this._aktivEntitasValtozott(esemeny.detail));
    // A RENDEZÉS is nézet-állapot (a `Pakli.rendezesBeallitasa` jelez).
    document.addEventListener('koino:rendezesValtozas', (esemeny) => this._rendezesValtozott(esemeny.detail));
    // A Struktúra és a Síkidom megnyitása is nézet-állapot (a modálok jeleznek).
    document.addEventListener('koino:nezetNyitas', (esemeny) => this._nezetNyitott(esemeny.detail));

    // ⭐ A csere: a felirat kattintásra azonnal frissít; a kérdezés a lap láthatóságához igazodik.
    document.getElementById('info-csere')?.addEventListener('click', () => this._csereUtaniFrissites(true));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this._csereKerdezese(); });
    this.ketyego = setInterval(() => this._csereKiirasa(), 1000);
    this._csereKerdezese();
    // ⭐⭐ D119 (①b): a programverzió — egyszer (a futó program és a koinó születése futás közben nem változik)
    this._programKerdezese();

    this.adatokBetoltese();
    console.log('AlsoSav.init - VÉGE');
  }

  /** A kezdő állapot a történetbe — a pakli betöltése UTÁN (a prototípus `init`-jének `then` ága). */
  kezdoAllapotRogzitese() {
    const kezdo = this.pakli?.aktualisEntitas?.();
    if (kezdo) {
      this.tortenet.rogzit({ tipus: 'entitas', entitasId: kezdo.entitasId, entitasTipus: kezdo.entitasTipus });
    }
  }

  // =====================================
  // AKTÍV ENTITÁS / RENDEZÉS / NÉZET → TÖRTÉNETBE (a prototípusé)
  // =====================================
  _aktivEntitasValtozott(reszletek) {
    if (this._navigalasVisszajatszas) {
      console.log('AlsoSav._aktivEntitasValtozott - KIHAGYVA (visszajátszás)');
      return;
    }
    if (!reszletek?.entitasId || !reszletek?.entitasTipus) return;
    console.log('AlsoSav._aktivEntitasValtozott - rögzítés', reszletek);
    this.tortenet?.rogzit({ tipus: 'entitas', entitasId: reszletek.entitasId, entitasTipus: reszletek.entitasTipus });
  }

  _rendezesValtozott(reszletek) {
    if (this._navigalasVisszajatszas) {
      console.log('AlsoSav._rendezesValtozott - KIHAGYVA (visszajátszás)');
      return;
    }
    if (reszletek?.mod === 'hierarchikus') {
      const ent = this.pakli?.aktualisEntitas?.();
      if (ent) this.tortenet?.rogzit({ tipus: 'entitas', entitasId: ent.entitasId, entitasTipus: ent.entitasTipus });
      return;
    }
    console.log('AlsoSav._rendezesValtozott - rögzítés', reszletek);
    this.tortenet?.rogzit({ tipus: 'rendezes', mod: reszletek?.mod, irany: reszletek?.irany, agazatId: reszletek?.agazatId ?? null });
  }

  _nezetNyitott(reszletek) {
    if (this._navigalasVisszajatszas) {
      console.log('AlsoSav._nezetNyitott - KIHAGYVA (visszajátszás)');
      return;
    }
    const ent = this.pakli?.aktualisEntitas?.() ?? {};
    console.log('AlsoSav._nezetNyitott - rögzítés', reszletek);
    this.tortenet?.rogzit({
      tipus: 'nezet',
      nezet: reszletek?.nezet,
      agEntitasId: reszletek?.agEntitasId ?? null,
      horgonyEntitasId: reszletek?.horgonyEntitasId ?? null,
      kamera: reszletek?.kamera ?? null,
      cim: reszletek?.cim ?? null,
      entitasId: ent.entitasId ?? null,
      entitasTipus: ent.entitasTipus ?? null
    });
  }

  // =====================================
  // TÖRTÉNET: VISSZA / ELŐRE (a prototípusé)
  // =====================================
  async tortenetVissza() {
    console.log('AlsoSav.tortenetVissza - KEZDÉS');
    // Nyitott módosító modálnál a Vissza csak becsukja (mint az Esc); nézet-állapotnál a rendes történet-vissza fut.
    if (Modal.vanNyitottModal() && this.tortenet?.jelenlegiAllapot()?.tipus !== 'nezet') {
      Modal.legfelsoModalBezarasa();
      console.log('AlsoSav.tortenetVissza - VÉGE (nyitott módosító modál bezárva)');
      return;
    }
    const cel = this.tortenet?.vissza();
    if (cel) await this._allapotAlkalmazasa(cel);
    console.log('AlsoSav.tortenetVissza - VÉGE', { voltCel: !!cel });
  }

  async tortenetElore() {
    console.log('AlsoSav.tortenetElore - KEZDÉS');
    if (Modal.vanNyitottModal() && this.tortenet?.jelenlegiAllapot()?.tipus !== 'nezet') {
      console.log('AlsoSav.tortenetElore - VÉGE (nyitott módosító modál, nincs lépés)');
      return;
    }
    const cel = this.tortenet?.elore();
    if (cel) await this._allapotAlkalmazasa(cel);
    console.log('AlsoSav.tortenetElore - VÉGE', { voltCel: !!cel });
  }

  // Egy korábbi állapot visszajátszása — a visszajátszás alatt a jelző nem engedi újra rögzíteni.
  async _allapotAlkalmazasa(allapot) {
    console.log('AlsoSav._allapotAlkalmazasa - KEZDÉS', { allapot });
    this._navigalasVisszajatszas = true;
    try {
      if (Modal.vanNyitottModal()) Modal.legfelsoModalBezarasa();
      if (allapot.tipus === 'nezet') {
        await this.foMenu?._nezetModalNyitasa(allapot);
      } else if (allapot.tipus === 'rendezes') {
        await this.pakli.rendezesBeallitasa(allapot.mod, allapot.irany, allapot.agazatId);
      } else {
        aktivEntitasMentese(allapot.entitasId, allapot.entitasTipus);
        await this.pakli.rendezesBeallitasa('hierarchikus', this.pakli?.rendezesIrany ?? 'csokkeno', null);
      }
    } finally {
      this._navigalasVisszajatszas = false;
    }
    console.log('AlsoSav._allapotAlkalmazasa - VÉGE');
  }

  _tortenetGombokFrissitese(allapot) {
    const { visszaLehetseges, eloreLehetseges } =
      allapot ?? this.tortenet?.allapotLekeres() ?? { visszaLehetseges: false, eloreLehetseges: false };
    const visszaGomb = document.getElementById('tortenet-vissza-gomb');
    const eloreGomb = document.getElementById('tortenet-elore-gomb');
    if (visszaGomb) visszaGomb.disabled = !visszaLehetseges;
    if (eloreGomb) eloreGomb.disabled = !eloreLehetseges;
  }

  _tortenetGombokBekotese() {
    console.log('AlsoSav._tortenetGombokBekotese - KEZDÉS');
    const visszaGomb = document.getElementById('tortenet-vissza-gomb');
    const eloreGomb = document.getElementById('tortenet-elore-gomb');
    if (visszaGomb) visszaGomb.addEventListener('click', () => this.tortenetVissza());
    if (eloreGomb) eloreGomb.addEventListener('click', () => this.tortenetElore());
    // Billentyűparancsok: Alt+← = vissza, Alt+→ = előre (a böngésző saját lépését felülírjuk).
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
    this._tortenetGombokFrissitese();
    console.log('AlsoSav._tortenetGombokBekotese - VÉGE');
  }

  // =====================================
  // ADATOK BETÖLTÉSE — a prototípus `adatokBetoltese`-je
  // =====================================
  // ⚠️ A „platform statisztika” itt a KÉSZÜLÉKEN ismert rész (9. szabály) — a program mondja ki, mit jelent, és a
  // megjegyzése az infók súgója lesz. Bejelentkezés nincs (D15), tehát kijelentkeztetés sincs: hibánál csak „–”.
  async adatokBetoltese() {
    console.log('AlsoSav.adatokBetoltese - KEZDÉS');
    try {
      const [sajatAdatok, statisztika] = await Promise.all([
        apiGet('eember/sajat-adatok'),
        apiGet('platform/statisztika')
      ]);
      this.eemberNev = sajatAdatok.eemberNev;
      this.tudatpontok = (sajatAdatok.tudatpontok ?? 0).toLocaleString();
      this.eemberekSzama = (statisztika.eemberekSzama ?? 0).toLocaleString();
      this.gondolatokSzama = (statisztika.gondolatokSzama ?? 0).toLocaleString();
      this.kategoriakSzama = (statisztika.kategoriakSzama ?? 0).toLocaleString();
      this.gondolatTipusokSzama = (statisztika.gondolatTipusokSzama ?? 0).toLocaleString();
      this.javaslatokSzama = (statisztika.javaslatokSzama ?? 0).toLocaleString();
      this.egyezmenyekSzama = (statisztika.egyezmenyekSzama ?? 0).toLocaleString();
      // ⭐ (2026-10-23) a még nem ismert entitások (a tartó szerint) — null: nem tudom
      this.ismeretlenSzama = Number.isInteger(statisztika.ismeretlenSzama) ? statisztika.ismeretlenSzama : null;
      this.ismeretlenLegalabb = statisztika.ismeretlenLegalabb === true;
      this.alsoSavFrissitese();
      this._ismeretlenFelirata();
      const infok = document.querySelector('.also-sav__infok');
      if (infok && statisztika.koinoMegjegyzes) infok.title = statisztika.koinoMegjegyzes;
      console.log('AlsoSav.adatokBetoltese - VÉGE', { eemberNev: this.eemberNev, gondolatokSzama: this.gondolatokSzama });
    } catch (hiba) {
      console.error('AlsoSav.adatokBetoltese - VÉGE (hiba)', { hiba: hiba.message });
      this.alsoSavHibaJelzes();
    }
  }

  // A prototípus `alsoSavFrissitese`-je — ugyanazokkal az ikonokkal.
  alsoSavFrissitese() {
    const elemek = {
      'info-eembernev': this.eemberNev,
      'info-tudatpont': `🌟 ${this.tudatpontok}`,
      'info-eemberek-szama': `🧑‍🤝‍🧑 ${this.eemberekSzama}`,
      'info-gondolatok-szama': `📄 ${this.gondolatokSzama}`,
      'info-kategoriak-szama': `🏷️ ${this.kategoriakSzama}`,
      'info-gondolattipusok-szama': `🧩 ${this.gondolatTipusokSzama}`,
      'info-javaslatok-szama': `📋 ${this.javaslatokSzama}`,
      'info-egyezmenyek-szama': `🤝 ${this.egyezmenyekSzama}`
    };
    Object.entries(elemek).forEach(([id, szoveg]) => {
      const elem = document.getElementById(id);
      if (elem) {
        elem.classList.remove('also-sav__info-elem--betoltes');
        elem.textContent = szoveg;
      } else {
        console.warn(`AlsoSav.alsoSavFrissitese - FIGYELEM: #${id} nem található`);
      }
    });
  }

  /**
   * ⭐ (Csaba, 2026-10-23): a még nem ismert entitások — „🔭 N” (ha a tartó maga sem tudja pontosan: „N+”; ha nem tudom:
   * „?”), a magyarázattal. A koinós többlet; a szám a programé (`helyiStatisztika` — D116).
   */
  _ismeretlenFelirata() {
    const elem = document.getElementById('info-ismeretlen');
    if (!elem) return;
    elem.classList.remove('also-sav__info-elem--betoltes');
    if (this.ismeretlenSzama === null) {
      elem.textContent = '🔭 ?';
      elem.title = 'Hogy mennyi entitás van még a koinóban, amit ez a készülék nem ismer, nem tudom — a gyökér szintjének '
        + 'tartója még nem mondta meg.';
    } else {
      elem.textContent = '🔭 ' + this.ismeretlenSzama.toLocaleString() + (this.ismeretlenLegalabb ? '+' : '');
      elem.title = (this.ismeretlenSzama === 0 && !this.ismeretlenLegalabb
        ? 'A koinó minden entitását ismeri ez a készülék (a tartója szerint).'
        : (this.ismeretlenLegalabb ? 'Legalább ' : '') + this.ismeretlenSzama.toLocaleString() + ' entitás van még a koinóban '
          + '(a tartója szerint), amit ez a készülék nem ismer — böngészéssel vagy felderítéssel hozható el.');
    }
    elem.setAttribute('aria-label', elem.title);
  }

  /**
   * ⭐ (Csaba, 2026-10-23: „az alsó sáv eltakarja … szeretném, ha nem takarná sehogy”): a sáv VALÓDI magassága a lapnak — a
   * telefonon több sorba törik (a prototípus a kb. egysoros sávra hagyott helyet). A `--koino-also-sav` változóból a pakli
   * alja és a menük helye számol (`koinoKartya.css`); a sáv átméretezését is követi.
   */
  _magassagFigyelese() {
    const sav = document.querySelector('.also-sav');
    if (!sav) return;
    const beallit = () => document.documentElement.style.setProperty('--koino-also-sav', sav.offsetHeight + 'px');
    beallit();
    if (typeof ResizeObserver === 'function') new ResizeObserver(beallit).observe(sav);
    else window.addEventListener('resize', beallit);
  }

  alsoSavHibaJelzes() {
    INFO_AZONOSITOK.forEach((id) => {
      const elem = document.getElementById(id);
      if (elem) {
        elem.textContent = '–';
        elem.classList.add('also-sav__info-elem--betoltes');
      }
    });
  }

  // =====================================
  // ⭐ A CSERE — mikor volt, mikor jön, és frissítés, ha újat hozott
  // =====================================

  /** A program kérdezése (10 mp-enként, ha a lap látszik), és ha egy csere újat hozott, a frissítés. */
  async _csereKerdezese() {
    clearTimeout(this.csereIdozito);
    this.csereIdozito = setTimeout(() => this._csereKerdezese(), CSERE_KERDEZES);
    if (document.hidden) return;
    try {
      const v = await apiGet('csere-allapot');
      const a = v?.adatok;
      if (!a) return;
      // A program órája és a lapé ugyanaz a gép — de a visszaszámlálás a válasz pillanatától számol, nem a lap órájától.
      this.csere = a;
      this.csereKerdezveEkkor = Date.now();
      const uj = a.utolsoUj ?? null;
      if (this.latottUj === undefined) {
        this.latottUj = uj;                       // az első kérdés: alapvonal (a lap épp most töltött be)
      } else if (uj !== null && uj !== this.latottUj) {
        this.latottUj = uj;
        this.frissitesFugg = true;
      }
      // ⭐ (Csaba, 2026-10-23): a készülék tudása kérelemmel is nő (böngészés, felderítés) — az nem csere, az `utolsoUj` nem lép
      // tőle; a program a tudás változatát is mondja, és ha az lépett, ugyanígy frissítünk.
      const tudas = a.tudas ?? null;
      if (this.latottTudas === undefined) this.latottTudas = tudas;
      else if (tudas !== null && tudas !== this.latottTudas) {
        this.latottTudas = tudas;
        this.frissitesFugg = true;
      }
      if (this.frissitesFugg) await this._csereUtaniFrissites(false);
    } catch (hiba) {
      console.warn('AlsoSav._csereKerdezese - nem sikerült', { hiba: hiba.message });
      this.csere = null;
    } finally {
      this._csereKiirasa();
    }
  }

  /**
   * ⭐ A frissítés a csere után: a pakli csendben (a kiválasztás helyén), az infók és a menü számlálója. Nyitott modál
   * alatt a pakli vár (a következő kérdezésnél újra próbáljuk); a kattintás (`kezzel`) a modált sem várja meg.
   */
  async _csereUtaniFrissites(kezzel) {
    console.log('AlsoSav._csereUtaniFrissites - KEZDÉS', { kezzel });
    this.foMenu?._ertesitesBadgeFrissitese?.();
    if (!this.pakliLathato()) {
      this.frissitesFugg = false;
      this.adatokBetoltese();
      return;
    }
    if (!kezzel && Modal.vanNyitottModal()) {
      this.frissitesFugg = true;
      console.log('AlsoSav._csereUtaniFrissites - VÉGE (nyitott modál — később)');
      return;
    }
    const megtortent = await this.pakli.kulsoValtozas();
    this.frissitesFugg = !megtortent;
    // ⚠️ A pakli UTÁN: a számok a lap horgonyából jönnek (ugyanaz a kép, mint a kártyáké), a pakli válasza pedig az új
    // horgony — előtte a régi képet számolnánk meg.
    this.adatokBetoltese();
    if (kezzel) this._csereKerdezese();
    console.log('AlsoSav._csereUtaniFrissites - VÉGE', { megtortent });
  }

  /**
   * ⭐⭐ D119 (①b): ha ezen a készüléken MÁS program fut, mint amivel a koinó született (a koino-verzió kártyája mondja), a sáv
   * kimondja — nem tiltja (CS3). A gyökér-koinónak nincs programja (nincs kártyája): ott nincs jelzés.
   */
  async _programKerdezese() {
    try {
      const p = await apiGet('program');
      const elem = document.getElementById('info-program');
      const elv = document.getElementById('info-program-elvalaszto');
      if (!elem || p?.egyezik !== false) return;
      elem.hidden = false;
      if (elv) elv.hidden = false;
      elem.title = 'Ez a koinó ezzel a kóddal született: ' + String(p.koinoe?.lenyomat ?? '?').slice(0, 12) + '… (a koino-verzió '
        + 'kártyáján ellenőrizhető). Ezen a készüléken más fut: ' + String(p.sajat?.lenyomat ?? '?').slice(0, 12) + '…. Nem tiltjuk '
        + '— de ha a két verzió szabálya eltér, a számításuk is eltérhet.';
    } catch (hiba) {
      console.log('AlsoSav._programKerdezese - nem kérdezhető', { hiba: hiba.message });
    }
  }

  /** A felirat: mikor volt az utolsó csere (és hozott-e újat), és mikor jön a következő kör. */
  _csereKiirasa() {
    const elem = document.getElementById('info-csere');
    if (!elem) return;
    const a = this.csere;
    if (!a) {
      elem.textContent = '🔄 –';
      elem.title = 'A csere állapotát most nem érem el a programtól.';
      elem.classList.add('also-sav__info-elem--betoltes');
      return;
    }
    elem.classList.remove('also-sav__info-elem--betoltes');
    // A program órájához igazítva: a válasz `most`-ja óta eltelt idő hozzáadva.
    const most = (a.most ?? this.csereKerdezveEkkor) + (Date.now() - this.csereKerdezveEkkor);
    const o = a.orjarat ?? {};
    const u = a.utolsoCsere;
    const utolso = u ? '🔄 ' + mennyiIdeje(most - u.ido) + (u.uj ? ' +' + u.uj : '') : '🔄 még nem volt csere';
    let kovetkezo;
    if (!o.fut) kovetkezo = 'az őrjárat nem fut';
    else if (o.korFut) kovetkezo = '⏳ csere most';
    else if (o.kovetkezo) kovetkezo = o.kovetkezo > most ? '⏭ ' + visszaszamlalo(o.kovetkezo - most) : '⏳ csere most';
    else kovetkezo = '⏭ –';
    elem.textContent = utolso + ' · ' + kovetkezo;

    const sorok = [];
    sorok.push(u
      ? 'Az utolsó csere: ' + oraPerc(u.ido) + ' — ' + u.uj + ' új esemény jött, ' + u.kuldott + ' ment ki.'
      : 'Ez a készülék még nem cserélt (amióta ez a feljegyzés van).');
    if (o.fut) {
      sorok.push('Az őrjárat ' + o.perc + ' percenként köröz' + (o.korFut ? ', és most is épp cserél.'
        : o.kovetkezo ? '; a következő kör: ' + oraPerc(o.kovetkezo) + '.' : '.'));
      if (o.utolsoKor) {
        sorok.push('Az utolsó kör: ' + oraPerc(o.utolsoKor.ido) + ' — ' + o.utolsoKor.sikeres + ' társ felelt'
          + (o.utolsoKor.celok ? ' ' + o.utolsoKor.celok + ' címből' : '') + ', ' + o.utolsoKor.uj + ' új esemény.');
      }
    } else {
      sorok.push('Az őrjárat nem fut — a készülék most magától nem cserél (indítás: node koino/koino.js orjarat).');
    }
    sorok.push('Ha egy csere újat hoz, a lap magától frissül. Kattints: frissítés most.');
    elem.title = sorok.join('\n');
  }
}

export default AlsoSav;
