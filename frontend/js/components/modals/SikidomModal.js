// frontend/js/components/modals/SikidomModal.js

// ===== IMPORTOK =====
import Modal from './Modal.js';
import { apiGet } from '../../utils/apiHelper.js';
import { tokenLekerese } from '../../utils/authHelper.js';
import { sikidomLeiro } from '../../utils/sikidomFormak.js';
import { gyerekRelativSugar, gyokerRelativSugar, magSugarBecsles, gyokerMagSugar,
  SZINT_OSZTO, PAKOLASI_SURUSEG } from '../../utils/sikidomMeret.js';
import { pakolas } from '../../utils/sikidomPakolas.js';
import { szuloKeretben, horgonyValtasNezet, kepernyore, horgonyValtasSzukseges }
  from '../../utils/sikidomHorgony.js';
import { kartyaLetrehozasa } from '../kartya/kartyaGyar.js';

// A kártya SAJÁT modáljainak (javaslat, tudatpont, részletek…) konténere. NEM
// lehet ugyanaz, mint a Síkidom nézeté: a Modal felülírja a konténere tartalmát,
// tehát a kártya egy modálja kilőné alóla a nézetet. Ugyanaz a minta, mint a
// HozzajarulokModal / MeghivoModal al-modaljainál.
const ALMODAL_KONTENER_ID = 'almodal-kontener';

// ===== HANGOLÓ ÁLLANDÓK =====

// A virtuális legfelső csomópont azonosítója. Nem entitás és sosem rajzoljuk ki —
// csak keretet ad a gyökér-entitásoknak, hogy a fa egységes legyen.
const VILAG = 'vilag';

// Biztonsági darab-plafon EGY kérésre. NEM ez szabályozza a betöltést — azt a
// tudatpont-küszöb teszi (lásd _pontKuszob) —, csak azért van, hogy egy nagyon
// alacsony küszöb se hozzon le egyszerre túl sokat.
const KERES_PLAFON = 150;

// ===== LÁTHATÓSÁGI KÜSZÖB: MINIMUM KÉPERNYŐ-ÁTMÉRŐ =====
// Egy síkidom CSAK akkor jelenik meg, ha a képernyőn mért ÁTMÉRŐJE eléri ezt a
// képpont-értéket. Ez a nézet alaptörvénye (terv 14. pont): a láthatóságot a
// minimum-átmérő dönti el, NEM egy fix darabszám — a látható síkidomok száma a
// képernyő befogadóképességéből KÖVETKEZIK.
//
// Miért így: egy néhány képpontos folt nem hordoz információt (nincs rajta
// felirat, nem lehet rákoppintani), viszont zsúfolttá teszi a képet és
// fölöslegesen terheli a rajzolást. Ami ez alatt van, azért kell BENAGYÍTANI —
// és mivel a gyerek mindig kisebb a szülőjénél ÉS a szülőn belül van, a küszöb
// alá esett síkidom teljes részfája is levágható.
//
// Ez EGYETLEN szám, amivel a nézet sűrűsége hangolható: nagyobb érték =
// levegősebb, kevesebb síkidom; kisebb = zsúfoltabb, több apró.
const MIN_KEP_ATMERO = 24;

// Egyszerre ennyi lekérés futhat
const EGYIDEJU_BETOLTES = 3;

// Biztonsági plafon egy képkockára
const MAX_RAJZOLT = 4000;

// Ennyi szinttel a horgony FÖLÖTT kezdjük a bejárást (hogy a környezet is látsszon)
const FELFELE_SZINTEK = 3;

// A képernyőn kívül ekkora tartalékot hagyunk (a képernyő méretének arányában).
// Ami ezen kívül van, azt nem rajzoljuk és nem is tartjuk életben.
const LATOMEZO_TARTALEK = 0.5;

// Ekkora látszó ÁTMÉRŐ fölött írjuk ki a címet. Nagyobb, mint a láthatósági
// küszöb: egy síkidom előbb látszik, és csak nagyobbra nőve kap feliratot.
const CIMKE_MIN_ATMERO = 48;
const CIM_MAX_HOSSZ = 24;

// Az ÜRES MAG szaggatott jelölése: ekkora látszó ÁTMÉRŐ alatt nem rajzoljuk ki
// (nem látszana, csak zajt csinálna)
const MAG_MIN_ATMERO = 10;

// A gyökér-szint üres magjába ekkora sugár fölött írjuk ki a „nagyíts befelé" súgót
const MAG_FELIRAT_MIN_SUGAR = 62;

// Ennyi képkockánként takarítunk (a látómezőn kívülre került ágak elengedése)
const TAKARITAS_KEPKOCKANKENT = 180;

// Ennyi képkockán át nem látott ág gyerekeit engedjük el
const ELENGEDES_TURELEM = 240;

// Az üres mag AKKOR IS marad, ha épp minden testvér be van töltve: legalább a
// csoport LEGKISEBB elemének ekkora többszöröse. Két okból:
//   (1) a közép mindig szabadon marad — a legkisebbek a mag KERÜLETÉN ülnek,
//       nem pontosan a középpontban;
//   (2) a koinoban folyamatosan keletkeznek új entitások — ha nem hagynánk
//       helyet, egy új (gyengébb) testvérnek nem lenne hova kerülnie, és az
//       egész csoportot újra kellene pakolni (a kép ugrana).
//
// MIÉRT A LEGKISEBBHEZ, ÉS NEM A LEGNAGYOBBHOZ? Mert a mag ADAT-térben rögzített
// alsó korlát: amekkorára választjuk, akkora „padlót" ad a középső ürességnek, és
// egy adat-térbeli padló a képernyőn a nagyítással NŐ. A legnagyobbhoz kötve
// (0,35) a lyuk már nagyításkor is nőtt (mérés: 119 → 536 px), holott még voltak
// meg nem jelent entitások. A legkisebbhez kötve a padló olyan alacsony, hogy amíg
// van rejtett entitás, a lyuk peremét ŐK adják — az pedig magától a képernyőhöz
// igazodik (mérés: 93 → 95 → 88 → 76 px). Amikor elfogynak, a mag veszi át, és
// onnantól nő — pontosan ezt kértük.
const MIN_MAG_SZORZO = 1.5;

const ZOOM_LEPES = 1.2;
const KATTINTAS_KUSZOB = 5;

