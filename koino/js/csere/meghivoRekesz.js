// koino/js/csere/meghivoRekesz.js

// Felelősség: ⭐⭐ M8 — A MEGHÍVÓ REKESZE (a belépő megtalálása két hálózat között; docs/belepo_megtalalasa_atvizsgalas.md 7–8.).
//
// ⛔ A KIVÁLTÓ LELET (87. mérés): a belépő eddig a BEP 5-ön jelentkezett (a meghívó készülék-témáján), de a BEP 5 cetli témánként
// vagy mindig megvan, vagy soha (75%), és HAMISÍTÓDIK (a bejelentést figyelő gépek a saját címükkel adják vissza). A BEP 44
// (aláírt, módosítható bejegyzés — a hirdetőtábla útja, 2026-09-20) 100%-ban megtalálható, és hamisítani nem lehet.
//
// ⭐ A REKESZ: a meghívó TITKÁBÓL (ami a meghívóban utazik, és csak a két félnél van) mindkét fél ugyanazt számolja —
//   · az Ed25519 kulcspárt (a rekesz neve: a BEP 44 `k`-ja),
//   · a sót (a rekesz helye: a cél a kulcs és a só lenyomata — só nélkül megtalálni sem lehet),
//   · és a titkosító kulcsot (AES-256-GCM — a DHT-t figyelő gépek a belépő címét sem látják).
// A belépő ide írja ki a címeit és a tábla-aláíróját (amíg a meghívója él, és ő még nem tag); a meghívó minden élő meghívójának
// rekeszét nézi, és amit talál, arra kopog (a rés a két egyidejű kopogásból nyílik — 36/d).
//
// ⚠️ Amit ez NEM véd: aki a meghívót ismeri (a titok a meghívó szövegében van), az a rekeszt is olvashatja és írhatja — a meghívó
// kulcs (D122), tehát ő úgyis beléphetne vele. A legrosszabb, amit tehet: egy hamis címet ír ki, és a meghívó oda is kopog (a
// meghívást a kapu bizonyítéka dönti el, nem a rekesz — 3. szabály: a bizalom nem a csatornából jön).
//
// ⭐ És a keresés üteme (M2, B2 (b) — Csaba, 2026-11-04): a meghívó a rekeszt az első órában 2, az első napban 5, utána 10
// percenként nézi, amíg a meghívó él (a belépő napok múlva is beillesztheti).
//
// Hálózatot nem importál (1. szabály) — a bejegyzést a hívó viszi a DHT-ra (`dht.js`). Használja: koino.js, meghivoProba.js.

import { createHash, webcrypto } from 'node:crypto';
import { bejegyzesKeszitese } from './dht.js';

const { subtle } = webcrypto;

/** A rekesz tartalmának alakja (a titkosított JSON `a` mezője). */
export const REKESZ_ALAK = 'koino-belepo-1';
/** Legfeljebb ennyi cím egy rekeszben (a nyilvános és a helyiek) — a BEP 44 értéke ≤ 1000 bájt. */
export const REKESZ_CIM_KORLAT = 4;
/** M2: a keresés üteme — az első órában, az első napban, utána. */
export const REKESZ_KOZ_ELSO_ORA = 2 * 60 * 1000;
export const REKESZ_KOZ_ELSO_NAP = 5 * 60 * 1000;
export const REKESZ_KOZ_UTANA = 10 * 60 * 1000;

const SO_HOSSZ = 20;
const PKCS8_ELOTAG = Buffer.from('302e020100300506032b657004220420', 'hex');
const HOSZT_MINTA = /^[A-Za-z0-9.:%_-]{1,64}$/;
const ALAIRO_MINTA = /^[A-Za-z0-9_-]{22,64}$/;
const TITOK_MINTA = /^[A-Za-z0-9_-]{22,64}$/;

/** A titokból egy cimkézett 32 bájtos lenyomat (a három származtatott érték egymástól független). */
function szarmaztatott(titok, cimke) {
  return createHash('sha256').update('koino-meghivo-rekesz|' + cimke + '|' + titok).digest();
}

/**
 * ⭐ A meghívó rekesze — a kulcspár (a BEP 44-hez), a nyers nyilvános kulcs és a só (hol keressük), és a titkosító kulcs.
 * @param {string} titok - a meghívó titka
 * @returns {Promise<{kulcspar: {privateKey: CryptoKey, publicKey: CryptoKey}, kulcs: Buffer, so: Buffer, aes: CryptoKey}>}
 */
