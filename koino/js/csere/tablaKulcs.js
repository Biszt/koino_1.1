// koino/js/csere/tablaKulcs.js

// Felelősség: A TÁBLA-KULCS — a készülék neve a HIRDETŐTÁBLÁN, és a kötések azonosítója.
//
// ⛔⛔ EZ SOHA NEM AZ AZONOSSÁGOD (Csaba döntése, 2026-09-20, D6). A koino-kulcsod azt
// mondja meg, KI vagy; ez a kulcs azt, hogy HOL érhető el ez a KÉSZÜLÉK. A kettő
// szándékosan nincs összekötve: aki a táblát figyeli, ne tudja a címeidet a személyedhez
// kötni. *Két kérdés, két kulcs — ugyanaz az elv, mint mindenhol a koinóban.*
//
// ===== MIÉRT KELL, ÉS MIÉRT ÉPP EZ A KÉT KULCS =====
//
// A hirdetőtábla (BitTorrent DHT, BEP 44) **aláírt** bejegyzéseket tárol, és a bejegyzés
// NEVE maga az aláíró nyilvános kulcs. Ezért:
//
//   · `alairo` (Ed25519) — ez a **rekeszünk neve** a táblán, és ez írja alá a bejegyzést.
//     ⭐ Ez egyben a KÖTÉS AZONOSÍTÓJA is: a cím változik, ez nem. *Egy kötést nem lehet
//     címmel azonosítani, hiszen épp a cím az, ami elromlik.*
//   · `titkosito` (X25519) — ebből lesz a TÁRSANKÉNTI közös titok, amivel a kiírt címet
//     titkosítjuk. ⛔ A titkot SOHA nem küldjük el: mindkét fél a saját titkos kulcsából
//     és a másik nyilvánosából SZÁMÍTJA ki. *A csere-csatorna nyílt — ami rajta megy, azt
//     bárki elolvashatja az úton.*
//
// ⛔ MIÉRT KELL TITKOSÍTANI (36. mérés): a bejegyzést nem egy „tábla" őrzi, hanem 7–8
// VÉLETLEN internetes gép. Nyílt tartalomnál ők látnák az állandó kulcsot és mellette a
// címedet — hónapokon át összefűzve ez a tartózkodási helyed naplója.
//
// ⚠️ NULLA FÜGGŐSÉG (6. szabály): mindkét kulcsfajta és az AES-GCM a beépített
// WebCryptóból jön — megmérve, hogy létezik (2026-09-20).
//
// ⚠️ EZ A FÁJL SEMMIT NEM TUD A KOINÓRÓL: nem ismer eseményt, tárat, szabályt. A `vonal.js`
// MELLÉ került, nem bele (1. szabály).
//
// Használják: koino.js (a tábla-ág), a kötés-jegyzék és a próbáik.

import { webcrypto } from 'node:crypto';

const { subtle } = webcrypto;

// ===================================
// SZÖVEGGÉ ÉS VISSZA
// ===================================
//
// ⭐ Ugyanaz az alak, mint a koino többi azonosítójánál: URL-biztos base64, tölteléktől
// megfosztva — egy 32 bájtos kulcs így 43 karakter. *Egy alak, hogy ránézésre felismerhető
// legyen, és hogy JSON-ben utazhasson.*

/** @param {ArrayBuffer|Uint8Array} bajtok */
export function szovegge(bajtok) {
  return Buffer.from(bajtok).toString('base64url');
}

/** @param {string} szoveg @returns {Buffer} */
export function bajtokka(szoveg) {
  return Buffer.from(String(szoveg), 'base64url');
}

// ===================================
// A KULCSPÁR
// ===================================

/**
 * Új tábla-kulcs: egy aláíró (Ed25519) és egy titkosító (X25519) kulcspár.
 *
 * @returns {Promise<Object>} a MENTHETŐ leírás (titkos részekkel együtt)
 */
export async function ujTablaKulcs() {
  console.log('ujTablaKulcs - KEZDÉS');

  const alairo = await subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const titkosito = await subtle.generateKey({ name: 'X25519' }, true, ['deriveBits']);

  const leiras = {
    alairoNyilvanos: szovegge(await subtle.exportKey('raw', alairo.publicKey)),
    alairoTitkos: szovegge(await subtle.exportKey('pkcs8', alairo.privateKey)),
    titkositoNyilvanos: szovegge(await subtle.exportKey('raw', titkosito.publicKey)),
    titkositoTitkos: szovegge(await subtle.exportKey('pkcs8', titkosito.privateKey)),
    keszult: Date.now()
  };
  console.log('ujTablaKulcs - VÉGE', { rekesz: leiras.alairoNyilvanos });
  return leiras;
}

