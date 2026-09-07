// koino/js/allapot/szerkesztesiVegrehajtas.js

// Felelősség: RÁVEZETNI az elfogadott egyezményeket az entitásokra.
//
// ===== ⛔⛔ MIÉRT SZÜLETETT EZ A FÁJL (2026-09-06, mérve) =====
//
// A Szakasz 5.3 (a kártyák) első órájában kiderült, hogy hiányzik a talaj alóluk:
//
//     javaslat: „MEGVALTOZTATOTT CIM"  →  ELFOGADVA  →  📜 EGYEZMÉNY megszületett
//     a gondolat viszont továbbra is:      tiFKe5ig  EREDETI CIM
//
// A `javaslatSzamitas.js` kiszámolta az egyezményt és megőrizte benne a `valtozas`-t — de
// az `allapotSzamitas.js` **soha nem olvasta**. A prototípusban ez külön réteg volt
// (`javaslatVegrehajtasiService` + négy végrehajtó); a P2P koinóban nem volt megépítve.
//
// ⭐ ÉS AMIÉRT ITT VAN A HELYE, NEM A FELÜLETEN: a kártya a címet mutatja. Ha a felület
// „javítaná ki", akkor **két igazság** lenne — egy a számításban, egy a rajzolásban —, és a
// parancssor mást mondana, mint a lap. *Ami DÖNT valamiről, az a számítás.*
//
// ===== A HÁROM FÁZIS =====
//
//   1. `allapotSzamitasa`      → az entitások ÚGY, AHOGY LÉTREJÖTTEK
//   2. `javaslatokSzamitasa`   → a döntések, és belőlük az EGYEZMÉNYEK (D17: számítás)
//   3. **`szerkesztesiEgyezmenyekAlkalmazasa`** ← EZ A FÁJL: az egyezmények rávezetése
//
// ⚠️ A sorrend nem cserélhető fel: a döntéshez kell az állapot (küszöbök, tudatpontok), az
// entitás végleges alakjához pedig kell a döntés. Ezért három fázis, nem kettő.
//
// ⭐ ÉS EZ A D8 GYAKORLATI ALAKJA: az egyezmény a **TÉNY** (örök, pillanatképpel együtt), az
// entitás mai alakja a **HATÁLY**. Ez a fájl a kettő között a nyíl.
//
// ===== ⚠️ CSAK A SZERKESZTÉSI EGYEZMÉNY HAJTÓDIK VÉGRE (D27) =====
//
// Az **általános** egyezmény a közösség álláspontja — abból nem következik entitás-változás,
// és soha nem is fog. Ez itt kemény szabály, nem elhagyott eset.
//
// Használják: a `koino.js` állapot-képe és a `pakli.js`.

import { szerkezetIgazitasa } from './allapotSzamitas.js';
import { lenyomat } from '../esemeny/kanonikusAlak.js';

// ===================================
// ⭐⭐⭐ A SZÁRMAZTATOTT AZONOSÍTÓ
// ===================================
//
// A különváláskor **új entitás születik**, amihez nem tartozik esemény — se a
// különválóknak, se senkinek. Kell tehát egy név, amit **minden készülék ugyanúgy számol
// ki**.
//
// ⭐ A KIMONDÁS (Csaba, 2026-09-07): *minden azonosító aláírt eseményekből SZÁMÍTHATÓ; a
// lenyomat ennek a különleges esete.* Itt a számítás bemenete két aláírt esemény
// azonosítója (a forrás entitásé és az egyezményé) — a kimenet ugyanolyan alakú, 43
// karakteres lenyomat, mint bármelyik másik. *Ránézésre nem különbözik; a különbség az,
// hogy nincs mögötte aláírás, csak levezetés.*
//
// ⚠️ EZÉRT LETT A HARMADIK FÁZIS ASZINKRON: a `lenyomat` a WebCryptót hívja, ami
// aszinkron. A másik út (kézzel gyártott, összefűzött név) elkerülte volna ezt, de akkor
// a koinóban kétféle azonosító-alak lenne — a hívók viszont amúgy is aszinkronok, tehát
// az ár kicsi, a nyereség pedig egységes azonosító-modell.
//
// ⚠️ A `kulonvalas` címke azért van benne, hogy a levezetés **ne ütközhessen** más,
// későbbi származtatással (pl. egyesítésnél): más címke, más név.
async function szarmaztatottAzonosito(forras, egyezmeny) {
  return lenyomat({ fajta: 'kulonvalas', forras, egyezmeny });
}

