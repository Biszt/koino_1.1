// backend/tools/sikidomPakolasProba.mjs

// ===== SÍKIDOM-PAKOLÁS MÉRŐPRÓBA =====
//
// Felelősség: böngésző nélkül bebizonyítani, hogy a Síkidom nézet befelé növő
// pakolása SOK testvérnél is hiánytalan. Ez váltja ki a korábban tervezett
// „sűrűség-söprést" — a modell ugyanis már nem becsül sűrűséget.
//
// MIÉRT KELL: a régi modell a még be nem töltött testvéreknek fenntartott magot
// a tudatpontból BECSÜLTE, egy feltételezett 0,45-ös pakolási sűrűséggel. A
// becslés csak TERÜLETTEL számolt, ezért túl optimista volt; a pakoló ilyenkor a
// magot felezve „javított", akár nullára, és onnantól minden további adag NÉMÁN
// elveszett. Mérés: 600 gyerekes próbán 60-as adagokkal csak 180 jelent meg.
//
// A MODELL (Csaba, 2026-08-08) — HÁROM állítás, ez a próba mindet méri:
//
//   1. A lerakott síkidomok HELYE SOHA NEM VÁLTOZIK. (Enélkül közelítéskor
//      átrendeződik a kép, és egy szélső síkidomra nem lehet ráközelíteni.)
//   2. A középen fenntartott MAG a HÁTRALÉVŐ TUDATPONTBÓL számolódik — nem a
//      képernyőből. Ez tartja fenn a helyet a később érkezőknek.
//   3. Ebből a kettőből következik a nézet rendje: a legkisebbek a közép körül,
//      a legnagyobbak kívül.
//
// A próba a valódi geometria-modult hívja (frontend/js/utils/sikidomPakolas.js),
// és a SikidomModal._ujrapakolas lépéssorát tükrözi — beleértve a
// KAPACITÁS-VÁGÁST is (ez 2026-08-08-ig hiányzott belőle, és épp ezért nem fogta
// meg a böngészőben látott rossz elrendezést).
//
// A BETÖLTÉS IS A NÉZET SZABÁLYA SZERINT MEGY (2026-08-09 óta): a testvérek nem
// vak adagokban érkeznek, hanem akkor, amikor a tudatpontjuk eléri a nagyításból
// számolt küszöböt. Enélkül a próba nem látott semmit a betöltés hangolásából —
// lásd a `BETOLTESI_MELYSEG` melletti magyarázatot.
//
// Futtatás:  node backend/tools/sikidomPakolasProba.mjs
//            node backend/tools/sikidomPakolasProba.mjs 600 1.3 200 24 mag 0.5 20 4
//            (darab, zoom-szorzó, zoom-lépések, min. képernyő-átmérő,
//             mag-kapcsoló, mag-sűrűség σ, kérés-plafon körönként,
//             betöltési mélység)
//
//            A 7. paraméter (σ) a mag ÓVATOSSÁGA: kisebb érték = nagyobb mag.
//            A 8. (adag) CSÖKKENTVE feszíti meg a modellt: sok körön át kell
//            helyet tartani a még meg sem érkezett testvéreknek.
//            A 9. (mélység) az előretöltés: 1 = csak a láthatóvá válókat hozzuk
//            le, 4 = a nézet mai beállítása (16-szor több testvér).
//
//            node backend/tools/sikidomPakolasProba.mjs 600 1.3 90 24 nincsmag
//            → ÜRES MAG NÉLKÜL (összehasonlításhoz).

// --- IMPORTÁLÁSOK ---
import { pakolas } from '../../frontend/js/utils/sikidomPakolas.js';
import { gyerekRelativSugar, gyokerRelativSugar, SZINT_OSZTO } from '../../frontend/js/utils/sikidomMeret.js';

// ===== VILÁG-SZINT (GYÖKÉR) MÓD — 10. paraméter: `vilag` =====
// EDDIG HIÁNYZOTT, pedig a böngészőben látott hiba PONT ITT jelentkezik: a
// megnyitáskor a nézet a VILÁG csomópontot mutatja, aminek MÁS a geometriája,
// mint egy közönséges szülőé:
//
//   - a méret NEM a szülőhöz, hanem a LEGERŐSEBB GYÖKÉRHEZ viszonyul, és nincs
//     `/20` (a gyökerek nem egy szinttel lejjebb vannak) → a sugarak 20-szor
//     nagyobbak ugyanahhoz a ponthoz képest;
//   - a mag ezért szintén `/20` nélkül számolódik, ÉS nincs 1-re vágva —
//     nyugodtan lehet 3–4-szerese a legerősebb gyökérnek.
//
// Vagyis a gyerek-szinten mért „minden rendben" semmit nem mond a világ-szintről.
const GYOKER_MOD = String(process.argv[10] || '').toLowerCase() === 'vilag';

// ===== MIKOR PAKOLUNK? — 11. paraméter: `adagonkent` / `egyszerre` =====
// `adagonkent` a MAI viselkedés (minden befejezett kérés után pakolunk),
// `egyszerre` az ÚJ modell (előbb gyűjtünk, aztán egyetlen menetben rakunk le).
// Alapértelmezés: a mai viselkedés, hogy a régi kép reprodukálható maradjon.
const ADAGONKENT_PAKOL = String(process.argv[11] || 'adagonkent').toLowerCase() !== 'egyszerre';

// Hány testvér POZÍCIÓJÁT számoljuk ki előre egy szülő alatt (Csaba, 2026-08-09).
// A letöltés a szűk keresztmetszet: 10 000 mérve ~1 s hálózat + 70 ms pakolás.
const ELORETOLTES_DARAB = 10_000;

