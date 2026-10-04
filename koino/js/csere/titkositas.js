// koino/js/csere/titkositas.js

// Felelősség: A CSERE TITKOSÍTÁSA (D89/1, a ② — Csaba, 2026-10-02/03) — a kézfogás és a csomagok
// kriptográfiája. Hálózatot NEM nyit (1. szabály): bájtokat kap, bájtokat ad; hogy mi viszi a résen, az
// `udpVonal.js` dolga.
//
// ===== MIT VÉD, ÉS MIT NEM =====
//
// ⭐ Az úton ülő (szolgáltató, nyilvános wifi) elől rejti a cserét: az eseményeket, a koinó azonosítóját, és
// a készülék tábla-kulcsát — ez utóbbi állandó, tehát nyíltan hálózatról hálózatra követni lehetett volna a
// készüléket. ⚠️ Ami látszik: hogy két cím beszél, mikor, és nagyjából mennyit; és a kopogás (KOPOG/HALLAK,
// véletlen azonosítóval). A tárolt adatot a lemezen nem titkosítja (az a készülék biztonsága).
//
// ===== A KÉZFOGÁS — két lépés, mindkét oldal egyszerre (a D89 pontosítása, 2026-10-03) =====
//
//   1. KÉZFOGÁS-CSOMAG (nyílt, 33 bájt): `[KF_JEL][az egyszeri X25519 nyilvános kulcs]`. Mindkét fél küld
//      egyet; a kettőből (ECDH) jön a közös titok, abból a két irány kulcsa (HKDF). ⭐ Az egyszeri kulcsot a
//      munka végén eldobjuk: egy később ellopott készülék kulcsa sem nyitja ki a rögzített múltat.
//   2. A HITELESÍTÉS (már titkosítva, a csere `CIMEK` üzenetében — `vonal.js`): a tábla-kulcs mellé az
//      aláíró (Ed25519) aláírása a kézfogás ÁTIRATÁRA (`kezfogasAlairasa`). Ettől a tábla-kulcs nem bemondás:
//      aki aláírta, az vett részt EBBEN a kézfogásban — egy közbeékelődő nem tud a társ nevében aláírni.
//      ⚠️ Az első találkozásnál a kulcsot elfogadjuk és a kötés megjegyzi (mint az SSH).
//   3. ⭐⭐ A SZEMÉLY (D93/3, az E3 — 2026-10-04): zárt koinóban, ha a társ még nem ismert, a SZEMÉLYES kulcsával
//      (az azonosságával — `kulcs.json`) is aláírja az átiratot, a koinó azonosítójával együtt
//      (`szemelyesKezfogasAlairasa`), és megnevezi a horgonyát — ettől a „ki vagy” nem bemondás: más nem tudja a
//      kulcsa nélkül kiadni magát egy tagnak. A tábla-kulcs és a személy kötését a hívó megjegyzi (a következő
//      cserén már nem kell).
//
// ⚠️ MIÉRT NEM A KOPOGÁSBAN UTAZIK AZ EGYSZERI KULCS: a kapu a társat "cím:port" szerint könyveli, a mobil NAT
// portot vált (32. mérés), a kopogás pedig másodpercenként ismétlődik — a kulcs-könyvelés ott törékeny volna.
// ⚠️ ÉS MIÉRT NEM KÜLÖN JSON-ÜZENETVÁLTÁS: az 57. mérés szerint az 692 B volna munkánként, egy gépen belüli
// „nincs újdonság” csere pedig 484 B.
//
// ===== A TITKOSÍTOTT CSOMAG =====
//
//   `[TITKOS_JEL][számláló (LEB128, 1–3 bájt)][AES-256-GCM rejtjel][címke 16 bájt]`
//
// Irányonként külön kulcs, a nonce a számlálóból (egy kulcs alatt soha nem ismétlődik); a számláló a
// csomagban utazik, mert a UDP-csomag elveszhet és előzhet. Minden csomag titkosítva megy — a nyugta is
// (különben egy hamisított nyugta elhallgattathatná a cserét). Az ismétlés ártalmatlan: a vonal a sorszám
// szerint úgyis kiszűri, és munkánként új kulcs van.
//
// ⚠️ NULLA FÜGGŐSÉG (6. szabály): a beépített `node:crypto` (X25519, Ed25519, HKDF, AES-GCM) — szinkron,
// mert a vonal küldő útja szinkron.
//
// Használják: csere/udpVonal.js (a kézfogás és a védett rés), csere/udpKapu.js (a jelek), koino.js, próbák.

import {
  generateKeyPairSync, diffieHellman, hkdfSync, createCipheriv, createDecipheriv,
  createPublicKey, createPrivateKey, createHash, sign, verify
} from 'node:crypto';

