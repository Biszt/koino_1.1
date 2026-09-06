// frontend/js/utils/faElrendezes.js

// ===== FA-ELRENDEZÉS (a Struktúra nézet elrendezés-motorja) =====
// Felelősség: a backend lapos sor-listájából (entitasId, szuloId, ...) fa-struktúra
// építése és minden csomópont (x, y) VILÁG-koordinátájának kiszámítása.
//   - x: a levelek balról jobbra sorszámozódnak; a belső csomópont a gyerekei
//     közepéhez igazodik (klasszikus, egyszerű "tidy" fa-elrendezés, O(n)).
//   - y: a mélységi szint — a GYÖKÉR VAN ALUL (y=0), a gyerekek FELFELÉ
//     (negatív y) ágaznak, mert a pakli is így mutatja a hierarchiát
//     (gyökér legalul, levél legfelül) — Csaba jelzése, 2026-07-19.
//   - A testvérek sorrendje a KÖZÖS testverRendezes szabálya (hierarchikus pont
//     csökkenő → régebbi előrébb → entitasId) — ugyanaz, mint a pakliban.
// A feldolgozás GENERÁTORRAL darabolt (elhelyezesLepesekben): a hívó minden
// darab után frissítheti a folyamatjelzőt, és bármikor abbahagyhatja (return)
// — ez adja a Struktúra nézet "elhelyezve X / Y" kijelzését és a megszakíthatóságot.
// SZÁNDÉKOSAN nincs DOM-függése: Node-ból egység-tesztelhető.
// Használja: StrukturaModal.

import { testverOsszehasonlitas } from './testverRendezes.js';

// Világ-koordináta lépésközök (px): testvérek között vízszintesen, szintek között
// függőlegesen. A zoom/pan transzformáció ezekre épül a rajzolásnál.
export const FA_TAVOLSAG_X = 140;
export const FA_TAVOLSAG_Y = 120;

