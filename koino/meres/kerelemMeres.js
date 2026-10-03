// koino/meres/kerelemMeres.js

// Felelősség: A 60. MÉRÉS — A KÉRELEM ÚTJA A NAT-VALÓSÁGBAN (a D pillér átvizsgálása, D76/4, D87) — szimuláció.
//
// A kérdés: ha egy készülék közvetlenül csak a KÖTÉSEIT (K társ, a buliban egyszerre kopognak) és a FOGADÓKÉPES
// gépeket éri el (36/d: a mobil NAT az idegent nem engedi be), akkor egy kérelem
//   · KÖZVETLENÜL (a G-ből ismeri a tartók címét — a legjobb eset: mind ismert),
//   · ELÁRASZTVA a kötés-hálón (h ugrás, minden továbbító minden élő kötésének továbbadja, azonosítóval — nincs
//     kétszeres továbbadás; D76/4),
//   · vagy VÉLETLEN SÉTÁVAL (w sétáló, h lépés),
//   · ⭐ vagy KOPOGTATÁSSAL: a kérő bejelenti magát a tartó „kopogtató” témáján (a DHT-n, BEP 5), a tartó
//     időnként ránéz, és a következő buliban MINDKETTEN kopognak — a rés akkor nyílik, ha a két NAT
//     átfúrható (`lyuk`: egy kérő–tartó pár ekkora eséllyel fúrható; a mobil szimmetrikus NAT-ja nem — 36/d)
// mekkora eséllyel ér el egy élő tartót, és hány üzenetbe kerül? ⭐ A „végtelen” próbája: a forgalom ne N-nel nőjön.
//
// A modell: N készülék, mindegyiknek K kötése (véletlen gráf, egyforma fokszám), a buliban p_on eséllyel él;
// f arányuk fogadóképes (bárki eléri, aki tudja a címét). Egy szeletnek T tartója van; λ eséllyel egy tartó a kérő
// KÖZELÉBEN van (legfeljebb 2 lépésre a kötés-hálón — az érdeklődés közösségi), különben bárhol. A válasz ugyanazon
// az úton jön vissza (D87), tehát az üzenetszám a kérelemé ×~2 (itt csak a kérelem útját számoljuk).
// Magvas véletlen — összevethető.
//
// ⚠️ NEM ÖNPRÓBA (számokat ad).  node koino/meres/kerelemMeres.js [kérelmek=3000]

const kiir = (s) => process.stdout.write(s + '\n');
const KERELMEK = parseInt(process.argv[2], 10) || 3000;

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

// ===== A KÖTÉS-HÁLÓ: K fokszámú véletlen gráf (konfigurációs modell, hurok és többszörös él nélkül) =====
function kotesHalo(N, K, v) {
  const szomszed = Array.from({ length: N }, () => new Set());
  const csonkok = [];
  for (let i = 0; i < N; i++) for (let k = 0; k < K; k++) csonkok.push(i);
  for (let i = csonkok.length - 1; i > 0; i--) {
    const j = Math.floor(v() * (i + 1));
    [csonkok[i], csonkok[j]] = [csonkok[j], csonkok[i]];
  }
  for (let i = 0; i + 1 < csonkok.length; i += 2) {
    const a = csonkok[i], b = csonkok[i + 1];
    if (a !== b) { szomszed[a].add(b); szomszed[b].add(a); }
  }
  return szomszed.map((s) => [...s]);
}

/** A kérő 2 lépésen belüli környéke (a teljes hálón — a „közösségi” tartókhoz). */
function kornyek(halo, honnan) {
  const ki = new Set();
  for (const a of halo[honnan]) { ki.add(a); for (const b of halo[a]) if (b !== honnan) ki.add(b); }
  return [...ki];
}

