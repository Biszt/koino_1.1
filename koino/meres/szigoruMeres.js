// koino/meres/szigoruMeres.js

// Felelősség: A 66. MÉRÉS — MEKKORA EGY KÉSZÜLÉK TERHE A SZIGORÚ (b) ALATT? (a B/3 átvizsgálása)
//
// A szigorú (b) szerint egy készülék a VÁLLALT szeleteit cseréli és tartja (D75, D86): amire tudatpontot tett, a saját
// azonosság-szeletét és a koinó születését. ⭐ A kérdés: mekkora ez egy átlagos és egy „rossz napos” készüléken, és
// hogyan nő a koinó méretével — mert a vállalt szelet MINDEN eseményét tartja (a többi pont-tartóét is), és a
// szabály-réteg (D93/1) a szerzőik tagságát is kérdezi (tehát a tagsági bizonyítékuk is kell).
//
// A modell (szimuláció — darabszám, aláírás nélkül): N tag; mindenki k entitásra tesz pontot (k egyenletes 3..20);
// az entitást „a gazdag gazdagodik” szabály választja (p eséllyel egy új vagy véletlen entitás, különben a pont-tartók
// számával arányosan — a népszerűség egyenetlen, mint a valóságban). Egy entitás szelete: a születése + a pont-tartói
// pont-eseményei (~0,4 KB eseményenként — 43. mérés; a lánc-gyökérrel ~0,55). A tagsági bizonyíték szerzőnként ~1,2 KB
// × a meghívási lánc mélysége (63. mérés: ~7–13 lépés).
//
// ⚠️ NEM ÖNPRÓBA (számokat ad).   node koino/meres/szigoruMeres.js [p]

const kiir = (s) => process.stdout.write(s + '\n');
const P_UJ = Number(process.argv[2] ?? 0.3);
const ESEMENY_KB = 0.55;
const LEPES_KB = 1.2;
// ⭐ A skálázási terv 4.6 válasza (a tömeges entitás): a NAGY szeletnél (KUSZOB eseménynél több) a pont-tartó csak a
// gyökeret, a saját eseményeit és MINTA szúrópróbát tart (a minták szerzőinek tagságával); a teljes halmazt csak az
// önkéntes tartja. A kis szelet marad teljes.
const KUSZOB = Number(process.argv[3] ?? 1000);
const MINTA = 8;

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

/** A pont-tartók: entitásonként a tartók listája, tagonként az entitásai. */
function felepites(N, v) {
  const tartok = [];              // entitás → [tag]
  const urna = [];                // entitás, annyiszor, ahány tartója van („a gazdag gazdagodik”)
  const entitasai = new Array(N);
  for (let tag = 0; tag < N; tag++) {
    const k = 3 + Math.floor(v() * 18);
    const sajat = new Set();
    for (let i = 0; i < k; i++) {
      let e;
      if (!urna.length || v() < P_UJ) {
        // új vagy egyenletesen véletlen entitás (a felük új — a koinó gondolatai nőnek)
        if (!tartok.length || v() < 0.5) { e = tartok.length; tartok.push([]); }
        else e = Math.floor(v() * tartok.length);
      } else {
        e = urna[Math.floor(v() * urna.length)];
      }
      if (sajat.has(e)) continue;
      sajat.add(e);
      tartok[e].push(tag);
      urna.push(e);
    }
    entitasai[tag] = [...sajat];
  }
  return { tartok, entitasai };
}

function eloszlas(lista) {
  const r = [...lista].sort((a, b) => a - b);
  const p = (q) => r[Math.min(r.length - 1, Math.floor(r.length * q))];
  return { median: p(0.5), p95: p(0.95), max: r[r.length - 1], atlag: r.reduce((a, b) => a + b, 0) / r.length };
}

const melyseg = (N) => (N <= 1000 ? 7.4 : N <= 10000 ? 10 : N <= 100000 ? 12 : 13.4);   // 63. mérés, egyenletes

