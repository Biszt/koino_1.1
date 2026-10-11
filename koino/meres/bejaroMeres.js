// koino/meres/bejaroMeres.js
// Felelősség: A 74. MÉRÉS — A LEGJOBB-ELŐSZÖR BEJÁRÓ ÁRA a szigorú (b) alatt (D101, M1: „előtte mérés”) — szimuláció.
//
// A kérdés: a D101 közös bejárója (az „ágazati pont szerint csökkenő” sor a fejléc-kérdéssel — a lapos ágazati
// rendezés, a Struktúra, a Síkidom alapja) hány KÉRELMET és hány PERCET kér
//   · egy lapos oldalhoz (k = 20 kártya, a gyökértől),
//   · és egy B = 200 / 500 / 2000 csomópontos Struktúrához (az ág legerősebb B csomópontja),
// ha a készülék a koinóból semmit nem tart (egy friss tag, a szigorú (b) alatt), és mit veszít, ha a fejléc-kérdésnek
// nincs FOLYTATÁSA (ma az 51. gyerek nem kérhető)?
//
// ⭐ A legjobb-először bejárás (az össz-pont lefelé nem nő): a sor elejéről mindig a legnagyobb ismert össz-pontú jön; a
// következő csak akkor dönthető el, ha az eddig kiadottak gyerekeit már ismerjük. A bejáró ezért a sor elején álló
// (még ki nem bontott) csomópontokra ELŐRE kér, a függő-korlátig (C).
//
// A MODELL (a program mai menete szerint — `koino.js`):
//   · A fa: N entitás, előnyben részesítő kapcsolódás (a sok gyerekes szülő többet kap), a gyökérhez ρ eséllyel; a saját
//     pont Pareto-eloszlású (kevés nagy, sok kicsi); az össz-pont alulról összegződik.
//   · A tartók: egy entitás szeletét a tudatpont-tartói tartják (a szigorú (b)): 1 + Poisson(2) készülék M = N/5 közül.
//     Egy készülék f = 0,3 eséllyel közvetlenül elérhető (kötés vagy fogadóképes), különben NAT mögött van: a kérelmet a
//     kopogtató témáján látja meg (a címjegyzék-köre ~20 percenként — `HIRDETES_KOZ`), utána a következő körben kopognak.
//     Körönként p_on = 0,7 eséllyel él (különben a kérelem egy másik tartónál próbálkozik a következő körben).
//   · Az őrjárat T percenként köröz (alap: 5 — `orjarat`; a terepen 1). Egy körben minden célhoz EGY munka megy, és ma egy
//     munka EGY függő kérelmet visz (`tarshozIllo`) → társanként körönként Q = 1 kérelem; a függők száma legfeljebb
//     C = 16 (`FUGGO_KORLAT`). A gyökér fejléceit egy kötés adja (közvetlen, él).
//   · A fejléc-válasz: legfeljebb 50 gyerek össz-pont szerint (`FEJLEC_KORLAT`); a folytatás (`utan`) egy újabb kérelem.
//     Mérete ~0,5 KB/fejléc + ~5 KB minta (62. mérés: egy fejléc k = 8 mintával 5–21 KB — itt csak a kiválasztottakra).
//
// A VÁLTOZATOK:
//   A — ma: Q = 1, C = 16, a levelet is meg kell kérdezni (a fejléc nem mondja a gyerekszámát)
//   B — több kérelem egy kapcsolaton (Q = C)
//   C — B + a fejléc bemondja a gyerekszámot (a levélre nem kell kérni)
//   D — C + bővebb függő-korlát a bejárónak (C = 64)
//   E — D + a tartó MÉLYEN felel: amit maga is tart X alatt, azt 4 szintig hozza (a gyerek tartója κ = 0,5 eséllyel a
//       szülőé is — aki egy gyerekre pontot tesz, gyakran a felmenőire is)
//   F — egy „mindent” tartó (D83/2) a kötések között — a kis, családi koinó esete: minden kérelem egy körben megjön
//   G — D + a tartó MAGA jár be legjobb-először, amit tud: X alatt a legjobb 50 csomópont a saját tudásából (egy
//       csomópont gyerekeit akkor ismeri, ha a szeletét tartja) — egy kérelemre több szint
//   H — F + G: a „mindent” tartó maga jár be
//
// Magvas véletlen — összevethető. ⚠️ NEM ÖNPRÓBA (számokat ad).
//   node koino/meres/bejaroMeres.js [N ...]          (alap: 2000 20000 200000)

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