function egyCella({ N, K, pOn, f, T, lambda, hMax, w, mag, lyuk = 0 }) {
  const v = veletlenGyar(mag);
  const halo = kotesHalo(N, K, v);
  const fogado = Array.from({ length: N }, () => v() < f);
  const eredmeny = {
    kozvetlen: 0, kopogtatas: 0, kopogtatasH2: 0,
    elarasztas: Array(hMax + 1).fill(0), elarasztasUzenet: Array(hMax + 1).fill(0),
    egyutt: Array(hMax + 1).fill(0),
    seta: Array(hMax + 1).fill(0)
  };
  for (let r = 0; r < KERELMEK; r++) {
    const el = Array.from({ length: N }, () => v() < pOn);
    const kero = Math.floor(v() * N);
    el[kero] = true;
    // A tartók: λ eséllyel a kérő környékéről, különben bárhonnan; a kérő maga nem tartó.
    const kozel = kornyek(halo, kero);
    const tartok = new Set();
    let probalkozas = 0;
    while (tartok.size < T && probalkozas++ < T * 50) {
      const t = (kozel.length && v() < lambda) ? kozel[Math.floor(v() * kozel.length)] : Math.floor(v() * N);
      if (t !== kero) tartok.add(t);
    }
    const elo = [...tartok].filter((t) => el[t]);

    // ① KÖZVETLEN: egy élő tartó, aki fogadóképes vagy a kérő kötése.
    const kozvetlenE = elo.some((t) => fogado[t] || halo[kero].includes(t));
    if (kozvetlenE) eredmeny.kozvetlen++;
    // ④ KOPOGTATÁS: a közvetlen, VAGY egy élő tartó, akivel a rés átfúrható (páronként `lyuk` eséllyel).
    const kopogtatasE = kozvetlenE || elo.some(() => v() < lyuk);
    if (kopogtatasE) eredmeny.kopogtatas++;

    // ② ELÁRASZTÁS (BFS az élő gépeken): a h-adik szinten elért élő tartó; üzenet = minden továbbküldés.
    const tav = new Map([[kero, 0]]);
    let szint = [kero];
    let uzenet = 0;
    let elsoTalalat = Infinity;
    if (tartok.has(kero)) elsoTalalat = 0;
    for (let h = 1; h <= hMax; h++) {
      const kovetkezo = [];
      for (const u of szint) {
        for (const x of halo[u]) {
          if (!el[x]) continue;                   // a halott kötés nem kap semmit (a kopogás ~60 B, nem számoljuk)
          uzenet++;
          if (tav.has(x)) continue;                // azonosító: nincs kétszeres továbbadás
          tav.set(x, h);
          kovetkezo.push(x);
          if (tartok.has(x) && h < elsoTalalat) elsoTalalat = h;
        }
      }
      eredmeny.elarasztasUzenet[h] += uzenet;
      if (elsoTalalat <= h) eredmeny.elarasztas[h]++;
      if (elsoTalalat <= h || kozvetlenE) eredmeny.egyutt[h]++;
      if (h === 2 && (elsoTalalat <= 2 || kopogtatasE)) eredmeny.kopogtatasH2++;
      szint = kovetkezo;
    }

    // ③ VÉLETLEN SÉTA: w sétáló, lépésenként egy élő kötésre (ha lehet, nem vissza).
    let setaTalalat = Infinity;
    for (let s = 0; s < w; s++) {
      let elozo = -1, itt = kero;
      for (let h = 1; h <= hMax; h++) {
        const jeloltek = halo[itt].filter((x) => el[x] && x !== elozo);
        const lista = jeloltek.length ? jeloltek : halo[itt].filter((x) => el[x]);
        if (!lista.length) break;
        elozo = itt;
        itt = lista[Math.floor(v() * lista.length)];
        if (tartok.has(itt)) { if (h < setaTalalat) setaTalalat = h; break; }
      }
    }
    for (let h = 1; h <= hMax; h++) if (setaTalalat <= h) eredmeny.seta[h]++;
  }
  return eredmeny;
}

const sz = (x) => (100 * x / KERELMEK).toFixed(1).padStart(5) + '%';

function tabla(cim, alap, valtozo, ertekek) {
  kiir('\n' + cim);
  kiir('  ' + valtozo.padEnd(8) + ' közvetlen │ elárasztás h=1..5 (közvetlennel együtt)            │ üzenet h=1..5');
  for (const e of ertekek) {
    const b = { ...alap, [valtozo]: e };
    const r = egyCella(b);
    kiir('  ' + String(e).padEnd(8) + ' ' + sz(r.kozvetlen) + '    │ '
      + [1, 2, 3, 4, 5].map((h) => sz(r.egyutt[h])).join(' ') + ' │ '
      + [1, 2, 3, 4, 5].map((h) => String(Math.round(r.elarasztasUzenet[h] / KERELMEK)).padStart(4)).join(' '));
  }
}

