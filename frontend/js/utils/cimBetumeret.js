// frontend/js/utils/cimBetumeret.js

// ===== DINAMIKUS CÍM-BETŰMÉRET (KARAKTERSZÁM ALAPJÁN) =====
// Felelősség: a cím HOSSZÁBÓL egy lépcsős betűméretet ad — rövid cím nagy, hosszú
// cím kicsi. Ez a KÖZÖS skála, amit a kártya fejléce (Kartya._cimBetumeretBecsles)
// és a Térkép csomópont-címei (TerkepModal) is használnak, hogy egységes legyen a
// megjelenés. A küszöbök és az arányok a kártya eredeti skálájából származnak
// (24 / 20 / 16 / 12 / 9 px, ahol a maximum 24). A maxMeret paraméterrel más
// kontextus (pl. a kisebb térkép-csomópont) arányosan lekicsinyítheti a skálát.
// Használják: Kartya, TerkepModal.

// @param {number} hossz    - a cím karakterszáma
// @param {number} maxMeret - a legnagyobb (rövid címhez tartozó) betűméret px-ben (alap: 24)
// @returns {number} a választott betűméret px-ben (a maxMeret-hez arányosítva)
export function dinamikusCimBetumeret(hossz, maxMeret = 24) {
  // A kártya eredeti lépcsői a 24-es maximumhoz viszonyítva (arányok):
  //   ≤12 → 24 · ≤18 → 20 · ≤26 → 16 · ≤36 → 12 · e fölött → 9
  let arany;
  if      (hossz <= 12) arany = 24 / 24; // rövid cím – a legnagyobb
  else if (hossz <= 18) arany = 20 / 24;
  else if (hossz <= 26) arany = 16 / 24;
  else if (hossz <= 36) arany = 12 / 24;
  else                  arany = 9 / 24;  // hosszú cím – a legkisebb

  return Math.round(maxMeret * arany);
}
