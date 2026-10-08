// koino/js/csere/kozosHalmaz.js

// Felelősség: D97/1 — A KÖZÖS HALMAZ (hálózat nélkül; a menet a `vonal.js`-é). A szigorú (b) alatt két készülék mást
// vállal: ha a nyitó lenyomat a teljes részvételi halmazukon futna, soha nem egyezne (68. mérés: a „nincs újdonság” csere
// 6–300 KB). Ezért a két fél a részvételi halmazát (P) rövid UJJLENYOMATOKKÉNT egyszer elküldi, a társ megjegyzi (a
// tábla-aláírója alatt), és utána csak a VÁLTOZATOK utaznak: ha mindkét fél a másik mostani halmazát ismeri, mindketten
// ugyanazt a METSZETET számolják, és a nyitó lenyomat azon fut. Ha a halmaz változott, csak a VÁLTOZÁS megy (a
// hozzáadott és a kivett ujjlenyomatok), és a fogadó a változatot ellenőrzi (ha nem stimmel, a teljes listát kéri).
//
//   · az UJJLENYOMAT: `H("koino-reszvetel-1" ‖ kulcs)` első 6 bájtja, base64url (8 jel) — 1000 szeletnél ~10⁻⁹ az ütközés;
//   · a VÁLTOZAT: a rendezett ujjlenyomatok lenyomata (11 jel);
//   · a NAPLÓ (a saját halmazomé): a mostani rendezett lista és a legutóbbi `NAPLO_KORLAT` változás — ebből a változás
//     bármelyik ismert régi változathoz kiszámolható; ha a társ ennél régebbit ismer, a teljes lista megy.
//
// ⭐ A „minden” (null) részvétel a mai mód: aki mindenben részt vesz, annak nincs halmaza — a metszet a másik fél halmaza.
//
// Használják: csere/vonal.js, koino.js (a napló), a próbák.

import { createHash } from 'node:crypto';

/** A saját halmazom legutóbbi ennyi változását őrzöm (a régebbit ismerő társ a teljes listát kapja). */
export const NAPLO_KORLAT = 64;
/** Egy halmaz legfeljebb ennyi ujjlenyomat (a társ üzenete felülről korlátos). */
export const HALMAZ_KORLAT = 100000;

const UJJ_MINTA = /^[A-Za-z0-9_-]{8}$/;
const VALTOZAT_MINTA = /^[A-Za-z0-9_-]{11}$/;

/** Egy szelet-kulcs ujjlenyomata (8 jel). */
export function ujjlenyomat(kulcs) {
  return createHash('sha256').update('koino-reszvetel-1|').update(String(kulcs)).digest().subarray(0, 6).toString('base64url');
}

/** Egy rendezett ujjlenyomat-lista változata (11 jel). Az üres halmazé is az. */
export function valtozat(ujjak) {
  return createHash('sha256').update('koino-reszvetel-valtozat-1|').update(ujjak.join(',')).digest()
    .subarray(0, 8).toString('base64url');
}

export const ervenyesValtozat = (v) => typeof v === 'string' && VALTOZAT_MINTA.test(v);
const ujjLista = (x) => (Array.isArray(x) && x.length <= HALMAZ_KORLAT && x.every((u) => typeof u === 'string' && UJJ_MINTA.test(u))
  ? x : null);

/**
 * A saját halmazom naplója a MOSTANI kulcsokkal: ha változott, új változat, és a változás a napló végére kerül.
 * @param {{v: string, ujjak: Array<string>, tortenet: Array<{v: string, elozo: string, plusz: Array<string>, minusz: Array<string>}>}|null} naplo
 * @param {Iterable<string>} kulcsok
 * @returns {{naplo: Object, valtozott: boolean}}
 */
export function naploFrissitese(naplo, kulcsok) {
  const ujjak = [...new Set([...kulcsok].map(ujjlenyomat))].sort();
  const v = valtozat(ujjak);
  if (naplo && naplo.v === v) return { naplo, valtozott: false };
  const regi = new Set(naplo?.ujjak ?? []);
  const uj = new Set(ujjak);
  const bejegyzes = naplo ? { v, elozo: naplo.v, plusz: ujjak.filter((u) => !regi.has(u)),
    minusz: [...regi].filter((u) => !uj.has(u)).sort() } : null;
  const tortenet = [...(naplo?.tortenet ?? []), ...(bejegyzes ? [bejegyzes] : [])].slice(-NAPLO_KORLAT);
  return { naplo: { v, ujjak, tortenet }, valtozott: true };
}

