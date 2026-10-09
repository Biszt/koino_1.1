// koino/js/csere/tarsEmlekezet.js

// Felelősség: A TÁRSANKÉNTI EMLÉKEZET (az F pillér — D98/1, 2026-10-09): ha a közös szeletek közül néhány megváltozott, a
// párbeszéd ne a két szintű tartomány-egyeztetés első szintjével keresse meg, MELYIK (a 70. mérés szerint ez a változott
// szeleteknél a nyílt forgalom 25–62%-a, változásonként ~1–2 KB), hanem a két fél mondja meg, mi változott NÁLA azóta,
// hogy legutóbb egymással cseréltek.
//
// ===== ⭐ A GONDOLAT =====
//
// A csere végén mindkét fél feljegyzi a társ tábla-aláírója alatt a SAJÁT tára akkori állását (a mutató hossza és a
// tömörítés generációja — `fajlTar.js` `allas`), és a csere végén is eltérő szeleteket (a MARADÉKOT: ahol valamelyik fél
// kimaradt — `r`). Akkor a két fél a közös szeleteken egyezett, a maradék kivételével. A következő cserén mindkét fél
// elküldi azoknak a szeleteknek a kulcsát, amelyek NÁLA azóta változtak (a tára vége óta hozzáfűzött események szeletei és
// bejelentési helyei — test nélkül, a mutatóból) + a maradékot: ez a két lista uniója (U). ⭐ Ami U-n kívül esik, az a két
// félnél ugyanaz — DE ezt nem hisszük el, hanem ELLENŐRIZZÜK: mindkét fél elküldi a U-n kívüli párjainak lenyomatát; ha a
// kettő egyezik, U a két fél párjaiból (a teljes lenyomatukkal) közvetlenül osztályozható (mindkettőnél eltér · csak nálam ·
// csak nála), és jöhet a második szint. Ha nem egyezik (valaki elfelejtett, kihagyott, vagy hazudott valamit), ugyanabban a
// cserében a rendes első szint fut — a lista tehát NEM kíván bizalmat.
//
// ⭐ Miért nem kell „közös alapban” megegyezni? Mert ha a társ egy RÉGEBBI állásához képest mondja, mi változott, a lista
// csak bővebb (a régebbi pont óta több minden változott) — és a U-n kívüli rész ellenőrzése úgyis eldönti, igaz-e.
//
// ⚠️ Amit tudni kell róla: a társankénti feljegyzés ÁLLANDÓ méretű (két szám és legfeljebb `MARADEK_KORLAT` kulcs), és
// legfeljebb `EMLEKEZET_TARS_KORLAT` társé; a változott kulcsok száma korlátos (`VALTOZOTT_KORLAT` — fölötte a mai menet),
// és a tár vége óta legfeljebb `ESEMENY_KORLAT` eseményt nézünk. Tömörítés után (új generáció) nincs feljegyzés.
//
// ⚠️ HÁLÓZATOT NEM IMPORTÁL (1. szabály): számol és ellenőriz; a vonal (`vonal.js`) viszi az üzeneteket, a fájl-tár
// (`fajlTar.js` `emlekezetTarolo`) a feljegyzést.
//
// Használják: csere/vonal.js (a párbeszéd), tar/fajlTar.js (a tároló felülete ugyanez), a próbák, a 70. mérés.

import { rendezettHalmaz, halmazLenyomata } from '../esemeny/halmaz.js';
import { vonalKulcsa, ervenyesKulcs, KOINO_SZULETES_KULCS } from './szeletEgyeztetes.js';

// ===================================
// A PARAMÉTEREK — ⚠️ egyik sem állapot-befolyásoló (D66): két eltérő értékű fél is helyesen cserél, legfeljebb a mai menet fut
// ===================================