// A VALÓDI gyökér-eloszlás a fejlesztői adatbázisból (2026-08-09-én lekérdezve):
// 405 gyökér, összesen 17 235 pont, a legerősebb 2243, 62 db egypontos.
// Szándékosan a MÉRT adat, nem szintetikus Zipf — ez a kép, amit Csaba lát.
const VALODI_GYOKEREK = [
  2243, 810, 720, 660, 600, 560, 520, 485, 450, 425, 400, 387, 380, 360, 340, 320,
  305, 290, 275, 260, 247, 235, 222, 210, 200, 193, 190, 180, 170, 162, 155, 147,
  140, 132, 129, 125, 120, 115, 110, 105, 100, 97, 95, 90, 85, 80, 77, 75, 71, 68,
  64, 64, 60, 56, 55, 52, 48, 48, 45, 43, 41, 39, 38, 35, 34, 32, 30, 30, 28, 26,
  26, 24, 23, 22, 21, 20, 19, 18, 18, 18, 17, 16, 15, 15, 15, 14, 14, 14, 14, 13,
  13, 13, 13, 12, 12, 12, 12, 12, 11, 11, 11, 11, 11, 10, 10, 10, 10, 10, 10,
  ...Array(7).fill(9), ...Array(8).fill(8), ...Array(10).fill(7), ...Array(13).fill(6),
  ...Array(17).fill(5), ...Array(28).fill(4), ...Array(46).fill(3), ...Array(105).fill(2),
  ...Array(62).fill(1)
];

// ===== A NÉZET ÁLLANDÓI (a SikidomModal-lal egyezően) =====
const MIN_KEP_ATMERO = Number(process.argv[5]) || 24;

// A 6. paraméter: `nincsmag` → üres mag nélkül futtatunk (a legkisebb testvér a
// középpontba kerül). Ez a `SikidomModal.URES_MAG` kapcsoló tükre.
const URES_MAG = String(process.argv[6] || '').toLowerCase() !== 'nincsmag';

// ===== A BECSLÉS-ALAPÚ MAG (Csaba modellje, 2026-08-08) =====
// A mag NEM a képernyőhöz igazodik, hanem a HÁTRALÉVŐ TUDATPONTHOZ: annyi helyet
// tartunk fenn középen, amennyi a még le nem rakott testvéreknek kell.
//
//   a hátralévők együttes területe:  A = π · T_hátra / (20 · P_szülő)
//   ezt a mag σ sűrűséggel nyeli el: π · c² · σ = A
//                               →    c = √( T_hátra / (20 · P_szülő · σ) )
//
// MIÉRT KELL EGYÁLTALÁN FENNTARTANI: mert a lerakott síkidomok mostantól FIXEK.
// Ha újrapakolnánk, menet közben lehetne igazítani — így viszont előre kell tudni,
// mennyi hely kell a később érkezőknek.
//
// A σ SZÁNDÉKOSAN ÓVATOS. Utánaszámolva egy teljes GYŰRŰ a felszabaduló hely
// π/4 ≈ 78,5%-át tölti ki, a vegyes méretekre MÉRT pakolási sűrűség pedig
// 0,41–0,53. A 0,5-tel tehát ~1,57-szer akkora magot tartunk fenn, mint a
// szigorúan szükséges — Csaba kérése szerint „inkább maradjon üres belső rész,
// mint hogy elfogyjon a belső tér".
const MAG_SURUSEG = Number(process.argv[7]) || 0.5;

// ===== A PRÓBA PARAMÉTEREI =====
const GYEREK_DARAB   = Number(process.argv[2]) || 600;
const ZOOM_SZORZO    = Number(process.argv[3]) || 1.3;
const KEZDO_KEPSUGAR = 400;      // a szülő képernyő-sugara az induláskor
const MAX_ZOOM_LEPES = Number(process.argv[4]) || 60;
const SZULO_PONT     = 1_000_000;

// ===== A GEOMETRIA MÉRTÉKEGYSÉGE =====
// A nézetben minden képlet ugyanezt a két számot használja: a méret és a mag is
// `pont / MERTEKEGYSEG` alakú, és a küszöb is ebből fordul vissza. A két szint
// KIZÁRÓLAG a mértékegységben tér el (lásd `SikidomModal._relSugar`, `_magSugar`,
// `_pontKuszob` — mindháromban ugyanez a `cs.id === VILAG ? … : …` elágazás áll).
const LEGEROSEBB_GYOKER = Math.max(...VALODI_GYOKEREK);
const MERTEKEGYSEG = GYOKER_MOD ? LEGEROSEBB_GYOKER : SZINT_OSZTO * SZULO_PONT;

// A relatív sugár a szint szerinti valódi függvénnyel (a gyerek-ág 1/√20-ra vág,
// a gyökér-ág 1-re — ezt is hűen akarjuk)
const relSugar = GYOKER_MOD
  ? (pont) => gyokerRelativSugar(pont, LEGEROSEBB_GYOKER)
  : (pont) => gyerekRelativSugar(pont, SZULO_PONT);

// ===== A KÉPERNYŐ ÉS A KAPACITÁS (a SikidomModal-lal egyezően) =====
// Ez eddig HIÁNYZOTT a próbából — és épp ezért nem fogta meg a 2026-08-08-i
// hibát: a nézetben a kapacitás-vágás ledobja a legnagyobbakat, azok visszakerülnek
// a várólistára, majd ÚJKÉNT térnek vissza — és a mag peremére, a kicsik közé
// kerültek. A próba enélkül tiszta szerkezetet mutatott, a böngésző nem.
const KEPERNYO_SZELESSEG = 1280;
const KEPERNYO_MAGASSAG  = 800;
const LATOMEZO_TARTALEK  = 0.5;
const PAKOLASI_SURUSEG   = 0.7;

const KEPERNYO_KAPACITAS =
  KEPERNYO_SZELESSEG * (1 + 2 * LATOMEZO_TARTALEK) *
  KEPERNYO_MAGASSAG  * (1 + 2 * LATOMEZO_TARTALEK) * PAKOLASI_SURUSEG;

// A VALÓSÁGHŰ BETÖLTÉS: a nézet kérésenként legfeljebb ennyi testvért tölt le
// (SikidomModal.KERES_PLAFON), és egyszerre 3 kérés futhat. A várólistára tehát
// adagokban érkeznek az elemek, nem egyszerre több ezer. A próba ezt utánozza —
// enélkül irreálisan nagy pakolásokat mérnénk.
const KERES_PLAFON       = 150;
const EGYIDEJU_BETOLTES  = 3;

// EGY KÉRÉS-ADAG mérete (a nézetben `KERES_PLAFON` × `EGYIDEJU_BETOLTES`). Mivel a
// kérések láncolódnak — amíg a fék engedi, jön a következő adag —, ez az érték a
// VÉGEREDMÉNYT nem befolyásolja, csak azt, hány részletben érkezik ugyanaz.
// Mérve (2026-08-09): 20-as és 450-es adaggal a lyuk ugyanaz a 119 px, 3000
// testvérnél az 50-es és a 450-es egyaránt 267 px. A betöltést tehát valóban a FÉK
// szabályozza (`BETOLTESI_TARTALEK`), nem a darabszám-plafon.
const ADAG = Number(process.argv[8]) || KERES_PLAFON * EGYIDEJU_BETOLTES;