/** A nyilvános fele — EZ utazik a cserén, és ez a kötés azonosítója. */
export function nyilvanosResz(leiras) {
  if (!leiras?.alairoNyilvanos || !leiras?.titkositoNyilvanos) return null;
  return {
    alairo: leiras.alairoNyilvanos,
    titkosito: leiras.titkositoNyilvanos
  };
}

/**
 * Érvényes-e egy TÁRSTÓL kapott tábla-kulcs?
 *
 * ⚠️ Ez nem bizalom, csak alak-ellenőrzés (3. szabály): attól, hogy valaki bemond egy
 * kulcsot, még semmit nem hiszünk el neki. A haszna az, hogy egy elrontott vagy
 * rosszindulatú mező ne kerüljön a jegyzékbe.
 */
export function ervenyesTablaKulcs(kulcs) {
  if (!kulcs || typeof kulcs.alairo !== 'string' || typeof kulcs.titkosito !== 'string') {
    return false;
  }
  // Egy 32 bájtos nyers kulcs base64url-ben pontosan 43 karakter.
  const jo = (sz) => sz.length === 43 && /^[A-Za-z0-9_-]+$/.test(sz)
    && bajtokka(sz).length === 32;
  return jo(kulcs.alairo) && jo(kulcs.titkosito);
}

// ===================================
// A KÖZÖS TITOK — társanként, küldés nélkül
// ===================================

/**
 * A TÁRSANKÉNTI közös titok: a mi titkos X25519 kulcsunkból és az ő nyilvánosából.
 *
 * ⭐⭐ A TITOK SOHA NEM UTAZIK. Mindkét fél ugyanazt számolja ki a saját feléből — ezért
 * elég, hogy a NYILVÁNOS kulcsokat kicseréltük a cserén (ami nyílt csatorna).
 *
 * ⚠️ A nyers ECDH-eredményt még átdaráljuk (SHA-256), mert nyers titkot kulcsként
 * használni rossz szokás: az eredmény nem egyenletes eloszlású.
 *
 * @returns {Promise<CryptoKey>} AES-GCM kulcs
 */
export async function kozosTitok(sajatLeiras, tarsNyilvanos) {
  const sajat = await subtle.importKey('pkcs8', bajtokka(sajatLeiras.titkositoTitkos),
    { name: 'X25519' }, false, ['deriveBits']);
  const ove = await subtle.importKey('raw', bajtokka(tarsNyilvanos.titkosito),
    { name: 'X25519' }, false, []);

  const nyers = await subtle.deriveBits({ name: 'X25519', public: ove }, sajat, 256);
  const darat = await subtle.digest('SHA-256', nyers);
  return subtle.importKey('raw', darat, { name: 'AES-GCM' }, false,
    ['encrypt', 'decrypt']);
}

/**
 * Titkosítás a társnak — a kiírt cím csak neki szól.
 *
 * ⭐ A véletlen „kezdőérték" (IV) az üzenet ELEJÉN utazik, mert a fogadónak is kell.
 * Nem titok, csak ismétlődnie nem szabad.
 */
export async function titkositva(titok, szoveg) {
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const zart = await subtle.encrypt({ name: 'AES-GCM', iv }, titok,
    new TextEncoder().encode(szoveg));
  return szovegge(Buffer.concat([Buffer.from(iv), Buffer.from(zart)]));
}

/**
 * ⚠️ Ha bárki hozzányúlt a bejegyzéshez, ez HIBÁT dob, nem rossz szöveget ad —
 * az AES-GCM maga ellenőrzi a sértetlenséget. *A hiány és a hamisítás nem ugyanaz (D19).*
 */
export async function kititkositva(titok, rejtett) {
  const nyers = bajtokka(rejtett);
  const iv = nyers.subarray(0, 12);
  const zart = nyers.subarray(12);
  const nyilt = await subtle.decrypt({ name: 'AES-GCM', iv }, titok, zart);
  return new TextDecoder().decode(nyilt);
}