// ===== SÍKIDOM NÉZET MODAL =====
// Felelősség: a Síkidom nézet — minden entitás egy síkidom, a TERÜLETE arányos a
// hierarchikus össztudatpontjával, a leszármazottak a szülőn BELÜL helyezkednek el.
//
// A három tartóoszlop (mind külön, DOM-független modulban):
//   - sikidomMeret.js    → tudatpont → sugár (terület-arányosan, szintenként /20)
//   - sikidomPakolas.js  → háromszögeléses kör-pakolás üres maggal
//   - sikidomHorgony.js  → korlátlan nagyítás horgonyváltással (nincs pislogás)
//
// A BETÖLTÉS KÉPERNYŐ-VEZÉRELT, nem a fa bejárása vezérli: egy síkidom gyerekeit
// akkor kérjük le, amikor a KÉPERNYŐN elég nagyra nőtt; a következő lap testvért
// akkor, amikor az üres magja nő meg. Ami a látómezőn (+50%) kívülre kerül, azt
// elengedjük. Így soha nem töltünk le többet, mint ami látszik.
//
// Rajzolás: egyetlen Canvas. Elemenkénti DOM-mal több ezer síkidomnál akadozna a
// folyamatos nagyítás; a koppintás-találatot ezért számítással keressük.
// Használja: a fő menü „Síkidom nézet" pontja (foOldal.js).
class SikidomModal {

  // @param {string} kontenerAzonosito - a modal konténer div ID-ja
  // @param {Object} beallitasok
  // @param {string} beallitasok.token                  - JWT token (opcionális)
  // @param {string} beallitasok.aktualisEntitasId      - a kiemelt entitás (opcionális)
  // @param {string} beallitasok.cim                    - a modal címe
  // @param {Function} beallitasok.onEntitasKivalasztas - (entitasId, entitasTipus)
  constructor(kontenerAzonosito, beallitasok = {}) {
    console.log('SikidomModal.constructor - KEZDÉS', {
      aktualisEntitasId: beallitasok.aktualisEntitasId
    });

    this.kontenerAzonosito    = kontenerAzonosito;
    this.token                = beallitasok.token ?? tokenLekerese();
    this.cimFelirat           = beallitasok.cim ?? 'Síkidom nézet';
    this.aktualisEntitasId    = beallitasok.aktualisEntitasId
      ? beallitasok.aktualisEntitasId.toString()
      : null;
    this.onEntitasKivalasztas = beallitasok.onEntitasKivalasztas ?? null;

    this.modal = null;
    this.vaszon = null;
    this.rajzolo = null;

    // ----- ADAT -----
    // Csomópont-tár: id → csomópont. Minden csomópont a SZÜLŐJÉHEZ képest tárolja
    // a helyét és a méretét (relX, relY, relR) — ez teszi lehetővé a korlátlan
    // nagyítást (lásd sikidomHorgony.js).
    this._tar = new Map();
    this._horgony = VILAG;

    // Világ → képernyő
    this._nezet = { skala: 1, eltolasX: 0, eltolasY: 0 };

    // ----- ÁLLAPOT -----
    this._kivalasztottId = null;
    this._futoBetoltesek = 0;
    this._kepkocka = 0;
    this._rajzolasKeres = false;
    this._huzasAktiv = false;
    this._huzasKezdet = null;
    this._huzasTavolsag = 0;
    this._ujjTavolsag = null;      // csippentéshez
    this._aktivMutatok = new Map();
    this._ablakMeretezoBound = null;

    console.log('SikidomModal.constructor - VÉGE');
  }

  // ===== INICIALIZÁLÁS =====
  async init() {
    console.log('SikidomModal.init - KEZDÉS');

    const tartalomHtml = await this._templateBetoltese();
    if (!tartalomHtml) return;

    this.modal = new Modal(this.kontenerAzonosito, {
      cim:      this.cimFelirat,
      tartalom: tartalomHtml,
      meret:    'teljes',
      gombok:   [],
      onBezaras: () => this._takaritasBezaraskor()
    });

    await this.modal.init();

    this.vaszon = document.getElementById('sikidom-vaszon');
    this.rajzolo = this.vaszon?.getContext('2d') ?? null;

    document.getElementById('sikidom-zoom-be-gomb')
      ?.addEventListener('click', () => this._zoomKozeppontra(ZOOM_LEPES));
    document.getElementById('sikidom-zoom-ki-gomb')
      ?.addEventListener('click', () => this._zoomKozeppontra(1 / ZOOM_LEPES));
    document.getElementById('sikidom-illesztes-gomb')
      ?.addEventListener('click', () => this._alaphelyzet());
    document.getElementById('sikidom-kartya-bezar')
      ?.addEventListener('click', () => this._kartyaBezarasa());

    this._esemenyekBekotese();

    console.log('SikidomModal.init - VÉGE');
  }

  async _templateBetoltese() {
    try {
      const valasz = await fetch('./html/components/modals/sikidomModal.html');
      if (!valasz.ok) {
        console.error('SikidomModal._templateBetoltese - HIBA', { statusz: valasz.status });
        return null;
      }
      return await valasz.text();
    } catch (hiba) {
      console.error('SikidomModal._templateBetoltese - kivétel', hiba.message);
      return null;
    }
  }

  // ===== MEGNYITÁS =====
  async megnyitas() {
    console.log('SikidomModal.megnyitas - KEZDÉS');

    this.modal?.megnyitas();
    this._teljesNezetBekapcsolasa();
    this._nezetValtas('betoltes');

    // A virtuális világ-csomópont: a gyökér-entitások szülője
    this._tar.clear();
    this._tar.set(VILAG, this._ujCsomopont({
      id: VILAG, szuloId: null, relX: 0, relY: 0, relR: 1, pont: 0, vanGyereke: true
    }));
    this._horgony = VILAG;

    // Az első adag: még nincs képernyő-méret, ezért küszöb nélkül (a darab-plafonig)
    await this._gyerekekBetoltese(VILAG, 0);

    const vilag = this._tar.get(VILAG);
    if (!vilag.gyerekIdk.length) {
      const szoveg = document.getElementById('sikidom-betoltes-szoveg');
      if (szoveg) szoveg.textContent = 'Még nincs megjeleníthető entitás.';
      console.log('SikidomModal.megnyitas - VÉGE (nincs adat)');
      return;
    }

    this._nezetValtas('nezet');
    this._vaszonMeretezese();
    this._alaphelyzet();

    if (!this._ablakMeretezoBound) {
      this._ablakMeretezoBound = () => {
        this._vaszonMeretezese();
        this._alsoSavMagassagFrissitese();
        this._rajzolasKerese();
      };
      window.addEventListener('resize', this._ablakMeretezoBound);
    }

    console.log('SikidomModal.megnyitas - VÉGE');
  }

  bezaras() { this.modal?.bezaras(); }

  _takaritasBezaraskor() {
    if (this._ablakMeretezoBound) {
      window.removeEventListener('resize', this._ablakMeretezoBound);
      this._ablakMeretezoBound = null;
    }
    this._kartyaKeres = null;
    this._teljesNezetKikapcsolasa();
    this._tar.clear();

    // A kártya al-modal konténerét is kiürítjük, hogy ne maradjon rejtett
    // modal-DOM a body végén (a HozzajarulokModal mintája)
    const alKontener = document.getElementById(ALMODAL_KONTENER_ID);
    if (alKontener) alKontener.innerHTML = '';
  }