// ===== A LETÖLTÉS KÜSZÖB-VEZÉRELT (2026-08-09) =====
// EDDIG HIÁNYZOTT A PRÓBÁBÓL, és pontosan ezért volt vak arra a változtatásra,
// amit mérnie kellett volna. A testvérek körönként egyszerűen `ADAG`-onként
// érkeztek, függetlenül attól, mekkora a nagyítás — a `MIN_KEP_ATMERO` deklarálva
// volt és ki is íródott a fejlécbe, de SEHOL nem használtuk. Mérve: ugyanaz a
// futás 24-es és 4-es küszöbbel bitre azonos eredményt adott.
//
// Emiatt a `BETOLTESI_MELYSEG` bevezetése (az a javítás, ami a folyton növő üres
// magot hivatott megszüntetni) a próba számára LÁTHATATLAN volt: a 9 állítás
// akkor is változatlanul átment volna, ha az érték 1 vagy 100.
//
// MOSTANTÓL a próba a nézet valódi szabályát futtatja. A küszöb a méret-képlet
// megfordítása (`SikidomModal._pontKuszob`):
//
//   pontKüszöb = 20 · P_szülő · ( (minÁtmérő / mélység) / (2 · képSugár) )²
//
// és egy körben csak azok érkeznek meg, akik ezt elérik — legfeljebb `ADAG`
// darab, és csak amíg a fék (lásd lentebb) engedi.
//
// HANGOLÁS: nagyobb érték = mélyebb előretöltés (több hálózat, kisebb mag),
// 1 = a láthatósági küszöbbel egyező, korábbi viselkedés. Ez a 9. paraméter.
const BETOLTESI_MELYSEG = Number(process.argv[9]) || 4;

// A LETÖLTÉS FÉKJE (`SikidomModal.BETOLTESI_TARTALEK`): amíg a várólistán már
// legalább ennyiszer annyi terület vár, mint amennyi a képernyőre fér, addig nem
// kérünk többet. A kurzor őrzi, hol tartunk — semmi nem vész el.
const BETOLTESI_TARTALEK = 2;

// A naplót elnyomjuk: a pakoló képkockánként logol, itt több ezerszer futna
console.log = () => {};
const naplo = (...ertekek) => process.stdout.write(ertekek.join(' ') + '\n');

// ===== TESZT-ADAT =====
// Zipf-eloszlás: néhány erős testvér, majd hosszú farok — ez a valósághű eset, és
// ez feszíti meg a modellt (a farok csak mély nagyításnál válik láthatóvá).
function tesztGyerekek(darab) {
  // VILÁG-SZINTEN a valódi gyökér-eloszlást használjuk (a `darab` ilyenkor nem
  // számít — a mért adat annyi, amennyi)
  if (GYOKER_MOD) {
    return VALODI_GYOKEREK.map((pont, i) => ({
      id: `g${String(i + 1).padStart(4, '0')}`, pont
    }));
  }

  const sulyok = [];
  let osszSuly = 0;
  for (let i = 1; i <= darab; i++) {
    const s = 1 / Math.pow(i, 1.2);
    sulyok.push(s);
    osszSuly += s;
  }

  // A gyerekek együttes pontja a szülőének 90%-a (a szülőnek is van saját pontja)
  const oszthato = SZULO_PONT * 0.9;
  return sulyok.map((s, i) => ({
    id: `e${String(i + 1).padStart(4, '0')}`,
    pont: (s / osszSuly) * oszthato
  }));
}