export async function meghivoRekesze(titok) {
  if (typeof titok !== 'string' || !TITOK_MINTA.test(titok)) throw new Error('A meghívó titka nem ép.');
  const privateKey = await subtle.importKey('pkcs8', Buffer.concat([PKCS8_ELOTAG, szarmaztatott(titok, 'kulcs')]),
    { name: 'Ed25519' }, true, ['sign']);
  const kulcs = Buffer.from((await subtle.exportKey('jwk', privateKey)).x, 'base64url');
  const publicKey = await subtle.importKey('raw', kulcs, { name: 'Ed25519' }, true, ['verify']);
  const aes = await subtle.importKey('raw', szarmaztatott(titok, 'titkositas'), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  return { kulcspar: { privateKey, publicKey }, kulcs, so: szarmaztatott(titok, 'so').subarray(0, SO_HOSSZ), aes };
}

/** Egy cím ép alakja → [hoszt, port] vagy null. */
function cimAlakja(c) {
  const hoszt = Array.isArray(c) ? c[0] : c?.hoszt;
  const port = Number(Array.isArray(c) ? c[1] : c?.port);
  if (typeof hoszt !== 'string' || !HOSZT_MINTA.test(hoszt)) return null;
  if (!Number.isInteger(port) || port <= 0 || port >= 65536) return null;
  return [hoszt, port];
}

/** A címek ép, ismétlés nélküli listája (legfeljebb `REKESZ_CIM_KORLAT`). */
function cimLista(cimek) {
  const ki = [];
  for (const c of Array.isArray(cimek) ? cimek : []) {
    const a = cimAlakja(c);
    if (a && !ki.some((x) => x[0] === a[0] && x[1] === a[1])) ki.push(a);
    if (ki.length >= REKESZ_CIM_KORLAT) break;
  }
  return ki;
}

/**
 * ⭐ A belépő bejegyzése a rekeszbe — a címei és a tábla-aláírója, titkosítva, a rekesz kulcsával aláírva. A sorszám másodpercben
 * (a BEP 44 szerint a nagyobb írja felül a kisebbet: a frissebb cím győz).
 * @param {string} titok
 * @param {{cimek: Array<{hoszt: string, port: number}>, alairo: string, most?: number}} b
 * @returns {Promise<Object>} a `dht.js` `kozzetesz`-ének átadható bejegyzés
 */
export async function rekeszBejegyzes(titok, { cimek, alairo, most = Date.now() }) {
  const c = cimLista(cimek);
  if (!c.length) throw new Error('A rekeszbe nincs mit kiírni: egy ép cím sincs.');
  if (typeof alairo !== 'string' || !ALAIRO_MINTA.test(alairo)) throw new Error('A tábla-aláíró nem ép.');
  const r = await meghivoRekesze(titok);
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const zart = await subtle.encrypt({ name: 'AES-GCM', iv }, r.aes,
    new TextEncoder().encode(JSON.stringify({ a: REKESZ_ALAK, c, t: alairo, m: most })));
  const ertek = Buffer.concat([Buffer.from(iv), Buffer.from(zart)]).toString('base64url');
  return bejegyzesKeszitese({ kulcspar: r.kulcspar, salt: r.so, seq: Math.floor(most / 1000), ertek });
}

/**
 * ⭐ A rekeszben talált bejegyzés kibontása (a meghívó oldalán) — az aláírást a DHT-réteg már ellenőrizte (`keres`); itt a
 * titkosítás sértetlensége és az alak. Ami nem illik, az null (kimondva a hívónál — D19).
 * @param {string} titok
 * @param {Buffer|string} ertek - a bejegyzés értéke
 * @returns {Promise<{cimek: Array<{hoszt: string, port: number}>, alairo: string, mikor: number}|null>}
 */
export async function rekeszBejegyzesbol(titok, ertek) {
  try {
    const r = await meghivoRekesze(titok);
    const nyers = Buffer.from(typeof ertek === 'string' ? ertek : Buffer.from(ertek).toString('utf8'), 'base64url');
    if (nyers.length < 13) return null;
    const nyilt = await subtle.decrypt({ name: 'AES-GCM', iv: nyers.subarray(0, 12) }, r.aes, nyers.subarray(12));
    const j = JSON.parse(new TextDecoder().decode(nyilt));
    if (j?.a !== REKESZ_ALAK || typeof j.t !== 'string' || !ALAIRO_MINTA.test(j.t)) return null;
    const c = cimLista(j.c);
    if (!c.length) return null;
    return { cimek: c.map(([hoszt, port]) => ({ hoszt, port })), alairo: j.t, mikor: Number.isFinite(j.m) ? j.m : 0 };
  } catch {
    return null;
  }
}

/**
 * ⭐ M2: mikor nézze újra a meghívó ezt a rekeszt — a meghívó kora szerint lépcsőzve (az első órában 2, az első napban 5, utána 10
 * percenként).
 * @param {number} letrehozva - a meghívó kiállításának ideje
 * @param {number} most
 */
export function rekeszKeresesKoze(letrehozva, most) {
  const kor = most - (Number.isFinite(letrehozva) ? letrehozva : most);
  return kor < 3600 * 1000 ? REKESZ_KOZ_ELSO_ORA : kor < 24 * 3600 * 1000 ? REKESZ_KOZ_ELSO_NAP : REKESZ_KOZ_UTANA;
}
