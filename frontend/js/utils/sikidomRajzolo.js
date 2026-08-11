// frontend/js/utils/sikidomRajzolo.js

// ===== A SÍKIDOMOK KIRAJZOLÁSA (Canvas) =====
//
// Felelősség: EGYETLEN dolog — a már kiszámolt képernyő-helyekből kép legyen.
// Nem tölt be, nem pakol, nem dönt láthatóságról, és a csomópont-tárat sem
// ismeri: kap egy csomópontot meg a hozzá tartozó képernyő-helyet (`kep`), és
// kirajzolja. Ez a réteg tehát bátran cserélhető anélkül, hogy a nézet
// mérésekkel megszerzett szabályaihoz hozzá kellene nyúlni.
//
// A RAJZOLÁS NÉGY MENETBEN történik (a hívó `_rajzolas`-a hívja ebben a
// sorrendben) — mert a Canvas nem ismer z-indexet, csak azt, hogy mit rajzolunk
// később:
//   1. `alakzatRajzolasa`       — a formák, a nagyoktól a kicsik felé
//   2. `uresMagRajzolasa`       — az üres magok a síkidomok fölött
//   3. `cimkeRajzolasa` + `mellekIkonokRajzolasa` — a feliratok mindenek fölött
//   4. `hatarjeloloRajzolasa`   — a megjelölt síkidom gyűrűje, legfelül
//
// A KÉPKOCKÁNKÉNT VÁLTOZÓ ÁLLAPOTOT (képernyő-méret, kiemelt/kiválasztott/
// megjelölt azonosító) NEM adjuk át minden hívásnál: a hívó a képkocka elején
// EGYSZER átadja a `kepkockaKezdese`-vel. Így a rajzoló metódusok aláírása
// ugyanaz maradt, ami a modálban volt (`cs, kep`), és a kiemelés-szabályok is
// egy helyen olvashatók.
//
// ⚠️ A TÖBBI `sikidom*` MODULLAL ELLENTÉTBEN EZ NEM DOM-FÜGGETLEN: Canvas-
// kontextust kap, `getComputedStyle`-lal olvassa ki a téma színeit, és `Image`-et
// tölt az ikonokhoz. Node-ból tehát nem tesztelhető — a helyességét a böngészős
// próba adja. Ami SZÁMOLÁS (méret, hely, sorrend), az szándékosan nincs itt: az a
// sikidomMeret / sikidomPakolas / sikidomHorgony hármasban él.
//
// A rajzoló metódusokban SZÁNDÉKOSAN nincs `console.log`: képkockánként futnak,
// elárasztanák a naplót.
//
// Használja: SikidomModal.js (a Síkidom nézet).

// ===== IMPORTOK =====
import { sikidomLeiro, TIPUS_FORMA } from './sikidomFormak.js';

// ===== OLCSÓ ÚT A LEGAPRÓBBAKNAK =====
// Ekkora látszó ÁTMÉRŐ alatt OLCSÓN rajzolunk: egyetlen kitöltött pont, körvonal,
// forma és átlátszóság-számítás nélkül. Néhány képpontos folton úgysem látszik a
// különbség, viszont ezekből van a legtöbb — az illesztett nézetben több ezer.
const APRO_ATMERO = 5;

// Ekkora látszó ÁTMÉRŐ fölött írjuk ki a címet. Nagyobb, mint a láthatósági
// küszöb: egy síkidom előbb látszik, és csak nagyobbra nőve kap feliratot.
const CIMKE_MIN_ATMERO = 48;

