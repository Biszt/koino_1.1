// koino/js/kulcs/kulcsTar.js

// Felelősség: a saját kulcspár létrehozása, tárolása, betöltése és kimentése.
//
// A KULCS A KOINÓBAN NEM JELSZÓ, HANEM SZEMÉLYAZONOSSÁG (D15): nem titkol, hanem
// HITELESÍT. A nyilvános fele a „neved" a hálózaton (32 bájt), a privát felével írod alá
// a cselekedeteidet. Nincs fiók, nincs jelszó, nincs bejelentkezés — a kulcs maga vagy te.
//
// EGY KULCS AZ EGÉSZ BELÉPŐ TÉRBEN (D25, Csaba döntése 2026-08-26): ugyanaz a kulcs
// azonosít a tér minden koinójában, mert csak így „jönnek át" a tanúsítások. A
// megjelenített NÉV viszont koinónként külön lehet.
//
// Ed25519-et használunk, a futtatókörnyezet saját WebCryptójából — mérve: a böngészőben
// és a Node-ban IS elérhető, külső kriptográfiai könyvtár nélkül. Ez egy olyan programnál,
// aminek a lényege, hogy senkiben nem kell megbízni, több mint kényelem.
//
// ⚠️ A TÁROLÓT KÍVÜLRŐL KAPJA (D29, 2026-08-28). Ez a fájl a kulcs LOGIKÁJÁT tudja
// (létrehozás, kimentés, visszatöltés); hogy hol lakik, azt a tároló dönti el
// (`olvas`/`ir`). Így a kulcs-kezelés egy példányban él, futtatókörnyezettől függetlenül.
//
// Használják: a program indulása és minden művelet.

// ===== ÁLLANDÓK =====

// Az algoritmus neve — a WebCrypto Ed25519-nél se kulcsgeneráláshoz, se aláíráshoz nem
// kér más paramétert (nincs görbe- és nincs hash-választás: ez a fajta egyszerűség épp
// az Ed25519 egyik erénye).
const ALGORITMUS = 'Ed25519';

// ===================================
// KULCSPÁR LÉTREHOZÁSA
// ===================================

/**
 * Új kulcspárt hoz létre, és elmenti a tárolóba.
 *
 * A privát kulcs KIMENTHETŐ (`extractable: true`) — Csaba döntése (2026-08-26). Indok: a
 * kulcsvesztés valós, hétköznapi kockázat, a mentés viszont egy lépés, míg a több-tanús
 * helyreállítás (D15) emberi és lassú.
 *
 * @param {Object} tarolo - { olvas, ir }
 * @returns {Promise<CryptoKeyPair>}
 */
export async function kulcsparLetrehozasa(tarolo) {
  console.log('kulcsparLetrehozasa - KEZDÉS');

  const kulcspar = await crypto.subtle.generateKey(
    { name: ALGORITMUS },
    true,                 // kimenthető — hogy menteni lehessen (lásd fent)
    ['sign', 'verify']    // aláírásra és ellenőrzésre használjuk
  );

  await tarolo.ir(await kulcsparLeirasa(kulcspar));

  console.log('kulcsparLetrehozasa - VÉGE');
  return kulcspar;
}

// ===================================
// KULCSPÁR BETÖLTÉSE
// ===================================

/**
 * Betölti a tárolóban lévő kulcspárt.
 * @param {Object} tarolo
 * @returns {Promise<CryptoKeyPair|null>} null, ha még nincs kulcs
 */
export async function kulcsparBetoltese(tarolo) {
  console.log('kulcsparBetoltese - KEZDÉS');

  const leiras = await tarolo.olvas();
  if (!leiras) {
    console.log('kulcsparBetoltese - VÉGE (még nincs kulcs)');
    return null;
  }

  const kulcspar = await kulcsparLeirasbol(leiras);
  console.log('kulcsparBetoltese - VÉGE (megvan)');
  return kulcspar;
}

/**
 * Betölti a meglévő kulcspárt, vagy létrehoz egy újat, ha még nincs.
 * @param {Object} tarolo
 * @returns {Promise<{kulcspar: CryptoKeyPair, ujE: boolean}>}
 */
export async function kulcsparBiztositasa(tarolo) {
  console.log('kulcsparBiztositasa - KEZDÉS');

  const meglevo = await kulcsparBetoltese(tarolo);
  if (meglevo) {
    console.log('kulcsparBiztositasa - VÉGE (meglévő kulcs)');
    return { kulcspar: meglevo, ujE: false };
  }

  const uj = await kulcsparLetrehozasa(tarolo);
  console.log('kulcsparBiztositasa - VÉGE (ÚJ kulcs készült)');
  return { kulcspar: uj, ujE: true };
}

