// koino/meres/koltozesMeres.js

// Felelősség: ⭐ A 82. MÉRÉS — A KÖLTÖZÉS ÁRA (D118, a költözés ④, 2026-10-24).
//
// Mekkora a két esemény (a kiköltözés és a beköltözés) a tagsági lánc mélységével, mekkora a gyermek születése a létrehozó
// láncával, és mennyi a születések lánca nemzedékenként (a gyermek első cseréjének és a csatlakozónak az ára)? Egy szelet
// örökölt múltja a vonalon és a lemezen ugyanannyi, mint a szülőben volt (a múlt eseményei átírás nélkül jönnek — D118/1).
//
// Nem önpróba: számokat ad. Futtatás: node koino/meres/koltozesMeres.js

import './naplo.js';
import { ujEember } from './probaFuttato.js';
import { teljesSzabalyok } from '../js/esemeny/koinoSzabalyok.js';
import { esemenyLetrehozasa } from '../js/esemeny/esemeny.js';
import { szuloTagsagaEpitese } from '../js/allapot/koinoLanc.js';

const kiir = (s) => process.stdout.write(s + '\n');
const bajt = (e) => Buffer.byteLength(JSON.stringify(e));
const T0 = Date.UTC(2026, 0, 1);

/** Egy szülő, és benne egy `d` mélységű meghívási lánc végén a költöző (A → t1 → … → td). */
async function lancosSzulo(d) {
  const A = await ujEember('');
  const P = await A.tesz('KoinoLetrehozas', { nev: 'Szülő', leiras: null, alapitok: [], zart: true,
    szabalyok: teljesSzabalyok() }, T0);
  A.koinotValt(P.azonosito);
  const esemenyek = [P];
  let elozo = A, elozoHorgony = P.azonosito, utolso = null;
  for (let i = 0; i < d; i++) {
    const t = await ujEember(P.azonosito);
    const be = await t.tesz('Belepes', {}, T0 + 10 * i + 1);
    const m = await elozo.tesz('Meghivas', { kit: t.szerzo, sajatBelepes: elozoHorgony }, T0 + 10 * i + 2, { entitas: be.azonosito });
    esemenyek.push(be, m);
    elozo = t; elozoHorgony = be.azonosito; utolso = { ember: t, be };
  }
  return { A, P, esemenyek, koltozo: utolso };
}

kiir('A KÖLTÖZÉS ESEMÉNYEI (a tagsági lánc mélysége szerint)');
for (const d of [1, 4, 13]) {
  const s = await lancosSzulo(d);
  const bizonyitek = szuloTagsagaEpitese(s.esemenyek, s.P.azonosito, s.koltozo.be.azonosito);
  // a gyermek (A hozza létre — az alapítónak üres a lánca)
  s.A.koinotValt('');
  const K = await s.A.tesz('KoinoLetrehozas', { nev: 'Gyermek', leiras: null, alapitok: [], zart: true, szulo: s.P.azonosito,
    szuloTagsag: { horgony: s.P.azonosito, lanc: [] }, szabalyok: teljesSzabalyok() }, T0 + 1000);
  // a költöző gyermeke (ha ő hozná létre): a születés a láncával
  const t = s.koltozo.ember;
  t.koinotValt('');
  const Kt = await t.tesz('KoinoLetrehozas', { nev: 'Gyermek', leiras: null, alapitok: [], zart: true, szulo: s.P.azonosito,
    szuloTagsag: bizonyitek, szabalyok: teljesSzabalyok() }, T0 + 1000);
  const kik = await esemenyLetrehozasa({ koino: s.P.azonosito, tipus: 'Kikoltozes', adat: { gyermek: K.azonosito },
    elozo: s.koltozo.be.azonosito, sorszam: s.koltozo.be.sorszam + 1, ido: T0 + 2000, entitas: s.koltozo.be.azonosito,
    entitasSorszam: 2, latott: [] }, t.kulcspar);
  const bek = await esemenyLetrehozasa({ koino: K.azonosito, tipus: 'Bekoltozes', adat: { szulo: s.P.azonosito,
    kikoltozes: kik.azonosito, lanc: { sorszam: s.koltozo.be.sorszam, azonosito: s.koltozo.be.azonosito },
    szuloTagsag: bizonyitek }, elozo: s.koltozo.be.azonosito, sorszam: s.koltozo.be.sorszam + 1, ido: T0 + 2000,
    entitas: null, entitasSorszam: 1, latott: [] }, t.kulcspar);
  kiir('  ' + String(d).padStart(2) + ' lépés: kiköltözés ' + bajt(kik) + ' B · beköltözés ' + bajt(bek) + ' B (a bizonyíték '
    + bizonyitek.lanc.length + ' esemény) · a gyermek születése: az alapítótól ' + bajt(K) + ' B, a költözőtől ' + bajt(Kt) + ' B');
}

kiir('');
kiir('A SZÜLETÉSEK LÁNCA (a csatlakozó első cseréje — a születés-szelet; a létrehozó mindig az előző nemzedék alapítója)');
const A = await ujEember('');
let elozo = null;
const lanc = [];
for (let g = 1; g <= 16; g++) {
  A.koinotValt('');
  const sz = await A.tesz('KoinoLetrehozas', { nev: 'Nemzedék ' + g, leiras: null, alapitok: [], zart: true,
    ...(elozo ? { szulo: elozo.azonosito, szuloTagsag: { horgony: elozo.azonosito, lanc: [] } } : {}),
    szabalyok: teljesSzabalyok() }, T0 + g * 1000);
  lanc.push(sz);
  elozo = sz;
  if ([1, 2, 4, 8, 16].includes(g)) {
    kiir('  ' + String(g).padStart(2) + ' nemzedék: ' + lanc.reduce((x, e) => x + bajt(e), 0) + ' B (egy születés ~' + bajt(sz) + ' B)');
  }
}