// ===================================
// A MŰVELETEK
// ===================================
//
// A domain négy szerkesztési műveletet ismer: módosítás, áthelyezés, törlés, egyesítés.
//
// ✅ 2026-09-07 óta MIND A NÉGY meg van építve. Az `Egyesites` jött utoljára, mert az az
// egyetlen, ami entitásokat von össze — és mert azonosító-kérdést vetett fel: Csaba
// döntése szerint **nem születik új azonosító, az ELSŐ érintett olvasztja be a többit**
// (lásd az `egyesites` függvénynél).
export const VEGREHAJTHATO = ['Modositas', 'Athelyezes', 'Torles', 'Egyesites'];
export const ISMERT_MUVELETEK = ['Modositas', 'Athelyezes', 'Torles', 'Egyesites'];

// ===================================
// A VÉGREHAJTÓK
// ===================================

/**
 * MÓDOSÍTÁS — a cím és/vagy a szöveg cseréje.
 *
 * ⚠️ Csak azt a mezőt írjuk át, amit a javaslat TÉNYLEG megnevezett. Egy `{ cim: 'Új' }`
 * változás nem törölheti a szöveget azzal, hogy nem beszélt róla.
 */
function modositas(entitas, valtozas) {
  const valtozott = [];

  if (typeof valtozas?.cim === 'string') {
    entitas.cim = valtozas.cim;
    valtozott.push('cim');
  }
  if (typeof valtozas?.szoveg === 'string' || valtozas?.szoveg === null) {
    entitas.szoveg = valtozas.szoveg;
    valtozott.push('szoveg');
  }

  if (!valtozott.length) return { rendben: false, ok: 'a változás nem nevezett meg mezőt' };
  return { rendben: true, mezok: valtozott };
}

/**
 * ÁTHELYEZÉS — más szülő alá.
 *
 * ⚠️⚠️ ÉS A CSAPDA, AMI MIATT NEM EGYSORNYI: egy áthelyezés **kört** csinálhat a fában
 * (A alá kerül B, miközben B már A leszármazottja). Egy kör az ág-összesítéseket és a
 * hierarchikus rendezést végtelen bejárásba vinné. ⭐ A `pakli.js` ugyan véd magát látogatott
 * halmazzal, de a helyes válasz az, hogy **a kört létre se hozzuk**.
 */
function athelyezes(entitas, valtozas, entitasok) {
  const ujSzulo = valtozas?.szulo ?? null;

  if (ujSzulo !== null && typeof ujSzulo !== 'string') {
    return { rendben: false, ok: 'az áthelyezés nem nevezett meg szülőt' };
  }
  if (ujSzulo === entitas.azonosito) {
    return { rendben: false, ok: 'egy entitás nem lehet a saját szülője' };
  }
  // A gyökérre helyezés (szulo: null) mindig rendben van.
  if (ujSzulo !== null) {
    if (!entitasok.has(ujSzulo)) {
      return { rendben: false, ok: 'a megnevezett szülő nem létezik (talán elfelejtették)' };
    }
    // ⛔ Kör-ellenőrzés: az új szülő nem lehet a saját leszármazottunk.
    const latott = new Set([entitas.azonosito]);
    let jaro = ujSzulo;
    while (jaro && entitasok.has(jaro)) {
      if (jaro === entitas.azonosito) {
        return { rendben: false, ok: '⛔ az áthelyezés KÖRT csinálna a fában' };
      }
      if (latott.has(jaro)) break;              // már meglévő kör: nem a mi dolgunk
      latott.add(jaro);
      jaro = entitasok.get(jaro).szulo;
    }
  }

  entitas.szulo = ujSzulo;
  return { rendben: true, mezok: ['szulo'] };
}

/**
 * ⭐⭐⭐ KÜLÖNVÁLÁS — az ellenzők külön ágra léphetnek a RÉGI változattal.
 *
 * *„Aki elmegy, viszi a súlyát."* A módosítás átment, tehát a főágon a MÓDOSÍTOTT szöveg
 * él tovább. Aki viszont **ellenezte ÉS kérte a külön ágat**, az elviszi magával a
 * **régi** állapotot egy új ágra — a tudatpontjával együtt.
 *
 * ⚠️ A TUDATPONT ÁTKERÜL, NEM DUPLÁZÓDIK: a főág prioritása ennyivel csökken. *Ez a
 * szétválás ára.*
 *
 * ⭐ ÉS A KÉT ÁG ÖSSZE VAN KÖTVE: mindkettő jegyzi, melyik egyezményből vált szét, és hol a
 * testvére (`kulonvalasok`). ⚠️ Ez a mező **a prototípus kártyájának alakja** — a
 * `GondolatKartya.js` „Másik ág" füle pontosan ezt olvassa. *Nem kell kitalálni.*
 *
 * @param {Object} entitas - a főág (MÁR módosítva)
 * @param {Object} regi - a módosítás ELŐTTI állapot: { cim, szoveg }
 * @param {Array<string>} kulonvalok - akik ellenezték és külön ágat kértek
 * @param {Object} egyezmeny
 * @param {Object} allapot
 * @returns {Promise<Object|null>} a különválás összegzése, vagy null
 */
