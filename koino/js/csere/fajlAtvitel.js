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
// ⭐⭐⭐ A TÜRELEM: AMENNYIT AZ ALTERNATÍVA HIÁNYA INDOKOL (D68, Csaba 2. válasza)
// ===================================
//
// ⛔⛔ MI VOLT A BAJ: a UDP-vonal **30 000 ms**-ig küzdött EGYETLEN 1000 bájtos darabért,
// és ez a szám **honnan sem jött** — se a vonalból, se a feladatból. ⚠️ Csaba döntése
// (2026-09-14) nem az volt, hogy vigyük le egy kisebb fix számra: *„az ugyanolyan varázsszám
// lenne"* — hanem hogy **függjön attól, hány forrásból szerezhető be ugyanaz.**
//
// ⭐ AZ ELV, EGY MONDATBAN: *a türelem annyi legyen, amennyit az alternatíva hiánya indokol.*
//
//   · **egy forrás** → ha feladom, a fájl **nem jön meg** (amíg új forrás nem akad),
//     tehát érdemes kitartani;
//   · **sok forrás** → a következő próbálkozás egy **másik vonalon** megy, tehát a váltás
//     olcsóbb, mint a küzdelem.
//
// ⭐⭐ ÉS AMIÉRT A FELADÁS TÉNYLEG OLCSÓ: **a részleges fájl megmarad, és a mérete maga az
// állapot** — a következő próbálkozás onnan folytatja, ahol abbamaradt. *A feladás itt nem
// adatvesztés, hanem társ-váltás.*
//
// ⛔ AZ ALSÓ KORLÁT NEM DÍSZ: egy 800 ms oda-visszájú (műholdas, mobil) vonalon az
// újraküldési idő önmagában 1–2 másodperc. Ha ez alá mennénk, **a lassú vonalon soha semmi
// nem jönne át** — és a 9. szabály szerint a lassú vonal **alapeset, nem kivétel**.
//
// ⚠️ NEM állapot-befolyásoló állandók (D66): ha nálam más a türelem, **ugyanazt az állapotot
// számoljuk** — csak máskor váltok társat.
export const TURELEM_MAX = 30000;   // egyetlen forrásnál: nincs hova menni
export const TURELEM_MIN = 5000;    // ennyi egy lassú vonalon is néhány próbálkozás

/**
 * ⭐ Mennyit küzdjünk EGY forrással, ha ennyi forrás van összesen?
 *
 * ⚠️ Az ismeretlen forrásszám (0, `null`, hibás) a **legóvatosabb** választ adja: ha nem
 * tudunk alternatíváról, akkor nincs alternatíva. *A hiány nem ok a türelmetlenségre (D19).*
 *
 * @param {number} forrasok - hány társnál van meg ez a fájl
 * @returns {number} ezredmásodperc
 */
export function turelemForrasokbol(forrasok) {
  const n = Number.isFinite(forrasok) && forrasok > 0 ? Math.floor(forrasok) : 1;
  return Math.max(TURELEM_MIN, Math.round(TURELEM_MAX / n));
}

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

    // ⭐ A TERV MEGMONDJA A TÜRELMET IS — mert itt tudjuk, hány forrás van (D68).
    // *A vonal ezt nem tudhatja: ő csak csomagokat lát (1. szabály).*
    terv.push({
      lenyomat: h.lenyomat, tars: szabad,
      forrasok: tarsak.length,
      turelem: turelemForrasokbol(tarsak.length)
    });
    tarsTerhelese.set(szabad, (tarsTerhelese.get(szabad) ?? 0) + 1);
  }

  return terv;
}
