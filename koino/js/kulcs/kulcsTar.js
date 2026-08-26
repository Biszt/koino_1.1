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
// Ed25519-et használunk, natívan a böngésző WebCrypto szolgáltatásából — mérve
// (2026-08-26): támogatott, 0,031 ms/aláírás, 0,058 ms/ellenőrzés, 32 bájtos nyilvános
// kulcs. Így NINCS SZÜKSÉG külső kriptográfiai könyvtárra, ami egy olyan programnál,
// aminek a lényege, hogy senkiben nem kell megbízni, több mint kényelem.
//
// Használják: fo.js (és a következő lépésben az esemény-réteg aláírás/ellenőrzés).

import { TAR, olvasas, iras, tartosTarolasKerese } from '../tar/adatbazis.js';

// ===== ÁLLANDÓK =====

// Az algoritmus neve — a WebCrypto Ed25519-nél se kulcsgeneráláshoz, se aláíráshoz nem
// kér más paramétert (nincs görbe- és nincs hash-választás: ez a fajta egyszerűség épp
// az Ed25519 egyik erénye).
const ALGORITMUS = 'Ed25519';

// A kulcsok tárában használt nevek
const KULCS_NEV = {
  PRIVAT: 'sajatPrivatKulcs',
  NYILVANOS: 'sajatNyilvanosKulcs'
};

// ===================================
// KULCSPÁR LÉTREHOZÁSA
// ===================================

/**
 * Új kulcspárt hoz létre, és elmenti a készülékre.
 *
 * A privát kulcs KIMENTHETŐ (`extractable: true`) — Csaba döntése (2026-08-26). Indok: a
 * böngésző kiürítheti a tárat, tehát a kulcsvesztés valós kockázat, és a mentés egy
 * kattintás, míg a több-tanús helyreállítás (D15) emberi és lassú.
 *
 * @returns {Promise<CryptoKeyPair>}
 */
export async function kulcsparLetrehozasa() {
  console.log('kulcsparLetrehozasa - KEZDÉS');

  const kulcspar = await crypto.subtle.generateKey(
    { name: ALGORITMUS },
    true,                 // kimenthető — hogy menteni lehessen (lásd fent)
    ['sign', 'verify']    // aláírásra és ellenőrzésre használjuk
  );

  // ----- MENTÉS A KÉSZÜLÉKRE -----
  // A CryptoKey objektumot az IndexedDB közvetlenül tárolja: nem kell nyers bájtokká
  // alakítani, így a privát kulcs sosem hever kicsomagolva a memóriában feleslegesen.
  await iras(TAR.KULCSOK, kulcspar.privateKey, KULCS_NEV.PRIVAT);
  await iras(TAR.KULCSOK, kulcspar.publicKey, KULCS_NEV.NYILVANOS);

  // ----- TARTÓS TÁROLÁS -----
  // Rögtön a létrehozáskor kérjük — ez az egyetlen pillanat, amikor biztosan érdemes.
  const tartos = await tartosTarolasKerese();

  console.log('kulcsparLetrehozasa - VÉGE', { tartosTarolas: tartos });
  return kulcspar;
}

// ===================================
// KULCSPÁR BETÖLTÉSE
// ===================================

/**
 * Betölti a készüléken tárolt kulcspárt.
 * @returns {Promise<CryptoKeyPair|null>} null, ha még nincs kulcs
 */
export async function kulcsparBetoltese() {
  console.log('kulcsparBetoltese - KEZDÉS');

  const privateKey = await olvasas(TAR.KULCSOK, KULCS_NEV.PRIVAT);
  const publicKey = await olvasas(TAR.KULCSOK, KULCS_NEV.NYILVANOS);

  if (!privateKey || !publicKey) {
    console.log('kulcsparBetoltese - VÉGE (még nincs kulcs)');
    return null;
  }

  console.log('kulcsparBetoltese - VÉGE (megvan)');
  return { privateKey, publicKey };
}