  // ===== ALSÓ SÁV LÁTHATÓSÁGA (a Struktúra nézet mintájára) =====
  // A teljes képernyős nézet alatt is látsszon és használható maradjon a főoldal
  // alsó sávja — így az e-ember a menüből át tud váltani pakli nézetre. A
  // vonatkozó CSS-szabályok a strukturaModal.css-ben élnek, és minden
  // .modal-panel--teljes nézetre érvényesek.
  _teljesNezetBekapcsolasa() {
    document.body.classList.add('teljes-nezet-nyitva');
    this._alsoSavMagassagFrissitese();
  }

  _teljesNezetKikapcsolasa() {
    document.body.classList.remove('teljes-nezet-nyitva');
  }

  _alsoSavMagassagFrissitese() {
    const alsoSav = document.querySelector('.also-sav');
    const magassag = alsoSav ? alsoSav.offsetHeight : 56;
    document.documentElement.style.setProperty('--alsosav-magassag', `${magassag}px`);
  }

  _nezetValtas(melyik) {
    document.getElementById('sikidom-betoltes')?.toggleAttribute('hidden', melyik !== 'betoltes');
    document.getElementById('sikidom-nezet')?.toggleAttribute('hidden', melyik !== 'nezet');
  }

  // ===== CSOMÓPONT LÉTREHOZÁSA =====
  _ujCsomopont(adatok) {
    return {
      id: adatok.id,
      entitasTipus: adatok.entitasTipus ?? null,
      cim: adatok.cim ?? null,
      pont: adatok.pont ?? 0,
      vanGyereke: adatok.vanGyereke ?? false,
      szuloId: adatok.szuloId ?? null,

      // A SZÜLŐ sugarának egységében
      relX: adatok.relX ?? 0,
      relY: adatok.relY ?? 0,
      relR: adatok.relR ?? 1,

      gyerekIdk: [],
      betoltottGyerekPont: 0,     // a már betöltött gyerekek össz-pontja
      // Meddig töltöttünk le: a legutóbb kért tudatpont-küszöb, és a kurzor
      // (hol tartunk a rangsorban). Nincs lap és nincs „hányadik oldal".
      betoltottKuszob: Infinity,
      kurzorPont: null,
      kurzorId: null,
      osszesGyerekPont: 0,        // a backend adja: az ÖSSZES gyerek együttes pontja
      betoltesFut: false,
      szabadMagSugar: 1,          // a még szabad üres mag a saját keretében
      legerosebbGyerekPont: 0,    // a gyökér-szint mértékegységéhez
      utoljaraLatva: 0
    };
  }

  // ===== A LÁTHATÓSÁGI KÜSZÖB TUDATPONTBAN =====
  // A méret-képlet megfordítása. Egy gyerek képernyő-átmérője:
  //     2 · szülőKépernyőSugár · √( gyerekPont / (20 · szülőPont) )
  // Ez akkor éri el a MIN_KEP_ATMERO-t, ha
  //     gyerekPont ≥ 20 · szülőPont · ( MIN_KEP_ATMERO / (2 · szülőKépernyőSugár) )²
  //
  // Ez a nézet betöltésének EGYETLEN szabálya: nem „a következő 60"-at kérjük,
  // hanem pontosan azt, ami elér a láthatóságig. A gyökér-szinten nincs szülő-pont,
  // ott a LEGERŐSEBB gyökér a mértékegység (és nincs /20, mert a gyökerek nem egy
  // szinttel lejjebb vannak).
  //
  // @param {Object} cs - a szülő csomópont
  // @param {number} kepSugar - a szülő pillanatnyi képernyő-sugara
  // @returns {number} a szükséges minimum tudatpont
  _pontKuszob(cs, kepSugar) {
    if (!(kepSugar > 0)) return Infinity;

    const arany = MIN_KEP_ATMERO / (2 * kepSugar);
    const negyzet = arany * arany;

    return cs.id === VILAG
      ? (cs.legerosebbGyerekPont || 0) * negyzet
      : SZINT_OSZTO * (cs.pont || 0) * negyzet;
  }

  // ===== GYEREKEK BETÖLTÉSE EGY KÜSZÖBIG =====
  // Lekéri azokat a gyerekeket, amelyek elérik a küszöböt és még nincsenek meg
  // (a kurzor mondja meg, hol tartunk), majd elhelyezi őket a szülő üres magjában.
  async _gyerekekBetoltese(szuloId, pontKuszob) {
    const szulo = this._tar.get(szuloId);
    if (!szulo || szulo.betoltesFut) return;
    if (this._futoBetoltesek >= EGYIDEJU_BETOLTES) return;

    console.log('SikidomModal._gyerekekBetoltese - KEZDÉS', {
      szuloId, pontKuszob: Math.round(pontKuszob)
    });

    szulo.betoltesFut = true;
    this._futoBetoltesek++;
    this._folyamatJelzo(true);

    try {
      const reszek = [];
      if (szuloId !== VILAG) reszek.push(`szulo=${encodeURIComponent(szuloId)}`);
      reszek.push(`minPont=${Math.max(0, pontKuszob)}`);
      if (szulo.kurzorPont != null && szulo.kurzorId) {
        reszek.push(`kurzorPont=${szulo.kurzorPont}`);
        reszek.push(`kurzorId=${encodeURIComponent(szulo.kurzorId)}`);
      }
      reszek.push(`darab=${KERES_PLAFON}`);

      const valasz = await apiGet(`sikidom/gyerekek?${reszek.join('&')}`, this.token);

      const gyerekek = valasz?.gyerekek ?? [];
      szulo.osszesGyerekPont = valasz?.osszesGyerekPont ?? szulo.osszesGyerekPont ?? 0;

      if (valasz?.kurzor) {
        szulo.kurzorPont = valasz.kurzor.pont;
        szulo.kurzorId = valasz.kurzor.id;
      }

      // A küszöböt csak akkor jegyezzük be teljesítettként, ha az adag NEM
      // vágódott le a darab-plafonon — különben a küszöbig még van hátra, és a
      // következő képkockán a kurzortól folytatjuk.
      if (!valasz?.vanTovabb) szulo.betoltottKuszob = Math.max(0, pontKuszob);

      if (gyerekek.length > 0) this._adagElhelyezese(szulo, gyerekek);

      console.log('SikidomModal._gyerekekBetoltese - VÉGE', {
        szuloId, kapott: gyerekek.length, vanTovabb: !!valasz?.vanTovabb
      });
    } catch (hiba) {
      console.error('SikidomModal._gyerekekBetoltese - HIBA', { szuloId, hiba: hiba.message });
      // Ne próbálkozzunk vég nélkül ugyanezzel a küszöbbel
      szulo.betoltottKuszob = Math.max(0, pontKuszob);
    } finally {
      szulo.betoltesFut = false;
      this._futoBetoltesek--;
      if (this._futoBetoltesek <= 0) this._folyamatJelzo(false);
      this._rajzolasKerese();
    }
  }

