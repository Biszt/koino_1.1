// koino/meres/osszegzesMeres.js

// Felelősség: A 67. MÉRÉS — A LEZÁRÁSI ÖSSZEGZÉS ÁRA (D95/1, a B1 műszaki terve 2.): mibe kerül egy nagy szeletű érintett
// döntését az összegző tartónak ellenőrizhetően átadni — a fejléc (a végső számok, a küszöbök, a lezárás ideje, három fa
// gyökere) és a minták (k minta mindhárom fából) —, a résztvevők számával?
//
// A három fa: (1) a beszámított SZAVAZATOK állapot-fája ('v:' + szerző → a szavazat; az összegek: támogat · ellenez ·
// tartózkodik), (2) a lezáráskori AKTÍV TULAJDONOSOK állapot-fája ('p:' + szerző → a pont-esemény; az összeg: 1), (3) az
// ÉRTÉK JAVASLATOK érték szerint RENDEZETT naplója (a medián a középső index — a helyét a napló-bizonyíték adja). A
// fák valódiak (`osszegzoFa.js`); az események mérete a korábbi mérésekből (53–54.: a pont-esemény a bizonyítékával
// ~1,37 KB, a szavazat a két bizonyítékkal ~2,14 KB; az érték javaslat ~0,8 KB), a tagsági csomag a 63.-ból.
//
// (A szelet MOSTANI összegzésének mintáit a 62. mérés méri — ugyanaz a fa-alak: k = 8 mintával 5–21 KB.)
//
// ⚠️ NEM ÖNPRÓBA (számokat ad).   node koino/meres/osszegzesMeres.js [k]

import { createHash } from 'node:crypto';
import {
  ujAllapotFa, allapotBeallitas, allapotGyokere, allapotBizonyitek, levelOsszegzes, naploGyokere, naploBizonyitek
} from '../js/esemeny/osszegzoFa.js';

const kiir = (s) => process.stdout.write(s + '\n');
console.log = () => {};
const K = Number(process.argv[2] ?? 8);
const bajt = (x) => Buffer.byteLength(JSON.stringify(x), 'utf8');
const az = (i) => createHash('sha256').update('meres|' + i).digest('base64url').slice(0, 43);

const SZAVAZAT_B = 2139, PONT_B = 1370, ERTEK_B = 800;
const csomagKb = (n) => (n <= 1000 ? 9 : n <= 10000 ? 12 : n <= 100000 ? 14 : 16);       // 63. mérés

async function allapotFaMeres(n, hossz, osszeg) {
  const fa = ujAllapotFa('meres-' + hossz, hossz);
  for (let i = 0; i < n; i++) await allapotBeallitas(fa, 'x:' + az(i), az(i + 1e7), osszeg(i));
  const gyoker = await allapotGyokere(fa);
  let ossz = 0;
  for (let s = 0; s < K; s++) ossz += bajt(await allapotBizonyitek(fa, 'x:' + az(Math.floor(Math.random() * n))));
  return { gyoker, bizonyitek: ossz / K };
}

async function naploMeres(n) {
  const levelek = [];
  for (let i = 0; i < n; i++) levelek.push(await levelOsszegzes('meres-napl', az(i), null, []));
  const gyoker = await naploGyokere('meres-napl', levelek);
  let ossz = 0;
  for (let s = 0; s < K; s++) ossz += bajt(await naploBizonyitek('meres-napl', levelek, Math.floor(Math.random() * n)));
  return { gyoker, bizonyitek: ossz / K };
}

kiir('A 67. MÉRÉS — a lezárási összegzés ára (k = ' + K + ' minta fánként)');
kiir('');
kiir('  résztvevő │ fejléc │ minta: szavazat-fa · tulajdonos-fa · rendezett napló (bizonyíték + esemény) │ k mintával │ + a minták szerzőinek tagsága');
for (const n of [1000, 10000, 100000]) {
  const t0 = Date.now();
  const sz = await allapotFaMeres(n, 3, (i) => [i % 3 === 0 ? 1 : 0, i % 3 === 1 ? 1 : 0, i % 3 === 2 ? 1 : 0]);
  const tu = await allapotFaMeres(n, 1, () => [1]);
  const na = await naploMeres(n);
  const fejlec = bajt({ javaslat: az(1), entitas: az(2), lezaras: 1760000000000,
    szamok: { tamogatok: n / 2, ellenzok: n / 4, tartozkodok: n / 4, nevezo: n },
    kuszobok: { elfogadasiKuszob: 51, reszveteliKuszob: 0, minimumDontesiIdo: 1, maximumDontesiIdo: 604800 },
    szavazatFa: sz.gyoker, tulajdonosFa: tu.gyoker, ertekNaplo: na.gyoker });
  const mSz = sz.bizonyitek + SZAVAZAT_B, mTu = tu.bizonyitek + PONT_B, mNa = na.bizonyitek + ERTEK_B;
  const minta = K * (mSz + mTu + mNa + ERTEK_B);           // + a medián levele (a napló közepe) — egy lépés
  const tagsag = 3 * K * csomagKb(n) * 1024;
  kiir('  ' + String(n).padEnd(9) + ' │ ' + (fejlec / 1024).toFixed(1).padStart(4) + ' KB │ '
    + [mSz, mTu, mNa].map((x) => (x / 1024).toFixed(2) + ' KB').join(' · ').padEnd(30) + '│ '
    + (minta / 1024).toFixed(0).padStart(5) + ' KB  │ +' + (tagsag / 1024).toFixed(0) + ' KB (gyorsítótár nélkül)   ['
    + ((Date.now() - t0) / 1000).toFixed(0) + ' s]');
}
kiir('');
kiir('  (egy döntésről egyszer, a nagy szelet összegző tartójánál; a tagsági csomag szerzőnként egyszer — a már ismert');
kiir('   szerzőké gyorsítótárból)');