function poisson(v, lambda) {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= v(); } while (p > L);
  return k - 1;
}

// ===== A FA =====
function faEpitese(N, v, { rho = 0.02, alfa = 1.2 } = {}) {
  const szulo = new Int32Array(N).fill(-1);
  const gyerekek = Array.from({ length: N }, () => []);
  const jegyek = [];                       // előnyben részesítő kapcsolódás: (gyerekszám + 1) jegy csomópontonként
  for (let i = 0; i < N; i++) {
    if (i > 0 && v() >= rho) {
      const p = jegyek[Math.floor(v() * jegyek.length)];
      szulo[i] = p;
      gyerekek[p].push(i);
      jegyek.push(p);
    }
    jegyek.push(i);
  }
  const sajat = new Float64Array(N);
  for (let i = 0; i < N; i++) sajat[i] = Math.max(1, Math.floor(1 / Math.pow(1 - v(), 1 / alfa)));
  const ossz = Float64Array.from(sajat);
  for (let i = N - 1; i >= 0; i--) if (szulo[i] >= 0) ossz[szulo[i]] += ossz[i];   // a gyerek indexe > a szülőé
  for (const g of gyerekek) g.sort((a, b) => ossz[b] - ossz[a] || a - b);
  const gyokerek = [];
  for (let i = 0; i < N; i++) if (szulo[i] < 0) gyokerek.push(i);
  gyokerek.sort((a, b) => ossz[b] - ossz[a] || a - b);
  return { N, szulo, gyerekek, ossz, gyokerek };
}

/** Az igazi sorrend (a teljes fa ismeretében) — a mérce. */
function igaziElsoB(fa, B) {
  const ki = [];
  const sor = [...fa.gyokerek];
  // egyszerű legjobb-először a teljes fán (bináris kupac helyett rendezett beszúrás elég kis B-re)
  const kupac = new KupacMax(fa.ossz);
  for (const g of sor) kupac.betesz(g);
  while (ki.length < B && kupac.meret()) {
    const x = kupac.kivesz();
    ki.push(x);
    for (const g of fa.gyerekek[x]) kupac.betesz(g);
  }
  return ki;
}

class KupacMax {
  constructor(kulcs) { this.k = kulcs; this.a = []; }
  meret() { return this.a.length; }
  nagyobb(i, j) { const x = this.a[i], y = this.a[j]; return this.k[x] > this.k[y] || (this.k[x] === this.k[y] && x < y); }
  betesz(x) {
    const a = this.a; a.push(x);
    let i = a.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (!this.nagyobb(i, p)) break; [a[i], a[p]] = [a[p], a[i]]; i = p; }
  }
  csucs() { return this.a[0]; }
  kivesz() {
    const a = this.a; const t = a[0]; const u = a.pop();
    if (a.length) {
      a[0] = u; let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < a.length && this.nagyobb(l, m)) m = l;
        if (r < a.length && this.nagyobb(r, m)) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]]; i = m;
      }
    }
    return t;
  }
  elsoK(k) {                              // a k legnagyobb (rendezve), a kupac érintése nélkül
    const tmp = new KupacMax(this.k); tmp.a = [...this.a];
    const ki = [];
    while (ki.length < k && tmp.meret()) ki.push(tmp.kivesz());
    return ki;
  }
}

// ===== A TARTÓK =====
function tartokEpitese(fa, v, { f = 0.3 } = {}) {
  const M = Math.max(20, Math.floor(fa.N / 5));
  const kozvetlen = new Uint8Array(M);
  for (let d = 0; d < M; d++) kozvetlen[d] = v() < f ? 1 : 0;
  // ⭐ Aki egy gyerekre pontot tesz, gyakran a felmenőire is (a `TudatpontModal` felajánlja — „hiányzó felmenők”): egy
  // tartó κ = 0,5 eséllyel a szülő tartói közül való. (A gyerek indexe nagyobb a szülőénél — a sorrend megengedi.)
  const tartok = new Array(fa.N);
  for (let i = 0; i < fa.N; i++) {
    const db = 1 + poisson(v, 2);
    const t = new Set();
    const sz = fa.szulo[i] >= 0 ? tartok[fa.szulo[i]] : null;
    let probak = 0;
    while (t.size < Math.min(db, M) && probak++ < 50) {
      t.add(sz && v() < 0.5 ? sz[Math.floor(v() * sz.length)] : Math.floor(v() * M));
    }
    tartok[i] = [...t];
  }
  return { M, kozvetlen, tartok };
}

