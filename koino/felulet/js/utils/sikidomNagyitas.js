// frontend/js/utils/sikidomNagyitas.js

// ===== A NAGYÍTÁS SZÁMTANA =====
//
// Felelősség: megmondani, MENNYIT szabad nagyítani — és mennyit kért az e-ember.
// Nem nyúl a nézethez, nem rajzol, nem ismeri a csomópont-tárat: számokat kap és
// számot ad. A tényleges nagyítást (a `skala` és az `eltolas` állítását) a
// SikidomModal `_zoom`-ja végzi ebből.
//
// A KÉT HATÁR SOSEM HARAP EGYSZERRE: az egyik csak kicsinyítésre, a másik csak
// nagyításra vonatkozik. Ezért fűzhetők egymásba (`befele(kifele(szorzo))`).
//
//   KIFELÉ — a VILÁG szintnél elfogy a hierarchia, tovább kicsinyítve üres képernyő.
//   BEFELÉ — ha a horgonynak nincs mibe lelépnie, a horgonyváltás nem tud dolgozni,
//            és a skála elszaladna a lebegőpontos pontosság fölé.
//
// SZÁNDÉKOSAN nincs DOM-függése: Node-ból egység-tesztelhető — a mérőpróbája a
// `backend/tools/sikidomMelysegProba.mjs`.
// Használja: SikidomModal.js (a Síkidom nézet).

// ===== IMPORTOK =====
import { LEFELE_KUSZOB } from './sikidomHorgony.js';
import { LEGNAGYOBB_GYEREK_ARANY } from './sikidomMeret.js';

// ===== A +/− GOMBOK LÉPÉSE =====
export const ZOOM_LEPES = 1.2;

// ===== A GÖRGŐ ÉRZÉKENYSÉGE (a koino_1.0 D3-as viselkedése) =====
// A korábbi megoldás minden görgetés-eseményre UGYANAKKORÁT nagyított (fix 1,2×).
// Ez érintőpadon rossz: ott egy finom mozdulat is sok apró eseményt küld
// (deltaY = 1–4), amiből így 1,2-szeres ugrások sorozata lett — a kép elszaladt.
//
// A koino_1.0 a D3 alapértelmezését használta (`d3.zoom`, 7.8.5), ami a delta
// NAGYSÁGÁVAL arányos:  szorzó = 2^(−deltaY × egység).
// Egy „kattanós" egérgörgő deltaY-ja 100 → 2^0,2 ≈ 1,149-szeres lépés;
// egy finom érintőpad-mozdulaté 3 → 2^0,006 ≈ 1,004 — vagyis simán, folytonosan.
//
// Az egységek a D3 `wheelDelta`-jából: képpont / sor / oldal görgetési módhoz.
// EZ A FŐ HANGOLÓ SZÁM (érintőpad kétujjas görgetése, egérgörgő):
//   0,001 → egy egérgörgő-kattanás ×1,07 · 0,002 → ×1,15 · 0,003 → ×1,23
//   0,004 → ×1,32 · 0,005 → ×1,41 (két kattanás = kétszeres nagyítás)
export const GORGO_EGYSEG_KEPPONT = 0.002;   // deltaMode 0 — képpont (érintőpad, modern egér)

// deltaMode 1 — SOROKBAN görgető böngésző (Windowson jellemzően a Firefox
// egérgörgője: deltaY = 3). Szándékosan a képpontos egység 100/3-szorosa, hogy
// egy egérgörgő-kattanás MINDEN böngészőben ugyanakkorát nagyítson. (A D3
// alapértéke itt 0,05 volt, amitől a Firefox érezhetően lassabban nagyított.)
export const GORGO_EGYSEG_SOR     = GORGO_EGYSEG_KEPPONT * 100 / 3;

// deltaMode 2 — OLDALANKÉNT görgető (ritka)
export const GORGO_EGYSEG_OLDAL   = 1;

// ÉRINTŐPAD-CSIPPENTÉS. A böngészők `ctrlKey = true`-val küldik, és sokkal
// KISEBB delta-értékekkel, mint a kétujjas görgetést — a görgetés egységével a
// csippentés alig mozdítaná a képet. Ha a csippentés lomhának érződik, EZT emeld.
//
// 0,010 → 0,012 (Csaba, 2026-08-08): 20%-kal érzékenyebb, mert lomha volt.
export const GORGO_EGYSEG_CSIPPENTES = 0.012;

