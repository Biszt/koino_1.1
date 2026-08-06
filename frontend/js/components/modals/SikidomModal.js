// frontend/js/components/modals/SikidomModal.js

// ===== IMPORTOK =====
import Modal from './Modal.js';
import { apiGet } from '../../utils/apiHelper.js';
import { tokenLekerese } from '../../utils/authHelper.js';
import { sikidomLeiro } from '../../utils/sikidomFormak.js';
import { gyerekRelativSugar, gyokerRelativSugar, SZINT_OSZTO }
  from '../../utils/sikidomMeret.js';
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

// ===== A KÖZÉPSŐ LYUK CÉL-ÁTMÉRŐJE KÉPPONTBAN =====
// A nézet MÁSODIK hangoló száma a MIN_KEP_ATMERO mellett — és a betöltés
// tényleges vezérlője.
//
// A lyukat NEM a tudatpontból becsüljük (az volt a régi modell buktatója), hanem
// a KÉPERNYŐHÖZ horgonyozzuk: adat-térbeli sugara mindig
//     (MAG_CEL_ATMERO / 2) / szülőKépernyőSugár.
// Nagyításkor a lyuk képpontban megnőne, ezért a nagyítás VÉGÉN addig fűzünk
// befelé újabb síkidomokat, amíg vissza nem csökken a cél alá. Így a lyuk
// képpontban ÁLLANDÓ marad, amíg van még meg nem jelenített testvér — a lerakott
// darabszám pedig ebből KÖVETKEZIK, nem mi találjuk ki.
const MAG_CEL_ATMERO = 120;

// ===== ÜRES MAG: KI / BE =====
// KÍSÉRLET (2026-08-06, Csaba kérése): próbáljuk ki a nézetet ÜRES MAG NÉLKÜL.
//
//   `false` → nincs középső lyuk. Minden újrapakolásnál a LEGKISEBB olyan
//             testvér kerül a KÖZÉPPONTBA, amelyik elérte a láthatósági küszöböt.
//   `true`  → a korábbi viselkedés: a mag mindig üres, képpontban állandó
//             (MAG_CEL_ATMERO) átmérővel, és a peremén bukkannak elő az újak.
//
// MI VÁLTOZIK MÉG EMELLETT (magától, külön kód nélkül):
//   - a szaggatott mag-kör nem rajzolódik ki (a mért lyuk 0 lesz);
//   - az újrapakolást innentől CSAK az hajtja, hogy érkezett-e új testvér —
//     a „kinőtt a mag" ág nem sülhet el, mert nincs mag.
// A BETÖLTÉST ez nem érinti: azt a tudatpont-küszöb vezérli (`_pontKuszob`).
//
// ÁLLÁS 2026-08-06: a böngészős próbán a mag nélküli változat ROSSZABB volt
// („szétesik"), ezért visszaállítva `true`-ra. A kísérlet kódja megmarad, hogy
// egy sorral újra kipróbálható legyen. Amit a mérés mutatott: a mag nem csak
// lyuk volt, hanem a pakolás ELSŐ HORGONYA is — a peremére kerültek sorra a
// legkisebbek, ez adta a rendezett gyűrűket.
const URES_MAG = true;

// A nagyítás „végét" ennyi eseménymentes ezredmásodperc jelenti. Nagyítás KÖZBEN
// szándékosan nem pakolunk: a kép így nem ugrál a görgetés alatt, és nem is
// számolunk fölöslegesen minden képkockán.
const ZOOM_VEGE_MS = 140;

