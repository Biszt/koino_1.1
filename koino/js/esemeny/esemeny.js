// koino/js/esemeny/esemeny.js

// Felelősség: egy ESEMÉNY létrehozása (aláírással) és ellenőrzése.
//
// A koino adata nem állapot, hanem esemény: „én, ekkor, ezt tettem" — aláírva. Az
// állapot (mely tartalmak léteznek, ki hova rendelt tudatpontot, mi a szavazás állása)
// ebből SZÁMÍTÓDIK (D17), nem a szerver állítja.
//
// EGY ESEMÉNY KÉT RÉSZBŐL ÁLL:
//   1. a TARTALOM (koino, tipus, szerzo, elozo, sorszam, ido, adat) — ezt írjuk alá,
//   2. a BURKOLAT (azonosito, alairas) — ez a tartalomból SZÁRMAZIK.
// Az azonosító a tartalom lenyomata, tehát nem külön adat, hanem a tartalom neve. Ezért
// nem szerepelhet a lenyomatolt részben (önmagára hivatkozna).
//
// MIT ÍRUNK ALÁ? Az azonosítót — vagyis a tartalom lenyomatát. Így az aláírás
// ellenőrzéséhez elég az azonosító, az azonosító pedig igazolja a teljes tartalmat.
// (Ugyanaz a szerkezet, amit a git használ: a commit neve a tartalma lenyomata, az
// aláírás pedig arra a névre megy.)
//
// Használják: a tár-réteg és minden művelet (tartalom, tudatpont, javaslat, szavazat).

import { lenyomat, base64UrlBajtok, bajtokBase64Url } from './kanonikusAlak.js';

const ALGORITMUS = 'Ed25519';

// A tartalom mezői — EZEK és csakis ezek kerülnek a lenyomatba, ebben a sorrendben
// (a sorrend valójában mindegy, mert a kanonikus alak úgyis rendez — de a lista
// rögzítése azért fontos, hogy ne csússzon be véletlenül új mező a lenyomatba).
const TARTALOM_MEZOK = ['koino', 'tipus', 'szerzo', 'elozo', 'sorszam', 'ido', 'adat'];

// ===================================
// SEGÉD: A LENYOMATOLANDÓ RÉSZ KIEMELÉSE
// ===================================

/**
 * Kiveszi az eseményből azt a részt, amit a lenyomat fed.
 * @param {Object} esemeny
 * @returns {Object}
 */
function tartalomResz(esemeny) {
  const resz = {};
  for (const mezo of TARTALOM_MEZOK) {
    if (esemeny[mezo] !== undefined) resz[mezo] = esemeny[mezo];
  }
  return resz;
}

// ===================================
// ESEMÉNY LÉTREHOZÁSA
// ===================================

/**
 * Létrehoz egy aláírt eseményt.
 *
 * @param {Object} leiras
 * @param {string} leiras.koino - melyik koinóhoz tartozik (D25: több koino egy készüléken)
 * @param {string} leiras.tipus - pl. 'TartalomLetrehozas'
 * @param {Object} leiras.adat - a művelet tartalma (típusfüggő)
 * @param {string|null} leiras.elozo - az előző SAJÁT eseményem azonosítója (az első: null)
 * @param {number} leiras.sorszam - hányadik a saját láncomban (az első: 1)
 * @param {number} [leiras.ido] - a szerző órája szerint (alapból: most)
 * @param {CryptoKeyPair} kulcspar - a saját kulcspár
 * @returns {Promise<Object>} az aláírt esemény
 */
export async function esemenyLetrehozasa(leiras, kulcspar) {
  console.log('esemenyLetrehozasa - KEZDÉS', { tipus: leiras.tipus, sorszam: leiras.sorszam });

  // ----- A SZERZŐ: a nyilvános kulcs -----
  // Nem név, nem fiók: a személyazonosság maga a kulcs (D15).
  const nyersKulcs = await crypto.subtle.exportKey('raw', kulcspar.publicKey);
  const szerzo = bajtokBase64Url(new Uint8Array(nyersKulcs));

  const tartalom = {
    koino: leiras.koino,
    tipus: leiras.tipus,
    szerzo,
    elozo: leiras.elozo ?? null,
    sorszam: leiras.sorszam,
    // Az idő a SZERZŐ órája — tájékoztató adat, soha nem bizonyíték. A sorrendet a
    // saját láncban a `sorszam` adja, nem ez.
    ido: leiras.ido ?? Date.now(),
    adat: leiras.adat
  };

  // ----- AZ AZONOSÍTÓ: a tartalom lenyomata -----
  // Ha a tartalomban tört szám vagy más tiltott érték van, ez itt HIBÁT DOB — jobb
  // most kiderülnie, mint akkor, amikor két gép már nem ért egyet.
  const azonosito = await lenyomat(tartalom);

  // ----- AZ ALÁÍRÁS: az azonosítóra -----
  const alairasBajtok = await crypto.subtle.sign(
    { name: ALGORITMUS },
    kulcspar.privateKey,
    new TextEncoder().encode(azonosito)
  );

  const esemeny = {
    ...tartalom,
    azonosito,
    alairas: bajtokBase64Url(new Uint8Array(alairasBajtok))
  };

  console.log('esemenyLetrehozasa - VÉGE', { azonosito });
  return esemeny;
}

