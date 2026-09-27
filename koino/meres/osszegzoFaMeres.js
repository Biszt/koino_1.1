// koino/meres/osszegzoFaMeres.js

// Felelősség: AZ ÖSSZEGZŐ MERKLE-FA ÁRA (52. mérés, D78) — bájtban és időben, a „végtelen" próbájához.
//
// Nem önpróba: számokat ad, nem igen/nem-et. Amit kérdez:
//   · a NAPLÓ-FA (a szerző lánca): mennyi a bizonyíték (lépés, bájt), mennyi egy hozzáfűzés a
//     csúcsokból (ezt fizeti a szerző minden eseménynél), és mennyi egy bizonyíték ELŐÁLLÍTÁSA
//     (a teljes láncból — ezt fizeti, akitől kérik);
//   · az ÁLLAPOT-FA (a kiosztás, később egy entitás tulajdonosai): mély-e, mennyi egy bizonyíték és
//     egy változás ellenőrzése;
//   · a TELJES ELLENŐRZÉS (D78 pontosítás): mennyi a kiosztás teljes listája a keret határán;
//   · és mennyivel nő egy esemény a `lancGyoker`-rel.
//
// Futtatás: node koino/meres/osszegzoFaMeres.js [legnagyobb napló, alapból 100000]

import {
  levelOsszegzes, naploGyokere, naploBizonyitek, naploBizonyitekEllenorzese, ujNaplo, naploHozzafuzes,
  naploCsucsGyokere,
  ujAllapotFa, allapotBeallitas, allapotGyokere, allapotBizonyitek, allapotBizonyitekEllenorzese,
  allapotValtozasa, allapotLista
} from '../js/esemeny/osszegzoFa.js';

const console_log = console.log;
const kiir = (...s) => console_log(...s);
const bajt = (x) => Buffer.byteLength(JSON.stringify(x), 'utf8');
const ido = async (fn) => { const t = performance.now(); const r = await fn(); return [performance.now() - t, r]; };
const kb = (b) => (b / 1024).toFixed(2) + ' KB';

const legnagyobb = Number(process.argv[2]) || 100000;

kiir('\n===== 52. MÉRÉS — AZ ÖSSZEGZŐ MERKLE-FA ÁRA =====\n');

// ===== AZ ESEMÉNY =====
{
  const nelkul = bajt({ lancGyoker: null });
  const vele = bajt({ lancGyoker: 'A'.repeat(43) });
  kiir('Egy esemény a lancGyoker-rel: +' + (vele - nelkul) + ' bájt (null helyett 43 jeles gyökér)\n');
}