async function kulonvalas(entitas, regi, kulonvalok, egyezmeny, allapot) {
  // ⭐ Csak az számít, akinek TÉNYLEG van pontja az entitáson. Aki időközben elvette,
  // annak nincs mit vinnie — ez nem hiba, csak nincs teendő (a prototípus is így kezeli).
  const viszik = kulonvalok
    .map((szerzo) => ({ szerzo, adat: entitas.hozzajarulok.get(szerzo) }))
    .filter((x) => (x.adat?.pont ?? 0) > 0);

  if (!viszik.length) return null;

  // ⛔⛔ A FŐÁG NEM ESHET NULLÁRA. Ha MINDENKI külön akar válni, akkor nincs kettéválás —
  // az „új ág" maga a gondolat lenne, a régi pedig gazdátlanul eltűnne (D14). Ilyenkor a
  // helyes válasz: nem történik semmi, és ez LÁTSZIK. *A szétválás két oldalt kíván.*
  const maradok = [...entitas.hozzajarulok.keys()].filter(
    (sz) => !viszik.some((v) => v.szerzo === sz));
  if (!maradok.length) return { rendben: false, ok: 'mindenki külön válna — nem maradna főág' };

  const ujAzonosito = await szarmaztatottAzonosito(entitas.azonosito, egyezmeny.javaslat);

  // ----- AZ ÚJ ÁG -----
  // ⭐ A RÉGI változatot viszi, a különválók pontjaival. A szerzője és a létrehozás ideje
  // az EREDETIÉ: az új ág nem új gondolat, hanem a réginek a folytatása.
  const ujAg = {
    azonosito: ujAzonosito,
    tipus: entitas.tipus,
    cim: regi.cim,
    szoveg: regi.szoveg,
    szulo: entitas.szulo,
    ikon: entitas.ikon ?? null,
    gondolatTipus: entitas.gondolatTipus ?? null,
    kategoriak: [...(entitas.kategoriak ?? [])],
    meret: entitas.meret,
    agMeret: entitas.meret,
    szerzo: entitas.szerzo,
    letrehozva: entitas.letrehozva,
    osszesPont: 0,
    hozzajarulok: new Map(),
    kuszobok: entitas.kuszobok
  };

  // ----- A PONTOK ÁTVITELE -----
  for (const { szerzo, adat } of viszik) {
    ujAg.hozzajarulok.set(szerzo, { pont: adat.pont, szerep: adat.szerep });
    ujAg.osszesPont += adat.pont;
    entitas.osszesPont -= adat.pont;
    entitas.hozzajarulok.delete(szerzo);
  }

  allapot.entitasok.set(ujAzonosito, ujAg);

  // ----- A KÉT ÁG ÖSSZEKÖTÉSE (a kártya „Másik ág" füle) -----
  const mikor = egyezmeny.megszuletett;
  entitas.kulonvalasok = [...(entitas.kulonvalasok ?? []), {
    testverId: ujAzonosito, testverTipus: ujAg.tipus, testverCim: ujAg.cim,
    agSzerep: 'foag', kulonvalasIdeje: mikor, egyezmeny: egyezmeny.javaslat
  }];
  ujAg.kulonvalasok = [{
    testverId: entitas.azonosito, testverTipus: entitas.tipus, testverCim: entitas.cim,
    agSzerep: 'mellekag', kulonvalasIdeje: mikor, egyezmeny: egyezmeny.javaslat
  }];

  return {
    rendben: true,
    foag: entitas.azonosito,
    kulonvaltAg: ujAzonosito,
    atvittEmberek: viszik.length,
    atvittPontok: viszik.reduce((ossz, v) => ossz + v.adat.pont, 0)
  };
}

