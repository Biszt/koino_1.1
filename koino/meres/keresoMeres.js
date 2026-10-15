// koino/meres/keresoMeres.js
// Felelősség: A 75. MÉRÉS — A KERESŐ-RÉTEG ÁRA (D105, K6: „előbb mérés”) — szimuláció.
//
// A kérdések (a D105 döntései és a 2026-10-15-i átnézés szerint):
//   1. ⭐ K7 — A GYAKORI SZAVAK: egy szó minden bejegyzése egy fiókba esik. Mekkora a legnagyobb fiók, és mennyit tart egy
//      készülék (átlag · 99% · a legtöbb) a fiók osztódása NÉLKÜL és VELE, N = 10^4 · 10^5 · 10^6 gondolatnál?
//   2. K2 — a kulcs: (A) egész szó · (C) egész szó + az első négy betű. Mennyi bejegyzés lesz belőle, és ha a tőre keresnek
//      („park”), a toldalékos alakok („parkban”, „parkok”) közül mennyi jön meg?
//   3. A tartók: hány készülék tart egy régiót, mekkora eséllyel felel valaki, és mikor jön az első válasz?
//   4. K3 — a tagság ellenőrzése a tartónál (a két tulajdonos tagsági bizonyítéka, szerzőnként gyorsítótárazva): hány bájt
//      egy felajánlás?
//   5. K4–K5 — a felajánlás és a 30 napos megújítás forgalma készülékenként.
//
// A MODELL:
//   · A CÍMEK: 2 + Binomiális(6; 0,5) szó (átlag 5). Egy szó 20% eséllyel rövid (1–2 jel — „a”, „az”, „és” —, nem kerül
//     indexbe), ~4,7% eséllyel GYAKORI SZÓ, a prózai arány felével (a koino_1.1 magyar dokumentációjából mérve, 2026-10-15,
//     250 ezer szó: „nem” 2,14% · „egy” 1,13% · „csak” 0,59% … — a cím a prózánál tömörebb; `--prozai`: a teljes arány és
//     30% rövid szó), különben TARTALMI szó: tő (Zipf–Mandelbrot, s = 1, q = 10, V = 500 000 — a leggyakoribb tő a tartalmi
//     szavak ~0,75%-a) + toldalék (45% nincs; a többi a gyakori ragok és képzők közül). A tő szótagokból áll, 15%-a
//     igekötővel kezdődik (meg-, el-, ki-, be- …) — ettől osztoznak a szóelejeken.
//   · A KULCSOK: (A) minden ≥ 3 jeles szó egészében · (C) a 3 és a ≥ 5 jeles szó egészében, a ≥ 4 jeles az első négy betűje
//     alatt is (a négyjeles csak így: a szóeleje-fiók a szűrővel ugyanazt adja). Egy fiók = a kulcsot tartalmazó címek.
//   · A RÉGIÓK (a gyökér-darab mintája — D95/4): a kulcs lenyomata egy pontot jelöl; m mélységen 2^m régió, m úgy, hogy egy
//     régióba ~T = 512 bejegyzés essen; egy készülék (M = N / 10 — fejenként 10 gondolat) a saját pontja körüli régiót
//     tartja, a ±1 szint legszélesebbjén (m − 1: ~2T bejegyzés).
//   · ⭐ K7 — AZ OSZTÓDÁS: a B = 256-nál nagyobb fiók 2^s darabra oszlik (a gondolat lenyomata szerint, s = ⌈log2(n / B)⌉),
//     a darabok más-más régióba esnek; a kérdező egy osztódott fiókból k = 1 darabot kérdez (mintát kap).
//   · A KÉSÉS (a 74. mérés modellje): a tartó körönként 70% eséllyel él, 30% eséllyel közvetlenül elérhető (egy kör),
//     különben NAT mögött van: a kérést a kopogtató témáján látja (≤ 20 perc), utána egy kör; a kérdező a DHT-n legfeljebb
//     8 tartót talál, és mindet kérdezi.
//   · AZ ÁRAK: DHT-keresés ~3 KB, bejelentés (a kopogtatás) ~9 KB, egy téma hirdetése ~0,65 MB/nap (58. mérés); egy
//     bejegyzés (a létrehozó esemény) ~0,6 KB; a tagsági bizonyíték ~1,23 KB lépésenként, a lánc log_2,9(M) lépés (63.
//     mérés: egymillió tagnál ~13 lépés, ~16 KB). Az indexbe a gondolatok fele kerül (a K3: legalább két tag-tulajdonos).
//
// Magvas véletlen — összevethető. ⚠️ NEM ÖNPRÓBA (számokat ad).
//   node koino/meres/keresoMeres.js [N ...] [--prozai] [--B=256] [--T=512]   (alap: 10000 100000 1000000)

