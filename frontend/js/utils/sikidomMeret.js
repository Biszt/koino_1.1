// frontend/js/utils/sikidomMeret.js

// ===== SÍKIDOM-MÉRET (tudatpont → sugár) =====
//
// Felelősség: megmondani, mekkora legyen egy síkidom a tudatpontja alapján.
//
// A MODELL (a koino_1.0-ból átvéve, Csaba megerősítésével):
// a síkidom TERÜLETE arányos a tudatponttal — nem az átmérője. Vagyis
//   terület = pont × faktor
//   sugár   = √(terület / π)      →   sugár ∝ √pont
// Ezért négyszer annyi tudatpont kétszer akkora átmérőt jelent. (Ha az ÁTMÉRŐ
// lenne arányos a ponttal, akkor a terület a pont NÉGYZETÉVEL nőne, és egyetlen
// erős entitás elnyomná az összes többit.)
//
// A HIERARCHIA: minden szinttel a terület a SZINT_OSZTO-ad részére csökken —
// ez az, ami a beágyazást (containment) biztosítja. A gyereket nem kell abszolút
// mérettel számolni, elég a szülőjéhez viszonyítva:
//
//   gyerekSugár / szülőSugár = √( gyerekPont / (20 × szülőPont) )
//
// Mivel a hierarchikus össztudatpont halmozott (a szülőé tartalmazza a
// leszármazottaiét), a gyerek pontja SOSEM nagyobb a szülőénél — így ez az arány
// mindig legfeljebb 1/√20 ≈ 0,2236. A beágyazás tehát magától teljesül, nem kell
// külön ellenőrizni.
//
// SZÁNDÉKOSAN nincs DOM-függése: Node-ból egység-tesztelhető.
// Használják: a Síkidom nézet betöltő/rajzoló rétege.

// ===== ÁLLANDÓK =====

// Szintenkénti terület-osztó: minden hierarchia-szinttel ennyied részére csökken
// a terület (a koino_1.0 és a koino_1.1 backend `effektivMeret`-je is ezzel számol)
export const SZINT_OSZTO = 20;

// Ebből adódik a legnagyobb lehetséges gyerek/szülő sugár-arány: 1/√20 ≈ 0,2236
export const LEGNAGYOBB_GYEREK_ARANY = 1 / Math.sqrt(SZINT_OSZTO);

// ===== GYEREK RELATÍV SUGARA =====
// Egy al-entitás sugara a SZÜLŐJE sugarához viszonyítva (a szülő sugara = 1).
// Pontosan ezt az alakot várja a horgony-modul (`relR`).
//
// @param {number} gyerekPont - a gyerek hierarchikus össztudatpontja
// @param {number} szuloPont - a szülő hierarchikus össztudatpontja
// @returns {number} 0 és 1/√20 közötti arány
export function gyerekRelativSugar(gyerekPont, szuloPont) {
  // Védelem: 0 vagy hiányzó szülő-pont esetén nincs értelmes arány.
  // (A koino domain-szabálya szerint 0 tudatpontos entitás nem létezik — az
  // ilyet a rendszer törli —, de a rajzoló ettől még nem eshet szét.)
  if (!(szuloPont > 0)) return 0;

  const arany = Math.max(0, gyerekPont ?? 0) / (SZINT_OSZTO * szuloPont);

  // A felső vágás elvileg sosem lép életbe (a gyerek pontja ≤ a szülőé), de ha
  // az adat mégis inkonzisztens lenne, a gyerek akkor sem lóghat ki a szülőből
  return Math.min(Math.sqrt(arany), LEGNAGYOBB_GYEREK_ARANY);
}

// ===== GYÖKÉR RELATÍV SUGARA =====
// A legfelső szinten nincs közös szülő, ezért a LEGERŐSEBB gyökérhez viszonyítunk:
// az kapja az 1-es sugarat, a többi ehhez képest kisebb (terület-arányosan).
// Ez a „világ-keret" mértékegysége, amihez a horgony-modul legfelső szintje igazodik.
//
// Miért a legerősebbhez? Mert az a RANGSOR ELEJE, ami a lapozás során nem
// változik — így a mértékegység sem mozdul, amikor újabb (gyengébb) gyökerek
// töltődnek be.
//
// @param {number} pont - a gyökér hierarchikus össztudatpontja
// @param {number} legerosebbPont - a legerősebb gyökér pontja (a rangsor 0. eleme)
// @returns {number} 0 és 1 közötti arány
export function gyokerRelativSugar(pont, legerosebbPont) {
  if (!(legerosebbPont > 0)) return 0;
  return Math.min(Math.sqrt(Math.max(0, pont ?? 0) / legerosebbPont), 1);
}