/**
 * A változás a társ által ismert változattól a mostaniig — vagy null, ha azt a naplóm már nem ismeri (a teljes lista megy).
 * @returns {{plusz: Array<string>, minusz: Array<string>}|null}
 */
export function valtozasBol(naplo, ismertV) {
  if (!naplo || !ervenyesValtozat(ismertV)) return null;
  if (ismertV === naplo.v) return { plusz: [], minusz: [] };
  const i = naplo.tortenet.findIndex((b) => b.elozo === ismertV);
  if (i < 0) return null;
  const halmaz = new Map();                         // ujj → +1 / −1 (a nettó változás)
  for (const b of naplo.tortenet.slice(i)) {
    for (const u of b.plusz) halmaz.set(u, (halmaz.get(u) ?? 0) + 1);
    for (const u of b.minusz) halmaz.set(u, (halmaz.get(u) ?? 0) - 1);
  }
  return { plusz: [...halmaz].filter(([, d]) => d > 0).map(([u]) => u).sort(),
    minusz: [...halmaz].filter(([, d]) => d < 0).map(([u]) => u).sort() };
}

/**
 * A társnak küldendő halmaz-üzenet: a változás (ha a naplóm ismeri, amit ő tud), vagy a teljes lista.
 * @returns {{v: string, alap?: string, plusz?: Array<string>, minusz?: Array<string>, teljes?: Array<string>}}
 */
export function halmazUzenet(naplo, tarsIsmeri) {
  const d = valtozasBol(naplo, tarsIsmeri);
  return d ? { v: naplo.v, alap: tarsIsmeri, plusz: d.plusz, minusz: d.minusz } : { v: naplo.v, teljes: naplo.ujjak };
}

/**
 * A társ halmaz-üzenetének alkalmazása arra, amit róla tudok. ⛔ A változatot ellenőrizzük: ha az eredmény nem a bemondott
 * változat (hiányzó alap, elcsúszott napló, rossz üzenet), null — a hívó ilyenkor a régi menetre vált, és legközelebb a
 * teljes listát kéri (nem ismeri a társ halmazát).
 * @param {{v: string, ujjak: Array<string>}|null} ismert
 * @param {Object} uzenet
 * @returns {{v: string, ujjak: Array<string>}|null}
 */
export function halmazAlkalmazasa(ismert, uzenet) {
  if (!uzenet || typeof uzenet !== 'object' || !ervenyesValtozat(uzenet.v)) return null;
  let ujjak;
  if (uzenet.teljes !== undefined) {
    const l = ujjLista(uzenet.teljes);
    if (!l) return null;
    ujjak = [...new Set(l)].sort();
  } else {
    const plusz = ujjLista(uzenet.plusz);
    const minusz = ujjLista(uzenet.minusz);
    if (!plusz || !minusz || !ismert || ismert.v !== uzenet.alap) return null;
    const h = new Set(ismert.ujjak);
    for (const u of minusz) h.delete(u);
    for (const u of plusz) h.add(u);
    ujjak = [...h].sort();
  }
  return valtozat(ujjak) === uzenet.v ? { v: uzenet.v, ujjak } : null;
}

/**
 * A KÖZÖS HALMAZ: a saját részvételem (null = minden) és a társé (null = minden; különben az ujjlenyomatai) metszete —
 * egy szűrő a szelet-kulcsokra. Ha mindkettő „minden”, null (a régi menet).
 * @param {Set<string>|null} sajatKulcsok
 * @param {Array<string>|null} tarsUjjak
 * @returns {Function|null} (kulcs) → igaz, ha a közös halmazban van
 */
export function kozosSzuro(sajatKulcsok, tarsUjjak) {
  if (!sajatKulcsok && !tarsUjjak) return null;
  const tars = tarsUjjak ? new Set(tarsUjjak) : null;
  return (k) => (!sajatKulcsok || sajatKulcsok.has(k)) && (!tars || tars.has(ujjlenyomat(k)));
}

/**
 * Egy memóriabeli halmaz-tár (a próbáknak, és ahol nincs lemez): a saját naplóm és amit a társak halmazáról tudok.
 * A `koino.js` ugyanezt a felületet fájlba írja (`fajlTar.js` `halmazTarolo`).
 */
export function memoriaHalmazTar() {
  let naplo = null;
  const tarsak = new Map();
  return {
    async sajatNaplo(kulcsok) { naplo = naploFrissitese(naplo, kulcsok).naplo; return naplo; },
    async tarsOlvas(alairo) { return tarsak.get(alairo) ?? null; },
    async tarsIr(alairo, ismert) { if (ismert) tarsak.set(alairo, ismert); else tarsak.delete(alairo); },
    tarsak
  };
}