// AZ ÚJRAPAKOLÁS HATÓKÖRE: a látómező körülírt köre + ennyiszerese.
// A zoom végén CSAK azt pakoljuk újra, ami ezen belül van; a kívül lévők helyben
// maradnak, és akadályként szerepelnek. Ettől a munka KORLÁTOS.
//
// FONTOS: a hatósugarat a `_ujrapakolasiSugar()` számolja a vászon FÉL ÁTLÓJÁBÓL,
// nem a rövidebb oldalából — lásd az ottani magyarázatot. Ez a ráhagyás gondoskodik
// arról, hogy a fagyasztási varrat a képernyőn KÍVÜLRE essen.
const UJRAPAKOLASI_TARTALEK = 1.5;

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
// akkor kérjük le, amikor a KÉPERNYŐN elég nagyra nőtt. Ami a látómezőn (+50%)
// kívülre kerül, azt elengedjük. Így soha nem töltünk le többet, mint ami látszik.
//
// A LETÖLTÉS ÉS A LERAKÁS KÜLÖN LÉPÉS (2026-08-05 óta):
//   - a letöltött, de még le nem rakott testvérek a csomópont `varolista`-ján
//     várakoznak (csökkenő tudatpont szerint);
//   - az elrendezésről a NAGYÍTÁS VÉGÉN futó `_ujrapakolas` dönt.
//
// AZ ELRENDEZÉS EGYETLEN SZABÁLYA: a zoom végén fogjuk azt, ami a képernyőn (+50%)
// látszik — a már lerakottakat és a soron következő várakozókat —, és
// ÚJRAPAKOLJUK bentről kifelé, NÖVEKVŐ méret szerint, a mag körül. Ebből adódik a
// nézet képe: a legkisebbek a mag körül, a nagyobbak kifelé.
//
// A MAG MINDIG ÜRES, és képpontban ÁLLANDÓ (MAG_CEL_ATMERO). Adat-térben
// `(MAG_CEL_ATMERO/2) / szülőKépernyőSugár` — ebből a szintenkénti √20-as
// váltószám miatt magától kijön a helyes magméret minden hierarchia-mélységben.
//
// Miért fér el mindig minden: a gyerekek együttes területe legfeljebb a szülő
// területének 1/20-a (a hierarchikus össztudatpont miatt), tehát hússzoros a
// tartalék — egy tömör újrapakolás sosem ütközhet a szülő peremébe.
//
// A hatókör azért szűkül a látómezőre, hogy a munka KORLÁTOS legyen: mérve
// egyszerre legfeljebb ~600 testvér látszik, akár 600, akár 12 000 van összesen.
// Ami nem fér be, az a várólistán MARAD — a modell soha nem zsugorít, tehát
// entitás nem tud némán elveszni (a régi, mag-becslős modellben ez volt a hiba).
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
    this._zoomVegeIdozito = null;  // a nagyítás végét figyelő időzítő

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
    if (!vilag.varolista.length && !vilag.gyerekIdk.length) {
      const szoveg = document.getElementById('sikidom-betoltes-szoveg');
      if (szoveg) szoveg.textContent = 'Még nincs megjeleníthető entitás.';
      console.log('SikidomModal.megnyitas - VÉGE (nincs adat)');
      return;
    }

    this._nezetValtas('nezet');
    this._vaszonMeretezese();

    // KÖRKÖRÖSSÉG FELOLDÁSA: a pakoláshoz kell a nagyítás (abból jön a lyuk
    // képpont-mérete), a végleges nagyításhoz viszont a pakolás kiterjedése.
    // Ezért egy DURVA becsléssel indulunk, lepakolunk, majd a MÉRT kiterjedésre
    // igazítunk — és ha az igazítás új helyet nyitott, még egyszer pakolunk.
    this._kezdoNezetBecslese(vilag);
    this._tennivalokFeldolgozasa();
    this._alaphelyzet();

    if (!this._ablakMeretezoBound) {
      this._ablakMeretezoBound = () => {
        this._vaszonMeretezese();
        this._alsoSavMagassagFrissitese();
        this._rajzolasKerese();
        // Más képernyő-méret = más lyuk-igény; ugyanaz a lépés, mint zoom után
        this._zoomVegeUtemezes();
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
    if (this._zoomVegeIdozito) {
      clearTimeout(this._zoomVegeIdozito);
      this._zoomVegeIdozito = null;
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

      // A LERAKOTT gyerekek (van helyük, rajzolhatók)
      gyerekIdk: [],

      // A LETÖLTÖTT, de még LE NEM RAKOTT testvérek, csökkenő tudatpont szerint.
      // Innen veszünk, amikor a nagyítás helyet szabadít fel a lyukban. Ami itt
      // várakozik, az nem veszett el — csak még nincs akkora hely, ahol látszana.
      varolista: [],

      // A középső üresség MÉRT sugara a saját keretében (a pakoló adja vissza).
      // Amíg nincs lerakott gyerek, végtelen = „az egész belseje üres".
      magSugarRel: Infinity,

      betoltottGyerekPont: 0,     // a már LETÖLTÖTT gyerekek össz-pontja
      // Meddig töltöttünk le: a legutóbb kért tudatpont-küszöb, és a kurzor
      // (hol tartunk a rangsorban). Nincs lap és nincs „hányadik oldal".
      betoltottKuszob: Infinity,
      kurzorPont: null,
      kurzorId: null,
      osszesGyerekPont: 0,        // a backend adja: az ÖSSZES gyerek együttes pontja
      betoltesFut: false,
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
  // (a kurzor mondja meg, hol tartunk), és a VÁRÓLISTÁRA teszi őket.
  //
  // Ez a metódus CSAK LETÖLT — nem helyez el semmit. A lerakás külön lépés
  // (`_ujrapakolas`), ami a nagyítás végén fut. A kettő szétválasztása azért
  // kell, mert a letöltés a tudatpont-küszöbtől függ, a lerakás viszont a
  // középső lyuk pillanatnyi képernyő-méretétől — más ütemben mozognak.
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

      if (gyerekek.length > 0) this._varolistaraFuzes(szulo, gyerekek);

      console.log('SikidomModal._gyerekekBetoltese - VÉGE', {
        szuloId, kapott: gyerekek.length, vanTovabb: !!valasz?.vanTovabb,
        varolista: szulo.varolista.length
      });
    } catch (hiba) {
      console.error('SikidomModal._gyerekekBetoltese - HIBA', { szuloId, hiba: hiba.message });
      // Ne próbálkozzunk vég nélkül ugyanezzel a küszöbbel
      szulo.betoltottKuszob = Math.max(0, pontKuszob);
    } finally {
      szulo.betoltesFut = false;
      this._futoBetoltesek--;
      if (this._futoBetoltesek <= 0) this._folyamatJelzo(false);

      // A friss adag azért érkezett, mert az e-ember befelé nagyított és megállt —
      // tehát most rögtön le is akarjuk rakni belőle, ami elfér.
      this._tennivalokFeldolgozasa();
      this._rajzolasKerese();
    }
  }

  // ===== A LETÖLTÖTT ADAG A VÁRÓLISTÁRA =====
  // Csak eltárol; a lerakásról az `_ujrapakolas` dönt. A `betoltottGyerekPont`
  // a LETÖLTÖTT (nem a lerakott) mennyiséget követi — ebből tudjuk, kell-e még
  // kérni a backendtől.
  _varolistaraFuzes(szulo, gyerekek) {
    // A gyökér-szintnek nincs szülő-pontja, ezért a LEGERŐSEBB gyökérhez
    // viszonyítunk. Az az első adag 0. eleme — a rangsor eleje sosem változik,
    // tehát a mértékegység sem mozdul a további adagok betöltésekor.
    if (szulo.id === VILAG && !szulo.legerosebbGyerekPont && gyerekek.length) {
      szulo.legerosebbGyerekPont = gyerekek[0].hierarchikusOsszesPont ?? 0;
    }

    for (const gy of gyerekek) {
      szulo.varolista.push({
        id: gy.entitasId.toString(),
        entitasTipus: gy.entitasTipus,
        cim: gy.cim,
        pont: gy.hierarchikusOsszesPont ?? 0,
        vanGyereke: gy.vanGyereke
      });
      szulo.betoltottGyerekPont += gy.hierarchikusOsszesPont ?? 0;
    }

    // A backend csökkenő pont szerint ad, a kurzor pedig folytatólagos — az
    // összefűzött lista tehát már rendezett. Védelemből mégis rendezünk, mert a
    // pakolás sorrend-érzékeny (döntetlennél az azonosító dönt).
    szulo.varolista.sort((a, b) => (b.pont - a.pont) || a.id.localeCompare(b.id));
  }

  // ===== ÚJRAPAKOLÁS A NAGYÍTÁS VÉGÉN =====
  // A nézet EGYETLEN elrendező szabálya. A zoom végén fogjuk azt, ami a képernyőn
  // (+50%) látszik — a MÁR LERAKOTTAKAT és a várólistán soron következőket —, és
  // újrapakoljuk BENTRŐL KIFELÉ, növekvő méret szerint, a mag körül.
  //
  // MIÉRT ÍGY:
  //   - A mag MINDIG ÜRES, és képpontban állandó (MAG_CEL_ATMERO). Adat-térben
  //     `(MAG_CEL_ATMERO/2) / szülőKépernyőSugár` — ebből a szintenkénti √20-as
  //     váltószám miatt MAGÁTÓL kijön a helyes magméret minden hierarchia-
  //     mélységben, külön mélység-logika nélkül.
  //   - Az újrapakolás mindig tömör elrendezést ad, tehát a szülő nem tud
  //     „megtelni" (a gyerekek együttes területe legfeljebb a szülő 1/20-a).
  //   - A hatókör a látómezőre szűkül, ezért a munka KORLÁTOS: a látómezőn kívüli
  //     testvérek helyben maradnak, és csak akadályként szerepelnek.
  //
  // Mérve: 100 kör 28 ms, 200 kör 71 ms, 400 kör 307 ms. Ha ez soknak bizonyul,
  // a MIN_KEP_ATMERO növelése csökkenti az egyszerre látható darabszámot.
  //
  // @returns {boolean} változott-e az elrendezés (kell-e újrarajzolni)
  _ujrapakolas(cs, kepSugar) {
    if (!cs || !(kepSugar > 0)) return false;

    const vilagSzint = cs.id === VILAG;
    if (!((vilagSzint ? cs.legerosebbGyerekPont : cs.pont) > 0)) return false;

    const celMag = (MAG_CEL_ATMERO / 2) / kepSugar;
    const hatar = this._ujrapakolasiSugar();

    const relSugar = (pont) => vilagSzint
      ? gyokerRelativSugar(pont, cs.legerosebbGyerekPont)
      : gyerekRelativSugar(pont, cs.pont);

    // --- KI KERÜL BELE? ---
    // (a) a már lerakott gyerekek közül azok, akik a látómezőben vannak;
    // (b) a várólistáról azok, akik ezen a nagyításon már LÁTSZANÁNAK.
    // A BELSŐ szélük alapján válogatunk: aki a látómezőbe BENYÚLIK, azt
    // átrendezzük. Aki teljesen kívül van, az helyben marad és akadály lesz.
    //
    // MIÉRT A BELSŐ SZÉL: a látómezőt átlógó nagy körök a belső szélükkel a mag
    // mellé nyúlnak. Ha ezeket befagyasztanánk (külső szél szerinti válogatás),
    // elzárnák a helyet az újonnan érkező kicsik elől — mérve: 430 jelöltből 2
    // fért be, a nézet pedig 168 síkidomnál elakadt.
    const mozgok = [];
    const allok = [];
    for (const gid of cs.gyerekIdk) {
      const gy = this._tar.get(gid);
      if (!gy) continue;
      const belsoKepSzel = (Math.hypot(gy.relX, gy.relY) - gy.relR) * kepSugar;
      if (belsoKepSzel <= hatar) mozgok.push({ id: gy.id, sugar: gy.relR });
      else allok.push({ id: gy.id, x: gy.relX, y: gy.relY, sugar: gy.relR });
    }

    const ujak = [];
    for (const v of cs.varolista) {
      const sugar = relSugar(v.pont);
      if (2 * kepSugar * sugar < MIN_KEP_ATMERO) continue;
      ujak.push({ id: v.id, sugar, varo: v });
    }

    if (ujak.length === 0 && mozgok.length === 0) return false;
    if (ujak.length === 0 && !this._magNottTulNagyra(cs, kepSugar)) return false;

    // --- AZ ÜRES MAG: CSAK AMÍG VAN MEG NEM JELENÍTETT TESTVÉR ---
    // A mag azért van, hogy a peremén sorra előbukkanjanak az újak, ahogy az
    // e-ember nagyít. Ha már MINDEN testvér a képen van (a várólista kiürült, és
    // a backendtől sincs több), akkor nincs mit jelezni: ilyenkor a legkisebb
    // síkidom a KÖZÉPPONTBA kerül.
    const varMegLetoltes = cs.osszesGyerekPont === 0
      || cs.betoltottGyerekPont < cs.osszesGyerekPont;
    const marad = cs.varolista.length - ujak.length;   // amit most sem rakunk le
    const vanMegNemJelenitett = varMegLetoltes || marad > 0;

    // A perem-korlát SZÁNDÉKOSAN nincs itt: a gyerekek együttes területe a
    // hierarchikus össztudatpont miatt legfeljebb a szülő 1/20-a, tehát hússzoros
    // a tartalék — a matematika garantálja, hogy nem lóghatnak ki. A mérőpróba
    // ezt ellenőrzi (`Minden síkidom a szülőn belül`).
    // Mag NÉLKÜL (URES_MAG = false) a pakoló a legkisebb testvért a KÖZÉPPONTBA
    // teszi — feltéve, hogy a helyben maradó környezet nem ül rajta.
    // ===== A MAG NEM NŐHETI KI A SZÜLŐT =====
    // A mag képpontban ÁLLANDÓ (MAG_CEL_ATMERO), a szülő viszont a nagyítástól
    // függően kicsi is lehet a képernyőn. Ha a szülő képernyő-sugara a mag
    // sugara körül van, akkor `celMag` az 1-hez közelít vagy meg is haladja —
    // és a mag KILÖKI a gyerekeket a szülőből.
    //
    // MÉRVE a böngészőben (2026-08-06): egy 67 px sugarú szülőnél a mag 0,8969
    // lett (a szülő 90%-a), a gyereke pedig `kulsoSugar = 1,2842`-re került —
    // a szülőn KÍVÜLRE. Innen a „szétesik" látvány: a gyerekek kiszóródnak a
    // szülő testvérei közé. (A mérőpróba ezt az invariánst ellenőrzi is
    // — „Minden síkidom a szülőn belül" —, csak sosem futott ilyen kis
    // képernyő-sugárral, ezért nem bukott meg.)
    //
    // A KORLÁT: egy gyerek a mag peremén ülve `mag + 2·sugár`-ig ér ki. Ez
    // legfeljebb 1 lehet, tehát `mag ≤ 1 − 2·legnagyobbGyerekSugár`.
    // A VILÁG szint kivétel: az virtuális, nincs valódi pereme, és a gyökereket
    // szándékosan a mag KÖRÉ terítjük.
    let magSugar = (URES_MAG && vanMegNemJelenitett) ? celMag : 0;

    if (!vilagSzint && magSugar > 0) {
      let legnagyobb = 0;
      for (const m of mozgok) legnagyobb = Math.max(legnagyobb, m.sugar);
      for (const u of ujak) legnagyobb = Math.max(legnagyobb, u.sugar);
      magSugar = Math.max(0, Math.min(magSugar, 1 - 2 * legnagyobb));
    }

    const opciok = { magSugar, kornyezet: allok };

    let eredmeny = pakolas([...mozgok, ...ujak.map(u => ({ id: u.id, sugar: u.sugar }))], opciok);

    // A már LERAKOTTAKNAK mindenképp jusson hely: ha a közös pakolás valamelyiküket
    // kihagyná, újrapróbáljuk az újak nélkül — egy meglévő síkidom nem tűnhet el.
    if (eredmeny.lerakatlanIdk.length > 0 && mozgok.length > 0) {
      const mozgoIdk = new Set(mozgok.map(m => m.id));
      const kimaradtMeglevo = eredmeny.lerakatlanIdk.filter(id => mozgoIdk.has(id));

      if (kimaradtMeglevo.length > 0) {
        console.warn('SikidomModal._ujrapakolas - meglévő maradt ki, újra az újak nélkül', {
          csomopont: cs.id, kimaradt: kimaradtMeglevo.length
        });
        eredmeny = pakolas(mozgok, opciok);
        if (eredmeny.lerakatlanIdk.length > 0) {
          console.error('SikidomModal._ujrapakolas - a meglévők sem férnek el, kihagyjuk', {
            csomopont: cs.id
          });
          return false;
        }
      }
    }

    // --- AZ EREDMÉNY BEKÖTÉSE ---
    const ujTerkep = new Map(ujak.map(u => [u.id, u.varo]));
    const lerakottIdk = new Set();

    for (const hely of eredmeny.helyek) {
      lerakottIdk.add(hely.id);

      const meglevo = this._tar.get(hely.id);
      if (meglevo) {                      // már lerakott: csak a helye változik
        meglevo.relX = hely.x;
        meglevo.relY = hely.y;
        continue;
      }

      const v = ujTerkep.get(hely.id);    // most került be a várólistáról
      if (!v) continue;

      this._tar.set(v.id, this._ujCsomopont({
        id: v.id,
        entitasTipus: v.entitasTipus,
        cim: v.cim,
        pont: v.pont,
        vanGyereke: v.vanGyereke,
        szuloId: cs.id,
        relX: hely.x, relY: hely.y, relR: relSugar(v.pont)
      }));
      cs.gyerekIdk.push(v.id);
    }

    cs.varolista = cs.varolista.filter(v => !lerakottIdk.has(v.id));

    this._meretekUjramerese(cs);

    console.log('SikidomModal._ujrapakolas', {
      csomopont: cs.id,
      atrendezett: mozgok.length,
      ujonnan: eredmeny.helyek.length - mozgok.length,
      helybenMaradt: allok.length,
      varolistan: cs.varolista.length,
      magKeppont: Math.round(cs.magSugarRel * kepSugar * 2),
      kulsoSugar: cs.kulsoSugar.toFixed(4)
    });

    return true;
  }

  // Kinőtte-e a mag a célméretet? Ha igen, van értelme újrapakolni akkor is, ha
  // épp nem érkezett új testvér — a mag ilyenkor visszaáll a cél-átmérőre.
  _magNottTulNagyra(cs, kepSugar) {
    if (!Number.isFinite(cs.magSugarRel)) return false;
    return cs.magSugarRel * kepSugar * 2 > MAG_CEL_ATMERO;
  }

  // A mag és a külső perem ÚJRAMÉRÉSE a gyerekekből. Nem vezetjük görgetve
  // (a kerekítési hibák halmozódnának) — mindig a tényleges helyekből számoljuk.
  _meretekUjramerese(cs) {
    let mag = Infinity;
    let kulso = 0;

    for (const gid of cs.gyerekIdk) {
      const gy = this._tar.get(gid);
      if (!gy) continue;
      const tavolsag = Math.hypot(gy.relX, gy.relY);
      mag = Math.min(mag, tavolsag - gy.relR);
      kulso = Math.max(kulso, tavolsag + gy.relR);
    }

    cs.magSugarRel = Number.isFinite(mag) ? Math.max(0, mag) : Infinity;
    cs.kulsoSugar = kulso;
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

  // ===== AZ ÚJRAPAKOLÁS HATÓSUGARA =====
  // Ennél távolabb (a szülő középpontjától mérve) a testvérek BEFAGYNAK: helyben
  // maradnak, és csak akadályként vesznek részt.
  //
  // MIÉRT A FÉL ÁTLÓ, ÉS NEM A RÖVIDEBB OLDAL FELE (2026-08-06-i javítás):
  // korábban `min(szélesség, magasság) / 2` volt a kiindulás. Széles ablakban ez
  // SÚLYOSAN alábecsül: egy 1535×480-as vászonnál a rövidebb oldal fele 240 px,
  // a sarok viszont 803 px-re van. A fagyasztási határ (240 × 1,5 = 360 px) így
  // BELÜL került a látható területen — a képernyőn látszó körök egy része
  // befagyott egy korábbi nagyításkor számolt helyén, miközben a bentebbiek
  // szorosan újrapakolódtak. A kettő találkozásánál NYÍLT A RÉS: a külső nagy
  // síkidomok láthatóan elváltak egymástól, amint a kép túlnőtt a képernyőn.
  //
  // A fél átló a vászon KÖRÜLÍRT körének sugara, tehát az egész látható
  // téglalapot lefedi — bármilyen képarány mellett. A `UJRAPAKOLASI_TARTALEK`
  // ezen felül ad ráhagyást, hogy a varrat a képernyőn KÍVÜLRE essen.
  _ujrapakolasiSugar() {
    const sz = this._szelesseg || 1;
    const m = this._magassag || 1;
    return (Math.hypot(sz, m) / 2) * UJRAPAKOLASI_TARTALEK;
  }

  // ===== ALAPHELYZET =====
  // ===== KEZDŐ NÉZET BECSLÉSE (csak az első pakolás elindításához) =====
  // A gyökerek együttes TERÜLETE a legerősebb gyökér egységében: Σpont /
  // legerősebbPont. Ebből egy laza (0,5-es) kitöltéssel becsülhető a kiterjedés.
  // Ez SEHOL nem befolyásolja a végleges képet — az `_alaphelyzet` a MÉRT
  // kiterjedésre igazít utána —, csak arra kell, hogy a legelső pakolásnak
  // legyen mihez viszonyítania a lyuk képpont-méretét.
  _kezdoNezetBecslese(vilag) {
    const osszes = vilag.varolista.reduce((s, v) => s + v.pont, 0);
    const egyseg = vilag.legerosebbGyerekPont || 1;
    const becsultKiterjedes = Math.max(1, Math.sqrt(osszes / egyseg / 0.5));

    this._horgony = VILAG;
    this._nezet = {
      skala: (this._kepernyoMeret() * 0.45) / becsultKiterjedes,
      eltolasX: (this._szelesseg || 0) / 2,
      eltolasY: (this._magassag || 0) / 2
    };

    console.log('SikidomModal._kezdoNezetBecslese', {
      gyokerek: vilag.varolista.length, becsultKiterjedes: becsultKiterjedes.toFixed(2)
    });
  }

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

    // Az új nagyítás új lyuk-méretet jelent — hátha most még befér valami
    this._tennivalokFeldolgozasa();

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
    const pakolandok = [];
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
      // Itt dől el, mely gyerekek látszanak (LÁTHATÓSÁGI KÜSZÖB). A küszöb
      // alattiakat NEM rajzoljuk és a részfájukat sem járjuk be (a gyerek mindig
      // kisebb a szülőjénél → a részfa levágható). Ilyen csak akkor fordul elő,
      // ha az e-ember KIcsinyített: a lerakott helyeket megtartjuk, hogy
      // visszanagyítva pontosan ugyanaz a kép jöjjön vissza.
      for (const gid of cs.gyerekIdk) {
        const gy = this._tar.get(gid);
        if (!gy) continue;

        const gyKeret = {
          x: elem.keret.x + elem.keret.r * gy.relX,
          y: elem.keret.y + elem.keret.r * gy.relY,
          r: elem.keret.r * gy.relR
        };

        if (this._nezet.skala * gyKeret.r * 2 < MIN_KEP_ATMERO) continue;

        sor.push({ id: gid, keret: gyKeret });
      }

      // --- A KÖZÉPSŐ LYUK ---
      // A szaggatott kör pereme a MÉRT lyuk: a legbelső lerakott testvér belső
      // széle (`magSugarRel`, mérve). Nincs benne becslés.
      //
      // Képpontban ez a MAG_CEL_ATMERO körül marad, amíg van még várakozó
      // testvér — mert a nagyítás végén pontosan addig fűzünk befelé újabbakat,
      // amíg vissza nem csökken a célra. Amikor a várólista kiürül, a lyuk
      // átveszi a nagyítást és onnantól NŐ: ez a jelzés, hogy „itt nincs több".
      if (cs.gyerekIdk.length > 0 && Number.isFinite(cs.magSugarRel) && cs.magSugarRel > 0) {
        const magKepSugar = kep.kepSugar * cs.magSugarRel;
        if (magKepSugar * 2 >= MAG_MIN_ATMERO) {
          magok.push({
            kepX: kep.kepX,
            kepY: kep.kepY,
            kepSugar: magKepSugar,
            vilag: cs.id === VILAG
          });
        }
      }

      // --- ÚJRAPAKOLÁS-IGÉNY ---
      // Akkor van dolgunk, ha (a) van még várakozó testvér, vagy (b) a mag
      // kinőtte a cél-átmérőt (nagyítottak, tehát helyet kell újraosztani).
      const magKepAtmero = Number.isFinite(cs.magSugarRel)
        ? cs.magSugarRel * kep.kepSugar * 2
        : Infinity;

      if (cs.varolista.length > 0 || magKepAtmero > MAG_CEL_ATMERO) {
        pakolandok.push({ id: cs.id, kepSugar: kep.kepSugar });
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

    return { lathatoak, betoltendok, magok, pakolandok };
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
  //
  // A rajzolás CSAK RAJZOL: nem tölt be és nem pakol. Azt a nagyítás VÉGÉN futó
  // `_tennivalokFeldolgozasa` végzi — így a kép nem ugrál görgetés közben, és nem
  // számolunk fölöslegesen minden képkockán.
  _rajzolas() {
    if (!this.rajzolo || !this._szelesseg) return;

    this._kepkocka++;
    this._horgonyEllenorzes();

    const { lathatoak, magok } = this._lathatoLista();

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

    if (this._kepkocka % TAKARITAS_KEPKOCKANKENT === 0) this._takaritas();
  }

  // ===== A NAGYÍTÁS VÉGE =====
  // Minden nagyítás újraindítja az időzítőt; a munka csak akkor indul el, amikor
  // ZOOM_VEGE_MS ideje nem történt semmi. Csaba kérése: „csak a zoom végén
  // reagáljon a program".
  _zoomVegeUtemezes() {
    clearTimeout(this._zoomVegeIdozito);
    this._zoomVegeIdozito = setTimeout(() => {
      this._zoomVegeIdozito = null;
      this._tennivalokFeldolgozasa();
    }, ZOOM_VEGE_MS);
  }

  // ===== TENNIVALÓK: LERAKÁS, MAJD BETÖLTÉS =====
  // Először azt rakjuk le, ami MÁR itt van (a várólistáról) — hátha a nagyítás
  // felszabadított annyi helyet, hogy letöltés nélkül is bővül a kép. Csak utána
  // kérünk újat a backendtől.
  _tennivalokFeldolgozasa() {
    if (!this.rajzolo || !this._szelesseg) return;

    const { betoltendok, pakolandok } = this._lathatoLista();

    let valtozott = false;
    for (const p of pakolandok) {
      if (this._ujrapakolas(this._tar.get(p.id), p.kepSugar)) valtozott = true;
    }

    // Betöltések indítása (a legnagyobbak előbb)
    betoltendok.sort((a, b) => b.sulyy - a.sulyy);
    for (const b of betoltendok) {
      if (this._futoBetoltesek >= EGYIDEJU_BETOLTES) break;
      this._gyerekekBetoltese(b.id, b.kuszob);
    }

    if (valtozott) this._rajzolasKerese();
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
    cs.varolista = [];
    cs.magSugarRel = Infinity;
    cs.kulsoSugar = 0;
    cs.betoltottGyerekPont = 0;
    cs.betoltottKuszob = Infinity;
    cs.kurzorPont = null;
    cs.kurzorId = null;
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

      // A csippentés vége: itt már BIZTOS, hogy vége a nagyításnak, nem kell
      // kivárni az időzítőt
      if (this._aktivMutatok.size === 0 && this._zoomVegeIdozito) {
        clearTimeout(this._zoomVegeIdozito);
        this._zoomVegeIdozito = null;
        this._tennivalokFeldolgozasa();
      }

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

    // A kép azonnal követi a nagyítást, de az ÚJ síkidomok csak a végén jelennek meg
    this._zoomVegeUtemezes();
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