kiir('A 66. MÉRÉS — egy készülék terhe a szigorú (b) alatt (p = ' + P_UJ + ': ennyi eséllyel új/véletlen entitás)');
kiir('');
kiir('  N          entitás   a legnépszerűbb (tartó)   │ tárolt esemény / készülék (medián · 95% · max)   │ szerzők, akiknek a tagsága kell (medián · 95% · max)');
for (const N of [1000, 10000, 100000, 1000000]) {
  const v = veletlenGyar(N * 13 + 7);
  const { tartok, entitasai } = felepites(N, v);
  const legnagyobb = tartok.reduce((m, t) => Math.max(m, t.length), 0);
  const minta = Math.min(N, N >= 1000000 ? 200 : 500);
  const jelolo = new Uint8Array(N);
  const esemenyek = [], szerzok = [], esemenyek2 = [], szerzok2 = [];
  let nagyotTart = 0;
  for (let s = 0; s < minta; s++) {
    const tag = Math.floor(v() * N);
    let db = 2, db2 = 2;                          // a saját azonosság-szelet + a koinó születése (legalább)
    const erintett = [];
    let erintett2 = 0;
    let vanNagy = false;
    for (const e of entitasai[tag]) {
      db += 1 + tartok[e].length;                 // a születés + a pont-események
      for (const t of tartok[e]) if (!jelolo[t]) { jelolo[t] = 1; erintett.push(t); }
      // két fokú vállalás: a nagy szeletből csak a születés, a saját pontom és a minták
      if (1 + tartok[e].length > KUSZOB) { db2 += 2 + MINTA; erintett2 += MINTA; vanNagy = true; }
      else { db2 += 1 + tartok[e].length; erintett2 += tartok[e].length; }
    }
    if (vanNagy) nagyotTart++;
    esemenyek.push(db); szerzok.push(erintett.length);
    esemenyek2.push(db2); szerzok2.push(erintett2);
    for (const t of erintett) jelolo[t] = 0;
  }
  const nagySzelet = tartok.filter((t) => 1 + t.length > KUSZOB).length;
  const e = eloszlas(esemenyek), sz = eloszlas(szerzok);
  const mai = tartok.reduce((a, t) => a + 1 + t.length, 0);
  kiir('  ' + String(N).padEnd(10) + String(tartok.length).padStart(8) + String(legnagyobb).padStart(12)
    + ' (' + (100 * legnagyobb / N).toFixed(1) + '%)      │ '
    + [e.median, e.p95, e.max].map((x) => String(x).padStart(8)).join(' ·') + '  (~' + (e.p95 * ESEMENY_KB / 1024).toFixed(1)
    + ' MB a 95%)  │ ' + [sz.median, sz.p95, sz.max].map((x) => String(x).padStart(8)).join(' ·')
    + '  (~' + (sz.p95 * LEPES_KB * melyseg(N) / 1024).toFixed(0) + ' MB tagsági bizonyíték a 95%)');
  kiir('  ' + ' '.repeat(10) + '  a mai „mindent tárol”: ' + mai + ' esemény (~' + (mai * ESEMENY_KB / 1024).toFixed(0) + ' MB)');
  const e2 = eloszlas(esemenyek2), sz2 = eloszlas(szerzok2);
  kiir('  ' + ' '.repeat(10) + '  KÉT FOKÚ vállalás (' + KUSZOB + ' esemény fölött összegző): ' + nagySzelet + ' nagy szelet, a készülékek '
    + (100 * nagyotTart / minta).toFixed(0) + '%-a tart ilyet → tárolt '
    + [e2.median, e2.p95, e2.max].join(' · ') + ' esemény · tagság ' + [sz2.median, sz2.p95, sz2.max].join(' · ')
    + ' szerző (~' + (sz2.p95 * LEPES_KB * melyseg(N) / 1024).toFixed(0) + ' MB a 95%)');
}
kiir('');
kiir('  (egy esemény ~' + ESEMENY_KB + ' KB; a tagsági bizonyíték szerzőnként ~' + LEPES_KB + ' KB × a lánc mélysége)');
