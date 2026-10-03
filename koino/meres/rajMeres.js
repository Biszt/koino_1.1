// koino/meres/rajMeres.js

// Felelősség: AZ 59. MÉRÉS — A RAJ KIALAKULÁSA (D91: a „mi kinél van" fő útja a fa és a raj) — szimuláció.
//
// A kérdés: ha a tartók NÉV NÉLKÜLI, KORLÁTOS listában (`L` bejegyzés szeletenként) ismerik egymást, és a lista
// két úton frissül —
//   · „KITŐL KAPTAM": aki vállal egy szeletet, egy meglévő tartótól kapja meg, és átveszi annak listáját
//     (a forrás pedig felveszi őt);
//   · A CSERE: körönként a tartó a listájáról egy élő tartóval egyezteti a szeletet, és a két lista
//     összefésülődik (a legutóbb látottak maradnak);
// — akkor összefüggő marad-e egy szelet raja a lemorzsolódás (eltűnő készülékek) mellett, hány tartó ÁRVUL el
// (egyetlen élő bejegyzése sincs — ő már csak a D kérelmével éri el a többieket), és mekkora `L` kell?
//
// A modell: N készülék, készülékenként átlag V vállalt szelet, a szeletek népszerűsége Zipf-eloszlású (a
// legtöbbnek kevés tartója van, néhánynak sok). Körönként c valószínűséggel eltűnik egy készülék, és ugyanennyi
// új jön (aki az első vállalásait a „kitől kaptam" úton szerzi). A csere körönként g valószínűséggel fut.
// Magvas véletlen — összevethető.
//
// ⚠️ NEM ÖNPRÓBA (számokat ad).  node koino/meres/rajMeres.js [N=5000] [körök=60]

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

function szimulacio({ N, V, S, L, c, g, korok, mag, szabaly = 'friss' }) {
  const v = veletlenGyar(mag);
  // Zipf: a szelet kiválasztásának súlya 1 / rang^0.9
  const sulyok = Array.from({ length: S }, (_, i) => 1 / Math.pow(i + 1, 0.9));
  const osszSuly = sulyok.reduce((a, b) => a + b, 0);
  const kumulalt = [];
  { let s = 0; for (const w of sulyok) { s += w / osszSuly; kumulalt.push(s); } }
  const szeletValaszt = () => {
    const r = v();
    let lo = 0, hi = S - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (kumulalt[m] < r) lo = m + 1; else hi = m; }
    return lo;
  };

  let kovetkezoId = 0;
  const el = new Set();
  const tartok = Array.from({ length: S }, () => new Set());       // szelet → élő tartók
  const lista = new Map();                                          // "készülék|szelet" → Map(társ → mikor látta)
  const kulcs = (d, s) => d + '|' + s;
  let kor = 0;

  const listaja = (d, s) => { const k = kulcs(d, s); if (!lista.has(k)) lista.set(k, new Map()); return lista.get(k); };
  // ⭐ A MEGTARTÁS SZABÁLYA (a 4.2/b: kellenek véletlen elemek is — a Cyclon-féle keverés):
  //   · 'friss'  — a legutóbb látott L marad;
  //   · 'veletlen' — egyenletesen véletlen L marad;
  //   · 'vegyes' — a legfrissebb L/2, a többi véletlenül.
  const vag = (m) => {
    if (m.size <= L) return;
    const osszes = [...m.entries()];
    let marad;
    if (szabaly === 'friss') marad = osszes.sort((a, b) => b[1] - a[1]).slice(0, L);
    else if (szabaly === 'veletlen') {
      for (let i = osszes.length - 1; i > 0; i--) { const j = Math.floor(v() * (i + 1)); [osszes[i], osszes[j]] = [osszes[j], osszes[i]]; }
      marad = osszes.slice(0, L);
    } else {
      const rendezett = osszes.sort((a, b) => b[1] - a[1]);
      const fele = Math.ceil(L / 2);
      const tobbi = rendezett.slice(fele);
      for (let i = tobbi.length - 1; i > 0; i--) { const j = Math.floor(v() * (i + 1)); [tobbi[i], tobbi[j]] = [tobbi[j], tobbi[i]]; }
      marad = [...rendezett.slice(0, fele), ...tobbi.slice(0, L - fele)];
    }
    m.clear();
    for (const [t, ido] of marad) m.set(t, ido);
  };
  const felvesz = (d, s, tars, ido) => {
    if (tars === d) return;
    const m = listaja(d, s);
    if (!m.has(tars) || m.get(tars) < ido) m.set(tars, ido);
    vag(m);
  };

  /** Egy vállalás a „kitől kaptam" úton. */
  const vallal = (d, s) => {
    const mostaniak = [...tartok[s]];
    tartok[s].add(d);
    listaja(d, s);
    if (!mostaniak.length) return;                  // az első tartó (a szerző)
    const forras = mostaniak[Math.floor(v() * mostaniak.length)];
    for (const [t, ido] of listaja(forras, s)) if (el.has(t)) felvesz(d, s, t, ido);
    felvesz(d, s, forras, kor);
    felvesz(forras, s, d, kor);
  };

  const ujKeszulek = () => {
    const d = kovetkezoId++;
    el.add(d);
    const db = Math.max(1, Math.round(V * (0.5 + v())));
    const sajat = new Set();
    for (let i = 0; i < db; i++) sajat.add(szeletValaszt());
    for (const s of sajat) vallal(d, s);
    return d;
  };

  for (let i = 0; i < N; i++) ujKeszulek();

  // ----- a körök: lemorzsolódás, új készülékek, csere -----
  const keszulekSzeletei = () => {
    const m = new Map();
    for (let s = 0; s < S; s++) for (const d of tartok[s]) { if (!m.has(d)) m.set(d, []); m.get(d).push(s); }
    return m;
  };
  for (kor = 1; kor <= korok; kor++) {
    // lemorzsolódás
    for (const d of [...el]) {
      if (v() < c) {
        el.delete(d);
        for (let s = 0; s < S; s++) tartok[s].delete(d);
      }
    }
    const potlas = Math.round(N * c);
    for (let i = 0; i < potlas; i++) ujKeszulek();
    // csere
    for (const [d, szeletek] of keszulekSzeletei()) {
      for (const s of szeletek) {
        if (v() >= g) continue;
        const m = listaja(d, s);
        // a halottakat a kopogás deríti ki — a sikertelen próbálkozás kiveszi
        const jeloltek = [...m.keys()];
        while (jeloltek.length) {
          const i = Math.floor(v() * jeloltek.length);
          const t = jeloltek.splice(i, 1)[0];
          if (!el.has(t) || !tartok[s].has(t)) { m.delete(t); continue; }
          // csere: a két lista összefésül, és egymást frissnek látják
          const mt = listaja(t, s);
          const masolatD = [...m.entries()], masolatT = [...mt.entries()];
          for (const [x, ido] of masolatT) if (el.has(x)) felvesz(d, s, x, ido);
          for (const [x, ido] of masolatD) if (el.has(x)) felvesz(t, s, x, ido);
          felvesz(d, s, t, kor);
          felvesz(t, s, d, kor);
          break;
        }
      }
    }
  }

  // ----- a mérés: szeletenként a raj összefüggősége -----
  const sav = (n) => (n <= 3 ? '2–3' : n <= 10 ? '4–10' : n <= 100 ? '11–100' : '100+');
  const eredmeny = {};
  for (let s = 0; s < S; s++) {
    const h = [...tartok[s]];
    if (h.length < 2) continue;
    const halmaz = new Set(h);
    // irányítatlan összefüggőség (a csere kétirányú)
    const szomszed = new Map(h.map((d) => [d, new Set()]));
    let arva = 0;
    for (const d of h) {
      let elo = 0;
      for (const t of listaja(d, s).keys()) {
        if (!halmaz.has(t)) continue;
        elo++;
        szomszed.get(d).add(t);
        szomszed.get(t).add(d);
      }
      if (!elo) arva++;
    }
    const latott = new Set();
    let legnagyobb = 0;
    for (const d of h) {
      if (latott.has(d)) continue;
      let meret = 0;
      const sor = [d];
      latott.add(d);
      while (sor.length) {
        const x = sor.pop();
        meret++;
        for (const y of szomszed.get(x)) if (!latott.has(y)) { latott.add(y); sor.push(y); }
      }
      legnagyobb = Math.max(legnagyobb, meret);
    }
    const b = sav(h.length);
    if (!eredmeny[b]) eredmeny[b] = { szelet: 0, tarto: 0, arva: 0, nagyban: 0, egyben: 0 };
    const e = eredmeny[b];
    e.szelet++;
    e.tarto += h.length;
    e.arva += arva;
    e.nagyban += legnagyobb;
    if (legnagyobb === h.length) e.egyben++;
  }
  return eredmeny;
}