const kiir = (s) => process.stdout.write(s + '\n');

// ===== A VÉLETLEN ÉS A LENYOMAT =====

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

/** 32 bites keverés (a murmur3 záró lépése) — a szimulációban a kulcs és a készülék „lenyomata”. */
function kever(x) {
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
}

// ===== A SZAVAK =====

// A gyakori (3+ jeles) szavak és a prózai arányuk (a tokenek %-a) — a koino_1.1 dokumentációjából mérve, 2026-10-15.
const GYAKORI = [['nem', 2.14], ['egy', 1.13], ['csak', 0.59], ['két', 0.45], ['kell', 0.45], ['hogy', 0.44], ['meg', 0.34],
  ['nincs', 0.33], ['van', 0.32], ['amit', 0.31], ['ami', 0.29], ['minden', 0.28], ['saját', 0.28], ['hanem', 0.24],
  ['tehát', 0.20], ['már', 0.20], ['azt', 0.18], ['volt', 0.18], ['mint', 0.18], ['mert', 0.18], ['külön', 0.18],
  ['ezt', 0.17], ['szerint', 0.17]];
const GYAKORI_OSSZES = GYAKORI.reduce((s, [, p]) => s + p, 0) / 100;

const TOLDALEKOK = [['ok', 6], ['ek', 4], ['ak', 3], ['t', 4], ['ot', 2], ['et', 3], ['ban', 3], ['ben', 2], ['ba', 1.5],
  ['be', 1.5], ['ra', 2], ['re', 1.5], ['nak', 2], ['nek', 2], ['val', 1.5], ['vel', 1], ['ról', 1], ['ről', 1], ['ból', 1],
  ['ből', 1], ['hoz', 1], ['hez', 1], ['i', 3], ['ás', 2], ['és', 2], ['ni', 2], ['ság', 1], ['ség', 1], ['ként', 0.5],
  ['ért', 0.5], ['ja', 2], ['je', 2], ['ai', 1], ['ei', 1], ['kat', 1], ['ket', 1]];
const TOLDALEK_ARANY = 0.55;
const MASSZ = ['b', 'c', 'cs', 'd', 'f', 'g', 'gy', 'h', 'j', 'k', 'l', 'm', 'n', 'ny', 'p', 'r', 's', 'sz', 't', 'v', 'z', 'zs'];
const MAGAN = ['a', 'á', 'e', 'é', 'i', 'í', 'o', 'ó', 'ö', 'ő', 'u', 'ú', 'ü', 'ű'];
const IGEKOTOK = [['meg', 30], ['el', 15], ['ki', 12], ['be', 10], ['fel', 8], ['le', 8], ['át', 6], ['össze', 4],
  ['vissza', 3], ['rá', 2], ['szét', 2]];

const V = 500000;        // a tövek száma
const Q_MANDELBROT = 10;

/** Súlyozott választó: [[érték, súly], …] → () → érték. */
function valaszto(lista, v) {
  const ossz = lista.reduce((s, [, w]) => s + w, 0);
  const kum = [];
  let a = 0;
  for (const [, w] of lista) { a += w / ossz; kum.push(a); }
  return () => {
    const u = v();
    let i = 0;
    while (i < kum.length - 1 && u > kum[i]) i++;
    return i;
  };
}