  // ===== EGY ADAG ELHELYEZÉSE (méret + pakolás) =====
  _adagElhelyezese(szulo, gyerekek) {
    const vilagSzint = szulo.id === VILAG;

    // A gyökér-szintnek nincs szülő-pontja, ezért a LEGERŐSEBB gyökérhez
    // viszonyítunk. Az az első lap 0. eleme — a rangsor eleje sosem változik,
    // tehát a mértékegység sem mozdul a további lapok betöltésekor.
    if (vilagSzint && !szulo.legerosebbGyerekPont && gyerekek.length) {
      szulo.legerosebbGyerekPont = gyerekek[0].hierarchikusOsszesPont ?? 0;
    }

    const elemek = gyerekek.map(gy => ({
      id: gy.entitasId.toString(),
      sugar: vilagSzint
        ? gyokerRelativSugar(gy.hierarchikusOsszesPont, szulo.legerosebbGyerekPont)
        : gyerekRelativSugar(gy.hierarchikusOsszesPont, szulo.pont)
    }));

    // A lap a szülő SZABAD magjába kerül; a következő lapoknak újabb magot hagyunk.
    // KIVÉTEL a gyökér-szint ELSŐ adagja: a `vilag` virtuális csomópont, nincs
    // „pereme", amin belülre kellene férni — a legerősebb gyökér sugara maga az
    // egység. Ha itt 1-es korlátot adnánk, a pakolás vészféke értelmetlenül
    // összezsugorítaná az egész gyökér-szintet.
    const elsoAdag = szulo.gyerekIdk.length === 0;
    const maxKulso = (vilagSzint && elsoAdag) ? Infinity : szulo.szabadMagSugar;

    const adagPont = gyerekek.reduce((s, gy) => s + (gy.hierarchikusOsszesPont ?? 0), 0);
    const maradekPont = Math.max(0, (szulo.osszesGyerekPont ?? 0) - szulo.betoltottGyerekPont - adagPont);

    // A HÁTRALÉVŐ testvéreknek fenntartott hely. A maradék a backend által küldött
    // TÉNYLEGES összegből jön (osszesGyerekPont − a már betöltöttek), nem becslésből:
    // a becslés kétszeresen túlfoglalt, és a betöltött adagok közt üres gyűrű maradt.
    let kertMag = 0;
    if (maradekPont > 0) {
      kertMag = vilagSzint
        ? gyokerMagSugar(maradekPont, szulo.legerosebbGyerekPont)
        : magSugarBecsles(maradekPont, szulo.pont);
    }

    // …de mag AKKOR IS marad, ha most épp minden testvér betöltődött. A LEGKISEBB
    // testvérhez méretezve, hogy a középső üresség pereme a képernyőhöz igazodjon
    // (lásd a MIN_MAG_SZORZO indoklását).
    const legkisebbElem = elemek.reduce((m, e) => Math.min(m, e.sugar), Infinity);
    const minimumMag = Number.isFinite(legkisebbElem) ? legkisebbElem * MIN_MAG_SZORZO : 0;
    let magSugar = Math.max(kertMag, minimumMag);

    // FELSŐ KORLÁT A MAGRA — levezetve, nem tapasztalati ráhagyás.
    // A mostani adagnak a mag és a rendelkezésre álló perem KÖZÖTTI gyűrűbe kell
    // beférnie. A gyűrű befogadóképessége (maxKülső² − mag²)·sűrűség, az adag
    // igénye pedig az együttes területe, tehát:
    //     mag ≤ √( maxKülső² − adagTerület / sűrűség )
    //
    // Korábban itt egy fix `maxKülső × 0,9` állt. Az adagonként ÚJRA levont 10%
    // épp azt a területet vette el, ami az adagnak kellett: a szabad mag néhány
    // adag alatt nullára fogyott, és onnantól minden egymásra pakolódott.
    if (Number.isFinite(maxKulso)) {
      const adagTerulet = vilagSzint
        ? adagPont / (szulo.legerosebbGyerekPont || 1)
        : adagPont / (SZINT_OSZTO * (szulo.pont || 1));
      const felsoKorlat = Math.sqrt(
        Math.max(0, maxKulso * maxKulso - adagTerulet / PAKOLASI_SURUSEG)
      );
      magSugar = Math.min(magSugar, felsoKorlat);
    }

    const eredmeny = pakolas(elemek, { magSugar, maxKulsoSugar: maxKulso });

    const helyMap = new Map(eredmeny.helyek.map(h => [h.id, h]));
    for (const gy of gyerekek) {
      const id = gy.entitasId.toString();
      const hely = helyMap.get(id);
      if (!hely) continue;

      this._tar.set(id, this._ujCsomopont({
        id,
        entitasTipus: gy.entitasTipus,
        cim: gy.cim,
        pont: gy.hierarchikusOsszesPont ?? 0,
        vanGyereke: gy.vanGyereke,
        szuloId: szulo.id,
        relX: hely.x, relY: hely.y, relR: hely.sugar
      }));
      szulo.gyerekIdk.push(id);
    }

    szulo.betoltottGyerekPont += adagPont;
    szulo.szabadMagSugar = eredmeny.magSugar;
    // A csoport tényleges kiterjedése — a gyökér-szintnél ebből igazítjuk a
    // kezdő nagyítást (ott ugyanis nincs 1-es „perem", amihez igazodhatnánk)
    szulo.kulsoSugar = Math.max(szulo.kulsoSugar ?? 0, eredmeny.kulsoSugar);
  }

  // ===== VÁSZON MÉRETEZÉSE =====
  _vaszonMeretezese() {
    const nezetElem = document.getElementById('sikidom-nezet');
    if (!nezetElem || !this.vaszon) return;

    const arany = window.devicePixelRatio || 1;
    this._szelesseg = nezetElem.clientWidth;
    this._magassag = nezetElem.clientHeight;

    this.vaszon.width = Math.max(1, Math.round(this._szelesseg * arany));
    this.vaszon.height = Math.max(1, Math.round(this._magassag * arany));
    this.rajzolo.setTransform(arany, 0, 0, arany, 0, 0);
  }

  _kepernyoMeret() {
    return Math.min(this._szelesseg || 1, this._magassag || 1);
  }

  // ===== ALAPHELYZET =====
  _alaphelyzet() {
    console.log('SikidomModal._alaphelyzet - KEZDÉS');

    this._horgony = VILAG;

    // A gyökér-szint tényleges kiterjedéséhez igazítunk, hogy az egész beférjen
    const kiterjedes = this._tar.get(VILAG)?.kulsoSugar || 1;

    this._nezet = {
      skala: (this._kepernyoMeret() * 0.45) / kiterjedes,
      eltolasX: (this._szelesseg || 0) / 2,
      eltolasY: (this._magassag || 0) / 2
    };

    this._rajzolasKerese();
    console.log('SikidomModal._alaphelyzet - VÉGE');
  }

