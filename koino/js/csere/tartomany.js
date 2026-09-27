// koino/js/csere/tartomany.js

// Felelősség: A TARTOMÁNY-EGYEZTETÉS (S4 — D72/4, D74) — két azonosító-halmaz KÜLÖNBSÉGÉNEK
// megtalálása úgy, hogy a forgalom az ELTÉRÉSEK számától függjön, ne a halmaz méretétől.
//
// ===== ⭐ MIÉRT (a szeletelési terv 4.2) =====
//
// A mai csere szerzőnként bemondja, meddig tud (ÁLLÁS) — ez a SZERZŐK számával nő: 100 000
// eseménynél egyetlen eltérésért 160 KB (48. mérés). A tartomány-egyeztetés mást kérdez: *„ebben
// az azonosító-tartományban ennyi az én lenyomatom — a tiéd?"* Ahol egyezik, kész; ahol nem, a
// tartományt felosztjuk, és ott folytatjuk; ahol már kevés azonosító maradt, azokat elküldjük. Az
// ár **az eltérések száma × log(a halmaz mérete)**. *(A módszer: Aljoscha Meyer, „Range-Based Set
// Reconciliation" (2022), és a Nostr Negentropy protokollja — saját kóddal, függőség nélkül.)*
//
// ⭐ A LENYOMAT (D74): a tartomány rendezett azonosítóinak HASH-e (`esemeny/halmaz.js`) — nem az
// összegük. Ettől egy sok eseményt aláíró fél sem tud két különböző halmazt ugyanazzal a
// lenyomattal kiszámolni. Az ára: a lenyomat a tartomány méretével arányos munka.
//
// ===== AZ ÜZENET =====
//
// Tartományok sorban, és mindegyiket a FELSŐ határa zárja le (az első alsó határa '' — a
// legkisebb —, az utolsó felső határa null — a végtelen); a határ egy azonosító eleje:
//
//   [felso, 'S']                 — ez a tartomány rendben van (kihagyom)
//   [felso, 'L', lenyomat]       — a tartomány lenyomata nálam
//   [felso, 'I', [azonosítók]]   — a tartomány MINDEN azonosítója nálam
//
// Aki egy 'I' tartományt kap, az látja mindkét oldalt, tehát ő mondja meg, mi kell kinek:
// `kellNekem` (nála van, nálam nincs — kérni kell) és `kellNeki` (nálam van, nála nincs — küldeni
// kell). *Hogy ezt mi viszi át, az a csere dolga (`vonal.js`), nem ezé.*
//
// ⚠️ HÁLÓZATOT NEM IMPORTÁL (1. szabály): üzenetet készít és üzenetet dolgoz fel — ezért hálózat
// nélkül próbázható, és a szállítás cserélhető alatta.
// ⛔ A BEÉRKEZŐ ÜZENETBEN SEM BÍZUNK: az alakját, a határait és a méretét ellenőrizzük, és ami
// nem stimmel, azt megnevezett hibával elutasítjuk (a csere ilyenkor véget ér).
//
// Használja: (a C lépés 8. pontjától) a csere; ma a próbák és a mérés (50.).

import { halmazLenyomata } from '../esemeny/halmaz.js';

// ===================================
// A PARAMÉTEREK
// ===================================

// Egy eltérő tartományt ennyi részre osztunk. ⚠️ Nem állapot-befolyásoló állandó (D66): a két fél
// eltérő értékkel is helyesen egyeztet — csak a körök száma és a bájtok változnak.
export const VODROK = 16;

// Ennyi (vagy kevesebb) azonosítónál nem osztunk tovább, hanem elküldjük őket.
export const LISTA_KUSZOB = 2 * VODROK;

// ⛔ Egy beérkező üzenet felső határai (9. szabály): ennyi tartomány…
export const TARTOMANY_KORLAT = 4096;
// …és összesen ennyi azonosító. *Korlát nélkül egy fél egy üzenettel megtölthetné a memóriát.*
export const AZONOSITO_KORLAT = 8192;

