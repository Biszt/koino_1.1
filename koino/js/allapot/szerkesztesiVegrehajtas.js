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

import { szerkezetIgazitasa, median } from './allapotSzamitas.js';
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
  // ⚠️⚠️ A SZÖVEG KÉTFÉLE ALAKÚ LEHET, és ez nem rendetlenség, hanem történet: a
  // parancssor egyszerű **szöveget** ad (egy sor), a szerkesztő viszont **blokkok
  // tömbjét** (5.7) — ugyanaz a mező, két alak, ahogy a prototípusban is.
  //
  // ⛔ EZ ELŐSZÖR CSAK A SZÖVEGET FOGADTA EL, és a tömb **némán kiesett**: a módosítás
  // lefutott, a cím átíródott, a szöveg viszont a régi maradt — hiba nélkül. *Egy
  // elhallgatott mező rosszabb, mint egy elutasított javaslat.*
  const szoveg = valtozas?.szoveg;
  if (typeof szoveg === 'string' || szoveg === null || Array.isArray(szoveg)) {
    entitas.szoveg = szoveg;
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
 * ⭐ A KÜSZÖBÖK ÚJRASZÁMOLÁSA egy adott gazda-körre — a különváláshoz.
 *
 * *„Az érték javaslatok is mennek — ezért térhetnek el a két ág küszöbei."* A prototípus a
 * pont-átvitel UTÁN viszi át a különválók érték javaslatait, mert **érték javaslatot csak
 * az adhat, akinek van tudatpontja az entitáson**. Itt ugyanez számításként: az adott
 * entitásra tett érték javaslatokból csak azoké számít, akik a megadott körbe tartoznak.
 *
 * ⚠️ Ha egyiküknek sincs érték javaslata, `null`-t adunk — a hívó ilyenkor a forrás
 * küszöbeit örökíti tovább (jobb, mint az alapértelmezésre esni).
 */
function kuszobokKorre(allapot, entitasAzonosito, kor) {
  const KUSZOB_NEVEK = ['elfogadasiKuszob', 'reszveteliKuszob', 'minimumDontesiIdo', 'maximumDontesiIdo'];
  const halmaz = new Set(kor);
  const ertekek = [];

  for (const [kulcs, ertek] of allapot.ertekJavaslatok ?? []) {
    const hatar = kulcs.lastIndexOf('|');
    if (kulcs.slice(hatar + 1) !== entitasAzonosito) continue;
    if (!halmaz.has(kulcs.slice(0, hatar))) continue;
    ertekek.push(ertek);
  }
  if (!ertekek.length) return null;

  const eredmeny = {};
  for (const nev of KUSZOB_NEVEK) {
    const szamok = ertekek.map((e) => e?.[nev]).filter((sz) => typeof sz === 'number');
    if (szamok.length) eredmeny[nev] = median(szamok);
  }
  return { kuszobok: eredmeny, ertekelok: ertekek.length };
}

/**
 * ⭐⭐⭐ A LESZÁRMAZOTTAK SZÉTOSZTÁSA — egyenként, három kimenettel.
 *
 * A prototípus `_leszarmazottakSzetosztasa`-ja: minden leszármazottnál külön megnézzük, kinek
 * van rajta pontja, és ebből három eset lehet:
 *
 *   · **MARAD** — a különválók közül senkinek nincs rajta pontja. ⚠️ Ha a szülője elköltözött,
 *     ez árván maradna: a legközelebbi MEGMARADT ősre kötjük át (Csaba, 2026-08-25).
 *   · **KÖLTÖZIK** — csak a különválóknak van rajta pontja: az egész entitás átvándorol,
 *     a pontjaival együtt. Nincs pont-mozgatás, csak a szülője változik.
 *   · **DUPLÁZÓDIK** — mindkét oldalnak van rajta pontja, tehát mindkét ágon kell egy példány.
 *
 * ⭐⭐ ÉS A DUPLÁZÓDÁSNÁL A FEJSZÁM DÖNT (Csaba, 2026-09-08): *„ha többen vannak valahol a
 * radikális ellenzők, mint a többiek, akkor ők tarthatják meg az id-t."* Vagyis **az eredeti
 * azonosítót az az oldal viszi, ahol TÖBB EMBER áll** — a másik oldal kapja a származtatott
 * nevet. ⚠️ Egyenlőségnél a **főág** tartja: valamit dönteni kell, és ez a determinisztikus,
 * senkit nem jutalmazó választás (ugyanaz a mintázat, mint az elágazás-feloldásnál).
 *
 * ⚠️ **A gyökérnél NEM a fejszám dönt, hanem a főág tartja az azonosítót** — ez a prototípus
 * viselkedése, és Csaba a fejszám-szabályt a duplázódó leszármazottakra mondta ki. ⏸️ Ha a
 * gyökérre is ki kell terjeszteni, az külön döntés.
 *
 * @returns {Promise<{marad: number, koltozott: number, duplazodott: number, ujak: Array}>}
 */
async function leszarmazottakSzetosztasa(allapot, foag, ujAg, kulonvalok, egyezmeny) {
  const entitasok = allapot.entitasok;

  // ----- A GYEREK-TÉRKÉP, DETERMINISZTIKUS SORRENDBEN -----
  // ⚠️ A sorrend nem mindegy: a duplázódásnál új entitások születnek, és két gépnek
  // ugyanazokat a neveket kell adnia. Az azonosító szerinti rendezés ezt garantálja.
  const gyerekek = new Map();
  for (const e of entitasok.values()) {
    if (!e.szulo) continue;
    if (!gyerekek.has(e.szulo)) gyerekek.set(e.szulo, []);
    gyerekek.get(e.szulo).push(e);
  }
  for (const lista of gyerekek.values()) {
    lista.sort((a, b) => (a.azonosito < b.azonosito ? -1 : a.azonosito > b.azonosito ? 1 : 0));
  }

  // A két „legközelebbi ős" nyilvántartás — a gyökér mindkettőben önmaga párja.
  const ujAgSzuloje = new Map([[foag.azonosito, ujAg.azonosito]]);
  const foagSzuloje = new Map([[foag.azonosito, foag.azonosito]]);

  const eredmeny = { marad: 0, koltozott: 0, duplazodott: 0, ujak: [] };

  // ----- BEJÁRÁS: SZÜLŐ ELŐBB, MINT A GYEREK -----
  // ⛔ Kör-őrrel: egy kör itt végtelen ciklus lenne.
  const sor = [...(gyerekek.get(foag.azonosito) ?? [])];
  const latott = new Set([foag.azonosito]);

  while (sor.length) {
    const e = sor.shift();
    if (latott.has(e.azonosito)) continue;
    latott.add(e.azonosito);
    for (const gy of (gyerekek.get(e.azonosito) ?? [])) sor.push(gy);

    const viszik = kulonvalok.filter((sz) => (e.hozzajarulok.get(sz)?.pont ?? 0) > 0);
    const maradok = [...e.hozzajarulok.keys()].filter((sz) => !viszik.includes(sz));

    // ----- (1) MARAD -----
    if (!viszik.length) {
      const hova = foagSzuloje.get(e.szulo) ?? foag.azonosito;
      if (e.szulo !== hova) e.szulo = hova;          // árva lett → átkötés
      foagSzuloje.set(e.azonosito, e.azonosito);
      ujAgSzuloje.set(e.azonosito, ujAgSzuloje.get(e.szulo) ?? ujAg.azonosito);
      eredmeny.marad++;
      continue;
    }

    // ----- (2) KÖLTÖZIK -----
    if (!maradok.length) {
      e.szulo = ujAgSzuloje.get(e.szulo) ?? ujAg.azonosito;
      ujAgSzuloje.set(e.azonosito, e.azonosito);
      foagSzuloje.set(e.azonosito, foagSzuloje.get(e.szulo) ?? foag.azonosito);
      eredmeny.koltozott++;
      continue;
    }

    // ----- (3) DUPLÁZÓDIK — és a FEJSZÁM dönti el, ki tartja az azonosítót -----
    const kulonvaloTartja = viszik.length > maradok.length;
    const masolatAzonosito = await szarmaztatottAzonosito(e.azonosito, egyezmeny.javaslat);

    // Az EREDETI példány azé az oldalé, ahol többen vannak; a MÁSOLAT a másiké.
    const eredetiOldalon = kulonvaloTartja ? viszik : maradok;
    const masolatOldalon = kulonvaloTartja ? maradok : viszik;

    const masolat = {
      azonosito: masolatAzonosito,
      tipus: e.tipus,
      cim: e.cim,
      szoveg: e.szoveg,
      // A másolat a MÁSIK ágra kerül, mint az eredeti.
      szulo: kulonvaloTartja
        ? (foagSzuloje.get(e.szulo) ?? foag.azonosito)
        : (ujAgSzuloje.get(e.szulo) ?? ujAg.azonosito),
      ikon: e.ikon ?? null,
      gondolatTipus: e.gondolatTipus ?? null,
      kategoriak: [...(e.kategoriak ?? [])],
      meret: e.meret,
      agMeret: e.meret,
      // ⭐ A SZERZŐ MÁSOLÓDIK (Csaba) — attól függetlenül, hogy tulajdonos-e még.
      szerzo: e.szerzo,
      letrehozva: e.letrehozva,
      osszesPont: 0,
      hozzajarulok: new Map(),
      kuszobok: e.kuszobok
    };

    for (const sz of masolatOldalon) {
      const adat = e.hozzajarulok.get(sz);
      masolat.hozzajarulok.set(sz, { pont: adat.pont, szerep: adat.szerep });
      masolat.osszesPont += adat.pont;
      e.osszesPont -= adat.pont;
      e.hozzajarulok.delete(sz);
    }

    // Az eredeti a saját oldalán marad — a szülője a megfelelő ághoz kötve.
    e.szulo = kulonvaloTartja
      ? (ujAgSzuloje.get(e.szulo) ?? ujAg.azonosito)
      : (foagSzuloje.get(e.szulo) ?? foag.azonosito);

    entitasok.set(masolatAzonosito, masolat);

    // ⭐ A KÉT PÉLDÁNY IS TESTVÉR — ugyanaz a „Másik ág" fül, mint a gyökérnél.
    const mikor = egyezmeny.megszuletett;
    e.kulonvalasok = [...(e.kulonvalasok ?? []), {
      testverId: masolatAzonosito, testverTipus: masolat.tipus, testverCim: masolat.cim,
      agSzerep: 'foag', kulonvalasIdeje: mikor, egyezmeny: egyezmeny.javaslat
    }];
    masolat.kulonvalasok = [{
      testverId: e.azonosito, testverTipus: e.tipus, testverCim: e.cim,
      agSzerep: 'mellekag', kulonvalasIdeje: mikor, egyezmeny: egyezmeny.javaslat
    }];

    // A két ág horgonyai: melyik példány folytatja hol.
    ujAgSzuloje.set(e.azonosito, kulonvaloTartja ? e.azonosito : masolatAzonosito);
    foagSzuloje.set(e.azonosito, kulonvaloTartja ? masolatAzonosito : e.azonosito);

    eredmeny.duplazodott++;
    eredmeny.ujak.push({
      eredeti: e.azonosito, masolat: masolatAzonosito,
      eredetiOldal: kulonvaloTartja ? 'kulonvalok' : 'foag',
      fejszam: { viszik: viszik.length, maradok: maradok.length }
    });
  }

  return eredmeny;
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

  // ----- ⭐ ÉS AZ ÉRTÉK JAVASLATOK IS ÁTVÁNDOROLNAK -----
  // A különválók küszöb-elképzelései az ÚJ ágra; a főágé pedig újraszámolódik NÉLKÜLÜK.
  // *Ettől lehet a két ágnak más küszöbe — és ez a lényeg, nem mellékhatás.*
  const ujKuszobok = kuszobokKorre(allapot, entitas.azonosito, viszik.map((v) => v.szerzo));
  if (ujKuszobok) {
    ujAg.kuszobok = ujKuszobok.kuszobok;
    ujAg.kuszobErtekelokSzama = ujKuszobok.ertekelok;
  }
  const foagKuszobok = kuszobokKorre(allapot, entitas.azonosito, maradok);
  if (foagKuszobok) {
    entitas.kuszobok = foagKuszobok.kuszobok;
    entitas.kuszobErtekelokSzama = foagKuszobok.ertekelok;
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

  // ----- ⭐⭐ ÉS A LESZÁRMAZOTTAK, EGYENKÉNT -----
  // ⚠️ A gyökér szétválasztása UTÁN, mert a leszármazottak a két ág horgonyaihoz kötődnek.
  const leszarmazottak = await leszarmazottakSzetosztasa(
    allapot, entitas, ujAg, viszik.map((v) => v.szerzo), egyezmeny);

  return {
    rendben: true,
    foag: entitas.azonosito,
    kulonvaltAg: ujAzonosito,
    atvittEmberek: viszik.length,
    atvittPontok: viszik.reduce((ossz, v) => ossz + v.adat.pont, 0),
    leszarmazottak
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
async function egyesites(allapot, egyezmeny, kik, alkalmazottak, kihagyottak, kulonvalasok = []) {
  const entitasok = allapot.entitasok;

  // ----- 1. A JELENLÉVŐ FORRÁSOK -----
  const jelenlevok = [];
  for (const r of kik) {
    const e = entitasok.get(r.entitas);
    if (e) jelenlevok.push(e);
    else {
      // ⚠️ A hiányzó forrás nem hiba (D19) — a többit attól még összevonjuk.
      kihagyottak.push({
        javaslat: egyezmeny.javaslat, erintett: r.entitas, muvelet: 'Egyesites',
        ok: 'ez a forrás nem létezik (elfelejtették, vagy még nem ismerjük)'
      });
    }
  }
  if (!jelenlevok.length) return { rendben: false };

  // ----- 2. ⭐⭐ A GYŐZTES: A FEJSZÁM DÖNT (Csaba, 2026-09-08) -----
  //
  // *„Egyesítéskor az őrizze meg az id-jét, amelyiknek… — legyen csak fejszám."* Vagyis az
  // az entitás viszi tovább az azonosítót, amelyiknek **több tudatpont-tulajdonosa van**.
  // ⚠️ Ez felváltotta a korábbi „az ELSŐ érintett nyeli be a többit" szabályt.
  //
  // ⭐ HOLTVERSENYNÉL AZ ELSŐ ÉRINTETT nyer: az a javaslattevő kimondott elsődlegese, és
  // minden gépen ugyanaz. *Valamit dönteni kell, és ez nem jutalmaz senkit.*
  const elso = entitasok.get(kik[0].entitas);
  let gyoztes = elso ?? jelenlevok[0];
  for (const e of jelenlevok) {
    if (e.hozzajarulok.size > gyoztes.hozzajarulok.size) gyoztes = e;
  }

  const forrasAzonositok = new Set(kik.map((r) => r.entitas));
  const vesztesek = jelenlevok.filter((e) => e !== gyoztes);

  // ----- 3. ⭐ A GYEREKEK ÖSSZEGYŰJTÉSE — MÉG A FORRÁSOK ELTŰNÉSE ELŐTT -----
  // ⛔ A SORREND ITT LÉNYEG: ha később gyűjtenénk, az árva-szabály már felvitte volna őket
  // a NAGYSZÜLŐHÖZ. Az egyesítésnél a gyerekek helye a GYŐZTES: *ami a beolvasztott
  // gondolat alatt volt, az az egyesített gondolat alá tartozik.*
  const atkotendok = [];
  for (const e of entitasok.values()) {
    if (e.szulo && forrasAzonositok.has(e.szulo) && !forrasAzonositok.has(e.azonosito)) {
      atkotendok.push(e);
    }
  }

  // ----- 4. A HELY: a legközelebbi közös ős (vagy amit a javaslat mond) -----
  const kimondottSzulo = kik[0].valtozas?.szulo;
  const ujSzulo = kimondottSzulo !== undefined
    ? kimondottSzulo
    : legkozelebbiKozosOs(entitasok, forrasAzonositok);

  /** Egy ember pontjának hozzáadása a győzteshez. */
  const gyozteshez = (szerzo, adat) => {
    const meglevo = gyoztes.hozzajarulok.get(szerzo);
    if (!meglevo) gyoztes.hozzajarulok.set(szerzo, { pont: adat.pont, szerep: adat.szerep });
    else {
      meglevo.pont += adat.pont;
      // ⭐ Aki BÁRMELYIK forráson aktív volt, az az egyesítettben is aktív: a részvételt
      // nem veheti el tőle, hogy máshol csak figyelt.
      if (adat.szerep === 'aktiv') meglevo.szerep = 'aktiv';
    }
  };

  // ----- 5. ⭐⭐⭐ VESZTESENKÉNT: BEOLVAD, VAGY MEGMARAD A RADIKÁLISOKKAL -----
  //
  // Csaba modellje (2026-09-07): *„Ha nem volt ellenzője, akkor a vesztes gondolat id-je
  // már nem kell, és minden tudatpont-tulajdonos tudatpontja átvándorol a győztesre. Ha
  // voltak olyan ellenzők, akik meg szeretnék tartani az eredeti gondolatot, akkor megmarad
  // a vesztes gondolat eredetiben, de a támogatók, tartózkodók és az összes passzív
  // tulajdonos tudatpontjai átkerülnek a győztes gondolatra."*
  const beolvadtak = [];
  const megmaradtak = [];

  for (const vesztes of vesztesek) {
    // A radikális ellenzők EZEN a forráson: ellenezték ÉS külön ágat kértek — és van is
    // még pontjuk rajta.
    const radikalisok = (egyezmeny.kulonvalok?.[vesztes.azonosito]?.ellenzok ?? [])
      .filter((sz) => (vesztes.hozzajarulok.get(sz)?.pont ?? 0) > 0);

    // ⭐ NINCS RADIKÁLIS ELLENZŐ → a vesztes azonosítója már nem kell.
    if (!radikalisok.length) {
      for (const [szerzo, adat] of vesztes.hozzajarulok) gyozteshez(szerzo, adat);
      entitasok.delete(vesztes.azonosito);
      if (Array.isArray(allapot.elfelejtettek)) allapot.elfelejtettek.push(vesztes.azonosito);
      beolvadtak.push(vesztes.azonosito);
      continue;
    }

    // ⭐ VAN RADIKÁLIS ELLENZŐ → a vesztes MEGMARAD EREDETIBEN, de csak az ő pontjaikkal.
    const koltozok = [...vesztes.hozzajarulok.keys()].filter((sz) => !radikalisok.includes(sz));
    for (const szerzo of koltozok) {
      gyozteshez(szerzo, vesztes.hozzajarulok.get(szerzo));
      vesztes.hozzajarulok.delete(szerzo);
    }
    vesztes.osszesPont = [...vesztes.hozzajarulok.values()].reduce((o, a) => o + a.pont, 0);

    // ⭐ A leszármazottak ugyanezzel a szabállyal, EGYENKÉNT: akin nincs radikális pont, az
    // a győzteshez megy; akin van, marad; ha mindkettő, DUPLÁZÓDIK (és ott a fejszám dönt).
    const leszarmazottak = await leszarmazottakSzetosztasa(
      allapot, vesztes, gyoztes, koltozok, egyezmeny);

    // ⭐ A két ág össze van kötve — ugyanaz a „Másik ág" fül, mint a különválásnál.
    const mikor = egyezmeny.megszuletett;
    vesztes.kulonvalasok = [...(vesztes.kulonvalasok ?? []), {
      testverId: gyoztes.azonosito, testverTipus: gyoztes.tipus, testverCim: gyoztes.cim,
      agSzerep: 'mellekag', kulonvalasIdeje: mikor, egyezmeny: egyezmeny.javaslat
    }];
    gyoztes.kulonvalasok = [...(gyoztes.kulonvalasok ?? []), {
      testverId: vesztes.azonosito, testverTipus: vesztes.tipus, testverCim: vesztes.cim,
      agSzerep: 'foag', kulonvalasIdeje: mikor, egyezmeny: egyezmeny.javaslat
    }];

    megmaradtak.push({ entitas: vesztes.azonosito, radikalisok: radikalisok.length,
      atkoltozott: koltozok.length, leszarmazottak });
    kulonvalasok.push({
      javaslat: egyezmeny.javaslat, egyesitesnel: true,
      foag: gyoztes.azonosito, kulonvaltAg: vesztes.azonosito,
      atvittEmberek: koltozok.length, leszarmazottak
    });
  }

  gyoztes.osszesPont = [...gyoztes.hozzajarulok.values()].reduce((ossz, a) => ossz + a.pont, 0);

  // ----- 6. A GYEREKEK A GYŐZTESHEZ (csak a teljesen beolvadt forrásoké) -----
  for (const gyerek of atkotendok) {
    if (!entitasok.has(gyerek.szulo)) gyerek.szulo = gyoztes.azonosito;
  }

  // ----- 7. AZ EGYESÍTETT CÍM ÉS SZÖVEG, ÉS A HELY -----
  const mezok = ['pontok'];
  const cimCsere = modositas(gyoztes, kik[0].valtozas);
  if (cimCsere.rendben) mezok.push(...cimCsere.mezok);
  if (ujSzulo !== gyoztes.szulo && ujSzulo !== gyoztes.azonosito) {
    gyoztes.szulo = ujSzulo ?? null;
    mezok.push('szulo');
  }

  alkalmazottak.push({
    javaslat: egyezmeny.javaslat, erintett: gyoztes.azonosito,
    muvelet: 'Egyesites', mezok,
    beolvasztott: beolvadtak,
    megmaradt: megmaradtak.map((m) => m.entitas)
  });
  return { rendben: true, eltunt: beolvadtak.length > 0 || megmaradtak.length > 0 };
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
    if (j.fajta !== 'szerkesztesi') continue;          // ⭐ az általánosból nem következik semmi (D27)

    if (j.egyezmeny) { sorban.push(j.egyezmeny); continue; }

    // ⭐⭐ A TÜKÖR-ESET (2026-09-08): az ELVETETT javaslat is „végrehajtandó" lehet.
    //
    // *„Elfogadott javaslatnál az ELLENZŐK viszik a RÉGI állapotot; elvetettnél a TÁMOGATÓK
    // a módosítottat"* — a prototípus szimmetriája. ⚠️ Csakhogy az elvetett javaslatnak
    // **nincs egyezménye**, tehát a végrehajtás nem indulhat abból: ez egy MÁSIK belépési
    // pont, ugyanabba a gépezetbe.
    //
    // ⛔ Ami itt NEM történik: az entitás nem változik. A főág marad, ami volt — csak
    // azok lépnek ki, akik a módosítást akarták, és kértek külön ágat.
    if (j.statusz !== 'elvetve') continue;             // még folyamatban: nincs teendő
    const vannak = Object.values(j.erintettekKulonvaloi ?? {})
      .some((x) => (x?.tamogatok ?? []).length);
    if (!vannak) continue;

    sorban.push({
      javaslat: j.azonosito,
      fajta: j.fajta,
      erintettek: j.erintettek,
      // ⭐ A „megszületett" itt a LEZÁRÁS ideje — ugyanaz a szám, amit az egyezmény visz,
      // tehát a közös sorrendezés változatlanul működik.
      megszuletett: j.lezarasIdeje,
      kulonvalok: j.erintettekKulonvaloi,
      elvetett: true
    });
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
      const eredmeny = await egyesites(allapot, egyezmeny, kik, alkalmazottak,
        kihagyottak, kulonvalasok);
      if (eredmeny?.eltunt) eltunt = true;
      continue;
    }

    for (const resz of kik) {
      const eredmeny = await egyReszVegrehajtasa(allapot, egyezmeny, resz, alkalmazottak,
        kihagyottak, kulonvalasok);
      if (eredmeny?.eltunt) eltunt = true;
    }
    // ⭐ A különválás új entitásokat szül és szülőket köt át — az ág-méretek elavulnak.
    if (kulonvalasok.length) eltunt = true;
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

  // ⭐⭐ AZ ELVETETT JAVASLAT TÜKÖR-ESETE: nincs módosítás, csak különválás.
  // A TÁMOGATÓK viszik a MÓDOSÍTOTT változatot — azt, amit meg akartak szavaztatni.
  if (egyezmeny.elvetett) {
    if (muvelet !== 'Modositas') return { rendben: true, csendben: true };
    const kik = egyezmeny.kulonvalok?.[resz.entitas]?.tamogatok ?? [];
    if (!kik.length) return { rendben: true, csendben: true };

    // ⭐ Az „új" változat: az entitás mai alakja + a javasolt változás. ⚠️ Ha a változás
    // nem nevez meg mezőt, nincs miben különbözni — akkor nincs is miről különválni.
    const ujValtozat = {
      cim: typeof resz.valtozas?.cim === 'string' ? resz.valtozas.cim : entitas.cim,
      szoveg: (typeof resz.valtozas?.szoveg === 'string' || resz.valtozas?.szoveg === null)
        ? resz.valtozas.szoveg : entitas.szoveg
    };
    if (ujValtozat.cim === entitas.cim && ujValtozat.szoveg === entitas.szoveg) {
      return { rendben: true, csendben: true };
    }

    const kv = await kulonvalas(entitas, ujValtozat, kik, egyezmeny, allapot);
    if (kv?.rendben) kulonvalasok.push({ javaslat: egyezmeny.javaslat, elvetett: true, ...kv });
    else if (kv) {
      kihagyottak.push({
        javaslat: egyezmeny.javaslat, erintett: resz.entitas,
        muvelet: 'Kulonvalas', ok: kv.ok
      });
    }
    return { rendben: true, csendben: true };
  }

  if (muvelet === 'Modositas') {
    // ⭐ A RÉGI ÁLLAPOT A MÓDOSÍTÁS ELŐTT — ezt viszik a különválók. A prototípus is a
    // felülírás ELŐTT menti el (`regiAdatok`); utána már nem lenne visszafejthető.
    const regi = { cim: entitas.cim, szoveg: entitas.szoveg };
    eredmeny = modositas(entitas, resz.valtozas);

    // ⭐⭐ ÉS AKI ELLENEZTE, DE KÜLÖN ÁGAT KÉRT, AZ MOST LÉP KI (2026-09-08).
    // ⚠️ Csak SIKERES módosítás után: ha nem változott semmi, nincs miről különválni.
    const kik = egyezmeny.kulonvalok?.[resz.entitas]?.ellenzok ?? [];
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

  if (eredmeny.csendben) return eredmeny;

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