// ===== A PAKOLÁS TÉNYLEGES SŰRŰSÉGE =====
// A háromszögeléses kör-pakolás ennyire tölti ki a rendelkezésre álló kört.
// NEM elméleti érték, hanem MÉRT: a sűrűséget söpörve az 0,45 az a legnagyobb
// érték, amivel az egymás után betöltött adagok még hézagmentesen (5% rés) és
// ÁTFEDÉS NÉLKÜL illeszkednek egymáshoz. Nagyobb érték (0,5–0,62) alábecsüli a
// szükséges helyet → az újabb adag túlnyúlik a magon és átfedés keletkezik.
export const PAKOLASI_SURUSEG = 0.45;

// ===== AZ ÜRES MAG SUGARA (a még be nem töltött testvérek helye) =====
// Mekkora üres kört hagyjunk a közepén a MÉG BE NEM TÖLTÖTT, gyengébb
// testvéreknek? A becslés nem tippelés, hanem a tudatpontból számolható:
//
//   - a testvérek együttes TERÜLETE arányos az együttes tudatpontjukkal,
//     szintenként a SZINT_OSZTO-val osztva;
//   - egy m sugarú magba `π·m²·sűrűség` területnyi kör fér.
//
// Ebből:  m = √( maradékPont / (SZINT_OSZTO × szülőPont × sűrűség) )
//
// A `maradekPont` NEM becslés: a backend megküldi az összes gyerek együttes
// pontját (`osszesGyerekPont`), abból a hívó kivonja a már betöltötteket. A
// korábbi becslés (szülőPont − betöltött) a szülő SAJÁT pontját is beleszámolta,
// ezért kétszeresen túlfoglalt, és a betöltött adagok közt üres gyűrű maradt.
//
// @param {number} maradekPont - a MÉG BE NEM TÖLTÖTT testvérek együttes pontja
// @param {number} szuloPont - a szülő hierarchikus össztudatpontja
// @param {number} suruseg - kör-pakolási sűrűség (0…1); a 0,5 óvatos érték
// @returns {number} a mag sugara a szülő sugarának egységében
export function magSugarBecsles(maradekPont, szuloPont, suruseg = PAKOLASI_SURUSEG) {
  if (!(szuloPont > 0) || !(maradekPont > 0)) return 0;
  const arany = maradekPont / (SZINT_OSZTO * szuloPont * suruseg);
  return Math.min(Math.sqrt(arany), 1);
}

// ===== AZ ÜRES MAG SUGARA A GYÖKÉR-SZINTEN =====
// A gyökereknél nincs szülő, ezért a LEGERŐSEBB gyökérhez viszonyítunk (az kapja
// az 1-es sugarat, lásd gyokerRelativSugar). Egy p pontú gyökér területe így a
// mértékegység-körhöz képest p / legerősebbPont, tehát:
//   m = √( maradékPont / (legerősebbPont × sűrűség) )
//
// @param {number} maradekPont - a még be nem töltött gyökerek együttes pontja
// @param {number} legerosebbPont - a legerősebb gyökér pontja (a mértékegység)
// @param {number} suruseg
// @returns {number} a mag sugara a legerősebb gyökér sugarának egységében
export function gyokerMagSugar(maradekPont, legerosebbPont, suruseg = PAKOLASI_SURUSEG) {
  if (!(legerosebbPont > 0) || !(maradekPont > 0)) return 0;
  return Math.sqrt(maradekPont / (legerosebbPont * suruseg));
}

// ===== ABSZOLÚT SUGÁR (tájékoztató/ellenőrző célra) =====
// Terület-arányos sugár egy tetszőleges egységrendszerben. A nézet ezt közvetlenül
// nem használja (mindig relatív méretekkel dolgozunk a pontosság megőrzéséért),
// de a méret-modell ellenőrzéséhez és naplózáshoz hasznos.
//
// @param {number} pont
// @param {number} teruletFaktor - egy tudatpont ennyi területegység
// @returns {number}
export function abszolutSugar(pont, teruletFaktor = 1) {
  return Math.sqrt((Math.max(0, pont ?? 0) * teruletFaktor) / Math.PI);
}

export default {
  gyerekRelativSugar, gyokerRelativSugar, magSugarBecsles, gyokerMagSugar,
  abszolutSugar, SZINT_OSZTO, PAKOLASI_SURUSEG
};