/**
 * ⭐⭐ TÖRLÉS — és a prototípusban ez NEM „törlés", hanem VISSZAOSZTÁS.
 *
 * A `torlesiVegrehajto.js` egyetlen érdemi lépést tesz: `tudatpontokVisszaosztasa` —
 * mindenkinek visszaadja a pontjait az entitásról, és **az entitás ettől szűnik meg
 * létezni**, mert 0 pontnál a modell szerint nincs is (D14). *A törlés tehát nem külön
 * mechanizmus, hanem a felejtés kiváltása.*
 *
 * ⚠️⚠️ ÉS ITT EGY VALÓDI ELTÉRÉS, AMIT KI KELL MONDANI. A prototípus szervere **mások
 * nevében** állította nullára a pontokat. A koinóban ez **lehetetlen és nem is szabad**: a
 * tudatpont-rendezés ALÁÍRT esemény, és senki nem írhat alá helyettem (D15). Ezért:
 *
 *   · az entitás **megszűnik létezni** — ez a prototípus eredménye, és ez a fontos;
 *   · a pontok viszont a gazdájuk keretében **maradnak lekötve**, amíg ő maga vissza nem
 *     veszi őket egy `TudatpontRendezes(entitás, 0)` eseménnyel — ez a **kézi út**
 *     (4. szabály), és a felület fel is ajánlhatja.
 *
 * ⭐ A gyerekek NEM tűnnek el: a `szerkezetIgazitasa` felviszi őket a legközelebbi élő
 * felmenőhöz — pontosan a prototípus kaszkádja.
 *
 * ⭐ És ezzel **az egyezmény helye is megoldódik magától** (a leltár 2.2 pontja: *„Törlés →
 * az érintett szülője"*): a szerkesztési egyezmény ugyanaz az entitás, mint a javaslat, a
 * szülője pedig az érintett — ha az érintett eltűnik, az árva-szabály **felviszi a törölt
 * entitás szülőjéhez**. Külön eset nélkül, ugyanabból a szabályból.
 */
function torles(entitas, allapot, egyezmeny) {
  allapot.entitasok.delete(entitas.azonosito);

  // ⭐ FELSOROLJUK, MI TŰNT EL — ugyanabban a listában, ahol a felejtés is látszik (D19).
  // Így a felület egy helyről tudja megmondani: „ez az entitás már nincs".
  if (Array.isArray(allapot.elfelejtettek) && !allapot.elfelejtettek.includes(entitas.azonosito)) {
    allapot.elfelejtettek.push(entitas.azonosito);
  }

  // ⛔⛔ ÉS KÜLÖN IS: EZ TÖRLÉS VOLT, NEM BEOLVASZTÁS. A kettő ugyanúgy „eltűnés", de a
  // TUDATPONT sorsa ellentétes:
  //
  //   · TÖRLÉSNÉL a pontom a semmin ül — el van akadva, vissza kell vennem;
  //   · EGYESÍTÉSNÉL a pontom ÁTMENT az elnyelőbe — ha „visszavenném", elveszne.
  //
  // ⚠️ Ez nem elméleti: ha a felszabadítás a puszta `elfelejtettek` listát nézné, a
  // beolvasztott forrásra is ráírna egy `pont: 0`-t — és a következő számításnál a
  // forrás már 0 ponttal jönne létre, tehát az egyesítés **nem találná meg a pontjaimat**.
  // *Ugyanaz a szó, két ellentétes következmény: külön listát kíván.*
  //
  // ⭐⭐ ÉS A DÖNTÉS JELÉT IS ELTESSZÜK. A felszabadítás ebből tudja meg, hogy UGYANARRÓL
  // a döntésről van-e szó — ha nem, a megülepedés számlálója nulláról indul.
  //
  // ⚠️ A jel a lezárás idejénél TÖBB: benne van a **szavazás állása** is. Egy próba
  // mutatott rá, hogy ez kell: egy késve érkező szavazat, ami a bizonyosságot nem mozdítja
  // (mert az eredmény úgyis egyöntetű volt), **nem változtatja meg a lezárás idejét** —
  // pedig épp azt jelzi, hogy MÉG MINDIG ÉRKEZNEK késői események erről a döntésről.
  // *Amit mérni akarunk, az nem a döntés stabilitása, hanem a csend.*
  if (!Array.isArray(allapot.torlesek)) allapot.torlesek = [];
  const p = egyezmeny.pillanatkep ?? {};
  allapot.torlesek.push({
    entitas: entitas.azonosito,
    javaslat: egyezmeny.javaslat,
    megszuletett: egyezmeny.megszuletett,
    allas: [egyezmeny.javaslat, egyezmeny.megszuletett,
      p.tamogatok, p.ellenzok, p.tartozkodok, p.szavazok, p.nevezo].join('|'),
    // ⭐⭐ ÉS KIK VOLTAK A GAZDÁI — a felszabadítás BIZONYÍTÉKÁHOZ (2026-09-08).
    //
    // Ők azok, akik ezt a döntést még megfordíthatnák egy késve érkező, de határidőn
    // belüli szavazattal. ⭐ Ha MINDEGYIKÜK láncát ismerem a lezárás UTÁNI pontig, akkor
    // egyikük sem tud már visszamenőleg beszavazni — az a saját láncában visszafelé lépő
    // idő lenne, amit a koino felsorol. *Bizonyíték, nem valószínűség.*
    //
    // ⚠️ A törlés UTÁN már nem olvasható ki, ezért itt kell feljegyezni — ugyanaz a
    // sorrend-kényszer, mint a prototípus `torlesiVegrehajto`-jánál a szülővel.
    gazdak: [...entitas.hozzajarulok.keys()]
  });

  return {
    rendben: true,
    eltunt: true,
    mezok: ['torolve'],
    // A gazdák, akiknek a pontja lekötve maradt — a felület ebből ajánlhatja a visszavételt.
    lekotottGazdak: [...entitas.hozzajarulok.keys()]
  };
}