// ===== A BEJÁRÓ A SZIMULÁLT HÁLÓZATON =====
const FEJLEC_KORLAT = 50;
const GYOKER = -1;

/**
 * @returns {{perc: number|null, kerelmek: number, kb: number, kiadott: number[]}} a B-edik kiadásig (vagy a korlátig)
 */
function bejaras(fa, tart, v, { B, T, Q, C, gyerekszam, folytatas, pOn = 0.7, natKes = 20, korlat = 3000,
  mely = false, mindent = false, legjobbK = false }) {
  // a csomópont ismert gyerekei (a fejléc-válaszokból) és hogy hány gyerekét láttuk eddig
  const ismertGyerek = new Map();          // x → szám (hányat ismerünk a rendezett listából)
  const kibontva = new Set();              // aminek a gyerekeit (a szükséges mélységig) ismerjük
  const kupac = new KupacMax(fa.ossz);
  const kiadott = [];
  const nyitottak = new Set();             // kiadott, de a gyerekei még nincsenek meg (és kérni kell)
  const fuggo = new Map();                 // kulcs ('x' vagy 'x+n') → { x, tol, tarto, kesz }
  let kerelmek = 0, bajt = 0;
  const gyerekei = (x) => (x === GYOKER ? fa.gyokerek : fa.gyerekek[x]);
  // ⭐ G, H: a tartó MAGA járja be legjobb-először, amit tud — X alatt a legjobb 50 csomópont a saját tudásából (egy
  // csomópont gyerekeit akkor ismeri, ha a szeletét tartja: a születések oda vannak bejelentve). Amit tart, azt a kérő
  // kibontottnak veheti (a gyerekei mind ott vannak a válaszban vagy a sorban).
  const tartjaE = (tarto, y) => tarto === 'kotes' || tart.tartok[y].includes(tarto);
  const legjobbValasz = (x, tarto) => {
    const sajat = new KupacMax(fa.ossz);
    for (const y of gyerekei(x)) sajat.betesz(y);
    ismertGyerek.set(x, gyerekei(x).length);
    let db = 0;
    while (db < FEJLEC_KORLAT && sajat.meret()) {
      const y = sajat.kivesz();
      kupac.betesz(y); db++;
      if (tartjaE(tarto, y) && !kibontva.has(y)) {
        for (const z of fa.gyerekek[y]) sajat.betesz(z);
        ismertGyerek.set(y, fa.gyerekek[y].length);
        kibontva.add(y); nyitottak.delete(y);
      }
    }
    // ⚠️ ami a saját sorában maradt (a legjobb 50 után), azt nem küldi — a kérő a szülő kibontásakor kéri újra, ha kell
    while (sajat.meret()) {
      const y = sajat.kivesz();
      const sz = fa.szulo[y];
      if (sz >= 0 && kibontva.has(sz)) { kibontva.delete(sz); ismertGyerek.set(sz, 0); }
    }
    bajt += 512 * db + 5120;
    return db;
  };
  const valasz = (x, tol, tarto = null, melyseg = 0) => {   // egy fejléc-válasz: a következő legfeljebb 50 gyerek
    if (legjobbK && tarto !== null && tol === 0) return legjobbValasz(x, tarto);
    const g = gyerekei(x);
    const uj = g.slice(tol, tol + FEJLEC_KORLAT);
    for (const y of uj) kupac.betesz(y);
    ismertGyerek.set(x, tol + uj.length);
    bajt += 512 * uj.length + (melyseg === 0 ? 5120 : 0);
    // ⭐ E: a tartó MÉLYEN felel — azoknak a gyerekeknek a gyerekeit is hozza (4 szintig), amiket maga is tart.
    if (mely && tarto !== null && tarto !== 'kotes' && melyseg < 4) {
      for (const y of uj) {
        if (!kibontva.has(y) && tart.tartok[y].includes(tarto)) {
          valasz(y, 0, tarto, melyseg + 1);
          kibontva.add(y);
          nyitottak.delete(y);
        }
      }
    }
    return uj.length;
  };
  // A gyerekszám bemondva (C, D): a levelet nem kell megkérdezni.
  const kellKerni = (x) => !(gyerekszam && x !== GYOKER && fa.gyerekek[x].length === 0);
  const kerelmetIndit = (x, tol, kor) => {
    const kulcs = x + '+' + tol;
    if (fuggo.has(kulcs)) return;
    const tartok = x === GYOKER || mindent ? null : tart.tartok[x];
    const tarto = tartok ? tartok[Math.floor(v() * tartok.length)] : 'kotes';
    const nat = tarto !== 'kotes' && !tart.kozvetlen[tarto];
    fuggo.set(kulcs, { x, tol, tarto, kesz: kor + (nat ? Math.ceil((v() * natKes) / T) : 0) });
    kerelmek++;
  };

  // A folytatás (`utan`): ha egy csomópont utolsó ismert gyereke már KIADVA, a következő (az 51.) is jöhet a sorban — az
  // össz-pontja ≤ az utolsóé, de nagyobb lehet a sor többi tagjánál. Addig nem adhatunk ki semmit (BLOKKOL); és ha az
  // utolsó ismert gyerek a sor elején áll, előre kérjük (ELŐRE).
  const kiadottHalmaz = new Set();
  const folytatasKell = (x, eloreIs) => {
    if (!folytatas) return false;
    const n = ismertGyerek.get(x) ?? 0;
    const g = gyerekei(x);
    if (n === 0 || n >= g.length) return false;
    const utolso = g[n - 1];
    return kiadottHalmaz.has(utolso) || (eloreIs && eloreHalmaz.has(utolso));
  };
  let eloreHalmaz = new Set();

  kerelmetIndit(GYOKER, 0, 0);
  for (let kor = 0; kor <= korlat; kor++) {
    // ----- a kör: a függő kérelmek, tartónként legfeljebb Q -----
    const tartonkent = new Map();
    for (const [kulcs, k] of fuggo) {
      if (k.kesz > kor) continue;
      if (k.tarto !== 'kotes' && v() >= pOn) {           // nem él: a következő körben egy másik tartónál
        const t = tart.tartok[k.x];
        k.tarto = t[Math.floor(v() * t.length)];
        if (!tart.kozvetlen[k.tarto]) k.kesz = kor + 1 + Math.ceil((v() * natKes) / T);
        continue;
      }
      const db = tartonkent.get(k.tarto) ?? 0;
      if (db >= Q) continue;
      tartonkent.set(k.tarto, db + 1);
      fuggo.delete(kulcs);
      valasz(k.x, k.tol, k.tarto);
      if (k.tol === 0) { kibontva.add(k.x); nyitottak.delete(k.x); }
    }
    // ----- a kiadás: amíg a sor elején álló ismert, és a már kiadottak gyerekei megvannak -----
    for (;;) {
      if (kiadott.length >= B) return { perc: kor * T, kerelmek, kb: bajt / 1024, kiadott };
      // amíg egy kiadott csomópont gyerekei hiányoznak (és kérni kell), nem tudhatjuk, ki a következő
      if (!kibontva.has(GYOKER) || nyitottak.size) break;
      // a folytatás: ha egy kiadott csomópont (vagy a gyökér) 50 utáni gyerekei is kellhetnek — megvárjuk
      const folyt = [GYOKER, ...kiadott].find((x) => folytatasKell(x, false));
      if (folyt !== undefined) {
        if (!fuggo.has(folyt + '+' + ismertGyerek.get(folyt))) kerelmetIndit(folyt, ismertGyerek.get(folyt), kor + 1);
        break;
      }
      if (!kupac.meret()) return { perc: kor * T, kerelmek, kb: bajt / 1024, kiadott };
      const x = kupac.kivesz();
      kiadott.push(x);
      kiadottHalmaz.add(x);
      if (kellKerni(x) && !kibontva.has(x)) nyitottak.add(x);
    }
    // ----- előre kérés: a kiadottak közül a ki nem bontottak, a folytatások, aztán a sor elején állók, a függő-korlátig -----
    const elore = kupac.elsoK(C);
    eloreHalmaz = new Set(elore);
    const jeloltek = [...nyitottak];
    for (const x of [GYOKER, ...kiadott]) if (folytatasKell(x, true)) jeloltek.push(x);
    for (const x of elore) if (kellKerni(x) && !kibontva.has(x)) jeloltek.push(x);
    for (const x of jeloltek) {
      if (fuggo.size >= C) break;
      const tol = kibontva.has(x) ? ismertGyerek.get(x) : 0;
      if (!fuggo.has(x + '+' + tol)) kerelmetIndit(x, tol, kor + 1);
    }
  }
  return { perc: null, kerelmek, kb: bajt / 1024, kiadott };
}

