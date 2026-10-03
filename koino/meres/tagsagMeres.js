// koino/meres/tagsagMeres.js

// Felelősség: A 63. MÉRÉS — A TAGSÁGI LÁNC A SZELETELT VILÁGBAN (az E pillér átvizsgálása): milyen mély a meghívási
// lánc, mekkora egy tagsági bizonyíték (a tag belépése és meghívása, ősönként, az alapítóig), és mennyi munkát spórol
// a gyorsítótár (a már ellenőrzött tagok ősei közösek).
//
// A modell: a koinó meghívással nő (D56: egy meghívó elég). Három növekedési mód:
//   · 'egyenletes'  — az új tagot egy véletlen meglévő tag hívja be (véletlen rekurzív fa);
//   · 'aktiv'       — a hívók népszerűsége a meghívottjaik számával nő (néhány nagy meghívó — „preferenciális”);
//   · 'friss'       — a legutóbb belépettek hívnak (lánc-szerű, a legmélyebb eset: családról családra).
// Egy lépés a bizonyítékban: a tag `Belepes`-e és a `Meghivas` (a meghívó aláírásával) — valódi aláírt eseményekből
// mérve (a lánc-gyökérrel: +~155 B, 53. mérés).
//
// ⚠️ NEM ÖNPRÓBA (számokat ad).  node koino/meres/tagsagMeres.js

import { ujEember } from './probaFuttato.js';

const kiir = (s) => process.stdout.write(s + '\n');
// A modulok naplója (KEZDÉS / VÉGE) itt csak zaj volna.
console.log = () => {};
const bajt = (x) => Buffer.byteLength(JSON.stringify(x), 'utf8');
const LANC_GYOKER_TOBBLET = 155;   // 53. mérés

function veletlenGyar(mag) {
  let t = mag >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** Egy meghívási fa: szulo[i] = ki hívta be az i-ediket (0 az alapító). */
function fa(N, mod, v) {
  const szulo = new Int32Array(N);
  const melyseg = new Int32Array(N);
  szulo[0] = -1;
  const sulyLista = [0];             // az 'aktiv' módhoz: minden meghívás után a hívó még egyszer bekerül
  for (let i = 1; i < N; i++) {
    let p;
    if (mod === 'egyenletes') p = Math.floor(v() * i);
    else if (mod === 'aktiv') p = sulyLista[Math.floor(v() * sulyLista.length)];
    else p = Math.max(0, i - 1 - Math.floor(v() * Math.min(i, 20)));   // a 20 legutóbbi közül
    szulo[i] = p;
    melyseg[i] = melyseg[p] + 1;
    if (mod === 'aktiv') { sulyLista.push(p); sulyLista.push(i); }
  }
  return { szulo, melyseg };
}

function statisztika(melyseg) {
  const t = Array.from(melyseg).sort((a, b) => a - b);
  const atlag = t.reduce((o, x) => o + x, 0) / t.length;
  return { atlag, p95: t[Math.floor(t.length * 0.95)], max: t[t.length - 1] };
}

/** A gyorsítótár: M véletlen tag ellenőrzése — hány KÜLÖNBÖZŐ lépést kell valóban megnézni? */
function gyorsitotar(szulo, M, v) {
  const ellenorzott = new Set([0]);
  let lepes = 0;
  const N = szulo.length;
  for (let k = 0; k < M; k++) {
    let x = Math.floor(v() * N);
    while (!ellenorzott.has(x)) { ellenorzott.add(x); lepes++; x = szulo[x]; }
  }
  return lepes;
}

// ===== A VALÓDI ESEMÉNYEK MÉRETE =====
const alapito = await ujEember('meres');
const tag = await ujEember('meres');
const koino = await alapito.tesz('KoinoLetrehozas', { nev: 'Mérés', leiras: null, alapitok: [], zart: true });
const belepes = await tag.tesz('Belepes', {});
const meghivas = await alapito.tesz('Meghivas', { kit: tag.szerzo, sajatBelepes: koino.azonosito }, undefined, { entitas: belepes.azonosito });
const lepesBajt = bajt(belepes) + bajt(meghivas) + 2 * LANC_GYOKER_TOBBLET;

kiir('63. MÉRÉS — A TAGSÁGI LÁNC (a meghívási fa mélysége és a bizonyíték mérete)\n');
kiir('Egy lépés a bizonyítékban: Belepes ' + (bajt(belepes) + LANC_GYOKER_TOBBLET) + ' B + Meghivas '
  + (bajt(meghivas) + LANC_GYOKER_TOBBLET) + ' B = ' + lepesBajt + ' B (a lánc-gyökérrel)\n');

kiir('① A LÁNC MÉLYSÉGE (átlag / 95% / legmélyebb) és a bizonyíték mérete (átlag / 95%):');
kiir('  N          │ egyenletes              │ aktív (preferenciális)   │ friss (lánc-szerű)');
for (const N of [1000, 10000, 100000, 1000000]) {
  const sor = [];
  for (const mod of ['egyenletes', 'aktiv', 'friss']) {
    const v = veletlenGyar(63 + N);
    const { melyseg } = fa(N, mod, v);
    const s = statisztika(melyseg);
    sor.push((s.atlag.toFixed(1) + ' / ' + s.p95 + ' / ' + s.max).padEnd(13) + ' '
      + ((s.atlag * lepesBajt / 1024).toFixed(0) + '/' + (s.p95 * lepesBajt / 1024).toFixed(0) + ' KB').padEnd(10));
  }
  kiir('  ' + String(N).padEnd(10) + ' │ ' + sor.join(' │ '));
}

kiir('\n② A GYORSÍTÓTÁR: M véletlen tag ellenőrzése — hány lépést kell valóban megnézni (és tagonként átlag):');
kiir('  N = 1 000 000 │ M = 10            │ M = 100           │ M = 1000          │ M = 10000');
for (const mod of ['egyenletes', 'aktiv', 'friss']) {
  const v = veletlenGyar(630);
  const { szulo } = fa(1000000, mod, v);
  const sor = [];
  for (const M of [10, 100, 1000, 10000]) {
    const l = gyorsitotar(szulo, M, veletlenGyar(631 + M));
    sor.push((l + ' (' + (l / M).toFixed(1) + '/tag)').padEnd(17));
  }
  kiir('  ' + mod.padEnd(13) + ' │ ' + sor.join(' │ '));
}