/**
 * A LEGKÖZELEBBI KÖZÖS ŐS — a prototípus `_legkozelebbiKozosSzulo`-ja.
 *
 * *„Minden forráshoz felépítjük az ős-láncot (a forrásokat kihagyva), és az első olyan őst
 * választjuk, ami MINDEGYIK láncban szerepel (a legmélyebbet)."* Ha nincs közös ős, a
 * gyökér (`null`).
 *
 * ⭐ Ide kerül az egyesített gondolat, ha a javaslat nem mond mást. Ha a források egy
 * szülő alatt vannak, ez pontosan az a szülő — vagyis a szokásos esetben **semmi nem
 * mozdul**.
 */
function legkozelebbiKozosOs(entitasok, forrasAzonositok) {
  const lancok = [];
  for (const azonosito of forrasAzonositok) {
    const lanc = [];
    const latott = new Set([azonosito]);
    let jaro = entitasok.get(azonosito)?.szulo ?? null;
    while (jaro !== null && entitasok.has(jaro)) {
      if (latott.has(jaro)) break;                       // ⛔ kör-őr
      latott.add(jaro);
      if (!forrasAzonositok.has(jaro)) lanc.push(jaro);  // a forrásokat kihagyjuk
      jaro = entitasok.get(jaro).szulo ?? null;
    }
    lancok.push(lanc);
  }
  if (!lancok.length) return null;

  const [elso, ...tobbi] = lancok;
  for (const os of elso) {
    if (tobbi.every((lanc) => lanc.includes(os))) return os;
  }
  return null;
}

/**
 * ⭐⭐⭐ EGYESÍTÉS — és ez az EGYETLEN művelet, ami entitásokat von össze.
 *
 * A prototípus `egyesitesiVegrehajto.js`-e hét lépésben dolgozik: összesíti emberenként a
 * pontokat MINDEN forrásról → kiüríti a forrásokat (azok eltűnnek) → **létrehoz egy új
 * entitást** → ráteszi az összesített pontokat → a források gyerekeit **az ÚJ entitás alá**
 * köti (⭐ szándékosan NEM a nagyszülőhöz — ezért gyűjti össze őket a törlés ELŐTT) → és
 * az egyezményt is oda helyezi.
 *
 * ⚠️⚠️ EGY DOLGOT VÁLTOZTATTUNK, ÉS EZ CSABA DÖNTÉSE (2026-09-07): **nem születik új
 * azonosító — az ELSŐ érintett olvasztja be a többit.**
 *
 * Miért: a koinóban **minden azonosító egy aláírt esemény lenyomata**, és ezen áll az egész
 * ellenőrizhetőség. Egy „új" entitáshoz nem tartozna esemény (a javaslaté már foglalt — az
 * az egyezményé), tehát egy **második származtatott azonosítót** kellene bevezetni, amit
 * senki nem írt alá. ⭐ Az elnyelés ezt elkerüli, és ráadásul **több logikai kapcsolatot
 * old meg magától**:
 *
 *   · a rá mutató RÉGI HIVATKOZÁSOK megmaradnak — ugyanaz az elv, mint a különválásnál:
 *     *„a főág tartja meg az azonosítót"*;
 *   · az EGYEZMÉNY HELYE is jó lesz külön szabály nélkül (a javaslat szülője úgyis az első
 *     érintett), pedig a prototípusban ehhez placeholder-feloldás kellett.
 *
 * ⚠️ Az ára: az egyesített gondolat az elnyelő **történetét folytatja** (szerző, létrehozás
 * ideje, mérete), nem a javaslattevőét — a prototípusban új entitás születik új szerzővel.
 */