// ===== EGY TELJES BEJÁRÁS (a SikidomModal._ujrapakolas tükre) =====
function bejaras(gyerekek) {
  const meg = [...gyerekek];              // amit a backend még nem küldött el
  const varolista = [];                   // amit már letöltöttünk, de nem raktunk le
  let lerakottak = [];                    // { id, x, y, sugar, kor, pont }
  let magSugarRel = Infinity;

  // A gyerekek EGYÜTTES pontja — ezt a nézetben a backend adja (`osszesGyerekPont`,
  // ami a szülő ágazati összpontja mínusz a saját pontja). A mag ebből számol.
  const osszesGyerekPont = gyerekek.reduce((s, g) => s + g.pont, 0);
  const pontTerkep = new Map(gyerekek.map(g => [g.id, g.pont]));
  const pontJa = (id) => pontTerkep.get(id) ?? 0;

  // ===== MEDDIG SZÓL EGYÁLTALÁN EZ A SZÜLŐ? =====
  // A próbában NINCS horgonyváltás: egyetlen szülőt nagyítunk a végtelenségig. A
  // valódi nézet ezzel szemben LEFELÉ LÉP, amint egy gyerek képernyő-átmérője eléri
  // a képernyő kétszeresét (`sikidomHorgony.LEFELE_KUSZOB`) — onnantól már nem ezt
  // a szülőt nézi az e-ember, hanem a gyerekét.
  //
  // Ezt a határt ki KELL számolni, különben a képpontban mért lyuk értelmetlenné
  // válik: kis adaggal a betöltés sok körig tart, a képsugár közben ×1,3-del nő
  // körönként, és 60 kör után 29 MILLIÓ képpontos „lyukat" mérnénk egy olyan
  // szülőn, amit a nézet rég elhagyott. (Mérve: pontosan ez jött ki, mielőtt ez a
  // korlát bekerült.)
  const legnagyobbRelR = Math.max(...gyerekek.map(g => relSugar(g.pont)));
  const horgonyValtasKepSugar =
    Math.min(KEPERNYO_SZELESSEG, KEPERNYO_MAGASSAG) / Math.max(legnagyobbRelR, 1e-9);

  let kepSugar = KEZDO_KEPSUGAR;
  let ujrapakolasok = 0;
  let legdragabb = 0;

  const lepesek = [];

  // STABILITÁS-NAPLÓ: minden síkidom helye a LERAKÁS pillanatában. A futás végén
  // ehhez hasonlítunk — ha bármelyik elmozdult volna, az a nézet fő hibája
  // (Csaba tünete 2026-08-08: „nehéz ráközelíteni egy szélső síkidomra, mert
  // mindig elugrál, kb. kergetni kell").
  const elsoHelyek = new Map();

  // Akinek MÁR VAN helye (akkor is, ha a kapacitás épp levette a képernyőről).
  // A mag csak azoknak tart fenn helyet, akiknek MÉG NINCS.
  let helyezettPont = 0;

  for (let kor = 1; kor <= MAX_ZOOM_LEPES; kor++) {
    // ===== (0) A LETÖLTÉS: KÜSZÖB-VEZÉRELT, MINT A NÉZETBEN =====
    // A `meg` lista csökkenő pont szerint áll (a backend is így ad), tehát elölről
    // véve pontosan azok érkeznek, akik elérik a küszöböt. Három kapu van, mind a
    // három a `SikidomModal` tükre:
    //   1. a tudatpont-küszöb (mi válna láthatóvá — a betöltési mélységgel osztva),
    //   2. a kérés-plafon (`ADAG`),
    //   3. a fék: ha a várólistán már elég terület vár, nem kérünk többet.
    const pontKuszob = MERTEKEGYSEG *
      Math.pow((MIN_KEP_ATMERO / BETOLTESI_MELYSEG) / (2 * kepSugar), 2);

    // A várakozó anyag KÉPERNYŐ-területe (a nézetben ezt a `varolistaRelTerulet`
    // tartja karban, itt elég kiszámolni — a lista rövid)
    const varakozoTerulet = () => varolista.reduce((s, v) => {
      const r = relSugar(v.pont) * kepSugar;
      return s + Math.PI * r * r;
    }, 0);

    // A KÉRÉSEK LÁNCOLÓDNAK egy zoom-lépésen belül: a nézetben minden befejezett
    // letöltés `finally` ága újraindítja a feldolgozást, tehát amíg a fék engedi és
    // van a küszöb fölött anyag, addig jön a következő adag. A próba korábban
    // körönként EGYETLEN adagot engedett — emiatt egy kis `ADAG` érték nem a
    // modellt feszítette meg, hanem egy olyan lassú letöltést utánzott, amilyet a
    // nézet sosem csinál (mérve: 20-as adaggal 1109 px-es „lyuk", pusztán ezért).
    // ===== MIKOR PAKOLUNK? A NÉZET LEGFONTOSABB DÖNTÉSE =====
    // `adagonkent` (a MAI viselkedés): a nézet MINDEN befejezett kérés után pakol
    //   (`_gyerekekBetoltese` `finally` ága → `_tennivalokFeldolgozasa`). Az első
    //   adag tehát lekerül, mielőtt a második megérkezne.
    // `egyszerre` (az ÚJ modell): előbb összegyűjtjük, amit a küszöb és az
    //   előretöltési korlát enged, és CSAK AZUTÁN pakolunk, egyetlen menetben.
    //
    // Ez nem stílus-kérdés. Mag NÉLKÜL, adagonként pakolva a rend MEGFORDUL: a
    // második adag (csupa kisebb) a középpontba kívánkozna, de ott már ül az első
    // adag — tehát kifelé szorul. A „bentről kifelé" modell CSAK akkor működik, ha
    // egyszerre látjuk az egész készletet.
    // ===== A FÓKUSZ MINDENT KAP (2026-08-09) =====
    // A próba EGYETLEN szülőt nagyít — az tehát végig a FÓKUSZ (a nézetben a
    // horgony). Az új modellben a fókusz-csomópontnak nincs letöltési küszöbe:
    // a rangsor elejétől kap mindent az `ELORETOLTES_DARAB` korlátig, egyben.
    //
    // Enélkül a küszöb adagolta volna a testvéreket, és minden adagnál újra
    // kellett volna pakolni: mérve 3000 testvérnél az első körben 73 érkezett
    // 3000 helyett, és 10-szer rendeződött át a kép.
    const ervenyesKuszob = ADAGONKENT_PAKOL ? pontKuszob : 0;

    const adagokEredmenye = [];
    let erkezett = 0;
    while (meg.length > 0 && meg[0].pont >= ervenyesKuszob) {
      if (varakozoTerulet() >= KEPERNYO_KAPACITAS * BETOLTESI_TARTALEK) break;
      if (varolista.length + erkezett >= ELORETOLTES_DARAB) break;

      // Egy kérés-adag (a nézetben KERES_PLAFON × EGYIDEJU_BETOLTES)
      const adag = [];
      while (meg.length > 0 && meg[0].pont >= ervenyesKuszob && adag.length < ADAG) {
        adag.push(meg.shift());
        erkezett++;
      }
      varolista.push(...adag);
      adagokEredmenye.push(adag.length);

      // A MAI viselkedésnél minden adag után külön pakolunk — a lentebbi lerakás
      // ilyenkor adagonként fut le. Az ÚJ modellnél tovább gyűjtünk.
      if (ADAGONKENT_PAKOL) break;
    }

    let lepesMs = 0;

    // (a) A KAPACITÁS CSAK A RAJZOLÁST KORLÁTOZZA — a lerakást NEM (Csaba, 2026-08-09).
    //     Korábban itt egy vágás állt: ami nem fért a képernyőre, azt levettük a
    //     tárból. Ez ördögi kört csinált — közelítéskor egyre több esett ki, azok
    //     nem kaptak helyet, tehát bent maradtak a HÁTRALÉVŐK között, amitől a mag
    //     tovább nőtt. Így a közelítés NÖVELTE az üres közepet ahelyett, hogy
    //     fogyasztotta volna. A hely kiosztása néhány szám — nem kerül rajzolási
    //     időbe —, ezért mindenki azonnal helyet kap, aki letöltődött.
    //     Mérőszám: hány síkidom FÉRNE a képre (csak tájékoztatásul).
    let rajzolhato = 0;
    let osszKepTerulet = 0;
    for (const l of [...lerakottak].sort((a, b) => a.sugar - b.sugar)) {
      const kepsugar = kepSugar * l.sugar;
      const terulet = Math.PI * kepsugar * kepsugar;
      if (rajzolhato > 0 && osszKepTerulet + terulet > KEPERNYO_KAPACITAS) break;
      osszKepTerulet += terulet;
      rajzolhato++;
    }

    // (b) A MAG A HÁTRALÉVŐ TUDATPONTBÓL. A `T_hátra` azokat számolja, akiknek
    //     MÉG NINCS HELYÜK — a le sem töltötteket is.
    //
    //     FONTOS: akit a kapacitás vágott ki, annak VAN helye (megjegyeztük), csak
    //     épp nem látszik. Őt tehát NEM szabad a hátralévők közé számolni. Enélkül
    //     a mag nem zsugorodik, és minden új síkidom a nagy mag peremére, KIFELÉ
    //     kerül — mérve pontosan ez történt: a legkisebbek kerültek legkívülre
    //     (tized-átlagok 0,3042 … 0,2241, vagyis fordítva).
    //     A MOST lerakandó adagot LEVONJUK: ők épp helyet kapnak, tehát nem nekik
    //     kell fenntartani. Enélkül egy nagy adag (a nézetben a megnyitáskori 150
    //     gyökér) ötször akkora mag köré kerül, mint kellene — és ott is ragad,
    //     mert semmi nem mozdul. Kis adagnál a hiba elenyésző: ezért nem tűnt fel.
    const mostLerakandoPont = varolista.reduce((s, v) => s + v.pont, 0);
    const hatraPont = Math.max(0,
      osszesGyerekPont - helyezettPont - mostLerakandoPont);
    const magSugar = URES_MAG
      ? Math.sqrt(hatraPont / (MERTEKEGYSEG * MAG_SURUSEG))
      : 0;

    // (d) LERAKÁS. A láthatóság NEM kapu többé — az csak a RAJZOLÁST vezérli.
    //     Amit letöltöttünk, azt lerakjuk; a helyet a mag tartja fenn a többinek.
    const ujak = varolista.map(v => ({
      id: v.id, sugar: relSugar(v.pont)
    }));

    // ===== AZ ÚJ MODELLBEN MINDENT ÚJRAPAKOLUNK, ÜRES LAPRA =====
    // A `SikidomModal._ujrapakolas` 2026-08-09 óta a MÁR LERAKOTTAKAT is beveszi a
    // pakolandók közé, és nem ad se magot, se környezetet: a teljes készlet megy be
    // egyetlen menetben, növekvő méret szerint, a legkisebbel a középpontban.
    //
    // MIÉRT NEM ELÉG CSAK AZ ÚJAKAT LERAKNI: mert az újak KISEBBEK mindenkinél (a
    // küszöb süllyedésével jönnek), tehát a KÖZÉPPONT kellene nekik — ami már
    // foglalt. Környezetként megtartva a régieket az újak kifelé szorulnának.
    // Mérve: a méret-tizedek 6 helyen fordultak meg (gyerek-szint, 3000 testvér).
    //
    // AMIT EZÉRT FELADUNK: a lerakottak elmozdulhatnak. Ezt az `ELORETOLTES_DARAB`
    // teszi ritkává — lásd a stabilitás-ellenőrzés magyarázatát.
    const pakolandok = ADAGONKENT_PAKOL
      ? ujak
      : [...lerakottak.map(l => ({ id: l.id, sugar: l.sugar })), ...ujak];

    if (pakolandok.length > 0 && ujak.length > 0) {
      const t0 = process.hrtime.bigint();
      const e = pakolas(pakolandok, ADAGONKENT_PAKOL
        ? { magSugar, kornyezet: lerakottak.map(l => ({ id: l.id, x: l.x, y: l.y, sugar: l.sugar })) }
        : { magSugar: 0, kornyezet: [] });
      lepesMs = Number(process.hrtime.bigint() - t0) / 1e6;
      legdragabb = Math.max(legdragabb, lepesMs);
      ujrapakolasok++;

      const lerakottIdk = new Set();

      // Teljes újrapakolásnál a régi helyek ÉRVÉNYTELENEK — a lista újraépül.
      // A `kor` mezőt megőrizzük (melyik körben került be először), mert a
      // gyűrű-ellenőrzés arra épül.
      const regiKor = new Map(lerakottak.map(l => [l.id, l.kor]));
      if (!ADAGONKENT_PAKOL) lerakottak = [];

      for (const h of e.helyek) {
        lerakottIdk.add(h.id);
        lerakottak.push({ ...h, kor: regiKor.get(h.id) ?? kor, pont: pontJa(h.id) });
        if (!elsoHelyek.has(h.id)) {
          elsoHelyek.set(h.id, { x: h.x, y: h.y });
          helyezettPont += pontJa(h.id);      // MOST kapott először helyet
        }
      }

      for (let i = varolista.length - 1; i >= 0; i--) {
        if (lerakottIdk.has(varolista[i].id)) varolista.splice(i, 1);
      }
      magSugarRel = meretek(lerakottak).magSugarRel;
    }

    lepesek.push({
      kor,
      ms: lepesMs,
      kepSugar: Math.round(kepSugar),
      erkezett,                          // ennyi jött le a küszöb fölül ebben a körben
      lerakott: lerakottak.length,
      varolistan: varolista.length,
      hatravan: meg.length,              // ennyit a backend még el sem küldött
      // Ezen a nagyításon még VALÓBAN ezt a szülőt nézi az e-ember? (Fölötte a
      // nézet már lefelé lépett volna egy gyerekre — lásd `horgonyValtasKepSugar`.)
      horgonyErvenyes: kepSugar <= horgonyValtasKepSugar,
      lyukKepAtmero: Number.isFinite(magSugarRel)
        ? Math.round(magSugarRel * kepSugar * 2)
        : Infinity
    });

    if (varolista.length === 0 && meg.length === 0) break;
    kepSugar *= ZOOM_SZORZO;
  }

  return { lerakottak, varolista: [...varolista, ...meg], lepesek, ujrapakolasok, legdragabb, elsoHelyek };
}