// ===== A CÍMKE: KÁRTYA, SORTÖRÉS, HELY (a koino_1.0 titlecards.js mintájára) =====
// A koino_1.0 három dolgot csinált jobban a felirattal, mindhármat átvesszük:
//
//  1. TÖBB SORBA TÖRDEL, valódi szélesség-méréssel (`measureText`), szóhatáron —
//     nem 24 karakternél vág el „…"-tal.
//  2. FÉLIG ÁTTETSZŐ, LEKEREKÍTETT KÁRTYÁT tesz a szöveg alá. Ez bármilyen
//     háttéren olvasható marad; a korábbi fehér kontúr (`strokeText`) zsúfolt
//     képen elmosódott.
//  3. NEM A KÖZÉPPONTBA teszi, hanem fölé (`sugár × CIMKE_FELETT_ARANY`).
//     Ez nálunk már nem szépészeti kérdés: a foglalásos mag megszűnése óta a
//     középpontban a LEGKISEBB GYEREK ül, tehát a középre írt felirat rátakart.
const CIMKE_MAX_SOR = 3;            // ennél több sorba nem tördelünk (az utolsó „…"-t kap)
const CIMKE_FELETT_ARANY = 0.6;     // a kártya közepe ennyiszer a sugárral a középpont FÖLÖTT
const CIMKE_SOR_SZELESSEG = 1.3;    // a sor legnagyobb szélessége a sugár arányában
const CIMKE_HATTER = 'rgba(255, 255, 255, 0.78)';

// ===== MELLÉK-IKONOK: KATEGÓRIA ÉS TARTALOMTÍPUS =====
// A síkidom FORMÁJA az entitástípust mutatja (kör / háromszög / …), a SZÍNE
// ugyanazt — de arról, hogy egy Tartalom MELYIK kategóriába tartozik és milyen
// TÍPUSÚ, eddig semmi nem árulkodott. A koino_1.0 ezt a kategória SZÍNÉVEL és a
// típus FORMÁJÁVAL oldotta meg; nálunk ez nem járható, mert a színek és a formák
// száma korlátozott, az ikonoké viszont nem (Csaba, 2026-08-08).
//
// Ezért a Struktúra nézet mintáját követjük: a felirat alatt egy sorban a
// kategória-ikonok BALRA, a tartalomtípus ikonja JOBBRA.
const IKON_MIN_ATMERO = 96;         // ekkora látszó átmérő alatt nincs mellék-ikon
const IKON_ALATT_ARANY = 0.5;       // az ikon-sor a középpont ALATT, a sugár arányában
const IKON_SUGAR_ARANY = 0.10;      // egy ikon sugara a síkidom sugarának arányában
const IKON_MAX_SUGAR = 22;          // de ennél nagyobbra nem nő (a nagy szülőkön ne uralkodjon)
const IKON_MAX_DARAB = 4;           // legfeljebb ennyi ikon fér ki egy síkidomra

// ===== ELHALVÁNYODÁS: A TÚLNŐTT SÍKIDOM ÁTADJA A HELYET =====
// A koino_1.0 `calculateOpacity`-je: ahogy egy síkidom túlnő a képernyőn, a
// kitöltése fokozatosan eltűnik. Nálunk ez azért is kell, mert a KERET eddig
// végig átlátszatlan maradt — egy óriásira nagyított szülő kontúrja egyszerűen
// átvágott a képernyőn.
//
// A küszöböket a KÉPERNYŐHÖZ mérjük, nem fix képpontban (a 1.0 fix 4000-et
// használt, ami telefonon és 4K-n mást jelent). Egységük: a képernyő kisebbik
// oldala. A horgonyváltás a képernyő KÉTSZERES átmérőjénél történik, azaz
// 1,0-s sugárnál — a halványodás tehát pont ott kezdődik, ahol a síkidom
// „körénk zárul", és 3,0-nál ér véget.
const HALVANYODAS_KEZDET = 1.0;
const HALVANYODAS_VEGE = 3.0;
const HALVANYODAS_MARADEK = 0.06;   // teljesen sosem tűnik el: ennyi marad a keretből

// A gyökér-szint üres magjába ekkora sugár fölött írjuk ki a „nagyíts befelé" súgót
const MAG_FELIRAT_MIN_SUGAR = 62;