// ===== KIFELÉ NAGYÍTÁS ALSÓ HATÁRA =====
// A VILÁG szintnél elfogy a hierarchia: a horgony nem tud tovább fölfelé lépni, és
// ha tovább kicsinyítesz, minden a láthatósági küszöb alá esik — üres képernyő,
// amiből csak az „illesztés" gomb hoz vissza. A koino_1.0-ban ezt a D3
// `scaleExtent` fogta meg; nálunk az illesztési nagyítás töredékében húzzuk meg.
export const KIFELE_HATAR = 0.25;   // az illesztési skála negyedénél megáll

// ===== BEFELÉ NAGYÍTÁS FELSŐ HATÁRA (Csaba böngészős mérése, 2026-08-11) =====
// Sokáig az volt a szabály, hogy „befelé nincs korlát, arra való a horgonyváltás".
// Ez IGAZ — de csak addig, amíg a horgony le TUD lépni. Ha olyan csomóponton áll,
// aminek nincs (betöltött) gyereke, akkor nincs mibe lelépnie, kifelé viszont már
// túl nagy: ott ragad, és a befelé nagyítást SEMMI nem fogja meg.
//
// MÉRVE a böngészőben (2026-08-11, Csaba vezetett, a nézetet kívülről mértük):
// a horgony az 1. szinten megállt `gyerekDb: 0`-val, és onnantól a skála
// 1,18·10³-ról 1,81·10¹⁴-re szaladt. A mély síkidomok helye `eltolás + skála · x`
// alakban áll elő; 10¹⁴ nagyságrendű skálánál a `double` 16 jegye elfogy, és a kép
// REMEGNI kezd. Pontosan ez volt a „19-20. szint után szétesik" tünet.
//
// A SZABÁLY: a befelé nagyítás nem viheti a horgonyt túl azon a ponton, ahol a
// váltás esedékes LENNE. A határt nem önkényesen választjuk, hanem a meglévő két
// állandóból vezetjük le: a horgony akkor váltana le, ha egy gyereke elérné a
// képernyő `LEFELE_KUSZOB`-szorosát, és a lehető legnagyobb gyerek a szülője
// sugarának `LEGNAGYOBB_GYEREK_ARANY`-szorosa (1/√20). Ennél nagyobbra tehát még
// a legkedvezőbb esetben sem kellene nőnie:
//
//   maxHorgonyÁtmérő = képernyő × LEFELE_KUSZOB / LEGNAGYOBB_GYEREK_ARANY
//                    = képernyő × 2 / 0,2236 ≈ képernyő × 8,94
//
// Ez a korlát CSAK akkor él, ha a horgonynak nincs betöltött gyereke. Amint
// megérkeznek, a korlát magától felenged, és a horgony lelép — vagyis a betöltésre
// váró e-ember nem falba ütközik, csak megvárja az adatot.
export const BEFELE_HATAR = LEFELE_KUSZOB / LEGNAGYOBB_GYEREK_ARANY;

// ===== A GÖRGETÉS SZORZÓJA =====
// Egy `wheel` eseményből a kért nagyítás-szorzó. Az érintőpad CSIPPENTÉSE is
// `wheel`-ként érkezik, `ctrlKey = true`-val (a böngészők így jelzik) — annak
// külön, nagyobb egysége van.
//
// @param {WheelEvent} esemeny  (elég, ha van `deltaY`, `deltaMode`, `ctrlKey`)
// @returns {number} a kért szorzó (1 = nincs mozgás)
export function gorgoSzorzo(esemeny) {
  const egyseg = esemeny.ctrlKey        ? GORGO_EGYSEG_CSIPPENTES
               : esemeny.deltaMode === 1 ? GORGO_EGYSEG_SOR
               : esemeny.deltaMode === 2 ? GORGO_EGYSEG_OLDAL
               : GORGO_EGYSEG_KEPPONT;

  return Math.pow(2, -esemeny.deltaY * egyseg);
}

