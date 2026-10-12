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

// ===== A MEGFORDÍTÁSUK: MEKKORA PONT KELL EGY ADOTT MÉRETHEZ? =====
// A nézet nem csak azt kérdezi, „mekkora legyen ez az entitás" — a BETÖLTÉSNÉL a
// fordítottját is: „mekkora tudatpont fölött érdemes egyáltalán lehozni egy
// testvért, ha ekkora méret alatt úgysem látszana?" (Lásd `SikidomModal._pontKuszob`.)
//
// Ez pontosan a fenti két függvény megfordítása, ezért van itt a helyük: ha a
// méret-modell valaha változik, a két irány EGYÜTT változik. Külön leírva némán
// elcsúszhatnának egymástól.
//
// @param {number} relSugar - a kívánt sugár a SZÜLŐ sugarának arányában
// @param {number} szuloPont - a szülő hierarchikus össztudatpontja
// @returns {number} ekkora pont adja pontosan ezt a relatív sugarat
export function gyerekPontKuszob(relSugar, szuloPont) {
  return SZINT_OSZTO * Math.max(0, szuloPont ?? 0) * relSugar * relSugar;
}

// Ugyanaz a gyökér-szintre: ott a LEGERŐSEBB gyökérhez viszonyítunk (sugara = 1).
//
// @param {number} relSugar - a kívánt sugár a legerősebb gyökérhez képest
// @param {number} legerosebbPont - a legerősebb gyökér pontja
// @returns {number}
export function gyokerPontKuszob(relSugar, legerosebbPont) {
  return Math.max(0, legerosebbPont ?? 0) * relSugar * relSugar;
}

// ===== A KÖZÉPSŐ LYUKAT MÁR NEM ITT SZÁMOLJUK =====
// Korábban itt állt a `PAKOLASI_SURUSEG`, a `magSugarBecsles` és a
// `gyokerMagSugar`: a még be nem töltött testvéreknek fenntartott üres mag
// méretét a tudatpontból BECSÜLTÜK, egy feltételezett kör-pakolási sűrűséggel.
//
// A becslés megbukott. Csak TERÜLETTEL számolt, pedig egy `w` szélességű gyűrűbe
// egy `r > w/2` sugarú kör semennyi területtel sem fér be — a pakolás pedig épp
// a legnagyobb kört teszi legkívülre. Ilyenkor a pakoló a magot felezve
// „javított", akár nullára, és onnantól minden további adag némán elveszett
// (600 gyerekes próbán 60-as adagokkal csak 180 jelent meg).
//
// AZ ELSŐ JAVÍTÁSI KÍSÉRLET (2026-08-05) a lyukat a KÉPERNYŐHÖZ horgonyozta: állandó
// cél-átmérő képpontban. Ez is megbukott (2026-08-08): állandó képpont-méret mellett
// a mag adat-térben zsugorodik, függetlenül attól, hány testvér van még hátra — a
// később érkezőknek így nem maradt hely, és kifelé fűződő „kígyó" lett belőle.
//
// AZ ÉRVÉNYES MODELL (Csaba, 2026-08-08): a mag a HÁTRALÉVŐ TUDATPONTBÓL számolódik
// (`SikidomModal._magSugar` és `MAG_SURUSEG`) — annyi helyet tartunk fenn, amennyi a
// még hely nélküli testvéreknek kell.
//
// A pakolás utáni tényleges lyukat a `sikidomPakolas.pakolas` MÉRI és adja vissza.

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
  gyerekRelativSugar, gyokerRelativSugar,
  gyerekPontKuszob, gyokerPontKuszob, abszolutSugar,
  SZINT_OSZTO, LEGNAGYOBB_GYEREK_ARANY
};
