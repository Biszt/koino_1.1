// koino/js/csere/kereses.js

// Felelősség: ⭐⭐ A KÉRDÉS TISZTA SZÁMÍTÁSAI (a kereső-réteg ⑤ — D105 K1, K2 (C), K7, K9): mit kérdezzen a kérdező (a terv),
// mit válaszoljon a tartó (a találatok egy helyen), és hogyan ellenőrizze a kérdező a választ. Hálózatot nem nyit (1. szabály):
// a tartók felkutatása (a DHT, a kopogtatás) és a menet (a kérelem gépe) a `koino.js`-é és a `vonal.js`-é.
//
// ===== A TERV (K2 (C), K7) =====
//
// A kérdés szavai közül a LEGHOSSZABB előbb (a hosszabb szó jellemzően ritkább — a K7 „a legritkább szóhoz megy”-ének olcsó
// becslése; a kérdező a válaszból tudja meg, ha a fiók mégis nagy). A szó fiókja: a ≥ 4 jeles szónál a SZÓELEJE (`p:` — ez a
// teljes a toldalékos alakokra: a „park” a „parkban”-t is így találja), a háromjelesnél az egész szó (`e:`). A tartó a
// teljes kérdésre szűr (`cimIllik` — minden kérdés-szó egy cím-szó eleje), tehát EGY nem osztódott fiók válasza teljes. Ha a
// fiók osztódott (K7), a válasz minta: a kérdező néhány darabját kérdezi (`OSZTOTT_MINTA`), és a következő szóra lép.
//
// ===== AZ ELLENŐRZÉS (3. szabály, K9) =====
//
// A tartó szava nem bizonyíték: a kérdező minden találatot maga ellenőriz — az alakját és a tartalmát (`bejegyzesTartalma`: a
// fiók a cím kulcsa, két tulajdonos, a megújítás, a lejárat), a szűrőt (`cimIllik`), és a csomag aláírásait a kapun (a hívó
// teszi a saját tárába). A cím forrása kimondva: a születés címe, vagy egy JAVASOLT cím (K9 — a tartó az elfogadást nem
// ellenőrizheti; a kérdező a gondolat valódi, számított címével szűr, amint ismeri).
//
// Használják: koino.js (a kiszolgáló `kereses`-e, a `kereso keres` parancs), a próbák (`keresesProba.js`).

import { kerdesFiokjai, cimIllik, fiokHelye, fiokDarabja } from './keresoReteg.js';
import { bejegyzesAlakja, bejegyzesTartalma, TIPP_VALASZ } from '../tar/keresoTar.js';

/** Egy válaszban legfeljebb ennyi találat (a tartó a legfrissebbeket adja). */
export const KERESES_TALALAT_KORLAT = 50;
/** Egy osztódott fiókból ennyi darabot kérdez a kérdező (a minta — K7). */
export const OSZTOTT_MINTA = 2;
/** A kérdés legfeljebb ennyi szavát próbálja (a többi a szűrőben dolgozik). */
export const KERDES_SZO_KORLAT = 4;

/**
 * ⭐ A TERV: a kérdés szavai a leghosszabbtól, szavanként a fiók kulcsa (≥ 4 jel: a szóeleje, különben az egész szó).
 * @param {string} kerdes
 * @returns {Array<{szo: string, kulcs: string}>}
 */
export function kerdesTerve(kerdes) {
  const szavak = kerdesFiokjai(kerdes)
    .map((x) => ({ szo: x.szo, kulcs: x.kulcsok.find((k) => k.startsWith('p:')) ?? x.kulcsok[0] }))
    .filter((x) => typeof x.kulcs === 'string');
  const lattuk = new Set();
  return szavak.sort((a, b) => [...b.szo].length - [...a.szo].length || (a.szo < b.szo ? -1 : 1))
    .filter((x) => (lattuk.has(x.kulcs) ? false : (lattuk.add(x.kulcs), true))).slice(0, KERDES_SZO_KORLAT);
}

/**
 * Egy fiók (vagy darabja) helye a kérdezőnek: `s` = 0-n maga a fiók, osztódás után a kért darab.
 * @param {string} kulcs
 * @param {number} [s]
 * @param {bigint|number} [darab]
 */
export function kerdesHelye(kulcs, s = 0, darab = 0n) {
  return fiokHelye(kulcs, s, darab);
}

/**
 * ⭐ Egy osztódott fiók mintája: `OSZTOTT_MINTA` különböző darab az `s` mélységen — a kérdező választja (a kriptográfiai
 * véletlen a hívóé; itt determinisztikus, ha a `veletlen` adott).
 * @param {number} s
 * @param {() => number} [veletlen]
 * @returns {Array<bigint>}
 */
export function osztottMinta(s, veletlen = Math.random) {
  const db = 2n ** BigInt(s);
  const ki = new Set();
  for (let i = 0; i < OSZTOTT_MINTA * 8 && ki.size < Math.min(OSZTOTT_MINTA, Number(db)); i++) {
    ki.add(BigInt(Math.floor(veletlen() * Number(db > 2n ** 50n ? 2n ** 50n : db))) % db);
  }
  return [...ki];
}

