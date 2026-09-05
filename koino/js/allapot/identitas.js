// koino/js/allapot/identitas.js

// Felelősség: megválaszolni EGYETLEN kérdést — KI TAG ebben a koinóban?
//
// ⭐ ÉS EZ SZÁMÍTÁS, NEM ESEMÉNY (D17). Senki nem „mondja ki", hogy valaki tag: az
// eseményekből következik, ugyanúgy, ahogy az egyezmény. Nincs nyilvántartás, amit
// vezetni kellene, és nincs kapuőr, aki elrontaná.
//
// ===== A SZERKEZET, AMIT EZ MEGVALÓSÍT (D56, 2026-09-06) =====
//
//   1. lépcső — a TAGSÁG:   EGY meghívó, és minden mehet (tartalom, tudatpont, szavazat).
//   2. lépcső — a PÉNZTÁRCA: három tanúsítás felhatalmazott tanúsítótól (ez még nincs itt).
//
// ⚠️ MIÉRT ILYEN OLCSÓ AZ ELSŐ LÉPCSŐ? Mert megmértük, hogy a kapu ÚGYSEM VÉD: a belépési
// szám nem védelmi paraméter, hanem **árcédula**. A fal pontosan ott van, ahol a támadó
// megvett embereinek száma eléri a kért meghívó-számot — az öt-meghívós szabály négy
// megvett embernél 0 hamisat enged be, ötnél 880-at. Nincs átmenet, csak kapcsoló.
// Részletek: `meres/eredmenyek.md` 11.1.
//
// ⭐ A VÉDELEM MÁSHOL VAN: a kontraszt-jelzésben és abban, hogy a rossz tanúsító elveszíti
// a szerepét (11.13, 12.5). Ez a fájl tehát SZÁNDÉKOSAN nem véd — csak megállapít.
//
// ===== A HORGONY: MI BIZONYÍTJA A TAGSÁGOT? =====
//
// Mindenkinek van egy „horgonya" ebben a koinóban — egy esemény, ami a tagságát hordozza:
//
//   · az ALAPÍTÓNAK a `KoinoLetrehozas` eseménye  → ⭐ ez a rekurzió ALAPESETE;
//   · mindenki másnak a saját `Belepes` eseménye  → ez nyitja meg az ő SZELETÉT.
//
// A meghívások a MEGHÍVOTT szeletében élnek (`entitas` = a meghívott horgonya). Ettől lesz
// a „hányan hívtak meg engem?" kérdés EGYETLEN szelet-lekérdezés — az a művelet, amit a
// 3.2 tett skálázhatóvá. 🔍 Egymilliárd e-embernél is ugyanennyi munka.
//
// ===== ⭐⭐ ÉS AMIÉRT A LÁNC BEJÁRHATÓ: MINDEN MEGHÍVÁS MAGÁVAL HOZZA A BIZONYÍTÉKÁT =====
//
// „Tag volt-e a meghívó?” — ez visszafelé mutató kérdés, tehát rekurzió. Hogy ne kelljen
// KERESNI a meghívó horgonyát (az a lánca végigolvasása lenne), az esemény MAGÁVAL HOZZA:
// az `adat.sajatBelepes` a meghívó saját horgonyára mutat. ⭐ Ugyanaz a minta, mint a D42
// bemondott összegénél: *ahol a tudás elfogy, ott az esemény hozza a bizonyítékát.*
//
// Így a bejárás tiszta mutató-követés: minden lépés egy esemény-lekérés + egy szelet.
//
// ⭐⭐ ÉS MÉRVE OLCSÓ (12.2): a gyökérig menő ellenőrzés 1500 főnél 17,7, 6000-nél 30,1,
// 20 000-nél 40,7 embert érint — vagyis **logaritmikus**, kettőzésenként ≈ +6. A láncok
// „középre” futnak és összeérnek, mert nincs szabad tanúsítgatás. Csaba állítása volt, és
// a mérés igazolta.
//
// ⚠️ A GYORSÍTÓTÁR NEM KÉNYELEM, HANEM A LÉNYEG. Nélküle a bejárás 3^mélység lenne; vele az
// ŐS-HALMAZ mérete, mert mindenkit CSAK EGYSZER nézünk meg.
//
// Használják: az állapot-számítás és a felület (később a szabály-réteg is).

import { esemenyLekerese, entitasEsemenyei } from '../tar/esemenyTar.js';

// ===================================
// A PARAMÉTER
// ===================================