/**
 * Betölti a meglévő kulcspárt, vagy létrehoz egy újat, ha még nincs.
 * @returns {Promise<{kulcspar: CryptoKeyPair, ujE: boolean}>}
 */
export async function kulcsparBiztositasa() {
  console.log('kulcsparBiztositasa - KEZDÉS');

  const meglevo = await kulcsparBetoltese();
  if (meglevo) {
    console.log('kulcsparBiztositasa - VÉGE (meglévő kulcs)');
    return { kulcspar: meglevo, ujE: false };
  }

  const uj = await kulcsparLetrehozasa();
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
 * és biztonságosan szerepelhet URL-ben és fájlnévben is — a `+`, `/`, `=` karakterek
 * helyett `-`, `_` és semmi áll.
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
 * Rövidített alak a felülethez: az azonosító eleje és vége.
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
 * A kulcspárt menthető szöveggé (JSON) alakítja.
 *
 * A privát kulcsot JWK alakban mentjük — ez a WebCrypto szabványos, szöveges formája,
 * amit vissza is tud olvasni. A fájl EGYETLEN dolgot tartalmaz, ami számít: a kulcsot.
 * Aki megszerzi, a nevedben tud aláírni — ezért a felület figyelmeztet rá.
 *
 * @param {CryptoKeyPair} kulcspar
 * @returns {Promise<string>} a mentendő fájl tartalma
 */
export async function kulcsparKimentese(kulcspar) {
  console.log('kulcsparKimentese - KEZDÉS');

  const privatJwk = await crypto.subtle.exportKey('jwk', kulcspar.privateKey);
  const azonosito = await nyilvanosKulcsSzovegesen(kulcspar.publicKey);

  const mentes = {
    mi: 'koino-kulcs',
    valtozat: 1,
    algoritmus: ALGORITMUS,
    azonosito,                       // a nyilvános kulcs olvasható alakja
    mentve: new Date().toISOString(),
    figyelmeztetes: 'Aki ezt a fájlt megszerzi, a nevedben tud aláírni. Őrizd biztos helyen.',
    privatKulcs: privatJwk
  };

  console.log('kulcsparKimentese - VÉGE', { azonosito });
  return JSON.stringify(mentes, null, 2);
}

/**
 * Egy korábban kimentett kulcsfájl visszatöltése.
 * @param {string} fajlTartalom - a kimentett JSON
 * @returns {Promise<CryptoKeyPair>}
 */
export async function kulcsparVisszatoltese(fajlTartalom) {
  console.log('kulcsparVisszatoltese - KEZDÉS');

  const mentes = JSON.parse(fajlTartalom);
  if (mentes.mi !== 'koino-kulcs') {
    throw new Error('Ez nem koino kulcsfájl.');
  }

  // A privát kulcs visszaolvasása JWK-ból
  const privateKey = await crypto.subtle.importKey(
    'jwk', mentes.privatKulcs, { name: ALGORITMUS }, true, ['sign']
  );

  // A nyilvános kulcs a privátból származik: a JWK `x` mezője MAGA a nyilvános kulcs,
  // ezért nem kell külön menteni — így a fájl kisebb, és nem tud „szétcsúszni".
  const nyilvanosJwk = { kty: mentes.privatKulcs.kty, crv: mentes.privatKulcs.crv, x: mentes.privatKulcs.x };
  const publicKey = await crypto.subtle.importKey(
    'jwk', nyilvanosJwk, { name: ALGORITMUS }, true, ['verify']
  );

  // Elmentjük a készülékre — ezzel átveszi a korábbi kulcs helyét
  await iras(TAR.KULCSOK, privateKey, KULCS_NEV.PRIVAT);
  await iras(TAR.KULCSOK, publicKey, KULCS_NEV.NYILVANOS);
  await tartosTarolasKerese();

  console.log('kulcsparVisszatoltese - VÉGE');
  return { privateKey, publicKey };
}