// ===== A FUTTATÁS =====
const meretek = process.argv.slice(2).map((x) => parseInt(x, 10)).filter((x) => x > 0);
const NK = meretek.length ? meretek : [2000, 20000, 200000];
const VALTOZATOK = [
  { nev: 'A — ma (Q=1, C=16, a levelet is kérdezi)', Q: 1, C: 16, gyerekszam: false },
  { nev: 'B — több kérelem egy kapcsolaton', Q: 16, C: 16, gyerekszam: false },
  { nev: 'C — B + a fejléc mondja a gyerekszámot', Q: 16, C: 16, gyerekszam: true },
  { nev: 'D — C + bővebb függő-korlát (C=64)', Q: 64, C: 64, gyerekszam: true },
  { nev: 'E — D + a tartó mélyen felel (amit tart, ≤4 szint)', Q: 64, C: 64, gyerekszam: true, mely: true },
  { nev: 'F — egy „mindent” tartó a kötések között', Q: 64, C: 64, gyerekszam: true, mindent: true },
  { nev: 'G — D + a tartó maga jár be (a legjobb 50, amit tud)', Q: 64, C: 64, gyerekszam: true, legjobbK: true },
  { nev: 'H — F + G (a „mindent” tartó maga jár be)', Q: 64, C: 64, gyerekszam: true, mindent: true, legjobbK: true }
];
const CELOK = [20, 200, 500, 2000];
const ISMETLES = 3;