// ===== A KIFELÉ NAGYÍTÁS ALSÓ HATÁRA =====
// Befelé nincs korlát (arra való a horgonyváltás). Kifelé viszont a VILÁG
// szintnél elfogy a hierarchia, és tovább kicsinyítve minden a láthatósági
// küszöb alá esne — üres képernyő. A határt az illesztési nagyításhoz mérjük.
//
// Csak a VILÁG horgonynál kell vizsgálni: mélyebbről a `_horgonyEllenorzes`
// úgyis fölfelé lépteti a horgonyt, amíg ide nem ér.
//
// @param {Object} beallitasok
// @param {number} beallitasok.szorzo        - a kért nagyítás-szorzó
// @param {boolean} beallitasok.vilagSzinten - a horgony a VILÁG-e?
// @param {number} beallitasok.alapSkala     - az illesztési nagyítás (null, ha még nem volt)
// @param {number} beallitasok.skala         - a mostani nagyítás
// @returns {number} a ténylegesen alkalmazható szorzó (1 = nincs mozgás)
export function kifeleHatarolas({ szorzo, vilagSzinten, alapSkala, skala }) {
  if (szorzo >= 1) return szorzo;         // befelé sosem korlátozunk
  if (!vilagSzinten) return szorzo;       // van még hova fölfelé lépni
  if (!(alapSkala > 0)) return szorzo;    // még nem volt illesztés

  const alsoHatar = alapSkala * KIFELE_HATAR;
  if (skala <= alsoHatar) return 1;

  return Math.max(szorzo, alsoHatar / skala);
}

// ===== A BEFELÉ NAGYÍTÁS FELSŐ HATÁRA =====
// Lásd `BEFELE_HATAR`. A korlát CSAK akkor él, ha a horgonynak nincs betöltött
// gyereke — ilyenkor a horgonyváltás nem tud dolgozni, tehát semmi más nem
// fogná meg a nagyítást, és a skála elszaladna a `double` pontossága fölé.
//
// Ha VAN betöltött gyerek, nem korlátozunk: a váltást a `_horgonyEllenorzes`
// úgyis elvégzi, amint a gyerek eléri a küszöböt. Egy nagyon gyenge (parányi)
// gyerekhez nagy skála kell — ez rendben van, mert az ő helye `skála · relR`
// szorzatként marad épp akkora, amekkorának látszik.
//
// @param {Object} beallitasok
// @param {number} beallitasok.szorzo           - a kért nagyítás-szorzó
// @param {boolean} beallitasok.vanHovaLelepni  - van-e a horgonynak betöltött gyereke?
// @param {number} beallitasok.kepernyoMeret    - a képernyő kisebbik oldala
// @param {number} beallitasok.skala            - a mostani nagyítás
// @returns {number} a ténylegesen alkalmazható szorzó (1 = nincs mozgás)
export function befeleHatarolas({ szorzo, vanHovaLelepni, kepernyoMeret, skala }) {
  if (szorzo <= 1) return szorzo;         // kifelé itt sosem korlátozunk
  if (vanHovaLelepni) return szorzo;      // a horgonyváltás úgyis megfogja

  // A skála a horgony képernyő-SUGARA (a horgony sugara a saját keretében 1),
  // ezért a megengedett átmérő fele a felső határ.
  const felsoHatar = (kepernyoMeret * BEFELE_HATAR) / 2;
  if (skala >= felsoHatar) return 1;

  return Math.min(szorzo, felsoHatar / skala);
}

// ===== A GESZTUS PILLANATNYI ÁLLAPOTA =====
// Az ÖSSZES lenyomott ujj közül az első kettőt vesszük (három ujjnál sem esik
// szét a kezelés). Egy ujjnál a „középpont" maga az ujj, a távolság 0 — ilyenkor
// a hívó nem nagyít, csak mozgat.
//
// A koordináták KÉPERNYŐ-koordináták (clientX/Y); a nézet-elemhez viszonyítást
// a hívó végzi el, ahol szükséges.
//
// @param {Array<{x:number, y:number}>} mutatok - a lenyomott ujjak/egérgombok
// @returns {{kozepX:number, kozepY:number, tavolsag:number}|null}
export function gesztusAllapot(mutatok) {
  if (mutatok.length === 0) return null;

  const [a, b] = mutatok;
  if (!b) return { kozepX: a.x, kozepY: a.y, tavolsag: 0 };

  return {
    kozepX: (a.x + b.x) / 2,
    kozepY: (a.y + b.y) / 2,
    tavolsag: Math.hypot(a.x - b.x, a.y - b.y)
  };
}

// ===== EXPORTÁLÁS =====
export default {
  gorgoSzorzo, kifeleHatarolas, befeleHatarolas, gesztusAllapot,
  ZOOM_LEPES, KIFELE_HATAR, BEFELE_HATAR,
  GORGO_EGYSEG_KEPPONT, GORGO_EGYSEG_SOR, GORGO_EGYSEG_OLDAL, GORGO_EGYSEG_CSIPPENTES
};
