// koino/meres/lancFarokMeres.js

// Felelősség: A 78. MÉRÉS — A TAGSÁGI LÁNC FARKA (a D106 (A) a `MELYSEG_KORLAT`-ra, 2026-10-19): a meghívási fa
// LEGMÉLYEBB tagjai, nem az átlaga.
//
// ⛔ Miért kell: a 64-es korlátot eddig az ÁTLAGOS mélységhez mértük (63. mérés: egymillió tagnál átlag 13,4 —
// lépésenként ~2,8-szoros —, ebből: „a természetes lánc ~10^29–10^30 tagnál éri el”). A korlát viszont a LEGMÉLYEBB
// tagoknál dönt: akinek a legrövidebb lánca hosszabb, az nem tag, amíg egy közelebbi tag be nem hívja. Az átlag
// ott éri el a korlátot, ahol a tagok FELE már alatta van.
//
// A modell (a 63. méréséi, csak a mélység — aláírás nélkül):
//   · 'egyenletes' — az új tagot egy véletlen meglévő tag hívja (VÉLETLEN REKURZÍV FA): a k-adik tag mélysége
//     független Bernoulli(1/j)-k összege (j = 1 … k−1) — PONTOSAN számolható (k-ról k-ra), nagy k-ra a Hwang-féle
//     közelítés: P(D = m) ≈ e^(−λ)·λ^m / m! / Γ(m/λ), λ = ln k (Hwang 1995) —, a fa magassága e·ln n − 1,5·ln ln n
//     + O(1) (Pittel 1994; Addario-Berry–Ford 2013);
//   · 'aktiv' — a hívó súlya 1 + a meghívottjai száma (SÍK-RENDEZETT REKURZÍV FA): a magasság ≈ 1,7956·ln n + O(1)
//     (Pittel 1994);
//   · a lánc-szerű ('friss') növekedés lineáris — azt egyetlen rögzített korlát sem fedi (a válasz a rövidítés: egy
//     közelebbi tag ingyenes meghívása — 63. mérés); itt nem szerepel.
// A szimuláció a mért méreteken (egyenletes 10^8-ig, aktív 10^7-ig) a fa magasságát adja (és az O(1) tagot), a pontos
// eloszlás (10^7-ig) a közelítést ellenőrzi; a koinó saját határáig (~2^128 — D106) a tételek vetítik ki. ⚠️ Egy fa
// egyetlen futása erősen ingadozik (az átlagos mélység szórása ~0,6, a farok hányada ~2×): a farkat ezért nem a
// szimulációból, hanem a pontos eloszlásból mérjük.
//
// ⚠️ NEM ÖNPRÓBA (számokat ad).   node koino/meres/lancFarokMeres.js

const kiir = (s) => process.stdout.write(s + '\n');
const LEPES_BAJT = 1237;                 // egy lépés a tagsági bizonyítékban (63. mérés: Belepes + Meghivas, a lánc-gyökérrel)
const KORLATOK = [64, 128, 256];
const GAMMA = 0.5772156649;
const PORT_EGYUTTHATO = 1.79556;         // a sík-rendezett rekurzív fa magasságának együtthatója: 1/(2s), s·e^(1+s) = 1
const HATAR = 128 * Math.LN2;            // ln(2^128) — a koinó saját határa (D106)
const EMBERISEG = Math.log(1e10);        // D106 (B): az e-ember élő, külön ember

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

/** A mélységek hisztogramja egy N tagú meghívási fában. */
function hisztogram(N, mod, v) {
  const melyseg = new Uint8Array(N);     // a mért méreteken a magasság < 100
  const hiszt = new Float64Array(256);
  hiszt[0] = 1;
  const urna = mod === 'aktiv' ? new Int32Array(2 * N) : null;
  let urnaHossz = 0;
  if (urna) urna[urnaHossz++] = 0;
  for (let i = 1; i < N; i++) {
    const p = urna ? urna[Math.floor(v() * urnaHossz)] : Math.floor(v() * i);
    const m = melyseg[p] + 1;
    melyseg[i] = m;
    hiszt[m]++;
    if (urna) { urna[urnaHossz++] = p; urna[urnaHossz++] = i; }
  }
  return hiszt;
}