const N = Number(process.argv[2]) > 0 ? Number(process.argv[2]) : 5000;
const korok = Number(process.argv[3]) > 0 ? Number(process.argv[3]) : 60;
const V = 20, S = Math.round(N * 0.4), g = 0.25;
kiir('');
kiir('59. MÉRÉS — A RAJ KIALAKULÁSA (D91) — szimuláció · N = ' + N + ' készülék, ' + S + ' szelet (Zipf), átlag ' + V
  + ' vállalás/készülék, ' + korok + ' kör, csere ' + g + '/kör');
kiir('  (szeletenként: a tartók hány %-a van a legnagyobb összefüggő darabban · hány % árva · a szeletek hány %-a egyben)');
const szabalyok = (process.argv[4] ?? 'friss,veletlen,vegyes').split(',');
for (const szabaly of szabalyok) for (const c of [0.005, 0.05]) {
  for (const L of [4, 6, 8]) {
    const t0 = Date.now();
    const e = szimulacio({ N, V, S, L, c, g, korok, mag: 7, szabaly });
    const reszek = ['2–3', '4–10', '11–100', '100+'].filter((b) => e[b]).map((b) => {
      const x = e[b];
      return b + ': ' + (x.nagyban / x.tarto * 100).toFixed(1) + '% · árva ' + (x.arva / x.tarto * 100).toFixed(1)
        + '% · egyben ' + (x.egyben / x.szelet * 100).toFixed(0) + '%';
    });
    kiir('  ' + szabaly.padEnd(8) + ' · lemorzsolódás ' + (c * 100).toFixed(1) + '%/kör · L = ' + String(L).padStart(2) + ' │ ' + reszek.join(' │ ')
      + '   (' + ((Date.now() - t0) / 1000).toFixed(0) + ' s)');
  }
}
kiir('');
