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

// ===================================
// ⭐⭐⭐ TÖBB FORRÁSBÓL EGY FÁJL — A MUNKAMEGOSZTÁS (D68 / 6., 2026-09-15)
// ===================================
//
// ⛔ MIÉRT KELL EGYÁLTALÁN: mert mérve MEGÉRI (29. mérés) — ha a társak feltöltése a szűk
// keresztmetszet (az otthoni, aszimmetrikus vonalakon ez a tipikus), három forrás **×2,7**.
// ⚠️ De ha a MI letöltésünk a szűk, a haszon **×1,0**: ilyenkor a párhuzamosság semmit nem
// ad. *A gépezetnek ezért kell olcsónak lennie — nem nyerünk vele mindig.*
//
// ⭐⭐ MUNKALOPÓ, NEM ELŐRE KIOSZTOTT. Nem osztjuk fel a fájlt N egyenlő részre: van egy
// közös „mi hiányzik még" halmaz, és minden forrás **azt kéri, ami épp szabad**. ⛔ Előre
// kiosztott tartományoknál **a leglassabb forrás szabná meg a végét** (a többi rég végzett
// és állna) — márpedig a források soha nem egyforma gyorsak. *Ugyanaz az elv, mint a
// türelemnél: ne várjunk arra, aki nem halad.*
//
// ⚠️ EZ FUTÁSIDEJŰ ÁLLAPOT, NEM LEMEZRE ÍRT NAPLÓ. Az elvégzett munkát a **szelet-fájlok**
// őrzik (`reszlegesSzeletek`) — ez itt csak azt tartja számon, min dolgozik ÉPP valaki.
// *Ha a program leáll, semmi nem vész el: a mappa listája megmondja, hol tartunk.*

/**
 * ⭐ Hány forrástól kérjük EGYSZERRE ugyanazt a fájlt?
 *
 * ⛔ A 9. szabály kérdése („mit csinál egymilliárdnál?"): a szeletszám fájlonként korlátos
 * (2 MB / 64 KB = 32), de a **források számának is** felülről korlátosnak kell lennie —
 * különben egy nagy koinóban egyetlen fájlért száz kapcsolat nyílna. ⚠️ A 29. mérés szerint
 * a haszon 5 forrásig még nőtt (×2,6), de laposodik: a `3` a `EGYIDEJU_ATVITEL`-lel is
 * összhangban van. *Nem állapot-befolyásoló állandó (D66): szabadon hangolható.*
 */
export const FORRASONKENT_EGY_FAJLRA = 3;

/**
 * Munkamegosztás egy fájl szeleteire, több forrás között.
 *
 * ⚠️ A `kovetkezo()` AZÉRT aszinkron, mert **várakoznia kell tudni**: amíg az első válasz
 * meg nem érkezik, nem tudjuk a fájl méretét, tehát azt sem, hány szelet van. Ilyenkor a
 * többi forrás nem kiléphet (az elveszítené őket), hanem vár. *A méretet a `FAJLSZELET`
 * üzenet `teljes` mezője mondja meg — ez ma is benne van, nem új adat a vonalon.*
 *
 * @param {number[]} megvanEltolasok - ami a lemezen már megvan (`reszlegesSzeletek`)
 */
