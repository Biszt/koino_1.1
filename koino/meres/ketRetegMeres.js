// koino/meres/ketRetegMeres.js

// Felelősség: ⭐⭐ A 83. MÉRÉS — A KÉT RÉTEG ÁRA (D118, a költözés ③, 2026-10-24).
//
// Mennyibe kerül egy szülőre épülő koinó képe (`koinoKepe`) a szülő nélkülihez képest? A múlt rétege egy állapot-számítás a
// múlt eseményein; a múlt nem változik, csak bővül — ezért gyorsítótárban van. A mérés:
//   · a szülő nélküli kép (az alapvonal) N eseménnyel;
//   · a gyermek képe, ha a múlt N esemény és a jelen kevés — először (a múlt kiszámolódik) és másodszor (a gyorsítótárból);
//   · nemzedékenként (1–4 ős, mindegyikben N/nemzedék esemény): nő-e a költség a nemzedékek számával a múlt eseményeinél
//     jobban.
//
// Nem önpróba: számokat ad. Futtatás: node koino/meres/ketRetegMeres.js [N ...]   (alapból 1000 5000 20000)

import './naplo.js';
import { ujEember } from './probaFuttato.js';
import { koinoKepe } from '../js/allapot/ketReteg.js';
import { teljesSzabalyok } from '../js/esemeny/koinoSzabalyok.js';

const kiir = (s) => process.stdout.write(s + '\n');
const NAP = 86400 * 1000;
const T0 = Date.UTC(2026, 0, 1);

/** Egy nemzedék: a koinó születése, 4 tag, `n` gondolat ponttal, és minden 20. gondolaton egy lezárt javaslat. */
async function nemzedek(alapito, szulo, n, kezdet) {
  alapito.koinotValt('');
  const sz = await alapito.tesz('KoinoLetrehozas', { nev: 'Mérés', leiras: null, alapitok: [], zart: true,
    szabalyok: teljesSzabalyok(), ...(szulo ? { szulo: szulo.azonosito, szuloTagsag: { horgony: szulo.azonosito, lanc: [] } } : {}) },
  kezdet);
  alapito.koinotValt(sz.azonosito);
  const lista = [sz];
  const tagok = [alapito];
  for (let i = 0; i < 3; i++) {
    const t = await ujEember(sz.azonosito);
    const be = await t.tesz('Belepes', {}, kezdet + 10 + i);
    lista.push(be, await alapito.tesz('Meghivas', { kit: t.szerzo, sajatBelepes: sz.azonosito }, kezdet + 20 + i,
      { entitas: be.azonosito }));
    tagok.push(t);
  }
  let ido = kezdet + 100;
  for (let i = 0; lista.length < n; i++) {
    const ki = tagok[i % tagok.length];
    const g = await ki.tesz('GondolatLetrehozas', { cim: 'Gondolat ' + i, meret: 10 }, ido++);
    lista.push(g, await ki.tesz('TudatpontRendezes', { entitas: g.azonosito, pont: 1 }, ido++));
    if (i % 20 === 0) {
      const j = await ki.tesz('Javaslat', { fajta: 'szerkesztesi', erintett: g.azonosito, muvelet: 'Modositas',
        valtozas: { cim: 'Gondolat ' + i + '*' }, indoklas: 'mérés' }, ido++);
      lista.push(j, ...await ki.szavaz(j, { szavazat: 'Tamogat' }, ido++));
    }
  }
  return { sz, lista };
}

async function ido(fn) {
  const t = process.hrtime.bigint();
  const r = await fn();
  return { ms: Number(process.hrtime.bigint() - t) / 1e6, r };
}

const meretek = process.argv.slice(2).map(Number).filter((x) => x > 0);
for (const N of (meretek.length ? meretek : [1000, 5000, 20000])) {
  // ----- az alapvonal: szülő nélkül -----
  const A = await ujEember('');
  const P = await nemzedek(A, null, N, T0);
  const most = T0 + 60 * NAP;
  const alap = await ido(() => koinoKepe(P.lista, { koino: P.sz.azonosito, most }));
  // ----- a gyermek: a múlt N, a jelen ~1% -----
  const K = await nemzedek(A, P.sz, Math.max(20, Math.round(N / 100)), T0 + 30 * NAP);
  const bemenet = [...P.lista, ...K.lista];
  const elso = await ido(() => koinoKepe(bemenet, { koino: K.sz.azonosito, most }));
  const masodik = await ido(() => koinoKepe(bemenet, { koino: K.sz.azonosito, most }));
  kiir('N = ' + N + ' esemény a múltban (+ ' + K.lista.length + ' a jelenben)');
  kiir('  szülő nélküli kép (N eseményből):       ' + alap.ms.toFixed(0) + ' ms  (' + alap.r.allapot.entitasok.size + ' entitás)');
  kiir('  a gyermek képe először (a múlttal):     ' + elso.ms.toFixed(0) + ' ms  (' + elso.r.allapot.entitasok.size + ' entitás, '
    + [...elso.r.javaslatok.values()].filter((j) => j.mult).length + ' rögzített döntés)');
  kiir('  a gyermek képe másodszor (gyorsítótár): ' + masodik.ms.toFixed(0) + ' ms');

  // ----- nemzedékenként: ugyanannyi múlt-esemény, 1–4 ősre osztva -----
  for (const g of [1, 2, 4]) {
    const B = await ujEember('');
    let elozo = null;
    const osszes = [];
    for (let i = 0; i < g; i++) {
      const n = await nemzedek(B, elozo, Math.round(N / g), T0 + i * 10 * NAP);
      osszes.push(...n.lista);
      elozo = n.sz;
    }
    const gyermek = await nemzedek(B, elozo, 20, T0 + g * 10 * NAP);
    const be = [...osszes, ...gyermek.lista];
    const m = await ido(() => koinoKepe(be, { koino: gyermek.sz.azonosito, most: T0 + (g + 5) * 10 * NAP }));
    kiir('  ' + g + ' ős, összesen ~' + N + ' múlt-esemény: ' + m.ms.toFixed(0) + ' ms (először)');
  }
  kiir('');
}