// Hány érvényes meghívás kell a tagsághoz? ⭐ EGY (D56). Ez nem takarékosság: a mérés
// szerint a magasabb szám csak a BECSÜLETESEKET lassítja (az öt-meghívós szabálynál 30 kör
// alatt 693 tag lett az 1467 helyett, és 451 ember maradt kívül), a támadót viszont nem
// állítja meg, csak egyszeri árat szab neki.
export const MEGHIVO_KELL = 1;

// ===================================
// A NÉZET — a gyorsítótár, ami a bejárást olcsóvá teszi
// ===================================

/**
 * Új, üres identitás-nézet.
 *
 * ⭐ MIÉRT SZABAD GYORSÍTÓTÁRAZNI? A **D47** miatt: az ellenőrzés az aláírás pillanatában
 * történik és BEFAGY. Akiről egyszer eldőlt, hogy tag, az soha nem lesz nem-tag — tehát az
 * eredményt örökre meg lehet tartani.
 *
 * ⚠️ DE CSAK A POZITÍVAT. A „nem tag” lehet pusztán annyi, hogy nekünk HIÁNYZIK egy
 * esemény — és amint megérkezik, a válasz megváltozik. A tagadást tehát nem tároljuk el
 * (D19: a hiány nem vád).
 */
export function ujIdentitasNezet() {
  return {
    tagok: new Map(),        // horgony → { tag: true, ok } — csak a POZITÍV eredmények
    folyamatban: new Set(),  // a körök elleni védelem (lásd lent)
    olvasasok: 0             // hány eseményt kellett megnéznünk (a mérésekhez)
  };
}

// ===================================
// A TAGSÁG KISZÁMÍTÁSA
// ===================================

/**
 * Tag-e az, akinek ez a horgonya?
 *
 * @param {Object} tar - a megnyitott esemény-tár
 * @param {string} koino - melyik koinóról kérdezünk
 * @param {string} horgony - a `Belepes` (vagy alapítónál a `KoinoLetrehozas`) azonosítója
 * @param {Object} [nezet] - a gyorsítótár; ha nincs, egyszer használatos jön létre
 * @returns {Promise<{tag: boolean, ok: string, ellenorizheto: boolean}>}
 */
export async function tagE(tar, koino, horgony, nezet = ujIdentitasNezet()) {
  // ----- 1. AMIT MÁR TUDUNK -----
  const kesz = nezet.tagok.get(horgony);
  if (kesz) return kesz;

  // ----- 2. ⭐ A KÖR ELLENI VÉDELEM -----
  //
  // Ha „A” meghívta „B”-t és „B” meghívta „A”-t, akkor egyikük sem vezethető vissza az
  // alapítóig — mégis végtelen körbe futnánk. A megoldás nem hibaüzenet, hanem egy egyszerű
  // igazság: aki már a saját ellenőrzése KÖZBEN kerül elő, az ezen az ágon nem bizonyít
  // semmit. ⚠️ Ezt SOHA nem tároljuk el, mert csak erre az ágra igaz.
  if (nezet.folyamatban.has(horgony)) {
    return { tag: false, ok: 'kör a meghívási láncban', ellenorizheto: true };
  }
  nezet.folyamatban.add(horgony);

  try {
    const eredmeny = await horgonyVizsgalata(tar, koino, horgony, nezet);
    // ⭐ Csak a pozitívat őrizzük meg (lásd `ujIdentitasNezet`).
    if (eredmeny.tag) nezet.tagok.set(horgony, eredmeny);
    return eredmeny;
  } finally {
    nezet.folyamatban.delete(horgony);
  }
}

