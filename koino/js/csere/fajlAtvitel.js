// koino/js/csere/fajlAtvitel.js

// Felelősség: A BÁJTOK ÁTVITELÉNEK LOGIKÁJA — szeletelés, folytatás, lezárás.
// ⚠️ **Hálózatot nem importál** (1. szabály), tehát vonal nélkül mérhető.
//
// ===== ⭐ CSABA NÉGY DÖNTÉSE (2026-09-13), ÉS ITT MIND A NÉGY LÁTSZIK =====
//
//   1. **A kérelmező kezdeményez** — ő tudja, mire vár. Ez a lap ezért az ő oldaláról
//      írja le a folyamatot: *hol tartok, mit kérjek legközelebb.*
//   2. **64 KB-os szelet**, és ⭐ a folytatáshoz **nem kell új gépezet**: a részleges fájl
//      **mérete maga az állapot** — abból következik, hol folytassuk.
//   3. **3 egyidejű átvitel irányonként, társanként legfeljebb egy** — hogy egy lassú társ
//      ne foglalhassa le az egész készüléket.
//   4. **A ritkábbat előbb** (ez a `fajlKerelem.js`-ben dőlt el), és ⛔ *„ki mennyit adott"
//      mérleg NINCS* — az rangsor lenne (D18/2, D48).
//
// ===== ⛔⛔ ÉS A LEZÁRÁS SZABÁLYA, AMI MINDENT EGYBEN TART =====
//
// A részleges fájl **ideiglenes néven** áll, és csak akkor kerül a végleges
// (lenyomat-)nevére, ha a bájtjai **tényleg azt adják ki**. *Így egy megszakadt vagy
// meghamisított letöltés soha nem hagy hátra hamis fájlt* — és a csatornát továbbra sem
// kell megbízhatóvá tenni (3. szabály). ⭐ Ez nem új szabály: ugyanaz, ami az esemény
// azonosítójánál is áll — **a név maga a bizonyíték**.
//
// Használják: `vonal.js` (a szeletek küldése/fogadása) és a `koino.js`.

// ⭐ EGY SZELET MÉRETE (Csaba döntése). Elég nagy ahhoz, hogy a nyugta-forgalom
// elhanyagolható legyen, és elég kicsi ahhoz, hogy egy megszakadt átvitelnél **keveset
// veszítsünk**. ⚠️ A UDP-darab ennél jóval kisebb — a szelet úgyis darabokra bomlik alatta.
export const SZELET_MERET = 64 * 1024;

// ⭐ HÁNY EGYIDEJŰ ÁTVITEL (Csaba döntése). ⚠️ A társankénti korlát a fontosabb: enélkül
// egy lassú társ lefoglalhatná mind a hármat, és a munka nem terülne szét.
export const EGYIDEJU_ATVITEL = 3;
export const TARSANKENT = 1;

// ===================================
// 1. HOL TARTOK, ÉS MIT KÉRJEK?
// ===================================

/**
 * A következő kérés egy fájlhoz — a részleges méretből.
 *
 * ⭐ NINCS SZELET-NYILVÁNTARTÁS: a szeletek rögzített méretűek és sorrendben érkeznek,
 * tehát a meglévő bájtok száma **megmondja**, hol folytassuk. *A fájl tartalma az igazság,
 * nem egy mellette vezetett napló.*
 *
 * @param {number} eddigiMeret - hány bájt van meg (0, ha még semmi)
 * @returns {{eltolas: number, meret: number, index: number}}
 */
export function kovetkezoKeres(eddigiMeret) {
  const eddig = Number.isInteger(eddigiMeret) && eddigiMeret > 0 ? eddigiMeret : 0;
  return {
    eltolas: eddig,
    meret: SZELET_MERET,
    // ⚠️ Az index csak naplózáshoz és emberi olvasáshoz kell — a protokoll az ELTOLÁST
    // használja, mert az akkor is helyes, ha a szelet-méret egyszer változna.
    index: Math.floor(eddig / SZELET_MERET)
  };
}

