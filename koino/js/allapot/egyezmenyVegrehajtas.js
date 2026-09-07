// koino/js/allapot/egyezmenyVegrehajtas.js

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
//   3. **`egyezmenyekAlkalmazasa`** ← EZ A FÁJL: az egyezmények rávezetése
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

// ===================================
// A MŰVELETEK
// ===================================
//
// A domain négy szerkesztési műveletet ismer: módosítás, áthelyezés, törlés, egyesítés.
//
// ⚠️⚠️ MA KETTŐ VAN MEGÉPÍTVE, ÉS EZ TUDATOS. Javaslatot ma csak `Modositas` művelettel
// lehet létrehozni (`muveletek.js` alapértéke, és a parancssor is azt adja) — a másik három
// eseményt **semmi nem tudja előállítani**. Az `Athelyezes` mégis bekerült, mert néhány sor
// és van benne egy valódi csapda (a kör); a `Torles` és az `Egyesites` viszont NEM
// részletkérdés: a törlés a tudatpontok visszaosztását kívánja, az egyesítés két szelet
// összefésülését. ⭐ Ezeket akkor építjük meg, amikor a hozzájuk tartozó művelet is
// megszületik — addig a váz megvan, és **a hiány LÁTSZIK** (a `kihagyottak` listában),
// nem néma.
export const VEGREHAJTHATO = ['Modositas', 'Athelyezes'];
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
export function egyezmenyekAlkalmazasa(allapot, javaslatok) {
  console.log('egyezmenyekAlkalmazasa - KEZDÉS', { javaslat: javaslatok?.size ?? 0 });

  const alkalmazottak = [];
  const kihagyottak = [];

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
  for (const egyezmeny of sorban) {
    const kik = Array.isArray(egyezmeny.erintettek) && egyezmeny.erintettek.length
      ? egyezmeny.erintettek
      : [{ entitas: egyezmeny.erintett, muvelet: egyezmeny.muvelet, valtozas: egyezmeny.valtozas }];

    for (const resz of kik) egyReszVegrehajtasa(allapot, egyezmeny, resz, alkalmazottak, kihagyottak);
  }

  // ⭐ A KIHAGYOTTAKAT FELSOROLJUK, NEM ELHALLGATJUK — ugyanaz a minta, mint a
  // `szabalyok.js` szabálysértő eseményeinél (D19): a program bejelent, nem bíráskodik.
  allapot.egyezmenyAlkalmazasok = alkalmazottak;
  allapot.egyezmenyKihagyasok = kihagyottak;

  console.log('egyezmenyekAlkalmazasa - VÉGE',
    { alkalmazott: alkalmazottak.length, kihagyott: kihagyottak.length });
  return { alkalmazottak, kihagyottak };
}

/**
 * Egy egyezmény EGY érintettjének végrehajtása.
 *
 * ⚠️ Külön függvény, mert a művelet **entitásonkénti**: egy csomag-javaslatban az egyik
 * entitás módosul, a másik áthelyeződik. Ha egy elem elakad, a többi attól még mehet — és
 * a `kihagyottak` megmondja, melyik akadt el és miért.
 */
function egyReszVegrehajtasa(allapot, egyezmeny, resz, alkalmazottak, kihagyottak) {
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
    eredmeny = modositas(entitas, resz.valtozas);
  } else if (muvelet === 'Athelyezes') {
    eredmeny = athelyezes(entitas, resz.valtozas, allapot.entitasok);
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
}