  // ===== HORGONYVÁLTÁS =====
  // Ha a nagyítás elmélyült, áthelyezzük a horgonyt — a képernyő-kép közben
  // változatlan marad (lásd sikidomHorgony.js). Egyetlen képkockán belül több
  // szintet is léphetünk (gyors görgetésnél).
  _horgonyEllenorzes() {
    for (let lepes = 0; lepes < 8; lepes++) {
      const cs = this._tar.get(this._horgony);
      if (!cs) break;

      const gyerekKeretek = cs.gyerekIdk
        .map(gid => this._tar.get(gid))
        .filter(Boolean)
        .map(gy => ({ id: gy.id, keret: { x: gy.relX, y: gy.relY, r: gy.relR } }));

      const vanSzulo = !!(cs.szuloId && this._tar.has(cs.szuloId));
      const dontes = horgonyValtasSzukseges(
        this._nezet, this._kepernyoMeret(), gyerekKeretek, vanSzulo
      );
      if (!dontes) break;

      if (dontes.irany === 'le') {
        const gy = this._tar.get(dontes.gyerekId);
        this._nezet = horgonyValtasNezet(this._nezet, { x: gy.relX, y: gy.relY, r: gy.relR });
        this._horgony = gy.id;
      } else {
        const szKeret = szuloKeretben(this._tar, this._horgony);
        if (!szKeret) break;
        this._nezet = horgonyValtasNezet(this._nezet, szKeret);
        this._horgony = cs.szuloId;
      }
    }
  }

  // ===== LÁTHATÓ CSOMÓPONTOK =====
  // Bejárás a horgony fölött néhány szinttel kezdve, lefelé. A vágás KÉTSZERESEN
  // is helyes: a gyerek mindig kisebb a szülőjénél ÉS a szülőn belül van, ezért ha
  // a szülő túl kicsi vagy a látómezőn kívül esik, a leszármazottai is — a részfa
  // ott bátran levágható.
  _lathatoLista() {
    // 1. Kiindulás: néhány szinttel a horgony fölött (hogy a környezet is látsszon)
    let kiindulo = this._horgony;
    let keret = { x: 0, y: 0, r: 1 };

    for (let i = 0; i < FELFELE_SZINTEK; i++) {
      const cs = this._tar.get(kiindulo);
      if (!cs || !cs.szuloId || !this._tar.has(cs.szuloId)) break;
      const sz = szuloKeretben(this._tar, kiindulo);
      if (!sz) break;
      keret = {
        x: keret.x + keret.r * sz.x,
        y: keret.y + keret.r * sz.y,
        r: keret.r * sz.r
      };
      kiindulo = cs.szuloId;
    }

    // 2. Lefelé bejárás, vágásokkal
    const lathatoak = [];
    const betoltendok = [];
    const magok = [];
    const sor = [{ id: kiindulo, keret }];

    while (sor.length > 0 && lathatoak.length < MAX_RAJZOLT) {
      const elem = sor.shift();
      const cs = this._tar.get(elem.id);
      if (!cs) continue;

      const kep = kepernyore(this._nezet, elem.keret);

      // A kiinduló csomópontot mindig kibontjuk (ő a bejárás gyökere)
      const kiindulopont = elem.id === kiindulo;

      if (!kiindulopont && !this._latomezobenVan(kep)) continue;

      if (cs.id !== VILAG) {
        lathatoak.push({ cs, kep });
        cs.utoljaraLatva = this._kepkocka;
      }

      // --- GYEREKEK ÁTVIZSGÁLÁSA ---
      // Itt dől el, mely gyerekek látszanak (LÁTHATÓSÁGI KÜSZÖB), és közben
      // megmérjük, meddig ér a REJTETT tartomány: azoknak a gyerekeknek a
      // kiterjedése, amelyek már betöltődtek, de még a küszöb alatt vannak.
      let rejtettSugar = 0;

      for (const gid of cs.gyerekIdk) {
        const gy = this._tar.get(gid);
        if (!gy) continue;

        const gyKeret = {
          x: elem.keret.x + elem.keret.r * gy.relX,
          y: elem.keret.y + elem.keret.r * gy.relY,
          r: elem.keret.r * gy.relR
        };

        // A küszöb alattiakat NEM rajzoljuk és a részfájukat sem járjuk be
        // (a gyerek mindig kisebb a szülőjénél → a részfa levágható). A helyüket
        // viszont megjegyezzük: ide „nő bele" a kép, ha az e-ember nagyít.
        if (this._nezet.skala * gyKeret.r * 2 < MIN_KEP_ATMERO) {
          rejtettSugar = Math.max(rejtettSugar, Math.hypot(gy.relX, gy.relY) + gy.relR);
          continue;
        }

        sor.push({ id: gid, keret: gyKeret });
      }

      // --- ÜRES MAG ---
      // A szaggatott kör pereme a kettő közül a nagyobbik:
      //   (a) a fenntartott mag — a még be nem töltött testvérek helye;
      //   (b) a rejtett tartomány — ami betöltődött, de még a küszöb alatt van.
      //
      // Ettől viselkedik úgy, mint a teszt-oldalon (sikidomTeszt.html): amíg van
      // meg nem jelent entitás, a kör a KÉPERNYŐHÖZ igazodik, mert a pereme ott
      // van, ahol a síkidomok elérik a láthatósági küszöböt — nagyításkor sorra
      // előbukkannak a peremén. Amikor már nincs több rejtett, a fenntartott mag
      // veszi át, és onnantól a nagyítással NŐ.
      //
      // MEGJEGYZÉS: emiatt a szomszédos LÁTHATÓ testvérek belelóghatnak a vonalba.
      // Kipróbáltuk a másik igazítást is (a legbelső látható testvér belső széle):
      // ott semmi nem lóg bele, DE a kör a fenntartott magra zsugorodik, és
      // elveszti a képernyőhöz igazodást — ezért maradt ez.
      const uresSugarRel = Math.max(cs.szabadMagSugar ?? 0, rejtettSugar);
      if (cs.gyerekIdk.length > 0 && uresSugarRel > 0) {
        const magKepSugar = kep.kepSugar * uresSugarRel;
        if (magKepSugar * 2 >= MAG_MIN_ATMERO) {
          magok.push({
            kepX: kep.kepX,
            kepY: kep.kepY,
            kepSugar: magKepSugar,
            vilag: cs.id === VILAG
          });
        }
      }

      // --- BETÖLTÉS-IGÉNY: EGYETLEN szabály, a tudatpont-küszöb ---
      // Kiszámoljuk, mekkora tudatpont kell MOST a láthatósághoz. Ha ez lejjebb
      // került, mint ameddig eddig letöltöttünk, és van még be nem töltött gyerek,
      // akkor pontosan azokat kérjük le, amelyek épp láthatóvá váltak. Nincs lap,
      // nincs lap-határ — a küszöb folyamatosan süllyed a nagyítással.
      if (cs.vanGyereke && !cs.betoltesFut) {
        const kuszob = this._pontKuszob(cs, kep.kepSugar);
        const vanMegBetoltetlen = cs.osszesGyerekPont === 0 ||
          cs.betoltottGyerekPont < cs.osszesGyerekPont;

        if (vanMegBetoltetlen && kuszob < cs.betoltottKuszob) {
          betoltendok.push({ id: cs.id, kuszob, sulyy: kep.kepSugar });
        }
      }
    }

    return { lathatoak, betoltendok, magok };
  }