// ===== FA-ELRENDEZÉS OSZTÁLY =====
class FaElrendezes {

// ----- KONSTRUKTOR -----
// Felépíti az indexeket (csomópont-térkép, gyerek-térkép, gyökerek), de még
// NEM helyez el semmit — azt az elhelyezesLepesekben generátor végzi.
// @param {Array} sorok - a backend sorai: { entitasId, entitasTipus, szuloId,
//   hierarchikusOsszesPont, letrehozva, cim }
// @param {string|null} agEntitasId - ÁG-SZŰRŐ: ha meg van adva, csak ennek az
//   entitásnak a részfáját rendezzük el (a többi sor kimarad)
constructor(sorok, agEntitasId = null) {
  console.log('FaElrendezes.constructor - KEZDÉS', {
    sorokSzama: sorok.length,
    agEntitasId
  });

  this.agEntitasId = agEntitasId ? agEntitasId.toString() : null;

  // Csomópont-térkép: kulcs (entitasId string) → belső csomópont objektum
  this.csomopontMap = new Map();
  for (const sor of sorok) {
    const kulcs = sor.entitasId.toString();
    this.csomopontMap.set(kulcs, {
      kulcs,
      entitasId:              sor.entitasId,
      entitasTipus:           sor.entitasTipus,
      cim:                    sor.cim ?? null,
      hierarchikusOsszesPont: sor.hierarchikusOsszesPont ?? 0,
      letrehozva:             sor.letrehozva ?? null,
      szuloKulcs:             sor.szuloId ? sor.szuloId.toString() : null,
      // Mellék-ikon adatok (Struktúra nézet közeli nézet): Gondolat kategóriái/típusa,
      // illetve Javaslat/Egyezmény művelet-típusa — a backend tölti fel.
      kategoriaIkonok:        sor.kategoriaIkonok ?? [],
      tipusIkon:              sor.tipusIkon ?? null,
      javaslatTipus:          sor.javaslatTipus ?? null,
      x: 0,
      y: 0
    });
  }

  // Gyerek-térkép: szülő-kulcs → gyerek-csomópontok (közös szabállyal rendezve)
  this.gyerekMap = new Map();
  for (const csomopont of this.csomopontMap.values()) {
    if (!csomopont.szuloKulcs) continue;
    if (!this.gyerekMap.has(csomopont.szuloKulcs)) {
      this.gyerekMap.set(csomopont.szuloKulcs, []);
    }
    this.gyerekMap.get(csomopont.szuloKulcs).push(csomopont);
  }
  for (const gyerekek of this.gyerekMap.values()) {
    gyerekek.sort(testverOsszehasonlitas);
  }

  // Gyökerek meghatározása:
  //  - ÁG-MÓD: egyetlen gyökér, az ág entitása (ha nincs a sorok közt → üres fa);
  //  - GLOBÁLIS: a szülő nélküli sorok + az ÁRVÁK (a szülőjük nincs a sorok közt
  //    — adathiba ellen védve gyökérként kezeljük őket, ne tűnjenek el a fáról).
  if (this.agEntitasId) {
    const agGyoker = this.csomopontMap.get(this.agEntitasId);
    this.gyokerek = agGyoker ? [agGyoker] : [];
  } else {
    this.gyokerek = [...this.csomopontMap.values()]
      .filter(cs => !cs.szuloKulcs || !this.csomopontMap.has(cs.szuloKulcs))
      .sort(testverOsszehasonlitas);
  }

  // Az elrendezés eredménye (a generátor tölti fel)
  this.csomopontok = [];   // az ELHELYEZETT csomópontok listája
  this.kesz = false;

  console.log('FaElrendezes.constructor - VÉGE', {
    csomopontokSzama: this.csomopontMap.size,
    gyokerekSzama: this.gyokerek.length
  });
}

// ----- ELHELYEZÉS LÉPÉSEKBEN (GENERÁTOR) -----
// Iteratív mélységi bejárás explicit veremmel (nincs rekurzió → nagy fánál
// sincs stack-túlcsordulás). Kör-védelem: a már bejárt csomópontot kihagyjuk.
// Minden darabMeret-nyi ELHELYEZETT csomópont után yield-el egy állapotot:
//   { kesz, osszes } — a hívó frissíti a folyamatjelzőt, és a ciklus
// elhagyásával bármikor megszakíthatja a munkát.
// @param {number} darabMeret - hány elhelyezés után adjon vissza állapotot
// @yields {Object} { kesz, osszes }
*elhelyezesLepesekben(darabMeret = 1000) {
  console.log('FaElrendezes.elhelyezesLepesekben - KEZDÉS', { darabMeret });

  const bejarva = new Set();

  // Az összes itt a betöltött sorok száma (FELSŐ korlát) — ÁG-MÓDBAN a valóban
  // elhelyezett darab ennél kevesebb lehet (csak a részfa); a hívó a kijelzéshez
  // a darabszám-végpont agDarab értékét használja, nem ezt.
  const osszes = this.csomopontMap.size;

  let levelSzamlalo = 0;  // a következő szabad levél-pozíció (x rács-egységben)
  let elhelyezve = 0;     // eddig VÉGLEGESÍTETT csomópontok száma
  let utolsoYield = 0;

  // Kiindulási csomópontok: előbb a gyökerek, majd — CSAK globális módban —
  // maradék-söprésként az összes többi csomópont. Erre a körkörös (hibás)
  // szülő-láncok miatt van szükség: egy kör egyik tagja sem gyökér, így a
  // gyökerekből sosem érnénk el őket — a söprés nélkül eltűnnének a struktúra nézetről.
  // A már bejárt csomópontokat a ciklus eleje úgyis átugorja, ezért a söprés
  // a normál (kör nélküli) esetben nem csinál semmit.
  const kiindulok = this.agEntitasId
    ? this.gyokerek
    : [...this.gyokerek, ...this.csomopontMap.values()];

  // Kiindulónként külön bejárás — a levélszámláló folytatódik, így az egyes
  // részfák egymás MELLÉ kerülnek (erdő-elrendezés)
  for (const gyoker of kiindulok) {
    if (bejarva.has(gyoker.kulcs)) continue;
    bejarva.add(gyoker.kulcs);

    // Verem-elem: { csomopont, melyseg, gyerekIndex }
    const verem = [{ csomopont: gyoker, melyseg: 0, gyerekIndex: 0 }];

    while (verem.length > 0) {
      const keret = verem[verem.length - 1];
      const gyerekek = this.gyerekMap.get(keret.csomopont.kulcs) ?? [];

      // Van még feldolgozatlan gyerek → azt vesszük elő (mélységi bejárás)
      if (keret.gyerekIndex < gyerekek.length) {
        const gyerek = gyerekek[keret.gyerekIndex];
        keret.gyerekIndex++;

        // Kör-védelem: hibás adatnál (körkörös szülő-lánc) nem járjuk be kétszer
        if (bejarva.has(gyerek.kulcs)) continue;
        bejarva.add(gyerek.kulcs);

        verem.push({ csomopont: gyerek, melyseg: keret.melyseg + 1, gyerekIndex: 0 });
        continue;
      }

      // Minden gyerek kész → a csomópont VÉGLEGESÍTHETŐ
      verem.pop();

      const elhelyezettGyerekek = gyerekek.filter(gy => bejarva.has(gy.kulcs));
      if (elhelyezettGyerekek.length === 0) {
        // Levél: a következő szabad oszlopba kerül
        keret.csomopont.x = levelSzamlalo * FA_TAVOLSAG_X;
        levelSzamlalo++;
      } else {
        // Belső csomópont: az első és utolsó gyereke közé, középre
        const elso = elhelyezettGyerekek[0];
        const utolso = elhelyezettGyerekek[elhelyezettGyerekek.length - 1];
        keret.csomopont.x = (elso.x + utolso.x) / 2;
      }
      // NEGATÍV y: a gyökér alul (y=0), a mélyebb szintek felfelé — mint a pakliban
      keret.csomopont.y = -keret.melyseg * FA_TAVOLSAG_Y;

      this.csomopontok.push(keret.csomopont);
      elhelyezve++;

      // Darabhatár: állapot-jelentés a hívónak (folyamatjelző + megszakítás)
      if (elhelyezve - utolsoYield >= darabMeret) {
        utolsoYield = elhelyezve;
        yield { kesz: elhelyezve, osszes };
      }
    }
  }

  this.kesz = true;
  console.log('FaElrendezes.elhelyezesLepesekben - VÉGE', {
    elhelyezve,
    osszes,
    gyokerekSzama: this.gyokerek.length
  });

  // Záró állapot — a hívó ebből tudja, hogy minden csomópont a helyén van
  yield { kesz: elhelyezve, osszes };
}

// ----- VILÁG-MÉRET -----
// Az elrendezett fa befoglaló mérete világ-koordinátában (px) — a kezdő
// zoom/pan (a teljes fa képernyőre igazítása) számításához.
// @returns {Object} { minX, maxX, minY, maxY, szelesseg, magassag }
vilagMeret() {
  if (this.csomopontok.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, szelesseg: 0, magassag: 0 };
  }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const cs of this.csomopontok) {
    if (cs.x < minX) minX = cs.x;
    if (cs.x > maxX) maxX = cs.x;
    if (cs.y < minY) minY = cs.y;
    if (cs.y > maxY) maxY = cs.y;
  }
  return { minX, maxX, minY, maxY, szelesseg: maxX - minX, magassag: maxY - minY };
}

}

// --- EXPORTÁLÁS ---
export default FaElrendezes;