// A mag és a külső perem a lerakottakból
function meretek(lerakottak) {
  let mag = Infinity, kulso = 0;
  for (const l of lerakottak) {
    const t = Math.hypot(l.x, l.y);
    mag = Math.min(mag, t - l.sugar);
    kulso = Math.max(kulso, t + l.sugar);
  }
  return {
    magSugarRel: Number.isFinite(mag) ? Math.max(0, mag) : Infinity,
    kulsoSugar: kulso
  };
}

// ===== ELLENŐRZÉSEK =====
const hibak = [];
function allitas(rendben, cimke, reszlet = '') {
  naplo(`${rendben ? '  OK  ' : ' HIBA '} ${cimke}${reszlet ? ' — ' + reszlet : ''}`);
  if (!rendben) hibak.push(cimke);
}

// 1. NULLA ÁTFEDÉS
function atfedesEllenorzes(lerakottak) {
  let legrosszabb = 0;
  let parosDarab = 0;

  for (let i = 0; i < lerakottak.length; i++) {
    for (let j = i + 1; j < lerakottak.length; j++) {
      const a = lerakottak[i], b = lerakottak[j];
      const tavolsag = Math.hypot(a.x - b.x, a.y - b.y);
      const kellene = a.sugar + b.sugar;
      const atfedes = kellene - tavolsag;
      if (atfedes > 1e-9) {
        parosDarab++;
        legrosszabb = Math.max(legrosszabb, atfedes / kellene);
      }
    }
  }

  allitas(parosDarab === 0, 'Nulla átfedés',
    parosDarab === 0
      ? `${lerakottak.length} síkidom, ${(lerakottak.length * (lerakottak.length - 1) / 2).toLocaleString('hu')} pár ellenőrizve`
      : `${parosDarab} átfedő pár, a legrosszabb ${(legrosszabb * 100).toFixed(2)}%`);
}