function egyesites(allapot, egyezmeny, kik, alkalmazottak, kihagyottak) {
  const entitasok = allapot.entitasok;
  const elnyelo = entitasok.get(kik[0].entitas);

  if (!elnyelo) {
    kihagyottak.push({
      javaslat: egyezmeny.javaslat, erintett: kik[0].entitas, muvelet: 'Egyesites',
      ok: 'az elnyelő entitás nem létezik (elfelejtették, vagy még nem ismerjük)'
    });
    return { rendben: false };
  }

  // ----- 1. A FORRÁSOK -----
  const forrasAzonositok = new Set(kik.map((r) => r.entitas));
  const forrasok = [];
  for (const r of kik.slice(1)) {
    const e = entitasok.get(r.entitas);
    if (e) forrasok.push(e);
    else {
      // ⚠️ A hiányzó forrás nem hiba (D19) — a többit attól még összevonjuk.
      kihagyottak.push({
        javaslat: egyezmeny.javaslat, erintett: r.entitas, muvelet: 'Egyesites',
        ok: 'ez a forrás nem létezik (elfelejtették, vagy még nem ismerjük)'
      });
    }
  }

  // ----- 2. ⭐ A GYEREKEK ÖSSZEGYŰJTÉSE — MÉG A FORRÁSOK ELTŰNÉSE ELŐTT -----
  // ⛔ A SORREND ITT LÉNYEG: ha később gyűjtenénk, az árva-szabály már felvitte volna őket
  // a NAGYSZÜLŐHÖZ — a prototípus épp ezért gyűjti a törlés előtt. Az egyesítésnél a
  // gyerekek helye az ELNYELŐ, nem a nagyszülő: *ami a beolvasztott gondolat alatt volt,
  // az az egyesített gondolat alá tartozik.*
  const atkotendok = [];
  for (const e of entitasok.values()) {
    if (e.szulo && forrasAzonositok.has(e.szulo) && !forrasAzonositok.has(e.azonosito)) {
      atkotendok.push(e);
    }
  }

  // ----- 3. A HELY: a legközelebbi közös ős (vagy amit a javaslat mond) -----
  const kimondottSzulo = kik[0].valtozas?.szulo;
  const ujSzulo = kimondottSzulo !== undefined
    ? kimondottSzulo
    : legkozelebbiKozosOs(entitasok, forrasAzonositok);

  // ----- 4. ⭐ A PONTOK ÖSSZEOLVADNAK -----
  // ⚠️ Ez SZÁMÍTÁS a már aláírt eseményekből, nem új aláírás: a pont ugyanannyi marad
  // emberenként, csak arra az entitásra mutat, amivé a gondolat lett. *A gondolat
  // beolvad, a rátett súly vele megy.*
  for (const forras of forrasok) {
    for (const [szerzo, adat] of forras.hozzajarulok) {
      const meglevo = elnyelo.hozzajarulok.get(szerzo);
      if (!meglevo) elnyelo.hozzajarulok.set(szerzo, { pont: adat.pont, szerep: adat.szerep });
      else {
        meglevo.pont += adat.pont;
        // ⭐ Aki BÁRMELYIK forráson aktív volt, az az egyesítettben is aktív: a
        // részvételt nem veheti el tőle, hogy máshol csak figyelt.
        if (adat.szerep === 'aktiv') meglevo.szerep = 'aktiv';
      }
    }
  }
  elnyelo.osszesPont = [...elnyelo.hozzajarulok.values()].reduce((ossz, a) => ossz + a.pont, 0);

  // ----- 5. A FORRÁSOK ELTŰNNEK -----
  for (const forras of forrasok) {
    entitasok.delete(forras.azonosito);
    if (Array.isArray(allapot.elfelejtettek)) allapot.elfelejtettek.push(forras.azonosito);
  }

  // ----- 6. A GYEREKEK AZ ELNYELŐHÖZ -----
  for (const gyerek of atkotendok) {
    if (!entitasok.has(gyerek.szulo)) gyerek.szulo = elnyelo.azonosito;
  }

  // ----- 7. AZ EGYESÍTETT CÍM ÉS SZÖVEG, ÉS A HELY -----
  const mezok = ['pontok'];
  const cimCsere = modositas(elnyelo, kik[0].valtozas);
  if (cimCsere.rendben) mezok.push(...cimCsere.mezok);
  if (ujSzulo !== elnyelo.szulo && ujSzulo !== elnyelo.azonosito) {
    elnyelo.szulo = ujSzulo ?? null;
    mezok.push('szulo');
  }

  alkalmazottak.push({
    javaslat: egyezmeny.javaslat, erintett: elnyelo.azonosito,
    muvelet: 'Egyesites', mezok,
    beolvasztott: forrasok.map((f) => f.azonosito)
  });
  return { rendben: true, eltunt: forrasok.length > 0 };
}

// ===================================
// AZ ALKALMAZÁS
// ===================================