/**
 * A kapott szelet elfogadható-e?
 *
 * ⛔⛔ HÁROM DOLGOT NÉZÜNK MEG, ÉS MINDHÁROM EGY-EGY TÁMADÁST ZÁR KI:
 *
 *   · **rossz eltolás** → a társ nem oda küld, ahol tartunk (vagy összekeveredtek a
 *     válaszok) — a fájl így csendben elromlana;
 *   · **túl nagy szelet** → egy kérés végtelen adatot hozhatna be;
 *   · **a korlát túllépése** → a lemezünket töltenék meg (`FAJL_KORLAT`).
 *
 * ⚠️ EGYIK SEM VÁD, csak elutasítás: a lezárás úgyis újra lenyomatol.
 *
 * @returns {{rendben: boolean, ok?: string}}
 */
export function szeletEllenorzes(eddigiMeret, eltolas, hossz, korlat) {
  if (eltolas !== eddigiMeret) {
    return { rendben: false, ok: 'nem oda érkezett, ahol tartunk (' + eltolas
      + ' ≠ ' + eddigiMeret + ')' };
  }
  if (!Number.isInteger(hossz) || hossz < 0 || hossz > SZELET_MERET) {
    return { rendben: false, ok: 'érvénytelen szelet-hossz: ' + hossz };
  }
  if (Number.isInteger(korlat) && eddigiMeret + hossz > korlat) {
    return { rendben: false, ok: 'a fájl túllépné a felső méretkorlátot' };
  }
  return { rendben: true };
}

// ===================================
// 2. ⭐ MIT KÉRJEK, ÉS KITŐL? — a munka elosztása
// ===================================

/**
 * Az átvitel-terv: melyik fájlt melyik társtól kérjük.
 *
 * ⭐ A SORREND MÁR KÉSZ (a `ritkasagSzerint` adja: vállaltak előre, azon belül a ritkább).
 * Ez a függvény csak **elosztja** a munkát, két korláttal:
 *
 *   · legfeljebb `EGYIDEJU_ATVITEL` összesen,
 *   · és **társanként legfeljebb `TARSANKENT`** — ⭐ ez a fontosabb: enélkül egy lassú
 *     társ lefoglalná mind a hármat, és a munka nem terülne szét.
 *
 * ⚠️ AKIRŐL NEM TUDJUK, KINÉL VAN MEG, azt kihagyjuk — nem kérdezünk vaktában. A következő
 * buli úgyis megmondja (D19: a hiány nem hiba, csak még nem tudjuk).
 *
 * @param {Array<Object>} sorrend - a `ritkasagSzerint` eredménye
 * @param {Object} jegyzet - lenyomat → { tarsak: { címke: időpont } }
 * @param {Object} [beallitas]
 * @returns {Array<{lenyomat: string, tars: string}>}
 */
export function atvitelTerv(sorrend, jegyzet, beallitas = {}) {
  const osszesen = beallitas.osszesen ?? EGYIDEJU_ATVITEL;
  const tarsankent = beallitas.tarsankent ?? TARSANKENT;

  const terv = [];
  const tarsTerhelese = new Map();

  for (const h of sorrend ?? []) {
    if (terv.length >= osszesen) break;

    // ⚠️ A társak sorrendje determinisztikus (címke szerint), hogy két futás ugyanazt adja.
    const tarsak = Object.keys(jegyzet?.[h.lenyomat]?.tarsak ?? {}).sort();
    const szabad = tarsak.find((t) => (tarsTerhelese.get(t) ?? 0) < tarsankent);
    if (!szabad) continue;      // senki nem ér rá (vagy nem tudjuk, kinél van meg)

    terv.push({ lenyomat: h.lenyomat, tars: szabad });
    tarsTerhelese.set(szabad, (tarsTerhelese.get(szabad) ?? 0) + 1);
  }

  return terv;
}
