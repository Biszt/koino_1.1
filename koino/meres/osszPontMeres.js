// koino/meres/osszPontMeres.js

// Felelősség: A 62. MÉRÉS — AZ ÖSSZ-PONT BIZONYÍTÉKA (D92/5): mekkora egy szúrópróba, egy fejléc-válasz, milyen
// eséllyel bukik le a felfújt össz-pont, és mennyi munka a tartónak.
//
// A modell (D92/5): az X entitás tartója egy állapot-fát épít X RÉSZFÁJÁRÓL — levelenként egy szerző saját pontja
// ('p:' + szerző → az aláírt pont-esemény azonosítója) és egy gyerek bemondott össz-pontja ('g:' + gyerek); a gyökér
// összege az össz-pont. A kérdező a gyökér bemondása UTÁN k véletlen egységet választ, és mindegyikhez elkéri a levél
// bizonyítékát (`allapotSulyozottKeresese`), egy szerzői levélhez az aláírt pont-eseményt is (53. mérés: 1,15–1,86
// KB). Gyerek-levélnél a bemondás a gyerek tartóinál ellenőrizhető, amikor a nézet oda lép.
//
// ⚠️ NEM ÖNPRÓBA (számokat ad).  node koino/meres/osszPontMeres.js

import {
  ujAllapotFa, allapotBeallitas, allapotGyokere, allapotSulyozottKeresese, allapotSulyozottEllenorzese
} from '../js/esemeny/osszegzoFa.js';

const kiir = (s) => process.stdout.write(s + '\n');
const bajt = (x) => Buffer.byteLength(JSON.stringify(x), 'utf8');
const kb = (b) => (b / 1024).toFixed(2).replace('.', ',') + ' KB';
const AZ = (s) => (s + 'A'.repeat(43)).slice(0, 43);
const PONT_ESEMENY = 1370;      // 53. mérés: a pont-esemény a bizonyítékkal, 100 entitásos kiosztásnál
const GONDOLAT_ESEMENY = 802;   // 53. mérés: a létrehozó esemény (a fejléc magja)

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

/** X részfájának fája: n szerző (1..100 pont) és c gyerek (bemondott össz-pont). */
async function reszfaFa(n, c, v) {
  const fa = ujAllapotFa('osszpont', 1);
  const t0 = performance.now();
  for (let i = 0; i < n; i++) await allapotBeallitas(fa, 'p:' + AZ('szerzo' + i), AZ('esemeny' + i), [1 + Math.floor(v() * 100)]);
  for (let i = 0; i < c; i++) await allapotBeallitas(fa, 'g:' + AZ('gyerek' + i), null, [1 + Math.floor(v() * 1000)]);
  return { fa, epites: performance.now() - t0 };
}

kiir('62. MÉRÉS — AZ ÖSSZ-PONT BIZONYÍTÉKA (D92/5)\n');

// ===== ① EGY MINTA ÉS EGY FEJLÉC-VÁLASZ MÉRETE =====
kiir('① A minta (a levél bizonyítéka) és a fejléc-válasz, n szerző + 10 gyerek:');
kiir('  n szerző │ építés  │ minta: bizonyíték │ + pont-esemény │ fejléc k=0 │ k=4      │ k=8      │ k=16');
for (const n of [1, 10, 100, 1000, 10000]) {
  const v = veletlenGyar(62 + n);
  const { fa, epites } = await reszfaFa(n, 10, v);
  const gyoker = await allapotGyokere(fa);
  let bizOssz = 0, szerzoi = 0;
  const MINTA = 200;
  for (let k = 0; k < MINTA; k++) {
    const r = Math.floor(v() * gyoker.o[0]);
    const m = await allapotSulyozottKeresese(fa, r);
    bizOssz += bajt({ r, kulcs: m.kulcs, bizonyitek: m.bizonyitek });
    if (m.kulcs.startsWith('p:')) szerzoi++;
  }
  const biz = bizOssz / MINTA;
  const minta = biz + (szerzoi / MINTA) * PONT_ESEMENY;
  const fejlec = GONDOLAT_ESEMENY + bajt({ gyoker });
  kiir('  ' + String(n).padEnd(8) + ' │ ' + (epites.toFixed(0) + ' ms').padStart(7) + ' │ ' + (biz.toFixed(0) + ' B').padStart(17)
    + ' │ ' + (minta.toFixed(0) + ' B').padStart(14) + ' │ ' + kb(fejlec).padStart(10) + ' │ '
    + [4, 8, 16].map((k) => kb(fejlec + k * minta).padStart(8)).join(' │ '));
}