/**
 * Rávezeti az elfogadott, SZERKESZTÉSI egyezményeket az entitásokra.
 *
 * ⚠️ Az `allapot.entitasok` térképét HELYBEN módosítja — az `allapotSzamitasa` minden
 * híváskor friss objektumot ad, tehát nincs, ami alatta elmozdulhatna.
 *
 * @param {Object} allapot - az `allapotSzamitasa` eredménye
 * @param {Map} javaslatok - a `javaslatokSzamitasa` eredménye
 * @returns {{alkalmazottak: Array, kihagyottak: Array}}
 */
export async function szerkesztesiEgyezmenyekAlkalmazasa(allapot, javaslatok) {
  console.log('szerkesztesiEgyezmenyekAlkalmazasa - KEZDÉS', { javaslat: javaslatok?.size ?? 0 });

  const alkalmazottak = [];
  const kihagyottak = [];
  // ⭐ A KÜLÖNVÁLÁSOK is felsorolódnak — ugyanaz a minta (D19): ami történt, az látszik.
  const kulonvalasok = [];

  // ----- 1. AMIK EGYÁLTALÁN SZÁMÍTANAK -----
  const sorban = [];
  for (const j of javaslatok?.values() ?? []) {
    if (!j.egyezmeny) continue;                        // nincs elfogadva
    if (j.fajta !== 'szerkesztesi') continue;          // ⭐ az általánosból nem következik semmi (D27)
    sorban.push(j.egyezmeny);
  }

  // ----- 2. ⭐ DETERMINISZTIKUS SORREND -----
  //
  // Ha két egyezmény ugyanazt az entitást írja át, a sorrend eldönti, melyik marad felül.
  // ⚠️ Nem szabad a térkép bejárási sorrendjére bízni: az a beszúrás sorrendje, ami két
  // gépen eltérhet — és akkor **a két gép más címet mutatna**. Ugyanaz a hiba-fajta, amit
  // az `allapotSzamitas.js` `rendezettBemenet`-je zárt ki.
  //
  // A `megszuletett` MINDEN gépen ugyanaz a szám (a javaslat eseményéből számoljuk), tehát
  // itt használható — a holtversenyt a javaslat azonosítója dönti el.
  sorban.sort((a, b) => (a.megszuletett - b.megszuletett)
    || (a.javaslat < b.javaslat ? -1 : a.javaslat > b.javaslat ? 1 : 0));

  // ----- 3. VÉGREHAJTÁS -----
  // ⭐⭐ EGY EGYEZMÉNY TÖBB ENTITÁST IS ÉRINTHET (2026-09-07), és **entitásonként más
  // művelettel** — a prototípus `erintettEntitasok` tömbje minden elemen saját `muvelet`-et
  // hordoz. Ezért a lista minden elemét külön hajtjuk végre, és külön is számoljuk be az
  // alkalmazottak/kihagyottak közé: egy elem elakadása nem dönti el a többit.
  //
  // ⭐ A SZÜLŐKET ELŐRE FELJEGYEZZÜK, mert a `Torles` után már nem olvashatók ki — pontosan
  // úgy, ahogy a prototípus `torlesiVegrehajto`-ja is a törlés ELŐTT olvassa ki a szülőt
  // (*„a törlés UTÁN már nem olvasható ki"*).
  const eredetiSzulok = new Map();
  for (const [azonosito, e] of allapot.entitasok) eredetiSzulok.set(azonosito, e.szulo ?? null);
  let eltunt = false;

  for (const egyezmeny of sorban) {
    const kik = Array.isArray(egyezmeny.erintettek) && egyezmeny.erintettek.length
      ? egyezmeny.erintettek
      : [{ entitas: egyezmeny.erintett, muvelet: egyezmeny.muvelet, valtozas: egyezmeny.valtozas }];

    // ⭐⭐ AZ EGYESÍTÉS AZ EGYETLEN, AMI NEM ELEMENKÉNTI: a források EGY entitássá válnak,
    // tehát egyben kell végrehajtani. ⚠️ A szabály-réteg garantálja, hogy az egyesítés nem
    // keveredhet más művelettel (a prototípus Csomag-validátora), ezért elég az `every`.
    if (kik.length && kik.every((r) => r.muvelet === 'Egyesites')) {
      const eredmeny = egyesites(allapot, egyezmeny, kik, alkalmazottak, kihagyottak);
      if (eredmeny?.eltunt) eltunt = true;
      continue;
    }

    for (const resz of kik) {
      const eredmeny = await egyReszVegrehajtasa(allapot, egyezmeny, resz, alkalmazottak,
        kihagyottak, kulonvalasok);
      if (eredmeny?.eltunt) eltunt = true;
    }
  }

  // ----- 4. ⭐ A SZERKEZET ÚJRAIGAZÍTÁSA, HA TŰNT EL ENTITÁS -----
  // A törlés és az egyesítés entitásokat vesz ki a térképből — az árváknak fel kell
  // kerülniük a legközelebbi élő felmenőhöz, és az ág-méretek elavultak. ⭐ Ugyanaz a
  // lépés, mint a felejtésnél (D14): egy forrásból, hogy a kettő ne csúszhasson szét.
  if (eltunt) szerkezetIgazitasa(allapot.entitasok, eredetiSzulok);

  // ⭐ A KIHAGYOTTAKAT FELSOROLJUK, NEM ELHALLGATJUK — ugyanaz a minta, mint a
  // `szabalyok.js` szabálysértő eseményeinél (D19): a program bejelent, nem bíráskodik.
  allapot.szerkesztesiAlkalmazasok = alkalmazottak;
  allapot.szerkesztesiKihagyasok = kihagyottak;
  allapot.kulonvalasok = kulonvalasok;

  console.log('szerkesztesiEgyezmenyekAlkalmazasa - VÉGE',
    { alkalmazott: alkalmazottak.length, kihagyott: kihagyottak.length,
      kulonvalas: kulonvalasok.length });
  return { alkalmazottak, kihagyottak, kulonvalasok };
}