/** Egy tő (a rangjából, determinisztikusan): 1–4 szótag, 15% eséllyel igekötővel. */
const toTar = new Map();
function to(r) {
  let t = toTar.get(r);
  if (t !== undefined) return t;
  const v = veletlenGyar(kever(r * 2654435761));
  const u = v();
  const szotag = u < 0.2 ? 1 : u < 0.7 ? 2 : u < 0.95 ? 3 : 4;
  t = '';
  for (let i = 0; i < szotag; i++) {
    if (i === 0 ? v() < 0.85 : true) t += MASSZ[Math.floor(v() * MASSZ.length)];
    t += MAGAN[Math.floor(v() * MAGAN.length)];
    if (v() < 0.4) t += MASSZ[Math.floor(v() * MASSZ.length)];
  }
  if (v() < 0.15) {
    const ossz = IGEKOTOK.reduce((s, [, w]) => s + w, 0);
    let x = v() * ossz;
    for (const [ik, w] of IGEKOTOK) { x -= w; if (x <= 0) { t = ik + t; break; } }
  }
  toTar.set(r, t);
  return t;
}

/** Zipf–Mandelbrot (s = 1) rang a folytonos közelítés inverzéből: P(R ≤ r) ≈ ln((r+q)/(1+q)) / ln((V+q)/(1+q)). */
function tartalmiRang(v) {
  const r = Math.floor((1 + Q_MANDELBROT) * Math.pow((V + Q_MANDELBROT) / (1 + Q_MANDELBROT), v()) - Q_MANDELBROT);
  return Math.min(V, Math.max(1, r));
}

// ===== A CÍMEK ÉS A FIÓKOK =====

/**
 * N cím, és a fiókok mérete (hány cím tartalmazza a kulcsot): (A) egész szó · (C) egész szó (3 és ≥ 5 jel) + az első négy
 * betű (≥ 4 jel). A kulcsok számmal: tartalmi szó = rang × 64 + toldalék (0: nincs), gyakori szó = −(index + 1); a szóeleje
 * egy belső számra képezve.
 */
function cimekEpitese(N, { prozai = false, mag = 75 } = {}) {
  const v = veletlenGyar(mag);
  const rovid = prozai ? 0.30 : 0.20;
  const gyakori = prozai ? GYAKORI_OSSZES : GYAKORI_OSSZES / 2;
  const gyakoriValaszto = valaszto(GYAKORI, v);
  const toldalekValaszto = valaszto(TOLDALEKOK, v);
  const egeszA = new Map();     // kulcs → hány cím
  const egeszC = new Map();
  const elotag = new Map();     // szóeleje-szám → hány cím
  const elotagSzam = new Map(); // szóeleje szövege → szám
  const toCimek = new Map();    // tő rangja → hány cím tartalmazza (bármilyen toldalékkal)
  const minta = [];             // az első 20 000 cím kulcsai (a felajánláshoz és a több szavas kérdéshez)
  let kulcsA = 0, kulcsC = 0, tartalmiTokenek = 0;
  const tartalmi = [];          // tartalmi tokenek mintája (a kérdésekhez): [rang, toldalék]
  const nov = (m, k) => m.set(k, (m.get(k) ?? 0) + 1);
  for (let c = 0; c < N; c++) {
    let L = 2;
    for (let i = 0; i < 6; i++) if (v() < 0.5) L++;
    const kA = new Set(), kC = new Set(), kP = new Set(), tovek = new Set();
    const szavak = [];
    for (let i = 0; i < L; i++) {
      const u = v();
      if (u < rovid) continue;
      let szo, id, rang = 0, tol = 0;
      if (u < rovid + gyakori) {
        const g = gyakoriValaszto();
        szo = GYAKORI[g][0];
        id = -(g + 1);
      } else {
        rang = tartalmiRang(v);
        tol = v() < TOLDALEK_ARANY ? 1 + toldalekValaszto() : 0;
        szo = to(rang) + (tol ? TOLDALEKOK[tol - 1][0] : '');
        id = rang * 64 + tol;
        tartalmiTokenek++;
        if (tartalmi.length < 200000) tartalmi.push([rang, tol]);
        else if (v() < 0.01) tartalmi[Math.floor(v() * tartalmi.length)] = [rang, tol];
      }
      if (szo.length < 3) continue;
      kA.add(id);
      if (szo.length !== 4) kC.add(id);
      if (szo.length >= 4) {
        const e = szo.slice(0, 4);
        let p = elotagSzam.get(e);
        if (p === undefined) { p = elotagSzam.size; elotagSzam.set(e, p); }
        kP.add(p);
      }
      if (rang) tovek.add(rang);
      szavak.push({ id, rang, tol, szo });
    }
    for (const k of kA) nov(egeszA, k);
    for (const k of kC) nov(egeszC, k);
    for (const k of kP) nov(elotag, k);
    for (const r of tovek) nov(toCimek, r);
    kulcsA += kA.size;
    kulcsC += kC.size + kP.size;
    if (minta.length < 20000) minta.push({ cim: c, kC: [...kC], kP: [...kP], szavak });
  }
  return { N, egeszA, egeszC, elotag, elotagSzam, toCimek, minta, tartalmi, kulcsA, kulcsC, tartalmiTokenek };
}

