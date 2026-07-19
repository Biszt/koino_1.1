// frontend/js/utils/testverRendezes.js

// ===== TESTVÉR-SOR KÖZÖS RENDEZÉSE =====
// Felelősség: a testvér-entitások EGYETLEN, közös rendezési szabálya.
// A kiválasztott entitás és a testvérei ez alapján kerülnek sorba, és
// MINDEN testvér-navigációs funkció ebből a sorból dolgozik:
//   - Pakli.testverValtasa: pozíció szerinti lépegetés (index ± 1)
//   - Pakli.testverJelzoFrissitese: a ‹ N / N › kacsacsőr-számok
// FONTOS: a rendezés csak itt élhet — ha két helyen lenne lekódolva,
// a kijelzett szám és a tényleges lépés széttarthatna.
//
// Rendezési szabály (a 2026-07-10-i döntetlen-javítás óta érvényes):
//   1. hierarchikus pont CSÖKKENŐ (erősebb ág előrébb)
//   2. döntetlennél letrehozva NÖVEKVŐ (régebbi entitás előrébb)
//   3. végső, determinisztikus döntő az entitasId (a sorrend sose "ugráljon")

// ----- ÖSSZEHASONLÍTÓ FÜGGVÉNY -----
// A rendezési szabály magja — sort() comparator formában, hogy bármely
// testvér-lista (pakli-testvérek, Térkép fa-elrendezés gyerek-sorrendje)
// ugyanazzal a szabállyal rendezhessen.
// @param {Object} a - egyik elem (entitasId, hierarchikusOsszesPont, letrehozva)
// @param {Object} b - másik elem
// @returns {number} sort() szerinti előjeles eredmény
export function testverOsszehasonlitas(a, b) {
  const pontKulonbseg = (b.hierarchikusOsszesPont ?? 0) - (a.hierarchikusOsszesPont ?? 0);
  if (pontKulonbseg !== 0) return pontKulonbseg;
  const idoKulonbseg = new Date(a.letrehozva ?? 0) - new Date(b.letrehozva ?? 0);
  if (idoKulonbseg !== 0) return idoKulonbseg;
  return a.entitasId.toString().localeCompare(b.entitasId.toString());
}

// ----- TELJES SOR ELŐÁLLÍTÁSA -----
// Az aktív elemet és a testvéreit EGYÜTT rendezi sorba.
// @param {Object} aktivElem - a kiválasztott entitás pakli-eleme
//   (kell: entitasId, hierarchikusOsszesPont, letrehozva)
// @param {Array} testverek - a testvérek listája (ugyanilyen mezőkkel)
// @returns {Array} a rendezett teljes sor (aktív elem + testvérek)
export function testverTeljesSor(aktivElem, testverek) {
  return [aktivElem, ...testverek].sort(testverOsszehasonlitas);
}

// ----- TESTVÉR-SZÁMOK KISZÁMÍTÁSA -----
// A rendezett sorban megadja az aktív elem helyét és a két irányban
// lévő testvérek számát.
// 'elozo'     = a sorban ELŐRÉBB állók (magasabb pont felé) → BAL kacsacsőr
// 'kovetkezo' = a sorban HÁTRÉBB állók (alacsonyabb pont felé) → JOBB kacsacsőr
// @param {Object} aktivElem - a kiválasztott entitás pakli-eleme
// @param {Array} testverek - a testvérek listája
// @returns {Object} { teljesSor, aktivIndex, elozoSzam, kovetkezoSzam }
export function testverSzamok(aktivElem, testverek) {
  const teljesSor = testverTeljesSor(aktivElem, testverek);
  const aktivIndex = teljesSor.findIndex(
    (elem) => elem.entitasId.toString() === aktivElem.entitasId.toString()
  );
  return {
    teljesSor,
    aktivIndex,
    elozoSzam: aktivIndex,
    kovetkezoSzam: teljesSor.length - 1 - aktivIndex
  };
}
