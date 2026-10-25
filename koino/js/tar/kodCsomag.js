// koino/js/tar/kodCsomag.js

// Felelősség: ⭐⭐ D119 (①a) — A KÓD-CSOMAG: a futó program teljes kódja tartalom-címzetten — a koino-verzió kártya „Kód”
// fülének és a gyermek születésének (`program`) alapja (Csaba: „az egyik fülben ott kéne hogy legyen a teljes kód, hogy
// mindenki le tudja ellenőrizni”).
//
// ===== A JEGYZÉK =====
//
// `{ fajta: 'koino-kod-1', fajlok: [[út, lenyomat, bájt], …] }` — az utak a program gyökerétől (a `koino/` mappától, `/`
// elválasztóval), rendezve, ismétlés nélkül. A jegyzék egy DARAB (a kanonikus alakja — mint a gondolat szövege, D72), és a
// lenyomata a KÓD NEVE: két készülék ugyanarra a verzióra ugyanazt a nevet számolja. A fájlok a fájl-tárba kerülnek (a nevük
// a lenyomatuk — 5.7); a jegyzék és a fájlok a koino-verzió TÖRZSE (a vállalóktól jön, D84/1).
//
// ⛔ SORVÉG NÉLKÜL (a 6. szabály mércéje — ahogy a git tárolja és a telefon kicsekkolja): a Windows-munkakönyvtár a git
// `autocrlf`-je miatt CRLF-et tarthat, és enélkül ugyanaz a verzió két készüléken két nevet kapna. A szöveges fájlok
// `\r\n`-je `\n` lesz; a többi bájtra pontosan marad.
//
// ⭐ MELYIK FÁJL A PROGRAM: amit a git követ (a telepítés útja egy git-munkakönyvtár — `git clone`), mert a mérések kimenete
// és a helyi adat nem a program része; ha nincs git, a mappa bejárva, az adat-mappák (`koino-adat`, és ami `kulcs.json`-t
// tart) és a nem kódnak való fájlok nélkül.
//
// 84. mérés: 331 fájl / 6,4 MB (egyben tömörítve 1,9 MB), a jegyzék 28,5 KB; egy új verzió ~1–2,5 MB.
//
// Hálózatot nem importál. Használják: koino.js (a `koinoverzio` parancs, a „Kód” fül, a verzió jelzése), a próbák.

import { execFile } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { kanonikusBajtok, bajtLenyomat } from '../esemeny/kanonikusAlak.js';
import { szovegHivatkozasE } from '../esemeny/szovegDarab.js';
import { FAJL_KORLAT } from './fajlTar.js';

const futtat = promisify(execFile);

/** A jegyzék alakjának jele (ha egyszer más lesz, a régit is felismerjük). */
export const KOD_FAJTA = 'koino-kod-1';
/** Egy jegyzékben legfeljebb ennyi fájl (a mai program 331 — bőven tartalékkal; a jegyzék így ≤ ~0,4 MB). */
export const KOD_FAJL_KORLAT = 4096;
/** Egy út legfeljebb ennyi jel. */
const UT_KORLAT = 512;

// A szöveges fájlok (a sorvég ezekben normálódik) — a többi bájtra pontosan marad.
const SZOVEGES = /\.(m?js|cjs|md|css|html?|json|txt|svg|sh|ps1|ya?ml)$/i;
// A bejárásnál (git nélkül) a program fájljai.
const KODNAK_VALO = /\.(m?js|cjs|md|css|html?|json|txt|svg|png|jpe?g|gif|ico|webp|woff2?)$/i;
// A bejárásnál kihagyott mappák (az adat, a git, a függőségek — utóbbi nincs is: 0 npm).
const KIHAGYOTT_MAPPAK = new Set(['.git', 'node_modules', 'koino-adat']);

const LENYOMAT_MINTA = /^[A-Za-z0-9_-]{43}$/;

/** A fájl bájtjai sorvég nélkül, ha szöveges (a `\r\n` → `\n`). */
function normalizalt(ut, nyers) {
  if (!SZOVEGES.test(ut)) return new Uint8Array(nyers);
  return new Uint8Array(Buffer.from(nyers.toString('latin1').replace(/\r\n/g, '\n'), 'latin1'));
}

/** Egy út elfogadható-e a jegyzékben (relatív, `/` elválasztó, `..` és üres szakasz nélkül). */
function ervenyesUt(ut) {
  return typeof ut === 'string' && ut.length >= 1 && ut.length <= UT_KORLAT && !ut.startsWith('/') && !ut.includes('\\')
    && !ut.includes('\0') && ut.split('/').every((sz) => sz !== '' && sz !== '.' && sz !== '..');
}

/** Rendezés: ugyanaz a sorrend minden készüléken (a JS szöveg-összevetése — kódegységenként). */
const utSzerint = (a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);

/**
 * A program fájljai (az utak a gyökértől, `/` elválasztóval): a git által követettek, ha a gyökér egy git-munkakönyvtárban
 * van; különben a mappa bejárva.
 * @param {string} gyoker - a program mappája (ahol a `koino.js` van)
 * @returns {Promise<Array<string>>}
 */