// ===== A RÉGIÓK ÉS AZ OSZTÓDÁS =====

const SO_EGESZ = 0x9e3779b9, SO_ELOTAG = 0x7f4a7c15;
const regioPontja = (kulcs, so) => kever((kulcs | 0) ^ so ^ kever((kulcs / 4294967296) | 0));
const darabPontja = (alap, s, j) => kever(alap ^ kever((s << 24) ^ j ^ 0x2545f491));

/**
 * A régiók terhe: minden fiók (vagy, ha osztódik, minden darabja) a lenyomata szerinti m mélységű régióba. A darabok mérete
 * a fiók egyenletes felosztása (a gondolat lenyomata szerint — várhatóan egyenlő).
 */
function regioTerhe(fiokok, m, osztodas, B) {
  const R = 2 ** m;
  const teher = new Float64Array(R);
  const eltol = 32 - m;
  for (const { meret, pont } of fiokok) {
    if (!osztodas || meret <= B) { teher[m ? pont >>> eltol : 0] += meret; continue; }
    const s = Math.ceil(Math.log2(meret / B));
    const n = 2 ** s;
    for (let j = 0; j < n; j++) {
      const p = darabPontja(pont, s, j);
      teher[m ? p >>> eltol : 0] += meret / n;
    }
  }
  return teher;
}

function fiokLista(e, mod) {
  const ki = [];
  if (mod === 'A') for (const [k, n] of e.egeszA) ki.push({ meret: n, pont: regioPontja(k, SO_EGESZ) });
  else {
    for (const [k, n] of e.egeszC) ki.push({ meret: n, pont: regioPontja(k, SO_EGESZ) });
    for (const [k, n] of e.elotag) ki.push({ meret: n, pont: regioPontja(k, SO_ELOTAG) });
  }
  return ki;
}

const szazalekos = (rendezett, p) => rendezett[Math.min(rendezett.length - 1, Math.floor(p * rendezett.length))];

/**
 * Egy készülék terhe: M készülék egyenletes pontokon; mindegyik a saját (m − 1) mélységű régióját tartja (a ±1
 * legszélesebbje) — két m mélységű szomszéd együtt. Az eredmény: átlag, 99%, a legtöbb, és a tartók száma régiónként.
 */
function keszulekTerhe(teher, m, M, v) {
  const fel = Math.max(m - 1, 0);
  const R1 = 2 ** fel;
  const regio1 = new Float64Array(R1);
  for (let i = 0; i < teher.length; i++) regio1[m ? i >> 1 : 0] += teher[i];
  const tartok = new Int32Array(R1);
  const terhek = [];
  for (let d = 0; d < M; d++) {
    const r = Math.floor(v() * R1);
    tartok[r]++;
    terhek.push(regio1[r]);
  }
  terhek.sort((a, b) => a - b);
  // Az árva bejegyzések: amelyik régiónak nincs tartója.
  let arva = 0, osszes = 0;
  for (let r = 0; r < R1; r++) { osszes += regio1[r]; if (!tartok[r]) arva += regio1[r]; }
  const t = [...tartok].sort((a, b) => a - b);
  return {
    atlag: terhek.reduce((s, x) => s + x, 0) / M, p99: szazalekos(terhek, 0.99), legtobb: terhek[terhek.length - 1],
    tartokAtlag: M / R1, tartokP1: szazalekos(t, 0.01), urest: t.filter((x) => x === 0).length / R1,
    arva: osszes ? arva / osszes : 0, tartok
  };
}