kiir('74. MÉRÉS — a legjobb-először bejáró ára a szigorú (b) alatt (szimuláció, magvas véletlen; ' + ISMETLES + ' ismétlés átlaga)');
kiir('f = 0,3 közvetlen · p_on = 0,7 · NAT: kopogtatás ≤ 20 perc · a fejléc ≤ 50 gyerek; a perc a kör végéig számol\n');

for (const N of NK) {
  const v0 = veletlenGyar(74000 + N);
  const fa = faEpitese(N, v0);
  const tart = tartokEpitese(fa, v0);
  const levelek = fa.gyerekek.filter((g) => g.length === 0).length;
  const nagyCsalad = fa.gyerekek.filter((g) => g.length > FEJLEC_KORLAT).length;
  kiir('━━ N = ' + N + ' entitás · ' + fa.gyokerek.length + ' gyökér · levél ' + Math.round((100 * levelek) / N) + '% · '
    + nagyCsalad + ' csomópontnak van 50-nél több gyereke · ' + tart.M + ' készülék');

  // a folytatás hiánya: az igazi első B-ből hány marad ki, ha csak az első 50 gyerek kérhető?
  const hiany = [];
  for (const B of CELOK) {
    if (B > N) continue;
    const igazi = igaziElsoB(fa, B);
    const csak50 = bejaras(fa, tart, veletlenGyar(1), { B, T: 1, Q: 1e9, C: 1e9, gyerekszam: true, folytatas: false, pOn: 1, natKes: 0 });
    const kaptuk = new Set(csak50.kiadott);
    hiany.push('B=' + B + ': ' + igazi.filter((x) => !kaptuk.has(x)).length + ' kimarad');
  }
  kiir('  folytatás nélkül (az igazi első B-ből): ' + hiany.join(' · '));

  for (const T of [1, 5]) {
    kiir('  ── T = ' + T + ' perces őrjárat-kör');
    for (const val of VALTOZATOK) {
      const sorok = [];
      for (const B of CELOK) {
        if (B > N) continue;
        let perc = 0, ker = 0, kb = 0, nincs = 0;
        for (let i = 0; i < ISMETLES; i++) {
          const r = bejaras(fa, tart, veletlenGyar(500 + i * 31 + B), { B, T, Q: val.Q, C: val.C, gyerekszam: val.gyerekszam,
            folytatas: true, mely: !!val.mely, mindent: !!val.mindent, legjobbK: !!val.legjobbK });
          if (r.perc === null) nincs++;
          perc += r.perc ?? 0; ker += r.kerelmek; kb += r.kb;
        }
        const n = ISMETLES - nincs;
        sorok.push((B === 20 ? 'oldal' : 'B=' + B) + ': ' + (n ? Math.round(perc / n) + ' perc' : '—') + ', '
          + Math.round(ker / ISMETLES) + ' kér., ' + Math.round(kb / ISMETLES) + ' KB' + (nincs ? ' (' + nincs + ' nem ért véget)' : ''));
      }
      kiir('    ' + val.nev.padEnd(46) + sorok.join(' · '));
    }
  }
  kiir('');
}