// ===== ② A LEBUKÁS ESÉLYE =====
kiir('\n② A felfújt össz-pont lebukása — a többlet f aránya hamis levelekben, k minta (elméleti 1 − (1 − f)^k | mérve):');
{
  const v = veletlenGyar(620);
  const { fa } = await reszfaFa(200, 10, v);
  const valodi = (await allapotGyokere(fa)).o[0];
  for (const f of [0.05, 0.1, 0.3, 0.5]) {
    // A csaló úgy fúj fel, hogy a hamis rész a BEMONDOTT össz-pont f-ed része legyen: hamis = f/(1−f) · valódi.
    const csalo = ujAllapotFa('osszpont', 1);
    const { fa: alap } = await reszfaFa(200, 10, veletlenGyar(620));
    Object.assign(csalo, alap);
    const hamis = Math.round(valodi * f / (1 - f));
    for (let i = 0, ossz = 0; ossz < hamis; i++) {
      const p = Math.min(50, hamis - ossz);
      await allapotBeallitas(csalo, 'p:' + AZ('hamis' + i), AZ('nincs' + i), [p]);
      ossz += p;
    }
    const gyoker = await allapotGyokere(csalo);
    const sor = [];
    for (const k of [4, 8, 16]) {
      let lebukott = 0;
      const PROBA = 400;
      for (let p = 0; p < PROBA; p++) {
        for (let j = 0; j < k; j++) {
          const r = Math.floor(v() * gyoker.o[0]);
          const m = await allapotSulyozottKeresese(csalo, r);
          if (m.kulcs.includes('hamis')) { lebukott++; break; }
        }
      }
      sor.push('k=' + k + ': ' + (100 * (1 - (1 - f) ** k)).toFixed(0) + '% | ' + (100 * lebukott / PROBA).toFixed(0) + '%');
    }
    kiir('  f = ' + String(f).padEnd(4) + '  ' + sor.join('   '));
  }
  void fa;
}

// ===== ③ A TARTÓ TERHE =====
kiir('\n③ A tartó terhe: a részfa-fa egy változása (egy szerző új pontja vagy egy gyerek új össz-pontja):');
for (const n of [100, 1000, 10000]) {
  const v = veletlenGyar(6200 + n);
  const { fa } = await reszfaFa(n, 100, v);
  const t0 = performance.now();
  for (let i = 0; i < 200; i++) await allapotBeallitas(fa, 'p:' + AZ('szerzo' + Math.floor(v() * n)), AZ('uj' + i), [1 + Math.floor(v() * 100)]);
  kiir('  n = ' + String(n).padEnd(6) + ' egy változás ' + ((performance.now() - t0) / 200).toFixed(2) + ' ms (logaritmikus)');
}

// ===== ④ AZ ELLENŐRZÉS IDEJE =====
{
  const v = veletlenGyar(99);
  const { fa } = await reszfaFa(1000, 10, v);
  const gyoker = await allapotGyokere(fa);
  const t0 = performance.now();
  for (let i = 0; i < 200; i++) {
    const r = Math.floor(v() * gyoker.o[0]);
    const m = await allapotSulyozottKeresese(fa, r);
    await allapotSulyozottEllenorzese('osszpont', 1, gyoker, m.kulcs, m.bizonyitek, r);
  }
  kiir('\n④ Egy minta ellenőrzése (1000 szerző): ' + ((performance.now() - t0) / 200).toFixed(2)
    + ' ms (a keresés + az ellenőrzés; az aláírás-ellenőrzés nélkül)');
}