const ALAP = { N: 20000, K: 3, pOn: 0.7, f: 0.1, T: 3, lambda: 0, hMax: 5, w: 3, mag: 60 };
kiir('60. MÉRÉS — A KÉRELEM ÚTJA (szimuláció, ' + KERELMEK + ' kérelem cellánként)');
kiir('alap: N = 20000, K = 3 kötés, a buliban 70% él, 10% fogadóképes, T = 3 tartó, λ = 0 (a tartók bárhol)');

tabla('① A TARTÓK SZÁMA (T), a tartók bárhol (λ = 0):', ALAP, 'T', [1, 3, 10, 30, 100]);
tabla('② A KÖZÖSSÉGI ÉRDEKLŐDÉS (λ: egy tartó ekkora eséllyel van a kérő 2 lépéses környékén), T = 3:',
  ALAP, 'lambda', [0, 0.1, 0.3, 0.6]);
tabla('③ A FOGADÓKÉPESEK ARÁNYA (f), T = 3, λ = 0:', ALAP, 'f', [0, 0.05, 0.1, 0.25, 0.5]);
tabla('④ A KOINÓ MÉRETE (N), T = 3, λ = 0 — a „végtelen” próbája:', ALAP, 'N', [50, 500, 5000, 20000, 100000]);
tabla('⑤ A KÖTÉSEK SZÁMA (K), T = 3, λ = 0:', ALAP, 'K', [3, 4, 5]);

{
  kiir('\n⑥ ELÁRASZTÁS vs VÉLETLEN SÉTA (w = 3 sétáló, ≤ 3·h üzenet), T = 10, λ = 0.3 — csak a továbbadás, közvetlen nélkül:');
  const r = egyCella({ ...ALAP, T: 10, lambda: 0.3 });
  kiir('  elárasztás h=1..5: ' + [1, 2, 3, 4, 5].map((h) => sz(r.elarasztas[h])).join(' ')
    + '   üzenet: ' + [1, 2, 3, 4, 5].map((h) => Math.round(r.elarasztasUzenet[h] / KERELMEK)).join(' '));
  kiir('  séta (w=3)  h=1..5: ' + [1, 2, 3, 4, 5].map((h) => sz(r.seta[h])).join(' ')
    + '   üzenet: ' + [1, 2, 3, 4, 5].map((h) => 3 * h).join(' ') + ' (legfeljebb)');
}

{
  kiir('\n⑦ ⭐ A KOPOGTATÁS (randevú a DHT-n, mindkét fél kopog a buliban) — `lyuk`: egy pár ekkora eséllyel fúrható:');
  kiir('  T     lyuk │ közvetlen │ kopogtatás │ kopogtatás + elárasztás (h = 2) │ λ = 0.3: kopogtatás + h = 2');
  for (const T of [1, 3, 10]) {
    for (const lyuk of [0, 0.3, 0.5, 0.8]) {
      const r = egyCella({ ...ALAP, T, lyuk });
      const k = egyCella({ ...ALAP, T, lyuk, lambda: 0.3 });
      kiir('  ' + String(T).padEnd(5) + ' ' + String(lyuk).padEnd(4) + ' │ ' + sz(r.kozvetlen) + '    │ '
        + sz(r.kopogtatas) + '     │ ' + sz(r.kopogtatasH2) + '                          │ ' + sz(k.kopogtatasH2));
    }
  }
  kiir('  (f = 0, azaz egyetlen fogadóképes gép sincs, T = 3:)');
  for (const lyuk of [0.3, 0.5, 0.8]) {
    const r = egyCella({ ...ALAP, f: 0, lyuk });
    kiir('  3     ' + String(lyuk).padEnd(4) + ' │ ' + sz(r.kozvetlen) + '    │ ' + sz(r.kopogtatas) + '     │ '
      + sz(r.kopogtatasH2));
  }
}