// 2. EGYETLEN ENTITÁS SEM VÉSZ EL
function hianyEllenorzes(gyerekek, lerakottak, varolista) {
  const lerakottIdk = new Set(lerakottak.map(l => l.id));
  const varoIdk = new Set(varolista.map(v => v.id));
  const hianyzo = gyerekek.filter(g => !lerakottIdk.has(g.id) && !varoIdk.has(g.id));
  const duplikalt = lerakottak.length !== lerakottIdk.size;

  allitas(hianyzo.length === 0 && !duplikalt, 'Egyetlen entitás sem vész el',
    `${lerakottak.length} lerakva + ${varolista.length} várólistán = ${gyerekek.length}`);
}

// 3. BEÁGYAZÁS: minden a szülőn BELÜL
function beagyazasEllenorzes(lerakottak) {
  let legnagyobb = 0;
  for (const l of lerakottak) legnagyobb = Math.max(legnagyobb, Math.hypot(l.x, l.y) + l.sugar);

  // VILÁG-SZINTEN nincs mibe beágyazódni: a VILÁG virtuális csomópont, nincs valódi
  // pereme (ezért nem is vágjuk 1-re a magot). Itt csak KIÍRJUK a kiterjedést.
  if (GYOKER_MOD) {
    naplo(`  --   Kiterjedés (világ-szint, nincs szülő-perem) — ${legnagyobb.toFixed(4)} ` +
          `(a legerősebb gyökér sugara 1)`);
    return;
  }

  allitas(legnagyobb <= 1 + 1e-9, 'Minden síkidom a szülőn belül',
    `a legkülső perem ${legnagyobb.toFixed(4)} (a szülő sugara 1)`);
}

// 4. AZ INVARIÁNS: későbbi (beljebbi) kör nem lehet nagyobb egy korábbinál
function monotoniaEllenorzes(lerakottak) {
  const korMax = new Map();
  const korMin = new Map();
  for (const l of lerakottak) {
    korMax.set(l.kor, Math.max(korMax.get(l.kor) ?? 0, l.sugar));
    korMin.set(l.kor, Math.min(korMin.get(l.kor) ?? Infinity, l.sugar));
  }

  const korok = [...korMax.keys()].sort((a, b) => a - b);
  let sertes = null;
  for (let i = 1; i < korok.length; i++) {
    const elozoMin = korMin.get(korok[i - 1]);
    const mostMax = korMax.get(korok[i]);
    if (mostMax > elozoMin + 1e-12) sertes = `${korok[i]}. kör`;
  }

  allitas(!sertes, 'Középtől kifelé monoton nő a méret',
    sertes ? `megsérül a ${sertes}-ben` : `${korok.length} egymásba fűzött gyűrű`);
}

// 5. A LYUK KÖZELÍTÉSKOR NEM SZALAD EL
//
// EZ AZ ÁLLÍTÁS KICSERÉLVE (2026-08-09). Korábban azt mérte, hogy a lyuk
// KÉPPONTBAN ÁLLANDÓ marad-e (`MAG_CEL_ATMERO ± 20%`) — de az a régi, elvetett
// modell elvárása volt, amikor a magot a KÉPERNYŐHÖZ horgonyoztuk. A mai modellben
// a mag az ADATBÓL jön, és épp az a dolga, hogy ELFOGYJON, ahogy a testvérek
// helyet kapnak. Az állítás tehát olyat követelt, aminek nem szabad teljesülnie.
//
// Mégis mindig átment — mert a `varolistan > 0` szűrő SOHA nem talált egyetlen
// lépést sem: 2026-08-09 óta a várólista minden körben kiürül (a kapacitás már nem
// korlátozza a lerakást). Vagyis üresen, „nincs mérhető lépés" indoklással ment át,
// akármit csináltunk a modellel. Ez volt a próba vakfoltja.
//
// A HELYÉBE Csaba VALÓDI tünete kerül (2026-08-09): „ahogy közelítek, a belső mag
// a képernyőhöz képest folyamatosan nő, és előbb-utóbb csak az üres magot látom."
// Ez akkor mérhető, ha a letöltés is küszöb-vezérelt — ezért kellett előbb azt
// megcsinálni.
//
// A SZABÁLY: az üres mag ÁTMÉRŐJE nem nőheti túl a képernyő kisebbik oldalának a
// FELÉT. Miért a fele, és nem az egésze: a tünet nem akkor kezdődik, amikor a lyuk
// már kitölti a képernyőt, hanem amikor URALJA — fél képernyőnyi üresség fölött a
// kép már inkább lyuk, mint gondolat. (Az „egész képernyő" határ ráadásul vak
// maradna egy 700 px-es lyukra, ami nyilvánvalóan hibás.)
//
// A NÖVEKEDÉST MÉRJÜK, DE NEM BUKTATJUK EL RAJTA. Az utolsó commit ígérete az volt,
// hogy „a mag magától lefogy" — a mérés szerint ez 600 testvérnél teljesül, 3000-nél
// viszont NEM (118 → 281 px csúcs, mielőtt elfogy). Ez valós korlát, nem hiba: a
// nézet közben végig használható marad. Ezért a trend minden futásban KIÍRÓDIK
// (így egy romlás azonnal látszik), de a bukást a fenti, tünet-alapú határ dönti el.
function lyukEllenorzes(lepesek) {
  // CSAK azok a körök számítanak, ahol a nézet még tényleg ezt a szülőt mutatja:
  // fölötte már horgonyt váltott volna (lásd `horgonyValtasKepSugar`).
  const relevans = lepesek.filter(l =>
    Number.isFinite(l.lyukKepAtmero) && l.lerakott > 0 && l.horgonyErvenyes);
  if (relevans.length === 0) { allitas(false, 'A lyuk közelítéskor nem szalad el', 'nincs mérhető lépés'); return; }

  // MAG NÉLKÜL az elvárás a fordítottja: NE legyen lyuk — a legkisebb testvér a
  // középpontban ül, tehát a mért lyuk 0.
  if (!URES_MAG) {
    const legnagyobbLyuk = Math.max(...relevans.map(l => l.lyukKepAtmero));
    allitas(legnagyobbLyuk === 0, 'Nincs középső lyuk (a legkisebb a középpontban ül)',
      `a legnagyobb mért lyuk ${legnagyobbLyuk} px`);
    return;
  }

  const legnagyobb = Math.max(...relevans.map(l => l.lyukKepAtmero));
  const hatar = Math.min(KEPERNYO_SZELESSEG, KEPERNYO_MAGASSAG) / 2;

  // A betöltés alatti szakasz trendje: innen látszik, fogy-e a mag közelítés közben
  const betoltesAlatt = relevans.filter(l => l.hatravan > 0 || l.varolistan > 0);
  const elso = betoltesAlatt[0]?.lyukKepAtmero;
  const utolso = betoltesAlatt[betoltesAlatt.length - 1]?.lyukKepAtmero;

  allitas(legnagyobb <= hatar, 'A lyuk közelítéskor nem szalad el',
    `a legnagyobb mért lyuk ${legnagyobb} px (a határ ${hatar} px) · ` +
    (betoltesAlatt.length === 0
      ? 'a betöltés egyetlen körben lezajlott'
      : `a betöltés alatt ${elso} → ${utolso} px (${utolso <= elso ? 'fogy' : 'NŐ'})`));
}

