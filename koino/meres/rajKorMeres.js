// koino/meres/rajKorMeres.js

// Felelősség: A 69. MÉRÉS — A RAJ A KÖRBEN (D97/2, K2/A) — szimuláció.
//
// A kérdés: a szigorú (b) alatt egy készülék csak a vállalt szeleteiben cserél, és egy véletlen kötés-társsal szinte nincs
// közös szelete (~n²/S). Ha az őrjárat körönként R raj-társat is felkeres (a vállalt szeleteimen körbe forogva, szeletenként
// azt a tartót, aki a legtöbb szeletemet tartja), hány kör alatt ér el egy szelet változása a szelet MINDEN tartójához?
// És mennyit ér ehhez képest a csak kötés-társas kör, illetve a véletlen raj-társ?
//
// A modell: N készülék, S szelet (Zipf-népszerűség), készülékenként átlag V vállalt szelet; minden készülék szeletenként
// legfeljebb L tartót ismer (a raj-jegyzék — D91; a lista itt állandó, véletlen minta a tartókból). Körönként minden
// készülék a K kötés-társával (rögzített, véletlen) és R raj-társsal cserél; egy csere a két fél KÖZÖS szeleteit hozza
// szinkronba (D97/1). Mérjük: T szelet egy-egy változásának terjedését (a szelet egy véletlen tartójánál indul), körönként.
// Magvas véletlen — összevethető.
//
// ⚠️ NEM ÖNPRÓBA (számokat ad).  node koino/meres/rajKorMeres.js [N=2000] [S=20000] [V=50]

const kiir = (s) => process.stdout.write(s + '\n');

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

/** A világ: ki mit vállal, és ki kit ismer szeletenként. */
function vilagEpitese({ N, S, V, L, mag }) {
  const v = veletlenGyar(mag);
  const sulyok = Array.from({ length: S }, (_, i) => 1 / Math.pow(i + 1, 0.9));
  const ossz = sulyok.reduce((a, b) => a + b, 0);
  const kum = [];
  { let s = 0; for (const w of sulyok) { s += w / ossz; kum.push(s); } }
  const szeletValaszt = () => {
    const r = v();
    let lo = 0, hi = S - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (kum[m] < r) lo = m + 1; else hi = m; }
    return lo;
  };
  const vallal = Array.from({ length: N }, () => new Set());
  for (let d = 0; d < N; d++) {
    const n = Math.max(1, Math.round(V * (0.5 + v())));       // V/2 .. 3V/2
    while (vallal[d].size < n) vallal[d].add(szeletValaszt());
  }
  const tartok = Array.from({ length: S }, () => []);
  for (let d = 0; d < N; d++) for (const s of vallal[d]) tartok[s].push(d);
  // A raj-jegyzék: szeletenként legfeljebb L ismert tartó (véletlen minta, önmaga nélkül).
  const ismer = Array.from({ length: N }, () => new Map());
  for (let d = 0; d < N; d++) {
    for (const s of vallal[d]) {
      const masok = tartok[s].filter((x) => x !== d);
      for (let i = masok.length - 1; i > 0; i--) { const j = Math.floor(v() * (i + 1)); [masok[i], masok[j]] = [masok[j], masok[i]]; }
      ismer[d].set(s, masok.slice(0, L));
    }
  }
  // Az átfedés-pontszám: hány szeletemnél szerepel a társ a jegyzékemben (amit tudok róla).
  const atfedes = Array.from({ length: N }, () => new Map());
  for (let d = 0; d < N; d++) for (const l of ismer[d].values()) for (const x of l) atfedes[d].set(x, (atfedes[d].get(x) ?? 0) + 1);
  return { v, vallal, tartok, ismer, atfedes };
}

/**
 * A terjedés. `strategia`: 'kotes' (csak K kötés-társ) · 'raj' (+R raj-társ, forgatva, átfedés szerint) · 'rajVeletlen'
 * (+R véletlen raj-társ egy véletlen szeletemből).
 */