export async function programFajljai(gyoker) {
  try {
    const { stdout } = await futtat('git', ['ls-files', '-z'], { cwd: gyoker, maxBuffer: 16 * 1024 * 1024, windowsHide: true });
    const utak = stdout.split('\0').filter(Boolean);
    if (utak.length) return utak;
  } catch { /* nincs git, vagy nem munkakönyvtár — bejárjuk */ }
  const utak = [];
  const jar = async (mappa, elotag) => {
    const elemek = await readdir(mappa, { withFileTypes: true });
    if (elotag && elemek.some((e) => e.isFile() && e.name === 'kulcs.json')) return;   // egy adat-mappa, nem kód
    for (const e of elemek) {
      if (e.isDirectory()) {
        if (!KIHAGYOTT_MAPPAK.has(e.name)) await jar(join(mappa, e.name), elotag + e.name + '/');
      } else if (e.isFile() && KODNAK_VALO.test(e.name)) {
        utak.push(elotag + e.name);
      }
    }
  };
  await jar(gyoker, '');
  return utak;
}

/**
 * ⭐ A KÓD-CSOMAG a program mappájából: a jegyzék, a bájtjai (a darab), a hivatkozása (a kód neve) és a fájlok tartalma.
 * @param {string} gyoker
 * @returns {Promise<{jegyzek: Object, jegyzekBajtok: Uint8Array, hivatkozas: {lenyomat: string, bajt: number},
 *   tartalmak: Map<string, Uint8Array>}>}
 */
export async function kodCsomagKeszitese(gyoker) {
  const fajlok = [];
  const tartalmak = new Map();
  for (const ut of await programFajljai(gyoker)) {
    let nyers;
    try { nyers = await readFile(join(gyoker, ut)); } catch { continue; }   // a git követi, de a lemezről hiányzik
    const t = normalizalt(ut, nyers);
    if (t.length > FAJL_KORLAT) throw new Error('A program egy fájlja nagyobb a fájl-korlátnál: ' + ut + ' (' + t.length + ' bájt)');
    const l = await bajtLenyomat(t);
    fajlok.push([ut, l, t.length]);
    tartalmak.set(l, t);
  }
  fajlok.sort(utSzerint);
  if (fajlok.length > KOD_FAJL_KORLAT) throw new Error('A program túl sok fájlból áll a kód-csomaghoz: ' + fajlok.length);
  const jegyzek = { fajta: KOD_FAJTA, fajlok };
  const jegyzekBajtok = kanonikusBajtok(jegyzek);
  return { jegyzek, jegyzekBajtok, hivatkozas: { lenyomat: await bajtLenyomat(jegyzekBajtok), bajt: jegyzekBajtok.length },
    tartalmak };
}

/**
 * A kód-csomag a fájl-tárba: a fájlok és a jegyzék (a darab). Ami megvan, nem íródik újra (a név a tartalom — két verzió
 * közös fájlja egyszer).
 * @param {Object} csomag - `kodCsomagKeszitese`
 * @param {{ir: Function}} fajlTar - `fajlBlobTarolo`
 * @returns {Promise<{lenyomat: string, bajt: number}>} a kód neve (a jegyzék hivatkozása)
 */
export async function kodCsomagTarolasa(csomag, fajlTar) {
  for (const t of csomag.tartalmak.values()) await fajlTar.ir(t);
  const j = await fajlTar.ir(csomag.jegyzekBajtok);
  if (j.lenyomat !== csomag.hivatkozas.lenyomat) throw new Error('A fájl-tár más lenyomatot adott a jegyzékre.');
  return csomag.hivatkozas;
}

/**
 * Érvényes jegyzék-e (a kívülről jött — a társtól vagy a lemezről): a fajtája, a fájlok száma, az utak, a lenyomatok, a
 * méretek, és a rendezettség ismétlés nélkül (egy alak van, nem kettő — a lenyomat így egyértelmű).
 * @returns {boolean}
 */
export function kodJegyzekAlakja(x) {
  if (!x || typeof x !== 'object' || Array.isArray(x) || x.fajta !== KOD_FAJTA || !Array.isArray(x.fajlok)) return false;
  if (Object.keys(x).length !== 2 || x.fajlok.length > KOD_FAJL_KORLAT) return false;
  for (let i = 0; i < x.fajlok.length; i++) {
    const f = x.fajlok[i];
    if (!Array.isArray(f) || f.length !== 3 || !ervenyesUt(f[0]) || typeof f[1] !== 'string' || !LENYOMAT_MINTA.test(f[1])
      || !Number.isInteger(f[2]) || f[2] < 0 || f[2] > FAJL_KORLAT) return false;
    if (i > 0 && !(x.fajlok[i - 1][0] < f[0])) return false;
  }
  return true;
}

/**
 * A jegyzék a hivatkozásából (a fájl-tárból — az olvasás a lenyomatot ellenőrzi): null, ha még nincs meg (D19 — hiány,
 * nem hiba), vagy ha nem jegyzék alakú.
 * @param {{lenyomat: string, bajt: number}} hivatkozas
 * @param {Function} olvas - async (lenyomat) → Uint8Array|null
 * @returns {Promise<Object|null>}
 */
export async function kodJegyzekOlvasasa(hivatkozas, olvas) {
  if (!szovegHivatkozasE(hivatkozas)) return null;
  const bajtok = await olvas(hivatkozas.lenyomat).catch(() => null);
  if (!bajtok || bajtok.length !== hivatkozas.bajt) return null;
  let j;
  try { j = JSON.parse(new TextDecoder().decode(bajtok)); } catch { return null; }
  return kodJegyzekAlakja(j) ? j : null;
}

// A futó program kódja — folyamatonként egyszer számolva (~6,4 MB lenyomatolása; a program futás közben nem változik).
const sajatKodok = new Map();

/**
 * ⭐ A FUTÓ PROGRAM kód-csomagja (folyamatonként egyszer).
 * @param {string} gyoker
 */
export function sajatKodCsomag(gyoker) {
  if (!sajatKodok.has(gyoker)) sajatKodok.set(gyoker, kodCsomagKeszitese(gyoker));
  return sajatKodok.get(gyoker);
}