// ===== A KÉRDÉSEK (K2 + K7) =====

/**
 * A tőre keresés (a kérdező a tövet írja be — „park”): mennyi jön meg a tővel kezdődő szavú címekből? (A) csak a pontos
 * alak fiókja; (C) a ≥ 4 jeles tőnél a szóeleje-fiók (az őrző a tőre szűr) és a pontos alak. Osztódott fiókból k darab
 * jön (minta). A tő-találatok „igazsága” a tő címeinek száma (a véletlen tövek ritkán előtagjai egymásnak — elhanyagolva).
 */
function tokeresesek(e, { B = 256, k = 1, kerdes = 20000, mag = 7501 } = {}) {
  const v = veletlenGyar(mag);
  const resz = (meret) => (meret <= B ? 1 : Math.min(1, k / 2 ** Math.ceil(Math.log2(meret / B))));
  const eredmeny = { A: [], C: [], hasznosA: 0, hasznosC: 0, rovidTo: 0, n: 0 };
  for (let i = 0; i < kerdes; i++) {
    const [rang] = e.tartalmi[Math.floor(v() * e.tartalmi.length)];
    const q = to(rang);
    if (q.length < 3) continue;
    const igaz = e.toCimek.get(rang) ?? 0;
    if (!igaz) continue;
    eredmeny.n++;
    const pontos = e.egeszA.get(rang * 64) ?? 0;
    const jottA = pontos * resz(pontos);
    let jottC;
    if (q.length === 3) { jottC = jottA; eredmeny.rovidTo++; } else {
      const p = e.elotag.get(e.elotagSzam.get(q.slice(0, 4))) ?? igaz;
      const pontosC = q.length === 4 ? 0 : (e.egeszC.get(rang * 64) ?? 0);
      const pontosJott = pontosC * resz(pontosC);
      jottC = Math.min(igaz, pontosJott + (igaz - pontosJott) * resz(p));
    }
    eredmeny.A.push(jottA / igaz);
    eredmeny.C.push(jottC / igaz);
    const kell = Math.min(10, igaz);
    if (jottA >= kell - 1e-9) eredmeny.hasznosA++;
    if (jottC >= kell - 1e-9) eredmeny.hasznosC++;
  }
  return eredmeny;
}

/** Két szavas kérdés (egy valódi cím két tartalmi szava): a ritkább szó fiókja kicsi-e (≤ B — teljes válasz egy helyről)? */
function ketSzavas(e, { B = 256, mag = 7502 } = {}) {
  const v = veletlenGyar(mag);
  let n = 0, teljes = 0;
  const meretek = [];
  for (let i = 0; i < 20000; i++) {
    const c = e.minta[Math.floor(v() * e.minta.length)];
    const sz = c.szavak.filter((x) => x.rang && x.szo.length >= 3);
    if (sz.length < 2) continue;
    const a = sz[Math.floor(v() * sz.length)];
    let b = sz[Math.floor(v() * sz.length)];
    if (a === b) b = sz[(sz.indexOf(a) + 1) % sz.length];
    const ritkabb = Math.min(e.egeszA.get(a.id) ?? 0, e.egeszA.get(b.id) ?? 0);
    n++;
    if (ritkabb <= B) teljes++;
    meretek.push(ritkabb);
  }
  meretek.sort((x, y) => x - y);
  return { n, teljes: teljes / n, median: szazalekos(meretek, 0.5), p90: szazalekos(meretek, 0.9) };
}

// ===== A KÉSÉS (a 74. mérés modellje) =====