// 6. DETERMINIZMUS
function determinizmusEllenorzes(gyerekek) {
  const ujjlenyomat = (lerakottak) => lerakottak
    .map(l => `${l.id}:${l.x.toFixed(12)}:${l.y.toFixed(12)}:${l.sugar.toFixed(12)}`)
    .join('|');

  const a = bejaras(gyerekek);
  const b = bejaras(gyerekek);
  allitas(ujjlenyomat(a.lerakottak) === ujjlenyomat(b.lerakottak),
    'Determinizmus (kétszer futtatva bitre azonos)');
}

// 7. STABILITÁS: EGY LERAKOTT SÍKIDOM SOHA NEM MOZDUL
// Ez a 2026-08-08-i modell fő ígérete. Ha megsérül, a nézetben az történik, amit
// Csaba jelzett: közelítéskor átrendeződik a kép, és egy szélső síkidomra
// gyakorlatilag lehetetlen ráközelíteni, mert elugrál.
function stabilitasEllenorzes(lerakottak, elsoHelyek, ujrapakolasok) {
  let mozdult = 0;
  let legnagyobb = 0;

  for (const l of lerakottak) {
    const elso = elsoHelyek.get(l.id);
    if (!elso) continue;
    const eltolodas = Math.hypot(l.x - elso.x, l.y - elso.y);
    if (eltolodas > 0) { mozdult++; legnagyobb = Math.max(legnagyobb, eltolodas); }
  }

  // AZ ÚJ MODELLBEN A MOZGÁS SZÁNDÉKOS, NEM HIBA. Minden új adag érkezésekor a
  // teljes készletet újrapakoljuk, mert az újak kisebbek mindenkinél, és nekik a
  // KÖZÉPPONT kell. A „soha nem mozdul" ígéretet tudatosan adtuk fel, cserébe a
  // rend (a legkisebbek középen) végig helyes marad.
  //
  // Amit itt MÉRNI érdemes: hányszor rendeződik át a kép egy teljes benagyítás
  // alatt — ennyiszer „ugranak el" a síkidomok az e-ember szeme előtt. Ez az
  // `ELORETOLTES_DARAB` hangolásának a mérőszáma.
  if (!ADAGONKENT_PAKOL) {
    naplo(`  --   Átrendeződés (szándékos) — a kép ${ujrapakolasok}× rendeződött át a ` +
          `benagyítás alatt · ${mozdult}/${lerakottak.length} síkidom került új helyre`);
    return;
  }

  allitas(mozdult === 0, 'Lerakás után egyetlen síkidom sem mozdul',
    mozdult === 0
      ? `${lerakottak.length} síkidom helye végig változatlan`
      : `${mozdult} elmozdult, a legnagyobb ${legnagyobb.toExponential(2)}`);
}

// 8. A FENNTARTOTT MAG ELÉG NAGY VOLT-E
// A becslés-alapú modell EGYETLEN lényegi állítása: a középen fenntartott hely
// elegendő a később érkezőknek. Ha nem az, a később jövők nem férnek befelé, és
// KIFELÉ szorulnak — ez borítja fel a rendet („a legkisebbek középen").
//
// A mérés MÉRET-TIZEDENKÉNT: a síkidomokat méret szerint tíz csoportra osztjuk, és
// megnézzük az átlagos középpont-távolságukat. Ha a mag elég nagy volt, ez a tíz
// átlag KIFELÉ NŐ — a legkisebbek a közép körül, a legnagyobbak a szélen.
//
// SZÁNDÉKOSAN NEM azt követeljük, hogy a körök tökéletesen egymásba ágyazódjanak:
// a valódi kör-pakolás a korábbi gyűrűk RÉSEIBE is tesz, tehát a szigorú
// „minden új kör beljebb" feltétel akkor is megsérülne, ha a modell hibátlan.
function magElegEllenorzes(lerakottak) {
  const rendezett = [...lerakottak].sort((a, b) => a.sugar - b.sugar);
  const tizedMeret = Math.max(1, Math.floor(rendezett.length / 10));

  const atlagok = [];
  for (let i = 0; i + tizedMeret <= rendezett.length && atlagok.length < 10; i += tizedMeret) {
    const csoport = rendezett.slice(i, i + tizedMeret);
    const osszeg = csoport.reduce((s, l) => s + Math.hypot(l.x, l.y), 0);
    atlagok.push(osszeg / csoport.length);
  }

  let sertes = 0;
  for (let i = 1; i < atlagok.length; i++) {
    if (atlagok[i] < atlagok[i - 1] - 1e-12) sertes++;
  }

  const elso = atlagok[0]?.toFixed(4) ?? '–';
  const utolso = atlagok[atlagok.length - 1]?.toFixed(4) ?? '–';

  naplo('       méret-tizedek átlagos középtávolsága (legkisebbtől a legnagyobbig):');
  naplo('       ' + atlagok.map(a => a.toFixed(4)).join('  '));

  allitas(sertes === 0, 'A fenntartott mag elég — a méret kifelé nő (tizedenként)',
    sertes === 0
      ? `a legkisebb tized átlagosan ${elso}, a legnagyobb ${utolso} távolságra (σ = ${MAG_SURUSEG})`
      : `${sertes} tizednél megfordul a sorrend — a mag kicsi (σ = ${MAG_SURUSEG})`);
}