  // A látómező a képernyő + LATOMEZO_TARTALEK arányú keret. Ami ezen kívül esik,
  // azt nem rajzoljuk (és a takarítás előbb-utóbb el is engedi).
  _latomezobenVan(kep) {
    const tx = this._szelesseg * LATOMEZO_TARTALEK;
    const ty = this._magassag * LATOMEZO_TARTALEK;
    const bal = -tx, jobb = this._szelesseg + tx;
    const fent = -ty, lent = this._magassag + ty;

    const legkozelebbiX = Math.max(bal, Math.min(jobb, kep.kepX));
    const legkozelebbiY = Math.max(fent, Math.min(lent, kep.kepY));
    const tavolsag = Math.hypot(kep.kepX - legkozelebbiX, kep.kepY - legkozelebbiY);
    return tavolsag <= kep.kepSugar;
  }

  // ===== RAJZOLÁS =====
  _rajzolasKerese() {
    if (this._rajzolasKeres) return;
    this._rajzolasKeres = true;
    requestAnimationFrame(() => {
      this._rajzolasKeres = false;
      this._rajzolas();
    });
  }

  // A rajzoló metódusokban SZÁNDÉKOSAN nincs console.log: képkockánként futnak,
  // elárasztanák a naplót.
  _rajzolas() {
    if (!this.rajzolo || !this._szelesseg) return;

    this._kepkocka++;
    this._horgonyEllenorzes();

    const { lathatoak, betoltendok, magok } = this._lathatoLista();

    const c = this.rajzolo;
    c.clearRect(0, 0, this._szelesseg, this._magassag);

    // A NAGYOKAT előbb, hogy a beágyazott kicsik rájuk kerüljenek
    lathatoak.sort((a, b) => b.kep.kepSugar - a.kep.kepSugar);
    for (const { cs, kep } of lathatoak) this._alakzatRajzolasa(cs, kep);

    // Az üres magok a síkidomok FÖLÖTT, de a feliratok ALATT
    for (const mag of magok) this._uresMagRajzolasa(mag);

    // Feliratok külön menetben, hogy semmi ne takarja őket
    for (const { cs, kep } of lathatoak) this._cimkeRajzolasa(cs, kep);

    this._utolsoLathatoak = lathatoak;

    // Betöltések indítása (a legnagyobbak előbb)
    betoltendok.sort((a, b) => b.sulyy - a.sulyy);
    for (const b of betoltendok) {
      if (this._futoBetoltesek >= EGYIDEJU_BETOLTES) break;
      this._gyerekekBetoltese(b.id, b.kuszob);
    }

    if (this._kepkocka % TAKARITAS_KEPKOCKANKENT === 0) this._takaritas();
  }