/**
 * Egy egyezmény EGY érintettjének végrehajtása.
 *
 * ⚠️ Külön függvény, mert a művelet **entitásonkénti**: egy csomag-javaslatban az egyik
 * entitás módosul, a másik áthelyeződik. Ha egy elem elakad, a többi attól még mehet — és
 * a `kihagyottak` megmondja, melyik akadt el és miért.
 */
async function egyReszVegrehajtasa(allapot, egyezmeny, resz, alkalmazottak, kihagyottak,
                                   kulonvalasok = []) {
  const muvelet = resz.muvelet ?? 'Modositas';
  const entitas = allapot.entitasok.get(resz.entitas);

  // ⚠️ A HIÁNYZÓ ENTITÁS NEM HIBA (D14/D19): lehet, hogy időközben elfelejtették (0
  // tudatpont), vagy még nem érkezett meg hozzánk. Nem vád, csak „nem hajtható végre".
  if (!entitas) {
    kihagyottak.push({
      javaslat: egyezmeny.javaslat, erintett: resz.entitas, muvelet,
      ok: 'az érintett entitás nem létezik (elfelejtették, vagy még nem ismerjük)'
    });
    return;
  }

  let eredmeny;
  if (muvelet === 'Modositas') {
    // ⭐ A RÉGI ÁLLAPOT A MÓDOSÍTÁS ELŐTT — ezt viszik a különválók. A prototípus is a
    // felülírás ELŐTT menti el (`regiAdatok`); utána már nem lenne visszafejthető.
    const regi = { cim: entitas.cim, szoveg: entitas.szoveg };
    eredmeny = modositas(entitas, resz.valtozas);

    // ⭐⭐ ÉS AKI ELLENEZTE, DE KÜLÖN ÁGAT KÉRT, AZ MOST LÉP KI (2026-09-08).
    // ⚠️ Csak SIKERES módosítás után: ha nem változott semmi, nincs miről különválni.
    const kik = egyezmeny.kulonvalok?.[resz.entitas] ?? [];
    if (eredmeny.rendben && kik.length) {
      const kv = await kulonvalas(entitas, regi, kik, egyezmeny, allapot);
      if (kv?.rendben) kulonvalasok.push({ javaslat: egyezmeny.javaslat, ...kv });
      else if (kv) {
        kihagyottak.push({
          javaslat: egyezmeny.javaslat, erintett: resz.entitas,
          muvelet: 'Kulonvalas', ok: kv.ok
        });
      }
    }
  } else if (muvelet === 'Athelyezes') {
    eredmeny = athelyezes(entitas, resz.valtozas, allapot.entitasok);
  } else if (muvelet === 'Torles') {
    eredmeny = torles(entitas, allapot, egyezmeny);
  } else if (ISMERT_MUVELETEK.includes(muvelet)) {
    // ⭐ ISMERT, DE MÉG NINCS VÉGREHAJTÓJA — és ez LÁTSZIK, nem néma.
    eredmeny = { rendben: false, ok: 'ehhez a művelethez még nincs végrehajtó' };
  } else {
    eredmeny = { rendben: false, ok: 'ismeretlen művelet: ' + muvelet };
  }

  if (eredmeny.rendben) {
    alkalmazottak.push({
      javaslat: egyezmeny.javaslat, erintett: resz.entitas,
      muvelet, mezok: eredmeny.mezok
    });
  } else {
    kihagyottak.push({
      javaslat: egyezmeny.javaslat, erintett: resz.entitas,
      muvelet, ok: eredmeny.ok
    });
  }
  return eredmeny;
}