// ===== A NAPLÓ-FA =====
kiir('— A NAPLÓ-FA (a szerző lánca) —');
let lepesBajt = null;          // egy bizonyíték-lépés mért bájtja (a legnagyobb mért fából)
for (const n of [1000, 10000, 100000, 1000000].filter((x) => x <= legnagyobb)) {
  const levelek = [];
  for (let i = 0; i < n; i++) levelek.push(await levelOsszegzes('naplo', String(i).padStart(43, 'A')));

  // A szerző minden eseménynél: hozzáfűzés + a gyökér a csúcsokból.
  let naplo = ujNaplo('naplo');
  const [hozzaIdo] = await ido(async () => { for (const l of levelek) naplo = await naploHozzafuzes(naplo, l); });
  const [csucsGyokerIdo, gyoker] = await ido(() => naploCsucsGyokere(naplo));

  // A bizonyíték előállítása a teljes láncból (akitől kérik) és az ellenőrzése (aki kéri).
  const index = Math.floor(n * 0.37);
  const [eloallitasIdo, b] = await ido(() => naploBizonyitek('naplo', levelek, index));
  const [ellIdo, jo] = await ido(() => naploBizonyitekEllenorzese('naplo', levelek[index], b, gyoker));
  const [teljesIdo] = n <= 100000 ? await ido(() => naploGyokere('naplo', levelek)) : [NaN];
  lepesBajt = bajt(b.ut) / b.ut.length;

  kiir('  n = ' + n.toLocaleString('hu-HU') + ': bizonyíték ' + b.ut.length + ' lépés, ' + bajt(b) + ' bájt'
    + ' · ellenőrzés ' + ellIdo.toFixed(1) + ' ms (' + (jo ? 'rendben' : 'HIBA') + ')'
    + ' · csúcsok: ' + naplo.csucsok.length + ' db, ' + bajt(naplo.csucsok) + ' bájt');
  kiir('           hozzáfűzés átlag ' + (hozzaIdo / n * 1000).toFixed(0) + ' µs + gyökér a csúcsokból '
    + csucsGyokerIdo.toFixed(1) + ' ms · bizonyíték előállítása ' + eloallitasIdo.toFixed(0) + ' ms'
    + (Number.isNaN(teljesIdo) ? '' : ' · a teljes gyökér újraszámolása ' + teljesIdo.toFixed(0) + ' ms'));
}
{
  // A bizonyíték mérete logaritmikus: lépésenként egy összegzés — a MÉRT lépés-bájttal számolva.
  // ⚠️ (2026-09-27: a becslés 57 bájt volt, a mérés ~69 — ezért nem beégetett szám.)
  const lepes = lepesBajt;
  for (const n of [1e6, 1e7, 1e9]) {
    kiir('  (számolva) n = ' + n.toExponential(0) + ': ' + Math.ceil(Math.log2(n)) + ' lépés ≈ '
      + kb(Math.ceil(Math.log2(n)) * lepes));
  }
}

// ===== AZ ÁLLAPOT-FA =====
kiir('\n— AZ ÁLLAPOT-FA (a kiosztás; később egy entitás tulajdonosai) —');
for (const n of [100, 1000, 10000, 100000].filter((x) => x <= Math.max(legnagyobb, 10000))) {
  const fa = ujAllapotFa('kiosztas', 1);
  const [beIdo] = await ido(async () => { for (let i = 0; i < n; i++) await allapotBeallitas(fa, String(i).padStart(43, 'E'), null, [1 + (i % 97)]); });
  const gyoker = await allapotGyokere(fa);
  let lepesOsszeg = 0, lepesMax = 0, bajtOsszeg = 0, ellIdoOssz = 0, valtIdoOssz = 0;
  const minta = 50;
  for (let j = 0; j < minta; j++) {
    const kulcs = String(Math.floor((j * 7919) % n)).padStart(43, 'E');
    const b = await allapotBizonyitek(fa, kulcs);
    lepesOsszeg += b.testverek.length; lepesMax = Math.max(lepesMax, b.testverek.length); bajtOsszeg += bajt(b);
    const [e1] = await ido(() => allapotBizonyitekEllenorzese('kiosztas', 1, gyoker, kulcs, b));
    const [e2] = await ido(() => allapotValtozasa('kiosztas', 1, gyoker, kulcs, b, { ertek: null, osszegek: [5] }));
    ellIdoOssz += e1; valtIdoOssz += e2;
  }
  kiir('  n = ' + n.toLocaleString('hu-HU') + ': mélység átlag ' + (lepesOsszeg / minta).toFixed(1) + ' (log₂ n = '
    + Math.log2(n).toFixed(1) + ', legmélyebb a mintában ' + lepesMax + ') · bizonyíték átlag ' + Math.round(bajtOsszeg / minta)
    + ' bájt · ellenőrzés ' + (ellIdoOssz / minta).toFixed(1) + ' ms · változás ellenőrzése ' + (valtIdoOssz / minta).toFixed(1)
    + ' ms · beállítás átlag ' + (beIdo / n * 1000).toFixed(0) + ' µs');
  if (n === 10000 || n === 100 || n === 1000) {
    kiir('           a TELJES lista (a teljes ellenőrzéshez): ' + kb(bajt(allapotLista(fa))));
  }
}

kiir('\n⚠️ Az idők a laptopé; a telefon a korábbi mérések szerint ~3–5× lassabb.\n');