/** A titkosított csomag első bájtja — se nem `{` (a nyílt JSON), se nem STUN (az első két bit 0), se nem bencode. */
export const TITKOS_JEL = 0xa5;
/** A kézfogás-csomag első bájtja. */
export const KF_JEL = 0xa6;

const KULCS_HOSSZ = 32;
const CIMKE = 16;

// ===================================
// AZ EGYSZERI KULCS ÉS A KÉZFOGÁS-CSOMAG
// ===================================

/** Új egyszeri X25519 kulcspár — munkánként egy. */
export function ujEgyszeriKulcs() {
  const { publicKey, privateKey } = generateKeyPairSync('x25519');
  return { titkos: privateKey, nyilvanos: Buffer.from(publicKey.export({ format: 'jwk' }).x, 'base64url') };
}

/** A kézfogás-csomag: `[KF_JEL][32 bájt]`. */
export function kezfogasCsomag(nyilvanos) {
  return Buffer.concat([Buffer.from([KF_JEL]), nyilvanos]);
}

/** A kézfogás-csomagból a társ egyszeri kulcsa — vagy null, ha nem az. */
export function kezfogasCsomagbol(buf) {
  return Buffer.isBuffer(buf) && buf.length === 1 + KULCS_HOSSZ && buf[0] === KF_JEL ? buf.subarray(1) : null;
}

// ===================================
// A MUNKAMENET KULCSAI
// ===================================

/**
 * A két irány kulcsa és a kézfogás átirata — mindkét oldal ugyanazt számolja (a szerepet a két nyilvános
 * kulcs sorrendje adja, nem az, ki kezdett).
 *
 * @param {{titkos: KeyObject, nyilvanos: Buffer}} sajat - a saját egyszeri kulcsunk
 * @param {Buffer} tarsNyilvanos - a társ egyszeri kulcsa (32 bájt)
 * @returns {{kuldo: Buffer, fogado: Buffer, atirat: Buffer}}
 */
export function munkamenetKulcsai(sajat, tarsNyilvanos) {
  if (!Buffer.isBuffer(tarsNyilvanos) || tarsNyilvanos.length !== KULCS_HOSSZ) {
    throw new Error('a társ egyszeri kulcsa nem 32 bájt');
  }
  if (tarsNyilvanos.equals(sajat.nyilvanos)) throw new Error('a társ a saját kulcsunkat mondta vissza');
  const tars = createPublicKey({ key: { kty: 'OKP', crv: 'X25519', x: tarsNyilvanos.toString('base64url') },
    format: 'jwk' });
  const kozos = diffieHellman({ privateKey: sajat.titkos, publicKey: tars });
  // ⛔ A kis rendű pontok csupa nulla titkot adnak — az ilyen „kulcs" bárkinek ismert.
  if (kozos.every((b) => b === 0)) throw new Error('a társ egyszeri kulcsa érvénytelen (kis rendű pont)');

  const enVagyokAKisebb = Buffer.compare(sajat.nyilvanos, tarsNyilvanos) < 0;
  const [kisebb, nagyobb] = enVagyokAKisebb ? [sajat.nyilvanos, tarsNyilvanos] : [tarsNyilvanos, sajat.nyilvanos];
  const atirat = createHash('sha256').update('koino-kezfogas-1').update(kisebb).update(nagyobb).digest();
  const anyag = Buffer.from(hkdfSync('sha256', kozos, atirat, 'koino-csere-1', 2 * KULCS_HOSSZ));
  const kisebbtol = anyag.subarray(0, KULCS_HOSSZ);
  const nagyobbtol = anyag.subarray(KULCS_HOSSZ);
  return enVagyokAKisebb
    ? { kuldo: kisebbtol, fogado: nagyobbtol, atirat }
    : { kuldo: nagyobbtol, fogado: kisebbtol, atirat };
}

// ===================================
// A CSOMAGOK
// ===================================

function szamlaloBajtjai(n) {
  const ki = [];
  do { let b = n & 0x7f; n = Math.floor(n / 128); if (n) b |= 0x80; ki.push(b); } while (n);
  return Buffer.from(ki);
}

function nonce(n) {
  const b = Buffer.alloc(12);
  b.writeBigUInt64BE(BigInt(n), 4);
  return b;
}

/**
 * Egy csomag titkosítása. ⛔ A számláló irányonként szigorúan nő — egy kulcs alatt soha nem ismétlődhet.
 * @returns {Buffer} `[TITKOS_JEL][számláló][rejtjel][címke]`
 */
export function csomagTitkositasa(kulcs, szamlalo, nyilt) {
  if (!Number.isSafeInteger(szamlalo) || szamlalo < 1) throw new Error('a számláló csak pozitív egész lehet');
  const c = createCipheriv('aes-256-gcm', kulcs, nonce(szamlalo));
  const rejtjel = Buffer.concat([c.update(nyilt), c.final()]);
  return Buffer.concat([Buffer.from([TITKOS_JEL]), szamlaloBajtjai(szamlalo), rejtjel, c.getAuthTag()]);
}

