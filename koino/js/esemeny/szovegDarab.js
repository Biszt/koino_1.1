// koino/js/esemeny/szovegDarab.js

// Felelősség: A GONDOLAT SZÖVEGE KÜLÖN DARAB (D72, 2026-09-26) — a hivatkozás alakja, és az
// átalakítás szöveg ↔ darab között.
//
// ===== ⭐ MIÉRT (Csaba döntése) =====
//
// *„Külön kell kezelni az entitás metaadatait, a címet, és a body-t."* (skálázási terv 4.7)
// A metaadat (cím, típus, szülő, kategóriák) kicsi, és a SZÜLŐ körében is terjednie kell —
// ettől tud bárki egy új gondolatról. A szöveg viszont nagy, és csak ott kell, ahol
// tudatpontot tettek rá, vagy megnyitották. Ha a kettő EGY eseményben utazik (ahogy a D72
// előtt), a metaadattal a szöveg is menne — pont az, amit a három külön út el akar kerülni.
//
// ⭐ A MEGOLDÁS UGYANAZ, MINT A KÉPEKÉ: az esemény nem a szöveget hordozza, hanem a
// LENYOMATÁT. A szöveg a fájl-tárba kerül (ugyanoda, ahol a képek), és ugyanúgy jön a résen,
// mint egy kép. *A lenyomat a bizonyíték: aki megkapja, maga ellenőrzi, hogy azt kapta-e, amit
// a szerző aláírt — nem kell megbíznia abban, akitől kapta (3. szabály).*
//
// ===== A HIVATKOZÁS ALAKJA =====
//
//   { lenyomat: '<43 karakter>', bajt: <egész> }
//
// A `lenyomat` a szöveg KANONIKUS alakjának lenyomata — ugyanaz, mint a kanonikus bájtok
// nyers lenyomata, tehát a fájl-tárban is ez a neve. A `bajt` a darab mérete: a letöltő ebből
// tudja előre, mekkora, és a D26 tárolási vállalása is ebből jön.
//
// ⚠️ A RÉGI ALAK ÉRVÉNYES MARAD: a D72 előtti események a szöveget magukban hordozzák (egy
// sor szöveg a parancssorból, vagy blokkok tömbje a szerkesztőből). A `szoveg` mező értéke
// ezért háromféle lehet — szöveg, tömb, vagy hivatkozás —, és a számítás mindhármat ugyanúgy
// másolja. *A számítás a szöveg tartalmából semmit nem dönt el* (D72 átnézése): az állapotba
// a hivatkozás kerül, tehát minden gép ugyanazt számolja, akár lehozta már a szöveget, akár nem.
//
// ⚠️ EZ A FÁJL NEM ÍR ÉS NEM OLVAS LEMEZT: a darab bájtjait adja és fogadja. Hogy hová kerül,
// az a hívó dolga (a műveletek a környezet `darabTar`-ját kapják).
//
// Használják: muveletek.js, szerkesztesiVegrehajtas.js, pakli.js, fajlIgeny.js, fajlCsere.js,
// koino.js.

import { kanonikusBajtok, bajtLenyomat, kanonikusSzoveg } from './kanonikusAlak.js';

const LENYOMAT_MINTA = /^[A-Za-z0-9_-]{43}$/;

/**
 * Szöveg-hivatkozás-e? — pontosan két mező: a lenyomat és a méret.
 * @param {*} ertek
 * @returns {boolean}
 */
export function szovegHivatkozasE(ertek) {
  return ertek !== null && typeof ertek === 'object' && !Array.isArray(ertek)
    && Object.keys(ertek).length === 2
    && typeof ertek.lenyomat === 'string' && LENYOMAT_MINTA.test(ertek.lenyomat)
    && Number.isInteger(ertek.bajt) && ertek.bajt >= 0;
}

/**
 * Érvényes értéke-e a `szoveg` mezőnek? — a három alak (szöveg, blokk-tömb, hivatkozás) és a
 * `null` (nincs szöveg).
 * @param {*} ertek
 * @returns {boolean}
 */
export function ervenyesSzovegErtek(ertek) {
  return ertek === null || typeof ertek === 'string' || Array.isArray(ertek)
    || szovegHivatkozasE(ertek);
}

/**
 * Egy szöveg darabbá alakítása: a bájtjai és a hivatkozás rájuk.
 *
 * ⭐ Ami már hivatkozás, az marad (nem csomagoljuk kétszer); ami üres, annak nincs darabja.
 *
 * @param {string|Array|Object|null} szoveg
 * @returns {Promise<{hivatkozas: Object|null, bajtok: Uint8Array|null}>}
 */
export async function szovegDarabra(szoveg) {
  if (szoveg === null || szoveg === undefined || szoveg === '') return { hivatkozas: null, bajtok: null };
  if (szovegHivatkozasE(szoveg)) return { hivatkozas: szoveg, bajtok: null };
  const bajtok = kanonikusBajtok(szoveg);
  return { hivatkozas: { lenyomat: await bajtLenyomat(bajtok), bajt: bajtok.length }, bajtok };
}

/**
 * Egy darab bájtjaiból a szöveg. ⚠️ A lenyomatot a HÍVÓ ellenőrzi (a fájl-tár olvasása
 * ellenőriz); ez csak visszaalakít.
 * @param {Uint8Array} bajtok
 * @returns {string|Array}
 */
export function szovegDarabbol(bajtok) {
  return JSON.parse(new TextDecoder().decode(bajtok));
}

/**
 * Ugyanaz-e a két szöveg-érték? — a kanonikus alakjuk szerint (egy tömb vagy egy hivatkozás
 * nem hasonlítható `===`-vel).
 */
export function azonosSzoveg(a, b) {
  return kanonikusSzoveg(a ?? null) === kanonikusSzoveg(b ?? null);
}

/**
 * Egy `szoveg` érték feloldása megjelenítéshez: ha hivatkozás, a darabot kéri el az
 * `olvas`-tól (async lenyomat → bájtok|null).
 *
 * ⭐ HA MÉG NINCS MEG, AZ NEM HIBA, HANEM HIÁNY (D19): a szöveg még nem érkezett meg — ezt
 * kimondjuk (`hianyzik`), nem hallgatjuk el, és nem is teszünk a helyére semmit.
 *
 * @param {*} ertek - az entitás vagy a változás `szoveg` mezője
 * @param {Function} [olvas] - async (lenyomat) → Uint8Array|null
 * @returns {Promise<{szoveg: string|Array|null, hianyzik: boolean, lenyomat: string|null}>}
 */
export async function szovegFeloldasa(ertek, olvas) {
  if (!szovegHivatkozasE(ertek)) return { szoveg: ertek ?? null, hianyzik: false, lenyomat: null };
  const bajtok = olvas ? await olvas(ertek.lenyomat) : null;
  if (!bajtok) return { szoveg: null, hianyzik: true, lenyomat: ertek.lenyomat };
  return { szoveg: szovegDarabbol(bajtok), hianyzik: false, lenyomat: ertek.lenyomat };
}