const LENYOMAT_MINTA = /^[A-Za-z0-9_-]{43}$/;
// ⭐ Egy elem: egy azonosító (43 jel) — vagy az első szinten egy „szelet:lenyomat” pár (87 jel),
// hogy aki a listát feldolgozza, a MÁSIK fél eltérő szeleteit is megtudja (a szeletelési terv 4.5).
const ELEM_MINTA = /^[A-Za-z0-9_-]{43}(:[A-Za-z0-9_-]{43})?$/;
const HATAR_MINTA = /^[A-Za-z0-9_:-]{1,87}$/;

/** Megnevezett hiba — a hívó a kódjából tudja, hogy a társ üzenete volt a hibás. */
function hibasUzenet(ok) {
  const hiba = new Error('Hibás egyeztető üzenet: ' + ok);
  hiba.kod = 'HIBAS-EGYEZTETES';
  return hiba;
}

// ===================================
// SEGÉDEK
// ===================================

/** Az első index, ahol `halmaz[i] >= hatar` (bináris keresés a rendezett halmazban). */
function elsoNemKisebb(halmaz, hatar) {
  if (hatar === '') return 0;
  let also = 0, felso = halmaz.length;
  while (also < felso) {
    const kozep = (also + felso) >> 1;
    if (halmaz[kozep] < hatar) also = kozep + 1; else felso = kozep;
  }
  return also;
}

/** A tartomány [alsoHatar, felsoHatar) elemeinek indexei a halmazban: [i, j). */
function indexek(halmaz, alsoHatar, felsoHatar) {
  const i = elsoNemKisebb(halmaz, alsoHatar);
  const j = felsoHatar === null ? halmaz.length : elsoNemKisebb(halmaz, felsoHatar);
  return [i, Math.max(i, j)];
}

/**
 * A legrövidebb határ, ami `elozo`-nél nagyobb, és `kovetkezo`-nél nem nagyobb — `kovetkezo`
 * eleje. ⭐ A határ így a legtöbbször 1–3 jel, nem 43 (a 6. szabály: a bájt számít).
 */
function rovidHatar(elozo, kovetkezo) {
  for (let hossz = 1; hossz < kovetkezo.length; hossz++) {
    const elotag = kovetkezo.slice(0, hossz);
    if (elotag > elozo) return elotag;
  }
  return kovetkezo;
}

/** Egy tartomány a válaszba — az egymás utáni „rendben" tartományok egybeolvadnak. */
function hozzaad(valasz, tartomany) {
  const utolso = valasz[valasz.length - 1];
  if (tartomany[1] === 'S' && utolso && utolso[1] === 'S') {
    utolso[0] = tartomany[0];
  } else {
    valasz.push(tartomany);
  }
}

/**
 * Egy eltérő tartomány felosztása a SAJÁT elemeim szerint `VODROK` részre (pozíció szerint, tehát
 * mindegyikben ugyanannyi elemem van), mindegyiknek a lenyomatával.
 */
async function felosztas(halmaz, i, j, felsoHatar) {
  const darab = j - i;
  const reszek = [];
  for (let v = 0; v < VODROK; v++) {
    const kezdet = i + Math.floor((v * darab) / VODROK);
    const vege = i + Math.floor(((v + 1) * darab) / VODROK);
    const felso = v === VODROK - 1 ? felsoHatar : rovidHatar(halmaz[vege - 1], halmaz[vege]);
    reszek.push([felso, 'L', await halmazLenyomata(halmaz.slice(kezdet, vege))]);
  }
  return reszek;
}

/**
 * ⛔ A beérkező üzenet ellenőrzése: alak, sorrend, lefedés és méret.
 * @throws {Error} `kod: 'HIBAS-EGYEZTETES'`
 */