function statisztika(hiszt, N) {
  let osszeg = 0, max = 0;
  for (let d = 0; d < hiszt.length; d++) { osszeg += d * hiszt[d]; if (hiszt[d]) max = d; }
  const kvantilis = (q) => { let s = 0; for (let d = 0; d < hiszt.length; d++) { s += hiszt[d]; if (s >= q * N) return d; } return max; };
  const felett = (L) => { let s = 0; for (let d = L + 1; d < hiszt.length; d++) s += hiszt[d]; return s; };
  return { atlag: osszeg / N, p95: kvantilis(0.95), p9999: kvantilis(0.9999), max, felett };
}

// ===== A TÉTELEK =====
const logFakt = [0];
for (let j = 1; j <= 4000; j++) logFakt[j] = logFakt[j - 1] + Math.log(j);

/** ln Γ(x) (Lanczos). */
function lnGamma(x) {
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61503916999185,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
  x -= 1;
  let a = c[0];
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

/** Egy tag (λ = ln k) mélységének farka: P(D > L) a Hwang-közelítéssel. */
function tagFelett(lam, L) {
  const felso = Math.min(logFakt.length - 1, Math.max(L + 1, Math.ceil(lam + 40 * Math.sqrt(lam) + 50)));
  let s = 0;
  for (let m = L + 1; m <= felso; m++) s += Math.exp(m * Math.log(lam) - lam - logFakt[m] - lnGamma(m / lam));
  return Math.min(1, s);
}

/** Egyenletes fa: a tagok hányada L-nél mélyebben (a tag sorszáma egyenletes: ln k = ln n − Exp(1)). */
function egyenletesFelett(lnN, L) {
  let s = 0;
  const dx = 0.01;
  for (let x = dx / 2; x < 40; x += dx) {
    const lnk = lnN - x;
    if (lnk <= 0.5) break;
    s += Math.exp(-x) * tagFelett(lnk, L) * dx;
  }
  return s;
}

/** Egyenletes fa, PONTOSAN: a mélységek összesített eloszlása (D_{k+1} = D_k + Bernoulli(1/k)). */
function pontosEloszlas(N) {
  const H = 96;
  const p = new Float64Array(H);
  const ossz = new Float64Array(H);
  p[0] = 1;
  for (let k = 1; k <= N; k++) {
    for (let d = 0; d < H; d++) ossz[d] += p[d];
    const q = 1 / k;
    for (let d = H - 1; d >= 1; d--) p[d] = p[d] * (1 - q) + p[d - 1] * q;
    p[0] *= 1 - q;
  }
  return (L) => { let s = 0; for (let d = L + 1; d < H; d++) s += ossz[d]; return s / N; };
}

const egyenletesMagassag = (lnN, c) => Math.E * lnN - 1.5 * Math.log(lnN) + c;
const aktivMagassag = (lnN, c) => PORT_EGYUTTHATO * lnN + c;

/** Hol éri el a fa magassága L-et? (ln n, felezéssel) */
function hol(magassag, c, L) {
  let a = 1, b = 1e5;
  for (let i = 0; i < 200; i++) { const m = (a + b) / 2; if (magassag(m, c) < L) a = m; else b = m; }
  return a;
}

const tizes = (lnN) => {
  const k = lnN / Math.LN10;
  const e = Math.floor(k);
  return (Math.pow(10, k - e)).toFixed(1).replace('.', ',') + '·10^' + e;
};
const szazalek = (x) => (x === 0 ? '0' : x < 1e-4 ? x.toExponential(1).replace('.', ',') : (100 * x).toFixed(3).replace('.', ',') + '%');

kiir('78. MÉRÉS — A TAGSÁGI LÁNC FARKA (a meghívási fa legmélyebb tagjai — a D106 (A) a MELYSEG_KORLAT-ra)\n');

// ===== ① A SZIMULÁCIÓ =====
kiir('① A SZIMULÁCIÓ — a mélység (átlag / 95% / 99,99% / a legmélyebb), és a tétel O(1) tagja a legmélyebből:');
const illesztes = { egyenletes: [], aktiv: [] };
const ellenorzes = [];
for (const mod of ['egyenletes', 'aktiv']) {
  const meretek = mod === 'egyenletes' ? [1e4, 1e5, 1e6, 1e7, 1e8] : [1e4, 1e5, 1e6, 1e7];
  for (const N of meretek) {
    const ido = Date.now();
    const h = hisztogram(N, mod, veletlenGyar(78 + N + (mod === 'aktiv' ? 1 : 0)));
    const s = statisztika(h, N);
    const lnN = Math.log(N);
    const c = s.max - (mod === 'egyenletes' ? egyenletesMagassag(lnN, 0) : aktivMagassag(lnN, 0));
    illesztes[mod].push(c);
    kiir('  ' + mod.padEnd(11) + tizes(lnN).padStart(9) + ' │ ' + s.atlag.toFixed(1).padStart(5) + ' / '
      + String(s.p95).padStart(2) + ' / ' + String(s.p9999).padStart(2) + ' / ' + String(s.max).padStart(2)
      + '   O(1) = ' + c.toFixed(1).padStart(5) + '   (' + ((Date.now() - ido) / 1000).toFixed(1) + ' s)');
    if (mod === 'egyenletes' && N >= 1e6 && N <= 1e7) ellenorzes.push({ N, szimulalt: s.felett });
  }
}
kiir('\n  A farok (egyenletes): a tagok hányada L-nél mélyebben — PONTOSAN / a Hwang-közelítés / egy szimulált fa:');
for (const e of ellenorzes) {
  const pontos = pontosEloszlas(e.N);
  for (const L of [20, 25, 30, 35]) kiir('    ' + tizes(Math.log(e.N)).padStart(9) + '  L = ' + String(L).padStart(2) + ':  '
    + szazalek(pontos(L)).padStart(9) + '  /  ' + szazalek(egyenletesFelett(Math.log(e.N), L)).padStart(9)
    + '  /  ' + szazalek(e.szimulalt(L) / e.N).padStart(9));
}

const atlagC = (l) => l.reduce((a, b) => a + b, 0) / l.length;
const cE = Math.max(...illesztes.egyenletes.slice(-3));   // a legnagyobb (óvatos) a három legnagyobb méretből
const cA = Math.max(...illesztes.aktiv.slice(-2));
kiir('\n  A kivetítéshez az O(1) tag: egyenletes ' + cE.toFixed(1) + ' (átlag ' + atlagC(illesztes.egyenletes).toFixed(1)
  + '), aktív ' + cA.toFixed(1) + ' (átlag ' + atlagC(illesztes.aktiv).toFixed(1) + ') — a legnagyobb, óvatosan.');

// ===== ② A KIVETÍTÉS =====
kiir('\n② A KIVETÍTÉS — a legmélyebb tag (a fa magassága) az emberiségnél (10^10) és a koinó saját határánál (2^128 ≈ 3,4·10^38):');
for (const [nev, lnN] of [['10^10', EMBERISEG], ['10^11 (×10)', EMBERISEG + Math.LN10], ['2^128', HATAR]]) {
  kiir('  ' + nev.padEnd(12) + '  egyenletes: átlag ~' + (lnN + GAMMA - 1).toFixed(0).padStart(3) + ', a legmélyebb ~'
    + egyenletesMagassag(lnN, cE).toFixed(0).padStart(3) + '   ·   aktív: a legmélyebb ~' + aktivMagassag(lnN, cA).toFixed(0).padStart(3));
}

kiir('\n③ A KORLÁTOK — hol éri el a legmélyebb tag; és a koinó saját határánál a tagok hányada (és száma) a korlátnál mélyebben:');
for (const L of KORLATOK) {
  const lE = hol(egyenletesMagassag, cE, L);
  const lA = hol(aktivMagassag, cA, L);
  const f = egyenletesFelett(HATAR, L);
  kiir('  L = ' + String(L).padStart(3) + '   a legmélyebb eléri: egyenletes ~' + tizes(lE).padStart(10) + ', aktív ~'
    + tizes(lA).padStart(10) + '   ·   2^128-nál (egyenletes) mélyebben: ' + szazalek(f)
    + (f > 0 ? ' (~' + tizes(Math.log(f) + HATAR) + ' tag)' : ''));
}

kiir('\n④ AZ ÁRA — a legrosszabb (épp a korlátnál ülő) tag bizonyítéka; a természetes tagé nem változik (~13–30 lépés):');
for (const L of KORLATOK) {
  const esemeny = 3 * (L + 1) + 2;
  kiir('  L = ' + String(L).padStart(3) + '   a tagsági csomag legfeljebb ' + String(esemeny).padStart(4) + ' esemény (a profillal), ~'
    + Math.round(L * LEPES_BAJT / 1024) + ' KB profil nélkül · 32 ilyen egy válaszban (TAGSAGCSOMAGOK) ~'
    + (32 * L * LEPES_BAJT / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB (a sor-korlát 8 MB)');
}