/**
 * Egy csomag kititkosítása — ⚠️ hamisított, sérült vagy más kulcsú csomagnál NULL (nem kivétel): a résen
 * bármi érkezhet, és egy rossz csomag nem állíthatja meg a beszélgetést.
 * @returns {{szamlalo: number, nyilt: Buffer}|null}
 */
export function csomagKititkositasa(kulcs, buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 1 + 1 + CIMKE || buf[0] !== TITKOS_JEL) return null;
  let i = 1, szamlalo = 0, szorzo = 1;
  for (;;) {
    if (i >= buf.length || i > 8) return null;
    const b = buf[i++];
    szamlalo += (b & 0x7f) * szorzo;
    szorzo *= 128;
    if (!(b & 0x80)) break;
  }
  if (szamlalo < 1 || buf.length - i < CIMKE) return null;
  try {
    const d = createDecipheriv('aes-256-gcm', kulcs, nonce(szamlalo));
    d.setAuthTag(buf.subarray(buf.length - CIMKE));
    const nyilt = Buffer.concat([d.update(buf.subarray(i, buf.length - CIMKE)), d.final()]);
    return { szamlalo, nyilt };
  } catch {
    return null;
  }
}

// ===================================
// A HITELESÍTÉS — a tábla-kulcs aláírja a kézfogás átiratát
// ===================================

const ALAIRT = (atirat) => Buffer.concat([Buffer.from('koino-kezfogas-alairas-1'), atirat]);

/**
 * A saját tábla-kulcsunk aláírása a kézfogás átiratára (a `CIMEK`-ben utazik, titkosítva).
 * @param {Object} tablaLeiras - a tábla-kulcs mentett leírása (`tablaKulcs.js`: `alairoTitkos`)
 * @param {Buffer} atirat
 * @returns {string} base64url
 */
export function kezfogasAlairasa(tablaLeiras, atirat) {
  const kulcs = createPrivateKey({ key: Buffer.from(tablaLeiras.alairoTitkos, 'base64url'), format: 'der',
    type: 'pkcs8' });
  return sign(null, ALAIRT(atirat), kulcs).toString('base64url');
}

// ===================================
// ⭐⭐ A SZEMÉLY — a személyes kulcs aláírja a kézfogás átiratát (D93/3)
// ===================================
//
// ⚠️ Más előtag, mint a tábla-kulcsé, ÉS a koinó azonosítója is benne van: egy aláírás így se másik szerepben
// (tábla-kulcs, esemény), se másik koinóban nem használható fel újra.

const SZEMELYES = (koino, atirat) => Buffer.concat([Buffer.from('koino-kezfogas-szemely-1|' + koino + '|'), atirat]);

/**
 * A saját személyes aláírásunk a kézfogás átiratára.
 * @param {Object} privatJwk - a személyes kulcs titkos fele JWK-ban (`kulcsTar.js`: `kulcsparLeirasa().privatKulcs`)
 * @param {string} koino
 * @param {Buffer} atirat
 * @returns {string} base64url
 */
export function szemelyesKezfogasAlairasa(privatJwk, koino, atirat) {
  const kulcs = createPrivateKey({ key: privatJwk, format: 'jwk' });
  return sign(null, SZEMELYES(koino, atirat), kulcs).toString('base64url');
}

/**
 * A társ személyes aláírása a kézfogás átiratára — a szerző (a nyilvános kulcsa, 43 jel) a bemondás, az aláírás a
 * bizonyíték.
 * @returns {boolean}
 */
export function szemelyesKezfogasEllenorzese(szerzo, koino, atirat, alairas) {
  return kezfogasAlairasEllenorzeseNyers(szerzo, SZEMELYES(koino, atirat), alairas);
}

function kezfogasAlairasEllenorzeseNyers(nyilvanos, uzenet, alairas) {
  try {
    if (typeof nyilvanos !== 'string' || typeof alairas !== 'string') return false;
    const kulcs = createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x: nyilvanos }, format: 'jwk' });
    return verify(null, uzenet, kulcs, Buffer.from(alairas, 'base64url'));
  } catch {
    return false;
  }
}

/**
 * A társ aláírása a kézfogás átiratára — az ő bemondott aláíró kulcsával.
 * @param {string} alairoNyilvanos - base64url (43 jel)
 * @returns {boolean}
 */
export function kezfogasAlairasEllenorzese(alairoNyilvanos, atirat, alairas) {
  return kezfogasAlairasEllenorzeseNyers(alairoNyilvanos, ALAIRT(atirat), alairas);
}