// A „további tartalmak" AJÁNLAT ekkora ÜRES sugár (képpont) fölött fér ki. Kisebb,
// mint a fenti súgó küszöbe, mert ez nem díszítés: működő ajánlatnak telefonon is
// meg kell jelennie. Nem is a kijelző-maghoz mérjük, hanem a valódi, MÉRT
// ürességhez (a pakolási lyukhoz) — az nagyításkor korlátlanul nő, tehát az ajánlat
// minden képernyőn előbb-utóbb kifér.
//
// EXPORTÁLT, mert a koppintás-találat ugyanezt a küszöböt kérdezi
// (`_ajanlatKoppintas`): amit ki sem rajzoltunk, arra nem is lehet koppintani. A
// két hely SOSEM térhet el, ezért van egyetlen forrása.
export const TOVABBI_FELIRAT_MIN_SUGAR = 30;

// A címke és az ikonok betűtípusa — egy helyen, hogy a kép egységes maradjon
const BETUTIPUS = "system-ui, -apple-system, 'Segoe UI', sans-serif";

// A feliratok alapszíne, ha a téma-változó nem olvasható ki
const ALAP_SZOVEG_SZIN = '#2b2318';
const ALAP_HALVANY_SZIN = 'rgba(43, 35, 24, 0.45)';

// ===== A RAJZOLÓ =====
export class SikidomRajzolo {

  // @param {Object} beallitasok
  // @param {CanvasRenderingContext2D} beallitasok.rajzolo - a vászon 2D kontextusa
  // @param {Function} beallitasok.ujrarajzolasKerese - a rajzoló ezzel kér új
  //        képkockát, ha egy mellék-ikon képe menet közben töltődött be
  constructor(beallitasok = {}) {
    this.rajzolo = beallitasok.rajzolo ?? null;
    this._ujrarajzolasKerese = beallitasok.ujrarajzolasKerese ?? (() => {});

    // MELLÉK-IKON KÉP-TÁR: URL → { kep: Image, kesz: boolean, hibas: boolean }.
    // A Canvas csak betöltött képet tud kirajzolni, ezért egyszer betöltjük és
    // megjegyezzük. Betöltéskor újrarajzolást kérünk — így az ikon „bevillan",
    // de a rajzolás sosem vár rá.
    this._ikonTar = new Map();

    // A téma színei — egyszer olvassuk ki, mert a Canvas-nak konkrét szín kell,
    // nem CSS-változó
    this._feliratSzinErtek = null;
    this._magSzinErtek = null;

    // ----- A KÉPKOCKA ÁLLAPOTA (a `kepkockaKezdese` állítja be) -----
    this._kepernyoMeret = 0;
    this._aktualisId = null;
    this._kivalasztottId = null;
    this._jeloltId = null;
  }

  // ===== A VÁSZON ÁTADÁSA =====
  // Külön metódus, mert a kontextus csak a modal DOM-jának felépítése után áll
  // elő — a rajzoló viszont már a konstruktorban megvan.
  vaszonBeallitasa(rajzolo) {
    this.rajzolo = rajzolo;
  }

  // ===== EGY KÉPKOCKA ÁLLAPOTA =====
  // A hívó a rajzolás elején EGYSZER hívja; utána minden rajzoló metódus ebből
  // dolgozik.
  //
  // @param {Object} allapot
  // @param {number} allapot.kepernyoMeret   - a képernyő kisebbik oldala (a halványodás egysége)
  // @param {string} allapot.aktualisId      - a kiemelt entitás azonosítója
  // @param {string} allapot.kivalasztottId  - a koppintással kiválasztott azonosítója
  // @param {string} allapot.jeloltId        - a határjelölő gyűrűt kapó azonosító
  kepkockaKezdese({ kepernyoMeret = 0, aktualisId = null, kivalasztottId = null, jeloltId = null } = {}) {
    this._kepernyoMeret = kepernyoMeret;
    this._aktualisId = aktualisId;
    this._kivalasztottId = kivalasztottId;
    this._jeloltId = jeloltId;
  }