/** A tényleges vizsgálat — a kör-védelem már megtörtént. */
async function horgonyVizsgalata(tar, koino, horgony, nezet) {
  const esemeny = await esemenyLekerese(tar, horgony);
  nezet.olvasasok++;

  // ----- HIÁNYZÓ ESEMÉNY: NEM VÁD, HANEM „NEM ELLENŐRIZHETŐ” -----
  //
  // ⚠️ Ez a `szabalyok.js` harmadik kategóriája, és itt is ugyanazért kell: a szeletelt,
  // hálózati működésben a HIÁNY a normális átmeneti állapot. Ha a hiányt elutasításnak
  // vennénk, minden becsületes embert büntetnénk minden lemaradásért.
  if (!esemeny) {
    return { tag: false, ok: 'nem ellenőrizhető: hiányzik a horgony-esemény', ellenorizheto: false };
  }
  if (esemeny.koino !== koino) {
    return { tag: false, ok: 'a horgony egy MÁSIK koinóhoz tartozik', ellenorizheto: true };
  }

  // ----- ⭐ AZ ALAPESET: AZ ALAPÍTÓ -----
  //
  // Aki létrehozta a koinót, az tag — meghívás nélkül. Ez a rekurzió gyökere, és
  // szándékosan EGYETLEN ember: egy meghívó kell a belépéshez, tehát egy alapító elég
  // ahhoz, hogy a közösség elinduljon. A többi alapítót ő hívja be.
  if (esemeny.tipus === 'KoinoLetrehozas') {
    return { tag: true, ok: 'alapító — ő hozta létre a koinót', ellenorizheto: true };
  }

  if (esemeny.tipus !== 'Belepes') {
    return { tag: false, ok: 'a horgony nem belépési esemény', ellenorizheto: true };
  }

  // ----- A MEGHÍVÁSOK: A SAJÁT SZELETEMBŐL -----
  const szelet = await entitasEsemenyei(tar, koino, horgony);
  nezet.olvasasok += szelet.length;

  const meghivok = new Set();
  let voltNemEllenorizheto = false;

  for (const m of szelet) {
    if (m.tipus !== 'Meghivas') continue;

    // A meghívás RÓLAM szóljon: a `kit` mező a horgony szerzőjére mutasson. Enélkül egy
    // idegen szeletébe tett meghívás is beszámítana.
    if (m.adat?.kit !== esemeny.szerzo) continue;

    // ⛔ Magát senki nem hívhatja be — különben bárki tag lehetne egyetlen aláírással.
    if (m.szerzo === esemeny.szerzo) continue;

    // A meghívó horgonya: az esemény HOZZA MAGÁVAL, nem keressük.
    const meghivoHorgony = m.adat?.sajatBelepes;
    if (typeof meghivoHorgony !== 'string') continue;

    // ⚠️ És ellenőrizzük, hogy a horgony TÉNYLEG a meghívóé — különben bárki bármelyik tag
    // horgonyára hivatkozhatna, és a saját meghívása az ő tagságával igazolódna.
    const meghivoEsemeny = await esemenyLekerese(tar, meghivoHorgony);
    nezet.olvasasok++;
    if (!meghivoEsemeny) { voltNemEllenorizheto = true; continue; }
    if (meghivoEsemeny.szerzo !== m.szerzo || meghivoEsemeny.koino !== koino) continue;

    // ----- ÉS A REKURZIÓ: tag volt-e a meghívó? -----
    const meghivoAllapota = await tagE(tar, koino, meghivoHorgony, nezet);
    if (!meghivoAllapota.ellenorizheto) voltNemEllenorizheto = true;
    if (meghivoAllapota.tag) meghivok.add(m.szerzo);
  }

  if (meghivok.size >= MEGHIVO_KELL) {
    return {
      tag: true,
      ok: meghivok.size + ' tag hívta be',
      ellenorizheto: true
    };
  }

  return {
    tag: false,
    ok: voltNemEllenorizheto
      ? 'nem ellenőrizhető: a meghívási lánc egy része hiányzik'
      : 'nincs érvényes meghívása tagtól',
    ellenorizheto: !voltNemEllenorizheto
  };
}

// ===================================
// AMI SZÁNDÉKOSAN NINCS ITT
// ===================================
//
// - ⛔ NINCS MÉRET-KÜSZÖB („ekkora közösség fölött szigorítunk”). Az globális szám lenne
//   (hányan vagyunk?), és ugyanazon a 9. szabályon bukna el, mint a Duniter-alak. A kis
//   koino UGYANEZT a kódot futtatja — csak kevesebben vannak benne.
//
// - ⛔ NINCS JOGOSÍTÁSI FELTÉTEL a meghíváshoz („csak az hívhat, akinek elég…”). Mérve: az
//   ilyen küszöb **elrejti** a hamis szigetet (100% / 0% helyett 91% / 16%), mert arra
//   kényszeríti a támadót, hogy minden hamisat egy VALÓDI emberhez kössön — és attól a
//   hamis pontosan úgy néz ki, mint egy frissen érkezett becsületes ember.
//   ⭐ *Egy teljesítendő küszöb egyben hitelesítő pecsét is.*
//
// - A 2. LÉPCSŐ (felhatalmazás, tanúsítás, pénztárca) — a 9/c terv 4.3 lépése.
// - A KONTRASZT-JELZÉS — a 4.4 lépés. Ez lesz a valódi védelem, nem ez a fájl.
