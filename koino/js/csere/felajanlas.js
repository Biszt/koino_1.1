// koino/js/csere/felajanlas.js

// Felelősség: ⭐⭐ A FELAJÁNLÁS TISZTA SZÁMÍTÁSAI (D107 L4 (A) — a kereső-réteg ④c): a tulajdonos a gondolatai bejegyzéseit a
// fiók helye szerint RÉGIÓKBA osztja (egy régióban egy tartó elég — a többihez a ③b viszi), követi a tartók által kimondott
// OSZTÓDÁST (K7), nyilvántartja, mit ajánlott már fel, és a megújítást újrahasznosítja, amíg nem esedékes (különben minden
// körben új aláírás, új azonosító — és újra-felajánlás). Hálózatot nem nyit (1. szabály): hogy mi viszi a tartóhoz (a kérelem
// gépe, a függő kérelem, a kopogtatás), az a `koino.js`-é.
//
// ===== AZ OSZTÓDÁS (K7) =====
//
// Egy fiók (`k`) az `s` mélységű darabjában (a gondolat lenyomata szerint — `fiokDarabja`) ha a tartónál a hely meghaladja a
// célt, a tartó kimondja: `{ k, s: s' }` — a felajánló ezt a (k, s, a gondolat darabja) alatt jegyzi, és a következő
// felajánláskor a mélyebb darab régiójába viszi (`bejegyzesHelye(k, g, s')`). A darabok egymásba ágyazottak, a jegyzék lánca
// (s → s' → s'' …) követhető; legfeljebb `DARAB_MAX_MELYSEG`.
//
// Használják: koino.js (a `kereso felajanl`, az őrjárat felajánló köre, a kiszolgáló), a próbák (`felajanlasProba.js`).

import { bejegyzesHelye, fiokDarabja, keresoRegioKulcsa, regiobaEsik } from './keresoReteg.js';
import { lenyomatDarabja, DARAB_MAX_MELYSEG } from './cimjegyzek.js';
import { bejegyzesAzonositoja } from '../tar/keresoTar.js';
import { megujitasEllenorzese, megujitaniKell, csomagTulajdonosai } from '../tar/keresoMegujitas.js';

/** Egy felajánló kérelemben legfeljebb ennyi bejegyzés (a tartó a többit nem nézi). */
export const FELAJANLAS_KORLAT = 64;
/** Egy felajánló kérelemben legfeljebb ennyi tagsági kísérő (D113: legalább egy szerző teljes lánca — 773 a 256-os
 * mélységnél; a `tagsagKisero.js` válasz-korlátja). */
export const FELAJANLAS_KISERO_KORLAT = 1024;
/** A jegyzék korlátai (helyi feljegyzés). */
export const AJANLOTT_KORLAT = 4096;
export const OSZTODAS_KORLAT = 4096;
export const MEGUJITAS_JEGYZEK_KORLAT = 4096;

/** Üres jegyzék: mit ajánlottam fel (azonosító → mikor), a kimondott osztódások, és a gondolatonkénti utolsó megújításom. */
export function uresFelajanlasJegyzek() {
  return { ajanlott: {}, osztodasok: {}, megujitasok: {} };
}

/** A (fájlból jött) jegyzék alakja — a hibás tételeket eldobja. */
export function felajanlasJegyzekAlakja(j) {
  const ki = uresFelajanlasJegyzek();
  if (!j || typeof j !== 'object') return ki;
  for (const [id, ido] of Object.entries(j.ajanlott ?? {})) if (/^[A-Za-z0-9_-]{43}$/.test(id) && Number.isFinite(ido)) ki.ajanlott[id] = ido;
  for (const [k, s] of Object.entries(j.osztodasok ?? {})) {
    if (typeof k === 'string' && k.length <= 200 && Number.isInteger(s) && s > 0 && s <= DARAB_MAX_MELYSEG) ki.osztodasok[k] = s;
  }
  for (const [g, m] of Object.entries(j.megujitasok ?? {})) {
    if (/^[A-Za-z0-9_-]{43}$/.test(g) && m && typeof m === 'object' && Number.isInteger(m.ido) && typeof m.szerzo === 'string'
      && typeof m.alairas === 'string') ki.megujitasok[g] = { szerzo: m.szerzo, ido: m.ido, alairas: m.alairas };
  }
  return ki;
}

/** Egy jegyzék-szakasz vágása a korlátra (a legrégebbi/legkisebb esik ki). */
function vagas(obj, korlat, kulcs = (x) => x) {
  const lista = Object.entries(obj);
  if (lista.length <= korlat) return obj;
  return Object.fromEntries(lista.sort((a, b) => kulcs(b[1]) - kulcs(a[1])).slice(0, korlat));
}

// ===================================
// AZ OSZTÓDÁS
// ===================================

/** Az osztódás kulcsa a jegyzékben: a fiók, a mélység és a gondolat darabja azon a mélységen. */
export function osztodasKulcsa(k, s, g) {
  return k + '#' + s + ':' + fiokDarabja(g, s).toString(16);
}

/**
 * Hová kerül egy bejegyzés a kimondott osztódások szerint: a mélység (`s`), és a helye.
 * @param {{k: string, s: number, g: string}} b
 * @param {Object} osztodasok - a jegyzék `osztodasok`-a
 * @returns {{s: number, hely: bigint}}
 */