/** Legfeljebb ennyi társról jegyzünk meg állást (a legrégebben látott esik ki — mint a `halmazok.json`). */
export const EMLEKEZET_TARS_KORLAT = 64;
/** Egy fél legfeljebb ennyi változott kulcsot mond; fölötte a mai menet (az első szint úgyis olcsóbb volna). */
export const VALTOZOTT_KORLAT = 256;
/** A tár vége óta legfeljebb ennyi eseményt nézünk (a mutatóból, test nélkül). */
export const ESEMENY_KORLAT = 4096;
/** A maradék (a csere végén is eltérő szeletek) legfeljebb ennyi kulcs; fölötte nem jegyzünk fel állást. */
export const MARADEK_KORLAT = 64;
/** A U-n kívüli párok lenyomatának hossza a vonalon (22 jel = 132 bit). */
const KIVUL_HOSSZ = 22;

const LENYOMAT_MINTA = /^[A-Za-z0-9_-]{43}$/;

// ===================================
// A FELJEGYZÉS
// ===================================

/**
 * A feljegyzés a csere végén: a tár mostani állása és a maradék. Null, ha nincs mit feljegyezni (nincs állás, vagy a
 * maradék túl nagy — akkor a következő cserén a mai menet fut).
 * @param {Object} tar - `allas()`-sal
 * @param {Iterable<string>} maradek - a csere végén is eltérő szelet-kulcsok
 * @returns {{n: number, g: number, r: Array<string>}|null}
 */
export function emlekezetFeljegyzes(tar, maradek = []) {
  const a = typeof tar?.allas === 'function' ? tar.allas() : null;
  if (!a || !Number.isSafeInteger(a.n) || !Number.isSafeInteger(a.g)) return null;
  const r = [...new Set(maradek)].filter(ervenyesKulcs).sort();
  if (r.length > MARADEK_KORLAT) return null;
  return { n: a.n, g: a.g, r };
}

/** Egy tárolt feljegyzés alakja (a fájlból jön — nem bízunk benne). */
export function feljegyzesAlakja(x) {
  if (!x || typeof x !== 'object' || !Number.isSafeInteger(x.n) || x.n < 0 || !Number.isSafeInteger(x.g)) return null;
  const r = Array.isArray(x.r) ? x.r.filter(ervenyesKulcs).slice(0, MARADEK_KORLAT) : [];
  return { n: x.n, g: x.g, r };
}

/**
 * ⭐ A NÁLAM VÁLTOZOTT kulcsok a feljegyzés óta (a vonal kulcsaival): a tár vége óta hozzáfűzött események szeletei és
 * bejelentési helyei (a gyökér '' → a gyökér vonal-kulcsa), a koinó születése (ha az esemény közöttük van), és a maradék.
 * Null, ha nincs (használható) feljegyzés — más generáció, a tár rövidebb, mint a feljegyzés, túl sok esemény vagy kulcs.
 * @param {Object} tar - `allas()`, `valtozottSzeletek(n, korlat)`
 * @param {Object|null} feljegyzes
 * @param {{szuletes?: string|null, szuro?: Function}} [b] - a koinó születésének azonosítója; a résztvevő kulcsok szűrője
 *   (a maradékra nem — azt az a fél tartja meg, amelyik részt vesz benne)
 * @returns {Array<string>|null} rendezve
 */
export function valtozottKulcsok(tar, feljegyzes, { szuletes = null, szuro = () => true } = {}) {
  const f = feljegyzesAlakja(feljegyzes);
  if (!f || typeof tar?.allas !== 'function' || typeof tar?.valtozottSzeletek !== 'function') return null;
  const a = tar.allas();
  if (a.g !== f.g || f.n > a.n) return null;
  const v = tar.valtozottSzeletek(f.n, ESEMENY_KORLAT);
  if (!v) return null;
  const kulcsok = new Set();
  for (const s of v.kulcsok) {
    const k = vonalKulcsa(s);
    if (ervenyesKulcs(k) && szuro(k)) kulcsok.add(k);
  }
  // ⚠️ A koinó születésének párja a szűrőtől függetlenül a párok közt van (mindenki részt vesz benne — D96).
  if (szuletes && v.azonositok.includes(szuletes)) kulcsok.add(KOINO_SZULETES_KULCS);
  for (const k of f.r) kulcsok.add(k);
  if (kulcsok.size > VALTOZOTT_KORLAT) return null;
  return [...kulcsok].sort();
}

// ===================================
// A VONAL ÜZENETEI — a változott kulcsok, a U-n kívüli lenyomat és a U párjai
// ===================================