// ===================================
// ESEMÉNY ELLENŐRZÉSE
// ===================================

/**
 * Ellenőriz egy eseményt: valóban az állítólagos szerzőtől való-e, és változatlan-e.
 *
 * KÉT DOLGOT NÉZ MEG:
 *   1. az azonosító tényleg a tartalom lenyomata-e (nem babráltak a tartalomba),
 *   2. az aláírás a szerző kulcsával készült-e (tényleg ő írta alá).
 * A kettő együtt: a tartalom egyetlen bájtja sem változhatott a szerző óta.
 *
 * FONTOS, MIT NEM NÉZ: hogy a szerző jogosult-e a műveletre, hogy a lánc folytonos-e,
 * és hogy az idő igaz-e. Azok külön kérdések (tár-réteg, állapot-réteg).
 *
 * @param {Object} esemeny
 * @returns {Promise<{rendben: boolean, ok?: string}>}
 */
export async function esemenyEllenorzese(esemeny) {
  // ----- ALAKI ELLENŐRZÉS -----
  if (!esemeny || typeof esemeny !== 'object') {
    return { rendben: false, ok: 'nem objektum' };
  }
  for (const mezo of ['koino', 'tipus', 'szerzo', 'sorszam', 'ido', 'azonosito', 'alairas']) {
    if (esemeny[mezo] === undefined) {
      return { rendben: false, ok: 'hiányzó mező: ' + mezo };
    }
  }

  // ----- 1. AZ AZONOSÍTÓ A TARTALOM LENYOMATA-E? -----
  let ujraszamolt;
  try {
    ujraszamolt = await lenyomat(tartalomResz(esemeny));
  } catch (hiba) {
    return { rendben: false, ok: 'a tartalom nem hozható kanonikus alakra: ' + hiba.message };
  }
  if (ujraszamolt !== esemeny.azonosito) {
    return { rendben: false, ok: 'az azonosító nem a tartalom lenyomata (a tartalom megváltozott)' };
  }

  // ----- 2. AZ ALÁÍRÁS A SZERZŐ KULCSÁVAL KÉSZÜLT-E? -----
  try {
    const nyilvanosKulcs = await crypto.subtle.importKey(
      'raw', base64UrlBajtok(esemeny.szerzo), { name: ALGORITMUS }, false, ['verify']
    );
    const rendben = await crypto.subtle.verify(
      { name: ALGORITMUS },
      nyilvanosKulcs,
      base64UrlBajtok(esemeny.alairas),
      new TextEncoder().encode(esemeny.azonosito)
    );
    if (!rendben) return { rendben: false, ok: 'az aláírás nem a szerzőé' };
  } catch (hiba) {
    return { rendben: false, ok: 'az aláírás nem ellenőrizhető: ' + hiba.message };
  }

  return { rendben: true };
}

// ===================================
// KÉT ESEMÉNY ÜTKÖZÉSE — A SAJÁT LÁNC ELÁGAZÁSA
// ===================================

/**
 * Megnézi, hogy két esemény ELLENTMOND-e egymásnak.
 *
 * A koino nem MEGAKADÁLYOZZA a kettős cselekvést, hanem LELEPLEZI (D17/D19). Ha valaki
 * két különböző eseményt ír alá ugyanarról a pontról a saját láncán — azonos szerző,
 * azonos sorszám, de más azonosító —, akkor a két aláírás ÖNMAGÁBAN bizonyíték. Nem
 * kell hozzá bíró: mindkettőt ő írta alá.
 *
 * (Ha viszont csak FOLYTATJA a láncát egy újabb sorszámmal, az nem ellentmondás — a
 * szavazatot például szabad módosítani, ahogy ma is.)
 *
 * @param {Object} egyik
 * @param {Object} masik
 * @returns {boolean} igaz, ha a kettő elágazás (ellentmondás)
 */
export function elagazasE(egyik, masik) {
  return egyik.szerzo === masik.szerzo
    && egyik.koino === masik.koino
    && egyik.sorszam === masik.sorszam
    && egyik.azonosito !== masik.azonosito;
}