export function ujMunkamegosztas(megvanEltolasok = []) {
  let teljes = null;                         // amíg null: még nem tudjuk a fájl méretét
  const megvan = new Set(megvanEltolasok);
  const folyamatban = new Set();
  const varakozok = [];

  // A lezárás joga egyszer adható ki — lásd `lezarasEnyem` lentebb.
  let lezarva = false;
  let lezarasEredmeny = null;
  const lezarasVarok = [];

  const ebreszt = () => { while (varakozok.length) varakozok.shift()(); };

  /** A legkisebb eltolás, amit sem nem tudunk, sem nem kér épp valaki. */
  const szabadEltolas = () => {
    // ⚠️ Amíg a méret ismeretlen, CSAK EGY forrás indulhat — és a legkisebb hiányzóval,
    // hogy a válasz egyben a méretet is elhozza.
    //
    // ⛔⛔ ENNEK MÉRHETŐ ÁRA VAN, ÉS KI KELL MONDANI: az ELSŐ szelet mindig **sorosan**
    // jön, mert addig nem tudjuk, hány szelet van. Nyolc szeletnél ez az idő nyolcada,
    // tehát a három forrás elméleti ×3-a helyett ×2,3 a plafon — *és a 29. mérés valódi
    // kóddal mért ×2,0-ja ebből is áll.* ⚠️ A mérő-oldali utánzat ezt nem fizette meg
    // (ő vaktában osztott szeletet), ezért mutatott ×2,7-et.
    //
    // ⏸️ Megkerülhető lenne — a felderítés (`FAJLOK` válasz) megmondhatná a méretet, vagy
    // spekulatívan indulhatnánk —, de mindkettő új viselkedés: az egyik új mezőt tesz a
    // vonalra (6. szabály), a másik fölösleges kérést egy rövid fájlnál. *A mai ár ismert
    // és korlátos; a megkerülés ára nem.*
    if (teljes === null) {
      if (folyamatban.size > 0) return null;
      let e = 0;
      while (megvan.has(e)) e += SZELET_MERET;
      return e;
    }
    for (let e = 0; e < teljes; e += SZELET_MERET) {
      if (!megvan.has(e) && !folyamatban.has(e)) return e;
    }
    return null;
  };

  const keszEgesz = () => {
    if (teljes === null) return false;
    for (let e = 0; e < teljes; e += SZELET_MERET) if (!megvan.has(e)) return false;
    return true;
  };

  return {
    /** A `FAJLSZELET` `teljes` mezőjéből — az első válasz megmondja, mekkora a fájl. */
    meretMegvan(t) {
      if (teljes === null && Number.isInteger(t) && t >= 0) {
        teljes = t;
        ebreszt();                            // ⭐ innentől a többi forrás is kaphat munkát
      }
    },

    get teljesMeret() { return teljes; },
    keszEgesz,

    /**
     * A következő szelet, amit ez a forrás elhozhat — vagy `null`, ha nincs több dolga.
     * @returns {Promise<number|null>} eltolás
     */
    async kovetkezo() {
      for (;;) {
        if (keszEgesz()) return null;
        const e = szabadEltolas();
        if (e !== null) { folyamatban.add(e); return e; }
        // ⛔ Nincs szabad szelet, DE dolgozik még valaki: várunk. Ha ő elbukik, a szelete
        // visszakerül, és mi visszük tovább. *Ettől nem vész el munka egy néma társnál.*
        if (folyamatban.size === 0) return null;
        await new Promise((t) => varakozok.push(t));
      }
    },

    /** Megvan a szelet — a lemezen is. */
    kesz(eltolas) {
      folyamatban.delete(eltolas);
      megvan.add(eltolas);
      ebreszt();
    },

    /** Nem sikerült (a forrás elnémult vagy hibázott) — más elviheti. */
    elengedi(eltolas) {
      folyamatban.delete(eltolas);
      ebreszt();
    },

    /** ⚠️ Egy forrás kilépett: ha ő volt az utolsó dolgozó, a várakozókat el kell engedni. */
    kilep() { ebreszt(); },

    // ===== ⛔⛔ KI ZÁRJA LE A FÁJLT? =====
    //
    // Több forrásnál ez nem magától értetődő: **mindegyik ág látja**, hogy minden szelet
    // megvan. Ha mind lezárna, a második már „nincs részleges fájl"-t kapna — *hibának
    // látszana az, hogy valaki más volt gyorsabb.* ⭐ Ezért a lezárás joga **egyszer adható
    // ki**, és a többi ág megvárja az eredményt, hogy ugyanazt mondhassa.
    lezarasEnyem() {
      if (lezarva) return false;
      lezarva = true;
      return true;
    },

    lezarasKesz(eredmeny) {
      lezarasEredmeny = eredmeny;
      while (lezarasVarok.length) lezarasVarok.shift()();
    },

    /** ⚠️ Csak akkor hívható, ha valaki már elkezdte a lezárást — különben nem jönne válasz. */
    async lezarasraVar() {
      if (lezarasEredmeny) return lezarasEredmeny;
      await new Promise((t) => lezarasVarok.push(t));
      return lezarasEredmeny;
    }
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
export function szeletEllenorzes(kertEltolas, eltolas, hossz, korlat) {
  // ⚠️⚠️ AZ ELSŐ PARAMÉTER JELENTÉSE MEGVÁLTOZOTT (2026-09-15, D68 / 6.): korábban az
  // „eddigi méret" volt, mert a szeletek **sorrendben** jöttek, és a méret megmondta, hol
  // tartunk. Több forrásnál ez elesik — a 3. szelet megjöhet az 1. előtt. ⭐ Ezért most azt
  // nézzük, hogy a válasz **arra jött-e, amit KÉRTÜNK**. *Ugyanaz a védelem, szigorúbb
  // alapon: a kérés a mi állításunk, az „eddigi méret" viszont feltevés volt a sorrendről.*
  if (eltolas !== kertEltolas) {
    return { rendben: false, ok: 'nem arra érkezett, amit kértünk (' + eltolas
      + ' ≠ ' + kertEltolas + ')' };
  }
  if (!Number.isInteger(hossz) || hossz < 0 || hossz > SZELET_MERET) {
    return { rendben: false, ok: 'érvénytelen szelet-hossz: ' + hossz };
  }
  if (Number.isInteger(korlat) && kertEltolas + hossz > korlat) {
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
  const fajlonkent = beallitas.fajlonkent ?? FORRASONKENT_EGY_FAJLRA;

  const terv = [];
  const tarsTerhelese = new Map();
  let kapcsolatok = 0;

  for (const h of sorrend ?? []) {
    if (kapcsolatok >= osszesen) break;

    // ⚠️ A társak sorrendje determinisztikus (címke szerint), hogy két futás ugyanazt adja.
    const tarsak = Object.keys(jegyzet?.[h.lenyomat]?.tarsak ?? {}).sort();

    // ⭐⭐ TÖBB FORRÁS EGY FÁJLHOZ (D68 / 6., 2026-09-15) — mérve megéri (29. mérés):
    // ha a társak feltöltése a szűk keresztmetszet, három forrás **×2,7**.
    //
    // ⛔ AZ `osszesen` MOSTANTÓL A KAPCSOLATOKAT SZÁMOLJA, nem a fájlokat — ez a valódi
    // erőforrás. ⭐ És a sorrend dönt: az ELSŐ fájl (a legritkább, a `ritkasagSzerint`
    // szerint) kapja meg a forrásokat, a maradék kapcsolat megy a következőre.
    // *Ez a „legrövidebb feladat előbb": egy KÉSZ fájl ér valamit, a félkész nem —
    // azt a bulin sem ajánlhatjuk fel.*
    const valasztott = [];
    for (const t of tarsak) {
      if (valasztott.length >= fajlonkent) break;
      if (kapcsolatok + valasztott.length >= osszesen) break;
      if ((tarsTerhelese.get(t) ?? 0) >= tarsankent) continue;
      valasztott.push(t);
    }
    if (!valasztott.length) continue;   // senki nem ér rá (vagy nem tudjuk, kinél van meg)

    // ⭐ A TERV MEGMONDJA A TÜRELMET IS — mert itt tudjuk, hány forrás van (D68).
    // *A vonal ezt nem tudhatja: ő csak csomagokat lát (1. szabály).*
    terv.push({
      lenyomat: h.lenyomat,
      tarsak: valasztott,
      forrasok: tarsak.length,
      turelem: turelemForrasokbol(tarsak.length)
    });
    for (const t of valasztott) tarsTerhelese.set(t, (tarsTerhelese.get(t) ?? 0) + 1);
    kapcsolatok += valasztott.length;
  }

  return terv;
}