function ellenorzes(uzenet) {
  if (!Array.isArray(uzenet) || uzenet.length === 0) throw hibasUzenet('nem tartományok listája');
  if (uzenet.length > TARTOMANY_KORLAT) throw hibasUzenet('túl sok tartomány (' + uzenet.length + ')');
  let elozo = '';
  let azonositok = 0;
  uzenet.forEach((t, sorszam) => {
    if (!Array.isArray(t)) throw hibasUzenet('a ' + sorszam + '. tartomány nem lista');
    const [felso, mod, ertek] = t;
    const utolso = sorszam === uzenet.length - 1;
    if (utolso ? felso !== null : (typeof felso !== 'string' || !HATAR_MINTA.test(felso))) {
      throw hibasUzenet('a ' + sorszam + '. tartomány határa érvénytelen');
    }
    if (felso !== null && felso <= elozo) throw hibasUzenet('a határok nem növekvők');
    if (mod === 'L') {
      if (typeof ertek !== 'string' || !LENYOMAT_MINTA.test(ertek)) throw hibasUzenet('érvénytelen lenyomat');
    } else if (mod === 'I') {
      if (!Array.isArray(ertek)) throw hibasUzenet('az azonosító-lista nem lista');
      azonositok += ertek.length;
      if (azonositok > AZONOSITO_KORLAT) throw hibasUzenet('túl sok azonosító');
      for (const a of ertek) {
        // ⛔ Egy azonosító csak a saját tartományában állhat — különben a társ olyasmit mondana
        // „a tartomány minden elemének", ami nem is abba a tartományba esik.
        if (typeof a !== 'string' || !ELEM_MINTA.test(a)
            || a < elozo || (felso !== null && a >= felso)) {
          throw hibasUzenet('érvénytelen vagy tartományon kívüli azonosító');
        }
      }
    } else if (mod !== 'S') {
      throw hibasUzenet('ismeretlen mód: ' + mod);
    }
    if (felso !== null) elozo = felso;
  });
}

// ===================================
// AZ EGYEZTETÉS
// ===================================

/**
 * Az egyeztetés első üzenete: az egész halmaz lenyomata.
 *
 * ⭐ Akkor is lenyomat, ha a halmaz kicsi: a leggyakoribb eset az, hogy NINCS eltérés — és ott
 * egyetlen 43 jeles lenyomat elég (a társ „rendben"-nel felel), nem a teljes lista.
 *
 * @param {Array<string>} halmaz - rendezett, ismétlés nélküli (`rendezettHalmaz`)
 * @returns {Promise<Array>} az üzenet
 */
export async function egyeztetesNyitasa(halmaz) {
  return [[null, 'L', await halmazLenyomata(halmaz)]];
}

/**
 * Egy beérkezett üzenet feldolgozása — és a válasz rá.
 *
 * @param {Array<string>} halmaz - rendezett, ismétlés nélküli
 * @param {Array} uzenet - a társ üzenete
 * @returns {Promise<{valasz: Array|null, kellNekem: Array<string>, kellNeki: Array<string>}>}
 *   `valasz: null` — minden tartomány rendben, nincs mit küldeni: az egyeztetés véget ért
 * @throws {Error} `kod: 'HIBAS-EGYEZTETES'`, ha a társ üzenete hibás
 */
export async function egyeztetesLepese(halmaz, uzenet) {
  ellenorzes(uzenet);
  const valasz = [];
  const kellNekem = [];
  const kellNeki = [];

  let alsoHatar = '';
  for (const [felso, mod, ertek] of uzenet) {
    const [i, j] = indexek(halmaz, alsoHatar, felso);

    if (mod === 'S') {
      hozzaad(valasz, [felso, 'S']);
    } else if (mod === 'I') {
      // ⭐ Itt látszik mindkét oldal: amit ő felsorolt, és ami nálam van ebben a tartományban.
      const ove = new Set(ertek);
      const enyem = new Set(halmaz.slice(i, j));
      for (const a of ove) if (!enyem.has(a)) kellNekem.push(a);
      for (const a of enyem) if (!ove.has(a)) kellNeki.push(a);
      hozzaad(valasz, [felso, 'S']);
    } else {
      // 'L' — a lenyomata az övé; egyezik-e az enyémmel?
      const sajat = await halmazLenyomata(halmaz.slice(i, j));
      if (sajat === ertek) {
        hozzaad(valasz, [felso, 'S']);
      } else if (j - i <= LISTA_KUSZOB) {
        valasz.push([felso, 'I', halmaz.slice(i, j)]);
      } else {
        valasz.push(...await felosztas(halmaz, i, j, felso));
      }
    }
    if (felso !== null) alsoHatar = felso;
  }

  const kesz = valasz.every((t) => t[1] === 'S');
  return { valasz: kesz ? null : valasz, kellNekem, kellNeki };
}