function terjedes(vilag, { N, K, R, T, korok, strategia, mag }) {
  const v = veletlenGyar(mag);
  const { vallal, tartok, ismer, atfedes } = vilag;
  const kotes = Array.from({ length: N }, () => { const k = new Set(); while (k.size < K) { const x = Math.floor(v() * N); k.add(x); } return [...k]; });
  // A követett változások: T szelet (legalább 2 tartóval), egy véletlen tartónál indul.
  const jelolt = tartok.map((t, s) => s).filter((s) => tartok[s].length >= 2);
  const kovetett = [];
  while (kovetett.length < Math.min(T, jelolt.length)) {
    const s = jelolt[Math.floor(v() * jelolt.length)];
    if (!kovetett.includes(s)) kovetett.push(s);
  }
  const tudja = new Map(kovetett.map((s) => [s, new Set([tartok[s][Math.floor(v() * tartok[s].length)]])]));
  // ⭐ A „változott szelet előre” (rajValtozas): aki egy szeletben újat tud meg, annak tartóit sorra felkeresi.
  const sor = Array.from({ length: N }, () => []);                 // készülék → [szelet] (friss)
  const mutato = new Map();                                        // "készülék|szelet" → hányadik tartónál tart
  for (const s of kovetett) for (const d of tudja.get(s)) sor[d].push(s);
  const kesz = new Map();              // szelet → hányadik körben ért el mindenkihez
  const forgas = Array.from({ length: N }, () => 0);
  const szeletLista = vallal.map((x) => [...x]);
  const csere = (x, y) => {
    for (const s of kovetett) {
      const t = tudja.get(s);
      if (!vallal[x].has(s) || !vallal[y].has(s)) continue;
      if (t.has(x) !== t.has(y)) {
        const uj = t.has(x) ? y : x;
        t.add(uj);
        if (strategia === 'rajValtozas') sor[uj].push(s);
      }
    }
  };
  /** A szelet következő tartója (körben a jegyzékemből). */
  const kovetkezoTarto = (d, s) => {
    const l = ismer[d].get(s) ?? [];
    if (!l.length) return null;
    const k = d + '|' + s;
    const i = mutato.get(k) ?? 0;
    mutato.set(k, i + 1);
    return l[i % l.length];
  };
  for (let kor = 1; kor <= korok; kor++) {
    for (let d = 0; d < N; d++) {
      const tarsak = new Set(kotes[d]);
      if (strategia === 'rajValtozas') {
        // Előbb a friss szeletek tartói (mindegyiket egyszer, sorban), aztán a forgatás (a tartók is sorban).
        let kell = R;
        while (kell > 0 && sor[d].length) {
          const s = sor[d][0];
          const k = d + '|' + s;
          const l = ismer[d].get(s) ?? [];
          if ((mutato.get(k) ?? 0) >= l.length) { sor[d].shift(); mutato.delete(k); continue; }
          const t = kovetkezoTarto(d, s);
          if (t !== null && !tarsak.has(t)) { tarsak.add(t); kell--; }
        }
        const sz = szeletLista[d];
        for (let i = 0; i < sz.length && kell > 0; i++) {
          const s = sz[(forgas[d] + i) % sz.length];
          const t = kovetkezoTarto(d, s);
          if (t !== null && !tarsak.has(t)) { tarsak.add(t); kell--; }
        }
        forgas[d] = (forgas[d] + R) % Math.max(1, sz.length);
      } else if (strategia === 'raj' || strategia === 'rajVeletlen' || strategia === 'rajVegyes' || strategia === 'rajKorben') {
        const sz = szeletLista[d];
        let kell = R;
        for (let i = 0; i < sz.length && kell > 0; i++) {
          const s = strategia === 'rajVeletlen' ? sz[Math.floor(v() * sz.length)] : sz[(forgas[d] + i) % sz.length];
          const l = ismer[d].get(s) ?? [];
          if (!l.length) continue;
          let valasztott;
          const legjobb = () => l.reduce((a, b) => ((atfedes[d].get(b) ?? 0) > (atfedes[d].get(a) ?? 0) ? b : a), l[0]);
          if (strategia === 'raj') valasztott = legjobb();
          else if (strategia === 'rajVegyes') valasztott = v() < 0.5 ? legjobb() : l[Math.floor(v() * l.length)];
          else if (strategia === 'rajKorben') valasztott = kovetkezoTarto(d, s);
          else valasztott = l[Math.floor(v() * l.length)];
          if (!tarsak.has(valasztott)) { tarsak.add(valasztott); kell--; }
        }
        if (strategia !== 'rajVeletlen') forgas[d] = (forgas[d] + R) % Math.max(1, sz.length);
      }
      for (const t of tarsak) csere(d, t);
    }
    for (const s of kovetett) if (!kesz.has(s) && tudja.get(s).size === tartok[s].length) kesz.set(s, kor);
  }
  const korokLista = kovetett.map((s) => kesz.get(s) ?? Infinity).sort((a, b) => a - b);
  const kvantilis = (q) => korokLista[Math.min(korokLista.length - 1, Math.floor(q * korokLista.length))];
  const aranyon = (k) => korokLista.filter((x) => x <= k).length / korokLista.length;
  return { median: kvantilis(0.5), p90: kvantilis(0.9), p99: kvantilis(0.99), r10: aranyon(10), r30: aranyon(30),
    rMind: aranyon(korok), csere: K + (strategia === 'kotes' ? 0 : R) };
}