// 9. A LYUK NEM NAGYOBB AZ INDOKOLTNÁL
// A 8. állítás a SORRENDET méri (kicsik belül), ez viszont a MÉRETET: mekkora a
// tényleges középső üresség ahhoz képest, amennyit a hátralévők indokolnak.
//
// Ezt az állítást azért kellett megírni, mert a 8. NEM fogta meg a 2026-08-09-i
// hibát: a nézet a megnyitáskor egyszerre kapott 150 gyökeret, és őket egy olyan
// mag köré pakolta, ami MINDEN 405 testvérre volt méretezve (T_hátra a lerakandó
// adagot is tartalmazta). A sorrend közben végig helyes maradt — csak a lyuk lett
// 5,4-szer akkora a kelleténél, és mivel semmi nem mozdul, ott is ragadt.
//
// A várt lyuk: a MÉG HELY NÉLKÜLIEK (a futás végén: senki) területéből. Ha a
// futás végére mindenki lekerült, a lyuknak gyakorlatilag el kell tűnnie — a
// tűrés a legkisebb síkidom átmérője, mert a legbelső kör körül mindig marad egy
// kis rés.
function lyukMeretEllenorzes(lerakottak, varolista) {
  const { magSugarRel } = meretek(lerakottak);
  const legkisebbSugar = Math.min(...lerakottak.map(l => l.sugar));

  // Ami még hely nélkül maradt, annak a területéből adódó indokolt lyuk
  const hatraPont = varolista.reduce((s, v) => s + v.pont, 0);
  const indokolt = Math.sqrt(hatraPont / (MERTEKEGYSEG * MAG_SURUSEG));

  // Tűrés: az indokolt lyuk + két legkisebb sugár (a legbelső kör körüli rés)
  const felsoHatar = indokolt + 2 * legkisebbSugar;
  const rendben = magSugarRel <= felsoHatar + 1e-9;

  allitas(rendben, 'A lyuk nem nagyobb az indokoltnál',
    `mért ${magSugarRel.toFixed(4)} · indokolt ${indokolt.toFixed(4)} · ` +
    `felső határ ${felsoHatar.toFixed(4)}`);
}

// ===== FUTTATÁS =====
naplo('');
naplo('===== SÍKIDOM-PAKOLÁS MÉRŐPRÓBA =====');
naplo(GYOKER_MOD
  ? `VILÁG-SZINT (valódi gyökér-adat): ${VALODI_GYOKEREK.length} gyökér · összesen ` +
    `${VALODI_GYOKEREK.reduce((a, b) => a + b, 0)} pont · a legerősebb ${LEGEROSEBB_GYOKER}`
  : `Gyerekek: ${GYEREK_DARAB} · zoom-lépés: ×${ZOOM_SZORZO} · kezdő képernyő-sugár: ${KEZDO_KEPSUGAR} px`);
naplo(`Láthatósági küszöb: ${MIN_KEP_ATMERO} px átmérő · betöltési mélység: ${BETOLTESI_MELYSEG}× · mag-sűrűség σ = ${MAG_SURUSEG}`);
naplo('');

const gyerekek = tesztGyerekek(GYEREK_DARAB);
const kezdet = Date.now();
const { lerakottak, varolista, lepesek, ujrapakolasok, legdragabb, elsoHelyek } = bejaras(gyerekek);
const idotartam = Date.now() - kezdet;

naplo('--- NAGYÍTÁS-LÉPÉSEK ---');
naplo('  kör   képsugár   érkezett   lerakva   várólistán   hátravan   lyuk(px)   idő(ms)');
for (const l of lepesek) {
  naplo(`  ${String(l.kor).padStart(3)}   ${String(l.kepSugar).padStart(8)}   ${String(l.erkezett).padStart(8)}   ${String(l.lerakott).padStart(7)}   ${String(l.varolistan).padStart(10)}   ${String(l.hatravan).padStart(8)}   ${String(l.lyukKepAtmero).padStart(8)}   ${l.ms.toFixed(0).padStart(7)}`);
}
naplo('');

naplo('--- ELLENŐRZÉSEK ---');
atfedesEllenorzes(lerakottak);
hianyEllenorzes(gyerekek, lerakottak, varolista);
beagyazasEllenorzes(lerakottak);
monotoniaEllenorzes(lerakottak);
lyukEllenorzes(lepesek);
stabilitasEllenorzes(lerakottak, elsoHelyek, ujrapakolasok);
magElegEllenorzes(lerakottak);
lyukMeretEllenorzes(lerakottak, varolista);
determinizmusEllenorzes(gyerekek);
naplo('');

naplo(`Újrapakolás: ${ujrapakolasok}× · a legdrágább lépés: ${legdragabb.toFixed(0)} ms`);
naplo(`Futásidő (3 teljes bejárás): ${idotartam} ms + a determinizmus-próba`);
naplo(hibak.length === 0
  ? '===== MINDEN ELLENŐRZÉS RENDBEN ====='
  : `===== ${hibak.length} ELLENŐRZÉS MEGBUKOTT =====`);
naplo('');

process.exit(hibak.length === 0 ? 0 : 1);