  _alakzatRajzolasa(cs, kep) {
    const c = this.rajzolo;
    const leiro = sikidomLeiro(cs.entitasTipus);

    c.beginPath();
    if (leiro.forma === 'kor') {
      c.arc(kep.kepX, kep.kepY, kep.kepSugar, 0, Math.PI * 2);
    } else {
      // A sokszöget a pozicionáló körbe írjuk: így sosem lóg ki abból a helyből,
      // amit a pakolás neki szánt (a pakolás mindent körként kezel).
      const kezdo = (leiro.kezdoSzogFok * Math.PI) / 180;
      for (let i = 0; i < leiro.oldalak; i++) {
        const szog = kezdo + (i * 2 * Math.PI) / leiro.oldalak;
        const x = kep.kepX + kep.kepSugar * Math.cos(szog);
        const y = kep.kepY + kep.kepSugar * Math.sin(szog);
        if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.closePath();
    }

    const aktualis = this.aktualisEntitasId && cs.id === this.aktualisEntitasId;
    const kivalasztott = this._kivalasztottId && cs.id === this._kivalasztottId;

    c.fillStyle = leiro.szin;
    c.globalAlpha = kivalasztott ? 0.38 : (aktualis ? 0.30 : 0.14);
    c.fill();
    c.globalAlpha = 1;

    c.strokeStyle = leiro.szin;
    c.lineWidth = (aktualis || kivalasztott) ? 3 : 1.5;
    c.stroke();
  }

  // ===== ÜRES MAG RAJZOLÁSA (szaggatott kör) =====
  // A síkidom közepén hagyott hely a MÉG BE NEM TÖLTÖTT, gyengébb testvéreké.
  // Szaggatott vonallal jelöljük, hogy látsszon: itt még van világ, érdemes
  // befelé nagyítani. A gyökér-szint magjába súgó-feliratot is teszünk (ott
  // nincs cím, ami elfoglalná a helyet).
  _uresMagRajzolasa(mag) {
    const c = this.rajzolo;

    c.save();
    c.beginPath();
    c.arc(mag.kepX, mag.kepY, mag.kepSugar, 0, Math.PI * 2);
    c.strokeStyle = this._magSzin();
    c.lineWidth = 1;
    c.setLineDash([5, 5]);
    c.stroke();
    c.restore();

    if (mag.vilag && mag.kepSugar > MAG_FELIRAT_MIN_SUGAR) {
      c.fillStyle = this._magSzin();
      c.font = '12px system-ui, -apple-system, \'Segoe UI\', sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('üres kör', mag.kepX, mag.kepY - 8);
      c.fillText('— nagyíts befelé —', mag.kepX, mag.kepY + 8);
    }
  }

  // A szaggatott kör színe az alkalmazás halvány szövegszínéből (egyszer olvassuk
  // ki, mert a Canvas-nak konkrét szín kell, nem CSS-változó)
  _magSzin() {
    if (!this._magSzinErtek) {
      const ertek = getComputedStyle(document.documentElement)
        .getPropertyValue('--color-text-faint').trim();
      this._magSzinErtek = ertek || 'rgba(43, 35, 24, 0.45)';
    }
    return this._magSzinErtek;
  }

  _cimkeRajzolasa(cs, kep) {
    if (kep.kepSugar * 2 < CIMKE_MIN_ATMERO) return;

    const leiro = sikidomLeiro(cs.entitasTipus);
    const teljes = cs.cim ?? leiro.nev;
    const rovid = teljes.length > CIM_MAX_HOSSZ ? `${teljes.slice(0, CIM_MAX_HOSSZ)}…` : teljes;

    const c = this.rajzolo;
    const betuMeret = Math.max(11, Math.min(20, kep.kepSugar * 0.28));
    c.font = `${betuMeret.toFixed(0)}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';

    // A felirat a síkidom KÖZEPÉRE kerül — ott épp a gyerekeknek fenntartott üres
    // mag van, tehát nem takar el semmit. Kontúrral, hogy bármilyen háttéren
    // olvasható maradjon.
    c.lineWidth = 3;
    c.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    c.strokeText(rovid, kep.kepX, kep.kepY);
    c.fillStyle = '#2b2318';
    c.fillText(rovid, kep.kepX, kep.kepY);
  }

  _folyamatJelzo(latszik) {
    document.getElementById('sikidom-folyamat')?.toggleAttribute('hidden', !latszik);
  }

  // ===== TAKARÍTÁS =====
  // A régóta nem látott ágak gyerekeit elengedjük, hogy a tár ne nőjön korlátlanul.
  // A horgony ŐSEIT és magát a horgonyt sosem bántjuk — azokra a keret-számításhoz
  // szükség van.
  _takaritas() {
    const vedett = new Set([VILAG]);
    let p = this._horgony;
    while (p && this._tar.has(p)) {
      vedett.add(p);
      p = this._tar.get(p).szuloId;
    }

    let elengedett = 0;
    for (const cs of [...this._tar.values()]) {
      if (vedett.has(cs.id)) continue;
      if (cs.gyerekIdk.length === 0) continue;
      if (this._kepkocka - cs.utoljaraLatva < ELENGEDES_TURELEM) continue;

      elengedett += this._reszfaTorlese(cs);
    }

    if (elengedett > 0) {
      console.log('SikidomModal._takaritas', { elengedett, tarMeret: this._tar.size });
    }
  }

  // Egy csomópont ALATTI részfa törlése a tárból (a csomópont marad)
  _reszfaTorlese(cs) {
    let darab = 0;
    const sor = [...cs.gyerekIdk];
    while (sor.length) {
      const id = sor.pop();
      const gyerek = this._tar.get(id);
      if (!gyerek) continue;
      sor.push(...gyerek.gyerekIdk);
      this._tar.delete(id);
      darab++;
    }

    // A szülő visszaáll „még nem töltöttük be" állapotba
    cs.gyerekIdk = [];
    cs.betoltottGyerekPont = 0;
    cs.betoltottKuszob = Infinity;
    cs.kurzorPont = null;
    cs.kurzorId = null;
    cs.szabadMagSugar = 1;
    return darab;
  }

  // ===== ESEMÉNYEK =====
  _esemenyekBekotese() {
    const nezetElem = document.getElementById('sikidom-nezet');
    if (!nezetElem) return;

    nezetElem.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.sikidom-modal__vezerlok')) return;
      this._aktivMutatok.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (this._aktivMutatok.size === 1) {
        this._huzasAktiv = true;
        this._huzasTavolsag = 0;
        this._huzasKezdet = {
          x: e.clientX, y: e.clientY,
          eltolasX: this._nezet.eltolasX, eltolasY: this._nezet.eltolasY
        };
      }
      nezetElem.setPointerCapture(e.pointerId);
    });

    nezetElem.addEventListener('pointermove', (e) => {
      if (!this._aktivMutatok.has(e.pointerId)) return;
      this._aktivMutatok.set(e.pointerId, { x: e.clientX, y: e.clientY });

      // Két ujj: csippentéses nagyítás
      if (this._aktivMutatok.size === 2) {
        const [a, b] = [...this._aktivMutatok.values()];
        const tavolsag = Math.hypot(a.x - b.x, a.y - b.y);
        const teglalap = nezetElem.getBoundingClientRect();
        const kozepX = (a.x + b.x) / 2 - teglalap.left;
        const kozepY = (a.y + b.y) / 2 - teglalap.top;

        if (this._ujjTavolsag && tavolsag > 0) {
          this._zoom(tavolsag / this._ujjTavolsag, kozepX, kozepY);
        }
        this._ujjTavolsag = tavolsag;
        this._huzasAktiv = false;
        return;
      }

      if (!this._huzasAktiv || !this._huzasKezdet) return;
      const dx = e.clientX - this._huzasKezdet.x;
      const dy = e.clientY - this._huzasKezdet.y;
      this._huzasTavolsag = Math.max(this._huzasTavolsag, Math.abs(dx) + Math.abs(dy));
      this._nezet.eltolasX = this._huzasKezdet.eltolasX + dx;
      this._nezet.eltolasY = this._huzasKezdet.eltolasY + dy;
      this._rajzolasKerese();
    });

    const mutatoVege = (e) => {
      this._aktivMutatok.delete(e.pointerId);
      if (this._aktivMutatok.size < 2) this._ujjTavolsag = null;

      const kattintasVolt = this._huzasAktiv && this._huzasTavolsag <= KATTINTAS_KUSZOB;
      this._huzasAktiv = false;
      this._huzasKezdet = null;
      if (!kattintasVolt) return;

      const teglalap = nezetElem.getBoundingClientRect();
      this._koppintas(e.clientX - teglalap.left, e.clientY - teglalap.top);
    };

    nezetElem.addEventListener('pointerup', mutatoVege);
    nezetElem.addEventListener('pointercancel', (e) => {
      this._aktivMutatok.delete(e.pointerId);
      this._ujjTavolsag = null;
      this._huzasAktiv = false;
      this._huzasKezdet = null;
    });

    nezetElem.addEventListener('wheel', (e) => {
      e.preventDefault();
      const szorzo = e.deltaY < 0 ? ZOOM_LEPES : 1 / ZOOM_LEPES;
      const teglalap = nezetElem.getBoundingClientRect();
      this._zoom(szorzo, e.clientX - teglalap.left, e.clientY - teglalap.top);
    }, { passive: false });
  }

  _zoom(szorzo, kozepX, kozepY) {
    this._nezet.skala *= szorzo;
    this._nezet.eltolasX = kozepX - (kozepX - this._nezet.eltolasX) * szorzo;
    this._nezet.eltolasY = kozepY - (kozepY - this._nezet.eltolasY) * szorzo;
    this._rajzolasKerese();
  }

  _zoomKozeppontra(szorzo) {
    this._zoom(szorzo, (this._szelesseg || 0) / 2, (this._magassag || 0) / 2);
  }

  // ===== KOPPINTÁS =====
  // A találatot számítással keressük (nincs elemenkénti DOM). A LEGKISEBB
  // találat nyer: a beágyazott gyerek van fölül, azt akarta az e-ember.
  _koppintas(kepX, kepY) {
    const lathatoak = this._utolsoLathatoak ?? [];
    let talalat = null;

    for (const { cs, kep } of lathatoak) {
      const tavolsag = Math.hypot(kepX - kep.kepX, kepY - kep.kepY);
      if (tavolsag > kep.kepSugar) continue;
      if (!talalat || kep.kepSugar < talalat.kep.kepSugar) talalat = { cs, kep };
    }

    if (!talalat) {
      // Üres helyre koppintva a kiválasztás és az adatlap is megszűnik
      if (this._kivalasztottId) this._kartyaBezarasa();
      return;
    }

    console.log('SikidomModal._koppintas - találat', {
      entitasId: talalat.cs.id, entitasTipus: talalat.cs.entitasTipus
    });

    this._kivalasztottId = talalat.cs.id;
    this._rajzolasKerese();
    this._kartyaMegjelenitese(talalat.cs.id, talalat.cs.entitasTipus);
  }

  // ===== EGYETLEN KÁRTYA MEGJELENÍTÉSE =====
  // Koppintásra NEM váltunk pakli nézetre — az alsó sáv úgyis ott marad, onnan
  // bármikor át lehet váltani. Csak a megkoppintott entitás kártyáját mutatjuk
  // meg, bezárhatóan; a kártya saját hamburger menüjéből lehet az ADOTT ÁGRA
  // pakli nézetbe váltani („Pakli nézet" menüpont, lásd extraMenuOpciok).
  async _kartyaMegjelenitese(entitasId, entitasTipus) {
    console.log('SikidomModal._kartyaMegjelenitese - KEZDÉS', { entitasId, entitasTipus });

    const panel = document.getElementById('sikidom-kartya-panel');
    const hely = document.getElementById('sikidom-kartya-hely');
    if (!panel || !hely) return;

    hely.innerHTML = '';
    panel.removeAttribute('hidden');

    // Ugyanaz a kérés-jelölő, mint a rajzolásnál: ha közben másra koppintanak,
    // a régi válasz ne írja felül az újabbat
    const kerés = Symbol('kartya');
    this._kartyaKeres = kerés;

    try {
      // A kártya teljes adatait a meglévő pakli-végpont adja (a `kivalasztottEntitas`
      // épp az az elem, amit kértünk) — nem kell hozzá új backend-út.
      const valasz = await apiGet(
        `pakli?entitasId=${encodeURIComponent(entitasId)}&entitasTipus=${encodeURIComponent(entitasTipus)}`,
        this.token
      );
      if (this._kartyaKeres !== kerés) return;

      const entitas = valasz?.kivalasztottEntitas;
      if (!entitas?.entitasId) {
        hely.innerHTML = '<p class="sikidom-modal__betoltes-szoveg">Az adatlap nem tölthető be.</p>';
        return;
      }

      const kartya = kartyaLetrehozasa({
        entitas,
        kivalasztott: true,
        onKivalasztas: () => {},                 // a síkidomban nincs kártya-váltás
        token: this.token,
        modalKontenerAzon: this._alKontenerBiztositasa(),
        ujratoltesCb: () => this._kartyaMegjelenitese(entitasId, entitasTipus),
        onHamburgerMegnyitas: () => {}
      });

      // A NÉZET-FÜGGŐ menüpont: innen lehet az adott ágra pakli nézetbe váltani.
      // (A pakliban ennek nem volna értelme, ezért nem a kártya alap-menüjében van.)
      kartya.extraMenuOpciok = [{
        ikon:       '🃏',
        felirat:    'Pakli nézet',
        elvalaszto: true,
        akcio:      () => this._pakliraValtas(entitasId, entitasTipus)
      }];

      const kartyaDom = await kartya.init();
      if (this._kartyaKeres !== kerés) return;
      if (kartyaDom) hely.appendChild(kartyaDom);

      // A kártya szövege külön végponton érkezik (mint a pakliban)
      this._kartyaSzovegBetoltese(kartya, entitas, kerés);

      console.log('SikidomModal._kartyaMegjelenitese - VÉGE', { entitasId });
    } catch (hiba) {
      console.error('SikidomModal._kartyaMegjelenitese - HIBA', { hiba: hiba.message });
      if (this._kartyaKeres === kerés) {
        hely.innerHTML = '<p class="sikidom-modal__betoltes-szoveg">Az adatlap nem tölthető be.</p>';
      }
    }
  }

  // A kártya szövegtörzse (a pakli külön végponton adja, hogy a lista gyors legyen)
  async _kartyaSzovegBetoltese(kartya, entitas, kerés) {
    try {
      const valasz = await apiGet(
        `pakli/szoveg/${entitas.entitasTipus}/${entitas.entitasId}`, this.token
      );
      if (this._kartyaKeres !== kerés) return;
      if (typeof kartya.bodyFrissitese === 'function') {
        kartya.bodyFrissitese(valasz?.szoveg ?? null);
      }
    } catch (hiba) {
      console.warn('SikidomModal._kartyaSzovegBetoltese - a szöveg nem tölthető be', {
        hiba: hiba.message
      });
      if (typeof kartya.bodyFrissitese === 'function') kartya.bodyFrissitese(null);
    }
  }

  _kartyaBezarasa() {
    console.log('SikidomModal._kartyaBezarasa');
    this._kartyaKeres = null;
    const panel = document.getElementById('sikidom-kartya-panel');
    const hely = document.getElementById('sikidom-kartya-hely');
    panel?.setAttribute('hidden', '');
    if (hely) hely.innerHTML = '';
    this._kivalasztottId = null;
    this._rajzolasKerese();
  }

  // A „Pakli nézet" menüpont: bezárjuk a síkidom nézetet, és a pakli az adott
  // entitásra navigál (ezt a foOldal adja át onEntitasKivalasztas-ként).
  _pakliraValtas(entitasId, entitasTipus) {
    console.log('SikidomModal._pakliraValtas', { entitasId, entitasTipus });
    this._kartyaBezarasa();
    this.bezaras();
    if (typeof this.onEntitasKivalasztas === 'function') {
      this.onEntitasKivalasztas(entitasId.toString(), entitasTipus);
    }
  }

  // A kártya saját modáljainak konténere (a body végén, a nézet fölött)
  _alKontenerBiztositasa() {
    let kontener = document.getElementById(ALMODAL_KONTENER_ID);
    if (!kontener) {
      kontener = document.createElement('div');
      kontener.id = ALMODAL_KONTENER_ID;
      document.body.appendChild(kontener);
    }
    return ALMODAL_KONTENER_ID;
  }
}

// ===== EXPORTÁLÁS =====
export default SikidomModal;