function keses(tartok, { kor = 1, mag = 7503, kerdes = 20000 } = {}) {
  const v = veletlenGyar(mag);
  const idok = [];
  let soha = 0;
  for (let i = 0; i < kerdes; i++) {
    const H = Math.min(8, tartok[Math.floor(v() * tartok.length)]);
    if (!H) { soha++; continue; }
    const kozvetlen = Array.from({ length: H }, () => v() < 0.3);
    let ido = null;
    for (let menet = 0; menet < 12 && ido === null; menet++) {
      let legjobb = Infinity;
      for (let h = 0; h < H; h++) {
        if (v() >= 0.7) continue;
        const t = kozvetlen[h] ? kor : v() * 20 + kor;
        legjobb = Math.min(legjobb, t);
      }
      if (legjobb < Infinity) ido = menet * kor + legjobb;
    }
    if (ido === null) soha++; else idok.push(ido);
  }
  idok.sort((a, b) => a - b);
  return { median: szazalekos(idok, 0.5), p90: szazalekos(idok, 0.9), p99: szazalekos(idok, 0.99),
    soha: soha / kerdes };
}

// ===== A TAGSÁG GYORSÍTÓTÁRA (K3) =====

/**
 * A tartó tagság-gyorsítótára (LRU, C szerző — csak a jelző, hogy a tagság ellenőrzött, nem maga a bizonyíték): a régiója
 * E_r bejegyzést tart, mindegyiknek két tulajdonosa van (M tag közül, a tevékenység Zipf–Mandelbrot szerint); 30 naponként
 * minden bejegyzés megújul (újra felajánlják), és közben a 10%-uk új gondolatra cserélődik. A tagsági bizonyítékot a tartó
 * csak a nem ismert szerzőre kéri. Az eredmény: az első kitöltés hiánya, és az állandósult hiány egy 30 napos időszakban.
 */
function tagsagGyorsitotar(M, C, E_r, { mag = 7504, idoszak = 6, csere = 0.1 } = {}) {
  const v = veletlenGyar(mag);
  const szerzo = () => Math.min(M, Math.max(1, Math.floor((1 + 10) * Math.pow((M + 10) / 11, v()) - 10)));
  const bejegyzesek = Array.from({ length: E_r }, () => [szerzo(), szerzo()]);
  const lru = new Map();
  const hianyok = [];
  for (let p = 0; p < idoszak; p++) {
    if (p > 0) for (let i = 0; i < E_r * csere; i++) bejegyzesek[Math.floor(v() * E_r)] = [szerzo(), szerzo()];
    let hiany = 0;
    for (const par of bejegyzesek) {
      for (const s of par) {
        if (lru.has(s)) { lru.delete(s); lru.set(s, 1); continue; }
        hiany++;
        lru.set(s, 1);
        if (lru.size > C) lru.delete(lru.keys().next().value);
      }
    }
    hianyok.push(hiany);
  }
  const allando = hianyok.slice(1).reduce((s, x) => s + x, 0) / (idoszak - 1);
  return { elso: hianyok[0], allando, aranya: allando / (2 * E_r) };
}

// ===== A FUTTATÁS =====

const ervek = process.argv.slice(2);
const prozai = ervek.includes('--prozai');
const meretek = ervek.filter((x) => /^\d+$/.test(x)).map(Number);
const NEK = meretek.length ? meretek : [10000, 100000, 1000000];
const parameter = (nev, alap) => {
  const x = ervek.find((a) => a.startsWith('--' + nev + '='));
  const n = x ? Number(x.split('=')[1]) : NaN;
  return Number.isInteger(n) && n > 0 ? n : alap;
};
const T = parameter('T', 512), B = parameter('B', 256);
const KB = (x) => (x / 1024).toFixed(1).replace('.', ',') + ' KB';
const sz = (x, j = 0) => x.toFixed(j).replace('.', ',');
const pr = (x) => sz(100 * x, 1) + '%';

kiir('75. MÉRÉS — A KERESŐ-RÉTEG ÁRA (szimuláció)' + (prozai ? ' — prózai szóeloszlással' : ''));
kiir('T = ' + T + ' bejegyzés / régió (a készülék a ±1 legszélesebbjét, ~2T-t tartja), B = ' + B + ' (az osztódás küszöbe)');