const N = Number(process.argv[2]) || 2000;
const S = Number(process.argv[3]) || 20000;
const V = Number(process.argv[4]) || 50;
const L = 8, K = 3, T = 400, KOROK = 120;
kiir('');
kiir('A RAJ A KÖRBEN (69., D97/2) — szimuláció · N = ' + N + ' készülék · S = ' + S + ' szelet · V = ' + V
  + ' vállalt szelet/készülék · L = ' + L + ' · K = ' + K + ' kötés-társ · ' + T + ' követett változás · ' + KOROK + ' kör');
const vilag = vilagEpitese({ N, S, V, L, mag: 69 });
const tartoSzam = vilag.tartok.map((t) => t.length).filter((x) => x >= 2).sort((a, b) => a - b);
kiir('  tartók szeletenként (≥ 2): medián ' + tartoSzam[Math.floor(tartoSzam.length / 2)] + ', 90% ' + tartoSzam[Math.floor(tartoSzam.length * 0.9)]
  + ', max ' + tartoSzam[tartoSzam.length - 1]);
const pct = (x) => (x * 100).toFixed(1).padStart(5) + '%';
const kor = (x) => (Number.isFinite(x) ? String(x) : '—').padStart(4);
for (const [nev, b] of [
  ['csak a kötés-társak (K = 3)          ', { strategia: 'kotes', R: 0 }],
  ['+ 1 raj-társ (forgatva, átfedés)     ', { strategia: 'raj', R: 1 }],
  ['+ 2 raj-társ (forgatva, átfedés)     ', { strategia: 'raj', R: 2 }],
  ['+ 4 raj-társ (forgatva, átfedés)     ', { strategia: 'raj', R: 4 }],
  ['+ 2 raj-társ (véletlen szeletből)    ', { strategia: 'rajVeletlen', R: 2 }],
  ['+ 2 raj-társ (forgatva, vegyes)      ', { strategia: 'rajVegyes', R: 2 }],
  ['+ 2 raj-társ (forgatva, tartók sorban)', { strategia: 'rajKorben', R: 2 }],
  ['+ 1 raj-társ (változott előre)       ', { strategia: 'rajValtozas', R: 1 }],
  ['+ 2 raj-társ (változott előre)       ', { strategia: 'rajValtozas', R: 2 }],
  ['+ 4 raj-társ (változott előre)       ', { strategia: 'rajValtozas', R: 4 }]
]) {
  const r = terjedes(vilag, { N, K, R: b.R, T, korok: KOROK, strategia: b.strategia, mag: 7 });
  kiir('  ' + nev + ' · ' + r.csere + ' csere/kör · minden tartóhoz: medián ' + kor(r.median) + ', 90% ' + kor(r.p90)
    + ', 99% ' + kor(r.p99) + ' kör · 10 körön belül ' + pct(r.r10) + ', 30-on ' + pct(r.r30) + ', ' + KOROK + '-on ' + pct(r.rMind));
}
kiir('');