/**
 * ⭐ A TARTÓ válasza egy helyre: az INDEXELT bejegyzések közül a kérdésre illők (a teljes kérdésre szűrve), a legfrissebbek
 * elöl, legfeljebb `n`; a hely mérete (az indexeltek száma), és ha a cél fölött van, az osztódás mélysége.
 * @param {Array<Object>} bejegyzesek - a tartó indexelt bejegyzései ezen a helyen
 * @param {{kerdes: string, n?: number, koino: string, most?: number, osok?: Set<string>}} b - ⭐ D118 (⑤a): `osok` — a koinó
 *        őseinek nevei (a hozott entitás bejegyzése az ős eseményeit hordozza)
 */
export function helyTalalatai(bejegyzesek, { kerdes, n = KERESES_TALALAT_KORLAT, koino, most = Date.now(), osok = null }) {
  const illok = [];
  for (const b of bejegyzesek) {
    const t = bejegyzesTartalma(b, koino, most, osok);   // ⭐ D118 (⑤a): a hozott entitásé is
    if (t.rendben && cimIllik(t.cim, kerdes)) illok.push({ b, frissesseg: t.frissesseg });
  }
  illok.sort((x, y) => y.frissesseg - x.frissesseg);
  return illok.slice(0, Math.min(n, KERESES_TALALAT_KORLAT)).map((x) => x.b);
}

/**
 * A kérdés-válasz alakja (a kérdezőnél — a találatokat külön ellenőrzi). ⭐ D111 (K11): a `tippek` — gondolatonként
 * legfeljebb `TIPP_VALASZ` tábla-aláíró (cím nélkül), legfeljebb a találatok számáig; a hibás kiesik.
 */
export function keresesValaszAlakja(u) {
  const tippek = {};
  const MINTA = /^[A-Za-z0-9_-]{43}$/;
  if (u?.tippek && typeof u.tippek === 'object' && !Array.isArray(u.tippek)) {
    for (const [g, lista] of Object.entries(u.tippek).slice(0, KERESES_TALALAT_KORLAT)) {
      if (!MINTA.test(g) || !Array.isArray(lista)) continue;
      const jo = [...new Set(lista.filter((a) => typeof a === 'string' && MINTA.test(a)))].slice(0, TIPP_VALASZ);
      if (jo.length) tippek[g] = jo;
    }
  }
  return {
    talalatok: (Array.isArray(u?.talalatok) ? u.talalatok : []).slice(0, KERESES_TALALAT_KORLAT),
    kiserok: Array.isArray(u?.kiserok) ? u.kiserok.slice(0, 1024) : [],
    meret: Number.isInteger(u?.meret) && u.meret >= 0 ? u.meret : 0,
    osztodott: Number.isInteger(u?.osztodott) && u.osztodott > 0 && u.osztodott <= 144 ? u.osztodott : null,
    tippek
  };
}

/**
 * ⭐ A KÉRDEZŐ ELLENŐRZÉSE: a találatok közül, ami alakra és tartalomra jó, a kérdezett helyre esik, és a kérdésre illik —
 * gondolatonként egyszer (a frissebb), a cím forrásával. A csomag aláírásait a hívó ellenőrzi (a kapun).
 * @param {Array<*>} talalatok
 * @param {{kerdes: string, koino: string, hely?: bigint|null, most?: number, osok?: Set<string>}} b - ⭐ D118 (⑤a): `osok`
 *        mint a `helyTalalatai`-nál
 * @returns {Array<{g: string, cim: string, cimForrasa: 'szuletes'|'javaslat', frissesseg: number, b: Object}>}
 */
export function talalatokEllenorzese(talalatok, { kerdes, koino, hely = null, most = Date.now(), osok = null }) {
  const ki = new Map();
  for (const nyers of talalatok ?? []) {
    const b = bejegyzesAlakja(nyers);
    if (!b) continue;
    const t = bejegyzesTartalma(b, koino, most, osok);   // ⭐ D118 (⑤a): a hozott entitásé is
    if (!t.rendben || !cimIllik(t.cim, kerdes)) continue;
    if (hely !== null && t.hely !== hely) continue;
    const forras = b.esemenyek.some((e) => e.tipus === 'Javaslat') ? 'javaslat' : 'szuletes';
    const regi = ki.get(b.g);
    if (regi && regi.frissesseg >= t.frissesseg) continue;
    ki.set(b.g, { g: b.g, cim: t.cim, cimForrasa: forras, frissesseg: t.frissesseg, b });
  }
  return [...ki.values()].sort((a, c) => c.frissesseg - a.frissesseg);
}

/** Egy gondolat darabja egy osztódott fiókban (a kérdező mintájának ellenőrzéséhez). */
export function talalatDarabja(g, s) {
  return fiokDarabja(g, s);
}