/** A társ VALTOZOTT listájának alakja: null (nincs feljegyzése), vagy legfeljebb `VALTOZOTT_KORLAT` érvényes kulcs. */
export function valtozottAlakja(x) {
  if (x === null || x === undefined) return null;
  if (!Array.isArray(x) || x.length > VALTOZOTT_KORLAT || !x.every(ervenyesKulcs)) {
    const hiba = new Error('Hibás VALTOZOTT üzenet (a kulcsok listája)');
    hiba.kod = 'HIBAS-EGYEZTETES';
    throw hiba;
  }
  return [...new Set(x)].sort();
}

/** A két lista uniója (U) — mindkét fél ugyanazt számolja. */
export function valtozottUnio(sajat, ove) {
  return [...new Set([...sajat, ...ove])].sort();
}

/**
 * ⭐ A U-n KÍVÜLI párok lenyomata (`KIVUL_HOSSZ` jel): ha a két félé egyezik, minden, amiről a lista nem szólt, egyezik.
 * @param {Array<string>} parok - a „szelet:lenyomat” párok (rendezve)
 * @param {Set<string>} U
 */
export async function kivulLenyomat(parok, U) {
  const kivul = parok.filter((p) => !U.has(p.slice(0, 43)));
  return (await halmazLenyomata(rendezettHalmaz(kivul))).slice(0, KIVUL_HOSSZ);
}

/** A U kulcsainak párja nálam (a szelet lenyomata, vagy '' — ha nem veszek részt benne / nincs ilyen szeletem). */
export function uParjai(parok, U) {
  const m = new Map(parok.map((p) => [p.slice(0, 43), p.slice(44)]));
  return U.map((k) => m.get(k) ?? '');
}

/** A társ VALTOZOTTPAROK üzenetének alakja (a U-hoz igazítva) — ⛔ hibásnál kivétel (a társ hibázott vagy ellenséges). */
export function parokAlakja(u, hossz) {
  const ok = u && typeof u.kv === 'string' && u.kv.length === KIVUL_HOSSZ && /^[A-Za-z0-9_-]+$/.test(u.kv)
    && Array.isArray(u.l) && u.l.length === hossz && u.l.every((x) => x === '' || LENYOMAT_MINTA.test(x));
  if (!ok) {
    const hiba = new Error('Hibás VALTOZOTTPAROK üzenet');
    hiba.kod = 'HIBAS-EGYEZTETES';
    throw hiba;
  }
  return { kv: u.kv, l: u.l };
}

/**
 * ⭐ A U osztályozása a két fél párjaiból — ugyanaz a három lista, amit az első szint és az ELTERO ad: mindkettőnél eltér ·
 * csak nálam · csak nála (az egyezők kiesnek).
 * @param {Array<string>} U
 * @param {Array<string>} sajat - a U párjai nálam (`uParjai`)
 * @param {Array<string>} ove - a U párjai nála
 * @returns {{mindketten: Array<string>, nalam: Array<string>, nalad: Array<string>}}
 */
export function uOsztalyozasa(U, sajat, ove) {
  const l = { mindketten: [], nalam: [], nalad: [] };
  U.forEach((k, i) => {
    const en = sajat[i] ?? '', o = ove[i] ?? '';
    if (en === o) return;
    if (en && o) l.mindketten.push(k);
    else if (en) l.nalam.push(k);
    else l.nalad.push(k);
  });
  return l;
}

// ===================================
// A TÁROLÓ — memóriában (a próbáknak és a mérésnek); a fájlos párja a `fajlTar.js` `emlekezetTarolo`-ja
// ===================================

/** @returns {{olvas: Function, ir: Function}} */
export function memoriaEmlekezetTar() {
  const t = new Map();
  return {
    async olvas(alairo) { return t.get(alairo) ?? null; },
    async ir(alairo, feljegyzes) {
      if (feljegyzes) { t.delete(alairo); t.set(alairo, feljegyzes); } else t.delete(alairo);
      while (t.size > EMLEKEZET_TARS_KORLAT) t.delete(t.keys().next().value);
    }
  };
}