export function felajanlasHelye(b, osztodasok = {}) {
  let s = Number.isInteger(b.s) ? b.s : 0;
  for (let i = 0; i <= DARAB_MAX_MELYSEG; i++) {
    const tovabb = osztodasok[osztodasKulcsa(b.k, s, b.g)];
    if (!Number.isInteger(tovabb) || tovabb <= s) break;
    s = Math.min(tovabb, DARAB_MAX_MELYSEG);
  }
  return { s, hely: bejegyzesHelye(b.k, b.g, s) };
}

/**
 * ⭐ Egy tartó válaszának osztódásai a jegyzékbe: a felajánlott bejegyzés (k, s, g) helyén a fiók s'-re oszlik.
 * @param {Object} jegyzek
 * @param {Array<{k: string, s: number}>} osztodott - a tartó válasza (`{ k, s: s' }` — a régi s-t a felajánlott bejegyzés adja)
 * @param {Array<Object>} felajanlott - a felajánlott bejegyzések (a mostani `s`-ükkel)
 */
export function osztodasokFeljegyzese(jegyzek, osztodott, felajanlott) {
  const ki = felajanlasJegyzekAlakja(jegyzek);
  for (const o of Array.isArray(osztodott) ? osztodott : []) {
    if (!o || typeof o.k !== 'string' || !Number.isInteger(o.s) || o.s <= 0 || o.s > DARAB_MAX_MELYSEG) continue;
    for (const b of felajanlott) {
      if (b.k !== o.k || !(o.s > b.s)) continue;
      ki.osztodasok[osztodasKulcsa(b.k, b.s, b.g)] = o.s;
    }
  }
  ki.osztodasok = vagas(ki.osztodasok, OSZTODAS_KORLAT);
  return ki;
}

// ===================================
// A RÉGIÓK
// ===================================

/**
 * ⭐ A bejegyzések régiónként (a felajánlás címzettjei): a kimondott osztódások szerinti mélységgel (`s` — a bejegyzés így új
 * azonosítót kap; a megújítás a fiókot és az osztódást nem fedi, tehát érvényes marad), és a hely régiója `melyseg`-en.
 * @param {Array<Object>} bejegyzesek
 * @param {number} melyseg - a régió mélysége (a felajánló becslése — D110-zel)
 * @param {Object} [osztodasok]
 * @returns {Map<string, {melyseg: number, darab: bigint, bejegyzesek: Array<Object>}>} régió-kulcs → csoport
 */
export function regioCsoportok(bejegyzesek, melyseg, osztodasok = {}) {
  const ki = new Map();
  for (const b of bejegyzesek) {
    const { s, hely } = felajanlasHelye(b, osztodasok);
    const darab = lenyomatDarabja(hely, melyseg);
    const kulcs = keresoRegioKulcsa(melyseg, darab);
    if (!ki.has(kulcs)) ki.set(kulcs, { melyseg, darab, bejegyzesek: [] });
    ki.get(kulcs).bejegyzesek.push(s === b.s ? b : { ...b, s });
  }
  return ki;
}

/** Egy régióba esik-e a bejegyzés helye (a kiszolgáló szűrője). */
export function regiobaEsoBejegyzes(b, regiok) {
  const h = bejegyzesHelye(b.k, b.g, b.s);
  return regiok.some((r) => regiobaEsik(h, r.melyseg, r.darab));
}

/** A még fel nem ajánlottak (az azonosítójuk nincs a jegyzékben). */
export function felajanlandok(bejegyzesek, jegyzek) {
  const a = felajanlasJegyzekAlakja(jegyzek).ajanlott;
  return bejegyzesek.filter((b) => !(bejegyzesAzonositoja(b) in a));
}

/** A felajánlott (és a tartó által felvett vagy már ismert) bejegyzések feljegyzése. */
export function felajanlottakFeljegyzese(jegyzek, bejegyzesek, most = Date.now()) {
  const ki = felajanlasJegyzekAlakja(jegyzek);
  for (const b of bejegyzesek) ki.ajanlott[bejegyzesAzonositoja(b)] = most;
  ki.ajanlott = vagas(ki.ajanlott, AJANLOTT_KORLAT);
  return ki;
}

// ===================================
// A MEGÚJÍTÁS ÚJRAHASZNOSÍTÁSA
// ===================================

/**
 * ⭐ A gondolat utolsó megújítása használható-e még: érvényes a MAI csomagra (ugyanazok az események — a cím vagy a
 * tulajdonosok változásakor nem), és a soros-rend szerint még nem esedékes az újabb. Ha nem, a hívó új megújítást ír alá.
 * @param {{koino: string, g: string, esemenyek: Array<Object>, szerzo: string, regi: Object|null, most?: number}} b
 * @returns {Object|null} a régi megújítás, ha használható
 */
export function megujitasUjrahasznalhato({ koino, g, esemenyek, szerzo, regi, most = Date.now() }) {
  if (!regi) return null;
  if (!megujitasEllenorzese(regi, { koino, g, esemenyek, most }).rendben) return null;
  const tulajdonosok = csomagTulajdonosai(esemenyek, g);
  if (megujitaniKell({ g, tulajdonosok, szerzo, utolso: regi.ido, most })) return null;
  return regi;
}

/** A gondolat megújításának feljegyzése a jegyzékben. */
export function megujitasFeljegyzese(jegyzek, g, m) {
  const ki = felajanlasJegyzekAlakja(jegyzek);
  if (m) ki.megujitasok[g] = { szerzo: m.szerzo, ido: m.ido, alairas: m.alairas };
  ki.megujitasok = vagas(ki.megujitasok, MEGUJITAS_JEGYZEK_KORLAT, (x) => x.ido);
  return ki;
}