  // ===== A TÁR ÜRÍTÉSE (a nézet bezárásakor) =====
  ikonTarUrites() {
    this._ikonTar.clear();
  }

  // ===== EGY SÍKIDOM ALAKZATA =====
  // @param {Object} cs  - a csomópont (entitásTípus, kiemelés-azonosítók)
  // @param {Object} kep - a képernyő-hely: { kepX, kepY, kepSugar }
  alakzatRajzolasa(cs, kep) {
    const c = this.rajzolo;
    const leiro = sikidomLeiro(cs.entitasTipus);

    // ===== OLCSÓ ÚT A LEGAPRÓBBAKNAK (2026-08-09) =====
    // A méret-küszöb megszűnése óta az illesztett nézetben több EZER néhány
    // képpontos folt is rajzolódik. Ekkora méretben a forma (kör/háromszög/…), a
    // körvonal és az elhalványodás úgysem látszik, viszont mindhárom külön munka
    // képkockánként. Ezért néhány képpont alatt egyetlen kitöltött kört rajzolunk,
    // körvonal és átlátszóság-váltogatás nélkül.
    //
    // A halványodás itt szándékosan kimarad: az a TÚLNŐTT síkidomokra való
    // (`HALVANYODAS_KEZDET` a képernyő méretéhez mér), egy 3 képpontos folt pedig
    // biztosan nem túlnőtt.
    if (kep.kepSugar * 2 < APRO_ATMERO) {
      c.fillStyle = leiro.szin;
      c.globalAlpha = 0.55;
      c.beginPath();
      c.arc(kep.kepX, kep.kepY, Math.max(0.5, kep.kepSugar), 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 1;
      return;
    }

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

    const aktualis = this._aktualisId && cs.id === this._aktualisId;
    const kivalasztott = this._kivalasztottId && cs.id === this._kivalasztottId;

    // Ahogy a síkidom túlnő a képernyőn, átadja a helyet a gyerekeinek: a
    // kitöltése ÉS a kerete is fokozatosan elhalványul (lásd HALVANYODAS_KEZDET).
    const lathatosag = this.halvanyodas(kep.kepSugar);
    if (lathatosag <= 0) return;

    c.fillStyle = leiro.szin;
    c.globalAlpha = (kivalasztott ? 0.38 : (aktualis ? 0.30 : 0.14)) * lathatosag;
    c.fill();

    c.globalAlpha = lathatosag;
    c.strokeStyle = leiro.szin;
    c.lineWidth = (aktualis || kivalasztott) ? 3 : 1.5;
    c.stroke();
    c.globalAlpha = 1;
  }

  // ===== A HATÁRJELÖLŐ: HOL MARADT ABBA AZ ELŐZŐ LEPAKOLÁS =====
  // Csaba, 2026-08-11: a „további tartalmak" koppintás előtti legkisebb síkidom
  // eddig (majdnem) középen ült, az újrapakolás után viszont máshol lehet. Ha nem
  // jelölnénk meg, az e-ember elveszítené a fonalat.
  //
  // ⚠️ KÜLÖN MENETBEN rajzoljuk, NEM az `alakzatRajzolasa`-ban. Ez a 2026-08-11-i
  // hiba oka volt: a megjelölt a lepakolás LEGKISEBBJE, tehát rendszerint az OLCSÓ
  // rajzolási útra esik (`APRO_ATMERO` alatt egyetlen folt, korai `return`) — a
  // gyűrű-rajzoló kód így sosem futott le. Külön menetben mindig lefut, és
  // ráadásul MINDEN síkidom fölé kerül, tehát semmi nem takarja el.
  //
  // A gyűrű TÁGABB a síkidomnál, mert a megjelölt jellemzően néhány képpontos.
  hatarjeloloRajzolasa(cs, kep) {
    if (!this._jeloltId || cs.id !== this._jeloltId) return;

    const c = this.rajzolo;
    const gyuruSugar = Math.max(kep.kepSugar * 1.8, kep.kepSugar + 6);

    c.save();
    c.beginPath();
    c.arc(kep.kepX, kep.kepY, gyuruSugar, 0, Math.PI * 2);
    c.strokeStyle = this._feliratSzin();
    c.lineWidth = 2;
    c.setLineDash([3, 3]);
    c.globalAlpha = 0.85;
    c.stroke();
    c.restore();
  }

  // ===== ELHALVÁNYODÁS A MÉRETTEL =====
  // 1-et ad, amíg a síkidom „normál" méretű; onnantól lineárisan csökken, ahogy
  // túlnő a képernyőn. A küszöbök egysége a képernyő KISEBBIK oldala — így
  // telefonon és 4K-n ugyanott történik, amit az e-ember lát.
  //
  // @param {number} kepSugar - a síkidom képernyő-sugara
  // @returns {number} 0 és 1 közötti láthatóság-szorzó
  halvanyodas(kepSugar) {
    const egyseg = this._kepernyoMeret;
    if (!(egyseg > 0)) return 1;

    const arany = kepSugar / egyseg;
    if (arany <= HALVANYODAS_KEZDET) return 1;

    const hanyad = (arany - HALVANYODAS_KEZDET) / (HALVANYODAS_VEGE - HALVANYODAS_KEZDET);
    return Math.max(HALVANYODAS_MARADEK, 1 - Math.min(1, hanyad));
  }

  // ===== ÜRES MAG RAJZOLÁSA (szaggatott kör) =====
  // A síkidom közepén hagyott hely a MÉG BE NEM TÖLTÖTT, gyengébb testvéreké.
  // Szaggatott vonallal jelöljük, hogy látsszon: itt még van világ, érdemes
  // befelé nagyítani. A gyökér-szint magjába súgó-feliratot is teszünk (ott
  // nincs cím, ami elfoglalná a helyet).
  //
  // @param {Object} mag - { kepX, kepY, kepSugar, uresSugarPx, vilag, tovabbiTartalom }
  uresMagRajzolasa(mag) {
    const c = this.rajzolo;

    // A kört a VALÓDI üresség peremére rajzoljuk (`uresSugarPx`), nem a kijelző-magra.
    // Amíg a kijelző-mag a nagyobbik, a kettő ugyanaz — ez a megszokott kép. Befelé
    // nagyítva viszont a pakolási lyuk nő túl rajta, és onnantól AZ a valódi perem;
    // a kijelző-magot kirajzolni ott már félrevezető lenne (nem takar el semmit).
    c.save();
    c.beginPath();
    c.arc(mag.kepX, mag.kepY, mag.uresSugarPx, 0, Math.PI * 2);
    c.strokeStyle = this._magSzin();
    c.lineWidth = 1;
    c.setLineDash([5, 5]);
    c.stroke();
    c.restore();

    // ===== A „TOVÁBBI TARTALMAK" AJÁNLAT =====
    // Akkor kerül ide, ha a kijelző-mag már senkit nem takar, de van még le nem
    // töltött testvér (lásd `_lathatoLista`). A két felirat SOSEM ütközik: amíg van
    // mit előhívni nagyítással, a „nagyíts befelé" súgó szól; amikor már nincs, ez.
    if (mag.tovabbiTartalom && mag.uresSugarPx >= TOVABBI_FELIRAT_MIN_SUGAR) {
      // A betűméret az ÜRES kör méretéhez igazodik (kis telefon-mag és nagy monitor
      // között is olvasható maradjon), de nem nő el és nem tűnik el.
      const betu = Math.max(11, Math.min(16, Math.round(mag.uresSugarPx * 0.28)));

      c.save();
      c.fillStyle = this._feliratSzin();
      c.font = `${betu}px ${BETUTIPUS}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      // Két sorban: körbe így fér ki a legjobban (egy hosszú sor kilógna a peremen).
      c.fillText('további', mag.kepX, mag.kepY - betu * 0.6);
      c.fillText('tartalmak', mag.kepX, mag.kepY + betu * 0.6);
      c.restore();
      return;
    }

    if (mag.vilag && mag.kepSugar > MAG_FELIRAT_MIN_SUGAR) {
      c.fillStyle = this._magSzin();
      c.font = `12px ${BETUTIPUS}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('üres kör', mag.kepX, mag.kepY - 8);
      c.fillText('— nagyíts befelé —', mag.kepX, mag.kepY + 8);
    }
  }

  // ===== CÍMKE: KÁRTYA + SORTÖRÉS, A KÖZÉPPONT FÖLÖTT =====
  // Lásd a CIMKE_* állandók magyarázatát: a koino_1.0 titlecards.js három
  // megoldását vesszük át (tördelés, háttérkártya, a középpont fölé helyezés).
  cimkeRajzolasa(cs, kep) {
    if (kep.kepSugar * 2 < CIMKE_MIN_ATMERO) return;

    // A címke ugyanúgy halványul, mint maga a síkidom — különben egy kifelé
    // eltűnő szülő felirata ott maradna a semmiben.
    const lathatosag = this.halvanyodas(kep.kepSugar);
    if (lathatosag <= HALVANYODAS_MARADEK) return;

    const leiro = sikidomLeiro(cs.entitasTipus);
    const teljes = (cs.cim ?? leiro.nev ?? '').trim();
    if (!teljes) return;

    const c = this.rajzolo;
    const betuMeret = Math.max(11, Math.min(20, kep.kepSugar * 0.28));
    c.font = `${betuMeret.toFixed(0)}px ${BETUTIPUS}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';

    const sorok = this._sortores(teljes, kep.kepSugar * CIMKE_SOR_SZELESSEG);
    if (sorok.length === 0) return;

    // A kártya mérete a TÉNYLEGES szövegből (nem becslésből)
    let sorSzelesseg = 0;
    for (const sor of sorok) sorSzelesseg = Math.max(sorSzelesseg, c.measureText(sor).width);

    const parkany = betuMeret * 0.45;             // belső margó, egyben a lekerekítés sugara
    const sorMagassag = betuMeret * 1.18;
    const kartyaSzelesseg = sorSzelesseg + 2 * parkany;
    const kartyaMagassag = sorok.length * sorMagassag + 2 * parkany * 0.7;

    // A kártya közepe a síkidom középpontja FÖLÖTT — ott már nem takarja a
    // középpontba pakolt legkisebb gyereket.
    const kozepY = kep.kepY - kep.kepSugar * CIMKE_FELETT_ARANY;

    c.save();
    c.globalAlpha = lathatosag;

    c.beginPath();
    this._lekerekitettTeglalap(
      kep.kepX - kartyaSzelesseg / 2, kozepY - kartyaMagassag / 2,
      kartyaSzelesseg, kartyaMagassag, parkany
    );
    c.fillStyle = CIMKE_HATTER;
    c.fill();

    c.fillStyle = ALAP_SZOVEG_SZIN;
    const elsoSorY = kozepY - ((sorok.length - 1) * sorMagassag) / 2;
    sorok.forEach((sor, i) => c.fillText(sor, kep.kepX, elsoSorY + i * sorMagassag));

    c.restore();
  }

  // ===== MELLÉK-IKONOK: KATEGÓRIA (BALRA) + TARTALOMTÍPUS (JOBBRA) =====
  // A forma és a szín az entitástípust mondja meg; ezek az ikonok azt, amit a
  // forma nem tud: melyik kategóriába tartozik és milyen típusú. A Struktúra
  // nézet ugyanezt a rendezést használja, hogy a két nézet egyformán olvasható.
  mellekIkonokRajzolasa(cs, kep) {
    if (kep.kepSugar * 2 < IKON_MIN_ATMERO) return;

    const lathatosag = this.halvanyodas(kep.kepSugar);
    if (lathatosag <= HALVANYODAS_MARADEK) return;

    // Balra a kategóriák, jobbra a típus — ugyanabban a sorban, középről kifelé
    const balra = (cs.kategoriaIkonok ?? []).filter(k => k?.ikon).slice(0, IKON_MAX_DARAB);
    const jobbra = [];
    if (cs.tipusIkon?.ikon) jobbra.push(cs.tipusIkon);
    if (cs.javaslatTipus) jobbra.push({ ikon: cs.javaslatTipus, nev: cs.javaslatTipus });

    if (balra.length === 0 && jobbra.length === 0) return;

    const sugar = Math.min(IKON_MAX_SUGAR, kep.kepSugar * IKON_SUGAR_ARANY);
    if (sugar < 5) return;                       // ilyen kicsin úgysem lehetne kivenni

    const lepes = sugar * 2.3;
    const y = kep.kepY + kep.kepSugar * IKON_ALATT_ARANY;

    const c = this.rajzolo;
    c.save();
    c.globalAlpha = lathatosag;

    balra.forEach((k, i) => {
      this._egyIkonRajzolasa(kep.kepX - (i + 0.5) * lepes, y, sugar, k.ikon, TIPUS_FORMA.Kategoria.szin);
    });
    jobbra.forEach((t, i) => {
      this._egyIkonRajzolasa(kep.kepX + (i + 0.5) * lepes, y, sugar, t.ikon, TIPUS_FORMA.TartalomTipus.szin);
    });

    c.restore();
  }

  // ===== A FELIRATOK SZÍNE =====
  // Az AJÁNLAT színe: a rendes szövegszín, nem a halvány — ez nem súgó, hanem
  // felkínált művelet. (Egyszer olvassuk ki, mert a Canvas-nak konkrét szín kell.)
  _feliratSzin() {
    if (!this._feliratSzinErtek) {
      const ertek = getComputedStyle(document.documentElement)
        .getPropertyValue('--color-text').trim();
      this._feliratSzinErtek = ertek || ALAP_SZOVEG_SZIN;
    }
    return this._feliratSzinErtek;
  }

  // A szaggatott kör színe az alkalmazás halvány szövegszínéből (egyszer olvassuk
  // ki, mert a Canvas-nak konkrét szín kell, nem CSS-változó)
  _magSzin() {
    if (!this._magSzinErtek) {
      const ertek = getComputedStyle(document.documentElement)
        .getPropertyValue('--color-text-faint').trim();
      this._magSzinErtek = ertek || ALAP_HALVANY_SZIN;
    }
    return this._magSzinErtek;
  }

  // ===== SORTÖRÉS SZÓHATÁRON, MÉRT SZÉLESSÉGGEL =====
  // A hívó már beállította a betűtípust a rajzolón — a mérés ahhoz igazodik.
  // Az utolsó sor „…"-t kap, ha nem fért ki minden. Egyetlen, önmagában is túl
  // hosszú szót nem darabolunk: azt is „…"-sal rövidítjük.
  //
  // @param {string} szoveg
  // @param {number} maxSzelesseg - egy sor legnagyobb szélessége képpontban
  // @returns {string[]} legfeljebb CIMKE_MAX_SOR sor
  _sortores(szoveg, maxSzelesseg) {
    const c = this.rajzolo;
    const szavak = szoveg.split(/\s+/).filter(Boolean);
    const sorok = [];
    let aktualis = '';

    for (const szo of szavak) {
      const proba = aktualis ? `${aktualis} ${szo}` : szo;

      if (c.measureText(proba).width <= maxSzelesseg || !aktualis) {
        aktualis = proba;
        continue;
      }

      sorok.push(aktualis);
      aktualis = szo;

      if (sorok.length === CIMKE_MAX_SOR) break;
    }

    if (sorok.length < CIMKE_MAX_SOR && aktualis) sorok.push(aktualis);

    // Az utolsó sor rövidítése, ha kilóg (vagy mert egyetlen hosszú szó, vagy
    // mert elfogytak a sorok, és még lett volna szöveg)
    const utolso = sorok.length - 1;
    if (utolso >= 0 && c.measureText(sorok[utolso]).width > maxSzelesseg) {
      let rovid = sorok[utolso];
      while (rovid.length > 1 && c.measureText(`${rovid}…`).width > maxSzelesseg) {
        rovid = rovid.slice(0, -1);
      }
      sorok[utolso] = `${rovid}…`;
    }

    return sorok;
  }

  // Egyetlen ikon: világos korong + benne a kép VAGY az emoji.
  // Az `ikonErtek` feltöltött kép URL-je (http…/…) vagy emoji — a Struktúra
  // nézet ugyanezzel a szabállyal dönt.
  _egyIkonRajzolasa(x, y, sugar, ikonErtek, keretSzin) {
    const c = this.rajzolo;

    c.beginPath();
    c.arc(x, y, sugar, 0, Math.PI * 2);
    c.fillStyle = 'rgba(255, 255, 255, 0.9)';
    c.fill();
    c.lineWidth = Math.max(1, sugar * 0.12);
    c.strokeStyle = keretSzin;
    c.stroke();

    const kepE = typeof ikonErtek === 'string' && /^(https?:\/\/|\/)/.test(ikonErtek);

    if (!kepE) {
      c.font = `${(sugar * 1.25).toFixed(0)}px ${BETUTIPUS}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillStyle = ALAP_SZOVEG_SZIN;
      c.fillText(String(ikonErtek ?? ''), x, y + sugar * 0.05);
      return;
    }

    const bejegyzes = this._ikonKep(ikonErtek);
    if (!bejegyzes?.kesz) return;                // még tölt (vagy hibás) — a korong marad

    // A képet a korongba vágjuk, hogy a nem négyzetes ikonok se lógjanak ki
    c.save();
    c.beginPath();
    c.arc(x, y, sugar - 1, 0, Math.PI * 2);
    c.clip();
    c.drawImage(bejegyzes.kep, x - sugar, y - sugar, sugar * 2, sugar * 2);
    c.restore();
  }