// ===================================
// A NYILVÁNOS KULCS OLVASHATÓ ALAKJA
// ===================================

/**
 * A nyilvános kulcs 32 bájtját szöveges azonosítóvá alakítja.
 *
 * base64url alakot használunk (43 karakter), mert rövidebb, mint a hexadecimális (64),
 * és biztonságosan szerepelhet URL-ben és fájlnévben is.
 *
 * @param {CryptoKey} nyilvanosKulcs
 * @returns {Promise<string>}
 */
export async function nyilvanosKulcsSzovegesen(nyilvanosKulcs) {
  const nyersBajtok = await crypto.subtle.exportKey('raw', nyilvanosKulcs);
  return bajtokBase64Url(new Uint8Array(nyersBajtok));
}

/**
 * Bájtok → base64url szöveg.
 * @param {Uint8Array} bajtok
 * @returns {string}
 */
export function bajtokBase64Url(bajtok) {
  let szoveg = '';
  for (const b of bajtok) szoveg += String.fromCharCode(b);
  return btoa(szoveg)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Rövidített alak a kiíráshoz: az azonosító eleje és vége.
 * (Az emberi szem így ismeri fel; a teljes alak mindig elérhető.)
 * @param {string} azonosito
 * @returns {string}
 */
export function rovidAzonosito(azonosito) {
  if (!azonosito || azonosito.length <= 16) return azonosito;
  return azonosito.slice(0, 8) + '…' + azonosito.slice(-8);
}

// ===================================
// KIMENTÉS ÉS VISSZATÖLTÉS
// ===================================

/**
 * A kulcspár menthető leírása (sima objektum, JSON-ba írható).
 *
 * A privát kulcsot JWK alakban mentjük — ez a WebCrypto szabványos, szöveges formája,
 * amit vissza is tud olvasni. A leírás EGYETLEN dolgot tartalmaz, ami számít: a kulcsot.
 * Aki megszerzi, a nevedben tud aláírni.
 *
 * @param {CryptoKeyPair} kulcspar
 * @returns {Promise<Object>}
 */
export async function kulcsparLeirasa(kulcspar) {
  const privatJwk = await crypto.subtle.exportKey('jwk', kulcspar.privateKey);
  const azonosito = await nyilvanosKulcsSzovegesen(kulcspar.publicKey);

  return {
    mi: 'koino-kulcs',
    valtozat: 1,
    algoritmus: ALGORITMUS,
    azonosito,                       // a nyilvános kulcs olvasható alakja
    mentve: new Date().toISOString(),
    figyelmeztetes: 'Aki ezt a fájlt megszerzi, a nevedben tud aláírni. Őrizd biztos helyen.',
    privatKulcs: privatJwk
  };
}

/**
 * Egy kulcs-leírásból visszaállítja a kulcspárt.
 *
 * A nyilvános kulcs a privátból származik: a JWK `x` mezője MAGA a nyilvános kulcs,
 * ezért nem kell külön menteni — így a leírás kisebb, és nem tud „szétcsúszni".
 *
 * @param {Object} leiras
 * @returns {Promise<CryptoKeyPair>}
 */
export async function kulcsparLeirasbol(leiras) {
  if (leiras?.mi !== 'koino-kulcs') {
    throw new Error('Ez nem koino kulcs-leírás.');
  }

  const privateKey = await crypto.subtle.importKey(
    'jwk', leiras.privatKulcs, { name: ALGORITMUS }, true, ['sign']
  );

  const nyilvanosJwk = {
    kty: leiras.privatKulcs.kty,
    crv: leiras.privatKulcs.crv,
    x: leiras.privatKulcs.x
  };
  const publicKey = await crypto.subtle.importKey(
    'jwk', nyilvanosJwk, { name: ALGORITMUS }, true, ['verify']
  );

  return { privateKey, publicKey };
}

/**
 * Kimentés szövegként (ezt írjuk fájlba, ezt viszi el a felhasználó).
 * @param {CryptoKeyPair} kulcspar
 * @returns {Promise<string>}
 */
export async function kulcsparKimentese(kulcspar) {
  return JSON.stringify(await kulcsparLeirasa(kulcspar), null, 2);
}

/**
 * Egy korábban kimentett kulcsfájl visszatöltése — és elmentése a tárolóba.
 * @param {Object} tarolo
 * @param {string} fajlTartalom
 * @returns {Promise<CryptoKeyPair>}
 */
export async function kulcsparVisszatoltese(tarolo, fajlTartalom) {
  console.log('kulcsparVisszatoltese - KEZDÉS');

  const leiras = JSON.parse(fajlTartalom);
  const kulcspar = await kulcsparLeirasbol(leiras);
  await tarolo.ir(leiras);

  console.log('kulcsparVisszatoltese - VÉGE');
  return kulcspar;
}