for (const N of NEK) {
  const M = Math.max(10, Math.round(N / 10));
  const kezdet = Date.now();
  const e = cimekEpitese(N, { prozai });
  kiir('');
  kiir('===== N = ' + N.toLocaleString('hu-HU') + ' gondolat, M = ' + M.toLocaleString('hu-HU') + ' készülék ('
    + sz((Date.now() - kezdet) / 1000, 1) + ' mp) =====');
  kiir('  kulcs / cím: (A) ' + sz(e.kulcsA / N, 2) + ' · (C) ' + sz(e.kulcsC / N, 2) + ' · különböző fiók: (A) '
    + e.egeszA.size.toLocaleString('hu-HU') + ' · (C) ' + (e.egeszC.size + e.elotag.size).toLocaleString('hu-HU'));
  const legnagyobb = (m) => [...m.values()].reduce((a, b) => Math.max(a, b), 0);
  kiir('  a legnagyobb fiók: (A) ' + legnagyobb(e.egeszA).toLocaleString('hu-HU') + ' cím (' + pr(legnagyobb(e.egeszA) / N)
    + ') · (C) szóeleje ' + legnagyobb(e.elotag).toLocaleString('hu-HU') + ' (' + pr(legnagyobb(e.elotag) / N) + ')');

  const v = veletlenGyar(N + 1);
  for (const mod of ['A', 'C']) {
    const fiokok = fiokLista(e, mod);
    const E = fiokok.reduce((s, f) => s + f.meret, 0);
    const m = Math.max(0, Math.ceil(Math.log2(E / T)));
    for (const osztodas of [false, true]) {
      const teher = regioTerhe(fiokok, m, osztodas, B);
      const k = keszulekTerhe(teher, m, M, v);
      kiir('  (' + mod + ') ' + (osztodas ? 'OSZTÓDÁSSAL (K7)' : 'osztódás nélkül ') + ' — m = ' + m + ' · egy készülék tart: átlag '
        + sz(k.atlag) + ' · 99% ' + sz(k.p99) + ' · a legtöbb ' + sz(k.legtobb) + ' bejegyzés (' + KB(k.legtobb * 0.6 * 1024)
        + ') · tartó / régió: átlag ' + sz(k.tartokAtlag, 1) + ', az alsó 1% ' + k.tartokP1 + ', üres régió ' + pr(k.urest)
        + ' (árva bejegyzés ' + pr(k.arva) + ')');
      if (mod === 'C' && osztodas) {
        for (const kor of [1, 5]) {
          const ks = keses(k.tartok, { kor });
          kiir('      az első válasz (' + kor + ' perces kör): medián ' + sz(ks.median, 1) + ' · 90% ' + sz(ks.p90, 1) + ' · 99% '
            + sz(ks.p99, 1) + ' perc · nem felel senki (12 körön belül): ' + pr(ks.soha));
        }
        // A felajánlás: hány régió egy gondolatnál (a mintán, a K7 darabjaival).
        const eltol = 32 - m;
        const meretKulcs = (tip, kk) => (tip === 'E' ? e.egeszC.get(kk) : e.elotag.get(kk)) ?? 0;
        let regiok = 0, kulcsok = 0;
        for (const c of e.minta.slice(0, 5000)) {
          const rs = new Set();
          for (const [tip, lista] of [['E', c.kC], ['P', c.kP]]) {
            for (const kk of lista) {
              const pont = regioPontja(kk, tip === 'E' ? SO_EGESZ : SO_ELOTAG);
              const n = meretKulcs(tip, kk);
              const p = n > B ? darabPontja(pont, Math.ceil(Math.log2(n / B)), kever(c.cim) % 2 ** Math.ceil(Math.log2(n / B))) : pont;
              rs.add(m ? p >>> eltol : 0);
              kulcsok++;
            }
          }
          regiok += rs.size;
        }
        const rg = regiok / Math.min(5000, e.minta.length);
        const kg = kulcsok / Math.min(5000, e.minta.length);
        const lepes = Math.max(1, Math.log(M) / Math.log(2.9));
        const bizonyitek = 1.23 * 1024 * lepes;
        kiir('      a felajánlás: ' + sz(rg, 1) + ' régió, ' + sz(kg, 1) + ' bejegyzés gondolatonként → DHT + kopogtatás + bejegyzések ~'
          + KB(rg * 12 * 1024 + kg * 0.6 * 1024) + ' (felső becslés: a közvetlenül elérhető tartónál a kopogtatás elmarad)');
        // ⭐ K3: a tartó a régiója bejegyzéseinek tulajdonosait látja — 30 naponként ugyanazokat (a megújítás), és új
        // gondolatokat. A bizonyítékot csak a nem ismert szerzőre kéri.
        const E_r = Math.max(1, Math.round(k.atlag));
        const gy = {};
        for (const C of [1024, 4096, 16384]) {
          const g = gy[C] = tagsagGyorsitotar(M, C, E_r);
          kiir('        tagság a tartónál (gyorsítótár ' + C + ' szerző, a régió ' + E_r + ' bejegyzése): az első kitöltés '
            + g.elso + ' bizonyíték (~' + KB(g.elso * bizonyitek) + ', egyszer) · utána 30 naponként ' + sz(g.allando) + ' ('
            + pr(g.aranya) + ' — ~' + KB(g.allando * bizonyitek / 30) + '/nap) · a bizonyíték ~' + KB(bizonyitek) + ' ('
            + sz(lepes, 1) + ' lépés)');
        }
        // ⭐ A közös ősök: k véletlen tag láncának uniója egy b ≈ 2,9-es fában (D = log_b M szint) — a fa teteje közös:
        // ℓ szinten min(b^ℓ, k) különböző ős → összesen ~k·b/(b−1) + k·(D − log_b k) esemény (a 63. mérés lépésenként ~1,23 KB).
        {
          const b = 2.9, k0 = gy[4096].elso, D = lepes, lk = Math.log(k0) / Math.log(b);
          const unio = k0 * b / (b - 1) + k0 * Math.max(0, D - lk);
          kiir('        …a közös ősökkel (a fa teteje egyszer jön): az első kitöltés ~' + sz(unio) + ' lépés (~' + KB(unio * 1.23 * 1024)
            + ', a ' + KB(k0 * bizonyitek) + ' helyett); egy új szerző utána ~' + sz(Math.max(1, D - lk), 1) + ' lépés (~'
            + KB(Math.max(1, D - lk) * 1.23 * 1024) + ')');
        }
        // A megújítás (K5): a gondolatok fele indexelt, fejenként 10 — egy „soros” újít, 30 naponta.
        const sajatIndexelt = 10 * 0.5;
        const felaj = rg * 12 * 1024 + kg * 0.6 * 1024 + rg * 2 * gy[4096].aranya * bizonyitek;
        kiir('      a megújítás (K5, 30 nap, gyorsítótár 4096): „soros” újítóval ~' + KB(sajatIndexelt * felaj / 30) + '/nap/készülék'
          + ' · ha minden tartó (átlag 3) újítana: ~' + KB(3 * sajatIndexelt * felaj / 30) + '/nap · a tartó oldalán beérkező: ~'
          + KB(E_r / 30 * 0.6 * 1024 + gy[4096].allando * bizonyitek / 30) + '/nap · + a régió hirdetése a DHT-n ~650 KB/nap (58.)');
      }
    }
  }

  // A tőre keresés (K2) és a két szavas kérdés (K7).
  for (const kk of [1, 2]) {
    const t = tokeresesek(e, { B, k: kk });
    const atlag = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
    const teljes = (xs) => xs.filter((x) => x >= 0.999).length / xs.length;
    kiir('  a tőre keresés (k = ' + kk + ' darab egy osztódott fiókból, ' + t.n + ' kérdés): a tő-találatok aránya — (A) átlag '
      + pr(atlag(t.A)) + ', teljes ' + pr(teljes(t.A)) + ' · (C) átlag ' + pr(atlag(t.C)) + ', teljes ' + pr(teljes(t.C))
      + ' · legalább 10 (vagy mind) jön: (A) ' + pr(t.hasznosA / t.n) + ' · (C) ' + pr(t.hasznosC / t.n)
      + ' · háromjeles tő: ' + pr(t.rovidTo / t.n));
  }
  const k2 = ketSzavas(e, { B });
  kiir('  két szavas kérdés: a ritkább szó fiókja ≤ ' + B + ' (teljes válasz egy helyről): ' + pr(k2.teljes) + ' · a ritkább fiók'
    + ' mérete: medián ' + k2.median + ', 90% ' + k2.p90);
}