  // ===== IKON-KÉPEK TÁRA =====
  // A Canvas csak BETÖLTÖTT képet tud kirajzolni. Ezért URL-enként egyszer
  // betöltjük, megjegyezzük, és a betöltés végén újrarajzolást kérünk — a
  // rajzolás sosem vár a hálózatra.
  _ikonKep(url) {
    const meglevo = this._ikonTar.get(url);
    if (meglevo) return meglevo;

    const bejegyzes = { kep: new Image(), kesz: false, hibas: false };
    bejegyzes.kep.onload = () => {
      bejegyzes.kesz = true;
      this._ujrarajzolasKerese();
    };
    bejegyzes.kep.onerror = () => {
      bejegyzes.hibas = true;
      console.warn('SikidomRajzolo._ikonKep - az ikon nem tölthető be', { url });
    };
    bejegyzes.kep.src = url;

    this._ikonTar.set(url, bejegyzes);
    return bejegyzes;
  }

  // Lekerekített téglalap útvonala (a Canvas `roundRect`-je még nem mindenhol van meg)
  _lekerekitettTeglalap(x, y, szelesseg, magassag, sugar) {
    const c = this.rajzolo;
    const r = Math.max(0, Math.min(sugar, szelesseg / 2, magassag / 2));

    c.moveTo(x + r, y);
    c.lineTo(x + szelesseg - r, y);
    c.quadraticCurveTo(x + szelesseg, y, x + szelesseg, y + r);
    c.lineTo(x + szelesseg, y + magassag - r);
    c.quadraticCurveTo(x + szelesseg, y + magassag, x + szelesseg - r, y + magassag);
    c.lineTo(x + r, y + magassag);
    c.quadraticCurveTo(x, y + magassag, x, y + magassag - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }
}

// ===== EXPORTÁLÁS =====
export default { SikidomRajzolo, TOVABBI_FELIRAT_MIN_SUGAR };
